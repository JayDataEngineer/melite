// s4-client-deps.spec.ts — S4a walls: the real DSH client set lands.
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
// Run: npx vitest run tests/walls/ts/suites/s4-client-deps.spec.ts
// (or the whole gate: pnpm run test)
import { describe, it } from "vitest";
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

// 2026-09-12: the oracle moved — the editor app is deleted (the purge),
// so the real DSH client set is now declared by THE ESTATE'S client
// surfaces themselves: every UI-bearing card/studio package rides the
// atoms train (@deepseek-ai/dsh-client-ui-primitives at the coherent
// 0.1.5-rc line) — the de-poisoning's structural fact.
const ATOM_HOSTS = [
  "packages/web/melite-card-view",
  "packages/web/card-base",
  "packages/video/h3-timeline",
  "packages/image/mask-studio",
  "packages/image/ideogram4",
  "packages/3d/anny",
  // img-to-mesh excluded: its studio rides local shell + slots only,
  // no atoms imports — a host list must pin real dependencies.
  "packages/web-kit/timeline",
  "packages/engines/comfyui/action_cards",
  "packages/engines/comfyui/action_cards/3d/ui",
  "packages/engines/comfyui/action_cards/motion/ui",
] as const;

describe("S4a — the real DSH client set is the estate's dependency", () => {
  it("every UI-bearing package declares the atoms at the 0.1.5-rc lockstep", () => {
    for (const host of ATOM_HOSTS) {
      const pkg = JSON.parse(readFileSync(join(repoRoot, host, "package.json"), "utf8"));
      const v = pkg.dependencies?.["@deepseek-ai/dsh-client-ui-primitives"];
      assert.ok(
        typeof v === "string" && (v.startsWith("0.1.5-rc.") || v.startsWith("^0.1.5-rc.")),
        // NO "*" — a star resolves to the dead 0.0.1-rc.1 line (proven
        // 2026-09-12: mask + timeline rode it until pinned). Lockstep only.
        `${host} must depend on the atoms at the 0.1.5-rc lockstep line (got ${String(v)})`,
      );
      assert.ok(
        !pkg.dependencies?.["@deepseek-ai/dsh-client-runtime"],
        "dsh-client-runtime is dead upstream — no package may depend on it",
      );
    }
  });

  it("the atoms resolve from the store (the coherence fact)", () => {
    const req = createRequire(join(repoRoot, "packages/web/melite-card-view", "package.json"));
    const resolved = req.resolve("@deepseek-ai/dsh-client-ui-primitives");
    assert.ok(resolved.includes("node_modules"), `atoms resolved from the store: ${resolved}`);
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
