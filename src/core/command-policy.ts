import type { Command } from "./types.ts";

/**
 * How a command participates in content history.
 *
 * Navigation changes persisted UI location, but it is not an edit to a kid's
 * song. Applying it across every reachable snapshot keeps the current room
 * stable when content is undone and prevents travel from covering the content
 * entry a visible PUT IT BACK offer refers to.
 */
export function commandHistoryPolicy(
  cmd: Command,
): "content" | "navigation" {
  return cmd.type === "setActiveView" ? "navigation" : "content";
}
