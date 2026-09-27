import type { Context } from "@deepseek-ai/cordis";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
/** The manage seat's answer: the SSOT envelope ({action, ok, detail,
 *  data} — a refusal never happens here; the seat THROWS
 *  manage/refused carrying the same envelope in RemoteError
 *  details). */
interface ManageEnvelopeRow {
    readonly action: string;
    readonly ok: boolean;
    readonly detail: string;
    readonly data?: unknown;
}
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
    remoteExportAct(doc: unknown, signal: AbortSignal): Promise<ManageEnvelopeRow>;
}
/** The manage remote row (the estate mounts it after the seat). */
export declare const manageRemotePlugin: {
    name: string;
    inject: readonly ["manage"];
    apply(ctx: Context): void;
};
export {};
//# sourceMappingURL=index.d.ts.map