// workspace-cycles.mjs — the workspace-acyclicity judge.
//
// Walks every workspace manifest under <root>/packages (two and three
// path segments), builds the dependency graph from the three manifest
// sections pnpm's cyclic detector counts (dependencies,
// devDependencies, peerDependencies) restricted to workspace-protocol
// edges, and reports cycles. Exit 1 with the cycle named when any
// exists; exit 0 with the census line when none does. The wall
// (tests/walls/ts/suites/workspace-acyclicity.spec.ts) drives this on
// the LIVE tree and on a synthetic two-cell cycle so the judgment
// itself is proven to fire.
//
// Background: the 2026-10-13 cure moved the plugin contracts (card
// definition, model decl, service faces) into the leaf tier
// (@melite/comfyui-card-kit) so plugin packages import the owner
// directly and the engine's manifests no longer reach back into the
// tree that registers into it. This script is the standing judge for
// that shape: any future manifest edge that rebuilds a cycle reddens
// the wall the same way pnpm's WARN did.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..");

// The member set: every package.json at packages/<a>/<b> or
// packages/<a>/<b>/<c>, node_modules excluded (pnpm's own layout
// never places workspace manifests there, but a synthetic tree might
// nest anything). Git-tracked listing when the root is a work tree
// (the live tree); a plain filesystem walk otherwise (synthetic
// trees the wall builds under /tmp carry no git).
function listManifests(root) {
  try {
    const out = execFileSync(
      "git",
      ["ls-files", "packages/**/*/package.json", "packages/**/**/*/package.json"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    )
      .split("\n")
      .filter(Boolean)
      .map((p) => join(root, p))
      .filter((p) => !p.includes("node_modules") && existsSync(p));
    if (out.length > 0) return out;
  } catch {
    // not a git work tree — walk below
  }
  const found = [];
  const walkDir = (dir, depth) => {
    if (depth > 4 || dir.includes("node_modules")) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "node_modules") continue;
      const child = join(dir, entry.name);
      const manifest = join(child, "package.json");
      if (existsSync(manifest)) found.push(manifest);
      walkDir(child, depth + 1);
    }
  };
  walkDir(join(root, "packages"), 0);
  return found;
}

const SECTIONS = ["dependencies", "devDependencies", "peerDependencies"];
const isWorkspaceEdge = (spec) => typeof spec === "string" && spec.startsWith("workspace:");

const adj = new Map();
const nameOfFile = new Map();
for (const file of listManifests(ROOT)) {
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  nameOfFile.set(manifest.name, file);
  const deps = [];
  for (const section of SECTIONS) {
    for (const [dep, spec] of Object.entries(manifest[section] ?? {})) {
      if (isWorkspaceEdge(spec) && !deps.includes(dep)) deps.push(dep);
    }
  }
  adj.set(manifest.name, deps);
}

// DFS back-edge detection with the path preserved for the report.
const cycles = [];
const state = new Map(); // 1 = on stack, 2 = done
const walk = (node, path) => {
  if (state.get(node) === 2) return;
  if (state.get(node) === 1) {
    const start = path.indexOf(node);
    if (start !== -1) cycles.push(path.slice(start));
    return;
  }
  state.set(node, 1);
  for (const dep of adj.get(node) ?? []) {
    if (path.length > 32) break; // safety: the report needs a path, not the ocean
    walk(dep, [...path, dep]);
  }
  state.set(node, 2);
};
for (const node of adj.keys()) walk(node, [node]);

if (cycles.length > 0) {
  const seen = new Set();
  console.error(`✗ workspace-cycles: ${cycles.length} cycle(s) in ${adj.size} packages`);
  for (const cycle of cycles) {
    const key = [...cycle].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    console.error(`  cycle: ${cycle.join(" → ")} → ${cycle[0]}`);
  }
  process.exit(1);
}
const edges = [...adj.values()].reduce((n, ds) => n + ds.length, 0);
console.log(`✓ workspace-cycles: none (${adj.size} packages, ${edges} workspace edges)`);
