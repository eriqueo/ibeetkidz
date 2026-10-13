// The dev rail: a strip on the left edge of `?edit` and `?tune`.
//
// It exists because `?edit` turns every Tiled button into a drag box, so the
// TRACK plaque that should take you to the Track only selects itself, and there
// was no way to reach a screen without leaving the editor. The rail carries:
//
//   - one button per screen, which travels there through the SAME command the
//     game's own buttons end in (`setActiveView`), minus the kid-facing guards
//     ("build a train first") that would only be in the way of an editor;
//   - on `?edit`, the drag / play switch (also the backquote key) — play parks
//     the outlines so the scene's own buttons work again;
//   - a note box: a save appends to `design/PREVIEW_NOTES.md`, tagged with the
//     screen and the selected outline, for the agent to pick up;
//   - the state dump, which `?edit` otherwise only had as a shortcut.
//
// DOM, not Phaser, for the reason the tune panel gives: it must outlive every
// scene it navigates between. It sits on the LEFT because the tune panel owns
// the right edge, and it folds to a tab so it never hides the game for long.
import type { AppView } from "../core/types.ts";
import { dumpState } from "./state-dump.ts";
import { openNotes, saveNote } from "./save-sink.ts";

const FONT = "13px ui-monospace, Menlo, Consolas, monospace";
const VIEWS: readonly AppView[] = ["map", "workshop", "yard", "track"];

export interface RailHooks {
  /** Present only on `?edit`: read and flip the drag/play switch. */
  readonly drag?: { get(): boolean; set(on: boolean): void };
  /** The selected outline on `?edit`, if any — becomes part of a note's "where". */
  readonly selected?: () => string | undefined;
}

function bridge(): Window["__ibeetkidz_test__"] {
  return window.__ibeetkidz_test__;
}

export class DevRail {
  private readonly root: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private readonly status: HTMLDivElement;
  private readonly note: HTMLTextAreaElement;
  private readonly viewButtons = new Map<AppView, HTMLButtonElement>();
  private dragButton: HTMLButtonElement | null = null;
  private open = true;

  constructor(private readonly hooks: RailHooks) {
    this.root = document.createElement("div");
    this.root.dataset["ibkRail"] = "1";
    Object.assign(this.root.style, {
      position: "fixed",
      left: "0",
      top: "50%",
      transform: "translateY(-50%)",
      display: "flex",
      alignItems: "stretch",
      zIndex: "10000",
      font: FONT,
      color: "#e8dcc8",
    } satisfies Partial<CSSStyleDeclaration>);

    this.body = document.createElement("div");
    Object.assign(this.body.style, {
      width: "190px",
      background: "rgba(20, 16, 12, 0.92)",
      padding: "8px 10px 10px",
      boxSizing: "border-box",
      boxShadow: "2px 0 8px rgba(0,0,0,0.5)",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    } satisfies Partial<CSSStyleDeclaration>);

    this.body.append(this.heading("screens"));
    const grid = document.createElement("div");
    Object.assign(grid.style, { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" });
    for (const v of VIEWS) {
      const b = this.button(v, () => this.go(v));
      this.viewButtons.set(v, b);
      grid.append(b);
    }
    this.body.append(grid);

    if (hooks.drag) {
      this.body.append(this.heading("mode"));
      this.dragButton = this.button("", () => this.toggleDrag());
      this.dragButton.title = "drag the chrome, or play through it (` key)";
      this.body.append(this.dragButton);
    }

    this.body.append(this.heading("note for the agent"));
    this.note = document.createElement("textarea");
    this.note.rows = 5;
    this.note.placeholder = "what's wrong, what you want…";
    Object.assign(this.note.style, {
      width: "100%",
      boxSizing: "border-box",
      font: FONT,
      background: "#2a2118",
      color: "#e8dcc8",
      border: "1px solid #6b5a46",
      resize: "vertical",
    } satisfies Partial<CSSStyleDeclaration>);
    // Typing must not reach the game or the editor's shortcuts (arrows nudge,
    // backquote flips the mode) — ctrl+enter saves the note instead.
    this.note.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void this.saveNote();
      }
    });
    this.note.addEventListener("keyup", (e) => e.stopPropagation());
    const row = document.createElement("div");
    Object.assign(row.style, { display: "flex", gap: "4px" });
    row.append(this.button("save note", () => void this.saveNote()), this.button("dump state", () => void this.dump()));
    this.body.append(this.note, row);

    this.status = document.createElement("div");
    Object.assign(this.status.style, { fontSize: "11px", opacity: "0.85", minHeight: "14px", overflowWrap: "anywhere" });
    this.body.append(this.status);

    const tab = this.button("◂", () => this.fold());
    tab.title = "hide / show the dev rail";
    Object.assign(tab.style, { borderRadius: "0 4px 4px 0", padding: "8px 4px", alignSelf: "center" });

    this.root.append(this.body, tab);
    document.body.append(this.root);
    this.refresh();
    void openNotes().then((n) => {
      if (n !== null && !this.status.textContent) this.say(`${n} open note${n === 1 ? "" : "s"}`);
    });
  }

  /** Re-mark the current screen and the mode; called on every scene-ready. */
  refresh(): void {
    const current = bridge()?.getProject().activeView;
    for (const [v, b] of this.viewButtons) {
      const on = v === current;
      b.style.background = on ? "#ffd166" : "#3a2f24";
      b.style.color = on ? "#1a1208" : "#e8dcc8";
    }
    if (this.dragButton && this.hooks.drag) {
      const on = this.hooks.drag.get();
      this.dragButton.textContent = on ? "dragging · switch to play" : "playing · switch to drag";
      this.dragButton.style.background = on ? "#2f6b45" : "#3a2f24";
    }
  }

  toggleDrag(): void {
    if (!this.hooks.drag) return;
    this.hooks.drag.set(!this.hooks.drag.get());
    this.refresh();
  }

  destroy(): void {
    this.root.remove();
  }

  private go(view: AppView): void {
    const b = bridge();
    if (!b) return this.say("game not ready yet", true);
    b.dispatch({ type: "setActiveView", view });
  }

  private where(): string {
    const view = bridge()?.getProject().activeView ?? "?";
    const sel = this.hooks.selected?.();
    return sel ? `${view} · ${sel}` : view;
  }

  private async saveNote(): Promise<void> {
    const text = this.note.value;
    if (!text.trim()) return this.say("write something first", true);
    const res = await saveNote(text, this.where());
    if (res.ok) {
      this.note.value = "";
      this.say(`saved · ${res.open} open`);
    } else {
      this.say(res.detail, true);
    }
  }

  private async dump(): Promise<void> {
    try {
      this.say(await dumpState());
    } catch (err) {
      this.say(`dump failed: ${err instanceof Error ? err.message : String(err)}`, true);
    }
  }

  private fold(): void {
    this.open = !this.open;
    this.body.style.display = this.open ? "flex" : "none";
    const tab = this.root.lastElementChild as HTMLButtonElement | null;
    if (tab) tab.textContent = this.open ? "◂" : "▸";
  }

  private heading(text: string): HTMLDivElement {
    const h = document.createElement("div");
    h.textContent = text;
    Object.assign(h.style, { color: "#ffd166", fontSize: "11px", textTransform: "uppercase", marginTop: "2px" });
    return h;
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
      padding: "3px 6px",
      cursor: "pointer",
    });
    b.addEventListener("click", onClick);
    return b;
  }

  private say(text: string, bad = false): void {
    this.status.textContent = text;
    this.status.style.color = bad ? "#ff6b6b" : "#e8dcc8";
  }
}
