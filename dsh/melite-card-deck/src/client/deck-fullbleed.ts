// deck-fullbleed — the Cards deck takes over the center column the same
// way the family's Task Board / SSH panels do (their documented method,
// copied 1:1 under our namespace): a stylesheet rule pair keyed on a
// data attribute on <html>, no React involvement, so the conversation
// subtree underneath stays mounted and stateful.
//
//   html[data-melite-deck-active] column > :has(deck canvas)  -> absolute,
//     inset 0, z-index 60 (the family's overlay tier)
//   html[data-melite-deck-active] column > :not(:has(...))    -> display:none
//     (the chat pane — composer AND top region — plus every other
//     column view hides while the deck owns the column)
//
// Family panels ALWAYS win: our rules are gated
// :not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]), and we
// honor their coordination event (dsh-panel-activate) by standing down
// when another panel opens. When we open we clear their attributes and
// broadcast the same event — last activation wins, both directions.
//
// Activation truth is DOM-observed, not clicked-inferred: the observer
// watches the center column; while the deck view node exists AND is
// visible, the attribute is on; the moment it hides or unmounts (the
// user returned to the Chat tab), the attribute drops and the column
// springs back untouched. No DOM moves — the iframe never reparents, so
// the canvas never reloads.

/** The deck's activation attribute on <html> (our namespace). */
const ACTIVE_ATTR = 'data-melite-deck-active'
/** Family activation attributes — cleared when the deck opens. */
const FAMILY_ACTIVE_ATTRS = ['data-dsh-taskboard-active', 'data-dsh-ssh-active']
/** The family's cross-panel coordination event (verbatim protocol). */
const PANEL_ACTIVATE_EVENT = 'dsh-panel-activate'
/** Our panel name on that event bus. */
const PANEL_NAME = 'melite-deck'
/** The deck plugin node marker (host row of the canvas iframe). */
const DECK_NODE_SEL = '[data-plugin="melite-card-deck-canvas"]'
/** The center column (both shell generations, same selector pair as the family). */
const COLUMN_SEL = '[data-pane="conversation"], [class*="centerCol"]'

/** Structural overlay CSS. ZERO color literals — the theme law: the
 *  deck's own surfaces are themed by the editor canvas inside the
 *  iframe; this layer only positions. */
const OVERLAY_CSS = [
  COLUMN_SEL + ' { position: relative; }',
  // Full-bleed = the deck's column SIBLINGS hide (the chat pane with
  // its top region + composer, the SSH view, the task board). The
  // deck node itself is NOT repositioned: it lives inside the view
  // wrapper (display:contents) BESIDE the Cards/Chat/Trajectory tab
  // strip — natural flow keeps the strip clickable above the deck,
  // and with the siblings gone the deck fills the rest of the column.
  'html[' + ACTIVE_ATTR + ']:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [data-pane="conversation"] > :not(:has(' + DECK_NODE_SEL + ')),',
  'html[' + ACTIVE_ATTR + ']:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [class*="centerCol"] > :not(:has(' + DECK_NODE_SEL + ')) {',
  '  display: none !important;',
  '}',
  // The chat COMPOSER lives INSIDE the view area's scroll body
  // (wSkVaW_scrollBody: deck + composerStack stacked) — the column-
  // level kill above can't reach it. Hiding the stack lets the deck
  // claim the full scroll body (flex re-flow, verified live:
  // deck 748 -> 874 of 874). Suffix-matched like the family's
  // [class*="centerCol"] convention — the hash prefix churns per build.
  'html[' + ACTIVE_ATTR + ']:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [data-pane="conversation"] [class*="composerStack"],',
  'html[' + ACTIVE_ATTR + ']:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [class*="centerCol"] [class*="composerStack"] {',
  '  display: none !important;',
  '}',
  // The better-sidebar chrome (the fixed top-right toggle cluster with the
  // Expand/Collapse-sidebar button, plus the right panel itself) paints
  // UNDER this takeover: the deck container rides the family overlay tier
  // (z-60, opaque) while the cluster is fixed z-45 and the panel fixed
  // z-40 — card view covered the expand button and any open panel. While
  // the deck owns the column, lift the sidebar HOST into its own stacking
  // context above the tier: positioned + z-index re-scope every fixed
  // child's paint order WITHOUT touching their viewport geometry (no
  // transform -> no containing-block shift; fixed stays viewport-fixed).
  // Same family :not() guards as the sibling-kill rules above.
  'html[' + ACTIVE_ATTR + ']:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [data-dsh-better-sidebar] {',
  '  position: relative;',
  '  z-index: 70;',
  '}',
].join('\n')

/** Is the deck view currently the column's resident (exists + visible)? */
function deckOwnsColumn(): boolean {
  const col = document.querySelector(COLUMN_SEL)
  if (!col) return false
  const deck = col.querySelector(DECK_NODE_SEL)
  if (!deck) return false
  // The React wrapper renders display:contents (a 0x0 box) — measure
  // the deck NODE itself; it is the real layout participant.
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

  const styleId = 'melite-card-deck-fullbleed'
  if (!document.querySelector('style#' + styleId)) {
    const tag = document.createElement('style')
    tag.id = styleId
    tag.textContent = OVERLAY_CSS
    document.head.appendChild(tag)
  }

  let disposed = false
  let settleTimer: ReturnType<typeof setTimeout> | null = null

  /** Debounced re-read of the DOM truth -> attribute. */
  const settle = () => {
    if (disposed) return
    if (settleTimer) clearTimeout(settleTimer)
    settleTimer = setTimeout(() => {
      if (!disposed) setActive(deckOwnsColumn())
    }, 80)
  }

  // The column may not exist yet (session not entered) — a body-level
  // observer heals the column binding whenever the shell lays it out
  // (the same self-healing pattern as the family's mount wait).
  const columnObserver = new MutationObserver(settle)
  const bodyObserver = new MutationObserver(() => {
    const col = document.querySelector(COLUMN_SEL)
    if (col) columnObserver.observe(col, { childList: true, subtree: false, attributes: true, attributeFilter: ['style', 'class', 'hidden'] })
    settle()
  })
  bodyObserver.observe(document.body, { childList: true, subtree: true })

  // Family attr changes on <html> are OUTSIDE body's subtree — their
  // panel CLOSING (attribute removed) is our signal to RE-CLAIM the
  // column. Without this, a taskboard round-trip left our attribute
  // off forever (verified live: deck 748 + composer back + attr false
  // after their close — no mutation we observed ever fired).
  const htmlObserver = new MutationObserver(settle)
  htmlObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [...FAMILY_ACTIVE_ATTRS, ACTIVE_ATTR],
  })
  const col = document.querySelector(COLUMN_SEL)
  if (col) columnObserver.observe(col, { childList: true, subtree: false, attributes: true, attributeFilter: ['style', 'class', 'hidden'] })

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
    setActive(false)
  }
}
