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
import { readFileSync, readdirSync } from "node:fs";
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
//
// F-M1 (the wall audit, 2026-09-28): the host list was a HAND list of
// 8 that missed 4 live atoms consumers (viewer-base, infer-gallery,
// motion, img-to-mesh — whose "excluded" comment was STALE); a new
// UI package escaped the lockstep wall by not being listed. The hosts
// are DERIVED now: every package.json under packages/ (any depth,
// node_modules skipped) whose dependencies name the atoms IS a host.
const ATOMS = "@deepseek-ai/dsh-client-ui-primitives";
const ATOM_HOSTS: string[] = discoverAtomHosts();
function discoverAtomHosts(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
      const full = join(dir, ent.name);
      if (ent.isDirectory()) { walk(full); continue; }
      if (ent.name !== "package.json") continue;
      let pkg: { dependencies?: Record<string, string> } = {} as never;
      try { pkg = JSON.parse(readFileSync(full, "utf8")); } catch { continue; }
      if (typeof pkg.dependencies?.[ATOMS] === "string") out.push(dirname(full));
    }
  };
  walk(join(repoRoot, "packages"));
  return out.sort();
}

// REAL_SET IS NOT DEAD WEIGHT (the walls audit's M8, 2026-10-10): the
// constant was declared, documented as "the real DSH client set", and
// never referenced — so deleting the three packages it names left the
// title claiming a pin that did not exist. The law is now live: if any
// client surface still depends on one of them, the wall knows; if none
// does, the set is asserted EMPTY and a re-introduction is a deliberate
// edit to this file.
describe("S4a — the real DSH client set is the estate's dependency", () => {
  it("REAL_SET is either declared by a live surface or asserted gone (no dead constant)", () => {
    const users: string[] = [];
    // exact census: the derived host set is pinned by CONTENT —
    // a host leaving the atoms train or a new UI package joining
    // are both deliberate edits this list names.
    assert.deepEqual(ATOM_HOSTS.map((h) => h.slice(h.indexOf("packages"))), [
      "packages/3d/img-to-mesh", // the stale exclusion comment died (F-M1): its studio DOES ride the atoms
      "packages/engines/comfyui/action_cards",
      "packages/engines/comfyui/action_cards/3d/ui",
      "packages/engines/comfyui/action_cards/motion/ui",
      "packages/image/mask-studio",
      "packages/motion/motion", // missed by the hand list (F-M1)
      "packages/video/h3-timeline",
      "packages/web-kit/timeline",
      "packages/web/card-base",
      "packages/web/melite-card-view",
    ], `the atoms hosts are the derived set (saw ${String(ATOM_HOSTS.length)}: ${ATOM_HOSTS.join(", ")})`);
    for (const host of ATOM_HOSTS) {
      const pkg = JSON.parse(readFileSync(join(host, "package.json"), "utf8"));
      for (const dep of Object.keys(pkg.dependencies ?? {})) {
        if ((REAL_SET as readonly string[]).includes(dep)) users.push(`${host} → ${dep}`);
      }
    }
    assert.deepEqual(users, [],
      `no live surface depends on the retired DSH client modules (got ${users.join(", ") || "none"} — a re-introduction must be argued in REAL_SET)`);
  });

  it("every UI-bearing package declares the atoms at the 0.1.7-rc lockstep", () => {
    for (const host of ATOM_HOSTS) {
      const pkg = JSON.parse(readFileSync(join(host, "package.json"), "utf8"));
      const v = pkg.dependencies?.[ATOMS];
      assert.ok(
        typeof v === "string" && (v.startsWith("0.1.7-rc.") || v.startsWith("^0.1.7-rc.")),
        // NO "*" — a star resolves to the dead 0.0.1-rc.1 line (proven
        // 2026-09-12: mask + timeline rode it until pinned). Lockstep only.
        `${host} must depend on the atoms at the 0.1.7-rc lockstep line (got ${String(v)})`,
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
