# iBeetKidz — Visual Reference Images

These 8 images are the **canonical visual spec** for the iBeetKidz SNES dark pixel aesthetic.
They were generated as the definitive design reference and should be treated as brand assets.
Feed them into Claude Design or any design tool as style references.

| File | Scene | Purpose |
|---|---|---|
| `01_workshop_scene.png` | Workshop (side-on) | The primary build surface — step sequencer IS the boxcar side |
| `02_train_yard_isometric.png` | Yard (isometric) | Car storage, preview, duplicate, and branch |
| `03_loop_track_topdown.png` | Track (top-down oval) | Song arrangement — crossing signal = "now playing" |
| `04_train_car_sprite_sheet.png` | Car archetypes | All 6 car types: hopper, tanker, boxcar, gondola, flatcar, caboose |
| `05_car_family_variations.png` | Car color variants | 4 variants of the red hopper — base, stripe, roof, decals |
| `06_ui_element_kit.png` | UI chrome | PLAY/STOP/LOOP buttons, speed slider, crossing signal, crane hook |
| `07_instrument_sprites_v2.png` | Instrument sprites | 8 instruments as physical workshop-floor props (v2 — matches aesthetic) |
| `08_navigation_world_map.png` | World map | WORKSHOP → YARD → TRACK navigation stations |

## Design Rules Encoded in These Images

- **Dark ground**: `#201c26` — not green, not grey, not navy. This specific dark.
- **Hard pixel bevels**: bright top-left edge, dark bottom-right edge. No gradients on chrome.
- **No glow effects** on buttons or rails (only a subtle phosphor bleed on active grid cells).
- **Square corners**: `border-radius: 4px` max. No pill shapes.
- **Car color = instrument family**: drums → tomato red, melody → teal, mixed → grape, voice → gold.
- **Physical weight**: every object casts a shadow and has a ground plane.
