/**
 * E4.6 — Centralized shortcuts registry tests.
 *
 * Verifies the SHORTCUTS constant is well-formed, complete (covers
 * every shortcut wired in the keyboard handler), and the grouping
 * helper works.
 */
import { describe, it, expect } from 'vitest'
import {
  SHORTCUTS,
  SHORTCUT_CATEGORY_ORDER,
  findShortcutById,
  groupShortcutsByCategory,
  type ShortcutCategory,
} from '@melite/ui'

describe('SHORTCUTS registry (E4.6)', () => {
  it('is non-empty', () => {
    expect(SHORTCUTS.length).toBeGreaterThan(10)
  })

  it('every entry has a unique id', () => {
    const ids = SHORTCUTS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every entry has non-empty keys + description + valid category', () => {
    const validCats = new Set<ShortcutCategory>([
      'Transport', 'Editing', 'Selection', 'Navigation', 'History', 'Clipboard',
    ])
    for (const s of SHORTCUTS) {
      expect(s.keys.length).toBeGreaterThan(0)
      expect(s.description.length).toBeGreaterThan(0)
      expect(validCats.has(s.category)).toBe(true)
    }
  })

  it('includes every shortcut wired in the keyboard handler', () => {
    // These ids map 1:1 to the keyboard handler branches.
    const expected = [
      'play-pause', 'seek-back', 'seek-fwd', 'home',
      'frame-back', 'frame-fwd', 'fullscreen', 'loop',
      'select-all', 'clear-selection',
      'ripple-delete', 'delete',
      'split', 'duplicate',
      'mark-in', 'mark-out', 'mark-selection', 'add-marker',
      'zoom-in', 'zoom-out',
      'undo', 'redo',
      'copy-params', 'paste-params',
      'cheatsheet',
    ]
    for (const id of expected) {
      expect(findShortcutById(id)).toBeDefined()
    }
  })

  it('SHORTCUT_CATEGORY_ORDER lists every distinct category used', () => {
    const usedCats = new Set(SHORTCUTS.map((s) => s.category))
    for (const cat of usedCats) {
      expect(SHORTCUT_CATEGORY_ORDER).toContain(cat)
    }
  })
})

describe('findShortcutById (E4.6)', () => {
  it('locates a shortcut by id', () => {
    expect(findShortcutById('play-pause')?.keys).toBe('Space')
  })

  it('returns undefined for an unknown id', () => {
    expect(findShortcutById('nope')).toBeUndefined()
  })
})

describe('groupShortcutsByCategory (E4.6)', () => {
  it('returns a key per category in SHORTCUT_CATEGORY_ORDER', () => {
    const grouped = groupShortcutsByCategory()
    for (const cat of SHORTCUT_CATEGORY_ORDER) {
      expect(grouped[cat]).toBeDefined()
      expect(Array.isArray(grouped[cat])).toBe(true)
    }
  })

  it('every shortcut appears in exactly one category group', () => {
    const grouped = groupShortcutsByCategory()
    const totalGrouped = Object.values(grouped).reduce((t, list) => t + list.length, 0)
    expect(totalGrouped).toBe(SHORTCUTS.length)
  })

  it('respects the category order', () => {
    const grouped = groupShortcutsByCategory()
    const keysInGroupingOrder = Object.keys(grouped)
    expect(keysInGroupingOrder).toEqual([...SHORTCUT_CATEGORY_ORDER])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Structural + invariant tests
// ════════════════════════════════════════════════════════════════════════════
describe('SHORTCUTS structural invariants', () => {
  it('SHORTCUT_CATEGORY_ORDER has exactly 6 categories', () => {
    expect(SHORTCUT_CATEGORY_ORDER).toHaveLength(6)
  })

  it('every category in SHORTCUT_CATEGORY_ORDER has at least one shortcut', () => {
    const grouped = groupShortcutsByCategory()
    for (const cat of SHORTCUT_CATEGORY_ORDER) {
      expect(grouped[cat].length).toBeGreaterThan(0)
    }
  })

  it('SHORTCUT_CATEGORY_ORDER has no duplicates', () => {
    const cats = [...SHORTCUT_CATEGORY_ORDER]
    expect(new Set(cats).size).toBe(cats.length)
  })

  it('every shortcut id uses only lowercase + hyphens (kebab-case)', () => {
    for (const s of SHORTCUTS) {
      expect(s.id).toMatch(/^[a-z][a-z0-9-]*$/)
    }
  })

  it('every shortcut description ends without a period (imperative style)', () => {
    for (const s of SHORTCUTS) {
      expect(s.description.endsWith('.')).toBe(false)
    }
  })

  it('no two shortcuts share the same keys within the same category', () => {
    const grouped = groupShortcutsByCategory()
    for (const [cat, list] of Object.entries(grouped)) {
      const keys = list.map((s) => s.keys)
      const unique = new Set(keys)
      expect(unique.size, `Duplicate keys in category '${cat}'`).toBe(keys.length)
    }
  })

  it('the cheatsheet shortcut (?) is categorized under History (known source-level quirk)', () => {
    const cheatsheet = findShortcutById('cheatsheet')
    expect(cheatsheet?.category).toBe('History')
  })

  it('Transport category contains play-pause (Space)', () => {
    const grouped = groupShortcutsByCategory()
    const transportIds = grouped['Transport'].map((s) => s.id)
    expect(transportIds).toContain('play-pause')
  })

  it('Clipboard category contains both copy and paste', () => {
    const grouped = groupShortcutsByCategory()
    const ids = grouped['Clipboard'].map((s) => s.id)
    expect(ids).toContain('copy-params')
    expect(ids).toContain('paste-params')
  })

  it('undo and redo are both in the History category', () => {
    const grouped = groupShortcutsByCategory()
    const ids = grouped['History'].map((s) => s.id)
    expect(ids).toContain('undo')
    expect(ids).toContain('redo')
  })
})

describe('findShortcutById — edge cases', () => {
  it('returns undefined for an empty string id', () => {
    expect(findShortcutById('')).toBeUndefined()
  })

  it('is case-sensitive (uppercase does not match lowercase id)', () => {
    expect(findShortcutById('Play-Pause')).toBeUndefined()
  })

  it('finds shortcuts with multi-word ids (hyphenated)', () => {
    expect(findShortcutById('ripple-delete')?.keys).toBe('Shift+Delete')
    expect(findShortcutById('mark-selection')?.keys).toBe('M')
  })
})

describe('groupShortcutsByCategory — within-category ordering', () => {
  it('preserves SHORTCUTS declaration order within each category', () => {
    const grouped = groupShortcutsByCategory()
    for (const cat of SHORTCUT_CATEGORY_ORDER) {
      const inGroup = grouped[cat]
      // Filter SHORTCUTS to only those in this category, preserving order.
      const inOrder = SHORTCUTS.filter((s) => s.category === cat)
      expect(inGroup.map((s) => s.id)).toEqual(inOrder.map((s) => s.id))
    }
  })

  it('returns a fresh object each call (not cached)', () => {
    const a = groupShortcutsByCategory()
    const b = groupShortcutsByCategory()
    expect(a).not.toBe(b)
    // But same content.
    expect(a['Transport']).toEqual(b['Transport'])
  })
})
