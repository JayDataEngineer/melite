// lora-roster-reader-census.spec.ts — THE ROSTER READERS ARE THE SERVED
// SEAM, NEVER THE ROWS FILE (lora audit F7, 2026-11-15). The browser
// surfaces (packages/web, packages/web-kit) must read the served
// modCatalog/flavor seam — the engine's catalog emission and the
// flavor's served envelope — never re-read the user-loras rows JSON or
// import its node:fs module (a client bundle may not inline node:fs,
// and a second reader is a second truth about the rows file). This
// census pins both edges: zero seam imports from the browser tiers,
// and the tree-wide importer set exactly the engine-plane seams.
//
// TOGGLE: add `import { userLorasPath } from
// '@melite/comfyui-cordis/user-loras'` to any web/web-kit src file →
// both arms red; remove it → green.
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..')

/** A module import (static, dynamic, or require) whose specifier names
 *  the user-loras seam — the rows-file reader's module. Comment prose
 *  naming the seam carries no quotes beside an import keyword, so it
 *  never matches. */
const SEAM_IMPORT = /["'`][^"'`]*user[-_.]?[lL]oras[^"'`]*["'`]/

const isSeamImportLine = (line: string): boolean =>
  SEAM_IMPORT.test(line) && /\b(?:from|import|require)\b/.test(line)

/** The importer census over every package src tree (tests excluded —
 *  the walls pin the universe verbatim by design). Returns the sorted
 *  repo-relative file list. */
const seamImporters = (bases: Array<string>): Array<string> => {
  const hits: string[] = []
  const walkSrc = (dir: string): void => {
    for (const e of readdirSync(dir)) {
      if (e === 'node_modules') continue // vendored seats carry no seam import
      const p = join(dir, e)
      let isDir = false
      try { isDir = statSync(p).isDirectory() } catch { continue /* dangling link */ }
      if (isDir) { walkSrc(p); continue }
      if (!e.endsWith('.ts') && !e.endsWith('.tsx')) continue
      if (readFileSync(p, 'utf8').split('\n').some(isSeamImportLine)) hits.push(p.slice(ROOT.length + 1))
    }
  }
  for (const base of bases) {
    for (const e of readdirSync(join(ROOT, base))) {
      const srcDir = join(ROOT, base, e, 'src')
      try { readdirSync(srcDir) } catch { continue /* no src tree here */ }
      walkSrc(srcDir)
    }
  }
  return hits.sort()
}

const ALL_PKGS = ['packages/models', 'packages/engines', 'packages/harness', 'packages/web', 'packages/web-kit']
const BROWSER_PKGS = ['packages/web', 'packages/web-kit']

/** The one importer set: the engine-plane seams that OWN the rows
 *  file — the tray/cards/flavor module faces inside comfyui-cordis,
 *  the estate's manage plane (the rows door), and the tools' doors +
 *  discovery (the read-only serve). */
const PINNED_IMPORTERS = [
  'packages/engines/comfyui-cordis/src/cardDefs.ts',
  'packages/engines/comfyui-cordis/src/mods/trayLoras.ts',
  'packages/engines/comfyui-cordis/src/mods/userLorasFlavor.ts',
  'packages/harness/estate-queue/src/managePlane.ts',
  'packages/harness/melite-tools/src/discovery.ts',
  'packages/harness/melite-tools/src/doors.ts',
]

describe('THE USER-LORAS SEAM IS ENGINE-PLANE ONLY', () => {
  it('no browser surface imports the user-loras seam (the served catalog is their only roster)', () => {
    expect(seamImporters(BROWSER_PKGS), 'the browser tiers read the served seam, never the rows module').toEqual([])
  })

  it('the tree-wide importer set is exactly the pinned engine-plane seams', () => {
    expect(seamImporters(ALL_PKGS), 'a new seam importer is a second reader of the rows file').toEqual(PINNED_IMPORTERS)
  })
})
