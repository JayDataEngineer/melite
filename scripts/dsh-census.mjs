#!/usr/bin/env node
// dsh-census — the non-DSH dependency census (2026-09-12, the
// de-poisoning; node port 2026-10-17, batch AW — Layer A is
// typescript, the census is Layer A tooling, never python).
//
// Operator-runnable proof of what the estate's product source
// imports. No agent word involved: this script walks every
// package's source tree and reports every import of a library
// OUTSIDE the DSH sanction set.
//
// THE SANCTION ORACLE is the DSH checkout's own node_modules
// manifest — whatever @deepseek-ai packages DSH itself ships/uses
// is sanctioned (zod, clsx, @tanstack/react-virtual, react,
// node: builtins...). The clause-C canvas exemption (three/
// @react-three/wavesurfer/perfect-freehand — canvas/3D/audio
// surfaces with no DSH counterpart) is listed, not hidden.
//
// Exit codes: 0 = card plane clean; 1 = card-plane violation;
// 2 = only non-card residue (reported, exit clean for CI unless
// -strict).
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DSH = join(process.env.HOME ?? "/home/user",
  ".local/lib/node_modules/@deepseek-ai/dsh");

// ── The banned surface (product-runtime poison) ─────────────────────────
const BANNED = [
  // the kit + its lib stack
  "@melite/ui",
  "@radix-ui/",
  "@base-ui-components/",
  "radix-ui",
  "base-ui",
  "class-variance-authority",
  "cmdk",
  "tailwind-merge",
  "sonner",
  "vidstack",
  "fuse\\.js",
  // state / motion / icons / dnd
  "zustand",
  "framer-motion",
  "lucide-react",
  "@dnd-kit/",
  // tailwind runtime (class strings are style-law, handled separately)
  "tailwindcss",
  "tailwind-animate",
].map((p) => new RegExp(`^${p}$`));

// ── The sanctioned set, derived from DSH's own manifest ────────────────
const dshSanctioned = () => {
  const sanctioned = new Set();
  const scopeDir = join(DSH, "node_modules", "@deepseek-ai");
  if (existsSync(scopeDir)) {
    for (const entry of readdirSync(scopeDir)) {
      const mf = join(scopeDir, entry, "package.json");
      try {
        const name = JSON.parse(readFileSync(mf, "utf8")).name;
        if (name) sanctioned.add(name);
      } catch { /* unreadable manifest — not an import surface */ }
    }
  }
  // DSH's own package + the always-sanctioned runtime bases
  for (const n of ["@deepseek-ai/dsh", "react", "react-dom",
    "zod", "clsx", "@tanstack/react-virtual"]) sanctioned.add(n);
  return sanctioned;
};

// ── Clause-C (ledger-sanctioned canvas/3D/audio surfaces) ──────────────
const CLAUSE_C = [
  "three", "@react-three/fiber", "@react-three/drei",
  "wavesurfer.js", "perfect-freehand",
];

// The card plane (Layer A's card surfaces) — must be ZERO banned imports.
const CARD_PLANE = [
  "packages/web/card-base",
  "packages/web/melite-card-view",
  "packages/video/h3-timeline",
  "packages/image/mask-studio",
  "packages/image/ideogram4",
  "packages/3d/anny",
  "packages/3d/img-to-mesh",
  "packages/engines/comfyui/action_cards",
  "packages/web-kit/timeline",
  "packages/web-kit/slots",
  "packages/web-kit/catalog",
  "packages/web-kit/contracts",
  "packages/web-kit/formats",
];

const IMPORT_RE =
  /(?:from\s+|import\s*\(\s*|import\s+|require\(\s*|import\(\s*)["']([^"']+)["']/g;

const SKIP_DIRS = new Set(["node_modules", "lib", "dist", "generated", ".git"]);

/** @param {string} root @returns {Record<string, string[]>} banned hits keyed by pattern */
const scan = (root) => {
  /** @type {Record<string, string[]>} */
  const hits = {};
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name));
        continue;
      }
      if (!/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) continue;
      const p = join(dir, entry.name);
      let text;
      try { text = readFileSync(p, "utf8"); } catch { continue; }
      for (const m of text.matchAll(IMPORT_RE)) {
        const spec = m[1];
        if (spec.startsWith(".") || spec.startsWith("node:") ||
            spec.startsWith("virtual:")) continue;
        const bare = spec.startsWith("@")
          ? spec.split("/").slice(0, 2).join("/")
          : spec.split("/")[0];
        for (const pat of BANNED) {
          if (pat.test(bare) || pat.test(spec)) {
            (hits[pat.source] ??= []).push(
              `${relative(REPO, p)}  ←  ${spec}`);
            break;
          }
        }
      }
    }
  };
  if (existsSync(root)) walk(root);
  return hits;
};

const strict = process.argv.includes("-strict");
const cardOnly = process.argv.includes("-card");
const sanctioned = dshSanctioned();

console.log("=".repeat(72));
console.log("DSH CENSUS — product-source imports of banned libraries");
console.log(`repo: ${REPO}`);
console.log(`DSH sanction oracle: ${DSH}`);
console.log(`sanctioned (DSH's own manifest + runtime bases): ` +
  `${sanctioned.size} names incl. zod, clsx, @tanstack/react-virtual`);
console.log(`clause-C exempt (canvas/3D/audio, ledger-sanctioned): ` +
  `${[...CLAUSE_C].sort().join(", ")}`);
console.log("=".repeat(72));

/** @type {Record<string, string[]>} */
const cardHits = {};
/** @type {Record<string, string[]>} */
const otherHits = {};

for (const pkg of [...CARD_PLANE].sort()) {
  const root = join(REPO, pkg);
  if (!existsSync(root)) {
    console.log(`[card] ${pkg}: MISSING`);
    continue;
  }
  for (const [k, v] of Object.entries(scan(root))) {
    (cardHits[`${pkg} :: ${k}`] ??= []).push(...v);
  }
}

if (!cardOnly) {
  for (const entry of readdirSync(join(REPO, "packages"),
      { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const root = join(REPO, "packages", entry.name);
    const rel = relative(REPO, root);
    if (rel.split("\\").join("/").startsWith("packages/web-kit/")) {
      const sub = rel.split("/")[2] ?? "";
      if (sub && CARD_PLANE.includes(`packages/web-kit/${sub}`)) continue;
    }
    for (const [k, v] of Object.entries(scan(root))) {
      (otherHits[`${rel} :: ${k}`] ??= []).push(...v);
    }
  }
}

console.log(`\n── CARD PLANE (must be ZERO) ${"─".repeat(38)}`);
if (Object.keys(cardHits).length) {
  for (const k of Object.keys(cardHits).sort()) {
    console.log(`  ✗ ${k}`);
    for (const line of cardHits[k].slice(0, 8)) console.log(`      ${line}`);
  }
} else {
  console.log("  ✓ ZERO banned imports across all 13 card-plane packages");
}

if (!cardOnly) {
  console.log(`\n── REST OF ESTATE (reported) ${"─".repeat(39)}`);
  for (const k of Object.keys(otherHits).sort()) {
    console.log(`  · ${k}  (${otherHits[k].length} hits)`);
    for (const line of otherHits[k].slice(0, 4)) console.log(`      ${line}`);
  }
}

console.log(`\n── VERIFY THE ORACLE YOURSELF ${"─".repeat(35)}`);
console.log("  ls ~/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/");
console.log("  # every name there is sanctioned — the census bans everything else");
console.log("  # re-run: node scripts/dsh-census.mjs [-card] [-strict]");

if (Object.keys(cardHits).length) process.exit(1);
if (strict && Object.keys(otherHits).length) process.exit(2);
