// @contract infra-paths-exports-law
// paths-exports-law.spec.ts — the alias-plane's standing judge (the
// 2026-10-18 conventions plane's J2, closed 2026-11-12). The law's
// strict letter: no deep-import escape hatch the exports map doesn't
// declare. A tsconfig paths key that names a workspace package
// subpath is a live import surface — every one is either declared in
// the named package's exports map or pinned HERE as an adjudicated
// exception with its why. An undeclared new alias reds; a stale pin
// (the alias died) reds too.
//
// THE ADJUDICATED EXCEPTIONS (the ledger-own branch the audit named):
//  - @melite-plugin/dsh-gallery/drilldown — the CLIENT-plane door
//    (src/drilldown.tsx rides the tsdown client bundle; the dual-face
//    law excludes it from the host program at tsconfig.host.json, so
//    no host artifact exists for an exports row to name — artifact-
//    plane-law.spec.ts W4 seals the partition). Resolved via paths at
//    both faces; ledger-owned.
//  - @melite/engine-contract/* — tsconfig.repotier.json's convenience
//    wildcard; every concrete row it can hit (., ./engines, ./types,
//    ./vocabulary) IS declared in the package's exports map.
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..', '..', '..')

/** Alias keys adjudicated OUTSIDE the exports maps, with their whys. */
const PINNED: Record<string, string> = {
  '@melite-plugin/dsh-gallery/drilldown':
    'client-plane door (dual-face law: excluded from the host program, ships inside the client bundle — no artifact for an exports row)',
  '@melite/engine-contract/*':
    'repotier convenience wildcard; every concrete row it can hit is declared in the package exports map',
}

/** package name → exports map (workspace packages only). */
function workspaceExports(): Map<string, Record<string, unknown>> {
  const out = new Map<string, Record<string, unknown>>()
  const walk = (dir: string): void => {
    let ents: Array<{ name: string, isDirectory: boolean }>
    try {
      ents = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of ents) {
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'lib' || e.name === 'dist') continue
        walk(full)
      } else if (e.name === 'package.json') {
        try {
          const d = JSON.parse(stripComments(readFileSync(full, 'utf8')))
          if (typeof d.name === 'string' && typeof d.exports === 'object' && d.exports !== null) {
            out.set(d.name, d.exports as Record<string, unknown>)
          }
        } catch {
          /* an unparseable manifest is another wall's finding */
        }
      }
    }
  }
  walk(join(ROOT, 'packages'))
  return out
}

function stripComments(text: string): string {
  return text.replace(/^\s*\/\/.*$/gm, '')
}

/** Every tsconfig paths key under the repo (root, packages, tools). */
function aliasKeys(): Map<string, number> {
  const seen = new Map<string, number>()
  const roots = [join(ROOT, 'packages'), join(ROOT, 'tools')]
  /** Read the repo-root tsconfigs directly (they are files, not dirs). */
  const readRoot = (name: string): void => {
    try {
      const d = JSON.parse(stripComments(readFileSync(join(ROOT, name), 'utf8')))
      for (const key of Object.keys((d.compilerOptions ?? {}).paths ?? {})) {
        seen.set(key, (seen.get(key) ?? 0) + 1)
      }
    } catch {
      /* a root tsconfig that is not plain JSON sits outside this census */
    }
  }
  const walk = (f: string): void => {
    let ents: Array<{ name: string, isDirectory: boolean }>
    try {
      ents = readdirSync(f, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of ents) {
      const full = join(f, e.name)
      if (e.isDirectory()) {
        if (e.name === 'node_modules') continue
        walk(full)
      } else if (/^tsconfig.*\.json$/.test(e.name)) {
        try {
          const d = JSON.parse(stripComments(readFileSync(full, 'utf8')))
          for (const key of Object.keys((d.compilerOptions ?? {}).paths ?? {})) {
            seen.set(key, (seen.get(key) ?? 0) + 1)
          }
        } catch {
          /* a tsconfig that is not plain JSON (extends chains with
             comments beyond line form) sits outside this census */
        }
      }
    }
  }
  for (const r of roots) walk(r)
  readRoot('tsconfig.base.json')
  readRoot('tsconfig.repotier.json')
  return seen
}

describe('THE PATHS-EXPORTS LAW — the alias plane (J2)', () => {
  it('every tsconfig alias naming a workspace subpath is declared in that package\'s exports map or pinned here', () => {
    const exportsByName = workspaceExports()
    const offenders: string[] = []
    for (const [key, tsconfigCount] of aliasKeys()) {
      const m = /^(@[^/]+\/[^/]+?)(?:\/([^*].*))?$/.exec(key)
      if (!m) continue
      const [, pkgName, subpath] = m
      const exp = exportsByName.get(pkgName)
      if (!exp) continue // an alias to a non-workspace package is not this law's subject
      const row = subpath ? `./${subpath}` : '.'
      if (row in exp) continue
      if (key in PINNED) continue
      offenders.push(
        `${key} (in ${tsconfigCount} tsconfig(s)): names ${pkgName} with no exports row for ${row} — declare the row or adjudicate the pin`,
      )
    }
    expect(offenders).toEqual([])
  })

  it('every pinned alias still exists in some tsconfig (a dead pin reds)', () => {
    const keys = aliasKeys()
    const offenders: string[] = []
    for (const pin of Object.keys(PINNED)) {
      if (!keys.has(pin)) offenders.push(`${pin}: pinned but no tsconfig carries the alias anymore — step the pin out`)
    }
    expect(offenders).toEqual([])
  })
})
