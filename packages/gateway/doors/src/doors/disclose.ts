// disclose.ts — Melite discover + Melite load (the rework,
// 2026-09-09): ONE disclosure system over both planes. discover
// grants the progressive disclosure LINES (clamped summary rows —
// the tier the agent routes on); load opens ONE card or flow
// (agents md + tool-call signature + tier-1 skill lines; bodies
// stay behind skill_read).
//
// Reuse, not re-walk: summaries + the card bundle pures live in
// catalogs.ts (they die with it in P3 — this file imports, never
// copies); tier-1 lines are planes.ts wireSkill rows over its
// cardRows buckets / findSkill registry (the skill_index truth).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { DispatchResult } from "@melite/gateway-core";
import type { GatewayRequest } from "@melite/gateway-core";
import { GENERIC_ENHANCE_RECIPE } from "@melite/gateway-core/prompt-guide";
import { needCardRegistry } from "./flowsCard.ts";
import type { CardRegistryService } from "./flowsCard.ts";
import { needModels, modelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import { getRegistryFlow } from "./flowsRegistry.ts";
import {
  searchFlows, flowRows, searchCards,
  cardSkillDocs, toolRowFor, resolveCardPackageDir, enhanceMap,
  bundleDigest, codeRoot,
} from "./catalogs.ts";
import type {
  FlowSummary, CardSummary, SearchableCard,
} from "./catalogs.ts";
import { toolBaseRows } from "./toolProjection.ts";
import {
  disclosureRoot, engineDirs, cardRows, findSkill, wireSkill,
} from "./planes.ts";
import { doorMatch, mountDoorRoutes } from "../routeMount.ts";

/** Tier-1 skill LINES for one card id (the skill_index truth —
 *  wireSkill rows over the planes buckets, card-skill scope only;
 *  the card's AGENT.md rides full under agents, never as a line).
 *  Merged across engines, id-deduped; unknown cards line nothing
 *  (the walk is the truth — never a refusal). */
export function skillLinesForCard(repo: string, cardId: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  let engines: string[];
  try {
    engines = engineDirs(join(repo, "packages", "engines"));
  } catch {
    return out;
  }
  for (const engine of engines) {
    let bucket;
    try {
      bucket = cardRows(engine, repo).buckets.get(cardId);
    } catch {
      continue;
    }
    if (bucket === undefined) continue;
    for (const doc of bucket.rows) {
      if (doc.row.scope !== "card-skill") continue;
      if (seen.has(doc.row.id)) continue;
      seen.add(doc.row.id);
      out.push(wireSkill(doc.row));
    }
  }
  return out;
}

/** The flow leaf docs (flows/<name>/**.md — the card
 *  cardSkillDocs shape: SKILL/AGENT first, sorted, capped. Serves
 *  what the leaf authors; a missing leaf reads nothing, never
 *  refuses). */
export function flowLeafDocs(repo: string, flowName: string): Array<{ path: string; text: string }> {
  const MAX_FILES = 8;
  const MAX_BYTES = 32768;
  const leaf: string = join(repo, "flows", flowName);
  const files: string[] = [];
  const walk = (dir: string, rel: string): void => {
    if (files.length >= MAX_FILES) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const names: string[] = entries.map((e): string => e.name);
    const isDir = new Map<string, boolean>(entries.map((e): [string, boolean] => [e.name, e.isDirectory()]));
    names.sort((a, b): number => {
      const rank = (f: string): number => f === "AGENT.md" || f === "AGENTS.md" || f === "SKILL.md" ? 0 : 1;
      return rank(a) - rank(b) || (a < b ? -1 : 1);
    });
    for (const f of names) {
      if (files.length >= MAX_FILES) break;
      if (isDir.get(f) === true) {
        walk(join(dir, f), rel + f + "/");
      } else if (f.endsWith(".md")) {
        files.push(rel + f);
      }
    }
  };
  walk(leaf, "");
  const out: Array<{ path: string; text: string }> = [];
  let budget: number = MAX_BYTES;
  for (const f of files) {
    if (budget <= 0) break;
    try {
      const text: string = readFileSync(join(leaf, f), "utf8").slice(0, budget);
      budget -= text.length;
      out.push({ path: "flows/" + flowName + "/" + f, text });
    } catch {
      // unreadable — skip, never refuse the bundle
    }
  }
  return out;
}

/** Resolve one skill ref (a card:/model:/flow: sid) to its tier-1
 *  line through the planes registry (the skill_index truth).
 *  Dangling refs line null — visible drift, never a refusal. */
export function skillLineForRef(repo: string, ref: string): Record<string, unknown> {
  try {
    const found = findSkill(repo, ref);
    if (found !== null) return { ref, line: wireSkill(found.row) };
  } catch {
    // registry walk threw — line null below
  }
  return { ref, line: null };
}

/** Melite load for a CARD: agents md + tool-call signature +
 *  tier-1 skill lines + model hints (the migrated enhance
 *  knowledge stays — ambient, spent nothing). Throws LOUD on
 *  unknown ids (the door maps to 404). */
export function loadCard(
  repo: string,
  dataRoot: string,
  cards: CardRegistryService,
  models: ModelsService,
  cardId: string,
): Record<string, unknown> {
  const defs = cards.defsSync();
  const def = defs.get(cardId);
  if (def === undefined) throw new Error(`disclose: unknown card '${cardId}'`);
  const rows = toolBaseRows(defs);
  const pkgDir: string = resolveCardPackageDir(repo, cardId);
  const decls = new Map(models.allDecls().map((d): [string, { id: string; label: string; description: string }] => [d.id, { id: d.id, label: d.label, description: d.description ?? "" }]));
  const recipes: Map<string, Record<string, string>> = enhanceMap(dataRoot);
  const hints: Array<Record<string, unknown>> = [];
  for (const fam of (def as { boarded: readonly string[] }).boarded) {
    const d = decls.get(fam);
    if (d === undefined) continue;
    hints.push({ id: d.id, label: d.label, description: d.description, enhance: recipes.get(fam) ?? { prompt: GENERIC_ENHANCE_RECIPE } });
  }
  const bundle: Record<string, unknown> = {
    name: cardId,
    kind: "card",
    signature: toolRowFor(cardId, def as { schemaCarrier?: unknown; schema: unknown; boarded: readonly string[] }, rows),
    agents: cardSkillDocs(pkgDir),
    skills: skillLinesForCard(repo, cardId),
    model_hints: hints,
  };
  bundle["digest"] = bundleDigest(bundle);
  return bundle;
}

/** Melite load for a FLOW: the leaf agents md + the registry
 *  signature (the tool overlay verbatim — ONE spelling, the same
 *  object validate/start enforce; null when the row declares
 *  none) + slim stages + the author's skill refs (verbatim) with
 *  their tier-1 lines. Throws LOUD on unknown flows. */
export function loadFlow(repo: string, flowName: string): Record<string, unknown> {
  const row = getRegistryFlow(flowName);
  if (row === undefined) throw new Error(`disclose: unknown flow '${flowName}'`);
  const stages = row.stages.map((s): Record<string, unknown> => ({
    id: s.id,
    card: s.card,
    description: s.description,
    // fromFlow links resolve at COMPILE time (expandRegistryFlow) —
    // disclosure serves the link verbatim, never a silent copy.
    ...(s.fromFlow !== null ? { fromFlow: { flow: s.fromFlow.flow, stage: s.fromFlow.stage } } : {}),
  }));
  const seen = new Set<string>();
  const skills: Array<Record<string, unknown>> = [];
  const pushLines = (cardId: string): void => {
    for (const line of skillLinesForCard(repo, cardId)) {
      const id = String((line as { id?: unknown }).id ?? "");
      if (id === "" || seen.has(id)) continue;
      seen.add(id);
      skills.push(line);
    }
  };
  for (const s of row.stages) pushLines(s.card);
  const refs: Array<Record<string, unknown>> = [];
  for (const ref of row.skillRefs) {
    const r = skillLineForRef(repo, ref);
    refs.push(r);
    const line = r["line"] as Record<string, unknown> | null;
    if (line !== null) {
      const id = String(line["id"] ?? "");
      if (id !== "" && !seen.has(id)) {
        seen.add(id);
        skills.push(line);
      }
    }
  }
  const bundle: Record<string, unknown> = {
    name: flowName,
    kind: "flow",
    signature: row.tool === null ? null : {
      name: row.tool.name,
      description: row.tool.description,
      properties: row.tool.properties,
      required: row.tool.required,
      overlays: row.tool.overlays,
    },
    agents: flowLeafDocs(repo, flowName),
    stages,
    refs: row.skillRefs.slice(),
    skills,
  };
  bundle["digest"] = bundleDigest(bundle);
  return bundle;
}

/** First-non-blank query value (the catalogs qFirst shape). */
function qFirst(qs: Record<string, string[]>, name: string): string | null {
  const vals: string[] | undefined = qs[name];
  if (vals === undefined) return null;
  const hit: string | undefined = vals.find((v): boolean => v !== "");
  return hit ?? null;
}

/** Raw-target query parse (the catalogs parseTargetQuery shape). */
function parseQuery(target: string): Record<string, string[]> {
  const qs: Record<string, string[]> = {};
  const qpos: number = target.indexOf("?");
  if (qpos < 0) return qs;
  for (const pair of target.slice(qpos + 1).split("&")) {
    if (pair === "") continue;
    const eq: number = pair.indexOf("=");
    const rk: string = eq < 0 ? pair : pair.slice(0, eq);
    const rv: string = eq < 0 ? "" : pair.slice(eq + 1);
    let k: string;
    let v: string;
    try {
      k = decodeURIComponent(rk.replace(/\+/g, " "));
    } catch {
      k = rk;
    }
    try {
      v = decodeURIComponent(rv.replace(/\+/g, " "));
    } catch {
      v = rv;
    }
    const cur: string[] | undefined = qs[k];
    if (cur === undefined) qs[k] = [v];
    else cur.push(v);
  }
  return qs;
}

/** The disclose doors: /v1/discover + /v1/load. */
export const discloseDoors: Plugin = {
  name: "@melite/gateway-doors/disclose",
  inject: ["gatewayError", "cardRegistry", "models", "webServer"],
  apply(ctx: Context): void {
    mountDoorRoutes(ctx, ctx.webServer, ["_h_disclose"], async (req: GatewayRequest): Promise<DispatchResult | undefined> => {
      const hit = doorMatch(req, ["_h_disclose"]);
      if (hit === null) return undefined;
      const qs: Record<string, string[]> = parseQuery(req.target);
      const repo: string = codeRoot();
      const dataRoot: string = disclosureRoot();
      if (req.path === "/v1/discover") {
        const lookup: string = qFirst(qs, "lookup") ?? "all";
        if (lookup !== "all" && lookup !== "cards" && lookup !== "flows") {
          return { status: 400, body: JSON.stringify({ error: `unknown lookup '${lookup}' (all | cards | flows)` }), contentType: "application/json", headers: {} };
        }
        const q: string = qFirst(qs, "q") ?? "";
        const body: Record<string, unknown> = {};
        if (lookup === "all" || lookup === "flows") {
          const rows: FlowSummary[] = searchFlows(flowRows(repo), q);
          body["flows"] = rows;
        }
        if (lookup === "all" || lookup === "cards") {
          const cards: CardRegistryService = needCardRegistry(ctx.cardRegistry, "disclose");
          const rows: CardSummary[] = searchCards(
            cards.defsSync() as ReadonlyMap<string, SearchableCard>,
            q,
            qFirst(qs, "tags") ?? "",
          );
          body["cards"] = rows;
        }
        return { status: 200, body: JSON.stringify(body, null, 2), contentType: "application/json", headers: {} };
      }
      if (req.path === "/v1/load") {
        const inferenceType: string | null = qFirst(qs, "inference_type");
        if (inferenceType !== "card" && inferenceType !== "flow") {
          return { status: 400, body: JSON.stringify({ error: `load needs inference_type=card|flow (a card or a flow tool call — nothing else executes)` }), contentType: "application/json", headers: {} };
        }
        const name: string = qFirst(qs, "name") ?? "";
        if (name === "") {
          return { status: 400, body: JSON.stringify({ error: "load needs name (discover it first)" }), contentType: "application/json", headers: {} };
        }
        try {
          if (inferenceType === "flow") {
            return { status: 200, body: JSON.stringify({ bundle: loadFlow(repo, name) }, null, 2), contentType: "application/json", headers: {} };
          }
          const cards: CardRegistryService = needCardRegistry(ctx.cardRegistry, "disclose");
          void needModels(ctx.models, "disclose");
          const models: ModelsService = modelsService();
          return { status: 200, body: JSON.stringify({ bundle: loadCard(repo, dataRoot, cards, models, name) }, null, 2), contentType: "application/json", headers: {} };
        } catch (e) {
          return { status: 404, body: JSON.stringify({ error: (e as Error).message }), contentType: "application/json", headers: {} };
        }
      }
      return undefined;
    });
  },
};
