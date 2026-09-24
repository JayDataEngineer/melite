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

export const PROVISION_STATES = [
  "unknown",
  "absent",
  "acquiring",
  "verifying",
  "installed",
  "restart_required",
  "active",
  "failed",
  "blocked",
] as const;

export type ProvisionState = (typeof PROVISION_STATES)[number];

export const PROVISION_OUTCOMES = [
  "active",
  "restart_required",
  "partial",
  "failed",
  "cancelled",
  "blocked",
] as const;

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
  readonly url: string;
  readonly required: boolean;
  readonly provider: string;
  readonly ref?: string;
  readonly version?: string;
  readonly registry?: string;
  readonly requirements?: readonly string[];
  readonly nodeTypes?: readonly string[];
}

export type ProvisionPlanItem =
  | ModelProvisionPlanItem
  | ExtensionProvisionPlanItem;

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

export type ExternalProvisionRequest =
  | ExternalModelProvisionRequest
  | ExternalExtensionProvisionRequest;

export function resourceKey(ref: ResourceRef): string {
  if (ref.kind === "extension") {
    return JSON.stringify(["extension", ref.id]);
  }
  return JSON.stringify([
    "model",
    ref.owner,
    ref.id,
    ref.variant ?? null,
    ref.quant ?? null,
  ]);
}

export function sameResourceRef(left: ResourceRef, right: ResourceRef): boolean {
  return resourceKey(left) === resourceKey(right);
}
