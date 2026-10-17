// @vitest-environment happy-dom
/**
 * motion studio III — gate tails (useMotionMedia / useMotionStage /
 * useMotionUndoStack / useTimelineAuthoring dark arms).
 *
 * Each row drives one uncovered record from the full-gate log through the
 * real editor (mountEditor, no act): fetch-gate races for the cancelled
 * arms, thrown non-Errors for the `String(e)` arms, a headless-built
 * 77-joint GLB for the valid-character + convert-success arms, and DOM
 * gates (service without a catalog slot, wired upstream without a GLB)
 * for the resolution arms.
 *
 * MOUNT PATTERN: NO act() anywhere — render outside act, vi.waitFor /
 * waitForText polls, resetStudio() in afterEach.
 */
import { LOADED_WAIT } from '../../../../tests/helpers/loaded-wait.ts';
import { fireEvent, getByTestId, getByText, queryByText } from '@testing-library/dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import * as THREE from '@melite/three-client/client'
import { GLTFExporter } from '@melite/three-client/client'
import { useToastStore } from '@melite/card-base/client'
import { waitForText } from './harness.tsx'
import { MOTION_URL } from './fixtures.ts'
import { resetStudio, mounted, stubLoads, mountEditor } from './helpers.ts'

afterEach(() => resetStudio())

const MIME = 'application/tech-noir-asset'

/** Buttons by visible label — the edit-mode hint bar repeats some labels
 *  (Repose, Stamp) as prose, so getByText is ambiguous; buttons are unique. */
function railButton(label: string): HTMLButtonElement {
  const hit = [...document.body.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(label),
  )
  if (!hit) throw new Error(`no button labelled ${label}`)
  return hit as HTMLButtonElement
}

function assetTransfer(url: string) {
  return {
    types: [MIME],
    getData: () => JSON.stringify({ url }),
    files: [],
  }
}

/** Re-stub fetch after stubLoads: handler answers or defers to the stub. */
function reStubFetch(
  handler: (u: string, init: RequestInit | undefined, orig: typeof fetch) => Promise<Response | null>,
): void {
  const orig = globalThis.fetch as typeof fetch
  vi.stubGlobal('fetch', async (input: unknown, init?: RequestInit) => {
    const u = typeof input === 'string' ? input : (input as Request).url ?? String(input)
    const r = await handler(u, init, orig)
    if (r) return r
    return orig(input as RequestInfo, init)
  })
}

function heldGate(): { gate: Promise<Response>; release: (r: Response) => void } {
  let release!: (r: Response) => void
  const gate = new Promise<Response>((res) => { release = res })
  return { gate, release }
}

function unmountAll(): void {
  while (mounted.length > 0) mounted.pop()!.unmount()
  document.body.innerHTML = ''
}

/** A REAL SOMAX-rigged GLB (77 bones + one skinned box), built headless
 *  with three's own exporter — loadGlbSkin accepts it, no mocks needed. */
async function somaxGlbBytes(): Promise<ArrayBuffer> {
  const bones: THREE.Bone[] = []
  const root = new THREE.Group()
  let parent: THREE.Object3D = root
  for (let j = 0; j < 77; j++) {
    const b = new THREE.Bone()
    b.name = `j${j}`
    b.position.set(j * 0.01, 0.9, 0)
    parent.add(b); parent = b; bones.push(b)
  }
  const geo = new THREE.BoxGeometry(0.1, 0.2, 0.1)
  const count = geo.attributes.position.count
  const si = new Uint16Array(count * 4)
  const sw = new Float32Array(count * 4)
  for (let v = 0; v < count; v++) sw[v * 4] = 1
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4))
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4))
  const mesh = new THREE.SkinnedMesh(geo, new THREE.MeshStandardMaterial())
  mesh.add(bones[0]); mesh.bind(new THREE.Skeleton(bones))
  return (await new GLTFExporter().parseAsync(mesh, { binary: true })) as ArrayBuffer
}

// FIRST: the convert-fallback cancellation rows must run before any
// successful skin load in this file — loadSomaSkin caches success per
// session, so a fallback load can only be caught in flight while the
// cache is cold. The catch row releases a 404 (rejections clear the
// cache), keeping it cold for the then-row. The direct-fallback pair
// lives in motion-studio-gate-fallback.spec.tsx, whose isolated module
// registry gives it a second cold cache.
describe('media: convert-fallback cancellation (cold skin cache)', () => {
  test('a convert failure cancelled inside the fallback catch stays veilless', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, startStatus: 500 })
    const { gate, release } = heldGate()
    reStubFetch(async (u) => {
      if (u.includes('/v1/models/kimodo/provisions/skin_standard.npz')) return gate
      return null
    })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('SOMAX conversion failed'))
      if (!failed) throw new Error('no convert toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
    unmountAll()
    release(new Response('bad', { status: 404 }))
    await new Promise((r) => setTimeout(r, 800))
    const failed = useToastStore.getState().toasts.some((t) => t.message.includes('SOMAX conversion failed'))
    expect(failed).toBe(true)
    expect(document.body.innerHTML).toBe('')
  }, 120000)

  test('a convert failure cancelled at the mannequin fallback never skins', async () => {
    // cold cache here: the catch row above released a 404, and rejections
    // clear loadSomaSkin's session cache — so this fallback load really
    // flies, gets held, and only resolves after the unmount below.
    stubLoads({ bodies: { 'bare.glb': 'glb' }, startStatus: 500 })
    const { gate, release } = heldGate()
    reStubFetch(async (u) => {
      if (u.includes('/v1/models/kimodo/provisions/skin_standard.npz')) return gate
      return null
    })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('SOMAX conversion failed'))
      if (!failed) throw new Error('no convert toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
    unmountAll()
    const { skinResponse } = await import('./fixtures.ts')
    release(skinResponse())
    await new Promise((r) => setTimeout(r, 800))
    // the fallback `.then` saw cancelled and skipped setSkin (the failure
    // toast from before the unmount is the only evidence left).
    const msgs = useToastStore.getState().toasts.map((t) => t.message)
    expect(msgs.some((m) => m.includes('SOMAX conversion failed'))).toBe(true)
    expect(msgs.some((m) => m.includes('Failed to fetch SOMA skin'))).toBe(false)
  }, 30000)

})

describe('media: slot resolution + neutral skin', () => {
  // NOTE (dead-arm report): the neutral-skin `: "Failed to load skin"`
  // arms (useMotionMedia 144 / 203 / 213) need a NON-Error rejection, but
  // loadSomaSkin rides apiFetch, which wraps every non-AbortError into
  // Error — and DOMException (incl. AbortError) IS an Error subclass in
  // every JS environment (verified: `instanceof Error === true` under
  // happy-dom). No test-only fetch behavior can produce a non-Error here,
  // so those arms are reported dead, not driven by a row.
  test('a row without a declared input seat falls back to manual attach', async () => {
    stubLoads()
    mountEditor(
      { service: 'nope', inputSlots: [], params: { preview_glb: 'https://host/x.glb' } },
      { onWireSlot: vi.fn() },
    )
    await waitForText('No motion yet')
    // bodySlotIdx -1 (the `?? []` arm): no wire action on the slot square.
    expect(document.body.querySelector('[data-motion-body-wire]')).toBeNull()
  }, 30000)

  test('a wired upstream without a GLB waits on the mannequin', async () => {
    stubLoads()
    const up = {
      id: 'up1', title: 'Up One', kind: 'x', service: 's', params: {},
      inputs: [], inputIndices: [],
      result: { assetUrls: ['https://host/a.png'] },
    }
    mountEditor(
      { params: { preview_glb: null }, inputs: ['up1'] },
      { onWireSlot: vi.fn(), upstreams: [up] },
    )
    await waitForText('No motion yet')
    // artifacts missing (the `?? {}` arm) + no GLB anywhere (the `?? null`
    // arm): the slot badges the upstream and waits.
    await vi.waitFor(() => {
      if (!document.body.textContent?.includes('waiting for upstream')) throw new Error('no waiting metric yet')
    }, { timeout: 10000 })
    expect(document.body.textContent).toContain('Up One')
  }, 30000)

  test('a declared stage binding resolves its source id', async () => {
    stubLoads()
    const up = {
      id: 'up1', title: 'Up One', kind: 'x', service: 's', params: {},
      inputs: [], inputIndices: [],
      result: { artifacts: {}, assetUrls: ['https://host/a.png'] },
    }
    mountEditor(
      {
        inputSlots: ['preview_glb'],
        inputBindings: [{ slot: 'preview_glb', source: { stage: 'up1' } }],
        inputs: ['up1'],
        params: { preview_glb: null },
      },
      { onWireSlot: vi.fn(), upstreams: [up] },
    )
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      if (!document.body.textContent?.includes('waiting for upstream')) throw new Error('no waiting metric yet')
    }, { timeout: 10000 })
  }, 30000)

  test('an initial binding is not a wired upstream', async () => {
    stubLoads()
    mountEditor(
      {
        inputSlots: ['preview_glb'],
        inputBindings: [{ slot: 'preview_glb', source: { initial: true } }],
        params: { preview_glb: null },
      },
      { onWireSlot: vi.fn() },
    )
    await waitForText('No motion yet')
    expect(document.body.textContent).not.toContain('waiting for upstream')
  }, 30000)

  test('an omitted input-slot list still leaves manual body attachment available', async () => {
    stubLoads()
    mountEditor(
      { inputSlots: undefined, params: { preview_glb: 'https://host/manual.glb' } },
      { onWireSlot: vi.fn() },
    )
    await waitForText('No motion yet')
    expect(document.body.querySelector('[data-motion-body-wire]')).toBeNull()
  }, 30000)
})

describe('media: character import + convert', () => {
  test('a SOMAX-rigged body skins directly (loadGlbSkin success arm)', async () => {
    const glb = await somaxGlbBytes()
    stubLoads()
    reStubFetch(async (u) => {
      if (u.includes('valid-character.glb')) return new Response(glb.slice(0))
      return null
    })
    mountEditor({
      params: { preview_glb: 'https://host/valid-character.glb' },
      result: { artifacts: { motion_npz: MOTION_URL } },
    })
    await waitForText('30 fps · 4f')
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Pause (Space)"]')) throw new Error('not playing yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
    const fell = useToastStore.getState().toasts.filter((t) =>
      t.message.includes('Preview body not loaded') || t.message.includes('SOMAX conversion'))
    expect(fell).toEqual([])
  }, 60000)

  test('a valid body cancelled in flight never skins', async () => {
    const glb = await somaxGlbBytes()
    stubLoads()
    const seen: string[] = []
    const { gate, release } = heldGate()
    reStubFetch(async (u) => {
      if (u.includes('valid-character.glb')) { seen.push(u); return gate }
      return null
    })
    mountEditor({ params: { preview_glb: 'https://host/valid-character.glb' } })
    await vi.waitFor(() => {
      if (!seen.some((u) => u.includes('valid-character.glb'))) throw new Error('body fetch not started yet')
    }, { timeout: 10000 })
    unmountAll()
    release(new Response(glb.slice(0)))
    await new Promise((r) => setTimeout(r, 800))
    // the `.then` saw cancelled and skipped setSkin: no fallback toast, no veil.
    expect(useToastStore.getState().toasts).toEqual([])
    expect(document.body.innerHTML).toBe('')
  }, 30000)

  test('an unloadable body cancelled in flight stays silent', async () => {
    stubLoads({ bodies: { 'missing.glb': 404 } })
    const seen: string[] = []
    const { gate, release } = heldGate()
    reStubFetch(async (u) => {
      if (u.includes('missing.glb')) { seen.push(u); return gate }
      return null
    })
    mountEditor({ params: { preview_glb: 'https://host/missing.glb' } })
    await vi.waitFor(() => {
      if (!seen.some((u) => u.includes('missing.glb'))) throw new Error('body fetch not started yet')
    }, { timeout: 10000 })
    unmountAll()
    release(new Response('bad', { status: 404 }))
    await new Promise((r) => setTimeout(r, 800))
    // the `.catch` saw cancelled and returned before the fallback.
    expect(useToastStore.getState().toasts).toEqual([])
  }, 30000)

  test('a bare mesh converts through the queue to its rigged GLB', async () => {
    const glb = await somaxGlbBytes()
    stubLoads({ bodies: { 'bare.glb': 'glb' } })
    reStubFetch(async (u) => {
      if (u.includes('https://host/rigged.glb')) return new Response(glb.slice(0))
      return null
    })
    mountEditor({
      params: { preview_glb: 'https://host/bare.glb' },
      result: { artifacts: { motion_npz: MOTION_URL } },
    })
    await vi.waitFor(() => {
      const ok = useToastStore.getState().toasts.some((t) => t.message.includes('Body converted to SOMAX rig'))
      if (!ok) throw new Error('no convert success toast yet')
    }, { timeout: LOADED_WAIT() })
    await waitForText('30 fps · 4f')
  }, 60000)

  test('a convert cancelled at the rigged load never skins', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' } })
    const { gate, release } = heldGate()
    reStubFetch(async (u) => {
      if (u.includes('https://host/rigged.glb')) return gate
      return null
    })
    const glb = await somaxGlbBytes()
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await vi.waitFor(() => {
      if (!document.body.textContent?.includes('converting through the queue')) throw new Error('no notice yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
    unmountAll()
    release(new Response(glb.slice(0)))
    await new Promise((r) => setTimeout(r, 800))
    const ok = useToastStore.getState().toasts.some((t) => t.message.includes('Body converted to SOMAX rig'))
    expect(ok).toBe(false)
  }, 60000)

  test('a convert cancelled at the queue start stays silent', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' } })
    const seen: string[] = []
    const { gate, release } = heldGate()
    reStubFetch(async (u) => {
      if (u.includes('/v1/flows/start')) { seen.push(u); return gate }
      return null
    })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await vi.waitFor(() => {
      if (!document.body.textContent?.includes('converting through the queue')) throw new Error('no notice yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
    await vi.waitFor(() => {
      if (!seen.some((u) => u.includes('/v1/flows/start'))) throw new Error('start not hit yet')
    }, { timeout: 10000 })
    unmountAll()
    release(new Response('bad', { status: 500 }))
    await new Promise((r) => setTimeout(r, 800))
    const failed = useToastStore.getState().toasts.some((t) => t.message.includes('SOMAX conversion failed'))
    expect(failed).toBe(false)
  }, 60000)

  test('a convert that throws off-Error reports the raw value', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' } })
    reStubFetch(async (u) => {
      if (u.includes('/v1/flows/start')) throw 'queue-string-blowup'
      return null
    })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await vi.waitFor(() => {
      const hit = useToastStore.getState().toasts.some((t) => t.message.includes('queue-string-blowup'))
      if (!hit) throw new Error('no raw convert toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
  }, 30000)

  test('a body that throws off-Error falls back with the default message', async () => {
    stubLoads()
    reStubFetch(async (u) => {
      if (u.includes('weird.glb')) throw 'body-string-blowup'
      return null
    })
    mountEditor({ params: { preview_glb: 'https://host/weird.glb' } })
    await vi.waitFor(() => {
      const fell = useToastStore.getState().toasts.some((t) =>
        t.message.includes('Preview body not loaded') && t.message.includes('Failed to load character GLB'))
      if (!fell) throw new Error('no default fallback toast yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
  }, 30000)

})

describe('media: motion load races', () => {
  test('a motion load cancelled at the await never lands', async () => {
    stubLoads()
    const seen: string[] = []
    const { gate, release } = heldGate()
    reStubFetch(async (u) => {
      if (u.includes(MOTION_URL)) { seen.push(u); return gate }
      return null
    })
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await vi.waitFor(() => {
      if (!seen.some((u) => u.includes(MOTION_URL))) throw new Error('motion fetch not started yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
    unmountAll()
    const { motionResponse } = await import('./fixtures.ts')
    release(await motionResponse(4, 30))
    await new Promise((r) => setTimeout(r, 800))
    // the post-await guard saw cancelled (and the finally skipped
    // setLoading): nothing landed, nothing toasted.
    expect(document.body.innerHTML).toBe('')
    expect(useToastStore.getState().toasts).toEqual([])
  }, 30000)

  test('a precompute cancelled mid-chunks never lands', async () => {
    stubLoads({ motionT: 600 })
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    // the seed (npz + frame-0 verts) commits long before the 60 chunk
    // yields finish — unmount in that window.
    await waitForText('30 fps · 600f')
    unmountAll()
    await new Promise((r) => setTimeout(r, 1000))
    expect(document.body.innerHTML).toBe('')
  }, 60000)

  test('a motion fetch that throws off-Error veils the default', async () => {
    stubLoads()
    reStubFetch(async (u) => {
      if (u.includes(MOTION_URL)) throw 'npz-string-blowup'
      return null
    })
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('Failed to load motion')
  }, 30000)

  test('a motion load cancelled inside its catch stays veilless', async () => {
    stubLoads()
    const seen: string[] = []
    const { gate, release } = heldGate()
    reStubFetch(async (u) => {
      if (u.includes(MOTION_URL)) { seen.push(u); return gate }
      return null
    })
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await vi.waitFor(() => {
      if (!seen.some((u) => u.includes(MOTION_URL))) throw new Error('motion fetch not started yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
    unmountAll()
    release(new Response('bad', { status: 500 }))
    await new Promise((r) => setTimeout(r, 800))
    expect(document.body.innerHTML).toBe('')
  }, 30000)
})

describe('stage + undo + authoring tails', () => {
  /** Enter edit on the mannequin, then swap the body with the convert
   *  drafts gated: skin nulls (so effectiveNpz nulls — the motion never
   *  loads, motionStatus 500) while editMode + editableJoints stay live. */
  async function editDuringGatedSwap(): Promise<{
    release: (r: Response) => void
    onSave: ReturnType<typeof mountEditor>['onSave']
  }> {
    stubLoads({ motionStatus: 500, bodies: { 'bare.glb': 'glb' } })
    const orig = globalThis.fetch as typeof fetch
    const seen: string[] = []
    const { gate, release } = heldGate()
    vi.stubGlobal('fetch', async (input: unknown, init?: RequestInit) => {
      const u = typeof input === 'string' ? input : (input as Request).url ?? String(input)
      seen.push(u)
      if (u.includes('/v1/flows/drafts')) return gate
      return orig(input as RequestInfo, init)
    })
    const { onSave } = mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('Failed to fetch motion asset: 500')
    fireEvent.click(railButton('Refine pose'))
    await vi.waitFor(() => {
      getByText(document.body, 'Done')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
    const frame = document.body.querySelector('[data-slot="viewport-frame"]') as HTMLElement
    fireEvent.drop(frame, { dataTransfer: assetTransfer('https://host/bare.glb') })
    await vi.waitFor(() => {
      if (!document.body.textContent?.includes('converting through the queue')) throw new Error('no notice yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
    await vi.waitFor(() => {
      if (!seen.some((u) => u.includes('/v1/flows/drafts'))) throw new Error('drafts not hit yet')
    }, { timeout: 10000 })
    return { release, onSave }
  }

  test('stamp with no effective motion refuses honestly', async () => {
    const { release } = await editDuringGatedSwap()
    fireEvent.click(railButton('Stamp'))
    await vi.waitFor(() => {
      const hit = useToastStore.getState().toasts.some((t) => t.message.includes('nothing to stamp'))
      if (!hit) throw new Error('no stamp guard toast yet')
    }, { timeout: 10000 })
    release(new Response(JSON.stringify({ draftId: 'd1' }), { headers: { 'content-type': 'application/json' } }))
  }, 60000)

  test('repose with no effective motion is a silent no-op', async () => {
    const { release, onSave } = await editDuringGatedSwap()
    fireEvent.click(railButton('Repose'))
    await new Promise((r) => setTimeout(r, 800))
    const reposed = useToastStore.getState().toasts.some((t) => t.message.includes('Reposed from edited pose'))
    expect(reposed).toBe(false)
    const chained = onSave.mock.calls.some(([p]) =>
      (p as Record<string, unknown>).prev_motion_artifact !== undefined)
    expect(chained).toBe(false)
    release(new Response(JSON.stringify({ draftId: 'd1' }), { headers: { 'content-type': 'application/json' } }))
  }, 60000)

  test('done without joints keeps nothing and exits edit', async () => {
    stubLoads()
    mountEditor()
    await waitForText('No motion yet')
    // THE ROOT FIX (the thrice-bitten flake), fully deterministic —
    // every step waits on an OBSERVED state, never a wall clock:
    //  1. Refine is disabled until effectiveNpz lands (React 19 never
    //     fires onClick on a disabled button — a press before the npz
    //     chain settles is a silent no-op and the Done wait starves).
    //  2. Repose is disabled until editableJoints exist, and DISABLES
    //     again when the undo restores the joints-null snapshot — that
    //     flip IS the observable the row composes (Done's null-kept arm).
    // Enabled ≠ armed: Refine's disabled reads effectiveNpz but
    // toggleEdit guards on currentJointsM (a LATER decode) — retry the
    // press until edit engages (a press before arm is a no-op), with a
    // load-generous window (full-gate workers starve timers).
    await vi.waitFor(() => {
      if (!document.body.textContent?.includes('Done')) {
        fireEvent.click(railButton('Refine pose'))
        throw new Error('edit not entered yet')
      }
    }, { timeout: LOADED_WAIT() * 2 })
    await vi.waitFor(() => {
      if (railButton('Repose').disabled) throw new Error('joints not landed yet — Repose still disabled')
    }, { timeout: LOADED_WAIT() * 2 })
    // THE KEYDOWN RETRY (coverage-load flake, 2026-09-24): under the
    // full-gate's v8 instrumentation the editor's key handler can
    // attach AFTER the Repose-enabled observation — a single
    // keyDown lands on nothing and the undo starves. Re-fire inside
    // the wait (same retry idiom as the Refine press above): once
    // the handler is attached one lands.
    await vi.waitFor(() => {
      fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true })
      if (!railButton('Repose').disabled) throw new Error('undo not landed yet — joints still live')
    }, { timeout: LOADED_WAIT() })
    fireEvent.click(railButton('Done'))
    await vi.waitFor(() => {
      getByText(document.body, 'Refine pose')
    }, { timeout: LOADED_WAIT() })
    expect(queryByText(document.body, 'Reset pose')).toBeNull()
  }, 120000)

  test('a repose whose save blows up toasts the failure', async () => {
    stubLoads()
    const { onSave } = mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Pause (Space)"]')) throw new Error('not playing yet')
    }, { timeout: LOADED_WAIT() * 2 / 3 })
    onSave.mockClear()
    onSave.mockImplementation((p?: unknown) => {
      if (p && typeof p === 'object' && 'prev_motion_artifact' in (p as Record<string, unknown>)) {
        throw new Error('save blew up')
      }
      return undefined
    })
    fireEvent.click(railButton('Refine pose'))
    await vi.waitFor(() => {
      railButton('Repose')
    }, { timeout: 10000 })
    fireEvent.click(railButton('Repose'))
    await vi.waitFor(() => {
      const hit = useToastStore.getState().toasts.some((t) => t.message.includes('Repose failed: save blew up'))
      if (!hit) throw new Error('no repose toast yet')
    }, { timeout: 10000 })
  }, 60000)

  test('typing the settled output size keeps the same rect', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(railButton('Export'))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-testid="export-out-w"]')) throw new Error('no size inputs yet')
    }, { timeout: 10000 })
    const readout = getByTestId(document.body, 'export-rect-readout')
    const before = readout.textContent
    // 768.4 rounds back to the settled 768 — handleOutSize returns prev.
    fireEvent.change(document.body.querySelector('[data-testid="export-out-w"]') as HTMLInputElement, {
      target: { value: '768.4' },
    })
    await new Promise((r) => setTimeout(r, 500))
    expect(getByTestId(document.body, 'export-rect-readout').textContent).toBe(before)
  }, 30000)

  test('the export rect observer refits and disconnects on close', async () => {
    const seen: { disc: boolean; cb: () => void }[] = []
    vi.stubGlobal('ResizeObserver', class {
      cb: () => void
      disc = false
      constructor(cb: () => void) {
        this.cb = cb
        seen.push(this as unknown as { disc: boolean; cb: () => void })
      }

      observe(): void {
        this.cb()
      }

      unobserve(): void {}

      disconnect(): void {
        this.disc = true
      }
    })
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(railButton('Export'))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-export-rect]')) throw new Error('no rect yet')
    }, { timeout: 10000 })
    expect(seen.length).toBeGreaterThan(0)
    // close the panel via the rail toggle → the effect cleanup disconnects.
    fireEvent.click(railButton('Export'))
    await vi.waitFor(() => {
      if (document.body.querySelector('[data-export-rect]')) throw new Error('rect still open')
    }, { timeout: 10000 })
    expect(seen.some((s) => s.disc)).toBe(true)
  }, 30000)

  test('the undo stack caps at eighty snapshots', async () => {
    stubLoads()
    mountEditor()
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-prompt-clip]')) throw new Error('no seeded clip yet')
    }, { timeout: 10000 })
    const add = railButton('Add prompt card')
    // yield between clicks so each pushUndo snapshots the flushed lane
    // (identical snapshots could never prove the cap dropped the seed).
    for (let i = 0; i < 81; i++) {
      fireEvent.click(add)
      await new Promise((r) => setTimeout(r, 0))
    }
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 82) {
        throw new Error('clips not carved yet')
      }
    }, { timeout: LOADED_WAIT() * 2 / 3 })
    // every carve pushed (the stack shifted past eighty, dropping the seed
    // snapshot) — eighty undos land on the 2-clip snapshot, which only the
    // capped stack can produce (an uncapped stack would land on 1).
    for (let i = 0; i < 80; i++) fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true })
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 2) {
        throw new Error('undo did not walk back yet')
      }
    }, { timeout: 10000 })
  }, 60000)

  test('moving one of two cards leaves the other untouched', async () => {
    stubLoads()
    mountEditor()
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-prompt-clip]')) throw new Error('no seeded clip yet')
    }, { timeout: 10000 })
    fireEvent.click(railButton('Add prompt card'))
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 2) throw new Error('no second clip yet')
    }, { timeout: 10000 })
    // the FIRST card is slot-locked by its neighbor (no-overlap rule),
    // so drag the TAIL card — it keeps its past-the-wall extend freedom.
    const tail = document.body.querySelectorAll('[data-prompt-clip]')[1] as HTMLElement
    const before = tail.style.left
    fireEvent.pointerDown(tail, { clientX: 60, button: 0 })
    fireEvent.pointerMove(window, { clientX: 90 })
    fireEvent.pointerMove(window, { clientX: 110 })
    fireEvent.pointerUp(window, { clientX: 110 })
    await vi.waitFor(() => {
      const after = (document.body.querySelectorAll('[data-prompt-clip]')[1] as HTMLElement).style.left
      if (after === before) throw new Error('left did not move yet')
    }, { timeout: LOADED_WAIT() })
    // both cards survive the move (the untouched one rode the `: p` arm).
    expect(document.body.querySelectorAll('[data-prompt-clip]').length).toBe(2)
  }, 60000)
})
