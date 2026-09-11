// pyValue.ts — the py JSON value module, RE-HOMED (REBUILD-16,
// 2026-09-10): ported verbatim from the dead gateway-core
// (core/pyValue.ts, killed with the gateway app) — the skills
// plane's fmt/repr helpers ride PyNum/parseJson (the SOURCE
// literal survives: default 1.0 renders "1.0", never "1"). The
// two asset-table constants inline below (the whole table died
// with the gateway; these two rows are pyValue's only need).
import { readFileSync } from "node:fs";
// The two asset-table rows (dead core/assetTables.ts:62-63, verbatim).
const MESH_EXTS: readonly string[] = ["fbx", "glb", "gltf", "obj", "ply", "stl", "usdz"];
const DOC_EXTS: readonly string[] = ["csv", "json", "md", "txt", "yaml", "yml"];

/** A JSON number parsed from the ledger with its LITERAL text kept
 *  (py re-formats numbers on re-dump — e.g. file "1.00" wires as
 *  "1.0" — but JS String() cannot reproduce repr() for all doubles
 *  (1e16, 1e-05 thresholds), so verbatim is the exact shape whenever
 *  the journal holds canonical literals, which ledger() always
 *  writes: ts ints + json.dumps(data) canonical floats).
 *
 *  ROW 29 STAGE 2 (2026-09-10, ledger): canonical JSON serializes a
 *  PyNum as its NUMERIC value (toJSON below) — the serve path is
 *  value-truth, not literal-truth (JSON.parse("1.00") === 1 in every
 *  live consumer). Verbatim literals survive only in parseJson's
 *  in-memory round-trip. Out-of-range literals (1e400) serialize
 *  null — the same rule dumpsPy applied to non-finite numbers. */
export class PyNum {
  readonly literal: string;
  constructor(literal: string) {
    this.literal = literal;
  }
  toJSON(): number | null {
    const n: number = Number(this.literal);
    return Number.isFinite(n) ? n : null;
  }
}

/** ensure_ascii (py json ensure_ascii: every non-ASCII unit rides
 *  \uXXXX; astral chars become surrogate halves — charCodeAt gives
 *  exactly that, same as the ctx serializePy rule). ROW 29 STAGE 2:
 *  moved verbatim from queue.ts — the ONE shared address for the
 *  journal, sidecar, and serve writers (all three keep byte-safe
 *  ASCII output; only separators/literals went canonical). */
export function asciiEscape(text: string): string {
  return text.replace(
    /[^\x00-\x7F]/g,
    (ch: string): string =>
      "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}

/** Python str() of a JSON scalar for sidecar coercions
 *  (str(True)="True"; ints exact; integral floats keep ".0"). */
export function pyStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error("bad sidecar number");
    return Number.isInteger(v) ? String(v) : String(v) + (String(v).includes("e") || String(v).includes(".") ? "" : /* v8 ignore next -- finite non-integers always String() with "." or "e" (ECMA-262 Number::toString), so the ".0" never fires */ ".0");
  }
  return String(v);
}

/** Python int(x or 0) for sidecar created_at (bool->0/1, float
 *  truncates, numeric strings parse, anything else raises — the
 *  raise surfaces as the door's 500 exactly as py's would). */
export function pyInt(v: unknown): number {
  if (!v) return 0;
  if (typeof v === "boolean") return v ? 1 : /* v8 ignore next -- falsy booleans exit at !v above; only `true` reaches this ternary (2026-09-12) */ 0;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error("bad sidecar number");
    return Math.trunc(v);
  }
  if (typeof v === "string") {
    const t: string = v.trim();
    if (/^[+-]?\d+$/.test(t)) return Number(t);
    throw new Error("bad sidecar number");
  }
  throw new Error("bad sidecar number");
}

export interface MediaVocab {
  readonly image: readonly string[];
  readonly audio: readonly string[];
  readonly video: readonly string[];
  readonly model: readonly string[];
  readonly galleryImage: readonly string[];
  readonly galleryAudio: readonly string[];
  readonly galleryVideo: readonly string[];
  readonly galleryModel: readonly string[];
  readonly maxListedImages: number;
}

/** Media-kind ext sets from media-kinds.json (DATA — read at
 *  request time from the repo-anchored path). Cached per process;
 *  a missing file refuses LOUD (py crashes at import — never an
 *  empty sidebar downstream). */
let mediaKindsCache: MediaVocab | null = null;

/** Media-kind ext sets from media-kinds.json (DATA — read at
 *  request time from the repo-anchored path). Cached per process;
 *  a missing file refuses LOUD (py crashes at import — never an
 *  empty sidebar downstream). */
export function mediaVocab(repoKindsPath: string): MediaVocab {
  if (mediaKindsCache === null) {
    const doc: unknown = JSON.parse(
      readFileSync(repoKindsPath, "utf8"),
    ) as unknown;
    const kinds: Record<string, { exts: string[]; gallery?: string[] }> = (
      doc as { kinds: Record<string, { exts: string[]; gallery?: string[] }> }
    ).kinds;
    const lower = (k: string): readonly string[] =>
      kinds[k]?.exts.map((e: string): string => e.toLowerCase()) ?? [];
    const lowerGallery = (k: string): readonly string[] =>
      (kinds[k]?.gallery ?? []).map((e: string): string =>
        e.toLowerCase());
    let maxImgs = 0;
    try {
      const raw: unknown = (doc as { policy?: { maxListedImages?: unknown } })
        .policy?.maxListedImages;
      if (typeof raw === "number" && Number.isFinite(raw)) {
        maxImgs = Math.floor(raw);
      }
    } catch {
      /* v8 ignore next -- JSON.parse yields only plain data: property
         access never throws, so this guard is unconstructible (2026-09-12) */
      maxImgs = 0;
    }
    mediaKindsCache = {
      image: lower("image"),
      audio: lower("audio"),
      video: lower("video"),
      model: lower("model"),
      galleryImage: lowerGallery("image"),
      galleryAudio: lowerGallery("audio"),
      galleryVideo: lowerGallery("video"),
      galleryModel: lowerGallery("model"),
      maxListedImages: maxImgs,
    };
  }
  return mediaKindsCache;
}

function mediaKinds(repoKindsPath: string): {
  image: readonly string[];
  audio: readonly string[];
  video: readonly string[];
  model: readonly string[];
} {
  return mediaVocab(repoKindsPath);
}

/** filename -> AssetKind string (python/asset_ledger.kind_for: the estate
 *  media vocab first, then mesh/doc code sets, else "other"). */
export function kindFor(
  name: string,
  repoKindsPath: string,
): string {
  const kinds = mediaKinds(repoKindsPath);
  const dot: number = name.lastIndexOf(".");
  const ext: string =
    dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  // artifact_type(name): the estate media vocab (DATA sets), then
  // json->spec, txt/md/yaml->text, else file.
  let t: string;
  if (kinds.image.includes(ext)) t = "image";
  else if (kinds.audio.includes(ext)) t = "audio";
  else if (kinds.video.includes(ext)) t = "video";
  else if (kinds.model.includes(ext)) t = "model";
  else if (ext === "json") t = "spec";
  else if (ext === "txt" || ext === "md" || ext === "yaml") t = "text";
  else t = "file";
  // _KNOWN: image/video/audio ride; the rest consult the code sets.
  if (t === "image" || t === "video" || t === "audio") return t;
  if ((MESH_EXTS as readonly string[]).includes(ext)) return "model";
  if ((DOC_EXTS as readonly string[]).includes(ext)) return "document";
  return "other";
}
