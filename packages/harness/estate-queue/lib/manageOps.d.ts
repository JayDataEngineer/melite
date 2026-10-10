import { ManagerApiError } from "./managerRail.ts";
import { Refused } from "./managePlane.ts";
import type { ManageCtx, ManageEnvelope, Req } from "./managePlane.ts";
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
//# sourceMappingURL=manageOps.d.ts.map