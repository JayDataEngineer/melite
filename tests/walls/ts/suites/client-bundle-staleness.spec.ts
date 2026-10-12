// client-bundle-staleness.spec.ts — THE BUNDLE-STALENESS JUDGE
// (gpu-tier audit "invisible seams", 2026-10-12; CONTRACTS §4 debt
// 11a, closed in the "FIX ALL GAPS" round): every client build
// inlines @melite/catalog's checker TWICE (src region through
// tsconfig paths + lib region through package exports), and the
// executing store runs the LIB copy — a bundle built against a
// stale catalog lib serves the OLD checker while every source-side
// wall reads the CURED source and passes. The live proof: six
// bundles, two eras, one console red (runs 4-6 of the gpu-tier
// lane). This wall greps the BUILT bundles at battery time so a
// stale bundle reds before a lane boot ever serves it.
//
// THE SIGNATURES (transpile-stable — the audit's diagnostic trap):
// judge by OLD-ONLY arms, never by strings the cure KEEPS (the
// "default_family or resolved route" message and the hasRoute
// construction survive the cure; grepping those counts cured copies
// as stale). Old-only:
//   1. the empty-families-ALWAYS-violates arm
//      `entry.families.length === 0) missing.push("families")`
//   2. the no-waiver route arm `if (!hasRoute && !isNonEmptyString(`
//      (cured wraps the same push in the modelLess waiver).
// Cured evidence (either face — tsc lib keeps `const modelLess`,
// esbuild bundles inline it away): the literal
// `families (routed but empty` survives both faces.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

const isDir = (p: string): boolean => {
  try { return statSync(p).isDirectory(); } catch { return false; }
};

/** Walk every packages subtree for built client bundles (a file
 * named client.js inside a directory named lib; skip node_modules). */
function clientBundles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (isDir(p)) {
        if (e === "node_modules" || e === ".git") continue;
        walk(p);
      } else if (e === "client.js" && dir.endsWith("lib")) {
        out.push(p);
      }
    }
  };
  walk(join(ROOT, "packages"));
  return out;
}

/** The inlined-checker census: a built bundle that carries the
 * catalog contract at all (both faces name it in region banners or
 * the contract's own arm text). */
const inlinesChecker = (src: string): boolean =>
  src.includes("catalogContract") || src.includes("families (routed but empty")
  || src.includes('missing.push("families');

const OLD_EMPTY_FAMILIES = /entry\.families\.length === 0\) missing\.push\("families"\)/u;
const OLD_NO_WAIVER_ROUTE = /if \(!hasRoute && !isNonEmptyString/u;
const CURED_LITERAL = "families (routed but empty";

describe("client bundles carry the CURED catalog checker (debt 11a)", () => {
  it("the cascade's first step is judged too — catalog's own lib carries the cure", () => {
    const libF = join(ROOT, "packages", "web-kit", "catalog", "lib", "catalogContract.js");
    assert.ok(existsSync(libF), "catalog lib not built — the cascade's first step is missing");
    const src = readFileSync(libF, "utf8");
    assert.ok(!OLD_EMPTY_FAMILIES.test(src), "catalog lib carries the OLD empty-families arm — rebuild it first");
    assert.ok(!OLD_NO_WAIVER_ROUTE.test(src), "catalog lib carries the OLD no-waiver route arm — rebuild it first");
    assert.ok(src.includes(CURED_LITERAL), "catalog lib lacks the cured routed-but-empty arm — rebuild it first");
  });

  it("every client bundle inlining the checker serves the CURED era, never the old", () => {
    const bundles = clientBundles()
      .map((p) => ({ p, src: readFileSync(p, "utf8") }))
      .filter((b) => inlinesChecker(b.src));
    // MUTATION KILL: the derived census must find the known six
    // (card-base, melite-card-view, infer-gallery, motion/motion,
    // video/h3-timeline, web-kit/timeline) — an empty census would
    // pass vacuously; a seventh consumer is auto-covered.
    assert.ok(bundles.length >= 6,
      `the bundle census found ${bundles.length} checker-inlining bundles — the six known consumers must be built`);
    const stale: string[] = [];
    for (const b of bundles) {
      if (OLD_EMPTY_FAMILIES.test(b.src)) {
        stale.push(`${b.p}: OLD empty-families-always-violates arm inlined`);
      }
      if (OLD_NO_WAIVER_ROUTE.test(b.src)) {
        stale.push(`${b.p}: OLD no-waiver route arm inlined`);
      }
      if (!b.src.includes(CURED_LITERAL)) {
        stale.push(`${b.p}: no cured routed-but-empty arm — pre-cure checker era`);
      }
    }
    assert.deepEqual(stale, [],
      `stale client bundles (rebuild the package lib FIRST, then every inlining bundle — the cascade law):\n${stale.join("\n")}`);
  });
});
