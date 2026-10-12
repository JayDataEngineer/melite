/**
 * `@melite/harness-tools` — the estate's DSH tool surface.
 *
 * TWO INTERFACES, ONE PLUGIN (the interface law):
 *
 *   BROWSER (default — no env): compose-only. The agent discovers,
 *   loads lanes, reads skills, authors cards on the bench
 *   (melite_construct) and NEVER executes — the run door is the
 *   USER's Run press on the card. This keeps the old contract
 *   (agent/prompts/BASE_PROMPT.md): "It composes; it never
 *   executes."
 *
 *   HEADLESS (config headless:true — the one-shot/agent mounts): the
 *   DELEGATED OPERATOR. Same queue, same doors, plus the ONE
 *   execution verb melite_flow (a card or a flow tool call — single,
 *   template, or stages drafted on the fly), with run_status as the
 *   monitor. Both ride the queue's registration door — never a
 *   bypass, never a hand-assembled graph (QUEUE LANE LAW).
 *
 * AD HOC TOOLS (config adhocTools): registered ONLY when a session
 * names them. (Empty since the disclosure stroke: enhance_prompt
 * died as a tool — the editor ✦ door below keeps the user surface
 * via harnessEnhance.)
 *
 * BASE toolset (both interfaces): melite_discover, melite_construct,
 * melite_load, melite_view, comfy_manage, melite_skill_index, melite_skill_read,
 * ledger_tail (+ melite_flow + run_status headless).
 * Card tools compose from their card packages (named imports above
 * — the fetch registrar retired with its last row).
 *
 * @module @melite/harness-tools
 */
import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import { harnessEnhance, resolveHarnessRoutes, matchHarnessRoute, routeName } from './llm-complete.ts';
export { harnessEnhance, resolveHarnessRoutes, matchHarnessRoute, routeName };
export { makeEstateRequest } from './estate.ts';
export type { EstateRequest } from './estate.ts';
export { runStatus } from './tools/run-status.ts';
export { meliteDiscover } from './tools/melite-discover.ts';
export { meliteConstruct, DEFAULT_BENCH } from './tools/melite-construct.ts';
export { meliteFlow } from './tools/melite-flow.ts';
export { comfyManage } from './tools/comfy-manage.ts';
export { meliteLoad } from './tools/melite-load.ts';
export { meliteView } from './tools/melite-view.ts';
export { meliteRead, readRunText } from './tools/melite-read.ts';
export { skillIndex } from './tools/skill-index.ts';
export { skillRead } from './tools/skill-read.ts';
export { ledgerTail } from './tools/ledger-tail.ts';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "melite-tools";
/**
 * Services this fiber NEEDS: tools + the harness LLM seam (enhance
 * rides ctx.llm). No webServer dependency — headless/SDK mounts boot
 * without one.
 */
export declare const inject: string[];
/**
 * Plugin config — a Schemastery schema (V6 cure, 2026-10-18: the
 * zod-free raw pass hid interface selection from cordis.yml; the
 * loader now validates before apply, and the profile pins every
 * gate — cordis-tutorial/05-config.md, "bad config fails the load
 * with a precise error").
 */
export interface Config {
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
export declare const Config: Schema<Config>;
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
/** HEADLESS-only run doors (config headless:true) — the delegated operator. */
export declare const HEADLESS_TOOL_NAMES: readonly ["melite_flow", "run_status"];
/** AD HOC names (config adhocTools) — never in a base toolset.
 *  (empty since the disclosure stroke: enhance_prompt died as a tool —
 *  the editor ✦ door below keeps the user surface via harnessEnhance.) */
export declare const ADHOC_TOOL_NAMES: readonly [];
/** Every tool name this plugin can own (registration log + smoke filter). */
export declare const MELITE_TOOL_NAMES: readonly ["melite_discover", "melite_load", "melite_construct", "melite_view", "melite_read", "comfy_manage", "melite_skill_index", "melite_skill_read", "ledger_tail", "melite_flow", "run_status"];
/** Register the Melite tools against the live estate gateway. */
export declare function apply(ctx: Context, config?: Config): Promise<void>;
//# sourceMappingURL=index.d.ts.map