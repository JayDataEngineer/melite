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
import type { Context } from "@deepseek-ai/cordis";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import type { CardRegistryService } from "./cardsRegistry.ts";
import { seedFlowsSeat } from "./flowsData.ts";
import type { FlowsSeat } from "./flowsData.ts";

// ── the pures (verbatim) ──────────────────────────────────────

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
  readonly identity?: { readonly label?: string; readonly description?: string; readonly genre?: string };
  readonly tags?: readonly string[];
}

/** The words a user sentence carries but no card owns — articles,
 *  pronouns, auxiliaries and request verbs. Ignored for scoring (the
 *  full-sentence miss was the transcript's first call: "Make an image
 *  of an anime girl." carries four stopwords around one real word). */
const STOPWORDS: ReadonlySet<string> = new Set([
  "a", "an", "the", "of", "to", "with", "for", "and", "or", "in", "on", "at", "by",
  "from", "into", "me", "my", "i", "we", "you", "it", "this", "that", "these", "those",
  "turn", "want", "need", "please", "can", "could", "would", "should",
  "do", "does", "is", "are", "be", "as", "so", "if", "then", "than", "using", "use",
]);

/** The modality vocabulary: a query word names a modality, and a card
 *  whose tags/genre carry that modality answers it (the transcript's
 *  `tags=image` facet, scored instead of required). */
const MODALITY_WORDS: Readonly<Record<string, string>> = {
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
const OPERATION_WORDS: Readonly<Record<string, string>> = {
  make: "generate", create: "generate", generate: "generate", render: "generate",
  draw: "generate", imagine: "generate", produce: "generate", design: "generate",
  edit: "edit", modify: "edit", change: "edit", adjust: "edit", retouch: "edit",
  upscale: "upscale", enlarge: "upscale", upres: "upscale", enhance: "upscale",
  animate: "animate", motion: "animate",
};

/** Sørensen–Dice over character trigrams — the in-process fuzzy
 *  measure (no embeddings, per the 2026-11-12 adjudication: a 14-card
 *  corpus does not justify a vector principal). */
export function diceTrigrams(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 3 || b.length < 3) return 0;
  const grams = (w: string): Map<string, number> => {
    const m = new Map<string, number>();
    for (let i = 0; i + 3 <= w.length; i++) {
      const g = w.slice(i, i + 3);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  };
  const ga = grams(a);
  const gb = grams(b);
  let overlap = 0;
  for (const [g, n] of ga) overlap += Math.min(n, gb.get(g) ?? 0);
  return (2 * overlap) / (a.length - 2 + b.length - 2);
}

/** Score one query token against one card; returns the weight and
 *  the WHY line, or null. Order: exact tag, exact word, modality,
 *  fuzzy (the strongest facet wins — one reason per token). */
function scoreToken(
  tok: string,
  words: readonly string[],
  dtags: readonly string[],
  genre: string,
): { weight: number; why: string } | null {
  if (dtags.includes(tok)) return { weight: 3, why: "tag:" + tok };
  if (words.includes(tok)) return { weight: 2, why: "word:" + tok };
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
    if (d > best) { best = d; bestWord = w; }
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
export function searchCards(
  defs: ReadonlyMap<string, SearchableCard>,
  q: string,
  tags: string,
): DiscoveredCard[] {
  const toks: readonly string[] = q.toLowerCase().split(/[^a-z0-9]+/).filter((t): boolean => t !== "" && !STOPWORDS.has(t));
  const want: readonly string[] = tags.toLowerCase().split(",").map((t): string => t.trim()).filter((t): boolean => t !== "");
  const out: Array<DiscoveredCard & { score: number }> = [];
  for (const [id, def] of defs) {
    const dtags: readonly string[] = def.tags ?? [];
    const low: readonly string[] = dtags.map((x): string => x.toLowerCase());
    if (!want.every((t): boolean => low.includes(t))) continue;
    const label: string = def.identity?.label ?? id;
    const description: string = def.identity?.description ?? "";
    const genre: string = def.identity?.genre ?? "";
    const words: readonly string[] = (id + " " + label + " " + description + " " + low.join(" ")).toLowerCase().split(/[^a-z0-9]+/).filter((w): boolean => w !== "");
    const why: string[] = want.length > 0 ? ["tags=" + want.join(",")] : [];
    let score = 0;
    for (const tok of toks) {
      const hit = scoreToken(tok, words, low, genre);
      if (hit !== null) { score += hit.weight; why.push(hit.why); }
    }
    // the facet law: tags stated => the tag match is the row; tags
    // silent => a row needs a scoring token (never the whole corpus)
    if (want.length === 0 && toks.length > 0 && score === 0) continue;
    out.push({ id, label, description, genre, tags: dtags, matched_by: why.length > 0 ? why.join("; ") : "all", score });
  }
  out.sort((a, b): number => (b.score - a.score) || (a.id < b.id ? -1 : a.id > b.id ? 1 : /* v8 ignore next */ 0));
  return out;
}

/** Search the flow rows (PURE over the merged rows). */
export function searchFlows(
  rows: ReadonlyArray<FlowSummary>,
  q: string,
): FlowSummary[] {
  const toks: readonly string[] = q.toLowerCase().split(/\s+/).filter((t): boolean => t !== "");
  const out: FlowSummary[] = rows.filter((r): boolean => {
    const hay: string = (r.name + " " + r.title + " " + r.description).toLowerCase();
    return toks.every((t): boolean => hay.includes(t));
  });
  // (registry names are unique — the equal arm never fires)
  out.sort((a, b): number => (a.name < b.name ? -1 : a.name > b.name ? 1 : /* v8 ignore next */ 0));
  return out;
}

/** The flow rows: REGISTRY (the compile truth) merged with the
 *  flows/<name>/tool.json leaf (the agent face: stage_title). */
export function flowSummaryRows(
  repo: string,
  flowsSeat?: FlowsSeat | null,
): FlowSummary[] {
  const seat: FlowsSeat = flowsSeat ?? seedFlowsSeat();
  const out: FlowSummary[] = [];
  for (const name of seat.names()) {
    const flow = seat.get(name);
    /* v8 ignore next -- names come from the same registry (no-else,
       defensive against a mid-reload skew) (2026-09-12) */
    if (flow === undefined) continue;
    let title: string = name;
    try {
      const leaf = JSON.parse(readFileSync(join(repo, "flows", name, "tool.json"), "utf8")) as { stage_title?: unknown };
      if (typeof leaf.stage_title === "string" && leaf.stage_title !== "") title = leaf.stage_title;
    } catch {
      // no leaf — the registry row stands alone
    }
    out.push({ name, title, description: flow.description, stages: flow.stages.length, skillRefs: flow.skillRefs });
  }
  return out;
}

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
export function flowContractRows(flowsSeat?: FlowsSeat | null): FlowContract[] {
  const seat: FlowsSeat = flowsSeat ?? seedFlowsSeat();
  const out: FlowContract[] = [];
  for (const name of seat.names()) {
    const flow = seat.get(name);
    /* v8 ignore next -- names come from the same registry (no-else,
       defensive against a mid-reload skew) (2026-09-12) */
    if (flow === undefined) continue;
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

  constructor(ctx: Context) {
    super(ctx, "disclose");
  }

  /** GET /v1/flows: the machine-readable FLOW CONTRACTS — every
   *  registry flow with its declared stages, inputs, outputs and tool
   *  signature. The programmatic door an app reads to learn what a
   *  named flow takes before it starts one (2026-10-04). */
  contracts(): { flows: FlowContract[] } {
    return { flows: flowContractRows(this.ctx.get("meliteFlows") as FlowsSeat | undefined) };
  }

  /** GET /v1/discover: unknown
   *  lookup refuses with the door's own voice; the body carries the
   *  requested planes only. */
  discover(
    lookup: string,
    q: string,
    tags: string,
  ): { flows?: FlowSummary[]; cards?: DiscoveredCard[] } {
    if (lookup !== "all" && lookup !== "cards" && lookup !== "flows") {
      throw new Error(
        "unknown lookup '" + lookup + "' (all | cards | flows)",
      );
    }
    const body: { flows?: FlowSummary[]; cards?: DiscoveredCard[] } = {};
    if (lookup === "all" || lookup === "flows") {
      body.flows = searchFlows(
        flowSummaryRows(resolveRepoRoot(), this.ctx.get("meliteFlows") as FlowsSeat | undefined),
        q,
      );
    }
    if (lookup === "all" || lookup === "cards") {
      // property read: the hard inject (above) is the fiber's
      // contract — the legal spelling under the tutorial's law.
      const cards: CardRegistryService = this.ctx.cardRegistry;
      body.cards = searchCards(
        cards.defsSync() as ReadonlyMap<string, SearchableCard>,
        q,
        tags,
      );
    }
    return body;
  }
}

/** The disclose row: mounts after the card-registry provider (its
 *  hard inject pends on the seat — the loader orders it). */
export const discloseProvider = {
  name: "estate-disclose",
  inject: ["cardRegistry"] as const,
  apply(ctx: Context): void {
    new DiscloseDirectoryService(ctx);
  },
};

declare module "@deepseek-ai/cordis" {
  interface Context {
    disclose: DiscloseDirectoryService;
  }
}
