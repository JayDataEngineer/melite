// card-one-row walls (THE ONE-ROW LAW, operator order 2026-10-01:
// "THERE IS ONE WITH SEAMS, LOOK AT HOW DSH DOES UI"): the studio
// atoms of @melite/card-base compile ONCE into its own lib/client.js
// graph row — the mirror of DSH's platform seed (getStaticModules,
// dsh-client-web/src/seed.ts: every bundle sees the same instance).
// No other client bundle may inline a second compiled copy (the
// img-to-mesh zoom screen carried TWO css-module hashes of the same
// specField class, and a card-base fix landed only in the cards that
// happened to rebuild). The door is the /client specifier — the
// DSH convention dsh-api-gateway set (types at the src face, the
// browser require served by the row through stripClientSuffix, the
// tsdown external row matching the exact request). Always pinned:
// pure fs over the committed tree, no binaries, no network.
//
// RUN: pnpm exec vitest run test/card-one-row.spec.ts
// (from packages/harness/melite-tools).

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../../../..')
const PACKAGES = join(REPO, 'packages')
const ROW_ID = '@melite/card-base'
const ROW_DOOR = '@melite/card-base/client'
const ROW_DIR = join(REPO, 'packages/web/card-base')

/** Walk packages/<genre>/<pkg> directories (two levels, the genre
 *  layout of this repo). */
function* packageDirs(): Generator<string> {
  for (const genre of readdirSync(PACKAGES)) {
    const gdir = join(PACKAGES, genre)
    if (!statSync(gdir).isDirectory()) continue
    for (const pkg of readdirSync(gdir)) {
      const pdir = join(gdir, pkg)
      const manifest = join(pdir, 'package.json')
      if (!statSync(pdir).isDirectory() || !existsSync(manifest)) continue
      yield pdir
    }
  }
}

/** Read a package.json if it parses; null otherwise. */
function readManifest(pdir: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(join(pdir, 'package.json'), 'utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

/** A package ships a BUILT browser face when its ./client export
 *  resolves to a real bundle under lib/ — the two legal shapes the
 *  tsc module graph emits (lib/client.js flat, or the directory
 *  module lib/client/index.js). The singleton-law and ship-lane
 *  discovery arms accept both; this wall reads the same rule. */
function clientTarget(manifest: Record<string, unknown>): string | null {
  const exports = manifest['exports']
  if (exports === null || typeof exports !== 'object') return null
  const client = (exports as Record<string, unknown>)['./client']
  const target = typeof client === 'object' && client !== null
    ? (client as Record<string, unknown>)['default']
    : client
  if (typeof target !== 'string') return null
  const rel = target.replace('./', '')
  return rel === 'lib/client.js' || rel === 'lib/client/index.js' ? rel : null
}

/** The dsh.client.external list of a manifest (missing = empty). */
function externalList(manifest: Record<string, unknown>): string[] {
  const dsh = manifest['dsh']
  if (dsh === null || typeof dsh !== 'object') return []
  const client = (dsh as Record<string, unknown>)['client']
  if (client === null || typeof client !== 'object') return []
  const ext = (client as Record<string, unknown>)['external']
  return Array.isArray(ext) ? ext.filter((e): e is string => typeof e === 'string') : []
}

/** One spec-line match for either quote style (import … from '<spec>'). */
function importHits(code: string, spec: string): boolean {
  return code.includes(`from '${spec}'`) || code.includes(`from "${spec}"`)
}

describe('card-one-row walls (always pinned, pure fs over the committed tree)', () => {
  test('THE ONE ROW: only card-base\'s own bundle may compile the atoms; every consumer requires the row', () => {
    const problems: string[] = []
    for (const pdir of packageDirs()) {
      const manifest = readManifest(pdir)
      if (manifest === null) continue
      const face = clientTarget(manifest)
      if (face === null) continue
      const bundlePath = join(pdir, face)
      const rel = relative(REPO, bundlePath)
      if (!existsSync(bundlePath)) continue // ship-lane's own gate owns the missing-bundle case
      const code = readFileSync(bundlePath, 'utf8')
      if (pdir === ROW_DIR) {
        // The row itself: it must REGISTER its identity — the tsc
        // module graph exports `name` (the loader wrapper's `id:` was
        // the tsdown preset's shape; the preset is dead).
        const registered = code.includes(`export const name = '${ROW_ID}'`)
          || code.includes(`export const name = "${ROW_ID}"`)
          || code.includes(`id: "${ROW_ID}"`)
        if (!registered) {
          problems.push(`${rel}: the row bundle does not register as "${ROW_ID}" — rebuild the client face`)
        }
        continue
      }
      // A consumer: inlined-atom markers are css-module hashes of
      // card-base's classes (e.g. FRpSCG_specSliderValue) and the
      // bundler's region comments naming card-base sources. Symbol
      // names like DeclarativeStudio are NOT markers — property
      // access on the require()d row legitimately spells them.
      const hashedAtom = code.match(/[A-Za-z0-9]+_(?:specSliderValue|specFieldKey)/)
      if (hashedAtom !== null) {
        problems.push(`${rel}: inlines a compiled card-base atom class ("${hashedAtom[0]}") — the css must come from the one row`)
      }
      const region = code.match(/\/\/\s*#region\s+\S*card-base\/src\//)
      if (region !== null) {
        problems.push(`${rel}: inlines card-base source (${region[0].trim()}) — add "${ROW_DOOR}" to dsh.client.external and rebuild`)
      }
      // The tsc module graph leaves the door a bare external — a
      // static import from it resolves to the row at serve time; the
      // tsdown-era require() wrapper was the bundler interop shape.
      const requires = code.includes(`require("${ROW_DOOR}")`)
        || importHits(code, ROW_DOOR)
      // deck ships a built client WITHOUT using the row — the require
      // is owed only by actual users (src imports the door).
      let usesRow = false
      const walk = (dir: string): void => {
        if (!existsSync(dir) || usesRow) return
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === 'node_modules' || entry.name === 'lib') continue
          const full = join(dir, entry.name)
          if (entry.isDirectory()) { walk(full); continue }
          if (!/\.(ts|tsx)$/.test(entry.name)) continue
          if (importHits(readFileSync(full, 'utf8'), ROW_DOOR)) usesRow = true
        }
      }
      walk(join(pdir, 'src'))
      if (usesRow && !requires) {
        const src = JSON.stringify(manifest['name'] ?? rel)
        problems.push(`${rel}: src uses ${ROW_DOOR} but the bundle never requires it — add "${ROW_DOOR}" to dsh.client.external and rebuild (${src})`)
      }
    }
    assert.deepEqual(problems, [], problems.join('\n'))
  })

  test('the external declarations exist: every built-client package that imports the row declares it external', () => {
    const problems: string[] = []
    for (const pdir of packageDirs()) {
      const manifest = readManifest(pdir)
      if (manifest === null || clientTarget(manifest) === null) continue
      const ext = externalList(manifest)
      // Does this package's src reach the row's door at all?
      let srcs = 0
      const walk = (dir: string): void => {
        if (!existsSync(dir)) return
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === 'node_modules' || entry.name === 'lib') continue
          const full = join(dir, entry.name)
          if (entry.isDirectory()) { walk(full); continue }
          if (!/\.(ts|tsx)$/.test(entry.name)) continue
          if (importHits(readFileSync(full, 'utf8'), ROW_DOOR)) srcs += 1
        }
      }
      walk(join(pdir, 'src'))
      if (srcs === 0) continue
      if (!ext.includes(ROW_DOOR)) {
        problems.push(`${relative(REPO, pdir)}: src imports ${ROW_DOOR} but dsh.client.external lacks it — the next rebuild silently inlines a second copy of the atoms`)
      }
    }
    assert.deepEqual(problems, [], problems.join('\n'))
  })

  test('client-plane source imports the /client door only (the loader serves the package row; bare and other subpaths miss it)', () => {
    const problems: string[] = []
    for (const pdir of packageDirs()) {
      if (pdir === ROW_DIR) continue
      const walk = (dir: string): void => {
        if (!existsSync(dir)) return
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === 'node_modules' || entry.name === 'lib') continue
          const full = join(dir, entry.name)
          if (entry.isDirectory()) { walk(full); continue }
          if (!/\.(ts|tsx)$/.test(entry.name)) continue
          const code = readFileSync(full, 'utf8')
          // strip comments — doc comments cite specifiers as examples
          const bare = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
          const hit = bare.match(new RegExp(`from ['"]${ROW_ID}(?:/[a-zA-Z0-9_-]+)?['"]`))
          if (hit !== null) {
            const what = hit[0].endsWith('/client\'') || hit[0].endsWith('/client"') ? '' : ' — stripClientSuffix strips only "/client"; any other require misses the module table'
            if (what !== '') {
              problems.push(`${relative(REPO, full)}: ${hit[0]}${what}. Import "${ROW_DOOR}" (its types face re-exports the full surface)`)
            }
          }
        }
      }
      walk(join(pdir, 'src'))
    }
    assert.deepEqual(problems, [], problems.join('\n'))
  })

  test('the door resolves: a src import of the door obliges a built client face (a phantom require loads nothing)', () => {
    const problems: string[] = []
    for (const pdir of packageDirs()) {
      const manifest = readManifest(pdir)
      if (manifest === null) continue
      const walk = (dir: string): void => {
        if (!existsSync(dir) || problems.length > 0) return
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === 'node_modules' || entry.name === 'lib') continue
          const full = join(dir, entry.name)
          if (entry.isDirectory()) { walk(full); continue }
          if (!/\.(ts|tsx)$/.test(entry.name)) continue
          if (!importHits(readFileSync(full, 'utf8'), ROW_DOOR)) continue
          // This src file requires the row — the package must ship
          // the browser face the loader serves (exports['./client'] →
          // a lib/client bundle), or the browser require has no target.
          if (clientTarget(manifest) === null) {
            problems.push(`${relative(REPO, pdir)}: src imports ${ROW_DOOR} but the package ships no built client face — add exports['./client'] (tsdown.client preset) or import the node-plane face`)
          }
          return
        }
      }
      walk(join(pdir, 'src'))
    }
    assert.deepEqual(problems, [], problems.join('\n'))
  })
})
