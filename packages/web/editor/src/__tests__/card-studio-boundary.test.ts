/**
 * Card-studio tenant boundary (E1 hardened, 2026-08-15).
 *
 * E1 was TS-only: StudioTenantProps types the props, but a tenant file could
 * still `import { useAgentFlowStore }` (write the graph directly) or hold
 * an `editorClient` stub (run/save capabilities that bypass onSave). This
 * test makes the boundary MECHANICAL: every module registered as a tenant in
 * cardStudios.ts is source-scanned, and its imports are checked against the
 * data-plane deny list.
 *
 * Registry-driven: a new tenant is scanned the moment it registers — there
 * is no list here to forget. (The props shape itself is enforced at
 * compile time by the registry's ComponentType<StudioTenantProps>.)
 *
 * DENY LIST — the modules that own flow STATE or the editor RPC facade:
 *   flowStore / flowCards / flowToChainYaml / resultOutbox /
 *   storePersistence / subgraph / multiEditGroup / flowThreadKeys /
 *   editorClient
 * Tenants read stage (props) and write via onSave. That is the whole plane.
 *
 * Deliberate carve-outs (asserted below so they can't creep silently):
 *   • ../flow/FlowCard — the CardStage TYPE (the contract itself)
 *   • ../flow/studioRail — the TOOLS portal (§7.10 pattern infra)
 *   • ../flow/motionThumbStore — a UI-only thumbnail cache (localStorage
 *     data URLs for collapsed tiles; zero impact on params/cacheKey — see
 *     its docstring)
 * The one RPC a tenant ever needed (motion's Freeze) moved to the SHELL's
 * Stop button in the same change — the shell owns Run, so it owns Interrupt,
 * and no tenant has any reason to import editorClient.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { tmpdir } from "node:os"
import type { Dirent } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (p: string) => readFileSync(resolve(HERE, p), "utf8")

const REGISTRY_PATH = "../surfaces/flow/cardStudios.ts"
const registrySrc = read(REGISTRY_PATH)
// NOTE: cardStudios is deliberately NOT imported at module scope. Its
// import.meta.glob keys are a TRANSFORM-TIME snapshot of the packages/ tree;
// a top-level import would freeze that snapshot at worker start — BEFORE
// the G12 lock handshake below — so the gate1 server arm's zz- scaffold
// could wedge this arm (glob sees it, the post-handshake fs scan doesn't).
// The §6 test imports it fresh AFTER the handshake.

/** Extract { module, ident } pairs from every import in a TS/TSX source. */
function importsOf(src: string): { module: string; idents: string[] }[] {
  return importsOfTyped(src).map(({ module, idents }) => ({ module, idents }))
}

/** importsOf, retaining whether the import is type-only (§6 plugin gate:
 *  contract TYPES are legal for plugin tenants; frontend VALUES are not). */
function importsOfTyped(src: string): { module: string; idents: string[]; typeOnly: boolean }[] {
  const out: { module: string; idents: string[]; typeOnly: boolean }[] = []
  const re = /import\s+(type\s+)?((?:[\w$]+\s*,\s*)?(?:\{[^}]*\}|[\w$]+))\s+from\s+["']([^"']+)["']/g
  for (const m of src.matchAll(re)) {
    const idents = m[2]!
      .replace(/[{}]/g, "").split(",")
      // strip an inline `type` qualifier (`{ FilmPlayer, type Handle }`
      // is a MIXED import — the qualifier marks one ident, not the lot)
      .map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]!.trim())
      .filter(Boolean)
    out.push({ module: m[3]!, idents, typeOnly: m[1] === "type" })
  }
  return out
}

/** The tenant components registered in cardStudios.ts → their file sources.
 *  `body: <Ident>` positions only — not every import the registry file
 *  makes (CardStage/StudioTenantProps are types, modelCatalog is a lib).
 *  (2026-08-19: the field renamed tenant→body in the studio removal — the
 *  scan follows the slot's claim shape, same boundary, new name.) */
function registeredTenants(): { ident: string; file: string; src: string }[] {
  const tenants: { ident: string; file: string; src: string }[] = []
  // Trailing , or newline (not "<") — skips the interface's
  // `body: ComponentType<StudioTenantProps>` type position.
  for (const m of registrySrc.matchAll(/body:\s*([A-Za-z_$][\w$]*)\s*(?=[,\n])/g)) {
    const ident = m[1]!
    const imp = importsOf(registrySrc).find((i) => i.idents.includes(ident))
    if (!imp) {
      // 2026-08-19 (the studio removal): a claim body may be a LOCAL
      // (SchemaFormBody wraps ParamEditor in-file; the served-binding
      // return carries a local variable). Locals resolve to the registry
      // file itself — the boundary still scans their source. An ident
      // that is neither imported nor locally declared is drift.
      const declared = registrySrc.includes("function " + ident) || registrySrc.includes("const " + ident)
      expect(declared, "claim body " + ident + " must be an import or a local declaration in cardStudios.ts").toBeTruthy()
      if (declared && !tenants.some((t) => t.ident === ident)) tenants.push({ ident, file: resolve(HERE, "../surfaces/flow/cardStudios.ts"), src: registrySrc })
      continue
    }
    const base = resolve(HERE, "../surfaces/flow", imp!.module.replace(/^\.\//, ""))
    const file = [`${base}.tsx`, `${base}.ts`].find((f) => {
      try { readFileSync(f); return true } catch { return false }
    })
    expect(file, `could not resolve tenant module ${imp!.module}`).toBeTruthy()
    if (!tenants.some((t) => t.ident === ident)) tenants.push({ ident, file: file!, src: readFileSync(file!, "utf8") })
  }
  // A registry with no tenants means the scan silently went vacuous.
  expect(tenants.length, "cardStudios.ts must register at least one tenant").toBeGreaterThan(0)
  return tenants
}

/** The data plane: modules that own flow state or the RPC facade. */
const DENY = new Set([
  "flowStore", "flowCards", "flowToChainYaml", "resultOutbox",
  "storePersistence", "subgraph", "multiEditGroup", "flowThreadKeys",
  "editorClient",
])
/** Pattern infrastructure + UI-only caches (documented in the file header). */
const ALLOW_FLOW_MODULES = new Set(["FlowCard", "studioRail", "motionThumbStore"])

const moduleName = (spec: string) => spec.split("/").pop()!.replace(/\.(tsx?|js)$/, "")

// G12 (2026-08-22): gate1 server arm scaffolds a REAL throwaway plugin into
// packages/zz-kit-probe while arms run in parallel; this gate reads the whole
// tree. Advisory lockfile handshake (writer:
// server-js/tests/gate.plugin_kit.test.ts): wait up to 60 s for scaffold
// removal - a stale lock never wedges CI (timeout, then proceed).
const TREE_LOCK = resolve(tmpdir(), "melite-gate1-plugins-tree.lock")
async function waitTreeLockFree(timeoutMs = 60000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (existsSync(TREE_LOCK)) {
    if (Date.now() > deadline) return // stale lock must not wedge CI
    await new Promise((r) => setTimeout(r, 250))
  }
}
describe("card studio tenant boundary (E1)", () => {
  const tenants = registeredTenants()

  it("every registered tenant is free of data-plane imports", () => {
    const failures: string[] = []
    for (const t of tenants) {
      for (const imp of importsOf(t.src)) {
        const name = moduleName(imp.module)
        if (!DENY.has(name)) continue
        failures.push(`${t.ident} (${t.file.split("/").pop()}): imports ${name} from "${imp.module}"`)
      }
    }
    expect(failures, `tenants must write via onSave only:\n${failures.join("\n")}`).toEqual([])
  })

  it("the shell stays genre-blind: CardStudio imports no tenant component", () => {
    const shellSrc = read("../surfaces/flow/CardStudio.tsx")
    for (const t of tenants) {
      expect(
        shellSrc,
        `CardStudio.tsx must not import ${t.ident} — the registry (cardStudios.ts) is the only place tenants are named`,
      ).not.toContain(t.ident)
    }
  })

  it("flow-surface imports in tenants are exactly the documented carve-outs", () => {
    for (const t of tenants) {
      for (const imp of importsOf(t.src)) {
        if (!imp.module.match(/(\.\.\/|@\/surfaces\/)flow\//)) continue
        const name = moduleName(imp.module)
        expect(
          ALLOW_FLOW_MODULES,
          `${t.ident} imports flow/${name} — not a documented carve-out; if it's legitimate, add it to ALLOW_FLOW_MODULES WITH a reason (file header)`,
        ).toContain(name)
      }
    }
  })
})

// ── Plugin tenants (PLUGIN-ARCHITECTURE.md §6) ────────────────────────────
// A plugin card body component is resolved through the import.meta.glob over
// packages/engines/*/action_cards/*/*/ui/studio/component.tsx (the engine-
// scoped lane; ALL card UI under the card's ui/ subfolder, 2026-09-03). Its interface contract is STRICTER than
// a first-party tenant's: the component sees ONLY the props (the
// StudioTenantProps shape) — the E4 writes allowlist (server-side, from the
// card's body: claim) plus those props is the ENTIRE interface. First-party
// carve-outs (FlowCard types, studioRail, motionThumbStore) exist for
// OUR components; a plugin takes none of them by default. This gate makes
// the boundary MECHANICAL: every globbed file is source-scanned, and any
// import outside react + the contract TYPES fails — "a plugin component
// importing frontend internals = mount failure" is a test, not a comment.
describe("plugin studio tenant boundary (§6 props gate)", () => {
  const REPO_ROOT = resolve(HERE, "../../../../..")
  const ENGINES_DIR = resolve(REPO_ROOT, "packages", "engines")

  function pluginComponents(): { id: string; file: string; src: string; pkgDir: string }[] {
    const out: { id: string; file: string; src: string; pkgDir: string }[] = []
    for (const engine of readdirSync(ENGINES_DIR)) {
      // BOTH homes while the card-folder migration empties action_cards
      // (card-folder-shape design record, 2026-09-08): the legacy
      // tenant package and the nested card units src/cards/.
      const cardsRoots = [
        resolve(ENGINES_DIR, engine, "action_cards"),
        resolve(ENGINES_DIR, engine, "src", "cards"),
      ]
      for (const cards of cardsRoots) {
        let ownerDirs: string[] = []
        try {
          ownerDirs = readdirSync(cards, { withFileTypes: true })
            .filter((d) => d.isDirectory() && !d.name.startsWith(".")
              && d.name !== "ui" && d.name !== "node_modules")
            .map((d) => d.name)
        } catch {
          continue // engine without this cards root — fine
        }
        for (const owner of ownerDirs) {
          for (const card of readdirSync(resolve(cards, owner), { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== "ui").map((d) => d.name)) {
            const file = resolve(cards, owner, card, "ui", "studio", "component.tsx")
            let src: string
            try {
              src = readFileSync(file, "utf8")
            } catch {
              continue // a card dir without a component — schema-form card
            }
            out.push({ id: `${owner}/${card}`, file, src, pkgDir: cards })
          }
        }
      }
    }
    return out
  }

  // 90 s: the lock handshake below polls for up to 60 s — the default 5 s
  // per-test timeout would kill the wait and fail the arm spuriously
  // whenever the writer holds the tree longer than that.
  it("every plugin component imports ONLY react values + contract types", { timeout: 90_000 }, async () => {
    await waitTreeLockFree()
    // Fresh transform AFTER the handshake. cardStudios's import.meta.glob
    // keys are a TRANSFORM-TIME snapshot; importing it at module scope (or
    // reusing a same-worker cached transform) would freeze that snapshot
    // during the writer's scaffold window — glob sees the zz- probe, the
    // post-handshake fs scan below doesn't, and the arm fails on a tree
    // that no longer exists. The runtime specifier (not a literal, and
    // @vite-ignored so vite's dynamic-import analysis leaves it alone)
    // resolves through the module runner at CALL time with a unique query
    // per run — a fresh transform, a fresh glob, over the same tree the
    // fs scan walks.
    const specifier = `../surfaces/flow/cardStudios.ts?boundary=${Date.now()}`
    const { pluginTenantIds } = (await import(/* @vite-ignore */ specifier)) as typeof import("../surfaces/flow/cardStudios")
    const comps = pluginComponents()
    // The glob surface and the filesystem must agree — a component the glob
    // can't see would bypass this gate entirely.
    const registered = pluginTenantIds()
    // Set equality: the fs scan walks the two card roots in sequence
    // while pluginTenantIds() returns sorted — with cards split across
    // the migration's two homes, iteration order is not a contract.
    expect([...registered].sort(), "pluginTenantIds() must match the packages/ tree").toEqual([...comps.map((c) => c.id)].sort())

    // The cut-5 flip (2026-08-19): first-party studios ARE plugin tenants.
    // Runtime deps: react + lucide + three + every @melite package (the same
    // packages the app itself rides). Types: react + @melite contracts.
    // E-TENANTS (2026-08-20) adds two VALUE allows:
    //   • @react-three/* — the three.js island runtime (PoseViewer3D et al
    //     moved into packages/engines/comfyui/action_cards/*/ui; pinned in vite.config.ts like three)
    //   • @melite-plugin/<id>/* — cross-plugin UI edges, legal ONLY when the
    //     importing plugin DECLARES the workspace dep (D1 law — this gate
    //     reads package.json, the same shape as the packages-closure gate)
    const VALUE_ALLOW = new Set([
      "react", "react-dom", "react/jsx-runtime", "lucide-react", "three",
      "@react-three/drei", "@react-three/fiber",
    ])
    // three/examples/* rides the same floor: the editor's vite.config
    // pins the subpath tree explicitly for plugin tenants (the moved
    // GLB viewers' loaders — same disease as the bare `three` pin).
    const VALUE_PREFIX_ALLOW = ["three/examples/"]
    const failures: string[] = []
    for (const comp of comps) {
      // The card tree's manifest (@comfyui/cards package.json) governs its
      // deps — the same §18 law the ui tenants ride: a DECLARED dependency
      // is a legal VALUE import (zustand for bodyStudio's store, the
      // @melite-plugin/timeline edge, …). VALUE_ALLOW stays the shared
      // floor the editor pins for undeclared runtime.
      const declared = declaredPluginDeps(resolve(comp.pkgDir))
      for (const { module, typeOnly } of importsOfTyped(comp.src)) {
        if (module.startsWith(".")) continue // the plugin studio own tree (same dir)
        if (typeOnly) {
          if (module === "react" || module.startsWith("react/") || module.startsWith("@melite/")) continue
          if (isDeclaredPluginEdge(module, declared)) continue
          failures.push(`${comp.id}: TYPE import from "${module}" — plugin tenants may import types only from react + the @melite packages`)
          continue
        }
        if (!VALUE_ALLOW.has(module) && !VALUE_PREFIX_ALLOW.some((pfx) => module.startsWith(pfx)) && !module.startsWith("@melite/") && !declared.has(module) && !isDeclaredPluginEdge(module, declared)) {
          failures.push(`${comp.id}: VALUE import from "${module}" — a plugin component runtime deps are react, lucide-react, three, the @melite packages, and its tree's declared manifest deps (§6/§18)`)        }
      }
    }
    expect(failures, `plugin components importing frontend internals = mount failure:\n${failures.join("\n")}`).toEqual([])
  })
})

// ── Plugin ui tenants (§16 E-TENANTS) ─────────────────────────────────────
// A plugin's ui/<tenant>/ tree is a TENANT LIBRARY (an index.ts surface —
// the former @melite/viewers components). Same §6 law as a card body: the
// file set is source-scanned, and anything beyond react/@melite/three runtime
// deps + DECLARED @melite-plugin edges is a mount failure.
describe("plugin ui tenant boundary (§16 E-TENANTS)", () => {
  const REPO_ROOT = resolve(HERE, "../../../../..")
  const ENGINES_DIR = resolve(REPO_ROOT, "packages", "engines")

  function pluginUiFiles(): { id: string; src: string; pkgDir: string }[] {
    const out: { id: string; src: string; pkgDir: string }[] = []
    const scan = (uiRoot: string, ownerPrefix: string) => {
      let subdirs: Dirent[]
      try {
        subdirs = readdirSync(uiRoot, { withFileTypes: true }).filter((d) => d.isDirectory())
      } catch {
        return // no ui/ — most owners
      }
      for (const sub of subdirs) {
        const tenantDir = resolve(uiRoot, sub.name)
        for (const file of walkTs(tenantDir)) {
          // pkgDir is the PACKAGE root (ui/ itself carries package.json —
          // the workspace package the claim lives in), not the claim dir.
          out.push({ id: `${ownerPrefix}/ui/${sub.name}${file.slice(tenantDir.length)}`, src: readFileSync(file, "utf8"), pkgDir: uiRoot })
        }
      }
    }
    // UI-claim roots (PURE PLUGIN, web-registry ruling 2026-09-03 —
    // packages/melite-core is deleted, chrome is static in the shell):
    // engines/<engine>/ui/ (plugin-level claims) AND the genre-level
    // action_cards/<genre>/ui/ claims (the pluginUi glob's card path).
    for (const engine of readdirSync(ENGINES_DIR)) {
      scan(resolve(ENGINES_DIR, engine, "ui"), engine)
      const acDir = resolve(ENGINES_DIR, engine, "action_cards")
      let genres: Dirent[]
      try {
        genres = readdirSync(acDir, { withFileTypes: true }).filter((d) => d.isDirectory())
      } catch {
        genres = []
      }
      for (const g of genres) {
        scan(resolve(acDir, g.name, "ui"), g.name)
      }
    }
    return out
  }

  /** The BODY tenant files (cardStudios' glob: ui/studio/component.tsx
   *  and its co-located studio modules) — same shape as pluginUiFiles.
   *  BOTH homes while the card-folder migration empties action_cards
   *  (card-folder-shape design record, 2026-09-08): the legacy tenant
   *  package and the nested card units
   *  engines/comfyui-cordis/src/cards/<genre>/<card>/. */
  function studioTenants(): { id: string; src: string; pkgDir: string }[] {
    const out: { id: string; src: string; pkgDir: string }[] = []
    const acRoots = [
      resolve(REPO_ROOT, "packages", "engines", "comfyui", "action_cards"),
      resolve(REPO_ROOT, "packages", "engines", "comfyui-cordis", "src", "cards"),
    ]
    for (const acRoot of acRoots) {
      if (!existsSync(acRoot)) continue
      for (const genre of readdirSync(acRoot, { withFileTypes: true })) {
        if (!genre.isDirectory()) continue
        for (const card of readdirSync(resolve(acRoot, genre.name), { withFileTypes: true })) {
          if (!card.isDirectory()) continue
          const studio = resolve(acRoot, genre.name, card.name, "ui", "studio")
          if (!existsSync(studio)) continue // the genre ui package itself
          for (const file of walkTs(studio)) {
            out.push({
              id: `${genre.name}/${card.name}/ui/studio${file.slice(studio.length)}`,
              src: readFileSync(file, "utf8"),
              pkgDir: studio,
            })
          }
        }
      }
    }
    return out
  }

  it("every ui tenant library imports only allowed runtime deps + DECLARED plugin edges", () => {
    const VALUE_ALLOW = new Set([
      "react", "react-dom", "react/jsx-runtime", "lucide-react", "three",
      "@react-three/drei", "@react-three/fiber",
    ])
    // three/examples/* rides the same floor: the editor's vite.config
    // pins the subpath tree explicitly for plugin tenants (the moved
    // GLB viewers' loaders — same disease as the bare `three` pin).
    const VALUE_PREFIX_ALLOW = ["three/examples/"]
    const failures: string[] = []
    const files = pluginUiFiles()
    expect(files.length, "at least one ui tenant must exist (the E-TENANTS move)").toBeGreaterThan(0)
    for (const f of files) {
      const declared = declaredPluginDeps(f.pkgDir)
      for (const { module, typeOnly } of importsOfTyped(f.src)) {
        if (module.startsWith(".")) continue // intra-tenant
        if (typeOnly) {
          if (module === "react" || module.startsWith("react/") || module.startsWith("@melite/")) continue
          if (isDeclaredPluginEdge(module, declared)) continue
          failures.push(`${f.id}: TYPE import from "${module}" — not react/@melite/declared-edge`)
          continue
        }
        // §18 (2026-08-21): the MANIFEST is the law — any dependency the
        // plugin's package.json declares (zustand for melite-timeline's store,
        // @melite-plugin edges, etc.) is a legal VALUE import. VALUE_ALLOW is
        // only the shared floor the editor pins for undeclared runtime.
        if (
          !VALUE_ALLOW.has(module) &&
          !VALUE_PREFIX_ALLOW.some((pfx) => module.startsWith(pfx)) &&
          !module.startsWith("@melite/") &&
          !declared.has(module)
        ) {
          failures.push(`${f.id}: VALUE import from "${module}" — not a declared dependency (package.json is the law, §18)`)
        }
      }
    }
    expect(failures, `plugin ui libraries importing frontend internals = mount failure:\n${failures.join("\n")}`).toEqual([])
  })

  // ── THE WEB REGISTRY (docs/design/web-registry.md §6) ──────────────────
  // The composed catalog (packages/web-kit/generated/registry.json — gen-registry.ts's derived
  // artifact) is the POOL. A tenant importing a kit component the pool
  // does not list is drift: either the registry snapshot is stale
  // (regenerate) or the import is a typo riding a dead export.
  it("every tenant's @melite/ui imports are registry members (the pool is the catalog)", () => {
    const catalogPath = resolve(HERE, "../../../../web-kit/generated/registry.json")
    const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as {
      items: { name: string; exports?: string[] }[]
    }
    // The pool is the EXPORT NAMES (what a consumer imports), not the
    // item names — one item can provide many idents (utils -> cn).
    const pool = new Set(catalog.items.flatMap((i) => i.exports ?? [i.name]))
    expect(pool.size, "packages/web-kit/generated/registry.json is composed and non-empty").toBeGreaterThan(0)
    const failures: string[] = []
    const files = [...pluginUiFiles(), ...studioTenants()]
    expect(files.length).toBeGreaterThan(0)
    for (const f of files) {
      for (const { module, idents, typeOnly } of importsOfTyped(f.src)) {
        // The barrel AND subpath imports (@melite/ui/input — the deep
        // form some tenants use) both draw from the ONE pool.
        if (typeOnly || (module !== "@melite/ui" && !module.startsWith("@melite/ui/"))) continue
        for (const id of idents) {
          if (!pool.has(id)) {
            failures.push(`${f.id}: imports { ${id} } from ${module} — not in the composed registry`)
          }
        }
      }
    }
    expect(failures, "tenant imports outside the pool:\n" + failures.join("\n")).toEqual([])
  })

  it("tenants never write raw form primitives (the kit owns the look)", () => {
    // Raw <input>/<select>/<textarea> in a tenant is chrome drift: the
    // kit's Input/SelectMenu/Textarea/Checkbox carry the shared look.
    // Hidden file inputs ride the kit Input too (the primitive is the
    // device, the class stays "hidden").
    const failures: string[] = []
    const files = [...pluginUiFiles(), ...studioTenants()]
    for (const f of files) {
      for (const m of f.src.matchAll(/<(input|select|textarea)\b/g)) {
        failures.push(`${f.id}: raw <${m[1]} — use the @melite/ui primitive`)
      }
    }
    expect(failures, "raw form primitives in tenants:\n" + failures.join("\n")).toEqual([])
  })

  it("core (src/ + packages/) never statically imports a plugin ui tenant", () => {
    // The seam split: plugin-owned components are reached through the
    // plugin's own card/ui lanes, never a static import from core. Core
    // keeps ZERO card domain (the @melite/viewers package died 2026-08-21;
    // card state lives in the owning plugin).
    const failures: string[] = []
    for (const file of walkTs(resolve(HERE, "../.."))) {
      if (file.includes("/__tests__/")) continue // tests re-point their vi.mocks at the tenant surface
      const src = readFileSync(file, "utf8")
      for (const m of src.matchAll(/from\s+["'](@melite-plugin\/[^"']+)["']/g)) {
        failures.push(`${file}: imports "${m[1]}" — core may not statically import plugin ui tenants`)
      }
    }
    expect(failures).toEqual([])
  })
})

function walkTs(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && (e.name === "node_modules" || e.name === "dist" || e.name === ".tmp")) continue
    const p = resolve(dir, e.name)
    if (e.isDirectory()) walkTs(p, out)
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}

/** A tree's declared deps — the package.json GOVERNING that tree (a card
 *  component reads the engine cards package; a ui tenant its own dir —
 *  the manifest is the law, §18). */
function declaredPluginDeps(pkgDir: string): Set<string> {
  try {
    const pj = JSON.parse(readFileSync(resolve(pkgDir, "package.json"), "utf8"))
    return new Set(Object.keys(pj.dependencies ?? {}))
  } catch {
    return new Set()
  }
}

/** "@melite-plugin/motion/ui/viewer3d" is legal iff "@melite-plugin/motion" is declared. */
function isDeclaredPluginEdge(module: string, declared: Set<string>): boolean {
  if (!module.startsWith("@melite-plugin/")) return false
  for (const d of declared) {
    if (d.startsWith("@melite-plugin/") && (module === d || module.startsWith(d + "/"))) return true
  }
  return false
}
