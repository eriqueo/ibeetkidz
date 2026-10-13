// The dev-only `?tune` panel: one control per entry in TUNABLES, applied live.
//
// How "live" works, and why it is cheap: `gameConfig` is held BY REFERENCE by
// every read site, so a change here is `applyGameConfig` (write in place) plus
// `reloadScene()` (a fresh instance of the running scene, via the same
// stop → remove → add path a navigation takes — see scene-switch.ts rule 3).
// The scene's own `create()` reads the new numbers; this panel knows nothing
// about what they mean. Text and choice fields (the station sheets) apply
// without a re-mount: they are read when the next lane is made, and tearing
// the Workshop down on every keystroke would close whatever tool was open.
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
import { parseTiledLayer, type TiledSpawn } from "../game/TiledParser.ts";
import { saveConfig } from "./save-sink.ts";
import { dumpState } from "./state-dump.ts";
import { EDITOR_MARKER } from "./boot.ts";
import rawText from "../game/game-config.json?raw";
import workshopMap from "../assets/maps/workshop.json";

/** The text to write: stable key order from TUNABLES, two-space, newline. */
function serialize(cfg: GameConfig): string {
  const out: Record<string, unknown> = {};
  for (const t of TUNABLES) writePath(out, t.path, readPath(cfg, t.path));
  return `${JSON.stringify(out, null, 2)}\n`;
}

const FONT = "13px ui-monospace, Menlo, Consolas, monospace";
const STATION_GROUP = "Station · ";

/** The Workshop map's facts about a station, for its sheet's read-only line:
 *  where the character stands and what tapping it does. These live in
 *  `workshop.json` (edit them with `?edit`), not in the config. */
function stationMapFacts(id: string, spawns: readonly TiledSpawn[]): string {
  const s = spawns.find((x) => x.sprite === `inst-${id}`);
  if (!s) return "not on the Workshop floor";
  const where = `at ${Math.round(s.cx * 100)}%, ${Math.round(s.cy * 100)}%`;
  const does = s.action ? `${s.action}${s.arg !== undefined ? `(${String(s.arg)})` : ""}` : "no action";
  return `${s.id} · ${where} · ${does}`;
}

export class TunePanel {
  private readonly root: HTMLDivElement;
  private readonly status: HTMLDivElement;
  private readonly inputs = new Map<string, HTMLInputElement | HTMLSelectElement>();
  private readonly readouts = new Map<string, HTMLSpanElement>();
  private working: GameConfig = snapshotGameConfig();
  /** What the file said when the panel opened (or last saved). */
  private baseline = rawText;
  private reloadTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly workshopSpawns: readonly TiledSpawn[];
  private readonly onKey = (e: KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      void this.save();
    }
  };

  constructor() {
    this.workshopSpawns = parseTiledLayer(workshopMap, "ui-layer");
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
    Object.assign(head.style, { display: "flex", gap: "6px", alignItems: "center", marginBottom: "6px", flexWrap: "wrap" });
    const title = document.createElement("strong");
    title.textContent = "tune";
    head.append(
      title,
      this.button("save", () => void this.save()),
      this.button("reset", () => this.reset()),
      this.button("dump state", () => void this.dump()),
    );
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
      if (group.startsWith(STATION_GROUP)) {
        // A sheet: the map's facts first (read-only), then the config's.
        const id = list[0]?.path.split(".")[1] ?? "";
        const facts = document.createElement("div");
        facts.textContent = stationMapFacts(id, this.workshopSpawns);
        Object.assign(facts.style, { fontSize: "11px", opacity: "0.7", margin: "0 0 4px" });
        facts.title = "From workshop.json — move or rewire the character with ?edit";
        this.root.append(facts);
      }
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

    const value = readPath(this.working, t.path);
    let input: HTMLInputElement | HTMLSelectElement;
    if (t.kind === "choice") {
      const select = document.createElement("select");
      for (const c of t.choices ?? []) {
        const o = document.createElement("option");
        o.value = c;
        o.textContent = c;
        select.append(o);
      }
      select.value = String(value);
      Object.assign(select.style, { width: "100%", font: FONT, background: "#2a2118", color: "#e8dcc8" });
      input = select;
    } else {
      const field = document.createElement("input");
      if (t.kind === "boolean") {
        field.type = "checkbox";
        field.checked = value === true;
      } else if (t.kind === "text") {
        field.type = "text";
        field.value = String(value);
        Object.assign(field.style, { width: "100%", font: FONT, background: "#2a2118", color: "#e8dcc8", border: "1px solid #6b5a46" });
      } else {
        field.type = "range";
        field.min = String(t.min);
        field.max = String(t.max);
        field.step = String(t.step);
        field.value = String(value);
        field.style.width = "100%";
      }
      input = field;
    }
    input.addEventListener("input", () => {
      writePath(this.working as unknown as Record<string, unknown>, t.path, this.valueOf(t, input));
      this.show(t);
      // Numbers and switches draw something; a sheet is read when the next
      // lane is made, so it needs no re-mount.
      this.applyLive(t.kind === "number" || t.kind === "boolean");
    });
    this.inputs.set(t.path, input);
    this.readouts.set(t.path, readout);
    row.append(input);
    this.show(t);
    return row;
  }

  private valueOf(t: Tunable, input: HTMLInputElement | HTMLSelectElement): unknown {
    if (input instanceof HTMLSelectElement) return input.value;
    if (t.kind === "boolean") return input.checked;
    if (t.kind === "text") return input.value;
    return Number(input.value);
  }

  private show(t: Tunable): void {
    const v = readPath(this.working, t.path);
    const r = this.readouts.get(t.path);
    if (!r) return;
    if (typeof v === "number") r.textContent = String(Math.round(v * 1000) / 1000);
    else if (typeof v === "boolean") r.textContent = v ? "on" : "off";
    else r.textContent = "";
  }

  /** Apply now; re-mount the scene a beat later so a drag is one rebuild. */
  private applyLive(remount = true): void {
    const problems = applyGameConfig(this.working);
    if (problems.length > 0) {
      this.say(problems[0] ?? "invalid", true);
      return;
    }
    if (remount) {
      if (this.reloadTimer) clearTimeout(this.reloadTimer);
      this.reloadTimer = setTimeout(() => {
        this.reloadTimer = null;
        reloadScene();
      }, 120);
    }
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
      if (input instanceof HTMLSelectElement) input.value = String(v);
      else if (t.kind === "boolean") input.checked = v === true;
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

  private async dump(): Promise<void> {
    try {
      this.say(await dumpState());
    } catch (err) {
      this.say(`dump failed: ${err instanceof Error ? err.message : String(err)}`, true);
    }
  }

  private say(text: string, bad = false): void {
    this.status.textContent = text;
    this.status.style.color = bad ? "#ff6b6b" : "#e8dcc8";
  }
}
