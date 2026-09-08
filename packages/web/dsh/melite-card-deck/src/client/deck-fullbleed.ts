// deck-fullbleed — the Cards deck takes over the CENTER COLUMN the way
// the family's Task Board / SSH panels do (their documented method,
// under our namespace): stylesheet rules keyed on a data attribute on
// <html>, no React involvement, so the conversation subtree underneath
// stays mounted and stateful.
//
// ── THE RIGHT-PANEL LAW (operator order, 2026-09-05, verbatim intent):
//    "No matter what, I never want to see the full card bleed in the
//    right panel. That whole issue is why the extension is in this
//    messed-up state."
// The retired implementation keyed its sibling-kill rules on the
// hashed-class center-column SUFFIX GUESS — a global match that
// could (and did) hit the better-sidebar's own column tree, bleeding
// the right panel. This rewrite makes the bleed structurally
// center-only, three ways:
//
//   1. COMPOSER-PROOF, no document-wide guessing: the claim seeds at
//      the live conversation composer (never inside the right-panel
//      host) and walks UP the composer's own ancestry to the first
//      column-shaped element. No document-wide hashed-class query
//      ever runs (pinned by the hygiene wall) — the walk cannot cross
//      into the right panel, a separate subtree; a missing seed or
//      column means the deck REFUSES to bleed, never guesses.
//   2. Attribute-scoped rules: every display:none rule is gated on
//      [data-ray-deck-column] — an attribute THIS module places on the
//      verified column element and on nothing else, ever. No rule in
//      this stylesheet can match an element we did not explicitly
//      claim.
//   3. Host-subtree refusal: a candidate column inside the
//      better-sidebar host is refused outright (belt-and-braces — the
//      semantic pane makes it impossible, the guard makes it STAY
//      impossible).
//
// The better-sidebar's right panel is also kept PAINTING ABOVE the
// deck's overlay tier (position + z-index re-scope, zero geometry
// change): while the deck owns the center column, the right panel and
// its toggle cluster stay visible and clickable, never covered.
//
// Family panels ALWAYS win: our rules are gated
// :not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]), and we
// honor their coordination event (dsh-panel-activate) by standing down
// when another panel opens. When we open we clear their attributes and
// broadcast the same event — last activation wins, both directions.
//
// Activation truth is DOM-observed, not clicked-inferred: the observer
// watches the verified column; while the deck view node exists AND is
// visible, the attribute is on; the moment it hides or unmounts (the
// user closed the deck), the attribute drops and the column springs
// back untouched. No DOM moves — the iframe never reparents, so the
// canvas never reloads.

/** The deck's activation attribute on <html> (our namespace). */
const ACTIVE_ATTR = 'data-ray-deck-active'
/** Family activation attributes — cleared when the deck opens. */
const FAMILY_ACTIVE_ATTRS = ['data-dsh-taskboard-active', 'data-dsh-ssh-active']
/** The family's cross-panel coordination event (verbatim protocol). */
const PANEL_ACTIVATE_EVENT = 'dsh-panel-activate'
/** Our panel name on that event bus. */
const PANEL_NAME = 'ray-deck'
/** The deck view node marker (host row of the canvas iframe). */
const DECK_NODE_SEL = '[data-plugin="ray-card-deck-canvas"]'
/** The deck container the sidebar entry mounts in the column. */
const CONTAINER_SEL = '[data-ray-cards-deck-view]'
/**
 * The bleed host attribute — THE scope of every hiding rule. Placed
 * only by claimCenterColumn()'s caller path below, only on the
 * verified center column, removed on rebind and on dispose.
 */
const COLUMN_HOST_ATTR = 'data-ray-deck-column'
/** The right-panel host — a column inside it is refused (RIGHT-PANEL LAW). */
const RIGHT_PANEL_HOST_SEL = '[data-dsh-better-sidebar]'
/**
 * The conversation PROOF seeds: the composer stack (the shell's own
 * family, every generation) or the chat input itself. A seed inside
 * the right-panel host is never used — the claim starts in the center.
 */
const COMPOSER_SEED_SEL = '[class*="composerStack"], textarea, [contenteditable="true"]'
/**
 * The column match, checked against the seed's OWN ANCESTORS only
 * (never queried document-wide — a global hashed-class query was the
 * right-panel bleed vector). Both shell generations: the semantic
 * data-pane attribute and the centerCol layout class.
 */
const COLUMN_MATCH_SEL = '[data-pane="conversation"], [class*="centerCol"]'

/**
 * The PROVEN center column — composer-seeded, ancestor-walked, host-
 * refused. The claim starts at the live conversation composer (never
 * inside the right-panel host) and walks UP that composer's own
 * ancestry to the first column-shaped element. The walk cannot cross
 * into the right panel (a separate subtree), the right-panel host
 * refusal is checked anyway (belt-and-braces), and no document-wide
 * hashed-class query ever runs. Returns null when no seed or no
 * column ancestor is found; the caller refuses, never falls back.
 */
export function claimCenterColumn(): HTMLElement | null {
  const seeds = document.querySelectorAll<HTMLElement>(COMPOSER_SEED_SEL)
  let seed: HTMLElement | null = null
  for (const el of seeds) {
    if (el.closest(RIGHT_PANEL_HOST_SEL) === null) { seed = el; break }
  }
  if (seed === null) return null
  let n: HTMLElement | null = seed.parentElement
  while (n !== null && n !== document.body) {
    if (n.matches(COLUMN_MATCH_SEL)) {
      return n.closest(RIGHT_PANEL_HOST_SEL) !== null ? null : n
    }
    n = n.parentElement
  }
  return null
}

/** Structural takeover CSS. ZERO color literals — the theme law: the
 *  deck's own surfaces are themed by the editor canvas inside the
 *  iframe; this layer only positions and cedes. One rule per element,
 *  every hiding rule scoped under [data-ray-deck-column] (RIGHT-PANEL
 *  LAW #2 — pinned by the hygiene wall: a rule that hides must carry
 *  COLUMN_HOST_ATTR or it does not ship). */
const OVERLAY_CSS = [
  // The verified column becomes the overlay's containing block.
  `[${COLUMN_HOST_ATTR}] { position: relative; }`,
  // Full-bleed = the column's OTHER direct children hide (the chat
  // pane with its top region + composer). The deck container itself
  // ([data-ray-cards-deck-view]) is the only exempt child.
  `html[${ACTIVE_ATTR}]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active])`
    + ` [${COLUMN_HOST_ATTR}] > :not(${CONTAINER_SEL}) { display: none !important; }`,
  // The chat COMPOSER lives INSIDE the view area's scroll body
  // (composerStack: deck + composerStack stacked) — the column-level
  // kill above can't reach it. Hiding the stack lets the deck claim
  // the full scroll body. Hashed class, but scoped INSIDE our placed
  // attribute: it can only ever match within the verified column.
  `html[${ACTIVE_ATTR}]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active])`
    + ` [${COLUMN_HOST_ATTR}] [class*="composerStack"] { display: none !important; }`,
  // The right panel stays ABOVE the deck's overlay tier while the deck
  // owns the center column (position + z-index re-scope every fixed
  // child's paint order WITHOUT touching their viewport geometry — no
  // transform, so fixed stays viewport-fixed). The right panel is
  // never bled and never covered.
  `html[${ACTIVE_ATTR}]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active])`
    + ` ${RIGHT_PANEL_HOST_SEL} { position: relative; z-index: 70; }`,
].join('\n')

/** Is the deck view currently the column's resident (exists + visible)? */
function deckOwnsColumn(): boolean {
  const col = claimCenterColumn()
  if (col === null) return false
  const deck = col.querySelector(DECK_NODE_SEL)
  if (deck === null) return false
  const r = deck.getBoundingClientRect()
  return r.width > 40 && r.height > 40
}

/** Apply the activation state: attribute + family coordination. */
function setActive(on: boolean): void {
  const el = document.documentElement
  const isOn = el.hasAttribute(ACTIVE_ATTR)
  if (on === isOn) return
  if (on) {
    for (const a of FAMILY_ACTIVE_ATTRS) el.removeAttribute(a)
    el.setAttribute(ACTIVE_ATTR, '')
    document.dispatchEvent(new CustomEvent(PANEL_ACTIVATE_EVENT, { detail: PANEL_NAME }))
  } else {
    el.removeAttribute(ACTIVE_ATTR)
  }
}

/** Mount the full-bleed layer: style + observers + event bus seat.
 *  @returns disposer removing everything this call installed. */
export function mountDeckFullbleed(): () => void {
  if (typeof document === 'undefined') return () => {}

  const styleId = 'ray-card-deck-fullbleed'
  if (!document.querySelector('style#' + styleId)) {
    const tag = document.createElement('style')
    tag.id = styleId
    tag.textContent = OVERLAY_CSS
    document.head.appendChild(tag)
  }

  let disposed = false
  let settleTimer: ReturnType<typeof setTimeout> | null = null
  /** The element currently carrying COLUMN_HOST_ATTR (ours alone). */
  let attributed: HTMLElement | null = null
  /** The element the column observer is bound to. */
  let observed: HTMLElement | null = null
  const columnObserver = new MutationObserver(() => { settle() })

  /** Re-bind the column observer to the verified column, if it changed. */
  function bindColumn(): void {
    const col = claimCenterColumn()
    if (col === observed) return
    columnObserver.disconnect()
    observed = col
    if (col !== null) {
      columnObserver.observe(col, { childList: true, subtree: false, attributes: true, attributeFilter: ['style', 'class', 'hidden'] })
    }
  }

  /** Sync the bleed host attribute: on the verified column, nowhere else. */
  function syncHostAttr(): void {
    const col = claimCenterColumn()
    if (attributed !== null && attributed !== col) attributed.removeAttribute(COLUMN_HOST_ATTR)
    attributed = col
    if (col !== null) col.setAttribute(COLUMN_HOST_ATTR, '')
  }

  /** Debounced re-read of the DOM truth -> attribute. */
  const settle = () => {
    if (disposed) return
    if (settleTimer) clearTimeout(settleTimer)
    settleTimer = setTimeout(() => {
      if (disposed) return
      bindColumn()
      syncHostAttr()
      setActive(deckOwnsColumn())
    }, 80)
  }

  // The column may not exist yet (session not entered) — a body-level
  // observer re-settles whenever the shell lays it out (the same
  // self-healing pattern as the family's mount wait).
  const bodyObserver = new MutationObserver(settle)
  bodyObserver.observe(document.body, { childList: true, subtree: true })

  // Family attr changes on <html> are OUTSIDE body's subtree — their
  // panel CLOSING (attribute removed) is our signal to RE-CLAIM the
  // column. Without this, a taskboard round-trip left our attribute
  // off forever (verified live in the retired build).
  const htmlObserver = new MutationObserver(settle)
  htmlObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [...FAMILY_ACTIVE_ATTRS, ACTIVE_ATTR],
  })

  // Family coordination: another panel opening stands us down.
  const onPanelActivate = (e: Event) => {
    const detail = (e as CustomEvent).detail
    if (detail !== PANEL_NAME) setActive(false)
  }
  document.addEventListener(PANEL_ACTIVATE_EVENT, onPanelActivate)

  // Window resize can flip visibility truth (view system re-layouts).
  window.addEventListener('resize', settle)

  settle()
  return () => {
    disposed = true
    if (settleTimer) clearTimeout(settleTimer)
    bodyObserver.disconnect()
    columnObserver.disconnect()
    htmlObserver.disconnect()
    document.removeEventListener(PANEL_ACTIVATE_EVENT, onPanelActivate)
    window.removeEventListener('resize', settle)
    attributed?.removeAttribute(COLUMN_HOST_ATTR)
    attributed = null
    setActive(false)
  }
}
