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
    fireEvent.click(dismiss)
    // waitFor, not a sync assert: the mount cascade can still be
    // settling when the click lands (the 2026-10-30 flake audit's
    // FLAKE 5 — the repainted note raced this read under load)
    await waitFor(() => expect(screen.queryByTestId('lane-strike-note')).toBeNull())
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
