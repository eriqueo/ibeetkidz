#!/usr/bin/env python3
"""
Trace the ride path from the painted Track plate and write it into track.json.

WHY THIS EXISTS. `track-path` in `src/assets/maps/track.json` is the line the
train rides. It was hand-traced, and it was traced onto the INNER EDGE of the
painted oval rather than the track's centreline: at the bottom of the oval it
ran 70 px above the rails and at the top it ran 40 px below them. With a
sprite anchored at its centre that accidentally looked right at the bottom
(the wheels hung down onto the rail) and visibly wrong at the top — "the train
isn't even on the tracks when it is on the back side of the tracks".

Vehicles are anchored at their GROUND CONTACT point now (see
`src/game/car-geometry.ts`), which means the path has to be the line the wheels
stand on: the centreline between the two painted rails. This script measures
that line off the plate.

METHOD. Take the path already in the map as a first guess (it is the right
SHAPE, just offset) and snap it onto the rails: at every point along it, scan a
short distance either side along the local normal, and move the point to the
mean position of the steel-grey RAIL pixels found there. A short, centred search
window is what makes this robust — a radial scan from the middle of the oval
crosses trees, rocks and the whole width of the near ballast before it reaches
the track, and picks the wrong band on the near diagonals. Then smooth, and
resample 64 vertices uniformly by arc length starting at the right apex, running
clockwise — the ordering `TrackScene.parkAngle` depends on, so that t=0.25 is
still the crossing signal.

If the plate is redrawn with a DIFFERENT oval, seed it by hand in Tiled first
(anywhere within ~120 px of the real centreline) and then run this.

RE-RUN IT when the plate is repainted (AR-033 replaces this plate with a
no-perspective one):

    python3 scripts/trace-track-path.py --write

Without `--write` it only reports. Needs ImageMagick + numpy.
"""
import argparse
import json
import math
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
PLATE = ROOT / "src/assets/scenes-v2/track-scene-clean-v2.png"
MAP = ROOT / "src/assets/maps/track.json"
VERTICES = 64


def load_rgb(path: Path):
    raw = subprocess.run(["magick", str(path), "-depth", "8", "rgb:-"],
                         capture_output=True, check=True).stdout
    out = subprocess.run(["magick", "identify", "-format", "%w %h", str(path)],
                         capture_output=True, check=True).stdout.split()
    w, h = int(out[0]), int(out[1])
    return np.frombuffer(raw, dtype=np.uint8).reshape(h, w, 3).astype(np.int16), w, h


def trace(img, w, h):
    r, g, b = img[:, :, 0], img[:, :, 1], img[:, :, 2]
    brown = (r > g) & (g > b) & ((r - b) > 35)
    rail = (abs(r - g) < 20) & (abs(g - b) < 20) & (r > 120)
    # the chrome panel below the field (its frame is brown and its rivets grey)
    brown[int(h * 0.76):, :] = False
    rail[int(h * 0.76):, :] = False

    # The crossing signal stands ON the track, and its crossbuck is white-grey —
    # i.e. it reads as RAIL, in two arms a plausible gauge apart, and pulls the
    # traced line 70 px up toward it. Find it by its red-and-white mast and blank
    # a column wide enough to cover the arms; it stands on a straight, so the
    # samples either side interpolate across it exactly.
    red = (r > 150) & (g < 90) & (b < 90)
    red[: int(h * 0.4), :] = False
    cols = np.where(red.sum(axis=0) > 20)[0]  # a tall mast, not a red flower
    if len(cols):
        lo, hi = max(0, cols.min() - 130), min(w, cols.max() + 130)
        brown[:, lo:hi] = False
        rail[:, lo:hi] = False
        print(f"  masking the crossing signal at x {lo}..{hi}")

    # Dense resample of the existing path — the seed the scan starts from.
    seed, _ = resample(read_path(), 1440)
    n = len(seed)
    REACH = 150.0  # how far either side of the seed to look for rail

    out = np.full((n, 2), np.nan)
    for i in range(n):
        prev, nxt = seed[(i - 1) % n], seed[(i + 1) % n]
        tx, ty = nxt - prev
        norm = math.hypot(tx, ty) or 1.0
        nx, ny = -ty / norm, tx / norm  # unit normal
        hits = []
        s = -REACH
        while s <= REACH:
            x, y = int(seed[i][0] + nx * s), int(seed[i][1] + ny * s)
            if 0 <= x < w and 0 <= y < h and rail[y, x]:
                hits.append(s)
            s += 0.5
        if not hits:
            continue
        # Cluster the steel into runs, then take the PAIR of runs that reads as
        # the two rails — a plausible gauge apart, and centred nearest the seed.
        # Not the mean of everything: the infield rocks are steel-grey too, and
        # they sit within reach of the left and right straights.
        runs, start, prev = [], hits[0], hits[0]
        for s in hits[1:]:
            if s - prev > 12:
                runs.append((start, prev))
                start = s
            prev = s
        runs.append((start, prev))
        best = None
        for a in range(len(runs)):
            for bnd in range(a + 1, len(runs)):
                gauge = (runs[bnd][0] + runs[bnd][1]) / 2 - (runs[a][0] + runs[a][1]) / 2
                if not 6 <= gauge <= 130:
                    continue
                mid = (runs[a][0] + runs[a][1] + runs[bnd][0] + runs[bnd][1]) / 4
                if best is None or abs(mid) < abs(best):
                    best = mid
        if best is not None:
            out[i] = [seed[i][0] + nx * best, seed[i][1] + ny * best]

    ok = ~np.isnan(out[:, 0])
    print(f"  snapped {ok.sum()}/{n} samples onto rail")
    if ok.sum() < n * 0.5:
        sys.exit("less than half the path found rail — the masks are wrong for this plate")

    # Fill the gaps (the crossing signal, a rock on the ballast) and smooth: the
    # scan is per-pixel and the ride line must not wobble.
    idx = np.arange(n)
    for k in (0, 1):
        out[:, k] = np.interp(idx, idx[ok], out[ok, k], period=n)

    def circular(fn, series, win):
        pad = np.concatenate([series[-win:], series, series[:win]])
        return np.array([fn(pad[i:i + 2 * win + 1]) for i in range(win, win + len(series))])

    for k in (0, 1):
        out[:, k] = circular(np.median, out[:, k], 20)
        out[:, k] = circular(np.mean, out[:, k], 20)
    return out, (float(out[:, 0].mean()), float(out[:, 1].mean()))


def read_path() -> np.ndarray:
    doc = json.loads(MAP.read_text())
    layer = next(l for l in doc["layers"] if l["name"] == "geometry-layer")
    obj = next(o for o in layer["objects"] if o["name"] == "track-path")
    return np.array([(obj["x"] + p["x"], obj["y"] + p["y"]) for p in obj["polygon"]], dtype=float)


def resample(poly, n):
    """n vertices uniform by arc length, starting at the existing vertex 0."""
    closed = np.vstack([poly, poly[:1]])
    seg = np.hypot(*np.diff(closed, axis=0).T)
    cum = np.concatenate([[0], np.cumsum(seg)])
    want = np.linspace(0, cum[-1], n, endpoint=False)
    return np.column_stack([np.interp(want, cum, closed[:, 0]),
                            np.interp(want, cum, closed[:, 1])]), cum[-1]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="write the polygon into track.json")
    ap.add_argument("--overlay", metavar="PNG", help="draw the traced line over the plate")
    args = ap.parse_args()

    img, w, h = load_rgb(PLATE)
    poly, (cx, cy) = trace(img, w, h)
    # start at the right apex (max x) and run clockwise, which is +theta on a
    # y-down screen — the order the trace already produced.
    start = int(np.argmax(poly[:, 0]))
    poly = np.vstack([poly[start:], poly[:start]])
    pts, perim = resample(poly, VERTICES)

    print(f"plate {w}x{h}  centre ({cx:.0f},{cy:.0f})  perimeter {perim:.0f}px")
    print(f"  x {pts[:,0].min():.1f}..{pts[:,0].max():.1f}   y {pts[:,1].min():.1f}..{pts[:,1].max():.1f}")
    print(f"  v0 {pts[0].round(1)}  v{VERTICES//4} {pts[VERTICES//4].round(1)} (must be bottom centre)")
    seg = np.hypot(*np.diff(np.vstack([pts, pts[:1]]), axis=0).T)
    print(f"  segment length {seg.min():.2f}..{seg.max():.2f} (arc-uniform)")

    if args.overlay:
        line = " ".join(f"{p[0]:.0f},{p[1]:.0f}" for p in np.vstack([pts, pts[:1]]))
        marks = []
        for i, p in enumerate(pts):
            if i % (VERTICES // 8) == 0:
                marks += ["-draw", f"circle {p[0]:.0f},{p[1]:.0f} {p[0]+7:.0f},{p[1]:.0f}"]
        subprocess.run(["magick", str(PLATE), "-fill", "none", "-stroke", "magenta",
                        "-strokewidth", "5", "-draw", f"polyline {line}",
                        "-stroke", "none", "-fill", "cyan", *marks, args.overlay], check=True)
        print(f"wrote {args.overlay}")

    if not args.write:
        print("(dry run — pass --write to update track.json)")
        return

    doc = json.loads(MAP.read_text())
    layer = next(l for l in doc["layers"] if l["name"] == "geometry-layer")
    obj = next(o for o in layer["objects"] if o["name"] == "track-path")
    obj["x"] = 0
    obj["y"] = 0
    obj["polygon"] = [{"x": round(float(p[0]), 1), "y": round(float(p[1]), 1)} for p in pts]
    MAP.write_text(json.dumps(doc, indent=2) + "\n")
    print(f"wrote {VERTICES} vertices into {MAP.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
