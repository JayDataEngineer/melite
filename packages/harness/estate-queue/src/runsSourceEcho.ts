// runsSourceEcho.ts — THE SOURCE-ECHO LAW (operator 2026-09-23):
// every generation run carries history pointing at the files that
// created it, and a break in that chain refuses LOUD — never silent.
//
// The compose-echo (runsStart registerCompiledRun) is the read-side
// model (what the engine received, stamped on the record + console +
// ledger). This is the source-side twin: collect every
// /melite-media/runs/ URL in the compiled stage params, resolve each
// against the run's roots with the SAME walk the media server serves
// (estate/media index.ts: first manifest root holding the run dir
// wins — `${root}/output/<runId>/<rel>`), refuse naming the dead,
// stamp the resolved on the run record.
//
// The parse is a TWIN of the server's parseTarget (RUN_ID grammar +
// segment confinement), cross-linked, not shared — the server's
// parser is route-local and unexported; a twin with the same laws
// cannot drift silently because the walls pin both faces.
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.
import { statSync } from "node:fs";
import { join } from "node:path";

/** The serving prefix the estate media route owns (estate/media). */
export const MEDIA_RUNS_PREFIX = "/melite-media/runs/";

/** The run-dir basename grammar (the mint law — media index.ts). */
const RUN_ID = /^run-[0-9a-f]+-[A-Za-z0-9_-]+$/;

/** One confined rel segment: not empty, not dot/dotdot
 *  (traversal), no NUL — the server's segmentOk twin. */
function segmentOk(seg: string): boolean {
  if (seg === "" || seg === "." || seg === "..") return false;
  if (seg.includes("\0")) return false;
  return true;
}

/** Collect every media-runs URL in a params tree (deep walk over
 *  objects/arrays — card params nest refs inside calls, clips,
 *  stanzas). Order of discovery, deduped. data: URLs, bare
 *  artifact names, and foreign URLs are not media pointers and
 *  never collect. */
export function collectMediaRefs(value: unknown): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const seenObjs = new Set<object>();
  const stack: unknown[] = [value];
  while (stack.length > 0) {
    const cur: unknown = stack.pop();
    if (typeof cur === "string") {
      if (cur.startsWith(MEDIA_RUNS_PREFIX) && !seen.has(cur)) {
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

/** Parse a media-runs URL into run dir + rel. Throws naming the
 *  violation when the shape or a segment breaks confinement — a
 *  malformed pointer can never serve, so it refuses here, loud. */
export function parseMediaRef(ref: string): { runId: string; rel: string } {
  const rest: string = ref.slice(MEDIA_RUNS_PREFIX.length);
  const parts: string[] = rest.split("/");
  if (parts.length < 2) {
    throw new Error(
      "malformed media source (want /melite-media/runs/<run_id>/<file>): " +
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
    let decoded: string;
    try {
      decoded = decodeURIComponent(seg);
    } catch {
      throw new Error(
        "malformed media source (bad percent-escape): " + JSON.stringify(ref),
      );
    }
    if (!segmentOk(decoded)) {
      throw new Error(
        "media source refuses traversal: " + JSON.stringify(ref),
      );
    }
    relParts.push(decoded);
  }
  return { runId, rel: relParts.join("/") };
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

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

/** Resolve every ref against the run's roots — the server's walk:
 *  first root holding the RUN DIR wins, the file rides under it.
 *  Returns the resolved rows in collection order. Throws ONE error
 *  naming EVERY unresolvable source plus the roots searched — the
 *  run refuses before it registers, never mid-render. */
export function resolveSourceRefs(refs: readonly string[], roots: readonly string[]): SourceEchoRef[] {
  const dead: string[] = [];
  const rows: SourceEchoRef[] = [];
  for (const ref of refs) {
    let parsed: { runId: string; rel: string };
    try {
      parsed = parseMediaRef(ref);
    } catch (e) {
      dead.push(ref + " (" + (e as Error).message + ")");
      continue;
    }
    let file = "";
    for (const root of roots) {
      const runDir: string = join(root, "output", parsed.runId);
      if (!isDir(runDir)) continue;
      const cand: string = join(runDir, parsed.rel);
      if (isFile(cand)) {
        file = cand;
        break;
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
        " (the media walk: <root>/output/<run_id>/<file>). " +
        "Re-link or regenerate the sources; the run refuses rather than render sourceless",
    );
  }
  return rows;
}
