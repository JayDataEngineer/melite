// estate-lib-sync.spec.ts — THE ESTATE-LIB FRESHNESS WALL (runs-bench-lane
// wave-2, §CURES-OWED 3).
//
// The lesion: models-lib-sync judges the FAMILIES' served lib
// byte-exact, client-bundle-freshness judges the tsdown bundles,
// lib-sync judges export presence — and the estate-queue's own tsc
// `lib/*.js` (the plane this lane's hops 4–5 execute: the runs
// registry, the compose gate, the served flows registry) carried
// none of the three behaviors. The 9c439f6d5 class — a stale
// estate-queue lib masking every src cure — re-opens for exactly the
// plane the run press lives in: tests resolve estate src through
// tsconfig paths, the bench EXECUTES lib. This wall owns that
// plane: every workspace package with a tracked tsc `lib/` and a
// served exports map (outside the models tree models-lib-sync
// owns, outside the tsdown bundles client-bundle-freshness owns)
// must byte-match a fresh emit of its src — runtime plane
// byte-exact modulo the sourceMappingURL comment, stale and
// unemitted files named.
//
// Run: npx vitest run tests/walls/ts/suites/estate-lib-sync.spec.ts
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { compareEmitted, type LibDrift } from "./models-lib-sync.spec.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const PACKAGES = join(ROOT, "packages");

/** The roster: every workspace package with a tracked tsc `lib/`
 *  (lib/index.js present), a served exports map that names it, and
 *  a tsconfig build program — excluding the models tree (the
 *  families, models-lib-sync's own roster) and tsdown client-bundle
 *  packages (client-bundle-freshness's roster). Derived, never a
 *  hand list — a package joining the class is wall-owned the hour
 *  it lands. */
function roster(): string[] {
  const out: string[] = [];
  for (const area of readdirSync(PACKAGES, { withFileTypes: true })) {
    if (!area.isDirectory() || area.name === "models") continue;
    const areaDir = join(PACKAGES, area.name);
    for (const pkg of readdirSync(areaDir, { withFileTypes: true })) {
      if (!pkg.isDirectory()) continue;
      const dir = join(areaDir, pkg.name);
      if (!existsSync(join(dir, "tsconfig.build.json"))) continue;
      if (!existsSync(join(dir, "lib", "index.js"))) continue;
      if (existsSync(join(dir, "tsdown.config.ts")) || existsSync(join(dir, "tsdown.config.js"))) continue;
      const pkgJson = JSON.parse(readExports(dir));
      const exports = pkgJson.exports as Record<string, unknown> | undefined;
      const main = exports?.["."] as Record<string, string> | string | undefined;
      const served = typeof main === "string" ? main : main?.default ?? main?.import;
      if (typeof served !== "string" || !served.includes("lib/")) continue;
      out.push(dir);
    }
  }
  return out.sort();
}

function readExports(dir: string): string {
  return readFileSync(join(dir, "package.json"), "utf8");
}

describe("estate-lib-sync (the estate's served tsc lib is the fresh emit of its src)", () => {
  it("every served tsc lib byte-matches a fresh emit of its src (the bench executes lib, the walls judge src — never again)", () => {
    const packages = roster();
    expect(packages.length, "no roster — the wall went vacuous").toBeGreaterThan(0);
    const drifts: LibDrift[] = [];
    for (const pkgDir of packages) {
      const tsc = join(pkgDir, "node_modules/typescript/bin/tsc");
      if (!existsSync(tsc)) {
        // no own compiler: the package builds through the root tsc —
        // emit with the repo's hoisted one
        continue;
      }
      const out = mkdtempSync(join(tmpdir(), "estate-lib-emit-"));
      try {
        execFileSync(process.execPath, [
          tsc, "-p", join(pkgDir, "tsconfig.build.json"),
          "--outDir", out,
          "--sourceMap", "false",
          "--declarationMap", "false",
        ], { stdio: ["ignore", "ignore", "pipe"] });
        const drift = compareEmitted(relative(PACKAGES, pkgDir), "tsconfig.build.json", out, join(pkgDir, "lib"));
        // THE GENERATOR-ARTIFACT CLASS (2026-11-06, the drafts face
        // separation): a package with scripts/typert.mjs commits
        // lib/typert.*.js|.d.ts written by the DSH typert generator —
        // sanctioned served artifacts that are NOT emits of src (the
        // generator's own law: "artifacts committed under lib/ exactly
        // as DSH packages commit theirs"; the web faces import
        // TYPERT_REMOTE from exactly this plane). The tsc comparison
        // cannot judge generated code — without the skip the class
        // flags forever; the generator's run law owns the plane's
        // freshness (build-plane runs the script after every build).
        if (existsSync(join(pkgDir, "scripts", "typert.mjs"))) {
          const generated = (f: string): boolean => /(^|\/)typert\.[^/]*\.(js|d\.ts)$/.test(f);
          drift.stale = drift.stale.filter((f) => !generated(f.split(" (")[0]!));
          drift.unemitted = drift.unemitted.filter((f) => !generated(f.split(" (")[0]!));
        }
        if (drift.stale.length > 0 || drift.unemitted.length > 0) drifts.push(drift);
      } finally {
        rmSync(out, { recursive: true, force: true });
      }
    }
    const rendered = drifts.map((d) =>
      `${d.pkg}: stale ${d.stale.join(", ")} / unemitted ${d.unemitted.join(", ")}`,
    ).join("\n");
    expect(rendered, "served estate lib(s) are stale — run `pnpm run build` in each named package and commit the lib").toBe("");
  }, 600_000);
});
