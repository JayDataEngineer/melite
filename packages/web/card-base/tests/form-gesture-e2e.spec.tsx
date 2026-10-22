// form-gesture-e2e.spec.tsx — THE OPERATOR'S GESTURE, END TO END
// (operator 2026-11-11, attempt 13's order: "then build the
// comprehensive suite"). THE LAW THIS SUITE HOLDS: the RENDERED
// FORM, the WRITE DOOR, and the RUN DOOR ride ONE law on the
// operator's exact sequence — a fresh tts card, the variant switch
// to VoiceDesign, ONE box of the persona pair typed, the RUN press
// — with every seat driven for real:
//
//   [1] THE FORM — the real CardForm in the DOM (the same component
//       the served bundle ships), typed into through real DOM
//       events (fireEvent.change on the labeled input), the refusal
//       strip asserted as RENDERED MARKUP, not as a judge's return.
//   [2] THE STORED DOC — the real drafts domain (json storage under
//       tmp), the doc read back after every write: what landed is
//       what the next run composes.
//   [3] THE WRITE DOOR — the real DraftsRemoteService.patch with
//       the real CardRegistryService admission behind it (the same
//       in-process service :3088 boots).
//   [7] THE RUN DOOR — the real phase1Card (the run seat's own
//       judgment), driven with the stored body exactly as
//       runsValidate builds it.
//
// THE FRICTIONLESS-AUTHORING LINE (operator 2026-11-11): the half
// SAVES at the write seat and renders NO strip at the form seat;
// the RUN PRESS refuses the half naming the pair. Any seat that
// disagrees with the others is the attempt-12/13 class and reds
// here by name.
//
// SCOPE (named, per the claim protocol): services run in-process —
// the same code the lane boots, called through the same service
// faces; the typert transport bytes are dsh's own tested layer.
// The pick rides onPick with the form's OWN builder output
// (axisPickPatch — the exact patch the menu click sends); the menu
// grammar itself is walled in form-model-face + variant-switch.
//
// Run: npx vitest run packages/web/card-base/tests/form-gesture-e2e.spec.tsx
import { afterEach, beforeAll, afterAll, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h, useState } from 'react'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from '@deepseek-ai/dsh-storage-json'
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from '@deepseek-ai/dsh-storage-domain'
import type { Domain } from '@deepseek-ai/dsh-storage-domain'

import { DraftsRemoteService, BenchRemoteService, installBenchChangeSeam } from '../../../estate/drafts/src/remote.ts'
import { benchBlockOf } from '../../../estate/drafts/src/bench.ts'
import { openDraftsDomain, DraftsDomainSeatService } from '../../../estate/drafts/src/store.ts'
import type { DraftsDomainSpec } from '../../../estate/drafts/src/spec.js'
import { CardRegistryService } from '../../../harness/estate-queue/src/cardsRegistry.ts'
import { CardArmError } from '../../../harness/estate-queue/src/cardsArmError.ts'
import { FlowsSeatService } from '../../../harness/estate-queue/src/flowsData.ts'
import { formSpecArm } from '../../../harness/melite-tools/src/discovery.ts'
import { axisPickPatch, seedUser } from '../src/spec.ts'
import type { SpecValues } from '../src/spec.ts'
import { CardForm } from '../src/form.tsx'
import type { FormSpecDoc } from '@melite/contracts/formSpec'

const sig = new AbortController().signal

let drafts: Domain<DraftsDomainSpec>
let gui: DraftsRemoteService
let bench: BenchRemoteService
let reg: CardRegistryService
let root: string
let spec: FormSpecDoc | null

/** The doc's current bench rev (the CAS fence the host rides). */
async function revOf(docId: string): Promise<number> {
  const row = await drafts.table('docs').get(docId)
  return benchBlockOf((row?.doc ?? {}) as Record<string, unknown>).rev
}

/** The stored stage params — the doc the next run composes. */
async function storedParams(docId: string): Promise<Record<string, unknown>> {
  const row = await drafts.table('docs').get(docId)
  const stages = ((row?.doc ?? {}) as { stages?: Array<{ params?: Record<string, unknown> }> }).stages ?? []
  return { ...(stages[0]?.params ?? {}) }
}

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'form-gesture-'))
  mkdirSync(join(root, 'storage'), { recursive: true })
  const ctx = new Context()
  await ctx.plugin(Storage as never, undefined as never)
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never, { root: join(root, 'storage') } as never)
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never, { backend: 'json' } as never)
  new DraftsDomainSeatService(ctx, { storageRoot: join(root, 'storage') })
  installBenchChangeSeam(ctx)
  new FlowsSeatService(ctx)
  ;(ctx as unknown as { queue: unknown }).queue = { stateRoot: mkdtempSync(join(tmpdir(), 'form-gesture-q-')), stateRoots: [] }
  reg = new CardRegistryService(ctx)
  await reg.prime()
  drafts = await openDraftsDomain(ctx)
  gui = new DraftsRemoteService(ctx)
  bench = new BenchRemoteService(ctx)
  void bench
  spec = await formSpecArm('qwen3-tts', undefined, [])
}, 120_000)

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

afterEach(cleanup)

/** THE HOST LOOP (the studio's lawful core, no view glue): the user
 * layer is local state the form renders; every edit writes through
 * the REAL door (one write per gesture, the write-through law);
 * the base layer re-reads the stored doc after every write — the
 * reopen face. */
interface HostSeat {
  type(name: string, value: string): Promise<void>
  pick(patch: Record<string, unknown>): Promise<void>
  setUser(u: SpecValues): void
  reopen(): Promise<void>
  writeDirect(patch: Record<string, unknown>): Promise<void>
}

function mountHost(docId: string): HostSeat {
  let setUserState: ((u: SpecValues | ((prev: SpecValues) => SpecValues)) => void) | null = null
  let setBaseState: ((b: SpecValues | ((prev: SpecValues) => SpecValues)) => void) | null = null
  let pending: Record<string, unknown> = {}
  let writing = Promise.resolve()

  const write = (patch: Record<string, unknown>): Promise<void> => {
    pending = { ...pending, ...patch }
    const flight = writing.then(async () => {
      const frame = pending
      pending = {}
      const rev = await revOf(docId)
      await gui.patch(docId, 's_0', { params: frame }, rev, sig)
      await refreshBase()
    })
    writing = flight.catch(() => {})
    return flight
  }

  const refreshBase = async (): Promise<void> => {
    const params = await storedParams(docId)
    act(() => { setBaseState?.(seedUser(spec as FormSpecDoc, params)) })
  }

  const Host = (): ReturnType<typeof h> => {
    const [user, setU] = useState<SpecValues>({})
    const [base, setB] = useState<SpecValues>({})
    setUserState = setU
    setBaseState = setB
    return h(CardForm, {
      spec: spec as FormSpecDoc,
      user,
      base,
      onSet: (name: string, v: unknown): void => {
        setU((prev) => ({ ...prev, [name]: v }))
        void write({ [name]: v })
      },
      onPick: (patch: Record<string, unknown>): void => {
        const landed: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(patch)) {
          if (v === '') { landed[k] = null; continue }
          landed[k] = v
        }
        setU((prev) => {
          const next = { ...prev, ...landed }
          for (const [k, v] of Object.entries(landed)) if (v === null) delete next[k]
          return next
        })
        void write(landed)
      },
      onUnset: (name: string): void => {
        setU((prev) => {
          const next = { ...prev }
          delete next[name]
          return next
        })
        void write({ [name]: null })
      },
    })
  }
  render(h(Host))
  return {
    async type(name: string, value: string): Promise<void> {
      const matches = await screen.findAllByLabelText(name, { exact: false })
      const input = matches[0] as HTMLElement
      await act(async () => { fireEvent.change(input, { target: { value } }) })
      await writing
    },
    async pick(patch: Record<string, unknown>): Promise<void> {
      const landed: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(patch)) landed[k] = v === '' ? null : v
      await write(landed)
      act(() => {
        setUserState?.((prev) => {
          const next = { ...prev, ...landed }
          for (const [k, v] of Object.entries(landed)) if (v === null) delete next[k]
          return next
        })
      })
    },
    setUser(u: SpecValues): void { act(() => { setUserState?.(u) }) },
    async reopen(): Promise<void> { await refreshBase() },
    async writeDirect(patch: Record<string, unknown>): Promise<void> { await write(patch) },
  }
}

/** Every strip row the form renders (the lane strip + the alert
 * rows — both faces of the inline gate). */
function renderedRefusals(): string[] {
  const rows: string[] = []
  for (const el of Array.from(document.querySelectorAll('[data-lane-warn]'))) rows.push(el.textContent ?? '')
  for (const p of Array.from(document.querySelectorAll('[role="alert"] p'))) {
    if (p.textContent !== null && p.textContent !== '') rows.push(p.textContent)
  }
  return rows
}

const AUTHORING_STEMS = [
  /ride together on this lane/,
  /completes none of them/,
  /this lane requires/,
]

/** The run press's own door, driven with the STORED body exactly as
 * runsValidate builds it (params + model + card). Returns the
 * refusal text, or null when the lane admits. */
async function runPressRefusal(docId: string, card: string): Promise<string | null> {
  const params = await storedParams(docId)
  const mid = typeof params['model'] === 'string' ? params['model'] : card
  const body: Record<string, unknown> = { ...params, model: mid, card }
  try {
    await reg.phase1Card(body, mid)
    return null
  } catch (e) {
    if (e instanceof CardArmError) return e.message
    throw e
  }
}

test('THE QVOICE BOOLEAN LAW, END TO END (operator 2026-10-22): fresh tts card → VoiceDesign pick → text + persona typed, NO name box on the form → the state SAVES, renders NO strip, and the RUN press owns NO pair', async () => {
  expect(spec, 'the served qwen3-tts spec armed').not.toBeNull()
  const docId = 'bench-gesture-e2e'
  await drafts.table('docs').put(docId, {
    updated_at: 1,
    doc: {
      draft_id: docId, intent: 'gesture', status: 'ready', createdAt: 1, completedAt: null,
      stages: [{ id: 's_0', card: 'tts', params: { model: 'qwen3-tts', variant: 'customvoice' } }],
      bench: { rev: 0, log: [] },
    } as never,
  })

  // [1] THE PICK — the form's own builder, the exact patch the
  // Variant menu click sends, through the real door
  const seat = mountHost(docId)
  const vdRow = (spec?.variants ?? []).find((r) => r.id === 'voicedesign')
  expect(vdRow, 'the VoiceDesign row is on the served spec').toBeDefined()
  const pick = axisPickPatch(spec as FormSpecDoc, vdRow!, undefined) as Record<string, unknown>
  await seat.pick(pick)
  const afterPick = await storedParams(docId)
  expect(afterPick['variant'], 'the switch landed in the stored doc').toBe('voicedesign')
  await seat.reopen()

  // [2] THE GESTURE (the qvoice boolean law, operator 2026-10-22):
  // the base VoiceDesign card is text + persona description —
  // qvoice IS a mod ("IT IS A SIMPLE BOOLEAN"), never a baked-in
  // base-lane field. The Design Mod Name box is DEAD on this form.
  await seat.type('Text to Speak', 'the words the voice performs')
  await seat.type('Voice Persona', 'a warm narrator, low and close')
  const afterHalf = await storedParams(docId)
  expect(String(afterHalf['design_prompt'] ?? ''), 'the persona LANDED in the stored doc (the write door admitted it)').toContain('warm narrator')
  const nameBox = document.querySelector('input[placeholder*="deep_radio_host"]')
  expect(nameBox, 'the Design Mod Name box is GONE from the base form (voice_name is not a base-lane field)').toBeNull()
  const halfRefusals = renderedRefusals().filter((t) => AUTHORING_STEMS.some((re) => re.test(t)))
  expect(halfRefusals, 'the RENDERED FORM voices no authoring refusal for the state (the strip stays silent mid-form)').toEqual([])
  // the write door's own verdict, asked directly: the same state admits
  const door = reg.admitStageRelations('tts', afterHalf)
  expect(door.ok === true, `the registry door admits the same state (one law, both seats): ${door.ok === true ? '' : door.error}`).toBe(true)

  // [3] THE RUN PRESS — text + persona is the COMPLETE design state:
  // the run seat owns no pair here (the name was never this lane's
  // to demand; the SAVE QVOICE mod persists the embedding — the
  // mint names itself). Engine presence may voice itself (the test
  // env has no ComfyUI — the EXTENSION LAW); an AUTHORING refusal
  // is the failure, and it must be GONE.
  const runHalf = await runPressRefusal(docId, 'tts')
  const authoringRefused = runHalf !== null && AUTHORING_STEMS.some((re) => re.test(runHalf))
  expect(authoringRefused, `the run press owns NO pair on the design state: ${runHalf ?? '(admitted)'}`).toBe(false)

  // [4] THE BOOLEAN — SAVE QVOICE rides the mods pane as a flat
  // boolean (attach = ON): stating it through the form's own write
  // path saves, and the door still admits (the save is a mod fact,
  // never a base-lane demand)
  await seat.writeDirect({ save_qvoice: true })
  const afterBool = await storedParams(docId)
  expect(afterBool['save_qvoice'], 'the SAVE QVOICE boolean LANDED in the stored doc').toBe(true)
  const boolDoor = reg.admitStageRelations('tts', afterBool)
  expect(boolDoor.ok === true, `the registry door admits the boolean-on state: ${boolDoor.ok === true ? '' : boolDoor.error}`).toBe(true)

  // [5] THE REOPEN FACE — a fresh read of the stored doc renders no
  // resurrected authoring refusal (the 2026-10-18 replayed-refusal
  // class, judged at the DOM)
  seat.setUser({})
  await seat.reopen()
  const reopenRefusals = renderedRefusals().filter((t) => AUTHORING_STEMS.some((re) => re.test(t)))
  expect(reopenRefusals, 'the reopened card carries no authoring strip for its own stored state').toEqual([])
})

test('THE PAIR CENSUS (derived from the served DECL): the tts lanes declare NO authoring pairs — voice_name is not a base-lane field (the qvoice boolean law)', async () => {
  expect(spec, 'the served qwen3-tts spec armed').not.toBeNull()
  const relations = spec?.lanes?.relations
  const pairs: Array<{ stem: RegExp, fields: string[] }> = []
  for (const row of relations?.together ?? []) pairs.push({ stem: /ride together on this lane/, fields: [...row.fields] })
  for (const row of relations?.either_or ?? []) {
    for (const group of row.groups) pairs.push({ stem: /completes none of them/, fields: [...group] })
  }
  // THE LAW (operator 2026-10-22): the export pair is DEAD on the
  // base lane — the together row that fired "the persona export
  // needs both halves" was the requirement itself injuring the
  // operator. The census derives from the served DECL: zero pairs.
  expect(pairs.map((p) => p.fields.join('+')), 'the tts DECL declares NO authoring pairs (the name is a mod boolean, never a base-lane field)').toEqual([])
})
