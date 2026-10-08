// discloseRegistry.ts — the disclosure seat (REBUILD-14, 2026-09-10):
// Melite discover re-homed from the dead gateway's disclose door
// (doors/disclose.ts, killed with the gateway app). The pures port
// VERBATIM (searchCards / searchFlows / flowSummaryRows — the routing
// layer, no bodies); the door's HTTP shell dies, the seat answers.
//
// Division of enhance (operator law, 2026-09-09, unchanged):
// discover grants the progressive disclosure LINES (clamped summary
// rows — the tier the agent routes on); load opens ONE card or
// flow — that arm (agents md + tool-call signature + tier-1 skill
// lines over the melite_skill_index truth) is its own named stroke.
//
// QUEUE LANE LAW: no fallbacks (unknown lookup refuses with the
// door's voice), live derivation (flow rows from the registry at
// request time; card rows from the primed card registry — never a
// frozen blob).
//
// Erasable-syntax TS only (node --experimental-strip-types).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Service } from "@deepseek-ai/cordis";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import { seedFlowsSeat } from "./flowsData.js";
/** Search the card defs: the q tokens (whitespace-split,
 *  case-folded) ALL match (id + label + description + tags); the
 *  tags param (comma list) ALL match def.tags. Empty q + tags =
 *  all. */
export function searchCards(defs, q, tags) {
    const toks = q.toLowerCase().split(/\s+/).filter((t) => t !== "");
    const want = tags.toLowerCase().split(",").map((t) => t.trim()).filter((t) => t !== "");
    const out = [];
    for (const [id, def] of defs) {
        const dtags = def.tags ?? [];
        const low = dtags.map((x) => x.toLowerCase());
        if (!want.every((t) => low.includes(t)))
            continue;
        const label = def.identity?.label ?? id;
        const description = def.identity?.description ?? "";
        const hay = (id + " " + label + " " + description + " " + dtags.join(" ")).toLowerCase();
        if (!toks.every((t) => hay.includes(t)))
            continue;
        out.push({ id, label, description, genre: def.identity?.genre ?? "", tags: dtags });
    }
    // (map keys are unique — the equal arm never fires)
    out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : /* v8 ignore next */ 0));
    return out;
}
/** Search the flow rows (PURE over the merged rows). */
export function searchFlows(rows, q) {
    const toks = q.toLowerCase().split(/\s+/).filter((t) => t !== "");
    const out = rows.filter((r) => {
        const hay = (r.name + " " + r.title + " " + r.description).toLowerCase();
        return toks.every((t) => hay.includes(t));
    });
    // (registry names are unique — the equal arm never fires)
    out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : /* v8 ignore next */ 0));
    return out;
}
/** The flow rows: REGISTRY (the compile truth) merged with the
 *  flows/<name>/tool.json leaf (the agent face: stage_title). */
export function flowSummaryRows(repo, flowsSeat) {
    const seat = flowsSeat ?? seedFlowsSeat();
    const out = [];
    for (const name of seat.names()) {
        const flow = seat.get(name);
        /* v8 ignore next -- names come from the same registry (no-else,
           defensive against a mid-reload skew) (2026-09-12) */
        if (flow === undefined)
            continue;
        let title = name;
        try {
            const leaf = JSON.parse(readFileSync(join(repo, "flows", name, "tool.json"), "utf8"));
            if (typeof leaf.stage_title === "string" && leaf.stage_title !== "")
                title = leaf.stage_title;
        }
        catch {
            // no leaf — the registry row stands alone
        }
        out.push({ name, title, description: flow.description, stages: flow.stages.length, skillRefs: flow.skillRefs });
    }
    return out;
}
/** The contract rows, one per registry flow, in registry order. */
export function flowContractRows(flowsSeat) {
    const seat = flowsSeat ?? seedFlowsSeat();
    const out = [];
    for (const name of seat.names()) {
        const flow = seat.get(name);
        /* v8 ignore next -- names come from the same registry (no-else,
           defensive against a mid-reload skew) (2026-09-12) */
        if (flow === undefined)
            continue;
        out.push({
            id: flow.id,
            description: flow.description,
            stages: flow.stages.map((st) => ({
                id: st.id,
                engine: st.engine,
                card: st.card,
                inputs: st.inputs,
                outputs: st.outputs,
                params: st.params,
            })),
            initialValidators: flow.initialValidators,
            tool: flow.tool,
        });
    }
    return out;
}
// ── the seat ─────────────────────────────────────────────────────
/** The disclosure service: ONE disclosure system over both planes.
 *  discover(lookup, q, tags) answers {flows?, cards?} — the door's
 *  combined body, live-derived. */
// ROLE (cookbook adding-a-package role table): Directory: exposes entries + metadata for discovery/selection. Key "disclose" unchanged.
export class DiscloseDirectoryService extends Service {
    static inject = ["cardRegistry"];
    constructor(ctx) {
        super(ctx, "disclose");
    }
    /** GET /v1/flows: the machine-readable FLOW CONTRACTS — every
     *  registry flow with its declared stages, inputs, outputs and tool
     *  signature. The programmatic door an app reads to learn what a
     *  named flow takes before it starts one (2026-10-04). */
    contracts() {
        return { flows: flowContractRows(this.ctx.get("meliteFlows")) };
    }
    /** GET /v1/discover: unknown
     *  lookup refuses with the door's own voice; the body carries the
     *  requested planes only. */
    discover(lookup, q, tags) {
        if (lookup !== "all" && lookup !== "cards" && lookup !== "flows") {
            throw new Error("unknown lookup '" + lookup + "' (all | cards | flows)");
        }
        const body = {};
        if (lookup === "all" || lookup === "flows") {
            body.flows = searchFlows(flowSummaryRows(resolveRepoRoot(), this.ctx.get("meliteFlows")), q);
        }
        if (lookup === "all" || lookup === "cards") {
            // property read: the hard inject (above) is the fiber's
            // contract — the legal spelling under the tutorial's law.
            const cards = this.ctx.cardRegistry;
            body.cards = searchCards(cards.defsSync(), q, tags);
        }
        return body;
    }
}
/** The disclose row: mounts after the card-registry provider (its
 *  hard inject pends on the seat — the loader orders it). */
export const discloseProvider = {
    name: "estate-disclose",
    inject: ["cardRegistry"],
    apply(ctx) {
        new DiscloseDirectoryService(ctx);
    },
};
//# sourceMappingURL=discloseRegistry.js.map
