/**
 * vitest-tree-portability.spec.ts — THE TREE-PARTITION WALL (the
 * 2026-11-06 windows 37-ReferenceError class): the dom/deck/gallery
 * spec trees must stay root-relative posix rows. vitest matches
 * include/exclude against forward-slash paths on EVERY os (pathe
 * relative + tinyglobby/fdir); an absolute row minted by path.join
 * carries backslashes on Windows and matches NOTHING there — the
 * client projects found zero files while the node lane claimed
 * their browser-global specs and died (addEventListener/document
 * is not defined, 161 windows reds).
 *
 * Arms judge the config's OWN rows (imported, never copied): the
 * shape law fires on any lane the moment a row goes absolute
 * again, and every row's literal prefix must be a real tree.
 */
import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import {
  DECK_SPEC_TREES,
  DOM_SPEC_TREES,
  GALLERY_SPEC_TREES,
} from '../../vitest.config.ts'

const TREES: Record<string, readonly string[]> = {
  DOM_SPEC_TREES,
  GALLERY_SPEC_TREES,
  DECK_SPEC_TREES,
}

describe('the tree-partition rows (windows class #2)', () => {
  for (const [name, rows] of Object.entries(TREES)) {
    it(`${name}: every row is root-relative posix — never absolute, never backslashed`, () => {
      expect(rows.length).toBeGreaterThan(0)
      for (const row of rows) {
        expect(row).not.toMatch(/^[A-Za-z]:/)
        expect(row).not.toContain('\\')
        expect(row.startsWith('/')).toBe(false)
        expect(row.startsWith('packages/')).toBe(true)
      }
    })

    it(`${name}: every row anchors a real spec tree`, () => {
      for (const row of rows) {
        const prefix = row.slice(0, row.indexOf('*'))
        expect(existsSync(prefix)).toBe(true)
      }
    })
  }
})
