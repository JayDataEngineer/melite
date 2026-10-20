import { a as routeName, i as resolveHarnessRoutes, n as harnessEnhance, r as matchHarnessRoute } from "./llm-complete-BR2qfbp4.mjs";
import Schema from "@deepseek-ai/schemastery";
import { ToolDefinition } from "@deepseek-ai/dsh-tools";
import { EngineJson } from "@melite/comfyui-cordis";
import "@deepseek-ai/dsh-attachment";
import "@melite/estate-media";
import "@deepseek-ai/dsh-llm";
import { Context } from "@deepseek-ai/cordis";
import "@melite/estate-call";
import { JsonValue } from "@deepseek-ai/dsh-util-values";
//#region src/estate.d.ts
/**
 * DYING SHIM (HTTP-era refusal carrier). The seats never throw it;
 * only lanes still awaiting their remotes keep instanceof arms for
 * it, and it is deleted with the last of those. Bench/drafts lanes
 * are already migrated (RemoteError codes).
 */
type EstateMethod = 'GET' | 'POST' | 'PATCH';
type EstateRequest = (method: EstateMethod, path: string, body: unknown, execSignal: AbortSignal, timeoutMs?: number) => Promise<unknown>;
/** The service-probe face every estate consumer reads through —
 *  cordis Context satisfies it structurally (the tutorial's
 *  documented ctx.get probe). The retired `as { get }` inline casts
 *  (F-2/F-4, 2026-11-05) named this face at every use site; the named
 *  interface is the one spelling now. */
interface EstateHost {
  get(name: string): unknown;
}
/** Build the tools' request: seats only, in-process. A lane with no
 *  seat for the path is a hard error — but the error must be an
 *  AGENT-USABLE refusal (F-8): name the family the path needs, the
 *  seats that ARE live, the pin that mounts the queue plane, and the
 *  chat-lane exit. The old voice ("the gateway lane fallback died
 *  2026-09-10 — migrate to a named Typert remote") read as a broken
 *  registry and sent an agent hunting doors for an hour. */
declare function makeEstateRequest(ctx: EstateHost): EstateRequest;
/** The bench plane's mutation verbs — the six arms the bench seat
 *  answers 1:1 (the router's regex admits the same six). */
type BenchVerb = 'patch' | 'add_stage' | 'remove_stage' | 'clear' | 'rewire' | 'undo';
/** The tool plane's ONE estate seam: the typed lanes. A tool factory
 *  takes `Estate` and calls methods — never `request('GET', path)`. */
interface Estate {
  /** The drafts plane: the KV list, the one-draft read, the stage
   *  wire PATCH (params edits + result persistence). */
  draftsList(signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  draftsGet(draftId: string, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  draftsStagePatch(draftId: string, stageId: string, patch: Record<string, unknown>, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  /** THE CARD COMPOSE (the start body → a bench-backed draft; the
   *  CAS one-retry law lives in the ONE lane both faces share). */
  cardCompose(body: Record<string, unknown>, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  /** The bench plane: the shared-bench read, the ensure (birth/load),
   *  the six mutation verbs. */
  benchGet(session: string, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  benchEnsure(doc: Record<string, unknown>, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  benchVerb(session: string, verb: BenchVerb, doc: Record<string, unknown>, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  /** The runs registry: validate (pure compile), start, live status,
   *  stop receipt, the tail list. */
  runsValidate(doc: unknown, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  runsStart(doc: unknown, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  runsStatus(runId: string, includeLog: boolean, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  runsStop(runId: string, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  runsList(limit: string, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  /** The disclosure seat: discover over both planes, the flow
   *  contracts. Sync seats — the bound still races their answer. */
  discover(lookup: string, q: string, tags: string, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  flowsContracts(signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  /** The management seat (ComfyUI-Manager plane). */
  manageAct(doc: unknown, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  /** The skills seat: the index and the one-doc read. */
  skillsIndex(signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  skillRead(id: string, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  /** The load seat: one card or flow bundle. */
  loadCard(inferenceType: string, name: string, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
  /** The queue seat's journal tail. SEATLESS reads as an EMPTY tail
   *  (the designed degrade — the journal is optional infra), never
   *  a refusal; a mounted seat's throw propagates. */
  ledgerTail(limit: string, event: string, signal: AbortSignal, timeoutMs?: number): Promise<unknown>;
}
/** The typed lanes (see Estate). Same seats, same refusals, same
 *  bounds as the URL router — no second answering of any lane law. */
declare function makeEstate(ctx: EstateHost): Estate;
//#endregion
//#region src/tools/run-status.d.ts
declare function runStatus(estate: Estate): ToolDefinition;
//#endregion
//#region src/tools/melite-discover.d.ts
declare function meliteDiscover(estate: Estate, expandEstateDoors: () => void): ToolDefinition;
//#endregion
//#region src/tools/melite-construct.d.ts
/** The default bench — the unattributed seat (headless runs,
 *  legacy callers). */
declare const DEFAULT_BENCH = "main";
declare function meliteConstruct(estate: Estate, opts?: {
  headless?: boolean;
}): ToolDefinition;
//#endregion
//#region src/tools/melite-flow.d.ts
declare function meliteFlow(estate: Estate): ToolDefinition;
//#endregion
//#region src/tools/comfy-manage.d.ts
/** The manage seat's refusal code (the envelope rides the details —
 *  the same declaration manageRegistry makes at the seat; repeated
 *  here because this tool compiles without the seat's module graph —
 *  the cards-resource 'cards/unclassified' pattern). */
declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    'manage/refused': {
      readonly action?: string;
      readonly status?: number;
      readonly code?: string;
      readonly data?: unknown;
    };
  }
}
declare function comfyManage(estate: Estate): ToolDefinition;
//#endregion
//#region src/tools/melite-load.d.ts
declare function meliteLoad(estate: Estate, opts?: {
  headless?: boolean;
  expandEstateDoors?: () => void;
}): ToolDefinition;
//#endregion
//#region src/tools/melite-view.d.ts
/** The engine render seam the sheet arms ride (one graph, one PNG
 *  back). Production submits the ESTATE'S OWN execute seat with the
 *  vendored view nodes (melite-utility-nodes: MeliteFrameSheet,
 *  MeliteWaveform — PyAV inside the engine, never a host binary, and
 *  the harness never becomes a codec vendor); the sheet lands in a
 *  scratch dir under os.tmpdir (never the run tree — a view mints no
 *  provenance) and returns as bytes. Tests pin every arm with fakes
 *  — no engine, no subprocess, nothing to install. */
type MediaSheetRender = (node: 'MeliteFrameSheet' | 'MeliteWaveform', inputs: Record<string, EngineJson>, signal: AbortSignal) => Promise<Uint8Array>;
/** Build the melite_view tool against the live cordis context (the
 * seats: `attachments` — the durable store, `queue` — the runs tree
 * root owner, `llm` — the route gate; all optional probes, the
 * tool-fs inject law). */
declare function meliteView(ctx: Context, render?: MediaSheetRender): ToolDefinition;
//#endregion
//#region src/tools/melite-read.d.ts
interface QueueSeatSeam {
  stateRoot: string;
}
type ReadResult = {
  runId: string;
  path?: string;
  bytes?: number;
  text?: string;
  truncated?: boolean;
  files?: string;
  error?: string;
} & Record<string, JsonValue>;
/** Read one text artifact of one run. With no `path`, LIST the run's
 *  text rows (the door's discovery arm — a maker needs to know what it
 *  can read before naming one). */
declare function readRunText(seat: QueueSeatSeam, runId: string, path: string): Promise<ReadResult>;
declare function meliteRead(ctx: {
  get(name: string): unknown;
}): ToolDefinition;
//#endregion
//#region src/tools/skill-index.d.ts
declare function skillIndex(estate: Estate): ToolDefinition;
//#endregion
//#region src/tools/skill-read.d.ts
declare function skillRead(estate: Estate): ToolDefinition;
//#endregion
//#region src/tools/ledger-tail.d.ts
declare function ledgerTail(estate: Estate): ToolDefinition;
//#endregion
//#region src/index.d.ts
/** Cordis plugin name used by loader diagnostics. */
declare const name = "melite-tools";
/**
 * Services this fiber NEEDS: tools + the harness LLM seam (enhance
 * rides ctx.llm). No webServer dependency — headless/SDK mounts boot
 * without one.
 */
declare const inject: string[];
/**
 * Plugin config — a Schemastery schema (V6 cure, 2026-10-18: the
 * zod-free raw pass hid interface selection from cordis.yml; the
 * loader now validates before apply, and the profile pins every
 * gate — cordis-tutorial/05-config.md, "bad config fails the load
 * with a precise error").
 */
interface Config {
  /** HEADLESS interface: register the run doors (melite_flow,
   *  run_status) — the delegated operator. Default false (browser law:
   *  the model composes, the USER presses Run). */
  headless?: boolean;
  /** AD HOC tool names, never in a base toolset ('enhance_prompt').
   *  Accepts a single string or a list. */
  adhocTools?: string | string[];
  /** CARD TOOL FACES (music/tts/image_edit/image_gen/motion/
   *  h3_timeline): DEFAULT FALSE — the operator's card-abstraction
   *  law (2026-09-21): an agent lane's toolset is discover/load/
   *  construct only; the engine faces never sit in the agent's
   *  toolset at turn one ("make a video" reached straight for
   *  h3_timeline before any discovery — the whole krea-2-turbo
   *  failure mode one lane over). Maker/studio faces (the web
   *  profile) opt in explicitly. */
  cardTools?: boolean;
}
/** The validator twin of {@link Config} (the loader applies defaults;
 *  direct apply calls resolve undefined as the documented default). */
declare const Config: Schema<Config>;
/** EAGER — the compose loop, the only melite schemas in a session's
 * first request (progressive disclosure, operator 2026-10-08: three
 * doors in context, the estate's deeper doors expand on first
 * catalog touch — src/expansion.ts owns the law). */
declare const EAGER_TOOL_NAMES: readonly ["melite_discover", "melite_load", "melite_construct"];
/** DEFERRED — seated by the first discover/load execute. The skill
 * twins carry the melite_ prefix (operator 2026-10-08: they are OUR
 * catalog's doors, not DSH core's skill machinery — the old
 * unprefixed names invited exactly that conflation). */
declare const DEFERRED_TOOL_NAMES: readonly ["melite_view", "melite_read", "comfy_manage", "melite_skill_index", "melite_skill_read", "ledger_tail"];
/** BASE tool names — both interfaces (discovery, compose, view,
 * management, audit). melite_view is the observe arm (viewing an
 * artifact is not a run press — the interface law holds). */
declare const BASE_TOOL_NAMES: readonly ["melite_discover", "melite_load", "melite_construct", "melite_view", "melite_read", "comfy_manage", "melite_skill_index", "melite_skill_read", "ledger_tail"];
/** HEADLESS-only run doors (config headless:true) — the delegated operator. */
declare const HEADLESS_TOOL_NAMES: readonly ["melite_flow", "run_status"];
/** AD HOC names (config adhocTools) — never in a base toolset.
 *  (empty since the disclosure stroke: enhance_prompt died as a tool —
 *  the editor ✦ door below keeps the user surface via harnessEnhance.) */
declare const ADHOC_TOOL_NAMES: readonly [];
/** Every tool name this plugin can own (registration log + smoke filter). */
declare const MELITE_TOOL_NAMES: readonly ["melite_discover", "melite_load", "melite_construct", "melite_view", "melite_read", "comfy_manage", "melite_skill_index", "melite_skill_read", "ledger_tail", "melite_flow", "run_status"];
/** Register the Melite tools against the live estate gateway.
 *  THE TYPED CONTEXT (F-2/F-4 cure, 2026-11-05): the hand-declared
 *  CtxView parallel is retired — logger/effect are cordis Context
 *  members, `tools` is the dsh-tools Context augmentation, and the
 *  commands seam rides the dynamic child inject below with its
 *  structural callback parameter. */
declare function apply(ctx: Context, config?: Config): Promise<void>;
//#endregion
export { ADHOC_TOOL_NAMES, BASE_TOOL_NAMES, type BenchVerb, Config, DEFAULT_BENCH, DEFERRED_TOOL_NAMES, EAGER_TOOL_NAMES, type Estate, type EstateRequest, HEADLESS_TOOL_NAMES, MELITE_TOOL_NAMES, apply, comfyManage, harnessEnhance, inject, ledgerTail, makeEstate, makeEstateRequest, matchHarnessRoute, meliteConstruct, meliteDiscover, meliteFlow, meliteLoad, meliteRead, meliteView, name, readRunText, resolveHarnessRoutes, routeName, runStatus, skillIndex, skillRead };