// The Track SEND flow's result panel, in-scene and charter-styled (parchment
// face, plum edge, hard offset shadow, dark/green keycap buttons) — the same
// paper-panel language as the Workshop tool panels, NOT an HTML overlay (HTML
// can't track the FIT-scaled canvas; see the removed tarp strip in Track.tsx).
//
// The panel renders whatever `SendUiState` React pushes in; every button emits
// a `track-send-*` intent back across the EventBus. The `recording` state is
// deliberately NOT a panel — the whole point of the take is that the train
// audibly and visibly rides the song once, so recording feedback lives on the
// SEND plaque in TrackScene, leaving the oval unobstructed.
import Phaser from "phaser";
import { EventBus } from "./EventBus.ts";
import { PanelButton, FONT, INK, PANEL_BG, PANEL_EDGE } from "./tool-panels.ts";
import { TRACK_SEND_MODAL } from "./scene-layout.ts";

export type SendUiState =
  | { kind: "idle" }
  | { kind: "recording" }
  | { kind: "ready"; canShare: boolean }
  | { kind: "shared" }
  | { kind: "saved" }
  | { kind: "error" };

const GREEN = 0x2a5c2a;

export class SendSongPanel extends Phaser.GameObjects.Container {
  private backdrop: Phaser.GameObjects.Rectangle;
  private shadow: Phaser.GameObjects.Rectangle;
  private frame: Phaser.GameObjects.Rectangle;
  private title: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private shareBtn: PanelButton;
  private saveBtn: PanelButton;
  private againBtn: PanelButton;
  private doneBtn: PanelButton;
  private uiState: SendUiState = { kind: "idle" };
  private screen = { w: 0, h: 0 };

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(60).setVisible(false);
    // Interactive backdrop swallows taps so the chrome underneath can't fire.
    this.backdrop = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.62).setOrigin(0).setInteractive();
    this.shadow = scene.add.rectangle(0, 0, 10, 10, PANEL_EDGE, 0.55).setOrigin(0);
    this.frame = scene.add.rectangle(0, 0, 10, 10, PANEL_BG, 1).setStrokeStyle(4, PANEL_EDGE).setOrigin(0);
    this.title = scene.add
      .text(0, 0, "", { fontFamily: FONT, color: INK, align: "center" })
      .setOrigin(0.5);
    this.bodyText = scene.add
      .text(0, 0, "", { fontFamily: FONT, color: INK, align: "center" })
      .setOrigin(0.5)
      .setAlpha(0.85);
    this.shareBtn = new PanelButton(scene, "📤 SEND IT", () => EventBus.emit("track-send-share"), GREEN);
    this.saveBtn = new PanelButton(scene, "💾 SAVE IT", () => EventBus.emit("track-send-save"), GREEN);
    this.againBtn = new PanelButton(scene, "🔁 TRY AGAIN", () => EventBus.emit("track-send"), GREEN);
    this.doneBtn = new PanelButton(scene, "✔ DONE", () => EventBus.emit("track-send-close"));
    this.add([
      this.backdrop, this.shadow, this.frame, this.title, this.bodyText,
      this.shareBtn.container, this.saveBtn.container, this.againBtn.container, this.doneBtn.container,
    ]);
  }

  setUiState(s: SendUiState): void {
    this.uiState = s;
    this.refresh();
  }

  layout(screenW: number, screenH: number): void {
    this.screen = { w: screenW, h: screenH };
    this.refresh();
  }

  /** Per-state copy + which action buttons show. Success states are explicit —
   *  "it worked" must be told, not implied (an iOS download is near-invisible). */
  private content(): { title: string; body: string; share: boolean; save: boolean; again: boolean } {
    switch (this.uiState.kind) {
      case "ready":
        return {
          title: "🎉 Your song is ready!",
          body: "Send it to someone, or save it.",
          share: this.uiState.canShare, save: true, again: false,
        };
      case "shared":
        return { title: "📤 Sent!", body: "Your song is on its way. Toot toot!", share: false, save: true, again: false };
      case "saved":
        return {
          title: "💾 Saved!",
          body: "my-train-song.wav is in your\nDownloads (Files app on iPad/iPhone).",
          share: false, save: false, again: false,
        };
      case "error":
        return { title: "😅 Oops, that didn't work.", body: "Give it another try!", share: false, save: false, again: true };
      default:
        return { title: "", body: "", share: false, save: false, again: false };
    }
  }

  private refresh(): void {
    const visible = this.uiState.kind !== "idle" && this.uiState.kind !== "recording";
    this.setVisible(visible);
    if (!visible || this.screen.w === 0) return;

    const { w, h } = this.screen;
    this.backdrop.setSize(w, h).setPosition(0, 0);
    const m = TRACK_SEND_MODAL;
    const fx = w * m.x, fy = h * m.y, fw = w * m.w, fh = h * m.h;
    const drop = Math.max(4, Math.round(fh * 0.02));
    this.shadow.setSize(fw, fh).setPosition(fx + drop, fy + drop);
    this.frame.setSize(fw, fh).setPosition(fx, fy);

    const c = this.content();
    this.title.setText(c.title).setFontSize(Math.max(13, Math.round(fh * 0.09)));
    this.title.setWordWrapWidth(fw * 0.9).setPosition(fx + fw / 2, fy + fh * 0.22);
    this.bodyText.setText(c.body).setFontSize(Math.max(9, Math.round(fh * 0.052)));
    this.bodyText.setWordWrapWidth(fw * 0.86).setPosition(fx + fw / 2, fy + fh * 0.44);

    // Action row (share/save/try-again), then DONE beneath.
    const actions: PanelButton[] = [];
    this.shareBtn.setVisible(c.share); if (c.share) actions.push(this.shareBtn);
    this.saveBtn.setVisible(c.save); if (c.save) actions.push(this.saveBtn);
    this.againBtn.setVisible(c.again); if (c.again) actions.push(this.againBtn);
    const rowY = fy + fh * 0.58;
    const btnH = fh * 0.16;
    const gap = fw * 0.03;
    const btnW = Math.min(fw * 0.4, (fw * 0.9 - gap * (actions.length - 1)) / Math.max(1, actions.length));
    const rowW = actions.length * btnW + (actions.length - 1) * gap;
    actions.forEach((b, i) => {
      b.place(
        { x: fx + (fw - rowW) / 2 + i * (btnW + gap), y: rowY, w: btnW, h: btnH },
        Math.max(9, Math.round(btnH * 0.3)),
      );
    });
    // With no action row (saved/shared… minus save), DONE rises to fill the gap.
    const doneY = actions.length > 0 ? fy + fh * 0.79 : fy + fh * 0.64;
    this.doneBtn.place(
      { x: fx + fw / 2 - fw * 0.14, y: doneY, w: fw * 0.28, h: fh * 0.13 },
      Math.max(9, Math.round(fh * 0.045)),
    );
  }
}
