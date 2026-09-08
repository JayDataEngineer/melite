/**
 * Package closure gate (the package cut, 2026-08-19).
 *
 * The @melite/* packages are the core plugins import — so the LAW is their
 * dependency graph, declared in each package.json and enforced HERE:
 *
 *   1. every import inside packages/<n>/src must be either intra-package
 *      (relative), a declared dependency (@melite/* or an npm external in
 *      that package's package.json), or a global type-only allow (react).
 *   2. NO package may import the app — no "@/...", no relative path that
 *      escapes the package dir. The app imports packages; never the
 *      reverse. The data plane (stores, RPC facade) lives in NO package:
 *      deny-by-absence.
 *   3. the alias map (vite.config.ts) and the package dirs must agree —
 *      a package without an alias is dead weight; an alias without a
 *      package.json is an unclared law.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const HERE = dirname(fileURLToPath(import.meta.url))
const EDITOR_ROOT = resolve(HERE, "../..")
// web-family reorg (2026-09): the @melite packages moved from
// editor/packages/ to the web/ registry root (web-registry design) — the gate walks
// the REAL package homes, the law is unchanged.
const PACKAGES_DIR = join(EDITOR_ROOT, "..", "..", "..", "web")

/** Bare-spec imports legal in EVERY package without declaration (types). */
const GLOBAL_TYPE_ALLOW = new Set(["react", "react/jsx-runtime"])

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(join(dir, e.name), out)
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(join(dir, e.name))
  }
  return out
}

function importsOf(src: string): { module: string; typeOnly: boolean }[] {
  const out: { module: string; typeOnly: boolean }[] = []
  const re = /import\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']/g
  for (const m of src.matchAll(re)) out.push({ module: m[2]!, typeOnly: m[1] === "type" })
  // bare `import type { X } from ...` is covered; side-effect imports too
  const reSide = /(?:^|\n)import\s+["']([^"']+)["']/g
  for (const m of src.matchAll(reSide)) out.push({ module: m[1]!, typeOnly: false })
  return out
}

describe("package closure (the @melite graph is the law)", () => {
  const pkgs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    // a package DECLARES itself (package.json); derived dirs like
    // web/generated (36fb6d9) are not packages — never were
    .filter((d) => existsSync(join(PACKAGES_DIR, d.name, "package.json")))
    .map((d) => d.name)

  it("every package declares its name and dependencies", () => {
    for (const name of pkgs) {
      const pj = JSON.parse(readFileSync(join(PACKAGES_DIR, name, "package.json"), "utf8"))
      // TWO namespaces, both first-class: @melite/<dir> (the src/
      // workspace shape) and @melite-plugin/<dir> (the PRIMITIVE
      // HOME packages — web/timeline kept its published name in the
      // stroke-2 move so zero consumers changed; ledger row 5
      // slice 1, 2026-09-07). Anything else is an undeclared
      // namespace.
      const ok = pj.name === "@melite/" + name || pj.name === "@melite-plugin/" + name
      expect(ok, `packages/${name}/package.json name`).toBe(true)
      expect(typeof pj.dependencies, `packages/${name} dependencies object`).toBe("object")
    }
  })

  it("no import escapes its package (no app imports, no undeclared deps)", () => {
    const failures: string[] = []
    for (const name of pkgs) {
      const pkgRoot = join(PACKAGES_DIR, name)
      const declared = new Set(Object.keys(JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf8")).dependencies ?? {}))
      // the scan root: src/ for the workspace shape, the package
      // root for the exports-map shape (web/timeline) — node_modules
      // never walks
      const srcRoot = existsSync(join(pkgRoot, "src")) ? join(pkgRoot, "src") : pkgRoot
      for (const file of walk(srcRoot).filter((f) => !f.includes(`/node_modules/`))) {
        const src = readFileSync(file, "utf8")
        for (const { module, typeOnly } of importsOf(src)) {
          const rel = file.slice(pkgRoot.length + 1)
          if (module.startsWith(".")) {
            const resolved = resolve(dirname(file), module)
            if (!resolved.startsWith(pkgRoot)) {
              failures.push(`${name}/${rel}: relative import "${module}" escapes the package`)
            }
            continue
          }
          if (module.startsWith("@/")) {
            failures.push(`${name}/${rel}: imports the APP ("${module}") — packages never import the app`)
            continue
          }
          // subpath imports (three/examples/...) count as the dep itself
          const isSubpath = [...declared].some((d) => module.startsWith(d + "/"))
          if (declared.has(module) || isSubpath || (typeOnly && GLOBAL_TYPE_ALLOW.has(module))) continue
          failures.push(`${name}/${rel}: imports "${module}" — not declared in packages/${name}/package.json`)
        }
      }
    }
    expect(failures, `package closure violations:\n${failures.join("\n")}`).toEqual([])
  })

  it("every package has exactly one declaration site (its package.json main)", () => {
    // ONE canonical entry, declared ONCE: the main field. The
    // src/-shape packages point at src/index.ts; the exports-map
    // shape (web/timeline) at ./timeline/index.ts — both are the
    // single declaration site their consumers resolve through.
    for (const name of pkgs) {
      const pj = JSON.parse(readFileSync(join(PACKAGES_DIR, name, "package.json"), "utf8"))
      expect(typeof pj.main, `packages/${name}/package.json main`).toBe("string")
      expect(existsSync(join(PACKAGES_DIR, name, pj.main)), `packages/${name}/${pj.main}`).toBe(true)
    }
  })
})
