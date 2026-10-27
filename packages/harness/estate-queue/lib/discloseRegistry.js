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
/** The words a user sentence carries but no card owns — articles,
 *  pronouns, auxiliaries and request verbs. Ignored for scoring (the
 *  full-sentence miss was the transcript's first call: "Make an image
 *  of an anime girl." carries four stopwords around one real word). */
const STOPWORDS = new Set([
    "a", "an", "the", "of", "to", "with", "for", "and", "or", "in", "on", "at", "by",
    "from", "into", "me", "my", "i", "we", "you", "it", "this", "that", "these", "those",
    "turn", "want", "need", "please", "can", "could", "would", "should",
    "do", "does", "is", "are", "be", "as", "so", "if", "then", "than", "using", "use",
]);
/** The modality vocabulary: a query word names a modality, and a card
 *  whose tags/genre carry that modality answers it (the transcript's
 *  `tags=image` facet, scored instead of required). */
const MODALITY_WORDS = {
    image: "image", images: "image", photo: "image", photos: "image", picture: "image",
    pictures: "image", still: "image", illustration: "image",
    video: "video", videos: "video", clip: "video", clips: "video", movie: "video",
    animation: "video", animate: "video", film: "video",
    audio: "audio", sound: "audio", sounds: "audio", music: "audio", voice: "audio",
    speech: "audio", talk: "audio", talking: "audio",
    mesh: "mesh", "3d": "mesh", blender: "mesh",
};
/** Request verbs → the OPERATION tag they mean. A card declares its
 *  operations in tags (generate/edit/upscale); the user's verb is the
 *  same intent in another spelling, so it scores like a modality word
 *  ("make an image" must rank the GENERATE card above the EDIT card —
 *  the transcript's request was to generate, not to edit). */
const OPERATION_WORDS = {
    make: "generate", create: "generate", generate: "generate", render: "generate",
    draw: "generate", imagine: "generate", produce: "generate", design: "generate",
    edit: "edit", modify: "edit", change: "edit", adjust: "edit", retouch: "edit",
    upscale: "upscale", enlarge: "upscale", upres: "upscale", enhance: "upscale",
    animate: "animate", motion: "animate",
};
/** Sørensen–Dice over character trigrams — the in-process fuzzy
 *  measure (no embeddings, per the 2026-11-12 adjudication: a 14-card
 *  corpus does not justify a vector principal). */
export function diceTrigrams(a, b) {
    if (a === b)
        return 1;
    if (a.length < 3 || b.length < 3)
        return 0;
    const grams = (w) => {
        const m = new Map();
        for (let i = 0; i + 3 <= w.length; i++) {
            const g = w.slice(i, i + 3);
            m.set(g, (m.get(g) ?? 0) + 1);
        }
        return m;
    };
    const ga = grams(a);
    const gb = grams(b);
    let overlap = 0;
    for (const [g, n] of ga)
        overlap += Math.min(n, gb.get(g) ?? 0);
    return (2 * overlap) / (a.length - 2 + b.length - 2);
}
/** Score one query token against one card; returns the weight and
 *  the WHY line, or null. Order: exact tag, exact word, modality,
 *  fuzzy (the strongest facet wins — one reason per token). */
function scoreToken(tok, words, dtags, genre) {
    if (dtags.includes(tok))
        return { weight: 3, why: "tag:" + tok };
    if (words.includes(tok))
        return { weight: 2, why: "word:" + tok };
    const modality = MODALITY_WORDS[tok];
    if (modality !== undefined && (dtags.includes(modality) || genre.toLowerCase() === modality)) {
        return { weight: 2, why: "modality:" + tok };
    }
    const operation = OPERATION_WORDS[tok];
    if (operation !== undefined && dtags.includes(operation)) {
        return { weight: 2, why: "operation:" + tok + "->" + operation };
    }
    let best = 0;
    let bestWord = "";
    for (const w of words) {
        const d = diceTrigrams(tok, w);
        if (d > best) {
            best = d;
            bestWord = w;
        }
    }
    if (best >= 0.42) {
        return { weight: Math.round(best * 100) / 100, why: "fuzzy:" + tok + "~" + bestWord + "(" + best.toFixed(2) + ")" };
    }
    return null;
}
/** Search the card defs (slice 3, the intent door): the tags param
 *  (comma list) is a HARD facet — a card must carry every tag. q is
 *  RANKED, never an AND: every non-stopword token scores its best
 *  facet (exact tag 3, exact word 2, modality 2, trigram fuzzy
 *  0.42–1), rows sort by score then id, and every row carries the
 *  WHY it surfaced. With tags stated the facet alone keeps a row
 *  (score 0 is a lawful tag hit); without tags a row needs at least
 *  one scoring token. Empty q + tags = every tag-matched card. */
export function searchCards(defs, q, tags) {
    const toks = q.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t !== "" && !STOPWORDS.has(t));
    const want = tags.toLowerCase().split(",").map((t) => t.trim()).filter((t) => t !== "");
    const out = [];
    for (const [id, def] of defs) {
        const dtags = def.tags ?? [];
        const low = dtags.map((x) => x.toLowerCase());
        if (!want.every((t) => low.includes(t)))
            continue;
        const label = def.identity?.label ?? id;
        const description = def.identity?.description ?? "";
        const genre = def.identity?.genre ?? "";
        const words = (id + " " + label + " " + description + " " + low.join(" ")).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w !== "");
        const why = want.length > 0 ? ["tags=" + want.join(",")] : [];
        let score = 0;
        for (const tok of toks) {
            const hit = scoreToken(tok, words, low, genre);
            if (hit !== null) {
                score += hit.weight;
                why.push(hit.why);
            }
        }
        // the facet law: tags stated => the tag match is the row; tags
        // silent => a row needs a scoring token (never the whole corpus)
        if (want.length === 0 && toks.length > 0 && score === 0)
            continue;
        out.push({ id, label, description, genre, tags: dtags, matched_by: why.length > 0 ? why.join("; ") : "all", score });
    }
    out.sort((a, b) => (b.score - a.score) || (a.id < b.id ? -1 : a.id > b.id ? 1 : /* v8 ignore next */ 0));
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
