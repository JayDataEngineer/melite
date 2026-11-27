import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
import Schema from "@deepseek-ai/schemastery";
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
/** Provider config for the manage row (V7 cure, 2026-10-18: the
 * systemd unit name is a deployment-varying choice — a validated
 * config field changeable from cordis.yml, never an import-time
 * env capture frozen before plugins load). */
export interface ManageConfig {
    /** The estate deployment's systemd unit (systemctl/journalctl). */
    comfyUnit?: string;
    /** The lane's provisioning posture (2026-10-22, the auto-mode
     *  cure): true lets agent sessions run the DECLARED arms
     *  (provision declared model, install declared packs) without the
     *  operator confirm dialog — the raw-URL arms stay operator-gated
     *  regardless, and the gate decision ships to the deck through
     *  the status payload's auto_provision field. */
    autoProvision?: boolean;
    /** The user-LoRAs rows file (2026-11-17, the env seam's config
     *  twin): the manage door's own rows file is a deployment-varying
     *  path — pinned here, changeable from cordis.yml. Empty (the
     *  default) = the repo default path; the MELITE_USER_LORAS env
     *  var stays only as the documented fallback below config. */
    userLorasPath?: string;
    /** THE QUIET WINDOW (B4, 2026-11-27): the milliseconds a teardown
     *  door (restart, stop) requires the engine's queue to be empty
     *  AND stay empty before it tears. Every lane's press is a row in
     *  that queue, and a film between two windows reads empty for
     *  seconds — a deployment that owns its engine exclusively (a
     *  hermetic CI seat) may state 0 to tear on the first empty
     *  reading. */
    engineQuiesceMs?: number;
}
/** The validator twin of {@link ManageConfig}. */
export declare const ManageConfig: Schema<Schemastery.ObjectS<NoInfer<{
    comfyUnit: Schema<string, string, "defined">;
    autoProvision: Schema<boolean, boolean, "defined">;
    userLorasPath: Schema<string, string, "defined">;
    engineQuiesceMs: Schema<number, number, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    comfyUnit: Schema<string, string, "defined">;
    autoProvision: Schema<boolean, boolean, "defined">;
    userLorasPath: Schema<string, string, "defined">;
    engineQuiesceMs: Schema<number, number, "defined">;
}>>, "plain">;
export declare class ManageGatewayService extends Service {
    static inject: string[];
    /** The estate deployment's systemd unit (config-pinned). */
    readonly comfyUnit: string;
    /** The lane's provisioning posture (config-pinned). */
    readonly autoProvision: boolean;
    /** The teardown doors' quiet window in ms (config-pinned). */
    readonly engineQuiesceMs: number;
    constructor(ctx: Context, config?: ManageConfig);
    /** The one entry: the tools' /v1/manage lane. */
    act(doc: unknown, signal: AbortSignal): Promise<ManageEnvelope>;
}
/** The manage row: gates on the timer seat (the rail's timeouts)
 *  and the queue seat (the state roots manifest act() walks —
 *  the af-close4 inject cure). Provisioning is not a gate: the
 *  plane reads it through the optional ctx.get accessor. */
export declare const manageProvider: {
    name: string;
    inject: readonly ["timer", "queue"];
    Config: Schema<Schemastery.ObjectS<NoInfer<{
        comfyUnit: Schema<string, string, "defined">;
        autoProvision: Schema<boolean, boolean, "defined">;
        userLorasPath: Schema<string, string, "defined">;
        engineQuiesceMs: Schema<number, number, "defined">;
    }>>, Schemastery.ObjectT<NoInfer<{
        comfyUnit: Schema<string, string, "defined">;
        autoProvision: Schema<boolean, boolean, "defined">;
        userLorasPath: Schema<string, string, "defined">;
        engineQuiesceMs: Schema<number, number, "defined">;
    }>>, "plain">;
    apply(ctx: Context, config?: ManageConfig): void;
};
//# sourceMappingURL=manageRegistry.d.ts.map
