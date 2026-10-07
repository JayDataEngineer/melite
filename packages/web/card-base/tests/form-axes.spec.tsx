// @vitest-environment happy-dom
// form-axes.spec.tsx — THE MODEL RAIL (form.tsx part 3):
// PackPrompt's install gesture, ModelAxes' no-fallback rail
// (refused renders AS ITSELF, boarded-but-absent prompts), the
// recipe stamp pills, and useFormSpec's fetch-once dance.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { composeCandidateDoc, composeValidate } from '../src/spec.ts'
import type { FormSpecDoc, SpecValues, VariantRow } from '../src/spec.ts'

import { ModelAxes, PackPrompt, useFormSpec } from '../src/form.tsx'

afterEach(cleanup)

const V = (id: string, group: string, extra: Partial<VariantRow> = {}): VariantRow => ({
  id,
  label: id,
  group,
  defaults: {},
  route: 'krea-2',
  // A Quant row's coordinate is its quant — the STAMPER IS TOTAL
  // (2026-09-29): an illegal row without it refuses at the stamp,
  // so every fixture Quant row declares its coordinate explicitly.
  ...(group === 'Quant' ? { quant: extra.quant ?? id } : {}),
  ...extra,
}) as VariantRow

/** The matrix doc (mirrors spec-matrix.spec's served shape). */
function doc(): FormSpecDoc {
  return {
    form: 'txt2img',
    model: 'krea-2',
    model_defaults: { steps: 30 },
    schema: {
      uid: 0,
      refs: {
        0: { type: 'object', dict: { prompt: 1, steps: 2 } },
        1: { type: 'string', meta: { description: 'Prompt', default: 'a cat' } },
        2: { type: 'number', meta: { default: 20, step: 1 } },
      },
    },
    features: {
      variant_groups: { Variant: { label: 'Variant' }, Quant: { label: 'Quant' } },
    },
    variants: [
      V('r-hd', 'Variant', { label: 'HD', hint: 'crisp', defaults: { model: 'krea-2-hd', steps: 40 } }),
      V('r-sd', 'Variant', { label: 'SD' }),
      V('q-fp8', 'Quant', { label: 'FP8' }),
      V('recipe-x', 'Recipe', { label: 'X', hint: 'the macro', defaults: { steps: 50 } }),
      V('recipe-mods', 'Recipe', { label: 'Mods', defaults: { loras: [{ id: 'detail' }] } }),
    ],
    packs: [{ id: 'upscale', present: true }],
  } as unknown as FormSpecDoc
}

function axes(props: Partial<Parameters<typeof ModelAxes>[0]> = {}) {
  const onSet = vi.fn()
  // onPick is REQUIRED by construction (no per-key fallback): the
  // harness seats a recorder unless the test brings its own
  const onPick = vi.fn()
  const rendered = render(h(ModelAxes, { spec: doc(), value: {}, onSet, onPick, ...props }))
  return { onSet, onPick, ...rendered }
}

test('PACKS: nothing missing, or no arm — never a prompt (nothing to act on)', () => {
  const full = render(h(PackPrompt, { spec: doc(), onInstallPack: () => Promise.resolve(true) }))
  expect(full.container.innerHTML).toBe('')
  full.unmount()
  const armless = render(h(PackPrompt, {
    spec: { ...doc(), packs: [{ id: 'upscale', present: false }] } as FormSpecDoc,
  }))
  expect(armless.container.innerHTML).toBe('')
  armless.unmount()
  const packless = render(h(PackPrompt, {
    spec: { ...doc(), packs: undefined } as unknown as FormSpecDoc,
    onInstallPack: () => Promise.resolve(true),
  }))
  expect(packless.container.innerHTML).toBe('')
})

test('PACKS: the missing pack names itself; the gesture queues, refuses, or faults LOUD', async () => {
  const spec = { ...doc(), packs: [{ id: 'upscale', present: false }] } as FormSpecDoc
  const ok = render(h(PackPrompt, { spec, onInstallPack: () => Promise.resolve(true) }))
  expect(screen.getByText(/upscale is required/)).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Install upscale' }))
  await screen.findByText(/Install queued/)
  ok.unmount()
  const no = render(h(PackPrompt, { spec, onInstallPack: () => Promise.resolve(false) }))
  fireEvent.click(screen.getByRole('button', { name: 'Install upscale' }))
  await screen.findByText(/Install request failed/)
  no.unmount()
  const bad = render(h(PackPrompt, { spec, onInstallPack: () => Promise.reject(new Error('down')) }))
  fireEvent.click(screen.getByRole('button', { name: 'Install upscale' }))
  await screen.findByText(/Install request failed/)
  bad.unmount()
})

test('AXES: no matrix, no rail (never an empty Model block)', () => {
  const { container } = axes({ spec: { form: 'x', schema: { uid: 0, refs: {} } } as unknown as FormSpecDoc })
  expect(container.innerHTML).toBe('')
})

test('MODEL: the zone names itself ONCE (never the head + the picker key saying the same word)', () => {
  // the double-Model catch: the section head carries "Model" and the
  // family picker kept its own visible "Model" key above the select —
  // the same word twice. The head stays (the zone-names-itself
  // symmetry); the picker rides aria-label only.
  const { container } = axes({})
  const section = container.querySelector('[data-model-axes]')
  expect(section).not.toBeNull()
  const hits = Array.from(section!.querySelectorAll('h4, span')) // the package lib is DOM without DOM.Iterable (src never spreads collections) — Array.from is the identical read
    .map((n) => n.textContent?.trim())
    .filter((t) => t === 'Model')
  expect(hits).toEqual(['Model'])
  expect(screen.getByLabelText('Model')).not.toBeNull()
})

test('MODEL: the served models pick; the switch reseeds every axis (the stale-variant cure)', () => {
  const spec = {
    ...doc(),
    families: [{ id: 'krea-2', present: true }, { id: 'anima-x', present: true }],
  } as unknown as FormSpecDoc
  const { onSet, onPick } = axes({ spec })
  const select = screen.getByLabelText('Model') as HTMLSelectElement
  expect(select.value).toBe('krea-2')
  fireEvent.change(select, { target: { value: 'anima-x' } })
  // THE ATOMIC PICK LAW (2026-09-29): a model switch is ONE multi-key
  // write — the re-point AND the axis re-seeds ride onPick together,
  // never per-key onSet (the half-switch construction fault)
  expect(onPick).toHaveBeenCalledTimes(1)
  const patch = onPick.mock.calls[0]![0] as Record<string, unknown>
  expect(patch['model'], 'the re-point rides the atomic frame').toBe('anima-x')
  expect(onSet, 'a switch NEVER rides the per-key path').not.toHaveBeenCalled()
})

test('MODEL FACE: a family row with a DECL label paints the version (the operator\'s sfx report — never titleCaseId when the face serves)', () => {
  const spec = {
    ...doc(),
    families: [{ id: 'krea-2', present: true, label: 'Krea 2 Turbo v9' }],
  } as unknown as FormSpecDoc
  axes({ spec })
  const select = screen.getByLabelText('Model') as HTMLSelectElement
  const opt = Array.from(select.options).find((o) => o.value === 'krea-2')
  expect(opt?.textContent).toBe('Krea 2 Turbo v9')
})

test('MODEL FACE: an EMPTY label degrades to the id face (never a blank option)', () => {
  const spec = {
    ...doc(),
    families: [{ id: 'krea-2', present: true, label: '' }],
  } as unknown as FormSpecDoc
  axes({ spec })
  const select = screen.getByLabelText('Model') as HTMLSelectElement
  const opt = Array.from(select.options).find((o) => o.value === 'krea-2')
  expect(opt?.textContent).toBe('Krea 2')
})

test('MODEL: a held stranger renders AS ITSELF, refused (never a neighbor painted over it)', () => {
  axes({ value: { model: 'anima' } })
  const select = screen.getByLabelText('Model') as HTMLSelectElement
  expect(select.value).toBe('anima')
  expect(select.getAttribute('data-refused')).toBe('model')
  expect(screen.getByText('Anima — not an offered model of this card')).not.toBeNull()
})

test('MODEL: boarded-but-absent families prompt (offered is offered — absence prompts, never blocks)', async () => {
  const spec = {
    ...doc(),
    families: [
      { id: 'krea-2', present: true },
      { id: 'ghost', present: false },
      { id: 'sibling', present: true },
    ],
  } as unknown as FormSpecDoc
  const { rerender } = axes({ spec, value: { model: 'ghost' }, onDownloadModel: () => Promise.resolve(true) })
  expect(screen.getByText('Ghost — not downloaded on this machine')).not.toBeNull()
  expect(screen.getByText('Sibling')).not.toBeNull()
  expect(screen.getByText(/Ghost is offered by this card/)).not.toBeNull()
  // THE LABEL-WRAP LAW: the prompt rides INSIDE the model label, so the
  // button's accessible name is the whole label — the prompt's own
  // button is reached through its seat, its face read as text.
  const dlBtn = (): HTMLButtonElement => {
    const seat = document.querySelector('[data-download-prompt]')
    if (seat === null) throw new Error('no download prompt')
    return seat.querySelector('button') as HTMLButtonElement
  }
  expect(dlBtn().textContent).toBe('Download Ghost')
  fireEvent.click(dlBtn())
  await screen.findByText(/Download queued/)
  rerender(h(ModelAxes, { spec, value: { model: 'ghost' }, onSet: () => {}, onPick: () => {} }))
  expect(screen.queryByText(/Ghost is offered by this card/)).toBeNull()
})

test('MODEL: the download fault + a held present family (prompt only for the absent)', async () => {
  const spec = {
    ...doc(),
    families: [{ id: 'krea-2', present: true }, { id: 'ghost', present: false }],
  } as unknown as FormSpecDoc
  const bad = axes({ spec, value: { model: 'ghost' }, onDownloadModel: () => Promise.reject(new Error('down')) })
  fireEvent.click(document.querySelector('[data-download-prompt] button') as HTMLButtonElement)
  await screen.findByText(/Download request failed/)
  bad.unmount()
  const held = axes({ spec, value: { model: 'krea-2' }, onDownloadModel: () => Promise.resolve(true) })
  expect(held.container.querySelector('[data-download-prompt]')).toBeNull()
  held.unmount()
})

test('MODEL: the gesture resets when the held model moves (never a stale queued face)', () => {
  let release!: (v: boolean) => void
  const gate = new Promise<boolean>((resolve) => { release = resolve })
  const spec = {
    ...doc(),
    families: [{ id: 'ghost', present: false }],
  } as unknown as FormSpecDoc
  const { rerender } = axes({ spec, value: { model: 'ghost' }, onDownloadModel: () => gate })
  fireEvent.click(document.querySelector('[data-download-prompt] button') as HTMLButtonElement)
  expect(screen.getByText('Requesting…')).not.toBeNull()
  rerender(h(ModelAxes, { spec, value: { model: 'krea-2' }, onSet: () => {}, onPick: () => {}, onDownloadModel: () => gate }))
  expect(screen.queryByText('Requesting…')).toBeNull()
  release(true)
})

test('MODEL: a refused download marks failed (false is a verdict, never a hang)', async () => {
  const spec = {
    ...doc(),
    families: [{ id: 'ghost', present: false }],
  } as unknown as FormSpecDoc
  axes({ spec, value: { model: 'ghost' }, onDownloadModel: () => Promise.resolve(false) })
  fireEvent.click(document.querySelector('[data-download-prompt] button') as HTMLButtonElement)
  await screen.findByText(/Download request failed/)
})

test('AXES: variant + quant selects compose down the chain; each pick rides ONE atomic frame', () => {
  const { onSet, onPick } = axes()
  const variant = screen.getByLabelText('Variant') as HTMLSelectElement
  expect(variant.value).toBe('r-hd')
  expect(screen.getByText('HD — crisp')).not.toBeNull()
  fireEvent.change(variant, { target: { value: 'r-sd' } })
  expect(onPick).toHaveBeenCalledTimes(1)
  const vpatch = onPick.mock.calls[0]![0] as Record<string, unknown>
  expect(vpatch['variant'], 'the variant key rides the atomic frame').toBe('r-sd')
  onPick.mockClear()
  const quant = screen.getByLabelText('Quant') as HTMLSelectElement
  fireEvent.change(quant, { target: { value: 'q-fp8' } })
  expect(onPick).toHaveBeenCalledTimes(1)
  const qpatch = onPick.mock.calls[0]![0] as Record<string, unknown>
  expect(qpatch['quant'], 'the quant key rides the atomic frame').toBe('q-fp8')
  expect(onSet, 'a pick NEVER rides the per-key path').not.toHaveBeenCalled()
})

test('PAIR: Model and Variant ride ONE row (never stacked on different rows)', () => {
  // the pass-along law, enforced: the auto-fit grid stacks the axes
  // in narrow panels — the dedicated pair seats Model + Variant side
  // by side at any width.
  const { container } = axes({})
  const pair = container.querySelector('[data-axes-pair="Model+Variant"]')
  expect(pair).not.toBeNull()
  const model = screen.getByLabelText('Model') as HTMLSelectElement
  const variant = screen.getByLabelText('Variant') as HTMLSelectElement
  expect(pair!.contains(model)).toBe(true)
  expect(pair!.contains(variant)).toBe(true)
})

test('PAIR: no Variant axis, no pair (the Model rides alone, exactly as before)', () => {
  const spec = {
    ...doc(),
    features: { variant_groups: { Quant: { label: 'Quant' } } },
    variants: (doc().variants ?? []).filter((v) => v.group !== 'Variant'),
  } as unknown as FormSpecDoc
  const { container } = axes({ spec })
  expect(container.querySelector('[data-axes-pair]')).toBeNull()
  expect(screen.getByLabelText('Model')).not.toBeNull()
  expect(screen.getByLabelText('Quant')).not.toBeNull()
})

test('CLEAN-ROW LAW: the axes zone owns exactly TWO rails — the rows below the pair align to its column lines (the sound-cards catch, operator 2026-09-23)', () => {
  // The DOM truth: the section's children are the title (spans),
  // the Model+Variant pair (spans), then the Quant axis and the
  // recipe select as RAIL CELLS. The CSS truth (the fit-law
  // precedent — read the module, pin the declarations): the zone
  // grid is EXACTLY two minmax(0,1fr) rails, never auto-fit —
  // auto-fit made the rail count follow the panel width so the
  // Quant/recipe row staggered off the pair's rails.
  const { container } = axes({})
  const section = container.querySelector('[data-model-axes]') as HTMLElement
  expect(section).not.toBeNull()
  const kids = Array.from(section.children)
  // the title and the pair each own a full row
  expect(kids[0]!.tagName).toBe('H4')
  const pair = container.querySelector('[data-axes-pair="Model+Variant"]')
  expect(kids[1]).toBe(pair)
  // the css law, pinned verbatim from the module (never auto-fit)
  const css = readFileSync('packages/web/card-base/src/card.module.css', 'utf8')
  const zone = css.match(/\.modelAxes \{[^}]*\}/)![0]
  expect(zone).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
  expect(zone).not.toContain('auto-fit')
  // the pair rides the same two rails (its halves ARE the rails)
  const pairCss = css.match(/\.axesPair \{[^}]*\}/)![0]
  expect(pairCss).toContain('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)')
  // the full-row children span: the title + the download hint
  expect(css).toMatch(/\.modelAxes \.specGroupTitle \{ grid-column: 1 \/ -1/)
  expect(css).toMatch(/\.modelAxes > \.specHint \{ grid-column: 1 \/ -1;? \}/)
})

test('AXES: a held stranger on an axis renders AS ITSELF, refused (the lane proof, held)', () => {
  axes({ value: { variant: 'nope' } })
  const variant = screen.getByLabelText('Variant') as HTMLSelectElement
  expect(variant.value).toBe('nope')
  expect(variant.getAttribute('data-refused')).toBe('Variant')
  expect(screen.getByText(/invalid variant/)).not.toBeNull()
})

test('AXES: an axis with no composing rows renders nothing (never an empty select)', () => {
  const spec = {
    ...doc(),
    features: { variant_groups: { Variant: { label: 'Variant' }, Ghost: {} } },
  } as unknown as FormSpecDoc
  axes({ spec })
  expect(screen.queryByLabelText('Ghost')).toBeNull()
  expect(screen.getByLabelText('Variant')).not.toBeNull()
})

test('PILLS: a knob-carrying recipe stamps on click; a mod-owned stamp rides too (Rule A)', () => {
  // RULE A (2026-09-18, the recipe law — amends the stroke-38 gate):
  // loras is mod-owned (the modifiers contract) and the loras-only
  // recipe STILL renders its pill — the bag IS the preset. The
  // Modifiers menu stays the bag's editor; the recipe is its preset.
  const spec = {
    ...doc(),
    features: {
      variant_groups: { Variant: { label: 'Variant' }, Quant: { label: 'Quant' } },
      modifiers: [{ param_key: 'loras' }],
    },
  } as unknown as FormSpecDoc
  const { onSet, onPick } = axes({ spec })
  // THE DROPDOWN (operator, 2026-09-18: "RECIPES AREN'T EVEN A
  // DROPDOWN"): one select beside the axes, never link-buttons.
  const select = screen.getByRole('combobox', { name: 'Recipe' })
  expect(select.getAttribute('data-recipe-select')).toBe('1')
  const ids = Array.from(select.querySelectorAll('option')).map((o) => o.getAttribute('value'))
  expect(ids).toContain('recipe-x')
  expect(ids).toContain('recipe-mods') // the mod-owned row rides (never hidden)
  expect((select.querySelector('option[value="recipe-x"]') as HTMLOptionElement).textContent).toContain('the macro')
  fireEvent.change(select, { target: { value: 'recipe-x' } })
  // THE ATOMIC PICK LAW (2026-09-29): the full stamp lands as ONE
  // onPick write — the per-key onSet face is retired
  expect(onPick).toHaveBeenCalledWith({ steps: 50 })
  expect(onSet).not.toHaveBeenCalled()
})

test('DROPDOWN: the selection DERIVES from the one truth — stamped grounds, hand-edited shows custom', () => {
  // The dropdown's value is NEVER a persisted key (the run door
  // refuses `recipe`): it derives from the held stamp. Picking a
  // row re-renders the select GROUNDED on that row; moving a
  // stamped knob by hand breaks the match — the placeholder
  // switches to 'custom' and the form never lies 'recipe active'.
  const spec = {
    ...doc(),
    features: { variant_groups: { Variant: { label: 'Variant' }, Quant: { label: 'Quant' } } },
  } as unknown as FormSpecDoc
  const state = { user: {} as SpecValues }
  const onSet = (name: string, v: unknown): void => { state.user = { ...state.user, [name]: v } }
  const onPick = (patch: Record<string, unknown>): void => { state.user = { ...state.user, ...patch } }
  const { rerender } = render(h(ModelAxes, { spec, value: state.user, onSet, onPick }))
  const select = () => screen.getByRole('combobox', { name: 'Recipe' }) as HTMLSelectElement
  expect(select().value).toBe('') // nothing held: placeholder
  fireEvent.change(select(), { target: { value: 'recipe-x' } })
  expect(state.user['steps']).toBe(50) // the stamp rode
  rerender(h(ModelAxes, { spec, value: state.user, onSet, onPick }))
  expect(select().value).toBe('recipe-x') // grounded on the held stamp
  state.user['steps'] = 49 // a hand edit breaks the match
  rerender(h(ModelAxes, { spec, value: state.user, onSet, onPick }))
  expect(select().value).toBe('') // custom — never lies
})

test('PILLS: no knob payload anywhere — no dropdown (never a dead control)', () => {
  const spec = { ...doc(), variants: [V('q-fp8', 'Quant', { label: 'FP8' })] } as unknown as FormSpecDoc
  const { container } = axes({ spec })
  expect(container.querySelector('[data-recipe-select]')).toBeNull()
})

function SpecHarness({ id }: { id: string | null | undefined }): ReturnType<typeof h> {
  const { spec, error } = useFormSpec(id as string)
  return h('div', null,
    h('span', { 'data-testid': 'form' }, spec === null ? 'none' : spec.form),
    error === null ? null : h('span', { 'data-testid': 'err' }, error),
  )
}

function formSpecFetch(docForm: string): typeof fetch {
  return (async (input: unknown) => {
    const url = String(input)
    if (url.startsWith('/v1/form-spec')) {
      return Response.json({
        form: docForm,
        schema: { uid: 1, refs: { 0: { type: 'object', dict: {} } } },
      })
    }
    throw new Error('unexpected fetch ' + url)
  }) as typeof fetch
}

test('FORM SPEC: the id fetches once; the doc lands; empty ids never knock', async () => {
  const realFetch = globalThis.fetch
  const seen: string[] = []
  globalThis.fetch = (async (input: unknown) => {
    seen.push(String(input))
    return formSpecFetch('txt2img')(input as string, {}) // the harness only issues string-URL fetches (seen asserts the /v1/form-spec url)
  }) as typeof fetch
  try {
    const r = render(h(SpecHarness, { id: 'krea-2' }))
    await screen.findByText('txt2img')
    expect(seen.length).toBe(1)
    expect(seen[0]).toContain('/v1/form-spec?model=krea-2')
    r.unmount()
    const quiet = render(h(SpecHarness, { id: null }))
    expect(screen.getByTestId('form').textContent).toBe('none')
    quiet.unmount()
    const empty = render(h(SpecHarness, { id: '' }))
    expect(screen.getByTestId('form').textContent).toBe('none')
    empty.unmount()
    expect(seen.length).toBe(1)
  } finally {
    globalThis.fetch = realFetch
  }
})

test('FORM SPEC: a refused door voices (the error rides, never a stuck none)', async () => {
  const realFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({ error: 'door down' }), {
    status: 500, headers: { 'content-type': 'application/json' },
  })) as typeof fetch
  try {
    render(h(SpecHarness, { id: 'krea-2' }))
    await screen.findByText('door down')
  } finally {
    globalThis.fetch = realFetch
  }
})

test('FORM SPEC: a wordless throw still voices (never a silent none)', async () => {
  const realFetch = globalThis.fetch
  globalThis.fetch = (async () => { throw 'boom' }) as typeof fetch
  try {
    render(h(SpecHarness, { id: 'krea-2' }))
    await screen.findByText('boom')
  } finally {
    globalThis.fetch = realFetch
  }
})

test('FORM SPEC: an id change re-knocks; unmount aborts the flight (never a late land)', async () => {
  const realFetch = globalThis.fetch
  let release!: (v: Response) => void
  const gate = new Promise<Response>((resolve) => { release = resolve })
  globalThis.fetch = ((_input: unknown, _init?: { signal?: AbortSignal }) => gate) as typeof fetch
  try {
    const r = render(h(SpecHarness, { id: 'a' }))
    r.rerender(h(SpecHarness, { id: 'b' }))
    r.unmount()
    release(Response.json({ form: 'late', schema: { uid: 1, refs: {} } }))
    await waitFor(() => { expect(screen.queryByText('late')).toBeNull() })
  } finally {
    globalThis.fetch = realFetch
  }
})

test('AXES: a held valid id grounds (never reseeded under a good coordinate)', () => {
  axes({ value: { variant: 'r-sd' } })
  expect((screen.getByLabelText('Variant') as HTMLSelectElement).value).toBe('r-sd')
})

test('AXES: a change to an unoffered id writes nothing (never a pick from thin air)', () => {
  const { onSet } = axes()
  fireEvent.change(screen.getByLabelText('Variant'), { target: { value: 'zzz' } })
  expect(onSet).not.toHaveBeenCalled()
})

test('MODEL: a held offered model rests without a mark (refusal is for strangers only)', () => {
  axes({ value: { model: 'krea-2' } })
  const select = screen.getByLabelText('Model') as HTMLSelectElement
  expect(select.value).toBe('krea-2')
  expect(select.hasAttribute('data-refused')).toBe(false)
})

test('AXES: no declaration — the rows own groups, the model rests empty (never a crash on a bare doc)', () => {
  const spec = {
    form: 'bare',
    variants: [
      V('r-hd', 'Variant', { label: 'HD' }),
      V('q-fp8', 'Quant', { label: 'FP8' }),
    ],
  } as unknown as FormSpecDoc
  axes({ spec, value: {} })
  expect((screen.getByLabelText('Model') as HTMLSelectElement).value).toBe('')
  expect((screen.getByLabelText('Variant') as HTMLSelectElement).value).toBe('r-hd')
})

// ── THE ATOMIC PICK (2026-10-12, the operator's live break: switch
//    krea-2 turbo→raw refused 'stated cfg 3.5 is OUTSIDE the route
//    envelope for variant "turbo"') ─────────────────────────────
// A pick is a MARRIAGE: the variant key, its defaults, and the
// below-axis re-seeds are ONE contract and must land as ONE write.
// The per-key loop sent raw's cfg to a bench still holding turbo —
// the door judged the half-state against the OLD envelope and
// refused (unlanded keys: steps, cfg; the studio lied). With an
// atomic seat seated, the pick fires ONE onPick carrying the whole
// marriage and NEVER splits per key.
test('a variant pick rides onPick ONCE with the whole marriage patch', () => {
  const onPick = vi.fn()
  const onSet = vi.fn()
  render(h(ModelAxes, { spec: doc(), value: { model: 'krea-2' }, onSet, onPick }))
  const variant = screen.getByLabelText('Variant') as HTMLSelectElement
  fireEvent.change(variant, { target: { value: 'r-hd' } })
  expect(onPick, 'ONE write, not one-per-key').toHaveBeenCalledTimes(1)
  // the marriage: variant key + the row's defaults (model re-point
  // EXCLUDED — stroke 21: the user plane speaks the card's vocab)
  // + the below-axis re-seed (Quant's first composing row)
  expect(onPick).toHaveBeenCalledWith({ steps: 40, variant: 'r-hd', quant: 'q-fp8' })
  expect(onSet, 'a pick NEVER rides the per-key edit path').not.toHaveBeenCalled()
})

test('a MODEL switch rides onPick ONCE with the whole re-seed patch', () => {
  const onPick = vi.fn()
  const onSet = vi.fn()
  const spec = {
    ...doc(),
    families: [{ id: 'krea-2', present: true }, { id: 'anima-x', present: true }],
  } as unknown as FormSpecDoc
  render(h(ModelAxes, { spec, value: { model: 'krea-2' }, onSet, onPick }))
  const model = screen.getByLabelText('Model') as HTMLSelectElement
  fireEvent.change(model, { target: { value: 'anima-x' } })
  expect(onPick, 'ONE write, not one-per-key').toHaveBeenCalledTimes(1)
  const patch = onPick.mock.calls[0]![0] as Record<string, unknown>
  expect(patch['model'], 'the re-point rides in the same frame').toBe('anima-x')
  expect(patch['variant'], 'the cleared axis rides in the same frame').toBe('')
  expect(onSet, 'a switch NEVER rides the per-key edit path').not.toHaveBeenCalled()
})

// THE CONSTRUCTION LAW ITSELF: there is no per-key fallback to test —
// onPick is REQUIRED on the type. A host that cannot write whole
// patches cannot offer picks; the compiler refuses it at the seat,
// never the compose door at run time. (The signature is the wall.)

// ── THE VOCABULARY LAW (2026-09-29, caught LIVE by the compose gate
//    in the CI seat: the browser pick stamped quant 'raw__int8' —
//    the composed catalog id — and the gate refused with the door's
//    own voice: 'unknown quant "raw__int8" ... (known: int8)'. The
//    write never left the studio. The axis stamp speaks the DOOR's
//    vocabulary — the cell quant — never the flat-catalog id.) ────
test('THE VOCABULARY LAW: a Quant pick stamps the cell quant, never the catalog id — the composed doc passes the door clean', () => {
  // krea-2's served shape: turbo + raw, each with ONE int8 cell; the
  // Quant rows carry COMPOSED catalog ids (owner-scoped) with the
  // door-facing quant field — exactly what the seat served
  const spec = {
    ...doc(),
    model: 'krea-2',
    variants: [
      { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: { model: 'krea-2', steps: 4, cfg: 1 }, route: 'krea-2',
        sampler_envelope: { steps: [4, 8], cfg: [1, 2] } },
      { id: 'raw', label: 'Raw', group: 'Variant', defaults: { model: 'krea-2-raw', steps: 52, cfg: 3.5 }, route: 'krea-2-raw',
        sampler_envelope: { steps: [30, 60], cfg: [2, 6] } },
      { id: 'int8', label: 'INT8 ConvRot', group: 'Quant', defaults: { model: 'krea-2' }, route: 'krea-2',
        quant: 'int8', owner: 'turbo' },
      { id: 'raw__int8', label: 'INT8 ConvRot', group: 'Quant', defaults: { model: 'krea-2-raw' }, route: 'krea-2-raw',
        quant: 'int8', owner: 'raw' },
    ],
  } as unknown as FormSpecDoc
  const onPick = vi.fn()
  const onSet = vi.fn()
  render(h(ModelAxes, {
    spec, onSet, onPick,
    value: { model: 'krea-2', variant: 'turbo', quant: 'int8', steps: 4, cfg: 1 },
  }))
  // THE GESTURE: the operator's exact switch, turbo → raw
  fireEvent.change(screen.getByLabelText('Variant'), { target: { value: 'raw' } })
  expect(onPick).toHaveBeenCalledTimes(1)
  const patch = onPick.mock.calls[0]![0] as Record<string, unknown>
  expect(patch['variant'], 'the variant id rides').toBe('raw')
  expect(patch['quant'], 'the CELL QUANT rides — never the catalog id raw__int8').toBe('int8')
  expect(patch['quant']).not.toBe('raw__int8')
  expect(patch['steps'], "the raw route's marriage rides").toBe(52)
  expect(patch['cfg']).toBe(3.5)
  expect(onSet).not.toHaveBeenCalled()
  // AND the composed doc is CLEAN under the door's own law — the
  // seat's refusal can never compose again
  const candidate = composeCandidateDoc(
    { model: 'krea-2', variant: 'turbo', quant: 'int8', steps: 4, cfg: 1 },
    {},
    patch,
  )
  expect(composeValidate(spec, candidate), 'the marriage doc passes the door clean').toEqual([])
})

test('THE VOCABULARY LAW\'S DISPLAY: a held door-stamp (quant int8) grounds to its composing row — never rendered refused', () => {
  const spec = {
    ...doc(),
    model: 'krea-2',
    variants: [
      { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: { model: 'krea-2' }, route: 'krea-2' },
      { id: 'raw', label: 'Raw', group: 'Variant', defaults: { model: 'krea-2-raw', steps: 52, cfg: 3.5 }, route: 'krea-2-raw' },
      { id: 'raw__int8', label: 'INT8 ConvRot', group: 'Quant', defaults: { model: 'krea-2-raw' }, route: 'krea-2-raw',
        quant: 'int8', owner: 'raw' },
    ],
  } as unknown as FormSpecDoc
  axes({ spec, value: { model: 'krea-2', variant: 'raw', quant: 'int8', steps: 52, cfg: 3.5 } })
  const quant = screen.getByLabelText('Quant') as HTMLSelectElement
  expect(quant.value, 'the door-stamp grounds to the composing row id').toBe('raw__int8')
  expect(quant.dataset['refused'], 'never rendered refused').toBeUndefined()
  const variant = screen.getByLabelText('Variant') as HTMLSelectElement
  expect(variant.value).toBe('raw')
})

// ── THE STAMPER IS TOTAL (2026-09-29, the second live break: the
//    old `?? row.id` fallback was the second vocabulary's doorway —
//    it legalized stamping the composite ADDRESS 'raw__int8' where
//    the door reads the cell VALUE 'int8'). A Quant row without its
//    coordinate is an ILLEGAL ROW: discovery refuses it at birth,
//    and the stamper REFUSES rather than construct what the door
//    would refuse a millisecond later. ──────────────────────────
test('THE STAMPER IS TOTAL: an illegal Quant row (no coordinate) THROWS at the stamp — no id fallback exists', async () => {
  const { axisStampOf } = await import('../src/spec.ts')
  const illegal = { id: 'raw__int8', label: 'INT8', group: 'Quant', defaults: {}, route: 'krea-2-raw', owner: 'raw' } as unknown as VariantRow
  expect(() => axisStampOf(illegal)).toThrow(/illegal Quant row "raw__int8".*no quant coordinate/)
  // the two legal spellings of the served shape BOTH stamp the value
  expect(axisStampOf({ id: 'int8', label: 'INT8', group: 'Quant', defaults: {}, route: 'krea-2', quant: 'int8', owner: 'turbo' } as unknown as VariantRow)).toBe('int8')
  expect(axisStampOf({ id: 'raw__int8', label: 'INT8', group: 'Quant', defaults: {}, route: 'krea-2-raw', quant: 'int8', owner: 'raw' } as unknown as VariantRow)).toBe('int8')
  // non-Quant rows keep the id — the address IS the value there
  expect(axisStampOf({ id: 'raw', label: 'Raw', group: 'Variant', defaults: {}, route: 'krea-2-raw' } as unknown as VariantRow)).toBe('raw')
})
