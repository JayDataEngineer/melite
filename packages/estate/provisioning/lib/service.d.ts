import { Service } from "@deepseek-ai/cordis";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import { type ActivateOptions, type EnsureOptions, type ExternalProvisionRequest, type ProvisionOperation, type ProvisionPlan, type ProvisionResult, type ProvisionState, type ResourceRef, type ResourceStatus } from "./contracts.js";
import type { ProvisioningConfig, ProvisioningServiceDefinition } from "./ports.js";
export declare class ProvisioningService extends Service implements ProvisioningServiceDefinition {
    private readonly declaration;
    private readonly writer;
    private readonly writerRoot;
    private readonly fetcher;
    private readonly manager;
    private readonly inspector;
    private readonly lifecycle;
    private readonly operationStore;
    private readonly writeGuard;
    private readonly operationIdFactory;
    private readonly records;
    private readonly locks;
    constructor(ctx: Context, config: ProvisioningConfig);
    stateOf(ref: ResourceRef): ProvisionState;
    operationOf(ref: ResourceRef): ProvisionOperation | undefined;
    transitionsOf(ref: ResourceRef): readonly ProvisionState[];
    isLocked(ref: ResourceRef): boolean;
    plan(ref: ResourceRef): Promise<ProvisionPlan>;
    inspect(ref: ResourceRef, signal?: AbortSignal): Promise<ResourceStatus>;
    ensure(ref: ResourceRef, options?: EnsureOptions, signal?: AbortSignal): Promise<ProvisionResult>;
    activate(ref: ResourceRef, options?: ActivateOptions, signal?: AbortSignal): Promise<ProvisionResult>;
    acquireExternal(request: ExternalProvisionRequest, options?: {
        readonly operatorConfirmed: boolean;
        readonly force?: boolean;
    }, signal?: AbortSignal): Promise<ProvisionResult>;
    reconcile(ref?: ResourceRef, signal?: AbortSignal): Promise<ResourceStatus[]>;
    private executeEnsure;
    private acquirePlanItem;
    private acquireModel;
    private activateExtension;
    private inspectPlanItem;
    private begin;
    private complete;
    private failureResult;
    private blockedResult;
    private statusFromResult;
    private record;
    private move;
    private persist;
    private runLocked;
    private joinLocked;
    private cancelledJoinResult;
    private completeUnstarted;
}
export declare const name = "provisioning";
export declare function apply(ctx: Context, config: ProvisioningConfig): void;
export declare const provisioningProvider: Plugin;
export declare const provisioningContract: Plugin.Object<any>;
export declare const provisioningPlugin: Plugin.Object<any>;
declare module "@deepseek-ai/cordis" {
    interface Context {
        provisioning: ProvisioningService;
    }
}
export default provisioningProvider;
//# sourceMappingURL=service.d.ts.map
