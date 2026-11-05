// @vitest-environment happy-dom
// use-form-spec-refresh.spec.tsx — THE REFRESH SEAM'S OWN WALL (the
// lora upload leaf, 2026-11-15): stale-while-revalidate semantics as
// three observable laws — the standing spec NEVER blanks during a
// refresh, a refused refresh leaves it standing with the error
// voiced, and a superseded flight (a later refresh claimed the
// token) never lands its stale doc. The fetch double is a FAKE door
// with per-flight latency control, never a module mock.
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test } from 'vitest'
import { useFormSpec } from '../src/use-form-spec.ts'
import type { FormSpecDoc } from '../src/spec.ts'

afterEach(cleanup)

/** A valid envelope (assertFormSpecDoc judges every fetch's doc) —
 *  `mark` rides in form, the only field the probe reads. */
const docOf = (model: string, mark: string): FormSpecDoc =>
  ({ form: mark, model, schema: { uid: 0, refs: { 0: { type: 'object', dict: {} } } } } as unknown as FormSpecDoc)

/** A controllable door: each queued handler answers one flight; a
 *  parked handler (un-released promise) parks its flight forever. */
function door(): {
  queue: Array<(url: string) => Promise<Response>>
  seen: string[]
  restore: () => void
} {
  const seen: string[] = []
  const queue: Array<(url: string) => Promise<Response>> = []
  const real = globalThis.fetch
  globalThis.fetch = ((input: unknown) => {
    const url = String(input)
    seen.push(url)
    const next = queue.shift()
    if (next === undefined) return Promise.reject(new Error('no handler queued for ' + url))
    return next(url)
  }) as typeof fetch
  return { queue, seen, restore: () => { globalThis.fetch = real } }
}

const specNow = (): string => document.querySelector('[data-testid="probe"]')!.getAttribute('data-spec')!
const errorNow = (): string => document.querySelector('[data-testid="probe"]')!.getAttribute('data-error')!

function Probe({ model, refreshRef }: { model: string, refreshRef?: { current: (() => Promise<void>) | null } }) {
  const { spec, error, refresh } = useFormSpec(model)
  if (refreshRef !== undefined) refreshRef.current = refresh
  return h('div', {
    'data-testid': 'probe',
    'data-spec': spec === null ? 'null' : String(spec.form),
    'data-error': error ?? '',
  })
}

test('REFRESH NEVER BLANKS: the standing spec serves through the in-flight refresh, then swaps', async () => {
  const d = door()
  try {
    d.queue.push(async () => new Response(JSON.stringify(docOf('h3', 'first')), { status: 200 }))
    const refreshRef = { current: null as (() => Promise<void>) | null }
    render(h(Probe, { model: 'h3', refreshRef }))
    await waitFor(() => { expect(specNow()).toBe('first') })
    // the refresh flight parks unresolved — the whole assertion
    // window runs with the refresh IN FLIGHT (the call is never
    // awaited: awaiting a parked door would deadlock the test)
    let release: (() => void) | null = null
    d.queue.push(() => new Promise((resolve) => {
      release = () => { resolve(new Response(JSON.stringify(docOf('h3', 'second')), { status: 200 })) }
    }))
    const flight = refreshRef.current?.() ?? Promise.resolve()
    expect(specNow()).toBe('first') // never null mid-flight
    release?.()
    await flight
    await waitFor(() => { expect(specNow()).toBe('second') })
  } finally { d.restore() }
})

test('A REFUSED REFRESH leaves the standing spec and voices the error', async () => {
  const d = door()
  try {
    d.queue.push(async () => new Response(JSON.stringify(docOf('h3', 'standing')), { status: 200 }))
    const refreshRef = { current: null as (() => Promise<void>) | null }
    render(h(Probe, { model: 'h3', refreshRef }))
    await waitFor(() => { expect(specNow()).toBe('standing') })
    d.queue.push(async () => new Response('nope', { status: 503 }))
    await refreshRef.current?.()
    await waitFor(() => { expect(errorNow()).not.toBe('') })
    expect(specNow()).toBe('standing')
  } finally { d.restore() }
})

test('A SUPERSEDED FLIGHT never lands: the later refresh owns the spec', async () => {
  const d = door()
  try {
    d.queue.push(async () => new Response(JSON.stringify(docOf('h3', 'mount')), { status: 200 }))
    const refreshRef = { current: null as (() => Promise<void>) | null }
    render(h(Probe, { model: 'h3', refreshRef }))
    await waitFor(() => { expect(specNow()).toBe('mount') })
    // flight A parks; flight B answers fast; A answers LAST with a
    // stale doc — B's spec must survive A's late landing attempt
    let releaseA: (() => void) | null = null
    d.queue.push(() => new Promise((resolve) => {
      releaseA = () => { resolve(new Response(JSON.stringify(docOf('h3', 'stale-A')), { status: 200 })) }
    }))
    d.queue.push(async () => new Response(JSON.stringify(docOf('h3', 'fresh-B')), { status: 200 }))
    const flightA = refreshRef.current?.() ?? Promise.resolve() // A parks
    await refreshRef.current?.() // B lands fresh-B
    await waitFor(() => { expect(specNow()).toBe('fresh-B') })
    releaseA?.()
    // act flushes A's late .then AND React's commit — without it the
    // assertion races the renderer and passes before a stale
    // setSpec ever paints (the flake-green this arm once carried)
    await act(async () => { await flightA })
    expect(specNow()).toBe('fresh-B')
  } finally { d.restore() }
})

test('the mount flight still blanks on id change (refresh never widened the arrival law)', async () => {
  const d = door()
  try {
    d.queue.push(async () => new Response(JSON.stringify(docOf('h3', 'h3doc')), { status: 200 }))
    d.queue.push(async () => new Response(JSON.stringify(docOf('qwen', 'qwendoc')), { status: 200 }))
    const { rerender } = render(h(Probe, { model: 'h3' }))
    await waitFor(() => { expect(specNow()).toBe('h3doc') })
    rerender(h(Probe, { model: 'qwen' }))
    // the re-key's own law: null until the new family's doc lands
    expect(specNow()).toBe('null')
    await waitFor(() => { expect(specNow()).toBe('qwendoc') })
  } finally { d.restore() }
})
