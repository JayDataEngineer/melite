// cardsDangling.ts — the artifact-ref sweep. Extracted from
// cardsRegistry: resolve run-artifact refs against the out roots
// and walk bodies for every ref location.
//
// THE CROSS-ROOTS LAW (§23, extended here 2026-09-24 — receipt
// transcript-034 step 18: the compose door refused a LIVE portrait
// ref because the sweep only knew the repo-anchored
// data/runs/output while the maker lane's runs mint under
// MELITE_STATE_ROOT/output; the maker paid a refusal + ~8 forensic
// calls to diagnose OUR two-roots lie): every run-resolving door
// searches the roots MANIFEST in order — own state root first,
// then the MELITE_STATE_ROOTS extras — the same walk the
// source-echo resolver (runsSourceEcho) and the run doors use.
// One law, one spelling: refs may carry EITHER estate prefix
// (/v1/assets/runs/ or /melite-media/runs/ — both are first-class
// run sources; the h3 card's own docs teach the assets spelling).
import { statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import { rootsManifest, searchedVoice } from "./rootsManifest.ts";
import { resolveStateRoot } from "./queueLock.ts";
import { ASSET_RUNS_PREFIX, MEDIA_RUNS_PREFIX } from "./runsSourceEcho.ts";

// ── artifact-ref sweep (find_dangling_refs
//    semantics — the validate-door mirror, same roots) ──────────

/** The one-prefix question: which estate route (if any) does this
 * string carry? Both spellings are the same trees (the media
 * route is the newer first-class face — runsSourceEcho's law). */
export function artifactPrefixOf(raw: string): string | null {
  if (raw.startsWith(ASSET_RUNS_PREFIX)) return ASSET_RUNS_PREFIX;
  if (raw.startsWith(MEDIA_RUNS_PREFIX)) return MEDIA_RUNS_PREFIX;
  return null;
}

/** THE SWEEP ROOTS (§23): every manifest root's output/ and
 * test-output/ trees, own state root first, deduped. A test:true
 * run may wire a test artifact — the test trees sweep too. */
export function sweepOutputRoots(): string[] {
  const roots: string[] = rootsManifest(resolveStateRoot(resolveRepoRoot()));
  const out: string[] = [];
  const seen: Set<string> = new Set();
  for (const root of roots) {
    for (const tree of [join(root, "output"), join(root, "test-output")]) {
      const abs: string = resolve(tree);
      if (!seen.has(abs)) {
        seen.add(abs);
        out.push(abs);
      }
    }
  }
  return out;
}

export function resolveArtifactFile(ref: string, outRoot: string): string {
  // (refLocations yields non-empty strings only — ref is always a string here.)
  const raw: string = String(ref).trim();
  /* v8 ignore next -- the empty fence never fires (refLocations
     yields prefix-strings only): kept as the rim's contract (2026-09-12) */
  if (raw === "") throw new Error("empty artifact ref (nothing to resolve)");
  if (raw.includes("..")) throw new Error("artifact ref refuses traversal: " + JSON.stringify(raw));
  const prefix: string | null = artifactPrefixOf(raw);
  let cand: string;
  if (prefix !== null) {
    const rel: string = raw.slice(prefix.length);
    if (rel === "" || rel.endsWith("/") || !rel.includes("/")) {
      throw new Error(
        "malformed artifact URL (want <prefix><run_id>/<file> with prefix " +
          ASSET_RUNS_PREFIX + " or " + MEDIA_RUNS_PREFIX + "): " + JSON.stringify(raw),
      );
    }
    cand = join(outRoot, rel);
    /* v8 ignore start -- refLocations yields artifact-URL strings only:
       the shape arm never fires through the one caller (2026-09-12) */
  } else {
    throw new Error(
      "artifact ref is not an artifact URL (" +
        ASSET_RUNS_PREFIX + "<run>/<file> or " + MEDIA_RUNS_PREFIX +
        "<run>/<file>): " + JSON.stringify(raw),
    );
    /* v8 ignore stop */
  }
  const absCand: string = resolve(cand);
  const absRoot: string = resolve(outRoot);
  const relToRoot: string = relative(absRoot, absCand);
  /* v8 ignore next -- the traversal fence above pre-empts every ".."
     (a lexical escape needs one): the check never fires (2026-09-12) */
  if (relToRoot === ".." || relToRoot.startsWith(".." + sep)) {
    throw new Error("artifact ref escapes the output root: " + JSON.stringify(raw));
  }
  let isFile = false;
  try {
    isFile = statSync(absCand).isFile();
  } catch {
    isFile = false;
  }
  if (!isFile) {
    // (raw carries a matched prefix here — the slice always yields a run id.)
    const run: string = raw.slice((prefix as string).length).split("/", 2)[0] as string;
    throw new Error(
      "artifact not found on disk: " + JSON.stringify(raw) + " (looked up " + absCand + ") — the " +
        "upstream run may have been pruned, or the ref was never an output of run " + run,
    );
  }
  return absCand;
}

export function refLocations(body: unknown): Array<{ location: string; ref: string }> {
  const out: Array<{ location: string; ref: string }> = [];
  const stack: Array<{ node: unknown; path: string }> = [{ node: body, path: "$" }];
  while (stack.length > 0) {
    const top = stack.pop() as { node: unknown; path: string };
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

/** find_dangling_refs semantics: the first dangling (location, ref,
 *  why), or null when every wired artifact URL is live under ANY
 *  swept tree (§23 — the manifest walk, own root first; a miss
 *  names every searched tree so a two-roots box stays debuggable). */
export function findCardDangling(
  body: Record<string, unknown>,
): [string, string, string] | null {
  const roots: string[] = sweepOutputRoots();
  for (const { location, ref } of refLocations(body)) {
    let live = false;
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
    if (!live) {
      // The NAME-THE-ROOT law (§23): the refusal carries the full
      // manifest walk so the lane's two-roots moments read at a
      // glance (receipt transcript-034 step 18 — the old voice
      // named ONE tree and read like a pruned run).
      return [
        location,
        ref,
        (primaryErr as Error).message + " " + searchedVoice(roots),
      ];
    }
  }
  return null;
}
