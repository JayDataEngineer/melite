/**
 * card-harness — THE dedicated card-surface test page (2026-10-02).
 *
 * The web-family law: there is ONE card design, rendered by ONE app, seen
 * through two windows (the editor canvas + the DSH iframe embed). This page
 * is the THIRD window — a test-only one: it mounts the SAME card surface
 * (InlineFlowCards → FlowTileGrid → CardTile) with a DETERMINISTIC
 * store fixture, so card anatomy can be pinned in a real browser without
 * booting the app shell, the Library tab, or any GPU work.
 *
 * Fixture law (mirrors the vitest suite's recipe exactly):
 *   • makeDraft (src/__tests__/__fixtures__/backendDraft.ts) is the wire
 *     stand-in for POST /v1/flows/drafts — no HTTP, no gateway run.
 *   • The done stage is stamped the way the gateway's queue write-back
 *     PATCHes it (runStatus "done" + result.assetUrls) — the same shape
 *     e2e/helpers/draftCards.ts markDone sends. The artifact rides an SVG
 *     data URL: a decodable <img> with EXACT natural dimensions, nothing
 *     on disk.
 *   • INFERENCE LAW: this page NEVER touches an inference door. The only
 *     wire call the add-flow can make is the READ-ONLY model catalog.
 *
 * BOOT ORDER LAW (mirrors src/main.tsx + __tests__/setup.ts): IndexedDB-backed
 * storage swaps in BEFORE any store module evaluates; the kinds fixture
 * registers BEFORE the card surface imports (pluginKinds' transitive store
 * graph must never bake a real editorClient into a bare harness).
 *
 * Scenarios (?scenario=):
 *   chain (default) — one DONE card (artifact, s_1) + one PENDING card (s_2)
 *   empty           — no draft; only the "+ add" tile
 */
import '../tailwind.css'
import '../index.css'
import { createElement, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

const scenario = new URLSearchParams(window.location.search).get('scenario') ?? 'chain'
/** ?embed=1 — the DSH-embed surface (AgentCardsEmbed): NO
 * [data-workspace-content] scoping root, so the zoom overlay portals to
 * document.body (fixed inset-0) exactly as it does inside the DSH iframe.
 * The embed-shell harness page drives this mode under the REAL
 * zoom-promotion machine (close-fold regression lane). */
const embedMode = new URLSearchParams(window.location.search).get('embed') === '1'

/** A decodable SVG data URL — an <img> whose natural size is EXACT. */
function svgUrl(w: number, h: number): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>` +
    `<rect width='100%' height='100%' fill='%237788aa'/></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

async function main(): Promise<void> {
  // ORDER 1 — storage: every module that reads localStorage synchronously at
  // module-eval time (storePersistence rehydrate etc.) must see the seeded
  // cache BEFORE the import that evaluates it.
  const { initBrowserStorage } = await import('@melite/contracts')
  try {
    await initBrowserStorage()
  } catch (err) {
    console.error('[card-harness] storage init failed:', err)
  }

  // ORDER 2 — the kinds table: the wire's first-party fixture (the vitest
  // suite's own seed — setup.ts), registered BEFORE the card surface loads.
  const [{ registerCardKind }, { MELITE_CORE_KINDS }, { Box }] = await Promise.all([
    import('@melite/slots'),
    import('../__tests__/fixtures/meliteCoreKinds'),
    import('lucide-react'),
  ])
  for (const k of MELITE_CORE_KINDS) {
    registerCardKind({
      kind: k.kind,
      runnable: k.runnable,
      executable: k.executable,
      formSpec: k.formSpec,
      compound: k.compound,
      opensStudio: k.opensStudio,
      badgeTone: k.badgeTone,
      ...(k.icon === 'Box' ? { icon: Box } : {}),
    })
  }

  // ORDER 3 — the card surface, the SHARED store, the wire fixture factory.
  const [{ TooltipProvider }, { InlineFlowCards }, { useEmbedGeometryTick }, { useAgentFlowStore }, { makeDraft, resetDraftIds }] =
    await Promise.all([
      import('@melite/ui/tooltip'),
      import('../surfaces/flow/InlineFlowCards'),
      import('../surfaces/flow/useEmbedGeometryTick'),
      import('../surfaces/flow/flowStore'),
      import('../__tests__/__fixtures__/backendDraft'),
    ])
  // ORDER 4 — the CHROME claims (2026-09-03 ruling: first-party chrome
  // registers STATICALLY at pluginUi import — asset-preview / tile-run /
  // media-sidebar). Without this side-effect import the preview cell
  // renders NOTHING (the slot walk finds no claim — the torn-down state).
  // The app gets it via WorkspaceLayout's boot; the harness takes it
  // directly. No wire, no gateway.
  await import('../shell/pluginUi')

  useAgentFlowStore.getState().clear()
  if (scenario === 'chain') {
    resetDraftIds()
    const draft = makeDraft('card-harness: resting anatomy (chain)', [
      { title: 'Harness done card', kind: 'generation', service: 'krea2', params: { prompt: 'harness fixture 1' } },
      { title: 'Harness pending card', kind: 'generation', service: 'krea2', params: { prompt: 'harness fixture 2' } },
    ])
    // Stamp the done stage exactly as the gateway's queue write-back does
    // (runStatus "done" + result) — hydrateDraft adopts it as a DONE card.
    const doneStage = draft.stages[0]!
    draft.stages[0] = {
      ...doneStage,
      runStatus: 'done',
      result: {
        assetUrls: [svgUrl(320, 240)],
        artifacts: {},
        metadata: {},
        completedAt: 1,
        durationSec: 9.4,
      },
    }
    await useAgentFlowStore.getState().hydrateDraft(draft)
  } else if (scenario === 'empty') {
    // ZERO-STAGE draft (not no-draft): InlineFlowCards renders its
    // no-flow placeholder when the store is empty — the + add tile
    // only mounts over an EXISTING flow. A zero-stage draft gives
    // the grid its "only the add affordance" state.
    resetDraftIds()
    const draft = makeDraft('card-harness: empty (zero stages)', [])
    await useAgentFlowStore.getState().hydrateDraft(draft)
  } else if (scenario === 'misfire') {
    // The Run-button probe (GPU-free). One PENDING card whose service
    // CANNOT resolve: the flat start payload {service: ...} composes
    // client-side, then the gateway's admission door rejects it 4xx
    // BEFORE any run registers (QUEUE LANE LAW — no fallback, no zombie
    // slots). The wire monitor then sees a semantic validation answer,
    // never a 404-drift / 5xx misfire, and the card must SURFACE the
    // exact error (RESILIENCE LAW's UI face) instead of swallowing it.
    resetDraftIds()
    const draft = makeDraft('card-harness: misfire probe (unresolvable service)', [
      { title: 'Misfire probe card', kind: 'generation', service: 'harness-unresolvable-model', params: { prompt: 'misfire probe' } },
    ])
    await useAgentFlowStore.getState().hydrateDraft(draft)
  }

  // Embed chrome (?embed=1): the AgentCardsEmbed contract without the
  // draft hydration (the harness hydrates its own deterministic fixture) —
  // the geometry tick + the unscoped portal root the DSH iframe has.
  function EmbedChrome() {
    const tick = useEmbedGeometryTick()
    return createElement(
      'div',
      { 'data-agent-cards-embed': '', 'data-geometry-tick': tick, style: { padding: '0.5rem', paddingBottom: '0.75rem' } },
      createElement(InlineFlowCards),
    )
  }
  const cards = embedMode
    ? createElement(EmbedChrome)
    : createElement(
      'div',
      { 'data-harness-root': '', 'data-harness-scenario': scenario, style: { padding: '2rem' } },
      createElement(InlineFlowCards),
    )
  const mount = createElement(
    StrictMode,
    null,
    createElement(
      TooltipProvider,
      null,
      // [data-workspace-content] — the zoom overlay's scoping root. Without
      // it the portal falls back to document.body; providing it makes the
      // overlay behave EXACTLY as it does inside the app shell. Embed mode
      // (?embed=1) skips it — the DSH iframe has no workspace root.
      embedMode
        ? cards
        : createElement(
          'div',
          { 'data-workspace-content': '', style: { position: 'relative', minHeight: '100vh' } },
          cards,
        ),
    ),
  )
  createRoot(document.getElementById('root')!).render(mount)
}

main().catch((err: unknown) => {
  console.error('[card-harness] boot failed:', err)
  const root = document.getElementById('root')
  if (root) root.textContent = `card-harness boot failed: ${String(err)}`
})
