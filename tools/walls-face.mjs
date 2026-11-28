#!/usr/bin/env node
// walls-face.mjs — THE WALLS FACE, RENDERED FROM THE FACADE (L4721(b)).
//
// tests/walls/ts/tsconfig.json is the one tsconfig face that is not a
// package's. build-plane's runPaths merges the door table into every
// package face and the base, and never into this one — so its rows were
// a HAND COPY of vitest.shared.ts's resolutionFacade, and the copy
// rotted: at the 2026-11-28 seating it carried 49 of the facade's 305
// rows (benchStage, timelineContract, formSpec, familyLane, catalog,
// infer-gallery, dsh-session absent → 27 TS2307 across 13 suites).
//
// THE LAW: the face resolves what the runtime resolves. Every facade
// row is re-rendered from resolutionFacade() — the one table vitest
// spreads — and nothing else is hand-kept beside the BORROWED rows
// below: the bare externals the facade does not own (the walls lane has
// no package.json, and the repo root links none of them), each borrowed
// from the package copy the suite's own runtime import rides, each with
// the reason it cannot ride the facade. A suite naming a NEW bare
// dependency fails the net loudly (TS2307) and is seated HERE by hand,
// never resolved by magic. TYPECHECK-ONLY (noEmit; vitest never reads
// tsconfig paths — it spreads the facade), so the table changes no
// runtime.
//
//   node tools/walls-face.mjs          rewrite the face (idempotent)
//   node tools/walls-face.mjs --check  exit 1 on drift (the wall's arm)

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolutionFacade } from '../vitest.shared.ts'

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '')
const FACE = 'tests/walls/ts/tsconfig.json'
// the face sits three levels down; every target is written face-relative
const PREFIX = '../../../'

/** Bare externals the facade does not own — the walls lane's borrowed
 *  copies. A directory target resolves through its package.json
 *  `types`; a file target names the declaration face directly. */
const BORROWED = {
  // media-share-door.spec.ts types its runtime require as
  // `typeof import('react')` and requires media-preview's copy — the
  // types ride the same copy's @types, so the declaration and the
  // runtime are one version.
  react: 'packages/web/media-preview/node_modules/@types/react',
  // every .tsx the face reaches imports jsx-runtime implicitly
  // (`jsx: react-jsx`); unresolvable, the whole client plane TS2307s.
  'react/jsx-runtime': 'packages/web/media-preview/node_modules/@types/react/jsx-runtime.d.ts',
  'react-dom/server': 'packages/web/media-preview/node_modules/@types/react-dom/server.d.ts',
  // the census suites read the compiler's own API (ui-pattern-census,
  // client-copy-census) through card-base's copy — the package they
  // name in their own createRequire; the declaration file, because
  // typescript's package.json carries no `types` field.
  typescript: 'packages/web/card-base/node_modules/typescript/lib/typescript.d.ts',
  // aux-model-call-session-log.spec.ts mounts the melite-tools
  // Session with the auxiliary streams it appends — the leaf's copies.
  '@deepseek-ai/dsh-llm': 'packages/harness/melite-tools/node_modules/@deepseek-ai/dsh-llm',
  '@deepseek-ai/dsh-attachment': 'packages/harness/melite-tools/node_modules/@deepseek-ai/dsh-attachment',
}

/** A facade target is a RUNTIME target (the `.js` vitest loads); a
 *  paths target must name the DECLARATION tsc reads — a `.js` target
 *  resolves untyped even beside a tracked sibling `.d.ts` (TS7016 →
 *  the augmentations TS2665, 258 at the first rendering). In order:
 *  the sibling `.d.ts` when it exists; else the package's own
 *  declaration for the row's subpath (`exports['./sub'].types`, the
 *  DSH libs keep types under lib/types/, never beside the .js); else
 *  the target as the facade gives it (a `.ts` source, or a gap the
 *  net reports as TS7016 for the borrowed table to seat). */
function typeTargetOf(key, abs) {
  if (!abs.endsWith('.js')) return relative(ROOT, abs)
  const sibling = abs.slice(0, -'.js'.length) + '.d.ts'
  if (existsSync(sibling)) return relative(ROOT, sibling)
  const m = /^((?:@[^/]+\/)?[^/]+)(?:\/(.*))?$/.exec(key)
  const at = abs.lastIndexOf(`node_modules/${m[1]}/`)
  if (at >= 0) {
    const pkgDir = abs.slice(0, at + `node_modules/${m[1]}`.length)
    const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
    const ex = pkg.exports
    const entry = ex && typeof ex === 'object' && !Array.isArray(ex) ? ex[m[2] ? `./${m[2]}` : '.'] : undefined
    const types = (entry && typeof entry === 'object' ? entry.types ?? entry.default?.types : undefined) ?? pkg.types
    if (typeof types === 'string') return relative(ROOT, join(pkgDir, types))
  }
  return relative(ROOT, abs)
}

/** The complete row table: facade rows (absolute → face-relative
 *  declaration targets) under the borrowed externals. Sorted by key —
 *  tsc matches exact keys, so order carries no law here (unlike the
 *  facade's longest-first). */
export function wallsFaceRows() {
  const rows = {}
  for (const [k, v] of Object.entries(BORROWED)) rows[k] = [PREFIX + v]
  for (const [k, v] of Object.entries(resolutionFacade())) {
    if (k in rows) continue // a borrowed row never shadows the facade's
    rows[k] = [PREFIX + typeTargetOf(k, v)]
  }
  return Object.fromEntries(Object.keys(rows).sort().map((k) => [k, rows[k]]))
}

/** The face, rendered whole — header prose included, one home. */
export function renderWallsFace(rows) {
  const block = Object.entries(rows).map(([k, v]) => `      ${JSON.stringify(k)}: [${v.map((x) => JSON.stringify(x)).join(', ')}]`).join(',\n')
  return `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    // DOM: suites reach client-plane sources (card-base, the h3
    // timeline UI) through the facade — without the DOM lib every
    // document/window touch TS2503s/TS2812s under this face while the
    // package's own client face types it clean.
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    // the same client plane: .tsx sources and the suites that import
    // them (TS6142 without it).
    "jsx": "react-jsx",
    // suites drive the repo's own tooling (tools/*.mjs, scripts/*.mjs):
    // inferred from source, never any — a renamed export in a script a
    // suite calls TS2339s here. checkJs stays off (the scripts' own
    // interiors are not this face's to judge).
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["node"],
    // @types/node is a root devDependency (F-5 cure, 2026-11-05): the
    // default typeRoots walk reaches the repo root's node_modules/@types,
    // so the face carries no pnpm-store path.
    "isolatedModules": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    // L12's second find (li-aq.3): pnpm strictness means the wall
    // plane has NO bare-specifier links of its own — every suite
    // import resolved only at vitest time. The paths block is
    // RENDERED (tools/walls-face.mjs) from vitest.shared.ts's
    // resolutionFacade — the alias table vitest resolves at runtime —
    // plus the bare externals the facade does not own (the borrowed
    // rows, seated and reasoned in the generator). A suite naming a
    // NEW bare dependency fails HERE, loudly. Hand-editing the block
    // is drift: the wall (walls-tsc-net.spec.ts) reds it.
    "baseUrl": ".",
    "paths": {
${block}
    }
  },
  // L12 (li-aq.3): the include named *.test.ts while every suite
  // here is *.spec.ts — the walls' own plane typechecked NOTHING (a
  // wall suite that names a pattern with no members is a wall that
  // never judged itself). The roster is the walls project's: the
  // suites tree plus the lane harness's analyst walls vitest runs
  // beside it (tests/lane/, vitest.config.ts).
  "include": ["*.d.ts", "helpers/**/*.ts", "suites/**/*.spec.ts", "../../lane/**/*.spec.ts"]
}
`
}

const rows = wallsFaceRows()
const want = renderWallsFace(rows)
const have = readFileSync(new URL('../' + FACE, import.meta.url), 'utf8')
if (process.argv.includes('--check')) {
  if (have !== want) {
    console.error(`paths drift: ${FACE} is not the facade's rendering — re-run: node tools/walls-face.mjs`)
    process.exit(1)
  }
  console.log(`walls face: ${Object.keys(rows).length} rows, stable`)
} else if (have !== want) {
  writeFileSync(new URL('../' + FACE, import.meta.url), want)
  console.log(`walls face: rewritten, ${Object.keys(rows).length} rows`)
} else {
  console.log(`walls face: ${Object.keys(rows).length} rows, stable`)
}
