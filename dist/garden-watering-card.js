class GardenWateringCard extends HTMLElement {
  static getStubConfig() {
    return {
      type: "custom:garden-watering-card",
      title: "Arrosage",
      valve_entity: "switch.vanne_potager",
      timer_entity: "number.vanne_potager_timer",
      days: GardenWateringCard.defaultDays(),
    };
  }

  static defaultDays() {
    return [
      { key: "mon", label: "Lun", enabled_entity: "", times_entity: "" },
      { key: "tue", label: "Mar", enabled_entity: "", times_entity: "" },
      { key: "wed", label: "Mer", enabled_entity: "", times_entity: "" },
      { key: "thu", label: "Jeu", enabled_entity: "", times_entity: "" },
      { key: "fri", label: "Ven", enabled_entity: "", times_entity: "" },
      { key: "sat", label: "Sam", enabled_entity: "", times_entity: "" },
      { key: "sun", label: "Dim", enabled_entity: "", times_entity: "" },
    ];
  }

  setConfig(config) {
    if (!config.days || !Array.isArray(config.days) || config.days.length !== 7) {
      throw new Error("garden-watering-card requires exactly 7 configured days.");
    }

    this.config = {
      title: "Arrosage",
      valve_name: "Vanne",
      ...config,
    };

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() {
    return 5;
  }

  render() {
    if (!this.shadowRoot || !this.config || !this._hass) return;

    const valveState = this.state(this.config.valve_entity);
    const timerState = this.state(this.config.timer_entity);

    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="card">
          <header>
            <div>
              <h2>${this.escape(this.config.title)}</h2>
              <p>${this.escape(this.config.valve_name)}</p>
            </div>
            <button class="power ${valveState === "on" ? "is-on" : ""}" title="Ouvrir la vanne">
              <ha-icon icon="mdi:water-pump"></ha-icon>
            </button>
          </header>

          <div class="status">
            <span class="dot ${valveState === "on" ? "is-on" : ""}"></span>
            <span>${valveState === "on" ? "Ouverte" : "Fermee"}</span>
            ${this.config.timer_entity ? `<span class="timer">Timer ${this.escape(timerState)} s</span>` : ""}
          </div>

          <div class="days">
            ${this.config.days.map((day) => this.renderDay(day)).join("")}
          </div>
        </div>
      </ha-card>

      <style>
        :host {
          display: block;
          --watering-accent: var(--primary-color, #0b7f6b);
          --watering-on: #0f9d58;
          --watering-border: rgba(127, 127, 127, 0.22);
          --watering-muted: var(--secondary-text-color, #69737d);
          --watering-chip: rgba(15, 157, 88, 0.12);
        }

        .card {
          padding: 18px;
        }

        header {
          align-items: center;
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        h2 {
          font-size: 20px;
          font-weight: 650;
          line-height: 1.2;
          margin: 0;
        }

        p {
          color: var(--watering-muted);
          font-size: 13px;
          margin: 4px 0 0;
        }

        button {
          align-items: center;
          background: transparent;
          border: 0;
          color: inherit;
          cursor: pointer;
          display: inline-flex;
          font: inherit;
          justify-content: center;
          padding: 0;
        }

        .power {
          background: var(--card-background-color, #fff);
          border: 1px solid var(--watering-border);
          border-radius: 999px;
          box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0, 0, 0, 0.12));
          color: var(--watering-muted);
          height: 44px;
          min-width: 44px;
          transition: background 160ms ease, color 160ms ease, transform 160ms ease;
          width: 44px;
        }

        .power.is-on {
          background: var(--watering-on);
          color: white;
        }

        .power:active {
          transform: scale(0.96);
        }

        .status {
          align-items: center;
          color: var(--watering-muted);
          display: flex;
          flex-wrap: wrap;
          font-size: 13px;
          gap: 8px;
          margin: 14px 0 16px;
        }

        .dot {
          background: #9aa0a6;
          border-radius: 999px;
          height: 8px;
          width: 8px;
        }

        .dot.is-on {
          background: var(--watering-on);
          box-shadow: 0 0 0 4px rgba(15, 157, 88, 0.16);
        }

        .timer {
          border-left: 1px solid var(--watering-border);
          padding-left: 8px;
        }

        .days {
          display: grid;
          gap: 10px;
        }

        .day {
          border: 1px solid var(--watering-border);
          border-radius: 8px;
          display: grid;
          gap: 10px;
          grid-template-columns: 70px 1fr;
          padding: 10px;
        }

        .day-head {
          align-items: center;
          display: flex;
          gap: 8px;
        }

        .toggle {
          background: rgba(127, 127, 127, 0.18);
          border-radius: 999px;
          height: 24px;
          justify-content: flex-start;
          padding: 2px;
          width: 44px;
        }

        .toggle::before {
          background: white;
          border-radius: 999px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.24);
          content: "";
          height: 20px;
          transition: transform 160ms ease;
          width: 20px;
        }

        .toggle.is-on {
          background: var(--watering-on);
        }

        .toggle.is-on::before {
          transform: translateX(20px);
        }

        .label {
          font-size: 13px;
          font-weight: 650;
          min-width: 28px;
        }

        .schedule {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          min-height: 28px;
        }

        .chip {
          align-items: center;
          background: var(--watering-chip);
          border: 1px solid rgba(15, 157, 88, 0.28);
          border-radius: 999px;
          color: var(--primary-text-color);
          display: inline-flex;
          font-size: 13px;
          gap: 4px;
          min-height: 26px;
          padding: 0 4px 0 10px;
        }

        .chip button {
          border-radius: 999px;
          color: var(--watering-muted);
          height: 22px;
          width: 22px;
        }

        .empty {
          color: var(--watering-muted);
          font-size: 13px;
          line-height: 28px;
        }

        .add {
          align-items: center;
          display: flex;
          gap: 8px;
        }

        input[type="time"] {
          background: var(--card-background-color, #fff);
          border: 1px solid var(--watering-border);
          border-radius: 6px;
          color: var(--primary-text-color);
          font: inherit;
          font-size: 13px;
          min-height: 32px;
          padding: 0 8px;
        }

        .add-time {
          background: var(--watering-accent);
          border-radius: 6px;
          color: white;
          height: 32px;
          width: 36px;
        }

        @media (max-width: 520px) {
          .card {
            padding: 14px;
          }

          .day {
            grid-template-columns: 1fr;
          }

          .day-head {
            justify-content: space-between;
          }
        }
      </style>
    `;

    this.bindEvents();
  }

  renderDay(day) {
    const enabled = this.state(day.enabled_entity) === "on";
    const times = this.parseTimes(this.state(day.times_entity));

    return `
      <section class="day" data-day="${this.escape(day.key)}">
        <div class="day-head">
          <span class="label">${this.escape(day.label)}</span>
          <button class="toggle ${enabled ? "is-on" : ""}" data-action="toggle-day" title="Activer ${this.escape(day.label)}"></button>
        </div>
        <div class="schedule">
          <div class="chips">
            ${
              times.length
                ? times.map((time) => `
                  <span class="chip">
                    ${this.escape(time)}
                    <button data-action="remove-time" data-time="${this.escape(time)}" title="Supprimer ${this.escape(time)}">
                      <ha-icon icon="mdi:close"></ha-icon>
                    </button>
                  </span>
                `).join("")
                : `<span class="empty">Aucun horaire</span>`
            }
          </div>
          <div class="add">
            <input type="time" data-role="time-input" step="60" />
            <button class="add-time" data-action="add-time" title="Ajouter une heure">
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
          </div>
        </div>
      </section>
    `;
  }

  bindEvents() {
    const power = this.shadowRoot.querySelector(".power");
    if (power) {
      power.addEventListener("click", () => {
        const service = this.state(this.config.valve_entity) === "on" ? "turn_off" : "turn_on";
        this.call("switch", service, this.config.valve_entity);
      });
    }

    this.shadowRoot.querySelectorAll("[data-action]").forEach((element) => {
      element.addEventListener("click", (event) => {
        const action = event.currentTarget.dataset.action;
        const dayElement = event.currentTarget.closest(".day");
        const day = this.config.days.find((item) => item.key === dayElement.dataset.day);

        if (action === "toggle-day") {
          const service = this.state(day.enabled_entity) === "on" ? "turn_off" : "turn_on";
          this.call("input_boolean", service, day.enabled_entity);
        }

        if (action === "add-time") {
          const input = dayElement.querySelector('[data-role="time-input"]');
          this.addTime(day, input.value);
          input.value = "";
        }

        if (action === "remove-time") {
          this.removeTime(day, event.currentTarget.dataset.time);
        }
      });
    });
  }

  addTime(day, time) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return;

    const times = this.parseTimes(this.state(day.times_entity));
    if (!times.includes(time)) times.push(time);
    this.setTimes(day.times_entity, times.sort());
  }

  removeTime(day, time) {
    const times = this.parseTimes(this.state(day.times_entity)).filter((item) => item !== time);
    this.setTimes(day.times_entity, times);
  }

  setTimes(entityId, times) {
    this._hass.callService("input_text", "set_value", {
      entity_id: entityId,
      value: times.join(", "),
    });
  }

  call(domain, service, entityId) {
    this._hass.callService(domain, service, { entity_id: entityId });
  }

  state(entityId) {
    if (!entityId || !this._hass.states[entityId]) return "";
    return this._hass.states[entityId].state;
  }

  parseTimes(value) {
    if (!value || value === "unknown" || value === "unavailable") return [];

    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => /^([01]\d|2[0-3]):[0-5]\d$/.test(item))
      .filter((item, index, items) => items.indexOf(item) === index)
      .sort();
  }

  escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

customElements.define("garden-watering-card", GardenWateringCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "garden-watering-card",
  name: "Garden Watering Card",
  description: "Weekly multi-time watering scheduler for valve entities.",
});
