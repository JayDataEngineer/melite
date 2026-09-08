// doors/bridges.ts — the P6 TS port of the two bridge doors: the
// studio poser forward (GET|POST ^/poser/, _h_poser_bridge) and the
// manage door (POST /v1/manage, _h_manage).
//
// NO-ESTATE-PYTHON LAW: the manage door is Cordis-native (./manage.ts
// dispatches the SSOT vocabulary over the MCP rail ./mcp.ts to the
// VENDOR comfy-mcp server + the vendor cm_cli module). No estate
// Python is spawned, read, or imported on this path. The poser door
// forwards method+path+query+body bytes to the engine endpoint and
// passes the upstream answer through verbatim. This module maps
// envelope shapes and refusal texts only.
//
// WHAT EACH ARM MIRRORS (line-cited against python/gateway.py):
//   POSER (_h_poser_bridge, 3801-3853):
//   - target resolution (3806-3822): the ONE url-bearing engine in
//     inference.config.json (engines.<name>.url — QUEUE LANE LAW,
//     never hardcoded). Zero or many url-bearing engines refuse
//     LOUDLY with the 502 below (no fallback, no default). The
//     config file is read PER REQUEST (py load()s per request too)
//     from MELITE_REPO_ROOT/inference.config.json (the uploads.ts
//     root pattern) else the file-anchored repo tree.
//   - count-refusal text (3813-3820), byte-identical: "poser bridge:
//     exactly one engine endpoint with a url must be configured to
//     forward to (got %d: %s) — inference.config.json engines, no
//     hardcoded fallback" with %s = str(sorted(names) or ["none"])
//     (pyReprStrList below; sorted() is codepoint order, same as
//     Array.sort for ASCII engine names).
//   - unreadable/invalid config: py load() RAISES (RootConfigError,
//     outside the forward try) → route() doesn't catch → _adapt 500
//     {error,type,traceback,route}. resolvePoserBase THROWS here for
//     the same outcome via the server.ts catch (same keys, host prose
//     differs — the wall shape-compares this leg).
//   - forward (3824-3833): url = base.rstrip("/") + ctx.target (the
//     target INCLUDES the query string); content-type
//     application/json stamped IFF the body is non-empty and NO other
//     caller header is forwarded (py builds {} or the one header);
//     60s timeout; success returns (status, ctype, raw) untouched.
//   - HTTPError (3838-3846): the pack's own refusals pass through
//     with THEIR status, THEIR content-type (default
//     application/json when absent), THEIR bytes — node:http never
//     throws on 4xx/5xx so success and refusal share one path here,
//     and byte doors bypass normalize4xx exactly as py's tuple
//     payloads bypass the dict-only R4.2 rule.
//   - URLError (3847-3850): 502 "poser bridge: comfyui unreachable
//     at %s (%s)" — the reason prose differs per language (urllib
//     errno text vs node message), so the wall pins status + the
//     prefix through "(" and shape-compares the tail.
//   - other exceptions (3851-3853): 502 "poser bridge: %s: %s"
//     (type name + message). A schemeless/garbage base raises
//     ValueError in py (unknown url type — NOT a URLError), so a
//     URL-construction failure rides this generic leg here too; a
//     parseable-but-foreign scheme stays on the unreachable leg
//     (py: unknown-scheme urlopen is a URLError).
//   KNOWN divergence (documented, unpinned): urllib follows
//   redirects and decodes content-encoding transparently; node:http
//   returns the 3xx / encoded bytes as-is. The poser pack serves
//   direct routes with no redirects or gzip, so no served shape hits
//   it — a redirecting upstream would surface its 3xx here instead
//   of the followed body.
//   MANAGE (_h_manage): Cordis-native dispatch (./manage.ts — the
//   SSOT vocabulary over the MCP rail to the vendor comfy-mcp server
//   + the vendor cm_cli module). The wire contract is unchanged:
//   strict doc in, [code, rep] out (503 vendor-unavailable /
//   [code, rep] passthrough / 502 rail-failed / 504 timeout).
//   - vendor server resolution: MELITE_COMFY_MCP_BIN env (explicit
//     binary wins) else <anchor>/infra/python/.venv/bin/comfy-mcp
//     (the base env's vendor server); missing → the 503 below.
//   - stdin: the dispatcher already strict-parsed the raw bytes, so
//     they are valid JSON; empty bodies feed {} per `or "{}"`.
//     Non-dict truthy docs THROW before dispatching (→ server.ts 500,
//     same keys); falsy non-dicts ride as {}.
//   - rail failure → the 502 runner-failed envelope incl.
//     data.stderr = last 500 chars. Timeout → the 504 envelope (no
//     data key); the deadline mirrors the old 900s.
//   - dispatch refusals (422 bad request / named-arg 422 / catalog
//     404 / plane 503 / crash 500) are computed by ./manage.ts with
//     byte-kept refusal texts.
//   - response bytes ride dumpsPy over the parseJson value (the
//     assets.ts number machinery: float 1.0 stays "1.0", big ints
//     exact) with the local normalize4xx alias (R4.2 — manage 422/
//     404 payloads carry no code, so route() adds invalid_request;
//     the 401 auth refusal never reaches this door).
//   - auth (2587-2619) is dispatcher-level: both doors sit behind
//     ctx.ts authRefusal exactly as they sit behind _adapt's gate.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { existsSync, readFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import type { RequestOptions } from "node:http";
import { request as httpsRequest } from "node:https";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  dumpsPy,
  parseJson,
} from "./assets.ts";
import { dispatchManage } from "./manage.ts";
import { isRecord, parseStrictJson } from "@melite/gateway-core";
import { needModels } from "@melite/engine-comfyui";
import type { ModelsService } from "@melite/engine-comfyui";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { DispatchResult } from "@melite/gateway-core";
import type { GatewayRequest } from "@melite/gateway-core";
import { matchRoute } from "@melite/gateway-core";

/** Dispatcher answer — structural twin of ctx.DispatchResult (kept
 *  local so this door module stays importable without the
 *  dispatcher, the drafts.ts/assets.ts pattern). Bodies are
 *  pre-serialized here (dumpsPy at the door, raw bytes on the poser
 *  forward) — dispatch passes them through untouched. */
export interface BridgeResult {
  readonly status: number;
  readonly body: string | Uint8Array;
  readonly contentType: string;
  readonly headers: Record<string, string>;
}

const JSON_CT: string = "application/json";

/** R4.2 dispatcher normalization — local alias over the ctx.ts twin
 *  (same rule: every 4xx object body leaves with a code). */
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

/** Repo root: the ENGINE owns the resolution (MELITE_REPO_ROOT
 *  override else source-relative 4-up — every home lands the same
 *  depth; the 9 hand-rolled copies died 2026-09-08, zero-compromise
 *  followup). Re-export keeps this module's wall-pinned address. */
import { resolveRepoRoot } from "@melite/engine-comfyui";
export { resolveRepoRoot };

/** File-anchored repo root (no env): where the product manage source
 *  lives even when MELITE_REPO_ROOT points at a fixture tree. */
function anchoredRepoRoot(): string {
  const here: string = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..", "..", "..");
}

/** Python repr() of a str — single quotes, double-quoted only when
 *  the value itself holds a single quote (the uploads.ts pyRepr
 *  rule, sufficient for engine names / sorted-name lists). */
function pyReprStr(value: string): string {
  if (!value.includes("'")) return "'" + value + "'";
  return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

/** Python str() of a list of strs: "['a', 'b']" / "['none']". */
function pyReprStrList(names: string[]): string {
  return "[" + names.map(pyReprStr).join(", ") + "]";
}

// ── poser bridge ────────────────────────────────────────────────────
// Upstream base URL: the estate root config (config file located via
// env — MELITE_REPO_ROOT; no hardcoded host/port anywhere).

/** Read the one poser upstream base from the estate root config —
 *  mirrors _h_poser_bridge 3812-3821 (exactly one url-bearing
 *  engine; the file is read per request, as py load()s per request).
 *  Returns the base, or the 502 refusal payload when the count is
 *  not one. THROWS on unreadable/invalid config (py load() raises
 *  outside the forward try → _adapt 500; the server.ts catch gives
 *  the same shape here). Minimal read: the engines map only — the
 *  full RootConfig validation stays in Python, never reimplemented
 *  (a config Python itself would refuse surfaces as the 500 leg on
 *  both sides only when the JSON is unreadable here; a *readable*
 *  config with zero/many urls is the walled 502 leg). */
export function resolvePoserBase(
  repoRoot: string,
): { base: string } | { refusal: { error: string } } {
  const cfgPath: string = join(repoRoot, "inference.config.json");
  let text: string;
  try {
    text = readFileSync(cfgPath, "utf-8");
  } catch (exc) {
    throw new Error(
      "poser bridge: estate config unavailable at " +
        cfgPath +
        " (" +
        (exc instanceof Error ? exc.message : String(exc)) +
        ")",
    );
  }
  let doc: unknown;
  try {
    doc = JSON.parse(text) as unknown;
  } catch (exc) {
    throw new Error(
      "poser bridge: estate config at " +
        cfgPath +
        " does not parse (" +
        (exc instanceof Error ? exc.message : String(exc)) +
        ")",
    );
  }
  const engines: Record<string, unknown> =
    typeof doc === "object" && doc !== null && !Array.isArray(doc)
      ? ((doc as Record<string, unknown>)["engines"] as Record<
          string,
          unknown
        >) ?? {}
      : {};
  const names: string[] = Object.keys(engines)
    .filter((name: string): boolean => {
      const entry: unknown = (engines as Record<string, unknown>)[name];
      return (
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as Record<string, unknown>)["url"] === "string" &&
        ((entry as Record<string, unknown>)["url"] as string) !== ""
      );
    })
    .sort();
  if (names.length !== 1) {
    return {
      refusal: {
        error:
          "poser bridge: exactly one engine endpoint with a url must " +
          "be configured to forward to (got " +
          names.length +
          ": " +
          pyReprStrList(names.length === 0 ? ["none"] : names) +
          ") — inference.config.json engines, no hardcoded fallback",
      },
    };
  }
  const only: string = names[0] as string;
  const base: string = (
    (engines as Record<string, Record<string, string>>)[only] as Record<
      string,
      string
    >
  )["url"] as string;
  return { base };
}

/** Marker for transport-level failures (refused/timeout/DNS/bad
 *  scheme) — the py URLError leg (3847-3850). Anything else keeps
 *  py's generic leg (3851-3853). */
const UNREACHABLE: unique symbol = Symbol("unreachable");

interface UnreachableError extends Error {
  [UNREACHABLE]: true;
  base: string;
}

function unreachable(base: string, message: string): UnreachableError {
  const err: Error = new Error(message);
  (err as UnreachableError)[UNREACHABLE] = true;
  (err as UnreachableError).base = base;
  return err as UnreachableError;
}

function isUnreachable(err: unknown): err is UnreachableError {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as Record<symbol, unknown>)[UNREACHABLE] === true
  );
}

/** Raw forward — mirrors _fwd (3824-3833) + the HTTPError leg
 *  (3838-3846): method + full target (path+query) + body bytes to
 *  base.rstrip("/") + target, content-type stamped iff the body is
 *  non-empty, upstream status + content-type + bytes back untouched.
 *  node:http never throws on 4xx/5xx so refusals ride this same path
 *  (byte-identical passthrough, no normalize4xx — py's R4.2 rule is
 *  dict-only and tuple payloads skip it). */
export function forwardPoser(
  base: string,
  method: string,
  target: string,
  body: Uint8Array,
): Promise<{ status: number; bytes: Uint8Array; contentType: string }> {
  return new Promise((resolvePromise, rejectPromise): void => {
    let url: URL;
    try {
      url = new URL(base.replace(/\/+$/, "") + target);
    } catch (exc) {
      // Unparseable base: py raises ValueError (unknown url type)
      // OUTSIDE the URLError taxonomy → the generic leg (3851-3853),
      // not the unreachable leg. A bare Error (TypeError name from
      // the URL constructor) rides the generic envelope below.
      rejectPromise(exc instanceof Error ? exc : new Error(String(exc)));
      return;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      rejectPromise(unreachable(base, "unknown url type: '" + base + "'"));
      return;
    }
    const hasBody: boolean = body.length > 0;
    const opts: RequestOptions = {
      hostname: url.hostname,
      port:
        url.port === ""
          ? url.protocol === "https:"
            ? 443
            : 80
          : Number(url.port),
      path: url.pathname + url.search,
      method,
      headers: hasBody ? { "content-type": JSON_CT } : {},
    };
    const doRequest: typeof httpRequest =
      url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = doRequest(opts, (res): void => {
      const chunks: Uint8Array[] = [];
      res.on("data", (chunk: Uint8Array): void => {
        chunks.push(chunk);
      });
      res.on("end", (): void => {
        const raw: unknown = res.headers["content-type"];
        const ctype: string =
          (Array.isArray(raw)
            ? (raw[0] as string | undefined)
            : (raw as string | undefined)) ?? JSON_CT;
        resolvePromise({
          status: res.statusCode ?? 0,
          bytes: Buffer.concat(chunks),
          contentType: ctype,
        });
      });
      res.on("error", (exc: Error): void => {
        rejectPromise(unreachable(base, exc.message));
      });
    });
    // 60s upstream deadline — mirrors urlopen(req, timeout=60).
    req.setTimeout(60000, (): void => {
      req.destroy(new Error("request timed out after 60000ms"));
    });
    req.on("error", (exc: Error): void => {
      rejectPromise(unreachable(base, exc.message));
    });
    try {
      if (hasBody) req.end(Buffer.from(body));
      else req.end();
    } catch (exc) {
      rejectPromise(unreachable(base, exc instanceof Error ? exc.message : String(exc)));
    }
  });
}

/** The poser door: resolve → forward → verbatim triple; 502 taxonomy
 *  per _h_poser_bridge 3813-3853. Async (network I/O) — the ctx.ts
 *  seam awaits it. */
export async function handlePoserBridge(
  method: string,
  target: string,
  body: Uint8Array,
  repoRoot: string = resolveRepoRoot(),
): Promise<BridgeResult> {
  const resolved: { base: string } | { refusal: { error: string } } =
    resolvePoserBase(repoRoot);
  if ("refusal" in resolved) {
    return {
      status: 502,
      body: dumpsPy(resolved.refusal),
      contentType: JSON_CT,
      headers: {},
    };
  }
  const base: string = resolved.base;
  try {
    const out: {
      status: number;
      bytes: Uint8Array;
      contentType: string;
    } = await forwardPoser(base, method, target, body);
    return {
      status: out.status,
      body: out.bytes,
      contentType: out.contentType,
      headers: {},
    };
  } catch (exc) {
    if (isUnreachable(exc)) {
      // 3847-3850: connection failures carry the exact reason; the
      // reason prose differs per language (wall pins status + the
      // prefix through "(").
      return {
        status: 502,
        body: dumpsPy({
          error:
            "poser bridge: comfyui unreachable at " +
            base +
            " (" +
            (exc as Error).message +
            ")",
        }),
        contentType: JSON_CT,
        headers: {},
      };
    }
    // 3851-3853: the generic leg (type name + message).
    const name: string =
      exc instanceof Error ? exc.constructor.name : "Error";
    const msg: string = exc instanceof Error ? exc.message : String(exc);
    return {
      status: 502,
      body: dumpsPy({ error: "poser bridge: " + name + ": " + msg }),
      contentType: JSON_CT,
      headers: {},
    };
  }
}

// ── manage door ─────────────────────────────────────────────────────
// Cordis-native dispatch (./manage.ts over the MCP rail ./mcp.ts).
// The TS process never spawns estate Python; the only Python process
// on this path is the VENDOR comfy-mcp server binary.

/** Vendor server binary — MELITE_COMFY_MCP_BIN wins (env pin for
 *  deployments that move the base env), else the base env default
 *  <anchor>/infra/python/.venv/bin/comfy-mcp. No other hardcode. */
export function resolveComfyMcpBin(): string {
  const override: string = process.env["MELITE_COMFY_MCP_BIN"] ?? "";
  if (override !== "") return override;
  return join(anchoredRepoRoot(), "infra", "python", ".venv", "bin", "comfy-mcp");
}

/** Peek the action for the plane-unavailable envelopes. THROWS on
 *  truthy non-dict docs (the old .get-crash 500 leg — same keys via
 *  the server.ts catch). Falsy non-dicts ([], "", 0, false, null)
 *  ride as {} exactly as the old `or {}` did. */
export function manageActionName(doc: unknown): unknown {
  // The dict leg rides the admission gate's object check (identical
  // on the pure-JSON wire domain); the falsy-or-{} ride + the
  // .get-crash 500 leg below stay pinned (py voice, not structure).
  if (isRecord(doc)) {
    return "action" in doc ? doc["action"] : "?";
  }
  const falsy: boolean =
    !doc || (Array.isArray(doc) && (doc as unknown[]).length === 0);
  if (falsy) return "?";
  throw new Error(
    "'" +
      (Array.isArray(doc) ? "list" : typeof doc) +
      "' object has no attribute 'get'",
  );
}

/** The manage door: strict doc in, [code, rep] out — the wire rim
 *  is unchanged (503 vendor-unavailable / [code, rep] passthrough /
 *  502 rail-failed + last-500 stderr). rawBody is the dispatcher's raw
 *  request bytes (already strict-accepted); empty feeds b"{}" per
 *  `or "{}"`. Async: dispatch rides the MCP rail (./manage.ts) to the
 *  vendor server — no estate Python anywhere. models is the injected
 *  ModelsService (stroke 4a: the listener passes ctx.models — the
 *  door never imports the catalog, the seam is the service). */
export async function handleManage(
  doc: unknown,
  rawBody: Uint8Array,
  repoRoot: string = resolveRepoRoot(),
  models?: ModelsService | null,
): Promise<BridgeResult> {
  // The .get crash leg first (see manageActionName): a truthy
  // non-dict never reaches the plane.
  const action: unknown = manageActionName(doc);
  const serverBin: string = resolveComfyMcpBin();
  if (!existsSync(serverBin)) {
    return {
      status: 503,
      body: dumpsPy(
        normalize4xx(503, {
          action,
          ok: false,
          detail:
            "management plane unavailable: no vendor comfy-mcp at " +
            serverBin +
            " (provision sync)",
        }),
      ),
      contentType: JSON_CT,
      headers: {},
    };
  }
  let stdinDoc: unknown;
  try {
    stdinDoc =
      rawBody.length === 0 ? {} : parseJson(Buffer.from(rawBody).toString("utf8"));
  } catch {
    stdinDoc = {};
  }
  try {
    const [code, rep] = await dispatchManage(stdinDoc, {
      repoRoot,
      serverBin,
      models: needModels(models, "manage door"),
    });
    return {
      status: code,
      body: dumpsPy(normalize4xx(code, rep)),
      contentType: JSON_CT,
      headers: {},
    };
  } catch (exc) {
    const msg: string = exc instanceof Error ? exc.message : String(exc);
    return {
      status: 502,
      body: dumpsPy(
        normalize4xx(502, {
          action,
          ok: false,
          detail: "manage runner failed",
          data: { stderr: msg.slice(-500) },
        }),
      ),
      contentType: JSON_CT,
      headers: {},
    };
  }
}

// ── dispatcher entry ────────────────────────────────────────────────
// Null when the row is not a bridge door (the dispatchAssets /
// dispatchDrafts pattern); the manage arm needs route()'s strict doc
// AND the raw bytes (stdin rides raw — see handleManage).

/** Dispatch bridge rows by handler name. Async: the poser arm
 *  forwards over the network; the manage arm dispatches Cordis-native
 *  over the MCP rail (./manage.ts). models is the injected
 *  ModelsService (null only for non-plugin callers — the listener
 *  always passes ctx.models). */
export async function dispatchBridges(
  handler: string,
  method: string,
  target: string,
  body: Uint8Array,
  doc: unknown,
  repoRoot: string = resolveRepoRoot(),
  models?: ModelsService | null,
): Promise<BridgeResult | null> {
  if (handler === "_h_poser_bridge") {
    return await handlePoserBridge(method, target, body, repoRoot);
  }
  if (handler === "_h_manage") {
    return handleManage(doc, body, repoRoot, models);
  }
  return null;
}

/** The bridge doors (_h_manage/_h_poser_bridge) as a
 *  self-registering plugin: the manage door (strict-parse under
 *  route()'s strict contract — the doc AND the raw bytes both ride;
 *  dispatch is Cordis-native over the MCP rail, ./manage.ts) and the
 *  poser forward (raw target+body, no parse). Pre-serialized/passed through (manage
 *  envelopes already carry normalize4xx codes; poser byte doors skip
 *  the dict-only rule exactly as py's tuple payloads do). A
 *  non-dict truthy manage doc throws here (py's .get crash → _adapt
 *  500): on the bus that is a serial rejection, shaped into the 500
 *  envelope by dispatch() — the same bytes the old server.ts catch
 *  shaped. A null bridge answer falls through (returns undefined)
 *  exactly as the old arm fell through to the discovery arm.
 *  Matches its own rows inside the listener — no central table. */
export const bridgesDoors: Plugin = {
  name: "gateway-bridges",
  inject: ["gatewayError", "models"],
  apply(ctx: Context): void {
    ctx.on(
      "gateway/request",
      async (req: GatewayRequest): Promise<DispatchResult | undefined> => {
        const hit = matchRoute(req.method, req.path);
        if (
          hit === null ||
          (hit.row.handler !== "_h_manage" &&
            hit.row.handler !== "_h_poser_bridge")
        ) {
          return undefined;
        }
        const errors = ctx.gatewayError;
        const parsed: { doc: unknown } | {
          status: number;
          payload: Record<string, unknown>;
        } =
          hit.row.handler === "_h_manage"
            ? parseStrictJson(req.body)
            : { doc: null };
        if (!("doc" in parsed)) {
          return {
            status: parsed.status,
            body: errors.serializePy(parsed.payload),
            contentType: "application/json",
            headers: {},
          };
        }
        const bridged = await dispatchBridges(
          hit.row.handler,
          req.method,
          req.target,
          req.body,
          parsed.doc,
          resolveRepoRoot(),
          ctx.models,
        );
        if (bridged !== null) return bridged;
        return undefined;
      },
    );
  },
};
