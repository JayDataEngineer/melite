/**
 * The Cards sidebar entry — the family pattern (Task Board / SSH): ONE row
 * in the left sidebar under New Session, ordered with the extension
 * family's rows, opening the card deck as a FULL TAKEOVER of the center
 * column. (Operator law 2026-08-22: card view is NOT a top tab — the top
 * strip is chat's; the entry point lives in the left sidebar, like Kan.)
 *
 * Mechanics: the row comes from the vendored sidebar-entry-core (self-healing
 * DOM injection — dsh's sidebar shell exposes no registrable nav slot).
 * Toggling mounts a taskboard-style container (absolute inset 0, z-60) as a
 * direct child of the center column and renders DeckCanvas into it via its
 * own React root. deck-fullbleed observes the deck node's presence in the
 * column and applies the takeover (html attr + column sibling-kill +
 * composer hide), so this module never touches styling itself.
 */
import { createRoot } from 'react-dom/client'
import css from './deck.module.css'
import { DeckCanvas, setPendingDraft, OPEN_DRAFT_EVENT } from './DeckCanvas.tsx'
import { mountSidebarEntry } from './sidebar-entry-core.ts'

/** The mounted deck container (taskboard-style overlay child of the column). */
const CONTAINER_SEL = '[data-melite-cards-deck-view]'

/** The center column the container overlays (same selector as deck-fullbleed). */
const COLUMN_SEL = '[data-pane="conversation"], [class*="centerCol"]'

/** Family row selectors this entry orders against (task-board + ssh). */
const FAMILY_SELECTORS = [
  '[data-dsh-taskboard-entry]',
  '[data-dsh-ssh-entry]',
  '[data-melite-cards-entry]',
] as const

/** Cards icon — two stacked cards, the shell's 16px nav-icon look. */
const ICON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">'
  + '<rect x="5.5" y="2.5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/>'
  + '<rect x="2.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"'
  + ' fill="var(--dsw-alias-bg-base, #17171c)"/></svg>'

/** Deck open-state events (the active-bridge the entry core subscribes to). */
const OPEN_EVENT = 'melite-cards-deck-open-changed'

function isOpen(): boolean {
  return document.querySelector(CONTAINER_SEL) !== null
}

/** Mount the deck container into the center column (idempotent). */
function openDeck(): void {
  if (isOpen()) return
  const column = document.querySelector<HTMLElement>(COLUMN_SEL)
  if (column === null) {
    console.warn('[melite-cards] deck cannot mount: center column not found (' + COLUMN_SEL + ') - shell DOM changed or still loading')
    return
  }
  const container = document.createElement('div')
  container.setAttribute(CONTAINER_SEL.slice(1, -1), '')
  // Task-board overlay geometry: the column is position:relative while any
  // family panel is active (deck-fullbleed css), absolute fill rides it.
  container.style.position = 'absolute'
  container.style.inset = '0'
  container.style.zIndex = '60'
  container.style.display = 'flex'
  container.style.flexDirection = 'column'
  container.style.background = 'var(--dsw-alias-bg-base, #17171c)'
  column.appendChild(container)
  const root = createRoot(container)
  root.render(<DeckCanvas />)
  container.dataset.root = '1'
  document.dispatchEvent(new CustomEvent(OPEN_EVENT))
}

/** Unmount and remove the deck container. */
function closeDeck(): void {
  const container = document.querySelector<HTMLElement>(CONTAINER_SEL)
  if (container === null) return
  // React 18 unmount is async-flushed; removing the host node first is safe.
  container.remove()
  document.dispatchEvent(new CustomEvent(OPEN_EVENT))
}

/**
 * Mount the Cards sidebar entry (left sidebar, family block).
 * @returns disposer removing the row.
 */
export function mountCardsSidebarEntry(): () => void {
  const dispose = mountSidebarEntry({
    rowAttribute: 'data-melite-cards-entry',
    rowSelector: '[data-melite-cards-entry]',
    icon: ICON,
    css: {
      entry: css['entry'] ?? '',
      entryIcon: css['entryIcon'] ?? '',
      entryLabel: css['entryLabel'] ?? '',
    },
    label: () => 'Cards',
    tooltip: () => 'Melite card deck',
    onToggle: () => { isOpen() ? closeDeck() : openDeck() },
    position: 'before',
    familySelectors: FAMILY_SELECTORS,
    active: {
      subscribe: (listener: () => void) => {
        document.addEventListener(OPEN_EVENT, listener)
        return () => { document.removeEventListener(OPEN_EVENT, listener) }
      },
      isOpen,
    },
  })

  /* CARD REPLAY DOOR (2026-08-30, additive): other bundles (the media
   * panel's wand) open THE STUDIO with one draft loaded — the editor's
   * ?meliteCards=<id> hydration. Closed deck: park the draft, open (the
   * canvas consumes it at mount). Open deck: hand it to the live canvas. */
  ;(window as unknown as Record<string, unknown>).__meliteDeckOpenWithDraft =
    (draftId: string): boolean => {
      if (typeof draftId !== 'string' || draftId === '') return false
      if (isOpen()) {
        document.dispatchEvent(new CustomEvent(OPEN_DRAFT_EVENT, { detail: { draftId } }))
      } else {
        setPendingDraft(draftId)
        openDeck()
      }
      return true
    }

  return () => {
    delete (window as unknown as Record<string, unknown>).__meliteDeckOpenWithDraft
    dispose()
  }
}
