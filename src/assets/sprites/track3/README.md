# track3 — side-scroller art drop folder

`TrackV3Scene` globs every PNG in this folder and loads it on the next reload
under the key `trk-<filename>`. A file changes rendering only when its filename
matches a literal or constructed key the scene consumes. Adding an arbitrary
PNG requires no manifest change, but merely ships unused payload; it does not
create a new world slot. For a consumed key, authored art wins. Only the bounded
sky/hills/trees/ground/fringe/mound/weather/wheel family in
`makeGreyboxTextures` receives a generated stand-in when absent; bridge, tunnel,
train, rider, control, shadow, lantern, and marker assets do not all have one.

So `sky.png` becomes the texture `trk-sky` and replaces the generated sky.

**World slots the scene draws today** (drop-in, zero code):

| file | replaces |
|---|---|
| `sky.png` | the generated sky band |
| `hills.png` | far hills |
| `trees.png` | treeline |
| `ground.png` | ballast, sleepers, rail, near grass |
| `fringe.png` | the near grass occluder drawn in front of the train |
| `mound.png` | a hill (must match the profile — see AR-038a) |
| `bridge-deck-tile.png` | the bridge rail/deck strip |
| `bridge-pier.png` | repeating trestle support |
| `bridge-water.png` | water below the deck |
| `bridge-far-bank-left.png`, `bridge-far-bank-right.png` | the two transition banks |
| `rain.png` | the tiling rain streak sheet |
| `wheel.png` | the rotating wheel |

Other live families are:

- atmosphere: `sky-night.png`, `raincloud.png`, `splash.png`, and `smoke.png`
- train: `loco.png`, `car-*.png`, `wheel.png`, `shadow.png`, and
  `ride-<instrument>-<car-type>.png`
- controls: `btn-<mode>.png` plus matching `-pressed` frames
- readout: `beat-lantern-low.png` and `beat-lantern-high.png`
- tunnel: `tunnel-mouth-{left,right}.png`, `tunnel-{roof,wall,floor}.png`,
  and `tunnel-lamp-{0,1}.png`

`now-post.png` is the intentional fallback when the Beat Lantern frames are
absent. It is load-bearing even though the complete production art set normally
wins that branch.

Because the loader globs every PNG in this directory, do not leave drafts or
unused variants here: they ship in both production bundles.

This folder is the tracked runtime source for the default side-scroller's loose
art, but a tracked runtime PNG is not automatically a reproducible art master.
The train, rider, terrain, controls, tunnel, and bridge files are load-bearing
through the glob and dynamic `trk-*` keys. Search `TrackV3Scene`, the asset
requests, review scripts, and constructed key families before removing one.
Signal, smoke, and tarp *public atlases* currently lack complete tracked rebuild
provenance and must be preserved. The separate oval/Yard train atlas has one
canonical source at `src/assets/sprites/train-atlas/` and is rebuilt with
`python3 scripts/build_train_atlas.py`; verify it with
`npm run check:train-atlas`.
