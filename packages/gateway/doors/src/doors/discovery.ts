// doors/discovery.ts — the NATIVE port of the 10 discovery READ doors
// (no runtime python; the stdio bridge is retired).
//
// Handlers (python/gateway.py names in parens; ROUTES mirror rows):
//   GET /v1/model-catalog                  (_h_model_catalog, 3041-3043)
//   GET /v1/model-catalog/*                (_h_model_one, 3046-3051)
//   GET /v1/models/*/provisions/*          (_h_model_provision, 3509-3547)
//   GET /v1/forms                          (_h_forms, 3054-3056)
//   GET /v1/kinds                          (_h_kinds, 3059-3061)
//   GET /v1/form-spec                      (_h_form_spec, 3064-3067)
//   GET /v1/loras                          (_h_loras, 3070-3082)
//   *   /v1/flows/families/param-schemas   (_h_family_schemas, 3085-3088)
//   GET /v1/schema                         (_h_schema, 3091-3099)
//   GET /v1/flows/families/*/param-schema  (_h_family_schema_one, 3102-3105)
//
// ARCHITECTURE (data-SSOT, the frozen-JSON pattern): every JSON
// arm serves the authoring-time export
// packages/gateway/shell/data/discovery-catalog.json (frozen by
// tools/export_discovery_catalog.py, which CALLS the real py
// functions — catalog.scan_catalog/to_json, editor_forms.forms/
// kinds/form_spec, catalog.model_loras, editor_runs.
// family_param_schemas/catalog_family_ids, flow.schema_snapshot —
// and freezes their answers as data). The generator dies with py;
// the data stands. The discovery wall diffs a fresh regen against
// the checked-in file (freshness leg — catches drift while py
// still lives; post-py the file is the frozen truth).
//
// Why a frozen export instead of decl-derived reads off the
// (now-deleted) card-decls.json + model-facts.json (the first
// sketch — retired with the purge): the snapshots do not carry what the doors serve, so a derivation
// CANNOT be byte-identical (probed 2026-09-07):
//   - model rows need label/description/source/form/engine/genre +
//     has_inference/has_rubric (melite_models/grammar.py model_row
//     1127-1166); model-facts.json rows carry no label, no
//     description, no source, no form. The live catalog serves 55
//     model rows; the facts file holds only the compose-plane rows.
//   - the LorasMod rows and the Provision rows exist on NEITHER
//     snapshot.
//   - the family param envelopes derive from the schema.py
//     enforcement rows (editor_runs.py 1475-1497 — card.py fields
//     are the FALLBACK only); card-decls schemaMeta is the card.py
//     side, the wrong source.
//   - the kinds wire order is py TABLE declaration order
//     (card_kinds.py TABLE 110-143); the generated vocab.ts
//     CARD_KINDS is SORTED alphabetically.
// The export freezes the SERVED answers instead, so no derivation
// runs here at all: parseJson keeps number literals as PyNum and
// dumpsPy re-emits them verbatim, so bodies are byte-identical to
// _adapt's json.dumps(payload, indent=2, default=str) (gateway.py
// 2649-2651) and to the old bridge chain (json.loads -> runner
// json.dumps -> parseJson -> dumpsPy preserve the object exactly).
//
// Per-arm source decisions (py cites inline at each arm):
//   - catalog: the parsed to_json object (models/families/
//     capabilities/cards/input_vocabulary). scan_order pins the
//     _scan_models first-match order find_model serves (no duplicate
//     ids exist — the exporter asserts it — so the map row IS the
//     first row).
//   - forms/kinds/schemas/schema: the served envelopes verbatim.
//   - form-spec: the flat {key: {status, body}} map. The exporter
//     precomputes every key form_spec() can serve non-404 for
//     (catalog ids + editor_forms scan ids + engine-model ids +
//     every _routes key + every forms-table name + every flows/
//     subdir, each by CALLING form_spec) — any other string 404s on
//     py too, so the flat lookup is complete by construction and no
//     routing logic is re-spelled here. The ?model= parse keeps
//     parse_qs parity (blank values DROPPED, first non-blank wins,
//     "+"-folded, percent-decoded — gateway.py route() 4321-4322 +
//     _Ctx.q 2692-2693).
//   - loras: the {mid: body} map (model_loras() answers; unknown and
//     known-but-None both 404 the same body, so only non-None
//     entries are frozen).
//   - provisions: the per-family DECLARATION rows (engine +
//     name/folder/url/sha256/size_bytes, declaration order — the
//     404 text joins them). The MOUNT resolves per request in TS
//     (the _provision_mount port below: endpoint file +
//     model_paths read_root — machine paths are never frozen), the
//     file is read off disk and the bytes move to the socket (the
//     doors/assets.ts posture — file IO here, decisions there).
//     The on-demand rail fetch (missing-on-disk -> provision_rail
//     through comfy-mcp, gateway.py 3488-3506) has no native
//     counterpart: a missing file answers the loud 502 below (the
//     wall skips missing-on-disk provisions — rail fetch is network
//     in a wall, never a pin).
//     Path-passing, not base64: provisions run 0.5MB-27GB, so bodies
//     never cross a serialization envelope — the door reads the
//     resolved disk path itself (the landed path-envelope design the
//     bridge used, minus the bridge).
//     STREAMING READ (landed 2026-09-07, was the flagged >2GB risk):
//     readProvisionBytes below streams the bytes off disk in 64MB
//     positional slices sized by stat — readFileSync's
//     ERR_FS_FILE_TOO_LARGE past ~2GB (the old 500
//     provision-unreadable leg for 12 of the 30 rows) is gone; the
//     wire stays one 200 + content-type + full bytes with
//     content-length from the byte length (py's exact shape — py
//     never served Range here, so neither does this arm). The wall
//     pins it with a 2.5GB sparse fixture leg + a small-file
//     regression leg (synthetic-fixture block in
//     test_gateway_discovery_parity.py).
//
// DEPLOYMENT ENVELOPES (TS-side only — py has no counterpart; the
// wall unit-pins the deterministic ones):
//   - missing/unreadable/unparseable catalog JSON → 503
//     "discovery catalog unavailable: ..." naming the path + the
//     regen command (the manage 503 posture, minus the action key).
//   - a TS-side throw (bad root config under the provision mount)
//     → the 500 uncaught shape (the server.ts catch shapes it the
//     same way for arms implemented here).
//
// Map lookups use hasOwnProperty guards throughout: request-
// controlled keys ("__proto__", "constructor") must 404 exactly as
// py 404s unknown names, never ride the prototype chain.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { buildCatalog, modelIds, getModel } from "@melite/comfyui";
import { loadCardDefs, theService } from "@melite/comfyui";
import { join } from "node:path";
import { contentTypeOf, dumpsPy, parseJson } from "./assets.ts";
import { resolveRepoRoot } from "./bridges.ts";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { DispatchResult } from "@melite/gateway-core";
import type { GatewayRequest } from "@melite/gateway-core";
import { doorMatch, mountDoorRoutes } from "../routeMount.ts";
import type { ComfyUIService } from "@melite/comfyui";

/** The settled card-defs service (null until loadCardDefs lands —
 * callers serve the frozen capture meanwhile; the wall pins the
 * live fragments once warm). */
let specService: ComfyUIService | null = null;
function warmSpecService(): ComfyUIService | null {
  if (specService !== null) return specService;
  try {
    specService = theService();
  } catch {
    specService = null;
  }
  return specService;
}

/** Dispatcher answer — structurally identical to ctx.ts
 *  DispatchResult (defined here so doors/ never imports ctx.ts). */
export interface DiscoveryResult {
  readonly status: number;
  readonly body: string | Uint8Array;
  readonly contentType: string;
  readonly headers: Record<string, string>;
}

const JSON_CT: string = "application/json";

/** R4.2 dispatcher normalization — local alias over the ctx.ts twin
 *  (same rule, gateway.py 4353-4355: every 4xx object body leaves
 *  with a code). */
function normalize4xx(status: number, payload: unknown): unknown {
  if (
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload) &&
    !("code" in (payload as Record<string, unknown>))
  ) {
    (payload as Record<string, unknown>)["code"] = "invalid_request";
  }
  return payload;
}

/** The ten discovery handler names (ROUTES rows; the dispatch table
 *  below keys on them exactly as ctx.ts does for every other lane). */
const DISCOVERY_HANDLERS: readonly string[] = [
  "_h_model_catalog",
  "_h_model_one",
  "_h_model_provision",
  "_h_forms",
  "_h_kinds",
  "_h_form_spec",
  "_h_loras",
  "_h_family_schemas",
  "_h_schema",
  "_h_family_schema_one",
];

/** True when the row is a discovery door (the dispatchAssets /
 *  dispatchDrafts pattern — ctx.ts falls through to the 404 shape
 *  otherwise). */
export function isDiscoveryHandler(handler: string): boolean {
  return (DISCOVERY_HANDLERS as readonly string[]).includes(handler);
}

/** Own-property guard — request-controlled keys must never ride the
 *  prototype chain (py 404s unknown names; "__proto__" is unknown). */
function hasOwn(obj: unknown, key: string): boolean {
  return (
    typeof obj === "object" &&
    obj !== null &&
    Object.prototype.hasOwnProperty.call(obj, key)
  );
}

/** The frozen catalog (hand-owned frozen data since purge
 *  S-catalog 2026-09-08 — the py exporter is deleted). Kept as
 *  unknown — arms pick their section; parseJson keeps every number
 *  literal as PyNum so dumpsPy re-emits it verbatim. */
export function catalogPath(repoRoot: string): string {
  return join(repoRoot, "packages", "gateway", "shell", "data", "discovery-catalog.json");
}

function loadCatalog(repoRoot: string): Record<string, unknown> {
  const path: string = catalogPath(repoRoot);
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (exc) {
    throw new CatalogUnavailable(
      "discovery catalog unavailable: cannot read " +
        path +
        " (" +
        (exc instanceof Error ? exc.message : String(exc)) +
        ") — the file is hand-owned frozen data; restore it from " +
        "git, do not regenerate",
    );
  }
  try {
    const doc: unknown = parseJson(text);
    if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
      throw new Error("top-level JSON value is not an object");
    }
    // THE CATALOG SECTION RIDES THE LIVE REGISTRY EMISSION
    // (correction A1 follow-up, 2026-09-08): the frozen export was
    // captured at the py era's PEAK — 55 served models including
    // the 12 retired-engine families and 3 since-deleted cards.
    // The registry emission (buildCatalog — golden-anchored, wall-
    // pinned in tests/walls/ts/suites/models-golden.test.ts) is
    // the fresh truth: 43 served comfyui rows, 19 cards/caps. The
    // frozen sections that have no native owner yet (forms/kinds/
    // loras/family schemas/schema/flows/provisions/meta) stay
    // frozen until their owners land.
    const record = doc as Record<string, unknown>;
    record["catalog"] = buildCatalogSections();
    record["scan_order"] = catalogScanOrder();
    return record;
  } catch (exc) {
    if (exc instanceof CatalogUnavailable) throw exc;
    throw new CatalogUnavailable(
      "discovery catalog unavailable: cannot parse " +
        path +
        " (" +
        (exc instanceof Error ? exc.message : String(exc)) +
        ") — the file is hand-owned frozen data; restore it from " +
        "git, do not regenerate",
    );
  }
}

/** Deployment fault (missing/unparseable export) — the door shapes
 *  it as the 503 below, never a throw to the socket. */
class CatalogUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogUnavailable";
  }
}

/** The live 5-section catalog (models/families/capabilities/
 *  cards/input_vocabulary) from the registry emission — see
 *  loadCatalog's note. JSON-plain (the door serializes). */
function buildCatalogSections(): Record<string, unknown> {
  // the table read (decls param): the family plugins' sum IS the
  // catalog input — the registry module is retired
  return buildCatalog(modelIds().map((id) => getModel(id))) as unknown as Record<string, unknown>;
}

/** Served model ids in scan order (the _h_model_one known-set). */
function catalogScanOrder(): string[] {
  return Object.keys(buildCatalogSections().models as Record<string, unknown>).sort();
}

/** The _adapt uncaught-error shape for TS-side throws (the old
 *  runnerCrash twin, kept: same keys py serves when route() throws
 *  — error, type, traceback, route). */
function doorCrash(
  method: string,
  target: string,
  exc: unknown,
): DiscoveryResult {
  const msg: string = exc instanceof Error ? exc.message : String(exc);
  const name: string = exc instanceof Error ? exc.constructor.name : "Error";
  return {
    status: 500,
    body: dumpsPy({
      error: msg,
      type: name,
      traceback: exc instanceof Error ? exc.stack ?? "" : "",
      route: method + " " + target,
    }),
    contentType: JSON_CT,
    headers: {},
  };
}

/** ?model= under parse_qs parity (gateway.py route() 4321-4322: blank
 *  values DROPPED, "+"-folded, percent-decoded; _Ctx.q 2692-2693:
 *  the FIRST value wins, default ""). ctx.ts parseQuery keeps blanks
 *  and cannot be reused here (its [0] would be "" where py serves
 *  the next value — ?model=&model=anny serves anny on py). */
export function modelParam(target: string): string {
  const qpos: number = target.indexOf("?");
  if (qpos < 0) return "";
  const query: string = target.slice(qpos + 1);
  const vals: string[] = [];
  for (const pair of query.split("&")) {
    if (pair === "") continue;
    const eq: number = pair.indexOf("=");
    const rawKey: string = eq < 0 ? pair : pair.slice(0, eq);
    const rawVal: string = eq < 0 ? "" : pair.slice(eq + 1);
    let key: string;
    try {
      key = decodeURIComponent(rawKey.replace(/\+/g, " "));
    } catch {
      key = rawKey;
    }
    if (key !== "model") continue;
    let value: string;
    try {
      value = decodeURIComponent(rawVal.replace(/\+/g, " "));
    } catch {
      value = rawVal;
    }
    if (value === "") continue;
    vals.push(value);
  }
  return vals.length > 0 ? (vals[0] as string) : "";
}

/** The door's boarding read (the _h_loras consumption gate): the
 *  live registry is the boarding truth — a mid whose derived view
 *  boards the pack satisfies; deleted mids throw out of getModel
 *  (same false — the endpoint 404s, never a skip, never a 500). */
function boardsPack(mid: string, pack: string): boolean {
  try {
    return ((getModel(mid).mods ?? []) as readonly string[]).includes(pack);
  } catch {
    return false;
  }
}

/** The catalog's live offer (the unoffered stroke, 2026-09-08):
 *  the frozen capture is py's body truth (per-row bytes preserved),
 *  but WHAT serves is the live SERVE LAW — buildCatalog's served
 *  key set. Hollow atoms (unoffered) and deleted mids never offer,
 *  however stale the capture. Computed per request (pure in-memory
 *  build — the door already pays file IO per request by design). */
function liveServedKeys(): Set<string> {
  try {
    const live = buildCatalog(modelIds().map((id) => getModel(id)));
    return new Set(Object.keys((live as unknown as Record<string, Record<string, unknown>>).models));
  } catch {
    return new Set<string>();
  }
}

/** The frozen catalog filtered to the live offer (models +
 *  families only — capabilities/cards/vocabulary are not offers).
 *  A filter error serves the capture unfiltered (the door stays
 *  up; the walls pin the filtered shape, not the fallback). */
function servedCatalog(catalog: Record<string, unknown>): Record<string, unknown> {
  let keys: Set<string>;
  try {
    keys = liveServedKeys();
  } catch {
    return catalog;
  }
  if (keys.size === 0) return catalog;
  const out: Record<string, unknown> = { ...(catalog as Record<string, unknown>) };
  for (const section of ["models", "families"] as const) {
    const rows = catalog[section] as Record<string, unknown>;
    const kept: Record<string, unknown> = {};
    for (const k of Object.keys(rows)) if (keys.has(k)) kept[k] = rows[k];
    out[section] = kept;
  }
  return out;
}
/** py %r of a str (the provision refusal formatter, gateway.py
 *  3519-3535): single quotes unless the value holds one (then double
 *  quotes); both quotes present falls back to single with escapes.
 *  Path segments never carry control chars on the wire. */
export function pyReprStr(value: string): string {
  if (!value.includes("'")) return "'" + value + "'";
  if (!value.includes('"')) return '"' + value + '"';
  return (
    "'" +
    value
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t") +
    "'"
  );
}

// ── provision mount (the _provision_mount port, gateway.py 3353-3391)
// The ONE resolution the provision door uses: the engine endpoint
// file's extra_model_folders map + model_paths read_root; the store
// root is the endpoint's declared download place. None = the family
// declares no engine (a loud caller-side 500, never a default). ──

interface ProvisionRow {
  readonly name: string;
  readonly folder: string;
}

interface ProvisionMount {
  readonly disk: string;
}

/** Strip slashes both ends (py .strip().strip("/") on the folder). */
function stripSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

/** estate_config.join: root + optional subdir (absolute subdirs
 *  override, empty rides root). */
function joinRoot(root: string, sub: string): string {
  const s: string = (sub || "").trim();
  if (s === "") return root;
  if (s.startsWith("/")) return s;
  return join(root, s);
}

/** The model_paths derivation (infra/python/estate_config.py 228-266): the
 *  ROOT config's models roots (ABSOLUTE, required — missing/empty/
 *  relative dies LOUD, QUEUE LANE LAW) joined with the engine base,
 *  engine-endpoint overrides winning when set (and absolute). Reads
 *  the file-anchored inference.config.json through repoRoot — the
 *  same tree the export froze. */
export function modelPaths(
  repoRoot: string,
  engine: string,
  endpointOverrides: { model_base_path?: string },
): { readRoot: string } {
  let doc: unknown;
  try {
    doc = JSON.parse(
      readFileSync(join(repoRoot, "inference.config.json"), "utf8"),
    ) as unknown;
  } catch (exc) {
    throw new Error(
      "inference.config.json unavailable (" +
        (exc instanceof Error ? exc.message : String(exc)) +
        ") — model storage is deployment config, never guessed",
    );
  }
  const rec: Record<string, unknown> =
    typeof doc === "object" && doc !== null && !Array.isArray(doc)
      ? (doc as Record<string, unknown>)
      : {};
  const models: Record<string, unknown> =
    typeof rec["models"] === "object" && rec["models"] !== null
      ? (rec["models"] as Record<string, unknown>)
      : {};
  const readRootRaw: string =
    typeof models["read_root"] === "string"
      ? (models["read_root"] as string).trim()
      : "";
  if (readRootRaw === "" || !readRootRaw.startsWith("/")) {
    throw new Error(
      "models.read_root missing/empty/relative in inference.config.json" +
        " — where models live is deployment config, never guessed" +
        " (QUEUE LANE LAW)",
    );
  }
  const engines: Record<string, unknown> =
    typeof rec["engines"] === "object" && rec["engines"] !== null
      ? (rec["engines"] as Record<string, unknown>)
      : {};
  const entry: Record<string, unknown> =
    typeof engines[engine] === "object" && engines[engine] !== null
      ? (engines[engine] as Record<string, unknown>)
      : {};
  const base: string =
    typeof entry["base"] === "string"
      ? (entry["base"] as string).trim()
      : "";
  let readRoot: string = joinRoot(readRootRaw, base);
  const override: string =
    typeof endpointOverrides["model_base_path"] === "string"
      ? (endpointOverrides["model_base_path"] as string).trim()
      : "";
  if (override !== "") {
    if (!override.startsWith("/")) {
      throw new Error(
        "model_base_path override must be ABSOLUTE (got " +
          pyReprStr(override) +
          ")",
      );
    }
    readRoot = override;
  }
  return { readRoot };
}

function provisionMount(
  repoRoot: string,
  engine: string,
  prov: ProvisionRow,
): ProvisionMount | null {
  if (engine === "") return null;
  const epPath: string = join(
    repoRoot,
    "packages",
    "engines",
    engine,
    "data",
    engine + "_endpoint.json",
  );
  let ep: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(readFileSync(epPath, "utf8")) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      ep = parsed as Record<string, unknown>;
    }
  } catch {
    ep = {};
  }
  const folders: Record<string, unknown> =
    typeof ep["extra_model_folders"] === "object" &&
    ep["extra_model_folders"] !== null
      ? (ep["extra_model_folders"] as Record<string, unknown>)
      : {};
  const mapped: unknown = folders[prov.folder];
  const sub: string = stripSlashes(
    String(
      (typeof mapped === "string" && mapped !== "" ? mapped : prov.folder) ||
        prov.folder,
    ).trim(),
  );
  const baseOverride: string =
    typeof ep["model_base_path"] === "string"
      ? (ep["model_base_path"] as string).trim()
      : "";
  const roots: { readRoot: string } = modelPaths(
    repoRoot,
    engine,
    baseOverride !== "" ? { model_base_path: baseOverride } : {},
  );
  const disk: string = join(roots.readRoot, sub, prov.name);
  return { disk };
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** The provisions byte read — a CHUNKED stream off disk, never a
 *  single readFileSync allocation (the flip-debt fix, 2026-09-07:
 *  readFileSync throws ERR_FS_FILE_TOO_LARGE past 2GiB, surfacing
 *  as the 500 provision-unreadable leg for 12 of the 30 declared
 *  rows — 0.5MB-27GB on disk — where py's open()/f.read() serves
 *  them 200).
 *
 *  Serve shape (unchanged — py _h_model_provision 3512-3550 serves
 *  the full bytes as one 200 RawTriple with content-type only; the
 *  _adapt Response adds content-length from the byte length, the
 *  server.ts sendDispatch twin does the same from body.length, so
 *  the length riding the wire IS the stat size for every size now):
 *  200 + content-type + full bytes; the path envelope (mount
 *  re-resolve + model_paths port above), the loud 502 (missing on
 *  disk — no native rail fetch) and 500 (unreadable) refusal
 *  classes, and the Range-blindness (py never calls _parse_range
 *  here — a Range header rides ignored to the full 200, unlike the
 *  _h_asset 206 door) are all preserved exactly.
 *
 *  Mechanics: statSync sizes the target (Content-Length's source
 *  of truth), one Buffer of exactly that size is filled with
 *  positional readSync slices (64MB — the read streams, the single
 *  >2GiB allocation readFileSync refused never happens). A short
 *  read (raced truncation/resize between stat and read) throws
 *  into the same 500 provision-unreadable refusal readFileSync's
 *  throw took — never a silent prefix. Stays sync: the dispatch
 *  chain (the discoveryDoors plugin below, via dispatchDiscovery)
 *  and the wall's node -e units call this synchronously. */
function readProvisionBytes(disk: string): Buffer {
  const size: number = statSync(disk).size;
  const out: Buffer = Buffer.allocUnsafe(size);
  const fd: number = openSync(disk, "r");
  try {
    let off = 0;
    while (off < size) {
      const want: number = Math.min(64 * 1024 * 1024, size - off);
      const got: number = readSync(fd, out, off, want, off);
      if (got <= 0) {
        throw new Error(
          "short read: got " + off + " of " + size + " bytes from " + disk,
        );
      }
      off += got;
    }
    return out;
  } finally {
    closeSync(fd);
  }
}

/** One JSON arm: status + dumpsPy body (+ normalize4xx at the seam). */
function jsonArm(status: number, payload: unknown): DiscoveryResult {
  return {
    status,
    body: dumpsPy(normalize4xx(status, payload)),
    contentType: JSON_CT,
    headers: {},
  };
}

/** Run one discovery arm natively over the frozen export. Sync
 *  file reads (readFileSync blocks the loop exactly as py's
 *  per-request tree scan blocked its worker — the scan cost is
 *  inherent to the read-your-own-tree design). */
export function handleDiscovery(
  handler: string,
  method: string,
  path: string,
  target: string,
  repoRoot: string = resolveRepoRoot(),
): DiscoveryResult {
  let doc: Record<string, unknown>;
  try {
    doc = loadCatalog(repoRoot);
  } catch (exc) {
    return {
      status: 503,
      body: dumpsPy({
        error: exc instanceof Error ? exc.message : String(exc),
      }),
      contentType: JSON_CT,
      headers: {},
    };
  }
  try {
    const catalog = doc["catalog"] as Record<string, unknown>;
    const models = catalog["models"] as Record<string, unknown>;
    if (handler === "_h_model_catalog") {
      // gateway.py 3041-3043: 200 + the whole to_json object —
      // filtered to the LIVE offer (servedCatalog: frozen bodies,
      // live serve law — unoffered/deleted mids never offer).
      return jsonArm(200, servedCatalog(catalog));
    }
    if (handler === "_h_model_one") {
      // gateway.py 3046-3051: first scan-order match or 404 —
      // plus the live offer (an unoffered/deleted mid 404s even
      // when the capture still keys it).
      const m: RegExpExecArray | null =
        /^\/v1\/model-catalog\/(.+)$/.exec(path);
      const mid: string = m !== null ? String(m[1]) : "";
      const order: unknown = doc["scan_order"];
      const known: boolean =
        Array.isArray(order) &&
        (order as unknown[]).some((v: unknown): boolean => v === mid);
      const offered = servedCatalog(catalog)["models"] as Record<string, unknown>;
      if (known && hasOwn(offered, mid)) {
        return jsonArm(200, (offered as Record<string, unknown>)[mid]);
      }
      return jsonArm(404, { error: "model not found" });
    }
    if (handler === "_h_model_provision") {
      // gateway.py 3509-3547: declared-row gate, mount resolve,
      // on-disk stream; missing-on-disk fetched through the rail on
      // py (no native counterpart — the loud 502 below).
      const m: RegExpExecArray | null =
        /^\/v1\/models\/([^/]+)\/provisions\/([^/]+)$/.exec(path);
      const fid: string = m !== null ? String(m[1]) : "";
      const pname: string = m !== null ? String(m[2]) : "";
      const fams = doc["provisions"] as Record<string, unknown>;
      const fam: Record<string, unknown> | null = hasOwn(fams, fid)
        ? ((fams as Record<string, unknown>)[fid] as Record<string, unknown>)
        : null;
      if (fam === null) {
        return jsonArm(404, {
          error:
            "unknown model family " +
            pyReprStr(fid) +
            " — provisions resolve through the model scan (see /v1/model-catalog)",
        });
      }
      const rows: unknown[] = Array.isArray(fam["provisions"])
        ? ((fam["provisions"] as unknown[]) as unknown[])
        : [];
      const prov: Record<string, unknown> | null =
        (rows as Record<string, unknown>[]).find(
          (p: Record<string, unknown>): boolean =>
            typeof p["name"] === "string" &&
            (p["name"] as string) === pname,
        ) ?? null;
      if (prov === null) {
        const names: string[] = (rows as Record<string, unknown>[])
          .map((p: Record<string, unknown>): string => String(p["name"] ?? ""))
          .filter((n: string): boolean => n !== "");
        return jsonArm(404, {
          error:
            "family " +
            pyReprStr(fid) +
            " declares no provision " +
            pyReprStr(pname) +
            " (declared: " +
            (names.length > 0 ? names.join(", ") : "none") +
            ")",
        });
      }
      const engine: string =
        typeof fam["engine"] === "string" ? (fam["engine"] as string) : "";
      if (engine === "") {
        return jsonArm(500, {
          error: "family " + pyReprStr(fid) + " declares no engine",
        });
      }
      const mount: ProvisionMount | null = provisionMount(repoRoot, engine, {
        name: String(prov["name"] ?? ""),
        folder: typeof prov["folder"] === "string" ? (prov["folder"] as string) : "",
      });
      if (mount === null) {
        return jsonArm(500, {
          error: "family " + pyReprStr(fid) + " declares no engine",
        });
      }
      if (!isFile(mount.disk)) {
        // No native rail fetch (provision_rail drives comfy-mcp
        // in-process — the manage-rail precedent: proxied, never
        // reimplemented). Loud 502 naming the mount, never a
        // silent 404 for a DECLARED row.
        return jsonArm(502, {
          error:
            "provision fetch (" +
            fid +
            "/" +
            String(prov["name"] ?? "") +
            "): not provisioned on disk (" +
            mount.disk +
            ") — rail fetch unavailable in the native gateway" +
            " (provision it: models lane)",
        });
      }
      try {
        const data: Buffer = readProvisionBytes(mount.disk);
        return {
          status: 200,
          body: data,
          contentType: contentTypeOf(mount.disk),
          headers: {},
        };
      } catch (exc) {
        // stat/open/read failures (incl. raced short reads) land
        // here exactly as readFileSync's ERR_FS_FILE_TOO_LARGE did
        // before the streaming fix (py 500s provision-unreadable on
        // a failed read too).
        return jsonArm(500, {
          error:
            "provision unreadable: " +
            (exc instanceof Error ? exc.message : String(exc)),
        });
      }
    }
    if (handler === "_h_forms") {
      // gateway.py 3054-3056 + editor_forms.forms.
      return jsonArm(200, doc["forms"]);
    }
    if (handler === "_h_kinds") {
      // gateway.py 3059-3061 + card_kinds.kinds_wire (TABLE order
      // frozen in the export array).
      return jsonArm(200, doc["kinds"]);
    }
    if (handler === "_h_form_spec") {
      // gateway.py 3064-3067 + editor_forms.form_spec: empty model
      // 400s; the frozen flat map holds every servable key's own
      // (status, body); anything else 404s exactly as py does.
      //
      // THE PORT OVERLAY (2026-09-08, the 1:1 cordis port): for a
      // key whose FAMILY is boarded on a TS card, fields and
      // schema_groups emit LIVE through the ComfyUIService's
      // formSpec (the mod/verb interlock — registration through
      // ctx.comfyui.registerMod, absorption derived at read). The
      // frozen row keeps label/features/genre (the runtime catalog
      // plane — a different door's truth). Families not yet boarded
      // on the TS plane serve the frozen capture whole (the
      // deprecation ladder: live-owned keys only grow; the wall
      // pins the two hardest keys byte-equal on the interlock
      // fragments).
      const model: string = modelParam(target);
      if (model === "") {
        return jsonArm(400, { error: "missing model param" });
      }
      const specs = doc["form_specs"] as Record<string, unknown>;
      if (hasOwn(specs, model)) {
        const hit = (specs as Record<string, Record<string, unknown>>)[model] as Record<
          string,
          unknown
        >;
        const status: number =
          typeof hit["status"] === "number" ? (hit["status"] as number) : 200;
        const body = { ...((hit["body"] as Record<string, unknown>) ?? {}) };
        const family: string = typeof body["service"] === "string" ? (body["service"] as string) : "";
        const form: string = typeof body["form"] === "string" ? (body["form"] as string) : "";
        if (family !== "" && form !== "") {
          void loadCardDefs().then((): void => {
            // fire-and-forget warm; the sync read below uses the
            // settled cache or falls through to the frozen row.
          });
          const svc = warmSpecService();
          if (svc !== null) {
            const live = svc.formSpec(form, family);
            if (live !== null) {
              body["fields"] = live["fields"];
              body["schema_groups"] = live["schema_groups"];
            }
          }
        }
        return jsonArm(status, body);
      }
      return jsonArm(404, { error: "model not found" });
    }
    if (handler === "_h_loras") {
      // gateway.py 3070-3082 + catalog.model_loras: empty model
      // 400s; unknown (or known-but-None, same body) 404s.
      //
      // THE CONSUMPTION GATE at the door (paper §3.2.2): the frozen
      // map keys EVERY mid (mod-less atoms carry an empty list), so
      // hasOwn alone 200s a mods offer onto atoms that board no
      // pack — z-image served 200-empty here. The endpoint satisfies
      // ONLY for atoms boarding 'loras' (the live registry is the
      // boarding truth; deleted mids throw out of it → same 404).
      const model: string = modelParam(target);
      if (model === "") {
        return jsonArm(400, { error: "missing model param" });
      }
      const loras = doc["loras"] as Record<string, unknown>;
      if (hasOwn(loras, model) && boardsPack(model, "loras")) {
        return jsonArm(200, (loras as Record<string, unknown>)[model]);
      }
      return jsonArm(404, { error: "model not found" });
    }
    if (handler === "_h_family_schemas") {
      // gateway.py 3085-3088 + editor_runs.family_param_schemas
      // (every method serves — the ROUTES "*" arm; ctx.ts routes).
      return jsonArm(200, doc["family_schemas"]);
    }
    if (handler === "_h_schema") {
      // gateway.py 3091-3099 + flow.schema_snapshot.
      return jsonArm(200, doc["schema"]);
    }
    if (handler === "_h_family_schema_one") {
      // gateway.py 3102-3105 + editor_runs.family_param_schema.
      // NOTE the refusal shape: single-quoted %s interpolation, NOT
      // %r — "Unknown family_id 'x'" even when x holds a quote.
      const m: RegExpExecArray | null =
        /^\/v1\/flows\/families\/(.+)\/param-schema$/.exec(path);
      const fid: string = m !== null ? String(m[1]) : "";
      const schemas = doc["family_schemas"] as Record<string, unknown>;
      if (hasOwn(schemas, fid)) {
        return jsonArm(200, (schemas as Record<string, unknown>)[fid]);
      }
      return jsonArm(404, {
        error: "Unknown family_id '" + fid + "'",
        family_id: fid,
      });
    }
    return doorCrash(method, target, new Error("unknown discovery handler " + handler));
  } catch (exc) {
    return doorCrash(method, target, exc);
  }
}

/** Dispatch discovery rows by py handler name. Null when the row is
 *  not a discovery door (the dispatchAssets / dispatchDrafts /
 *  dispatchBridges pattern); ctx.ts serves the answer untouched
 *  (bodies ride pre-serialized — dumpsPy at the door, 4xx codes
 *  inline — exactly like the runs lane). */
export function dispatchDiscovery(
  handler: string,
  method: string,
  path: string,
  target: string,
  repoRoot: string = resolveRepoRoot(),
): DiscoveryResult | null {
  if (!isDiscoveryHandler(handler)) return null;
  return handleDiscovery(handler, method, path, target, repoRoot);
}

/** The discovery doors as a self-registering plugin: the decl JSON
 *  arms run the real py handler over stdio (dumpsPy + normalize4xx
 *  at the door); the provisions byte arm moves the py-resolved
 *  bytes untouched. Bodies ride pre-serialized. A null answer falls
 *  through exactly as the old arm did. Matches its own rows inside
 *  the listener (dispatchDiscovery answers discovery rows and
 *  returns null for every other handler — gating on its answer
 *  alone preserves the old fall-through exactly). No services
 *  injected — the door reads nothing through the context. */
export const discoveryDoors: Plugin = {
  name: "gateway-discovery",
  inject: ["gatewayError", "webServer"],
  apply(ctx: Context): void {
    // dispatchDiscovery answers discovery rows and returns null for
    // every other handler (its internal handler table) — gating on
    // its answer alone preserves the old arm's fall-through exactly.
    mountDoorRoutes(ctx, ctx.webServer, DISCOVERY_HANDLERS, (req: GatewayRequest): DispatchResult | undefined => {
        const hit = doorMatch(req, DISCOVERY_HANDLERS);
        if (hit === null) return undefined;
        const discovered: DispatchResult | null = dispatchDiscovery(
          hit.row.handler,
          req.method,
          req.path,
          req.target,
        );
        // Only discovery rows answer here — every other row falls
        // through. dispatchDiscovery returns null for non-discovery
        // handlers (its internal handler table), so gating on its
        // answer alone preserves the old arm's fall-through exactly.
        if (discovered !== null) return discovered;
        return undefined;
    });
  },
};
