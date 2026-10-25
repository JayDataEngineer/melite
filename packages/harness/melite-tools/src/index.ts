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
 * melite_load, melite_view, comfy_manage, melite_skill_read,
 * ledger_tail (+ melite_flow + run_status headless).
 * Card tools compose from their card packages (named imports above
 * — the fetch registrar retired with its last row).
 *
 * @module @melite/harness-tools
 */
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
// THE CARD PACKAGES' TOOL FACES (M2′ + the registrar retirement,
// 2026-09-09): a card tool is IMPORTED from its package — the
// DSH law (packages/shell/tool-bash: a tool is its own package;
// hosts compose packages, never fetch registries). The fetch
// registrar (tools/card-tools.ts) died with its last row — every
// card tool composes through its package now.
import { buildMusicTool } from '@melite/audio-music/tool'
import { buildTtsTool } from '@melite/audio-tts/tool'
import { buildImageEditTool } from '@melite/image-image-edit/tool'
import { buildImageGenTool } from '@melite/image-image-gen/tool'
import { buildMotionTool } from '@melite/motion-motion/tool'
import { buildH3TimelineTool } from '@melite/video-h3-timeline/tool'
import { makeEstate, makeEstateRequest, asEstateCall } from './estate.ts'
import { readRunsDelegation, writeRunsDelegation, resolveDelegationAtBoot } from './runsDelegation.ts'
import { runStatus } from './tools/run-status.ts'
import { meliteFlow } from './tools/melite-flow.ts'
import { comfyManage } from './tools/comfy-manage.ts'
import { meliteDiscover } from './tools/melite-discover.ts'
import { meliteConstruct } from './tools/melite-construct.ts'
import { meliteLoad } from './tools/melite-load.ts'
import { meliteView } from './tools/melite-view.ts'
import { meliteRead } from './tools/melite-read.ts'
import { skillRead } from './tools/skill-read.ts'
import { ledgerTail } from './tools/ledger-tail.ts'
import type { ToolDefinition } from './types.ts'
import { harnessEnhance, resolveHarnessRoutes, matchHarnessRoute, routeName } from './llm-complete.ts'

// Re-exported for the route-preference unit test (drives the BUILT lib
// with a fake seam — no host, no key, seconds-cheap).
export { harnessEnhance, resolveHarnessRoutes, matchHarnessRoute, routeName }

export { makeEstate, makeEstateRequest } from './estate.ts'
// THE STALENESS SIGNAL'S PUBLIC SEAT (HMR audit 009 F2): the
// boot-facts arm is the /v1 door's answer AND the wall's import —
// one export, both planes.
export { bootFactsArm } from './discovery.ts'
export type { EstateRequest, Estate, BenchVerb } from './estate.ts'

// Tool factories — re-exported for the smoke harness (test/smoke.mjs)
// and any embedder that mounts tools without the full plugin apply().
export { runStatus } from './tools/run-status.ts'
export { meliteDiscover } from './tools/melite-discover.ts'
export { meliteConstruct, DEFAULT_BENCH } from './tools/melite-construct.ts'
export { meliteFlow } from './tools/melite-flow.ts'
export { comfyManage } from './tools/comfy-manage.ts'
export { meliteLoad } from './tools/melite-load.ts'
export { meliteView } from './tools/melite-view.ts'
export { meliteRead, readRunText } from './tools/melite-read.ts'
export { skillRead } from './tools/skill-read.ts'
export { ledgerTail } from './tools/ledger-tail.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'melite-tools'

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
export const inject = ['tools']

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
  headless?: boolean
  /** AD HOC tool names, never in a base toolset ('enhance_prompt').
   *  Accepts a single string or a list. */
  adhocTools?: string | string[]
  /** CARD TOOL FACES (music/tts/image_edit/image_gen/motion/
   *  h3_timeline): DEFAULT FALSE — the operator's card-abstraction
   *  law (2026-09-21): an agent lane's toolset is discover/load/
   *  construct only; the engine faces never sit in the agent's
   *  toolset at turn one ("make a video" reached straight for
   *  h3_timeline before any discovery — the whole krea-2-turbo
   *  failure mode one lane over). Maker/studio faces (the web
   *  profile) opt in explicitly. */
  cardTools?: boolean
}

/** The validator twin of {@link Config} (the loader applies defaults;
 *  direct apply calls resolve undefined as the documented default). */
export const Config: Schema<Config> = Schema.object({
  headless: Schema.boolean().default(false),
  adhocTools: Schema.union([Schema.string(), Schema.array(Schema.string())]),
  cardTools: Schema.boolean().default(false),
})

/** EAGER — the compose loop, the only melite schemas in a session's
 * first request (progressive disclosure, operator 2026-10-08: three
 * doors in context, the estate's deeper doors expand on first
 * catalog touch — the deferred-seat closure in THIS file
 * owns the law). */
export const EAGER_TOOL_NAMES = [
  'melite_discover', 'melite_load', 'melite_construct',
] as const

/** DEFERRED — seated by the first discover/load execute. The skill
 * twins carry the melite_ prefix (operator 2026-10-08: they are OUR
 * catalog's doors, not DSH core's skill machinery — the old
 * unprefixed names invited exactly that conflation). */
export const DEFERRED_TOOL_NAMES = [
  'melite_view', 'melite_read', 'comfy_manage', 'melite_skill_read', 'ledger_tail',
] as const

/** BASE tool names — both interfaces (discovery, compose, view,
 * management, audit). melite_view is the observe arm (viewing an
 * artifact is not a run press — the interface law holds). */
export const BASE_TOOL_NAMES = [
  ...EAGER_TOOL_NAMES, ...DEFERRED_TOOL_NAMES,
] as const

/** HEADLESS-only run doors (config headless:true) — the delegated operator. */
export const HEADLESS_TOOL_NAMES = [
  'melite_flow', 'run_status',
] as const

/** AD HOC names (config adhocTools) — never in a base toolset.
 *  (empty since the disclosure stroke: enhance_prompt died as a tool —
 *  the editor ✦ door below keeps the user surface via harnessEnhance.) */
export const ADHOC_TOOL_NAMES = [] as const

/** Every tool name this plugin can own (registration log + smoke filter). */
export const MELITE_TOOL_NAMES = [
  ...BASE_TOOL_NAMES, ...HEADLESS_TOOL_NAMES, ...ADHOC_TOOL_NAMES,
] as const

/** Register the Melite tools against the live estate gateway.
 *  THE TYPED CONTEXT (F-2/F-4 cure, 2026-11-05): the hand-declared
 *  CtxView parallel is retired — logger/effect are cordis Context
 *  members, `tools` is the dsh-tools Context augmentation, and the
 *  commands seam rides the dynamic child inject below with its
 *  structural callback parameter. */
export async function apply(ctx: Context, config: Config = {}): Promise<void> {
  const c = ctx
  // THE TRANSPORT (R2b, the remotes migration): the tools call the
  // estate IN-PROCESS — the wire seats for the KV/runs lanes, the
  // door listeners for the rest. No URL, no port, no env pin: this
  // host either mounts the estate bundle or it does not (an alien
  // lane names its own DSH in its own profile).
  // F-1 (2026-11-05): the tool plane rides the TYPED estate lanes —
  // one named method per lane, the seats called 1:1 beneath (never
  // URL strings). makeEstateRequest stays the /v1 browser face's own
  // seam in doors.ts, where the URL grammar is doc-blessed.
  const estate = makeEstate(ctx)
  // The card tool builders speak the canonical EstateCall (signal
  // optional); the seats demand a signal — the adapter narrows once
  // here instead of at every register site (2026-09-12).
  const call = asEstateCall(makeEstateRequest(ctx))

  // THE INTERFACE RESOLVE (one explicit step — the profile's
  // cordis.yml row pins every gate; no env seam: V6 cure, 2026-10-18)
  const headless = config.headless === true
  // THE PERSISTED DELEGATION (session 90a0b920 burn, 2026-11-05:
  // "the melite_runs auto mode turned off... after I had it on") —
  // the toggle's state was memory-only, so a lane reload rebooted
  // browser lanes UNSEATED and the transcript shows the theft
  // (melite_flow answered 11:35, "unknown tool melite_flow" 11:39,
  // no /melite-runs off between). The boot now reads the operator's
  // last toggle; every toggle writes it back.
  const bootDelegated = resolveDelegationAtBoot(headless, readRunsDelegation(c.logger))
  const adhoc = (Array.isArray(config.adhocTools)
    ? config.adhocTools.map((s: string) => s.trim()).filter(Boolean)
    : (typeof config.adhocTools === 'string'
      ? config.adhocTools.split(',').map((s: string) => s.trim()).filter(Boolean)
      : []))
  // THE CARD GATE (default closed — the agent law above)
  const cardTools = config.cardTools === true

  c.logger.info(
    'melite-tools: %s interface — %d base + %d headless run door(s) + %d ad hoc, gateway %s',
    headless ? 'HEADLESS' : 'BROWSER', BASE_TOOL_NAMES.length,
    headless ? HEADLESS_TOOL_NAMES.length : 0, adhoc.length, 'typed estate lanes (F-1)',
  )

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
  const deferredDisposers: Array<() => void> = []
  const seated = new Set<string>()
  const expandEstateDoors = (): void => {
    const doors: Array<[string, () => () => void]> = [
      ['melite_view', () => c.tools.register(meliteView(ctx))],
      ['melite_read', () => c.tools.register(meliteRead(ctx))],
      ['comfy_manage', () => c.tools.register(comfyManage(estate))],
      ['melite_skill_read', () => c.tools.register(skillRead(estate))],
      ['ledger_tail', () => c.tools.register(ledgerTail(estate))],
    ]
    for (const [name, register] of doors) {
      if (seated.has(name)) continue
      const dispose = register()
      seated.add(name)
      deferredDisposers.push(dispose)
    }
    c.logger.info(
      'melite-tools: estate doors SEATED on catalog touch (%d total) — the expansion law',
      EAGER_TOOL_NAMES.length + seated.size,
    )
  }
  // Registrations outside apply's synchronous scope are NOT
  // auto-tied to the plugin fiber, so the disposers are collected
  // and flushed on unload — plugin lifetime either way. The observe
  // arm stays a door, never a run press; seats probe at call time
  // and refuse loudly on a store-less lane.
  c.effect(() => () => {
    for (const dispose of [...runDoorSeats, ...composeSeats]) dispose()
    runDoorSeats = []
    composeSeats = []
    for (const d of deferredDisposers.splice(0)) d()
    seated.clear()
  })

  // BASE, EAGER (both interfaces): disclosure + the compose loop.
  // The compose face carries the interface flag (the INTERFACE LAW,
  // 2026-09-13: its model-facing copy names the run door THIS mount
  // owns — the browser hint points at the user's Run press, headless
  // at melite_flow — never a phantom verb). construct + load are
  // seated through the /melite-runs toggle's reseat (the flag they
  // carry flips with the delegation state); discover carries none.
  c.tools.register(meliteDiscover(estate, expandEstateDoors))
  let composeSeats: Array<() => void> = []
  const seatComposeLoop = (delegated: boolean): void => {
    for (const dispose of composeSeats.splice(0)) dispose()
    composeSeats.push(
      c.tools.register(meliteConstruct(estate, { headless: delegated })),
      c.tools.register(meliteLoad(estate, { headless: delegated, expandEstateDoors })),
    )
  }
  seatComposeLoop(bootDelegated)

  // HEADLESS SEATS EAGER (transcript-016 audit, operator 2026-09-24:
  // "the tool should be as simple to use as possible"): the headless
  // runner's tool catalog is FIXED AT BOOT — mid-session registrations
  // never reach its function list, so the deferred doors were promised
  // in every eager tool's description yet unreachable, and the maker
  // burned nine catalog hunts plus whole reasoning spirals planning
  // around a comfy_manage it could never call. A maker has a job of
  // known depth (view artifacts, read skills, tail the ledger) — the
  // disclosure tax buys nothing headless. Seat at boot.
  if (headless) expandEstateDoors()
  // THE SEAT PIN (session 90a0b920's flap class, L336-377): a
  // delegated browser lane that reloads booted with the deferred
  // doors ABSENT until some catalog touch re-seated them — the
  // agent's first post-reload estate call met 'unknown tool
  // "comfy_manage"' and burned the session on a hunt. Delegation ON
  // means the agent RUNS the estate: its surface is needed from the
  // first call, so the doors pin at boot. The off-lane keeps the
  // progressive-disclosure law (operator 2026-10-08) — seats there
  // still arrive on first catalog touch.
  else if (bootDelegated) expandEstateDoors()

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
  let runDoorSeats: Array<() => void> = []
  const seatRunDoors = (): void => {
    if (runDoorSeats.length > 0) return
    runDoorSeats.push(c.tools.register(meliteFlow(estate)), c.tools.register(runStatus(estate)))
  }
  const unseatRunDoors = (): void => {
    for (const dispose of runDoorSeats.splice(0)) dispose()
  }
  if (bootDelegated) seatRunDoors()

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
  c.inject(['commands'], (child) => {
    // THE ONE COMMANDS READ (F-4's "where the typed inject is free"
    // boundary): dsh-commands' Context augmentation is not in this
    // package's dependency graph — its types ride the HOST — so the
    // child context's commands member is read through the named
    // face below, once, at this boundary. Narrower than the retired
    // CtxView: no unknown round-trip, one member, one use.
    interface CommandsRegistry { register(definition: unknown): () => void }
    const commands = (child as Partial<Record<'commands', CommandsRegistry>>).commands
    if (commands === undefined) {
      throw new Error('melite-runs: the commands inject resolved but exposes no registry — refusing to register silently')
    }
    commands.register({
      name: 'melite-runs',
      description: 'Toggle whether the AI can start runs (melite_flow) or runs wait for the user\u2019s Run press',
      input: { hint: '[on|off]' },
      handler: ({ rawInput }: { rawInput: string }): { kind: 'success' | 'error'; text: string } => {
        const verb = rawInput.trim().toLowerCase()
        if (verb !== '' && verb !== 'on' && verb !== 'off' && verb !== 'toggle') {
          return { kind: 'error', text: `unknown argument "${rawInput.trim()}" (use on, off, or no argument to read the state)` }
        }
        const delegated = verb === '' ? runDoorSeats.length > 0 : verb === 'toggle' ? runDoorSeats.length === 0 : verb === 'on'
        if (delegated) {
          seatRunDoors()
          seatComposeLoop(true)
          // the pin's mid-session face: delegation ON seats the whole
          // estate surface, not just the run doors (the flap cure —
          // seats never depend on a catalog touch again)
          expandEstateDoors()
        } else {
          unseatRunDoors()
          seatComposeLoop(false)
        }
        // THE PERSISTED FLIP (session 90a0b920 burn, 2026-11-05):
        // every toggle writes the record the next boot reads — a
        // reload can no longer steal the operator's choice. A failed
        // write is said in the success voice, never silent.
        const writeFailure = writeRunsDelegation({ delegated })
        c.logger.info('melite-tools: /melite-runs %s — AI run doors %s%s', verb || '(read)', delegated ? 'SEATED' : 'UNSEATED', writeFailure === undefined ? ' (recorded)' : ' (WRITE FAILED: ' + writeFailure + ')')
        return {
          kind: 'success',
          text: delegated
            ? 'AI runs ON — melite_flow + run_status + the estate doors (melite_view, melite_read, comfy_manage, skills, ledger) seated; the next model request sees them (a boot-fixed catalog sees them next session).'
              + (writeFailure === undefined ? ' Recorded — the delegation survives lane reloads.' : ' WARNING: recording failed (' + writeFailure + ') — a reload reverts to OFF.')
            : 'AI runs OFF — runs start at the user\u2019s Run press again.'
              + (writeFailure === undefined ? ' Recorded.' : ' WARNING: recording failed (' + writeFailure + ') — a reload reverts to ON.'),
        }
      },
    })
  })

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
      ]
      return () => {
        for (const dispose of stop) dispose()
      }
    }, 'melite-tools: card tool gate')
  } else {
    c.logger.info(
      'melite-tools: card tool faces GATED OFF (cardTools=false) — the agent law: discover/load/compose only',
    )
  }

}
