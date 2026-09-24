// runsValidateArtifacts.ts — artifact-ref sweep validators split from
// runsValidate.ts (pure move, zero logic changes).
// THE CROSS-ROOTS LAW (§23, extended here 2026-09-24 — the same
// stroke as cardsDangling's, receipt transcript-034 step 18): the
// validate door searches the roots MANIFEST (own state root first,
// then MELITE_STATE_ROOTS extras), never a repo-anchored tree, and
// refs may carry EITHER estate prefix. The old "REPO-anchored, no
// env override" note mirrored artifact_refs.py's legacy shape —
// superseded: this is a run-resolving door; the manifest owns it.
import { statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { searchedVoice } from "./rootsManifest.ts";
import { artifactPrefixOf, sweepOutputRoots } from "./cardsDangling.ts";
import { ASSET_RUNS_PREFIX, MEDIA_RUNS_PREFIX } from "./runsSourceEcho.ts";

export { ASSET_RUNS_PREFIX, MEDIA_RUNS_PREFIX };

export function resolveArtifactFile(ref: string, outRoot: string): string {
  const raw: string = String(ref).trim();
  /* v8 ignore next -- refLocations yields non-empty prefixed strings only (2026-09-12) */
  if (raw === "") throw new Error("empty artifact ref (nothing to resolve)");
  if (raw.includes("..")) throw new Error("artifact ref refuses traversal: " + JSON.stringify(raw));
  let cand: string;
  const prefix: string | null = artifactPrefixOf(raw);
  if (prefix !== null) {
    const rel: string = raw.slice(prefix.length);
    if (rel === "" || rel.endsWith("/") || !rel.includes("/")) {
      throw new Error(
        "malformed artifact URL (want <prefix><run_id>/<file> with prefix " +
          ASSET_RUNS_PREFIX + " or " + MEDIA_RUNS_PREFIX + "): " + JSON.stringify(raw),
      );
    }
    cand = join(outRoot, rel);
    /* v8 ignore start -- refLocations yields prefix-URL refs only (the
       gateway feeds /v1/assets/runs/... URLs): the relative/absolute/bare
       shapes are ported for faithfulness, unreachable here (2026-09-12) */
  } else if (raw.includes("/") && !raw.startsWith("/")) {
    cand = join(outRoot, raw);
  } else if (raw.startsWith("/")) {
    cand = raw;
  } else {
    throw new Error(
      "artifact ref is a bare " +
        JSON.stringify(raw) +
        " — not an absolute path, an artifact URL (" +
        ASSET_RUNS_PREFIX + "<run>/<file> or " + MEDIA_RUNS_PREFIX +
        "<run>/<file>), or a runs-relative " +
        "<run>/<file> (a bare filename lives in the ComfyUI input " +
        "dir and is the caller's staging concern, never a disk lookup)",
    );
  }
  /* v8 ignore stop */
  const absCand: string = resolve(cand);
  const absRoot: string = resolve(outRoot);
  // os.path.commonpath([abs_cand, abs_root]) != abs_root ⟺ the
  // join escaped the root (no absolute escape smuggled through
  // form 3, e.g. a leading // or symlink prefix).
  const relToRoot: string = relative(absRoot, absCand);
  /* v8 ignore next -- defense-in-depth: refLocations admits only
     prefix refs and the traversal check fires first, so no escape
     reaches here (2026-09-12) */
  if (relToRoot === ".." || relToRoot.startsWith(".." + sep)) {
    throw new Error("artifact ref escapes the output root: " + JSON.stringify(raw));
  }
  let isFile: boolean = false;
  try {
    isFile = statSync(absCand).isFile();
  } catch {
    isFile = false;
  }
  if (!isFile) {
    const run: string = artifactPrefixOf(raw) !== null
      ? raw.slice((artifactPrefixOf(raw) as string).length).split("/", 2)[0] as string // split yields >= 1
      : /* v8 ignore next -- refs always carry a prefix through refLocations (2026-09-12) */ "?";
    throw new Error(
      "artifact not found on disk: " +
        JSON.stringify(raw) +
        " (looked up " +
        absCand +
        ") — the upstream run may have been pruned, or the ref was " +
        "never an output of run " +
        run,
    );
  }
  return absCand;
}

// _ref_locations (artifact_refs.py:106): the stack-DFS verbatim
// (LIFO pop — order matters when several refs dangle; the wall's
// legs dangle one).
export function refLocations(body: unknown): Array<{ location: string; ref: string }> {
  const out: Array<{ location: string; ref: string }> = [];
  const stack: Array<{ node: unknown; path: string }> = [{ node: body, path: "$" }];
  while (stack.length > 0) {
    const top: { node: unknown; path: string } = stack.pop() as { node: unknown; path: string };
    const node: unknown = top.node;
    const path: string = top.path;
    if (typeof node === "object" && node !== null && !Array.isArray(node)) {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        stack.push({ node: value, path: path + "." + key });
      }
    } else if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        stack.push({ node: node[i], path: path + "[" + i + "]" });
      }
    } else if (typeof node === "string" && artifactPrefixOf(node) !== null) {
      out.push({ location: path, ref: node });
    }
  }
  return out;
}

export function findDanglingRefs(body: Record<string, unknown>): Array<[string, string, string]> {
  const roots: string[] = sweepOutputRoots();
  const dangling: Array<[string, string, string]> = [];
  for (const { location, ref } of refLocations(body)) {
    let live: boolean = false;
    let primaryErr: Error | null = null;
    for (const root of roots) {
      try {
        resolveArtifactFile(ref, root);
        live = true;
        break;
      } catch (e) {
        if (primaryErr === null) primaryErr = e as Error;
      }
    }
    // the refusal quotes the PRIMARY root lookup (artifact_refs.py:161)
    // + every searched tree (the NAME-THE-ROOT law, §23 — same voice
    // as the compose gate's sweep, receipt transcript-034 step 18).
    if (!live) {
      dangling.push([location, ref, (primaryErr as Error).message + " " + searchedVoice(roots)]);
    }
  }
  return dangling;
}
