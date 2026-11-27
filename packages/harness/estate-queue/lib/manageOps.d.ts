import { ManagerApiError } from "./managerRail.js";
import { Refused } from "./managePlane.js";
import type { ManageCtx, ManageEnvelope, Req } from "./managePlane.js";
export declare function base(ctx: ManageCtx): string;
/** Map a manager refusal to the estate envelope (the vendor's own
 *  security texts ride verbatim — this door never reinterprets a
 *  security answer). */
export declare function mapManagerRefused(e: ManagerApiError, action: string): Refused;
/** Map a rail failure to its refusal: the rail throws ManagerApiError
 *  by contract (refusals verbatim, transports as the 503 template),
 *  so the fallthrough only guards the type, never a live error. */
export declare function mapRail(e: unknown, action: string): Refused;
export declare function railMs(req: Req): number;
/** Poll the vendor's task queue until drained (install arms: the
 *  vendor returns 202-semantics — queue accepted — and processes
 *  asynchronously; the poll bounds the AI door's wait). */
export declare function awaitQueueDrained(ctx: ManageCtx, req: Req): Promise<Record<string, unknown>>;
/** BYO guard: estate-orchestration legs (systemd, workspace reads)
 *  never touch a user-owned ComfyUI. */
export declare function estateOnly(req: Req, cfg: Record<string, unknown>): void;
/** Run systemctl for the estate's engine unit.
 * @param req - the manage request (envelope rows).
 * @param verb - the systemctl verb to run.
 * @param unit - the estate deployment's systemd unit (config-pinned).
 * @param signal - aborts the child and maps to the abort reason.
 * @returns [status, envelope] as the manage lane's answer.
 */
export declare function systemctl(req: Req, verb: "start" | "stop", unit: string, signal?: AbortSignal): Promise<[number, ManageEnvelope]>;
export declare function guardLifecycle(req: Req, ctx: ManageCtx): void;
/** THE QUIET LAW (B4, 2026-11-27) — the machine-wide half of the
 *  teardown guard: the lifecycle guard above reads ONE lane's run
 *  sidecars; this half reads the ENGINE's own queue, where every
 *  lane's press is a row. A teardown door (restart, stop) waits
 *  inside its rail budget for a queue that is empty and STAYS empty
 *  for the ctx's quiet window (a film between two windows reads
 *  empty for seconds — one empty reading tears it), then tears; a
 *  queue that never goes quiet refuses, naming the rows it waited
 *  on. `force` is the operator's override and skips the wait exactly
 *  as it skips the lifecycle guard — never a lane's default.
 *  @param req - the manage request (the rail budget + force).
 *  @param ctx - the manage context (endpoint + timer seat + the
 *  quiet window).
 *  @param action - the teardown door's own verb, for the refusal. */
export declare function quietOrRefuse(req: Req, ctx: ManageCtx, action: "restart" | "stop"): Promise<void>;
//# sourceMappingURL=manageOps.d.ts.map
