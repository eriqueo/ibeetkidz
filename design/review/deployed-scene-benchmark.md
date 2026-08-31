# Deployed Scene Benchmark

## Map scene — observed 2026-08-31

The deployed game opens to a complete floating-island map rather than an asset showroom. The island is framed by true black negative space and uses a single coherent material/lighting grammar: dense mossy grass, small flowers, pines, pale dirt tracks, varied rock clusters, weathered timber, iron rails and warm brown/green ramping. Details are distributed across the whole playable footprint, but the large silhouettes remain obvious: workshop left, yard centre and track loop right.

The composition earns its polish through **shared context**. Rails belong to paths and buildings; buildings sit in terrain; shadows and rock cliff depth integrate the entire island. This is the required benchmark for Track. Track must be built as a full visual location, not a display of individual art exports against flat sky or grass.

## Yard scene — observed 2026-08-31

The deployed Yard confirms the correct quality bar. Its scene is a complete night-time railway location, not a collection of independent panels: multiple rail loops, fences, lamps, gantry crane, freight building, layered switches, ballast texture and warm pools of lamp light share a consistent perspective and dark charcoal/plum environment. The header is a large cream parchment strip held by carved oak, rivets and brass gear work. The bottom toolbar is physically embedded in a dark stone-and-steel tray, with each action represented by a high-detail framed icon.

For Track integration, the key lesson is that successful art has a coherent **scene bed** before controls are layered over it. The controls are anchored to a substantial physical console; the world uses multiple overlapping material layers and motifs drawn from the same railway kit. A standalone asset sheet is never a valid visual proof.

## Local integration build — initial state

The local build opens successfully on the same complete Map scene as deployment. This confirms that the current asset branch and the local visual-verification environment are healthy before Track composition changes are applied.

## Navigation audit note

The local canvas confirms that scene navigation is mediated through the application bridge rather than ordinary DOM elements. Direct canvas-coordinate clicks and a Yard event dispatch did not move the map view in this browser session, so Track verification will use the repository’s own scene-switch and test/debug seams rather than treating the screenshot surface as an ordinary page.

## Local Track scene — base and Bridge mode

With a representative four-car train, the actual Track scene confirms the correct scene composition is substantially stronger than the previous showroom proof: the header and job tray are physically docked at the frame edges; hills/forest/near trees, rails, train, foreground fringe and control deck occupy a single readable landscape.

The rebuilt illustrated control cards read as individual story scenes at their real header scale and sit inside the existing cream/oak/brass header rather than floating on the sky. Bridge mode confirms that the rebuilt deck, water, banks and trestles are now rendered in the actual terrain span alongside the moving train. The next integration pass must use this in-context view—not isolated review canvases—to refine any rail duplication, bank/foreground occlusion and tunnel depth issues.

## Local Track scene — Tunnel mode

Tunnel mode now reads as a real, enclosed railway place when seen in the playable scene: the detailed roof is a foreground/near-ceiling layer, the masonry wall and lamps sit behind the train, the train remains visible against the darker warm stone, and the shared header/job tray continue to frame the view. This confirms the main correction: the assets must be assessed after Phaser depth sorting, not in a flat technical composite.

The successful integration recipe is: complete day landscape at depths 0–7; train and wheels in the middle; tunnel wall behind the train; roof/portal in front; mode tray fixed at HUD depth; no placeholder sky/ground or floating prop review layout. The scene must always preserve that complete-location hierarchy.

## Post-change base scene check

After the tunnel-floor integration change, the local game reloads successfully and the normal daytime Track composition remains intact: anchored header and job tray, parallax landscape, the assembled train, rail bed, foreground fringe, and marker all render without a regression.

## Captured composition review

The tunnel capture is the valid integration benchmark: it reads as a complete dark stone railway room with a detailed floor under the train, coherent lower wall, lamps, roof, framed HUD, and no open-country grass cutting through the interior.

The first bridge capture is invalid as a standalone bridge proof because it was intentionally captured during the tunnel’s travel-based exit while Bridge was enabled. This showed both modes together—an allowed transition/stack state, but not a meaningful one-mode composition check. The evidence capture is being corrected to stop and settle the tunnel before Bridge mode is activated, then record the bridge as its own complete location.

## Final in-context composition proof

The revised tunnel proof shows the completed interior: roof and retaining-wall texture above, portal and lamps at world scale, detailed floor/ballast beneath the railhead, the train in the middle depth plane, and the job deck docked independently at the screen edge.

The corrected Bridge proof now shows its intended standalone day-time composition: the distant blue/green parallax bands remain open, the labelled BRIDGE terrain is legible in the quiet horizon band, the train remains supported on the primary railhead, and the timber trestle, water and piers continue below into the foreground HUD edge. This is the intended side-scroller reading—world terrain occupies a moving span, while the fixed control tray remains a foreground console.
