/**
 * E4.6 — Centralized keyboard shortcuts registry.
 *
 * SINGLE SOURCE OF TRUTH for every keyboard shortcut in the editor.
 * The keyboard handler in VideoEditor, the hint line, and the
 * ShortcutsModal all read from this constant — so adding/removing a
 * shortcut here automatically updates the cheatsheet + the hint line
 * without touching three different files.
 *
 * Each entry carries enough metadata to render a human-readable row:
 *   • `keys`       — the display label (e.g. "Shift+D", "Ctrl/Cmd+Z").
 *                    Slash-separated alternatives are explicit so the
 *                    cheatsheet is unambiguous about Mac vs Win/Linux.
 *   • `description` — what it does (imperative: "Play / pause").
 *   • `category`   — grouping for the cheatsheet (Transport, Editing,
 *                    Selection, Navigation, History, Clipboard).
 *   • `id`         — stable identifier (used as React key + for tests).
 *
 * When you add a new shortcut to VideoEditor's keydown handler, ADD IT
 * HERE TOO. The point of this module is that the cheatsheet never lies
 * about what's available — if it's wired but not listed here, users
 * can't discover it.
 */
export type ShortcutCategory =
  | 'Transport'
  | 'Editing'
  | 'Selection'
  | 'Navigation'
  | 'History'
  | 'Clipboard'

export interface ShortcutDef {
  id: string
  keys: string
  description: string
  category: ShortcutCategory
}

export const SHORTCUTS: readonly ShortcutDef[] = [
  // ── Transport ───────────────────────────────────────────────────────
  { id: 'play-pause', keys: 'Space', description: 'Play / pause', category: 'Transport' },
  { id: 'seek-back', keys: '←', description: 'Seek back 0.1s (Shift = 1s)', category: 'Transport' },
  { id: 'seek-fwd', keys: '→', description: 'Seek forward 0.1s (Shift = 1s)', category: 'Transport' },
  { id: 'frame-back', keys: ',', description: 'Step back 1 frame (Shift = 5)', category: 'Transport' },
  { id: 'frame-fwd', keys: '.', description: 'Step forward 1 frame (Shift = 5)', category: 'Transport' },
  { id: 'fullscreen', keys: 'F', description: 'Toggle fullscreen preview', category: 'Transport' },
  { id: 'loop', keys: 'L', description: 'Toggle loop region (in/out)', category: 'Transport' },

  // ── Navigation ──────────────────────────────────────────────────────
  { id: 'home', keys: 'Home', description: 'Jump to timeline start', category: 'Navigation' },
  { id: 'zoom-in', keys: '+ / =', description: 'Zoom timeline in', category: 'Navigation' },
  { id: 'zoom-out', keys: '−', description: 'Zoom timeline out', category: 'Navigation' },

  // ── Editing ─────────────────────────────────────────────────────────
  { id: 'split', keys: 'S', description: 'Split segment at playhead', category: 'Editing' },
  { id: 'duplicate', keys: 'Shift+D', description: 'Duplicate segment N× (seed bump)', category: 'Editing' },
  { id: 'delete', keys: 'Delete', description: 'Delete selected segment(s)', category: 'Editing' },
  { id: 'ripple-delete', keys: 'Shift+Delete', description: 'Ripple delete (close the gap)', category: 'Editing' },

  // ── Selection ───────────────────────────────────────────────────────
  { id: 'select-all', keys: 'Ctrl/Cmd+A', description: 'Select all segments', category: 'Selection' },
  { id: 'clear-selection', keys: 'Esc', description: 'Clear multi-select / in-out points', category: 'Selection' },
  { id: 'mark-in', keys: 'I', description: 'Mark IN point at playhead', category: 'Selection' },
  { id: 'mark-out', keys: 'O', description: 'Mark OUT point at playhead', category: 'Selection' },
  { id: 'mark-selection', keys: 'M', description: 'Mark selection from playhead', category: 'Selection' },
  { id: 'add-marker', keys: 'Shift+M', description: 'Add chapter marker at playhead', category: 'Selection' },

  // ── Clipboard ───────────────────────────────────────────────────────
  { id: 'copy-params', keys: 'Ctrl/Cmd+Shift+C', description: 'Copy segment params + prompt', category: 'Clipboard' },
  { id: 'paste-params', keys: 'Ctrl/Cmd+Shift+V', description: 'Paste params into selected segment', category: 'Clipboard' },

  // ── History ─────────────────────────────────────────────────────────
  { id: 'undo', keys: 'Ctrl/Cmd+Z', description: 'Undo', category: 'History' },
  { id: 'redo', keys: 'Ctrl/Cmd+Y', description: 'Redo', category: 'History' },

  // ── Help ────────────────────────────────────────────────────────────
  { id: 'cheatsheet', keys: '?', description: 'Show this keyboard cheatsheet', category: 'History' },
]

/** Ordered list of categories for the cheatsheet render. */
export const SHORTCUT_CATEGORY_ORDER: readonly ShortcutCategory[] = [
  'Transport',
  'Navigation',
  'Editing',
  'Selection',
  'Clipboard',
  'History',
]

/** Lookup helper — returns the shortcut def or undefined. */
export function findShortcutById(
  id: string,
): ShortcutDef | undefined {
  return SHORTCUTS.find((s) => s.id === id)
}

/** Group shortcuts by category, preserving the category order above. */
export function groupShortcutsByCategory(): Record<ShortcutCategory, ShortcutDef[]> {
  const grouped = {} as Record<ShortcutCategory, ShortcutDef[]>
  for (const cat of SHORTCUT_CATEGORY_ORDER) {
    grouped[cat] = SHORTCUTS.filter((s) => s.category === cat)
  }
  return grouped
}
