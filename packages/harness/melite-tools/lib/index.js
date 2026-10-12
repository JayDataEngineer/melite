import Schema from '@deepseek-ai/schemastery';
// THE CARD PACKAGES' TOOL FACES (M2′ + the registrar retirement,
// 2026-09-09): a card tool is IMPORTED from its package — the
// DSH law (packages/shell/tool-bash: a tool is its own package;
// hosts compose packages, never fetch registries). The fetch
// registrar (tools/card-tools.ts) died with its last row — every
// card tool composes through its package now.
import { buildMusicTool } from '@melite/audio-music/tool';
import { buildTtsTool } from '@melite/audio-tts/tool';
import { buildImageEditTool } from '@melite/image-image-edit/tool';
import { buildImageGenTool } from '@melite/image-image-gen/tool';
import { buildMotionTool } from '@melite/motion-motion/tool';
import { buildH3TimelineTool } from '@melite/video-h3-timeline/tool';
import { makeEstateRequest, asEstateCall } from "./estate.js";
import { runStatus } from "./tools/run-status.js";
import { meliteFlow } from "./tools/melite-flow.js";
import { comfyManage } from "./tools/comfy-manage.js";
import { meliteDiscover } from "./tools/melite-discover.js";
import { meliteConstruct } from "./tools/melite-construct.js";
import { meliteLoad } from "./tools/melite-load.js";
import { meliteView } from "./tools/melite-view.js";
import { meliteRead } from "./tools/melite-read.js";
import { skillIndex } from "./tools/skill-index.js";
import { skillRead } from "./tools/skill-read.js";
import { ledgerTail } from "./tools/ledger-tail.js";
import { harnessEnhance, resolveHarnessRoutes, matchHarnessRoute, routeName } from "./llm-complete.js";
// Re-exported for the route-preference unit test (drives the BUILT lib
// with a fake seam — no host, no key, seconds-cheap).
export { harnessEnhance, resolveHarnessRoutes, matchHarnessRoute, routeName };
export { makeEstateRequest } from "./estate.js";
// Tool factories — re-exported for the smoke harness (test/smoke.mjs)
// and any embedder that mounts tools without the full plugin apply().
export { runStatus } from "./tools/run-status.js";
export { meliteDiscover } from "./tools/melite-discover.js";
export { meliteConstruct, DEFAULT_BENCH } from "./tools/melite-construct.js";
export { meliteFlow } from "./tools/melite-flow.js";
export { comfyManage } from "./tools/comfy-manage.js";
export { meliteLoad } from "./tools/melite-load.js";
export { meliteView } from "./tools/melite-view.js";
export { meliteRead, readRunText } from "./tools/melite-read.js";
export { skillIndex } from "./tools/skill-index.js";
export { skillRead } from "./tools/skill-read.js";
export { ledgerTail } from "./tools/ledger-tail.js";
/** Cordis plugin name used by loader diagnostics. */
export const name = 'melite-tools';
/**
 * Services this fiber NEEDS: tools + the harness LLM seam (enhance
 * rides ctx.llm). No webServer dependency — headless/SDK mounts boot
 * without one.
 */
// inject law (split 2026-09-10): THIS plugin is the profile-agnostic
// tool plane — it must activate in EVERY composition, including the
// estate/sdk server (no webServer service, see src/doors.ts for why
// the host routes live in their own loader entry). llm is NOT injected
// here: the run doors ride the estate seats, and the enhance seams that do
// need ctx.llm moved to src/doors.ts with the routes.
export const inject = ['tools'];
/** The validator twin of {@link Config} (the loader applies defaults;
 *  direct apply calls resolve undefined as the documented default). */
export const Config = Schema.object({
    headless: Schema.boolean().default(false),
    adhocTools: Schema.union([Schema.string(), Schema.array(Schema.string())]),
    cardTools: Schema.boolean().default(false),
});
/** EAGER — the compose loop, the only melite schemas in a session's
 * first request (progressive disclosure, operator 2026-10-08: three
 * doors in context, the estate's deeper doors expand on first
 * catalog touch — src/expansion.ts owns the law). */
export const EAGER_TOOL_NAMES = [
    'melite_discover', 'melite_load', 'melite_construct',
];
/** DEFERRED — seated by the first discover/load execute. The skill
 * twins carry the melite_ prefix (operator 2026-10-08: they are OUR
 * catalog's doors, not DSH core's skill machinery — the old
 * unprefixed names invited exactly that conflation). */
export const DEFERRED_TOOL_NAMES = [
    'melite_view', 'melite_read', 'comfy_manage', 'melite_skill_index', 'melite_skill_read', 'ledger_tail',
];
/** BASE tool names — both interfaces (discovery, compose, view,
 * management, audit). melite_view is the observe arm (viewing an
 * artifact is not a run press — the interface law holds). */
export const BASE_TOOL_NAMES = [
    ...EAGER_TOOL_NAMES, ...DEFERRED_TOOL_NAMES,
];
/** HEADLESS-only run doors (config headless:true) — the delegated operator. */
export const HEADLESS_TOOL_NAMES = [
    'melite_flow', 'run_status',
];
/** AD HOC names (config adhocTools) — never in a base toolset.
 *  (empty since the disclosure stroke: enhance_prompt died as a tool —
 *  the editor ✦ door below keeps the user surface via harnessEnhance.) */
export const ADHOC_TOOL_NAMES = [];
/** Every tool name this plugin can own (registration log + smoke filter). */
export const MELITE_TOOL_NAMES = [
    ...BASE_TOOL_NAMES, ...HEADLESS_TOOL_NAMES, ...ADHOC_TOOL_NAMES,
];
/** Register the Melite tools against the live estate gateway. */
export async function apply(ctx, config = {}) {
    const c = ctx;
    // THE TRANSPORT (R2b, the remotes migration): the tools call the
    // estate IN-PROCESS — the wire seats for the KV/runs lanes, the
    // door listeners for the rest. No URL, no port, no env pin: this
    // host either mounts the estate bundle or it does not (an alien
    // lane names its own DSH in its own profile).
    const request = makeEstateRequest(ctx);
    // The card tool builders speak the canonical EstateCall (signal
    // optional); the seats demand a signal — the adapter narrows once
    // here instead of at every register site (2026-09-12).
    const call = asEstateCall(request);
    // THE INTERFACE RESOLVE (one explicit step — the profile's
    // cordis.yml row pins every gate; no env seam: V6 cure, 2026-10-18)
    const headless = config.headless === true;
    const adhoc = (Array.isArray(config.adhocTools)
        ? config.adhocTools.map((s) => s.trim()).filter(Boolean)
        : (typeof config.adhocTools === 'string'
            ? config.adhocTools.split(',').map((s) => s.trim()).filter(Boolean)
            : []));
    // THE CARD GATE (default closed — the agent law above)
    const cardTools = config.cardTools === true;
    c.logger.info('melite-tools: %s interface — %d base + %d headless run door(s) + %d ad hoc, gateway %s', headless ? 'HEADLESS' : 'BROWSER', BASE_TOOL_NAMES.length, headless ? HEADLESS_TOOL_NAMES.length : 0, adhoc.length, request);
    // BASE, DEFERRED — THE EXPANSION SEAT (progressive disclosure,
    // operator 2026-10-08 — the Tool Search Tool law over our own
    // toolset). The eager trio's execute arms seat the deferred
    // estate doors (view, model upkeep, the skill twins, the ledger)
    // on the FIRST catalog touch, so a chat that never touches media
    // never pays their tokens. DSH's EpochHeader carries the assembled
    // tool schemas PER REQUEST and appends a `change` snapshot when
    // the set changes — mid-session registration is native; no DSH
    // core surface is touched. The registrar is APPLY-CLOSURE state
    // (V4 cure, 2026-10-18: the module cell was last-wins global — two
    // mounts collided and an unmount nulled the other's seat; each
    // mount now owns its seat and unloads with the fiber).
    const deferredDisposers = [];
    const seated = new Set();
    const expandEstateDoors = () => {
        const doors = [
            ['melite_view', () => c.tools.register(meliteView(ctx))],
            ['melite_read', () => c.tools.register(meliteRead(ctx))],
            ['comfy_manage', () => c.tools.register(comfyManage(request))],
            ['melite_skill_index', () => c.tools.register(skillIndex(request))],
            ['melite_skill_read', () => c.tools.register(skillRead(request))],
            ['ledger_tail', () => c.tools.register(ledgerTail(request))],
        ];
        for (const [name, register] of doors) {
            if (seated.has(name))
                continue;
            const dispose = register();
            seated.add(name);
            deferredDisposers.push(dispose);
        }
        c.logger.info('melite-tools: estate doors SEATED on catalog touch (%d total) — the expansion law', EAGER_TOOL_NAMES.length + seated.size);
    };
    // Registrations outside apply's synchronous scope are NOT
    // auto-tied to the plugin fiber, so the disposers are collected
    // and flushed on unload — plugin lifetime either way. The observe
    // arm stays a door, never a run press; seats probe at call time
    // and refuse loudly on a store-less lane.
    c.effect(() => () => {
        for (const dispose of [...runDoorSeats, ...composeSeats])
            dispose();
        runDoorSeats = [];
        composeSeats = [];
        for (const d of deferredDisposers.splice(0))
            d();
        seated.clear();
    });
    // BASE, EAGER (both interfaces): disclosure + the compose loop.
    // The compose face carries the interface flag (the INTERFACE LAW,
    // 2026-09-13: its model-facing copy names the run door THIS mount
    // owns — the browser hint points at the user's Run press, headless
    // at melite_flow — never a phantom verb). construct + load are
    // seated through the /melite-runs toggle's reseat (the flag they
    // carry flips with the delegation state); discover carries none.
    c.tools.register(meliteDiscover(request, expandEstateDoors));
    let composeSeats = [];
    const seatComposeLoop = (delegated) => {
        for (const dispose of composeSeats.splice(0))
            dispose();
        composeSeats.push(c.tools.register(meliteConstruct(request, { headless: delegated })), c.tools.register(meliteLoad(request, { headless: delegated, expandEstateDoors })));
    };
    seatComposeLoop(headless);
    // HEADLESS SEATS EAGER (transcript-016 audit, operator 2026-09-24:
    // "the tool should be as simple to use as possible"): the headless
    // runner's tool catalog is FIXED AT BOOT — mid-session registrations
    // never reach its function list, so the deferred doors were promised
    // in every eager tool's description yet unreachable, and the maker
    // burned nine catalog hunts plus whole reasoning spirals planning
    // around a comfy_manage it could never call. A maker has a job of
    // known depth (view artifacts, read skills, tail the ledger) — the
    // disclosure tax buys nothing headless. Seat at boot.
    if (headless)
        expandEstateDoors();
    // THE RUN DOORS — runtime-seatable (the /melite-runs toggle,
    // operator 2026-10-13: "a / command that toggles if the AI
    // executes flows or not"). headless mounts boot with them seated
    // (the delegated operator); browser mounts boot with them absent
    // (the interface law: the user presses Run). Both seats are the
    // QUEUE LANE LAW's own registrations — never a bypass, never a
    // hand-assembled graph.
    // (2026-10-01: the withArgCoercion valve that wrapped these two
    // registrations is DELETED — it rewrote args AFTER the session log
    // wrote them, breaking Model-visible⟺logged. The late-arrival
    // semantics live where the log can see them: run_status's execute
    // Numbers wait_s itself, melite_flow's wireBool reads test, and a
    // string 'true' on bench never reaches execute — the dsh-tools
    // gate's ToolArgsError refuses it before the body runs (the
    // handroll audit's ranked item 1; verifier-corrected 2026-10-01:
    // the modes===0 arm returns a soft error object, it is not this
    // refusal.)
    let runDoorSeats = [];
    const seatRunDoors = () => {
        if (runDoorSeats.length > 0)
            return;
        runDoorSeats.push(c.tools.register(meliteFlow(request)), c.tools.register(runStatus(request)));
    };
    const unseatRunDoors = () => {
        for (const dispose of runDoorSeats.splice(0))
            dispose();
    };
    if (headless)
        seatRunDoors();
    // The /melite-runs COMMAND — the user-side toggle for the same
    // delegation. on/off/settle verbs: 'on' seats the run doors and
    // flips the compose loop's model-facing copy to name melite_flow;
    // 'off' reverses both (the user's Run press owns runs again); no
    // argument reports the state. Mid-session seats reach the next
    // model request (a boot-fixed catalog — the transcript-016 note —
    // sees them at its next session), and the command's result says
    // so plainly. Registered only where a commands registry is
    // composed (browser lanes); its absence on headless one-shots is
    // the designed skip, not a degraded mount.
    c.inject(['commands'], ({ commands }) => {
        commands.register({
            name: 'melite-runs',
            description: 'Toggle whether the AI can start runs (melite_flow) or runs wait for the user\u2019s Run press',
            input: { hint: '[on|off]' },
            handler: ({ rawInput }) => {
                const verb = rawInput.trim().toLowerCase();
                if (verb !== '' && verb !== 'on' && verb !== 'off' && verb !== 'toggle') {
                    return { kind: 'error', text: `unknown argument "${rawInput.trim()}" (use on, off, or no argument to read the state)` };
                }
                const delegated = verb === '' ? runDoorSeats.length > 0 : verb === 'toggle' ? runDoorSeats.length === 0 : verb === 'on';
                if (delegated) {
                    seatRunDoors();
                    seatComposeLoop(true);
                }
                else {
                    unseatRunDoors();
                    seatComposeLoop(false);
                }
                c.logger.info('melite-tools: /melite-runs %s — AI run doors %s', verb || '(read)', delegated ? 'SEATED' : 'UNSEATED');
                return {
                    kind: 'success',
                    text: delegated
                        ? 'AI runs ON — melite_flow + run_status seated; the next model request sees them (a boot-fixed catalog sees them next session).'
                        : 'AI runs OFF — runs start at the user\u2019s Run press again.',
                };
            },
        });
    });
    // (2026-09-12: the readDefaultLlm copy that lived here is deleted —
    // zero callers since the enhance seams needing ctx.llm moved to
    // src/doors.ts with the routes; doors.ts carries the live copy.)
    // THE CARD PACKAGE TOOL FACES — direct composition, one builder per
    // card package (the same Config.gateway spelling every tool face
    // takes). No fetch, no allowlist: ownership is the import graph.
    // Ledger row 31 (2026-09-10): DUAL-REGISTRATION resolved — the
    // card packages keep their own guarded self-registration for
    // compositions that mount them directly (gateway lane); this
    // composition is the single owner in the harness lane. A
    // mis-composition mounting both throws LOUD at the tools
    // service's duplicate refusal — the designed guard, not a bug to
    // paper over. clothing-placement retired 2026-09-16 (stroke 86,
    // operator order — its surface moved to craft-loop + mcp:blender
    // with the vision critic); the "one tool
    // per card manifest" promise now holds for every card package
    // with a tool face.
    //
    // Ledger row 33 (2026-09-10): VERSION SKEW CURED — every
    // dsh-tools consumer pins 0.1.5-alpha.2 (latest), so the
    // ToolRunContext types resolve to one copy and the casts are
    // gone. If a future pin drifts again, tsc fails HERE (not
    // silently downstream) — re-pin, never re-cast.
    // THE CARD GATE: registered ONLY on maker faces that opted in.
    // The agent lane (default) composes through melite_construct —
    // runs start at the user's Run press; a direct engine call from
    // a chat agent bypasses the bench, the queue and every marriage.
    if (cardTools) {
        // Registrations are effects (primer: "keep the related work in
        // one effect so disposal unwinds in the intended sequence") —
        // the gate's disposers unwind as one block on unload.
        c.effect(() => {
            const stop = [
                c.tools.register(buildMusicTool(call)),
                c.tools.register(buildTtsTool(call)),
                c.tools.register(buildImageEditTool(call)),
                c.tools.register(buildImageGenTool(call)),
                c.tools.register(buildMotionTool(call)),
                c.tools.register(buildH3TimelineTool(call)),
            ];
            return () => {
                for (const dispose of stop)
                    dispose();
            };
        }, 'melite-tools: card tool gate');
    }
    else {
        c.logger.info('melite-tools: card tool faces GATED OFF (cardTools=false) — the agent law: discover/load/compose only');
    }
}
//# sourceMappingURL=index.js.map