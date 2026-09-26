#!/usr/bin/env node --experimental-strip-types
// arch-lint — the estate boundary-drift linter (TS port of
// tools/arch_lint.py, deleted at the NO-ESTATE-PYTHON cut,
// 2026-09-08).
//
// The four contracts (each maps to an operator law):
//   1. core_is_generic         python/ must not import from packages/, vendor/, or references/
//   2. plugins_are_independent  the three plugin groups (engines, harness, web) do not import each other
//   3. vendor_packs_isolated   each vendor/comfyui_extensions/<pack> is its own repo
//   4. references_is_study_only references/ is read-only -- no one imports it
//
// Same-in/same-out on today's tree: contract logic is UNCHANGED,
// including the top-group names the STRUCTURE STAGE 1 rename left
// behind ("py"/"plugins" match nothing — those two contracts are
// vacuous until the walls lane re-truths them; re-truthing is a
// design act, not a port act).
//
// Python imports are collected by line regex (import x / from x
// import — the old tool used ast; the shapes below cover the
// estate's declaration-style imports), TS specifiers by the same
// from/require quoted-spec regex. Files are read as text — never
// executed.
//
// Run: node --experimental-strip-types tools/arch-lint.ts [--quiet]
// Exit: 0 clean, 1 any violations.
//
// Erasable-syntax TS only: no enums, no namespaces.

import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { join, resolve, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE: string = dirname(fileURLToPath(import.meta.url));
const REPO: string = resolve(HERE, "..");

const SKIP_DIRS: ReadonlySet<string> = new Set([".git", "node_modules",
  ".venv", "data", "__pycache__", "dist", "build",
  ".import_linter_cache"]);

const TS_RE = /(?:from\s+|require\s*\(\s*)['"]([^'"]+)['"]/g;

interface ImportRow {
  path: string;
  line: number;
  mod: string;
  resolved?: string;
}

function* iterSourceFiles(root: string): Generator<[string, string]> {
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    let ents: Array<{ n: string; d: boolean }>;
    try {
      ents = readdirSync(dir, { withFileTypes: true })
        .map((e) => ({ n: e.name, d: e.isDirectory() }));
    } catch { continue; }
    for (const e of ents) {
      if (e.d) {
        if (!SKIP_DIRS.has(e.n)) stack.push(join(dir, e.n));
        continue;
      }
      if (e.n.endsWith(".py")) yield [join(dir, e.n), "py"];
      else if (/\.(ts|tsx|mjs|js)$/.test(e.n)) yield [join(dir, e.n), "ts"];
    }
  }
}

function real(p: string): string {
  // Mirrors Path.resolve in the old tool: symlinks (vendor
  // submodules, workspace links) resolve before grouping.
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

function* collectImports(path: string,
    language: string): Generator<ImportRow> {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch { return; }
  if (language === "py") {
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].split("#")[0];
      let m = /^\s*from\s+(\S+)\s+import\s+/.exec(line);
      if (m) {
        const mod = m[1];
        yield { path, line: i + 1, mod };
        continue;
      }
      m = /^\s*import\s+(.+)$/.exec(line);
      if (m) {
        for (const part of m[1].split(",")) {
          const name = part.trim().split(/\s+as\s+/)[0]?.trim() ?? "";
          if (name) yield { path, line: i + 1, mod: name };
        }
      }
    }
  } else {
    TS_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TS_RE.exec(text)) !== null) {
      const spec = m[1];
      if (!spec) continue;
      const line = text.slice(0, m.index).split("\n").length;
      if (spec.startsWith(".")) {
        const target = resolve(dirname(path), spec);
        const top = topGroup(target);
        if (top) yield { path, line, mod: top + "/<relative>", resolved: target };
      } else {
        yield { path, line, mod: spec };
      }
    }
  }
}

function topGroup(abs: string): string | null {
  const rel = relative(REPO, abs);
  if (rel.startsWith("..")) return null;
  const head = rel.split(sep)[0] ?? "";
  if (head === "py" || head === "packages" || head === "vendor" ||
      head === "references") return head;
  return null;
}

function pluginsSubgroup(abs: string): string | null {
  const rel = relative(join(REPO, "packages"), abs);
  if (rel.startsWith("..")) return null;
  const parts = rel.split(sep);
  if (parts.length < 2) return null;
  return parts[1];
}

function vendorPack(abs: string): string | null {
  const rel = relative(join(REPO, "vendor", "comfyui_extensions"), abs);
  if (rel.startsWith("..")) return null;
  const parts = rel.split(sep);
  if (parts.length === 0) return null;
  return parts[0];
}

// Re-truthed 2026-09-10 (ledger row 37): the py tree is deleted — the
// contract was permanently vacuous (topGroup "py" never matched). The
// LIVE generic-core surface is packages/gateway/core: the verticals
// (engines, models, web, web-kit, harness, genre dirs) may depend on
// core, never the reverse.
const VERTICAL_GROUPS: readonly string[] = ["engines", "models", "web",
  "web-kit", "harness", "3d", "audio", "image", "motion", "video"];

function underGatewayCore(abs: string): boolean {
  const rel = relative(join(REPO, "packages", "gateway", "core"), abs);
  return rel !== "" && !rel.startsWith("..");
}

function contractCoreIsGeneric(rows: ImportRow[]): ImportRow[] {
  const out: ImportRow[] = [];
  for (const r of rows) {
    if (!underGatewayCore(resolve(r.path))) continue;
    if (r.mod.endsWith("/<relative>")) {
      const top = r.mod.split("/")[0];
      if (top !== "gateway" && VERTICAL_GROUPS.includes(top)) {
        out.push({ path: r.path, line: r.line,
          mod: "core is generic: relative import lands in packages/" + top });
      }
    }
  }
  return out;
}

function contractPluginsAreIndependent(rows: ImportRow[]): ImportRow[] {
  const groupToId: Record<string, string> = { engines: "comfyui",
    harness: "dsh", web: "editor" };
  const out: ImportRow[] = [];
  // Re-truthed 2026-09-10 (ledger row 37): gated on the dead "plugins"
  // top-group (never true post-reorg — topGroup only answers
  // py/packages/vendor/references). The law is unchanged: a package
  // under packages/<group>/ imports another group by its public
  // @melite/* name, never by relative crossing.
  for (const r of rows) {
    if (topGroup(resolve(r.path)) !== "packages") continue;
    if (r.mod.startsWith("@melite/")) continue;
    if (r.mod.endsWith("/<relative>")) {
      const other = r.mod.split("/")[0];
      if (other === "web") continue;
    }
    if (r.mod.endsWith("/<relative>")) {
      const other = r.mod.split("/")[0];
      if (other in groupToId) {
        const mine = pluginsSubgroup(resolve(r.path));
        if (mine && mine !== other) {
          out.push({ path: r.path, line: r.line,
            mod: "plugins are independent: relative import into " +
              "packages/" + other + "/ from packages/" + mine + "/" });
        }
      }
    }
  }
  return out;
}

function contractVendorPacksIsolated(rows: ImportRow[]): ImportRow[] {
  const out: ImportRow[] = [];
  for (const r of rows) {
    if (topGroup(resolve(r.path)) !== "vendor") continue;
    const mine = vendorPack(resolve(r.path));
    if (!mine) continue;
    if (r.mod.endsWith("/<relative>") && r.resolved !== undefined) {
      const target = real(r.resolved);
      const rel = relative(join(REPO, "vendor", "comfyui_extensions", mine), target);
      if (rel === ".." || rel.startsWith(".." + sep)) {
        const other = vendorPack(target);
        out.push({ path: r.path, line: r.line,
          mod: "vendor packs isolated: relative import from pack " +
            JSON.stringify(mine) + " into " + JSON.stringify(other ?? target) });
      }
    }
  }
  return out;
}

function contractReferencesIsStudyOnly(rows: ImportRow[]): ImportRow[] {
  const out: ImportRow[] = [];
  for (const r of rows) {
    if (!r.mod.startsWith("references")) continue;
    if (topGroup(resolve(r.path)) === "references") continue;
    out.push({ path: r.path, line: r.line,
      mod: "references is study-only: " + JSON.stringify(r.mod) });
  }
  return out;
}

const CONTRACTS: ReadonlyArray<readonly [string, string,
  (rows: ImportRow[]) => ImportRow[]]> = [
  ["core_is_generic",
    "python/ is generic -- the gateway names no lane, no engine",
    contractCoreIsGeneric],
  ["plugins_are_independent",
    "the three plugin groups (engines, harness, web) do not import each other",
    contractPluginsAreIndependent],
  ["vendor_packs_isolated",
    "each vendor/comfyui_extensions/<pack> is its own repo",
    contractVendorPacksIsolated],
  ["references_is_study_only",
    "references/ is read-only study -- no one imports it",
    contractReferencesIsStudyOnly],
];

function main(): number {
  const quiet = process.argv.slice(2).includes("--quiet");
  if (!quiet) console.log("arch-lint: scanning " + REPO);
  const all: ImportRow[] = [];
  for (const [path, lang] of iterSourceFiles(REPO)) {
    const rp = real(path);
    for (const row of collectImports(rp, lang)) all.push(row);
  }
  let total = 0;
  for (const [name, doc, fn] of CONTRACTS) {
    const v = fn(all);
    if (v.length > 0) {
      console.log("\n[" + name + "] BROKEN -- " + doc);
      for (const r of v) {
        console.log("  " + relative(REPO, r.path) + ":" + r.line +
          "  " + r.mod);
      }
      total += v.length;
    } else if (!quiet) {
      console.log("[" + name + "] OK");
    }
  }
  if (total > 0) {
    console.log("\n" + total + " violation(s) across " + CONTRACTS.length +
      " contract(s)");
    return 1;
  }
  if (!quiet) console.log("\nall contracts clean");
  return 0;
}

process.exit(main());
