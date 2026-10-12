// @vitest-environment happy-dom
/**
 * preview-figure-face.spec.tsx — THE PRE-RUN FIGURE FACE (the
 * operator's 2026-10-12 catch, the five-hour hole): a card that
 * declares preview.figure shows the native body IN THE DRILL the
 * moment the card opens — BEFORE any run — whatever its declared
 * OUTPUT kind. The defect (cured in stage-drill.tsx): the kind
 * switch routed the preview seat by the DECLARED OUTPUT kind
 * (anny = image → ImageStagePreview, which has no figure arm), so
 * the assembled owner.figure was silently discarded and the drill
 * opened on the image tombstone. THE LAW (stroke 90): the figure
 * face is the pre-run seat; run outputs take the stage once they
 * exist. Harness mirrors preview-dispatch.spec (fetch stubbed
 * whole; tile click opens the zoom drill).
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'
import { mountEstateFakes } from './estate-harness.ts'
import { unbindEstateRemote } from '@melite/card-base/client'

import { CardsTab } from '../src/client/CardsTab.tsx'
import { schemaEnvelope } from '@melite/card-base/client'
import type { CardsBenchValue } from '../src/client/cards-resource.ts'

const noop = (): void => {}
afterEach(() => { cleanup(); unbindEstateRemote(); vi.unstubAllGlobals() })

function tileButton(): HTMLElement {
  const el = document.querySelector('button[class*="tileInner"]')
  if (el === null) throw new Error('tile button not found')
  return el as HTMLElement
}

/** Same wire frame as preview-dispatch's stubWire. The stage is
 *  PRE-RUN by default (runStatus pending, NO result): the figure
 *  contract's whole point is the face BEFORE any run lands. */
function stubWire(opts: {
  card: string
  outputs: Record<string, string>
  figure?: { identityModel: string }
  artifacts?: Record<string, string>
  runStatus?: string
}): CardsBenchValue {
  const artifacts = opts.artifacts ?? {}
  // PRE-RUN = NO runStatus key at all (a fresh stage carries none;
  // 'pending' is a LIVE-run word — isLiveRunStatus reads it as
  // 'rendering…', which is not the never-run face).
  const stageRow = {
    id: 's_0', card: opts.card, title: 'the stage', engine: 'comfyui',
    params: {},
    ...(opts.runStatus !== undefined ? { runStatus: opts.runStatus } : {}),
    ...(Object.keys(artifacts).length > 0 ? { result: { artifacts } } : {}),
  }
  const bench: CardsBenchValue = {
    kind: 'bench', draftId: 'bench-fig', rev: 1,
    sessionKey: 'fig',
    stages: [stageRow],
    log: [],
  }
  const benchDoc = {
    draft_id: 'bench-fig', rev: 1,
    stages: [stageRow],
    log: [],
  }
  // THE ONE-FAKE LAW (stroke 81): bench/get + runs/status ride the
  // bound namespaces; fetch answers ONLY the /v1 discovery doors.
  mountEstateFakes({
    benchDoc,
    runDocs: [],
  })
  const impl = async (url: unknown): Promise<Response> => {
    const path = String(url)
    if (path.includes('/v1/form-spec')) {
      return new Response(JSON.stringify({
        form: opts.card, genre: '3d', engine: 'comfyui',
        schema: schemaEnvelope({
          prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
        }),
        outputs: opts.outputs,
        // THE CARD-DECLARED FIGURE (anny's real declaration shape —
        // packages/3d/anny/src/card.ts:140): pre-run seat material.
        ...(opts.figure !== undefined ? { preview: { figure: opts.figure } } : {}),
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/model-catalog')) {
      return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    throw new Error('estate door on the fetch lane: ' + path)
  }
  vi.stubGlobal('fetch', impl)
  return bench
}

function mountTab(bench: CardsBenchValue): void {
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: noop },
      },
    }),
    useResource: () => ({ status: 'live' as const, value: bench }),
  }))
}

/** THE CONTRACT'S OWN ARM: open the drill on a never-run
 *  IMAGE-kind card that declares a figure — the body face serves,
 *  the image tombstone never mounts. (happy-dom has no WebGL; the
 *  figure face honestly shows its loading/failed seat — the arm
 *  pins the FACE mounted, the seat PoserFigureStage owns.) */
test('a figure-declaring card opens the drill on the BODY face, pre-run, whatever its output kind', async () => {
  const bench = stubWire({ card: 'anny', outputs: { default: 'image' }, figure: { identityModel: 'anny' } })
  const user = userEvent.setup()
  mountTab(bench)
  await user.click(tileButton())
  expect(await screen.findByText('Prompt', {}, { timeout: 4000 })).toBeTruthy()
  await waitFor(() => {
    expect(document.querySelector('[data-viewport="poser-figure:s_0"]')).not.toBeNull()
  }, { timeout: 4000 })
  expect(document.querySelector('[data-testid="stage-preview-mesh"]')).not.toBeNull()
  // the image tombstone NEVER mounts — the body is the pre-run seat
  expect(screen.queryByText('No render yet — run lands the image here')).toBeNull()
})

/** THE CONTROL: a card that declares NO figure keeps the declared
 *  kind's empty hint (the tombstone is honest for non-figure
 *  cards — the cure must not blanket-mount the mesh seat). */
test('a non-figure card keeps its declared-kind tombstone, pre-run', async () => {
  const bench = stubWire({ card: 'image-gen', outputs: { default: 'image' } })
  const user = userEvent.setup()
  mountTab(bench)
  await user.click(tileButton())
  expect(await screen.findByText('Prompt', {}, { timeout: 4000 })).toBeTruthy()
  expect(await screen.findByText('No render yet — run lands the image here', {}, { timeout: 4000 })).toBeTruthy()
  expect(document.querySelector('[data-viewport^="poser-figure"]')).toBeNull()
  expect(document.querySelector('[data-testid="stage-preview-mesh"]')).toBeNull()
})

/** THE TAKEOVER (stroke 90's second half): once artifacts exist the
 *  DECLARED kind takes the stage — the figure retires until the
 *  outputs are gone again. */
test('with artifacts the declared kind takes the stage over the figure', async () => {
  const bench = stubWire({
    card: 'anny', outputs: { default: 'image' }, figure: { identityModel: 'anny' },
    artifacts: { body: '/out/turnaround.png' }, runStatus: 'done',
  })
  const user = userEvent.setup()
  mountTab(bench)
  await user.click(tileButton())
  expect(await screen.findByText('Prompt', {}, { timeout: 4000 })).toBeTruthy()
  await waitFor(() => {
    expect(document.querySelector('[data-testid="stage-preview-image-hero"]')).not.toBeNull()
  }, { timeout: 4000 })
  expect(document.querySelector('[data-testid="stage-preview-mesh"]')).toBeNull()
  expect(document.querySelector('[data-viewport^="poser-figure"]')).toBeNull()
})
