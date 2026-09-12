// engine/comfyui.ts — the ComfyUI engine-IO client (TS port of the
// py execute-lane transport: packages/engines/comfyui/compose/native.py
// + the merged submit/poll/harvest half of
// packages/engines/comfyui/compose/mergegraph.py).
//
// SCOPE (P4: the engine-IO half): queue a prompt (POST /prompt), poll
// the run to terminal (GET /history with the py-identical 250ms
// cadence + deadline/interrupt semantics), interrupt a live prompt
// (POST /queue delete + POST /interrupt), harvest artifacts (GET
// /view + the full outputs shape matrix), and map history entries to
// run status. Two entry points mirror the two py submitters:
//   - executeSingle — native.execute (per-stage; deadline = the
//     stage's own timeout_s, default 2400; "the graph" refusal
//     texts, "ComfyUI run exceeded" deadline text).
//   - executeFlow — mergegraph.execute_flow (merged single-graph;
//     deadline = max(sum(stage timeout_s), 2400); "the merged graph"
//     / "merged run exceeded" texts; per-stage harvest into per-stage
//     sub-dirs with prefix-stripped output keys).
// doors/flowsRun.ts drives executeFlow (the gateway's pure-comfyui
// path is the merged one — python/gateway.py _try_merged, 1631-1634).
//
// FAITHFUL MIRRORS (line-cited against native.py unless noted):
//   - endpoint: COMFYUI_URL env (non-empty wins, trailing slashes
//     stripped) > the endpoint config (COMFYUI_ENDPOINT_CONFIG env
//     path, else the plugin's data/comfyui_endpoint.json; the
//     INFERENCE_TEST_SANDBOX gate with no env path resolves to {}
//     — _config.py). Absent url = the LOUD ComfyError (native
//     82-84). NO default, NO hardcoded host/port (QUEUE LANE LAW).
//   - POST /prompt {prompt, prompt_id, client_id} (native 355-358);
//     non-200 -> "POST /prompt %s: %s" (360); node_errors non-empty
//     -> "ComfyUI validation refused the graph: %s" (361-364) /
//     "…the merged graph…" (mergegraph 306-310).
//   - poll: 250ms cadence (native 378); history GET timeout 30s
//     (383-385); entry-absent + past-deadline -> interrupt +
//     "exceeded" (387-393); status_str error -> execution_error
//     message detail else whole-status detail, "ComfyUI run failed"
//     (394-401); not-completed + past-deadline -> interrupt +
//     "exceeded" (402-408); stop flag -> interrupt + "stopped
//     (interrupt delivered)" (380-382). Merged texts per mergegraph
//     333-363 (incl. the "merged run exceeded %.0fs" deadline =
//     max(budget, 2400), 318-327).
//   - %.0f parity: Python rounds half-to-even (2.5 -> "2"); the
//     formatter below does the same (formatTimeout0f).
//   - interrupt = POST /queue {delete:[prompt_id]} then POST
//     /interrupt {} (native 525-534), best-effort swallow.
//   - harvest = _fetch_outputs (native 459-522): the images/gifs/
//     audio/video/3d/three_model/result/files matrix incl. the flat
//     tuple-row "result" arm, dict rows + list/tuple rows,
//     basename + "<node>_<name>"-iff-subfolder naming, GET /view
//     (180s), JSON artifacts re-serialized indent=2 (ensure_ascii =
//     False, i.e. raw UTF-8 here).
//   - upload walk = _upload_referenced (native 274-327): absolute or
//     cwd-relative estate paths whose lowercase suffix hits the
//     artifact upload-ext table ride POST /upload/image multipart
//     (native 109-126); VHS_LoadVideoPath/VHS_LoadVideo `video`
//     inputs are server-path readers and keep the mount path;
//     missing files ride through untouched.
//   - channel publish = publish_output_channels (native 438-458):
//     first unmatched artifact per FILE-kind channel, declaration
//     order; mesh/image/video/audio ext tables (430-435).
//   - ACTIVE registry (run_dir -> {promptId, clientId, server}) for
//     the stop door (native 332-333, 366-367, 417-419); stopForRunDir
//     mirrors native.stop (537-565); unloadModels mirrors
//     native.unload (545-565, POST /free).
//
// DOCUMENTED DIVERGENCES (preview scope, not drift):
//   - NO websocket tap (_ws_tap, native 131-201). The tap is
//     progress-only; /history stays the terminal authority
//     (native.py:28-29 says a dropped tap never kills the run).
//     Mid-run progress/activity frames are therefore absent; the
//     terminal status mapping is identical.
//   - Transport errors surface as Error("<node:http message>")
//     (e.g. ECONNREFUSED text) where py surfaces
//     URLError("<urlopen …>"). The run-failure SHAPE (failed +
//     error) agrees; the errno prose does not — the wall asserts
//     shape there, bytes everywhere the stub controls the text.
//   - Python str(out) for non-200 bodies uses single-quote reprs;
//     pyStr() below reproduces them for the JSON scalar/container
//     shapes the stub serves.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { randomBytes, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Schema from "@deepseek-ai/schemastery";
import { Context, Service } from "@deepseek-ai/cordis";
import type { Plugin } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-settings";
import {
  EngineSupervisor,
  isTransportDownError,
} from "./supervisor.ts";

/** LOUD transport failure (never a silent fallback — native.py:67). */
export class ComfyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComfyError";
  }
}

/** Wire JSON — mirrors native.py JsonValue. */
export type EngineJson =
  | string
  | number
  | boolean
  | null
  | EngineJson[]
  | { [key: string]: EngineJson };

/** One queued prompt's live record — mirrors _ACTIVE rows. */
export interface ActivePrompt {
  readonly promptId: string;
  readonly clientId: string;
  readonly server: string;
}

/** run_dir -> live prompt (the stop door's handle).
 *
 *  NON-PLUGIN callers only (walls/probes/unit — no Context): the
 *  module executeSingle/executeFlow register here, module
 *  stopForRunDir reads here. Plugin paths (doors) register/read
 *  through ComfyUIHostService.prompts (fiber-owned, below) — never
 *  this handle. The two registries are coherent per calling
 *  convention (plugin→service, standalone→module); never mix them
 *  within one call chain (documented split, the ModelsService
 *  precedent — the seam is the service, never the import). */
const ACTIVE: Map<string, ActivePrompt> = new Map();

/** Read-only view for doors (size probes in tests only). */
export function activeCount(): number {
  return ACTIVE.size;
}

// ── config: the endpoint SSOT (native._server_url + _config.py) ──

/** No-endpoint refusal — byte-identical to native.py:82-84. */
export const NO_ENDPOINT_MESSAGE: string =
  "no ComfyUI endpoint: the endpoint config carries no 'url' " +
  "and COMFYUI_URL is unset (no defaults — QUEUE LANE LAW)";

/** Repo root: MELITE_REPO_ROOT override (the wall seam — default
 *  resolution is the source-file-relative root, the same relation
 *  py REPO = Path(__file__).parent.parent holds for native.py). */
export function resolveRepoRoot(): string {
  const override: string = process.env["MELITE_REPO_ROOT"] ?? "";
  if (override !== "") return override;
  const here: string = dirname(fileURLToPath(import.meta.url));
  // src→comfyui→engines→packages→repo (4 hops) — same depth as
  // the old packages/engines/comfyui/src/ home (STAGE 1 move); the py
  // hop count (parent.parent from python/) transcribed literally
  // landed 3 hops at packages/; caught LIVE by the flip.
  return resolve(here, "..", "..", "..", "..");
}

/** The endpoint config dict — mirrors _config.load_global_config:
 *  COMFYUI_ENDPOINT_CONFIG env path first, else the plugin's
 *  data/comfyui_endpoint.json; INFERENCE_TEST_SANDBOX without the
 *  env path resolves to {} (the test-sandbox leak gate); a
 *  present-but-unparseable file raises LOUD (never silent {}). */
/** The endpoint config's write target: the first EXISTING candidate,
 *  else the plugin's own data path (a fresh write). The same
 *  resolution loadEndpointConfig reads — one spelling for read and
 *  write (the endpoint_set manage action rewrites only `url`). */
export function endpointConfigPath(): string {
  const envPath: string = process.env["COMFYUI_ENDPOINT_CONFIG"] ?? "";
  if (envPath !== "") return envPath;
  return join(
    resolveRepoRoot(),
    "packages",
    "engines",
    "comfyui-cordis",
    "data",
    "comfyui_endpoint.json",
  );
}

export function loadEndpointConfig(): Record<string, EngineJson> {
  const envPath: string = process.env["COMFYUI_ENDPOINT_CONFIG"] ?? "";
  const sandbox: string = process.env["INFERENCE_TEST_SANDBOX"] ?? "";
  if (sandbox !== "" && envPath === "") return {};
  const cands: string[] =
    envPath !== ""
      ? [envPath]
      : [
          join(
            resolveRepoRoot(),
            "packages",
            "engines",
            // The PLUGIN's own data dir (deep-audit engine finding
            // #1, fixed 2026-09-10): the stale `comfyui` segment
            // pointed at a tree with no data/ — the shipped
            // estate-truth file was silently skipped
            // (`if (!existsSync(cand)) continue` → {}).
            "comfyui-cordis",
            "data",
            "comfyui_endpoint.json",
          ),
        ];
  for (const cand of cands) {
    if (!existsSync(cand)) continue;
    try {
      const text: string = readFileSync(cand, "utf8");
      return JSON.parse(text) as Record<string, EngineJson>;
    } catch (exc: unknown) {
      // readFileSync/JSON.parse throw Error by contract — the read
      // casts (the unknown halves are the type toll, never runtime
      // arms; 2026-09-12).
      const err = exc as Error;
      throw new Error(
        "endpoint config " +
          cand +
          " exists but will not parse (" +
          err.constructor.name +
          ": " +
          err.message +
          ") — fix the file; no silent fallback",
      );
    }
  }
  return {};
}

/** The engine base URL — mirrors native._server_url (env seam for
 *  the hermetic walls; live env read, no caching). */
export function resolveEngineBaseUrl(): string {
  const env: string = process.env["COMFYUI_URL"] ?? "";
  if (env !== "") return env.replace(/\/+$/, "");
  const cfg: Record<string, EngineJson> = loadEndpointConfig();
  const url: string = String(cfg["url"] ?? "").replace(/\/+$/, "");
  if (url === "") throw new ComfyError(NO_ENDPOINT_MESSAGE);
  return url;
}

// ── node:http primitive (urllib parity: status + parsed-or-bytes) ──

export interface HttpResult {
  readonly status: number;
  readonly body: EngineJson | Buffer;
}

/** One HTTP request -> {status, parsed-json-or-bytes}. Mirrors
 *  native._http (90-106): HTTP errors resolve (never reject) with
 *  the error body's bytes parsed the same way; transport failures
 *  reject (py: URLError propagates). */
export function httpCall(
  method: string,
  url: string,
  body: Uint8Array | null = null,
  contentType: string = "application/json",
  timeoutMs: number = 30000,
): Promise<HttpResult> {
  return new Promise<HttpResult>((resolveP, rejectP) => {
    const req = httpRequest(
      url,
      {
        method,
        headers:
          body !== null
            ? {
                "content-type": contentType,
                "content-length": String(body.length),
              }
            : {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer): void => {
          chunks.push(c);
        });
        res.on("end", (): void => {
          const raw: Buffer = Buffer.concat(chunks);
          // statusCode is always set on a client response — the
          // read casts (the ?? 0 toll is an uncoverable arm, never
          // a runtime path; 2026-09-12).
          const status: number = res.statusCode as number;
          let parsed: EngineJson | Buffer;
          try {
            const text: string = raw.toString("utf8");
            parsed = (text === "" ? null : JSON.parse(text)) as EngineJson;
          } catch {
            parsed = raw;
          }
          resolveP({ status, body: parsed });
        });
      },
    );
    req.on("error", (exc: Error): void => {
      rejectP(exc);
    });
    req.setTimeout(timeoutMs, (): void => {
      req.destroy(new Error("request timed out after " + timeoutMs + "ms"));
    });
    if (body !== null) req.write(body);
    req.end();
  });
}

// ── python-shaped stringification (error-text parity) ──

/** Python repr() for short strings (single quotes + the escapes the
 *  wall's refusal texts exercise: backslash, quote, \n \r \t). */
export function pyReprStr(v: string): string {
  let out: string = "'";
  for (const ch of v) {
    if (ch === "\\") out += "\\\\";
    else if (ch === "'") out += "\\'";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else out += ch;
  }
  return out + "'";
}

/** Python str() for non-200 /prompt bodies and run-failure
 *  details: dicts/lists with single quotes, True/False/None. A
 *  TOP-level string rides verbatim (str(b) of a body); NESTED
 *  strings take repr (single quotes) — exactly str() semantics. */
export function pyStr(
  v: EngineJson | Buffer | null | undefined,
  top: boolean = true,
): string {
  if (v === null || v === undefined) return "None";
  if (typeof v === "string") return top ? v : pyReprStr(v);
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "True" : "False";
  if (Buffer.isBuffer(v)) return "b'" + v.toString("latin1") + "'";
  if (Array.isArray(v)) {
    return "[" + v.map((x: EngineJson): string => pyStr(x, false)).join(", ") + "]";
  }
  const parts: string[] = [];
  for (const [k, val] of Object.entries(v)) {
    parts.push(pyReprStr(k) + ": " + pyStr(val, false));
  }
  return "{" + parts.join(", ") + "}";
}

/** Python json.dumps(x)[:400] for the node_errors/detail shapes:
 *  the DEFAULT separators (", ", ": ") — JSON.stringify's compact
 *  form gains exactly one space after each structural comma/colon
 *  outside strings. ASCII payloads (what the stub serves) then
 *  agree byte-for-byte; non-ASCII would need ensure_ascii escapes
 *  (documented, unserved). */
export function pyDumps400(v: EngineJson): string {
  const emit = (x: EngineJson): string => {
    // JSON.stringify of a string (or an object key below) always
    // succeeds — no ?? '""' toll (uncoverable arms, 2026-09-12).
    if (typeof x === "string") return JSON.stringify(x);
    if (x === null) return "null";
    if (typeof x === "number" || typeof x === "boolean") return String(x);
    if (Array.isArray(x)) {
      return "[" + x.map(emit).join(", ") + "]";
    }
    const parts: string[] = [];
    for (const [k, val] of Object.entries(x)) {
      parts.push(JSON.stringify(k) + ": " + emit(val));
    }
    return "{" + parts.join(", ") + "}";
  };
  return emit(v).slice(0, 400);
}

/** Python "%.0f" (round-half-to-even) for the deadline texts. */
export function formatTimeout0f(v: number): string {
  const lo: number = Math.floor(v);
  const frac: number = v - lo;
  if (frac < 0.5) return String(lo);
  if (frac > 0.5) return String(lo + 1);
  return String(lo % 2 === 0 ? lo : lo + 1);
}

/** Python str() of a string list (the ambiguity/knob texts). */
export function pyReprStrList(v: string[]): string {
  return "[" + v.map(pyReprStr).join(", ") + "]";
}

// ── workflow finalization (native 231-327) ──

/** The artifact-primitive upload table — the TS restatement of
 *  artifact.upload_extensions() (compose/artifact.py _EXTS union
 *  minus latent, sorted): image/video/audio/qvoice/mesh ride the
 *  submit-time walk; latent (.safetensors/.pt/.pth) NEVER uploads. */
export const UPLOAD_EXTS: readonly string[] = [
  ".aac",
  ".aiff",
  ".avif",
  ".avi",
  ".bmp",
  ".fbx",
  ".flac",
  ".gltf",
  ".glb",
  ".gif",
  ".jpeg",
  ".jpg",
  ".m4a",
  ".mkv",
  ".mov",
  ".mp3",
  ".mp4",
  ".obj",
  ".ogg",
  ".png",
  ".tiff",
  ".usd",
  ".usdz",
  ".wav",
  ".webm",
  ".webp",
];

/** params['workflow'] + params['inject'] -> the final graph.
 *  Byte-identical refusals to native._splice_workflow (239-271). */
export function spliceWorkflow(
  nodeParams: Record<string, EngineJson>,
): Record<string, EngineJson> {
  const wf: EngineJson = nodeParams["workflow"];
  if (typeof wf !== "object" || wf === null || Array.isArray(wf)) {
    throw new ComfyError(
      "node carries no inline workflow — compose must emit the " +
        "graph (workflow_file retired 2026-09-07; no silent empty " +
        "render)",
    );
  }
  const inject: EngineJson = nodeParams["inject"] ?? {};
  if (typeof inject !== "object" || inject === null || Array.isArray(inject)) {
    throw new ComfyError("inject must be an object");
  }
  const graph = wf as Record<string, EngineJson>;
  for (const [slot, value] of Object.entries(
    inject as Record<string, EngineJson>,
  )) {
    const dot: number = slot.lastIndexOf(".");
    const nodeId: string = dot < 0 ? "" : slot.slice(0, dot);
    const key: string = dot < 0 ? "" : slot.slice(dot + 1);
    const target: EngineJson | undefined =
      dot < 0 ? undefined : graph[nodeId];
    const inputs: EngineJson | undefined =
      typeof target === "object" && target !== null && !Array.isArray(target)
        ? (target as Record<string, EngineJson>)["inputs"]
        : undefined;
    if (
      dot < 0 ||
      typeof target !== "object" ||
      target === null ||
      Array.isArray(target) ||
      typeof inputs !== "object" ||
      inputs === null ||
      Array.isArray(inputs) ||
      !Object.prototype.hasOwnProperty.call(inputs, key)
    ) {
      throw new ComfyError(
        "inject " +
          pyReprStr(slot) +
          " targets nothing in the workflow " +
          "(node " +
          pyReprStr(nodeId) +
          " has no input " +
          pyReprStr(key) +
          ")",
      );
    }
    (inputs as Record<string, EngineJson>)[key] = value;
  }
  return graph;
}

/** POST /upload/image multipart (native._upload, 109-126). */
async function uploadFile(
  server: string,
  path: string,
): Promise<Record<string, string>> {
  const data: Buffer = readFileSync(path);
  const lower: string = path.toLowerCase();
  let ctype: string = "application/octet-stream";
  if (lower.endsWith(".png")) ctype = "image/png";
  else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) ctype = "image/jpeg";
  else if (lower.endsWith(".webp")) ctype = "image/webp";
  else if (lower.endsWith(".gif")) ctype = "image/gif";
  else if (lower.endsWith(".mp4")) ctype = "video/mp4";
  else if (lower.endsWith(".wav")) ctype = "audio/wav";
  else if (lower.endsWith(".mp3")) ctype = "audio/mpeg";
  else if (lower.endsWith(".glb")) ctype = "model/gltf-binary";
  const boundary: string = "----melite" + randomBytes(6).toString("hex");
  const head: Buffer = Buffer.from(
    "--" +
      boundary +
      "\r\n" +
      'content-disposition: form-data; name="image"; filename="' +
      basename(path) +
      '"\r\n' +
      "content-type: " +
      ctype +
      "\r\n\r\n",
    "utf8",
  );
  const tail: Buffer = Buffer.from("\r\n--" + boundary + "--\r\n", "utf8");
  const parts: Buffer = Buffer.concat([head, data, tail]);
  const { status, body } = await httpCall(
    "POST",
    server + "/upload/image",
    parts,
    "multipart/form-data; boundary=" + boundary,
    180000,
  );
  const out = body as Record<string, EngineJson>;
  if (
    status !== 200 ||
    typeof out !== "object" ||
    out === null ||
    Buffer.isBuffer(out) ||
    !out["name"]
  ) {
    throw new ComfyError(
      "upload failed (" + path + " " + status + "): " + pyStr(body).slice(0, 200),
    );
  }
  return { name: String(out["name"]) };
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** The estate's asset-URL prefixes — the two surfaces that serve
 *  run artifacts. /melite-media/runs is the browser media route;
 *  /v1/assets/runs is the compose door's artifact currency (the
 *  dangling-ref gate accepts exactly these two forms). */
const MEDIA_ROUTE_PREFIX = "/melite-media/runs/";
const ASSET_ROUTE_PREFIX = "/v1/assets/runs/";

/** Walk the FINAL graph; stage every existing local-media path.
 *  Mirrors native._upload_referenced (274-327) incl. the
 *  VHS_LoadVideoPath/VHS_LoadVideo `video` exemption.
 *
 *  opts.runsRoot (the runs OUTPUT tree root — callers hold the run
 *  dir; its dirname is the root) arms the ESTATE-ASSET arm: URLs the
 *  estate's own surfaces serve (/melite-media/runs/<run>/<rel>,
 *  /v1/assets/runs/<run>/<rel>) and runs-relative <run>/<rel> names
 *  resolve ON DISK under the root and upload like local files. This
 *  is the chained-stage seam: a downstream card wired to an upstream
 *  run's output carries that URL in its params, and ComfyUI consumes
 *  only staged input-dir names. A prefixed URL that does not resolve
 *  under the root refuses LOUD (never a dangling URL in the graph);
 *  a runs-relative name that misses simply falls to the cwd arm. */
export async function uploadReferenced(
  server: string,
  wf: Record<string, EngineJson>,
  opts?: { runsRoot?: string },
): Promise<{ graph: Record<string, EngineJson>; uploaded: Record<string, string> }> {
  const seen: Record<string, string> = {};
  const stageOne = async (v: EngineJson): Promise<EngineJson> => {
    if (Array.isArray(v)) {
      const out: EngineJson[] = [];
      for (const x of v) out.push(await stageOne(x));
      return out;
    }
    // OBJECT DESCENT (2026-09-10 — the walk never descended): node
    // payloads nest under `inputs` ({image: <path>}), but objects
    // returned verbatim — NEITHER local files NOR linked URLs inside
    // inputs ever staged. Recurse (the VHS `video` exemption rides
    // the outer branch, which matches first and stays untouched).
    if (typeof v === "object" && v !== null) {
      const next: Record<string, EngineJson> = {};
      for (const [k, x] of Object.entries(v as Record<string, EngineJson>)) next[k] = await stageOne(x);
      return next;
    }
    if (typeof v !== "string") return v;
    const p: string = v.trim();
    const lower: string = p.toLowerCase();
    if (!UPLOAD_EXTS.some((e: string): boolean => lower.endsWith(e))) return v;
    // LINKED-INPUT ARM (2026-09-10 — the chaining fix): a stage wired
    // to an upstream card's output arrives as that output's asset URL
    // (/v1/assets/runs/… — the editor injects it at compile). The old
    // walk only staged local files, so the URL rode into LoadImage
    // verbatim and the run died on the engine. Fetch it (the asset
    // door is open GET), stage to tmp under a stable name, and upload
    // exactly like a local file. A fetch/upload failure refuses LOUD
    // — never a dangling URL in the graph.
    if (lower.startsWith("http://") || lower.startsWith("https://")) {
      if (!(p in seen)) {
        // the ext gate above proved a table hit — the find reads
        // direct (the ?? '.bin' toll is an uncoverable arm, never a
        // runtime path; 2026-09-12).
        const ext = UPLOAD_EXTS.find((e: string): boolean => lower.endsWith(e)) as string;
        const { status, body } = await httpCall("GET", p, null, "application/json", 120000);
        if (status !== 200 || !Buffer.isBuffer(body)) {
          throw new ComfyError("linked input fetch failed (" + p + " " + status + ") — the upstream output is unreachable; re-run the producer card");
        }
        const tmp = join(tmpdir(), "melite-link-" + randomBytes(8).toString("hex") + ext);
        writeFileSync(tmp, body);
        seen[p] = (await uploadFile(server, tmp)).name;
      }
      return seen[p] as string;
    }
    // ESTATE-ASSET ARM (2026-09-12 — the chain's disk half): a
    // downstream stage wired to an upstream run's output arrives as
    // one of the estate's own URLs (the tab rewrites artifact names
    // onto the media route; the compose door speaks /v1/assets).
    // Resolved on disk under opts.runsRoot — no HTTP hop to self —
    // and uploaded exactly like a local file. Loud on dangling
    // (the http arm's law: re-run the producer card).
    const routePrefix =
      lower.startsWith(MEDIA_ROUTE_PREFIX) ? MEDIA_ROUTE_PREFIX :
      lower.startsWith(ASSET_ROUTE_PREFIX) ? ASSET_ROUTE_PREFIX : "";
    if (routePrefix !== "") {
      if (opts?.runsRoot === undefined) {
        throw new ComfyError("estate asset url without a runs root (" + p + ") — the caller passed no runsRoot; the chained input cannot stage");
      }
      const rel: string = p.slice(routePrefix.length);
      if (rel.includes("..")) {
        throw new ComfyError("estate asset url refuses traversal: " + p);
      }
      const cand = join(opts.runsRoot, rel);
      if (!isFile(cand)) {
        throw new ComfyError("estate asset url not found (" + p + " -> " + cand + ") — the upstream output is unreachable; re-run the producer card");
      }
      if (!(cand in seen)) seen[cand] = (await uploadFile(server, cand)).name;
      return seen[cand] as string;
    }
    // RUNS-RELATIVE ARM: '<run>/<rel>' (the estate's third accepted
    // artifact form) resolves under the root when the file exists;
    // a miss falls to the cwd arm below (estate-relative input paths
    // like data/input/x.png ride there — unchanged law).
    if (opts?.runsRoot !== undefined && !p.startsWith("/") && p.includes("/") && !p.includes("..")) {
      const cand = join(opts.runsRoot, p);
      if (isFile(cand)) {
        if (!(cand in seen)) seen[cand] = (await uploadFile(server, cand)).name;
        return seen[cand] as string;
      }
    }
    const cand: string = p.startsWith("/") ? p : join(process.cwd(), p);
    if (!isFile(cand)) return v;
    if (!(cand in seen)) seen[cand] = (await uploadFile(server, cand)).name;
    return seen[cand] as string;
  };
  const out: Record<string, EngineJson> = {};
  for (const [nid, node] of Object.entries(wf)) {
    if (typeof node === "object" && node !== null && !Array.isArray(node)) {
      const rec = node as Record<string, EngineJson>;
      if (
        (rec["class_type"] === "VHS_LoadVideoPath" ||
          rec["class_type"] === "VHS_LoadVideo") &&
        typeof rec["inputs"] === "object" &&
        rec["inputs"] !== null &&
        !Array.isArray(rec["inputs"])
      ) {
        const ins = rec["inputs"] as Record<string, EngineJson>;
        const next: Record<string, EngineJson> = {};
        for (const [k, x] of Object.entries(ins)) {
          next[k] = k === "video" ? x : await stageOne(x);
        }
        out[nid] = { ...rec, inputs: next };
        continue;
      }
      const next: Record<string, EngineJson> = {};
      for (const [k, x] of Object.entries(rec)) next[k] = await stageOne(x);
      out[nid] = next;
      continue;
    }
    out[nid] = node;
  }
  return { graph: out, uploaded: seen };
}

// ── interrupt (native 525-534) ──

/** Delete-from-queue + interrupt — best-effort swallow, exactly as py. */
export async function interrupt(server: string, promptId: string): Promise<void> {
  try {
    await httpCall(
      "POST",
      server + "/queue",
      Buffer.from(JSON.stringify({ delete: [promptId] }), "utf8"),
    );
    await httpCall("POST", server + "/interrupt", Buffer.from("{}", "utf8"));
  } catch {
    // best-effort; the stop door's /interrupt is audited <6s
  }
}

/** The stop door's engine handle — mirrors native.stop (537-565).
 *
 *  NON-PLUGIN callers only (walls/probes/unit — no Context).
 *  Plugin paths (the flows-stop door) read through
 *  ComfyUIHostService.stopForRunDir (the fiber-owned prompts map).
 *  Documented split, never two truths (shared inner below). */
export async function stopForRunDir(runDir: string): Promise<void> {
  return stopForRunDirInner(runDir, ACTIVE);
}

/** Shared stop core (no resolution, no registry choice): delete
 *  from queue + interrupt, best-effort. */
async function stopForRunDirInner(
  runDir: string,
  active: Map<string, ActivePrompt>,
): Promise<void> {
  const rec: ActivePrompt | undefined = active.get(String(runDir));
  if (rec === undefined) return;
  await interrupt(rec.server, rec.promptId);
}

/** ENGINE TRANSITION (native.unload port, native 545-565): drop every
 *  cached model + the execution cache from VRAM — POST /free
 *  {"unload_models": true, "free_memory": true}. Raises ComfyError on
 *  a non-2xx so the caller can DOCUMENT a failed unload (RESILIENCE
 *  LAW) and continue — never silently resident. Unwired (single-engine
 *  preview — flowsRun.ts owns the boundary call when it lands).
 *
 *  NON-PLUGIN callers only (walls/probes/unit — no Context).
 *  Plugin paths use ComfyUIHostService.unloadModels (same inner). */
export async function unloadModels(serverOverride: string = ""): Promise<void> {
  const server: string =
    serverOverride !== "" ? serverOverride : resolveEngineBaseUrl();
  return unloadModelsInner(server);
}

/** Shared unload core (no resolution): POST /free, LOUD on non-2xx. */
async function unloadModelsInner(server: string): Promise<void> {
  const { status } = await httpCall(
    "POST",
    server + "/free",
    Buffer.from(
      JSON.stringify({ unload_models: true, free_memory: true }),
      "utf8",
    ),
  );
  if (status >= 300) {
    throw new ComfyError(
      "ComfyUI /free status " + status + " (models may still be resident)",
    );
  }
}

// ── harvest (native 459-522) ──

/** history.outputs -> downloaded artifacts under runDir/.
 *  The full shape matrix: images/gifs/audio/video/3d/three_model/
 *  result/files, the flat tuple-row "result" arm, dict rows and
 *  list/tuple rows. */
export async function fetchOutputs(
  server: string,
  runDir: string,
  entry: Record<string, EngineJson>,
): Promise<string[]> {
  mkdirSync(runDir, { recursive: true });
  const arts: string[] = [];
  const outputs = entry["outputs"];
  if (typeof outputs !== "object" || outputs === null || Array.isArray(outputs)) {
    return arts;
  }
  for (const [nodeId, nodeOut] of Object.entries(
    outputs as Record<string, EngineJson>,
  )) {
    if (typeof nodeOut !== "object" || nodeOut === null || Array.isArray(nodeOut)) {
      continue;
    }
    const rec = nodeOut as Record<string, EngineJson>;
    for (const kind of [
      "images",
      "gifs",
      "audio",
      "video",
      "3d",
      "three_model",
      "result",
      "files",
    ]) {
      let raw: EngineJson = rec[kind] ?? [];
      if (!Array.isArray(raw)) continue;
      if (kind === "result" && raw.length > 0 && typeof raw[0] === "string") {
        raw = [raw]; // flat tuple-row: the whole list IS the row
      }
      for (const f of raw as EngineJson[]) {
        let filename: string = "";
        let sub: string = "";
        let ftype: string = "output";
        if (typeof f === "object" && f !== null && !Array.isArray(f)) {
          const fr = f as Record<string, EngineJson>;
          if (!fr["filename"]) continue;
          filename = String(fr["filename"]);
          sub = String(fr["subfolder"] ?? "");
          ftype = String(fr["type"] ?? "output");
        } else if (Array.isArray(f) && f.length > 0 && typeof f[0] === "string" && f[0] !== "") {
          filename = f[0] as string;
          sub =
            f.length > 1 && typeof f[1] === "string" ? (f[1] as string) : "";
          ftype =
            f.length > 2 && typeof f[2] === "string" && (f[2] as string) !== ""
              ? (f[2] as string)
              : "output";
        } else {
          continue;
        }
        const name: string = basename(filename);
        const dest: string = join(runDir, sub !== "" ? nodeId + "_" + name : name);
        const { status, body } = await httpCall(
          "GET",
          server +
            "/view?filename=" +
            encodeURIComponent(filename) +
            "&subfolder=" +
            encodeURIComponent(sub) +
            "&type=" +
            encodeURIComponent(ftype),
          null,
          "application/json",
          180000,
        );
        let blob: Buffer | null = null;
        if (status === 200 && Buffer.isBuffer(body)) blob = body;
        else if (status === 200 && typeof body === "string") {
          blob = Buffer.from(body, "utf8");
        } else if (
          status === 200 &&
          typeof body === "object" &&
          body !== null
        ) {
          // _http json-parses when it can — a JSON artifact arrives
          // parsed. Re-serialize (the core pretty-prints indent=2,
          // ensure_ascii=False => raw UTF-8) instead of dropping it.
          blob = Buffer.from(JSON.stringify(body, null, 2), "utf8");
        }
        if (status === 200 && blob !== null) {
          writeFileSync(dest, blob);
          arts.push(dest);
        }
      }
    }
  }
  return arts;
}

// ── channel publish (native 438-458) ──

/** FILE-kind -> artifact extensions (native._CHANNEL_EXTS). */
const CHANNEL_EXTS: Record<string, readonly string[]> = {
  mesh: [".glb", ".gltf", ".obj", ".fbx", ".usd", ".usdz"],
  image: [".png", ".jpg", ".jpeg", ".webp"],
  video: [".mp4", ".webm", ".mov", ".avi", ".mkv"],
  audio: [".wav", ".mp3", ".ogg", ".flac"],
};

/** Harvested paths -> {channel: path} for the FILE-kind channels
 *  the stage DECLARED. First unmatched artifact wins per channel,
 *  declaration order. */
export function publishOutputChannels(
  outputs: Record<string, EngineJson>,
  artifacts: string[],
): Record<string, EngineJson> {
  const published: Record<string, EngineJson> = {};
  const claimed: Set<string> = new Set();
  for (const [channel, kind] of Object.entries(outputs ?? {})) {
    const exts: readonly string[] | undefined =
      CHANNEL_EXTS[String(kind)];
    if (!exts) continue;
    for (const art of artifacts ?? []) {
      if (claimed.has(art)) continue;
      if (exts.some((e: string): boolean => art.toLowerCase().endsWith(e))) {
        published[channel] = art;
        claimed.add(art);
        break;
      }
    }
  }
  return published;
}

// ── status mapping (the poll loop's shared read) ──

export type HistoryVerdict =
  | { kind: "pending" }
  | { kind: "failed"; detail: string }
  | { kind: "completed" };

/** Map one history entry to its verdict — the read half of the
 *  poll loop (native 394-408 / mergegraph 350-363, minus the WS
 *  execution_error arm which has no tap here). */
export function mapHistoryEntry(
  entry: Record<string, EngineJson> | null | undefined,
): HistoryVerdict {
  if (entry === null || entry === undefined) return { kind: "pending" };
  const statusD = entry["status"];
  const rec: Record<string, EngineJson> =
    typeof statusD === "object" && statusD !== null && !Array.isArray(statusD)
      ? (statusD as Record<string, EngineJson>)
      : {};
  if (rec["status_str"] === "error") {
    const msgs = rec["messages"];
    let detail: string = pyDumps400(rec);
    if (Array.isArray(msgs)) {
      for (const m of msgs as EngineJson[]) {
        if (
          Array.isArray(m) &&
          m.length > 1 &&
          m[0] === "execution_error"
        ) {
          detail = pyDumps400(m[1] as EngineJson);
          break;
        }
      }
    }
    return { kind: "failed", detail };
  }
  if (rec["completed"] !== true) return { kind: "pending" };
  return { kind: "completed" };
}

// ── submit + poll ──

function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolveP) => setTimeout(resolveP, ms));
}

export interface ExecuteOpts {
  /** Seconds; native default 2400 (never hours of silent hang). */
  readonly timeoutS?: number;
  /** Polled every tick — mirrors stop_event.is_set(). */
  readonly shouldStop?: () => boolean;
  /** Progress fold — mirrors report() (tap-less: only submit/activity). */
  readonly report?: (updates: Record<string, EngineJson>) => void;
}

export interface ExecuteResult {
  readonly outputs: Record<string, EngineJson>;
  readonly artifacts: string[];
  readonly promptId: string;
}

async function submitPrompt(
  server: string,
  graph: Record<string, EngineJson>,
  merged: boolean,
): Promise<{ promptId: string; clientId: string }> {
  const promptId: string = randomUUID();
  const clientId: string = "melite-" + randomBytes(8).toString("hex");
  const { status, body } = await httpCall(
    "POST",
    server + "/prompt",
    Buffer.from(
      JSON.stringify({ prompt: graph, prompt_id: promptId, client_id: clientId }),
      "utf8",
    ),
  );
  if (status !== 200) {
    throw new ComfyError("POST /prompt " + status + ": " + pyStr(body).slice(0, 400));
  }
  const out =
    typeof body === "object" && body !== null && !Buffer.isBuffer(body)
      ? (body as Record<string, EngineJson>)
      : null;
  const nodeErrors: EngineJson | undefined = out?.["node_errors"];
  const hasErrors: boolean =
    nodeErrors !== undefined &&
    nodeErrors !== null &&
    (typeof nodeErrors !== "object" ||
      (Array.isArray(nodeErrors) ? nodeErrors.length > 0 : Object.keys(nodeErrors).length > 0));
  if (hasErrors) {
    throw new ComfyError(
      "ComfyUI validation refused the " +
        (merged ? "merged graph: " : "graph: ") +
        pyDumps400(nodeErrors as EngineJson),
    );
  }
  return { promptId, clientId };
}

async function pollToTerminal(
  server: string,
  promptId: string,
  deadline: number,
  exceededText: () => string,
  shouldStop: () => boolean,
): Promise<Record<string, EngineJson>> {
  for (;;) {
    await sleep(250); // the py-identical cadence (native 378)
    if (shouldStop()) {
      await interrupt(server, promptId);
      throw new ComfyError("stopped (interrupt delivered)");
    }
    const { body: hist } = await httpCall(
      "GET",
      server + "/history/" + promptId,
      null,
      "application/json",
      30000,
    );
    const entry: EngineJson | undefined =
      typeof hist === "object" && hist !== null && !Buffer.isBuffer(hist)
        ? (hist as Record<string, EngineJson>)[promptId]
        : undefined;
    if (entry === undefined || entry === null) {
      if (Date.now() >= deadline) {
        await interrupt(server, promptId);
        throw new ComfyError(exceededText());
      }
      continue;
    }
    const verdict: HistoryVerdict = mapHistoryEntry(
      entry as Record<string, EngineJson>,
    );
    if (verdict.kind === "failed") {
      throw new ComfyError("ComfyUI run failed: " + verdict.detail);
    }
    if (verdict.kind === "pending") {
      if (Date.now() >= deadline) {
        await interrupt(server, promptId);
        throw new ComfyError(exceededText());
      }
      continue;
    }
    return entry as Record<string, EngineJson>;
  }
}

/** native.execute port (per-stage submit + poll + fetch).
 *
 *  NON-PLUGIN callers only (walls/probes/unit — no Context).
 *  Plugin paths (doors) use ComfyUIHostService.executeSingle (same
 *  inner, fiber-owned prompts map + service-resolved server).
 *  Documented split, never two truths. */
export async function executeSingle(
  runDir: string,
  nodeParams: Record<string, EngineJson>,
  nodeOutputs: Record<string, EngineJson>,
  opts: ExecuteOpts = {},
  serverOverride: string = "",
): Promise<ExecuteResult> {
  const server: string =
    serverOverride !== "" ? serverOverride : resolveEngineBaseUrl();
  return executeSingleInner(runDir, nodeParams, nodeOutputs, opts, server, ACTIVE);
}

/** Shared execute core (no resolution, no registry choice). */
async function executeSingleInner(
  runDir: string,
  nodeParams: Record<string, EngineJson>,
  nodeOutputs: Record<string, EngineJson>,
  opts: ExecuteOpts,
  server: string,
  active: Map<string, ActivePrompt>,
): Promise<ExecuteResult> {
  const params: Record<string, EngineJson> = { ...nodeParams };
  const wf: Record<string, EngineJson> = spliceWorkflow(params);
  const staged = await uploadReferenced(server, wf, { runsRoot: dirname(String(runDir)) });
  const timeoutS: number = Number(params["timeout_s"] ?? 2400) || 2400;
  const deadline: number = Date.now() + timeoutS * 1000;
  const { promptId } = await submitPrompt(server, staged.graph, false);
  active.set(String(runDir), {
    promptId,
    clientId: "",
    server,
  });
  try {
    const entry: Record<string, EngineJson> = await pollToTerminal(
      server,
      promptId,
      deadline,
      (): string =>
        "ComfyUI run exceeded " + formatTimeout0f(timeoutS) + "s (interrupt delivered)",
      opts.shouldStop ?? ((): boolean => false),
    );
    const arts: string[] = await fetchOutputs(server, String(runDir), entry);
    const outputs: Record<string, EngineJson> = { prompt_id: promptId };
    Object.assign(outputs, publishOutputChannels(nodeOutputs, arts));
    return { outputs, artifacts: arts, promptId };
  } finally {
    ACTIVE.delete(String(runDir));
  }
}

// ── merged submit (mergegraph.execute_flow port) ──

export interface MergeRow {
  readonly stageId: string;
  readonly workflow: Record<string, EngineJson>;
  readonly outputs: Record<string, EngineJson>;
  readonly outputNodes: Record<string, EngineJson>;
  readonly params: Record<string, EngineJson>;
}

export interface MergeStageResult {
  readonly outputs: Record<string, EngineJson>;
  readonly artifacts: string[];
}

/** In-stage wire namespacing (mergegraph._namespace_wires): every
 *  [node_id, slot] link pointing inside the stage rewrites to the
 *  namespaced id. */
function namespaceWires(
  node: EngineJson,
  sid: string,
  stageIds: Set<string>,
): EngineJson {
  if (Array.isArray(node)) {
    if (
      node.length === 2 &&
      typeof node[0] === "string" &&
      typeof node[1] === "number" &&
      stageIds.has(node[0] as string)
    ) {
      return [sid + "::" + (node[0] as string), node[1]];
    }
    return (node as EngineJson[]).map((v: EngineJson): EngineJson =>
      namespaceWires(v, sid, stageIds),
    );
  }
  if (typeof node === "object" && node !== null) {
    const out: Record<string, EngineJson> = {};
    for (const [k, v] of Object.entries(node as Record<string, EngineJson>)) {
      out[k] = namespaceWires(v, sid, stageIds);
    }
    return out;
  }
  return node;
}

/** $spell substitution (mergegraph._rewrite_spells): FromStage-wired
 *  names become link tuples, request initials substitute, anything
 *  left over refuses LOUD with the py-identical text. */
function rewriteSpells(
  value: EngineJson,
  links: Record<string, [string, number]>,
  initials: Record<string, EngineJson>,
  where: string,
): EngineJson {
  if (typeof value === "string" && value.startsWith("$")) {
    const name: string = value.slice(1);
    if (name in links) return links[name] as unknown as EngineJson;
    if (name in initials) return initials[name] as EngineJson;
    throw new ComfyError(
      where +
        ": workflow carries $" +
        name +
        " — neither a FromStage-wired " +
        "input name nor a request initial (the merged graph has " +
        "no later substitution seam; name it or wire it)",
    );
  }
  if (Array.isArray(value)) {
    return (value as EngineJson[]).map((v: EngineJson): EngineJson =>
      rewriteSpells(v, links, initials, where),
    );
  }
  if (typeof value === "object" && value !== null) {
    const out: Record<string, EngineJson> = {};
    for (const [k, v] of Object.entries(value as Record<string, EngineJson>)) {
      out[k] = rewriteSpells(v, links, initials, where);
    }
    return out;
  }
  return value;
}

/** A [node, slot] link shape (mergegraph._is_wire). */
function isWire(v: EngineJson): boolean {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === "string" &&
    typeof v[1] === "number"
  );
}

/** The dangling-wire integrity gate (mergegraph._assert_wires_resolve):
 *  construction refuses here, never at the server. */
function assertWiresResolve(
  merged: Record<string, EngineJson>,
  links: Record<string, [string, number]>,
): void {
  const ids: Set<string> = new Set(Object.keys(merged));
  const walk = (v: EngineJson): void => {
    if (isWire(v)) {
      const target: string = (v as EngineJson[])[0] as string;
      if (!ids.has(target)) {
        throw new ComfyError(
          "merged plan: wire " +
            JSON.stringify(v) +
            " targets no node in the merged graph",
        );
      }
      return;
    }
    if (Array.isArray(v)) {
      for (const x of v as EngineJson[]) walk(x);
      return;
    }
    if (typeof v === "object" && v !== null) {
      for (const x of Object.values(v as Record<string, EngineJson>)) walk(x);
    }
  };
  for (const node of Object.values(merged)) walk(node);
  for (const link of Object.values(links)) {
    // Untestable-by-construction arm (2026-09-12): links are built
    // from producers-table keys two loops above, which are merged
    // keys by construction — a link can never dangle through the
    // public planner (the wire half above IS reachable: hand-spelled
    // tuples ride rewriteSpells untouched, and the battery pins one).
    /* v8 ignore next */
    if (!ids.has(link[0])) {
      throw new ComfyError(
        "merged plan: link " +
          JSON.stringify(link) +
          " targets no node in the merged graph",
      );
    }
  }
}

/** plan_merge port (mergegraph 178-269) for the link-free shapes
 *  the TS preview serves: namespaced copy + FromStage link
 *  resolution + the Load file-slot gate + the dangling gate.
 *  Producer inference (_producers: declared output_nodes, else the
 *  single-Save binding) mirrors py — an ambiguous graph refuses
 *  LOUD with the producer text. */
export function planMerge(
  rows: MergeRow[],
  initials: Record<string, EngineJson>,
  inputNames: Record<string, Record<string, string>>,
): { workflow: Record<string, EngineJson> } {
  const merged: Record<string, EngineJson> = {};
  const producers: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    const sid: string = row.stageId;
    const wf: Record<string, EngineJson> = row.workflow;
    if (typeof wf !== "object" || wf === null || Object.keys(wf).length === 0) {
      throw new ComfyError(
        "stage " +
          pyReprStr(sid) +
          ": no workflow to merge (card stages must " +
          "bridge first; engine-only stages need params.workflow)",
      );
    }
    // producer inference: declared output_nodes wins; else the
    // single-Save binding; anything else refuses LOUD.
    const declared: Record<string, EngineJson> = row.outputNodes ?? {};
    const stageProd: Record<string, string> = {};
    if (Object.keys(declared).length > 0) {
      for (const [channel, nid] of Object.entries(declared)) {
        if (!(String(nid) in wf)) {
          throw new ComfyError(
            "stage " +
              pyReprStr(sid) +
              ": output_nodes names node " +
              pyReprStr(String(nid)) +
              " for channel " +
              pyReprStr(channel) +
              " — the workflow carries no such node",
          );
        }
        stageProd[sid + "::" + String(nid)] = channel;
      }
    } else {
      const saves: string[] = Object.keys(wf).filter((nid: string): boolean => {
        const n = wf[nid] as Record<string, EngineJson>;
        return (
          typeof n === "object" &&
          n !== null &&
          String((n as Record<string, EngineJson>)["class_type"] ?? "").startsWith("Save")
        );
      });
      if (saves.length === 1) {
        for (const channel of Object.keys(row.outputs ?? {})) {
          stageProd[sid + "::" + saves[0]] = channel;
        }
      } else if (saves.length > 1 && Object.keys(row.outputs ?? {}).length > 0) {
        throw new ComfyError(
          "stage " +
            pyReprStr(sid) +
            ": ambiguous producers " +
            pyReprStrList(saves) +
            " — declare output_nodes {channel: node_id}",
        );
      }
    }
    const stageIds: Set<string> = new Set(Object.keys(wf));
    const nsKeys: string[] = [];
    for (const [nid, node] of Object.entries(wf)) {
      const key: string = sid + "::" + nid;
      if (key in merged) {
        throw new ComfyError(
          "stage " +
            pyReprStr(sid) +
            ": duplicate namespaced node " +
            pyReprStr(key) +
            " — stage ids and node ids collided",
        );
      }
      merged[key] = namespaceWires(node, sid, stageIds);
      nsKeys.push(key);
    }
    producers[sid] = stageProd;
    // this stage's FromStage-wired inputs -> link tuples.
    const links: Record<string, [string, number]> = {};
    for (const [name, ref] of Object.entries(inputNames[sid] ?? {})) {
      if (ref.startsWith("__initial__.")) continue;
      const dot: number = ref.indexOf(".");
      const upstream: string = dot < 0 ? ref : ref.slice(0, dot);
      const channel: string = dot < 0 ? "" : ref.slice(dot + 1);
      if (!(upstream in producers)) {
        throw new ComfyError(
          "stage " +
            pyReprStr(sid) +
            " input " +
            pyReprStr(name) +
            " wires " +
            pyReprStr(ref) +
            " — the upstream stage declares no mergeable producer for it",
        );
      }
      // `upstream in producers` was just proved — the table read
      // casts (the ?? {} / ?. tolls are uncoverable arms, never
      // runtime paths; 2026-09-12).
      const table = producers[upstream] as Record<string, string>;
      const ups: string[] = Object.keys(table).filter(
        (n: string): boolean => table[n] === channel,
      );
      if (ups.length === 0) {
        throw new ComfyError(
          "stage " +
            pyReprStr(sid) +
            " input " +
            pyReprStr(name) +
            " wires channel " +
            pyReprStr(channel) +
            " — upstream stage " +
            pyReprStr(upstream) +
            " produces no such channel",
        );
      }
      links[name] = [ups[0] as string, 0];
    }
    // ROW-4 file-slot gate (mergegraph 232-258): a producer link
    // may only land in a tensor slot — Load* file slots refuse.
    for (const key of nsKeys) {
      const node = merged[key] as Record<string, EngineJson>;
      const cls: string = String(node["class_type"] ?? "");
      if (!cls.startsWith("Load")) continue;
      const ins = node["inputs"];
      if (typeof ins !== "object" || ins === null || Array.isArray(ins)) continue;
      for (const [slot, val] of Object.entries(ins as Record<string, EngineJson>)) {
        if (typeof val === "string" && val.startsWith("$") && val.slice(1) in links) {
          throw new ComfyError(
            "stage " +
              pyReprStr(sid) +
              " node " +
              pyReprStr(key.split("::", 2)[1]!) +
              " (" +
              cls +
              "): input " +
              pyReprStr(slot) +
              " carries the $spell " +
              pyReprStr(val) +
              " — a producer link cannot land in a file slot. The merged path needs the arm's " +
              "tensor entry (drop the loader); the per-stage path owns the disk handoff",
          );
        }
      }
    }
    for (const key of nsKeys) {
      const node = merged[key] as Record<string, EngineJson>;
      merged[key] = rewriteSpells(
        node,
        links,
        initials,
        "stage " + pyReprStr(sid) + " node " + pyReprStr(key.split("::", 2)[1]!),
      ) as Record<string, EngineJson>;
    }
    assertWiresResolve(merged, links);
  }
  return { workflow: merged };
}

export interface FlowResult {
  readonly stages: Record<string, MergeStageResult>;
  readonly promptId: string;
}

/** mergegraph.execute_flow port: plan, submit ONCE, tap-less poll,
 *  per-stage harvest.
 *
 *  NON-PLUGIN callers only (walls/probes/unit — no Context).
 *  Plugin paths (the flows-start worker) use
 *  ComfyUIHostService.executeFlow (same inner, fiber-owned prompts
 *  map + service-resolved server). Documented split, never two truths. */
export async function executeFlow(
  rows: MergeRow[],
  runDir: string,
  inputNames: Record<string, Record<string, string>>,
  initials: Record<string, EngineJson>,
  opts: ExecuteOpts = {},
  serverOverride: string = "",
): Promise<FlowResult> {
  const server: string =
    serverOverride !== "" ? serverOverride : resolveEngineBaseUrl();
  return executeFlowInner(rows, runDir, inputNames, initials, opts, server, ACTIVE);
}

/** Shared merged core (no resolution, no registry choice). */
async function executeFlowInner(
  rows: MergeRow[],
  runDir: string,
  inputNames: Record<string, Record<string, string>>,
  initials: Record<string, EngineJson>,
  opts: ExecuteOpts,
  server: string,
  active: Map<string, ActivePrompt>,
): Promise<FlowResult> {
  const plan = planMerge(rows, { ...initials }, inputNames);
  const staged = await uploadReferenced(server, plan.workflow, { runsRoot: dirname(String(runDir)) });
  const { promptId, clientId } = await submitPrompt(server, staged.graph, true);
  active.set(String(runDir), { promptId, clientId, server });
  // the merged deadline: the SUM of the stages' own budgets
  // (mergegraph 318-327); per-stage floors apply.
  let budget: number = 0;
  for (const r of rows) {
    const t: number = Number(r.params["timeout_s"] ?? 2400) || 2400;
    budget += Number.isFinite(t) ? t : 2400;
  }
  const floor: number = Math.max(budget, 2400);
  const deadline: number = Date.now() + floor * 1000;
  try {
    const entry: Record<string, EngineJson> = await pollToTerminal(
      server,
      promptId,
      deadline,
      // Untestable-by-construction arm (2026-09-12): the floor below
      // is max(budget, 2400) — no test waits 40 minutes. The shared
      // poll loop's deadline arms ride the per-stage battery; this
      // closure only voices the merged noun.
      /* v8 ignore next */
      (): string =>
        "merged run exceeded " + formatTimeout0f(floor) + "s (interrupt delivered)",
      opts.shouldStop ?? ((): boolean => false),
    );
    const allOutputs = entry["outputs"];
    const allRec: Record<string, EngineJson> =
      typeof allOutputs === "object" && allOutputs !== null && !Array.isArray(allOutputs)
        ? (allOutputs as Record<string, EngineJson>)
        : {};
    const results: Record<string, MergeStageResult> = {};
    for (const r of rows) {
      const prefix: string = r.stageId + "::";
      const subOutputs: Record<string, EngineJson> = {};
      for (const [k, v] of Object.entries(allRec)) {
        if (k.startsWith(prefix)) subOutputs[k.slice(prefix.length)] = v;
      }
      const stageDir: string = join(String(runDir), r.stageId);
      const arts: string[] = await fetchOutputs(server, stageDir, {
        outputs: subOutputs,
      });
      results[r.stageId] = {
        outputs: publishOutputChannels(r.outputs, arts),
        artifacts: arts,
      };
    }
    return { stages: results, promptId };
  } finally {
    active.delete(String(runDir));
  }
}

// ── the engine client as a Cordis Service (stroke 4b,
// DSH-AS-LANGUAGE LAW) ───────────────────────────────────────────
// SERVICE NAME: 'comfyui' (the estate canon's own named exemplar —
// the card plane's ctx.comfyui, "provided once by the host plugin,
// injected by cards", is the shape copied here). RUNTIME key and
// inject spelling are the canon 'comfyui'; the TypeScript property
// spelling ctx.comfyui stays owned by the card plane's augmentation
// (service.ts declares comfyui: ComfyUIService — a
// second augmentation with a different type would be a TS2717 merge
// clash, so this module deliberately declares NONE). Typed access
// is needComfyUI(ctx) below (ctx.get + instanceof + LOUD miswire —
// one cast site; it even catches a card-plane instance stranded on
// the gateway fiber). The gateway fiber provides the host service;
// the card plane's throwaway compose Context provides its own —
// different fibers, same key, never the same registry.
//
// OWNS: the fiber-owned live-prompt map (the retired module ACTIVE
// handle's plugin face — stroke-2 defect class) and the endpoint
// server resolution (lazy once-per-fiber, cached).
//
// CONFIG (each decision documented — the task's init/Config rule):
//   - static provider Config {url?, host?, port?}: the DSH-faithful
//     host/port/url triple (host+port compose to http://host:port
//     when url is absent). Declared as the house schemastery Config
//     shape (image-gen / tutorial-05 pattern — ledger row 17,
//     2026-09-10; the old "schemastery is not a dep" justification
//     was stale — @deepseek-ai/schemastery is declared). parseComfyUI
//     HostConfig resolves through it; trim/slash-strip/empty-string
//     refusals stay hand predicates (schemastery accepts ""), the
//     non-integer port guard stays (no .int() in this version).
//   - explicit Config url wins (operator pin > everything).
//   - COMFYUI_URL env: stays — WALL-PINNED engine truth (the e2e
//     walls boot COMFYUI_URL=stub_url; the card e2e pins :18466).
//   - COMFYUI_ENDPOINT_CONFIG env path: stays — the deploy seam
//     (explicit file pin, read live per resolution).
//   - data/comfyui_endpoint.json url: stays — estate truth (the
//     endpoint machine statement; NO default, NO hardcoded
//     host/port — QUEUE LANE LAW).
//   - INFERENCE_TEST_SANDBOX gate: stays — engine-truth mirror
//     (_config.py: a sandboxed test with no env path resolves to
//     {}, never the product file).
//   - MELITE_REPO_ROOT: stays — the wall fixture seam (fixture
//     repo roots carry no endpoint file -> LOUD ComfyError only
//     when a caller actually submits, never at boot: the TS walls
//     boot fixture repos with no endpoint url, so resolution is
//     LAZY (first use), never at provide time).

/** Static provider config — the DSH host/port/url triple. */
export interface ComfyUIHostConfig {
  readonly url?: string;
  readonly host?: string;
  readonly port?: number;
}

/** The Config schema (hand-rolled — see the header note): unknown
 *  in, validated triple out. Wrong shapes throw LOUD. */
/** The provider's Config surface — the house schemastery shape
 *  (row 17): declared schema, resolved by the parser. */
export const Config: Schema<ComfyUIHostConfig> = Schema.object({
  url: Schema.string(),
  host: Schema.string(),
  port: Schema.number().min(1).max(65535),
});

export function parseComfyUIHostConfig(raw: unknown): ComfyUIHostConfig {
  if (raw === undefined || raw === null) return {};
  const resolved: ComfyUIHostConfig = Config(raw);
  const out: { url?: string; host?: string; port?: number } = {};
  if (resolved.url !== undefined) {
    if (resolved.url.trim() === "") {
      throw new Error("[comfyui] host Config url must be a non-empty string");
    }
    out.url = resolved.url.trim().replace(/\/+$/, "");
  }
  if (resolved.host !== undefined) {
    if (resolved.host.trim() === "") {
      throw new Error("[comfyui] host Config host must be a non-empty string");
    }
    out.host = resolved.host.trim();
  }
  if (resolved.port !== undefined) {
    if (!Number.isInteger(resolved.port)) {
      throw new Error("[comfyui] host Config port must be an integer 1..65535");
    }
    out.port = resolved.port;
  }
  return out;
}

export class ComfyUIHostService extends Service {
  /** Provider-configured base (operator pin — wins over env/file).
   *  Mutable ONLY via repoint (settings onChange) — faces read the
   *  resolved server, never this directly. */
  private pin: string | null;
  /** Live config source (cookbook setSource sink): the ctor config
   *  until the settings section binds, then the resolved namespace
   *  value (composition base + user layer). */
  private source: () => ComfyUIHostConfig;
  /** Ctor config (resetForTests re-arms the source — in-process
   *  reuse must not hold a disposed settings scope). */
  private readonly ctorConfig: ComfyUIHostConfig;
  /** Lazily resolved server (once per fiber — see resetForTests). */
  private resolved: string | null = null;
  /** Reachability supervisor (the MCP connection pattern, lazy with
   *  the server — fixture boots carry no endpoint, so provide time
   *  must never resolve OR probe). */
  private supervisor: EngineSupervisor | null = null;
  /** Live prompts (run_dir -> handle — the retired module ACTIVE
   *  handle's fiber-owned successor). */
  private readonly prompts: Map<string, ActivePrompt> = new Map();

  constructor(ctx: Context, config: ComfyUIHostConfig = {}) {
    super(ctx, "comfyui");
    this.ctorConfig = config;
    this.source = (): ComfyUIHostConfig => config;
    this.pin = ComfyUIHostService.resolvePin(config);
  }

  /** The Config-triple pin (url wins; host/port compose; neither =
   *  null — env/file fallback). Shared by the ctor and repoint so
   *  the two can never disagree. */
  static resolvePin(config: ComfyUIHostConfig): string | null {
    if (config.url !== undefined) return config.url;
    if (config.host !== undefined || config.port !== undefined) {
      const host: string = config.host ?? "127.0.0.1";
      const port: number = config.port ?? 8188;
      return "http://" + host + ":" + String(port);
    }
    return null;
  }

  /** Cookbook setSource sink: the settings section takes over as
   *  the live config source (no-op when the provider is absent). */
  setSource(source: () => ComfyUIHostConfig): void {
    this.source = source;
  }

  /** Cookbook onChange: re-resolve the pin against the live source.
   *  Unresolved (never used) = swap the pin silently; resolved +
   *  unchanged = no-op; resolved + changed = drop the supervisor so
   *  the next face resolves + probes fresh. In-flight runs keep
   *  their captured server string — a repoint never steers a live
   *  run. Registration calls this once with the entry value (same
   *  pin — the no-op arm). */
  repoint(): void {
    const next: string | null = ComfyUIHostService.resolvePin(this.source());
    if (this.resolved === null) {
      this.pin = next;
      return;
    }
    if (next === this.resolved) return;
    if (this.supervisor !== null) {
      const sup: EngineSupervisor = this.supervisor;
      this.supervisor = null;
      void sup.dispose();
    }
    this.pin = next;
    this.resolved = null;
    this.ctx.logger("comfyui").info(
      "%s",
      "engine repointed to " + (next ?? "(env/file fallback)"),
    );
  }

  /** Test seam: drop the resolved server + supervisor + all
   *  live-prompt handles (walls boot fresh processes; belt-and-
   *  braces for in-process reuse — the RunsService parity). */
  resetForTests(): void {
    this.resolved = null;
    this.source = (): ComfyUIHostConfig => this.ctorConfig;
    this.pin = ComfyUIHostService.resolvePin(this.ctorConfig);
    if (this.supervisor !== null) {
      const sup: EngineSupervisor = this.supervisor;
      this.supervisor = null;
      void sup.dispose();
    }
    this.prompts.clear();
  }

  /** The engine base URL (lazy once-per-fiber): Config pin >
   *  COMFYUI_URL env (wall-pinned) > endpoint file (estate truth).
   *  Absent everywhere = the LOUD ComfyError (native 82-84 — NO
   *  default, NO hardcoded host/port). First resolution also starts
   *  the reachability supervisor (fire-and-forget probe — boot and
   *  fixtures never block on the engine). */
  baseUrl(): string {
    if (this.resolved !== null) return this.resolved;
    const server: string =
      this.pin !== null ? this.pin : resolveEngineBaseUrl();
    this.resolved = server;
    this.startSupervisor(server);
    return server;
  }

  /** The fiber's supervisor (baseUrl first — a face without a
   *  server is a wiring bug, LOUD like needComfyUI). */
  private sup(): EngineSupervisor {
    if (this.supervisor === null) {
      throw new Error(
        "[comfyui] no supervisor — faces call baseUrl() first " +
          "(lazy with the server; provide time never probes)",
      );
    }
    return this.supervisor;
  }

  private startSupervisor(server: string): void {
    if (this.supervisor !== null) return;
    // Scoped-logger voice (gateway.ts rides ctx.logger the same
    // way — %s-param shape, the message carries engine error text).
    const log = this.ctx.logger("comfyui");
    const sup: EngineSupervisor = new EngineSupervisor({
      probe: (): Promise<void> => {
        return httpCall(
          "GET",
          server + "/system_stats",
          null,
          "application/json",
          5000,
        ).then((): void => undefined);
      },
      label: "comfyui",
      log: {
        info: (m: string): void => {
          log.info("%s", m);
        },
        warn: (m: string): void => {
          log.warn("%s", m);
        },
        // Untestable-by-construction arm (2026-09-12): the
        // supervisor only logs error on re-probe exhaustion (10+
        // consecutive failures) or a disabled policy — neither fits
        // a unit fuse. Warn (down) and info (recovered) ride the
        // battery below.
        /* v8 ignore next */
        error: (m: string): void => {
          log.error("%s", m);
        },
      },
    });
    this.supervisor = sup;
    sup.start();
  }

  /** Supervised face: fail FAST when the engine is known-down
   *  (the recorded error, no timeout burn); report traffic
   *  liveness back (transport-dead only — timeouts and HTTP
   *  statuses prove the engine alive and stay neutral). */
  private async supervised<T>(
    work: () => Promise<T>,
  ): Promise<T> {
    const sup: EngineSupervisor = this.sup();
    await sup.ensureUp();
    try {
      const result: T = await work();
      sup.noteSuccess();
      return result;
    } catch (error: unknown) {
      if (isTransportDownError(error)) sup.noteFailure(error);
      throw error;
    }
  }

  /** Per-stage submit + poll + fetch (the plugin face of
   *  executeSingleInner — same inner, fiber-owned prompts). */
  executeSingle(
    runDir: string,
    nodeParams: Record<string, EngineJson>,
    nodeOutputs: Record<string, EngineJson>,
    opts: ExecuteOpts = {},
  ): Promise<ExecuteResult> {
    const server: string = this.baseUrl();
    return this.supervised(() =>
      executeSingleInner(
        runDir,
        nodeParams,
        nodeOutputs,
        opts,
        server,
        this.prompts,
      )
    );
  }

  /** Merged submit ONCE + tap-less poll + per-stage harvest (the
   *  plugin face of executeFlowInner — the flows-start worker's
   *  path). */
  executeFlow(
    rows: MergeRow[],
    runDir: string,
    inputNames: Record<string, Record<string, string>>,
    initials: Record<string, EngineJson>,
    opts: ExecuteOpts = {},
  ): Promise<FlowResult> {
    const server: string = this.baseUrl();
    return this.supervised(() =>
      executeFlowInner(
        rows,
        runDir,
        inputNames,
        initials,
        opts,
        server,
        this.prompts,
      )
    );
  }

  /** Interrupt + dequeue the live prompt for one run dir (the
   *  plugin face of stopForRunDirInner — the flows-stop door's
   *  path). Unknown dir = silent no-op (the flag is the authority,
   *  as py). */
  stopForRunDir(runDir: string): Promise<void> {
    return stopForRunDirInner(runDir, this.prompts);
  }

  /** Drop every cached model + the execution cache from VRAM (the
   *  plugin face of unloadModelsInner). */
  unloadModels(): Promise<void> {
    return unloadModelsInner(this.baseUrl());
  }
}

/** The provider plugin (fiber-owned): owns the ComfyUIHostService
 *  lifetime. No prime step (resolution is lazy at first use — the
 *  fixture boots of the TS walls carry no endpoint url, so provide
 *  time must never resolve). Manifest row engine-comfyui rides
 *  BEFORE every consumer (flows-start, flows-stop). Loadable entry:
 *  packages/engines/comfyui-cordis/src/entries/comfyui-host.ts (the DSH
 *  leaf discipline — addressed code loads by address, never as a
 *  `cordis:` builtin). */
export const comfyuiHostProvider: Plugin = {
  name: "engine-comfyui",
  apply(ctx: Context, config?: unknown): void {
    const entry: ComfyUIHostConfig = parseComfyUIHostConfig(config);
    const svc: ComfyUIHostService = new ComfyUIHostService(ctx, entry);
    // The DSH settings cookbook (adding-a-settings-card): the entry
    // config layers under the user document as namespace 'comfyui';
    // writes re-resolve the pin live via repoint (no restart). The
    // inject defers until the settings provider exists and never
    // fires without one — providerless compositions behave exactly
    // as before (ctor entry governs).
    ctx.inject(["settings"], (settingsCtx): void => {
      settingsCtx.settings.installSection(ctx, "comfyui", Config, entry, {
        setSource: (current: () => ComfyUIHostConfig): void => {
          svc.setSource(current);
        },
        onChange: (): void => {
          svc.repoint();
        },
      });
    });
  },
};

/** Resolve the service for request-path helpers that take it as an
 *  optional trailing param (the stroke-2b shape): an explicit arg
 *  wins. Null = the caller forgot to thread ctx.comfyui — a bug, so
 *  reads throw LOUD (an engine call without an engine is never a
 *  silent module fallback). Door listeners MUST pass
 *  needComfyUI(ctx) (their inject declares 'comfyui'). */
export function needComfyUI(
  ctx: Context,
  where: string,
): ComfyUIHostService {
  const svc: unknown = ctx.get("comfyui");
  if (svc instanceof ComfyUIHostService) return svc;
  throw new Error(
    "[comfyui] no ComfyUIHostService for " + where +
      " — doors inject 'comfyui' and pass needComfyUI(ctx) " +
      "(the manifest's engine-comfyui row provides at boot; a " +
      "card-plane ComfyUIService on this fiber is a miswire)",
  );
}
