// uploads.ts — the POST /v1/uploads write door (TS port of
// python/gateway.py _h_uploads, gateway.py:3734-3768).
//
// THE WIRE (web-plane caller: packages/web-kit/catalog/src/uploadToEstate.ts —
// File → FileReader data: URL → fetch("/v1/uploads",
// {method:"POST", headers:{"Content-Type":"application/json"},
// body:JSON.stringify({filename, data})}) → {path, bytes}):
// strict JSON {filename, data} where data is the FileReader data:
// URL passed through VERBATIM. There is NO multipart parsing in py
// (route() 4335-4340 JSON-parses the body without looking at the
// request content-type; a multipart body lands in the JSON parser
// and refuses as bad JSON) — so this door takes NO multipart path
// either. Adding one would DIVERGE from py.
//
// Faithful mirrors (line-cited):
//   - allowlist + ext: _UPLOAD_IMAGE_TYPES (png→.png, jpeg→.jpg,
//     webp→.webp; the ext rides the MIME, never the filename) and
//     _UPLOAD_MAX_BYTES = 20 MiB on the DECODED bytes (3728-3731).
//   - refusals: every 400 text below is byte-identical to py
//     (3736-3761); the dispatcher adds code invalid_request exactly
//     as route() 4353-4355 does (ctx.ts normalize4xx).
//   - NO explicit traversal guard in py — safety is by
//     construction: Path(raw_name).stem drops every directory,
//     [^A-Za-z0-9_-]+ → "-", strip("-"), [:48], or "upload"
//     (3762-3763), then a uuid suffix. Slashes/dots cannot survive.
//   - NO temp-then-rename in py: (target / name).write_bytes(raw)
//     (3767) — a direct write of the fully-decoded buffer (refusals
//     store nothing, never an overwrite — uuid suffix per upload).
//     This door writes directly too.
//   - staging dir: REPO / "data" / "input" (3764-3765), REPO =
//     Path(__file__).parent.parent (gateway.py:63). Here the repo
//     root resolves from THIS file's location (the same relation),
//     with a MELITE_REPO_ROOT env override that exists ONLY so the
//     parity wall can point both servers at one fixture temp root
//     (default path is the py-identical resolution; no hardcodes).
//   - success: 200 {"path": "data/input/<name>", "bytes": len}
//     (3768), serialized indent-2 via ctx.serializePy.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { DispatchResult } from "@melite/gateway-core";
import type { GatewayRequest } from "@melite/gateway-core";
import { matchRoute } from "@melite/gateway-core";
import { noteUploadStaged } from "@melite/gateway-core";
import {
  checkUploadsStructure,
  parseStrictJson as parseStrictJsonCore,
  UPLOADS_VOICE,
} from "@melite/gateway-core";

/** MIME allowlist — mirrors _UPLOAD_IMAGE_TYPES (ext rides the MIME). */
export const UPLOAD_IMAGE_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

/** Decoded-bytes cap — mirrors _UPLOAD_MAX_BYTES = 20 * 1024 * 1024. */
export const UPLOAD_MAX_BYTES: number = 20 * 1024 * 1024;

/** Repo root: MELITE_REPO_ROOT override, else this file's py-parity
 *  resolution (py REPO = Path(__file__).parent.parent — this file is
 *  <repo>/packages/gateway-doors/src/doors/uploads.ts, four levels down). */
export function resolveRepoRoot(): string {
  const override: string = process.env["MELITE_REPO_ROOT"] ?? "";
  if (override !== "") return override;
  const here: string = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..", "..", "..");
}

/** The estate input stream dir — mirrors REPO / "data" / "input". */
export function resolveInputDir(): string {
  return resolve(resolveRepoRoot(), "data", "input");
}

/** Strict JSON body parse — mirrors route() 4335-4340:
 *  json.loads(body.decode() or "{}"); failure → the exact 400 shape
 *  (error "bad JSON: <msg>", code bad_json). The request
 *  content-type is never consulted (py ignores it too).
 *  Owned by the admission gate (src/core/params.ts), re-exported
 *  here (wall-pinned address). */
export function parseStrictJson(
  body: Uint8Array,
): { doc: unknown } | { status: number; payload: Record<string, unknown> } {
  return parseStrictJsonCore(body);
}

/** Path(raw_name).stem on linux (py runs on linux: "/" splits, the
 *  last "." suffix strips unless leading). Mirrors 3762's stem. */
export function pyStem(rawName: string): string {
  const segs: string[] = rawName.split("/");
  const base: string = segs[segs.length - 1] ?? rawName;
  const dot: number = base.lastIndexOf(".");
  if (dot > 0) return base.slice(0, dot);
  return base;
}

/** Name sanitization — mirrors re.sub + strip + [:48] or "upload"
 *  (gateway.py:3762-3763). */
export function sanitizeStem(rawName: string): string {
  const stem: string = pyStem(rawName);
  const dashed: string = stem.replace(/[^A-Za-z0-9_-]+/g, "-");
  const stripped: string = dashed.replace(/^-+|-+$/g, "");
  return stripped.slice(0, 48) || "upload";
}

/** Python %r for the short ASCII codec strings this door formats
 *  (the refused MIME): single-quoted, double-quoted only when the
 *  value itself holds a single quote. */
export function pyRepr(value: string): string {
  if (!value.includes("'")) return "'" + value + "'";
  return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

/** Strict base64 — mirrors base64.b64decode(b64, validate=True)
 *  (3756): Node's decoder is lenient (skips invalid chars), so the
 *  alphabet/padding is pre-validated and anything py refuses
 *  returns null (→ "base64 body does not decode"). */
export function decodeStrictBase64(b64: string): Uint8Array | null {
  if (b64.length % 4 !== 0) return null;
  if (/[^A-Za-z0-9+/=]/.test(b64)) return null;
  const pad: number = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  const rest: string = pad === 0 ? b64 : b64.slice(0, -pad);
  if (rest.includes("=")) return null;
  try {
    return Buffer.from(b64, "base64");
  } catch {
    return null;
  }
}

/** The door. Takes the already-parsed strict JSON doc (object or
 *  not), validates, writes, and answers — mirrors _h_uploads
 *  (3734-3768) refusal-for-refusal, including exact error texts. */
export function handleUploads(doc: unknown): {
  status: number;
  payload: Record<string, unknown>;
} {
  // Structure rides the admission gate (schemastery: which keys,
  // which types); static refusal texts ride its voice table (one
  // lookup). Value-content rules (blank name, data: shape, MIME,
  // base64, size) stay here — the type gate cannot own them.
  const shape = checkUploadsStructure(doc);
  if (shape.kind !== "ok") {
    return {
      status: 400,
      payload: { error: UPLOADS_VOICE[shape.kind] },
    };
  }
  const rawName: string = shape.filename;
  const dataUrl: string = shape.dataUrl;
  if (rawName.trim() === "") {
    return { status: 400, payload: { error: "uploads: filename is required" } };
  }
  if (!dataUrl.startsWith("data:")) {
    return {
      status: 400,
      payload: { error: "uploads: data must be a FileReader data: URL" },
    };
  }
  const comma: number = dataUrl.indexOf(",");
  if (comma < 0) {
    return {
      status: 400,
      payload: { error: "uploads: malformed data: URL (no comma)" },
    };
  }
  const header: string = dataUrl.slice(0, comma);
  const b64: string = dataUrl.slice(comma + 1);
  const mime: string = header.split(";", 1)[0]?.slice(5) ?? "";
  const ext: string | undefined = UPLOAD_IMAGE_TYPES[mime];
  if (ext === undefined) {
    return {
      status: 400,
      payload: {
        error:
          "uploads: image type " +
          pyRepr(mime) +
          " refused (want png/jpeg/webp)",
      },
    };
  }
  const raw: Uint8Array | null = decodeStrictBase64(b64);
  if (raw === null) {
    return {
      status: 400,
      payload: { error: "uploads: base64 body does not decode" },
    };
  }
  if (raw.length > UPLOAD_MAX_BYTES) {
    return {
      status: 400,
      payload: {
        error:
          "uploads: image too large (" +
          raw.length +
          " bytes, max " +
          UPLOAD_MAX_BYTES +
          ")",
      },
    };
  }
  const stem: string = sanitizeStem(rawName);
  const name: string =
    stem + "-" + randomUUID().replace(/-/g, "").slice(0, 8) + ext;
  const dir: string = resolveInputDir();
  mkdirSync(dir, { recursive: true });
  // Direct write — py (3767) does write_bytes with no temp-then-rename.
  writeFileSync(resolve(dir, name), raw);
  return {
    status: 200,
    payload: { path: "data/input/" + name, bytes: raw.length },
  };
}

/** The uploads write door (POST /v1/uploads) as a self-registering
 *  plugin: strict-parses the JSON body exactly as route() does
 *  (body.decode() or "{}"; failure → the 400 bad-JSON shape) and
 *  runs the uploads door above. Matches its own row inside the
 *  listener (routeUtil.matchRoute) — no central table owns it.
 *
 *  THE PERSISTENCE SEAM (DSH storage pilot, src/storage/): after a
 *  200 stage, the listener writes the staged file through to the
 *  uploads domain index (best-effort, awaited — the 200 bytes are
 *  computed before, and never change through, the write).
 *  storageDomain rides inject beside gatewayError (fork
 *  service-access contract — the read throws without it; the
 *  providing entry sits earlier in the manifest, so listener
 *  registration order is preserved). */
export const uploadsDoors: Plugin = {
  name: "gateway-uploads",
  inject: ["gatewayError", "storageDomain"],
  apply(ctx: Context): void {
    ctx.on(
      "gateway/request",
      async (req: GatewayRequest): Promise<DispatchResult | undefined> => {
        const hit = matchRoute(req.method, req.path);
        if (hit === null || hit.row.handler !== "_h_uploads") {
          return undefined;
        }
        const errors = ctx.gatewayError;
        const parsed: { doc: unknown } | {
          status: number;
          payload: Record<string, unknown>;
        } = parseStrictJson(req.body);
        if (!("doc" in parsed)) {
          return {
            status: parsed.status,
            body: errors.serializePy(parsed.payload),
            contentType: "application/json",
            headers: {},
          };
        }
        const answered: {
          status: number;
          payload: Record<string, unknown>;
        } = handleUploads(parsed.doc);
        errors.normalize4xx(answered.status, answered.payload);
        if (answered.status === 200) {
          await noteUploadStaged(ctx, uploadRecordOf(answered.payload));
        }
        return {
          status: answered.status,
          body: errors.serializePy(answered.payload),
          contentType: "application/json",
          headers: {},
        };
      },
    );
  },
};

/** The staged file as an uploads-domain record (derived from the 200
 *  payload — the door's shape stays wall-pinned, so the MIME rides
 *  the staged ext back, exactly like the door's allowlist maps it). */
function uploadRecordOf(payload: Record<string, unknown>): {
  name: string;
  path: string;
  bytes: number;
  mime: string;
  created_at: number;
} {
  const path: string = String(payload["path"] ?? "");
  const name: string = path.startsWith("data/input/")
    ? path.slice("data/input/".length)
    : path;
  const lower: string = name.toLowerCase();
  const mime: string = lower.endsWith(".png")
    ? "image/png"
    : lower.endsWith(".jpg")
      ? "image/jpeg"
      : lower.endsWith(".webp")
        ? "image/webp"
        : "application/octet-stream";
  return {
    name,
    path,
    bytes: Number(payload["bytes"] ?? 0),
    mime,
    created_at: Math.floor(Date.now() / 1000),
  };
}
