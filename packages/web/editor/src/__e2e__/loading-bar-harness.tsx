/**
 * loading-bar-harness — fixed-state CardTile mount for the per-card loading
 * bar lane (restored 2026-10-02; the original entry was deleted and the page
 * rotted silently — tests/test_web_harness_pages.py now refuses that).
 *
 * RESTORED TO THE CURRENT CONTRACT, not the old one: CardProgressBar renders
 * ONLY on a real {value, max} frame streamed from the sampler — "No progress
 * data = no bar (NOT a shimmer or spinner — those lie about what's
 * happening)" (CardActivity.tsx, 2026-08-15). The deleted indeterminate mode
 * is NOT resurrected: a running card with no frame yet renders NO bar, and
 * the live card proves the bar APPEARS determinate the moment a frame lands.
 *
 * States mounted (the data-harness names are the spec's stable contract):
 *   running-with-progress — running + frame {5, 20}  → bar, "step 5/20", 25%
 *   running-no-progress   — running, no frame        → NO bar
 *   not-running           — idle                     → NO bar
 *   live-progress         — running, frame LANDS at ~1.5s {14, 20} → 70%
 *
 * BOOT ORDER LAW: same as card-harness.tsx (storage → kinds fixture → the
 * card surface) — see that file for the reasoning.
 */
import '../tailwind.css'
import '../index.css'
import { createElement, useEffect, useState, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import type { CardStage } from '@melite/contracts'

/** A minimal CardStage in a fixed run state — the tile reads only these. */
function stage(id: string, over: Partial<CardStage>): CardStage {
  return {
    id,
    title: `Harness ${id}`,
    kind: 'generation',
    service: 'krea2',
    params: { prompt: 'harness' },
    inputs: [],
    inputIndices: [],
    result: null,
    status: 'running',
    provenance: 'agent',
    ...over,
  }
}

async function main(): Promise<void> {
  const { initBrowserStorage } = await import('@melite/contracts')
  try {
    await initBrowserStorage()
  } catch (err) {
    console.error('[loading-bar-harness] storage init failed:', err)
  }
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
  const [{ CardTile }, { TooltipProvider }] = await Promise.all([
    import('../surfaces/flow/flowCardTile'),
    import('@melite/ui/tooltip'),
  ])

  /** The live card: no frame at mount; a {14, 20} frame lands at ~1.5s —
   * exactly what the backend poll delivering brick.progress looks like. */
  function LiveProgressCard(): React.ReactElement {
    const [progress, setProgress] = useState<CardStage['progress']>(null)
    useEffect(() => {
      const t = window.setTimeout(() => setProgress({ value: 14, max: 20 }), 1500)
      return () => window.clearTimeout(t)
    }, [])
    return (
      <div data-harness="live-progress" style={{ width: 260, padding: 8 }}>
        <CardTile
          stage={stage('live', { progress })}
          running
          index={3}
          onOpen={() => {}}
          onRemove={() => {}}
        />
      </div>
    )
  }

  const tile = (id: string, over: Partial<CardStage>, running: boolean, index: number) => (
    <div data-harness={id} key={id} style={{ width: 260, padding: 8 }}>
      <CardTile stage={stage(id, over)} running={running} index={index} onOpen={() => {}} onRemove={() => {}} />
    </div>
  )

  createRoot(document.getElementById('root')!).render(
    // CardTile renders Radix Tip tooltips — the app mounts ONE
    // TooltipProvider at the root; mirror that here (the vitest recipe's
    // strictRender does the same).
    createElement(
      StrictMode,
      null,
      createElement(
        TooltipProvider,
        null,
        createElement(
          'div',
          { style: { display: 'flex', flexWrap: 'wrap', gap: 16, padding: 24, background: '#0a0a0a', minHeight: '100vh' } },
          tile('running-with-progress', { progress: { value: 5, max: 20 } }, true, 0),
          tile('running-no-progress', {}, true, 1),
          tile('not-running', { status: 'pending' }, false, 2),
          createElement(LiveProgressCard),
        ),
      ),
    ),
  )
}

main().catch((err: unknown) => {
  console.error('[loading-bar-harness] boot failed:', err)
  const root = document.getElementById('root')
  if (root) root.textContent = `loading-bar-harness boot failed: ${String(err)}`
})
