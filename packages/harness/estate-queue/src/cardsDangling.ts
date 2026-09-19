// cardsDangling.ts — the artifact-ref sweep. Extracted from
// cardsRegistry: resolve run-artifact refs against the out roots
// and walk bodies for every ref location.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { resolveRepoRoot } from "@melite/comfyui-cordis";

// ── artifact-ref sweep (find_dangling_refs
// semantics — the validate-door mirror, same roots) ─────────────

const ASSET_RUNS_PREFIX: string = "/v1/assets/runs/";

export function sweepRoots(): { outRoot: string; testOutRoot: string } {
  const runs: string = join(resolveRepoRoot(), "data", "runs");
  return { outRoot: join(runs, "output"), testOutRoot: join(runs, "test-output") };
}

export function resolveArtifactFile(ref: string, outRoot: string): string {
  // (refLocations yields non-empty strings only — ref is always a string here.)
  const raw: string = String(ref).trim();
  /* v8 ignore next -- the empty fence never fires (refLocations
     yields prefix-strings only): kept as the rim's contract (2026-09-12) */
  if (raw === "") throw new Error("empty artifact ref (nothing to resolve)");
  if (raw.includes("..")) throw new Error("artifact ref refuses traversal: " + JSON.stringify(raw));
  let cand: string;
  if (raw.startsWith(ASSET_RUNS_PREFIX)) {
    const rel: string = raw.slice(ASSET_RUNS_PREFIX.length);
    if (rel === "" || rel.endsWith("/") || !rel.includes("/")) {
      throw new Error(
        "malformed artifact URL (want /v1/assets/runs/<run_id>/<file>): " + JSON.stringify(raw),
      );
    }
    cand = join(outRoot, rel);
    /* v8 ignore start -- refLocations yields artifact-URL strings only:
       the shape arm never fires through the one caller (2026-09-12) */
  } else {
    throw new Error(
      "artifact ref is not an artifact URL (/v1/assets/runs/<run>/<file>): " + JSON.stringify(raw),
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
    // (raw is a well-formed artifact URL here — the slice always yields a run id.)
    const run: string = raw.startsWith(ASSET_RUNS_PREFIX)
      ? (raw.slice(ASSET_RUNS_PREFIX.length).split("/", 2)[0] as string)
      : /* v8 ignore next -- refLocations yields artifact-URL strings
           only: the fallback never fires (2026-09-12) */ "?";
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
    } else if (typeof node === "string" && node.startsWith(ASSET_RUNS_PREFIX)) {
      out.push({ location: path, ref: node });
    }
  }
  return out;
}

/** find_dangling_refs semantics: the first dangling (location, ref,
 *  why), or null when every wired artifact URL is live under
 *  EITHER served root (the test root serves too — a test:true run
 *  may wire a test artifact). */
export function findCardDangling(
  body: Record<string, unknown>,
): [string, string, string] | null {
  const { outRoot, testOutRoot } = sweepRoots();
  for (const { location, ref } of refLocations(body)) {
    let live = false;
    let primaryErr: Error | null = null;
    for (const root of [outRoot, testOutRoot]) {
      try {
        resolveArtifactFile(ref, root);
        live = true;
        break;
      } catch (e) {
        if (primaryErr === null) primaryErr = e as Error;
      }
    }
    if (!live) return [location, ref, (primaryErr as Error).message];
  }
  return null;
}
