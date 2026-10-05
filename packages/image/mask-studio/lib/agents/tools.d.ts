import type { Context } from "@deepseek-ai/cordis";
/** Wire the estate context (the serving door calls this at mount). */
export declare function bindEstate(ctx: Context): void;
/** Pre-flight: the form spec for a model route (fields + defaults). */
export declare function getFlowSpec(route?: string, signal?: AbortSignal): Promise<Record<string, unknown>>;
/** Poll a running generation — brick progress + the output artifacts. */
export declare function getRunStatus(runId: string, signal?: AbortSignal): Promise<Record<string, unknown>>;
export interface MaskRunArgs {
    route?: string;
    input_image?: string;
    prompt?: string;
    detect_mode?: string;
    detection_threshold?: number;
    sam_threshold?: number;
    sam_dilation?: number;
    export_face?: boolean;
    export_hands?: boolean;
    export_body?: boolean;
    export_paint?: boolean;
    outputs?: Record<string, unknown>[];
    [key: string]: unknown;
}
/** Submit a mask-studio run through the ONE run door (shape 2). */
export declare function submitMaskRun(args: MaskRunArgs, signal?: AbortSignal): Promise<Record<string, unknown>>;
export interface BundleToolSpec {
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
    call: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
}
export declare const TOOLS: BundleToolSpec[];
//# sourceMappingURL=tools.d.ts.map
