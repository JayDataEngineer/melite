import { type Context, type Plugin } from "@deepseek-ai/cordis";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
/** Wire result for runs/status (pilot row: run_id + registry truth). */
export interface RunStatusResult {
    run_id: string;
    known: boolean;
    status: string | null;
}
declare module "@deepseek-ai/cordis" {
    interface Context {
        runsRemote: RunsRemoteService;
    }
}
/** Typert Remote face over the runs registry (SRC descriptors: the
 * Gateway's source-mode discovery walks ctx.reflect.props for the
 * typertRemote binding — no generated artifacts needed host-side). */
export declare class RunsRemoteService extends TypertRemoteService {
    constructor(ctx: Context);
    /** Endpoint `runs/status` — read-only registry probe. Per-call
     * resolution through ctx.get (the rule-4 shape: restart-robust,
     * LOUD on miswire — a registry that is absent or shape-shifted
     * serves `known: false`, never a fabricated status). */
    statusForClient(run_id: string, signal: AbortSignal): RunStatusResult;
    /** runs/list — the archive listing (R2: the media panel's runs
     *  lane rides this remote; the /v1 door stays until R5 deletes
     *  it). Late-bound domain calls, same late-bind law as the KV
     *  remotes in remotes-kv.ts. */
    list(limit: number, signal: AbortSignal): Promise<unknown>;
}
/** Provider plugin (manifest row `gateway-wire`): owns the Remote
 * service lifetime (the runsRegistry provider shape — the Service
 * constructor self-registers on the plugin's fiber; disposal
 * cascades). The typertGateway claims the endpoint through the SRC
 * walk the moment the service is live. */
export declare const gatewayWire: Plugin;
export default gatewayWire;
//# sourceMappingURL=index.d.ts.map
