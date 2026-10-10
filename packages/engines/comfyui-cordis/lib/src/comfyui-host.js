// comfyui-host.ts — the engine client as a Cordis Service (stroke 4b, DSH-AS-LANGUAGE LAW).
// (split from comfyui.ts 2026-09-18: pure move, zero logic changes).
import Schema from "@deepseek-ai/schemastery";
import { Service } from "@deepseek-ai/cordis";
import { EngineSupervisor, isTransportDownError } from "./supervisor.js";
import { resolveEngineBaseUrl } from "./comfyui-config.js";
import { sdkClient } from "./comfyui-transport.js";
import { stopForRunDirInner, unloadModelsInner } from "./comfyui-control.js";
import { executeSingleInner } from "./comfyui-execute.js";
import { executeFlowInner } from "./comfyui-merge.js";
/** The Config schema (hand-rolled — see the header note): unknown
 *  in, validated triple out. Wrong shapes throw LOUD. */
/** The provider's Config surface — the house schemastery shape
 *  (row 17): declared schema, resolved by the parser. */
export const Config = Schema.object({
    url: Schema.string(),
    host: Schema.string(),
    port: Schema.number().min(1).max(65535),
});
export function parseComfyUIHostConfig(raw) {
    if (raw === undefined || raw === null)
        return {};
    const resolved = Config(raw);
    const out = {};
    if (resolved.url !== undefined) {
        if (resolved.url.trim() === "") {
            throw new Error("[comfyui] host Config url must be a non-empty string");
        }
        out.url = resolved.url.trim().replace(/\/+$/, "");
    }
    if (resolved.host !== undefined) {
        if (resolved.host.trim() === "") {
            throw new Error("[comfyui] host Config host must be a non-empty string");
        }
        out.host = resolved.host.trim();
    }
    if (resolved.port !== undefined) {
        if (!Number.isInteger(resolved.port)) {
            throw new Error("[comfyui] host Config port must be an integer 1..65535");
        }
        out.port = resolved.port;
    }
    return out;
}
export class ComfyUIHostService extends Service {
    /** Provider-configured base (operator pin — wins over env/file).
     *  Mutable ONLY via repoint (settings onChange) — faces read the
     *  resolved server, never this directly. */
    pin;
    /** Live config source (cookbook setSource sink): the ctor config
     *  until the settings section binds, then the resolved namespace
     *  value (composition base + user layer). */
    source;
    /** Ctor config (resetForTests re-arms the source — in-process
     *  reuse must not hold a disposed settings scope). */
    ctorConfig;
    /** Lazily resolved server (once per fiber — see resetForTests). */
    resolved = null;
    /** Reachability supervisor (the MCP connection pattern, lazy with
     *  the server — fixture boots carry no endpoint, so provide time
     *  must never resolve OR probe). */
    supervisor = null;
    /** Live prompts (run_dir -> handle — the retired module ACTIVE
     *  handle's fiber-owned successor). */
    prompts = new Map();
    constructor(ctx, config = {}) {
        super(ctx, "comfyui");
        this.ctorConfig = config;
        this.source = () => config;
        this.pin = ComfyUIHostService.resolvePin(config);
    }
    /** The Config-triple pin (url wins; host/port compose; neither =
     *  null — env/file fallback). Shared by the ctor and repoint so
     *  the two can never disagree. */
    static resolvePin(config) {
        if (config.url !== undefined)
            return config.url;
        if (config.host !== undefined || config.port !== undefined) {
            const host = config.host ?? "127.0.0.1";
            const port = config.port ?? 8188;
            return "http://" + host + ":" + String(port);
        }
        return null;
    }
    /** Cookbook setSource sink: the settings section takes over as
     *  the live config source (no-op when the provider is absent). */
    setSource(source) {
        this.source = source;
    }
    /** Cookbook onChange: re-resolve the pin against the live source.
     *  Unresolved (never used) = swap the pin silently; resolved +
     *  unchanged = no-op; resolved + changed = drop the supervisor so
     *  the next face resolves + probes fresh. In-flight runs keep
     *  their captured server string — a repoint never steers a live
     *  run. Registration calls this once with the entry value (same
     *  pin — the no-op arm). */
    repoint() {
        const next = ComfyUIHostService.resolvePin(this.source());
        if (this.resolved === null) {
            this.pin = next;
            return;
        }
        if (next === this.resolved)
            return;
        if (this.supervisor !== null) {
            const sup = this.supervisor;
            this.supervisor = null;
            void sup.dispose();
        }
        this.pin = next;
        this.resolved = null;
        this.ctx.logger("comfyui").info("%s", "engine repointed to " + (next ?? "(env/file fallback)"));
    }
    /** Test seam: drop the resolved server + supervisor + all
     *  live-prompt handles (walls boot fresh processes; belt-and-
     *  braces for in-process reuse — the RunsService behavior). */
    resetForTests() {
        this.resolved = null;
        this.source = () => this.ctorConfig;
        this.pin = ComfyUIHostService.resolvePin(this.ctorConfig);
        if (this.supervisor !== null) {
            const sup = this.supervisor;
            this.supervisor = null;
            void sup.dispose();
        }
        this.prompts.clear();
    }
    /** The engine base URL (lazy once-per-fiber): Config pin >
     *  COMFYUI_URL env (wall-pinned) > endpoint file (estate truth).
     *  Absent everywhere = the LOUD ComfyError (native 82-84 — NO
     *  default, NO hardcoded host/port). First resolution also starts
     *  the reachability supervisor (fire-and-forget probe — boot and
     *  fixtures never block on the engine). */
    baseUrl() {
        if (this.resolved !== null)
            return this.resolved;
        const server = this.pin !== null ? this.pin : resolveEngineBaseUrl();
        this.resolved = server;
        this.startSupervisor(server);
        return server;
    }
    /** The fiber's supervisor (baseUrl first — a face without a
     *  server is a wiring bug, LOUD like needComfyUI). */
    sup() {
        if (this.supervisor === null) {
            throw new Error("[comfyui] no supervisor — faces call baseUrl() first " +
                "(lazy with the server; provide time never probes)");
        }
        return this.supervisor;
    }
    startSupervisor(server) {
        if (this.supervisor !== null)
            return;
        // Scoped-logger voice (gateway.ts rides ctx.logger the same
        // way — %s-param shape, the message carries engine error text).
        const log = this.ctx.logger("comfyui");
        const sup = new EngineSupervisor({
            probe: () => {
                return sdkClient(server)
                    .getSystemStats()
                    .then(() => undefined);
            },
            label: "comfyui",
            log: {
                info: (m) => {
                    log.info("%s", m);
                },
                warn: (m) => {
                    log.warn("%s", m);
                },
                // Untestable-by-construction arm (2026-09-12): the
                // supervisor only logs error on re-probe exhaustion (10+
                // consecutive failures) or a disabled policy — neither fits
                // a unit fuse. Warn (down) and info (recovered) ride the
                // battery below.
                /* v8 ignore next */
                error: (m) => {
                    log.error("%s", m);
                },
            },
        });
        this.supervisor = sup;
        sup.start();
    }
    /** Supervised face: fail FAST when the engine is known-down
     *  (the recorded error, no timeout burn); report traffic
     *  liveness back (transport-dead only — timeouts and HTTP
     *  statuses prove the engine alive and stay neutral). */
    async supervised(work) {
        const sup = this.sup();
        await sup.ensureUp();
        try {
            const result = await work();
            sup.noteSuccess();
            return result;
        }
        catch (error) {
            if (isTransportDownError(error))
                sup.noteFailure(error);
            throw error;
        }
    }
    /** Per-stage submit + poll + fetch (the plugin face of
     *  executeSingleInner — same inner, fiber-owned prompts). */
    executeSingle(runDir, nodeParams, nodeOutputs, opts = {}) {
        const server = this.baseUrl();
        return this.supervised(() => executeSingleInner(runDir, nodeParams, nodeOutputs, opts, server, this.prompts));
    }
    /** Merged submit ONCE + tap-less poll + per-stage harvest (the
     *  plugin face of executeFlowInner — the flows-start worker's
     *  path). */
    executeFlow(rows, runDir, inputNames, initials, opts = {}) {
        const server = this.baseUrl();
        // NO WALL HERE (2026-10-10, the operator's law: ON SUBMIT IS A
        // HACK). A check injected at one engine call is a wall someone
        // remembered to build — the missing-import crash was this shape
        // failing, not a missing import. The wiring law lives where
        // every path already walks: the run seat's pre-flight
        // (runsExecute) judges the built rows against the doc BEFORE
        // any action; the card-compose seat judges at compose. This
        // method only transports.
        return this.supervised(() => executeFlowInner(rows, runDir, inputNames, initials, opts, server, this.prompts));
    }
    /** Interrupt + dequeue the live prompt for one run dir (the
     *  plugin face of stopForRunDirInner — the flows-stop door's
     *  path). Unknown dir = silent no-op (the flag is the authority,
     *  ). */
    stopForRunDir(runDir) {
        return stopForRunDirInner(runDir, this.prompts);
    }
    /** Drop every cached model + the execution cache from VRAM (the
     *  plugin face of unloadModelsInner). */
    unloadModels() {
        return unloadModelsInner(this.baseUrl());
    }
}
/** The provider plugin (fiber-owned): owns the ComfyUIHostService
 *  lifetime. No prime step (resolution is lazy at first use — the
 *  fixture boots of the TS walls carry no endpoint url, so provide
 *  time must never resolve). Manifest row engine-comfyui rides
 *  BEFORE every consumer (flows-start, flows-stop). Loadable entry:
 *  packages/engines/comfyui-cordis/src/entries/comfyui-host.ts (the DSH
 *  leaf discipline — addressed code loads by address, never as a
 *  `cordis:` builtin). */
export const comfyuiHostProvider = {
    name: "engine-comfyui",
    // THE 0.1.7 SETTINGS LAW (the pin bump, 2026-10-11): dsh-settings
    // 0.1.7's SettingsForms derives every settings form from the
    // ACTIVE plugin's own Config schema — the old `installSection`
    // seam (a provider-side section install with setSource/onChange
    // callbacks) died with it. Declaring Config here IS the
    // registration: a profile-patch write to this entry re-applies
    // the plugin (the loader's live config reload), and the fresh
    // service at the new pin IS the repoint — no in-process section,
    // no setSource plumbing. The service keeps setSource/repoint for
    // in-process seats (the spec's repoint arms).
    Config,
    apply(ctx, config) {
        const entry = parseComfyUIHostConfig(config);
        new ComfyUIHostService(ctx, entry);
    },
};
/** Resolve the service for request-path helpers that take it as an
 *  optional trailing param (the stroke-2b shape): an explicit arg
 *  wins. Null = the caller forgot to thread ctx.comfyui — a bug, so
 *  reads throw LOUD (an engine call without an engine is never a
 *  silent module fallback). Door listeners MUST pass
 *  needComfyUI(ctx) (their inject declares 'comfyui'). */
export function needComfyUI(ctx, where) {
    const svc = ctx.get("comfyui");
    if (svc instanceof ComfyUIHostService)
        return svc;
    throw new Error("[comfyui] no ComfyUIHostService for " + where +
        " — doors inject 'comfyui' and pass needComfyUI(ctx) " +
        "(the manifest's engine-comfyui row provides at boot; a " +
        "card-plane ComfyUIService on this fiber is a miswire)");
}
//# sourceMappingURL=comfyui-host.js.map