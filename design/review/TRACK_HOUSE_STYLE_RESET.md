# Track House-Style Reset — 2026-08-30

> **This resets the AR-064–069 remake direction.** The low-resolution, sparse, toy-prototype treatment delivered in commits `fca52fc` through `d632456` does not match iBeetKidz and must not be used as the style source for new Track art.

## The game this art must belong to

iBeetKidz is a **warm, richly illustrated 16-bit children’s music toy**. A child loads music into train cars in the Workshop, builds a train in the Yard, and rides that song through the Track side-scroller. The Track is not an abstract pixel test scene. It is a highly finished, cheerful train world with detailed wooden cars, expressive Beet crew, a real locomotive, layered pine landscape, rail ballast, a brass-and-steel toy console, and hand-drawn terrain cards.

The corrected direction comes from the supplied current-game captures: the daylight Track screen, the top-down map island, and the Workshop/transport screen. Those captures are the visual truth for this remediation.

## Corrected visual language

| Area | Match this | Do not repeat |
|---|---|---|
| **Pixel density** | Dense, intentional 16-bit clusters. Use fine one- and two-source-pixel material marks within larger readable forms: wood grain, rivets, steel seams, stone chips, bark, wheel spokes, grass tufts, and highlight glints. | Sparse 8-bit blocks, flat geometric primitives, or a tiny 128px sketch mechanically enlarged until detail disappears. |
| **Colour and lighting** | Warm cream light, oak/brown timber, burnished brass, aged steel, deep plum/charcoal outlines, mossy greens, muted cyan sky. Use controlled ramps to model material volume. | Flat two-tone fills, random purple/orange accents, dark “prototype” UI, neon, gradients, bloom, or smooth blur. |
| **Chrome** | Large ornate brass gears at corners; bright bevelled steel outer frame; wood beam backing; parchment inset panels; dark mottled stone control bed; brass rivets; framed picture cards. | A generic charcoal rectangular keycap with four dots or a modern dashboard widget. |
| **Controls** | Picture-led cards housed inside the shared mechanical console. The icon is an illustrated toy-world vignette with a small readable label beneath it, as with HILL, BRIDGE, RAIN, NIGHT and the Workshop transport controls. | An isolated abstract symbol competing with a label, or a slab whose mechanical shell dominates its action illustration. |
| **World kit** | Track art must use the same scene material library: pine/grass/flowers, railway stone ballast and sleeper timber, warm trestle wood, textured rock, brass signal hardware. | Simple orange hillside triangles, uniform purple tunnel masonry, flat turquoise water, or symbols that look detached from the landscape. |
| **Characters and train** | Side-on vehicles and crew are substantial, story-rich, warmly shaded, and bounded by decisive dark outlines. Wheels, cab windows, name plates and lamp hardware carry material detail. | Simplified placeholder silhouettes or sterile geometry not comparable to the shipped cars/crew. |

## Technical correction

The product still requires fixed-grid pixel art, integer scaling, hard outlines/shadows, exact canvas sizes and true alpha outside discrete sprites. These requirements **do not require an impoverished 128px design**. New art should be authored at the true detail density required by the final on-screen asset, typically using a 1× or 2× working master; all features must remain aligned to a crisp pixel grid. The Track UI uses richer material ramps and finer pixels than the simplistic low-resolution remake.

The first review question is therefore not merely “are the corners transparent?” It is: **could this object be cut from the provided Track or Workshop screenshot and look native in the scene?** If the answer is no, redraw it before testing alpha and registration.

## Practical acceptance bar

A corrected control should read as a miniature framed illustration placed into the existing brass/steel console. A corrected tunnel or bridge should contain enough real wood, stone, ballast and landscape context that it feels like a location in the same railway—not a technical decal. At the intended in-game scale, details should remain purposeful rather than disappearing into visual noise.

Before committing, compare a dark-background composite and a 70px control proof against the current-game captures. The goal is not merely crispness. The goal is **belonging**.

## Confirmed control comparison

The shipped Yard EDIT plaque demonstrates the actual quality floor: a faceted steel outer housing, heavy plum contour, irregular cracked/mottled dark face, brass side cylinders, bright highlights, large decorative brass top/bottom gears, hard offset shadows, and a richly shaded blue magnifier. The pre-remake STOP control confirms the failed low-detail treatment to avoid: an empty flat violet slab with four repetitive screw dots, a tiny central pictogram and generic pixel text.

The corrected Track controls must borrow the **material density and layered construction** of the Yard plaque, then follow the Track screen's lower-console composition: card-like framed action illustrations seated into a dark stone-and-brass mechanical bed. They must not copy the Yard control as a blank dark square with a different small glyph.

## Pre-reset asset audit — confirmed mismatches

The pre-reset RIDE control was a sparse flat icon on an empty dark slab: its locomotive lacked steel, brass, cab/window, wheel, lamp and material detail; its label was disproportionately large and its plain single-line rim did not match either the ornate Track console or the Yard plaque. The pre-reset tunnel mouth had the same problem at world scale: it was a symmetric purple block arch filled with unrelated coloured rectangles, rather than a side-on railway opening embedded in grass, rock, timber and the Track's visible rail/ballast world.

That audit required the same correction across the batch: AR-064 tarp art had to look like fabric laid over the existing detailed cars, not a geometric blue overlay; AR-065/069 controls had to become framed illustrated cards; AR-066/067 had to read as traversable locations; and AR-068 had to harmonise with the locomotive/car wheel treatment. The approved results are recorded below.

## Approved control-card direction

The corrected RIDE card was explicitly approved as the family anchor. At the real 70px review size, every rebuilt action remains an illustrated mini-scene inside the same steel/brass/wood frame rather than a flat icon: the map reads as paper over a railway, RIDE as a locomotive, CLEAR as a car/cloth action, LOOP as a railway oval, TARP as blue canvas and car, STOP as a railway signal, SEND as a car toward a yard sign, and SLOW/FAST as distinct train-speed scenes. The outer plaque is intentionally more detailed than the former sparse keycap and now belongs to the game's elaborate toy console.

## Approved world-art direction

The reviewed detailed tunnel entrance now has the required Track-world language: real mossy grass, flower and pine clusters, varied rock faces, weathered stone voussoirs, timber/iron portal supports, and a side-on railway opening. It is substantially closer to the supplied Track world than the former abstract purple arch. The car-overlay review confirms that the TARP layer must preserve the train's existing wheel/rail detail and nameplate, while the fabric itself needs crisp highlighted folds, eyelets and tied ropes instead of a translucent wash.
