#!/usr/bin/env node
// tsc-path.mjs — THE ONE COMPILER DERIVATION for the repo tier
// (the ship playbook's typecheck and scripts/typecheck-tests.mjs).
//
// Both callers used to name a pnpm store path literally (the store's
// typescript@5.7.3 directory). That path is a lockfile
// artifact: the next typescript bump leaves it dangling and the
// repo tier dies with ENOENT — the dangling-alias class the root
// vitest config already derives its way out of for React.
//
// The derivation follows the WORKSPACE, not a version literal: the
// compiler the majority of workspace packages resolve to (their own
// node_modules/typescript link) is the workspace's compiler, and
// the tally moves with the lockfile. Store-highest is the fallback
// (a lockfile where no package links typescript), then PATH, then a
// loud refusal. It prints the absolute tsc path on stdout.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = join(fileURLToPath(import.meta.url), "..", "..");

/** Numeric semver compare (a bare x.y.z store dir name). */
function newer(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  }
  return false;
}

/** The store's tsc for one version, or null when it is not installed. */
function storeBin(version) {
  const bin = join(REPO, "node_modules", ".pnpm", `typescript@${version}`, "node_modules", "typescript", "bin", "tsc");
  return existsSync(bin) ? bin : null;
}

/** The version every workspace package resolves, tallied. */
function workspaceTally() {
  const tally = new Map();
  let pkgs;
  try {
    pkgs = readdirSync(join(REPO, "packages"), { withFileTypes: true });
  } catch {
    return tally;
  }
  for (const group of pkgs) {
    if (!group.isDirectory()) continue;
    let members;
    try {
      members = readdirSync(join(REPO, "packages", group.name), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const member of members) {
      if (!member.isDirectory()) continue;
      const manifest = join(REPO, "packages", group.name, member.name, "node_modules", "typescript", "package.json");
      if (!existsSync(manifest)) continue;
      try {
        const version = JSON.parse(readFileSync(manifest, "utf8")).version;
        if (typeof version === "string") tally.set(version, (tally.get(version) ?? 0) + 1);
      } catch {
        /* an unreadable link names no version */
      }
    }
  }
  return tally;
}

const tally = workspaceTally();
let winner = null;
let winnerCount = 0;
for (const [version, count] of tally) {
  if (storeBin(version) === null) continue;
  if (count > winnerCount || (count === winnerCount && winner !== null && newer(version, winner))) {
    winner = version;
    winnerCount = count;
  }
}
if (winner !== null) {
  process.stdout.write(storeBin(winner) + "\n");
  process.exit(0);
}
// no workspace link resolved: fall back to the store's highest
const store = join(REPO, "node_modules", ".pnpm");
let best = null;
let bestVersion = null;
if (existsSync(store)) {
  for (const entry of readdirSync(store)) {
    const m = /^typescript@(\d+\.\d+\.\d+)$/u.exec(entry);
    if (m === null) continue;
    const bin = storeBin(m[1]);
    if (bin === null) continue;
    if (bestVersion === null || newer(m[1], bestVersion)) {
      best = bin;
      bestVersion = m[1];
    }
  }
}
if (best !== null) {
  process.stdout.write(best + "\n");
  process.exit(0);
}
try {
  const onPath = execFileSync("command", ["-v", "tsc"], { encoding: "utf8", shell: "/bin/bash" }).trim();
  if (onPath !== "") {
    process.stdout.write(onPath + "\n");
    process.exit(0);
  }
} catch {
  /* no PATH compiler either — the refusal below names the cure */
}
console.error("tsc-path: no typescript compiler found (no workspace link, no node_modules/.pnpm/typescript@*, no tsc on PATH) — run pnpm install");
process.exit(1);
