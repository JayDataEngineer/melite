// s4-client-deps.test.ts — S4a walls: the real DSH client set lands.
//
// The S4 migration record (docs/design/editor-on-dsh-client-2026-09-08.md)
// converts the editor lane onto the published DSH client stack. This wall
// pins the stroke's two preparation facts: (1) the editor declares the
// real packages at the coherent 0.1.5-rc train (2026-09-10 train
// unification: the whole repo rides 0.1.5-rc.x; dsh-client-runtime —
// last published 0.1.1-rc.2, peers frozen to the dead 0.1.1 world —
// is GONE: DSH's own client entries type the context as cordis
// Context, and packages/client has no runtime member), and (2) the
// vendored slot fork is ON NOTICE — no importer of @melite/slots'
// vendored core may exist outside the seam layer that S4c rewrites; a
// new importer outside that list is drift against the order
// ("rejecting handrolling our own things").
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
  "@deepseek-ai/dsh-client-ui-slots",
  "@deepseek-ai/dsh-client-web",
] as const;

describe("S4a — the real DSH client set is the editor's dependency", () => {
  it("editor package.json declares the real packages at the 0.1.5-rc lockstep (no dead runtime dep)", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "packages/web/editor/package.json"), "utf8"));
    // 2026-09-10: the whole client family rides the 0.1.5-rc train.
    // dsh-client-runtime died upstream (last publish 0.1.1-rc.2) — the
    // client root context is typed as cordis Context per DSH's own
    // worked example (packages/client/ui-theme).
    for (const name of REAL_SET) {
      assert.ok(
        pkg.dependencies?.[name]?.startsWith("0.1.5-rc.") || pkg.dependencies?.[name]?.startsWith("^0.1.5-rc."),
        `editor must depend on ${name} at the 0.1.5-rc lockstep line`,
      );
    }
    assert.ok(
      !pkg.dependencies?.["@deepseek-ai/dsh-client-runtime"],
      "dsh-client-runtime is dead upstream — the editor must not depend on it",
    );
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
