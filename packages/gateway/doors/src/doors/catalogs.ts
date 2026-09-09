// doors/catalogs.ts — the flow-first disclosure doors (the disclosure
// stroke, 2026-09-09): ONE system, flow preferred, card fallback.
//
//   GET /v1/flows/catalog?action=search&q=...      flow summaries
//   GET /v1/cards/catalog?action=search&q=&tags=   card summaries
//   GET /v1/cards/catalog?action=load_skills&ids=  the bundle per id:
//     (a) the card's tool signature (the /v1/tools row — the M1
//         projection, same builders as toolsEmit, never restated),
//     (b) the action card's skills (its src/agents/** docs),
//     (c) the model-level hints (its boarded families' DECL identity).
//
// Summaries are the routing layer (clamped one-liners — the catalog
// law); bodies load by exact id (load_skills). The agent searches
// FLOWS first; cards only when no flow fits (that order rides the
// melite-tools descriptions — the fallback is agent judgment, not a
// door refusal). Models are never addressed directly (the family
// DECL is data FOR the card — the model-catalog tool's degeneracy);
// they arrive inside (c).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import type { Context, Plugin } from "@deepseek-ai/cordis";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { DispatchResult } from "@melite/gateway-core";
import type { GatewayRequest } from "@melite/gateway-core";
import { emitParamsSchema, cardPackages } from "@melite/comfyui-cordis";
import { registryFlowNames, getRegistryFlow } from "./flowsRegistry.ts";
import { needCardRegistry } from "./flowsCard.ts";
import type { CardRegistryService } from "./flowsCard.ts";
import { needModels, modelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import { toolBaseRows } from "./toolProjection.ts";
import { doorMatch, mountDoorRoutes } from "../routeMount.ts";
import { disclosureRoot } from "./planes.ts";
import { catalogPath } from "./discovery.ts";
import { GENERIC_ENHANCE_RECIPE } from "@melite/gateway-core/prompt-guide";

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
    throw new Error(`catalogs: no packages tier under '${repo}'`);
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
  if (hits.length === 0) throw new Error(`catalogs: unknown card '${cardId}'`);
  if (hits.length > 1) throw new Error(`catalogs: card '${cardId}' is ambiguous (${hits.length} packages)`);
  return hits[0];
}

/** The bundle's (b): the card's skill docs (src/agents/**, AGENT.md
 *  first, sorted, capped — the cap is the contract: summaries route,
 *  bodies stay bounded). */
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

/** The bundle's (a): the card's tool signature — the /v1/tools row
 *  envelope (ROW_KEYS mirror toolsEmit — one projection, the
 *  emitter imported, the envelope shared by construction). */
export function toolRowFor(
  id: string,
  def: { schemaCarrier?: unknown; schema: unknown; boarded: readonly string[] },
  rows: ReturnType<typeof toolBaseRows>,
): Record<string, unknown> {
  const base = rows.get(id);
  if (base === undefined) throw new Error(`catalogs: no tool row for card '${id}'`);
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

/** The bundle's (c): the effective enhance recipe per family —
 *  the enhance_prompt toll, migrated to ambient knowledge (the
 *  disclosure stroke, 2026-09-09). Declared recipes ride the frozen
 *  form-spec capture (10/115 spec keys — enhance_prompt string or
 *  enhance_prompts field map, verbatim, never parsed); anything else
 *  falls back to the kernel's GENERIC_ENHANCE_RECIPE (one spelling —
 *  the ✦ sweep door spends the LLM call on the same text, the agent
 *  spends nothing and writes the prompt itself). The frozen file is
 *  1.5MB of DATA-root capture: cached module-level (frozen =
 *  truthful), best-effort (fixture roots lack it → all-generic,
 *  never a refusal). */
let enhanceCache: Map<string, Map<string, Record<string, string>>> = new Map();

export function enhanceMap(dataRoot: string): Map<string, Record<string, string>> {
  const hit: Map<string, Record<string, string>> | undefined = enhanceCache.get(dataRoot);
  if (hit !== undefined) return hit;
  const out = new Map<string, Record<string, string>>();
  try {
    const doc = JSON.parse(readFileSync(catalogPath(dataRoot), "utf8")) as {
      form_specs?: Record<string, { body?: { enhance_prompt?: unknown; enhance_prompts?: unknown } }>;
    };
    for (const [key, spec] of Object.entries(doc.form_specs ?? {})) {
      const body = spec.body ?? {};
      const one: unknown = body.enhance_prompt;
      if (typeof one === "string" && one !== "" && one !== "None") {
        out.set(key, { prompt: one });
        continue;
      }
      const many: unknown = body.enhance_prompts;
      if (typeof many === "object" && many !== null && !Array.isArray(many)) {
        const fields: Record<string, string> = {};
        for (const [f, r] of Object.entries(many as Record<string, unknown>)) {
          if (typeof r === "string" && r !== "") fields[f] = r;
        }
        if (Object.keys(fields).length > 0) out.set(key, fields);
      }
    }
  } catch {
    // no frozen capture (the sandbox fixture) — all-generic below
  }
  enhanceCache.set(dataRoot, out);
  return out;
}

/** The bundle digest (the DSH session-catalog half we CAN own:
 *  their catalog is digest-diffed "stable, never duplicated" — we
 *  don't own the loop so we can't clear the agent's context, but a
 *  stable content hash lets the agent dedupe its own reloads: quote
 *  the digests you hold, skip load_skills on a match). sha16 of the
 *  canonical bundle JSON (the asset pipeline's sha16 convention). */
export function bundleDigest(bundle: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(bundle)).digest("hex").slice(0, 16);
}

/** The load_skills bundle for one card id (a/b/c + digest). Throws
 *  LOUD on unknown ids (the door maps to 404); unreadable skill
 *  docs skip (the bundle degrades, never refuses). */
export function loadBundle(
  repo: string,
  dataRoot: string,
  cards: CardRegistryService,
  models: ModelsService,
  cardId: string,
): Record<string, unknown> {
  const defs = needCardRegistry(cards, "catalogLoad").defsSync();
  const def = defs.get(cardId);
  if (def === undefined) throw new Error(`catalogs: unknown card '${cardId}'`);
  const rows = toolBaseRows(defs);
  const pkgDir: string = resolveCardPackageDir(repo, cardId);
  const decls = new Map(models.allDecls().map((d): [string, { id: string; label: string; description: string }] => [d.id, { id: d.id, label: d.label, description: d.description ?? "" }]));
  const recipes: Map<string, Record<string, string>> = enhanceMap(dataRoot);
  const hints: Array<Record<string, unknown>> = [];
  for (const fam of def.boarded) {
    const d = decls.get(fam);
    if (d === undefined) continue; // unboarded/retired family — the board gate owns that refusal
    hints.push({ id: d.id, label: d.label, description: d.description, enhance: recipes.get(fam) ?? { prompt: GENERIC_ENHANCE_RECIPE } });
  }
  const bundle: Record<string, unknown> = {
    id: cardId,
    tool: toolRowFor(cardId, def as { schemaCarrier?: unknown; schema: unknown; boarded: readonly string[] }, rows),
    skills: cardSkillDocs(pkgDir),
    model_hints: hints,
  };
  bundle["digest"] = bundleDigest(bundle);
  return bundle;
}

/** First-non-blank query value (the planes qFirst shape). */
function qFirst(qs: Record<string, string[]>, name: string): string | null {
  const vals: string[] | undefined = qs[name];
  if (vals === undefined) return null;
  const hit: string | undefined = vals.find((v): boolean => v !== "");
  return hit ?? null;
}

/** Raw-target query parse (the planes parseTargetQuery shape). */
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

/** The catalog doors: /v1/flows/catalog + /v1/cards/catalog. */
export const catalogsDoors: Plugin = {
  name: "@melite/gateway-doors/catalogs",
  inject: ["gatewayError", "cardRegistry", "models", "webServer"],
  apply(ctx: Context): void {
    mountDoorRoutes(ctx, ctx.webServer, ["_h_catalogs"], async (req: GatewayRequest): Promise<DispatchResult | undefined> => {
      const hit = doorMatch(req, ["_h_catalogs"]);
      if (hit === null) return undefined;
      const qs: Record<string, string[]> = parseQuery(req.target);
      const action: string = qFirst(qs, "action") ?? "search";
      const repo: string = codeRoot();
      const dataRoot: string = disclosureRoot();
      if (req.path === "/v1/flows/catalog") {
        if (action !== "search") {
          return { status: 400, body: JSON.stringify({ error: `unknown action '${action}' (flows/catalog serves search)` }), contentType: "application/json", headers: {} };
        }
        const rows: FlowSummary[] = searchFlows(flowRows(repo), qFirst(qs, "q") ?? "");
        return { status: 200, body: JSON.stringify({ flows: rows }, null, 2), contentType: "application/json", headers: {} };
      }
      if (req.path === "/v1/cards/catalog") {
        const cards: CardRegistryService = needCardRegistry(ctx.cardRegistry, "catalogs");
        if (action === "search") {
          const rows: CardSummary[] = searchCards(
            cards.defsSync() as ReadonlyMap<string, SearchableCard>,
            qFirst(qs, "q") ?? "",
            qFirst(qs, "tags") ?? "",
          );
          return { status: 200, body: JSON.stringify({ cards: rows }, null, 2), contentType: "application/json", headers: {} };
        }
        if (action === "load_skills") {
          const ids: readonly string[] = (qFirst(qs, "ids") ?? "").split(",").map((s): string => s.trim()).filter((s): boolean => s !== "");
          if (ids.length === 0) {
            return { status: 400, body: JSON.stringify({ error: "load_skills needs ids (comma-separated card ids)" }), contentType: "application/json", headers: {} };
          }
          // The BOOTED singleton, not ctx.models: the provider news a
          // fiber-owned (empty) table per gateway Context — the family
          // fibers settle in bootModels()' own context (the registry
          // prime awaits it at boot). Request-path model reads ride
          // the singleton everywhere (flowsCard reads) — boot-loud
          // when unprimed, never an empty table. needModels stays as
          // the threading guard (an unthreaded caller is a bug).
          void needModels(ctx.models, "catalogs");
          const models: ModelsService = modelsService();
          const out: Array<Record<string, unknown>> = [];
          for (const id of ids) {
            try {
              out.push(loadBundle(repo, dataRoot, cards, models, id));
            } catch (e) {
              return { status: 404, body: JSON.stringify({ error: (e as Error).message }), contentType: "application/json", headers: {} };
            }
          }
          return { status: 200, body: JSON.stringify({ bundles: out }, null, 2), contentType: "application/json", headers: {} };
        }
        return { status: 400, body: JSON.stringify({ error: `unknown action '${action}' (cards/catalog serves search, load_skills)` }), contentType: "application/json", headers: {} };
      }
      return undefined;
    });
  },
};
