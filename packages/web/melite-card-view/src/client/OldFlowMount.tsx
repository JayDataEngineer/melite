/**
 * OldFlowMount.tsx — THE 1:1 FLOW SYSTEM, MOUNTED (2026-09-11).
 *
 * The old editor's card system — the whole surfaces/flow tree — rides
 * inside the DSH card-view plugin (src/old, verbatim). This mount is
 * the bridge: the bench resource (the SHARED state door) hydrates the
 * Library store (the same singleton the canvas + chat grid read), and
 * FlowCanvas renders 1:1 (drag, grouping, zoom, the picker, the
 * declared forms, run feedback — the whole UX).
 *
 * THE HYDRATION LAW (the old system's own): bench stages map onto
 * BackendStage rows — card id → service (the family), kind from the
 * card's identity genre, params verbatim, inputs the stage's wiring —
 * and hydrateDraft's idempotency + same-id-newer gate decides whether
 * the store adopts (never blows away a running flow).
 */
import { createElement as h, useEffect, useRef } from 'react'
import './old-flow.css'
// The always-on persistence law (SAVE TO DISK — localStorage mirror,
// the module's own header) — a side-effect import, exactly as the
// editor's boot did.
import '../old/surfaces/flow/storePersistence.ts'
import { FlowCanvas } from '../old/surfaces/flow/FlowCanvas.tsx'
import { TooltipProvider } from '@melite/ui/tooltip'
import { Toaster } from '../old/components/Toaster.tsx'
import { useAgentFlowStore } from '../old/surfaces/flow/flowStore.ts'
import type { BackendDraft, BackendStage } from '@melite/contracts'
import type { CardsBenchValue } from './cards-resource.ts'

/** One bench stage row → the store's stage shape (card identity IS the
 *  stage: service = the card id, kind = the identity's genre, title =
 *  the identity label — the same projection the agent's bench verbs
 *  serve, one truth two authors). */
function benchToDraft(bench: CardsBenchValue, genres: Map<string, { label: string; genre: string }>): BackendDraft {
  const stages: BackendStage[] = bench.stages.map((s) => {
    const ident = genres.get(String(s.card ?? '')) ?? { label: String(s.card ?? s.id), genre: 'generation' }
    const stage: Record<string, unknown> = {
      id: s.id,
      title: ident.label,
      kind: ident.genre,
      service: String(s.card ?? ''),
      params: typeof s.params === 'object' && s.params !== null ? s.params : {},
      inputs: Array.isArray(s.inputs) ? s.inputs : [],
    }
    if (typeof s.engine === 'string' && s.engine !== '') stage['engine'] = s.engine
    return stage as unknown as BackendStage
  })
  return {
    draft_id: bench.draftId,
    intent: bench.stages.length > 0 && typeof bench.stages[0]?.['prompt'] === 'string'
      ? String(bench.stages[0]['prompt'])
      : 'bench',
    stages,
    status: 'ready',
    createdAt: bench.rev,
    completedAt: null,
  }
}

export function OldFlowMount({ bench }: { bench: CardsBenchValue }): ReturnType<typeof h> {
  const hydratedFor = useRef<string>('')
  useEffect(() => {
    const key = bench.draftId + ':' + String(bench.rev)
    if (hydratedFor.current === key) return
    hydratedFor.current = key
    const genres = new Map<string, { label: string; genre: string }>()
    for (const s of bench.stages) {
      const card = String(s.card ?? '')
      if (card !== '' && !genres.has(card)) {
        genres.set(card, { label: String(s.title ?? card), genre: typeof s.kind === 'string' && s.kind !== '' ? s.kind : 'generation' })
      }
    }
    void useAgentFlowStore.getState().hydrateDraft(benchToDraft(bench, genres))
  }, [bench.draftId, bench.rev, bench.stages])
  // The shell law the editor's App root provided (App.tsx: TooltipProvider
  // + Toaster around every surface): the DSH pane hosts the tree raw, so
  // the mount carries its own shell. The default theme rides the compiled
  // old-flow.css :root vars (the editor's ThemeProvider lane is a logged-
  // degrade there; here the palette is static by construction).
  return h(TooltipProvider, {
    delayDuration: 300,
    children: [h(FlowCanvas), h(Toaster)],
  })
}
