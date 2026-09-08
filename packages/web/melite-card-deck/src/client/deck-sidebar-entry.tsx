/**
 * The Cards sidebar entry — the family pattern (Task Board / SSH): ONE row
 * in the left sidebar under New Session, ordered with the extension
 * family's rows. Toggling mounts a taskboard-style container (absolute
 * inset 0, z-60) as a direct child of the CENTER column — claimed via
 * deck-fullbleed's claimCenterColumn(), the PROVEN semantic anchor — and
 * renders DeckCanvas (the /editor card studio iframe) into it via its own
 * React root. deck-fullbleed observes the deck node's presence in the
 * verified column and applies the takeover.
 *
 * Restored 2026-09-05 (operator order: "clicking the button would …
 * change the middle panel to a pure action card flow view") after the
 * 2026-09-04 retirement (d157b6c) — with the RIGHT-PANEL LAW welded in:
 * the column claim is semantic ([data-pane="conversation"]), never the
 * retired hashed-class guess, and a claim that comes back null REFUSES
 * to mount (logged) instead of guessing. The bleed cannot reach the
 * right panel — see deck-fullbleed.ts.
 *
 * CARD REPLAY DOOR (2026-08-30, additive): other bundles (the media
 * panel's wand) open THE STUDIO with one draft loaded — the editor's
 * ?meliteCards=<id> hydration. Kept verbatim through the restore; the
 * media-plugin still calls it (4 sites).
 */
import { createRoot } from 'react-dom/client'
import css from './deck.module.css'
import { DeckCanvas, setPendingDraft, OPEN_DRAFT_EVENT } from './DeckCanvas.tsx'
import { mountSidebarEntry } from './sidebar-entry-core.ts'
import { claimCenterColumn } from './deck-fullbleed.ts'

/** The mounted deck container (taskboard-style overlay child of the column). */
const CONTAINER_SEL = '[data-ray-cards-deck-view]'

/** Deck open-state events (the active-bridge the entry core subscribes to). */
const OPEN_EVENT = 'ray-cards-deck-open-changed'

/** Family row selectors this entry orders against (task-board + ssh). */
const FAMILY_SELECTORS = [
  '[data-dsh-taskboard-entry]',
  '[data-dsh-ssh-entry]',
  '[data-ray-cards-entry]',
] as const

/** Cards icon — two stacked cards, the shell's 16px nav-icon look. */
const ICON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">'
  + '<rect x="5.5" y="2.5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/>'
  + '<rect x="2.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"'
  + ' fill="var(--dsw-alias-bg-base, #17171c)"/></svg>'

function isOpen(): boolean {
  return document.querySelector(CONTAINER_SEL) !== null
}

/** Mount the deck container into the VERIFIED center column (idempotent).
 *  A null claim refuses — logged, never a fallback guess (RIGHT-PANEL LAW). */
function openDeck(): void {
  if (isOpen()) return
  const column = claimCenterColumn()
  if (column === null) {
    console.warn('[ray-card-deck] no verified center column — deck not mounted (refusing to guess)')
    return
  }
  const container = document.createElement('div')
  container.setAttribute(CONTAINER_SEL.slice(1, -1), '')
  // Task-board overlay geometry: the verified column is
  // position:relative (deck-fullbleed css), absolute fill rides it.
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
    rowAttribute: 'data-ray-cards-entry',
    rowSelector: '[data-ray-cards-entry]',
    plugin: 'ray-card-deck',
    icon: ICON,
    css: {
      entry: css['entry'] ?? '',
      entryIcon: css['entryIcon'] ?? '',
      entryLabel: css['entryLabel'] ?? '',
    },
    label: () => 'Cards',
    tooltip: () => 'Ray card deck',
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

  /* CARD REPLAY DOOR (2026-08-30, additive; ported from the ray twin):
   * other bundles (the media panel's wand) open THE STUDIO with one
   * draft loaded — the editor's ?meliteCards=<id> hydration. Closed
   * deck: park the draft, open (the canvas consumes it at mount).
   * Open deck: hand it to the live canvas via OPEN_DRAFT_EVENT (whose
   * handler bumps the reload nonce — see DeckCanvas).
   * CONTRACT (2026-09-06): window['__meliteDeckOpenWithDraft'] is
   * (draftId: string) => boolean — false on empty/non-string id, true
   * once accepted. Set at deck entry mount, deleted on dispose. The
   * seam NAME is defined once in the media plugin's apply-guard.ts
   * (DECK_OPEN_WITH_DRAFT); consumers never restate the literal and
   * fail loudly when the seam is absent. test_media_sidebar.py pins
   * the literal on both sides. */
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
