import type { Context } from "@deepseek-ai/cordis";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import type { ManageActDoc, ManageEnvelopeRow } from "./types.js";
export type { ManageActDoc, ManageEnvelopeRow, ManageJsonValue } from "./types.js";
/** The manage seat's adapter-facing surface (structural — the
 *  implementation is ManageService in @melite/estate-queue; the
 *  wall pins the delegation byte-for-byte). */
interface ManageSeat {
    act(doc: unknown, signal: AbortSignal): Promise<ManageEnvelopeRow>;
}
declare module "@deepseek-ai/cordis" {
    interface Context {
        manageRemote: ManageRemoteService;
        /** The management seat (@melite/estate-queue's ManageService —
         *  structural here, per the header). */
        manage: ManageSeat;
    }
}
/** The manage remote: one act over the manage seat. */
export declare class ManageRemoteService extends TypertRemoteService {
    static inject: string[];
    constructor(ctx: Context);
    /** Endpoint `manage/act` — the whole management plane (the
     *  action rides the doc; the seat dispatches). */
    remoteExportAct(doc: ManageActDoc, signal: AbortSignal): Promise<ManageEnvelopeRow>;
}
/** The manage remote row (the estate mounts it after the seat). */
export declare const manageRemotePlugin: {
    name: string;
    inject: readonly ["manage"];
    apply(ctx: Context): void;
};
//# sourceMappingURL=index.d.ts.map
