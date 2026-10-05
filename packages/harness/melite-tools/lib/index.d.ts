import type { Context } from '@deepseek-ai/cordis';
import { harnessEnhance, resolveHarnessRoutes, matchHarnessRoute, routeName } from './llm-complete.js';
export { harnessEnhance, resolveHarnessRoutes, matchHarnessRoute, routeName };
export { makeEstateRequest } from './estate.js';
export type { EstateRequest } from './estate.js';
export { runStatus } from './tools/run-status.js';
export { meliteDiscover } from './tools/melite-discover.js';
export { meliteConstruct, DEFAULT_BENCH } from './tools/melite-construct.js';
export { meliteFlow } from './tools/melite-flow.js';
export { comfyManage } from './tools/comfy-manage.js';
export { meliteLoad } from './tools/melite-load.js';
export { meliteView } from './tools/melite-view.js';
export { meliteRead, readRunText } from './tools/melite-read.js';
export { skillIndex } from './tools/skill-index.js';
export { skillRead } from './tools/skill-read.js';
export { ledgerTail } from './tools/ledger-tail.js';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "melite-tools";
/**
 * Services this fiber NEEDS: tools + the harness LLM seam (enhance
 * rides ctx.llm). No webServer dependency — headless/SDK mounts boot
 * without one.
 */
export declare const inject: string[];
/**
 * Plugin config — defaults filled in apply (zod-free, loader passes raw).
 * Interface selection is config-first (profile-pinned, declarative) with
 * env override for one-shot mounts: MELITE_HEADLESS=1 and MELITE_ADHOC=…
 * force the same gates without touching a profile.
 */
export interface Config {
    /** HEADLESS interface: register the run doors (melite_flow,
     *  run_status) — the delegated operator. Default false (browser law:
     *  the model composes, the USER presses Run). */
    headless?: boolean;
    /** AD HOC tool names, never in a base toolset ('enhance_prompt').
     *  Accepts a single string or a list. */
    adhocTools?: string | string[];
    /** CARD TOOL FACES (music/tts/image_edit/motion/h3_timeline):
     *  DEFAULT FALSE — the operator's card-abstraction law
     *  (2026-09-21): an agent lane's toolset is discover/load/
     *  construct only; the engine faces never sit in the agent's
     *  toolset at turn one ("make a video" reached straight for
     *  h3_timeline before any discovery — the whole krea-2-turbo
     *  failure mode one lane over). Maker/studio faces (the web
     *  profile) opt in explicitly. Env: MELITE_CARD_TOOLS=1. */
    cardTools?: boolean;
}
/** EAGER — the compose loop, the only melite schemas in a session's
 * first request (progressive disclosure, operator 2026-10-08: three
 * doors in context, the estate's deeper doors expand on first
 * catalog touch — src/expansion.ts owns the law). */
export declare const EAGER_TOOL_NAMES: readonly ["melite_discover", "melite_load", "melite_construct"];
/** DEFERRED — seated by the first discover/load execute. The skill
 * twins carry the melite_ prefix (operator 2026-10-08: they are OUR
 * catalog's doors, not DSH core's skill machinery — the old
 * unprefixed names invited exactly that conflation). */
export declare const DEFERRED_TOOL_NAMES: readonly ["melite_view", "melite_read", "comfy_manage", "melite_skill_index", "melite_skill_read", "ledger_tail"];
/** BASE tool names — both interfaces (discovery, compose, view,
 * management, audit). melite_view is the observe arm (viewing an
 * artifact is not a run press — the interface law holds). */
export declare const BASE_TOOL_NAMES: readonly ["melite_discover", "melite_load", "melite_construct", "melite_view", "melite_read", "comfy_manage", "melite_skill_index", "melite_skill_read", "ledger_tail"];
/** HEADLESS-only run doors (MELITE_HEADLESS=1) — the delegated operator. */
export declare const HEADLESS_TOOL_NAMES: readonly ["melite_flow", "run_status"];
/** AD HOC names (MELITE_ADHOC) — never in a base toolset.
 *  (empty since the disclosure stroke: enhance_prompt died as a tool —
 *  the editor ✦ door below keeps the user surface via harnessEnhance.) */
export declare const ADHOC_TOOL_NAMES: readonly [];
/** Every tool name this plugin can own (registration log + smoke filter). */
export declare const MELITE_TOOL_NAMES: readonly ["melite_discover", "melite_load", "melite_construct", "melite_view", "melite_read", "comfy_manage", "melite_skill_index", "melite_skill_read", "ledger_tail", "melite_flow", "run_status"];
/** Register the Melite tools against the live estate gateway. */
export declare function apply(ctx: Context, config?: Config): Promise<void>;
//# sourceMappingURL=index.d.ts.map
