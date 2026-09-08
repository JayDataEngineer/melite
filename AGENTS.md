# AGENTS.md — LAWS FOR THIS MACHINE

## LAW 0 (operator order, 2026-09-07, verbatim intent)

> "The Engine is Comfyui, extensions to the Engine's functionality is
>  done through vendored Comfyui Extensions, the role of this code is
>  to place API calls to Comfyui and Comfyui-Manager using the Cordis framework."

- The engine is ComfyUI — upstream-owned, never reimplemented here.
  This repo places API calls (validated params → workflow graph →
  ComfyUI `/prompt` → artifacts); it does not implement inference
  ops. A capability the stock engine lacks arrives as a vendored
  ComfyUI extension submodule, never as estate-side compute.
- ComfyUI-Manager is the install rail (EXTENSION LAW); Blender, where
  needed, is a declared requirement served by a ComfyUI node, never a
  subprocess the estate owns.
- Drift prevention: a vendored pack with no card graph referencing its
  nodes is cruft — archived to `archive/vendor/comfyui_extensions/`
  (restore procedure in `archive/README.md`), never left live. An
  archive restore without a consumer is re-cruft and refuses review.
- Anything expressible as a stock-node subgraph is a graph (client
  side), never a node (server side).


## INFERENCE LAW (operator order, 2026-08-29, verbatim)

> "ONLY USE INFERENCE THROUGH COMFYUI"

- The codebase is constructed to be pure cordis, the non-vendored's code
- is only concern is with an API call. This is similar to a
- an ai harness' principal concern with placing api calls to an
- api provider.  

## QUEUE LANE LAW (operator order, 2026-08-30, verbatim)

> "No legacy. No fallbacks. No hardcodes. These are banned."

## PLUGIN ARCHITECTURE LAW (operator order, 2026-08-31, verbatim intent)

> Follow the patterns established by Cordis and the Deepseek fork of Cordis
> to make the API calls to comfyui and comfyui-manager

## LAW TEXT HYGIENE (2026-09-04, born from the first law audit)

- A law names a file or format only while a wall pins the claim. Dead
  paths in law text teach dead shapes with extra authority — the same
  drift class as the `{yaml:}` teachings, inside the law file itself.

## DOCUMENTATION LAW (operator order, 2026-09-05, verbatim)

> "We must be EXPERT DOCUMENTORS... EXPERTS... otherwise COMPACTION will
> cause us to lose our precious progress."

- Session context is EPHEMERAL — compaction WILL discard it. The TREE is
  the only memory. Every insight, decision, verbatim operator order, and
  design fork lands in the tree IN THE SAME STROKE it occurs, never in
  chat alone.
- The record map (who holds what):
  - `AGENTS.md` — laws (verbatim orders + enforcement shape).
  - `docs/patterns/master-patterns.md` — THE pattern canon: every
    pattern in the estate with its wall, verify command, and fix
    recipe, plus THE LOOP (the AI verification protocol — operator
    order, 2026-09-07: "we can constantly verify and send weak AI to
    go and clean up the bad patterns. So the loop is on the AI and not
    me manually checking"). A pattern born lands in the canon the SAME
    stroke; a pattern that dies is marked RETIRED, never deleted.
  - `docs/design/*.md` — thinking: patterns, contracts, stroke plans;
    every record carries a Date and a Status (THINKING | landed | law).
  - `docs/audits/*.md` — evidence: probes, timings, numbers.
  - `*.d/causes.md` beside goldens — every regold's reason.
  - `tests/walls/suites/` — enforcement: a pattern without a wall is a
    suggestion.
- A record a future session (post-compaction, or a fresh agent) can act
  on ALONE: date + verbatim order + status + the decision + its wall.
  A decision that lives only in chat history is LOST.
- Enforced by `tests/walls/suites/test_record_shape.py`: every design
  record and audit carries Date + Status; laws that name a wall are
  named BY it (LAW TEXT HYGIENE's mirror).

## SCOPE LAW (operator order, 2026-09-08, verbatim intent)

> "This folder is standalone."

- The agent stays inside the repo root. Files outside it (home-dir
  launchers, other checkouts, host config) are off-limits unless the
  operator explicitly sends the agent out. A path outside the root is
  not read, listed, or quoted — even when it would explain something.
