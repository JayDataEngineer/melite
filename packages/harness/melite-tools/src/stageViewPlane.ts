/** stageViewPlane.ts — THE STAGE-VIEW DECLARATION PLANE (2026-11-09,
 *  the fallback extermination): the estate derives each card's
 *  studio claim from the card package's own client index — the same
 *  tree truth the mount census wall judges
 *  (tests/walls/ts/suites/stage-view-mount-census.spec.ts).
 *  `defineStageViewRegistration('<card-id>', …)` inside
 *  packages/<genre>/<pkg>/src/client/index.ts, plus the manifest's
 *  package name, is the declaration; specBody serves it as
 *  FormSpecDoc.stage_view so the drill's dispatch can refuse LOUD
 *  when the lane's module table lacks the plugin instead of
 *  silently re-expressing the studio's params as a generic form.
 *  The walk memoizes per process (the tree is boot-static where the
 *  estate runs); an index that reads as absent is a legitimate
 *  no-declaration — most cards have no studio. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let cache: Map<string, string> | null = null;

function isDir(p: string): boolean {
  /* v8 ignore next -- statSync on a raced deletion; the walk's inputs
     are readdirSync outputs that exist in the real tree */
  try { return statSync(p).isDirectory(); } catch { return false; }
}

/** The repo root from this module's own seat (packages/harness/
 *  melite-tools/src → 4 up), independent of process.cwd(). */
function repoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "../../../..");
}

/** card id → declaring package name, derived once from the tree. */
function declarations(): Map<string, string> {
  if (cache !== null) return cache;
  const out = new Map<string, string>();
  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      /* v8 ignore next -- a dir stat'd as a dir vanishing mid-walk is
         a filesystem race; the real tree serves the walk whole */
      return;
    }
    for (const e of entries) {
      const p = join(dir, e);
      if (!isDir(p)) continue;
      if (e === "node_modules" || e === ".git" || e === "lib") continue;
      const index = join(p, "src", "client", "index.ts");
      let text: string;
      try {
        text = readFileSync(index, "utf8");
      } catch {
        walk(p);
        continue;
      }
      const m = text.match(/defineStageViewRegistration\(\s*'([^']+)'/);
      if (m === null) {
        walk(p);
        continue;
      }
      /* v8 ignore next 6 -- a registration whose manifest is unreadable
         or nameless declares nothing; every real card package names
         itself (the mount census judges the manifests independently) */
      try {
        const manifest = JSON.parse(readFileSync(join(p, "package.json"), "utf8")) as { name?: string };
        if (typeof manifest.name === "string") out.set(m[1] as string, manifest.name);
      } catch { /* the registration declares nothing without its name */ }
      walk(p);
    }
  };
  walk(join(repoRoot(), "packages"));
  cache = out;
  return out;
}

/** The card's declaring package name, or undefined when the card
 *  registers no studio (specBody serves null — the generic form is
 *  that card's designed seat). */
export function stageViewDeclaration(cardId: string): string | undefined {
  return declarations().get(cardId);
}
