// catalog-barrel.spec.ts — THE BARREL WALK (handroll-vs-dsh audit
// item-2 verification (g), cured 2026-10-21). The @melite/catalog
// barrel is the served-truth reader's ONE face — but no gate walked
// it: 0 `@melite/catalog` matches in tests/ or scripts/ meant a src
// module the barrel forgot, a re-export row pointing at a dead
// file, or an ambiguous `export *` name silently dropped (ESM drops
// the name when two re-exported modules collide — no error, the
// import resolves to nothing) were all invisible to every tier.
//
// The law: every non-private src module of packages/web-kit/catalog
// re-exports through the barrel, name for name. Deliberately
// private modules are pinned below with their reason; a module
// joining that list is a deliberate edit this wall forces.
import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "web-kit", "catalog", "src",
);

/** Modules deliberately OUTSIDE the barrel — pinned so a new
 * private wants a reason here, not silence.
 * - wireTypes: the wire contract's declaration home; its types
 *   ride every consumer through the barrel's other modules and
 *   its runtime surface (RUN_STATUSES) re-exports via
 *   runStatusContract.ts. Direct importers read the file.
 * - clientStore: the once-per-outage store's private half; its
 *   public face rides catalogContractStore.ts.
 * - sleep: a test helper re-exported for spec files only.
 *   (css-modules.d.ts needs no pin: the walk skips declaration-only
 *   files — the coverage-exempt class.) */
const PRIVATES = new Set(["wireTypes", "clientStore", "sleep"]);

describe("THE CATALOG BARREL WALK", () => {
  it("every src module re-exports through the barrel, name for name", async () => {
    const barrel = await import(join(SRC, "index.ts"));
    const barrelKeys = new Set(Object.keys(barrel));
    expect(barrelKeys.size, "the barrel exposes a real surface").toBeGreaterThan(0);
    const modules = readdirSync(SRC)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
      .map((f) => f.slice(0, -3))
      .filter((m) => m !== "index" && !PRIVATES.has(m));
    expect(modules.length, "the walk found the src modules (a parse drift is vacuous)").toBeGreaterThan(10);
    const missing: string[] = [];
    for (const m of modules) {
      const mod = await import(join(SRC, `${m}.ts`));
      for (const key of Object.keys(mod)) {
        if (!barrelKeys.has(key)) missing.push(`${m}.ts exports ${key} — not on the barrel`);
      }
    }
    expect(missing.sort(), "every module's names ride the barrel (a forgotten module, a dead re-export, or an ambiguous export * name lands here)").toEqual([]);
  });

  it("the pinned private list matches the real src tree", () => {
    // A private that stopped existing (deleted module) or a src
    // module newly absent from the list both redden HERE — the
    // pin cannot rot.
    const files = new Set(readdirSync(SRC)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
      .map((f) => f.slice(0, -3)));
    const stale = [...PRIVATES].filter((p) => !files.has(p));
    expect(stale, "every pinned private is a real module").toEqual([]);
  });
});
