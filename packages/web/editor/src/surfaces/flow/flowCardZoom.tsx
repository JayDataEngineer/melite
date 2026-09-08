// flowCardZoom — the shared-element zoom overlay (framer-motion layoutId
// morph from the tile into the full drilldown card), moved VERBATIM from
// FlowCard.tsx (Cut 2, C6): ZOOM_DETAIL_MAX_PX / cardLayoutId /
// ZOOM_SPRING / ZOOM_JOIN_INSTANT / ZOOM_SKELETON_MS /
// ZOOM_CLOSE_UNMOUNT_MS + CardZoomSkeleton + CardZoomOverlay.
// cardLayoutId + ZOOM_SPRING are exported because the GRID module
// (flowCardGrid) renders its own layoutIds and springs with the SAME
// constants — the public surface of the shim is unchanged (the original
// module never exported them).
import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, usePresence, type Transition } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@melite/ui"
import { Skeleton } from "@melite/ui/skeleton"
import { useAssetPreviewBus } from "@/surfaces/shared/assetPreviewBus"
import { mediaAssetFromUrl } from "@/surfaces/library/media"
import { CardDetailInline } from "./CardDetailModal"
import { CardStudio } from "./CardStudio"
import { resolveCardBody, kindHasFormSpec } from "@melite/slots"
import { loadCatalog } from "@melite/catalog"
import { useSpecContractStore } from "@/surfaces/shared/specContractStore"
// The host owns the registrations (dogfood mirror of the kinds lane's
// deleted cardKindRegistrations import): importing cardStudios runs the
// first-party provider registrations at module load — the zoom is the
// only production renderer of bodies, so nothing can render before the
// seam is populated.
import "./cardStudios"
import { cardIsRunnable } from "./flowCardTypes"
import type { CardStage, CardActions } from "@melite/contracts"
import { useCardKindsVersion } from "./pluginKinds"

/** The drilldown card's max width when it's the sole focus (inside the zoom
* overlay). Wide enough for the detail body's preview + 3-column param grid,
* capped so it never washes out as a thin band on a wide canvas. The overlay
* itself is scoped to the workspace content area (sidebars + header stay
* visible); this is the CARD size centered inside it. */
// SQUARE LAW, card view (2026-08-23, "these are not more square at all"):
// the expanded form card pairs OUTPUT and CONTROLS side by side inside a
// bounded ≈square panel — the old 680px single column stacked every zone
// into a 1000px+ tower. Width applies as min(MAX, vh-bounded) so the
// aspect-square card fits the workspace without page scroll.
const ZOOM_DETAIL_MAX_PX = 760
/** Shared-element key (framer-motion layoutId, 2026-08-08 rewrite): the SAME
* string on the resting tile AND the zoomed card makes framer morph one
* into the other — the card GROWS out of the tile's real screen position
* and SHRINKS back into it. Framer measures both rects, computes the FLIP
* delta itself, and drives the scale/translate with its projection system
* (spring, rAF-scheduled on the browser's own frame loop — the t=0 state
* paints before any frame can be skipped). NO teleport, NO fade, no hand-
* rolled math to break. */
export const cardLayoutId = (id: string) => `stage-card-${id}`
/** The morph spring — "a sponge filling with water": fast start, soft
* settle. Same spring both directions (open grows, exit shrinks). */
export const ZOOM_SPRING: Transition = { type: "spring", stiffness: 300, damping: 30 }
/** The nav remount's join transition (2026-08-10): arrow-switch mounts the
* box fresh in the NEW card's stack — that join must be instant (invisible,
* no "size-up" on switch). The exit ALWAYS samples ZOOM_SPRING — the instant
* never escapes the nav mount. */
const ZOOM_JOIN_INSTANT: Transition = { duration: 0 }
/** How long the skeleton holds the zoomed card's box before the real detail
* swaps in. onLayoutAnimationComplete flips ready the moment the
* grow morph settles in a real browser; the timeout is the fallback (jsdom
* has no layout engine, so the callback never fires there). */
const ZOOM_SKELETON_MS = 500
/** THE SINGLE-POP CAP (2026-08-22): how long past a settled morph the
 * skeleton may keep holding the box while the card's elements finish
 * loading. The zoom door fires the form-spec load AT OPEN (during the
 * grow), so the verdict normally lands inside the animation and this never
 * engages — it bounds a hung fetch. Past the cap the detail reveals anyway
 * and its own loading faces take over; never an eternal skeleton. */
const ZOOM_DATA_GATE_MAX_MS = 20_000
/** The jsdom fallback for the close unmount. In a REAL browser the overlay
* unmounts the moment the exit morph settles — onLayoutAnimationComplete
* fires while !isPresent → safeToRemove (the box has projected back into
* the tile). happy-dom has no layout engine → the morph never fires there
* → this timer unmounts deterministically instead. */
const ZOOM_CLOSE_UNMOUNT_MS = 500

/** CardZoomOverlay — the drilldown surface, scoped to the workspace CONTENT
* AREA (2026-08-08 revision). Clicking a tile opens this portaled layer so the
* single detail card becomes the focus: a solid backdrop covers the resting
* grid + the chat + the chat input (the in-surface content), while the app's
* sidebars + header stay visible + interactive. It does NOT eat the whole
* viewport the way the prior `fixed inset-0`-to-body layer did — the operator
* clarified: "keep the sidebars and stuff, but NOT the other cards or chat."
 *
 * SCOPING: the overlay portals into [data-workspace-content] — the
 * workspace's tab-content region (right of the sidebars, below the header).
 * `absolute inset-0` then covers EXACTLY that region. When no such root
 * exists (unit tests rendering the grid in isolation), it falls back to
 * document.body so the overlay still mounts and the tests still see it.
 *
 * SCROLL: the overlay itself is the scroll container (`overflow-y-auto`).
 * A tall detail scrolls within the content area — the user can ALWAYS reach
 * the whole card (the prior overflow-hidden card clipped it). The inner flex
 * (`min-h-full items-center`) centers the card when it's shorter than the
 * area and lets it flow + scroll when taller.
 *
 * WHY PORTAL + framer-motion shared element: the prior in-place flex-basis
 * expansion animated LAYOUT during a content swap — that reflow is the
 * literal source of the "buggy shrink". This overlay morphs ONLY transform
 * (scale/translate) on the shared-element card, so the whole open/close is
 * compositor-only — buttery smooth, zero reflow, zero jank.
 *
 * THE MORPH (2026-08-08 rewrite, "I'll make it easier, we can use a
 * skeleton for box content during transition"): the tile (SortableCardWrap)
 * carries `layoutId={cardLayoutId(stage.id)}` and the zoomed card carries
 * the SAME id — framer-motion projects the card FROM the tile's real
 * screen rect to full size (grow — "a sponge filling with water") and BACK
 * into the tile (shrink). The box REMOUNTS PER CARD (key={stage.id},
 * 2026-08-10): framer v13 fixes shared-element stack membership at mount,
 * so every focus change — open AND arrow-nav — joins the CURRENT card's
 * stack, and the exit re-legates into THAT card's tile (2026-08-10
 * policy: "the shrink must reflect the card we are on"). Nav joins are
 * instant (ZOOM_JOIN_INSTANT — no size-up on switch); open + close use
 * ZOOM_SPRING. While the morph
 * plays — grow AND shrink — the box holds a pure SKELETON (CardZoomSkeleton:
 * an all-skeleton layout, no real content); the real detail
 * (CardDetailInline) shows only when the morph has settled and the overlay
 * is present (ready && isPresent). The backdrop stays SOLID — no fade at
 * all.
 *
 * Close vectors: the Collapse (X) button, a backdrop click (target ===
 * currentTarget so card clicks don't bubble-close), and Escape — all call
 * onClose directly (no arming: the exit is the SAME layoutId morph
 * reversed — the box projects BACK into the CURRENT card's tile, the
 * spring carries it out the same way it carried it in). AnimatePresence +
 * usePresence hold the overlay mounted while the morph-back plays;
 * onLayoutAnimationComplete → safeToRemove.
*
* STUDIO-FLAGGED CARDS (2026-08-15, spec §5/§7.7 — "the animation is made
* for the small card" verdict): when the registry has an entry for this
* stage, the shared-element box IS the studio panel — WIDE (max 1440px,
* full height of the content area), studio chrome, CardStudio as content.
* The tile morphs STRAIGHT into the wide panel; there is no 680px
* intermediate form card to animate to and cover a beat later; closing
* reverses the SAME morph into the tile. Unflagged cards keep the 680px
* form-card zoom, byte for byte. */
/** THE overlay positioning decision (2026-08-22 "partially opaque" verdict,
 * extracted 2026-08-22 so it is testable): inside the editor the portal lands
 * in [data-workspace-content] and the overlay is ABSOLUTE — it covers exactly
 * the content area (sidebars + header stay visible). Outside the editor (the
 * DSH embeds) there is no workspace root; the portal lands on body and the
 * overlay MUST be FIXED — the embed frame is auto-height and often taller
 * than the viewport, so absolute would size to page coordinates and cover
 * only part of the visible area at any scroll. */
export function resolveZoomPortal(doc: Document): { target: Element | null; className: string } {
  const scopedRoot = doc.querySelector("[data-workspace-content]")
  return {
    target: scopedRoot ?? doc.body,
    className:
      scopedRoot !== null
        ? "absolute inset-0 z-[80] flex flex-col"
        : "fixed inset-0 z-[80] flex flex-col",
  }
}

export function CardZoomOverlay({
  stage, upstreams, running, actions, onClose, onPrevCard, onNextCard,
}: {
  stage: CardStage
  upstreams: CardStage[]
  running: boolean
  actions: CardActions
  onClose: () => void
  /** Lightbox-style side arrows that switch the focused card to its prev /
  * next neighbor in flow order (2026-08-08). Undefined at the ends of
  * the flow → no arrow renders (the grid computes the neighbors; the
  * overlay only knows the focused stage). */
  onPrevCard?: () => void
  onNextCard?: () => void
}) {
  // Kinds lane: subscribe so a mid-session flip re-renders the Run gate.
  useCardKindsVersion()
  // Clicking the card's output image opens the asset lightbox over the
  // ORDERED flow card outputs (2026-08-08) — the arrows there navigate
  // the other cards' outputs, not the archive. The nav list is built from
  // every stage's primary output (one entry per card, flow order).
  const openOutputBus = useAssetPreviewBus()
  // BODY SLOT (the studio removal): ONE consult — the walk. There is
  // no "studio card" class anymore: the claim's fullBleed FLAG picks the
  // wide frame, exactly like badgeTone picks a color. A third-party
  // provider registered between the first-party tiers claims this
  // card's surface exactly like melite-core does; no claim falls to the
  // shared detail host (the documented fail-safe).
  const claim = resolveCardBody(stage)
  const wide = !!claim?.fullBleed
  const openOutput = useCallback(() => {
    const url = stage.result?.assetUrls[0]
    if (!url) return
    const nav = upstreams
      .map((s) => s.result?.assetUrls[0])
      .filter((u): u is string => !!u)
      .map(mediaAssetFromUrl)
    openOutputBus(mediaAssetFromUrl(url), nav)
  }, [stage, upstreams, openOutputBus])
  // ── THE GROW/SHRINK (2026-08-08 rewrite, framer-motion shared element) ──
  // The zoomed card and its resting tile SHARE a layoutId. On mount framer
  // projects the card FROM the tile's real screen rect to full size (the
  // grow), and on exit (AnimatePresence, usePresence below) projects it BACK
  // into the tile (the shrink). Framer measures the rects and runs the FLIP
  // delta itself on the browser's frame loop. The OLD hand-rolled FLIP
  // (WAAPI + rect math) and the CSS keyframe classes before it were the
  // teleport/wiggle sources — deleted (2026-08-08).
          //
  // REMOUNT-PER-CARD (2026-08-10): framer v13 fixes shared-element stack
  // membership at MOUNT (registerSharedNode runs once per node; layoutId
  // prop changes are inert). So the box carries key={stage.id}: every focus
  // change — open AND arrow-nav — mounts a fresh projection node that joins
  // the CURRENT card's stack, and the exit re-legates into THAT card's tile,
  // never the stale card the user left behind. Nav mounts join with a
  // 0-duration transition (invisible — no size-up on switch); open + close
  // spring.
          //
  // SKELETON-ONLY DURING THE MORPH (2026-08-09): the box holds a pure
  // skeleton layout while the morph plays — on the grow AND on the shrink
  // (isPresent false). Scaling live detail is what reads as "jarring"; an
  // all-skeleton box morphs cleanly both directions. ready flips when the
  // morph settles — onLayoutAnimationComplete in a real browser, the timeout
  // in jsdom (no layout engine → the callback never fires there). The detail
  // renders only when ready && isPresent.
  const [isPresent, safeToRemove] = usePresence()
  // navMount: the first render of a box is a NAV join when the previous
  // render's stage was a DIFFERENT card (the overlay persists — key="zoom" —
  // only the box remounts). That join must be instant. Open and close spring.
  const navMountRef = useRef(false)
  const prevStageIdRef = useRef(stage.id)
  if (prevStageIdRef.current !== stage.id) {
    prevStageIdRef.current = stage.id
    navMountRef.current = true
}
  useEffect(() => { navMountRef.current = false }, [stage.id])
  // Escape collapses. While the asset lightbox is open on top, IT owns
  // Escape. And Esc NEVER fires while typing in a form control — the
  // studio's prompt-card fields own their keys; one stray Esc mid-sentence
  // must not nuke the card. (Studio cards close through this same handler:
  // close = collapse, one press, one action.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("[data-asset-preview-dialog]")) return
      const el = e.target as HTMLElement | null
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return
      if (e.key === "Escape") onClose()
}
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  // ── THE TWO GATES OF THE ONE POP (2026-08-22 rewrite) ──
  // The operator's verdict, verbatim: "I click the card → the card becomes
  // skeleton insides, it expands → the card STAYS a skeleton until all
  // elements on the card are ready to go → THEN the card expands here with
  // everything loaded." The old single ready flag flipped at MORPH SETTLE —
  // half-loaded elements kept arriving afterward and popped twice. Two
  // flags now gate the ONE reveal:
  //   morphDone — the grow projection settled (onLayoutAnimationComplete in
  //     a real browser; ZOOM_SKELETON_MS is the jsdom fallback), AND
  //   dataDone  — every async element the body needs has settled. THE FETCH
  //     STARTS HERE, AT OPEN, DURING the morph: the zoom door owns open-time
  //     freshness (the body below only subscribes passively), so loading
  //     overlaps the expand instead of popping in after it. Terminal
  //     verdicts ALL open the gate — loaded | violation | error — a failed
  //     fetch reveals its error face per NO SILENT LOADING; it never holds
  //     the skeleton hostage. ZOOM_DATA_GATE_MAX_MS is the deadman.
  const [morphDone, setMorphDone] = useState(false)
  // The data gate is PER-SOURCE (2026-08-22 "Inputs load too slow" verdict):
  // the body's zones read from TWO independent async sources — the form-spec
  // (Parameters + Mods) AND the MODEL CATALOG (the Inputs zone reads
  // formOf(stage.service) from the catalog cache). Each settles ITS OWN flag;
  // a failure opens its source's contribution (NO SILENT LOADING — the error
  // face renders) without revealing while the OTHER source still loads.
  const [specDone, setSpecDone] = useState(false)
  const [catalogDone, setCatalogDone] = useState(false)
  const needsSpec = kindHasFormSpec(stage.kind)
  const dataDone = !needsSpec || (specDone && catalogDone)
  const ready = morphDone && dataDone
  // The open EPOCH: bumped on every box mount / stage change. A verdict (or
  // the deadman) may only open the gate of ITS OWN generation — a stale
  // resolution from a previous open must never reveal the current card
  // early (the warm-reopen race: the record reads "loaded" at render, the
  // fresh fetch flips it to "loading" a tick later).
  const openEpochRef = useRef(0)
  // NAV JOINS SKIP THE GATES (2026-08-15, "the animations replay when I
  // use the arrows" verdict — unchanged): the skeleton phase masks the
  // open/close MORPH; an arrow-nav join is INSTANT (ZOOM_JOIN_INSTANT), so
  // replaying skeleton+wait on every switch is pure noise. First open of
  // the overlay session: both gates armed. Every stage change AFTER content
  // has gone live: live content swaps directly, no skeleton, no wait (the
  // prefetch below STILL runs — the newly focused card's elements settle
  // behind the swap).
  const contentLiveRef = useRef(false)
  useEffect(() => {
    const live = contentLiveRef.current
    const epoch = ++openEpochRef.current
    if (live) {
      setMorphDone(true)
      setSpecDone(true)
      setCatalogDone(true)
    } else {
      setMorphDone(false)
      // No spec, no wait: kinds without a form (input/body/preview/studio)
      // have nothing async to gate on — the data gate starts OPEN.
      setSpecDone(!needsSpec)
      setCatalogDone(!needsSpec)
    }
    // FIRE THE ELEMENT LOADS NOW — the round trips run inside the morph, in
    // PARALLEL. The gate opens ONLY on this generation's verdicts (fresh
    // fetches — never stale state read at render).
    if (needsSpec) {
      void useSpecContractStore
        .getState()
        .loadFormSpec(stage.service, { fresh: true })
        .then(() => {
          if (openEpochRef.current === epoch) setSpecDone(true)
        })
        .catch(() => {
          if (openEpochRef.current === epoch) setSpecDone(true)
        })
      // THE CATALOG GATE ("the Inputs load too slow"): formOf(stage.service)
      // reads the catalog cache; cold-session first open had no cache yet,
      // so the Inputs zone was ABSENT at reveal and popped in when the
      // background load landed. loadCatalog resolves instantly from a warm
      // cache and holds only until the cold fetch ingests.
      void loadCatalog()
        .then(() => {
          if (openEpochRef.current === epoch) setCatalogDone(true)
        })
        .catch(() => {
          if (openEpochRef.current === epoch) setCatalogDone(true)
        })
    }
    if (!live) {
      const t = setTimeout(() => {
        contentLiveRef.current = true
        setMorphDone(true)
      }, ZOOM_SKELETON_MS)
      // The deadman: a hung fetch must never hold the skeleton forever.
      const d = setTimeout(() => {
        if (openEpochRef.current === epoch) {
          setSpecDone(true)
          setCatalogDone(true)
        }
      }, ZOOM_DATA_GATE_MAX_MS)
      return () => {
        clearTimeout(t)
        clearTimeout(d)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.id])
  // ── THE SHRINK IS THE GROW, REVERSED (2026-08-08): the SAME layoutId morph
  // that grows the card FROM the tile on mount projects it BACK into the tile
  // on exit. Nothing hand-rolled — framer-motion's shared-element projection
  // runs both directions on the browser's own frame loop (the spring carries
  // the card in, the spring carries it out). AnimatePresence + usePresence
  // keep the overlay mounted while the morph-back plays; onLayoutAnimation
  // Complete fires the instant the shrink lands → safeToRemove. The timer is
  // the jsdom fallback only (no layout engine → the morph never fires there).
  // This is the ONE mechanism — "LITERALLY JUST REVERSE THE ANIMATION."
  const safeToRemoveRef = useRef(safeToRemove)
  safeToRemoveRef.current = safeToRemove
  const isPresentRef = useRef(isPresent)
  isPresentRef.current = isPresent
  const onLayoutComplete = useCallback(() => {
    contentLiveRef.current = true // morph settled → nav joins are live swaps
    setMorphDone(true)
    if (!isPresentRef.current) safeToRemoveRef.current()
  }, [])
  useEffect(() => {
    if (isPresent) return
    const t = setTimeout(() => safeToRemoveRef.current(), ZOOM_CLOSE_UNMOUNT_MS)
    return () => clearTimeout(t)
  }, [isPresent])
  
  // EMBED FALLBACK (2026-08-22): outside the editor there is no
  // [data-workspace-content] — the portal lands on document.body. There the
  // overlay must be FIXED, not absolute: the DSH chat embed is auto-height
  // and often TALLER than the viewport; absolute inset-0 sizes to the
  // initial containing block (one viewport worth of PAGE coordinates), so
  // mid-list the drilldown covered only part of the visible area — the
  // cards grid showed through the rest (the "partially opaque background"
  // report). fixed inset-0 tracks the VIEWPORT: full cover at any scroll.
  const portal = resolveZoomPortal(document)
  return createPortal(
        <div
      data-card-zoom-overlay
      className={portal.className}
      // Solid theme background — the grid, chat, and input behind are gone.
      style={{ background: "var(--background)" }}
              >
      {/* Scroll region (the overlay itself scrolls; the side arrows below are
          pinned to the overlay viewport as siblings of this region). */}
      <div className="min-h-0 flex-1 overflow-y-auto">
      {/* Inner flex centers the card; min-h-full keeps it centered when short
          and lets the overlay scroll when the card is tall. The backdrop-click
          close lives here so clicks in the padding (not on the card) collapse.
          For a STUDIO card the region is exactly the studio frame's height
          (h-full, not min-h-full): the panel fills the content area minus
          padding — the deterministic studio size — instead of hugging the
          tenant while its async content settles. */}
        <div
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        data-zoom-backdrop
        className={cn(
          "flex items-center justify-center p-6",
          wide ? "h-full" : "min-h-full",
          // ARROW GUTTERS (2026-08-16: "the arrows go over the card"): a
          // studio panel spans up to 1440px while the nav chevrons pin to
          // the overlay's edges (16–60px in) — on anything narrower than
          // ~1560px they sat ON the rail / the video viewport. Reserve a
          // 64px gutter per side whenever an arrow renders (the chevron
          // fits inside with room). SQUARE LAW (2026-08-23): form cards
          // widened to ≈square too — they need the same reservation.
          (onPrevCard || onNextCard) && "px-16",
        )}
              >
        {/* Intermediate wrapper shrink-wraps the card. width caps the card;
            maxWidth keeps it inside the content area on narrow viewports.
            STUDIO cards go WIDE — FULL WIDTH (operator order, 2026-08-31:
            "stretch out to fill the full screen horizontally when the
            right sidebar is not open" — the old 1440px cap left dead
            margins on every wide viewport; width lives in the studio,
            never in per-genre card sizes). */}
        <div
          className={cn("@container relative", wide && "h-full w-full")}
          style={wide ? undefined : { width: `min(${ZOOM_DETAIL_MAX_PX}px, 88vh)`, maxWidth: "100%" }}
        >
          {/* THE SHARED-ELEMENT CARD (2026-08-08): shares the layoutId of the
              tile in SortableCardWrap → framer morphs this card out of the
              tile's rect (grow) and back (shrink). REMOUNT-PER-CARD
              (2026-08-10): key={stage.id} makes every focus change mount a
              fresh projection node in the CURRENT card's stack — the exit
              shrinks into the CURRENT card's tile, not the stale opened one.
            data-layout-id is the DOM anchor the tests pin. */}
        <motion.div
                key={stage.id}
          layoutId={cardLayoutId(stage.id)}
          data-layout-id={cardLayoutId(stage.id)}
            data-card-expanded
            data-card-closing={isPresent ? undefined : "true"}
            data-card-ready={(ready && isPresent) || undefined}
            transition={navMountRef.current ? ZOOM_JOIN_INSTANT : ZOOM_SPRING}
            onLayoutAnimationComplete={onLayoutComplete}
        className={cn(
              // overflow-hidden keeps the content clipped to the rounded
              // corners. The morph (grow + shrink) is the SAME layoutId
              // projection both directions — "just reverse the animation."
              // NO animate-card-expand/collapse classes — those CSS keyframes
              // were the "teleport + wiggle."
              "relative flex flex-col overflow-hidden bg-card",
              // STUDIO cards: the studio panel's frame chrome, full height of
              // the wrapper. Form cards (SQUARE LAW, unconditional): the
              // panel IS ≈square at every size — OUTPUT beside CONTROLS.
              // No breakpoints: every "which breakpoint fired" variant of
              // this bug (2026-08-23 ×3) came from conditioning the shape.
              // 86vh caps a short workspace; content scrolls in its column.
              wide
                ? "h-full min-h-[320px] rounded-2xl border border-white/10 shadow-2xl shadow-black/70 ring-1 ring-brand/25"
                : "min-h-[320px] rounded-xl border border-brand/40 shadow-2xl shadow-brand/20 aspect-square max-h-[86vh]",
              !isPresent && "pointer-events-none",
      )}
              >
            {/* SKELETON-ONLY DURING THE MORPH (2026-08-09): ALL card content
                is replaced with placeholders while the box grows AND while it
                shrinks — scaling live detail is the jarring part. The real
                detail shows only when the morph has settled AND the overlay is
                present (ready && isPresent); the instant the exit begins
                (isPresent flips false) the box snaps back to the skeleton for
                the shrink-back. Studio cards get a STUDIO-SHAPED skeleton —
                the morph must read as "this card becomes the wide studio",
                not "this card becomes a form". */}
            {ready && isPresent ? (
              wide ? (
                <CardStudio
                  stage={stage}
                  running={running}
                  entry={claim}
                  onSave={(p) => actions.onEditSave?.(stage.id, p)}
                  onServiceChange={(p, s) => actions.onEditSave?.(stage.id, p, s)}
                  onRun={actions.onRun && cardIsRunnable(stage) ? () => actions.onRun?.(stage.id) : undefined}
                  onClose={onClose}
                  upstreams={upstreams}
                  onWireSlot={
                    actions.onWireSlot
                      ? (slotKey, upstreamId, outputName) =>
                          actions.onWireSlot?.(stage.id, slotKey, upstreamId, outputName)
                      : undefined
                  }
                />
              ) : (
              <CardDetailInline
            stage={stage}
                upstreams={upstreams}
                running={running}
            actions={actions}
                onOpenOutput={openOutput}
        onCollapse={onClose}
        />
              )
                ) : (
              <CardZoomSkeleton studio={wide} />
      )}
        {/* The Collapse (X) lives INSIDE CardDetailInline's header rail since
            2026-08-22 (same row as Run / In Library, same chip styling). It
            still appears ONLY with the settled detail — the detail itself is
            skeleton during the grow/shrink morph, X included — and studio
            cards never come through here (CardStudio owns its header close). */}
        </motion.div>
    </div>
    </div>
    </div>
    
      {/* Side arrows — navigate the flow's cards (like the lightbox's
          chevrons, 2026-08-08). Pinned to the overlay viewport (siblings of
          the scroll region), hidden while closing (the exit shrink is
          playing — navigation is over). */}
      {isPresent && onPrevCard && (
              <button
          onClick={onPrevCard}
          aria-label="Previous card (←)"
          className="absolute left-4 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-sidebar-border/60 bg-background/80 text-foreground/80 shadow-lg backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground"
              >
          <ChevronLeft className="size-6" />
              </button>
      )}
      {isPresent && onNextCard && (
              <button
          onClick={onNextCard}
          aria-label="Next card (→)"
          className="absolute right-4 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-sidebar-border/60 bg-background/80 text-foreground/80 shadow-lg backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground"
              >
          <ChevronRight className="size-6" />
              </button>
      )}
    </div>,
    portal.target,
  )
}

/** The skeleton that holds the zoomed card's box WHILE the shared-element
* morph plays — on the GROW (open) AND on the SHRINK (close). 2026-08-09
* policy: "during this animation, I want all the card content replaced
* with skeletons to prevent a jarring view." The box morphs transform-only;
* scaling LIVE detail (form controls, text, images) is the jarring part —
* so the whole box becomes an opaque shadcn-Skeleton layout for the whole
* morph, then the real detail swaps in (data-card-ready) once it settles.
* NO real content during the animation — not even the title / service /
* output image (those were real in the first skeleton, 2026-08-08; the
* 2026-08-09 revision made the swap all-or-nothing). */
function CardZoomSkeleton({ studio = false }: { studio?: boolean }) {
  // Studio variant: the placeholder must read as the WIDE panel the box is
  // morphing into — the RAIL on the left (title + badges, the param list, Run)
  // and the tenant's full-height viewport right of it — never as the small
  // form card, and never as the retired header/drawer layout (§7.9).
  if (studio) {
    return (
      <div data-card-skeleton className="flex h-full min-h-[320px] flex-row">
        {/* the rail — all chrome, stacked */}
        <div className="flex w-[320px] shrink-0 flex-col gap-3 border-r border-white/10 p-4">
          {/* title + close */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
          {/* badges + toggle */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="ml-auto h-7 w-7 rounded-md" />
          </div>
          {/* the tenant's projected tools */}
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-2 w-8" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
          {/* the params list */}
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          {/* Run + contract */}
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-2.5 w-40" />
        </div>
        {/* the tenant — full-height viewport + strip */}
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-4">
          <Skeleton className="min-h-[280px] w-full flex-1" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    )
  }
  return (
    // justify-center: the user's "skeleton content in the middle during
    // transition" (2026-08-08) — when the box is taller than the skeleton,
    // the content centers instead of pinning to the top.
    <div data-card-skeleton className="flex min-h-[320px] flex-col justify-center gap-2.5 p-4">
      {/* header row — the service badge + duration slot */}
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-8" />
    </div>
      {/* title line */}
      <Skeleton className="h-4 w-2/3" />
      {/* hero — the output image slot */}
      <Skeleton className="mt-1 aspect-video w-full" />
      {/* params grid (the six knobs the detail body shows) */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8" />
          ))}
    </div>
      {/* action row */}
      <Skeleton className="mt-2 h-10 w-2/3" />
    </div>
  )
}
