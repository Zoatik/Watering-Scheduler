# Garden Watering Card

Custom Lovelace card for scheduling Home Assistant valve watering.

It is designed for valve devices with:

- a `switch` entity that opens the valve
- a `number` entity used elsewhere as the watering timer

The card stores its schedule in Home Assistant helpers and lets an automation trigger `switch.turn_on` at the configured times. It does not handle shutoff.

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

## Helpers

Create one `input_boolean` and one `input_text` per day, per valve.

Each `input_text` stores a comma-separated list of times:

```text
06:00, 19:30
```

See `home-assistant-example.yaml` for a complete example.

## Dashboard Card

```yaml
type: custom:garden-watering-card
title: Potager
valve_name: Vanne potager
valve_entity: switch.vanne_potager
timer_entity: number.vanne_potager_timer
days:
  - key: mon
    label: Lun
    enabled_entity: input_boolean.arrosage_potager_lun
    times_entity: input_text.arrosage_potager_lun_heures
  - key: tue
    label: Mar
    enabled_entity: input_boolean.arrosage_potager_mar
    times_entity: input_text.arrosage_potager_mar_heures
  - key: wed
    label: Mer
    enabled_entity: input_boolean.arrosage_potager_mer
    times_entity: input_text.arrosage_potager_mer_heures
  - key: thu
    label: Jeu
    enabled_entity: input_boolean.arrosage_potager_jeu
    times_entity: input_text.arrosage_potager_jeu_heures
  - key: fri
    label: Ven
    enabled_entity: input_boolean.arrosage_potager_ven
    times_entity: input_text.arrosage_potager_ven_heures
  - key: sat
    label: Sam
    enabled_entity: input_boolean.arrosage_potager_sam
    times_entity: input_text.arrosage_potager_sam_heures
  - key: sun
    label: Dim
    enabled_entity: input_boolean.arrosage_potager_dim
    times_entity: input_text.arrosage_potager_dim_heures
```

## Automation

Use the automation example in `home-assistant-example.yaml`. It checks the current weekday and time once per minute, then turns on the configured valve when there is a match.
