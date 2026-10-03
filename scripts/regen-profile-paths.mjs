#!/usr/bin/env node
// regen-profile-paths — repin the profile ymls' absolute paths to
// THIS checkout. The cordis ymls name plugin files and run roots by
// absolute path (the dsh profile contract), so a fresh clone runs this
// once after pnpm install. package.json links are already relative and
// need nothing. Node, not bash: the clone path runs on Windows,
// macOS, and Linux unchanged (operator law, 2026-10-12).
//
// usage: node scripts/regen-profile-paths.mjs   (from anywhere in the repo)
// MELITE_PREV_REPO_ROOT (optional) repins from a moved checkout whose
// directory is not named inference.cpp.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  cwd: here,
  encoding: "utf8",
}).trim();
const prev = process.env.MELITE_PREV_REPO_ROOT ?? "";

// An absolute pin is a token starting with `/` (or a Windows drive
// root) whose path contains the repo directory name; the tail after
// the repo root is preserved, prose mentions are untouched. Paths are
// written with forward slashes — valid on every OS node supports.
const pin = (text) =>
  text.replace(/(?:[A-Za-z]:[\\/]|\/)[^\s"']*inference\.cpp([^\s"']*)/g,
    (_m, tail) => join(repo, tail.replace(/^[\\/]+/, "")).split("\\").join("/"));

for (const name of ["cordis.base.yml", "cordis.patch.yml"]) {
  const file = join(repo, "profile", name);
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (prev) text = text.split(prev.split("\\").join("/")).join(join(repo).split("\\").join("/"));
  text = pin(text);
  writeFileSync(file, text);
  console.log(`repinned: ${file}`);
}
