# Garden Watering Card

Custom Lovelace card for scheduling Home Assistant valve watering.

It is designed for valve devices with:

- a `switch` entity that opens the valve
- a `number` entity used elsewhere as the watering timer

The card stores the full weekly schedule in one Home Assistant `input_text` helper per valve. It lets an automation trigger `switch.turn_on` at the configured times and does not handle shutoff.

## HACS Installation

This repository can be added to HACS as a custom dashboard repository.

1. Push this folder to a public GitHub repository.
2. In Home Assistant, open HACS.
3. Open the three-dot menu.
4. Select **Custom repositories**.
5. Add your GitHub repository URL.
6. Select category **Dashboard**.
7. Install **Garden Watering Card**.
8. Reload the browser after installation.

HACS will install the card from:

```text
dist/garden-watering-card.js
```

The Lovelace resource should then be:

```yaml
url: /hacsfiles/garden-watering-card/garden-watering-card.js
type: module
```

Depending on the final GitHub repository name, HACS may generate a slightly different `/hacsfiles/...` path. Use the resource path shown by HACS after installation.

## Manual Installation

Copy `dist/garden-watering-card.js` to:

```text
/config/www/garden-watering-card.js
```

Then add this dashboard resource:

```yaml
url: /local/garden-watering-card.js
type: module
```

## Helper

Create one `input_text` per valve:

```yaml
input_text:
  arrosage_potager_schedule:
    name: Planning arrosage potager
    max: 255
```

Home Assistant limits entity states, including `input_text`, to 255 characters. The card therefore stores a compact JSON value and omits disabled days that have no times. The first array item enables the day: `1` means enabled, `0` means disabled. The remaining items are watering times.

```json
{
  "mon": [1, "06:00", "19:30"],
  "tue": [0],
  "wed": [1, "07:15"]
}
```

See `home-assistant-example.yaml` for a complete Home Assistant example.

## Visual Editor

The card includes a native Lovelace visual editor. From the dashboard editor you can select:

- the valve device
- the valve `switch` entity
- the timer `number` or `input_number` entity
- the schedule `input_text` helper

The selected device is optional metadata for the editor. The card runtime uses `valve_entity`, `timer_entity`, and `schedule_entity`.

## Dashboard Card

```yaml
type: custom:garden-watering-card
title: Potager
valve_name: Vanne potager
# Optional. Easier to set from the visual editor.
device_id: optional_home_assistant_device_id
valve_entity: switch.vanne_potager
timer_entity: number.vanne_potager_timer
schedule_entity: input_text.arrosage_potager_schedule
days:
  - key: mon
    label: Lun
  - key: tue
    label: Mar
  - key: wed
    label: Mer
  - key: thu
    label: Jeu
  - key: fri
    label: Ven
  - key: sat
    label: Sam
  - key: sun
    label: Dim
```

## Automation

Use the automation example in `home-assistant-example.yaml`. It checks the current weekday and time once per minute, reads the JSON schedule from the configured `input_text`, then turns on the valve when there is a match.
