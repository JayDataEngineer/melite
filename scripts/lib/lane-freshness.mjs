#!/usr/bin/env node
// lane-freshness.mjs — THE F1 GATE (HMR audit 009, 2026-10-24: "no
// continuous edit→browser judge on lanes — a stale lib serves
// silently"; two receipted outages, 2026-10-13 + 2026-10-26).
//
// THE CLASS: a lane serves lib/ from the repo tree per page-load, so
// served==repo BY CONSTRUCTION — but src can drift past a package's
// built lib (src committed without its artifact, or a mid-session
// edit). Every lane receipt then attests a PRODUCT THAT IS NOT THE
// TREE. The lib-sync arm in hook-full-battery judges this at COMMIT
// time; this gate judges it at LANE time — before a host boots and
// receipts anything.
//
// THE LAW IS THE STAMP'S OWN RECIPE (build-plane writeSrcStamp,
// byte-for-byte): the sorted src *.ts/*.tsx sha256-of-sha256sums,
// first 16 hex, computed from INSIDE the package dir. A mismatch
// between lib/.src-stamp and the recomputed hash = the served bundle
// is not the src tree's truth.
//
// Node port 2026-11-19 (operator law: npm + python only — no shell
// scripts anywhere in the tree). The recipe rides
// tools/src-stamp.mjs deriveSrcStamp() — ONE implementation, no
// shell oracle left to drift; the parity arm that kept node ===
// shell honest now guards the single derivation.
//
// Used by e2e-studio-lane.mjs; the wall (scripts/lane-freshness.spec.ts)
// exercises THIS function against fixture trees — one function, one seat.
//
// Library use: import { checkLaneFreshness } from this module.
// CLI use: node scripts/lib/lane-freshness.mjs [repo_root] — exit 0
// fresh, exit 1 stale with each offender named and the cure printed.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** @param pkgDir the package directory (its src/ is the input set)
 * @returns the 16-hex stamp: sha256 over the sha256sum-spelled lines
 * of every src *.ts/*.tsx, sorted — the committed stamps' recipe. */
function deriveSrcStamp(pkgDir) {
  const srcDir = join(pkgDir, "src");
  const files = [];
  const walk = (dir, rel) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const childRel = rel === "" ? entry.name : rel + "/" + entry.name;
      if (entry.isDirectory()) walk(join(dir, entry.name), childRel);
      else if (/\.tsx?$/.test(entry.name)) files.push(childRel);
    }
  };
  walk(srcDir, "");
  files.sort();
  const lines = files.map((rel) => {
    const digest = createHash("sha256").update(readFileSync(join(srcDir, rel))).digest("hex");
    return digest + "  src/" + rel + "\n"; // the sha256sum line spelling (find src prints the src/ prefix)
  });
  return createHash("sha256").update(lines.join("")).digest("hex").slice(0, 16);
}

/** THE GATE. @param root the repo root (default: cwd)
 * @returns {ok, offenders[]} — an offender names the package, its
 * live src hash, and the seated stamp. */
export function checkLaneFreshness(root = process.cwd()) {
  const offenders = [];
  const stampFiles = [];
  const packagesDir = join(root, "packages");
  if (!existsSync(packagesDir)) return { ok: true, offenders };
  const walkPackages = (dir, depth) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = join(dir, entry.name);
      if (entry.name === "lib") {
        const stamp = join(full, ".src-stamp");
        if (existsSync(stamp)) stampFiles.push(stamp);
        continue;
      }
      if (depth < 3) walkPackages(full, depth + 1);
    }
  };
  walkPackages(packagesDir, 0);
  for (const stampFile of stampFiles) {
    const pkgDir = dirname(dirname(stampFile));
    const rel = relative(root, pkgDir);
    if (!rel.startsWith("packages" + "/")) continue; // only the served fleet
    if (!existsSync(join(pkgDir, "src"))) continue;
    const live = deriveSrcStamp(pkgDir);
    const seated = readFileSync(stampFile, "utf8").trim();
    if (live !== seated) offenders.push(rel + ": src hash " + live + ", lib/.src-stamp " + seated);
  }
  return { ok: offenders.length === 0, offenders };
}

/** The CLI face: same words, same exits, as the retired .sh. */
function cli() {
  const root = process.argv[2] !== undefined ? resolve(process.argv[2]) : process.cwd();
  const { ok, offenders } = checkLaneFreshness(root);
  if (!ok) {
    console.error("[lane-freshness] STALE LIB PLANES — the lane would attest a product that is not the tree:");
    for (const o of offenders) console.error("  " + o);
    console.error("[lane-freshness] cure: node tools/build-plane.mjs build <pkg> (or the whole tree), then re-drive.");
    process.exit(1);
  }
  process.exit(0);
}

const invokedDirectly = process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) cli();
