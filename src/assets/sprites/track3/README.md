# track3 — side-scroller art drop folder

Drop a PNG in here and `TrackV3Scene` picks it up on the next reload. There is
no manifest to edit and no code to change: the scene globs this directory,
loads every file under the key `trk-<filename>`, and only generates its greybox
stand-in for the keys this folder does NOT provide.

So `sky.png` becomes the texture `trk-sky` and replaces the generated sky.

**Slots the scene draws today** (drop-in, zero code):

| file | replaces |
|---|---|
| `sky.png` | the generated sky band |
| `hills.png` | far hills |
| `trees.png` | treeline |
| `ground.png` | ballast, sleepers, rail, near grass |
| `fringe.png` | the near grass occluder drawn in front of the train |
| `mound.png` | a hill (must match the profile — see AR-038a) |
| `bridge.png` | the bridge deck and piers |
| `rain.png` | the tiling rain streak sheet |
| `wheel.png` | the rotating wheel |

Files for slots the scene does not draw yet (`loco.png`, `car-*.png`,
`btn-*.png`, `now-post.png`, `shadow.png`) load harmlessly and sit unused until
the code that places them lands. See `ART_REQUESTS.md`, AR-034 … AR-039.
