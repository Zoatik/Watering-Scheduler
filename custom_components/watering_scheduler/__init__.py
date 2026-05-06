from __future__ import annotations

from pathlib import Path

import voluptuous as vol

from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from .const import (
    ATTR_ENTRY_ID,
    ATTR_SCHEDULE,
    DOMAIN,
    PLATFORMS,
    SERVICE_SET_SCHEDULE,
    SERVICE_TRIGGER_NOW,
)
from .scheduler import WateringScheduler


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Watering Scheduler integration."""
    card_path = Path(__file__).parent / "www" / "garden-watering-card.js"
    await hass.http.async_register_static_paths(
        [StaticPathConfig("/watering_scheduler/garden-watering-card.js", str(card_path), True)]
    )

    async def async_set_schedule(call) -> None:
        entry_id = call.data[ATTR_ENTRY_ID]
        scheduler = hass.data.get(DOMAIN, {}).get(entry_id)
        if scheduler is None:
            raise HomeAssistantError(f"Unknown Watering Scheduler entry_id: {entry_id}")
        await scheduler.async_set_schedule(call.data[ATTR_SCHEDULE])

    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_SCHEDULE,
        async_set_schedule,
        schema=vol.Schema(
            {
                vol.Required(ATTR_ENTRY_ID): str,
                vol.Required(ATTR_SCHEDULE): dict,
            }
        ),
    )

    async def async_trigger_now(call) -> None:
        entry_id = call.data[ATTR_ENTRY_ID]
        scheduler = hass.data.get(DOMAIN, {}).get(entry_id)
        if scheduler is None:
            raise HomeAssistantError(f"Unknown Watering Scheduler entry_id: {entry_id}")
        await scheduler.async_trigger_now()

    hass.services.async_register(
        DOMAIN,
        SERVICE_TRIGGER_NOW,
        async_trigger_now,
        schema=vol.Schema({vol.Required(ATTR_ENTRY_ID): str}),
    )
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up a Watering Scheduler config entry."""
    scheduler = WateringScheduler(hass, entry)
    await scheduler.async_load()
    scheduler.async_start()

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = scheduler
    entry.runtime_data = scheduler

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a Watering Scheduler config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        scheduler = hass.data[DOMAIN].pop(entry.entry_id)
        scheduler.async_stop()
    return unload_ok
