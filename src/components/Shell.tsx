// The v2 router. Every space is a Phaser scene wrapped in a React view; the
// Shell's whole job is to pick the one `project.activeView` names.
//
// Ticket M1 deleted the v1 DOM shell that used to live below this (the kidpix
// 4-region grid: palette / options bar / canvas / play bar, the v1 tool
// registry, the phone rail sheet). It was unreachable — `AppView` has exactly
// these four members, so every path returned above it — and its hooks ran after
// those early returns, which is a rules-of-hooks violation.
//
// The map below is keyed by `AppView`, so adding a view is a compile error here
// until it has a component.

import type { FC } from "react";
import { useProject } from "../app/context.tsx";
import type { AppView } from "../core/types.ts";
import { GameCanvas } from "./GameCanvas.tsx";
import { Workshop } from "./Workshop.tsx";
import { Yard } from "./Yard.tsx";
import { Track } from "./Track.tsx";
import { Map } from "./Map.tsx";

const VIEWS: Record<AppView, FC> = {
  map: Map,
  workshop: Workshop,
  yard: Yard,
  track: Track,
};

export const Shell: FC = () => {
  const View = VIEWS[useProject().activeView];
  return (
    <div id="app">
      <div className="shell-root">
        {/* The shared Phaser canvas sits OUTSIDE the view swap on purpose: it
            is what keeps one WebGL context and one TextureManager alive across
            navigation (design/PERF_SINGLE_PHASER_GAME.md). Views render only
            the HTML that floats above it, and must stay transparent. */}
        <GameCanvas />
        <View />
      </div>
    </div>
  );
};
