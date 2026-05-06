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

  constructor() {
    super();
    this._boundHandleClick = this.handleClick.bind(this);
    this._dayScheduleKeys = new Map();
    this._listenerAttached = false;
    this._selectedTimes = new Map();
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
    this._structureReady = false;
    this._dayScheduleKeys.clear();
    this.ensureStructure();
    if (this._hass) this.updateFromHass();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.config) return;
    this.ensureStructure();
    this.updateFromHass();
  }

  getCardSize() {
    return 5;
  }

  ensureStructure() {
    if (this._structureReady || !this.shadowRoot || !this.config) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --watering-accent: var(--primary-color, #0b7f6b);
          --watering-on: #0f9d58;
          --watering-border: rgba(127, 127, 127, 0.24);
          --watering-muted: var(--secondary-text-color, #69737d);
          --watering-chip: rgba(15, 157, 88, 0.12);
          --watering-warning: rgba(244, 180, 0, 0.16);
        }
        ha-card {
          background: var(--ha-card-background, var(--card-background-color, #fff));
          border-color: var(--ha-card-border-color, var(--divider-color, transparent));
          border-radius: var(--ha-card-border-radius, 12px);
          border-style: solid;
          border-width: var(--ha-card-border-width, 0);
          box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0, 0, 0, 0.12));
          color: var(--primary-text-color);
          overflow: hidden;
        }
        .card-content { padding: 18px; }
        header { align-items: center; display: flex; gap: 16px; justify-content: space-between; }
        h2 { font-size: 20px; font-weight: 650; line-height: 1.2; margin: 0; }
        p { color: var(--watering-muted); font-size: 13px; margin: 4px 0 0; }
        button { align-items: center; background: transparent; border: 0; color: inherit; cursor: pointer; display: inline-flex; font: inherit; justify-content: center; padding: 0; }
        button[disabled] { cursor: not-allowed; opacity: 0.45; }
        .power { background: var(--card-background-color, #fff); border: 1px solid var(--watering-border); border-radius: 999px; box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0, 0, 0, 0.12)); color: var(--watering-muted); height: 44px; min-width: 44px; transition: background 160ms ease, color 160ms ease, transform 160ms ease; width: 44px; }
        .power.is-on { background: var(--watering-on); color: white; }
        .power:active, .icon-button:active, .add-time:active { transform: scale(0.96); }
        .status { align-items: center; color: var(--watering-muted); display: flex; flex-wrap: wrap; font-size: 13px; gap: 8px; margin: 14px 0 16px; }
        .dot { background: #9aa0a6; border-radius: 999px; height: 8px; width: 8px; }
        .dot.is-on { background: var(--watering-on); box-shadow: 0 0 0 4px rgba(15, 157, 88, 0.16); }
        .timer { border-left: 1px solid var(--watering-border); padding-left: 8px; }
        .timer[hidden], .warning[hidden] { display: none; }
        .warning { background: var(--watering-warning); border: 1px solid rgba(244, 180, 0, 0.34); border-radius: 8px; color: var(--primary-text-color); font-size: 13px; margin: 0 0 12px; padding: 10px; }
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
        .add { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; }
        .time-editor { align-items: center; background: var(--card-background-color, #fff); border: 1px solid var(--watering-border); border-radius: 8px; color: var(--primary-text-color); display: inline-grid; gap: 3px; grid-template-columns: 30px 24px 30px 14px 30px 24px 30px; min-height: 34px; padding: 2px 5px; }
        .time-value { font-size: 13px; font-variant-numeric: tabular-nums; font-weight: 650; text-align: center; }
        .separator { color: var(--watering-muted); font-weight: 650; text-align: center; }
        .icon-button { border-radius: 6px; color: var(--watering-muted); height: 28px; transition: background 160ms ease, transform 160ms ease; width: 30px; }
        .icon-button:hover { background: rgba(127, 127, 127, 0.13); }
        .add-time { background: var(--watering-accent); border-radius: 8px; color: white; height: 36px; transition: transform 160ms ease; width: 38px; }
        ha-icon { --mdc-icon-size: 18px; }
        @media (max-width: 520px) {
          .card-content { padding: 14px; }
          .day { grid-template-columns: 1fr; }
          .day-head { justify-content: space-between; }
          .time-editor { grid-template-columns: 28px 24px 28px 12px 28px 24px 28px; }
        }
      </style>
      <ha-card>
        <div class="card-content">
          <header>
            <div>
              <h2 data-role="title"></h2>
              <p data-role="valve-name"></p>
            </div>
            <button class="power" data-action="power" title="Ouvrir la vanne">
              <ha-icon icon="mdi:water-pump"></ha-icon>
            </button>
          </header>
          <div class="status">
            <span class="dot" data-role="status-dot"></span>
            <span data-role="status-text"></span>
            <span class="timer" data-role="timer-text" hidden></span>
          </div>
          <div class="warning" data-role="warning" hidden>Selectionnez un capteur Watering Scheduler valide.</div>
          <div class="days" data-role="days">
            ${this.config.days.map((day) => this.renderDaySkeleton(day)).join("")}
          </div>
        </div>
      </ha-card>
    `;

    if (!this._listenerAttached) {
      this.shadowRoot.addEventListener("click", this._boundHandleClick);
      this._listenerAttached = true;
    }
    this._structureReady = true;
  }

  renderDaySkeleton(day) {
    const safeKey = this.escape(day.key);
    const safeLabel = this.escape(day.label);
    return `
      <section class="day" data-day="${safeKey}" data-time="${this.defaultSelectedTime()}">
        <div class="day-head">
          <span class="label">${safeLabel}</span>
          <button class="toggle" data-action="toggle-day" title="Activer ${safeLabel}" aria-pressed="false"></button>
        </div>
        <div class="schedule">
          <div class="chips" data-role="chips"></div>
          <div class="add">
            <div class="time-editor" data-role="time-editor" aria-label="Heure d'arrosage">
              <button class="icon-button" data-action="adjust-time" data-part="hour" data-step="-1" title="Heure precedente"><ha-icon icon="mdi:minus"></ha-icon></button>
              <span class="time-value" data-role="hour">06</span>
              <button class="icon-button" data-action="adjust-time" data-part="hour" data-step="1" title="Heure suivante"><ha-icon icon="mdi:plus"></ha-icon></button>
              <span class="separator">:</span>
              <button class="icon-button" data-action="adjust-time" data-part="minute" data-step="-1" title="Minute precedente"><ha-icon icon="mdi:minus"></ha-icon></button>
              <span class="time-value" data-role="minute">00</span>
              <button class="icon-button" data-action="adjust-time" data-part="minute" data-step="1" title="Minute suivante"><ha-icon icon="mdi:plus"></ha-icon></button>
            </div>
            <button class="add-time" data-action="add-time" title="Ajouter une heure"><ha-icon icon="mdi:plus"></ha-icon></button>
          </div>
        </div>
      </section>
    `;
  }

  updateFromHass() {
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

    this.setText('[data-role="title"]', this.config.title);
    this.setText('[data-role="valve-name"]', this.config.valve_name);

    const power = this.shadowRoot.querySelector('[data-action="power"]');
    power?.classList.toggle("is-on", valveState === "on");
    if (power) power.disabled = missingBinding;

    const statusDot = this.shadowRoot.querySelector('[data-role="status-dot"]');
    statusDot?.classList.toggle("is-on", valveState === "on");
    this.setText('[data-role="status-text"]', valveState === "on" ? "Ouverte" : "Fermee");

    const timer = this.shadowRoot.querySelector('[data-role="timer-text"]');
    if (timer) {
      timer.hidden = !this.timerEntity;
      timer.textContent = this.timerEntity ? `Timer ${timerState} s` : "";
    }

    const warning = this.shadowRoot.querySelector('[data-role="warning"]');
    if (warning) warning.hidden = !missingBinding;

    this.config.days.forEach((day) => this.updateDay(day));
  }

  updateDay(day) {
    const dayElement = [...this.shadowRoot.querySelectorAll(".day")]
      .find((element) => element.dataset.day === day.key);
    if (!dayElement) return;

    const item = this.daySchedule(day.key);
    const toggle = dayElement.querySelector('[data-action="toggle-day"]');
    toggle?.classList.toggle("is-on", item.enabled);
    toggle?.setAttribute("aria-pressed", item.enabled ? "true" : "false");

    const scheduleKey = JSON.stringify({ enabled: item.enabled, times: item.times });
    if (this._dayScheduleKeys.get(day.key) === scheduleKey) return;

    const chips = dayElement.querySelector('[data-role="chips"]');
    if (!chips) return;
    chips.replaceChildren(...this.createChipNodes(day.key, item.times));
    this._dayScheduleKeys.set(day.key, scheduleKey);
  }

  createChipNodes(dayKey, times) {
    if (!times.length) {
      const empty = document.createElement("span");
      empty.className = "empty";
      empty.textContent = "Aucun horaire";
      return [empty];
    }

    return times.map((time) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.append(document.createTextNode(time));

      const button = document.createElement("button");
      button.dataset.action = "remove-time";
      button.dataset.time = time;
      button.dataset.day = dayKey;
      button.title = `Supprimer ${time}`;

      const icon = document.createElement("ha-icon");
      icon.setAttribute("icon", "mdi:close");
      button.append(icon);
      chip.append(button);
      return chip;
    });
  }

  handleClick(event) {
    const actionElement = event.composedPath?.().find((node) => node?.dataset?.action)
      || event.target.closest?.("[data-action]");
    if (!actionElement || !this.shadowRoot.contains(actionElement)) return;

    const action = actionElement.dataset.action;
    if (action === "power") {
      this.togglePower();
      return;
    }

    const dayElement = actionElement.closest(".day");
    const dayKey = actionElement.dataset.day || dayElement?.dataset.day;
    if (!dayKey) return;

    if (action === "toggle-day") this.toggleDay(dayKey);
    if (action === "adjust-time") this.adjustSelectedTime(dayElement, actionElement.dataset.part, Number(actionElement.dataset.step));
    if (action === "add-time") this.addTime(dayKey, this.getSelectedTime(dayElement));
    if (action === "remove-time") this.removeTime(dayKey, actionElement.dataset.time);
  }

  togglePower() {
    if (!this.valveEntity) return;
    const service = this.state(this.valveEntity) === "on" ? "turn_off" : "turn_on";
    this._hass.callService("switch", service, { entity_id: this.valveEntity });
  }

  adjustSelectedTime(dayElement, part, step) {
    if (!dayElement || !Number.isFinite(step)) return;

    const [hour, minute] = this.getSelectedTime(dayElement).split(":").map(Number);
    let nextHour = hour;
    let nextMinute = minute;

    if (part === "hour") nextHour = this.wrap(hour + step, 24);
    if (part === "minute") {
      const total = this.wrap(hour * 60 + minute + step, 24 * 60);
      nextHour = Math.floor(total / 60);
      nextMinute = total % 60;
    }

    this.setSelectedTime(dayElement, this.formatTime(nextHour, nextMinute));
  }

  getSelectedTime(dayElement) {
    const dayKey = dayElement?.dataset.day;
    return this._selectedTimes.get(dayKey) || dayElement?.dataset.time || this.defaultSelectedTime();
  }

  setSelectedTime(dayElement, time) {
    if (!dayElement || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return;

    const [hour, minute] = time.split(":");
    dayElement.dataset.time = time;
    this._selectedTimes.set(dayElement.dataset.day, time);
    dayElement.querySelector('[data-role="hour"]').textContent = hour;
    dayElement.querySelector('[data-role="minute"]').textContent = minute;
  }

  defaultSelectedTime() {
    return "06:00";
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
    schedule[dayKey].enabled = true;
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
    return times
      .map((item) => String(item).trim())
      .filter((item) => /^([01]\d|2[0-3]):[0-5]\d$/.test(item))
      .filter((item, index, items) => items.indexOf(item) === index)
      .sort();
  }

  state(entityId) {
    if (!entityId || !this._hass.states[entityId]) return "";
    return this._hass.states[entityId].state;
  }

  setText(selector, value) {
    const element = this.shadowRoot.querySelector(selector);
    if (element && element.textContent !== String(value ?? "")) {
      element.textContent = String(value ?? "");
    }
  }

  formatTime(hour, minute) {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  wrap(value, modulo) {
    return ((value % modulo) + modulo) % modulo;
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
