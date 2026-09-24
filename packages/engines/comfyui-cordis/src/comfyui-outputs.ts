// comfyui-outputs.ts — history verdicts + artifact harvest + channel publish (native 438-522).
// (split from comfyui.ts 2026-09-18: pure move, zero logic changes).

import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Client } from "@stable-canvas/comfyui-client";
import type { EngineJson } from "./comfyui-types.ts";

// ── harvest (native 459-522) ──

/** The /view artifact-fetch budget (stroke 83): the run's own
 *  timeout when it EXCEEDS the 180s floor, else the
 *  floor. The harvest rides the run's budget — a long run may
 *  serve large artifacts without the fetch fuse firing first —
 *  while short runs keep the 180s floor (never a raw
 *  timeoutS*1000 shrink). Exported for the formula wall. */
export function viewTimeoutMs(timeoutS: EngineJson | undefined): number {
  return Math.max(180_000, normalizeTimeoutS(timeoutS) * 1000);
}

/** history.outputs -> downloaded artifacts under runDir/.
 *  The full shape matrix: images/gifs/audio/video/3d/three_model/
 *  result/files, the flat tuple-row "result" arm, dict rows and
 *  list/tuple rows.
 *
 *  timeoutS threads the run's own params timeout through (the
 *  callers pass the same value the deadline used) — the /view
 *  fetch honors it via viewTimeoutMs. Absent = the formula's own
 *  default (normalize undefined -> 2400 -> the budget arm). */
export interface FetchedOutputArtifact {
  nodeId: string
  path: string
  kind: string
}

export async function fetchOutputArtifacts(
  client: Client,
  runDir: string,
  entry: Record<string, EngineJson>,
  timeoutS?: EngineJson,
): Promise<FetchedOutputArtifact[]> {
  mkdirSync(runDir, { recursive: true });
  const artifacts: FetchedOutputArtifact[] = [];
  const outputs = entry["outputs"];
  if (typeof outputs !== "object" || outputs === null || Array.isArray(outputs)) {
    return artifacts;
  }
  const viewTimeout: number = viewTimeoutMs(timeoutS);
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
        try {
          const resp = await client.fetchApi(
            "/view?" +
              new URLSearchParams({
                filename,
                subfolder: sub,
                type: ftype,
              }).toString(),
            { signal: AbortSignal.timeout(viewTimeout) },
          );
          const raw: Buffer = Buffer.from(await resp.arrayBuffer());
          // a JSON artifact (a result row) re-serializes pretty
          // (indent 2, raw UTF-8) instead of riding minified.
          const ct: string = resp.headers.get("content-type") ?? "";
          let blob: Buffer = raw;
          if (ct.includes("json")) {
            try {
              blob = Buffer.from(
                JSON.stringify(JSON.parse(raw.toString("utf8")), null, 2),
                "utf8",
              );
            } catch {
              /* raw bytes ride */
            }
          }
          writeFileSync(dest, blob);
          artifacts.push({ nodeId, path: dest, kind });
        } catch {
          /* one unreachable artifact never kills the harvest */
        }
      }
    }
  }
  return artifacts;
}

export async function fetchOutputs(
  client: Client,
  runDir: string,
  entry: Record<string, EngineJson>,
  timeoutS?: EngineJson,
): Promise<string[]> {
  return (await fetchOutputArtifacts(client, runDir, entry, timeoutS)).map((artifact) => artifact.path)
}

// ── channel publish (native 438-458) ──

/** FILE-kind -> artifact extensions (native._CHANNEL_EXTS). */
export const CHANNEL_EXTS: Record<string, readonly string[]> = {
  mesh: [".glb", ".gltf", ".obj", ".fbx", ".usd", ".usdz"],
  image: [".png", ".jpg", ".jpeg", ".webp"],
  video: [".mp4", ".webm", ".mov", ".avi", ".mkv"],
  audio: [".wav", ".mp3", ".ogg", ".flac"],
  // THE MASK CHANNEL (the stroke-103 debt): the mask card declares
  // outputs { default: 'seg' } — with no row here, publishOutputChannels
  // skipped the channel SILENTLY (line's `if (!exts) continue`): every
  // mask run published zero outputs to the card face. Masks are
  // SaveImage PNGs.
  seg: [".png"],
};

/** THE QVOICE CHANNEL (roadmap OWED 2026-09-24 — the export FULL
 *  PATH, transcript-026 #4): the vendored AudiocoreVoiceStudio
 *  export node returns its minted .qvoice ABSOLUTE path in the
 *  history ui dict (`outputs[<node>].qvoice_path = [path]`) — the
 *  file lives engine-side in the voices root, never the ComfyUI
 *  output dir, so /view cannot fetch it. Collect the FIRST
 *  non-empty string (one design lane per run — the single-stage
 *  gateway law) so the stage's result_outputs carry the exact
 *  collision-numbered path; the harness never hardcodes the
 *  voices root (the path rides verbatim from the engine). Pure:
 *  shared by the single and merge harvests. */
export function qvoicePathsOf(
  outputs: EngineJson | undefined,
): string {
  if (typeof outputs !== "object" || outputs === null || Array.isArray(outputs)) return "";
  for (const nodeOut of Object.values(outputs as Record<string, EngineJson>)) {
    if (typeof nodeOut !== "object" || nodeOut === null || Array.isArray(nodeOut)) continue;
    const raw: EngineJson = (nodeOut as Record<string, EngineJson>)["qvoice_path"];
    if (!Array.isArray(raw)) continue;
    for (const p of raw) {
      if (typeof p === "string" && p.trim() !== "") return p.trim();
    }
  }
  return "";
}

/** Harvested paths -> {channel: path} for the FILE-kind channels
 *  the stage DECLARED. First unmatched artifact wins per channel,
 *  declaration order. */
export function publishOutputChannels(
  outputs: Record<string, EngineJson>,
  artifacts: string[],
  bindings: Record<string, string> = {},
  records: readonly FetchedOutputArtifact[] = [],
): Record<string, EngineJson> {
  const published: Record<string, EngineJson> = {};
  const claimed = new Set<string>();
  for (const [channel, kind] of Object.entries(outputs ?? {})) {
    const nodeId = bindings[channel];
    if (nodeId !== undefined) {
      const artifact = records.find((record) => record.nodeId === nodeId)
      if (artifact !== undefined) {
        published[channel] = artifact.path;
        claimed.add(artifact.path);
      }
      continue;
    }
    const exts = CHANNEL_EXTS[String(kind)];
    if (!exts) continue;
    for (const art of artifacts ?? []) {
      if (claimed.has(art)) continue;
      if (exts.some((extension: string): boolean => art.toLowerCase().endsWith(extension))) {
        published[channel] = art;
        claimed.add(art);
        break;
      }
    }
  }
  return published;
}

export function assertPublishedOutputChannels(
  outputs: Record<string, EngineJson>,
  published: Record<string, EngineJson>,
  bindings: Record<string, string>,
): void {
  const missing = Object.keys(bindings).filter((channel) => published[channel] === undefined)
  if (missing.length > 0) {
    throw new Error(`declared output node(s) ${missing.join(', ')} produced no artifact`)
  }
  for (const channel of Object.keys(outputs)) {
    if (bindings[channel] === undefined && published[channel] === undefined) {
      const kind = String(outputs[channel])
      if (CHANNEL_EXTS[kind] !== undefined) {
        throw new Error(`declared ${kind} output '${channel}' produced no artifact`)
      }
    }
  }
}

// ── status mapping (the poll loop's shared read) ──

export type HistoryVerdict =
  | { kind: "pending" }
  | { kind: "failed"; detail: string }
  | { kind: "completed" };

/** THE AGENT-READABLE EXECUTION ERROR (agent-debt F-1, 2026-09-22:
 * the maker-test film run failed twice at the same sampler node and
 * the error voice carried node_id + the executed list ONLY — the raw
 * JSON sliced at 400 chars spent its whole budget before the
 * exception. The agent saw WHICH node died, never WHY, and guessed
 * its retry strategy blind). ComfyUI's execution_error payload
 * carries the cause: exception_type, exception_message, traceback.
 * Voice the cause FIRST (type: message), then the node, then the
 * traceback's deepest frames — the tail holds the raise site
 * (allocation sizes, shape mismatches); the executed list compresses
 * to a count. */
function voiceExecutionError(e: EngineJson): string {
  if (typeof e !== "object" || e === null || Array.isArray(e)) {
    return JSON.stringify(e).slice(0, 400);
  }
  const r = e as Record<string, EngineJson>;
  const type = typeof r["exception_type"] === "string" ? r["exception_type"] : "";
  const message = typeof r["exception_message"] === "string" ? r["exception_message"] : "";
  const rawNode = r["node_id"] ?? r["node"];
  const nodeId = typeof rawNode === "string" ? rawNode : typeof rawNode === "number" ? String(rawNode) : "?";
  const nodeType = typeof r["node_type"] === "string" ? r["node_type"] : "?";
  const executed = Array.isArray(r["executed"]) ? (r["executed"] as EngineJson[]).length : 0;
  const rawTb = typeof r["traceback"] === "string" ? r["traceback"] : "";
  const tbTail = rawTb.length > 600 ? "…" + rawTb.slice(-600) : rawTb;
  const head = type !== "" || message !== ""
    ? `${type !== "" ? type : "ExecutionError"}${message !== "" ? `: ${message}` : ""} @ ${nodeId} (${nodeType}${executed > 0 ? `, ${executed} nodes executed before the failure` : ""})`
    : `execution failed @ ${nodeId} (${nodeType})`;
  const out = tbTail !== "" ? `${head} — traceback tail: ${tbTail}` : head;
  return out.length > 2000 ? out.slice(0, 2000) + "…" : out;
}

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
    let detail: string = JSON.stringify(rec).slice(0, 400);
    if (Array.isArray(msgs)) {
      for (const m of msgs as EngineJson[]) {
        if (
          Array.isArray(m) &&
          m.length > 1 &&
          m[0] === "execution_error"
        ) {
          detail = voiceExecutionError(m[1] as EngineJson);
          break;
        }
      }
    }
    return { kind: "failed", detail };
  }
  if (rec["completed"] !== true) return { kind: "pending" };
  return { kind: "completed" };
}

// ── timeout budget (relocated verbatim with the harvest half that
//    consumes it: viewTimeoutMs above is its only outputs-side caller;
//    the execute/merge spans import it from here — one spelling) ──

/** Normalize a stage timeout_s to a finite positive budget (seconds).
 *  Garbage (0, negatives, NaN, Infinity, non-numeric strings) rides
 *  the 2400 default — the single path's old `Number(...) || 2400`
 *  kept truthy Infinity/negatives, and the flow path's isFinite-only
 *  guard kept negatives (audit finding, stroke 82). One spelling for
 *  both paths now. */
export function normalizeTimeoutS(v: EngineJson | undefined): number {
  const n: number = Number(v ?? 2400);
  return Number.isFinite(n) && n > 0 ? n : 2400;
}
