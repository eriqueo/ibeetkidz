---
title: claude-projects-guide
type: Reference
timestamp: 2026-06-28T16:35:00-06:00
tags: [claude, workflow, prompt-engineering, oversight]
status: stable
---

# Directing iBeetKidz in Claude Projects

> **This guide explains how to use Claude.ai (specifically Claude Projects) to execute the remaining phases of the iBeetKidz roadmap, acting as the project director.**

You have the credits, you have the roadmap, and you have the engineering principles. The challenge is getting Claude to execute without falling back into "vibe coding" or taking shortcuts [1]. This workflow enforces structured oversight.

---

## 1. Setting Up the Project Knowledge Base

Claude Projects allows you to upload custom knowledge. Do not upload the entire codebase—it dilutes the context. Upload only the architectural guardrails.

**Files to upload to the Project Knowledge:**
1.  `engineering-principles.md` (Your core philosophy)
2.  `DIRECTOR_HANDOFF.md` (The game vision and rules)
3.  `IMPLEMENTATION_ROADMAP.md` (The sequence of phases)
4.  `src/core/types.ts` (The domain data model)
5.  `src/game/EventBus.ts` (The hexagonal boundary contract)

**Custom Instructions for the Project:**
> "You are the lead engineer for iBeetKidz. You must strictly adhere to the `engineering-principles.md` and the `DIRECTOR_HANDOFF.md`. Never write hardcoded UI coordinates; always rely on data-driven maps. Never cross the hexagonal boundary: Phaser scenes only emit events, React components handle state. When given an `AGENT_PROMPT_*.md` file, execute its instructions exactly and do not deviate from its pass/fail gates."

---

## 2. Executing a Phase (The Stepwise Workflow)

When you are ready to execute a phase (e.g., Phase B), follow this exact prompt sequence in a new chat within the Project.

### Step 1: Context Loading (Ignition)
Do not ask Claude to write code yet. Ask it to read the prompt and verify understanding.

**Your Prompt:**
> "We are starting Phase B. Read the attached `AGENT_PROMPT_PHASE_B.md`. Do not write any code yet. Reply with a bulleted list of the exact files you need to see to implement this, and summarize the pass/fail gates to prove you understand the constraints."

*Why this works:* It forces Claude to build an inventory of dependencies before acting, preventing hallucinated file structures [2].

### Step 2: File Provisioning
Provide the files Claude requested.

**Your Prompt:**
> "Here are the files you requested: `[Paste contents of WorkshopScene.ts, scene-layout.ts, etc.]`. Now, write the implementation for `TiledParser.ts`. Do not modify the scenes yet."

*Why this works:* Stepwise refinement. You are breaking the task down and verifying the utility class before letting Claude touch the complex scene files [1].

### Step 3: Scene Integration
Once `TiledParser.ts` looks correct, authorize the scene rewrites.

**Your Prompt:**
> "TiledParser looks good. Now provide the updated `WorkshopScene.ts` and `YardScene.ts` using the parser. Ensure you have removed the hardcoded coordinates from `scene-layout.ts` as specified in the gates."

### Step 4: Verification
Do not blindly copy-paste. Verify against the friction patterns in `DIRECTOR_HANDOFF.md`.

**Checklist:**
*   Did it add an HTML overlay instead of a Phaser sprite? (Reject it).
*   Did it guess a coordinate instead of using the Tiled parser? (Reject it).
*   Did it modify `project-state.ts` from inside a Phaser scene? (Reject it).

**Your Prompt (if rejection needed):**
> "You failed Gate 1. You left hardcoded coordinates for the toolbar in `scene-layout.ts`. Re-read `DIRECTOR_HANDOFF.md` regarding data-driven architecture. Remove them and rewrite the scene to use the Tiled parser."

---

## 3. Handling Art Generation (Phase A)

Claude cannot generate the art assets directly. You must use Midjourney, DALL-E, or Stable Diffusion.

1.  Open `ART_BRIEF.md`.
2.  Copy the base plate prompts and style constraints into your image generator.
3.  Once generated, use Photopea (or Photoshop) to ensure the dimensions are exactly 2560x1440.
4.  Follow the `SCENE_AUTHORING_GUIDE.md` to map them in Tiled.
5.  Only *after* the JSON maps exist, start Step 1 of the engineering workflow.

## References

[1] R. C. Martin, *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall, 2017.
[2] "Task Breakdown for Actionable Execution," Internal Knowledge Base.
