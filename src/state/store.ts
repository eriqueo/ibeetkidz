// External store over the existing (pure) ProjectState history. React subscribes
// via useSyncExternalStore; the reducers/undo logic are unchanged.

import {
  dispatch as histDispatch,
  redo as histRedo,
  undo as histUndo,
  type HistoryState,
} from "../core/project-state.ts";
import type { Command } from "../core/types.ts";

export interface Store {
  getSnapshot(): HistoryState;
  subscribe(listener: () => void): () => void;
  dispatch(cmd: Command): void;
  undo(): void;
  redo(): void;
  replace(next: HistoryState): void;
}

export function createStore(initial: HistoryState): Store {
  let state = initial;
  const listeners = new Set<() => void>();
  const emit = (): void => {
    for (const l of listeners) l();
  };
  const set = (next: HistoryState): void => {
    if (next === state) return;
    state = next;
    emit();
  };
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch: (cmd) => set(histDispatch(state, cmd)),
    undo: () => set(histUndo(state)),
    redo: () => set(histRedo(state)),
    replace: (next) => set(next),
  };
}
