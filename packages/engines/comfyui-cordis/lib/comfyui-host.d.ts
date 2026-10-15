import Schema from "@deepseek-ai/schemastery";
import { Context, Service } from "@deepseek-ai/cordis";
import type { Plugin } from "@deepseek-ai/cordis";
import type { EngineJson } from "./comfyui-types.js";
import type { ExecuteOpts, ExecuteResult } from "./comfyui-execute.js";
import type { FlowResult, MergeRow } from "./comfyui-merge.js";
/** Static provider config — the DSH host/port/url triple. */
export interface ComfyUIHostConfig {
    readonly url?: string;
    readonly host?: string;
    readonly port?: number;
}
/** The Config schema (hand-rolled — see the header note): unknown
 *  in, validated triple out. Wrong shapes throw LOUD. */
/** The provider's Config surface — the house schemastery shape
 *  (row 17): declared schema, resolved by the parser. */
export declare const Config: Schema<ComfyUIHostConfig>;
export declare function parseComfyUIHostConfig(raw: unknown): ComfyUIHostConfig;
export declare class ComfyUIHostService extends Service {
    /** Provider-configured base (operator pin — wins over env/file).
     *  Mutable ONLY via repoint (settings onChange) — faces read the
     *  resolved server, never this directly. */
    private pin;
    /** Live config source (cookbook setSource sink): the ctor config
     *  until the settings section binds, then the resolved namespace
     *  value (composition base + user layer). */
    private source;
    /** Ctor config (resetForTests re-arms the source — in-process
     *  reuse must not hold a disposed settings scope). */
    private readonly ctorConfig;
    /** Lazily resolved server (once per fiber — see resetForTests). */
    private resolved;
    /** Reachability supervisor (the MCP connection pattern, lazy with
     *  the server — fixture boots carry no endpoint, so provide time
     *  must never resolve OR probe). */
    private supervisor;
    /** Live prompts (run_dir -> handle — the retired module ACTIVE
     *  handle's fiber-owned successor). */
    private readonly prompts;
    constructor(ctx: Context, config?: ComfyUIHostConfig);
    /** The Config-triple pin (url wins; host/port compose; neither =
     *  null — env/file fallback). Shared by the ctor and repoint so
     *  the two can never disagree. */
    static resolvePin(config: ComfyUIHostConfig): string | null;
    /** Cookbook setSource sink: the settings section takes over as
     *  the live config source (no-op when the provider is absent). */
    setSource(source: () => ComfyUIHostConfig): void;
    /** Cookbook onChange: re-resolve the pin against the live source.
     *  Unresolved (never used) = swap the pin silently; resolved +
     *  unchanged = no-op; resolved + changed = drop the supervisor so
     *  the next face resolves + probes fresh. In-flight runs keep
     *  their captured server string — a repoint never steers a live
     *  run. Registration calls this once with the entry value (same
     *  pin — the no-op arm). */
    repoint(): void;
    /** Test seam: drop the resolved server + supervisor + all
     *  live-prompt handles (walls boot fresh processes; belt-and-
     *  braces for in-process reuse — the RunsService behavior). */
    resetForTests(): void;
    /** The engine base URL (lazy once-per-fiber): Config pin >
     *  COMFYUI_URL env (wall-pinned) > endpoint file (estate truth).
     *  Absent everywhere = the LOUD ComfyError (native 82-84 — NO
     *  default, NO hardcoded host/port). First resolution also starts
     *  the reachability supervisor (fire-and-forget probe — boot and
     *  fixtures never block on the engine). */
    baseUrl(): string;
    /** The fiber's supervisor (baseUrl first — a face without a
     *  server is a wiring bug, LOUD like needComfyUI). */
    private sup;
    private startSupervisor;
    /** Supervised face: fail FAST when the engine is known-down
     *  (the recorded error, no timeout burn); report traffic
     *  liveness back (transport-dead only — timeouts and HTTP
     *  statuses prove the engine alive and stay neutral). */
    private supervised;
    /** Per-stage submit + poll + fetch (the plugin face of
     *  executeSingleInner — same inner, fiber-owned prompts). */
    executeSingle(runDir: string, nodeParams: Record<string, EngineJson>, nodeOutputs: Record<string, EngineJson>, opts?: ExecuteOpts): Promise<ExecuteResult>;
    /** Merged submit ONCE + tap-less poll + per-stage harvest (the
     *  plugin face of executeFlowInner — the flows-start worker's
     *  path). */
    executeFlow(rows: MergeRow[], runDir: string, inputNames: Record<string, Record<string, string>>, initials: Record<string, EngineJson>, opts?: ExecuteOpts): Promise<FlowResult>;
    /** Interrupt + dequeue the live prompt for one run dir (the
     *  plugin face of stopForRunDirInner — the flows-stop door's
     *  path). Unknown dir = silent no-op (the flag is the authority,
     *  ). */
    stopForRunDir(runDir: string): Promise<void>;
    /** Drop every cached model + the execution cache from VRAM (the
     *  plugin face of unloadModelsInner). */
    unloadModels(): Promise<void>;
}
/** The provider plugin (fiber-owned): owns the ComfyUIHostService
 *  lifetime. No prime step (resolution is lazy at first use — the
 *  fixture boots of the TS walls carry no endpoint url, so provide
 *  time must never resolve). Manifest row engine-comfyui rides
 *  BEFORE every consumer (flows-start, flows-stop). Loadable entry:
 *  packages/engines/comfyui-cordis/src/entries/comfyui-host.ts (the DSH
 *  leaf discipline — addressed code loads by address, never as a
 *  `cordis:` builtin). */
export declare const comfyuiHostProvider: Plugin;
/** Resolve the service for request-path helpers that take it as an
 *  optional trailing param (the stroke-2b shape): an explicit arg
 *  wins. Null = the caller forgot to thread ctx.comfyui — a bug, so
 *  reads throw LOUD (an engine call without an engine is never a
 *  silent module fallback). Door listeners MUST pass
 *  needComfyUI(ctx) (their inject declares 'comfyui'). */
export declare function needComfyUI(ctx: Context, where: string): ComfyUIHostService;
//# sourceMappingURL=comfyui-host.d.ts.map