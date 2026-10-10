import type { CardRegistryLike, Flow, FlowsValidateAnswer, GraphNode } from "./runsValidateShared.ts";
export declare function prunedFor(flow: Flow, body: Record<string, unknown>, cards?: CardRegistryLike | null): {
    flow: Flow;
    pruned: string[];
};
export declare function toGraph(flow: Flow): GraphNode[];
export declare function dollarTokens(params: unknown): string[];
export declare function compileFlow(flow: Flow, body: Record<string, unknown>, cards?: CardRegistryLike | null): {
    nodes: GraphNode[];
    skipped: string[];
};
export declare function costPreview(engineTypes: string[]): Record<string, unknown>;
export declare function inlineArm(full: unknown, cards?: CardRegistryLike | null): FlowsValidateAnswer;
export declare function serveSubject(subject: unknown, fullRec: Record<string, unknown>, cards?: CardRegistryLike | null): FlowsValidateAnswer;
//# sourceMappingURL=runsValidateServe.d.ts.map