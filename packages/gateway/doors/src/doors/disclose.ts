// disclose.ts — Melite discover + Melite load (the rework,
// 2026-09-09): ONE disclosure system over both planes. discover
// grants the progressive disclosure LINES (clamped summary rows —
// the tier the agent routes on); load opens ONE card or flow
// (agents md + tool-call signature + tier-1 skill lines; bodies
// stay behind skill_read).
//
// Division of enhance (operator law, 2026-09-09): the AGENT needs
// nothing special — it holds the skill lines, reads bodies via
// skill_read, and writes the prompt itself; LLM-powered enhance is
// the USER's ✦ door (/melite-tools/enhance, ctx.llm inside). No
// recipe channel rides this file.
//
// Reuse, not re-walk: the card bundle pures live here (moved from
// catalogs.ts when it died in P3); tier-1 lines are planes.ts
// wireSkill rows over its cardRows buckets / findSkill registry
// (the skill_index truth).

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { DispatchResult } from "@melite/gateway-core";
import type { GatewayRequest } from "@melite/gateway-core";
import { emitParamsSchema, cardPackages } from "@melite/comfyui-cordis";
import { needCardRegistry } from "./flowsCard.ts";
import type { CardRegistryService } from "./flowsCard.ts";
import { needModels, modelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import { registryFlowNames, getRegistryFlow } from "./flowsRegistry.ts";
import { toolBaseRows } from "./toolProjection.ts";
import { engineDirs, cardRows, findSkill, wireSkill } from "./planes.ts";
import { doorMatch, mountDoorRoutes } from "../routeMount.ts";

// ── moved pures (catalogs.ts died in P3 — one disclosure file) ──

/** Code root (the REPO TREE the doors read packages/ + flows/
 *  from): file-anchored, 5 up from doors/src/doors/ — NEVER the
 *  MELITE_REPO_ROOT override (disclosureRoot is the DATA root; the
 *  sandbox fixture has no packages tier — code and data diverge
 *  there, coincide in PROD). */
export function codeRoot(): string {
  const here: string = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..", "..", "..", "..");
}

/** One card summary (the routing layer — no bodies). */
export interface CardSummary {
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

/** Search the card defs (PURE — unit-tested without boot): q tokens
 *  ALL match (id + label + description + tags, case-folded); the tags
 *  param (comma list) ALL match def.tags. Empty q + tags = all. */
export function searchCards(
  defs: ReadonlyMap<string, SearchableCard>,
  q: string,
  tags: string,
): CardSummary[] {
  const toks: readonly string[] = q.toLowerCase().split(/\s+/).filter((t): boolean => t !== "");
  const want: readonly string[] = tags.toLowerCase().split(",").map((t): string => t.trim()).filter((t): boolean => t !== "");
  const out: CardSummary[] = [];
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
  out.sort((a, b): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return out;
}

/** Search the flow rows (PURE over injected rows — the fs leaf merge
 *  rides flowRows below). */
export function searchFlows(
  rows: ReadonlyArray<FlowSummary>,
  q: string,
): FlowSummary[] {
  const toks: readonly string[] = q.toLowerCase().split(/\s+/).filter((t): boolean => t !== "");
  const out: FlowSummary[] = rows.filter((r): boolean => {
    const hay: string = (r.name + " " + r.title + " " + r.description).toLowerCase();
    return toks.every((t): boolean => hay.includes(t));
  });
  out.sort((a, b): number => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return out;
}

/** The flow rows: REGISTRY (the compile truth) merged with the
 *  flows/<name>/tool.json leaf (the agent face: stage_title). */
export function flowRows(repo: string): FlowSummary[] {
  const out: FlowSummary[] = [];
  for (const name of registryFlowNames()) {
    const flow = getRegistryFlow(name);
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

/** A card id → its package dir. The cardPackages rows are package
 *  NAMES ('@melite/<genre>-<card>'); the id is the row's tail past
 *  the genre prefix, which is NOT reparseable from the string alone
 *  (ids carry dashes) — so match rows ending in '-' + id, split the
 *  genre against the LIVE domain tier (readdir packages/), and keep
 *  the ones whose dir carries src/card.ts (the cardUnitDirs guard).
 *  Node resolution is the WRONG tool (pnpm links only dependents —
 *  require.resolve starves); the repo tree is the truth.
 *  Zero hits = unknown id; two = a data bug — both refuse LOUD at
 *  the door, never a silent pick. */
export function resolveCardPackageDir(repo: string, cardId: string): string {
  let domains: string[] = [];
  try {
    domains = readdirSync(join(repo, "packages"), { withFileTypes: true })
      .filter((e): boolean => e.isDirectory())
      .map((e): string => e.name);
  } catch {
    throw new Error(`disclose: no packages tier under '${repo}'`);
  }
  const hits: string[] = [];
  for (const row of cardPackages) {
    const tail: string = row.startsWith("@melite/") ? row.slice("@melite/".length) : row;
    if (!tail.endsWith("-" + cardId)) continue;
    for (const dom of domains) {
      if (!tail.startsWith(dom + "-")) continue;
      const dir: string = join(repo, "packages", dom, tail.slice(dom.length + 1));
      if (existsSync(join(dir, "src", "card.ts"))) hits.push(dir);
    }
  }
  if (hits.length === 0) throw new Error(`disclose: unknown card '${cardId}'`);
  if (hits.length > 1) throw new Error(`disclose: card '${cardId}' is ambiguous (${hits.length} packages)`);
  return hits[0];
}

/** The card's agents md (src/agents/**, AGENT.md first, sorted,
 *  capped — the cap is the contract: lines route, bodies stay
 *  bounded). */
export function cardSkillDocs(pkgDir: string): Array<{ path: string; text: string }> {
  const MAX_FILES = 8;
  const MAX_BYTES = 32768;
  const agents: string = join(pkgDir, "src", "agents");
  let files: string[] = [];
  try {
    files = readdirSync(agents).filter((f): boolean => f.endsWith(".md"));
  } catch {
    return [];
  }
  files.sort((a, b): number => {
    const ra: number = a === "AGENT.md" ? 0 : 1;
    const rb: number = b === "AGENT.md" ? 0 : 1;
    return ra - rb || (a < b ? -1 : 1);
  });
  const out: Array<{ path: string; text: string }> = [];
  let budget: number = MAX_BYTES;
  for (const f of files.slice(0, MAX_FILES)) {
    if (budget <= 0) break;
    try {
      const text: string = readFileSync(join(agents, f), "utf8").slice(0, budget);
      budget -= text.length;
      out.push({ path: "src/agents/" + f, text });
    } catch {
      // unreadable — skip, never refuse the bundle
    }
  }
  return out;
}

/** The card's tool-call signature — the /v1/tools row
 *  envelope (ROW_KEYS mirror toolsEmit — one projection, the
 *  emitter imported, the envelope shared by construction). */
export function toolRowFor(
  id: string,
  def: { schemaCarrier?: unknown; schema: unknown; boarded: readonly string[] },
  rows: ReturnType<typeof toolBaseRows>,
): Record<string, unknown> {
  const base = rows.get(id);
  if (base === undefined) throw new Error(`disclose: no tool row for card '${id}'`);
  const paramsSchema = emitParamsSchema(
    ((def as { schemaCarrier?: unknown }).schemaCarrier ?? def.schema) as Parameters<typeof emitParamsSchema>[0],
    def.boarded,
  );
  return {
    name: base.name,
    version: base.version,
    kind: base.kind,
    card: base.card,
    model: base.model,
    stage_title: base.stageTitle,
    description: base.description,
    params_schema: {
      type: paramsSchema.type,
      properties: paramsSchema.properties as Record<string, unknown>,
      ...(paramsSchema.required !== undefined ? { required: paramsSchema.required } : {}),
    },
  };
}

/** The bundle digest (the DSH session-catalog half we CAN own:
 *  their catalog is digest-diffed "stable, never duplicated" — we
 *  don't own the loop so we can't clear the agent's context, but a
 *  stable content hash lets the agent dedupe its own reloads: quote
 *  the digests you hold, skip reload on a match). sha16 of the
 *  canonical bundle JSON (the asset pipeline's sha16 convention). */
export function bundleDigest(bundle: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(bundle)).digest("hex").slice(0, 16);
}

// ── end moved pures ──


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
 *  tier-1 skill lines + model hints (the boarded families' DECL
 *  identity — models as card DATA, never agent-addressed; prompt
 *  craft is the agent's own via the skill lines, and LLM-powered
 *  enhance is the user's ✦ door, never served here). Throws LOUD
 *  on unknown ids (the door maps to 404). */
export function loadCard(
  repo: string,
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
  const hints: Array<Record<string, unknown>> = [];
  for (const fam of (def as { boarded: readonly string[] }).boarded) {
    const d = decls.get(fam);
    if (d === undefined) continue;
    hints.push({ id: d.id, label: d.label, description: d.description });
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
          return { status: 200, body: JSON.stringify({ bundle: loadCard(repo, cards, models, name) }, null, 2), contentType: "application/json", headers: {} };
        } catch (e) {
          return { status: 404, body: JSON.stringify({ error: (e as Error).message }), contentType: "application/json", headers: {} };
        }
      }
      return undefined;
    });
  },
};
