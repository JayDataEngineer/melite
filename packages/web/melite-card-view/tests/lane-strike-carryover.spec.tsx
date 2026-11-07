// @contract cards-reopen-carry-drop
// lane-strike-carryover.spec.ts — THE BASE STRIKE'S ARMS (audits 018
// C4 + 016 C5, the client half of the pick⇄base edge).
//
// The stage's served base is the LAST RUN's resolved map — a stamp
// plane for the lane it resolved THEN. After a pick re-keys the
// lane, the pick's null verdicts leave the USER map (the unset law)
// but the base layer underneath still holds the departed stamps, and
// resolveValue's null-skip reads the base right under the nulls —
// the studio re-offers a coordinate the next run refuses (018's live
// burn: the base's int8_convrot resurrecting under kroma-base, which
// serves only bf16; 016's shape: the departed lane's voice
// resurrecting after the variant switch). No client verb can write
// the base layer away — the strike is the read-side cure at the
// drill's resolve seat: each base-held stamp is judged against the
// RESOLVED lane's own law and retired BEFORE the cascade, NAMED
// (never a silent heal), while user-stated keys never strike
// (presence is authorship) and value-lawful keys never strike (an
// envelope violation is the compose gate's banner with its own
// unstamp affordance, never a dead seat).
//
// Every arm rides the REAL served specs (formSpecArm, the door's own
// body) over the REAL boot — never a hand-built matrix. The row
// header names cards-reopen-carry-drop: the strike judges with that
// row's own verb (dropStaleReopenCarry) at the base-plane seat, the
// reopen heal's twin.
import '../../../../tests/helpers/boot-models.ts'
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";

import {
  activeRecipeId,
  composeCandidateDoc,
  resolveValue,
  type FormSpecDoc,
  type SpecValues,
} from '@melite/card-base/client'
import { formSpecArm } from '../../../../packages/harness/melite-tools/src/discovery.ts'
import { strikeDeadLaneStamps } from '../src/client/lane-strike.ts'

afterEach(() => {
  cleanup();
  fakes?.unmount();
  fakes = null;
  unbindEstateRemote();
  resetStageWrites();
  vi.unstubAllGlobals();
});

/** The strike's verdict over one user/base pair: the struck names
 *  AND the doc the cascade would show (resolved against the struck
 *  base — the studio's actual offering). */
function struckView(spec: FormSpecDoc, user: SpecValues, base: SpecValues): { strikes: string[]; shown: SpecValues } {
  const strike = strikeDeadLaneStamps(spec, user, base)
  return { strikes: strike.strikes, shown: resolveValue(spec, user, strike.base) }
}

describe('THE BASE STRIKE (audits 018 C4 + 016 C5) — the departed base stamp never re-offers', () => {
  test('018 C4: the departed quant strikes — kroma-base never re-offers turbo\u2019s int8_convrot', async () => {
    const spec = await formSpecArm('krea-2')
    expect(spec, 'the served krea-2 spec resolves').not.toBeNull()
    // the pick re-keyed the lane but left quant UNSTATED (no user
    // quant — the variant's own cell law seeds it); the base still
    // holds the departed turbo stamp
    const user: SpecValues = { variant: 'kroma-base' }
    const base: SpecValues = { variant: 'turbo', quant: 'int8_convrot', steps: 8, cfg: 1 }
    const { strikes, shown } = struckView(spec as FormSpecDoc, user, base)
    expect(strikes, 'the departed quant stamp is named').toEqual(['quant'])
    expect(shown.quant, 'the resolved lane falls UNSTATED — never the departed stamp, never a guessed neighbor').toBeUndefined()
    expect(shown.variant, 'the user\u2019s re-keyed variant still resolves').toBe('kroma-base')
  })

  test('018 C4: a user-RESTATED departed quant never strikes — authorship rides the gate\u2019s banner, not the strike', async () => {
    const spec = await formSpecArm('krea-2')
    expect(spec, 'the served krea-2 spec resolves').not.toBeNull()
    const user: SpecValues = { variant: 'kroma-base', quant: 'int8_convrot' }
    const base: SpecValues = { variant: 'turbo', quant: 'int8_convrot', steps: 8, cfg: 1 }
    const { strikes, shown } = struckView(spec as FormSpecDoc, user, base)
    expect(strikes, 'presence is authorship — the gate banners the ghost with the field\u2019s own affordance (SD-7)').toEqual([])
    expect(shown.quant, 'the stated stamp still resolves (and the mirror refuses it LOUD at the gate)').toBe('int8_convrot')
  })

  test('018 C4: a LAWFUL base quant never strikes — the strike is the coordinate\u2019s judge, not a quant purge', async () => {
    const spec = await formSpecArm('krea-2')
    expect(spec, 'the served krea-2 spec resolves').not.toBeNull()
    const user: SpecValues = { variant: 'turbo' }
    const base: SpecValues = { variant: 'turbo', quant: 'int8_convrot', steps: 8, cfg: 1 }
    const { strikes, shown } = struckView(spec as FormSpecDoc, user, base)
    expect(strikes, 'the served lane\u2019s own stamp is not dead carry').toEqual([])
    expect(shown.quant).toBe('int8_convrot')
  })

  test('016 C5 SEAT-BY-SEAT: the departed seat clears from the resolved view while the surviving seat keeps its value — qwen3-tts customvoice\u2192voicedesign', async () => {
    const spec = await formSpecArm('qwen3-tts')
    expect(spec, 'the served qwen3-tts spec resolves').not.toBeNull()
    // the switch: voice is the departed seat (customvoice-only), the
    // user carries the surviving seat's value on the new lane; the
    // base still holds the departed run's stamps
    const user: SpecValues = { variant: 'voicedesign', design_prompt: 'warm', quant: '1_7b' }
    const base: SpecValues = { variant: 'customvoice', voice: 'ryan', style_instruction: 'y', quant: '1_7b' }
    const { strikes, shown } = struckView(spec as FormSpecDoc, user, base)
    expect(strikes, 'the departed seats are named').toEqual(['voice', 'style_instruction'])
    expect(shown.design_prompt, 'the surviving seat keeps its stated value — only truly-absent seats clear').toBe('warm')
    expect('style_instruction' in shown, 'the departed seat with no defaults cover clears from the resolved view').toBe(false)
    // THE BASE PLANE IS CLEAN — and the residual is named foreign:
    // shown.voice still reads 'ryan', but from the served doc's
    // MODEL_DEFAULTS (discovery's declaredDefaults(schemaCarrier)
    // path — the schema carrier seeds a persona against the
    // NO-DEFAULT-VOICE law, qwen3-tts DECL:45-56), NOT from the
    // base: the struck base copy carries no voice at all. The
    // resolved VIEW still offers it on voicedesign (a
    // resolveValue/model-defaults wart the client cannot write
    // away — reported, not cured here: the row's null override
    // evaporates through the pick's null-verdict law and the
    // family default shines through). The strike's oath covers the
    // base plane: no base-held stamp resurrects.
    const struckBase = strikeDeadLaneStamps(spec as FormSpecDoc, user, base).base
    expect('voice' in struckBase, 'the base plane no longer holds the departed stamp').toBe(false)
    expect(shown.quant, 'the reseeded axis still resolves').toBe('1_7b')
  })

  test('VALUE-LAWFUL keys never strike: a departed ENVELOPE value is the gate\u2019s banner, not a dead seat', async () => {
    const spec = await formSpecArm('krea-2')
    expect(spec, 'the served krea-2 spec resolves').not.toBeNull()
    // steps 8 is turbo's departed default — outside kroma-base's
    // [30, 60] envelope, but steps is an on-surface schema knob, not
    // a dead seat: the compose gate banners it with its own unstamp
    // affordance
    const user: SpecValues = { variant: 'kroma-base' }
    const base: SpecValues = { variant: 'turbo', quant: 'bf16', steps: 8, cfg: 3.5 }
    const { strikes, shown } = struckView(spec as FormSpecDoc, user, base)
    expect(strikes, 'no departed-quant stamp here (bf16 is lawful) and no value-lawful key strikes').toEqual([])
    expect(shown.steps, 'the envelope value still resolves — the gate refuses it LOUD, the strike never heals it silent').toBe(8)
  })

  test('THE HUMILITY LAW: a spec-less drill and an absent base strike nothing', () => {
    expect(
      strikeDeadLaneStamps(null, { variant: 'x' }, { quant: 'q' }).strikes,
      'no spec (the spec-less drill) strikes nothing',
    ).toEqual([])
    const noBase = strikeDeadLaneStamps({ form: '' } as FormSpecDoc, { variant: 'x' }, undefined)
    expect(noBase.strikes, 'no served base strikes nothing').toEqual([])
    expect(noBase.base, 'the absent base resolves to the empty map (the caller\u2019s resolve seat keeps its shape)').toEqual({})
  })

  test('PURE: the caller\u2019s base map is never mutated', async () => {
    const spec = await formSpecArm('krea-2')
    expect(spec, 'the served krea-2 spec resolves').not.toBeNull()
    const base: SpecValues = { variant: 'turbo', quant: 'int8_convrot', steps: 8, cfg: 1 }
    const frozen = { ...base }
    strikeDeadLaneStamps(spec as FormSpecDoc, { variant: 'kroma-base' }, base)
    expect(base, 'the strike returns a copy — the served map is untouched').toEqual(frozen)
  })

  test('THE TWIN-STAMP DEAD ZONE (qwen-img-edit-21 burn, 2026-11-15): the departed recipe\u2019s base ghosts strike — the face derives the picked row over the clean layer', async () => {
    const spec = await formSpecArm('qwen-img-edit-21')
    expect(spec, 'the served qwen-img-edit-21 spec resolves').not.toBeNull()
    // THE LIVE WIRE, verbatim: the pick landed remove-background
    // (the doc/params hold its full stamp) while the served base —
    // the LAST resolution's plane — still resolves the departed
    // upstream-solvers stamps. base ⊕ user carries BOTH rows\u2019
    // stamps and the derivation names NEITHER: the recipe face
    // reads the placeholder for good over a doc the pure
    // derivation names.
    const user: SpecValues = { variant: 'turbo', quant: 'int8_convrot', model: 'qwen-img-edit-21', prompt: 'Remove the background, and output a PNG image' }
    const base: SpecValues = { steps: 8, cfg: 1, prompt: 'Remove the background, and output a PNG image', sampler: 'euler', scheduler: 'simple' }
    const strike = strikeDeadLaneStamps(spec as FormSpecDoc, user, base)
    expect(strike.strikes, 'the departed recipe\u2019s ghosts are named').toEqual(['sampler', 'scheduler'])
    expect('sampler' in strike.base, 'the base plane no longer resurrects the departed stamps under the pick\u2019s deletions').toBe(false)
    // THE FACE\u2019S OWN SEAT: the derivation layer the drill feeds
    // the pill (composeCandidateDoc(base, user)) names the row the
    // pick wrote — never the placeholder.
    const layer = composeCandidateDoc(strike.base, user, {})
    expect(activeRecipeId(spec as FormSpecDoc, layer), 'the struck layer names the picked row').toBe('remove-background')
    expect(activeRecipeId(spec as FormSpecDoc, composeCandidateDoc(base, user, {})), 'the UNSTRUCK layer is the dead zone — the burn\u2019s shape, pinned').toBeUndefined()
  })

  test('THE REOPEN EDGE never strikes: a base whose layer still names a row IS that row\u2019s stamp plane', async () => {
    const spec = await formSpecArm('qwen-img-edit-21')
    expect(spec, 'the served qwen-img-edit-21 spec resolves').not.toBeNull()
    // no pick landed this session: the base alone carries
    // upstream\u2019s resolved stamps and the layer names the row —
    // the dead-zone gate is closed before any key moves
    const user: SpecValues = { variant: 'turbo', quant: 'int8_convrot', model: 'qwen-img-edit-21' }
    const base: SpecValues = { steps: 8, cfg: 1, sampler: 'euler', scheduler: 'simple' }
    const { strikes, shown } = struckView(spec as FormSpecDoc, user, base)
    expect(strikes, 'a live row\u2019s own stamp plane never strikes').toEqual([])
    expect(shown.sampler, 'the row\u2019s stamps still resolve').toBe('euler')
  })

  test('THE DEAD ZONE WITH NO EXIT never strikes: striking recipe ghosts that name no row keeps the base', async () => {
    const spec = await formSpecArm('qwen-img-edit-21')
    expect(spec, 'the served qwen-img-edit-21 spec resolves').not.toBeNull()
    // a hand-edited layer (a prompt that names no row, ghosts that
    // leave no row either): the strike judges by difference and
    // keeps the plane — nothing to gain, nothing moved
    const user: SpecValues = { variant: 'turbo', quant: 'int8_convrot', model: 'qwen-img-edit-21', prompt: 'a hand-typed prompt' }
    const base: SpecValues = { steps: 8, cfg: 1, sampler: 'euler', scheduler: 'simple' }
    const { strikes } = struckView(spec as FormSpecDoc, user, base)
    expect(strikes, 'no row named after the strike means no strike').toEqual([])
  })

  test('THE USER-RESTATED GHOST never strikes — authorship is the (a) loop\'s own gate, not a purge', async () => {
    const spec = await formSpecArm('qwen3-tts')
    expect(spec, 'the served qwen3-tts spec resolves').not.toBeNull()
    // the 016 C5 shape with ONE difference: the user's own map
    // states the departed seat's value. A dead-carry key the hand
    // restated is the hand's word — the strike serves the author,
    // never the purge: 'voice' stays on the base plane and in the
    // resolved view
    const user: SpecValues = { variant: 'voicedesign', design_prompt: 'warm', quant: '1_7b', voice: 'ryan' }
    const base: SpecValues = { variant: 'customvoice', voice: 'ryan', style_instruction: 'y', quant: '1_7b' }
    const strike = strikeDeadLaneStamps(spec as FormSpecDoc, user, base)
    expect(strike.strikes, 'the restated seat never strikes (style_instruction — stated by nobody — still does)').toEqual(['style_instruction'])
    expect(strike.base.voice, 'the hand\'s word holds the base plane').toBe('ryan')
  })

  test('THE HEAL\'S VERDICT YIELDS AUTHORSHIP — a deAuthored restatement strikes anyway (the 2026-11-15 tts hop law)', async () => {
    const spec = await formSpecArm('qwen3-tts')
    expect(spec, 'the served qwen3-tts spec resolves').not.toBeNull()
    // the same shape, one ledger entry different: the open heal
    // already wrote voice null (the drill's droppedRef ledger), so
    // the seed's stale copy in the user map is NOT a hand's word —
    // the strike obeys the heal's verdict and clears the seat
    const user: SpecValues = { variant: 'voicedesign', design_prompt: 'warm', quant: '1_7b', voice: 'ryan' }
    const base: SpecValues = { variant: 'customvoice', voice: 'ryan', style_instruction: 'y', quant: '1_7b' }
    const strike = strikeDeadLaneStamps(spec as FormSpecDoc, user, base, new Set(['voice']))
    expect(strike.strikes, 'the heal-ledger seat strikes despite the user copy').toEqual(['voice', 'style_instruction'])
    expect('voice' in strike.base, 'the heal\'s verdict holds — the stale copy never resurrects the seat').toBe(false)
  })
})

// ── THE STRIKE NOTE (the named heal, dismissible) ─────────────────
// Mounted through StageDrill: the served base holds a departed
// non-axis ghost (the 016 shape — the drill's open seed re-derives
// absent AXES, so a mounted drill reaches the strike through the
// ghost path; the quant-strike path is pinned by the unit arms
// above), the user re-keyed to kroma-base — the note names the
// strike, the × retires the note, and a NEW strike set re-voices.

import { StageDrill } from "../src/client/stage-drill.tsx";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/client";
import { resetStageWrites } from "../src/client/draft.ts";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";
import { draftIdOf } from "@melite/contracts/benchStage";

let fakes: ReturnType<typeof mountEstateFakes> | null = null;

function kreaStage(id: string, params: Record<string, unknown>, resolved: Record<string, unknown>): BenchStageView {
  return { id, card: 'krea-2', engine: 'comfyui', params, resolved, runStatus: '' } as never as BenchStageView
}

function benchOf(stages: BenchStageView[]): CardsBenchValue {
  return { kind: 'bench', draftId: draftIdOf('bench-p'), sessionKey: 'p', rev: 1, log: [], stages }
}

function stubKreaFetch(spec: FormSpecDoc): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify(spec), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
  });
}

function mountStrikeDrill(stage: BenchStageView) {
  fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [stage as unknown as Record<string, unknown>] },
    draftStages: [stage as unknown as Record<string, unknown>],
    draftBenchRev: 1,
  });
  return render(h(StageDrill, {
    stage,
    bench: benchOf([stage]),
    running: false,
    onRun: () => {},
    onStop: () => {},
    onClose: () => {},
    onRemoved: () => {},
    onPatchParams: () => {},
    renderStageView: (_owner, fallback) => fallback,
  }));
}

describe('the strike note — the named heal at the drill seat', () => {
  test('the note NAMES the struck stamp; the × retires the note; a NEW strike set re-voices', async () => {
    const spec = await formSpecArm('krea-2')
    expect(spec, 'the served krea-2 spec resolves').not.toBeNull()
    stubKreaFetch(spec as FormSpecDoc)
    const s0 = kreaStage('s_0', { variant: 'kroma-base' }, { variant: 'turbo', quant: 'bf16', voice: 'ryan' })
    const view = mountStrikeDrill(s0)
    void view
    await waitFor(() => expect(screen.getByTestId('lane-strike-note')).toBeTruthy())
    expect(screen.getByTestId('lane-strike-note').textContent).toContain('voice')
    const dismiss = within(screen.getByTestId('lane-strike-note')).getByRole("button", { name: "Dismiss error" });
    expect(screen.getByTestId('lane-strike-note').contains(dismiss), 'the × rides INSIDE the note (the anchor law)').toBe(true)
    // SETTLE BARRIER (the roaming-dom-flake cure trial, 2026-11-15):
    // this arm struck three times under full-gate load — the dismiss's
    // update lost against the still-settling mount cascade (captured
    // signature: dev_docs/audits/journey/roaming-dom-flake-2026-11-15.md).
    // The barrier drains pending cascade work before the gesture.
    await new Promise((r) => setTimeout(r, 50));
    fireEvent.click(dismiss)
    // waitFor, not a sync assert: the mount cascade can still be
    // settling when the click lands (the 2026-10-30 flake audit's
    // FLAKE 5 — the repainted note raced this read under load)
    // 8 s, not the 1 s default: the note is already documented as
    // racing this read under load (FLAKE 5) and the full 1000-file
    // battery pushed the repaint past the default twice in three runs.
    await waitFor(() => expect(screen.queryByTestId('lane-strike-note')).toBeNull(), { timeout: 8000 })
    // a NEW strike set (a fresh stage whose base holds a departed
    // non-axis ghost) re-voices — the silence never eats a fresh
    // strike
    const s1 = kreaStage('s_1', { variant: 'kroma-base' }, { variant: 'turbo', quant: 'bf16', style_instruction: 'shouty' })
    view.rerender(h(StageDrill, {
      stage: s1,
      bench: benchOf([s1]),
      running: false,
      onRun: () => {},
      onStop: () => {},
      onClose: () => {},
      onRemoved: () => {},
      onPatchParams: () => {},
      renderStageView: (_owner, fallback) => fallback,
    }))
    await waitFor(() => expect(screen.getByTestId('lane-strike-note')).toBeTruthy())
    expect(screen.getByTestId('lane-strike-note').textContent).toContain('style_instruction')
  })
});

// ── THE PICK⇄STRIKE LOST UPDATE (the 2026-11-15 combination sweep's
//    tts hop — a REAL product race, verbatim: "the Variant axis face
//    carries the picked row 'Base' (a pick that does not land is a
//    silent drop) Expected: 'base' Received: 'voicedesign'; Struck
//    from the resolved lane: mode") ─────────────────────────────────
// The pick of Base wrote; the departure (the strike of mode — a
// family-default stamp no lane's params surface serves, unreachable
// by the axis-carry law) rode a SECOND CAS built off the pre-pick
// doc, and the pick's write was the casualty: the doc kept the
// departed variant under a face that named the pick. THE CURE LAW
// (the row's own shape): the strike rides the pick's own patch —
// the departure nulls land IN the arrival write, one CAS, never a
// second write the arrival must race.
describe('THE PICK⇄STRIKE LOST UPDATE (2026-11-15 sweep) — the departure rides the pick\'s own write', () => {
  test('the pick of Base over a voicedesign doc carries the strike\'s nulls in the SAME frame; the doc names the pick (admitted keys survive)', async () => {
    const spec = await formSpecArm('qwen3-tts')
    expect(spec, 'the served qwen3-tts spec resolves').not.toBeNull()
    stubKreaFetch(spec as FormSpecDoc)
    // THE PRE-PICK DOC: the saved bench holds the voicedesign lane's
    // stamps — design_prompt (the lane's own param, the axis-carry
    // law's to drop) and the family-default mode stamp (off EVERY
    // lane's params surface — but ON the card's `admits` row, so the
    // 2026-11-16 admitted-key fold sanctions it: the door admits the
    // key, the strike never does)
    const stageRow: Record<string, unknown> = {
      id: 's_0', card: 'qwen3-tts', engine: 'comfyui',
      params: { model: 'qwen3-tts', variant: 'voicedesign', mode: 'tts', design_prompt: 'warm', text: 'hello there' },
    }
    const s0 = {
      ...stageRow,
      resolved: { variant: 'voicedesign', mode: 'tts', design_prompt: 'warm' },
      runStatus: '',
    } as never as BenchStageView
    fakes = mountEstateFakes({
      benchDoc: { draft_id: 'bench-p', rev: 1, log: [], stages: [stageRow] },
      draftStages: [stageRow],
      draftBenchRev: 1,
    })
    render(h(StageDrill, {
      stage: s0,
      bench: benchOf([s0 as unknown as BenchStageView]),
      running: false,
      onRun: () => {},
      onStop: () => {},
      onClose: () => {},
      onRemoved: () => {},
      onPatchParams: () => {},
      renderStageView: (_owner, fallback) => fallback,
    }))
    // the form renders on the departed lane (the pre-pick face)
    const variant = await screen.findByLabelText('Variant', {}, { timeout: 8000 })
    expect(variant.textContent ?? '').toContain('VoiceDesign')
    // THE PICK: the operator's gesture — voicedesign → Base
    fireEvent.click(variant)
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Base' }))
    const patchParams = (): Array<Record<string, unknown>> => fakes!.calls
      .filter((c) => c.method === 'drafts/patch')
      .map((c) => ((c.args as { patch?: { params?: Record<string, unknown> } }).patch?.params) ?? {})
    // PICK + STRIKE IN ONE WRITE (re-pinned to the admitted-key law,
    // 2026-11-16): the marriage frame carries the arrival (variant
    // base) and the departed lane's own param (design_prompt, the
    // axis-carry law). `mode` NO LONGER RIDES — the qwen3-tts card's
    // own `admits` row carries it (the estate write door admits the
    // key), so the strike's judge — the same admittedKeys fold as the
    // reopen heal and the mirror — sanctions it at all three seats:
    // striking an admitted key was the pre-cure behavior (the
    // 2026-11-16 timeline audit's finding class).
    await waitFor(() => {
      const marriage = patchParams()
        .find((p) => p['variant'] === 'base' && p['design_prompt'] === null)
      expect(marriage, 'pick + strike in ONE write: variant base + design_prompt null (mode stays — the door admits it)').toBeDefined()
      expect(marriage?.['mode'], 'the admitted key is never struck (one spelling, both doors)').toBeUndefined()
    }, { timeout: 8000 })
    const frames = patchParams()
    const marriageIdx = frames.findIndex((p) => p['variant'] === 'base' && p['design_prompt'] === null)
    // NEVER THE SECOND CAS: after the pick's own write, no frame
    // re-carries the departed variant (the pre-pick doc's overwrite
    // — the lost-update class), and the strike key never rides a
    // frame of its own behind the arrival
    const after = frames.slice(marriageIdx + 1)
    expect(after.filter((p) => p['variant'] === 'voicedesign'),
      'no write re-carries the departed variant after the pick').toEqual([])
    expect(after.filter((p) => p['design_prompt'] === null && p['variant'] !== 'base'),
      'the strike never rides a frame of its own behind the pick (no second CAS)').toEqual([])
    expect(after.filter((p) => p['mode'] === null),
      'the admitted key is never nulled behind the pick either').toEqual([])
    // THE DOC NAMES THE PICK: the applied draft row carries the
    // arrival with the departed param gone (null-or-deleted on the
    // wire) and the admitted key preserved verbatim
    await waitFor(() => {
      const params = (stageRow['params'] ?? {}) as Record<string, unknown>
      expect(params['variant'], 'the served doc names the pick').toBe('base')
      expect(params['mode'], 'the admitted key survives the pick (the door admits it — the client never strikes what the door admits)').toBe('tts')
      expect(params['design_prompt'] == null, 'the departed lane\'s param left the doc with the pick\'s own write').toBe(true)
    }, { timeout: 8000 })
    // and the FACE settles on the pick (the sweep's own assertion
    // face — a pick that does not land is a silent drop)
    await waitFor(() => {
      const face = screen.getByLabelText('Variant')
      expect(face.textContent ?? '').toContain('Base')
    }, { timeout: 8000 })
  })

  test('THE STRIKE RIDES THE PICK OUT OF FRAME (the 1063 seat): a base-held ghost the arrival never seeds rides the pick\'s OWN patch as its null — never a second CAS', async () => {
    const spec = await formSpecArm('qwen3-tts')
    expect(spec, 'the served qwen3-tts spec resolves').not.toBeNull()
    stubKreaFetch(spec as FormSpecDoc)
    // THE PRE-PICK DOC: the author map (params) is a lawful Base doc;
    // the BASE layer (resolved — the last run's stamp plane) carries
    // `recipe: 'turbo'`, dead vocabulary on this card: no lane
    // declares it, no cell seeds it, no pick's frame ever names it.
    // The reopen heal drops it from the AUTHOR plane at open (the
    // same verb the strike judges with); the base layer underneath
    // still holds the stamp, and ONLY the strike can retire it — the
    // drill must fold its null into the pick's own atomic write
    const stageRow: Record<string, unknown> = {
      id: 's_0', card: 'qwen3-tts', engine: 'comfyui',
      params: { model: 'qwen3-tts', variant: 'base', mode: 'tts', text: 'hello there' },
    }
    const s0 = {
      ...stageRow,
      resolved: { variant: 'base', mode: 'tts', text: 'hello there', recipe: 'turbo' },
      runStatus: '',
    } as never as BenchStageView
    fakes = mountEstateFakes({
      benchDoc: { draft_id: 'bench-p', rev: 1, log: [], stages: [stageRow] },
      draftStages: [stageRow],
      draftBenchRev: 1,
    })
    render(h(StageDrill, {
      stage: s0,
      bench: benchOf([s0 as unknown as BenchStageView]),
      running: false,
      onRun: () => {},
      onStop: () => {},
      onClose: () => {},
      onRemoved: () => {},
      onPatchParams: () => {},
      renderStageView: (_owner, fallback) => fallback,
    }))
    const variant = await screen.findByLabelText('Variant', {}, { timeout: 8000 })
    // THE PICK: base → voicedesign — the arrival seeds the lane's own
    // fields; `recipe` rides none of them
    fireEvent.click(variant)
    fireEvent.click(await screen.findByRole('menuitem', { name: 'VoiceDesign' }))
    const patchParams = (): Array<Record<string, unknown>> => fakes!.calls
      .filter((c) => c.method === 'drafts/patch')
      .map((c) => ((c.args as { patch?: { params?: Record<string, unknown> } }).patch?.params) ?? {})
    // THE STRIKE IN THE PICK'S OWN FRAME: the ghost's null rides the
    // SAME atomic write as the arrival — one CAS, the strike never
    // waits behind the pick (the lost-update law's own seat)
    await waitFor(() => {
      const marriage = patchParams()
        .find((p) => p['variant'] === 'voicedesign' && p['recipe'] === null)
      expect(marriage, 'pick + out-of-frame strike in ONE write: variant voicedesign + the ghost\'s null').toBeDefined()
    }, { timeout: 8000 })
    // NEVER THE SECOND CAS: the ghost's null never rides a frame of
    // its own behind the pick
    const frames = patchParams()
    const marriageIdx = frames.findIndex((p) => p['variant'] === 'voicedesign' && p['recipe'] === null)
    const after = frames.slice(marriageIdx + 1)
    expect(after.filter((p) => p['recipe'] === null && p['variant'] !== 'voicedesign'),
      'the out-of-frame strike never rides a frame of its own (no second CAS)').toEqual([])
    // THE DOC NAMES THE PICK
    await waitFor(() => {
      const params = (stageRow['params'] ?? {}) as Record<string, unknown>
      expect(params['variant'], 'the served doc names the pick').toBe('voicedesign')
    }, { timeout: 8000 })
  })
});
