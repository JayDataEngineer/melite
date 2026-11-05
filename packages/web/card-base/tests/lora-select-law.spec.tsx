// @vitest-environment happy-dom
// lora-select-law.spec.tsx — THE LORA IS ALWAYS A PICKER (the
// operator's 2026-11-15 burn: "The Fibo lora is freeform text";
// "Multiple lora mods have this issue"; the trigger is the EMPTY
// roster — zero loras available; "there is no reason we can't have a
// red if any lora mod across the entire melite system renders as
// freeform text").
//
// THE LAW: every LoRA seat in the system is a PICKER over the served
// roster — a menu button whose rows ARE the roster — and never a
// freeform text input, INCLUDING when the roster is empty. The
// empty-roster arm is the operator's trigger: `isOptionKind` judged
// `options.length > 0`, so a family serving `entry:'option'` with NO
// rows fell into the FIELD leaf, which derived the envelope's root
// dict as fields and rendered the BAG PARAM ITSELF as a text box
// (aria-label "LoRAs"). The bag is the seat the leaf EDITS; it is
// never a field. A typed name is not merely ugly: the compose door
// refuses it (`unknown-lora`).
//
// DEPTH (LAW 4, axis 4 — nothing here is a hand copy):
//  - the family/rows roster is DERIVED: every
//    packages/models/*\/mods/loras.ts seed is imported and its REAL
//    `apply(ctx)` runs against a recording ctx, capturing the exact
//    `registerFlavor({pack, families, rows})` payload the boot lands;
//  - the pack's field envelope is the REAL `LorasFields` schema's own
//    `toJSON()` — the same serialization the estate serves as
//    `mod_schemas.loras`;
//  - the kind row is the REAL `MODIFIER_PACKS` grammar the form-spec
//    door reads to serve `features.modifiers`.
// So a seed that gains a family, a pack that changes its entry mode,
// or a schema that moves the bag reaches this wall with no edit here.
//
// TOGGLES (each names the arm it reds):
//  - restore `isOptionKind`'s `options.length > 0` test → the
//    EMPTY-ROSTER arm reds (fibo2-edit & co. render the text box);
//  - drop the `f.name !== k.param_key` filter in the leaf's
//    leafFields → the BAG-NEVER-A-FIELD arm reds (the mask kind's
//    "Mask Bag" text input returns).
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createElement as h } from 'react'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { MODIFIER_PACKS } from '@melite/harness-tools/doors'
import { LorasFields } from '@melite/comfyui-card-kit/pack-fields'
import type { FormSpecDoc } from '../src/spec.ts'
import { CardForm } from '../src/form.tsx'
import { unbindEstateRemote } from '../src/estate-remote.ts'

// The test tier's tsconfig carries no vite/client types (the package
// does not depend on vite's type face), so the glob's own shape is
// declared here — the runtime is vite's transform, this is only tsc's
// face. The generic return keeps the seed module narrowed at its use.
declare global {
  interface ImportMeta {
    glob<T>(pattern: string, options: { eager: true }): Record<string, T>
  }
}

afterEach(() => { cleanup(); unbindEstateRemote(); vi.restoreAllMocks() })

/** One family's registered LoRA flavor, as the boot lands it. */
interface Flavor {
  readonly seed: string
  readonly families: readonly string[]
  readonly rows: readonly { id?: string, filename?: string, label?: string, default_strength?: number, steps?: number }[]
}

/** The flavor seeds, DERIVED from the tree (never a hand list): every
 *  model package that ships a loras flavor. */
const SEEDS = import.meta.glob<{ apply(ctx: unknown): void }>('../../../models/*/mods/loras.ts', { eager: true })

/** Run a seed's REAL apply() against a recording ctx — the same
 *  registerFlavor payload the cards boot would land. */
function flavorsOf(): Flavor[] {
  const out: Flavor[] = []
  for (const [path, mod] of Object.entries(SEEDS)) {
    const seed = path.split('/').slice(-3).join('/')
    const recorded: Array<Omit<Flavor, 'seed'>> = []
    const ctx = {
      effect: (fn: () => unknown): (() => void) => { fn(); return () => {} },
      comfyui: {
        registerFlavor: (flavor: { families?: string[], rows?: Flavor['rows'] }): (() => void) => {
          recorded.push({ families: flavor.families ?? [], rows: flavor.rows ?? [] })
          return () => {}
        },
      },
    }
    mod.apply(ctx)
    for (const flavor of recorded) out.push({ seed, ...flavor })
  }
  return out
}

/** The pack envelope, straight off the pack contract's own schema —
 *  the same serialization the door serves as `mod_schemas.loras`. */
function lorasEnvelope(): Record<string, unknown> {
  return (LorasFields as unknown as { toJSON(): Record<string, unknown> }).toJSON()
}

/** The served spec doc for ONE family's LoRA kind: the real
 *  MODIFIER_PACKS grammar + the real rows the seed registers + the
 *  real envelope. This is the shape `formSpecArm` serves. */
function docOf(family: string, rows: Flavor['rows']): FormSpecDoc {
  const meta = MODIFIER_PACKS['loras']
  if (meta === undefined) throw new Error('MODIFIER_PACKS carries no loras row — the serve has no grammar')
  return {
    form: 'lora-select-law',
    features: {
      modifiers: [{
        kind: meta.kind,
        label: meta.label,
        param_key: meta.param_key ?? 'loras',
        schema_key: 'loras',
        cardinality: meta.cardinality,
        ...(meta.entry !== undefined ? { entry: meta.entry } : {}),
        ...(meta.option_key !== undefined ? { option_key: meta.option_key } : {}),
        options: rows.flatMap((r) => typeof r.filename === 'string' && r.filename !== ''
          ? [{
              value: r.filename,
              label: r.label ?? r.filename,
              model: r.filename,
              ...(r.default_strength === undefined ? {} : { defaults: { strength: r.default_strength } }),
            }]
          : []),
      }],
    },
    mod_schemas: { loras: lorasEnvelope() },
  } as unknown as FormSpecDoc
}

/** Open the mods leaf for the doc's FIRST modifier kind — the gesture
 *  the operator's "Add modifier" click walks. */
function openLeaf(container: HTMLElement, kindLabel: string): HTMLElement {
  const add = container.querySelector('[data-subcard-add="mod"]') as HTMLElement | null
  expect(add, 'the mods plane offers its add seat').not.toBeNull()
  fireEvent.click(add as HTMLElement)
  const item = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"], [role="option"]'))
    .find((el) => (el.textContent ?? '').trim() === kindLabel)
  expect(item, `the add menu carries the '${kindLabel}' kind`).toBeDefined()
  fireEvent.click(item as HTMLElement)
  const leaf = document.querySelector<HTMLElement>('[class*="modLeaf"]')
  expect(leaf, 'the leaf opened').not.toBeNull()
  return leaf as HTMLElement
}

/** Every freeform text seat in a subtree: an input with no type (HTML
 *  defaults to text) or type=text/search, plus textareas. A picker is
 *  a BUTTON — it never appears here. */
function textSeatsOf(root: HTMLElement): Array<{ aria: string, tag: string, type: string }> {
  return Array.from(root.querySelectorAll<HTMLElement>('input, textarea')).flatMap((el) => {
    const tag = el.tagName.toLowerCase()
    if (tag === 'textarea') return [{ aria: el.getAttribute('aria-label') ?? '', tag, type: 'textarea' }]
    const type = (el.getAttribute('type') ?? 'text').toLowerCase()
    return type === 'text' || type === 'search'
      ? [{ aria: el.getAttribute('aria-label') ?? '', tag, type }]
      : []
  })
}

describe('THE LORA SELECT LAW — every lora seat in the system is a picker', () => {
  test('THE GRAMMAR: the serve declares the lora entry as a catalog option', () => {
    expect(MODIFIER_PACKS['loras']?.entry, 'the lora pack is served entry:\'option\' — the leaf switches on the SERVED value').toBe('option')
    expect(MODIFIER_PACKS['loras']?.option_key ?? 'id').toBe('id')
  })

  test('THE ROSTER IS WHOLE: every model package\'s lora seed is derived (no silent narrowing)', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const models = join(here, '..', '..', '..', 'models')
    const seeds = readdirSync(models, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .filter((e) => readdirSync(join(models, e.name)).includes('mods'))
      .filter((e) => readdirSync(join(models, e.name, 'mods')).includes('loras.ts'))
      .map((e) => e.name)
    expect(seeds.length, 'the tree ships lora seeds at all').toBeGreaterThan(5)
    expect(flavorsOf().length, 'every seed registered a flavor').toBeGreaterThanOrEqual(seeds.length)
    // every family a seed names is reachable through the real apply()
    const families = new Set(flavorsOf().flatMap((f) => f.families))
    expect(families.size, 'the derived roster covers the families the seeds name').toBeGreaterThan(5)
  })

  test('EVERY FAMILY: the LoRA control is a picker button, never a text seat', () => {
    const flavors = flavorsOf()
    expect(flavors.length, 'the sweep is non-empty (a wall over nothing is not a wall)').toBeGreaterThan(0)
    for (const flavor of flavors) {
      const family = flavor.families[0]
      if (family === undefined) continue
      const { container } = render(h(CardForm, { spec: docOf(family, flavor.rows), user: {}, onSet: vi.fn(), onPick: vi.fn() }))
      const leaf = openLeaf(container, MODIFIER_PACKS['loras']?.label ?? 'LoRAs')
      const seats = textSeatsOf(leaf)
      expect(seats, `${flavor.seed} (${family}, ${String(flavor.rows.length)} rows): the lora seat must not be freeform text — got ${JSON.stringify(seats)}`).toEqual([])
      const picker = within(leaf).getByRole('button', { name: MODIFIER_PACKS['loras']?.label ?? 'LoRAs' })
      expect(picker, `${flavor.seed}: the picker is a menu button`).toBeDefined()
      cleanup()
    }
  })

  test('THE OPERATOR\'S TRIGGER: an EMPTY roster still renders the picker (fibo2-edit and every sibling)', () => {
    const empty = flavorsOf().filter((f) => f.rows.length === 0)
    expect(empty.length, 'the system HAS empty-roster lora seats — the class the burn names').toBeGreaterThan(0)
    expect(empty.map((f) => f.families[0]).sort(), 'fibo2-edit is one of them (the operator\'s own report)').toContain('fibo2-edit')
    for (const flavor of empty) {
      const family = flavor.families[0] as string
      const { container } = render(h(CardForm, { spec: docOf(family, flavor.rows), user: {}, onSet: vi.fn(), onPick: vi.fn() }))
      const leaf = openLeaf(container, MODIFIER_PACKS['loras']?.label ?? 'LoRAs')
      // the trigger class: NO text seat, and the bag param is not a field
      expect(textSeatsOf(leaf), `${family}: an empty roster is a roster STATE, never a typing box`).toEqual([])
      expect(leaf.querySelector('[data-mod-roster-empty="loras"]'), `${family}: the empty state states itself`).not.toBeNull()
      const picker = within(leaf).getByRole('button', { name: MODIFIER_PACKS['loras']?.label ?? 'LoRAs' })
      expect(picker, `${family}: the picker still seats (empty face)`).toBeDefined()
      cleanup()
    }
  })

  test('THE BAG IS THE SEAT: a bag-container param never renders as a field (the mask kind too)', () => {
    // the mask kind is a FIELD kind whose envelope root dict carries
    // the bag param `mask` beside the entry's knobs — the same trap,
    // one pack over (proven live: aria-label "Mask Bag" rendered text)
    const meta = MODIFIER_PACKS['mask']
    expect(meta, 'the mask pack has a served grammar').toBeDefined()
    const doc = {
      form: 'bag-law',
      features: {
        modifiers: [{
          kind: meta.kind,
          label: meta.label,
          param_key: meta.param_key ?? 'mask',
          schema_key: 'mask',
          cardinality: meta.cardinality,
          fields: [
            { name: 'mask', label: 'Mask Bag', type: 'mask' },
            { name: 'feather', label: 'Feather', type: 'slider' },
          ],
        }],
      },
    } as unknown as FormSpecDoc
    const { container } = render(h(CardForm, { spec: doc, user: {}, onSet: vi.fn(), onPick: vi.fn() }))
    const leaf = openLeaf(container, meta.label)
    const seats = textSeatsOf(leaf)
    expect(seats.filter((s) => s.aria === 'Mask Bag'), 'the bag param is the SEAT, never a field').toEqual([])
    // the entry's own knobs still render (the filter must not eat them)
    expect(within(leaf).getByText('Feather'), 'the entry knobs survive the bag filter').toBeDefined()
  })
})
