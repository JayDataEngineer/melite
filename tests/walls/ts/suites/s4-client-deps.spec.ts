// s4-client-deps.spec.ts — S4a walls: the real DSH client set lands.
//
// The S4 migration record (docs/design/editor-on-dsh-client-2026-09-08.md)
// converts the editor lane onto the published DSH client stack. This wall
// pins the stroke's two preparation facts: (1) the editor declares the
// real packages at the coherent 0.1.5-rc train (2026-09-10 train
// unification: the whole repo rides 0.1.5-rc.x; dsh-client-runtime —
// last published 0.1.1-rc.2, peers frozen to the dead 0.1.1 world —
// is GONE: DSH's own client entries type the context as cordis
// Context, and packages/client has no runtime member).
//
// 2026-09-13: the vendored-slot-fork arm is DELETED with its subject —
// @melite/slots died in the burial stroke (StudioRail moved to
// card-base; the kernel + seven dead seam faces + their walls went
// with it). The atoms arms below are the wall's live body.
//
// Run: npx vitest run tests/walls/ts/suites/s4-client-deps.spec.ts
// (or the whole gate: pnpm run test)
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
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
  // anny retired from this list (stroke 89): its studio died — a
  // form card owns no browser face, so it declares no atoms.
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
