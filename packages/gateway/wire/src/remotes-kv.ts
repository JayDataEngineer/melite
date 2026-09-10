// drafts + bench remotes — R1 of the remotes migration
// (docs/plans/estate-collapse-2026-09-10.md §THE MAP).
//
// The KV faces stop being HTTP doors: the SAME exported domain
// handlers the doors call (gateway-doors hDraftsList/hDraftsGet/
// hBenchGet/hBenchEnsure — unchanged, 1:1) now serve as Typert
// Remote methods on Connection's /api transport. The browser calls
// ctx.remote.drafts.* / ctx.remote.bench.* (dsh-api-gateway/client);
// host-side callers use the ctx seats in-process. Argument/result
// validation, cancellation, and error envelopes are the Gateway's
// (dsh-api-gateway README: dispatch, validation, cancellation,
// reconnection — owned by DSH, never re-implemented here).
//
// COMPILE DISCIPLINE (the pilot's law): this package EMITS lib/
// (decorators are not strippable), so it must not statically import
// the source-run doors/core tree — a static import would drag every
// .ts-suffixed module into tsc. The doors' functions arrive through a
// LATE dynamic import behind a narrow structural interface (the
// RunsRegistryRead discipline: state the fields read, never a cast).
import { type Context } from "@deepseek-ai/cordis";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";

/** One door envelope (status + decoded JSON body). */
interface DoorOut {
  status: number;
  body: unknown;
}

/** The late-bound doors module: exactly the four functions used. */
interface DoorOutFull {
  status: number;
  body: unknown;
  contentType: string;
  headers: Record<string, string>;
}

interface RunsFace {
  hRunsList(
    qs: Record<string, string[]>,
    roots: unknown,
    hasDraft: (draftId: string) => boolean,
    assets?: unknown,
  ): Promise<DoorOutFull>;
  hRunDetail(runId: string, roots: unknown): DoorOutFull;
}

interface ShellFace {
  defaultAssetRoots(): unknown;
}

interface DoorsFace {
  hDraftsList(domain: unknown): DoorOut;
  hDraftsGet(domain: unknown, draftId: string): DoorOut;
  hBenchGet(domain: unknown, session: string): DoorOut;
  hBenchEnsure(domain: unknown, rawBody: Uint8Array): Promise<DoorOut>;
}

/** The late-bound core module: the domain accessor. */
interface CoreFace {
  getDraftsDomain(ctx: Context): Promise<unknown>;
}

/** Loaded once per process (the plugin's own lifetime). */
let doorsP: Promise<DoorsFace> | undefined;
let coreP: Promise<CoreFace> | undefined;

// The specifiers are NON-LITERAL on purpose: a literal dynamic
// import still enters the tsc program (and drags the .ts-suffixed
// source graph behind it). A variable specifier is late-bound for
// the compiler and resolves normally for node at runtime.
const DOORS_SPEC = "@melite/gateway-doors";
const CORE_SPEC = "@melite/gateway-core";

function loadDoors(): Promise<DoorsFace> {
  doorsP ??= import(DOORS_SPEC) as unknown as Promise<DoorsFace>;
  return doorsP;
}

let runsP: Promise<RunsFace> | undefined;
let shellP: Promise<ShellFace> | undefined;
const RUNS_SPEC = "@melite/gateway-doors";
const SHELL_SPEC = "@melite/gateway-doors";

export function loadRuns(): Promise<RunsFace> {
  runsP ??= import(RUNS_SPEC) as unknown as Promise<RunsFace>;
  return runsP;
}

export function loadShell(): Promise<ShellFace> {
  shellP ??= import(SHELL_SPEC) as unknown as Promise<ShellFace>;
  return shellP;
}

function loadCore(): Promise<CoreFace> {
  coreP ??= import(CORE_SPEC) as unknown as Promise<CoreFace>;
  return coreP;
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    draftsRemote: DraftsRemoteService;
    benchRemote: BenchRemoteService;
  }
}

/** Unwrap a door envelope into a remote result: 2xx body passes, any
 * refusal throws with the door's own error text (the body verbatim —
 * the same law gatewayRequest carried over HTTP). */
function unwrap(status: number, body: unknown): unknown {
  if (status >= 200 && status < 300) return body;
  const err =
    typeof body === "object" && body !== null && "error" in body
      ? String((body as { error: unknown }).error)
      : JSON.stringify(body);
  throw new Error(err);
}

/** The drafts KV face (R1: list + get — the panel reads; the save
 * verb widens the surface when its consumer migrates). */
export class DraftsRemoteService extends TypertRemoteService {
  constructor(ctx: Context) {
    super(ctx, "draftsRemote", { namespace: "drafts" });
  }

  /** drafts/list — the recency-DESC index (cap 600, count pre-cap). */
  @Remote("list")
  async list(signal: AbortSignal): Promise<unknown> {
    signal.throwIfAborted();
    const [doors, core] = await Promise.all([loadDoors(), loadCore()]);
    const domain = await core.getDraftsDomain(this.ctx);
    const out = doors.hDraftsList(domain);
    return unwrap(out.status, out.body);
  }

  /** drafts/get — one draft doc by id. */
  @Remote("get")
  async get(draft_id: string, signal: AbortSignal): Promise<unknown> {
    signal.throwIfAborted();
    const [doors, core] = await Promise.all([loadDoors(), loadCore()]);
    const domain = await core.getDraftsDomain(this.ctx);
    const out = doors.hDraftsGet(domain, draft_id);
    return unwrap(out.status, out.body);
  }
}

/** The bench KV face (R1: get + ensure — the bench-load gesture's
 * exact two verbs). */
export class BenchRemoteService extends TypertRemoteService {
  constructor(ctx: Context) {
    super(ctx, "benchRemote", { namespace: "bench" });
  }

  /** bench/get — one session's bench block as the served row. */
  @Remote("get")
  async get(session: string, signal: AbortSignal): Promise<unknown> {
    signal.throwIfAborted();
    const [doors, core] = await Promise.all([loadDoors(), loadCore()]);
    const domain = await core.getDraftsDomain(this.ctx);
    const out = doors.hBenchGet(domain, session);
    return unwrap(out.status, out.body);
  }

  /** bench/ensure — create-if-absent / stage-replace-if-present. The
   * handler's body contract is unchanged (JSON bytes), so the decoded
   * remote argument is re-encoded once — the domain law stays 1:1. */
  @Remote("ensure")
  async ensure(doc: Record<string, unknown>, signal: AbortSignal): Promise<unknown> {
    signal.throwIfAborted();
    const [doors, core] = await Promise.all([loadDoors(), loadCore()]);
    const domain = await core.getDraftsDomain(this.ctx);
    const raw = new TextEncoder().encode(JSON.stringify({ doc }));
    const out = await doors.hBenchEnsure(domain, raw);
    return unwrap(out.status, out.body);
  }
}
