class GardenWateringCard extends HTMLElement {
  static getConfigForm() {
    return {
      schema: [
        {
          type: "grid",
          name: "",
          flatten: true,
          column_min_width: "240px",
          schema: [
            { name: "title", selector: { text: {} } },
            { name: "valve_name", selector: { text: {} } },
          ],
        },
        {
          name: "schedule_entity",
          required: true,
          selector: {
            entity: {
              filter: { domain: "sensor" },
            },
          },
        },
      ],
      computeLabel: (schema) => {
        const labels = {
          title: "Titre",
          valve_name: "Nom affiche",
          schedule_entity: "Planning Watering Scheduler",
        };
        return labels[schema.name] || undefined;
      },
      computeHelper: (schema) => {
        const helpers = {
          schedule_entity: "Capteur cree par l'integration Watering Scheduler pour cette vanne.",
        };
        return helpers[schema.name] || undefined;
      },
    };
  }

  static getStubConfig() {
    return {
      type: "custom:garden-watering-card",
      title: "Arrosage",
      valve_name: "Vanne",
      schedule_entity: "sensor.arrosage_schedule",
      days: GardenWateringCard.defaultDays(),
    };
  }

  static defaultDays() {
    return [
      { key: "mon", label: "Lun" },
      { key: "tue", label: "Mar" },
      { key: "wed", label: "Mer" },
      { key: "thu", label: "Jeu" },
      { key: "fri", label: "Ven" },
      { key: "sat", label: "Sam" },
      { key: "sun", label: "Dim" },
    ];
  }

  setConfig(config) {
    if (!config.schedule_entity) {
      throw new Error("garden-watering-card requires schedule_entity.");
    }

    this.config = {
      title: "Arrosage",
      valve_name: "Vanne",
      days: GardenWateringCard.defaultDays(),
      ...config,
    };

    if (!Array.isArray(this.config.days) || this.config.days.length !== 7) {
      throw new Error("garden-watering-card requires exactly 7 configured days.");
    }

    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
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

    const scheduleState = this._hass.states[this.config.schedule_entity];
    const attrs = scheduleState?.attributes || {};
    this.entryId = attrs.entry_id;
    this.valveEntity = attrs.valve_entity;
    this.timerEntity = attrs.timer_entity;
    this.schedule = this.parseSchedule(attrs.schedule || {});

    const valveState = this.state(this.valveEntity);
    const timerState = this.state(this.timerEntity);
    const missingBinding = !this.entryId || !this.valveEntity;

    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="card">
          <header>
            <div>
              <h2>${this.escape(this.config.title)}</h2>
              <p>${this.escape(this.config.valve_name)}</p>
            </div>
            <button class="power ${valveState === "on" ? "is-on" : ""}" title="Ouvrir la vanne" ${missingBinding ? "disabled" : ""}>
              <ha-icon icon="mdi:water-pump"></ha-icon>
            </button>
          </header>

          <div class="status">
            <span class="dot ${valveState === "on" ? "is-on" : ""}"></span>
            <span>${valveState === "on" ? "Ouverte" : "Fermee"}</span>
            ${this.timerEntity ? `<span class="timer">Timer ${this.escape(timerState)} s</span>` : ""}
          </div>

          ${missingBinding ? `<div class="warning">Selectionnez un capteur Watering Scheduler valide.</div>` : ""}

          <div class="days">
            ${this.config.days.map((day) => this.renderDay(day)).join("")}
          </div>
        </div>
      </ha-card>

      <style>
        :host { display: block; --watering-accent: var(--primary-color, #0b7f6b); --watering-on: #0f9d58; --watering-border: rgba(127, 127, 127, 0.22); --watering-muted: var(--secondary-text-color, #69737d); --watering-chip: rgba(15, 157, 88, 0.12); }
        .card { padding: 18px; }
        header { align-items: center; display: flex; gap: 16px; justify-content: space-between; }
        h2 { font-size: 20px; font-weight: 650; line-height: 1.2; margin: 0; }
        p { color: var(--watering-muted); font-size: 13px; margin: 4px 0 0; }
        button { align-items: center; background: transparent; border: 0; color: inherit; cursor: pointer; display: inline-flex; font: inherit; justify-content: center; padding: 0; }
        button[disabled] { cursor: not-allowed; opacity: 0.45; }
        .power { background: var(--card-background-color, #fff); border: 1px solid var(--watering-border); border-radius: 999px; box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0, 0, 0, 0.12)); color: var(--watering-muted); height: 44px; min-width: 44px; transition: background 160ms ease, color 160ms ease, transform 160ms ease; width: 44px; }
        .power.is-on { background: var(--watering-on); color: white; }
        .power:active { transform: scale(0.96); }
        .status { align-items: center; color: var(--watering-muted); display: flex; flex-wrap: wrap; font-size: 13px; gap: 8px; margin: 14px 0 16px; }
        .dot { background: #9aa0a6; border-radius: 999px; height: 8px; width: 8px; }
        .dot.is-on { background: var(--watering-on); box-shadow: 0 0 0 4px rgba(15, 157, 88, 0.16); }
        .timer { border-left: 1px solid var(--watering-border); padding-left: 8px; }
        .warning { background: rgba(244, 180, 0, 0.16); border: 1px solid rgba(244, 180, 0, 0.34); border-radius: 8px; color: var(--primary-text-color); font-size: 13px; margin: 0 0 12px; padding: 10px; }
        .days { display: grid; gap: 10px; }
        .day { border: 1px solid var(--watering-border); border-radius: 8px; display: grid; gap: 10px; grid-template-columns: 70px 1fr; padding: 10px; }
        .day-head { align-items: center; display: flex; gap: 8px; }
        .toggle { background: rgba(127, 127, 127, 0.18); border-radius: 999px; height: 24px; justify-content: flex-start; padding: 2px; width: 44px; }
        .toggle::before { background: white; border-radius: 999px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.24); content: ""; height: 20px; transition: transform 160ms ease; width: 20px; }
        .toggle.is-on { background: var(--watering-on); }
        .toggle.is-on::before { transform: translateX(20px); }
        .label { font-size: 13px; font-weight: 650; min-width: 28px; }
        .schedule { display: grid; gap: 8px; min-width: 0; }
        .chips { display: flex; flex-wrap: wrap; gap: 6px; min-height: 28px; }
        .chip { align-items: center; background: var(--watering-chip); border: 1px solid rgba(15, 157, 88, 0.28); border-radius: 999px; color: var(--primary-text-color); display: inline-flex; font-size: 13px; gap: 4px; min-height: 26px; padding: 0 4px 0 10px; }
        .chip button { border-radius: 999px; color: var(--watering-muted); height: 22px; width: 22px; }
        .empty { color: var(--watering-muted); font-size: 13px; line-height: 28px; }
        .add { align-items: center; display: flex; gap: 8px; }
        input[type="time"] { background: var(--card-background-color, #fff); border: 1px solid var(--watering-border); border-radius: 6px; color: var(--primary-text-color); font: inherit; font-size: 13px; min-height: 32px; padding: 0 8px; }
        .add-time { background: var(--watering-accent); border-radius: 6px; color: white; height: 32px; width: 36px; }
        @media (max-width: 520px) { .card { padding: 14px; } .day { grid-template-columns: 1fr; } .day-head { justify-content: space-between; } }
      </style>
    `;

    this.bindEvents();
  }

  renderDay(day) {
    const item = this.daySchedule(day.key);
    const times = item.times;
    return `
      <section class="day" data-day="${this.escape(day.key)}">
        <div class="day-head">
          <span class="label">${this.escape(day.label)}</span>
          <button class="toggle ${item.enabled ? "is-on" : ""}" data-action="toggle-day" title="Activer ${this.escape(day.label)}"></button>
        </div>
        <div class="schedule">
          <div class="chips">
            ${times.length ? times.map((time) => `
              <span class="chip">
                ${this.escape(time)}
                <button data-action="remove-time" data-time="${this.escape(time)}" title="Supprimer ${this.escape(time)}"><ha-icon icon="mdi:close"></ha-icon></button>
              </span>
            `).join("") : `<span class="empty">Aucun horaire</span>`}
          </div>
          <div class="add">
            <input type="time" data-role="time-input" step="60" />
            <button class="add-time" data-action="add-time" title="Ajouter une heure"><ha-icon icon="mdi:plus"></ha-icon></button>
          </div>
        </div>
      </section>
    `;
  }

  bindEvents() {
    const power = this.shadowRoot.querySelector(".power");
    if (power) {
      power.addEventListener("click", () => {
        if (!this.valveEntity) return;
        const service = this.state(this.valveEntity) === "on" ? "turn_off" : "turn_on";
        this._hass.callService("switch", service, { entity_id: this.valveEntity });
      });
    }

    this.shadowRoot.querySelectorAll("[data-action]").forEach((element) => {
      element.addEventListener("click", (event) => {
        const action = event.currentTarget.dataset.action;
        const dayElement = event.currentTarget.closest(".day");
        const dayKey = dayElement.dataset.day;
        if (action === "toggle-day") this.toggleDay(dayKey);
        if (action === "add-time") {
          const input = dayElement.querySelector('[data-role="time-input"]');
          this.addTime(dayKey, input.value);
          input.value = "";
        }
        if (action === "remove-time") this.removeTime(dayKey, event.currentTarget.dataset.time);
      });
    });
  }

  toggleDay(dayKey) {
    const schedule = this.normalizedSchedule();
    schedule[dayKey].enabled = !schedule[dayKey].enabled;
    this.saveSchedule(schedule);
  }

  addTime(dayKey, time) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return;
    const schedule = this.normalizedSchedule();
    if (!schedule[dayKey].times.includes(time)) schedule[dayKey].times.push(time);
    schedule[dayKey].times.sort();
    this.saveSchedule(schedule);
  }

  removeTime(dayKey, time) {
    const schedule = this.normalizedSchedule();
    schedule[dayKey].times = schedule[dayKey].times.filter((item) => item !== time);
    this.saveSchedule(schedule);
  }

  saveSchedule(schedule) {
    if (!this.entryId) return;
    this._hass.callService("watering_scheduler", "set_schedule", {
      entry_id: this.entryId,
      schedule: this.compactSchedule(schedule),
    });
  }

  normalizedSchedule() {
    const schedule = this.parseSchedule(this.schedule || {});
    this.config.days.forEach((day) => {
      if (!schedule[day.key]) schedule[day.key] = { enabled: false, times: [] };
      schedule[day.key].enabled = Boolean(schedule[day.key].enabled);
      schedule[day.key].times = this.parseTimes(schedule[day.key].times);
    });
    return schedule;
  }

  daySchedule(dayKey) {
    const schedule = this.schedule || this.normalizedSchedule();
    return schedule[dayKey] || { enabled: false, times: [] };
  }

  parseSchedule(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).map(([dayKey, dayValue]) => {
      if (Array.isArray(dayValue)) return [dayKey, { enabled: Boolean(dayValue[0]), times: this.parseTimes(dayValue.slice(1)) }];
      if (dayValue && typeof dayValue === "object") return [dayKey, { enabled: Boolean(dayValue.enabled), times: this.parseTimes(dayValue.times) }];
      return [dayKey, { enabled: false, times: [] }];
    }));
  }

  compactSchedule(schedule) {
    return Object.fromEntries(this.config.days.map((day) => {
      const item = schedule[day.key] || { enabled: false, times: [] };
      const times = this.parseTimes(item.times);
      if (!item.enabled && times.length === 0) return null;
      return [day.key, [item.enabled ? 1 : 0, ...times]];
    }).filter(Boolean));
  }

  parseTimes(value) {
    const times = Array.isArray(value) ? value : [];
    return times.map((item) => String(item).trim()).filter((item) => /^([01]\d|2[0-3]):[0-5]\d$/.test(item)).filter((item, index, items) => items.indexOf(item) === index).sort();
  }

  state(entityId) {
    if (!entityId || !this._hass.states[entityId]) return "";
    return this._hass.states[entityId].state;
  }

  escape(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
}

customElements.define("garden-watering-card", GardenWateringCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "garden-watering-card",
  name: "Garden Watering Card",
  description: "Weekly multi-time watering scheduler for valve entities.",
});
