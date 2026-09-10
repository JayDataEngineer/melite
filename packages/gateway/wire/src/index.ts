// THE WIRE ADOPTION — P1 pilot (docs/CONFORMANCE_LEDGER.md § "THE
// WIRE ADOPTION", operator decision 2026-09-10).
//
// This package owns the estate's Typert Remote services: business
// methods exposed to DSH clients over the Connection transport
// (POST /api/<namespace>/<method>, one trust fence at the route,
// cooperative cancellation by trailing AbortSignal — the shapes the
// api-gateway.md reference describes). Composition rows live in the
// shell leaf (packages/gateway/shell/cordis.yml): typert registry →
// typert gateway → connection → this plugin.
//
// WHY THIS PACKAGE IS COMPILED (tsconfig.json → lib/): @Remote is a
// stage-3 method decorator; node --experimental-strip-types cannot
// parse decorator syntax, and the marker table it feeds is
// deliberately module-private (no sanctioned imperative form). DSH's
// own typert faces are build products, so the wire package builds
// with tsc and the manifest imports lib/. The rest of the gateway
// stays source-run — this is the one face where the DSH shape
// REQUIRES a build artifact.
//
// SERVICE KEY vs NAMESPACE: the registry service key `runs` is taken
// (RunsService — ctx.runs, flowsRun.ts). TypertRemoteService binds
// serviceKey AND default namespace to one name; the options form
// keeps the wire namespace canonical (`runs/status` endpoint) while
// the Cordis seat is `runsRemote` (ctx.runsRemote). Documented here
// because the split is invisible at the call site.
//
// PILOT SCOPE (Law 2 small stroke): exactly one READ-ONLY method —
// runs status lookup. No mutation, no streaming, no lookups (the
// method takes a plain string, so no TypertLookupMap/session
// controller is composed). Widening the surface is a later stroke
// with its own ledger row; the /v1 Fetch doors stay untouched.
import { type Context, type Plugin } from "@deepseek-ai/cordis";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { BenchRemoteService, DraftsRemoteService } from "./remotes-kv.js";
import * as remotesKv from "./remotes-kv.js";

/**
 * Structural read view of the runs registry service. The doors'
 * `declare module` Context merge cannot cross the compiled/source
 * boundary this package sits on (its type-only import would drag the
 * entire source-run doors tree into tsc), so the wire package states
 * the fields it actually reads and narrows with a runtime guard —
 * never a cast. Drift is pinned by the wire wall suite, which feeds a
 * real RunRecord through the service and asserts the served row.
 */
interface RunsRegistryRead {
  runs: Map<string, { status: string }>;
}

/** Guard: the registry face this method depends on (Map seat with
 * status-carrying rows). Guards the READ shape, not the full record. */
function isRunsRegistry(value: unknown): value is RunsRegistryRead {
  if (typeof value !== "object" || value === null) return false;
  const runs: unknown = Reflect.get(value, "runs");
  if (!(runs instanceof Map)) return false;
  for (const row of runs.values()) {
    if (typeof row !== "object" || row === null) return false;
    if (typeof Reflect.get(row, "status") !== "string") return false;
  }
  return true;
}

/** Wire result for runs/status (pilot row: run_id + registry truth). */
export interface RunStatusResult {
  run_id: string;
  known: boolean;
  status: string | null;
}

// The Context seat (house law: every service declares its merge —
// AND the typertGateway's SRC claim walk reads ctx.reflect.props,
// the DECLARED property table; without this merge the endpoint is
// never claimed and /api/runs/status 404s at the transport).
declare module "@deepseek-ai/cordis" {
  interface Context {
    runsRemote: RunsRemoteService;
  }
}

/** Typert Remote face over the runs registry (SRC descriptors: the
 * Gateway's source-mode discovery walks ctx.reflect.props for the
 * typertRemote binding — no generated artifacts needed host-side). */
export class RunsRemoteService extends TypertRemoteService {
  constructor(ctx: Context) {
    super(ctx, "runsRemote", { namespace: "runs" });
  }

  /** Endpoint `runs/status` — read-only registry probe. Per-call
   * resolution through ctx.get (the rule-4 shape: restart-robust,
   * LOUD on miswire — a registry that is absent or shape-shifted
   * serves `known: false`, never a fabricated status). */
  @Remote("status")
  statusForClient(run_id: string, signal: AbortSignal): RunStatusResult {
    signal.throwIfAborted();
    const svc: unknown = this.ctx.get("runs");
    const run = isRunsRegistry(svc) ? svc.runs.get(run_id) : undefined;
    return {
      run_id,
      known: run !== undefined,
      status: run?.status ?? null,
    };
  }

  /** runs/list — the archive listing (R2: the media panel's runs
   *  lane rides this remote; the /v1 door stays until R5 deletes
   *  it). Late-bound domain calls, same late-bind law as the KV
   *  remotes in remotes-kv.ts. */
  /** lane — EVERY estate lane over one method (R4): the browser
   *  faces (studios, deck tabs, gallery) call the same door
   *  listeners the route rows wrap, in-process behind the gateway.
   *  Named remotes may specialize later; this one retires the
   *  same-origin /v1 fetches wholesale. */
  @Remote("lane")
  async lane(method: string, path: string, body: unknown, signal: AbortSignal): Promise<unknown> {
    signal.throwIfAborted();
    const DOORS = "@melite/gateway-doors";
    const doors = await import(DOORS) as unknown as {
      callEstateLane(ctx: unknown, method: string, path: string, body: unknown): Promise<{ status: number; body: unknown } | undefined>;
    };
    const out = await doors.callEstateLane(this.ctx, method, path, body);
    if (out === undefined) throw new Error("no estate lane claims " + method + " " + path);
    if (out.status >= 200 && out.status < 300) return out.body;
    throw new Error("estate lane " + method + " " + path + " answered " + String(out.status));
  }

  @Remote("list")
  async list(limit: number, signal: AbortSignal): Promise<unknown> {
    signal.throwIfAborted();
    const runs = await remotesKv.loadRuns();
    const shell = await remotesKv.loadShell();
    const out = await runs.hRunsList(
      { limit: [String(limit)] },
      shell.defaultAssetRoots(),
      (): boolean => false,
    );
    if (out.status >= 200 && out.status < 300) return out.body;
    throw new Error(JSON.stringify(out.body));
  }
}

/** Provider plugin (manifest row `gateway-wire`): owns the Remote
 * service lifetime (the runsRegistry provider shape — the Service
 * constructor self-registers on the plugin's fiber; disposal
 * cascades). The typertGateway claims the endpoint through the SRC
 * walk the moment the service is live. */
export const gatewayWire: Plugin = {
  name: "gateway-wire",
  apply(ctx: Context): void {
    new RunsRemoteService(ctx);
    new DraftsRemoteService(ctx);
    new BenchRemoteService(ctx);
  },
};

export default gatewayWire;
