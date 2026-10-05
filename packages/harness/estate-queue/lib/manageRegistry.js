// manageRegistry.ts — the management seat (REBUILD-15, 2026-09-10):
// the pure plane (managePlane.ts) answers through a Service; the
// ctx assembles from the estate's own seats — the endpoint config
// re-read per call (loadEndpointConfig), the models catalog
// (modelsService — the engine singleton, no seat), the timer seat
// (ctx.timeout — cordis-plugin-timer, never a bare setTimeout).
//
// The seat's contract: act(doc) returns the ENVELOPE
// ({action, ok, detail, data}) on ok; a refused envelope THROWS a
// RemoteError carrying the envelope (code manage/refused) — the
// tools' lane surface reads it as the value, so the model sees WHY.
//
// Erasable-syntax TS only (node --experimental-strip-types).
import { Service } from "@deepseek-ai/cordis";
import { loadEndpointConfig, resolveRepoRoot, modelsService } from "@melite/comfyui-cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { dispatchManage } from "./managePlane.js";
// ROLE (cookbook adding-a-package role table): Gateway: adapts the external comfy-manager API to the local manage lane. Key "manage" unchanged.
export class ManageGatewayService extends Service {
    static inject = ["timer", "provisioning"];
    constructor(ctx) {
        super(ctx, "manage");
    }
    /** The one entry: the tools' /v1/manage lane. */
    async act(doc, signal) {
        signal.throwIfAborted();
        const mctx = {
            repoRoot: resolveRepoRoot(),
            endpoint: () => loadEndpointConfig(),
            models: modelsService(),
            // NO CAST (2026-09-26): the seat is OPTIONAL and the type says
            // so. The old `as ProvisioningServiceDefinition` asserted a seat
            // that a lane may simply not mount, and every downstream
            // dereference became a TypeError at call time instead of a
            // declared absence. The plane gates it once (provisioningOf /
            // provisioningOrAbsent).
            provisioning: this.ctx.get("provisioning", false),
            // TWO-CORDIS TOPOLOGY: the timer plugin's Context augmentation
            // lands on ITS cordis copy (structural, never instanceof
            // across copies — the documented law); the seat reads the
            // timer through the structural shape.
            timeout: (callback, delay) => this.ctx.timeout(callback, delay),
            signal,
        };
        const [status, envelope] = await dispatchManage(doc, mctx, signal);
        if (envelope.ok)
            return envelope;
        // A refusal IS the answer's shape: carry the envelope in the
        // RemoteError — the lane surfaces it as the tool's value.
        throw new RemoteError("manage/refused", envelope.detail, {
            action: envelope.action,
            status,
            code: envelope.code,
            data: envelope.data,
        });
    }
}
/** The manage row: gates on the timer seat (the rail's timeouts). */
export const manageProvider = {
    name: "estate-manage",
    inject: ["timer"],
    apply(ctx) {
        new ManageGatewayService(ctx);
    },
};
// THE `manage` KEY IS NOT DECLARED HERE (li-aq.3, the walls plane's
// typecheck). The adapter package that CONSUMES the seat declares it
// on Context — structurally, by its own header's rule: a compiled
// package may not import these source-run sources into its emit
// graph, so the contract travels with the caller, and the class that
// mounts the seat satisfies it structurally. Declaring it here as
// well (the rename left this twin behind, its comment still naming
// the pre-rename class) is TS2717 the moment one program composes
// both sides — which no program did until the walls did.
//# sourceMappingURL=manageRegistry.js.map
