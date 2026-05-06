from __future__ import annotations

from collections.abc import Callable

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import (
    ATTR_ENTRY_ID,
    ATTR_SCHEDULE,
    ATTR_TIMER_ENTITY,
    ATTR_VALVE_ENTITY,
    DOMAIN,
)
from .scheduler import WateringScheduler


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Watering Scheduler sensor entities."""
    async_add_entities([WateringScheduleSensor(entry.runtime_data)])


class WateringScheduleSensor(SensorEntity):
    """Schedule entity exposed for the Lovelace card."""

    _attr_has_entity_name = True
    _attr_icon = "mdi:sprinkler-variant"
    _attr_should_poll = False

    def __init__(self, scheduler: WateringScheduler) -> None:
        self.scheduler = scheduler
        self._attr_unique_id = f"{scheduler.entry_id}_schedule"
        self._attr_name = "Schedule"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, scheduler.entry_id)},
            "name": scheduler.name,
            "manufacturer": "Watering Scheduler",
        }
        self._unsub_scheduler: Callable[[], None] | None = None

    @property
    def native_value(self) -> str:
        """Return a simple state for the schedule sensor."""
        return "scheduled" if self.scheduler.schedule else "empty"

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        """Return data consumed by the Lovelace card."""
        return {
            ATTR_ENTRY_ID: self.scheduler.entry_id,
            ATTR_SCHEDULE: self.scheduler.schedule,
            ATTR_VALVE_ENTITY: self.scheduler.valve_entity,
            ATTR_TIMER_ENTITY: self.scheduler.timer_entity,
        }

    async def async_added_to_hass(self) -> None:
        """Register schedule update listener."""
        self._unsub_scheduler = self.scheduler.async_add_listener(
            self._async_schedule_changed
        )

    async def async_will_remove_from_hass(self) -> None:
        """Remove schedule update listener."""
        if self._unsub_scheduler is not None:
            self._unsub_scheduler()
            self._unsub_scheduler = None

    @callback
    def _async_schedule_changed(self) -> None:
        """Write changed schedule state."""
        self.async_write_ha_state()
