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
 *  contract's whole point is the face BEFORE any run lands.
 *  `meshInputs` seeds HELD mesh-kind field values (the (j) law's
 *  seat: a card holding an attached GLB — anny's body_glb) onto
 *  the stage params AND declares the mesh fields on the served
 *  schema, mirroring anny's real body_glb seat (z.string,
 *  wtype 'mesh'). The returned glbDoor list records every
 *  /v1/assets/inputs fetch the stage fans — the attached file's
 *  OWN bytes, the journey pin from UI seat to the byte door. */
function stubWire(opts: {
  card: string
  outputs: Record<string, string>
  figure?: { identityModel: string }
  artifacts?: Record<string, string>
  runStatus?: string
  meshInputs?: Record<string, string>
  imageInputs?: Record<string, string>
}): { bench: CardsBenchValue, glbDoor: string[] } {
  const artifacts = opts.artifacts ?? {}
  const meshInputs = opts.meshInputs ?? {}
  const imageInputs = opts.imageInputs ?? {}
  const glbDoor: string[] = []
  // PRE-RUN = NO runStatus key at all (a fresh stage carries none;
  // 'pending' is a LIVE-run word — isLiveRunStatus reads it as
  // 'rendering…', which is not the never-run face).
  const stageRow = {
    id: 's_0', card: opts.card, title: 'the stage', engine: 'comfyui',
    params: { ...meshInputs, ...imageInputs },
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
    // three's FileLoader hands a Request object, not a bare string
    // (glb-stage-load.spec's own law)
    const path = typeof url === 'string' ? url : String((url as Request).url)
    if (path.includes('/v1/form-spec')) {
      return new Response(JSON.stringify({
        form: opts.card, genre: '3d', engine: 'comfyui',
        schema: schemaEnvelope({
          prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
          ...Object.fromEntries(Object.keys(meshInputs).map((name) => [name,
            { type: 'string', meta: { description: name, extra: { wtype: 'mesh', group: 'body' } } },
          ])),
          ...Object.fromEntries(Object.keys(imageInputs).map((name) => [name,
            { type: 'string', meta: { description: name, extra: { wtype: 'image', group: 'body' } } },
          ])),
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
    // the image face's byte door: the same /v1/assets/inputs lane
    // serves the stated photo (the door's grammar is name-based,
    // never kind-based) — a tiny PNG so the <img> decodes. Checked
    // BEFORE the GLB arm (the path grammar overlaps; the suffix
    // decides the bytes)
    if (path.includes('/v1/assets/inputs/') && path.includes('.png')) {
      glbDoor.push(path)
      return new Response(craftPng(), { status: 200, headers: { 'content-type': 'image/png' } })
    }
    if (path.includes('/v1/assets/inputs/')) {
      glbDoor.push(path)
      return new Response(craftGlb(), { status: 200, headers: { 'content-type': 'model/gltf-binary' } })
    }
    throw new Error('estate door on the fetch lane: ' + path)
  }
  vi.stubGlobal('fetch', impl)
  return { bench, glbDoor }
}

/** A minimal 1×1 transparent PNG — the image face's decodable bytes
 *  (test files own their fakes; the b64 is the canonical 1×1). */
function craftPng(): ArrayBuffer {
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  const bin = atob(b64)
  const out = new ArrayBuffer(bin.length)
  const bytes = new Uint8Array(out)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return out
}

/** A minimal valid GLB: one node → one mesh of one triangle
 *  primitive (glb-stage-load.spec's craft — test files own their
 *  fakes). */
function craftGlb(): ArrayBuffer {
  const json = JSON.stringify({
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'root' }],
    meshes: [{ name: 'm', primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', max: [1, 1, 0], min: [0, 0, 0] }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
    buffers: [{ byteLength: 36 }],
  })
  const jsonBytes = new TextEncoder().encode(json)
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4
  const bin = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
  const total = 12 + 8 + jsonBytes.length + jsonPad + 8 + bin.byteLength
  const buf = new ArrayBuffer(total)
  const view = new DataView(buf)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, total, true)
  view.setUint32(12, jsonBytes.length + jsonPad, true)
  view.setUint32(16, 0x4e4f534a, true)
  new Uint8Array(buf, 20, jsonBytes.length).set(jsonBytes)
  for (let i = 0; i < jsonPad; i++) view.setUint8(20 + jsonBytes.length + i, 0x20)
  const binAt = 20 + jsonBytes.length + jsonPad
  view.setUint32(binAt, bin.byteLength, true)
  view.setUint32(binAt + 4, 0x004e4942, true)
  new Uint8Array(buf, binAt + 8, bin.byteLength).set(new Uint8Array(bin.buffer))
  return buf
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
  const { bench } = stubWire({ card: 'anny', outputs: { default: 'image' }, figure: { identityModel: 'anny' } })
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
  const { bench } = stubWire({ card: 'image-gen', outputs: { default: 'image' } })
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
  const { bench } = stubWire({
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

/** THE ATTACHED BODY (the (j) cure, ERRORS.md:89 — "BODY GLB does
 *  not do what it is supposed to do on the anny card, that is
 *  become the anny model preview"): THE PREVIEW SHOWS THE BODY THE
 *  RUN WOULD BAKE. Compose mirrors this exactly (anny actions.ts:
 *  a non-empty body_glb renders the GLB AS-IS; only the empty path
 *  bakes AnnyParamsToGlb) — so a card HOLDING an attached GLB
 *  opens the drill on the GLB's own bytes through the input asset
 *  door, and the parametric figure RETIRES (showing the native
 *  figure under an attached GLB would preview a body the run will
 *  never bake — the exact silent-mismatch class this purge hunts).
 *  THE 2026-09-06 ORDER'S OWN EDGE: "the native figure viewport —
 *  NEVER the low-poly GLB export" bans the anny-base-body EXPORT
 *  substituting the native figure; a USER-ATTACHED GLB is the
 *  compose-truth arm (actions.ts:82 "an attached GLB renders
 *  as-is") — a different artifact, the one the run composes. */
test('an attached GLB owns the pre-run face — the figure retires (the preview is the body the run would bake)', async () => {
  const { bench, glbDoor } = stubWire({
    card: 'anny', outputs: { default: 'image' }, figure: { identityModel: 'anny' },
    meshInputs: { body_glb: 'data/input/donor.glb' },
  })
  const user = userEvent.setup()
  mountTab(bench)
  await user.click(tileButton())
  expect(await screen.findByText('Prompt', {}, { timeout: 4000 })).toBeTruthy()
  // the mesh stage owns the pre-run face (same override the figure
  // rides — the attached GLB is a pre-run seat of the same class)
  await waitFor(() => {
    expect(document.querySelector('[data-testid="stage-preview-mesh"]')).not.toBeNull()
  }, { timeout: 4000 })
  // THE ATTACHED FILE'S OWN BYTES: the stage fans a load through the
  // input asset door — the URL face of the held estate path
  await waitFor(() => {
    expect(glbDoor.some((u) => u.includes('/v1/assets/inputs/donor.glb'))).toBe(true)
  }, { timeout: 4000 })
  // the GLB stage owns the seat: its own viewport label mounts (the
  // crafted GLB parses headless; WebGL absence then serves the
  // stage's honest per-asset failure face — the mount + the byte
  // walk are this wall's pins, the canvas shell itself is
  // glb-stage-load's own law)
  expect(document.querySelector('[data-viewport="glb-stage"]')).not.toBeNull()
  // the parametric figure NEVER mounts — the attached GLB won
  expect(document.querySelector('[data-viewport^="poser-figure"]')).toBeNull()
})

/** THE PARAMETRIC CONTROL (the whitespace law, mirrored from anny's
 *  compose gate — whitespace IS emptiness, never a refusal): an
 *  all-whitespace body_glb still bakes parametric, so the preview
 *  still shows the native figure. This pins that the attached arm
 *  is VALUE-derived (the held value drives the face, never the
 *  field's mere presence). */
test('a whitespace-only attached GLB is emptiness — the native figure keeps the pre-run face', async () => {
  const { bench, glbDoor } = stubWire({
    card: 'anny', outputs: { default: 'image' }, figure: { identityModel: 'anny' },
    meshInputs: { body_glb: '   ' },
  })
  const user = userEvent.setup()
  mountTab(bench)
  await user.click(tileButton())
  expect(await screen.findByText('Prompt', {}, { timeout: 4000 })).toBeTruthy()
  await waitFor(() => {
    expect(document.querySelector('[data-viewport="poser-figure:s_0"]')).not.toBeNull()
  }, { timeout: 4000 })
  expect(document.querySelector('[data-testid="stage-preview-glb"]')).toBeNull()
  expect(glbDoor.length).toBe(0)
})

/** THE (l) IMAGE FACE AT THE PREVIEW HOP (the journey's re-opener,
 *  k-j-l-batched-2026-11-08): the preview mirrors compose's ONE
 *  stated precedence — image > glb > parametric. A stated body photo
 *  IS the pre-run face (the input the user attached, through the
 *  same input asset door); the attached GLB NEVER mounts under it
 *  (the run bakes the ESTIMATE — showing the GLB would preview a
 *  body the run will not bake, the exact lie class this purge
 *  hunts), and the figure retires under it too. The arms:
 *  BOTH-STATED (the firing arm — image wins over a held GLB),
 *  IMAGE-ALONE (image wins over the figure), WHITESPACE-IMAGE (the
 *  fall returns to the GLB — whitespace is emptiness). */
test('(l) BOTH stated: the photo owns the pre-run face — the attached GLB never mounts (the preview mirrors compose image > glb)', async () => {
  const { bench, glbDoor } = stubWire({
    card: 'anny', outputs: { default: 'image' }, figure: { identityModel: 'anny' },
    meshInputs: { body_glb: 'data/input/donor.glb' },
    imageInputs: { body_image: 'data/input/person.png' },
  })
  const user = userEvent.setup()
  mountTab(bench)
  await user.click(tileButton())
  expect(await screen.findByText('Prompt', {}, { timeout: 4000 })).toBeTruthy()
  // THE IMAGE FACE mounts — the stated photo's own bytes through
  // the input door (the mesh stage's image arm)
  const img = await waitFor(() => {
    const el = document.querySelector('[data-testid="stage-preview-input-image"]') as HTMLImageElement | null
    expect(el).not.toBeNull()
    return el!
  }, { timeout: 4000 })
  expect(img.getAttribute('src') ?? '', 'the img carries the door URL of the stated photo').toContain('/v1/assets/inputs/person.png')
  // THE GLB NEVER MOUNTS: no viewport, no mesh load — the estimate
  // outranks the attach and the preview says so
  expect(document.querySelector('[data-viewport="glb-stage"]')).toBeNull()
  await new Promise((r) => setTimeout(r, 300))
  expect(glbDoor.some((u) => u.includes('donor.glb')), 'the displaced GLB never loads').toBe(false)
  // the figure retires under the image too (image > glb > figure —
  // the run bakes the estimate, never the parametric body)
  expect(document.querySelector('[data-viewport^="poser-figure"]')).toBeNull()
})

test('(l) the photo alone owns the pre-run face — the figure retires (image > figure)', async () => {
  const { bench } = stubWire({
    card: 'anny', outputs: { default: 'image' }, figure: { identityModel: 'anny' },
    imageInputs: { body_image: 'data/input/person.png' },
  })
  const user = userEvent.setup()
  mountTab(bench)
  await user.click(tileButton())
  expect(await screen.findByText('Prompt', {}, { timeout: 4000 })).toBeTruthy()
  await waitFor(() => {
    expect(document.querySelector('[data-testid="stage-preview-input-image"]')).not.toBeNull()
  }, { timeout: 4000 })
  expect(document.querySelector('[data-viewport^="poser-figure"]')).toBeNull()
  expect(document.querySelector('[data-viewport="glb-stage"]')).toBeNull()
})

test('(l) a whitespace photo is emptiness — the attached GLB keeps the pre-run face (the fall, not a phantom)', async () => {
  const { bench, glbDoor } = stubWire({
    card: 'anny', outputs: { default: 'image' }, figure: { identityModel: 'anny' },
    meshInputs: { body_glb: 'data/input/donor.glb' },
    imageInputs: { body_image: '   ' },
  })
  const user = userEvent.setup()
  mountTab(bench)
  await user.click(tileButton())
  expect(await screen.findByText('Prompt', {}, { timeout: 4000 })).toBeTruthy()
  // no image arm mounts — whitespace IS emptiness at the preview
  // hop exactly as at compose
  await waitFor(() => {
    expect(document.querySelector('[data-testid="stage-preview-input-image"]')).toBeNull()
    expect(document.querySelector('[data-viewport="glb-stage"]')).not.toBeNull()
  }, { timeout: 4000 })
  await waitFor(() => {
    expect(glbDoor.some((u) => u.includes('/v1/assets/inputs/donor.glb'))).toBe(true)
  }, { timeout: 4000 })
})

/** THE NO-FIGURE SEAM: the attached arm owns the pre-run stage even
 *  when the card declares NO figure (a mesh-holding card whose
 *  declared kind is image). The figure override alone would leave
 *  this card on the image tombstone — the attached GLB is its own
 *  pre-run seat, judged on its own seam. */
test('an attached GLB owns the pre-run face even with no figure claim (the image tombstone never mounts)', async () => {
  const { bench, glbDoor } = stubWire({
    card: 'img-to-3d', outputs: { default: 'image' },
    meshInputs: { donor_glb: 'data/input/scan.glb' },
  })
  const user = userEvent.setup()
  mountTab(bench)
  await user.click(tileButton())
  expect(await screen.findByText('Prompt', {}, { timeout: 4000 })).toBeTruthy()
  await waitFor(() => {
    // the mesh stage + the GLB viewport own the seat (the label is
    // the mount pin — the canvas-vs-failure face is headless noise)
    expect(document.querySelector('[data-testid="stage-preview-mesh"]')).not.toBeNull()
    expect(document.querySelector('[data-viewport="glb-stage"]')).not.toBeNull()
  }, { timeout: 4000 })
  // the bytes walk too — the door pin judges the attached arm itself,
  // not just the override (an empty-hint GlbStage would mount the
  // viewport label while never loading the user's file)
  await waitFor(() => {
    expect(glbDoor.some((u) => u.includes('/v1/assets/inputs/scan.glb'))).toBe(true)
  }, { timeout: 4000 })
  expect(screen.queryByText('No render yet — run lands the image here')).toBeNull()
  expect(document.querySelector('[data-viewport^="poser-figure"]')).toBeNull()
})

/** THE TAKEOVER WITH AN ATTACHED GLB: run outputs still win — the
 *  attached preview retires the moment an artifact lands, exactly
 *  like the figure (the attached GLB is a PRE-RUN seat, never a
 *  competitor with a real output). */
test('with artifacts the declared kind takes the stage over the attached GLB', async () => {
  const { bench } = stubWire({
    card: 'anny', outputs: { default: 'image' }, figure: { identityModel: 'anny' },
    meshInputs: { body_glb: 'data/input/donor.glb' },
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
  expect(document.querySelector('[data-testid="stage-preview-glb"]')).toBeNull()
  expect(document.querySelector('[data-viewport^="poser-figure"]')).toBeNull()
})
