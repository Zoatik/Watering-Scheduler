# Garden Watering Card

A Lovelace dashboard card for scheduling Home Assistant valve watering.

The card stores schedules in Home Assistant helpers:

- one `input_boolean` per day to enable or disable watering
- one `input_text` per day to store one or more `HH:MM` times

The card does not control watering duration. It only turns the configured valve switch on at scheduled times; your existing valve timer entity can handle shutoff.
