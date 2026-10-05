import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
import type { ManageEnvelope } from "./managePlane.js";
declare module "@deepseek-ai/dsh-typert-protocol" {
    interface RemoteErrorDetailsMap {
        /** A refused manage envelope — the details CARRY the envelope
         *  (action/status/data) so the tool surfaces WHY. */
        "manage/refused": {
            readonly action?: string;
            readonly status?: number;
            readonly code?: string;
            readonly data?: unknown;
        };
    }
}
export declare class ManageGatewayService extends Service {
    static inject: string[];
    constructor(ctx: Context);
    /** The one entry: the tools' /v1/manage lane. */
    act(doc: unknown, signal: AbortSignal): Promise<ManageEnvelope>;
}
/** The manage row: gates on the timer seat (the rail's timeouts). */
export declare const manageProvider: {
    name: string;
    inject: readonly ["timer"];
    apply(ctx: Context): void;
};
//# sourceMappingURL=manageRegistry.d.ts.map
