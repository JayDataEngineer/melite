// comfyui-upload.ts — workflow finalization: splice + the submit-time upload walk (native 231-327).
// (split from comfyui.ts 2026-09-18: pure move, zero logic changes).

import { randomBytes } from "node:crypto";
import { readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { ComfyError } from "./comfyui-types.ts";
import type { EngineJson } from "./comfyui-types.ts";
import { pyReprStr, pyStr } from "./comfyui-format.ts";
import { httpCall } from "./comfyui-transport.ts";

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

/** The data-URL mime table (the DATA-URL ARM's allowlist — image
 *  mimes only, each onto its UPLOAD_EXTS member; a mime outside
 *  this table is not a stageable map). */
export const DATA_URL_IMAGE_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/bmp": ".bmp",
  "image/avif": ".avif",
  "image/tiff": ".tiff",
};

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
export async function uploadFile(
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

export function isFile(path: string): boolean {
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
export const MEDIA_ROUTE_PREFIX = "/melite-media/runs/";
export const ASSET_ROUTE_PREFIX = "/v1/assets/runs/";

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
    // DATA-URL ARM (the run-record restoration): a retired
    // conditioning map arrives as a data: URL (image_b64 verbatim —
    // the old leaf wrote data URLs into the bag). Decode it EXACTLY
    // (no re-encode, no resize) to a tmp file and upload like a
    // local file. A non-image mime or an empty payload rides through
    // untouched — the engine refuses it loud downstream, never a
    // silent empty map.
    if (lower.startsWith("data:")) {
      // the parse is case-insensitive on the scheme/mime (the
      // payload stays verbatim — base64 is case-SENSITIVE).
      const m = /^data:([^;,]+);base64,(.*)$/is.exec(p);
      const ext = m !== null ? DATA_URL_IMAGE_EXT[m[1].toLowerCase()] : undefined;
      if (m !== null && ext !== undefined && m[2] !== "") {
        if (!(p in seen)) {
          const tmp = join(tmpdir(), "melite-data-" + randomBytes(8).toString("hex") + ext);
          writeFileSync(tmp, Buffer.from(m[2], "base64"));
          try {
            seen[p] = (await uploadFile(server, tmp)).name;
          } finally {
            // the bytes rode the wire — the tmp file never lingers.
            rmSync(tmp, { force: true });
          }
        }
        return seen[p] as string;
      }
      return v;
    }
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
