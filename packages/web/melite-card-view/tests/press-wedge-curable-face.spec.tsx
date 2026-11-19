// @vitest-environment happy-dom
// press-wedge-curable-face.spec.tsx — CONTRACTS §4 debt 5's wall (the
// press-path F6 cure, triage §C 2026-10-31): a family switch whose
// tombstone null-write fails (door down / CAS-exhausted under a
// second author) leaves the stale key on the row (the compose gate
// refuses), in failedKeys (this ledger refuses), undeclared by the
// arrival's form (can't retype), and reconcile-kept (the held row
// still carries the key) — every later press refused with NO curable
// face. THE CURE (the refusal states its cure): the press refusal
// names the ghost keys no field can author and the strip mounts the
// re-offer-null affordance per ghost — the SD-7 unstamp verb
// (patchStageParamsChained, the one key's JSON Merge Patch null), the
// debt's "re-offer the null" shape. The debt's other shape ("drop the
// ghost" locally) is NOT lawful at this seam and the cure comment at
// stage-drill.tsx (the strip's affordance block) records why: the
// press composes from the served row, so a local-only drop would let
// a run leave over a doc the ghost still poisons (the one-truth press
// law — the presenter owns no second copy of the bench row).
//
// THE TOGGLE (the receipt's instruction): short-circuit
// unlandedGhostKeys (draft.ts) to `return []` — one seam kills the
// whole curable face (the sentence derives from it, the fence's
// curable candidates derive from it, and the strip's affordance set
// derives from it). With the toggle in, ARMS 1-3 RED: arm 1 on the
// missing ghost sentence, arm 2 on the missing affordance, arm 3 on
// the missing sentence at the fence seat. Restore: all green.
//
// Harness: the ONE estate fake (estate-harness.ts — stroke 81's
// one-lane law) + the direct StageDrill mount the re-point rows use
// (stage-drill-gates.spec.tsx DRILL a): real form-spec doors, real
// ledger, real Model-rail pick, scripted door-down throws.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote, schemaEnvelope } from '@melite/card-base/client';
import { resetStageWrites, stageWriteState } from "../src/client/draft.ts";
import { StageDrill } from "../src/client/stage-drill.tsx";
import type { BenchStageView } from "../src/client/cards-resource.ts";
import { draftIdOf } from '@melite/contracts/benchStage';

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  resetStageWrites();
  vi.unstubAllGlobals();
});

let fakes: EstateFakes | null = null;
const servedFamilies: string[] = [];

/** The departing family: its schema declares the departed knob
 *  (double_reference — the B8 burn's own key) and a Variant axis. */
function wedgeADoc(): Record<string, unknown> {
  return {
    form: 'image-gen', genre: 'image', engine: 'comfyui', model: 'wedge-a',
    schema: schemaEnvelope({
      prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
      model: { consts: ['wedge-a', 'wedge-b-1536'], meta: { description: 'Serving family', default: 'wedge-a', extra: { wtype: 'select' } } },
      double_reference: { type: 'boolean', meta: { description: 'Double reference', default: false } },
    }),
    variants: [
      { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: {}, route: 'turbo',
        sampler_envelope: { steps: [1, 50], cfg: [1, 2] } },
    ],
  };
}

/** The arrival: no double_reference field — the stale key has no
 *  widget, so no retype can land it (the debt's "undeclared").
 *  `arrivalLanes` seats the doc's lane surface for the fence-seat arm
 *  only: the reopen heal (dropStaleReopenCarry) derives from the
 *  RESOLVED surface and never fires on a laneless doc (spec.ts:
 *  resolvedLaneSurface returns null), so arms 1-2 keep the switch's
 *  own write graph — no extra heal call on their scripted outage. */
function wedgeBDoc(arrivalLanes?: boolean): Record<string, unknown> {
  return {
    form: 'image-gen', genre: 'image', engine: 'comfyui', model: 'wedge-b',
    ...(arrivalLanes ? { lanes: { base: ['prompt'] } } : {}),
    schema: schemaEnvelope({
      prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
      model: { consts: ['wedge-a', 'wedge-b-1536'], meta: { description: 'Serving family', default: 'wedge-b', extra: { wtype: 'select' } } },
    }),
    variants: [
      { id: 'fast', label: 'Fast', group: 'Variant', defaults: {}, route: 'fast',
        sampler_envelope: { steps: [1, 30], cfg: [1, 10] } },
    ],
  };
}

function stubSpecDocs(arrivalLanes?: boolean): void {
  servedFamilies.length = 0;
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      const key = path.split("model=")[1] ?? "";
      servedFamilies.push(key);
      const doc = key.startsWith("wedge-b") ? wedgeBDoc(arrivalLanes) : wedgeADoc();
      return new Response(JSON.stringify(doc), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({ "image-gen": { outputs: { default: "image" } } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error("unexpected door on the fetch lane: " + path);
  });
}

const stageRow = (params: Record<string, unknown>): BenchStageView =>
  ({ id: "s_0", card: "image-gen", engine: "comfyui", params });

interface DrillMount { runs: () => number; bound: () => void }

function mountDrill(stage: BenchStageView, throws?: unknown[]): DrillMount {
  fakes?.unmount();
  fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [stage] },
    draftStages: [stage as unknown as Record<string, unknown>],
    draftBenchRev: 1,
    throws: throws as never,
  });
  let runs = 0;
  let bound: () => void = () => { throw new Error("bindRun never fired"); };
  render(h(StageDrill, {
    stage,
    bench: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [stage], sessionKey: "main" },
    running: false,
    onRun: () => { runs += 1; }, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
    onPatchParams: () => {},
    renderStageView: (_o: unknown, fallback: unknown) => fallback,
    bindRun: (r: () => void) => { bound = r; },
  } as never));
  return { runs: () => runs, bound: () => { bound(); } };
}

function patchCalls(): Array<Record<string, unknown>> {
  if (fakes === null) throw new Error("estate fakes not mounted");
  return fakes.calls.filter((c) => c.method === "drafts/patch").map((c) => c.args as Record<string, unknown>);
}

function patchParamsOf(calls_: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return calls_.map((c) => ((c["patch"] as Record<string, unknown>)?.["params"] ?? {}) as Record<string, unknown>);
}

async function awaitWriteSettled(): Promise<void> {
  await waitFor(() => {
    if (stageWriteState(draftIdOf("bench-p"), "s_0").pending !== 0) throw new Error("write still in flight");
  }, { timeout: 8000 });
}

function errorStrip(): string | null {
  return document.querySelector('[data-testid="stage-error-strip"]')?.textContent ?? null;
}

function failedKeys(): string[] {
  return stageWriteState(draftIdOf("bench-p"), "s_0").failedKeys;
}

/** The wedge mount: open on wedge-a, pick the arrival through the
 *  Model rail while the patch door is DOWN — the pick's whole frame
 *  (model + variant axis clear) fails, and the departed scalar's
 *  tombstone null rides the flush that follows. */
async function mountAndPickUnderDownedDoor(mount: DrillMount): Promise<void> {
  await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
  const knob = await screen.findByLabelText("Serving family", {}, { timeout: 4000 });
  fireEvent.click(knob);
  fireEvent.click(screen.getByRole("menuitem", { name: "Wedge B 1536" }));
  await waitFor(() => {
    const frame = patchParamsOf(patchCalls()).find((p) => p["model"] === "wedge-b-1536");
    if (frame === undefined) throw new Error("re-point write not attempted; patches: " + JSON.stringify(patchCalls()));
  }, { timeout: 8000 });
  await awaitWriteSettled();
  // the arrival spec settled — the press must never fence on the
  // pending window, only on the wedge itself
  await waitFor(() => {
    if (!servedFamilies.some((k) => k.startsWith("wedge-b"))) throw new Error("arrival spec not fetched; fetched: " + JSON.stringify(servedFamilies));
  }, { timeout: 8000 });
  void mount;
}

describe("THE PRESS WEDGE'S CURABLE FACE (CONTRACTS §4 debt 5): a failed tombstone null-write refuses every later press until the refusal names its cure and the cure is one press away", () => {
  test("ARM 1 — the wedge reproduces: the failed family-switch write leaves the stale key refused and the press's refusal NAMES the curable action (re-offer the null for exactly that key)", async () => {
    stubSpecDocs();
    // the door is down for the pick AND the press's own flush write
    // (two patch calls — the debt's door-down shape)
    const mount = mountDrill(stageRow({ model: "wedge-a", prompt: "keep the handwriting", double_reference: true }), [
      { method: "drafts/patch", onCall: 1, message: "wedge door down (faked outage)" },
      { method: "drafts/patch", onCall: 2, message: "wedge door down (faked outage)" },
    ]);
    await mountAndPickUnderDownedDoor(mount);
    // THE PICK'S FRAME REFUSED WHOLE: the ledger holds the switch's
    // every key — the re-point, the departed axis, the departing
    // envelope vocabulary — and the row's tombstone null has not
    // ridden anything yet (it rides the press's own flush).
    expect(failedKeys()).toEqual(["model", "variant", "steps", "cfg"]);
    // the arrival's form cannot restate the stale key (the form has
    // no such field — the schema floor, asserted so the ghost
    // judgment is never vacuous),
    expect(screen.queryByLabelText("Double reference")).toBeNull();
    // and the press refuses.
    mount.bound();
    await waitFor(() => {
      if (errorStrip() === null) throw new Error("press did not refuse; patches: " + JSON.stringify(patchCalls()));
    }, { timeout: 8000 });
    await awaitWriteSettled();
    // THE WEDGE STATE (the debt's faces, in order): the press's own
    // flush re-offered the tombstone (the null rode the refused
    // write) — so the row still carries the stale key,
    expect(patchParamsOf(patchCalls()).some((p) => p["double_reference"] === null)).toBe(true);
    // the ledger refuses on it (the pick's keys plus the flush's),
    expect(failedKeys()).toEqual(["model", "variant", "steps", "cfg", "double_reference"]);
    const strip = errorStrip() ?? "";
    // THE WRITE DID NOT LAND — the row's voice, unchanged...
    expect(strip).toContain("THE WRITE DID NOT LAND");
    expect(strip).toContain("unlanded keys: model, variant, steps, cfg, double_reference");
    // ...plus THE CURABLE FACE: the refusal names EVERY ghost (the
    // envelope's steps/cfg nulls failed with the same write and no
    // field of the arrival states them either) and mounts the
    // re-offer-null affordance beside each name.
    expect(strip).toContain("Ghost key(s) 'steps', 'cfg', 'double_reference' are a departed family's leftover");
    expect(strip).toContain("The curable action: re-offer the null write");
    expect(screen.getByRole("button", { name: "Re-offer null 'double_reference'" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Re-offer null 'steps'" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Re-offer null 'cfg'" })).toBeTruthy();
    // ACCURACY (the assertion guards exactly the invariant): the
    // authorable failed keys keep their own cure (retype / re-pick) —
    // the model rides the rail, the variant rides the axis — so the
    // ghost sentence never names them.
    expect(strip).not.toContain("'model', 'variant'");
  });

  test("ARM 2 — the curable action clears it: each offered re-offer writes exactly its own tombstone delete, and once the authorable keys take their own cures the next press composes", async () => {
    stubSpecDocs();
    const mount = mountDrill(stageRow({ model: "wedge-a", prompt: "keep the handwriting", double_reference: true }), [
      { method: "drafts/patch", onCall: 1, message: "wedge door down (faked outage)" },
      { method: "drafts/patch", onCall: 2, message: "wedge door down (faked outage)" },
    ]);
    await mountAndPickUnderDownedDoor(mount);
    mount.bound();
    await waitFor(() => { if (errorStrip() === null) throw new Error("press did not refuse"); }, { timeout: 8000 });
    await awaitWriteSettled();
    // THE DOOR ANSWERS AGAIN (the outage was faked and is over) — the
    // offered act is the operator's cure, not another press: take
    // every offered re-offer, keyed off the ledger's still-failed
    // ghosts. THE STRIP PERSISTENCE IS PART OF THE CURE: each
    // still-failed ghost's affordance must stay mounted after its
    // neighbor's cure (a face that dies after its first click would
    // re-form the wedge here).
    const curedGhosts = new Set<string>();
    for (let taken = 0; taken < 8; taken += 1) {
      const nextGhost = failedKeys().find((k) => !curedGhosts.has(k) && k !== "model" && k !== "variant");
      if (nextGhost === undefined) break;
      const label = "Re-offer null '" + nextGhost + "'";
      const affordance = screen.queryByRole("button", { name: label });
      if (affordance === null) throw new Error("the cure face died: no affordance for the still-failed ghost '" + nextGhost + "'");
      curedGhosts.add(nextGhost);
      fireEvent.click(affordance);
      await awaitWriteSettled();
    }
    // exactly each ghost's own null — the tombstone deletes the
    // failed family switch still owed, no other key dragged along
    expect(patchParamsOf(patchCalls())
      .filter((p) => Object.keys(p).length === 1 && p[Object.keys(p)[0]] === null)
      .map((p) => Object.keys(p)[0])
      .sort()).toEqual(["cfg", "double_reference", "steps"]);
    // the ledger dropped every ghost's memory — the uncurable faces
    // are gone; what refuses now is authorable only
    expect(failedKeys()).toEqual(["model", "variant"]);
    // THE AUTHORABLE KEYS KEEP THEIR OWN CURE (the debt's boundary):
    // the model rides the next press's flush; the variant axis rides
    // its knob — the settle retired the dead family's axis touch (no
    // such key on the held row), so the re-pick is the cure, and it
    // must land before the fence passes.
    const variantKnob = await screen.findByLabelText("Variant", {}, { timeout: 4000 });
    fireEvent.click(variantKnob);
    fireEvent.click(screen.getByRole("menuitem", { name: "Fast" }));
    await waitFor(() => {
      if (!patchParamsOf(patchCalls()).some((p) => p["variant"] === "fast")) {
        throw new Error("variant re-pick write not attempted; patches: " + JSON.stringify(patchParamsOf(patchCalls())));
      }
    }, { timeout: 8000 });
    await awaitWriteSettled();
    // THE NEXT PRESS COMPOSES: the press re-offers its own session's
    // still-owed writes (the model re-point, the tombstone) through
    // the healed door, the fence passes, the start fires.
    mount.bound();
    await awaitWriteSettled();
    await waitFor(() => {
      if (mount.runs() !== 1) throw new Error("the cured press did not compose; runs: " + String(mount.runs()) + "; strip: " + errorStrip());
    }, { timeout: 8000 });
    expect(failedKeys()).toEqual([]);
    expect(errorStrip()).toBeNull();
  });

  test("ARM 3 — the fence seat's wedge: a stale-session ghost the flush cannot author refuses at the run gate, names its cure, and the offered null lands it", async () => {
    // THE SECOND-AUTHOR SHAPE (the debt's CAS-exhausted arm): the row
    // arrives already on the arrival family with the stale key aboard
    // — the prior session's tombstone never landed. The open heal
    // (dropStaleReopenCarry — the drill's own null for off-surface
    // carry; it needs the doc's lane surface to resolve) is the FIRST
    // patch call and the door eats it: the heal fails, droppedRef
    // carries the verdict, the reconcile keeps the failure (the held
    // row still carries the key), and the seed's copy in the user map
    // is the DRILL'S word, not a hand's.
    stubSpecDocs(true);
    const mount = mountDrill(stageRow({ model: "wedge-b", prompt: "carry over", double_reference: true }), [
      { method: "drafts/patch", onCall: 1, message: "wedge door down (faked outage)" },
    ]);
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    await awaitWriteSettled();
    // the heal was attempted and refused — the ledger holds the ghost
    await waitFor(() => {
      if (!failedKeys().includes("double_reference")) throw new Error("the refused heal left no ledger memory; patches: " + JSON.stringify(patchCalls()));
    }, { timeout: 8000 });
    // THE FENCE REFUSES (the flush patch is EMPTY: the seed's copy
    // sits in the user map, so no null rides the press — the ghost is
    // unreachable by typing and by the flush) — and names the cure.
    mount.bound();
    await waitFor(() => {
      const strip = errorStrip();
      if (strip === null) throw new Error("the fence did not refuse");
      if (!strip.includes("Ghost key(s) 'double_reference' is")) throw new Error("fence refusal names no ghost: " + strip);
    }, { timeout: 8000 });
    expect(screen.getByRole("button", { name: "Re-offer null 'double_reference'" })).toBeTruthy();
    // THE OFFERED NULL LANDS: the ghost leaves the row and the user
    // map (the de-author — the seed's copy was the drill's verdict),
    // and the next press composes clean.
    fireEvent.click(screen.getByRole("button", { name: "Re-offer null 'double_reference'" }));
    await awaitWriteSettled();
    expect(failedKeys()).not.toContain("double_reference");
    mount.bound();
    await awaitWriteSettled();
    await waitFor(() => {
      if (mount.runs() !== 1) throw new Error("the cured fence press did not compose; runs: " + String(mount.runs()) + "; strip: " + errorStrip());
    }, { timeout: 8000 });
    expect(failedKeys()).toEqual([]);
  });
});
