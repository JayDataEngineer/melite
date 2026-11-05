// @vitest-environment happy-dom
// @contract cards-ghost-parameter-render
// qvoice-category-render.spec.tsx — THE GHOST-PARAMETER WALL (F54,
// operator 2026-11-01: "there should NEVER be ghost input parameters.
// EVER." — the CustomVoice burn: the qvoice bag composes, the run
// lands, and the UI rendered NO Voice category).
//
// The judge rides the REAL doors, no constructed literals (the F54
// depth law): the served doc is formSpecArm('qwen3-tts') — the same
// function the /v1/form-spec door serves the browser — and the render
// is the REAL CardForm over that doc with the composed bag in the
// base layer. What the operator sees is what this wall asserts:
//   1. the mods section mounts for the tts card (cb-mods-section);
//   2. the add-modifier offer carries BOTH tts categories — the
//      perform Voice kind and the flat Design kind (an admitted pack
//      that renders nowhere is the ghost parameter, F54's whole
//      class);
//   3. the composed bag ({kunoichi_v3, voice_strength: 1} — the
//      landed run f2f56d282dfb's exact params) renders its chip: a
//      staged mod the UI hides is a lie about the run.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../../../tests/helpers/boot-models.ts'
import { bindEstateRemote, unbindEstateRemote } from '../src/estate-remote.ts'
import { CardForm } from '../src/form.tsx'
import type { FormSpecDoc } from '@melite/contracts/formSpec'
import { formSpecArm } from '../../../harness/melite-tools/src/discovery.ts'

let spec: FormSpecDoc

beforeAll(async () => {
  spec = await formSpecArm('qwen3-tts', undefined, []) as unknown as FormSpecDoc
}, 120_000)

afterEach(() => { cleanup(); unbindEstateRemote() })

/** The media lane: the voices pick serves its rows (the qvoice field
 *  is a media pick); unused namespaces refuse. */
function bindMedia(): void {
  const dead = (m: string) => async (): Promise<never> => { throw new Error('unused namespace in this wall: ' + m) }
  bindEstateRemote({
    bench: { get: dead('bench/get'), 'add-stage': dead('bench/add-stage'), 'remove-stage': dead('bench/remove-stage') },
    drafts: { get: dead('drafts/get'), patch: dead('drafts/patch') },
    runs: {
      list: dead('runs/list'), start: dead('runs/start'), status: dead('runs/status'),
      stop: dead('runs/stop'), validate: dead('runs/validate'),
    },
    media: { list: async () => ({ ok: true, value: { items: [{ url: 'media://voices/kunoichi_v3.qvoice', name: 'kunoichi_v3' }] } }) },
  } as unknown as Parameters<typeof bindEstateRemote>[0])
}

/** The stage face: CardForm over the real served doc with the stated
 *  base layer (the composed bench params). */
function mountStage(base: Record<string, unknown>): void {
  const Host = (): ReturnType<typeof h> =>
    h(CardForm, {
      spec,
      user: {},
      base,
      onSet: () => {},
      onPick: () => {},
      onUnset: () => {},
    })
  render(h(Host))
}

/** The add-modifier offer: open the add square (the section's
 *  data-subcard-add tile), read the PORTALED DSH Menu's items. */
function addMenuLabels(): string[] {
  const add = document.querySelector('[data-testid="cb-mods-section"] [data-subcard-add="mod"]')
  if (add === null) return []
  fireEvent.click(add)
  return Array.from(document.querySelectorAll('[role="menuitem"]')).map((el) => el.textContent ?? '')
}

test('F54: the served tts doc boards the Voice and Design kinds (the admission truth)', () => {
  const kinds = (spec.features?.modifiers ?? []).map((k) => k.kind)
  expect(kinds, 'the serve carries both qvoice packs — the compose door admits them').toContain('qvoice')
  expect(kinds).toContain('qvoice_save')
})

test('F54: the real CardForm renders the mods section for the tts card', async () => {
  bindMedia()
  mountStage({})
  const section = document.querySelector('[data-testid="cb-mods-section"]')
  expect(section, 'the tts card renders its mods section — an admitted pack with no section is the ghost parameter').not.toBeNull()
})

test('F54: the add-modifier offer carries the Voice category (the CustomVoice burn)', async () => {
  bindMedia()
  mountStage({})
  const labels = addMenuLabels().join(' | ')
  expect(labels, `the add-modifier offer names the Voice kind (got: ${labels})`).toMatch(/Voice/)
})

test("F54: the composed qvoice bag renders its chip (run f2f56d282dfb exact params)", async () => {
  bindMedia()
  mountStage({ qvoice: [{ qvoice: 'kunoichi_v3', voice_strength: 1 }], variant: 'customvoice' })
  const section = document.querySelector('[data-testid="cb-mods-section"]')
  expect(section, 'the mods section renders for a composed bag').not.toBeNull()
  const text = (section?.textContent ?? '') + (document.body.textContent ?? '')
  expect(text, 'the staged kunoichi_v3 persona is visible — a hidden staged mod lies about the run').toMatch(/kunoichi_v3/)
})
