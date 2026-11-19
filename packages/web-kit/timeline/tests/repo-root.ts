// repo-root.ts — THE INVOCATION-ROOT LAW for spec disk reads.
//
// A spec's process.cwd() is the vitest invocation root: the workspace
// root under the walker's run, the package dir under the package's own
// run. A repo-anchored read hard-coded to either one ENOENTs under the
// other (the 2026-10-22 suite-red class). Reads resolve through the
// pnpm-workspace.yaml marker walk — the comfyui-cordis repo() marker
// law, seated for specs (import.meta.url is vite-rewritten under
// vitest and cannot anchor a disk read).
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/** The workspace root: the nearest dir above the invocation cwd
 *  carrying pnpm-workspace.yaml. */
export function repoRoot(): string {
  let dir = process.cwd();
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`no pnpm-workspace.yaml above the invocation cwd ${process.cwd()}`);
    }
    dir = parent;
  }
}
