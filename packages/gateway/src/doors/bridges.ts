// doors/bridges.ts — the P6 TS port of the two bridge doors: the
// studio poser forward (GET|POST ^/poser/, _h_poser_bridge) and the
// management-plane subprocess bridge (POST /v1/manage, _h_manage).
//
// LADDER P6 (docs/design/ts-migration-ladder-2026-09-07.md: "manage/
// poser stay proxy/forward, envelope shapes only" + the non-targets
// verdict "comfy-mcp rail behind manage.dispatch — TS keeps a proxy
// envelope, never reimplements"): NEITHER door reimplements its plane.
// The poser door forwards method+path+query+body bytes to the engine
// endpoint and passes the upstream answer through verbatim; the
// manage door forwards the request bytes over stdio to the real
// manage.dispatch in a base-env python and passes [code, rep] back.
// This module maps envelope shapes and refusal texts only.
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
//   MANAGE (_h_manage, 3924-3963):
//   - The TS process cannot run manage.dispatch in-process, so it
//     ALWAYS takes py's base-env runner shape (3935-3959): spawn the
//     base-env python with a -c runner that inserts the manage dir,
//     runs manage.dispatch over stdin JSON, and prints [code, rep].
//     The runner BEHAVIOR is identical (same function, same stdio
//     contract); only the quoting differs (JSON string literals,
//     never wire-visible).
//   - python resolution (3943): MELITE_MANAGE_PYTHON env (explicit
//     interpreter wins — the wall pins the wall interpreter through
//     it) else <repo>/.venv/bin/python (py's exact default, same
//     join semantics); missing → the byte-identical 503 (3944-3948).
//   - manage source dir: <repo>/py (py str(REPO/"py"), 3927/3942),
//     resolved against the same repo root; when MELITE_REPO_ROOT
//     points at a fixture tree without python/, the file-anchored repo
//     python/ is appended as fallback (production: identical single dir;
//     the manage SOURCE is product code, never a fixture).
//   - stdin (3950-3952): py feeds json.dumps(body_json) — the parsed
//     doc re-serialized. This door feeds the RAW request bytes (the
//     dispatcher already strict-parsed them, so they are valid JSON;
//     empty bodies feed b"{}" per `or "{}"`): json.loads sees the
//     identical doc while huge int literals never cross a float64
//     round-trip. Non-dict truthy docs (py: (body or {}) then .get
//     crashes with AttributeError → _adapt 500) THROW here before
//     spawning (→ server.ts 500, same keys); falsy non-dicts ride
//     the runner exactly as py's `or {}` does.
//   - stdout (3953-3955): last line → [code, rep]; int(code)
//     mirrored. rc!=0 / empty stdout → the byte-identical 502
//     runner-failed envelope incl. data.stderr = last 500 chars
//     (3956-3959). Timeout → the 504 envelope (3960-3963, no data
//     key); the deadline mirrors py's 900s.
//   - dispatch refusals (422 bad request / named-arg 422 / catalog
//     404 / plane 503 / crash 500, manage.py 707-723) are computed
//     by the REAL manage.dispatch in the SAME interpreter the wall's
//     py gateway uses — byte-identical by construction, incl. the
//     pydantic envelope texts.
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

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import type { RequestOptions } from "node:http";
import { request as httpsRequest } from "node:https";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dumpsPy, parseJson, PyNum } from "./assets.ts";
import { isRecord, parseStrictJson } from "../core/params.ts";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { DispatchResult } from "../core/errors.ts";
import type { GatewayRequest } from "../ctx.ts";
import { matchRoute } from "../routeUtil.ts";

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

/** Repo root: MELITE_REPO_ROOT override, else this file's py-parity
 *  resolution (the uploads.ts pattern — this file is
 *  <repo>/packages/gateway/src/doors/bridges.ts, four levels down). */
export function resolveRepoRoot(): string {
  const override: string = process.env["MELITE_REPO_ROOT"] ?? "";
  if (override !== "") return override;
  const here: string = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..", "..", "..");
}

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

// ── manage bridge ───────────────────────────────────────────────────
// stdio/subprocess rail to the real manage.dispatch (never
// reimplemented): the TS process always takes py's base-env runner
// shape (_h_manage 3935-3959).

/** Upstream interpreter — MELITE_MANAGE_PYTHON wins (env pin for the
 *  wall + deployments that move the base env), else py's exact
 *  default <repo>/.venv/bin/python. No other hardcode. */
export function resolveManagePython(repoRoot: string): string {
  const override: string = process.env["MELITE_MANAGE_PYTHON"] ?? "";
  if (override !== "") return override;
  return join(repoRoot, ".venv", "bin", "python");
}

/** Manage source dirs for sys.path (py str(REPO/"py"), 3927/3942):
 *  <repo>/py first when present (the MELITE_REPO_ROOT tree), always
 *  backed by the file-anchored product python/ (the manage SOURCE is
 *  product code, never a wall fixture). */
export function managePyDirs(repoRoot: string): string[] {
  const dirs: string[] = [];
  const overrideDir: string = join(repoRoot, "py");
  if (overrideDir !== join(anchoredRepoRoot(), "py") && existsSync(overrideDir)) {
    dirs.push(overrideDir);
  }
  dirs.push(join(anchoredRepoRoot(), "py"));
  return dirs;
}

/** The -c runner — behavior-identical to py's (3936-3942): insert
 *  the manage dirs, run manage.dispatch over stdin JSON, print
 *  [code, rep]. Quoting differs (JSON string literals — never
 *  wire-visible), semantics don't. First-listed dir wins position 0
 *  (inserts applied in reverse). */
export function manageRunner(pyDirs: string[]): string {
  const inserts: string = pyDirs
    .slice()
    .reverse()
    .map((d: string): string => "sys.path.insert(0, " + JSON.stringify(d) + ");")
    .join("");
  return (
    "import sys, json;" +
    inserts +
    "import manage;" +
    "c, r = manage.dispatch(json.loads(sys.stdin.read()));" +
    "print(json.dumps([c, r]))"
  );
}

/** Peek the action for the plane-unavailable envelopes — mirrors
 *  body_json.get("action", "?") (3945/3956/3961). THROWS on truthy
 *  non-dict docs: py's (body or {}).get crashes there with
 *  AttributeError → _adapt 500, so the 500 leg (same keys via the
 *  server.ts catch) is the faithful shape, not a 502/503 envelope.
 *  Falsy non-dicts ([], "", 0, false, null) ride the runner exactly
 *  as py's `or {}` does. */
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

const MANAGE_TIMEOUT_MS: number = 900 * 1000;

/** The manage door: strict doc in, [code, rep] out — mirrors
 *  _h_manage 3924-3963 outcome for outcome (503 unavailable /
 *  [code, rep] passthrough / 502 runner-failed + last-500 stderr /
 *  504 timeout). rawBody is the dispatcher's raw request bytes
 *  (already strict-accepted); empty feeds b"{}" per `or "{}"`. */
export function handleManage(
  doc: unknown,
  rawBody: Uint8Array,
  repoRoot: string = resolveRepoRoot(),
): BridgeResult {
  // The .get crash leg first (see manageActionName): a truthy
  // non-dict never reaches the plane on either side.
  const action: unknown = manageActionName(doc);
  const python: string = resolveManagePython(repoRoot);
  if (!existsSync(python)) {
    // 3944-3948, byte-identical (str(_py) == this join on posix).
    return {
      status: 503,
      body: dumpsPy(
        normalize4xx(503, {
          action,
          ok: false,
          detail:
            "management plane unavailable: no base-env python at " +
            python +
            " (uv sync)",
        }),
      ),
      contentType: JSON_CT,
      headers: {},
    };
  }
  const stdin: Uint8Array =
    rawBody.length === 0 ? Buffer.from("{}") : Buffer.from(rawBody);
  let status: number | null;
  let stdout: string;
  let stderr: string;
  try {
    const out = spawnSync(python, ["-c", manageRunner(managePyDirs(repoRoot))], {
      input: stdin,
      timeout: MANAGE_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
      encoding: "utf8",
    });
    if (out.error !== undefined) {
      const code: string = (out.error as NodeJS.ErrnoException).code ?? "";
      if (code === "ETIMEDOUT") {
        // 3960-3963, byte-identical (no data key).
        return {
          status: 504,
          body: dumpsPy(
            normalize4xx(504, {
              action,
              ok: false,
              detail: "manage action timed out (900s)",
            }),
          ),
          contentType: JSON_CT,
          headers: {},
        };
      }
      // Spawn-level failure (vanished interpreter, signal): the
      // plane is unavailable — the 503 template names the path.
      return {
        status: 503,
        body: dumpsPy(
          normalize4xx(503, {
            action,
            ok: false,
            detail:
              "management plane unavailable: no base-env python at " +
              python +
              " (uv sync)",
          }),
        ),
        contentType: JSON_CT,
        headers: {},
      };
    }
    status = out.status;
    stdout = typeof out.stdout === "string" ? out.stdout : String(out.stdout ?? "");
    stderr = typeof out.stderr === "string" ? out.stderr : String(out.stderr ?? "");
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
  if (status === 0 && stdout.trim() !== "") {
    // 3953-3955: the last line is [code, rep]. parseJson keeps
    // number literals verbatim (dumpsPy re-emits 1.0/big ints
    // exactly — _adapt's json.dumps would too).
    try {
      const pair: unknown = parseJson(stdout.trim().split("\n").pop() as string);
      // parseJson keeps number LITERALS as PyNum (dumpsPy re-emits
      // them verbatim below) — unwrap the code for the int() mirror.
      const rawCode: unknown =
        Array.isArray(pair) ? (pair as unknown[])[0] : undefined;
      const code: number =
        typeof rawCode === "number"
          ? rawCode
          : rawCode instanceof PyNum
            ? Number((rawCode as PyNum).literal)
            : NaN;
      if (
        Array.isArray(pair) &&
        (pair as unknown[]).length === 2 &&
        Number.isFinite(code) &&
        typeof (pair as unknown[])[1] === "object" &&
        (pair as unknown[])[1] !== null &&
        !Array.isArray((pair as unknown[])[1])
      ) {
        const httpCode: number = Math.trunc(code);
        const rep: unknown = (pair as [unknown, unknown])[1];
        return {
          status: httpCode,
          body: dumpsPy(normalize4xx(httpCode, rep)),
          contentType: JSON_CT,
          headers: {},
        };
      }
    } catch {
      // Falls through to runner-failed below.
    }
  }
  // 3956-3959, byte-identical (stderr tail = last 500 chars).
  return {
    status: 502,
    body: dumpsPy(
      normalize4xx(502, {
        action,
        ok: false,
        detail: "manage runner failed",
        data: { stderr: stderr.slice(-500) },
      }),
    ),
    contentType: JSON_CT,
    headers: {},
  };
}

// ── dispatcher entry ────────────────────────────────────────────────
// Null when the row is not a bridge door (the dispatchAssets /
// dispatchDrafts pattern); the manage arm needs route()'s strict doc
// AND the raw bytes (stdin rides raw — see handleManage).

/** Dispatch bridge rows by py handler name. Async: the poser arm
 *  forwards over the network; the manage arm is sync-subprocess
 *  (spawnSync blocks the loop exactly as py's _sp.run blocks its
 *  own — the subprocess rail is inherent to the proxy design). */
export async function dispatchBridges(
  handler: string,
  method: string,
  target: string,
  body: Uint8Array,
  doc: unknown,
  repoRoot: string = resolveRepoRoot(),
): Promise<BridgeResult | null> {
  if (handler === "_h_poser_bridge") {
    return await handlePoserBridge(method, target, body, repoRoot);
  }
  if (handler === "_h_manage") {
    return handleManage(doc, body, repoRoot);
  }
  return null;
}

/** The bridge doors (_h_manage/_h_poser_bridge) as a
 *  self-registering plugin: the manage subprocess bridge
 *  (strict-parse under route()'s strict contract — the doc AND the
 *  raw bytes both ride, stdin is raw) and the poser forward (raw
 *  target+body, no parse). Pre-serialized/passed through (manage
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
  inject: ["gatewayError"],
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
        );
        if (bridged !== null) return bridged;
        return undefined;
      },
    );
  },
};
