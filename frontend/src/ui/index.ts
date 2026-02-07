import type { CityId, AlgorithmType } from "../types/index.js";

export interface ControlPanelProps {
  cities: { id: CityId; name: string }[];
  selectedCity: CityId;
  selectedAlgo: AlgorithmType;
  canStart: boolean;
  isRunning: boolean;
}

export interface ControlPanelCallbacks {
  onCityChange: (city: CityId) => void;
  onAlgoChange: (algo: AlgorithmType) => void;
  onStart: () => void;
  onReset: () => void;
}

const ALGO_LABELS: Record<AlgorithmType, string> = {
  astar: "A*",
  bfs: "BFS",
  dfs: "DFS",
};

export class ControlPanel {
  private el: HTMLElement;
  private citySelect: HTMLSelectElement;
  private algoSelect: HTMLSelectElement;
  private startBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private statusEl: HTMLElement;

  constructor(
    container: HTMLElement,
    props: ControlPanelProps,
    private callbacks: ControlPanelCallbacks,
  ) {
    this.el = document.createElement("div");
    this.el.className = "control-panel";

    // City selector
    const cityGroup = this.createGroup("City");
    this.citySelect = document.createElement("select");
    for (const city of props.cities) {
      const opt = document.createElement("option");
      opt.value = city.id;
      opt.textContent = city.name;
      if (city.id === props.selectedCity) opt.selected = true;
      this.citySelect.appendChild(opt);
    }
    this.citySelect.addEventListener("change", () => {
      callbacks.onCityChange(this.citySelect.value as CityId);
    });
    cityGroup.appendChild(this.citySelect);
    this.el.appendChild(cityGroup);

    // Algorithm selector
    const algoGroup = this.createGroup("Algorithm");
    this.algoSelect = document.createElement("select");
    for (const [value, label] of Object.entries(ALGO_LABELS)) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      if (value === props.selectedAlgo) opt.selected = true;
      this.algoSelect.appendChild(opt);
    }
    this.algoSelect.addEventListener("change", () => {
      callbacks.onAlgoChange(this.algoSelect.value as AlgorithmType);
    });
    algoGroup.appendChild(this.algoSelect);
    this.el.appendChild(algoGroup);

    // Status text
    this.statusEl = document.createElement("div");
    this.statusEl.className = "cp-status";
    this.statusEl.textContent = "Shift+click to place origin";
    this.el.appendChild(this.statusEl);

    // Buttons
    const btnRow = document.createElement("div");
    btnRow.className = "cp-buttons";

    this.startBtn = document.createElement("button");
    this.startBtn.className = "cp-btn cp-btn-start";
    this.startBtn.textContent = "Start";
    this.startBtn.disabled = !props.canStart;
    this.startBtn.addEventListener("click", () => callbacks.onStart());
    btnRow.appendChild(this.startBtn);

    this.resetBtn = document.createElement("button");
    this.resetBtn.className = "cp-btn cp-btn-reset";
    this.resetBtn.textContent = "Reset";
    this.resetBtn.addEventListener("click", () => callbacks.onReset());
    btnRow.appendChild(this.resetBtn);

    this.el.appendChild(btnRow);
    container.appendChild(this.el);
  }

  private createGroup(label: string): HTMLElement {
    const group = document.createElement("div");
    group.className = "cp-group";
    const lbl = document.createElement("label");
    lbl.className = "cp-label";
    lbl.textContent = label;
    group.appendChild(lbl);
    return group;
  }

  update(props: Partial<ControlPanelProps>): void {
    if (props.canStart !== undefined) {
      this.startBtn.disabled = !props.canStart;
    }
    if (props.isRunning !== undefined) {
      this.startBtn.disabled = props.isRunning;
      this.citySelect.disabled = props.isRunning;
      this.algoSelect.disabled = props.isRunning;
    }
    if (props.selectedCity !== undefined) {
      this.citySelect.value = props.selectedCity;
    }
    if (props.selectedAlgo !== undefined) {
      this.algoSelect.value = props.selectedAlgo;
    }
  }

  setStatus(text: string): void {
    this.statusEl.textContent = text;
  }
}
