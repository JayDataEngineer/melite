// @vitest-environment happy-dom
// @contract cards-attached-mesh-preview
/**
 * input-pin-siblings.spec.tsx — THE SIBLING BLAST RADIUS (work order
 * WO-1, errors-completion stream 2026-10-22; the row's own
 * NOT-COVERED confessions): attachedImageOf is GENERIC — every card
 * whose served schema declares a wtype 'image' field gained the
 * input-pin derivation when the E2-1 law landed, and only anny
 * (preview-figure-face) + img-to-mesh (the sibling seam arm there)
 * were walled. The row names the unjudged: h3 image + last_frame
 * (TWO anchors — the pin source is the FIRST non-empty), mask
 * payload, and the pack input-group image rows. This wall holds the
 * CLASS two ways, both derived — never a card-id hand-list:
 *
 * ARM 1 THE SWEEP (real boot, every real card): the roster DERIVES
 *      from the served specs themselves (fieldsOf type 'image'),
 *      classed by the card's declared output kind; per sibling the
 *      derivation answers THE CARD'S OWN field names — the pin on
 *      the first image field, the first-NON-EMPTY precedence when a
 *      card declares two anchors, whitespace-is-emptiness on every
 *      one. A card growing its first image field joins the roster by
 *      itself and is judged the same day.
 * ARM 2+ THE FACE ARMS (the real drill, the figure-face grammar):
 *      the photo never becomes the preview's seat on ANY kind — the
 *      mesh seat pins it beside the stage (ReferenceImageBadge, the
 *      anny/img-to-mesh arms already walled there), and the
 *      video/image seats keep their OWN pre-run faces with NO badge
 *      and NO paste-over: the pin is the mesh estimator seat's
 *      annotation law, and a photo arriving on another kind's card
 *      is that card's own input, never a preview face. These arms
 *      pin that state deliberately — a future pin face for the
 *      video/image seats lands as an amendment to this row, never
 *      silently.
 */
import '../../../../tests/helpers/boot-models.ts'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { mountEstateFakes } from './estate-harness.ts'
import { unbindEstateRemote, schemaEnvelope, fieldsOf, attachedImageOf, type FormSpecDoc, type SpecValues } from '@melite/card-base/client'
import { loadCardDefs } from '@melite/comfyui-cordis'
import { formSpecArm } from '../../../../packages/harness/melite-tools/src/discovery.ts'
import { CardsTab } from '../src/client/CardsTab.tsx'
import type { CardsBenchValue } from '../src/client/cards-resource.ts'
import { draftIdOf } from '@melite/contracts/benchStage'
import { createElement } from 'react'

const noop = (): void => {}
afterEach(() => { cleanup(); unbindEstateRemote(); vi.unstubAllGlobals() })

/** One sibling row of the derived roster: the card, its served spec,
 *  the image-kind fields in walk order, and the output kind class
 *  (primaryKindFor's own source — spec.outputs.default). */
interface Sibling { card: string, spec: FormSpecDoc, imageFields: string[], kind: string }

async function deriveSiblings(): Promise<Sibling[]> {
  const defs = await loadCardDefs()
  const out: Sibling[] = []
  for (const id of [...defs.keys()].sort()) {
    let spec: FormSpecDoc | null
    try {
      spec = (await formSpecArm(id)) as FormSpecDoc | null
    } catch {
      continue
    }
    if (spec === null) continue
    const imageFields = fieldsOf(spec).filter((f) => f.type === 'image').map((f) => f.name)
    if (imageFields.length === 0) continue
    const declared = (spec as { outputs?: Record<string, unknown> }).outputs?.['default']
    out.push({ card: id, spec, imageFields, kind: typeof declared === 'string' ? declared : 'unclassed' })
  }
  return out
}

test('ARM 1 — THE DERIVED SWEEP: every served image-kind field answers the pin by its own name (roster derived, never hand-listed)', async () => {
  const siblings = await deriveSiblings()
  const roster = siblings.map((s) => `${s.card}[${s.kind}]: ${s.imageFields.join(', ')}`)
  // the roster is LIVE: at least one sibling per named class rides it
  // (mesh = the pin's own seat; video = h3's two-anchor card; image =
  // mask/pack payloads). A class emptying reds HERE by name — the
  // known sibling retired its image field, a deliberate edit.
  for (const kind of ['mesh', 'video', 'image']) {
    expect(roster.some((r) => r.includes(`[${kind}]`)),
      `no [${kind}]-output card declares an image field any more — the sibling roster lost a class:\n${roster.join('\n')}`).toBe(true)
  }
  const offenders: string[] = []
  for (const s of siblings) {
    const first = s.imageFields[0]!
    // (a) the pin on the FIRST image field answers THAT field's name
    const pin = attachedImageOf(s.spec, { [first]: 'data/input/person.png' } as SpecValues)
    if (pin === null || pin.id !== first || !pin.url.includes('person.png')) {
      offenders.push(`${s.card}: a stated '${first}' derives no pin (saw ${JSON.stringify(pin)}) — the generic derivation missed this card's own field`)
    }
    // (b) FIRST-NON-EMPTY precedence: a value only on a later anchor
    // pins that anchor (an empty first field never wins)
    for (const later of s.imageFields.slice(1)) {
      const laterPin = attachedImageOf(s.spec, { [first]: '', [later]: 'data/input/person.png' } as SpecValues)
      if (laterPin === null || laterPin.id !== later) {
        offenders.push(`${s.card}: a value on the later anchor '${later}' must pin it (saw ${JSON.stringify(laterPin)}) — the first-non-empty law drifted`)
      }
    }
    // (c) WHITESPACE IS EMPTINESS on every sibling's own surface
    for (const f of s.imageFields) {
      if (attachedImageOf(s.spec, { [f]: '   ' } as SpecValues) !== null) {
        offenders.push(`${s.card}: whitespace on '${f}' pins — whitespace is emptiness at the pin too`)
      }
    }
  }
  expect(offenders,
    `the sibling blast radius drifted (roster:\n${roster.join('\n')})`).toEqual([])
}, 120_000)

/** Same wire frame as preview-figure-face's stubWire, minimal for the
 *  face arms: a PRE-RUN stage holding one stated image-kind field,
 *  the served schema declaring that field, outputs by class. The
 *  fetch lane answers ONLY the discovery doors — any other estate
 *  door throws (the harness law). */
function stubStageWire(opts: { card: string, genre: string, outputs: Record<string, string>, imageInputs: Record<string, string> }): CardsBenchValue {
  const stageRow = {
    id: 's_0', card: opts.card, title: 'the stage', engine: 'comfyui',
    params: { ...opts.imageInputs },
  }
  mountEstateFakes({
    benchDoc: { draft_id: 'bench-pin', rev: 1, stages: [stageRow], log: [] },
    runDocs: [],
  })
  const impl = async (url: unknown): Promise<Response> => {
    const path = typeof url === 'string' ? url : String((url as Request).url)
    if (path.includes('/v1/form-spec')) {
      return new Response(JSON.stringify({
        form: opts.card, genre: opts.genre, engine: 'comfyui',
        schema: schemaEnvelope(Object.fromEntries([
          ['prompt', { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } }],
          ...Object.keys(opts.imageInputs).map((name) => [name,
            { type: 'string', meta: { description: name, extra: { wtype: 'image', group: 'body' } } }]),
        ])),
        outputs: opts.outputs,
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/model-catalog')) {
      return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    throw new Error('estate door on the fetch lane: ' + path)
  }
  vi.stubGlobal('fetch', impl)
  return {
    kind: 'bench', draftId: draftIdOf('bench-pin'), rev: 1, sessionKey: 'pin',
    stages: [stageRow], log: [],
  }
}

function tileButton(): HTMLElement {
  const el = document.querySelector('[role="button"][class*="tileInner"]')
  if (el === null) throw new Error('tile button not found')
  return el as HTMLElement
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

test('ARM 2 — the video seat (h3 class, two anchors): the stated photo never becomes the preview face — no badge, no paste-over, the video pre-run face keeps the seat', async () => {
  const bench = stubStageWire({
    card: 'h3-timeline', genre: 'video', outputs: { default: 'video' },
    imageInputs: { image: 'data/input/person.png' },
  })
  const user = userEvent.setup()
  mountTab(bench)
  await user.click(tileButton())
  await screen.findByText('Prompt', {}, { timeout: 4000 })
  await waitFor(() => {
    expect(document.querySelector('[data-testid="stage-preview-video"]')).not.toBeNull()
  }, { timeout: 4000 })
  expect(document.querySelector('[data-slot="reference-image-badge"]'),
    'the video seat carries no pin face — the photo is this card\'s own input, never a preview seat (an amendment to this row is a deliberate edit)').toBeNull()
  expect(document.querySelector('[data-testid="stage-preview-input-image"]'),
    'the paste-over regression class (E2-1) on the video seat').toBeNull()
})

test('ARM 3 — the image seat (mask/pack class): the stated payload keeps the image face — no badge, no paste-over', async () => {
  const bench = stubStageWire({
    card: 'mask', genre: 'image', outputs: { default: 'image' },
    imageInputs: { payload: 'data/input/person.png' },
  })
  const user = userEvent.setup()
  mountTab(bench)
  await user.click(tileButton())
  await screen.findByText('Prompt', {}, { timeout: 4000 })
  await waitFor(() => {
    expect(document.querySelector('[data-testid="stage-preview-image"]')).not.toBeNull()
  }, { timeout: 4000 })
  expect(document.querySelector('[data-slot="reference-image-badge"]'),
    'the image seat carries no pin face — the payload is the estimator\'s input, never the preview seat').toBeNull()
  expect(document.querySelector('[data-testid="stage-preview-input-image"]'),
    'the paste-over regression class (E2-1) on the image seat').toBeNull()
})
