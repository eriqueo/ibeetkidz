# GAME_FEEL — how a sprite earns its place in the scene

House doctrine for animation in this project and the ones after it. Written
2026-08-06, after the observation that the Track's train "looks super amateur,
like it is imposed onto the background and not an organic part of the scene."

That diagnosis was correct and it generalises: **every animated thing in this
project is a correctly-positioned sprite rather than an inhabitant of a world.**
Correct position is table stakes. It is not game feel. This file is the
difference, written as laws you can check rather than adjectives you can argue
about.

Each law below carries the concrete way this project broke it, because the
failures are more instructive than the rules.

---

## Law 1 — One pixel grid. Scale only by integers.

A 16-bit scene reads as one world because sprites and backgrounds share a single
pixel size. Nothing on a SNES was ever drawn at 1.9×.

Under nearest-neighbour filtering (`pixelArt: true`), a sprite drawn at a
fractional scale maps each source pixel to either 1 or 2 screen pixels in an
irregular pattern. If that scale then *varies*, the pattern reorganises every
frame and the sprite's edges crawl. This is the single most reliable way to make
art look pasted on, and it is invisible in a screenshot — it only shows in
motion, which is why it survives review.

**How this project broke it.** Train car art is 128×128 native (`train.png`,
1024×640, 40 frames = 5 types × 8 directions). It is drawn roughly 280 px wide,
i.e. **2.19×**, and then `TrackScene.depthScaleAt()` multiplies that by a
*continuously interpolated float* (`farScale → nearScale`) on every frame. So the
train's pixels are 2.19× the size of the background's, and they reshuffle
constantly as it moves.

**The rule.** Author art at its final on-screen size and draw it at scale 1. If
you cannot, scale by an exact integer. If perspective demands a range, **quantize
it to a few discrete tiers** (e.g. 3 steps) and let the sprite pop between them —
a pop is read as distance, a crawl is read as cheapness.

**How to check.** Compute the final scale of every world sprite, including every
multiplier. Each must be an integer. Then watch a sprite move slowly across the
screen at 4× zoom; the interior pixels must not writhe.

---

## Law 2 — Everything in the world touches the ground.

A sprite with no contact shadow floats, no matter how well it is positioned. The
shadow is not decoration; it is the only thing that tells the eye where the
object's base intersects the ground plane.

**How this project broke it.** Every `shadow` in the codebase is UI chrome —
`tool-panels.ts`, `send-panel.ts`, `undo-toast.ts`. **No world object has one.**
Not a car, not the loco, nothing.

**The rule.** Every actor and vehicle gets a contact shadow at its base, drawn as
its own object one depth below the actor, and it must deform with the actor —
smaller and tighter when it lifts, longer when it leans.

**How to check.** Cover the sprite and look only at the ground. You should still
know exactly where the thing is standing.

---

## Law 3 — The world sorts by depth, and the foreground must be real objects.

An actor that can never pass *behind* anything is a decal on a photograph. The
weave between foreground and background is most of what makes a top-down scene
feel three-dimensional.

**How this project broke it.** `src/assets/maps/track.json` has exactly one
`base-plate` imagelayer — every tree, rock and tuft is baked into that single
PNG. The train draws at depth 4–5, above all of it. The painted rails visibly
pass *behind* the pines at the top of the oval; the train slides *over* them.
`map.json` has the same shape.

**The rule.** Occluders live in their own transparent overlay plate with a
declared baseline Y per prop. Depth is a function of baseline Y for every world
object, actors included. Never bake anything an actor can walk behind into the
backdrop.

**How to check.** Can the actor get behind something? If there is no path in the
scene where it disappears partially, the scene is flat.

---

## Law 4 — Animation is driven by motion, not by the clock.

Wheels turn because the vehicle travelled. Feet plant because the walker
advanced. Tie a cycle to wall-clock time and it desynchronises from movement —
feet skate, wheels spin while stopped — and the eye catches it instantly even
when it cannot name it.

**How this project broke it.** The train's only life is
`Math.sin(this.time.now / 160 + index * 0.9) * 2` — a ±2 px bob on a fixed 160 ms
period, **identical at SLOW and at FAST**, and running whether or not the tempo
changed. A train that bobs the same at every speed is a train that is not really
moving. There are exactly two registered animations in the whole game (`smoke`
and `signal-flash`); no vehicle has a cycle of any kind.

**The rule.** Cycle phase is a function of **distance travelled**, not elapsed
time. Secondary motion (bob, sway, recoil) scales its amplitude *and* frequency
with speed, and goes to zero at rest.

**How to check.** Halve the speed. Every animation must visibly halve with it.

---

## Law 5 — Nothing starts or stops instantly.

Mass is communicated by acceleration. A sprite that goes from 0 to full speed in
one frame reads as a cursor, not a locomotive. Anticipation before a move and
follow-through after it are what make an action feel like it happened to an
object rather than to a coordinate.

**The rule.** Ramp velocity in and out. Heavier things ramp longer. On stop,
overshoot slightly and settle.

**How to check.** Pause at the first frame of movement. If the thing is already
at full speed, it has no mass.

---

## Law 6 — Secondary motion sells the primary, and it is state-driven.

Smoke that puffs harder under load, dust at a stop, a lean into a curve, a
carriage rocking after a bump. These are cheap and they are most of the
perceived quality. They must be driven by what the object is *doing*, never
emitted on a timer.

---

## Law 7 — Snap to whole pixels.

Sub-pixel positions make pixel art shimmer between frames. Round world sprite
positions to integers (`roundPixels`), and be aware that `Scale.FIT` to a
non-integer device ratio reintroduces this at the canvas level.

---

## Law 8 — Input responds inside one frame.

Any perceptible delay between a tap and a visible response reads as broken, and
no amount of animation quality compensates. Show the response immediately, even
if the underlying action resolves later.

---

# Architecture that makes the above cheap

These are the structural choices that let the laws be enforced rather than
merely intended.

**Scenes are data.** Layout, collision, props and triggers are authored in Tiled
and interpreted generically (`TiledParser` → `TiledSceneAdapter` / `ui-scene.ts`).
Adding a prop is a map edit, not a plumbing edit.

**Geometry is pure and lives in the core.** Movement, collision, spacing and
path math belong in `src/core/` as framework-free functions that take state and
return state. They are then unit-testable with no browser, which is the only way
these rules get regression coverage — you cannot write a test for "looks good,"
but you can write one for "final scale is an integer" and "car gaps equal car
length."

**The renderer is thin.** Phaser reads core state and draws it: position, depth,
animation frame. It should hold no rules.

**Ephemeral view state is NOT project state.** A walking character's position, a
train's phase, a hover — none of this goes through `Command` + `reduce`, and none
of it is saved or undoable. That machinery exists to keep *the kid's work*
coherent. Per-frame values in the undo history would flood it and make "undo
everywhere" useless.

**Never drive an animation from its own clock when a real clock exists.** In this
project the audio transport is the clock (`PROJECT_CHARTER.md` §2.5): the visual
is rendered *from* the transport's position, never the reverse. This is why
`Phaser.GameObjects.PathFollower` is forbidden on the Track despite fitting the
shape of the problem — it drives its own tween, which would make the train own
the clock and couple musical timing to frame delivery.

---

# The review checklist

Before calling any animation done, in this order:

1. Is every world sprite's **final** scale an integer? (Law 1)
2. Does every world object have a **contact shadow**? (Law 2)
3. Can the actor pass **behind** something? (Law 3)
4. Change the speed — does every cycle change with it? (Law 4)
5. Does it **ramp** in and out of motion? (Law 5)
6. Is the secondary motion tied to **state**, not a timer? (Law 6)
7. Watch it move at 4× zoom — do interior pixels **crawl**? (Laws 1, 7)
8. Tap it — does something happen **this frame**? (Law 8)

A screenshot passes 1, 2, 3 and fails to test 4, 5, 6, 7. **Review animation in
motion or not at all** — this is exactly how the Track's train shipped looking
wrong while every test was green.
