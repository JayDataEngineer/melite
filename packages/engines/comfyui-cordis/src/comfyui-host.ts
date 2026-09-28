// comfyui-host.ts — the engine client as a Cordis Service (stroke 4b, DSH-AS-LANGUAGE LAW).
// (split from comfyui.ts 2026-09-18: pure move, zero logic changes).

import Schema from "@deepseek-ai/schemastery";
import { Context, Service } from "@deepseek-ai/cordis";
import type { Plugin } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-settings";
import { EngineSupervisor, isTransportDownError } from "./supervisor.ts";
import type { ActivePrompt, EngineJson } from "./comfyui-types.ts";
import { resolveEngineBaseUrl } from "./comfyui-config.ts";
import { sdkClient } from "./comfyui-transport.ts";
import { stopForRunDirInner, unloadModelsInner } from "./comfyui-control.ts";
import { executeSingleInner } from "./comfyui-execute.ts";
import type { ExecuteOpts, ExecuteResult } from "./comfyui-execute.ts";
import { executeFlowInner } from "./comfyui-merge.ts";
import type { FlowResult, MergeRow } from "./comfyui-merge.ts";

// ── the engine client as a Cordis Service (stroke 4b,
// DSH-AS-LANGUAGE LAW) ───────────────────────────────────────────
// SERVICE NAME: 'comfyui' (the estate canon's own named exemplar —
// the card plane's ctx.comfyui, "provided once by the host plugin,
// injected by cards", is the shape copied here). RUNTIME key and
// inject spelling are the canon 'comfyui'; the TypeScript property
// spelling ctx.comfyui stays owned by the card plane's augmentation
// (service.ts declares comfyui: ComfyUIService — a
// second augmentation with a different type would be a TS2717 merge
// clash, so this module deliberately declares NONE). Typed access
// is needComfyUI(ctx) below (ctx.get + instanceof + LOUD miswire —
// one cast site; it even catches a card-plane instance stranded on
// the gateway fiber). The gateway fiber provides the host service;
// the card plane's throwaway compose Context provides its own —
// different fibers, same key, never the same registry.
//
// OWNS: the fiber-owned live-prompt map (the retired module ACTIVE
// handle's plugin face — stroke-2 defect class) and the endpoint
// server resolution (lazy once-per-fiber, cached).
//
// CONFIG (each decision documented — the task's init/Config rule):
//   - static provider Config {url?, host?, port?}: the DSH-faithful
//     host/port/url triple (host+port compose to http://host:port
//     when url is absent). Declared as the house schemastery Config
//     shape (image-gen / tutorial-05 pattern — ledger row 17,
//     2026-09-10; the old "schemastery is not a dep" justification
//     was stale — @deepseek-ai/schemastery is declared). parseComfyUI
//     HostConfig resolves through it; trim/slash-strip/empty-string
//     refusals stay hand predicates (schemastery accepts ""), the
//     non-integer port guard stays (no .int() in this version).
//   - explicit Config url wins (operator pin > everything).
//   - COMFYUI_URL env: stays — WALL-PINNED engine truth (the e2e
//     walls boot COMFYUI_URL=stub_url; the card e2e pins :18466).
//   - COMFYUI_ENDPOINT_CONFIG env path: stays — the deploy seam
//     (explicit file pin, read live per resolution).
//   - data/comfyui_endpoint.json url: stays — estate truth (the
//     endpoint machine statement; NO default, NO hardcoded
//     host/port — QUEUE LANE LAW).
//   - INFERENCE_TEST_SANDBOX gate: stays — engine-truth mirror
//     (_config.py: a sandboxed test with no env path resolves to
//     {}, never the product file).
//   - MELITE_REPO_ROOT: stays — the wall fixture seam (fixture
//     repo roots carry no endpoint file -> LOUD ComfyError only
//     when a caller actually submits, never at boot: the TS walls
//     boot fixture repos with no endpoint url, so resolution is
//     LAZY (first use), never at provide time).

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
export const Config: Schema<ComfyUIHostConfig> = Schema.object({
  url: Schema.string(),
  host: Schema.string(),
  port: Schema.number().min(1).max(65535),
});

export function parseComfyUIHostConfig(raw: unknown): ComfyUIHostConfig {
  if (raw === undefined || raw === null) return {};
  const resolved: ComfyUIHostConfig = Config(raw);
  const out: { url?: string; host?: string; port?: number } = {};
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
  private pin: string | null;
  /** Live config source (cookbook setSource sink): the ctor config
   *  until the settings section binds, then the resolved namespace
   *  value (composition base + user layer). */
  private source: () => ComfyUIHostConfig;
  /** Ctor config (resetForTests re-arms the source — in-process
   *  reuse must not hold a disposed settings scope). */
  private readonly ctorConfig: ComfyUIHostConfig;
  /** Lazily resolved server (once per fiber — see resetForTests). */
  private resolved: string | null = null;
  /** Reachability supervisor (the MCP connection pattern, lazy with
   *  the server — fixture boots carry no endpoint, so provide time
   *  must never resolve OR probe). */
  private supervisor: EngineSupervisor | null = null;
  /** Live prompts (run_dir -> handle — the retired module ACTIVE
   *  handle's fiber-owned successor). */
  private readonly prompts: Map<string, ActivePrompt> = new Map();

  constructor(ctx: Context, config: ComfyUIHostConfig = {}) {
    super(ctx, "comfyui");
    this.ctorConfig = config;
    this.source = (): ComfyUIHostConfig => config;
    this.pin = ComfyUIHostService.resolvePin(config);
  }

  /** The Config-triple pin (url wins; host/port compose; neither =
   *  null — env/file fallback). Shared by the ctor and repoint so
   *  the two can never disagree. */
  static resolvePin(config: ComfyUIHostConfig): string | null {
    if (config.url !== undefined) return config.url;
    if (config.host !== undefined || config.port !== undefined) {
      const host: string = config.host ?? "127.0.0.1";
      const port: number = config.port ?? 8188;
      return "http://" + host + ":" + String(port);
    }
    return null;
  }

  /** Cookbook setSource sink: the settings section takes over as
   *  the live config source (no-op when the provider is absent). */
  setSource(source: () => ComfyUIHostConfig): void {
    this.source = source;
  }

  /** Cookbook onChange: re-resolve the pin against the live source.
   *  Unresolved (never used) = swap the pin silently; resolved +
   *  unchanged = no-op; resolved + changed = drop the supervisor so
   *  the next face resolves + probes fresh. In-flight runs keep
   *  their captured server string — a repoint never steers a live
   *  run. Registration calls this once with the entry value (same
   *  pin — the no-op arm). */
  repoint(): void {
    const next: string | null = ComfyUIHostService.resolvePin(this.source());
    if (this.resolved === null) {
      this.pin = next;
      return;
    }
    if (next === this.resolved) return;
    if (this.supervisor !== null) {
      const sup: EngineSupervisor = this.supervisor;
      this.supervisor = null;
      void sup.dispose();
    }
    this.pin = next;
    this.resolved = null;
    this.ctx.logger("comfyui").info(
      "%s",
      "engine repointed to " + (next ?? "(env/file fallback)"),
    );
  }

  /** Test seam: drop the resolved server + supervisor + all
   *  live-prompt handles (walls boot fresh processes; belt-and-
   *  braces for in-process reuse — the RunsService behavior). */
  resetForTests(): void {
    this.resolved = null;
    this.source = (): ComfyUIHostConfig => this.ctorConfig;
    this.pin = ComfyUIHostService.resolvePin(this.ctorConfig);
    if (this.supervisor !== null) {
      const sup: EngineSupervisor = this.supervisor;
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
  baseUrl(): string {
    if (this.resolved !== null) return this.resolved;
    const server: string =
      this.pin !== null ? this.pin : resolveEngineBaseUrl();
    this.resolved = server;
    this.startSupervisor(server);
    return server;
  }

  /** The fiber's supervisor (baseUrl first — a face without a
   *  server is a wiring bug, LOUD like needComfyUI). */
  private sup(): EngineSupervisor {
    if (this.supervisor === null) {
      throw new Error(
        "[comfyui] no supervisor — faces call baseUrl() first " +
          "(lazy with the server; provide time never probes)",
      );
    }
    return this.supervisor;
  }

  private startSupervisor(server: string): void {
    if (this.supervisor !== null) return;
    // Scoped-logger voice (gateway.ts rides ctx.logger the same
    // way — %s-param shape, the message carries engine error text).
    const log = this.ctx.logger("comfyui");
    const sup: EngineSupervisor = new EngineSupervisor({
      probe: (): Promise<void> => {
        return sdkClient(server)
          .getSystemStats()
          .then((): void => undefined);
      },
      label: "comfyui",
      log: {
        info: (m: string): void => {
          log.info("%s", m);
        },
        warn: (m: string): void => {
          log.warn("%s", m);
        },
        // Untestable-by-construction arm (2026-09-12): the
        // supervisor only logs error on re-probe exhaustion (10+
        // consecutive failures) or a disabled policy — neither fits
        // a unit fuse. Warn (down) and info (recovered) ride the
        // battery below.
        /* v8 ignore next */
        error: (m: string): void => {
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
  private async supervised<T>(
    work: () => Promise<T>,
  ): Promise<T> {
    const sup: EngineSupervisor = this.sup();
    await sup.ensureUp();
    try {
      const result: T = await work();
      sup.noteSuccess();
      return result;
    } catch (error: unknown) {
      if (isTransportDownError(error)) sup.noteFailure(error);
      throw error;
    }
  }

  /** Per-stage submit + poll + fetch (the plugin face of
   *  executeSingleInner — same inner, fiber-owned prompts). */
  executeSingle(
    runDir: string,
    nodeParams: Record<string, EngineJson>,
    nodeOutputs: Record<string, EngineJson>,
    opts: ExecuteOpts = {},
  ): Promise<ExecuteResult> {
    const server: string = this.baseUrl();
    return this.supervised(() =>
      executeSingleInner(
        runDir,
        nodeParams,
        nodeOutputs,
        opts,
        server,
        this.prompts,
      )
    );
  }

  /** Merged submit ONCE + tap-less poll + per-stage harvest (the
   *  plugin face of executeFlowInner — the flows-start worker's
   *  path). */
  executeFlow(
    rows: MergeRow[],
    runDir: string,
    inputNames: Record<string, Record<string, string>>,
    initials: Record<string, EngineJson>,
    opts: ExecuteOpts = {},
  ): Promise<FlowResult> {
    const server: string = this.baseUrl();
    // NO WALL HERE (2026-10-10, the operator's law: ON SUBMIT IS A
    // HACK). A check injected at one engine call is a wall someone
    // remembered to build — the missing-import crash was this shape
    // failing, not a missing import. The wiring law lives where
    // every path already walks: the run seat's pre-flight
    // (runsExecute) judges the built rows against the doc BEFORE
    // any action; the card-compose seat judges at compose. This
    // method only transports.
    return this.supervised(() =>
      executeFlowInner(
        rows,
        runDir,
        inputNames,
        initials,
        opts,
        server,
        this.prompts,
      )
    );
  }

  /** Interrupt + dequeue the live prompt for one run dir (the
   *  plugin face of stopForRunDirInner — the flows-stop door's
   *  path). Unknown dir = silent no-op (the flag is the authority,
   *  ). */
  stopForRunDir(runDir: string): Promise<void> {
    return stopForRunDirInner(runDir, this.prompts);
  }

  /** Drop every cached model + the execution cache from VRAM (the
   *  plugin face of unloadModelsInner). */
  unloadModels(): Promise<void> {
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
export const comfyuiHostProvider: Plugin = {
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
  apply(ctx: Context, config?: unknown): void {
    const entry: ComfyUIHostConfig = parseComfyUIHostConfig(config);
    new ComfyUIHostService(ctx, entry);
  },
};

/** Resolve the service for request-path helpers that take it as an
 *  optional trailing param (the stroke-2b shape): an explicit arg
 *  wins. Null = the caller forgot to thread ctx.comfyui — a bug, so
 *  reads throw LOUD (an engine call without an engine is never a
 *  silent module fallback). Door listeners MUST pass
 *  needComfyUI(ctx) (their inject declares 'comfyui'). */
export function needComfyUI(
  ctx: Context,
  where: string,
): ComfyUIHostService {
  const svc: unknown = ctx.get("comfyui");
  if (svc instanceof ComfyUIHostService) return svc;
  throw new Error(
    "[comfyui] no ComfyUIHostService for " + where +
      " — doors inject 'comfyui' and pass needComfyUI(ctx) " +
      "(the manifest's engine-comfyui row provides at boot; a " +
      "card-plane ComfyUIService on this fiber is a miswire)",
  );
}
