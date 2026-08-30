# iBeetKidz True Pixel-Art Production Workflow

**Status:** Canonical production workflow for new or remade sprite art.  
**Audience:** Art agents and engineers preparing, reviewing, or mounting raster assets.

> **Definition.** In this project, *true pixel art* is artwork deliberately authored on a small integer grid, using a fixed palette, with every final game pixel produced by nearest-neighbour enlargement. It is **not** a high-resolution illustration made to look pixelated through prompts, filters, colour reduction, or post-hoc resampling.

This document exists because an AR-064–069 delivery was technically valid but visibly wrong: it contained anti-aliased, blended, pixel-styled illustration rather than deliberate raster pixels. The remake established the production pipeline in `scripts/pixel_art.py`, the output-specific scripts in `scripts/remake_ar*.py`, and the validation gate in `scripts/validate_track_pixel_art.py`. The governing art request, source palette, product charter, and world-depth rules remain authoritative.[1][2][3][4]

## 1. Authority and visual target

Read the current `ART_REQUESTS.md` **in full** before drawing. Its `CONTRACT` and `CURRENT VISUAL DIRECTION` sections override older creative briefs. Then view the actual shipped reference sprites, rather than relying on prose descriptions or generated samples. The character reference is `src/assets/sprites/instruments/inst-drums-passive.png`; the physical UI-chrome reference is `src/assets/sprites/buttons/btn-nav-yard-idle.png`; and Track vehicle material reference is `src/assets/sprites/cars/car-side-boxcar.png`.

The intended look is a cheerful late-1980s/early-1990s toy console game: warm, chunky, handmade, saturated but not neon, and understandable to a non-reader. The scene must read as a small self-contained game world rather than a web panel.[3]

| Visual property | Required treatment | Rejected treatment |
|---|---|---|
| **Pixel construction** | Draw discrete clusters on a low-resolution master; enlarge with nearest-neighbour only. | High-resolution painted/AI image, vector source, smooth resize, pixelation filter, or automatic quantisation. |
| **Outline** | One source-pixel `ink` outline around sprites and major forms. | Anti-aliased contour, blurred rim light, glow, or outline gaps caused by alpha smoothing. |
| **Depth** | Three to five clear flat material steps and hard offset shadow clusters. | Soft painterly modelling, airbrushed gradient, bevel blur, or photographic texture. |
| **Materials** | Charcoal/plum structure, brass/amber hardware, cream paper, distinct semantic accents. | Random materials, arbitrary new accent colours, parchment controls mixed into Track’s charcoal/brass family. |
| **Detail density** | Large silhouette first, two or three secondary forms second, optional small material marks last. | Repetitive micro-detail, unnameable symbols, noisy dither, or features invisible at actual game size. |

## 2. Palette lock

The source palette is `design/palette-nintendo.json`. Use these exact RGBA values in output code, with the two explicitly approved hard-alpha shadow steps. Do not invent a “close enough” colour, sample colours from an AI image, or let an image exporter generate blends. The helper module rejects an opaque pixel that is not in its defined palette.[2]

| Semantic use | Name | Hex / RGBA |
|---|---|---|
| Transparent surround | `transparent` | `#00000000` |
| Outline and deepest recess | `ink` | `#2B2440` |
| Secondary dark structure | `ink_soft` | `#5A4F6E` |
| Parchment highlight / lettering | `paper` | `#FBF3D9` |
| Parchment shadow | `paper2` | `#F4E8C1` |
| Brass highlight | `sunshine` | `#FFCC3E` |
| Brass/wood midtone | `orange` | `#F08A3C` |
| Signal-stop accent | `tomato` | `#E8503A` |
| Grass accent | `grass` | `#5BBF52` |
| Cyan control / water accent | `sky` | `#4AA3DF` |
| Cool highlight | `sky_top` | `#7FB7E8` |
| Purple steel / rock accent | `grape` | `#8A5CC4` |
| Two-step contact shadow only | `shadow_25` | `rgba(43,36,64,0.25)` |
| Two-step contact-shadow core only | `shadow_35` | `rgba(43,36,64,0.35)` |

A world shadow may contain the two `shadow_*` colours only as **hard-edged blocks on the low-resolution master**. It must never be a blur, Gaussian feather, alpha gradient, or semi-transparent rectangle behind an entire sprite. This satisfies the project’s hard-shadow rule while retaining the compact ground-contact cue required for world actors.[2][4]

## 3. Non-negotiable source-grid method

Create a `CanvasSpec` for every final PNG. Its `pixel_scale` is the number of final-file pixels represented by one authored source pixel. Draw exclusively on `master_canvas(spec)`, using the helpers in `scripts/pixel_art.py`, and publish using `export_discrete`, `export_tile_x`, or `export_tile_xy`. These methods allow only nearest-neighbour enlargement; there is no antialiasing path.

| Output class | Example final canvas | Master grid | Export rule |
|---|---:|---:|---|
| Track header keycap | 512 × 512 | 128 × 128 | 4× nearest-neighbour |
| Car tarp overlay | 300 × 190 | 60 × 38 | 5× nearest-neighbour |
| Flatcar tarp overlay | 300 × 110 | 60 × 22 | 5× nearest-neighbour |
| World roof/wall | 640 × 520 / 640 × 720 | 160 × 130 / 160 × 180 | 4× nearest-neighbour |
| Bridge bank / water | 320 × 250 / 640 × 150 | 64 × 50 / 128 × 30 | 5× nearest-neighbour |
| Rotating wheel | 76 × 76 | 38 × 38 | 2× nearest-neighbour |

When a required final dimension is not divisible by the intended pixel scale, retain the grid-perfect visual area and add transparent padding in an area that does not alter registration. The current bridge deck is the reference: its visual master is 640 × 168 at 4×, placed at y=0 in the required 640 × 170 canvas, with a transparent 2px bottom pad. Do **not** solve this by interpolating to 170px.

The only acceptable semantic drawing primitives are low-grid pixel operations such as `rect`, `line`, `polygon`, and deliberately sampled circles. System fonts, browser text, and high-resolution vector ellipses are not sprite art. Use the included 5×7 `pixel_text` function for baked UI labels, and place it on the master before enlargement.

## 4. Composition grammar

Every asset begins with its silhouette. A child should identify the object before reading its label: a locomotive has a tall stack, boiler, cab, and broad wheels; a map is a folded paper shape; a tarp is a blue fabric mass with tied edges; a bridge pier has two planted legs and large crossing braces. Add only the material groups necessary to support that silhouette.

| Asset family | Required visual grammar | Registration rule |
|---|---|---|
| **Track keycaps** | A broad charcoal slab, plum hard shadow, brass rim, four large brass screws, one central 45–60% face pictogram, and large cream 5×7 label. | State pairs keep an identical canvas and alpha content box. Only face depth and icon state change. |
| **Tarp overlays** | Contour follows the car type: rectangular boxcar, rounded tanker, sloped hopper, low flatcar cargo bundle. Use blue fabric blocks, one or two folds, rope ties, livery aperture. | Canvas exactly equals body canvas. Number plate, couplers, crew, and wheel line stay transparent. |
| **Tunnel pieces** | Irregular warm/plum stone, clear native arch aperture, broad roof ribs, distinct near roof / back wall / portal depth roles. | Keep each depth layer separate. Roof and wall tile in X. Portal opening aligns to railhead and remains true transparent alpha. |
| **Bridge pieces** | Deck at railhead, big wooden planks, readable iron plate cadence, open brace bays, planted pier/footing, grass-capped rocky banks, quiet water marks. | Deck railhead is y=0. Deck/water tile in X; bank and pier corners must be alpha 0. |
| **Wheel and shadow** | Thick stepped tyre, nested steel sidewall, 4–5 broad symmetric spokes, centred brass hub; low compact two-step contact shadow. | Hub is exact pixel centre; tyre tangent meets railhead. The shadow is a separate object at the contact plane. |

World depth is not an aesthetic optional. Any object that must be passed behind is a separate transparent overlay with a declared baseline; do not bake the entire scene into one opaque background. Every vehicle and actor also needs a contact shadow that tells the player where it touches the ground.[4]

## 5. Exact workflow for a future art request

Begin by copying the relevant existing remake script rather than starting in an image generator. Define output specs and a master directory under `design/art-masters/arNNN/`. Draw at the lowest source resolution that preserves a distinct silhouette. Use integer coordinates and only the helpers/palette in `scripts/pixel_art.py`.

| Step | Required action | Evidence to retain |
|---|---|---|
| **1. Inspect** | Read the full current request, charter, game-feel rules, and existing asset placement code. View authoritative shipped assets at native size. | Add constraints, reference paths, and code-measured anchors to the request’s delivery entry. |
| **2. Specify** | Write one `CanvasSpec` per output. Establish master scale, exact canvas, axis/railhead, tiling direction, and whether corners must be transparent. | Comment the registration numbers beside the spec in the generator. |
| **3. Draw** | Build silhouette, structural outline, material fills, one or two shade clusters, then only essential readable detail. Draw baked labels using `pixel_text`. | Save the low-resolution `*.master.png` to `design/art-masters/arNNN/`. |
| **4. Export** | Use `export_discrete` for sprites/overlays, `export_tile_x` for scrolling layers, and `export_tile_xy` only for bi-directional weather. | Final PNG in the exact requested folder/name. |
| **5. Prove** | Render required 70px UI sheet or registration sheet. Composite alpha-sensitive art against a dark background when appropriate. | Non-shipping proof under `design/review/` or `design/registration/`. |
| **6. Validate** | Run the deterministic gate, inspect the requested real-scale proof, then update `ART_REQUESTS.md`. | Validator output and precise handoff measurements. |
| **7. Commit** | Commit one completed AR item at a time and push it. Never mix unrelated art requests in one commit. | One descriptive conventional commit per AR. |

The deliberate design sequence matters. A polished hardware rim cannot rescue an unclear icon; therefore, evaluate the central pictogram at the real display scale **before** adding visual detail. Conversely, do not reduce the master grid further simply to obtain a retro appearance; a wheel must have sufficient cells for its actual rotational symmetry and a tunnel needs enough cells to avoid a monotonous stamp.

## 6. Deterministic verification

Run the complete current remediation gate from the repository root:

```bash
python3 scripts/validate_track_pixel_art.py
```

A release is blocked if the command does not finish with:

```text
ALL AR-064–069 TRUE-PIXEL-ART EXPORT CHECKS PASSED
```

The validator checks all of the following. It validates size, RGBA mode, and allowed palette/alpha values; requires alpha-zero corners on discrete sprites; compares left and right edge columns on scrolling plates; and confirms matching alpha content boxes for state-swapped controls and tunnel lamps. Extend its asset list and constraints for every new AR rather than relying on visual inspection alone.

| Check | Why it exists | How to repair a failure |
|---|---|---|
| Off-palette pixel | Detects anti-aliasing, source-image blending, or accidental interpolation. | Redraw the offending cluster on the master; never quantise a high-resolution source to hide the error. |
| Corner alpha non-zero | Prevents grey paper wash, hard boxes, and unintentional background plates. | Pull silhouette/shadow in from corners or make that asset an explicit tiling/world layer. |
| Tile-seam mismatch | Prevents a visible vertical tear during infinite scroll. | Copy/derive final master column from master column zero; verify after every motif change. |
| Pair bounds differ | Prevents jitter when a keycap or lamp swaps frames. | Maintain the same outer slab/housing in both masters; change internal fill, depth, or pictogram only. |
| Hub/rail mismatch | Prevents wheel wobble or visual floating. | Measure from the renderer’s actual origin and source canvas, update the registration sheet, then redraw. |
| 70px symbol fails | Prevents controls that can only be understood while zoomed in. | Enlarge/simplify the icon until a non-reader can name the action and distinguish the state. |

## 7. AR-064–069 reference anchors

The remake supplies tested examples rather than abstract instructions. Future agents should reuse their scale, frame, and validator patterns while preserving whatever art-specific constraints a new request sets.

| Request | Generator | Important handoff values |
|---|---|---|
| AR-064 tarp | `scripts/remake_ar064_tarp.py` | Keycap paired alpha box `(44,16,428,452)`; each overlay has exact car canvas and transparent livery/wheel clearance. |
| AR-065 controls | `scripts/remake_ar065_controls.py` | SPEED runtime window `(120,168,268,128)` in the 512² PNG. |
| AR-066 tunnel | `scripts/remake_ar066_tunnel.py` | X-tiled roof/wall; true-transparent portal opening; lamps retain matching alpha bounds. |
| AR-067 bridge | `scripts/remake_ar067_bridge.py` | Deck railhead y=0; deck/water are X-tiled; deck uses transparent bottom pad to keep 4× source grid. |
| AR-068 wheel | `scripts/remake_ar068_wheel.py` | Hub `(38,38)`; wagon axle/radius data and locomotive driver/pilot data in `design/registration/`. |
| AR-069 proof | `scripts/remake_ar069_controls.py` | All required action/state faces shown at literal 70×70px on cream and sky-blue backgrounds. |

## 8. Explicit prohibitions

Do not ship direct output from an image model, even when it claims to be “pixel art.” It will almost always introduce anti-aliased diagonal edges, sub-pixel gradients, unbounded colour variation, inconsistent pixel scale, or invented decorative detail. A model may be used privately to explore a concept, but the delivered sprite must be redrawn as a low-resolution, palette-locked master.

Do not make horizontal background layers look tileable by stretching a single illustration or by adding a blur at the seam. Do not hide registration errors by baking wheels, rails, or shadows into a car body. Do not deliver a one-state button for a state-swapped slot. Do not add a new asset name, extra pixel padding, or an opaque box merely because it is easier to draw.

## References

[1]: ../ART_REQUESTS.md "iBeetKidz ART_REQUESTS.md — current asset contract, AR-064–069"
[2]: palette-nintendo.json "iBeetKidz warm Nintendo palette and rendering rules"
[3]: ../PROJECT_CHARTER.md "iBeetKidz Project Charter — product visual direction"
[4]: GAME_FEEL.md "iBeetKidz Game Feel — Laws 2 and 3"
