import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
import type { FlowsSeat } from "./flowsData.js";
/** One card summary (the routing layer — no bodies). */
export interface DiscoveredCard {
    readonly id: string;
    readonly label: string;
    readonly description: string;
    readonly genre: string;
    readonly tags: readonly string[];
    /** WHY this row surfaced (the ranked-answer law, slice 3): the
     *  facets that matched, strongest first — `tags=image` for a facet
     *  filter, `tag:sky`, `word:beta`, `modality:image`, or
     *  `fuzzy:seas~sea(0.67)`. Never a bare row the agent must guess
     *  the reason for. */
    readonly matched_by: string;
    /** The ranking score (sum of facet weights) — the sort key, served
     *  so a caller can see the distance between rows. */
    readonly score: number;
}
/** One flow summary (the routing layer). */
export interface FlowSummary {
    readonly name: string;
    readonly title: string;
    readonly description: string;
    readonly stages: number;
    readonly skillRefs: readonly string[];
}
/** The search surface a card def offers (the def itself satisfies
 *  this — structural, no import of the engine service). */
export interface SearchableCard {
    readonly identity?: {
        readonly label?: string;
        readonly description?: string;
        readonly genre?: string;
    };
    readonly tags?: readonly string[];
}
/** Sørensen–Dice over character trigrams — the in-process fuzzy
 *  measure (no embeddings, per the 2026-11-12 adjudication: a 14-card
 *  corpus does not justify a vector principal). */
export declare function diceTrigrams(a: string, b: string): number;
/** Search the card defs (slice 3, the intent door): the tags param
 *  (comma list) is a HARD facet — a card must carry every tag. q is
 *  RANKED, never an AND: every non-stopword token scores its best
 *  facet (exact tag 3, exact word 2, modality 2, trigram fuzzy
 *  0.42–1), rows sort by score then id, and every row carries the
 *  WHY it surfaced. With tags stated the facet alone keeps a row
 *  (score 0 is a lawful tag hit); without tags a row needs at least
 *  one scoring token. Empty q + tags = every tag-matched card. */
export declare function searchCards(defs: ReadonlyMap<string, SearchableCard>, q: string, tags: string): DiscoveredCard[];
/** Search the flow rows (PURE over the merged rows). */
export declare function searchFlows(rows: ReadonlyArray<FlowSummary>, q: string): FlowSummary[];
/** The flow rows: REGISTRY (the compile truth) merged with the
 *  flows/<name>/tool.json leaf (the agent face: stage_title). */
export declare function flowSummaryRows(repo: string, flowsSeat?: FlowsSeat | null): FlowSummary[];
/** ONE flow's machine-readable contract (the 2026-10-04 app door).
 *  A summary row counts stages; a CONTRACT states them — id, engine,
 *  card, the declared inputs/params, the outputs and the tool
 *  signature — so a programmatic caller learns what a flow takes
 *  WITHOUT composing it. Derived live from the registry, the same
 *  truth the compile reads (QUEUE LANE LAW: no frozen blob). */
export interface FlowContract {
    readonly id: string;
    readonly description: string;
    readonly stages: ReadonlyArray<{
        readonly id: string;
        readonly engine: string;
        readonly card: string;
        readonly inputs: unknown;
        readonly outputs: unknown;
        readonly params: unknown;
    }>;
    readonly initialValidators: unknown;
    readonly tool: unknown;
}
/** The contract rows, one per registry flow, in registry order. */
export declare function flowContractRows(flowsSeat?: FlowsSeat | null): FlowContract[];
/** The disclosure service: ONE disclosure system over both planes.
 *  discover(lookup, q, tags) answers {flows?, cards?} — the door's
 *  combined body, live-derived. */
export declare class DiscloseDirectoryService extends Service {
    static inject: string[];
    constructor(ctx: Context);
    /** GET /v1/flows: the machine-readable FLOW CONTRACTS — every
     *  registry flow with its declared stages, inputs, outputs and tool
     *  signature. The programmatic door an app reads to learn what a
     *  named flow takes before it starts one (2026-10-04). */
    contracts(): {
        flows: FlowContract[];
    };
    /** GET /v1/discover: unknown
     *  lookup refuses with the door's own voice; the body carries the
     *  requested planes only. */
    discover(lookup: string, q: string, tags: string): {
        flows?: FlowSummary[];
        cards?: DiscoveredCard[];
    };
}
/** The disclose row: mounts after the card-registry provider (its
 *  hard inject pends on the seat — the loader orders it). */
export declare const discloseProvider: {
    name: string;
    inject: readonly ["cardRegistry"];
    apply(ctx: Context): void;
};
declare module "@deepseek-ai/cordis" {
    interface Context {
        disclose: DiscloseDirectoryService;
    }
}
//# sourceMappingURL=discloseRegistry.d.ts.map
