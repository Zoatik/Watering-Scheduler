from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta
import logging

from homeassistant.const import SERVICE_TURN_ON
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import CONF_TIMER_ENTITY, CONF_VALVE_ENTITY, DAY_KEYS, DOMAIN, STORAGE_VERSION

_LOGGER = logging.getLogger(__name__)

Schedule = dict[str, list[str | int]]


class WateringScheduler:
    """Runtime manager for one configured watering schedule."""

    def __init__(self, hass: HomeAssistant, entry) -> None:
        self.hass = hass
        self.entry = entry
        self.entry_id = entry.entry_id
        self.name = entry.title
        self.valve_entity = entry.data[CONF_VALVE_ENTITY]
        self.timer_entity = entry.data.get(CONF_TIMER_ENTITY)
        self._store: Store[Schedule] = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}.{self.entry_id}"
        )
        self.schedule: Schedule = {}
        self.last_checked: str | None = None
        self.last_triggered: str | None = None
        self.last_error: str | None = None
        self._last_trigger_key: str | None = None
        self._unsub_time: Callable[[], None] | None = None
        self._listeners: list[Callable[[], None]] = []

    async def async_load(self) -> None:
        """Load persisted schedule."""
        stored = await self._store.async_load()
        self.schedule = normalize_schedule(stored or {})

    async def async_save(self) -> None:
        """Persist schedule."""
        await self._store.async_save(self.schedule)

    async def async_set_schedule(self, schedule: object) -> None:
        """Replace the current schedule."""
        self.schedule = normalize_schedule(schedule)
        await self.async_save()
        self.async_notify_listeners()

    def async_start(self) -> None:
        """Start interval-based schedule checks."""
        if self._unsub_time is None:
            self._unsub_time = async_track_time_interval(
                self.hass, self._async_check_time, timedelta(seconds=30)
            )

    def async_stop(self) -> None:
        """Stop schedule checks."""
        if self._unsub_time is not None:
            self._unsub_time()
            self._unsub_time = None
        self._listeners.clear()

    @callback
    def async_add_listener(self, listener: Callable[[], None]) -> Callable[[], None]:
        """Register an update listener."""
        self._listeners.append(listener)

        def remove_listener() -> None:
            if listener in self._listeners:
                self._listeners.remove(listener)

        return remove_listener

    @callback
    def async_notify_listeners(self) -> None:
        """Notify listeners that schedule data changed."""
        for listener in list(self._listeners):
            listener()

    @callback
    def _async_check_time(self, now: datetime) -> None:
        """Turn on the valve when the local time matches the schedule."""
        local_now = dt_util.as_local(now)
        self.last_checked = local_now.isoformat()
        self.last_error = None

        day_key = DAY_KEYS[local_now.isoweekday() - 1]
        today = self.schedule.get(day_key, [0])
        current_time = local_now.strftime("%H:%M")
        trigger_key = f"{local_now.date().isoformat()}:{current_time}"

        if not today or int(today[0]) != 1:
            self.async_notify_listeners()
            return

        if current_time not in today[1:]:
            self.async_notify_listeners()
            return

        if self._last_trigger_key == trigger_key:
            self.async_notify_listeners()
            return

        self._last_trigger_key = trigger_key
        self.last_triggered = local_now.isoformat()
        _LOGGER.info(
            "Starting watering schedule %s for %s at local time %s",
            self.entry_id,
            self.valve_entity,
            current_time,
        )
        self.hass.async_create_task(self._async_turn_on_valve())
        self.async_notify_listeners()

    async def async_trigger_now(self) -> None:
        """Manually trigger the configured valve for diagnostics."""
        self.last_triggered = dt_util.now().isoformat()
        await self._async_turn_on_valve()

    async def _async_turn_on_valve(self) -> None:
        """Turn on the configured valve."""
        try:
            await self.hass.services.async_call(
                "switch",
                SERVICE_TURN_ON,
                {"entity_id": self.valve_entity},
                blocking=True,
            )
        except Exception as err:  # noqa: BLE001 - surfaced in diagnostics attributes.
            self.last_error = str(err)
            _LOGGER.exception("Failed to start watering schedule %s", self.entry_id)
        finally:
            self.async_notify_listeners()

    def next_run(self, now: datetime) -> str | None:
        """Return the next scheduled run as a local ISO timestamp."""
        local_now = dt_util.as_local(now)
        current_minute = local_now.replace(second=0, microsecond=0)

        for offset in range(8):
            candidate_date = local_now.date() + timedelta(days=offset)
            day_key = DAY_KEYS[candidate_date.isoweekday() - 1]
            day = self.schedule.get(day_key, [0])
            if not day or int(day[0]) != 1:
                continue

            for time_value in day[1:]:
                hour = int(str(time_value)[:2])
                minute = int(str(time_value)[3:])
                candidate = datetime.combine(candidate_date, datetime.min.time()).replace(
                    hour=hour,
                    minute=minute,
                    tzinfo=local_now.tzinfo,
                )
                if candidate >= current_minute:
                    return candidate.isoformat()
        return None


def normalize_schedule(value: object) -> Schedule:
    """Normalize compact schedule payload from storage or frontend."""
    if not isinstance(value, dict):
        return {}

    normalized: Schedule = {}
    for day_key in DAY_KEYS:
        raw_day = value.get(day_key)
        enabled = False
        times: list[str] = []

        if isinstance(raw_day, list):
            enabled = bool(raw_day[0]) if raw_day else False
            raw_times = raw_day[1:]
        elif isinstance(raw_day, dict):
            enabled = bool(raw_day.get("enabled"))
            raw_times = raw_day.get("times", [])
        else:
            raw_times = []

        for item in raw_times:
            if isinstance(item, str) and _is_valid_time(item) and item not in times:
                times.append(item)

        times.sort()
        if enabled or times:
            normalized[day_key] = [1 if enabled else 0, *times]

    return normalized


def _is_valid_time(value: str) -> bool:
    if len(value) != 5 or value[2] != ":":
        return False
    hour = value[:2]
    minute = value[3:]
    return (
        hour.isdigit()
        and minute.isdigit()
        and 0 <= int(hour) <= 23
        and 0 <= int(minute) <= 59
    )
