# iBeetKidz Track House-Style Production Workflow

**Status:** Canonical art-production workflow after the AR-064–069 style correction.  
**Purpose:** Ensure that any future art agent can create assets that look native to the current iBeetKidz game rather than technically crisp but visually foreign sprites.

> **The non-negotiable visual goal:** iBeetKidz is a **richly illustrated 16-bit children’s music toy**, not a minimalist pixel prototype. Workshop makes a musical train car, Yard builds the train, and Track rides that song through a warm, detailed railway world. New art must look as though it was cut directly from the current Track, Map, or Workshop scene.

## 1. Authority hierarchy

Always read the project charter, the current art queue, and the relevant Track placement code before drawing. Then inspect the shipped art and the most recent approved in-game screenshots. The screenshots supplied in the AR-064–069 correction are the current visual authority for this workflow. The explicit approval of the detailed RIDE control establishes the accepted control-card quality bar.

| Priority | Authority | What it determines |
|---:|---|---|
| 1 | **Latest approved in-game capture** | Pixel density, material richness, scene projection, lighting, panel construction and what “belongs” means visually. |
| 2 | **Current shipped sprite closest in role** | Scale, silhouette, edge treatment, alpha margin and scene-specific construction. |
| 3 | `ART_REQUESTS.md` contract and individual request | Filename, canvas, state, registration, tiling, alpha and deliverable requirements. |
| 4 | `PROJECT_CHARTER.md` and `design/GAME_FEEL.md` | The game metaphor, children’s readability, contact shadows, occlusion and scene roles. |
| 5 | Older briefs / generation prompts | Historical context only. They never override an approved current-game capture. |

The questions to ask before exporting are therefore visual as well as technical: **would this asset disappear naturally into the approved Track screenshot?** Does it use the same material library as its neighbors? Does it explain its purpose to a child through a tiny illustrated scene rather than an abstract symbol?

## 2. The approved iBeetKidz material language

The correct image is dense without becoming noisy. Large silhouettes are immediately readable; inside them, 1–3-pixel clusters build believable wood grain, rivets, brass facets, stone chips, moss, grass, bark, rail ballast, polished steel and warm highlights. This is polished 16-bit toy-world art, not sparse 8-bit geometry.

| Area | Required house style | Explicitly reject |
|---|---|---|
| **Chrome and panels** | Bright bevelled steel corners; burnished brass bolts and gears; dark oak beams; deep plum/charcoal outlines; parchment windows; mottled dark stone control bed; hard shadow steps. | Blank purple/charcoal squares, four repeated dots, generic dashboard UI, flat vector panels or modern rounded widgets. |
| **Action cards** | Framed miniature railway illustrations housed in the console. A clear physical scene communicates the action: locomotive, railway loop, signal, yard sign, map paper, tarp/car, bridge, rain cloud. | One tiny abstract glyph in an empty field; unreadable micro-icons; a label doing all the explanatory work. |
| **Track world** | Lush grass, flowers, pines, ballast, rails, weathered rock, oak trestles, iron plates, brass signal hardware, dense but controlled textures. | Isolated simplistic props, flat orange ground, purple masonry, blank black rectangles, generic fantasy scenery. |
| **Vehicles and wheels** | Warm wooden and brass train detail, shaded steel, rivets, visible construction seams and story-like charm. | Sterile geometric bodies, clip-art wheels or symbols that do not match the locomotive/car treatment. |
| **Typography** | Built into a physical plaque; warm cream letters with dark outline where the shipped card family uses a baked label. Use engine text only where a request explicitly reserves a live display window. | Oversized block text separated from the physical component, generic system UI labels, or text that competes with the action image. |

The palette should follow the project’s warm Nintendo hue family—cream, parchment, oak, brass, iron grey, charcoal/plum, moss green, muted blue sky, red signal and blue canvas—but it must retain the **rich material ramps visible in the approved game art**. Do not post-quantize a detailed approved asset into a literal flat 16-swatch image; that was the failed sparse-prototype treatment.

## 3. Production method that produced the approved RIDE anchor

The accepted RIDE asset was not derived from a generic “pixel art button” prompt. It used the current Track and Workshop captures plus the shipped Yard plaque as simultaneous references. It described the asset as a miniature illustrated railway card mounted in an existing ornate brass/wood/steel toy-console system. Future agents should follow that sequence exactly.

| Step | Required action | Why it matters |
|---:|---|---|
| 1 | Gather the latest game captures and at least one shipped component of the same family. | Anchors the real game, rather than an imagined generic pixel-art genre. |
| 2 | Generate **one representative control or prop first**. | A single high-stakes reference asset exposes style drift before it contaminates a batch. |
| 3 | Ask for explicit visual confirmation before batching sibling assets. | “Correct resolution” is not proof of stylistic belonging. |
| 4 | Reuse the approved anchor and the scene capture as generation references for each sibling. | Keeps hardware, lighting, material density and framing consistent. |
| 5 | Remove any false checkerboard preview backing, export exact dimensions, and verify real alpha. | Generated previews often draw the checkerboard as opaque pixels. |
| 6 | Make state frames by preserving the complete card shell and changing only meaningful action/depth content. | Prevents texture-swap jitter and makes the state legible. |
| 7 | Validate alpha, canvas, seams and registration, then inspect at actual game scale. | A beautiful source can still fail in the engine. |

### Canonical asset-generation brief

Use this structure, replacing bracketed fields. Do not shorten it to “pixel art [thing].”

```text
Create one finished [square / horizontal / vertical] transparent PNG game sprite
for [ASSET ROLE] in iBeetKidz, a browser-based children's music toy where kids
make music in train cars, assemble a train in the Yard, then ride it on Track.

Match the attached approved iBeetKidz in-game captures and the approved [ANCHOR]
asset exactly in visual family: richly illustrated polished 16-bit pixel art;
dense but controlled material detail; deep plum outlines; warm oak, burnished
brass, bright bevelled steel, parchment, railway stone/ballast, mossy grass,
and hard pixel shadows.

Composition: [EXPLAIN THE READABLE MINI-SCENE OR PROP SILHOUETTE]. The main
subject must be recognisable by a child without the label. [EXACT LABEL OR
“no text”].

The result must look as though it was cut directly from the current [Track /
Workshop / Map] screenshot. It must have true transparent surroundings outside
its physical silhouette. Avoid generic app UI, flat dark keycaps, sparse 8-bit
geometry, vector shapes, modern styling, glow, smooth gradients, generic fantasy
art, a full opaque background, and a painted checkerboard.
```

For a Track control, the phrase **“framed miniature railway illustration seated in the steel/brass/wood Track console”** is essential. For a world kit, explain its actual material context: grass and flowers over rock for a tunnel portal; steel rail, ballast, oak braces, iron straps and river for a bridge; not an isolated conceptual symbol.

## 4. Exact approved patterns

### 4.1 Track cards

Each card is a small play scene. RIDE is a detailed brass-and-wood side-on locomotive in a picture window. MAP is folded cream paper over a little railway landscape. CLEAR is a friendly car-removal scene, not a red delete symbol. LOOP is a rail oval with a tiny locomotive and visibly repeated brass arrows. TARP is a wooden car beside blue canvas at rest, and that same canvas fully covers the car when armed. STOP is a railway signal beside a stopped toy locomotive. SEND points a car toward a small yard sign. SLOW and FAST remain train scenes, with motion cues as secondary accents.

State pairs must keep an identical outer plaque silhouette and alpha content bounds. A pressed state may darken and seat the inner illustrated face, but it must not turn into a different generic widget. The **TARP armed state** requires a semantic change—the blue fabric covers the car—rather than merely a darker frame.

### 4.2 Tunnel and bridge kits

A tunnel is a place in the Track world. Its portal has a mossy grass hill, flowers, pines, varied rocks, weathered stone voussoirs, timber/iron supports and a true transparent arch for the train. Its roof and wall carry individual stone, timber and bracket rhythm; they cannot be a purple band or an empty black rectangle.

A bridge is also a location, not a decal. The deck uses real railhead steel, sleeper timber, ballast, oak fascia, iron strap braces and bolts. The piers are heavy trestles on rock footings. Banks use grass/earth/rock texture, and water is blue-green with restrained pixel ripples. Gaps that the train must pass behind are transparent; rails and wheels are not baked into the wrong layer.

### 4.3 Wheel and shadow

The Track wheel is a substantial six-spoke iron wheel with a bright steel rim, a darker tyre, red inner counterweight, brass hub and visible bolts. It is not a simple circular icon. Retain source hub **(38, 38)** and the renderer’s existing axle/tangent measurements. The contact shadow is a separate, short, hard-edged dark footprint directly under the contact line. Its visible shadow pixels are opaque dark values; its exterior is true alpha 0.

## 5. Transparency, dimension, tiling and state rules

The sophisticated art direction does not relax production requirements. Every output retains the request’s exact filename and canvas. Discrete assets have all four canvas corners at alpha 0; nothing outside the art may contain a semi-transparent wash, grey key, white checkerboard or coloured matte. World layers that intentionally fill an edge are validated for tile seam equality instead.

Generated images can contain an opaque simulated checkerboard even when they visually appear “transparent.” The cleanup process used in this correction is in `scripts/export_house_style_card.py`, `scripts/export_house_style_prop.py`, and `scripts/export_house_style_tile.py`. These tools remove only neutral checkerboard preview cells connected to outer canvas edges, crop and nearest-neighbour export to the requested canvas, then check four corners. Never assume a checkerboard visible in a generation preview represents real alpha.

| Asset class | Export method | Verification |
|---|---|---|
| Detailed framed card | `export_house_style_card.py` | Exact 512² canvas, alpha-zero corners, paired content-bounds check. |
| Terrain prop / tunnel portal / lamp | `export_house_style_prop.py` | Exact requested canvas, true transparent exterior, dark-background composite. |
| Scrolling roof / wall / water | `export_house_style_tile.py` | Exact canvas, X-edge equality after final export. |
| Bridge deck | `export_house_style_bridge_deck.py` | Railhead at y=0, transparent trestle bays, X-edge equality. |
| Rotating wheel | `export_house_style_wheel.py` | Exact 76², transparent corners, hub at (38,38). |
| Pressed control | `make_house_style_pressed.py` | Same alpha content bounds as idle; visibly seated/darker face. |

Run the current full gate from the repository root:

```bash
python3 scripts/validate_house_style_track.py
```

The command checks exact dimensions, RGBA, alpha-zero corners, opaque art pixels, horizontal seams, and swapped-state registration. It must end with:

```text
ALL HIGH-DETAIL AR-064–069 EXPORT CHECKS PASSED
```

## 6. Quality review sequence

Never accept a production asset after an alpha script alone. Make a review composition with the actual scene material behind it, reduce controls to their true display size, and judge it against the approved screen capture. The final review question is intentionally simple:

> **Would a player think this sprite was already part of the bright, dense, hand-built iBeetKidz toy world?**

If not, return to the art brief. The usual fix is not another arbitrary colour or a smaller grid. It is more authentic scene context: a real rail scene inside the card, the correct oak/brass/steel stack, visible material construction, landscape detail, or a richer silhouette.

## 7. In-engine integration is mandatory

A sprite sheet or a neutral-background contact sheet is **not** a scene review. AR-064–069 initially passed individual export checks but looked wrong in a flat showroom because no real scene hierarchy was present. Every Track art change must be viewed in the running game with a representative multi-car train and its fixed header/job tray.

| Scene layer | Required placement | Integration rule |
|---|---|---|
| **Open countryside** | Day sky → distant hills → forest → near trees → rail/ground → foreground grass | Keep the horizon quiet enough for a short terrain label; do not let controls float in the landscape. |
| **Train** | Shadow behind; body, independently rotating wheels and crew at the train layer | The train must sit on the railhead and remain legible against every terrain. |
| **Tunnel** | Back wall and lamps behind train; roof/portal in front; **dark floor/ballast over countryside ground below the railhead** | Fade the open-country foreground fringe as the enclosure arrives. A tunnel cannot retain a bright grass slab through its interior. |
| **Bridge** | Gap/water/piers/deck at world depth; fixed job tray above lower piers | Verify Bridge by itself after Tunnel has fully settled. A temporary overlap is a transition state, not a review target. |
| **HUD** | Shared header docked off the top edge; shared job tray docked off the bottom edge | Console plates are screen furniture. They must frame the world without pretending to be scenery. |

Use `scripts/capture-track-composition.mjs` with the local development server running to capture the actual Tunnel and Bridge scenes. It seeds four train cars through the test bridge, enters Track, records a travelling Tunnel composition, then settles Tunnel before recording Bridge. The durable review outputs are `design/review/track-tunnel-in-context.png` and `design/review/track-bridge-in-context.png`.

## 8. Committed reference material

The following project files are maintained to make this workflow reproducible.

| Resource | Purpose |
|---|---|
| `design/review/TRACK_HOUSE_STYLE_RESET.md` | Concise art-direction reset and the specific failure modes that must not recur. |
| `design/review/style-reset/ride-house-style-512.png` | Explicitly approved RIDE-card visual anchor. |
| `design/review/style-reset/house-style-controls-70px.png` | Actual-size control review. |
| `design/review/style-reset/house-style-tarps.png` | Tarp overlays on active Track cars. |
| `design/review/style-reset/house-style-world-kit.png` | Asset-only diagnostic board; never use it as final scene approval. |
| `design/review/track-tunnel-in-context.png` | Final composed Tunnel proof with wall, roof, lamps, floor, train and HUD depth. |
| `design/review/track-bridge-in-context.png` | Final composed Bridge proof with open countryside, train, trestle/water and HUD depth. |
| `scripts/capture-track-composition.mjs` | Deterministic local capture of the actual playable Track view. |
| `scripts/export_house_style_*.py` | Exact cleanup/export operations used for the corrected house-style assets. |
| `scripts/validate_house_style_track.py` | Deterministic final gate for AR-064–069. |

## 9. Prohibitions

Do not use the earlier `design/art-masters/ar064` through `ar069` source masters as visual references. They encode the rejected sparse-prototype approach. Do not replace dense approved 16-bit art with a literal small-grid sketch, even if it is technically nearest-neighbour pixel art. Do not make opaque checkerboard or white preview backing part of a game sprite. Do not let a state swap move the frame. Do not substitute a generic UI symbol for a child-readable illustrated railway scene.

Finally, do not generate a full set before one asset is visually approved. The accepted RIDE control is the model: **make one, compare it to the actual game, get explicit confirmation, and only then scale the language to the family.**

## References

- [`PROJECT_CHARTER.md`](../PROJECT_CHARTER.md) — product metaphor, scene roles and visual rules.
- [`ART_REQUESTS.md`](../ART_REQUESTS.md) — current asset contract and AR-064–069 handoff requirements.
- [`design/GAME_FEEL.md`](GAME_FEEL.md) — ground contact and foreground-depth requirements.
- [`design/review/TRACK_HOUSE_STYLE_RESET.md`](review/TRACK_HOUSE_STYLE_RESET.md) — approved correction reference and audit.
