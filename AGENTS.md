
#========
CURRENT WORKING PLAN. EVERYTHING THAT GOES AGAINST THIS IS CRUFT

docs/design/complexity-floor-2026-10-12.md
docs/design/atom-vocabulary-2026-10-12.md
docs/design/pivot-failure-record-2026-09-30.md

#========

# YOU ARE NOT ALLOWED TO CHANGE OR MODIFY THIS DOCUMENT.
# YOU ARE NOT ALLOWED TO VIOLATE THE LAWS GIVEN


# Melite

This code repository is known Melite, an agent media creation kit.

This creation kit features three distinct layers 

## Layer A: Harness, API-Call constructor, and UI Kit: Cordis

Cordis is the sole framework and architecture of layer A, any deviation from this is incorrect.

* You have a series of skills you MUST ALWAYS use in order to understand how to develop the code properly.
* Cordis servers as the constructor for UI elements, and the agenic harness through Deepseek Harness integration. The ideal goal of Layer A is to remain small code over DSH cordis; never an invented system.
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

THE 3088 AGENT LOOP (operator law 2026-09-23, paid for — never forget):
generation-commission testing = ONE human-like task prompt to the headless
maker on the 3088 lane, then the coding session ANALYZES THE LOGS. The exact
recipe: `docs/RUNBOOK-3088-AGENT.md`. Read it before any "run the loop /
test the system / commission" task. Never hand-drive the estate doors as a
substitute; never spawn 3080 subagents for it; never ask the operator for
details the runbook already holds.

# Subagents

Subagents are critical for auditing, exploring, and findoing gaps
The rule of thumb that should be emplyed is for them to write reports to: docs/audits/
Subagents should also be sent to this folder to update the findings there, updating /verifying findings, track progress, closing out and deleting. This is a key task for subagents, to ensure that the docs/audits/ never drfit out of place


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

The forward-looking index of OWED work is docs/ROADMAP.md — the
ledger archives what landed; the roadmap holds what is owed, each
item with its evidence and gates. READ IT FIRST on any new session
or goal round, before planning work: it survives context compaction
(this is the compact law, operator 2026-09-20).

# AGENTS MD BASE

Conventions
Packages use @deepseek-ai/dsh-<name>; vendor is rescoped and private: true. Harness packages declare @deepseek-ai/cordis in peerDependencies/devDependencies. Workspace dependency sections use DSH workspace:*, vendor/native workspace:~ (rules).
ESM everywhere ("type": "module"). Use package names across packages and .ts in local relative imports. Config subprocesses run built lib/ under plain Node; source regressions use their declared launcher (testing policy). The dsh CLI source launch runs through tsx's ESM-only hook (node --import tsx/esm); modules it reaches must stay ESM (no CJS-only exports) — Node's native TypeScript modes are unavailable across the engines range (source-launch contract). Raw/Web cordis.yml bare plugins must appear in their resolver manifest's dependencies; verify-cordis-config enforces it.
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

Docs accompany every code change: update affected README and JSDoc contracts together. Routine bilingual work follows docs/AGENTS.md; only explicit user invocation may run dsh-translate-docs. Current-state prose, one physical line per paragraph, one home per fact, and word budgets live there.


====

references/deepseek-harness/docs/AGENTS.md — The documentation standard
This file defines document structure, Markdown tiers, writing rules, and verify-doc-budgets ceilings. Use dsh-doc for placement and validation, and dsh-prose-standard for required coverage and editorial judgment; the doc-tiers Agent Note owns rationale.

Document structure
These rules apply to human-facing documentation; Agent Notes remain outside their scope. A postmortem is an incident-scoped reference; chronology records evidence, not a teaching sequence. A document's subject and tree position fix its scope: describe its own subject at appropriate detail and direct children only by purpose, responsibility, and high-level behavior; link to the owning descendant for lower-level detail. Document type does not widen that scope. A reference may be exhaustive only about its own subject. Testing mechanisms, fixtures, and harnesses belong at the lowest owning level; higher documents link there.

Classify every in-scope document as a tutorial or reference. Tutorials follow an ordered path to an outcome and introduce only what each step needs. References define a lookup scope and current behavior without a teaching sequence. Separate substantial tutorial and reference content; label a section when either part is small.

Before writing a tutorial, privately classify the reader's starting knowledge and each concept as beginner, intermediate, or advanced. Establish prerequisites before dependent concepts, increase difficulty gradually, and move unnecessary advanced material to a later tutorial or reference.

Author in this order: locate the document in the tree; set its permitted detail; choose tutorial or reference; for a tutorial, order concepts by prerequisite and difficulty; relocate descendant-owned detail; replace lower-level explanations with links to their owners.

The tier taxonomy: one home per fact
Each fact has one home: the tier whose job it is; elsewhere, link there.

Tier	Job	Does NOT belong there
Root references/deepseek-harness/AGENTS.md	Standing orders: rules an agent needs in context in every session, one to three lines each, linking its home	Stories, worked examples, situational procedures, anything restated from a linked home
Subtree AGENTS.md (references/deepseek-harness/packages/, references/deepseek-harness/docs/, references/deepseek-harness/.agents/notes/)	Orders specific to that subtree	Repo-wide rules the root file already carries
references/deepseek-harness/docs/architecture.md	Ordered map: composition, core packages, loop, seams, extension points; read before changing packages/	Type definitions (→ subsystems), per-package detail (→ package READMEs), decision rationale (→ Agent Notes), implementation-status annotations
references/deepseek-harness/docs/subsystems/	One reference page per subsystem: type definitions, semantics, and the generated Cordis API	Behavior narration (→ architecture.md)
Agent Notes	Active decision records: the why, what-was-given-up, and required verification; implemented/ notes describe shipped reality in present tense	Migration plans, acceptance-task checklists, fixture walkthroughs, and spec-speak ("should…") once the decision has shipped; archived notes are frozen history, never current authority
references/deepseek-harness/docs/postmortem/	Incident stories — the only tier where war-story narrative belongs	—
Persistence history and format references	Type-change acknowledgements, release comparisons, and complete historical format schemas	Behavior-only changes; current runtime contracts
references/deepseek-harness/docs/cookbook/	Step-by-step how-tos with numbered verify steps	Design rationale (→ the Agent Note each guide links)
references/deepseek-harness/docs/user/	Product-facing guides published by the documentation website	Generated reference tables, contributor procedures, decision history
Package README	The per-package contract: config, semantics, limitations, extension points, and Model Experience	JSDoc restatement, generated-catalog restatement (event/tool tables), other packages' concerns
references/deepseek-harness/docs/development.md	Contributor setup, daily workflow, and a summary of CI; a bilingual pair under the i18n contract	Runtime/version rationale (→ Agent Notes), check-by-check lists that drift from package.json scripts
Generated reference: the per-page cordis-surface regions in subsystems/, the Cordis core API + inherited tier, tool-catalog, config-catalog, persistence-catalog, module-graph.md	Exhaustive English sources regenerated from source and freshness-gated; reviewed Chinese counterparts follow the pairing workflow	Hand edits to generated English sources or regions; Chinese counterparts update through pairing only
Skills (references/deepseek-harness/.agents/skills/)	Reusable workflows and specialized decision standards	Product and runtime contracts (→ docs or source)
Placement: bugs → postmortems; rationale → Agent Notes; procedures → cookbooks; type definitions → subsystems; package contracts → READMEs; standing orders → root AGENTS.md with a rationale link.

Writing rules
Document current state. Keep history in commits, PRs, Agent Notes, postmortems, or scoped persistence records. Other prose names live mechanisms, not changes or stack positions. General Session-format prose links version/status authority; retain numbers for version-specific contracts, examples, or evidence.
Apply the Agent Note creation criteria. Mechanical/local edits are exempt, including local UI changes; keep existing owning notes accurate (scope).
One physical line per paragraph (verify-md-wrap): use editor soft-wrap. Code blocks, tables, and list structure keep their formatting; code comments stay under the linter's column limit.
Fenced ts blocks must compile (doc-typecheck); a pasted type declaration and its original JSDoc use ```ts type-equiv, while a body-stripped public class declaration uses ```ts public-api; register either in the manifest so neither can drift (mechanics).
The owning subsystems page updates in the same change that reshapes a documented type. verify-type-equiv catches drifted pastes, not never-documented new types; a type is documented on its declaring package group's page (page scoping).
Pairs update together: Terminology-guided, single-pass active-agent work repositions first-use annotations, preserves untouched prose, and re-records; dsh-translate-docs remains user-invoked (contract).
Comments and JSDoc state complete contracts, not reasoning transcripts. Preserve behavior, failure, timing, ownership, modality, exceptions, consequences, and non-obvious orientation; delete narration, test walkthroughs, review analysis, and code restatement. Keep the local contract and link its rationale. Use dsh-prose-standard for details.
Write directly: name actors and facts (decision). Reserve seam for the defined capability. Name the exact check, type, API, operation, or behavior instead of metaphorical "gate", "vocabulary", or "surface".
Wordcount Budgets
scripts/doc-budgets.manifest.json sets standing-doc ceilings; pnpm run verify-doc-budgets rejects excess or missing files.

When the gate goes red:

Relocate content that belongs in another tier; leave a one-line link if needed.
Condense content that belongs here but can be shorter.
Raise the ceiling only when the words need the space; justify the manifest diff in the PR. A too-low ceiling is a budget bug.
Ceilings are guardrails, not reduction targets. At or below target, retain at least 5% headroom; above target, freeze the ceiling until relocation or condensation brings the document under target. Lower a ceiling only when the document still has room. Targets: root AGENTS.md ≤ 1,960; architecture.md ≤ 2,400; subtree AGENTS.md ≤ 600, except packages/AGENTS.md ≤ 750 and this file ≤ 1,320; packages/README.md ≤ 994; plus cordis-primer.md 600, defensive-patterns.md 550, testing.md 1,300, examples/AGENTS.md 310. Review governs unbudgeted tiers.

The slop checklist
Hunt these in any doc; dsh-doc runs this list as an audit:

Duplicated rules: search a distinctive phrase; keep one home and link the rest.
History outside its permitted tier: state current facts and link the historical owner.
Implementation-status annotations in prose or diagrams ("implemented!", "future: …"). Status rots; the repo layout and package manifests carry it.
Hand-restated catalogs, JSDoc, or inventories of tests, packages, and status when source or a generator is authoritative.
Reasoning transcripts: step-by-step implementation narration, proof of obvious branches, test walkthroughs, or rejected local alternatives. Keep the resulting contract or durable rationale; delete the path used to derive it.
Rationale repeated beside sibling methods instead of once at the owning capability or helper.
Paragraph walls: one paragraph carrying several rules and parenthetical asides. Split it or demote the detail to its home.
Emphasis inflation: bold, CAPS, or "critically" everywhere means nothing stands out. Reserve emphasis for the clause that changes behavior.
Spec-speak in implemented/ Agent Notes: "should", migration plans, acceptance checklists. An implemented Agent Note describes what is, per the implemented-note instructions.
Repository references
Use relative Markdown links for current files and tags or PR numbers for historical references. verify-md-links checks local targets. Reference validation rejects actual commit identifiers and disallowed organization URLs in maintained files.
