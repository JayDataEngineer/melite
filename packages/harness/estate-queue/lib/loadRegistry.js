// loadRegistry.ts — the load seat (REBUILD-17, 2026-09-10): Melite
// load opens ONE card or flow over the loadPlane pures. The seat
// assembles the two service deps (card registry + models) from
// the estate's own seams; unknown names answer the door's voice.
//
// Erasable-syntax TS only (node --experimental-strip-types).
import { Service } from "@deepseek-ai/cordis";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import { loadCard, loadFlow } from "./loadPlane.js";
// ROLE (cookbook adding-a-package role table): Resolver: computes/locates one named answer (the bundle) without owning it. Key "load" unchanged.
export class LoadResolverService extends Service {
    static inject = ["cardRegistry"];
    constructor(ctx) {
        super(ctx, "load");
    }
    /** GET /v1/load?inference_type=card|flow&name=<n> — the bundle.
     *  The door's parameter law rides verbatim: inference_type must
     *  be card|flow (nothing else executes), name is required. */
    load(inferenceType, name) {
        if (inferenceType !== "card" && inferenceType !== "flow") {
            throw new Error("load needs inference_type=card|flow (a card or a flow tool call — nothing else executes)");
        }
        if (name === "") {
            throw new Error("load needs name (discover it first)");
        }
        const repo = resolveRepoRoot();
        // THE AUTHORED SKILL PLANE'S READER: the same state root the write
        // door (melite_skill_write) and the skill read walk ride — a
        // skill the agent authored is disclosed by melite_load exactly as
        // a tracked one (the 2026-11-04 gap: write landed, discovery did
        // not see it). Absent queue seat = the tracked tree alone.
        const queue = this.ctx.get("queue");
        const stateRoot = queue?.stateRoot;
        if (inferenceType === "flow") {
            // The flow bundle composes from the LANES seat (the lane-seat
            // law, audit finding 4): the same read the runs doors thread, so
            // the disclosed body and the composed graph never diverge. ctx.get
            // is the injector API (an unmounted seat reads undefined and the
            // plane degrades to the booted singleton).
            return {
                bundle: loadFlow(repo, name, this.ctx.get("models"), this.ctx.get("meliteFlows"), stateRoot),
            };
        }
        // The card arm reads the LANE's seat for the same reason the flow
        // arm above does (the lane-seat law): the disclosed presence hints
        // must come from the lane that serves the run, not the import-side
        // singleton — on a cold boot the singleton's own read can refuse
        // "models service not booted" while this lane is fully seated.
        return {
            bundle: loadCard(repo, this.ctx.cardRegistry, this.ctx.get("models"), name, stateRoot),
        };
    }
}
/** The load row: gates on the card registry seat. */
export const loadProvider = {
    name: "estate-load",
    inject: ["cardRegistry"],
    apply(ctx) {
        new LoadResolverService(ctx);
    },
};
//# sourceMappingURL=loadRegistry.js.map
