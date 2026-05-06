from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.const import CONF_NAME
from homeassistant.helpers import selector

from .const import CONF_DEVICE_ID, CONF_TIMER_ENTITY, CONF_VALVE_ENTITY, DOMAIN


class WateringSchedulerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Watering Scheduler."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Handle the initial step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            valve_entity = user_input.get(CONF_VALVE_ENTITY)
            if not valve_entity:
                errors[CONF_VALVE_ENTITY] = "missing_valve"
            else:
                await self.async_set_unique_id(str(valve_entity))
                self._abort_if_unique_id_configured()

                title = user_input.get(CONF_NAME) or str(valve_entity)
                return self.async_create_entry(title=title, data=user_input)

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_NAME, default="Arrosage"): selector.TextSelector(),
                    vol.Optional(CONF_DEVICE_ID): selector.DeviceSelector(),
                    vol.Required(CONF_VALVE_ENTITY): selector.EntitySelector(
                        selector.EntitySelectorConfig(domain="switch")
                    ),
                    vol.Optional(CONF_TIMER_ENTITY): selector.EntitySelector(
                        selector.EntitySelectorConfig(domain=["number", "input_number"])
                    ),
                }
            ),
            errors=errors,
        )
