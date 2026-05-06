# Garden Watering Card

A Lovelace dashboard card for scheduling Home Assistant valve watering.

The card includes a native Lovelace visual editor for selecting the valve device, switch entity, timer number/input_number entity, and schedule input_text helper.

The card stores the complete weekly schedule in one Home Assistant `input_text` helper per valve using a compact JSON format that fits Home Assistant's entity state limit. Each day can be enabled or disabled and can contain multiple `HH:MM` watering times.

The card does not control watering duration. It only turns the configured valve switch on at scheduled times; your existing valve timer entity can handle shutoff.
