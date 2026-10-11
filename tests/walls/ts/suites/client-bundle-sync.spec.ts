// client-bundle-sync.spec.ts — THE CLIENT-BUNDLE SYNC WALL (2026-10-23).
//
// The lesion it kills: the loader bundles (lib/client.js, the
// window.__ModuleLoader__ factory plane) are TRACKED artifacts built
// by tsdown, while every workspace import resolves to SRC through
// tsconfig paths. A value export that lands in src without a bundle
// rebuild ships a lane whose loader serves a table missing the name —
// "(0, _melite_card_base_client.seedRecipeStamp) is not a function"
// on Generate Image with every test green (2026-10-23, operator; the
// same crash class as the 2026-10-22 Generate Video seedRecipeStamp
// lesion the lib-sync wall closed for the tsc .d.ts face). lib-sync
// reads only .d.ts files — the bundle is the OTHER artifact plane and
// this wall owns it.
//
// Two halves, both judged against the SERVED table (the
// `exports.<name> =` assignments the factory emits — the loader
// materializes exactly these):
// 1. CONSUMER: every VALUE binding any workspace src imports from
//    `<pkg>/client` is in that package's served table. This half is
//    the operator's crash byte-for-byte.
// 2. FACE: the src client face (src/client/index.ts when the package
//    ships one) and its export closure must ride the table too — a
//    src face that grows a name the table never serves dies on the
//    first consumer to reach it, not at build time.
//
// Run: npx vitest run tests/walls/ts/suites/client-bundle-sync.spec.ts
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exportClosure, packageDirs } from "./lib-sync.spec.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

export type StaleBundle = { pkg: string; missing: string[]; half: "consumer" | "face" };

export type BundleRow = { name: string; dir: string; body: string };

/** Every loader bundle on the plane: a manifest ./client row whose
 *  default target exists and opens with the loader registration (the
 *  build-plane's ownership marker — the same discovery the bundle
 *  format gate runs). */
export function bundleRows(packages: string[]): BundleRow[] {
  const rows: BundleRow[] = [];
  for (const dir of packages) {
    const man = join(dir, "package.json");
    if (!existsSync(man)) continue;
    let name = "";
    let target = "";
    try {
      const d = JSON.parse(readFileSync(man, "utf8")) as {
        name?: string;
        exports?: Record<string, { default?: string } | string>;
      };
      name = d.name ?? dir;
      const client = d.exports?.["./client"];
      target = typeof client === "string" ? client : (client?.default ?? "");
    } catch {
      continue;
    }
    if (!target.endsWith("lib/client.js")) continue;
    const file = join(dir, "lib/client.js");
    if (!existsSync(file)) continue;
    const body = readFileSync(file, "utf8");
    if (!body.startsWith("window.__ModuleLoader__.load(")) continue;
    rows.push({ name, dir, body });
  }
  return rows;
}

/** The names the factory SERVES: the emitted `exports.<name> =`
 *  assignments plus the `Object.defineProperty(exports, "<name>")`
 *  getters — direct locals emit the first spelling, external
 *  re-exports (`export { X } from '<other>/client'`) emit the
 *  second. The factory builds module.exports member-by-member
 *  (tsdown's format), so these lines ARE the loader's table. */
export function bundleExportTable(body: string): Set<string> {
  const names = new Set<string>();
  for (const m of body.matchAll(/\bexports\.([A-Za-z_$][\w$]*)\s*=/g)) names.add(m[1]);
  for (const m of body.matchAll(/Object\.defineProperty\(exports,\s*["']([A-Za-z_$][\w$]*)["']/g)) {
    names.add(m[1]);
  }
  return names;
}

/** Value bindings one src text imports from the given specifier —
 *  `import { a, type B } from '<spec>'` rows only; `import type` and
 *  type-only list items are not runtime seams. */
export function consumerValueImports(src: string, spec: string): string[] {
  if (!src.includes(spec)) return [];
  const names: string[] = [];
  const esc = spec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const m of src.matchAll(new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${esc}['"]`, "g"))) {
    for (const raw of m[1].split(",")) {
      const item = raw.trim();
      if (!item || item.startsWith("type ")) continue;
      // The served name is the ALIAS (the right side of `as`) — the
      // factory table carries what the import binds, not the source
      // spelling.
      const as = item.match(/^[\w$]+\s+as\s+([A-Za-z_$][\w$]*)$/);
      names.push(as ? as[1] : item);
    }
  }
  return [...new Set(names)];
}

/** Every src text in the workspace, package by package (the consumer
 *  half's scan corpus — src only, the artifact planes never import). */
export function workspaceSrcTexts(packages: string[]): Array<{ dir: string; text: string }> {
  const texts: Array<{ dir: string; text: string }> = [];
  for (const dir of packages) {
    const src = join(dir, "src");
    if (!existsSync(src)) continue;
    const stack = [src];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const e of readdirSync(cur, { withFileTypes: true })) {
        const p = join(cur, e.name);
        if (e.isDirectory()) stack.push(p);
        else if (/\.(ts|tsx)$/.test(e.name)) texts.push({ dir, text: readFileSync(p, "utf8") });
      }
    }
  }
  return texts;
}

/** THE CHECK: for every loader bundle, the served table carries (1)
 *  every value binding consumers import from <pkg>/client and (2)
 *  every name of the package's src client face closure. */
export function staleBundles(packages: string[]): StaleBundle[] {
  const rows = bundleRows(packages);
  const byName = new Map(rows.map((r) => [r.name, r]));
  const stale: StaleBundle[] = [];
  for (const row of rows) {
    const table = bundleExportTable(row.body);
    // Half 1 — the consumers.
    const consumerMisses = new Map<string, number>();
    for (const { text } of workspaceSrcTexts(packages)) {
      for (const n of consumerValueImports(text, `${row.name}/client`)) {
        if (!table.has(n)) consumerMisses.set(n, (consumerMisses.get(n) ?? 0) + 1);
      }
    }
    if (consumerMisses.size) {
      stale.push({ pkg: row.name, missing: [...consumerMisses.keys()], half: "consumer" });
    }
    // Half 2 — the src client face.
    const face = join(row.dir, "src/client/index.ts");
    if (!existsSync(face)) continue;
    const faceMisses = exportClosure(face).filter((n) => !table.has(n));
    if (faceMisses.length) {
      stale.push({ pkg: row.name, missing: faceMisses, half: "face" });
    }
  }
  return stale;
}

describe("the client-bundle sync wall (served table == the names src imports)", () => {
  it("every loader bundle serves every name consumers import and its src face closure", () => {
    const stale = staleBundles(packageDirs());
    expect(
      stale.map((s) => `${s.pkg} [${s.half}]: missing ${s.missing.join(", ")}`),
      `stale loader bundles — the lane serves these, the walls run src (cure: pnpm exec tsdown in the package): ${stale.map((s) => `${s.pkg}${s.half === "face" ? " face" : ""}: missing ${s.missing.join(", ")}`).join("; ")}`,
    ).toEqual([]);
  });

  it("the rejection path: a served table missing a consumer's binding is named", () => {
    const body = [
      "window.__ModuleLoader__.load({",
      '  id: "@melite/fake",',
      "  factory() {",
      "    const exports = {};",
      "    exports.present = present;",
      "    return module.exports;",
      "  }",
      "});",
    ].join("\n");
    const table = bundleExportTable(body);
    expect(table.has("present")).toBe(true);
    expect(consumerValueImports("import { present, ghostName } from '@melite/fake/client'", "@melite/fake/client")).toEqual(["present", "ghostName"]);
    const misses = ["present", "ghostName"].filter((n) => !table.has(n));
    expect(misses).toEqual(["ghostName"]);
  });
});
