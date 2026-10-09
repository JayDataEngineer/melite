import type { ModelsService } from "@melite/comfyui-cordis";
import type { ProvisioningServiceDefinition } from "@melite/estate-provisioning";
export declare const ACTIONS: readonly ["status", "endpoint_set", "logs", "search_models", "list_extensions", "snapshot_list", "install_extension", "install_extension_url", "download_model", "provision_model", "acquire_weight", "restart", "stop", "launch", "update", "switch_version", "free", "snapshot_save", "snapshot_restore", "lora_list", "lora_install"];
export type ManageAction = (typeof ACTIONS)[number];
export declare const LIFECYCLE_GUARDED: ReadonlySet<ManageAction>;
export interface ManageEnvelope {
    action: string;
    ok: boolean;
    detail: string;
    data?: unknown;
    status?: number;
    code?: string;
    state?: string;
    next_action?: string;
    operation_id?: string;
    operations?: unknown[];
    items?: unknown[];
    rows?: unknown[];
    requested?: string[];
    succeeded?: string[];
    missed?: string[];
    misses?: string[];
    partial?: boolean;
    restart_required?: boolean;
}
export interface ManageCtx {
    /** File-anchored repo root (routing, catalog, runs scan anchor). */
    repoRoot: string;
    /** The §23 cross-roots manifest (own state root first, then the
     *  stateRoots config extras): the runs-probe rows (restart
     *  guard, status) walk these trees — one law from the queue
     *  seat, never the retired env seam (J12). */
    stateRoots: readonly string[];
    /** The estate deployment's systemd unit (V7 cure: the manage
     *  provider's config field — systemctl/journalctl/status rows all
     *  read this one value, never an import-time env capture). */
    comfyUnit: string;
    /** The endpoint config, re-read per call (fresh — never cached
     *  between calls): carries the engine url the manager rail rides.
     *  The bridges door passes loadEndpointConfig itself. */
    endpoint: () => Record<string, unknown>;
    /** The models catalog (stroke 4a: injected by the bridges door
     *  from the engine-model-catalog provider row — required, never
     *  optional: a door without its catalog is a miswire, and the
     *  type error at the construction site is the loudest refusal). */
    models: ModelsService;
    /**
     * The Cordis provisioning seat — OPTIONAL, and the type finally says
     * so (2026-09-26). It was declared required while the construction
     * site cast an unchecked `ctx.get("provisioning")`, and nine call
     * sites dereferenced it ungated. On a lane that does not mount the
     * provisioning composition (proved live on a maker lane: the status
     * door answered with `resources_detail: Cannot read properties of
     * undefined (reading 'reconcile')` — a raw TypeError laundered into
     * a status field), every one of those was a crash dressed as data.
     *
     * ABSENCE IS NOT AN ERROR for the read arms (status reports the
     * absence in words and answers everything else) and it IS a loud 503
     * for the mutation arms (there is nothing to mutate through). Both go
     * through `provisioningOf`.
     */
    provisioning?: ProvisioningServiceDefinition;
    /** The timer-service seat (ctx.timeout from the door's Cordis
     *  context — cordis-plugin-timer): REQUIRED so a library caller
     *  can never silently fall back to a bare setTimeout (the
     *  conformance stroke 2026-09-10). */
    timeout: (callback: () => void, delay: number) => () => void;
    signal?: AbortSignal;
    /** THE ENGINE-TRUTH SEAM (2026-09-26, the LoRA doors): the WHOLE
     *  node-definitions document, exactly what the estate's
     *  `liveObjectInfo` returns (cached per engine, refuses closed on a
     *  malformed body). Absent = that reader; present = a caller's
     *  stand-in, which is how these walls prove the engine's answer
     *  without a live engine and without a second spelling of the
     *  truth. The seam is the reader, not one node: a stand-in that
     *  answered a single node would be a different contract. */
    objectInfo?: () => Promise<unknown>;
}
/** THE PROVISIONING SEAT GATE (2026-09-26). One accessor, both
 *  postures, no unguated dereference left in the plane:
 *
 *  - `provisioningOf` — for the MUTATION arms. An absent seat is a
 *    503 in the door's own vocabulary, naming the row that mounts it,
 *    because "install what?" has no answer without a provisioner and a
 *    TypeError is not an answer.
 *  - `provisioningOrAbsent` — for the READ arms. Status still answers;
 *    the resources section reports the absence in words and every other
 *    section (endpoint, manager, versions, active runs, routing) is
 *    unaffected. A status door that dies because one optional seat is
 *    missing cannot tell the operator anything at all.
 */
export declare function provisioningOf(ctx: ManageCtx): ProvisioningServiceDefinition;
export declare function provisioningOrAbsent(ctx: ManageCtx): ProvisioningServiceDefinition | undefined;
export interface Req {
    action: ManageAction;
    nodes: string[];
    url: string;
    relative_path: string;
    filename: string;
    wait: boolean | null;
    timeout_seconds: number;
    model: string;
    variant: string;
    quant: string;
    tail: number;
    query: string;
    version: string;
    target: string;
    extra_args: string[];
    force: boolean;
    snapshot: string;
    path: string;
    data: string;
    families: string[];
    /** THE ACQUIRE-WEIGHT POLL KEY (F9 run-press acquisition): the
     *  tracker's poll carries ONLY this — the start carries the model
     *  (plus the missing file for display, via filename) and returns
     *  this id at once. */
    operation_id: string;
}
export declare class Refused extends Error {
    data?: unknown;
    constructor(code: number, message: string, data?: unknown);
    code: number;
}
export declare const badRequest: (m: string) => Refused;
export declare function parseReq(doc: unknown): Req;
export declare function dispatchManage(doc: unknown, ctx: ManageCtx, signal?: AbortSignal): Promise<[number, ManageEnvelope]>;
//# sourceMappingURL=managePlane.d.ts.map
