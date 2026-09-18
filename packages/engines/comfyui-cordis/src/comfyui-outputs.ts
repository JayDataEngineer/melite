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
export async function fetchOutputs(
  client: Client,
  runDir: string,
  entry: Record<string, EngineJson>,
  timeoutS?: EngineJson,
): Promise<string[]> {
  mkdirSync(runDir, { recursive: true });
  const arts: string[] = [];
  const outputs = entry["outputs"];
  if (typeof outputs !== "object" || outputs === null || Array.isArray(outputs)) {
    return arts;
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
          arts.push(dest);
        } catch {
          /* one unreachable artifact never kills the harvest */
        }
      }
    }
  }
  return arts;
}

// ── channel publish (native 438-458) ──

/** FILE-kind -> artifact extensions (native._CHANNEL_EXTS). */
export const CHANNEL_EXTS: Record<string, readonly string[]> = {
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
    let detail: string = JSON.stringify(rec).slice(0, 400);
    if (Array.isArray(msgs)) {
      for (const m of msgs as EngineJson[]) {
        if (
          Array.isArray(m) &&
          m.length > 1 &&
          m[0] === "execution_error"
        ) {
          detail = JSON.stringify(m[1] as EngineJson).slice(0, 400);
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
