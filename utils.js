class StepLogger {
  constructor(steps) {
    // steps: Array von Label-Strings, z.B. ['Browser launched', 'New page created', ...]
    this.steps = steps;
    this.states = new Array(steps.length).fill("pending"); // 'pending' | 'active' | 'done'
    this.lineCount = 0;
  }

  _symbol(state) {
    return { pending: "○", active: "◉", done: "●" }[state];
  }

  _render() {
    // Cursor zurück zu Zeilenanfang (vorherige Zeilen überschreiben)
    if (this.lineCount > 0) {
      process.stdout.write(`\x1B[${this.lineCount}A`); // Cursor hoch
    }

    this.steps.forEach((label, i) => {
      const symbol = this._symbol(this.states[i]);
      const num = `${i + 1}/${this.steps.length}`;
      process.stdout.write(`\r${symbol} ${num} ${label}\x1B[K\n`);
    });

    this.lineCount = this.steps.length;
  }

  start(index) {
    // Alle vorherigen als 'done' markieren
    for (let i = 0; i < index; i++) {
      if (this.states[i] === "active") this.states[i] = "done";
    }
    this.states[index] = "active";
    this._render();
  }

  finish(index) {
    this.states[index] = "done";
    this._render();
  }

  finishAll() {
    this.states = this.states.map(() => "done");
    this._render();
  }
}

export { StepLogger };
