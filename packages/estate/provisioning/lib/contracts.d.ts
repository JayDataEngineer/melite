export type ResourceOwner = "family" | "card";
export interface ModelResourceRef {
    readonly kind: "model";
    readonly owner: ResourceOwner;
    readonly id: string;
    readonly variant?: string;
    readonly quant?: string;
}
export interface ExtensionResourceRef {
    readonly kind: "extension";
    readonly id: string;
}
export type ResourceRef = ModelResourceRef | ExtensionResourceRef;
export declare const PROVISION_STATES: readonly ["unknown", "absent", "acquiring", "verifying", "installed", "restart_required", "active", "failed", "blocked"];
export type ProvisionState = (typeof PROVISION_STATES)[number];
export declare const PROVISION_OUTCOMES: readonly ["active", "restart_required", "partial", "failed", "cancelled", "blocked"];
export type ProvisionOutcome = (typeof PROVISION_OUTCOMES)[number];
export interface ModelProvisionPlanItem {
    readonly kind: "model";
    readonly key: string;
    readonly owner: ResourceOwner;
    readonly id: string;
    readonly name: string;
    readonly folder: string;
    readonly url: string;
    readonly sha256?: string;
    readonly sizeBytes?: number;
    readonly required: boolean;
    readonly provider: string;
    readonly variant?: string;
    readonly quant?: string;
}
export interface ExtensionProvisionPlanItem {
    readonly kind: "extension";
    readonly key: string;
    readonly id: string;
    readonly url?: string;
    readonly required: boolean;
    readonly provider: string;
    readonly ref?: string;
    readonly version?: string;
    readonly registry?: string;
    readonly requirements?: readonly string[];
    readonly nodeTypes?: readonly string[];
}
export type ProvisionPlanItem = ModelProvisionPlanItem | ExtensionProvisionPlanItem;
export interface ProvisionPlan {
    readonly ref: ResourceRef;
    readonly items: readonly ProvisionPlanItem[];
}
export interface ResourceStatusItem {
    readonly key: string;
    readonly kind: "model" | "extension";
    readonly state: ProvisionState;
    readonly path?: string;
    readonly sha256?: string;
    readonly integrity?: "declared-sha256" | "operator-unverified";
    readonly errorCode?: string;
    readonly detail?: string;
}
export interface ResourceStatus {
    readonly ref: ResourceRef;
    readonly state: ProvisionState;
    readonly operationId?: string;
    readonly items: readonly ResourceStatusItem[];
    readonly detail?: string;
}
export interface ProvisionItemResult extends ResourceStatusItem {
    readonly outcome: ProvisionOutcome;
}
export interface ProvisionResult {
    readonly operationId: string;
    readonly ref: ResourceRef;
    readonly state: ProvisionOutcome;
    readonly outcome: ProvisionOutcome;
    readonly operationState: ProvisionState;
    readonly items: readonly ProvisionItemResult[];
    readonly restartRequired: boolean;
    readonly detail?: string;
}
export interface ProvisionOperation {
    readonly operationId: string;
    readonly ref: ResourceRef;
    readonly state: ProvisionState;
    readonly items: readonly ResourceStatusItem[];
    readonly outcome?: ProvisionOutcome;
    readonly startedAt: number;
    readonly finishedAt?: number;
    readonly detail?: string;
}
export interface EnsureOptions {
    readonly items?: readonly string[];
    readonly activate?: boolean;
    readonly activateIfIdle?: boolean;
    readonly force?: boolean;
}
export interface ActivateOptions {
    readonly force?: boolean;
    readonly ifIdle?: boolean;
}
export interface ExternalOptions {
    readonly operatorConfirmed: boolean;
    readonly force?: boolean;
}
export interface ExternalModelProvisionRequest {
    readonly kind: "model";
    readonly url: string;
    readonly relativePath?: string;
    readonly filename?: string;
    readonly sha256?: string;
    readonly sizeBytes?: number;
}
export interface ExternalExtensionProvisionRequest {
    readonly kind: "extension";
    readonly url: string;
    readonly ref?: string;
}
export type ExternalProvisionRequest = ExternalModelProvisionRequest | ExternalExtensionProvisionRequest;
export declare function resourceKey(ref: ResourceRef): string;
export declare function sameResourceRef(left: ResourceRef, right: ResourceRef): boolean;
/**
 * THE PROVIDER VOCABULARY (2026-10-10, the MCP/media audit's C4).
 *
 * The plan's `provider` is a PROTOCOL TOKEN, and the estate writes
 * four of them ("direct", "git", "manager", "local") — but the
 * service dispatched on ONE (`provider === "local"`), so a "git" or
 * "direct" item silently fell into the Manager path: an extension
 * declared with a git URL went to ComfyUI-Manager, and on a lane
 * with no Manager it refused `manager/unavailable` while a git
 * provider sat right there. A token with no arm is not a default —
 * it is a refusal, by name.
 *
 * The vocabulary is closed here, and each arm below is implemented or
 * refused BY NAME. Adding a token means adding an arm, and the wall
 * (provision-contracts.spec.ts) fails when a plan names one the
 * service has no arm for.
 */
export declare const PROVISION_PROVIDERS: readonly ["local", "manager", "git", "direct", "external"];
export type ProvisionProvider = (typeof PROVISION_PROVIDERS)[number];
/** Is this a provider the vocabulary admits? */
export declare function providerOk(name: string): name is ProvisionProvider;
/** The refusal a plan item earns by naming a provider the service
 *  cannot honour — the honest voice for "this token has no arm". */
export declare function unknownProviderRefusal(name: string): string;
//# sourceMappingURL=contracts.d.ts.map
