// regen-extension-manifest — THE SHIPPED EXTENSION MANIFEST GENERATOR.
// Runs the SAME derivation the dev CLI walks (mergeManifest over the
// checkout's packages/**/nodes.yaml|extensions.yaml) and writes the
// COMMITTED data file the declaration plane reads at runtime
// (data/extension-manifest.json — the model-facts.json pattern: a
// derived artifact, shipped in the npm `files` `data/**`, read
// packageRoot-anchored so an installed profile serves every declared
// extension id without a packages tree; audit 019 C1/F1).
//
// Run: pnpm --filter @melite/comfyui-cordis run regen:extension-manifest
// Drift is a loud diff at regen time (git), never a silent fallback at
// run time: the runtime read refuses when the file is missing, and the
// walls suite re-derives and refuses divergence.

import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeManifest } from "./provision-extensions-manifest.ts";

const here: string = dirname(fileURLToPath(import.meta.url));
// src→comfyui-cordis→engines→packages→repo — the same checkout the
// walker's own paths are relative to.
const repoRoot: string = resolve(here, "..", "..", "..", "..");
const outPath: string = join(repoRoot,
  "packages", "engines", "comfyui-cordis", "data", "extension-manifest.json");

function fail(msg: string): never {
  process.stderr.write("regen-extension-manifest: " + msg + "\n");
  process.exit(1);
}

const rows = mergeManifest(repoRoot);
if (rows.length === 0) {
  fail("the derivation merged ZERO extension rows over " + repoRoot +
    " — refusing to ship an empty manifest (that is the audit-019 F1" +
    " state by construction; a lost nodes.yaml tree is a loud regen" +
    " failure, never a quiet zero-row ship)");
}
// Stable bytes: the derivation is already ordered (findNodesYaml sorts
// by plugin id, rows ride file order), so the committed diff is the
// semantic diff.
writeFileSync(outPath, JSON.stringify(rows, null, 2) + "\n");
process.stdout.write("regen-extension-manifest: wrote " + String(rows.length) +
  " rows -> " + outPath + "\n");
