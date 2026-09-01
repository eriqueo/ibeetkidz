# iBeetKidz — initial visual explorations (superseded)

These eight images preserve the project's first visual iteration. They are
historical design evidence, not the current visual specification and not build
inputs. Do not feed them to an art worker as the sole style reference: the dark
ground, top-down oval Track, and six-car vocabulary conflict with the shipped
warm toy-world direction, side-scrolling default Track, and four current car
types.

Current authority is `PROJECT_CHARTER.md`, `design/TRUE_PIXEL_ART_WORKFLOW.md`,
`design/review/TRACK_HOUSE_STYLE_RESET.md`, active entries in
`ART_REQUESTS.md`, and assembled runtime captures. Preserve these files for
provenance unless a separate evidence-backed history cleanup removes them.

| File | Scene | Purpose |
|---|---|---|
| `01_workshop_scene.png` | Workshop (side-on) | The primary build surface — step sequencer IS the boxcar side |
| `02_train_yard_isometric.png` | Yard (isometric) | Car storage, preview, duplicate, and branch |
| `03_loop_track_topdown.png` | Historical Track concept | Superseded top-down oval arrangement |
| `04_train_car_sprite_sheet.png` | Historical car concepts | Includes gondola/caboose ideas absent from the current four-type vocabulary |
| `05_car_family_variations.png` | Car color variants | 4 variants of the red hopper — base, stripe, roof, decals |
| `06_ui_element_kit.png` | UI chrome | PLAY/STOP/LOOP buttons, speed slider, crossing signal, crane hook |
| `07_instrument_sprites_v2.png` | Instrument sprites | 8 instruments as physical workshop-floor props (v2 — matches aesthetic) |
| `08_navigation_world_map.png` | World map | WORKSHOP → YARD → TRACK navigation stations |

## Historical rules encoded in these images

- **Dark ground**: `#201c26` was an initial-iteration choice; it is not a current
  global palette mandate.
- **Hard pixel bevels**: bright top-left edge, dark bottom-right edge. No gradients on chrome.
- **No glow effects** on buttons or rails (only a subtle phosphor bleed on active grid cells).
- **Square corners**: `border-radius: 4px` max. No pill shapes.
- **Car color = instrument family** was superseded by the current livery + load
  identity model in `design/HISTORY.md`.
- **Physical weight**: every object casts a shadow and has a ground plane.
