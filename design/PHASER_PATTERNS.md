# PHASER_PATTERNS — architecture for a real game, and what this repo is missing

Ten structural patterns from a Zelda-like Phaser course, restated as Phaser 4
advice and mapped against this repo.

This is a **reference and a backlog**. Every pattern carries a status —
✅ ALREADY DONE / 🟡 PARTIALLY DONE / ❌ NOT DONE — with `file:line` evidence,
so the doc tells you both how to build the thing and whether you already have it.

**The course is Phaser 3. This project is Phaser 4.2.0.** Section 0 is the delta.
Every API named below was checked against `node_modules/phaser/src/`.

---

## Status at a glance

| # | Pattern | Status |
|---|---|---|
| 1 | Components over inheritance | ❌ |
| 2 | State machine per game object | ❌ |
| 3 | Input abstraction (AI drives the same interface) | ❌ |
| 4 | Tiled as the data layer | ✅ (🟡 room-scoped layer naming) |
| 5 | Rooms, camera bounds, bounds-tween transitions | ❌ |
| 6 | Foreground/background plates, actor between | ❌ — `GAME_FEEL.md` Law 3 |
| 7 | enable/disableObject for off-screen work | 🟡 wrong grain |
| 8 | Parallel UI scene | ❌ deliberately foreclosed |
| 9 | Event bus + singleton managers | ✅ bus / 🟡 managers |
| 10 | Abilities as interface + base + component | 🟡 base class only |

---

## 0. Phaser 4 vs the course's Phaser 3

### Changed — do not copy the course verbatim

| Course (v3) | Phaser 4.2.0 | Evidence |
|---|---|---|
| `setTintFill(color)` | Removed. `setTint(c).setTintMode(Phaser.TintModes.FILL)`. The old name survives only to `console.error`. | `src/gameobjects/components/Tint.js:260,276` |
| `roundPixels` defaults `true` | Defaults `false`. `pixelArt: true` sets `antialias:false`, `antialiasGL:false`, `roundPixels:true`. Per-object override is the new `GameObject#vertexRoundMode`. | `src/core/Config.js:395-403` |
| preFX / postFX / `BitmapMask` | One **Filter** system (`internal` / `external` lists), applicable to any game object *and* to cameras. `sprite.filters.internal.addMask(obj)`. | migration skill §3 |
| `Phaser.Geom.Point` | Gone. Use `Phaser.Math.Vector2`. | no `src/geom/point/` |
| `Mesh`, `Plane` | Removed. | migration skill §17 |
| Custom WebGL pipelines | RenderNodes. Never make raw `gl` calls — wrap in an `Extern`. | migration skill §1 |
| `TextureManager.generate`, `Create.GenerateTexture` | Removed. Build procedural textures with `textures.createCanvas` + `putData` (this repo already does — `TrackScene.ts:645-655`). | migration skill §19 |
| `TileSprite` repeats whole files only | Rewritten: supports **atlas frames**, adds `tileRotation`, drops texture cropping. | migration skill §11 |
| `Camera#matrix` | Now includes scroll; new `matrixExternal` / `matrixCombined`. Only matters if you touched matrices. | migration skill §5 |

### One more v4 removal, found the hard way (2026-08-10)

**`BitmapMask` does not exist in Phaser 4.** `Phaser.Display.Masks` ships
`GeometryMask` only, and `GameObject.createBitmapMask()` is gone — the typings
carry no reference to either. So there is **no way to give a game object a soft
or gradient-edged mask**; a mask is a hard-edged shape or nothing.

This matters more than it sounds. Anything that wants a feathered edge — a
weather front, a light cone, a vignette over part of the scene — has to be built
some other way: bake the gradient into the texture's own alpha, stack strips at
stepped alpha, or (usually best) reconsider whether the effect wanted a hard
spatial boundary at all. On this project the rain was clipped to a bar span,
which put a vertical cut down the middle of the sky; the fix was not a softer
mask but realising that weather is a cloud that arrives, not a wall that stands
on the track.

### Unchanged — the course's advice transfers directly

All verified present in 4.2.0:

- `this.scene.launch(key, data)` / `run` / `get` / `bringToTop` / `sendToBack` /
  `pause` / `resume` / `isActive` — `src/scene/ScenePlugin.js:481,1034,984,764`
- `camera.setBounds(x,y,w,h,centerOn)`, `getBounds`, `startFollow(target,
  roundPixels, lerpX, lerpY, offsetX, offsetY)`, `stopFollow`, `worldView`,
  `pan` — `src/cameras/2d/BaseCamera.js:1122,1179`, `Camera.js:841,464`
- `this.add.layer()` — `src/gameobjects/layer/LayerFactory.js:22`
- `this.registry` (game-wide DataManager) — `src/scene/Systems.js:144-153`
- `this.input.keyboard.createCursorKeys() / addKeys() / addKey()` —
  `src/input/keyboard/KeyboardPlugin.js:401,443,491`
- `map.getObjectLayer(name)`, `map.createFromObjects(...)` —
  `src/tilemaps/Tilemap.js:1298,803`
- `world.enableBody` / `disableBody`, `body.enable` —
  `src/physics/arcade/World.js:519,637`
- `this.add.group(children, { runChildUpdate: true })`
- `TileSprite.tilePositionX/Y`, `tileScaleX/Y`

### Four v4 facts this repo has already paid for

Carry these in; don't re-derive them.

1. **A `Container` flattens its children into one depth slot.** Child `setDepth`
   is inert inside a Container — Phaser says so itself
   (`src/gameobjects/container/Container.js:63`). Use a **`Layer`** when you want
   a render-order bucket. A Layer **cannot go inside a Container**; it throws
   (`Container.js:549-556`). Layer children *do* honour `setDepth`
   (`Layer.js:40-46`).
2. **`scrollFactor` does nothing in a fixed, non-scrolling scene.** This game
   never scrolls a camera, so scroll factor multiplies zero. For a moving
   backdrop use `TileSprite.tilePosition`.
3. **`setTintFill` is removed** — see the table.
4. **`pixelArt: true` implies `antialias:false` + `roundPixels:true`.** Setting
   them again is noise.

### Two non-API traps in the course's TypeScript

Both bite specifically in this repo's config (`tsconfig.json`: `strict: true`,
`useDefineForClassFields: true`, `exactOptionalPropertyTypes: true`).

- **Keying a registry on `constructor.name`** (pattern 1) does not survive
  minification. Under a mangling bundler every component collapses onto the same
  key. Use an explicit `static readonly key` or a symbol.
- **`private _x!: T` assigned after construction** (the course's
  `state.stateMachine = this` handshake) is unsound under
  `useDefineForClassFields: true` — the field is *defined* at construction and
  will clobber a value assigned by a base constructor. Pass the dependency
  through the constructor instead.

### On `node_modules/phaser/skills/`

Phaser 4 ships ~30 agent-facing `SKILL.md` files. Good starting point; the
migration guide in particular is dense and accurate. **They also contain known
errors.** Treat them as a search index into `node_modules/phaser/src/`, never as
the authority. If a skill and the source disagree, the source wins.

---

## 1. Components over inheritance

### The pattern

A base component that takes the game object it belongs to, derives the scene from
it, and **stamps itself onto that object** keyed by its own type — so anything
holding the object can ask for a behaviour by type without an `instanceof`
ladder.

```ts
abstract class Component {
  static readonly key: string;              // explicit — NOT constructor.name
  protected readonly scene: Phaser.Scene;
  constructor(protected readonly owner: Phaser.GameObjects.GameObject) {
    this.scene = owner.scene;
    (owner as never as Record<string, Component>)[
      (this.constructor as typeof Component).key
    ] = this;
  }
  static get<T extends Component>(obj: object): T | undefined {
    return (obj as Record<string, T>)[this.key];
  }
}

// Anywhere: does this thing carry a weapon?
WeaponComponent.get<WeaponComponent>(target)?.tryFire(dir);
```

The course keys on `this.constructor.name` and looks up via a static that reads
`this.name`. It is elegant and it breaks under minification — use an explicit
`static readonly key`.

**Two design choices that look like omissions and aren't:**

- **The base has no `update()`, and nothing auto-ticks components.** Only
  components that need a tick expose `update()`, and the owner calls it
  explicitly. This keeps the per-frame cost proportional to what actually moves
  rather than to how many components exist.
- **The registry is the game object itself.** No manager, no central `Map`, no
  bookkeeping to keep in sync with object destruction.

A useful extension the course arrives at later: widen the stamp target from
`GameObject` to `GameObject | Phaser.Physics.Arcade.Body`, so a bare physics body
carries a back-reference to its component. That is how a collision callback
handed only a body resolves *which* weapon it belongs to.

### Why it beats a deep hierarchy — stated precisely

Not "code reuse". The course keeps a class hierarchy alongside components
(`CharacterGameObject` → `Player` / `Spider` / `Boss`). Components are for
capability that is **cross-cutting and swappable at runtime**.

The motivating case is input: a `ControlsComponent` wraps the input source so it
can be replaced live — swap to a gamepad from an options menu, or hand a follower
NPC to player 2 when they join. If input were a field on `Player`, every swap
needs a new method on `Player`. That is the real argument; "avoid a fat base
class" is the secondary one.

### ibeetkidz — ❌ NOT DONE

Everything here is inheritance or free functions:

- `src/game/scenes/BackgroundScene.ts:34` — abstract scene base. This one is
  fine; scenes are a shallow, genuinely-shared hierarchy, and the course keeps
  the equivalent.
- `src/game/tool-panels.ts:151` — `BaseToolPanel extends
  Phaser.GameObjects.Container`, three abstract hooks at `:194-196`, six
  subclasses at `:200, 254, 447, 567, 624, 733`.
- Nearest thing to a component: `src/game/press.ts:13` `pressPop(obj)` and
  `src/game/car-livery.ts:117,180` `decorateCar` / `decorateMovingCar`. These
  attach behaviour and children to an object — but register nothing, so they
  cannot be looked up, queried, swapped or removed.

**The cost, measured.** The armed-press rule (arm on your own `pointerdown`, fire
only an armed release, disarm on `pointerout`) is hand-copied at **11 sites**:

```
src/game/ui-scene.ts:101, 123, 139
src/game/TiledSceneAdapter.ts:157
src/game/scenes/TrackScene.ts:269, 307, 917
src/game/scenes/WorkshopScene.ts:367, 527, 882
src/game/undo-toast.ts:59
```

Each is 6-8 lines of identical logic, and the rule is subtle enough to carry its
own explanatory comment in three of those files (`ui-scene.ts:90-96`). One
`ArmedPress` component attached at spawn replaces all 11.

---

## 2. A state machine per game object

### The pattern

```ts
interface State {
  readonly name: string;
  onEnter?(args: unknown[]): void;
  onUpdate?(): void;
}

class StateMachine {
  private current?: State;
  private isChanging = false;
  private queue: { state: string; args: unknown[] }[] = [];
  private readonly states = new Map<string, State>();

  add(s: State) { this.states.set(s.name, s); return this; }

  setState(name: string, ...args: unknown[]) {
    if (!this.states.has(name)) return console.warn(`no state ${name}`);
    if (this.current?.name === name) return;
    if (this.isChanging) { this.queue.push({ state: name, args }); return; }
    this.isChanging = true;
    this.current = this.states.get(name);
    this.current?.onEnter?.(args);
    this.isChanging = false;
  }

  update() {
    this.current?.onUpdate?.();
    const next = this.queue.shift();
    if (next) this.setState(next.state, next.args);
  }
}
```

**There is no `onExit` hook.** The course does exit work at the top of the next
state's `onEnter`. Adding an exit hook is defensible, but know that you are
extending the design, not implementing it.

**Why transitions are queued — the actual reason.** Reentrancy during `onEnter`,
not during `onUpdate`. An `onEnter` body can itself trigger a transition (the
player enters `HurtState`, and the knockback in that enter overlaps a second
enemy). Without the `isChanging` guard plus the queue, `setState` recurses and
the interrupted state's enter logic only half-runs. Deferring the second
transition to the next tick makes every `onEnter` complete atomically.

`args` exists because transitions carry payloads — which pot was lifted, which
direction the throw goes, which chest is being opened.

**Illegal transitions are prevented by not registering the state.** There is no
transition table. A spider registers idle/move/hurt/death; a player registers ten
including lift/carry/throw. Asking a spider to `setState('throw')` trips the
`console.warn` guard and does nothing. The registered set *is* the constraint —
cheap, and it makes the legal set readable at the construction site.

### Why per-object beats one giant `update()`

State *classes* are shared across object types; state *instances and machines*
are per-object. So `MoveState` is written once and the spider and the player both
use it, while each object's legal behaviour set stays its own.

The deeper win is that transitions get a name. A scene-level `update` walking
flags makes the *moment* a thing changed implicit, so per-transition work — start
an animation, enable a hitbox, clear a timer — scatters into whichever condition
noticed first. `onEnter` gives that moment exactly one home.

### ibeetkidz — ❌ NOT DONE

No `StateMachine` anywhere in `src/`. State is loose fields plus a union pushed in
from React:

- `TrackScene.moving:135`, `.progress:134`, `.popBar:140`, `.popStartedAt:141`,
  `.lastSignalBar:137`, `.sendState:180`
- `TrackScene.update:455` is the single per-frame funnel for the whole scene.

`SendUiState` (`src/game/send-panel.ts:16-22`) is the instructive near-miss: a
correct discriminated union — `idle | recording | ready | shared | saved | error`
— with **none of the machinery**. With no enter hook, `refreshSend`
(`TrackScene.ts:345-367`) must do a full teardown-and-rebuild on every push: kill
the pulse tween, reset alpha, re-set text and colour, re-layout the panel. That
is transition work running on every state push.

The train is the other candidate: `parked → departing → riding → arriving` as
real states would give `GAME_FEEL.md` Law 5's ramps somewhere to live.
`TrackScene.setMoving:445-453` already hand-reseats the motion sampler on the
boolean flip precisely because it has no enter hook.

---

## 3. Input abstraction

### The pattern — and the trick that makes it work

`InputComponent` is a **plain class**, not an interface, with private booleans and
**both getters and setters**:

```ts
class InputComponent {
  private _up = false; private _down = false;
  private _left = false; private _right = false;
  private _attack = false;

  get isUpDown() { return this._up; }
  set isUpDown(v: boolean) { this._up = v; }      // ← the whole point
  // …same for down/left/right

  get isAttackJustDown() { return this._attack; }
  reset() { this._up = this._down = this._left = this._right = false; }
}

class KeyboardInput extends InputComponent {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly attackKey: Phaser.Input.Keyboard.Key;
  constructor(kb: Phaser.Input.Keyboard.KeyboardPlugin) {
    super();
    this.cursors = kb.createCursorKeys();
    this.attackKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
  }
  // Override the GETTERS only. The setters are simply gone.
  override get isUpDown() { return this.cursors.up.isDown; }
  override get isAttackJustDown() {
    return Phaser.Input.Keyboard.JustDown(this.attackKey);
  }
}
```

The base class's setters are what the AI writes to. An enemy constructs a **bare
`InputComponent`** — setters intact — and a wander timer does
`controls.reset(); controls.isUpDown = true;` on an interval. Every downstream
consumer (states, velocity, animation selection) is byte-identical between player
and enemy. The instructor's own framing: the AI is a *pseudo-keyboard*.

Two details worth keeping:

- The surface is **polled booleans, not events**, and it is read *inside states*,
  not in the scene. `IdleState.onUpdate` asks `controls.isUpDown`.
- Directions expose both held (`isUpDown`) and edge (`isUpJustDown`) flavours —
  hold-to-move for the world, one-step-per-press for menus.
- `isMovementLocked` gets added later, set during room transitions so a held
  arrow key can't move the player mid-tween.

`ControlsComponent extends Component` holds the `InputComponent` privately behind
a `get controls`, so the *implementation* is swappable behind a stable component
lookup — this is pattern 1's motivating case.

### ibeetkidz — ❌ NOT DONE (and the hard half is already built)

- The only keyboard consumer in the app is the dev-only scene editor:
  `src/editor/EditorOverlay.ts:80`.
- Everything else binds pointer handlers directly onto game objects
  (`ui-scene.ts:113-131`, `TrackScene.ts:918-924`).

**Where it would help here.** `EventBus` (`src/game/EventBus.ts:11-153`) is
already an *intent vocabulary* — `transport-play`, `yard-add`,
`tool-magic-pointer`, 60-odd more. That is the hard half done. What is missing is
the other side: nothing can *produce* those intents except a real pointer on a
real hit-area. Concretely, an input source would buy:

- **The Magic Pad, immediately.** `tool-magic-pointer` is already a normalized
  `(phase, x, y)` — that *is* an input source with exactly one implementation.
  Making it an interface lets a recorded performance replay through the same code
  path a live finger takes, instead of through a second path that can drift.
- **e2e without hit-testing.** Specs currently drive through the test bridge and
  real clicks; a scripted source would exercise real scene code with no pointer
  synthesis and no timing races.
- **Attract/demo mode** on the Track, free once the interface exists.

---

## 4. Tiled as the data layer

### The pattern

Tiled is the level database, not just a tile painter.

- **Object layers** hold everything that is not a tile: rooms, doors, switches,
  chests, enemies, patrol paths.
- **Custom classes** (Tiled's per-object "Class", serialized as `type` in the
  1.10 JSON) tag what each object *is*. **Custom enums** give those classes typed
  fields that Tiled validates in the editor and renders as dropdowns. Assigning a
  class auto-populates defaults, greyed out; overridden values turn white. The
  type definitions export to a `property-types.json` that is shareable.
- **Room-scoped layer naming.** Tiled *group* layers nest, and the export
  flattens the nesting into the layer name. A group `rooms` containing groups
  `1`…`6`, each containing object layers `doors` / `switches` / `chests` /
  `enemies`, exports as layer names `rooms/3/doors`. The loader then does
  prefix-and-suffix matching to find every door layer in the map and parses each
  with its room id already in hand.
- Parsing happens once into typed descriptors; the game consumes descriptors,
  never raw JSON.

The point of all of it: adding a chest is a map edit, not a code edit.

**Four gotchas the course hits, worth stealing:**

1. **Tiled has no array property type.** Multi-target references (a switch that
   opens three doors) are authored as a **comma-separated string** and split on
   parse.
2. **A missing property should drop the object, not half-build it.** Each typed
   constructor verifies every expected key is present before pushing.
3. **Name collision in the prefix scheme.** The course has both a flat object
   layer named `rooms` (the room rectangles) and a group named `rooms` (the
   per-room contents). The prefix filter matches both; it survives only by
   accident of how the name splits. Give them distinct names.
4. **Tiled object `y` is the *bottom* edge** of the rectangle; Phaser's rect
   origin is the top. Every Tiled→Phaser rect conversion needs `y - height`, and
   objects placed from Tiled want `setOrigin(0, 1)`.

If you *do* load a collision tile layer through Phaser: `map.createLayer` returns
`null` on a bad name (null-guard it), and `setCollision` needs explicit tile
indices derived from `layer.tileset[i].firstgid` — it will not infer them.

### ibeetkidz — ✅ ALREADY DONE (🟡 on the naming convention)

This repo does this **better than the course in one specific way**: the parser is
Phaser-free and Zod-validated, so it is fully unit-testable and fails loudly at
the trust boundary rather than dropping objects silently.

- `src/game/TiledParser.ts:166` `parseTiledLayer` → `TiledSpawn[]`, normalized to
  0..1 so it is resolution-independent (`:74-102`)
- `src/game/TiledParser.ts:144` `parseTiledPath` → polygon/polyline geometry;
  this is how the Track's ride path is authored
- Zod schema at `:33-67`; the module is deliberately Phaser-free (`:1-21`)
- Tiled Class → `TiledSpawn.klass` (`:76`), dispatched generically in
  `src/game/ui-scene.ts:182-189`: `"panel"` → static plate, `"instrument"` →
  passive/hover/active, else → button
- Custom properties `action` / `arg` / `sprite` / `label` / `labelColor` /
  `anchor` parsed at `TiledParser.ts:182-202`
- **Gotcha 4 above is already solved here**: `centrePx`
  (`TiledParser.ts:121-126`) resolves both anchoring conventions — Tiled
  rectangles anchor top-left, tile objects (with a `gid`) bottom-left.

**🟡 Layer naming is role-scoped, not room-scoped.** Every map has `base-plate`
(imagelayer) + `ui-layer`, plus `geometry-layer` (track) or `fixtures-layer`
(map). One map file per scene. Right for four fixed screens; wrong the moment the
Track becomes several connected segments — adopt the `<group>/<id>/<type>`
convention then.

**One divergence to know before following course advice here:** ibeetkidz never
uses Phaser's tilemap system. There is no `load.tilemapTiledJSON` in the tree;
maps are `import`ed as JSON modules and Zod-validated. So `map.getObjectLayer` /
`createFromObjects` do not apply. Keep it that way — the validating boundary is
worth more than the Phaser convenience for object-layer-only maps.

---

## 5. Rooms, cameras and transitions

### Rooms are camera bounds

One scene holds many rooms. Each room is a Tiled rectangle; entering it sets the
camera's bounds to that rectangle and the camera follows the player:

```ts
const r = roomsById[roomId];
// Tiled y is the rectangle's BOTTOM edge; Phaser's is the top.
this.cameras.main.setBounds(r.x, r.y - r.height, r.width, r.height);
this.cameras.main.startFollow(player);
```

**The design constraint lives in Tiled, not in code:** every room rectangle must
be at least the size of the canvas. A room drawn at exactly canvas size makes
`startFollow` produce a *locked* camera for free — the classic room-at-a-time
feel — while a larger room automatically gets follow-cam behaviour. Same code
path, no branch.

### The bounds-tween trick

Calling `setBounds` on a room change **snaps** the camera: the clamp changes
instantly and the view jumps by however far the old clamp was holding it back.

The fix is to tween the **bounds rectangle** and re-apply it every frame:

```ts
cam.stopFollow();
// Temporarily widen bounds to the current view, or the OLD room's clamp
// pins the camera and it cannot travel at all.
const v = cam.worldView;
cam.setBounds(v.x, v.y, v.width, v.height);

// getBounds() ALWAYS returns a COPY — safe to mutate, and inert until
// you feed it back. That is why onUpdate calls setBounds.
const bounds = cam.getBounds();
this.tweens.add({
  targets: bounds,
  x: target.x, y: target.y - target.height,
  duration: 1000,
  onUpdate: () => cam.setBounds(bounds.x, bounds.y, target.width, target.height),
  onComplete: () => cam.startFollow(player),
});
```

**Verify this in v4 before trusting either version of the story:**
`getBounds(out)` copies into `out`, and *creates a new Rectangle when you pass
nothing* — `src/cameras/2d/BaseCamera.js:1179-1188`, whose own doc comment says
"The rectangle is a copy of the bounds, so is safe to modify." So the returned
rect is **not** live: mutating it does nothing until `setBounds` feeds it back,
which is exactly why the `onUpdate` call is load-bearing rather than belt-and-
braces. (Camera scroll *is* re-clamped against the internal `_bounds` every frame
in `preRender` — `Camera.js:589-593` — which is why re-applying bounds each frame
produces a glide.)

**Why bounds and not the camera.** Two reasons, and the second is the one that
bites later:

1. `camera.pan()` or tweening `scrollX/Y` fights the clamp, and you have to
   suspend following for the duration.
2. In an oversized room the camera must end up wherever *the player* entered, not
   at the room's corner. Tweening the bounds lets the follow target decide the
   final resting scroll; tweening the camera hard-codes a destination.

The bug the course hits on camera and then fixes is worth pre-empting: in
`onUpdate`, pass the **target room's** width/height, not the tweening rect's.
Passing the rect's own size parks an oversized room's camera at the room corner
instead of on the player.

### The full transition, in order

1. Disable the source door's trigger so it can't re-fire.
2. Tween the player halfway into the connecting hallway.
3. `stopFollow()`.
4. Widen bounds to `worldView`.
5. Tween the bounds rect → target room, `setBounds` in `onUpdate`.
6. Tween the player into the room. **Floor the travel distance** (the course uses
   32 px) so the player can never come to rest still standing on the entry
   trigger — otherwise they bounce straight back.
7. `onComplete`: re-enable the target door, set `currentRoomId`, `startFollow`.

Lock input for the duration (`isMovementLocked`, pattern 3) and force the state
machine to idle at the start (pattern 2), which also drops any carried object.

A neat structural choice: `Door` **does not extend a game object**. It composes a
`Phaser.GameObjects.Zone` (given a body by `physics.world.enable`), an optional
`Image` for the visible leaf, and a debug rect. The zone's `name` is set to the
door's Tiled id, which is how a collision callback holding only a body finds the
owning `Door`.

### ibeetkidz — ❌ NOT DONE

Zero camera manipulation in `src/`. The only `cameras.main` reads are for
viewport dimensions (`TiledSceneAdapter.ts:122-123`, `ui-scene.ts:163-164`). No
`setBounds`, no `startFollow`, no scroll, ever.

Every scene is one fixed 2560×1440 design space letterboxed by `Scale.FIT`
(`src/game/main.ts:18-27`), and all layout math is normalized against the
background rect rather than world coordinates (`placeSpawn`,
`TiledSceneAdapter.ts:55-81`).

**This is the largest single gap for a side-scrolling Track.** A scroller needs a
world larger than the viewport, which this codebase has never had. Note the
knock-on: `placeSpawn`'s entire model is "position relative to the painted
backdrop rect" — a *screen-space* model. World objects in a scrolling scene need
world coordinates, and the two must not be mixed. Pattern 8 exists to keep them
apart.

---

## 6. Foreground and background plates, actor drawn between

**This is the highest-value pattern in this document for this repo.**

### The pattern

It is an **asset** technique, not a runtime one, and it is much simpler than it
looks:

```ts
// created FIRST, before any other game object; default depth
this.add.image(0, 0, `${level}_background`).setOrigin(0);
// …player, enemies, props created here, default depth…
this.add.image(0, 0, `${level}_foreground`).setOrigin(0).setDepth(2);
```

Two PNGs of identical map dimensions. In Tiled they are ordinary tile layers, but
they are **never loaded as Phaser tilemap layers** — they are exported as flat
images (`File → Export As Image` with only that layer visible). The foreground is
transparent except for the parts an actor can stand behind: hallway lintels, door
arches, tree canopies.

Authoring is copy-from-background: rectangle-select the props, *Paste in Place*
onto the foreground layer, then hand-edit away the parts that should *not*
occlude (door interiors, the entry floor) — otherwise the actor gets hidden where
they should be visible.

Carried objects get `setDepth(2)` while held, so a lifted pot draws above the
actor's head, and revert on release.

**Two caveats.**

- The transcript claims default depth is 1. It is **0**. The ordering logic is
  what matters; the number is narration noise.
- The course uses depth `2` for the foreground image, the debug collision layer
  *and* held objects. Three things at one depth fall back to display-list
  insertion order. Give them distinct depths.

### Better than two flat plates: baseline-Y depth

Give each prop the y where it meets the ground and make depth a function of it —
for props *and* actors:

```ts
obj.setDepth(BAND + obj.baselineY * 0.001);
```

Then "in front of" is decided by who is standing closer to the camera, which is
the correct rule and needs no authored layer at all.

### Phaser 4 specifics

- **Use a `Layer`, not a `Container`, for the plates.** A Container flattens
  children into its own single depth slot (`Container.js:63`) — you would lose
  per-prop depth entirely. `this.add.layer()` is the bucket you want
  (`LayerFactory.js:22`); its children honour `setDepth` (`Layer.js:40-46`).
- A `Layer` **cannot be added to a Container** — it throws
  (`Container.js:549-556`). Plan the tree accordingly.
- The display list stable-sorts by depth (`DisplayList.js:185-191`), so equal
  depths keep insertion order — deterministic, which matters for y-sort ties.

### ibeetkidz — ❌ NOT DONE. `design/GAME_FEEL.md:106` Law 3 names this as broken.

Confirmed at the data level: **every** map has exactly one image layer.

```
src/assets/maps/map.json       imagelayer 'base-plate'
src/assets/maps/track.json     imagelayer 'base-plate'
src/assets/maps/workshop.json  imagelayer 'base-plate'
src/assets/maps/yard.json      imagelayer 'base-plate'
```

Every tree, rock and tuft is baked into that one PNG. `TrackScene.ts:16-17` says
it plainly: the train draws at `TRAIN_DEPTH = 4` (`:92`) above all of it, and the
painted rails visibly pass behind pines that the train slides over.

The scene already has the *sorting* half right — `TrackScene.ts:791` sets
`TRAIN_DEPTH + depthFractionAt(p.y)`, which is exactly the baseline-Y rule, just
applied only within the train band. What is missing is anything to sort against.

**The fix is an art task plus about twenty lines**: export a second transparent
overlay PNG, add it as an `imagelayer` named `fg-plate`, load it into a Layer
above the actor band. Per-prop baselines can come later; two plates already break
the flatness.

For a **side-scrolling** Track this stops being polish. A side-scroller's whole
read is parallax and occlusion. Ship it with one baked plate and it will look
exactly as pasted-on as the oval does, at greater size and with more of the frame
in motion.

---

## 7. `enableObject` / `disableObject` — only the current room is live

### The pattern

A tiny interface every level object implements, plus a type guard for
heterogeneous iteration:

```ts
interface CustomGameObject { enableObject(): void; disableObject(): void; }

// canonical implementation
disableObject() { this.body.enable = false; this.active = false; this.visible = false; }
enableObject()  { this.body.enable = true;  this.active = true;  this.visible = true; }
```

Every level object calls `this.disableObject()` **at the end of its own
constructor**, so a freshly-built level is entirely dormant. The scene then owns
`showObjectsInRoomById(roomId)` / `hideObjectsInRoomById(roomId)`, which walk that
room's doors, switches, pots, chests and enemy group.

**Ordering matters, and it is not symmetric:** show the *target* room **before**
the transition tween starts, so it is populated on arrival; hide the *source*
room in the tween's `onComplete`.

**Subclasses override to manage their own off-screen work** — this is where the
real saving is:

- An enemy's wander timer is started in `enableObject`, not in the constructor,
  so a disabled enemy burns no `time` events. Its callback also needs an
  `if (!this.active) return;` guard, or an in-flight `delayedCall` that resolves
  after the player left re-arms the loop forever.
- A puzzle-gated chest returns early from `enableObject` while hidden.
- An opened door returns early so it never re-renders.
- Objects that move (a pot that was thrown) get a `resetPosition()` that restores
  the spawn point *and then* enables — otherwise they respawn where they broke.

### The v4 detail that catches people

`setActive(false)` skips **`preUpdate` only** — verified at
`src/gameobjects/UpdateList.js:154`. That stops animation advance and
`preUpdate`-driven logic. It does **not** stop rendering (that is
`setVisible(false)`) and does **not** stop physics (that is `body.enable = false`,
or `world.disableBody(body)` — `src/physics/arcade/World.js:637`). You need all
three, which is exactly why this belongs behind one method rather than at each
call site. `active = false` is also what stops a group's `runChildUpdate` from
ticking the object.

For large counts, back it with a `Group` and its pooling API (`getFirstDead` /
`killAndHide`) rather than hand-rolling.

### ibeetkidz — 🟡 PARTIALLY DONE, at the wrong grain

Two lifecycle tools exist, neither room-scoped:

- **Hide-only.** `WorkshopScene.setActiveTool:625-636` shows one panel and
  `setVisible(false)`s the rest. They stay on the display list *and* the update
  list — there is no `setActive(false)` anywhere in `src/`. Six `BaseToolPanel`s
  is small enough that this costs nothing today.
- **Destroy-and-rebuild.** `TrackScene.rebuildCars:868-883` destroys every car
  token and shadow and recreates them on any consist change. Correct, but the
  opposite trade — it discards state to avoid bookkeeping.

The repo *does* get this right at scene granularity, and it is worth reading
before designing anything here: `src/game/scene-switch.ts:28-46` documents four
ordering rules, all reproduced failures — nothing before Phaser's `READY`;
`stop()` before `remove()` (remove does not fire `SHUTDOWN`, which is where every
scene drops its EventBus subscriptions); remove-and-re-add rather than `start()`,
so each visit gets a fresh instance. Those rules generalise directly to room
enable/disable.

---

## 8. A parallel UI scene

### The pattern

```ts
// at the end of GameScene.create()
this.scene.launch(SCENE_KEYS.UI);   // parallel; does NOT stop this scene
```

The HUD lives in its own scene with its own camera. That camera never scrolls, so
**HUD coordinates are absolute and static** — no `setScrollFactor(0)` on every
element, no element accidentally left at the default and sliding off, no
per-frame repositioning against `camera.scrollX/Y`.

Render order comes free: a scene launched later sits higher in the scene list and
composites on top. `bringToTop` / `sendToBack` / `moveAbove` are there if you need
to be explicit.

**The two scenes do not call `scene.get()` on each other.** They communicate
through the singleton managers (pull, at create time) and the global event bus
(push, on change) — pattern 9. Reaching across with a scene handle recreates the
coupling the split was meant to remove.

**The pause pattern for modal UI**, which is where this really pays off: the game
scene emits `SHOW_DIALOGUE` and then calls `this.scene.pause()` **on itself**. The
UI scene is not paused, so it renders and animates the dialogue; when it closes it
emits `DIALOGUE_CLOSED`, and the game scene resumes. A modal that halts the world
without a single `isPaused` check in the world's code.

One belt-and-braces detail worth copying: the state that opened the dialogue also
listens `once` for `DIALOGUE_CLOSED` before returning to idle, so the player
cannot act on the frame the scene resumes.

Data can also flow at launch (`this.scene.launch('Hud', { lives: 3 })`, read in
`init`/`create`, or later via `this.sys.getData()` — `Systems.js:559`).

Use `scene.start` — not `launch` — when you mean full replacement (game over).

### ibeetkidz — ❌ NOT DONE, and currently foreclosed by design

`SceneSwitch.apply` (`src/game/scene-switch.ts:78-98`) stops **and removes** the
running scene before adding the next. Exactly one scene runs at a time; that
invariant is the point of the module and it is well-reasoned
(`design/PERF_SINGLE_PHASER_GAME.md` has the measurements: 7.8 s → 1.23 s for a
lap of the four spaces).

HUD today is drawn *inside* each view scene at depths 9-12
(`TrackScene.ts:249-267` — LCD chip, tempo text, SEND plaque, hit rect), with
React floating above the canvas for the rest.

**Why it doesn't hurt yet, and exactly when it will.** No camera scrolls, so
in-scene HUD cannot drift. The moment the Track scrolls, every one of those
depth-9-to-12 objects rides the world off-screen. Then you have two options and
only one is cheap:

- `scrollFactor: 0` on every HUD object — and on every HUD object anyone adds
  later, forever, correctly. This is the failure mode the pattern exists to
  prevent.
- `scene.launch` a `TrackHudScene`. Its camera never scrolls; the problem cannot
  occur.

Adopting this means teaching `SceneSwitch` about a *set* of scenes rather than one
key — a real but contained change, and its four ordering rules generalise
unchanged (stop before remove still holds; you just do it for a pair).

---

## 9. Event bus and singleton managers

### The pattern

**Event bus** — no custom implementation needed:

```ts
export const eventBus = new Phaser.Events.EventEmitter();
export const CUSTOM_EVENTS = { OPENED_CHEST: 'OPENED_CHEST', /* … */ } as const;
```

A **module-level** singleton, deliberately *not* `scene.events` (which is
per-scene and dies with the scene). The motivating case: opening a chest should
play a sound, update the HUD, mutate inventory and unlock the dungeon map — four
unrelated subsystems, so the state that opens the chest emits and knows none of
them.

**The one rule the course repeats, and the one that actually bites.** Because the
bus outlives scenes, every `eventBus.on(...)` must be paired with an `off` hung on
scene shutdown:

```ts
eventBus.on(EVENT, handler, this);
this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => eventBus.off(EVENT, handler, this));
```

Miss it and a handler bound to a destroyed scene fires again after a restart.

**Singleton managers** — private constructor plus a lazy static getter, so `new`
won't compile outside the class. The course has two, split by responsibility:
`InventoryManager` (items) and a run-state manager holding health, current area
and per-room "already opened" flags, so dying and restarting preserves progress.
Managers **publish onto the bus** when they change rather than being polled.

Note the course's run-state class is hand-rolled and unrelated to Phaser's
built-in `DataManager` / `this.registry`, despite sharing a name. Phaser's
registry (`Systems.js:144`) covers the simple cases and emits change events free.

### ibeetkidz — ✅ bus / 🟡 managers

**The bus is done, and typed** — better than the course's untyped emitter:
`src/game/EventBus.ts:157-178`. A `TypedEventBus extends
Phaser.Events.EventEmitter` narrows `emit`/`on`/`off` against a single `EventMap`
(`:11-153`), so payloads are checked on both sides. Adding a cross-boundary
message is one `EventMap` entry.

**The shutdown-unsubscribe discipline is already enforced**, and the repo learned
it the hard way — see `scene-switch.ts:28-46` rule 2, which exists precisely
because `SceneManager.remove` does not fire `SHUTDOWN` and dead scenes kept
answering the bus.

One design rule worth keeping: this bus is **the React↔Phaser boundary**, stated
at `EventBus.ts:1-6`. React never reaches into Phaser objects; Phaser never
touches the DOM. There is exactly one cast, where a runtime-supplied action string
enters (`ui-scene.ts:59`, `TiledSceneAdapter.ts:107`) — Tiled data is
shape-validated, not `EventMap`-validated, so the cast is the honest boundary.

**🟡 Managers are React-side, not Phaser-side.** The store is a module singleton
in React-land (`src/app/context.tsx:38`); scenes never read it, they receive
pushed state (`TrackScene.setCars:429`, `setProgress:435`,
`WorkshopScene.setModel:646`). Phaser's `registry` is unused.

That is the right shape here (the hexagonal rule keeps state out of scenes) and
should not change. But know the consequence: **there is no in-scene manager to
reach for.** Anything a scene needs arrives by a `set*` push or an `EventBus`
event. `TrackScene.attachVisualizer:296` is the pattern for a resource that can't
be serialized — React hands the analyser *in*, rather than the scene reaching for
`SoundPort`.

---

## 10. Abilities as interface + base class + component

Patterns 1-3 combined, and the clearest demonstration of why they are worth having
separately.

### The three parts

```ts
// 1. INTERFACE — the contract. A weapon need not be any particular class.
interface Weapon {
  readonly baseDamage: number;
  readonly isAttacking: boolean;
  attackUp(): void; attackDown(): void; attackLeft(): void; attackRight(): void;
  update(): void;               // only projectiles implement this
  onCollisionCallback(): void;  // retire an in-flight projectile
}

// 2. BASE CLASS — the shared 80%.
abstract class BaseWeapon implements Weapon {
  protected attacking = false;
  constructor(
    protected sprite: Phaser.GameObjects.Sprite,   // owner's OR its own
    protected component: WeaponComponent,
    protected anims: Record<Direction, string>,
    readonly baseDamage: number,
  ) {}
  get isAttacking() { return this.attacking; }
  abstract attackUp(): void; /* …and the other three */
  update() {}                 // concrete no-ops so subclasses opt in
  onCollisionCallback() {}

  protected attack(dir: Direction) {
    this.attacking = true;
    const key = this.anims[dir];
    this.sprite.play({ key, repeat: 0 }, true);
    this.component.body.enable = true;
    this.sprite.once(
      `${Phaser.Animations.Events.ANIMATION_COMPLETE_KEY}${key}`,
      () => { this.attacking = false; this.component.body.enable = false; },
    );
  }
}

// 3. COMPONENT — holds the current weapon; owns ONE physics body.
class WeaponComponent extends Component {
  private _weapon?: Weapon;
  readonly body: Phaser.Physics.Arcade.Body;
  constructor(owner: Entity) {
    super(owner);
    this.body = this.scene.physics.add.body(owner.x, owner.y, 1, 1);
    this.body.enable = false;
    this.assignTo(this.body);          // stamp the component onto the body
  }
  get weapon() { return this._weapon; }
  set weapon(w: Weapon | undefined) { this._weapon = w; }
  get weaponDamage() { return this._weapon?.baseDamage ?? 0; }  // null-object
  update() { this._weapon?.update(); }
}
```

### The four decisions that make it work

1. **Four discrete attack methods, not `attack(direction)`.** Each direction needs
   a different animation *and* a different hitbox shape — a sword swung upward is
   a wide horizontal box in front; swung sideways it is a tall vertical box
   beside. Once the four turn out to share a body, refactor the shared part into
   a `protected attack(dir)` and let each public method delegate. You keep the
   explicit surface and lose the duplication.
2. **One physics body, resized per attack — this is the key insight.** The
   component owns a single disabled 1×1 body. Attacking calls `setSize` /
   `setPosition` on it and enables it; the animation-complete handler disables it.
   So collider registration is **always** `player.weapon.body ↔ enemyGroup`,
   registered once and completely independent of what is equipped. A body per
   weapon type would mean re-registering colliders on every swap.
3. **The weapon takes a sprite rather than owning one.** A sword whose frames are
   baked into the player's spritesheet *is* the player sprite — its attack
   animation is the player's animation. A thrown dagger takes the owner's sprite
   (for the throw animation) but also creates its own sprite for the projectile.
   The interface accommodates both only because the sprite is injected.
4. **`weaponDamage` returns 0 when unequipped.** A null-object return that deletes
   the undefined check from every call site.

### Where the other patterns plug in

The **state machine** closes the loop: `AttackState.onEnter` looks up the weapon
component, bails to idle if there is none, and otherwise switches on the owner's
facing to call the right `attackX()`. `onUpdate` returns while `isAttacking`, then
transitions to idle. So animation timing, hitbox lifetime and input lockout live
in the state, not the weapon.

The **input abstraction** means an enemy attacking is the same call path as the
player attacking.

And **stamping the component onto the physics body** (pattern 1's widened target)
is what lets a collision callback — handed only a body — resolve back to the
weapon that owns it.

### Why all three parts, not fewer

- **Interface without base class** → every weapon re-implements cooldown and
  hitbox lifetime, and three of them get it subtly wrong.
- **Base class without interface** → a weapon must *be* a `BaseWeapon`, so an
  ability that is really a spell, a trap or a scripted set-piece must inherit
  machinery it does not want.
- **Both without the component** → the weapon lives in a field on `Player`, so
  only the player can hold one. With the component, an enemy, a turret and a
  destructible crate can all fire the same weapon.

### ibeetkidz — 🟡 PARTIALLY DONE: the base class, and nothing else

`src/game/tool-panels.ts` is this pattern with two of three parts missing:

- **Base class ✅** — `BaseToolPanel extends Phaser.GameObjects.Container:151`,
  abstract `buildContent()` / `layoutContent()` / `apply(model)` at `:194-196`,
  six implementations.
- **Registry ✅** — `WorkshopScene.toolPanels` keyed by tool id, switched in
  `setActiveTool:625-636`.
- **Interface ❌** — a tool must *be* a Container-derived panel. A tool that is a
  dropdown, an in-grid gesture or a scripted sequence cannot be one.
- **Component ❌** — panels are owned by `WorkshopScene`. The Track cannot host
  one; nothing else can either.

The concrete cost: `WorkshopScene` is 984 lines and holds every panel plus the
grid, the car sprite, the LCD, the picker and the empty-car prompt. An interface
plus a `ToolHost` component would let the Yard and the Track host tools without
`WorkshopScene` growing further.

---

## What to adopt first, for the side-scrolling Track rebuild

In this order. The first three are prerequisites for the scroller not looking
broken; the rest are debt reduction.

### 1. Pattern 6 — foreground/background plates (+ baseline-Y depth)

`GAME_FEEL.md` Law 3 already calls this the repo's flattest failure, on a scene
where the actor crosses maybe a third of the frame. A side-scroller is the same
failure with the whole frame in motion — occlusion and parallax *are* the read.
First because it is also cheapest: one extra transparent PNG, one `imagelayer` in
`track.json`, one `this.add.layer()` above the actor band. `TrackScene.ts:791`
already computes the baseline-Y depth; it just has nothing to sort against.

### 2. Pattern 5 — camera bounds per segment, transitions by tweening the bounds

The repo has never scrolled a camera. This is what makes a side-scroller possible
at all, and the bounds-tween is the piece nobody derives independently —
`setBounds` on a segment change snaps, and the fix looks nothing like the problem.
Budget real time for the coordinate split: `placeSpawn`
(`TiledSceneAdapter.ts:55-81`) is a *screen-space* model anchored to the painted
backdrop rect, and world objects in a scrolling scene need world coordinates. Keep
the two apart from the first commit.

### 3. Pattern 8 — a parallel HUD scene

Do this **with** #2, not after. The instant the camera scrolls, every in-scene HUD
object at depth 9-12 (`TrackScene.ts:249-267`) rides the world off-screen. The
alternative — `scrollFactor: 0` on every HUD element forever — is a rule someone
will eventually break, and the failure is invisible until the camera moves. A
separate scene makes it structurally impossible. Cost is teaching `SceneSwitch` a
scene *set* instead of one key; its existing ordering rules generalise unchanged.

### Then, in slower time

- **Pattern 1** — one `ArmedPress` component retires 11 hand-copies of a subtle
  rule.
- **Pattern 2** — a train state machine gives `GAME_FEEL.md` Law 5's ramps an
  `onEnter` to live in, and gives `SendUiState` the machinery its type already
  implies.
- **Pattern 4's room-scoped layer naming** — needed as soon as the Track is more
  than one segment.
