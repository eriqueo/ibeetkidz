// The visual styles, in the order the kid cycles them.
//
// ONE PRODUCER. This list used to be a private `DEFAULT_STYLES` const inside the
// DOM host (`visualizer.ts`); when the Track scene became the host too, that
// would have meant two orderings to keep in step. The host is now whatever
// module owns a drawing surface — the list is not the host's business.
//
// Calm styles lead and the (toned-down) retro scope is last: the visualizer is
// on screen whenever a song is sounding, so the default has to respect
// light-sensitivity rather than assume the kid opted in.
import type { VisualStyle } from "../ports/renderer-port.ts";
import { barsStyle } from "./styles/bars.ts";
import { blobStyle } from "./styles/blob.ts";
import { retroScopeStyle } from "./styles/retro-scope.ts";

export const VISUAL_STYLES: readonly VisualStyle[] = [barsStyle, blobStyle, retroScopeStyle];
