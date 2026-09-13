# Melite

This code repository is known Melite, an agent media creation kit.

This creation kit features three distinct layers 

## Layer A: Harness, API-Call constructor, and UI Kit: Cordis

Cordis is the sole framework and architecture of layer A, any deviation from this is incorrect.

* Cordis servers as the constructor for UI elements, and the agenic harness through Deepseek Harness integration. The ideal goal of Layer A is to remain small code over DSH cordis; never an invented system.
* Never assume how Cordis functions. There are two documents that define how you should interact with Cordis. DO NOT rely on memory, or assumptions. Always understand and apply the sources.
	* The core document is this pdf file references/cordis-paper.txt, this describes how to use cordis to build apps
	* Functional and up to date cordis usage can be found in
		* references/deepseek-harness/docs/
		* references/deepseek-harness/docs/cordis-tutorial/
		* references/deepseek-harness/docs/cordis-api/
		* references/deepseek-harness/docs/cookbook/
  * A complete cordis application you should be mirroring: references/deepseek-harness
  

## Layer B: The Engine: Comfyui, MCP servers
* Layer A exists to call Layer B. 
* The current phase of the project is currently focused on Comfyui.
  * Layer A directly calls the ComfyUI Api as well as ComfyUI Manager API to infer and manage based on ComfyUI
* The next phase is adding in the MCP servers of Unity, Blender, and AutoRemesh.

## Layer C: Engine Extensions
	* This layer features the VENDORED tooling that the engines use, that extend engine capabilites without touching engine source code.
	* In this phase, this is exclusively done though ComfyUI Extensions.
		* Most are taken from upstream, but a few must live coded here.


# Commands

```sh
pnpm install            # pnpm workspaces
pnpm run test           # unit (vitest, all projects)
pnpm run test:coverage  # CI coverage gate: per-file 100% on gated src (models DECL; ledger TEST-2 owns the exempt debt)
pnpm run test:e2e       # real-API e2e; self-skips without DEEPSEEK_API_KEY
pnpm run test:expected  # owner-local process expectations
pnpm run test:bench     # performance benchmarks
pnpm run test:snapshot  # keyless recorded-session replay
pnpm run test:web       # web browser snapshot (replay); test:web:browser owns playwright
```

Testing policy — `references/deepseek-harness/docs/testing.md`. Every
non-trivial model- or product-user-visible change updates a keyless
recorded-session snapshot in the same PR. `test:coverage`, not `test`,
is the CI coverage gate.

# Hard Rules

## AGENT MODE — the media compose contract (chat sessions on the Melite lane)

You may be a CHAT session serving a user on this lane (not a coding
session in the repo). If the user asks for media — an image, a video,
audio, a mesh, an edit — you compose it on the estate; you never
hand-roll the engine. THE FLOW, in order:

1. `melite_discover` — find the card or flow for the request.
2. `melite_load` — open it: params, models, skills.
3. `melite_construct` (`add_stage`, then `patch`/`rewire`/… as the
   user refines) — the flow lands on THE SHARED BENCH, live in the
   user's cards tab (right sidebar). The user watches it land and
   edits alongside you.

Your contract ENDS there — but the editing does not: keep refining
the bench state as the user asks. RUNS START AT THE USER'S RUN
PRESS on the card — never yours (no `melite_flow` in this mode; it
is not in your tools, do not hunt for it).

NEVER, in agent mode: shell out to ComfyUI (no Bash curls to
:8188, no hand-built graphs), no raw `/v1/flows/*` HTTP — the
estate tools above own every door. `comfy_manage` is for checking
server/pack state, not for generating.

(The sections below govern coding sessions in this repository.)

## LAW 1: ARCHITECTURAL INTEGRITY

In order for the codebase to remain cohesive, you must always follow the three layered architecture
* Layer A: The driver is always cordis, typescript, following the manifests and documents of references/cordis-paper.txt and references/deepseek-harness/*, never handrolled typescript or python. If CORDIS doesn't do a task in a certain way, as outlined by the documents, then the codebase cannot go around this.
  - YOU ALWAYS READ THE DOCUMENATION, RATHER THAN DECIDING FOR YOURSELF.
  - There is always potential for drift from the Cordis Golden Path, either in the codebase or repository specific documenation. This drift should be treated as degenerate, rather than a guide on what to do.
* Layer B is not ours to modify through Layer A or Layer B directly. The only way to enhance what Layer B can do is done through Layer C. Layer A can only ever make API calls to B.

## LAW 2: NO HACKS, NO SHORTCUTS

In large code pushes, it is tempting to follow degenerate behavior and create guidelines that make the task easier. This is even more critical at the grainular level.

For example, using 'unkwown' typing, writing legacy adapters instead of porting code, creating principals based on the 'easy' path - that then become enshrined. 

The correct way to handle difficult work is to make a small change, make a quick test, and see if the new code works in isolatation, even if it does not yet match the entire codebase. This slow, sure method is more disirable then rushing to a 'complete' state where things run, but, are based on unprofessional code.
  - This method is employed to prevent the issue of: establishing a code pattern, finding that it breaks all tests, then adding in hacks so it has a brigde to pass the old tests in a cycle of degeneration.

## LAW 3: DOCUMENTATION

Another method employed used to prevent degenerate code is to maintain a ledger and living record for law conformance: docs/CONFORMANCE_LEDGER.md
This document holds a record of the mechanics of the code repository for an up to date accountment of where the mechanic falls:
  * What is in alignment with DSH Cordis though importing DSH Cordis packages with reasoning.
  * What is in alignment based on DSH Cordis principals, but features handrolls with reasoning.
  * What is non in alignment with DSH Cordis with reasoning.

By keeping track of this document, it can be shown where to code needs to better conform to the ideals outlined in this document.
