# Watering Scheduler

Home Assistant custom integration and Lovelace card for scheduling automatic garden watering valves.

It is designed for valve devices with:

- a `switch` entity that opens the valve
- an optional `number` or `input_number` entity used elsewhere as the watering timer

The integration stores the weekly schedule internally, checks the schedule every minute, and calls `switch.turn_on` when the current day and time match. It does not handle shutoff; your valve timer can keep doing that.

## HACS Installation

This repository is now a HACS custom integration repository.

1. Push this folder to a public GitHub repository.
2. In Home Assistant, open HACS.
3. Open the three-dot menu.
4. Select **Custom repositories**.
5. Add your GitHub repository URL.
6. Select category **Integration**.
7. Install **Watering Scheduler**.
8. Restart Home Assistant.

## Configure A Valve

After restart:

1. Go to **Settings > Devices & services**.
2. Click **Add integration**.
3. Search for **Watering Scheduler**.
4. Enter a name, for example `Potager`.
5. Select the valve device if useful.
6. Select the valve `switch` entity.
7. Optionally select the timer `number` or `input_number` entity.

The integration creates a schedule sensor for the valve. The sensor exposes the config entry ID, valve entity, timer entity, and current schedule for the Lovelace card.

## Dashboard Resource

Add this dashboard resource once:

```yaml
url: /watering_scheduler/garden-watering-card.js
type: module
```

The card is served by the integration from:

```text
custom_components/watering_scheduler/www/garden-watering-card.js
```

## Dashboard Card

Add a manual card and select the schedule sensor created by the integration:

```yaml
type: custom:garden-watering-card
title: Potager
valve_name: Vanne potager
schedule_entity: sensor.potager_schedule
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

The card includes a native Lovelace visual editor. In normal use you only need to select the Watering Scheduler schedule sensor.

## Schedule Storage

Schedules are stored in Home Assistant `.storage` by the integration, not in helpers. The card sends updates through:

```yaml
service: watering_scheduler.set_schedule
```

Payload format:

```json
{
  "entry_id": "config_entry_id",
  "schedule": {
    "mon": [1, "06:00", "19:30"],
    "wed": [1, "07:15"]
  }
}
```

The first array item enables the day: `1` means enabled, `0` means disabled. Remaining items are watering times.

## Manual Development Install

Copy `custom_components/watering_scheduler` to your Home Assistant `custom_components` directory, restart Home Assistant, then add the integration from the UI.
