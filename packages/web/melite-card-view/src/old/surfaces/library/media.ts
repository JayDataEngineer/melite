// media.ts — the Library's media archive, DERIVED from the run protocol.
//
// An asset is a 1-level flow (user, 2026-08-06): a generated artifact
// is the output of a ONE-step run — the exact doc
// compile_generation_to_flow builds for POST /v1/flows/start.
// So there is NO client-side asset store: GET /v1/flows/runs returns
// every run with a flat `artifacts` list ({url, type, size} — the same
// data the run status protocol serves), and this module flattens those
// artifacts into MediaAssets. The server's runs dir + _flow.json
// sidecars persist everything; the browser keeps nothing.
//
// This is the ONE derivation path — every consumer (AppSidebar,
// AssetPreviewDialog, voice pickers, copilot
// asset list) reads from listMedia().
import { editorClient } from "@/rpc/editorClient";

export type { MediaCategory, MediaAsset } from "@melite/contracts";
import type { MediaCategory, MediaAsset } from "@melite/contracts";

export const CATEGORY_LABEL: Record<MediaCategory, string> = {
  image: "Images",
  video: "Video",
  mesh: "3D",
  motion: "Motion",
  audio: "Audio",
  other: "Other",
};

export const CATEGORY_ORDER: MediaCategory[] = [
  "image",
  "video",
  "mesh",
  "motion",
  "audio",
  "other",
];

/** Server artifact type → media category bucket. Audio kinds (TTS/voice/
 *  sfx/music families) all land in the audio bucket — the voice/sfx/music
 *  nuance comes from the run's family, which the archive doesn't need. */
export function categoryForType(type: string): MediaCategory {
  switch (type) {
    case "image":
      return "image";
    case "video":
      return "video";
    case "glb":
      return "mesh";
    case "npz":
      return "motion";
    case "audio":
      return "audio";
    default:
      return "other";
  }
}

export function formatSize(bytes: number): string {
  if (bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function basename(url: string): string {
  const clean = url.split("?")[0];
  return clean.split("/").pop() ?? clean;
}

/** Infer a server-style artifact type (image / video / glb / npz / audio /
 *  other) from a bare URL. Card outputs carry no type (CardResult drops the
 *  run protocol's typed artifacts), so the lightbox's nav list sniffs it:
 *  data: URLs from the mime, everything else from the extension. */
export function typeFromUrl(url: string): string {
  const mime = /^data:([a-z0-9.+-]+)\/([a-z0-9.+-]+)/i.exec(url);
  if (mime) {
    const m = mime[1].toLowerCase();
    if (m.startsWith("image")) return "image";
    if (m.startsWith("video")) return "video";
    if (m.startsWith("audio")) return "audio";
    return "other";
  }
  switch (basename(url).split(".").pop()?.toLowerCase()) {
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
    case "gif":
      return "image";
    case "mp4":
    case "webm":
    case "mov":
      return "video";
    case "glb":
    case "gltf":
    case "fbx":
      return "glb";
    case "npz":
    case "npy":
      return "npz";
    case "mp3":
    case "wav":
    case "flac":
    case "ogg":
    case "m4a":
      return "audio";
    default:
      return "other";
  }
}

/** Build a MediaAsset from a bare artifact URL (card outputs, slot thumbs…).
 *  The run metadata (prompt/size/runId/…) is empty — the lightbox's nav list
 *  needs only id/name/url/category/type. data: URLs get a mime-derived name
 *  (basename would return the whole embedded payload). */
export function mediaAssetFromUrl(url: string): MediaAsset {
  const type = typeFromUrl(url);
  const mimeSub = /^data:[a-z0-9.+-]+\/([a-z0-9.+-]+)/i.exec(url)?.[1];
  const name = url.startsWith("data:")
    ? `output.${(mimeSub ?? "bin").replace(/\+.*$/, "").toLowerCase()}`
    : basename(url);
  return {
    id: url,
    runId: "",
    name,
    category: categoryForType(type),
    url,
    type,
    size: 0,
    prompt: "",
    thumbnail: "",
    createdAt: 0,
    runStatus: "",
    runParams: {},
  };
}

/** Wire shape of a run summary from GET /v1/flows/runs (list_runs).
 *  The contract returns loose Records; the derived module narrows
 *  (run_id validated at the door). TYPE ALIAS, not interface: the
 *  narrowing predicate from a Record needs the implicit index signature
 *  only aliases carry. */
export type MediaRun = {
  run_id: string;
  status?: string;
  prompt?: string;
  thumbnail?: string;
  created_at?: number;
  params?: Record<string, unknown>;
  artifacts?: Array<{ url: string; type?: string; size?: number }>;
  /** Distinct brick families that executed (provenance, 2026-08-09).
   *  Absent on pre-provenance runs — consumers treat [] as "no trace". */
  families?: string[];
}

/** One media card = one run artifact (deduped by url). */

/** Flatten every run's artifacts into media cards. TYPE: the file
 * extension WINS over the run's declared a.type (2026-08-26 "why are
 * GLBs in my images" - runs reported glb artifacts as image/other and
 * the archive mis-grouped them; the bytes cannot lie). NAME: prompt
 * snippet + timestamp - run-hash filenames are indistinguishable
 * ("all named the same"); the label says WHAT it is and WHEN. ORDER:
 * enforced newest-first by createdAt - the API's run order is a comment,
 * not a contract. Duplicate urls collapse to the first. Throws on
 * network failure - callers surface their own error/retry UI. */
/** Narrow the RPC's loose run Records into MediaRun rows — run_id is the
 *  ONE required field (delete/keys depend on it): validate it, drop junk
 *  rows, never blind-cast the array. */
export function narrowMediaRuns(rows: Array<Record<string, unknown>>): MediaRun[] {
  return rows.filter((r): r is MediaRun => typeof r.run_id === "string" && r.run_id !== "");
}

export async function listMedia(): Promise<MediaAsset[]> {
  const runs = narrowMediaRuns(await editorClient.listRuns());
  const seen = new Set<string>();
  const out: MediaAsset[] = [];
  for (const run of runs) {
    const createdAt = typeof run.created_at === "number" ? run.created_at : 0;
    // created_at is epoch SECONDS (gateway wire contract) — JS Date
    // wants ms. Sniff the magnitude: >1e12 already ms, else seconds.
    // (2026-08-26 bug: labels showed "Jan 21 1970" for today's runs.)
    const createdMs = createdAt > 1e12 ? createdAt : createdAt * 1000;
    const timeLabel = createdAt > 0
      ? new Date(createdMs).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "";
    for (const a of run.artifacts ?? []) {
      if (!a.url || seen.has(a.url)) continue;
      seen.add(a.url);
      const sniffed = typeFromUrl(a.url);
      const type = sniffed !== "other" ? sniffed : (a.type ?? "other");
      const rawName = basename(a.url);
      const fullPrompt = String(run.prompt ?? "").replace(/\s+/g, " ").trim();
      const snippet = fullPrompt.slice(0, 48);
      const ell = fullPrompt.length > 48 ? "…" : "";
      out.push({
        id: a.url,
        runId: run.run_id,
        name: (snippet !== "" ? `"${snippet}${ell}" — ` : "") + (timeLabel !== "" ? `${timeLabel} · ` : "") + rawName,
        category: categoryForType(type),
        url: a.url,
        type,
        size: a.size ?? 0,
        prompt: String(run.prompt ?? ""),
        thumbnail: run.thumbnail ?? "",
        createdAt,
        runStatus: String(run.status ?? ""),
        runParams: run.params ?? {},
      });
    }
  }
  out.sort((a, b) => b.createdAt - a.createdAt);
  return out;
}
