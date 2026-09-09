// doors/discovery.ts — the NATIVE port of the 10 discovery READ doors
// (no runtime python; the stdio bridge is retired).
//
// Handlers (deleted-python names in parens — python/gateway.py is
// gone (frozen at git d4fbcab); ROUTES mirror rows):
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
// ARCHITECTURE (live derivation, 2026-09-10 — the frozen blob is
// retired): every JSON arm derives from live sources at request
// time (doors/discoveryLive.ts — model DECLs, card definitions,
// the flows registry, hand-owned vocabularies). The retired python
// system's served answers were captured into
// packages/gateway/shell/data/discovery-catalog.json and served
// byte-identical past the TS flip; byte parity with legacy python
// is NOT a goal (operator order) and the blob is deleted — serving
// it again is the regression. Bodies are normal JSON
// (JSON.stringify indent 2, the old json.dumps indent-2 shape).
//
// The live sources throw LOUD on declaration bugs (a card without
// identity, a dangling from_flow link) — the door shapes those as
// the 503 below, never a throw to the socket. Request-controlled
// keys still 404 exactly as py 404s unknown names (hasOwn guards;
// "__proto__" is unknown).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { join } from "node:path";
import { contentTypeOf } from "./assets.ts";
import { resolveRepoRoot } from "./bridges.ts";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { DispatchResult } from "@melite/gateway-core";
import type { GatewayRequest } from "@melite/gateway-core";
import {
  boardedMap,
  catalogSection,
  familySchema,
  familySchemas,
  formsTable,
  kindsArm,
  liveScanOrder,
  liveSources,
  lorasBody,
  lorasFamily,
  provisionsMap,
  resolveSpecKey,
  schemaSection,
  specBody,
} from "./discoveryLive.ts";
import { doorMatch, mountDoorRoutes } from "../routeMount.ts";

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

/** Deployment fault (live sources unbootable — a declaration bug
 *  or a missing card package): the door shapes it as the 503
 *  below, never a throw to the socket. */
class SourcesUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourcesUnavailable";
  }
}

/** One JSON arm: status + normal-JSON body (+ normalize4xx at the
 *  seam — indent 2, the old json.dumps shape). */
function jsonArm(status: number, payload: unknown): DiscoveryResult {
  return {
    status,
    body: JSON.stringify(normalize4xx(status, payload), null, 2),
    contentType: JSON_CT,
    headers: {},
  };
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
    body: JSON.stringify({
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

/** Run one discovery arm natively over the LIVE sources (async —
 *  loadCardDefs boots the card packages on first call, then rides
 *  its cache; per-request derivation is pure in-memory thereafter,
 *  exactly as py re-scanned every request). */
export async function handleDiscovery(
  handler: string,
  method: string,
  path: string,
  target: string,
  repoRoot: string = resolveRepoRoot(),
): Promise<DiscoveryResult> {
  let sources: Awaited<ReturnType<typeof liveSources>>;
  try {
    sources = await liveSources();
  } catch (exc) {
    return {
      status: 503,
      body: JSON.stringify({
        error: exc instanceof Error ? exc.message : String(exc),
      }),
      contentType: JSON_CT,
      headers: {},
    };
  }
  const { defs, svc } = sources;
  const boarded = boardedMap(defs);
  try {
    if (handler === "_h_model_catalog") {
      // gateway.py 3041-3043: 200 + the whole to_json object — the
      // live offer IS the emission (buildCatalog's served key set;
      // unoffered/deleted mids never offer).
      return jsonArm(200, catalogSection(defs));
    }
    if (handler === "_h_model_one") {
      // gateway.py 3046-3051: first scan-order match or 404.
      const m: RegExpExecArray | null =
        /^\/v1\/model-catalog\/(.+)$/.exec(path);
      const mid: string = m !== null ? String(m[1]) : "";
      const order: string[] = liveScanOrder();
      const catalog = catalogSection(defs);
      const offered = catalog["models"] as Record<string, unknown>;
      if (order.some((v: string): boolean => v === mid) && hasOwn(offered, mid)) {
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
      const fams = await provisionsMap(defs);
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
      // gateway.py 3054-3056 + editor_forms.forms — card meta rows
      // off the cards (sidebar/boarding), never a frozen export.
      return jsonArm(200, { forms: formsTable(defs) });
    }
    if (handler === "_h_kinds") {
      // gateway.py 3059-3061 + card_kinds.kinds_wire — CARD_KINDS
      // in its own alphabetical order (the py TABLE order died
      // with the authoring plane).
      return jsonArm(200, kindsArm());
    }
    if (handler === "_h_form_spec") {
      // gateway.py 3064-3067 + editor_forms.form_spec: empty model
      // 400s; unresolvable keys 404 exactly as py does (unknown /
      // unoffered / retired / fragments / flow ids).
      const model: string = modelParam(target);
      if (model === "") {
        return jsonArm(400, { error: "missing model param" });
      }
      const res = resolveSpecKey(model, defs, boarded);
      if (res === null) {
        return jsonArm(404, { error: "model not found" });
      }
      return jsonArm(200, specBody(svc, defs, res));
    }
    if (handler === "_h_loras") {
      // gateway.py 3070-3082 + catalog.model_loras: empty model
      // 400s; unknown (or known-but-None, same body) 404s.
      //
      // THE CONSUMPTION GATE at the door: the endpoint satisfies
      // ONLY for keys whose backing family boards 'loras' (the
      // live DECL is the boarding truth; a variant key rides its
      // family's offer — turbo renders krea-2's loras).
      const model: string = modelParam(target);
      if (model === "") {
        return jsonArm(400, { error: "missing model param" });
      }
      const family = lorasFamily(model, boarded);
      if (family === null) {
        return jsonArm(404, { error: "model not found" });
      }
      return jsonArm(200, lorasBody(svc, family));
    }
    if (handler === "_h_family_schemas") {
      // gateway.py 3085-3088 + editor_runs.family_param_schemas
      // (every method serves — the ROUTES "*" arm; ctx.ts routes).
      return jsonArm(200, familySchemas(svc, defs, boarded));
    }
    if (handler === "_h_schema") {
      // gateway.py 3091-3099 + flow.schema_snapshot — slot kinds,
      // card rows, expanded registry flows, API-shape docs.
      return jsonArm(200, schemaSection(defs));
    }
    if (handler === "_h_family_schema_one") {
      // gateway.py 3102-3105 + editor_runs.family_param_schema.
      // NOTE the refusal shape: single-quoted %s interpolation, NOT
      // %r — "Unknown family_id 'x'" even when x holds a quote.
      const m: RegExpExecArray | null =
        /^\/v1\/flows\/families\/(.+)\/param-schema$/.exec(path);
      const fid: string = m !== null ? String(m[1]) : "";
      const schema = familySchema(svc, defs, boarded, fid);
      if (schema !== null) {
        return jsonArm(200, schema);
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
 *  (bodies ride pre-serialized at the door, 4xx codes
 *  inline — exactly like the runs lane). */
export async function dispatchDiscovery(
  handler: string,
  method: string,
  path: string,
  target: string,
  repoRoot: string = resolveRepoRoot(),
): Promise<DiscoveryResult | null> {
  if (!isDiscoveryHandler(handler)) return null;
  return handleDiscovery(handler, method, path, target, repoRoot);
}

/** The discovery doors as a self-registering plugin: the JSON arms
 *  derive live over the card/DECL/registry sources (normal JSON at
 *  the door); the provisions byte arm moves the resolved bytes
 *  untouched. Bodies ride pre-serialized. A null answer falls
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
    mountDoorRoutes(ctx, ctx.webServer, DISCOVERY_HANDLERS, async (req: GatewayRequest): Promise<DispatchResult | undefined> => {
        const hit = doorMatch(req, DISCOVERY_HANDLERS);
        if (hit === null) return undefined;
        const discovered: DispatchResult | null = await dispatchDiscovery(
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
