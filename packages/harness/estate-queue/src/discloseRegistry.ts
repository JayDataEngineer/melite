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
import { getRegistryFlow, registryFlowNames } from "./flowsData.ts";

// ── the pures (verbatim) ──────────────────────────────────────

/** One card summary (the routing layer — no bodies). */
export interface DiscoveredCard {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly genre: string;
  readonly tags: readonly string[];
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

/** Search the card defs: the q tokens (whitespace-split,
 *  case-folded) ALL match (id + label + description + tags); the
 *  tags param (comma list) ALL match def.tags. Empty q + tags =
 *  all. */
export function searchCards(
  defs: ReadonlyMap<string, SearchableCard>,
  q: string,
  tags: string,
): DiscoveredCard[] {
  const toks: readonly string[] = q.toLowerCase().split(/\s+/).filter((t): boolean => t !== "");
  const want: readonly string[] = tags.toLowerCase().split(",").map((t): string => t.trim()).filter((t): boolean => t !== "");
  const out: DiscoveredCard[] = [];
  for (const [id, def] of defs) {
    const dtags: readonly string[] = def.tags ?? [];
    const low: readonly string[] = dtags.map((x): string => x.toLowerCase());
    if (!want.every((t): boolean => low.includes(t))) continue;
    const label: string = def.identity?.label ?? id;
    const description: string = def.identity?.description ?? "";
    const hay: string = (id + " " + label + " " + description + " " + dtags.join(" ")).toLowerCase();
    if (!toks.every((t): boolean => hay.includes(t))) continue;
    out.push({ id, label, description, genre: def.identity?.genre ?? "", tags: dtags });
  }
  // (map keys are unique — the equal arm never fires)
  out.sort((a, b): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : /* v8 ignore next */ 0));
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
export function flowSummaryRows(repo: string): FlowSummary[] {
  const out: FlowSummary[] = [];
  for (const name of registryFlowNames()) {
    const flow = getRegistryFlow(name);
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
export function flowContractRows(): FlowContract[] {
  const out: FlowContract[] = [];
  for (const name of registryFlowNames()) {
    const flow = getRegistryFlow(name);
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
    return { flows: flowContractRows() };
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
      body.flows = searchFlows(flowSummaryRows(resolveRepoRoot()), q);
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
