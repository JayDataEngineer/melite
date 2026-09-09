// s4-client-deps.test.ts — S4a walls: the real DSH client set lands.
//
// The S4 migration record (docs/design/editor-on-dsh-client-2026-09-08.md)
// converts the editor lane onto the published DSH client stack. This wall
// pins the stroke's two preparation facts: (1) the editor declares the
// four real packages at the coherent 0.1.0-rc.8 lockstep line (the same
// line the dsh lane's runtime/slots already ride in the store), and
// (2) the vendored slot fork is ON NOTICE — no importer of
// @melite/slots' vendored core may exist outside the seam layer that
// S4c rewrites; a new importer outside that list is drift against the
// order ("rejecting handrolling our own things").
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/s4-client-deps.test.ts
// (or the whole plane: node tests/walls/ts/run.mjs)
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const REAL_SET = [
  "@deepseek-ai/dsh-client-modules",
  "@deepseek-ai/dsh-client-runtime",
  "@deepseek-ai/dsh-client-ui-slots",
  "@deepseek-ai/dsh-client-web",
] as const;

describe("S4a — the real DSH client set is the editor's dependency", () => {
  it("editor package.json declares the four real packages at the rc.8 lockstep", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "packages/web/editor/package.json"), "utf8"));
    for (const name of REAL_SET) {
      assert.ok(
        pkg.dependencies?.[name]?.startsWith("^0.1.0-rc."),
        `editor must depend on ${name} at the ^0.1.0-rc.x lockstep line`,
      );
    }
  });

  it("every real package resolves from the editor's tree (the coherence fact)", () => {
    const req = createRequire(join(repoRoot, "packages/web/editor/package.json"));
    for (const name of REAL_SET) {
      const resolved = req.resolve(name);
      assert.ok(resolved.includes("node_modules"), `${name} resolved from the store: ${resolved}`);
    }
  });
});

/** Files whose vendored-core imports are lawful until S4c rewrites them. */
const SEAM_LAYER = new Set([
  "uiSlotSeam.ts",
  "cardSeam.ts",
  "cardBodySeam.ts",
  "cardElementSeams.ts",
  "regionSeams.ts",
  "viewerSeams.ts",
  "studioCapabilities.ts",
  "studioContextSeam.ts",
  "uiSlotSeam.tsx",
  "studioRail.tsx",
  "index.ts",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "vendored") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("S4a — the vendored slot fork is on notice", () => {
  it("no file outside the seam layer imports the vendored core", () => {
    const slotsSrc = join(repoRoot, "packages/web-kit/slots/src");
    const violators: string[] = [];
    for (const file of walk(join(repoRoot, "packages"))) {
      const text = readFileSync(file, "utf8");
      if (/from ["'][^"']*vendored\/(core|react)/.test(text)) {
        const rel = relative(slotsSrc, file);
        const base = rel.split("/").pop() ?? rel;
        if (!file.startsWith(slotsSrc) || !SEAM_LAYER.has(base)) {
          violators.push(relative(repoRoot, file));
        }
      }
    }
    assert.deepStrictEqual(violators, [], "vendored-core importers must stay inside the seam layer S4c rewrites");
  });
});
