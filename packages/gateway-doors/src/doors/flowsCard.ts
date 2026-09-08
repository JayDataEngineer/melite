// doors/flowsCard.ts — the {model:} card composer arm (TS-native card
// lane, 2026-09-08).
//
// WHAT THIS PORTS (line-cited against python/gateway.py + the cordis
// plane): the card-run derivation resolve_card_model (598-682) +
// submit's phase-2 arm (1273-1305) + the rim wrap (infra/python/plugins.py
// card_hooks.compose 525-600), with the survey's verdict
// (docs/design/card-lane-port-survey-2026-09-08.md §0 + §5): import
// @comfyui/cordis IN-PROCESS — no template SSOT, no subprocess, no
// class-tree port. The graph truth already lives in TS
// (packages/engines/comfyui/cordis/src — 19 cards, golden-pinned);
// this arm only changes the CALL PATH (subprocess shell -> import).
//
// THE CHAIN (py order, mirrored step-for-step):
//   1. envelope/draft/strict/exclusivity — OWNED by flowsRun.ts
//      (handleFlowsStart, already ported); this arm starts past it.
//   2. model-id legality (validate-door voice, flowsValidate.ts
//      modelArm) + existence (resolve_model's voice: "no model
//      unit ...", infra/python/plugins.py:394) + the non-cordis arm
//      refusal (python schema arm — unported half, code-identical).
//   3. artifact-ref sweep (py 610-630, infra/python/artifact_refs.py
//      find_dangling_refs semantics — every /v1/assets/... URL must
//      exist on served mounts BEFORE compose).
//   4. route-lens stamp overlay (py _route_stamp_overlay 705-751):
//      family defaults + the SELECTED variant's resolver_defaults,
//      absent-keys-only, filtered to the card field surface
//      (schema keys + admits). Facts carry every input
//      (model-facts.json variants[].resolver_defaults).
//   5. R1 variant/quant wire contract (survey §5.3 + §6 R1): body
//      `variant`/`quant` keys select the matrix cell when stated
//      (matched against facts variant id/route + cell quant);
//      unstated coordinates fall to the FIRST non-Recipe variant /
//      first cell (Model.resolve, grammar.py:1102-1121). Route-id-
//      as-model is preserved (resolveCardFamily). The keys are
//      CONSUMED (never reach compose — no card declares them).
//   6. envelope lift (card_compose_body 363-372: body minus
//      CARD_ENVELOPE_KEYS restaged as {params}) + the nested-stanza
//      unwrap (cli.ts:82-91 — a `params` dict key IS the stanza).
//   7. $spell phase-1 rule (compose/__init__.py spell block): a
//      phaseless call (run_id "") whose spell params carry $ values
//      composes NO graph.
//   8. admission-contract gate (cli.ts:102-116 verbatim voice).
//   9. in-process compose: ONE Context + ComfyUIService +
//      auto-loaded cards (the cli.ts:59-63 loop), setFacts +
//      setObjectInfo (snapshot: packages/engines/comfyui/data/
//      object_info.json — R3: absent refuses CLOSED, never proceeds
//      unauthenticated), ctx.comfyui.compose(card, family, params,
//      runId) — the same call cli.ts:118 makes. ComposeRefusal.code
//      maps to the refusal detail.
//  10. stage-row wrap (the rim, plugins.py:566-588): {id: skeleton
//      (the card definition, fallback: the posted mid), engine comfyui,
//      params: {workflow: graph}} — submitted through the EXISTING
//      engine layer (engine/comfyui.ts executeFlow) exactly like
//      flow_inline runs (L3 routing, upload walk, harvest,
//      interrupt, timeout all reused untouched).
//
// REFUSAL VOICES: every card-lane failure carries the py shape
// `card_compose phase <N>: card_compose rc=1 (comfyui.comfyui):
// <detail>` (_compose_refusal 191-210 over the rim's
// `card_compose rc=%d (%s.%s)` 546-551), where <detail> is the
// CLI-stderr-line shape (`<code>: <msg>` for ComposeRefusal — the
// cli.ts catch; `compose-door: ...` for the admission die). The
// (comfyui.comfyui) prefix rides the ENGINE_TABLE derivation
// (plugin dir name + engine type, as scan_engines reports them —
// the flowsValidate.ts header pins the same table). Pre-compose
// request failures (illegal id, no unit, dangling ref) keep their
// existing validate-door voices (code invalid_request) so
// start+validate agree field-for-field.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { Context } from "@deepseek-ai/cordis";
import type { Plugin } from "@deepseek-ai/cordis";
import { ComfyUIService, ComposeRefusal, loadCardDefs, loadFacts } from "@comfyui/cordis";
import type { CardDefinition, FactsFile } from "@comfyui/cordis";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DOOR_KEYS, FLOW_ID_RE } from "@melite/gateway-core";
import { pyReprStr } from "@melite/engine-comfyui";

/** The card-envelope keys (gateway.py:360 CARD_ENVELOPE_KEYS =
 *  DOOR_KEYS + draft/test/service): select the graph, never ride it. */
export const CARD_ENVELOPE_KEYS: readonly string[] = [
  ...DOOR_KEYS,
  "draft_id",
  "test",
  "service",
];

/** The card-lane refusal: status + the py _refusal envelope shape
 *  (error, code, then loc/expected/got) — the door maps it through
 *  the local refusal() + serializePy path (byte parity). */
export class CardArmError extends Error {
  readonly status: number;
  readonly code: string;
  readonly loc?: string;
  readonly expected?: string;
  readonly got?: string;
  constructor(
    status: number,
    message: string,
    code: string,
    loc?: string,
    expected?: string,
    got?: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    if (loc !== undefined) this.loc = loc;
    if (expected !== undefined) this.expected = expected;
    if (got !== undefined) this.got = got;
  }
}

/** Phase-N compose failure (py _compose_refusal 191-210 over the rim
 *  546-551): `card_compose phase <N>: card_compose rc=1
 *  (comfyui.comfyui): <detail>`. */
function phaseRefusal(phase: string, detail: string): CardArmError {
  return new CardArmError(
    400,
    "card_compose phase " + phase + ": card_compose rc=1 (comfyui.comfyui): " + detail,
    "card_compose",
  );
}

// ── repo anchoring (the uploads.ts pattern: MELITE_REPO_ROOT else
// file-anchored; DOORS→src→gateway→packages→repo = 4 hops) ─────────

function resolveRepoRoot(): string {
  const override: string = process.env["MELITE_REPO_ROOT"] ?? "";
  if (override !== "") return override;
  const here: string = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..", "..", "..");
}

// ── frozen data loaders (facts + decls + pin snapshot) ─────────────

export interface VariantCellRow {
  readonly quant: string;
  readonly route: string;
}

export interface VariantRow {
  readonly id: string;
  readonly group: string;
  readonly route: string;
  readonly resolver_defaults: Record<string, unknown>;
  readonly cells: VariantCellRow[];
}

export interface ModelFactsRow {
  readonly card: string;
  readonly defaults: Record<string, unknown>;
  readonly variants: VariantRow[];
  /** The assembly-studio declaration (hand-owned model-facts.json
   *  carries it; the projection unions its writes into admits). */
  readonly studio?: { readonly writes?: readonly unknown[] };
}

export interface CardDeclRow {
  readonly skeleton: string;
  readonly boarded: readonly string[];
  readonly schemaNames: readonly string[];
  readonly admits: readonly string[];
  readonly spells: readonly string[];
}

let factsCache: Record<string, ModelFactsRow> | null = null;
let declsCache: Record<string, CardDeclRow> | null = null;
let defsCache: Map<string, CardDefinition> | null = null;
let oiCache: { mtimeMs: number; doc: Record<string, unknown> } | null = null;
let oiPathCache: string | null = null;

function factsPath(): string {
  return join(
    resolveRepoRoot(), "packages", "engines", "comfyui", "cordis", "data", "model-facts.json",
  );
}

function objectInfoPath(): string {
  return join(resolveRepoRoot(), "packages", "engines", "comfyui", "data", "object_info.json");
}

/** Test seam: drop the frozen-data caches (walls boot fresh
 *  processes; belt-and-braces for in-process reuse). */
export function resetCardCachesForTests(): void {
  factsCache = null;
  declsCache = null;
  defsCache = null;
  oiCache = null;
  oiPathCache = null;
  modelMidsCache = null;
}

function loadModelFacts(): Record<string, ModelFactsRow> {
  if (factsCache !== null) return factsCache;
  const doc: unknown = JSON.parse(readFileSync(factsPath(), "utf8"));
  const models: unknown = (doc as Record<string, unknown>)["models"];
  factsCache =
    typeof models === "object" && models !== null
      ? (models as Record<string, ModelFactsRow>)
      : {};
  return factsCache;
}

/** Prime the card registry (PURGE S-decls): the registry loads
 *  async (dynamic card-module imports) but the validate rim is sync
 *  (handleFlowsValidate → modelArm → overlayCardParams), so every
 *  gateway boot primes once and the request path projects
 *  synchronously. Called at both main.ts boot sites; unprimed sync
 *  access throws LOUD (never a fallback). */
export async function primeCardRegistry(): Promise<void> {
  defsCache = await loadCardDefs();
}

/** Sync read of the primed registry (PURGE S-snapshots: the
 *  disclosure projection (toolProjection.ts) serves from the
 *  registry, and the disclosure doors are sync — same prime rule
 *  as the validate rim: unprimed access throws LOUD). */
export function cardDefsSync(): Map<string, CardDefinition> {
  if (defsCache === null) {
    throw new Error(
      "[card_registry] unprimed: boot must await primeCardRegistry() " +
        "before the disclosure rim serves (both main.ts boot sites " +
        "prime; walls boot through startServer which primes)",
    );
  }
  return defsCache;
}

function loadCardDecls(): Record<string, CardDeclRow> {
  if (declsCache !== null) return declsCache;
  if (defsCache === null) {
    throw new Error(
      "[card_registry] unprimed: boot must await primeCardRegistry() " +
        "before the validate/compose rim serves (both main.ts boot " +
        "sites prime; walls boot through startServer which primes)",
    );
  }
  const facts: Record<string, ModelFactsRow> = loadModelFacts();
  const out: Record<string, CardDeclRow> = {};
  for (const [id, def] of defsCache) {
    // The emitter's carrier line (toolsEmit.ts mirror): normal cards
    // carry the Schemastery object as .schema; wrapped cards (h3)
    // project .schemaCarrier. schemaNames = the knob surface.
    // Schemastery schemas are CALLABLE (def types .schema as a
    // function) — typeof is 'function', not 'object'.
    const carrier: unknown =
      (def as { schemaCarrier?: unknown }).schemaCarrier ?? def.schema;
    const dict: Record<string, unknown> =
      (typeof carrier === "object" || typeof carrier === "function") && carrier !== null
        ? ((carrier as { dict?: unknown }).dict as Record<string, unknown> ?? {})
        : {};
    const names: string[] = Object.keys(dict);
    // The admits rule (the retired exporter's gathering, inlined —
    // purge S-decls: the exporter is deleted, this projection is the
    // rule's home): admits = class-attr extras (def.admits) ∪ the
    // families' studio writes (trailing-* ride verbatim — the
    // admission gate matches them as prefixes). Schema knobs are
    // NOT admits members — the gate checks knobs separately.
    const seen = new Set<string>();
    const admits: string[] = [];
    const take = (v: unknown): void => {
      if (typeof v === "string" && !seen.has(v)) {
        seen.add(v);
        admits.push(v);
      }
    };
    for (const a of def.admits ?? []) take(a);
    for (const fam of def.boarded) {
      const writes: unknown = facts[fam]?.studio?.writes;
      if (Array.isArray(writes)) for (const w of writes) take(w);
    }
    out[id] = {
      skeleton: def.skeleton,
      boarded: [...def.boarded],
      schemaNames: names,
      admits,
      spells: [...(def.spells ?? [])],
    };
  }
  declsCache = out;
  return declsCache;
}

/** The pin snapshot (R3 — mtime-keyed: a re-pin must never serve a
 *  stale autofill map). null = absent on disk. */
function loadObjectInfo(): Record<string, unknown> | null {
  const path: string = objectInfoPath();
  let mtimeMs = 0;
  try {
    mtimeMs = statSync(path).mtimeMs;
  } catch {
    oiCache = null;
    oiPathCache = path;
    return null;
  }
  if (oiCache !== null && oiPathCache === path && oiCache.mtimeMs === mtimeMs) {
    return oiCache.doc;
  }
  try {
    const doc: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (typeof doc !== "object" || doc === null || Array.isArray(doc)) return null;
    oiCache = { mtimeMs, doc: doc as Record<string, unknown> };
    oiPathCache = path;
    return oiCache.doc;
  } catch {
    return null;
  }
}

// ── model resolution (resolve_model's existence half +
// _route_family over the facts variant tables) ─────────────────────

let modelMidsCache: Set<string> | null = null;

/** resolve_model's existence half — RE-HOMED 2026-09-08 on the frozen
 *  discovery catalog (packages/gateway/data/discovery-catalog.json,
 *  .catalog.models keys; hand-owned since purge S-catalog,
 *  wall-pinned). It replaces the models/<genre>/<mid>/model.py fs scan
 *  (estate-python purge deleted every model.py — the scan resolved the
 *  empty set and every {model:} compose refused). Missing file throws
 *  LOUD via readFileSync (same as loadModelFacts); a malformed shape
 *  resolves empty (same as loadModelFacts). */
function modelMids(): Set<string> {
  if (modelMidsCache !== null) return modelMidsCache;
  const path: string = join(
    resolveRepoRoot(), "packages", "gateway", "data", "discovery-catalog.json",
  );
  const doc: unknown = JSON.parse(readFileSync(path, "utf8")) as unknown;
  const models: unknown =
    typeof doc === "object" && doc !== null
      ? (doc as { catalog?: { models?: unknown } }).catalog?.models
      : undefined;
  modelMidsCache = new Set(
    typeof models === "object" && models !== null && !Array.isArray(models)
      ? Object.keys(models as Record<string, unknown>)
      : [],
  );
  return modelMidsCache;
}

/** The owning family for mid: mid itself, or the facts model whose
 *  variant/cell route owns mid (mirrors _route_family; route-id-as-
 *  model is preserved — the graph is addressed by the family). */
export function resolveCardFamily(mid: string): string {
  const facts: Record<string, ModelFactsRow> = loadModelFacts();
  if (mid in facts) return mid;
  for (const [fam, row] of Object.entries(facts)) {
    for (const v of row.variants ?? []) {
      if (v.route === mid) return fam;
      for (const c of v.cells ?? []) {
        if (c.route === mid) return fam;
      }
    }
  }
  return mid;
}

// ── R1 variant/quant selection + route-lens stamp overlay ──────────

export interface VariantSelection {
  readonly variantId: string;
  readonly quant: string;
  readonly resolverDefaults: Record<string, unknown>;
}

function knownVariantIds(row: ModelFactsRow): string[] {
  return (row.variants ?? []).map((v) => v.id);
}

/** Select the matrix cell (R1 wire contract): explicit body
 *  variant/quant keys win when stated (matched against facts
 *  variant id/route + cell quant); unstated coordinates fall to
 *  the FIRST non-Recipe variant / first cell (Model.resolve —
 *  the family default). Unknown coordinates refuse LOUD (never a
 *  silent neighbor cell). */
export function selectCardVariant(
  mid: string,
  famRow: ModelFactsRow,
  body: Record<string, unknown>,
  phase: string,
): VariantSelection {
  const variants: VariantRow[] = famRow.variants ?? [];
  const configured: VariantRow[] = variants.filter((v) => v.group !== "Recipe");
  const pool: VariantRow[] = configured.length > 0 ? configured : variants;
  const rawVariant: unknown = body["variant"];
  const rawQuant: unknown = body["quant"];
  let variant: VariantRow | undefined;
  if (rawVariant === undefined || rawVariant === null) {
    variant = pool[0];
  } else {
    if (typeof rawVariant !== "string") {
      throw new CardArmError(
        400,
        "card_compose phase " + phase + ": variant must be a string (got " +
          (Array.isArray(rawVariant) ? "list" : typeof rawVariant) + ")",
        "card_compose",
      );
    }
    variant = variants.find((v) => v.id === rawVariant || v.route === rawVariant);
    if (variant === undefined) {
      throw new CardArmError(
        400,
        "card_compose phase " + phase + ": unknown variant " + pyReprStr(rawVariant) +
          " for model " + pyReprStr(mid) + " (known: " + knownVariantIds(famRow).join(", ") + ")",
        "card_compose",
      );
    }
  }
  let quant = "";
  if (rawQuant !== undefined && rawQuant !== null) {
    if (typeof rawQuant !== "string") {
      throw new CardArmError(
        400,
        "card_compose phase " + phase + ": quant must be a string (got " +
          (Array.isArray(rawQuant) ? "list" : typeof rawQuant) + ")",
        "card_compose",
      );
    }
    const cells: VariantCellRow[] = variant !== undefined ? (variant.cells ?? []) : [];
    const hit: VariantCellRow | undefined = cells.find((c) => c.quant === rawQuant);
    if (hit === undefined) {
      const known: string = cells.map((c) => c.quant).join(", ");
      throw new CardArmError(
        400,
        "card_compose phase " + phase + ": unknown quant " + pyReprStr(rawQuant) +
          " for model " + pyReprStr(mid) + " variant " +
          pyReprStr(variant !== undefined ? variant.id : "") +
          (known !== "" ? " (known: " + known + ")" : " (the variant declares no cells)"),
        "card_compose",
      );
    }
    quant = hit.quant;
  } else if (variant !== undefined && (variant.cells ?? []).length > 0) {
    quant = String((variant.cells as VariantCellRow[])[0]?.quant ?? "");
  }
  return {
    variantId: variant !== undefined ? variant.id : "",
    quant,
    resolverDefaults: variant !== undefined ? { ...(variant.resolver_defaults ?? {}) } : {},
  };
}

/** The route-lens stamp overlay (py _route_stamp_overlay 705-751):
 *  family defaults + the selected variant's resolver_defaults,
 *  injected ONLY for absent keys, filtered to the owning card's
 *  field surface (schema keys + admits, exact or trailing-*
 *  prefix). None/"" stamps never ride (UNSET markers — riding
 *  them would refuse the str fields the row leaves open).
 *  variant/quant contract keys are CONSUMED (never ride compose —
 *  no card declares them). Returns the STAMPED body (a copy). */
export function stampCardOverlay(
  body: Record<string, unknown>,
  famRow: ModelFactsRow,
  decl: CardDeclRow,
  sel: VariantSelection,
): Record<string, unknown> {
  const stamps: Record<string, unknown> = { ...(famRow.defaults ?? {}) };
  for (const [k, v] of Object.entries(sel.resolverDefaults)) stamps[k] = v;
  const names: Set<string> = new Set(decl.schemaNames);
  const admits: readonly string[] = decl.admits;
  const onSurface = (k: string): boolean => {
    if (names.has(k)) return true;
    return admits.some((a) => a === k || (a.endsWith("*") && k.startsWith(a.slice(0, -1))));
  };
  const out: Record<string, unknown> = { ...body };
  for (const [k, v] of Object.entries(stamps)) {
    if (v === null || v === undefined || v === "") continue;
    if (!onSurface(k)) continue;
    if (k in out) continue;
    if ((CARD_ENVELOPE_KEYS as readonly string[]).includes(k)) continue;
    out[k] = v;
  }
  return out;
}

/** The card-compose lift (card_compose_body 363-372): the run body
 *  minus the gateway envelope, restaged as the ONE params stanza.
 *  variant/quant ride the R1 contract (consumed at selection, never
 *  params — no card declares knobs by those names). */
export function liftCardParams(body: Record<string, unknown>): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if ((CARD_ENVELOPE_KEYS as readonly string[]).includes(k)) continue;
    if (k === "variant" || k === "quant") continue;
    params[k] = v;
  }
  return params;
}

// ── artifact-ref sweep (infra/python/artifact_refs.py find_dangling_refs
// semantics — the flowsValidate.ts mirror, same roots) ─────────────

const ASSET_RUNS_PREFIX: string = "/v1/assets/runs/";

function sweepRoots(): { outRoot: string; testOutRoot: string } {
  const runs: string = join(resolveRepoRoot(), "data", "runs");
  return { outRoot: join(runs, "output"), testOutRoot: join(runs, "test-output") };
}

function resolveArtifactFile(ref: string, outRoot: string): string {
  const raw: string = String(ref ?? "").trim();
  if (raw === "") throw new Error("empty artifact ref (nothing to resolve)");
  if (raw.includes("..")) throw new Error("artifact ref refuses traversal: " + pyReprStr(raw));
  let cand: string;
  if (raw.startsWith(ASSET_RUNS_PREFIX)) {
    const rel: string = raw.slice(ASSET_RUNS_PREFIX.length);
    if (rel === "" || rel.endsWith("/") || !rel.includes("/")) {
      throw new Error(
        "malformed artifact URL (want /v1/assets/runs/<run_id>/<file>): " + pyReprStr(raw),
      );
    }
    cand = join(outRoot, rel);
  } else if (raw.includes("/") && !raw.startsWith("/")) {
    cand = join(outRoot, raw);
  } else if (raw.startsWith("/")) {
    cand = raw;
  } else {
    throw new Error(
      "artifact ref is a bare " + pyReprStr(raw) + " — not an absolute path, an artifact URL " +
        "(/v1/assets/runs/<run>/<file>), or a runs-relative <run>/<file> (a bare filename lives " +
        "in the ComfyUI input dir and is the caller's staging concern, never a disk lookup)",
    );
  }
  const absCand: string = resolve(cand);
  const absRoot: string = resolve(outRoot);
  const relToRoot: string = relative(absRoot, absCand);
  if (relToRoot === ".." || relToRoot.startsWith(".." + sep)) {
    throw new Error("artifact ref escapes the output root: " + pyReprStr(raw));
  }
  let isFile = false;
  try {
    isFile = statSync(absCand).isFile();
  } catch {
    isFile = false;
  }
  if (!isFile) {
    const run: string = raw.startsWith(ASSET_RUNS_PREFIX)
      ? (raw.slice(ASSET_RUNS_PREFIX.length).split("/", 2)[0] ?? "?")
      : "?";
    throw new Error(
      "artifact not found on disk: " + pyReprStr(raw) + " (looked up " + absCand + ") — the " +
        "upstream run may have been pruned, or the ref was never an output of run " + run,
    );
  }
  return absCand;
}

function refLocations(body: unknown): Array<{ location: string; ref: string }> {
  const out: Array<{ location: string; ref: string }> = [];
  const stack: Array<{ node: unknown; path: string }> = [{ node: body, path: "$" }];
  while (stack.length > 0) {
    const top = stack.pop() as { node: unknown; path: string };
    const node: unknown = top.node;
    const path: string = top.path;
    if (typeof node === "object" && node !== null && !Array.isArray(node)) {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        stack.push({ node: value, path: path + "." + key });
      }
    } else if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        stack.push({ node: node[i], path: path + "[" + i + "]" });
      }
    } else if (typeof node === "string" && node.startsWith(ASSET_RUNS_PREFIX)) {
      out.push({ location: path, ref: node });
    }
  }
  return out;
}

/** find_dangling_refs semantics: the first dangling (location, ref,
 *  why), or null when every wired artifact URL is live under
 *  EITHER served root (the test root serves too — a test:true run
 *  may wire a test artifact). */
export function findCardDangling(
  body: Record<string, unknown>,
): [string, string, string] | null {
  const { outRoot, testOutRoot } = sweepRoots();
  for (const { location, ref } of refLocations(body)) {
    let live = false;
    let primaryErr: Error | null = null;
    for (const root of [outRoot, testOutRoot]) {
      try {
        resolveArtifactFile(ref, root);
        live = true;
        break;
      } catch (e) {
        if (primaryErr === null) primaryErr = e as Error;
      }
    }
    if (!live) return [location, ref, (primaryErr as Error).message];
  }
  return null;
}

// ── resolution front half (shared by start phase-1 + validate) ────

export interface PreparedCard {
  readonly mid: string;
  readonly fam: string;
  readonly card: string;
  readonly skeleton: string;
  readonly decl: CardDeclRow;
  readonly params: Record<string, unknown>;
}

/** Python str() for the mid coercion (resolve_request's
 *  `mid = str(body["model"])` — None -> "None", True -> "True";
 *  the flowsValidate.ts pyStr mirror). */
export function pyStrMid(v: unknown): string {
  if (typeof v === "string") return v;
  if (v === true) return "True";
  if (v === false) return "False";
  if (v === null || v === undefined) return "None";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "True" : "False";
  return JSON.stringify(v) ?? String(v);
}

/** Resolve + sweep + select + overlay + lift (steps 2-6): everything
 *  before compose. Throws CardArmError (the door maps it to the
 *  refusal envelope). `phase` stamps the phase-N voice on R1
 *  selection refusals ("1" for validate/phase-1). Order mirrors
 *  resolve_card_model + the validate modelArm: artifact sweep FIRST
 *  (fail fast — a sloppy compose never runs), then legality,
 *  existence, the non-cordis arm check, selection, overlay, lift. */
export function prepareCardParams(
  body: Record<string, unknown>,
  mid: string,
  phase: string,
): PreparedCard {
  const dangling = findCardDangling(body);
  if (dangling !== null) {
    const [location, ref, why] = dangling;
    throw new CardArmError(
      400,
      "dangling artifact ref at " + pyReprStr(location) + ": " + ref + " (" + why + ")",
      "invalid_request",
    );
  }
  if (!FLOW_ID_RE.test(mid)) {
    throw new CardArmError(
      400,
      "model id " + pyReprStr(mid) + " is not a legal identifier",
      "invalid_request",
    );
  }
  const facts: Record<string, ModelFactsRow> = loadModelFacts();
  const resolves: boolean =
    mid in facts || resolveCardFamily(mid) in facts || modelMids().has(mid);
  if (!resolves) {
    throw new CardArmError(
      400,
      "no model unit for model: " + mid + " (no .catalog.models row " + mid +
        " in the frozen discovery catalog and no family declares route " + mid +
        " in its variants' cells — checked the class tree's _routes map)",
      "invalid_request",
    );
  }
  const fam: string = resolveCardFamily(mid);
  const famRow: ModelFactsRow | undefined = facts[fam];
  if (famRow === undefined) {
    throw new CardArmError(
      400,
      "card_compose phase " + phase + ": model " + pyReprStr(mid) +
        " composes outside the cordis plane (python schema arm — unported half in this stroke)",
      "card_compose",
    );
  }
  const decls: Record<string, CardDeclRow> = loadCardDecls();
  const decl: CardDeclRow | undefined = decls[famRow.card];
  if (decl === undefined) {
    throw new CardArmError(
      400,
      "card_compose phase " + phase + ": unknown card " + pyReprStr(famRow.card) +
        " (no registered card definition for the card model " + pyReprStr(mid) + " names)",
      "card_compose",
    );
  }
  const sel: VariantSelection = selectCardVariant(mid, famRow, body, phase);
  const stamped: Record<string, unknown> = stampCardOverlay(body, famRow, decl, sel);
  return {
    mid,
    fam,
    card: famRow.card,
    skeleton: decl.skeleton !== "" ? decl.skeleton : mid,
    decl,
    params: liftCardParams(stamped),
  };
}

// ── validate-door entry (the SAME overlay, phase-1 voice) ─────────
// The validate modelArm owns legality/existence/sweep/CLI itself
// (wall-pinned); it calls here ONLY for R1 selection + the
// route-lens stamp overlay + lift, so start+validate compose the
// identical params (phase-1 with run_id "" on both). Precondition:
// mid is legal and resolves to a cordis family (the caller's own
// checks refuse first, same voices). Throws CardArmError on unknown
// variant/quant or an unregistered card.

export interface OverlaidCard {
  readonly fam: string;
  readonly card: string;
  readonly params: Record<string, unknown>;
}

export function overlayCardParams(
  body: Record<string, unknown>,
  mid: string,
): OverlaidCard {
  const facts: Record<string, ModelFactsRow> = loadModelFacts();
  const fam: string = resolveCardFamily(mid);
  const famRow: ModelFactsRow | undefined = facts[fam];
  if (famRow === undefined) {
    throw new CardArmError(
      400,
      "card_compose phase 1: model " + pyReprStr(mid) +
        " composes outside the cordis plane (python schema arm — unported half in this stroke)",
      "card_compose",
    );
  }
  const decl: CardDeclRow | undefined = loadCardDecls()[famRow.card];
  if (decl === undefined) {
    throw new CardArmError(
      400,
      "card_compose phase 1: unknown card " + pyReprStr(famRow.card) +
        " (no registered card definition for the card model " + pyReprStr(mid) + " names)",
      "card_compose",
    );
  }
  const sel: VariantSelection = selectCardVariant(mid, famRow, body, "1");
  const stamped: Record<string, unknown> = stampCardOverlay(body, famRow, decl, sel);
  return { fam, card: famRow.card, params: liftCardParams(stamped) };
}

// ── in-process compose (the core: steps 7-9) ───────────────────────

export interface ComposedCard {
  readonly graph: Record<string, unknown>;
  readonly skeleton: string;
  readonly spell: { skeleton: string; inputs: Record<string, unknown> } | null;
}

function cordisSrcDir(): string {
  const entry: string = fileURLToPath(import.meta.resolve("@comfyui/cordis"));
  return dirname(entry);
}

async function composeOnce(
  card: string,
  fam: string,
  params: Record<string, unknown>,
  runId: string,
  phase: string,
): Promise<Record<string, unknown>> {
  const oi: Record<string, unknown> | null = loadObjectInfo();
  if (oi === null) {
    throw phaseRefusal(
      phase,
      "comfyui object_info snapshot absent (" +
        objectInfoPath() +
        ") — refusing closed (EXTENSION LAW: never compose unauthenticated)",
    );
  }
  const ctx = new Context();
  await ctx.plugin({
    apply(c: Context): void {
      new ComfyUIService(c);
    },
  });
  const cardsDir: string = join(cordisSrcDir(), "cards");
  for (const f of readdirSync(cardsDir).filter((x) => x.endsWith(".ts"))) {
    // the cli.ts:59-63 auto-load loop, in-process: the WHOLE module
    // namespace rides (cards declare `export const inject =
    // ['comfyui']` at module level — passing only { apply } drops
    // the inject declaration and compose dies with "cannot get
    // property comfyui without inject"). A card lands by dropping
    // its file; no shared-file edit.
    const mod = (await import(pathToFileURL(join(cardsDir, f)).href)) as unknown as Plugin;
    if (typeof (mod as { apply?: unknown }).apply === "function") {
      await ctx.plugin(mod);
    }
  }
  ctx.comfyui.setFacts(loadFacts(factsPath()));
  ctx.comfyui.setObjectInfo(oi);
  // THE NESTED STANZA UNWRAP (cli.ts:82-91): a `params` dict key in
  // the incoming params IS the stanza; siblings merge over it.
  let lifted: Record<string, unknown> = params;
  {
    const inner: unknown = lifted["params"];
    if (
      typeof inner === "object" && inner !== null && !Array.isArray(inner)
    ) {
      lifted = {
        ...(inner as Record<string, unknown>),
        ...Object.fromEntries(Object.entries(lifted).filter(([k]) => k !== "params")),
      };
    }
  }
  // THE ADMISSION CONTRACT GATE (cli.ts admission verbatim voice):
  // every param key must be a declared knob or ride the admits row.
  const decls: Record<string, CardDeclRow> = loadCardDecls();
  const decl: CardDeclRow | undefined = decls[card];
  if (decl !== undefined) {
    const knobs: Set<string> = new Set(decl.schemaNames);
    const admits: readonly string[] = decl.admits;
    const admitted = (key: string): boolean =>
      knobs.has(key) ||
      admits.some((a) => a === key || (a.endsWith("*") && key.startsWith(a.slice(0, -1))));
    const unknown: string[] = Object.keys(lifted).filter((k) => !admitted(k)).sort();
    if (unknown.length > 0) {
      throw phaseRefusal(
        phase,
        "compose-door: unknown param(s) on the " + card + " card: " + unknown.join(", ") +
          " (admission is the declared surface — knobs + contract admits; see the card's TS definition)",
      );
    }
  }
  try {
    return ctx.comfyui.compose(card, fam, lifted, runId) as Record<string, unknown>;
  } catch (e) {
    if (e instanceof ComposeRefusal) {
      throw phaseRefusal(phase, e.code + ": " + e.message);
    }
    throw phaseRefusal(phase, e instanceof Error ? e.message : String(e));
  }
}

/** The facts document loader — the plane's own loader (facts.ts),
 *  so the in-process arm reads exactly what the CLI door reads. */
export function cardFactsFile(): FactsFile {
  return loadFacts(factsPath());
}

// ── the two phases (steps 7 + 9, shared by start; phase-1 shared
// by validate's in-process future — today validate shells the CLI
// with the same prepared params) ───────────────────────────────────

export interface Phase1Card extends PreparedCard {
  readonly spell: { skeleton: string; inputs: Record<string, unknown> } | null;
}

/** Phase 1 (run_id ""): validates shape/admission/boarding before
 *  registration. The $spell branch composes NO graph (the pool
 *  passes — the two-card-flow handoff). */
export async function phase1Card(
  body: Record<string, unknown>,
  mid: string,
): Promise<Phase1Card> {
  const prep: PreparedCard = prepareCardParams(body, mid, "1");
  const spells: readonly string[] = prep.decl.spells ?? [];
  const pool: Record<string, unknown> = {};
  for (const k of spells) {
    const v: unknown = prep.params[k];
    if (k in prep.params && typeof v === "string" && v.startsWith("$")) pool[k] = v;
  }
  if (Object.keys(pool).length > 0) {
    return { ...prep, spell: { skeleton: prep.skeleton, inputs: pool } };
  }
  await composeOnce(prep.card, prep.fam, prep.params, "", "1");
  return { ...prep, spell: null };
}

/** Phase 2 (the real run id): composes the SAME overlaid body phase
 *  1 validated (py submit 1294-1301 — idempotent, absent-keys-only;
 *  the editor's seeded stamps pass through byte-identical).
 *  A $spell body composes VERBATIM here (run context — the $spell
 *  wires into the Load* file slot; the merged path refuses a
 *  link-in-file-slot LOUDLY, test_two_card_flow). */
export async function phase2Card(p1: Phase1Card, runId: string): Promise<ComposedCard> {
  const graph: Record<string, unknown> = await composeOnce(
    p1.card,
    p1.fam,
    p1.params,
    runId,
    "2",
  );
  if (typeof graph !== "object" || graph === null || Array.isArray(graph)) {
    throw new CardArmError(
      400,
      "card_compose produced an empty graph for " + p1.mid,
      "invalid_request",
    );
  }
  return { graph, skeleton: p1.skeleton, spell: p1.spell };
}
