// index.ts — the estate bundle's host row.
//
// DSH is the only web app. This row mounts the estate's engine tier
// INTO the DSH host as child plugins — the loader's own composition
// mechanism (ctx.plugin).
//
// THE GATEWAY KILL (2026-09-10): the gateway is dead (operator
// order — the gateway package as an app made 1:1 DSH impossible).
// Every gateway row this bundle used to mount (error service, all
// doors, queue rows, the wire remotes, the lane root) is GONE with
// it. What remains is the engine tier the rebuild rides on; the
// domain remotes land here as they are rebuilt DSH-native.
//
//
// Erasable-syntax TS only: no enums, `import type` for types, bare
// package specifiers only.
import Schema from "@deepseek-ai/schemastery";
// The families provider (service + every family plugin, stroke 4):
// the runs doors' compose-at-expansion reads ctx.get("models"), so
// the seat must carry the booted table — a bare service mount
// registers zero families and every family stage refuses
// "registered: none" (the 3088 commission's catch, 2026-10-10).
import { modelsCensusGate, modelsProvider } from "@melite/comfyui-cordis/catalog-registry";
import { whenModelsArmed } from "@melite/comfyui-cordis/models-service";
// The subprocess seat's provider (the row below rides it — see the
// rows comment).
import LocalSubprocessRuntime from "@deepseek-ai/dsh-subprocess-local";
import comfyuiHost from "@melite/comfyui-cordis/comfyui-host";
// The wiring doc service: engine state the compose, run, and
// adapter seats share. Mounted BEFORE the host and the engines
// adapter so every submit reads the same census from first arm.
import comfyuiWiring from "@melite/comfyui-cordis/comfyui-wiring";
// The engine-generics seam (stroke 53): the 'engines' seat first
// (one registry every engine provider registers into), then the
// ComfyUI adapter (engine id 'comfyui' — merged-submit law inside;
// the runs lane resolves through the seat). MCP engines register
// as 'mcp:<server>' rows next.
import enginesContract from "@melite/engine-contract";
import comfyuiEngine from "@melite/comfyui-cordis/comfyui-engine";
// Stroke 54: the MCP lane. The engine provider (mcp:<server>
// executors riding the tools runtime) — the RUNS-plane half, gated
// by MELITE_MCP_ENGINES (audit 008 M10: no production flow declares
// an mcp: stage; the seat announces its OFF state and mounts
// nothing).
// THE BLENDER SEAT LEFT THIS ROW (operator ruling 2026-10-04,
// audit 008 M12/M14): melite seats no MCP server of its own. The
// dsh-mcp-client row and the vendored melite-blender-proxy-nodes
// pack are gone — a Blender/Unity bench is a DSH PROFILE concern
// (dsh-provision: melite-foundry / game / mega-blender / mega-unity),
// and the pack's four nodes were composed by zero graphs. An mcp:
// stage resolves its mcp__<server>__* tools from the host harness
// that seats them.
import { mcpEngines } from "@melite/engine-mcp";
// Stroke 55: the craft loop engine — the critic route resolves at
// boot (first image-capable route; a blind lane seats no craft).
import { craftEngineAutoRoute } from "@melite/engine-craft";
// Stroke 62: the agent engine — the spawner loop. The brain route
// is NAMED (MELITE_AGENT_ROUTE "provider/model", explicit >
// implicit — the critic route's law); skills spawn-inject through
// findSkill over the disclosure root (the same leaves melite_load
// serves — one storage, a new serving path).
import { agentEngine } from "@melite/engine-agent";
import { findSkill, disclosureRoot, resolveStateRoot } from "@melite/estate-queue";
import { join } from "node:path";
import { homedir } from "node:os";
import { readFile } from "node:fs/promises";
// The drafts service only — the storage PROVIDERS (hub, json
// backend, domain form) belong to the composition site: dsh-base
// mounts them in profiles (bundle/base/cordis.patch.yml's
// storage/storage-json/storage-domain rows — "it belongs to the
// shared base"), the boot rigs mount them in tests. A consumer
// row never re-provides a base-owned seat
// (storage-domain/README.md: consumers "never touch a backend").
import draftsPlugin from "@melite/estate-drafts";
import queuePlugin, { cardRegistryProvider, discloseProvider, manageProvider, runsRegistryPlugin, skillProvider, loadProvider, } from "@melite/estate-queue";
import { manageRemotePlugin } from "@melite/estate-manage";
import { runsRemotePlugin } from "@melite/estate-runs";
// The runs media route (the /v1/assets face's DSH-native
// replacement): run artifacts served same-origin from the queue
// seat's own runs tree.
import mediaPlugin from "@melite/estate-media";
// The models provisions route (the /v1/models face's DSH-native
// replacement): family DECL provision files served same-origin
// from the booted models table + the weights mount — no remotes,
// no proxies (the 2026-09-12 motion-skin 502).
import modelsPlugin from "@melite/estate-models";
import provisioningComposition from "./provisioning.js";
// THE GUTTED-LANE GATE (2026-10-05: dsh-melite-test served :3088 with
// every @melite* bundle skipped — warning-only): the lane-side refusal.
// Runs first in apply, before any row mounts.
import { checkBundleGate } from "./bundle-gate.js";
/** The estate composition: the engine tier, the drafts service,
 *  the serial run queue, and the runs plane (REBUILD-5/9). A
 *  CONSUMER row, never a provider: the storage stack (hub +
 *  backend + the domain form) belongs to the composition site —
 *  dsh-base owns it in profiles (dshHomePath storages); wall and
 *  probe boots mount it themselves. The queue and drafts rows
 *  both ride the composition's resolved state root (J12:
 *  config.stateRoot / repoRoot, never an env seam). */
// (2026-09-21, the operator's boundary — paraphrased: STOP MODIFYING THE
// DEFAULT DSH SKILL SYSTEM. WHEN I TELL YOU TO REACH PAST TOOLS,
// AND INJECT INTO DSH SKILLS? WHEN?" — never.) The melite surface is
// TOOLS ONLY: melite_discover / melite_load / melite_skill_read over the
// estate's own /v1/skills door. DSH core's skill seat — its session
// catalog, its system-reminders, its providers — is NOT ours to
// touch. The selection-catalog provider that once lived here (the
// registerProvider injection, the invalidate wire, the 1.5s bench
// poll, the trace) is deleted; its "catalog follows the bench"
// behavior belonged to a seat we were never given.
// THE BLENDER STDIO ROW IS GONE (operator ruling 2026-10-04, audit
// 008 M12): melite seats no MCP client of its own. What it removed —
// the vendored melite-blender-proxy-nodes mcp_server.py (four tools,
// a strict subset of the 72-tool bench dsh-provision seats on the
// game preset), its MELITE_ESTATE_BLENDER/Config.blenderPath knob,
// and the pack's four never-composed nodes. Blender and Unity are
// DSH-profile concerns (dsh-provision profile-web/presets.txt:
// melite-foundry, game, studio-team, mega-blender, mega-unity).
const rows = [
    // The subprocess seat first: the DSH local provider (managed
    // ranges, scrubbed child env, bounded collected output). The git
    // runner of the provisions path rides it — the Layer C installer
    // is ours, so its child processes go through the harness
    // primitive, never an owned execFile wrapper (handroll audit row
    // 4.6).
    // STAND-DOWN WRAPPER (2026-10-23, the double-registration wedge):
    // the host profile's own spawn rows (ralph / workflow-ptc with
    // provider: spawn) register the SAME LocalSubprocessRuntime
    // service before the estate mounts, and cordis buries the estate
    // row's registration throw while the boot marches on — a fiber
    // left FAILED on every boot, invisible until a registry walk
    // printed it. The estate CONSUMES the seat; it must not demand to
    // be its only provider: when the seat already exists this row
    // says so loud and mounts nothing.
    {
        name: "estate-subprocess-row",
        apply: (ctx) => {
            if (ctx.get("subprocess", false) !== undefined) {
                console.log("[melite-estate] subprocess seat already registered by the host profile — the estate's own provider row stands down");
                return;
            }
            ctx.plugin(LocalSubprocessRuntime);
        },
    },
    // The engines seat BEFORE every adapter + consumer (mount order
    // is load order — the adapters' inject gates on it).
    enginesContract,
    // ...and the same server on the RUNS plane: mcp:blender stages
    // execute as mcp__blender__* tool calls through the runtime.
    // inject gates the APPLY on both seats (the comfyui adapter's
    // `inject: ["engines"]` precedent): the 2026-09-15 live-fire
    // caught this row dying SILENTLY — the tools runtime mounts
    // after the estate row, the constructor's loud guard threw, and
    // cordis buried the per-fiber throw while the boot marched on
    // (seat: comfyui + craft only). Never an ungated seat read.
    {
        name: "melite-engine-mcp-row",
        inject: ["engines", "tools"],
        apply: (ctx, config = {}) => {
            // li-l (2026-10-10, the 5+ brick): the engine gate resolves
            // HERE, inside the row, from the estate config's mcpEngines
            // field (V6/J12 cure, 2026-10-18: the profile's cordis.yml row
            // pins it — no env seam; the composition's apply resolves the
            // list). Empty names NO engine: the row announces the OFF
            // state LOUD and seats nothing. A flapping blender handshake
            // can no longer brick the estate (three mcp_server.py children,
            // 3379 remounts in one log) — with no engine named there is no
            // cycle to flap, and the 3D cards refuse by name at their own
            // door.
            const engines = (config.engines ?? []).map((s) => s);
            if (engines.length === 0) {
                console.log("[melite-estate] mcp row OFF (no engine named — the estate config's mcpEngines field; the MCP card is optional/experimental)");
                return;
            }
            // LOUD seat decision (the craft row's law): a silent row
            // hides a dead engine until a run fails at the door.
            console.log("[melite-estate] mcp row applying with config " + JSON.stringify({ engines }));
            mcpEngines(ctx, { engines });
        },
        // OPTIONAL/EXPERIMENTAL (the operator's law, 2026-10-12 — "we
        // set the mcp card to optional, so it can be experimental"):
        // the default seats NOTHING. The MCP card folds into the picker
        // only when an engine is explicitly named (the estate config's
        // mcpEngines field) — the estate boots complete without it, and
        // seating one is the opt-in experiment.
    },
    // The craft loop engine (async apply: the route resolution rides
    // listModels — the seat lands after the enumeration).
    // MELITE_CRITIC_ROUTE "provider/model" names the critic
    // explicitly (the smoke drive pins the operator's spark route;
    // the lane default is the auto-route's first image-capable
    // enumeration) — explicit > implicit, verified before seating.
    // Late adapters (the pi-ai settings race — the adapter registers
    // on settings arrival, AFTER early rows apply): a missed first
    // attempt resubscribes on the registry's own llm/adapters-updated
    // announcement (root-side, like tools/change — a row fork never
    // sees it) and seats then, unsubscribing on success. The boot
    // line already said NOT seated LOUD; the seating line closes it.
    {
        name: "melite-engine-craft-row",
        apply: async (ctx, config = {}) => {
            const say = (line) => {
                // console, not ctx.logger: the lane log owns stdout and the
                // optional-chained logger call swallowed the boot truth once
                // (2026-09-15) — never quiet-resolve a seat decision
                console.log("[melite-estate] " + line);
            };
            // V6/J12 cure: the named preference is the estate config's
            // criticRoute field ("provider/model", explicit > implicit),
            // never an env read.
            const named = /^([^/\s]+)\/(.+)$/.exec(config.criticRoute ?? "");
            const prefer = named === null ? undefined : { provider: named[1], model: named[2] };
            // Serialized attempts: adapters-updated fires per registration
            // (deepseek, pi-ai, …) and two concurrent attempts both pass
            // the resolve and collide in the service construction (the
            // 2026-09-15 drive killed its own child this way — an uncaught
            // duplicate-seat throw wedged boot and initialize timed out).
            // Never void without catch; a failed attempt logs LOUD and
            // releases for the next event, success unsubscribes.
            let done = false;
            let busy = false;
            let off;
            ctx.effect(() => () => off?.());
            const attempt = () => {
                if (done || busy)
                    return;
                busy = true;
                void craftEngineAutoRoute(ctx, say, prefer).then((seated) => {
                    busy = false;
                    if (seated) {
                        done = true;
                        off?.();
                    }
                }, (e) => {
                    busy = false;
                    const message = String(e?.message ?? e);
                    // ALREADY SEATED (the lane-audit finding, 2026-09-28): the
                    // loader can apply this row twice (double apply / two row
                    // fibers), and cordis's provide() throws the bare
                    // duplicate-service Error on the SECOND construction. That
                    // rejection is SUCCESS wearing an error's clothes — the
                    // seat exists at this row's own name. Treating it as
                    // retryable re-armed the attempt on every adapters-updated
                    // forever, re-printing "seated" before each throw (the
                    // seat line prints BEFORE the constructor), and holding
                    // every seat door in estate/pending for the grace window.
                    // The one-message match is the only signal: cordis throws
                    // a plain Error with no code.
                    const twin = /service "melite-engine-craft" has been registered at <([^>]+)>/.exec(message);
                    if (twin !== null) {
                        say(`craft engine: already seated at <${twin[1]}> — nothing to do`);
                        done = true;
                        off?.();
                        return;
                    }
                    say(`craft engine: late seat attempt failed (${message.slice(0, 200)}) — waiting for the next adapters-updated`);
                });
            };
            off = ctx.root.on("llm/adapters-updated", attempt);
            attempt();
        },
    },
    // The agent engine (stroke 62, plan §5): engine id 'agent' on the
    // seat. Unlike the craft row there is NO boot-time route
    // enumeration to race — prepareCall happens per RUN, after the
    // adapters have long registered; the row needs only the SEATS
    // (gated by inject — the mcp-row lesson: never an ungated seat
    // read). The brain is named or the row refuses LOUD (a default
    // brain is a silent substitution the operator never asked for).
    {
        name: "melite-engine-agent-row",
        inject: ["engines", "tools", "llm"],
        apply: (ctx, config = {}) => {
            const say = (line) => {
                // console, not ctx.logger: the lane log owns stdout (the
                // craft row's law — never quiet-resolve a seat decision)
                console.log("[melite-estate] " + line);
            };
            const named = /^([^/\s]+)\/(.+)$/.exec(config.agentRoute ?? "");
            if (named === null) {
                // THE LINE MUST BE ACTIONABLE (a live 3088 commission's
                // finding: the not-seated notice rode line 3 of the maker's
                // log, where it is read by nobody, and it named the env var
                // without saying what the operator can DO about it). Two
                // lawful ways to seat the brain, both named, plus the honest
                // note that the card's own brain param rides the run instead.
                say("agent engine: the estate config's agentRoute \"provider/model\" is not set — engine 'agent' NOT seated; agent stages refuse at the door until the brain is named. Fix: set agentRoute in the estate row's config (cordis.yml), or set the card's own brain param (params.ts: the agent card's model knob overrides the boot seat per run).");
                return;
            }
            // The spawn-injection reader: findSkill over the disclosure
            // root (MELITE_REPO_ROOT else file-anchored), body text or
            // leaf file; a read that fails answers null and the engine
            // refuses the skill LOUD at stage start.
            const skills = {
                read: async (id) => {
                    // The lane-seat law: the spawn reader composes flow bodies
                    // from the SAME seat the runs doors thread (ctx.get — the
                    // injector API; unmounted reads degrade to the singleton).
                    const found = findSkill(disclosureRoot(), id, ctx.get("models"), ctx.get("meliteFlows"));
                    if (found === null)
                        return null;
                    if (found.bodyText !== null)
                        return found.bodyText;
                    try {
                        // the FlowRow invariant (skillRows): bodyText is null only
                        // when the file path is set — the cast carries it, branch-free.
                        return await readFile(found.path, "utf8");
                    }
                    catch {
                        return null;
                    }
                },
            };
            agentEngine(ctx, { provider: named[1], model: named[2], skills });
        },
    },
    comfyuiWiring,
    comfyuiHost,
    comfyuiEngine,
    draftsPlugin,
    queuePlugin,
    // The card registry (REBUILD-9: the primed defs + facts + the
    // compose pipeline — the {model:} arms' engine) then the runs
    // registry + its Typert remote: the estate process serves the
    // runs lanes itself (start/status/stop/list/validate, both the
    // inline and the card door). The registry gates on the queue +
    // drafts + cards seats — mount order is load order here.
    cardRegistryProvider,
    provisioningComposition,
    // The disclosure seat (REBUILD-14): discover over both planes,
    // derived live — gates on the card registry seat (its inject).
    discloseProvider,
    // The management seat (REBUILD-15): the ComfyUI-Manager plane —
    // gates on the timer seat (the rail's timeouts).
    manageProvider,
    // THE PREFLIGHT BOOT NOTE (audit 019 C3): one console note naming
    // every setup miss with its door, fired once after boot — instead
    // of null presence + mid-run burns. Rides the manage seat's own
    // preflight verb (one spelling of the axis logic); the brain axis
    // is the agent-row's own note above (one home — the config row
    // that owns it). Deferred: boot never waits on an absent engine
    // (the probes carry their own fuses); a failed note is one loud
    // line, never a wedged boot.
    {
        name: "melite-preflight-note",
        inject: ["manage"],
        apply: (ctx) => {
            const say = (line) => {
                // console, not ctx.logger: the lane log owns stdout (the
                // craft row's law — never quiet-resolve a boot decision)
                console.log("[melite-estate] " + line);
            };
            // NO DEFER: the row is ordered after manageProvider (mount
            // order is load order), so the manage seat exists at apply
            // time; the act itself is async and every error is caught —
            // boot never waits on an absent engine (the probes carry
            // their own fuses).
            const run = () => {
                void (async () => {
                    const manage = ctx.get("manage");
                    if (manage === undefined) {
                        say("preflight: the manage seat is absent on this lane — no boot note (the verb stays callable where the seat mounts)");
                        return;
                    }
                    const answer = await manage.act({ action: "preflight" }, AbortSignal.timeout(60_000));
                    const misses = Array.isArray(answer.misses) ? answer.misses : [];
                    if (misses.length === 0) {
                        say("preflight: " + String(answer.detail ?? "all axes green"));
                        return;
                    }
                    for (const miss of misses)
                        say("preflight MISS " + String(miss));
                })().catch((e) => {
                    say("preflight note failed (" + (e instanceof Error ? e.message : String(e)).slice(0, 160) + ") — the comfy_manage preflight verb remains the on-demand read");
                });
            };
            run();
        },
    },
    // The manage remote (the browser tab's plane): the Typert
    // namespace `manage` over the seat above.
    manageRemotePlugin,
    // The skills seat (REBUILD-16): the index + read over the
    // doc-tree walks — gates on the queue seat (the ledger seam).
    skillProvider,
    // The load seat (REBUILD-17): Melite load opens ONE card or
    // flow — the bundle (agents md + signature + skill lines).
    loadProvider,
    runsRegistryPlugin,
    runsRemotePlugin,
    // The media route last: it probes the queue seat at the use site
    // (optional-dependency law), so order carries no meaning — it just
    // reads well after the estate rows it serves.
    mediaPlugin,
    // The provisions route after it: it boots the models table itself
    // (bootModels' singleton, the card registry's own boot), so order
    // carries no meaning either.
    modelsPlugin,
];
export const name = "melite-estate";
/** THE SEAT ROSTER the settle gate demands (the ONE hand list —
 * §3.9 one owner, every other home a pure reader): every door seat
 * the prober's seatFamilyForPath vocabulary can name, plus the
 * internal cardRegistry no door family names but every registry
 * row injects. The drift-alarm arm (lane-runs-state-repro) reds if
 * the prober learns a seat this roster does not demand. */
export const REQUIRED_SEATS = [
    "queue", "draftsRemote", "benchRemote", "cardRegistry",
    "provisioning", "runs", "disclose", "manage", "meliteSkills", "load",
];
/** The validator twin of {@link Config}. */
export const Config = Schema.object({
    repoRoot: Schema.string(),
    stateRoot: Schema.string(),
    stateRoots: Schema.union([Schema.string(), Schema.array(Schema.string())]),
    allowGuttedLane: Schema.boolean().default(false),
    mcpEngines: Schema.union([Schema.string(), Schema.array(Schema.string())]),
    criticRoute: Schema.string(),
    agentRoute: Schema.string(),
    storeRoot: Schema.string(),
    acquireStallTimeoutMs: Schema.number(),
    durableDownloads: Schema.boolean(),
    downloadClaimIntervalMs: Schema.number(),
    seatSettleBudgetMs: Schema.number(),
});
/**
 * THE COLD-PROFILE ROOTS (operator 2026-10-30, "as easy as possible
 * to setup"): the deterministic defaults a fresh install boots on
 * when the estate row names no roots. Precedence, one function:
 * config.stateRoot wins verbatim; else a named repoRoot keeps the
 * repo law (<repoRoot>/data/runs for the state tree, and NO store
 * default — the checkout's tracked configs derive the store at
 * apply, loadStoreRoot's own law); else — the cold install — the
 * per-user data home names both roots (~/.local/share/melite). The
 * home default is per-user, so the single-writer lock law holds one
 * estate per user, exactly as one estate per repo.
 * @param config the estate row's config face (the three root fields).
 * @returns the state root the composition pins, and the weights
 * store root to forward (undefined = the provisioning row derives).
 */
export function coldInstallRoots(config) {
    const dataHome = join(homedir(), ".local", "share", "melite");
    const cold = config.repoRoot === undefined;
    return {
        stateRoot: config.stateRoot ?? (cold ? join(dataHome, "runs") : join(config.repoRoot ?? "", "data", "runs")),
        storeRoot: config.storeRoot ?? (cold ? join(dataHome, "store") : undefined),
    };
}
export async function apply(ctx, config = {}) {
    // THE BUNDLE GATE RUNS FIRST: a configuration refusal precedes any
    // composition — nothing mounts before it, so a gutted tree fails
    // with zero rows attempted (stronger than the models-first
    // atomicity below, which mounts one seat before judging).
    checkBundleGate(ctx, config);
    // THE MODELS ROW MOUNTS FIRST AND IS AWAITED (its ONLY mount — the
    // row sits outside the rows list, so the loop never special-cases
    // it): a family that refuses at mount would otherwise land in
    // cordis's logger alone — the estate boot continues, the seat
    // unregisters, and every door silently degrades. The await
    // rethrows the refusal HERE, before any other row mounts: cordis
    // flips this fiber to INACTIVE without running collected
    // disposers, so a refusal that landed mid-loop would leave the
    // engines, MCP, craft and agent seats registered on a lane whose
    // runs, queue and disclosure doors never mounted. Mounting the
    // seat first makes the refusal atomic — the whole lane fails or
    // none of it does.
    //
    // THE COMPOSITION FACE (ROADMAP "Models-boot Loader composition"):
    // families arrive as Loader composition rows — this bundle's
    // cordis.patch.yml, one row per @melite/models-* package — so the
    // Loader owns their lifecycle (cordis.yml visibility, config-HMR
    // live add/remove). The estate mounts the BARE provider (the
    // service; families inject it and activate dependency-driven),
    // then awaits the census gate: it settles every family fiber
    // (rethrowing any family's refusal — the atomicity law above,
    // re-pointed from the retired plugin loop), censuses the table
    // against the fiber count, cross-validates the boot contracts,
    // and ARMS the process seat so the doors' Context-less reads
    // (theService/bootModels) serve the composed table. The gate's
    // internal/status listener re-censuses on later family-fiber
    // transitions — a config-HMR row change is live on this lane.
    await ctx.plugin(modelsProvider);
    ctx.plugin(modelsCensusGate);
    // The composition settle: awaiting the gate's own fiber can
    // resolve before cordis starts its apply (deferred inject-fiber
    // activation), so the settle is the composition's own contract —
    // whenModelsArmed resolves on the census arm and REJECTS on the
    // census refusal (this fiber fails before any door mounts; the
    // all-or-nothing law above rides the rejection).
    await whenModelsArmed();
    // THE ENGINE GATE RESOLVE (one explicit step — the list/string
    // split lives here, the rows receive resolved values)
    const mcpEngines = (Array.isArray(config.mcpEngines)
        ? config.mcpEngines
        : (config.mcpEngines ?? "").split(",").map((x) => x.trim()).filter((x) => x !== ""));
    // THE STATE-ROOT RESOLVE (J12): one spelling for the queue row
    // AND the drafts row — config.stateRoot wins over repoRoot's
    // data/runs default (resolveStateRoot, estate-queue's law), the
    // manifest extras resolve string|list once. THE COLD-PROFILE
    // DEFAULT (operator 2026-10-30, "as easy as possible to setup"):
    // a fresh install's estate row names NO roots, and the queue row
    // rightly refuses an unpinned boot — so the ESTATE ROW names the
    // per-user default itself (coldInstallRoots below): the pin law
    // keeps its teeth (the queue still receives a NAMED absolute
    // root, one writer per root), and `dsh plugin install` alone
    // boots a green estate with zero config.
    const coldRoots = coldInstallRoots(config);
    const stateRoot = resolveStateRoot({ repoRoot: config.repoRoot, stateRoot: coldRoots.stateRoot });
    const stateRoots = (Array.isArray(config.stateRoots)
        ? config.stateRoots
        : (config.stateRoots ?? "").split(":").map((x) => x.trim()).filter((x) => x !== ""));
    for (const row of rows) {
        // THE PROVISIONING ROW IS AWAITED (2026-10-24, the same atomic
        // law as modelsFamiliesProvider above): children fibers start in
        // arbitrary order, and the models provisions door probes the
        // provisioning service — a door mounted before the service
        // visibly starts served "no seat" 502s while verified bytes sat
        // in the store. Awaiting this row pins the order; the door's
        // own use-site probe remains the real cure.
        if (row === provisioningComposition) {
            // THE DURABLE DOWNLOAD SEAT + the provisioning deployment face
            // (2026-10-21, closing the audit's unwired-config drift): the
            // estate row forwards its provisioning fields into the
            // composition's own Config — never a second declaration site.
            await ctx.plugin(row, {
                ...(coldRoots.storeRoot === undefined ? {} : { storeRoot: coldRoots.storeRoot }),
                ...(config.acquireStallTimeoutMs === undefined ? {} : { acquireStallTimeoutMs: config.acquireStallTimeoutMs }),
                ...(config.durableDownloads === undefined ? {} : { durableDownloads: config.durableDownloads }),
                ...(config.downloadClaimIntervalMs === undefined ? {} : { downloadClaimIntervalMs: config.downloadClaimIntervalMs }),
            });
            continue;
        }
        // the queue row receives the pin (its QueueConfig roots)
        if (row === queuePlugin) {
            // stateRoot is the DERIVED pin (config's verbatim root, the
            // repo default, or the cold-profile default) — the queue row
            // never sees an unpinned boot from this composition.
            ctx.plugin(row, { repoRoot: config.repoRoot, stateRoot, stateRoots });
            continue;
        }
        // the drafts row rides the SAME resolved root (its unit-file
        // tree is <stateRoot>/storage — one law, both seats)
        if (row === draftsPlugin) {
            ctx.plugin(row, { storageRoot: join(stateRoot, "storage") });
            continue;
        }
        if (row.name === "melite-engine-mcp-row") {
            ctx.plugin(row, { engines: mcpEngines });
            continue;
        }
        if (row.name === "melite-engine-craft-row") {
            ctx.plugin(row, { criticRoute: config.criticRoute });
            continue;
        }
        if (row.name === "melite-engine-agent-row") {
            ctx.plugin(row, { agentRoute: config.agentRoute });
            continue;
        }
        // rows may carry their own config face — ctx.plugin's second
        // argument is the row's declared config, passed through verbatim
        const rowConfig = row.config;
        if (rowConfig !== undefined) {
            ctx.plugin(row, rowConfig);
            continue;
        }
        ctx.plugin(row);
    }
    // THE SETTLE GATE (2026-10-23, the silent-green lane wedge): the
    // rows above mount FIRE-AND-FORGET by design — but cordis resolves
    // a child fiber's promise even when the fiber FAILS, so a dead row
    // (live proof: the queue row's gateway.lock refusal) left the
    // estate settled-green with every /v1 seat door serving honest
    // 502s while /v1/model-catalog answered 200 — a half-up lane that
    // no log line names. The gate closes that class: the queue plane's
    // required seats must go strict-active (providing fiber state 2,
    // the same read the doors use) within the settle budget, or the
    // WHOLE estate refuses — the failure is the lane's, loud, at boot,
    // naming the seats that never came up.
    // THE ROSTER IS DERIVED-OWNED HERE (2026-11-12, the journey
    // audit's F1/F2): REQUIRED_SEATS is the ONE hand list — every
    // door seat the prober's seatFamilyForPath vocabulary names (the
    // drift-alarm wall cross-checks that direction) plus the internal
    // cardRegistry — and the repro wall's SEATS is a pure reader.
    const requiredSeats = REQUIRED_SEATS;
    const budgetMs = config.seatSettleBudgetMs ?? 30_000;
    const deadline = Date.now() + budgetMs;
    let disposed = false;
    ctx.effect(() => () => { disposed = true; }, "melite-estate.settle-gate");
    for (;;) {
        const missing = requiredSeats.filter((n) => ctx.get(n) === undefined);
        if (missing.length === 0)
            break;
        if (disposed || Date.now() >= deadline) {
            throw new Error("[melite-estate] the composition refused to settle: seat(s) " + missing.join(", ")
                + " never activated within " + String(budgetMs) + "ms — a required row died silently "
                + "(the 2026-10-23 lane wedge class: check the queue row's state-root lock and the drafts row's storage root); "
                + "refusing to boot a half-up estate (catalog green, every seat door 502)");
        }
        await new Promise((resolve) => { setTimeout(resolve, 250); });
    }
}
/** The cordis row shape: a plugin object (name + apply). */
export default { name, apply };
//# sourceMappingURL=index.js.map