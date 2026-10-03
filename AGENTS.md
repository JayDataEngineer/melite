# Melite

This code repository is known Melite, an agent media creation kit.

This creation kit features three distinct layers

## Layer A: Harness, API-Call constructor, and UI Kit: Cordis

Cordis is the sole framework and architecture of layer A, any deviation from this is incorrect.

* You have a series of skills you MUST ALWAYS use in order to understand how to develop the code properly.
* Cordis serves as the constructor for UI elements, and the agentic harness through DeepSeek Harness integration. The ideal goal of Layer A is to remain small code over DSH cordis; never an invented system.
* Never assume how Cordis functions. There are two documents that define how you should interact with Cordis. DO NOT rely on memory, or assumptions. Always understand and apply the sources.
	* The core document is this pdf file references/cordis-paper.txt, this describes how to use cordis to build apps
	* references/deepseek-harness/architecture.md
	* Functional and up to date cordis usage can be found in
		* references/deepseek-harness/docs/
		* references/deepseek-harness/docs/cordis-tutorial/
		* references/deepseek-harness/docs/cordis-api/
		* references/deepseek-harness/docs/cookbook/
  * A complete cordis application you should be mirroring: references/deepseek-harness
* In code comments, make direct references with line numbers to the deepseek harness repo

## Layer B: The Engine: ComfyUI, MCP servers
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

Developer-local material (working plan, conformance ledger, roadmap,
runbooks, audits) lives in `dev_docs/` — untracked, present on
development machines only. The compact law (operator 2026-09-20):
READ `dev_docs/ROADMAP.md` FIRST on any new session or goal round,
before planning work; it survives context compaction.

# Subagents

Subagents are critical for auditing, exploring, and finding gaps.
The rule of thumb: they write reports to `dev_docs/audits/`
(developer-local), and later sessions are sent there to verify,
update, and close findings so the tree never drifts.

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
* Layer A: The driver is always cordis, typescript, following the manifests and documents of references/cordis-paper.txt and references/deepseek-harness/*, never handrolled typescript or python. If CORDIS doesn't do a task in a certain way, as outlined by the documents, the codebase cannot go around this.
  - YOU ALWAYS READ THE DOCUMENATION, RATHER THAN DECIDING FOR YOURSELF.
  * There is always potential for drift from the Cordis Golden Path, either in the codebase or repository specific documenation. This drift should be treated as degenerate, rather than a guide for what to do.
* Layer B is not ours to modify through Layer A or Layer B directly. The only way to enhance what Layer B can do is done through Layer C. Layer A can only ever make API calls to B.

## LAW 2: NO HACKS, NO SHORTCUTS

In large code pushes, it is tempting to follow degenerate behavior and create guidelines that make the task easier. This is even more critical at the granular level.

For example, using 'unknown' typing, writing legacy adapters instead of porting, creating principals based on the 'easy' path - that then become enshrined.

The correct way to handle difficult work is to make a small change, make a quick test, and see if the new code works in isolation, even if it does not yet match the entire codebase. This slow, sure method is more desirable than rushing to a 'complete' state that runs, but is based on unprofessional code.
  - This method is employed to prevent the issue of: establishing a code pattern, finding that it breaks all tests, then adding in hacks so it has a bridge to pass the old tests in a cycle of degeneration.

## LAW 3: DOCUMENTATION

Another method employed to prevent degenerate code is to maintain a ledger and living record for law conformance: `dev_docs/CONFORMANCE_LEDGER.md` (developer-local)
This document holds a record of the mechanics of the code repository for an up to date accountment of where the mechanic falls:
  * What is in alignment with DSH Cordis through importing DSH Cordis packages with reasoning.
  * What is in alignment based on DSH Cordis principals, but features handrolls with reasoning.
  * What is not in alignment with DSH Cordis with reasoning.

By keeping track of this document, it can be shown where the code needs to better conform to the ideals outlined in this document.

The forward-looking index of OWED work is `dev_docs/ROADMAP.md` (developer-local) — the ledger archives what landed; the roadmap holds what is owed, each item with its evidence and gates.

# AGENTS MD BASE

The sections from here to the end are quoted standards from the DeepSeek Harness reference tree (references/deepseek-harness). The verify-* gates, the dsh-doc / dsh-prose-standard / dsh-translate-docs tools, and the manifest files they name are that reference tree's mechanisms, not this repository's scripts; the gates this repository executes are the pnpm scripts listed under Commands above (test, test:coverage, test:snapshot, test:expected, and the walls tier inside the full run).

Conventions
Packages use @deepseek-ai/dsh-<name>; vendor is rescoped and private: true. Harness packages declare @deepseek-ai/cordis in peerDependencies/devDependencies. Workspace dependency sections use DSH workspace:*, vendor/native workspace:~ (rules). ESM everywhere ("type": "module"). Use package names across packages and .ts in local relative imports. Config subprocesses run built lib/ under plain Node; source regressions use their declared launcher (testing policy). The dsh CLI source launch runs through tsx's ESM-only hook (node --import tsx/esm); modules it reaches must stay ESM (no CJS-only exports) — Node's native TypeScript modes are unavailable across the engines range (source-launch contract). Raw/Web cordis.yml bare plugins must appear in their resolver manifest's dependencies; verify-cordis-config enforces it.
Registrations are effects: every contribution goes through ctx.effect() / ctx.on(); a registry's register() returns the disposer.
Runtime invariants assert owned relationships. Publish ./invariant only when independent observations can diverge. Otherwise omit its source and wiring and record why in its README; empty installers and checks of service presence, plugin metadata, effects, or fixed examples are invalid (package invariant rules).
Typed events use declaration merging and merge-extensible maps. Event JSDoc needs @mode and payload @param; scoped keys absent from payloads need @dshScopeScan unsupported. Public service methods document parameters and non-void returns. SessionEventMap members are required-on-read by default — builds that do not know a type refuse the log unless the event carries the envelope's ignorable: true; only structural format changes bump SESSION_FORMAT_VERSION (mechanism).
Switch on discriminant tags. Closed unions end in assertNever; merge-extensible unions fall through a documented default.
Waterfall listeners MUST call next() to delegate; returning without it short-circuits the chain (semantics).
Model-visible ⟺ logged: anything that reaches a model request must be reconstructable from the session log; a new model-visible input requires a session event.
Plugins, not loop changes: new behavior goes on documented extension points; changing agent-loop requires updating docs/architecture.md.
A capability seam comprises Service Definition / Service Provider / Consumer roles. It is complete, never one role; split only when roles evolve independently (glossary).
Prefer maintained dependencies over hand-rolling when they genuinely delete owned code and tests (policy).
Explicit > implicit at package boundaries: defaulting is an explicit resolve(request): Spec step in the owning implementation, never a hidden ?? default inside run() (the dsh-shell request/spec split is the template).
No hardcoded tunables in plugins: deployment-varying choices are validated Config fields changeable from cordis.yml; a DEFAULT_* constant or test hook is not configurability. Protocol constants, external specs, and security invariants stay fixed.
Misconfiguration fails loud at load when self-contained, otherwise at the earliest resolvable point; never silently skip a missing referent.
Opaque cross-boundary ids are branded (Branded<B> from dsh-brand), never bare string.
Trust TypeScript at typed same-process boundaries. Do not add runtime validation, fallback behavior, or hostile-input tests solely for values the static interface requires; validate at parser/config, queued, model/tool JSON, durable/file, worker, process, and wire boundaries.
No new assertions to unknown (as unknown or <unknown>). Preserve or reduce the exact legacy baseline; use typed values or validation for replacements (rule).
Source plane vs artifact plane, never mixed. Static gates and tests resolve workspace imports through tsconfig paths to src and pass on a clean tree; gates consuming built lib/ declare that dependency (layout).
Keep compiler faces explicit. A package with both Host and Client programs exposes face-specific leaf configs and a solution-only root; repo-wide programs seed a face config, never the root solution (layout).
An empty catch names the error and why; keep its try to one statement.
Keep comments local. Do not restate code, expand unrelated comments, or explain distant behavior without local need (rationale).
Ban prove + nance (rule).
Prefer symmetry for parallel values; unexplained asymmetry usually signals a missed extraction.
Tests describe behavior, not correctness. Change obsolete behavior with its tests; explain why in the PR.
Create Agent Notes only for durable decision rationale; mechanical/local edits are exempt, including local UI changes (scope). Archived notes are frozen: never edit or treat them as current authority (archive policy).
Client UI copy is locale-owned. Route product text through typed dictionaries and t or localized primitive props; verify-client-ui-i18n rejects hardcoded copy (decision).
Testing policy — docs/testing.md. Every non-trivial model- or product-user-visible change updates a keyless recorded-session snapshot; snapshot ownership reserves the top-level tree for session-driven cases and keeps other expected output owner-local. Fixtures replay on macOS/Linux; fix fixtures, not normalizers.
Design each tool's UI presentation up front. Host presenters stay pure; Web cards derive from raw events and persisted result metadata (cookbook).
Plan unit, e2e, and snapshot coverage for capability seams, lifecycle paths, and transcript output; include missing snapshot-harness support in the same change.
Both SDKs project the loop. Agent-loop, session-lifecycle, and SessionEventMap changes update the TypeScript and Python SDK expected outputs in the same PR; pnpm run test covers neither (surfaces).
Choose PR history deliberately. Split independent changes and fix the introducing PR before propagation. Standalone/stack branches may merge-forward or rebase. Rewrites use --force-with-lease, abort on remote movement, never raw --force; preserve an in-progress merge-forward checkpoint before taking a newer base (rationale).
Labels: one PR kind/*, all material area/*, and native Issue Type (taxonomy).
TODO markers: FIXME/TODO/XXX by urgency (semantics).
Files end with exactly one trailing newline; git diff --cached --check (pre-commit) gates it.
Defensive patterns
Read docs/defensive-patterns.md before lifecycle, concurrency, subprocess, or teardown work.

Type safety and documentation
Everything compiles under strict: true with noImplicitAny; every remaining any explains why narrowing is infeasible. Every module and export has concise JSDoc for its non-obvious contract; function-like exports include @param/@returns, as enforced by verify-export-jsdoc. Heritage-declared members, plugin-protocol slots, and constructors keep their docs at the declaring Service Definition, protocol, or class.

Comments and docs state complete contracts and context, not reasoning transcripts. Use direct, concrete terms. Do not use metaphors. Before writing contract, boundary, or shape, ask whether a more exact term names the subject: write response fields, JSON validation, or ESM exports instead of response shape, validation boundary, or module shape. Keep contract for preconditions, postconditions, invariants, compatibility promises, and other obligations that callers, callees, implementers, providers, producers, or consumers rely on. Keep a literal process, wire, security, transaction, or lifecycle boundary. Do not narrate control flow or tests, preserve review history, or restate code. Keep behavior, failure, timing, ownership, and safe-use facts; link the rationale. Use dsh-prose-standard for decisions. Wire mechanically checkable invariants into an executed top-level gate and prove each changed acceptance path rejects an invalid case. Use narrow, justified exceptions instead of disabling a rule globally.

Docs accompany every code change: update affected README and JSDoc contracts together. Current-state prose, one physical line per paragraph, one home per fact, and word budgets live there.
