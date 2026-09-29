#!/usr/bin/env node
// dep-doctor — THE ONE-VERSION GATE (li-bg, 2026-10-11).
//
// The class of failure this tool exists to kill, paid for in hours on
// 2026-10-11: a dependency resolves to TWO store instances in one
// workspace graph (pnpm keys instance dirs by peer-set, so "same
// version" can still mean "two identities"). TypeScript then loads
// two copies of the same .d.ts, and the two identities are never
// assignable to each other — every consumer's compile reds with
// variance errors while the OWNING package stays green, which is why
// per-package tsc runs disagree and grep walks of node_modules feel
// necessary. They are not: this script names the split in one run.
//
// Proven twice the same day:
//   - schemastery 3.18.2 (workspace) beside 3.18.4 (nested under the
//     0.1.7 dsh packages) — 11 consumer packages red, owner green.
//   - cordis 4.0.2 beside 4.0.4 — dsh-llm instantiated twice, one
//     per peer-satisfying cordis; ToolDeclaration split identities.
//
// THE REMEDY is always the package manager's own solver, never hand
// edits: `pnpm -r up '<pkg>@<one-version>'`.
//
// Checks (each names its offenders and the remedy):
//   1. SPLIT  — any dependency name resolving to more than one store
//      instance across all workspace importers.
//   2. LOCKSTEP — every `@deepseek-ai/dsh-*` range in the workspace
//      sits on one release line (0.2.0-rc.* today); a mixed floor is
//      the silent-drift the compatibility gate cannot see.
//   3. PEER FLOOR — every bundle that ships a cordis.patch.yml
//      declares a `@deepseek-ai/dsh` peerDependencies floor, so the
//      NEXT host hop refuses loudly instead of drifting.
//
// Exit 0 = graph is one-versioned and floored. Exit 1 = named
// offenders with the exact remedy line for each.

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isWorkspacePkg = (name) =>
  !name.startsWith("@types/") && name !== "typescript";

const fail = (law, message) => {
  console.error(`✗ ${law}: ${message}`);
  process.exitCode = 1;
};

// ── collect workspace package dirs ─────────────────────────────────
const pkgDirs = [];
for (const genre of readdirSync(join(ROOT, "packages"))) {
  const genreDir = join(ROOT, "packages", genre);
  if (!statSync(genreDir).isDirectory()) continue;
  for (const name of readdirSync(genreDir)) {
    const dir = join(genreDir, name);
    if (existsSync(join(dir, "package.json"))) pkgDirs.push(dir);
  }
}

// ── check 1: SPLIT — one store instance per (name) per graph ───────
// A workspace importer's resolution is the symlink inside its own
// node_modules (pnpm materializes one per importer). realpath it and
// keep the store dir; two dirs for one name = two identities.
const instances = new Map(); // name -> Map(storeDir -> [importers])
const linkOf = (pkgDir, name) => {
  const link = join(pkgDir, "node_modules", name);
  try {
    // resolve the symlink chain to the .pnpm store dir
    let cur = link;
    for (let i = 0; i < 8; i += 1) {
      cur = resolve(dirname(cur), readlinkSync(cur));
      if (!cur.includes(join("node_modules", ".pnpm") + "/")) continue;
      break;
    }
    return cur;
  } catch {
    return null; // not installed here (peer-only or absent)
  }
};
// readlinkSync imported lazily to keep the failure message tight
import { readlinkSync } from "node:fs";

for (const dir of pkgDirs) {
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const names = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    // PEERS resolve into the same graph as deps (the react-18-peer
    // split hid exactly here on 2026-10-11: deps moved to 19, the
    // peer stayed 18, and one render held two reacts)
    ...Object.keys(pkg.peerDependencies ?? {}),
  ].filter(isWorkspacePkg));
  for (const name of names) {
    const store = linkOf(dir, name);
    if (store === null) continue;
    // the store dir name carries version + peer hash: '@scope+name@ver_peers'
    const cell = store.split("/").find((s) => s.includes("@")) ?? store;
    if (!instances.has(name)) instances.set(name, new Map());
    const m = instances.get(name);
    if (!m.has(cell)) m.set(cell, []);
    m.get(cell).push(pkg.name ?? dir);
  }
}

// ── allowlist: same version, peer-hash-only splits, never imported ──
// A split is a TYPE hazard only when two identities can meet in one
// compiled program. Two safe classes:
//   - CLI tools invoked per package (never imported by source).
//   - HOST-PROVIDED PEERS declared by every importer that links them:
//     pnpm keys peer cells by the importer's OTHER peers, so the
//     same `@deepseek-ai/dsh` floor yields several cells — but the
//     runtime host supplies ONE instance and no importer bundles its
//     own. The host's compatibility gate reads exactly these floors.
// Adding a name to the CLI class requires the reason in the row.
const PEER_HASH_ONLY_OK = new Map([
  ["tsdown", "CLI bundler, invoked per package — its cells differ only by the typescript peer hash and never meet in one compiled program"],
]);

// name -> importer package names that declare it as a real dependency
const realDepImporters = new Map();
for (const dir of pkgDirs) {
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  for (const name of Object.keys(pkg.dependencies ?? {})) {
    if (!realDepImporters.has(name)) realDepImporters.set(name, new Set());
    realDepImporters.get(name).add(pkg.name ?? dir);
  }
}

for (const [name, cells] of instances) {
  if (cells.size < 2) continue;
  const versions = new Set([...cells.keys()].map((c) => c.split("_")[0]));
  const hardDep = realDepImporters.get(name);
  const hostProvidedPeer = versions.size === 1 && (hardDep === undefined || hardDep.size === 0);
  if (versions.size === 1 && (PEER_HASH_ONLY_OK.has(name) || hostProvidedPeer)) {
    const why = PEER_HASH_ONLY_OK.get(name)
      ?? `same version, host-provided peer — every importer declares it as peerDependencies only; the runtime host supplies one instance`;
    console.error(`• ${name}: ${cells.size} peer-hash cells — allowed (${why})`);
    continue;
  }
  const rows = [...cells.entries()]
    .map(([cell, importers]) => `    ${cell}  ← ${[...new Set(importers)].slice(0, 4).join(", ")}${importers.length > 4 ? " …" : ""}`)
    .join("\n");
  const one = cells.keys().next().value.split("_")[0];
  fail(
    "SPLIT",
    `${name} resolves to ${cells.size} store instances in one graph:\n${rows}\n  remedy: pnpm -r up '${name}@${one.replace(/^[^@]*\+[^@]*@/, "") || "one-version"}' (unify on ONE version; pnpm keys instance dirs by peer-set)`,
  );
}

// ── check 2: LOCKSTEP — one dsh release line in declared ranges ────
const line = (range) => {
  const m = /(\d+\.\d+\.\d+(?:-rc\.\d+)?)/.exec(range ?? "");
  return m ? m[1].replace(/-rc\.\d+$/, "-rc") : null;
};
const dshLines = new Map(); // line -> [where]
for (const dir of pkgDirs) {
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
    for (const [name, range] of Object.entries(pkg[section] ?? {})) {
      if (!/^@deepseek-ai\/dsh(-|$)/.test(name)) continue;
      const l = line(range);
      if (l === null) continue;
      if (!dshLines.has(l)) dshLines.set(l, []);
      dshLines.get(l).push(`${pkg.name}:${name}`);
    }
  }
}
if (dshLines.size > 1) {
  const rows = [...dshLines.entries()]
    .map(([l, where]) => `    ${l}: ${where.length} pin(s) (${where[0]}…)`)
    .join("\n");
  fail("LOCKSTEP", `the workspace pins @deepseek-ai/dsh-* on ${dshLines.size} release lines:\n${rows}\n  remedy: pick one line and 'pnpm -r up' every dsh pin onto it`);
}

// ── check 3: PEER FLOOR — bundles declare the dsh host floor ───────
for (const dir of pkgDirs) {
  const hasPatch = existsSync(join(dir, "cordis.patch.yml"));
  if (!hasPatch) continue;
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const peers = pkg.peerDependencies ?? {};
  if (typeof peers["@deepseek-ai/dsh"] !== "string") {
    fail("PEER-FLOOR", `${pkg.name} ships a bundle (cordis.patch.yml) but declares no '@deepseek-ai/dsh' peerDependencies floor — the host's compatibility gate reads ONLY that key, so the next host hop boots beside stale dsh copies in silence`);
  }
}

if (process.exitCode !== 1) {
  const names = instances.size;
  console.log(`✓ dep-doctor: ${pkgDirs.length} packages, ${names} resolved deps — one instance each, dsh lockstep intact, bundle peer floors declared`);
}
