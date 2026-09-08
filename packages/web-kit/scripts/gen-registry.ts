// gen-registry — regenerate packages/web-kit/generated/registry.json,
// THE component catalog (the shadcn method's registry.json).
//
// TS port of tools/gen_registry.py (deleted at cut): the SSOT is TS
// package exports, so a python scanner for TS sources was the wrong
// home. Same-in/same-out: the committed registry.json is the golden —
// this script must emit it byte-identical (dual-run rule: any
// non-empty diff fails the wall, never updates the golden).
//
// THE LAW (unchanged from the py original):
//   * the catalog is a DERIVED ARTIFACT. The package exports are the
//     SSOT; the registry is their machine-readable face. Hand edits
//     are drift; the parity check (--check, exit 1 on drift) pins it.
//   * item types mirror shadcn: registry:ui (a primitive) and
//     registry:block (a composition built from primitives).
//   * ANYONE CAN HOST A CATALOG (the fork mechanic): every
//     packages/engines/<engine>/ui/ and
//     packages/engines/<engine>/action_cards/<genre>/ui/ package may
//     carry its own registry.json fragment; the composed catalog
//     merges core + every fragment.
//   * the boundary gate consumes this file: a tenant importing a
//     component NOT in the composed catalog fails the gate.
//
// Usage:
//   node --experimental-strip-types packages/web-kit/scripts/gen-registry.ts --check
//   node --experimental-strip-types packages/web-kit/scripts/gen-registry.ts --write
//
// (Bare invocation is the dry-run check, mirroring the py tool's
// default. Erasable-syntax TS only: no enums, no namespaces.)

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE: string = dirname(fileURLToPath(import.meta.url));
const REPO: string = join(HERE, "..", "..", "..");
const SNAP_REL: string = "packages/web-kit/generated/registry.json";

// The @melite/ui modules that are COMPOSITIONS (domain atoms built
// from primitives) rather than primitives. Everything else exporting
// a component from the kit is registry:ui.
const BLOCKS: ReadonlySet<string> = new Set([
  "FilmPlayer",
  "NumberField",
  "ProvenanceBadge",
  "SlotSquare",
  "WirePickerModal",
  "cardControls",
  "motionThumbStore",
]);

// Kit packages that contribute components to the pool.
// contracts/slots/catalog/formats are TYPE/runtime plumbing, not
// components — they do not ride the registry (the boundary gate
// allows them by package name, not by item).
const KIT_PACKAGES: ReadonlyMap<string, string> = new Map([
  ["ui", "@melite/ui"],
]);

const COMPONENT_RE: RegExp =
  /^(?:export\s+)?(?:default\s+)?(?:function|const)\s+([A-Z][A-Za-z0-9]*)/m;

// Export identifiers a module provides (functions/consts/types) —
// the NAMES a consumer imports. The boundary gate checks imports
// against these, so the catalog must state them.
const EXPORT_RE: RegExp =
  /^export\s+(?:async\s+)?(?:function|const|let|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm;
// shadcn-style files declare plainly and export at the bottom:
// `export { Input }` / `export { A, B as C }` — harvest those too.
const EXPORT_LIST_RE: RegExp = /^export\s*\{([^}]*)\}/gm;

interface RegistryFile {
  path: string;
}

interface RegistryItem {
  name: string;
  type: string;
  package: string;
  files: RegistryFile[];
  exports: string[];
  component: boolean;
  plugin?: string;
}

function exportsOf(body: string): string[] {
  const names: Set<string> = new Set();
  for (const m of body.matchAll(EXPORT_RE)) {
    names.add(m[1]);
  }
  for (const m of body.matchAll(EXPORT_LIST_RE)) {
    for (const part of m[1].split(",")) {
      const trimmed: string = part.trim();
      if (trimmed === "") {
        continue;
      }
      // `Input` or `X as Y` — the EXPORTED name is the last word.
      const words: string[] = trimmed.split(/\s+/);
      names.add(words[words.length - 1]);
    }
  }
  return [...names].sort();
}

function isDir(path: string): boolean {
  try {
    return readdirSync(path, { withFileTypes: true }).length >= 0;
  } catch {
    return false;
  }
}

function kitItems(): RegistryItem[] {
  // Core items: one per exported component of the kit packages.
  const items: RegistryItem[] = [];
  const pkgs: Array<[string, string]> = [...KIT_PACKAGES.entries()].sort(
    (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
  );
  for (const [pkgDir, pkgName] of pkgs) {
    const src: string = join(REPO, "packages", "web-kit", pkgDir, "src");
    for (const fn of readdirSync(src).sort()) {
      if (!(fn.endsWith(".tsx") || fn.endsWith(".ts")) || fn === "index.ts") {
        continue;
      }
      const stem: string = fn.slice(0, fn.lastIndexOf("."));
      const body: string = readFileSync(join(src, fn), "utf8");
      const exports: string[] = exportsOf(body);
      if (exports.length === 0) {
        continue; // a re-export shim or empty module — not a member
      }
      const exportsAComponent: boolean = COMPONENT_RE.test(body);
      let kind: string;
      if (exportsAComponent || BLOCKS.has(stem)) {
        kind = BLOCKS.has(stem) ? "registry:block" : "registry:ui";
      } else if (exports.some((e) => e.startsWith("use"))) {
        kind = "registry:hook";
      } else {
        kind = "registry:lib";
      }
      items.push({
        name: stem,
        type: kind,
        package: pkgName,
        files: [{ path: "src/" + fn }],
        exports,
        component: exportsAComponent || BLOCKS.has(stem),
      });
    }
  }
  return items;
}

function fragmentItems(): RegistryItem[] {
  // Plugin fragments: every engines ui package that carries its own
  // registry.json (the fork mechanic).
  const items: RegistryItem[] = [];
  const engRoot: string = join(REPO, "packages", "engines");
  let engines: string[];
  try {
    engines = readdirSync(engRoot).sort();
  } catch {
    return items;
  }
  for (const engine of engines) {
    const base: string = join(engRoot, engine);
    if (!isDir(base)) {
      continue;
    }
    const ac: string = join(base, "action_cards");
    const roots: string[] = [join(base, "ui")];
    if (isDir(ac)) {
      for (const genre of readdirSync(ac).sort()) {
        roots.push(join(ac, genre, "ui"));
      }
    }
    for (const uiDir of roots) {
      const frag: string = join(uiDir, "registry.json");
      let data: { items?: RegistryItem[] };
      try {
        data = JSON.parse(readFileSync(frag, "utf8")) as {
          items?: RegistryItem[];
        };
      } catch {
        continue;
      }
      for (const it of data.items ?? []) {
        items.push({ ...it, plugin: engine });
      }
    }
  }
  return items;
}

function main(): number {
  const args: string[] = process.argv.slice(2);
  const write: boolean = args.includes("--write");
  const registry = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    items: [...kitItems(), ...fragmentItems()],
  };
  const text: string = JSON.stringify(registry, null, 2) + "\n";
  const snap: string = join(REPO, "packages", "web-kit", "generated", "registry.json");
  let old: string | null = null;
  try {
    old = readFileSync(snap, "utf8");
  } catch {
    old = null;
  }
  if (old === text) {
    console.log(
      `${SNAP_REL} matches the packages (${registry.items.length} items)`,
    );
    return 0;
  }
  if (write) {
    writeFileSync(snap, text);
    console.log(
      `wrote ${SNAP_REL} (${registry.items.length} items: ${kitItems().length} core + ${fragmentItems().length} plugin)`,
    );
    return 0;
  }
  console.log(`DRIFT ${SNAP_REL} — run with --write`);
  return 1;
}

process.exit(main());
