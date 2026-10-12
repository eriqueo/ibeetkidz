// The dev-only `?tune` panel: one control per entry in TUNABLES, applied live.
//
// How "live" works, and why it is cheap: `gameConfig` is held BY REFERENCE by
// every read site, so a change here is `applyGameConfig` (write in place) plus
// `reloadScene()` (a fresh instance of the running scene, via the same
// stop → remove → add path a navigation takes — see scene-switch.ts rule 3).
// The scene's own `create()` reads the new numbers; this panel knows nothing
// about what they mean.
//
// This is plain DOM, not Phaser, on purpose: it must survive the scene it is
// tuning being torn down under it, and sliders are a solved problem in HTML.
// Styles are inline because `tests/unit/architecture.test.ts` keeps the app to
// one CSS file and this chunk must not add to the production bundle.
//
// Saving goes through `saveConfig` (the HMR channel, `IBK_EDIT=1` required).
// The baseline for the stale-write check is the file's TEXT as the dev server
// served it (`?raw`), not a re-serialization, so a hand-formatted file is
// still recognised as unchanged.
import { TUNABLES, readPath, writePath, type GameConfig, type Tunable } from "../game/game-config-schema.ts";
import { applyGameConfig, snapshotGameConfig } from "../game/game-config.ts";
import { reloadScene } from "../game/game-host.ts";
import { saveConfig } from "./save-sink.ts";
import { EDITOR_MARKER } from "./boot.ts";
import rawText from "../game/game-config.json?raw";

/** The text to write: stable key order from TUNABLES, two-space, newline. */
function serialize(cfg: GameConfig): string {
  const out: Record<string, unknown> = {};
  for (const t of TUNABLES) writePath(out, t.path, readPath(cfg, t.path));
  return `${JSON.stringify(out, null, 2)}\n`;
}

const FONT = "13px ui-monospace, Menlo, Consolas, monospace";

export class TunePanel {
  private readonly root: HTMLDivElement;
  private readonly status: HTMLDivElement;
  private readonly inputs = new Map<string, HTMLInputElement>();
  private readonly readouts = new Map<string, HTMLSpanElement>();
  private working: GameConfig = snapshotGameConfig();
  /** What the file said when the panel opened (or last saved). */
  private baseline = rawText;
  private reloadTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onKey = (e: KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      void this.save();
    }
  };

  constructor() {
    this.root = document.createElement("div");
    this.root.dataset["ibkTune"] = "1";
    Object.assign(this.root.style, {
      position: "fixed",
      top: "0",
      right: "0",
      width: "300px",
      maxHeight: "100vh",
      overflowY: "auto",
      background: "rgba(20, 16, 12, 0.92)",
      color: "#e8dcc8",
      font: FONT,
      padding: "8px 10px 14px",
      boxSizing: "border-box",
      zIndex: "10000",
      boxShadow: "-2px 0 8px rgba(0,0,0,0.5)",
    } satisfies Partial<CSSStyleDeclaration>);

    const head = document.createElement("div");
    Object.assign(head.style, { display: "flex", gap: "6px", alignItems: "center", marginBottom: "6px" });
    const title = document.createElement("strong");
    title.textContent = "tune";
    head.append(title, this.button("save", () => void this.save()), this.button("reset", () => this.reset()));
    this.root.append(head);

    this.status = document.createElement("div");
    Object.assign(this.status.style, { fontSize: "11px", opacity: "0.8", minHeight: "14px", marginBottom: "6px" });
    this.root.append(this.status);

    const groups = new Map<string, Tunable[]>();
    for (const t of TUNABLES) groups.set(t.group, [...(groups.get(t.group) ?? []), t]);
    for (const [group, list] of groups) {
      const h = document.createElement("div");
      h.textContent = group;
      Object.assign(h.style, { margin: "8px 0 2px", color: "#ffd166", fontSize: "11px", textTransform: "uppercase" });
      this.root.append(h);
      for (const t of list) this.root.append(this.row(t));
    }

    document.body.append(this.root);
    window.addEventListener("keydown", this.onKey);
    this.say("drag a slider; ctrl+S saves to game-config.json");
    console.info(`[${EDITOR_MARKER}] tune panel open`);
  }

  destroy(): void {
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    window.removeEventListener("keydown", this.onKey);
    this.root.remove();
  }

  private button(label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.textContent = label;
    b.type = "button";
    Object.assign(b.style, {
      font: FONT,
      background: "#3a2f24",
      color: "#e8dcc8",
      border: "1px solid #6b5a46",
      borderRadius: "3px",
      padding: "2px 8px",
      cursor: "pointer",
    });
    b.addEventListener("click", onClick);
    return b;
  }

  private row(t: Tunable): HTMLLabelElement {
    const row = document.createElement("label");
    Object.assign(row.style, { display: "block", margin: "4px 0" });
    if (t.help) row.title = t.help;

    const line = document.createElement("div");
    Object.assign(line.style, { display: "flex", justifyContent: "space-between" });
    const name = document.createElement("span");
    name.textContent = t.label;
    const readout = document.createElement("span");
    readout.style.opacity = "0.85";
    line.append(name, readout);
    row.append(line);

    const input = document.createElement("input");
    const value = readPath(this.working, t.path);
    if (t.kind === "boolean") {
      input.type = "checkbox";
      input.checked = value === true;
    } else {
      input.type = "range";
      input.min = String(t.min);
      input.max = String(t.max);
      input.step = String(t.step);
      input.value = String(value);
      input.style.width = "100%";
    }
    input.addEventListener("input", () => {
      const next = t.kind === "boolean" ? input.checked : Number(input.value);
      writePath(this.working as unknown as Record<string, unknown>, t.path, next);
      this.show(t);
      this.applyLive();
    });
    this.inputs.set(t.path, input);
    this.readouts.set(t.path, readout);
    row.append(input);
    this.show(t);
    return row;
  }

  private show(t: Tunable): void {
    const v = readPath(this.working, t.path);
    const r = this.readouts.get(t.path);
    if (r) r.textContent = typeof v === "number" ? String(Math.round(v * 1000) / 1000) : v ? "on" : "off";
  }

  /** Apply now; re-mount the scene a beat later so a drag is one rebuild. */
  private applyLive(): void {
    const problems = applyGameConfig(this.working);
    if (problems.length > 0) {
      this.say(problems[0] ?? "invalid", true);
      return;
    }
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => {
      this.reloadTimer = null;
      reloadScene();
    }, 120);
    this.say(this.dirty() ? "unsaved — ctrl+S" : "matches file");
  }

  private dirty(): boolean {
    return serialize(this.working) !== this.baseline;
  }

  private reset(): void {
    this.working = JSON.parse(this.baseline) as GameConfig;
    for (const t of TUNABLES) {
      const input = this.inputs.get(t.path);
      const v = readPath(this.working, t.path);
      if (!input) continue;
      if (t.kind === "boolean") input.checked = v === true;
      else input.value = String(v);
      this.show(t);
    }
    this.applyLive();
    this.say("reset to file");
  }

  private async save(): Promise<void> {
    const json = serialize(this.working);
    const res = await saveConfig(json, this.baseline);
    if (res.ok) this.baseline = json;
    this.say(res.detail, !res.ok);
  }

  private say(text: string, bad = false): void {
    this.status.textContent = text;
    this.status.style.color = bad ? "#ff6b6b" : "#e8dcc8";
  }
}
