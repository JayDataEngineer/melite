#!/usr/bin/env node
// models-lib-sync-manifest.mjs — the ONLY writer of the lib-sync
// cache manifest (tests/walls/ts/fixtures/models-lib-sync-manifest.json,
// C3(a), 2026-11-07). Judge-gated: every family is fully re-emitted
// by the same judge the wall runs (tests/walls/ts/lib/
// models-lib-sync-judge.ts), and the script refuses to write over a
// stale tree — a manifest row is a statement that the judge passed
// that family at that src/lib pair, so a stale family gets the build
// command, never a row. Hand-editing the manifest is a fraudulent
// wall (LAW 2): regenerate, never patch.
//
// The script imports the judge's TypeScript directly (native type
// stripping); a Node older than 23.6 fails loud below instead of
// writing a manifest from a silently mangled judge.
//
// Run: node scripts/models-lib-sync-manifest.mjs
import { existsSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

if (!process.features.typescript) {
  console.error(`models-lib-sync-manifest: this script imports the wall's TypeScript judge and needs Node >= 23.6 (native type stripping); running ${process.version}`);
  process.exit(1);
}
const judge = await import(new URL("../tests/walls/ts/lib/models-lib-sync-judge.ts", import.meta.url));

const families = judge.familyDirs();
const rows = {};
const failures = [];
for (const pkgDir of families) {
  const rel = basename(pkgDir);
  try {
    if (!existsSync(join(pkgDir, "lib"))) {
      failures.push(`${rel}: ships no lib — run \`pnpm run build\` in packages/models/${rel} first`);
      continue;
    }
    const drifts = judge.judgeFamily(pkgDir);
    if (drifts.length > 0) {
      failures.push(`${rel}: STALE — run \`pnpm run build\` in packages/models/${rel}, commit the lib, then re-run this script\n` +
        drifts.map((d) =>
          `  [${d.program}] stale (src moved, lib did not): ${d.stale.join(", ") || "—"}\n  [${d.program}] unemitted (src removed, lib still serves): ${d.unemitted.join(", ") || "—"}`,
        ).join("\n"));
      continue;
    }
    const srcHash = judge.familySrcHash(pkgDir);
    const libHash = judge.familyLibHash(pkgDir);
    rows[rel] = { srcHash, libHash };
    console.log(`  ${rel}: fresh (srcHash ${srcHash.slice(0, 12)}, libHash ${libHash.slice(0, 12)})`);
  } catch (err) {
    failures.push(`${rel}: the judge refuses — ${err instanceof Error ? err.message : String(err)}`);
  }
}
if (failures.length > 0) {
  console.error(`models-lib-sync-manifest: ${failures.length} family(ies) are not fresh — the manifest is judge-gated and was NOT written:`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
const manifest = `${JSON.stringify({ version: 1, families: rows }, null, 2)}\n`;
writeFileSync(judge.MANIFEST_PATH, manifest);
console.log(`models-lib-sync-manifest: wrote ${Object.keys(rows).length} row(s) to ${relative(process.cwd(), judge.MANIFEST_PATH)} — commit it alongside the lib tree it judged`);
