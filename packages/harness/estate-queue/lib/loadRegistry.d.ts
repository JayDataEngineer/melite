import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
export declare class LoadResolverService extends Service {
    static inject: string[];
    constructor(ctx: Context);
    /** GET /v1/load?inference_type=card|flow&name=<n> — the bundle.
     *  The door's parameter law rides verbatim: inference_type must
     *  be card|flow (nothing else executes), name is required. */
    load(inferenceType: string, name: string): Record<string, unknown>;
}
/** The load row: gates on the card registry seat. */
export declare const loadProvider: {
    name: string;
    inject: readonly ["cardRegistry"];
    apply(ctx: Context): void;
};
declare module "@deepseek-ai/cordis" {
    interface Context {
        load: LoadResolverService;
    }
}
//# sourceMappingURL=loadRegistry.d.ts.map
