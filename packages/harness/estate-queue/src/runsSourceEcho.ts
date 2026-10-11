import { isFile } from "./skillFs.ts"
import { segmentConfined, servableLeaf } from "@melite/contracts/mediaKinds"
// runsSourceEcho.ts — THE SOURCE-ECHO LAW (operator 2026-09-23):
// every generation run carries history pointing at the files that
// created it, and a break in that chain refuses LOUD — never silent.
//
// The compose-echo (runsStart registerCompiledRun) is the read-side
// model (what the engine received, stamped on the record + console +
// ledger). This is the source-side twin: collect every source
// pointer in the compiled stage params, resolve each the way the
// engine's submit-time walk stages it (comfyui-upload stageOne —
// the engine TRIMS, matches both estate prefixes case-insensitively,
// walks candidateTrees, falls a run-tail through to cwd), refuse
// naming the dead, stamp the resolved on the run record.
//
// Faces swept (anything else — data: URLs, bare artifact names,
// http(s) linked inputs, prose — rides untouched; the engine owns
// those arms and refuses them loud itself):
//   /melite-media/runs/<run>/<rel>  (the media route)
//   /v1/assets/runs/<run>/<rel>      (the assets route — same trees)
//   /infer-gallery/artifact?path=<run>/<rel>
//                                    (the gallery's read route — the
//                                    restore stamp + the drill's
//                                    artifact harvest mint this URL-
//                                    encoded tail; the estate stages
//                                    what it serves, so the guard
//                                    reads it back onto the same
//                                    trees instead of misfiling it
//                                    as an absolute disk path)
//   <run-id>/<rel>                   (runs-relative tails; the first
//                                    segment must match the mint
//                                    grammar — prose with slashes
//                                    never qualifies)
//   /abs/path                        (absolute disk paths — the cwd
//                                    arm stages them verbatim)
// The parse is a TWIN of the server's parseTarget (RUN_ID grammar +
// segment confinement + the _poster.jpg servable exception),
// cross-linked, not shared — the server's parser is route-local and
// unexported; a twin with the same laws cannot drift silently
// because the walls pin both faces.
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.
import { LEGACY_RUN_MEDIA_PREFIX, RUN_MEDIA_PREFIX , RUN_ID_RE} from "@melite/contracts/benchStage";
import { statSync } from "node:fs";
import { join } from "node:path";

/** The serving prefixes the estate owns (comfyui-upload's
 *  MEDIA/ASSET_ROUTE_PREFIX twins — detection is case-insensitive
 *  like the engine's; the sliced tail keeps its case). */
// THE CONTRACT'S TWO NAMES (benchStage.ts) with the trailing slash
// these readers index by — derived, never retyped, so a change of
// the live prefix or the legacy set reaches every reader at once.
export const MEDIA_RUNS_PREFIX = RUN_MEDIA_PREFIX + "/";
export const ASSET_RUNS_PREFIX = LEGACY_RUN_MEDIA_PREFIX + "/";

/** The run-dir basename grammar (the mint law — media index.ts). */
const RUN_ID = RUN_ID_RE;

/** The gallery's read route (packages/web/infer-gallery/src/index.ts
 *  registers this exact path — retyped, never derived: no contract
 *  owns the gallery's spelling, so the twin names its owner here).
 *  Detection is case-insensitive like the engine's estate prefixes;
 *  the decoded tail keeps its case. */
const GALLERY_ARTIFACT_PATH = "/infer-gallery/artifact";

/** Read a gallery artifact URL back onto its run-relative tail
 *  (the operator's live break, 2026-10-11: the gallery mints
 *  `/infer-gallery/artifact?path=<url-encoded tail>` for every
 *  artifact it serves, and chaining one as the next run's source
 *  misfiled it as an absolute disk path — the run refused naming
 *  a file that exists). The query parses with the platform URL
 *  parser — the SAME call the gallery route serves with
 *  (`searchParams.get("path")`), so `+`/percent spellings agree on
 *  both sides; the returned tail is already decoded exactly once.
 *  Null when the string is not a gallery pointer (no path, empty
 *  path) — the caller falls through to the absolute face and the
 *  pointer still refuses loud, never rides silent. */
function galleryTail(t: string): string | null {
  if (!t.toLowerCase().startsWith(GALLERY_ARTIFACT_PATH)) return null;
  let path: string | null = null;
  try {
    path = new URL(t, "http://source-echo.invalid").searchParams.get("path");
  } catch {
    return null;
  }
  if (path === null || path === "") return null;
  return path;
}

export type SourceFace = "run" | "abs";

/** A collected pointer: the VERBATIM string (history stamps what
 *  the params held — the engine trims for staging, the record
 *  keeps the author's spelling) plus its parsed face. */
export interface ParsedSource {
  readonly url: string;
  readonly face: SourceFace;
  readonly runId: string;
  readonly rel: string;
  readonly abs: string;
}

/** The detection grammar (runs on the trimmed string — the engine
 *  trims before every arm, so detection sees what staging sees):
 *  either estate prefix (either case), the gallery's artifact route,
 *  an absolute path, or a run-tail whose first segment matches the
 *  mint grammar. Prose with slashes never qualifies — no false
 *  refusals on prompts. The gallery face returns its tail already
 *  decoded (decoded: true) — the per-segment decode below must not
 *  run twice (a legal `%` in a filename would false-refuse as a bad
 *  escape); confinement still judges every segment. */
function detectFace(t: string): { face: SourceFace; rest: string; decoded: boolean } | null {
  const lower: string = t.toLowerCase();
  // Both estate prefixes end in "/runs/" — one slice serves both
  // faces (detection is case-insensitive like the engine's; the
  // tail keeps its case).
  if (lower.startsWith(MEDIA_RUNS_PREFIX) || lower.startsWith(ASSET_RUNS_PREFIX)) {
    return { face: "run", rest: t.slice(lower.indexOf("/runs/") + "/runs/".length), decoded: false };
  }
  // THE GALLERY FACE (2026-10-11): the estate stages what it
  // serves — a gallery artifact URL resolves onto the same trees
  // as the media route. Before the absolute arm: the URL starts
  // with "/" and would otherwise misfile as a disk path.
  const tail: string | null = galleryTail(t);
  if (tail !== null) return { face: "run", rest: tail, decoded: true };
  if (t.startsWith("/")) return { face: "abs", rest: t, decoded: false };
  // ONE SEGMENT LAW (li-aq.3, the design audit's L10): the old
  // `t.includes("..")` substring ban refused a LEGAL name the engine
  // mints (`still..frame.png`) while judging the whole string —
  // traversal is a property of SEGMENTS, not substrings. The
  // contracts' own grammar (dots-only and NUL and empty refused,
  // every other name legal) judges each segment.
  if (!t.includes("/")) return null;
  if (t.split("/").some((seg) => !segmentConfined(seg))) return null;
  const head: string = t.split("/", 1)[0] as string;
  let decodedHead: string;
  try {
    decodedHead = decodeURIComponent(head);
  } catch {
    return null;
  }
  if (!RUN_ID.test(decodedHead)) return null;
  return { face: "run", rest: t, decoded: false };
}

/** Collect every source pointer in a params tree (deep walk over
 *  objects/arrays — card params nest refs inside calls, clips,
 *  stanzas). Verbatim strings, order of discovery, deduped.
 *  Detection runs on the trimmed string (the engine trims); the
 *  stamped URL keeps the author's spelling. */
export function collectSourceRefs(value: unknown): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const seenObjs = new Set<object>();
  const stack: unknown[] = [value];
  while (stack.length > 0) {
    const cur: unknown = stack.pop();
    if (typeof cur === "string") {
      const t: string = cur.trim();
      if (t !== "" && detectFace(t) !== null && !seen.has(cur)) {
        seen.add(cur);
        found.push(cur);
      }
      continue;
    }
    if (typeof cur !== "object" || cur === null) continue;
    if (seenObjs.has(cur)) continue;
    seenObjs.add(cur);
    if (Array.isArray(cur)) {
      for (let i = cur.length - 1; i >= 0; i--) stack.push(cur[i]);
    } else {
      const rec = cur as Record<string, unknown>;
      const keys: string[] = Object.keys(rec);
      for (let i = keys.length - 1; i >= 0; i--) stack.push(rec[keys[i] as string]);
    }
  }
  return found;
}

/** Backward face (the first law's name): the media-prefix sweep.
 *  New code prefers collectSourceRefs. */
export function collectMediaRefs(value: unknown): string[] {
  return collectSourceRefs(value).filter((s) =>
    s.trim().toLowerCase().startsWith(MEDIA_RUNS_PREFIX),
  );
}

/** Parse a collected pointer. Throws naming the violation when the
 *  shape or a segment breaks confinement — an unservable pointer
 *  refuses here, loud. */
export function parseSourceRef(ref: string): ParsedSource {
  const t: string = ref.trim();
  const det: { face: SourceFace; rest: string; decoded: boolean } | null = detectFace(t);
  if (det === null) {
    throw new Error("not a source pointer: " + JSON.stringify(ref));
  }
  if (det.face === "abs") {
    if (t.includes("\0")) {
      throw new Error("media source refuses NUL: " + JSON.stringify(ref));
    }
    return { url: ref, face: "abs", runId: "", rel: "", abs: t };
  }
  const parts: string[] = det.rest.split("/");
  if (parts.length < 2) {
    throw new Error(
      "malformed media source (want <prefix>/<run_id>/<file>): " +
        JSON.stringify(ref),
    );
  }
  const runId: string = parts[0] as string;
  if (!RUN_ID.test(runId)) {
    throw new Error(
      "malformed media source (run dir breaks the mint grammar): " +
        JSON.stringify(ref),
    );
  }
  const relParts: string[] = [];
  for (const seg of parts.slice(1)) {
    // The gallery face arrives already decoded exactly once (the
    // URL parser's doing, twinning the server) — decoding again
    // would corrupt a legal `%` in a filename into a bad escape.
    // Confinement judges every segment on every face.
    let decoded: string;
    if (det.decoded) {
      decoded = seg;
    } else {
      try {
        decoded = decodeURIComponent(seg);
      } catch {
        throw new Error(
          "malformed media source (bad percent-escape): " + JSON.stringify(ref),
        );
      }
    }
    if (!segmentConfined(decoded)) {
      throw new Error(
        "media source refuses traversal: " + JSON.stringify(ref),
      );
    }
    relParts.push(decoded);
  }
  // THE SERVABLE-MEDIA FENCE (media index.ts relServable twin):
  // run STATE files are not sources (the server 404s them) —
  // _poster.jpg excepted (a legit thumbnail source).
  const base: string = relParts[relParts.length - 1] as string;
  if (base.startsWith("_") && !servableLeaf(base)) {
    throw new Error(
      "media source is a run-state file, not servable media: " +
        JSON.stringify(ref),
    );
  }
  return { url: ref, face: "run", runId, rel: relParts.join("/"), abs: "" };
}

/** Backward face: parse a media-prefix URL. */
export function parseMediaRef(ref: string): { runId: string; rel: string } {
  const p: ParsedSource = parseSourceRef(ref);
  if (p.face !== "run") throw new Error("not a run source: " + JSON.stringify(ref));
  return { runId: p.runId, rel: p.rel };
}

export interface SourceEchoRef {
  readonly url: string;
  readonly file: string;
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** Resolve every pointer the way the engine stages it — run faces
 *  walk the manifest trees (first root holding the RUN DIR wins,
 *  the file rides under it — the server's and the stager's shared
 *  walk), tails fall through to cwd (the stager's own order),
 *  absolute paths stage verbatim. A pointer at selfRunId (the run
 *  being registered — the compose writes its OWN future output
 *  path, `${runId}/gen`, into the graph) is a forward reference,
 *  not a source: it passes unstamped, never refused. Returns the
 *  resolved rows in collection order. Throws ONE error naming EVERY
 *  unresolvable source plus the roots searched — the run refuses
 *  before it registers, never mid-render. */
export function resolveSourceRefs(
  refs: readonly string[],
  roots: readonly string[],
  cwd: string = process.cwd(),
  selfRunId = "",
): SourceEchoRef[] {
  const dead: string[] = [];
  const rows: SourceEchoRef[] = [];
  for (const ref of refs) {
    let parsed: ParsedSource;
    try {
      parsed = parseSourceRef(ref);
    } catch (e) {
      dead.push(ref + " (" + (e as Error).message + ")");
      continue;
    }
    let file = "";
    if (parsed.face === "abs") {
      if (isFile(parsed.abs)) file = parsed.abs;
    } else if (selfRunId !== "" && parsed.runId === selfRunId) {
      // THE SELF-CHAIN EXEMPTION (2026-09-23 — the hook gate caught
      // it: krea-2's composed graph carries `${runId}/gen`, its OWN
      // SaveImage prefix, inside stage params; refusing it refuses
      // every generation). Forward reference — passes unstamped.
      continue;
    } else {
      for (const root of roots) {
        const runDir: string = join(root, "output", parsed.runId);
        if (!isDir(runDir)) continue;
        const cand: string = join(runDir, parsed.rel);
        if (isFile(cand)) {
          file = cand;
          break;
        }
      }
      // THE CWD FALL-THROUGH (the stager's own order — a tail the
      // trees miss still stages from the lane's cwd, so the guard
      // honors it too; same process, same cwd, no drift).
      if (file === "" && !parsed.url.trim().startsWith("/")) {
        const cand: string = join(cwd, parsed.rel);
        if (isFile(cand)) file = cand;
      }
    }
    if (file === "") dead.push(ref);
    else rows.push({ url: ref, file });
  }
  if (dead.length > 0) {
    throw new Error(
      "run sources resolve nowhere (" +
        dead.length +
        " dead: " +
        dead.join("; ") +
        ") — searched roots " +
        JSON.stringify(roots) +
        " (+ lane cwd for run-tails). " +
        "Re-link or regenerate the sources; the run refuses rather than render sourceless",
    );
  }
  return rows;
}

/** Backward face (roots-only walk — the first law's signature).
 *  New code prefers resolveSourceRefs. */
export function resolveMediaRefs(refs: readonly string[], roots: readonly string[]): SourceEchoRef[] {
  return resolveSourceRefs(refs, roots);
}
