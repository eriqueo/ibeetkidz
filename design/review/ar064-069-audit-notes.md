# AR-064–069 Visual Audit Notes

## Authoritative reference observations

`inst-drums-passive.png` establishes the strongest current house-style anchor: it uses a readable single-character silhouette, broad 3–4 pixel clusters, a near-black plum outline, restrained three-tone material ramps, and a hard offset shadow. Colour is saturated but warm, faces and props are made of discrete pixel clusters rather than noisy texture, and important forms stay legible against a dark background.

`btn-nav-yard-idle.png` establishes the legacy plaque family: a broad, low-contrast parchment face inside a silver steel frame, dark-plum outline, brass/wood rail iconography, chunky baked lettering, and a hard lower-right shadow. Its design is deliberately simple at small size: one large word, one central pictogram, one directional arrow. It is a reference for material language and clear silhouette only; Track V3 controls must follow the newer charcoal/brass machine family specified in AR-065 and AR-069.

## Audit scope decision

AR-060–063 are independent older requests. AR-064–069 are the recently delivered Track correction batch and are the remake scope for this pass. The current AR-064–069 assets will be evaluated against the current Track-specific requirements, especially the real-size (70px) readability standard in AR-069, not merely canvas and alpha validation.

## Risks to avoid in remake

Avoid photographic texture/noise, soft gradations, full-canvas mattes, tiny icons, weak state changes, inconsistent UI chrome, opaque world backgrounds, and world layers that fail tile seams or registration constraints. Every world asset must be discrete, depth-sortable art; every UI action must be nameable at 70px without zooming.

## Reference and current-asset comparison

The current side-on boxcar uses a strong material hierarchy: broad brown planks, thick dark hardware, small brass accents, and saturated red wheels. Its geometry has readable large forms before the rivet-level detail. It is a better material and value reference for the Track world than the newest AR-064–069 art.

The current `ar069-controls-70px.png` proof confirms the user's concern. At 70px, the five controls contain several tiny competing details inside a thin frame. MAP is a small folded shape rather than an instant map symbol; RIDE appears as a compact cart-like form rather than a locomotive; CLEAR resembles a piece of paper; LOOP reads as an outline rather than two bold arrows; and the TARP pair differs mainly in tiny internal fill. The control family is technically coherent but visually over-detailed, too dark, and under-scaled for a four-year-old. The remake must prioritise one large, solid, nameable pictogram per face before secondary material detail.

## Current tarp and tunnel audit

The tarp overlays are cleanly bounded and preserve a centred livery aperture, but they are four nearly identical blue rectangular blankets. They do not follow the individual silhouettes of a boxcar, cylinder, hopper, and flatcar; lack folded drape, tied edges, or contextual material detail; and therefore read as generic UI panels placed over the cars. The replacement overlays must preserve wheel and livery clearances while making the fabric contour and tie-down logic type-specific.

The tunnel kit has correct separability in principle, but the current mouths, ceiling and wall look like a modular dark-grey architectural UI set rather than a continuation of the outdoor train world. The roof is overly regular, uses thin line density, and does not form a convincing near-rock occluder. The wall is a flat brick grid with little atmospheric depth or stone rhythm. The remake must use broad irregular stone clusters, weathered warm material accents, a taller/lower visual hierarchy, and a clearly arched portal that reads as a place rather than an overlay.

## Current bridge and wheel audit

The bridge kit is mechanically separated but too schematic: the deck is a repetitive narrow strip, the pier is a ladder mounted on a disconnected stack of blocks, the banks use smooth vector-like slopes, and the water relies on a dense small-dash pattern. These forms do not share the chunky, hand-made material treatment of the existing railcar. The replacement must establish large timber and stone forms with readable overlap, irregular but seamless motif cadence, and contextual grass/rock transitions.

The current 76px wheel is correctly centred but visually underpowered: its skinny tyre, tiny hub and thin spokes make it read as a dial or porthole instead of rolling stock capable of carrying a car. The replacement should use a much thicker dark tyre, brass hub, four or five broad spokes, and a fuller 68–72px opaque footprint while keeping the hub centred exactly at (38, 38).

## True-pixel-art remake review: AR-064 TARP control

The remade TARP states are authored on a 128×128 master grid and upscaled 4× with nearest-neighbour. Consequently, every contour is a deliberate 4px cluster and every opaque pixel comes from the fixed Nintendo palette. The idle state visibly shows a neutral wagon beside a folded blue tarp; the seated state has the tarp cover nearly the whole wagon, creating a large silhouette change that remains recognisable at 70px. The brass/charcoal keycap frame and eight-bit label remain shared, so both state alpha boxes are exactly identical `(44, 16, 428, 452)`.

## True-pixel-art remake review: AR-069 controls

The new 70px proof uses no antialiased source art. MAP is a large folded cream map with a dotted route; RIDE is a side-on locomotive with tall stack and red wheels; CLEAR is a large diagonal broom; LOOP is two thick, separate circular arrows; and TARP changes from wagon-plus-folded-tarp to a wagon substantially covered by blue fabric. The icons occupy the centre of each face and remain distinguishable over both cream and sky-blue backgrounds. All state pairs have the same `(40, 12, 436, 464)` alpha box for texture swapping; AR-064's TARP pair is also represented in the real-size proof.

## True-pixel-art remake review: AR-065 remaining controls

STOP, SEND, SLOW and FAST now use the same low-resolution charcoal/brass machine frame as the remade AR-064 and AR-069 faces, with one large semantic icon per button. STOP alone carries a tomato-red square; SEND uses a cream envelope and brass arrow; SLOW and FAST share cyan directional arrows with brass motion bars. The matching SPEED housing contains only a large empty recessed display window; runtime now owns all SPEED text and values. Its measured native display window is `(152, 192, 236, 92)`. All four state pairs share an exact `(40, 12, 436, 464)` alpha box.

## True-pixel-art remake review: AR-066 tunnel and AR-067 bridge

The tunnel kit now presents deliberately chunky world geometry: large irregular plum/grey rock portal stones, a stepped true-transparent arch aperture, broad timber roof ribs with a rocky silhouette, a non-repeating-looking but exact-seam back-wall masonry rhythm, and lamp states differing only in the inset glass. All layers remain separable for depth sorting; roof and wall pass the left/right edge-equality tile check.

The bridge kit now has a dense warm timber deck at railhead y=0, large visible iron plate rhythm, open underside fascia, a real braced timber pier planted on a stone footing, irregular grass-capped approach banks, and quiet wide water-current clusters. The deck and water pass exact horizontal seam equality; every discrete bridge sprite passes the four-corner alpha-zero test. The deck's non-divisible 170px height is retained by adding a transparent 2px pad below its 168px 4× grid master, so the railhead registration at y=0 is unchanged.

## True-pixel-art remake review: AR-068 wheel and contact shadow

The revised wheel now uses the entire 76px source height, so its visual tyre diameter maps to the renderer's 60px (radius-30) display diameter and its lower tangent reaches the railhead. It is authored at 38×38 then nearest-exported 2×; the hub centre is exactly `(38, 38)`. The 300×44 contact shadow is a small hard-edged stepped-alpha footprint with only 25% and 35% plum alpha—not a blur. The locomotive registration proof confirms driver centre `(78, 190)`, radius 30; pilot centre `(277, 201)`, radius 19; both tangencies meet native railhead `y=220`. Bitmap proof labels require one missing glyph correction before final commit.

The registration proof lettering is corrected with a complete bitmap glyph set. The compact contact shadow visibly reads as a dark, low-profile ground patch under a wheel while retaining its four alpha-zero corners and no blurred matte. AR-068 is ready to commit with wheel hub `(38, 38)` and the five replacement registration sheets.
