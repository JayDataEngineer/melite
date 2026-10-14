// @vitest-environment happy-dom
// stage-drill-gates.spec.tsx — the drill's compose-gate and
// write-face seats (the batch-14 burn-down): the axis-unset
// authoring law, the atomic pick's gate and both promise halves,
// the enhance sweep's write seat, and the run seat's full-doc sync
// gate. One fixture family throughout: a krea-2 spec whose Variant
// rows carry an envelope-violating default (raw → cfg 99 against
// [1,2]) and a Quant-junk bench row for the unknown-quant clause.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote, schemaEnvelope } from '@melite/card-base/client';
import { resetStageWrites, stageWriteState } from "../src/client/draft.ts";
import { StageDrill, dedupWalkSet } from "../src/client/stage-drill.tsx";
import { CardsTab } from "../src/client/CardsTab.tsx";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  resetStageWrites();
  vi.unstubAllGlobals();
});

type EstateOpts = Parameters<typeof mountEstateFakes>[0];

let fakes: EstateFakes | null = null;
let resolveEnhance: ((body: unknown, status: number) => void) | null = null;

function calls(): EstateFakes["calls"] {
  if (fakes === null) throw new Error("estate fakes not mounted");
  return fakes.calls;
}

/** The krea-2 axis fixture: Turbo composes clean, Raw carries a
 * cfg:99 default against its own [1,2] envelope — the pick that
 * stamps it is exactly the half-switch marriage the gate exists to
 * refuse at the studio before the door ever sees it. */
function axisSpecDoc(): Record<string, unknown> {
  return {
    form: 'image-gen', genre: 'image', engine: 'comfyui', model: 'krea-2',
    schema: schemaEnvelope({
      prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
      variant: { type: 'string', meta: { description: 'Variant override' } },
      input_image: { type: 'image', meta: { description: 'Input image' } },
    }),
    variants: [
      { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: {}, route: 'turbo',
        sampler_envelope: { steps: [1, 50], cfg: [1, 2] } },
      { id: 'raw', label: 'Raw', group: 'Variant', defaults: { cfg: 99 }, route: 'raw',
        sampler_envelope: { steps: [1, 50], cfg: [1, 2] } },
    ],
  };
}

function stubFetch(): void {
  const impl = globalThis.fetch;
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify(axisSpecDoc()), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({
        "image-gen": { outputs: { default: "image" } },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path === "/melite-tools/enhance") {
      return new Promise<Response>((resolve) => {
        resolveEnhance = (body: unknown, status: number) => resolve(new Response(
          typeof body === "string" ? body : JSON.stringify(body),
          { status, headers: { "content-type": "application/json" } },
        ));
      });
    }
    return (impl as typeof fetch)(url as string, init);
  });
}

function mountBench(stages: BenchStageView[], estate?: EstateOpts): void {
  stubFetch();
  fakes?.unmount();
  fakes = mountEstateFakes({
    benchDoc: {
      draft_id: "bench-p", rev: 1, log: [],
      stages: stages.map((s) => ({ ...s, run_status: (s as { runStatus?: string }).runStatus })),
    },
    draftStages: stages as Array<Record<string, unknown>>,
    draftBenchRev: 1,
    throws: estate?.throws,
    patchFailures: estate?.patchFailures,
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages } as unknown as CardsBenchValue }),
  }));
}

const stage = (params: Record<string, unknown>): BenchStageView =>
  ({ id: "s_0", card: "image-gen", engine: "comfyui", params });

/** The direct-drill mount: one bench, two stages, the drill on s_0 —
 * shared by the re-target rows (the same instance re-renders onto
 * s_1) and the voice rows (a plain mount over the refusing door). */
function drillProps(s: BenchStageView, bind?: (v: () => Promise<void> | void) => void): Record<string, unknown> {
  return {
    stage: s,
    bench: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [stage({ model: "krea-2" }), { id: "s_1", card: "image-gen", engine: "comfyui", params: { model: "krea-2" } }], sessionKey: "main" },
    running: false,
    onRun: () => {}, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
    onPatchParams: () => {},
    renderStageView: (_o: unknown, fallback: unknown) => fallback,
    ...(bind !== undefined ? { bindEnhance: bind } : {}),
  };
}

async function openDrill(): Promise<void> {
  const user = userEvent.setup();
  const tile = document.querySelector('button[class*="tileInner"]') as HTMLElement;
  await user.click(tile);
  await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
  await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
}

async function typePrompt(text: string): Promise<void> {
  const user = userEvent.setup();
  const area = document.querySelector("textarea");
  if (area === null) throw new Error("prompt field not found");
  await user.type(area, text);
}

function pressEnhance(): void {
  // the zoomed seat wraps the drill in the zoom card; a direct mount
  // (the re-target rows) renders bare — the document is the scope.
  const zoom = document.querySelector('div[class*="zoomCard"]');
  const scope = zoom !== null ? within(zoom as HTMLElement) : screen;
  fireEvent.click(scope.getByRole("button", { name: "Agent Enhance" }));
}

async function pressRun(): Promise<void> {
  const zoom = document.querySelector('div[class*="zoomCard"]') as HTMLElement;
  const user = userEvent.setup();
  await user.click(within(zoom).getByRole("button", { name: "Run stage" }));
}

function writeFace(): string | null {
  return document.querySelector('[data-testid="stage-write-face"]')?.textContent ?? null;
}

function patchCalls(): Array<Record<string, unknown>> {
  return calls().filter((c) => c.method === "drafts/patch").map((c) => c.args as Record<string, unknown>);
}

/** The clean-settle observation (not a sleep): the ledger's inflight
 * drop is visible to a poll only after the write's own microtask
 * chain — the ledger's handler, then the drill's .then — has run,
 * so the banner-free settle face below is asserted settled, not
 * merely absent. */
async function awaitWriteSettled(): Promise<void> {
  await waitFor(() => {
    if (stageWriteState("bench-p", "s_0").pending !== 0) throw new Error("write still in flight");
  }, { timeout: 8000 });
}

describe("the axis-unset authoring law (an empty axis is unstated, never stated-empty)", () => {
  test("clearing an axis field to '' deletes the user key and writes null — the gate passes, the door hears the delete", async () => {
    mountBench([stage({ model: "krea-2" })]);
    await openDrill();
    const field = await screen.findByLabelText("Variant override", {}, { timeout: 4000 });
    fireEvent.change(field, { target: { value: "raw" } });
    fireEvent.change(field, { target: { value: "" } });
    await waitFor(() => {
      const landed = patchCalls().some((c) => {
        const patch = c["patch"] as Record<string, unknown>;
        const params = patch?.["params"] as Record<string, unknown> | undefined;
        if (params === undefined || !("variant" in params)) return false;
        return params["variant"] === null;
      });
      if (!landed) throw new Error("no variant-null write yet; patches: " + JSON.stringify(patchCalls()));
    }, { timeout: 8000 });
    await awaitWriteSettled();
    expect(writeFace()).toBe(null);
  });

  test("an axis-unset write landing over a stale failed key speaks the unlanded banner", async () => {
    mountBench([stage({ model: "krea-2" })], { patchFailures: [{ reason: "engine busy" }] });
    await openDrill();
    // the FIRST write (typed prompt) fails and its key stays in the
    // ledger — the later axis delete lands clean but cannot erase it
    await typePrompt("a red cube");
    await waitFor(() => { expect(patchCalls().length).toBeGreaterThan(0); }, { timeout: 8000 });
    const field = await screen.findByLabelText("Variant override", {}, { timeout: 4000 });
    fireEvent.change(field, { target: { value: "turbo" } });
    fireEvent.change(field, { target: { value: "" } });
    await waitFor(() => {
      const face = writeFace();
      if (face === null || !face.includes("THE WRITE DID NOT LAND")) {
        throw new Error("banner not voiced yet; face: " + face);
      }
    }, { timeout: 8000 });
    // the face may be the prompt write's own banner (:378) — settle
    // the axis-unset write too, so ITS seat's true arm runs before
    // the file's coverage snapshot
    // the face may be the prompt write's own banner — wait for the
    // coalesced null write to actually FIRE (the trailing window can
    // outlive the prompt settle), then for its settle, so the
    // axis-unset seat's own true arm runs before the snapshot
    await waitFor(() => {
      const fired = patchCalls().some((c) => {
        const params = (c["patch"] as Record<string, unknown>)?.["params"] as Record<string, unknown> | undefined;
        if (params?.["variant"] !== null) return false;
        return true;
      });
      if (!fired) throw new Error("axis null write not fired yet");
    }, { timeout: 8000 });
    await awaitWriteSettled();
    expect(writeFace()).toContain("unlanded keys: prompt");
  });

  test("clearing a pristine axis field (the key never held) is a no-op on the user map, a delete on the wire", async () => {
    mountBench([stage({ model: "krea-2" })]);
    await openDrill();
    const field = await screen.findByLabelText("Variant override", {}, { timeout: 4000 });
    // the user map never gained 'variant' — the unset walks the
    // has-never-been-stated arm (same delete, no state churn)
    fireEvent.change(field, { target: { value: "" } });
    await waitFor(() => {
      const landed = patchCalls().some((c) => {
        const params = (c["patch"] as Record<string, unknown>)?.["params"] as Record<string, unknown> | undefined;
        return params?.["variant"] === null;
      });
      if (!landed) throw new Error("no variant-null write yet");
    }, { timeout: 8000 });
    await awaitWriteSettled();
    expect(writeFace()).toBe(null);
  });

  test("an axis-unset whose composed doc the gate refuses never writes", async () => {
    mountBench([stage({ model: "krea-2", quant: "fp16" })]);
    await openDrill();
    const field = await screen.findByLabelText("Variant override", {}, { timeout: 4000 });
    fireEvent.change(field, { target: { value: "raw" } });
    fireEvent.change(field, { target: { value: "" } });
    await waitFor(() => {
      const face = writeFace();
      if (face === null || !face.includes("THE COMPOSE GATE REFUSED")) {
        throw new Error("gate face not voiced yet; face: " + face);
      }
    }, { timeout: 8000 });
    expect(writeFace()).toContain("quant");
    expect(patchCalls()).toEqual([]);
  });

  test("a stage with null params walks the same seats (held falls to the empty doc)", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: null } as unknown as BenchStageView]);
    await openDrill();
    const field = await screen.findByLabelText("Variant override", {}, { timeout: 4000 });
    fireEvent.change(field, { target: { value: "" } });
    await waitFor(() => {
      const landed = patchCalls().some((c) => {
        const params = (c["patch"] as Record<string, unknown>)?.["params"] as Record<string, unknown> | undefined;
        return params?.["variant"] === null;
      });
      if (!landed) throw new Error("no variant-null write yet");
    }, { timeout: 8000 });
    await awaitWriteSettled();
    expect(writeFace()).toBe(null);
  });
});

describe("the atomic pick's compose gate (the marriage judged before the wire)", () => {
  test("a pick whose defaults fall outside the route envelope refuses in the studio — no door write at all", async () => {
    mountBench([stage({ model: "krea-2" })]);
    await openDrill();
    const select = await screen.findByLabelText("Variant", {}, { timeout: 4000 });
    fireEvent.change(select, { target: { value: "raw" } });
    await waitFor(() => {
      const face = writeFace();
      if (face === null || !face.includes("THE COMPOSE GATE REFUSED")) {
        throw new Error("gate face not voiced yet; face: " + face);
      }
    }, { timeout: 8000 });
    expect(writeFace()).toContain("cfg");
    expect(patchCalls()).toEqual([]);
  });

  test("a pick landing over a stale failed key speaks the unlanded banner (the promise's OK half)", async () => {
    mountBench([stage({ model: "krea-2" })], { patchFailures: [{ reason: "engine busy" }] });
    await openDrill();
    await typePrompt("a red cube");
    await waitFor(() => { expect(patchCalls().length).toBeGreaterThan(0); }, { timeout: 8000 });
    const select = await screen.findByLabelText("Variant", {}, { timeout: 4000 });
    fireEvent.change(select, { target: { value: "turbo" } });
    await waitFor(() => {
      const face = writeFace();
      if (face === null || !face.includes("THE WRITE DID NOT LAND")) {
        throw new Error("banner not voiced yet; face: " + face);
      }
    }, { timeout: 8000 });
    expect(writeFace()).toContain("unlanded keys: prompt");
  });

  test("a door write that rejects speaks the same banner (the promise's refusal half)", async () => {
    mountBench([stage({ model: "krea-2", variant: "raw" })], { throws: [{ method: "drafts/patch" }] });
    await openDrill();
    const select = await screen.findByLabelText("Variant", {}, { timeout: 4000 });
    fireEvent.change(select, { target: { value: "turbo" } });
    await waitFor(() => {
      const face = writeFace();
      if (face === null || !face.includes("THE WRITE DID NOT LAND")) {
        throw new Error("banner not voiced yet; face: " + face);
      }
    }, { timeout: 8000 });
    // the pick carried only the variant key — it is the unlanded one
    expect(writeFace()).toContain("variant");
  });
});

// ── WRITES SETTLING AFTER A RE-TARGET (the 2026-11-02 one-voice
// audit's H-5/H-6): every write half — the typed edit's settle, the
// pick's then — holds its alive guard. The seam: the run-view seat
// mounts StageDrill without a stage key, so one instance can show a
// new stage while a write is still parked at the door. Each half
// gets its OWN firing arm (the split-brain lesson: one guarded path
// can mask another's missing guard). ─────────────────────────────
describe("writes settling after a re-target (each half's own guard)", () => {
  const stageB: BenchStageView = { id: "s_1", card: "image-gen", engine: "comfyui", params: { model: "krea-2" } };

  test("a TYPED write settling after a re-target stands down (the then-half's guard, residue drive)", async () => {
    // THE THEN FAILURE ARM'S DRIVE LAW (the split-brain lesson): a
    // rejecting write exercises the CATCH half — the THEN half wants
    // the banner only when the row holds RESIDUE (an earlier key's
    // failure) while THIS write lands clean. So: variant fails
    // first, the prompt write parks at the door, the seat moves,
    // the prompt lands — the then-half reads failedKeys>0 and wants
    // to voice; the guard is the only thing holding it off s_1.
    let gateCalls = 0;
    let release: (() => void) | undefined;
    const gate = (): Promise<void> => {
      gateCalls += 1;
      if (gateCalls === 1) return Promise.resolve();
      return new Promise<void>((resolve) => { release = resolve; });
    };
    stubFetch();
    fakes?.unmount();
    fakes = mountEstateFakes({ patchGate: gate, patchFailures: [{ reason: "variant busy" }] });
    const view = render(h(StageDrill, drillProps(stage({ model: "krea-2" })) as never));
    const variantField = await screen.findByLabelText("Variant override", {}, { timeout: 4000 });
    fireEvent.change(variantField, { target: { value: "raw" } });
    await waitFor(() => { expect(patchCalls().length).toBe(1); }, { timeout: 8000 });
    // the residue is on the row before the parked write exists
    await waitFor(() => {
      expect(stageWriteState("bench-p", "s_0").failedKeys).toContain("variant");
    }, { timeout: 8000 });
    await typePrompt("a red cube");
    await waitFor(() => { expect(patchCalls().length).toBe(2); }, { timeout: 8000 });
    // the re-target while the typed write is parked at the door
    view.rerender(h(StageDrill, drillProps(stageB) as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    release?.();
    await waitFor(() => {
      if (stageWriteState("bench-p", "s_0").pending !== 0) throw new Error("typed write still parked");
    }, { timeout: 8000 });
    // the clean landing cleared ONLY its own key — variant's failure
    // is residue the then-half wants to voice onto the NEW seat; the
    // guard holds it. The row keeps the truth for s_0's return.
    expect(writeFace()).toBe(null);
    expect(stageWriteState("bench-p", "s_0").failedKeys).toContain("variant");
  });

  test("a PICK settling after a re-target stands down (the pick then-half's guard, residue drive)", async () => {
    // same law, the pick's own firing arm — and the residue must sit
    // on a key THE PICK DOES NOT CARRY (a pick's clean landing
    // clears its own keys; residue on the picked key would vanish at
    // the same settle the guard holds). The prompt write fails
    // (residue), the atomic pick parks at the door, the seat moves,
    // the pick lands clean — its then-half reads the surviving
    // prompt failure and wants the banner on the new seat; the guard
    // holds it.
    let gateCalls = 0;
    let release: (() => void) | undefined;
    const gate = (): Promise<void> => {
      gateCalls += 1;
      if (gateCalls === 1) return Promise.resolve();
      return new Promise<void>((resolve) => { release = resolve; });
    };
    stubFetch();
    fakes?.unmount();
    fakes = mountEstateFakes({ patchGate: gate, patchFailures: [{ reason: "prompt busy" }] });
    const view = render(h(StageDrill, drillProps(stage({ model: "krea-2", variant: "raw" })) as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    await waitFor(() => { expect(patchCalls().length).toBe(1); }, { timeout: 8000 });
    // the residue is on the row before the pick exists
    await waitFor(() => {
      expect(stageWriteState("bench-p", "s_0").failedKeys).toContain("prompt");
    }, { timeout: 8000 });
    const select = await screen.findByLabelText("Variant", {}, { timeout: 4000 });
    fireEvent.change(select, { target: { value: "turbo" } });
    await waitFor(() => { expect(patchCalls().length).toBe(2); }, { timeout: 8000 });
    view.rerender(h(StageDrill, drillProps(stageB) as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    release?.();
    await waitFor(() => {
      if (stageWriteState("bench-p", "s_0").pending !== 0) throw new Error("pick write still parked");
    }, { timeout: 8000 });
    // the pick landed clean (variant never failed) — the row still
    // holds prompt's failure: exactly the residue the then-half
    // wants to voice onto the new seat. The guard holds it.
    expect(writeFace()).toBe(null);
    expect(stageWriteState("bench-p", "s_0").failedKeys).toContain("prompt");
  });

  test("an AXIS-UNSET write settling after a re-target stands down (the unset then-half's own guard)", async () => {
    // the third then-half (stage-drill.tsx's axis-unset arm — typing
    // '' on an axis key rides a null DELETE): residue on prompt (a
    // key the axis-unset never carries), the '' gesture parks its
    // null write at the door, the seat moves, the write lands clean
    // — the then-half reads the surviving prompt failure and wants
    // the banner on the new seat; the guard holds it.
    let gateCalls = 0;
    let release: (() => void) | undefined;
    const gate = (): Promise<void> => {
      gateCalls += 1;
      if (gateCalls === 1) return Promise.resolve();
      return new Promise<void>((resolve) => { release = resolve; });
    };
    stubFetch();
    fakes?.unmount();
    fakes = mountEstateFakes({ patchGate: gate, patchFailures: [{ reason: "prompt busy" }] });
    const view = render(h(StageDrill, drillProps(stage({ model: "krea-2", variant: "raw" })) as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    await waitFor(() => { expect(patchCalls().length).toBe(1); }, { timeout: 8000 });
    await waitFor(() => {
      expect(stageWriteState("bench-p", "s_0").failedKeys).toContain("prompt");
    }, { timeout: 8000 });
    const variantField = await screen.findByLabelText("Variant override", {}, { timeout: 4000 });
    fireEvent.change(variantField, { target: { value: "" } });
    await waitFor(() => { expect(patchCalls().length).toBe(2); }, { timeout: 8000 });
    view.rerender(h(StageDrill, drillProps(stageB) as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    release?.();
    await waitFor(() => {
      if (stageWriteState("bench-p", "s_0").pending !== 0) throw new Error("axis-unset write still parked");
    }, { timeout: 8000 });
    // the null DELETE landed clean (variant never failed) — prompt's
    // failure is exactly the residue the then-half wants to voice
    // onto the new seat. The guard holds it; s_0's row keeps truth.
    expect(writeFace()).toBe(null);
    expect(stageWriteState("bench-p", "s_0").failedKeys).toContain("prompt");
  });

  test("a PICK's REJECTION settling after a re-target stands down (the pick catch-half's own guard)", async () => {
    // the catch voices on ITS OWN rejection — no residue drive: the
    // law under test is the face never paints the seat the drill now
    // shows. The pick parks at the door carrying its refusal; the
    // seat moves; the door answers NO; the catch wants the banner on
    // s_1 — the guard holds it, and s_0's row keeps the refusal.
    let gateCalls = 0;
    let release: (() => void) | undefined;
    const gate = (): Promise<void> => {
      gateCalls += 1;
      return new Promise<void>((resolve) => { release = resolve; });
    };
    stubFetch();
    fakes?.unmount();
    fakes = mountEstateFakes({ patchGate: gate, patchFailures: [{ reason: "variant busy" }] });
    const view = render(h(StageDrill, drillProps(stage({ model: "krea-2" })) as never));
    const select = await screen.findByLabelText("Variant", {}, { timeout: 4000 });
    fireEvent.change(select, { target: { value: "turbo" } });
    await waitFor(() => { expect(patchCalls().length).toBe(1); }, { timeout: 8000 });
    view.rerender(h(StageDrill, drillProps(stageB) as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    release?.();
    // the same never-paints law as the unset arm: judge after the
    // refusal records and the would-be paint has had its tick.
    await waitFor(() => {
      if (stageWriteState("bench-p", "s_0").lastError === null) throw new Error("pick refusal not recorded");
    }, { timeout: 8000 });
    await new Promise((resolve) => { setTimeout(resolve, 60); });
    expect(writeFace()).toBe(null);
    expect(stageWriteState("bench-p", "s_0").failedKeys).toContain("variant");
  });

  test("an UNSET (slot-empty) rejection settling after a re-target stands down (the slot catch-half's own guard)", async () => {
    // the Detach gesture rides onSet's slot-empty arm (form.tsx
    // coerces the detach to '' — the {[name]: null} DELETE, the
    // slot flush's empty half, stage-drill.tsx:499-519): its write
    // parks at the door carrying its refusal; the seat moves; the
    // door answers NO; the catch wants the banner on the new seat —
    // the guard holds it, and s_0's row keeps input_image for the
    // return. (onUnset's own slot arm at :610 stays
    // defensive-unreached: no current atom emits undefined on a
    // slot shape — the wire-null rides onWireSlot, recorded in
    // CONTRACTS §3.2.)
    let gateCalls = 0;
    let release: (() => void) | undefined;
    const gate = (): Promise<void> => {
      gateCalls += 1;
      return new Promise<void>((resolve) => { release = resolve; });
    };
    stubFetch();
    fakes?.unmount();
    fakes = mountEstateFakes({ patchGate: gate, patchFailures: [{ reason: "detach busy" }] });
    const view = render(h(StageDrill, drillProps(stage({ model: "krea-2", input_image: "/held.png" })) as never));
    const detach = await screen.findByRole("button", { name: "Detach Input image" }, { timeout: 4000 });
    fireEvent.click(detach);
    await waitFor(() => { expect(patchCalls().length).toBe(1); }, { timeout: 8000 });
    view.rerender(h(StageDrill, drillProps(stageB) as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    release?.();
    // THE NEVER-PAINTS LAW is judged AFTER the door's answer fully
    // propagates: the row's lastError lands before the rejection
    // reaches the catch, and one macrotask lets the would-be paint
    // render — asserting null any earlier passes while the banner is
    // still in flight (the racy-green the first cut of this arm
    // shipped).
    await waitFor(() => {
      if (stageWriteState("bench-p", "s_0").lastError === null) throw new Error("unset refusal not recorded");
    }, { timeout: 8000 });
    await new Promise((resolve) => { setTimeout(resolve, 60); });
    expect(writeFace()).toBe(null);
    expect(stageWriteState("bench-p", "s_0").failedKeys).toContain("input_image");
  });

  test("a WIRE-IN rejection settling after a re-target stands down (the wire catch-half's own guard)", async () => {
    // the wire send parks at the door carrying its refusal; the
    // seat moves; the door answers NO; the catch wants the banner
    // on the new seat — the guard holds it, and s_0's row keeps the
    // wired key. The owner object (onWireSlot at its heart) reaches
    // the renderStageView prop verbatim — captured here so the wire
    // verb is drivable on the same direct mount as every other
    // write half.
    let gateCalls = 0;
    let release: (() => void) | undefined;
    const gate = (): Promise<void> => {
      gateCalls += 1;
      return new Promise<void>((resolve) => { release = resolve; });
    };
    let wireOwner: { onWireSlot?: (slot: string, source: string | null) => void } | undefined;
    stubFetch();
    fakes?.unmount();
    fakes = mountEstateFakes({ patchGate: gate, patchFailures: [{ reason: "wire busy" }] });
    // the wire verb needs a PRIOR stage carrying a result — the drill
    // opens on s_1 with s_0 seeded done, retargets back to s_0.
    const done: BenchStageView =
      { id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "krea-2" }, result: { url: "/source.png" } };
    const open: BenchStageView = { id: "s_1", card: "image-gen", engine: "comfyui", params: { model: "krea-2" } };
    const bench = { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [done, open], sessionKey: "main" };
    const view = render(h(StageDrill, {
      ...drillProps(open),
      bench,
      renderStageView: (owner: unknown, fallback: unknown) => {
        wireOwner = owner as { onWireSlot?: (slot: string, source: string | null) => void };
        return fallback;
      },
    } as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    if (wireOwner?.onWireSlot === undefined) throw new Error("wire owner not captured");
    wireOwner.onWireSlot("input_image", "s_0");
    await waitFor(() => { expect(patchCalls().length).toBe(1); }, { timeout: 8000 });
    view.rerender(h(StageDrill, { ...drillProps(done), bench } as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    release?.();
    await waitFor(() => {
      if (stageWriteState("bench-p", "s_1").lastError === null) throw new Error("wire refusal not recorded");
    }, { timeout: 8000 });
    await new Promise((resolve) => { setTimeout(resolve, 60); });
    expect(writeFace()).toBe(null);
    expect(stageWriteState("bench-p", "s_1").failedKeys).toContain("input_image");
  });
});

describe("the unset's refused write and the run seat's refused sync — both speak the row's voice", () => {
  test("an UNSET (slot-empty) refusal speaks the row's voice on the write face (prefix, reason, unlanded key)", async () => {
    // THE SLOT-EMPTY ARM'S OWN JUDGE (the 2026-11-04 one-voice
    // finding F1): the Detach gesture rides the slot flush's empty
    // half — a real write issuance whose refusal must carry the
    // row's prefix, the door's reason, and the unlanded key, never
    // a bare dialect. Before this wall the slot catch could regress
    // to any string and stay green.
    stubFetch();
    fakes?.unmount();
    fakes = mountEstateFakes({ patchFailures: [{ reason: "detach busy" }] });
    render(h(StageDrill, drillProps(stage({ model: "krea-2", input_image: "/held.png" })) as never));
    const detach = await screen.findByRole("button", { name: "Detach Input image" }, { timeout: 4000 });
    fireEvent.click(detach);
    const face = await screen.findByTestId("stage-write-face", {}, { timeout: 4000 });
    expect(face.textContent).toContain("THE WRITE DID NOT LAND");
    expect(face.textContent).toContain("detach busy");
    expect(face.textContent).toContain("unlanded keys: input_image");
  });

  test("a refused RUN-seat sync write voices the row on the run strip (never a bare rejection)", async () => {
    // THE RUN SEAT'S SYNC CATCH (the 2026-11-04 one-voice finding
    // F2): the press flushes the full doc through the same door — a
    // refusal there is a WRITE failure, and the run strip (the
    // css.runError seat, NOT the write face) carries the LEDGER
    // ROW's voice, never a bare rejection string the row never
    // heard. The start never fires.
    //
    // THE DRIVE judges the catch's own voice: a single change event
    // (no per-key ticks — the trailing write never gets its window),
    // then the press — the flush is the FIRST door call, so the
    // catch fires while the ledger row is still the catch's own
    // stamp (the run fence never ran; nothing painted the face).
    stubFetch();
    fakes?.unmount();
    let runs = 0;
    let bound: () => void = () => { throw new Error("bindRun never fired"); };
    fakes = mountEstateFakes({ patchFailures: [{ reason: "sync busy" }] });
    const stageA = stage({ model: "krea-2" });
    const stageB2: BenchStageView = { id: "s_1", card: "image-gen", engine: "comfyui", params: { model: "krea-2" } };
    render(h(StageDrill, {
      stage: stageA,
      bench: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [stageA, stageB2], sessionKey: "main" },
      running: false,
      onRun: () => { runs += 1; }, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
      onPatchParams: () => {},
      renderStageView: (_o: unknown, fallback: unknown) => fallback,
      bindRun: (r: () => void) => { bound = r; },
    } as never));
    const area = await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    fireEvent.change(area, { target: { value: "a red cube" } });
    bound();
    const strip = await screen.findByText(/THE WRITE DID NOT LAND/, {}, { timeout: 8000 });
    // the strip seat, not the write face: the discrete face never
    // painted (no discrete write refused — this is the flush's own
    // refusal the strip voices).
    expect(strip.className).toMatch(/runError/);
    expect(strip.textContent).toContain("sync busy");
    // the full-doc flush carries every authored key — the row's list
    // names them all (the seed stamped model/variant too); the law
    // is prompt RIDES the unlanded list, never a key-less strip.
    expect(strip.textContent).toMatch(/unlanded keys: [^\n]*\bprompt\b/);
    expect(writeFace()).toBe(null);
    expect(runs).toBe(0);
  });

  test("a NON-write failure of the press (the host run verb throwing) voices the bare reason and resyncs", async () => {
    // THE CATCH'S OWN TWO DOORS: the write's throw never reaches the
    // 864 arm (the sync's inner catch voices the ledger row — the
    // test above owns that door); this arm drives the OTHER door —
    // the flush SUCCEEDS, the fence passes, and the host's onRun
    // verb itself throws. No ledger row exists for a host refusal,
    // so the bare reason IS the whole story (rejectionVoice), and
    // the drill asks the host to resync.
    stubFetch();
    fakes?.unmount();
    let resyncs = 0;
    let bound: () => void = () => { throw new Error("bindRun never fired"); };
    fakes = mountEstateFakes({});
    const stageA = stage({ model: "krea-2" });
    render(h(StageDrill, {
      stage: stageA,
      bench: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [stageA], sessionKey: "main" },
      running: false,
      onRun: () => { throw new Error("host run verb refused"); },
      onStop: () => {}, onClose: () => {}, onRemoved: () => {},
      onResync: () => { resyncs += 1; },
      onPatchParams: () => {},
      renderStageView: (_o: unknown, fallback: unknown) => fallback,
      bindRun: (r: () => void) => { bound = r; },
    } as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    fireEvent.change(screen.getByLabelText("Prompt"), { target: { value: "a red cube" } });
    bound();
    const strip = await screen.findByText(/host run verb refused/, {}, { timeout: 8000 });
    expect(strip.className).toMatch(/runError/);
    // a non-write failure asks the host to resync (the ledger row
    // that would voice it does not exist — the resync is the story)
    expect(resyncs).toBe(1);
    // the write face stays clean — the write landed; this throw was the host's
    expect(writeFace()).toBe(null);
  });
});

describe("the enhance sweep's write seat (what the studio shows is what the engine gets)", () => {
  test("a swept patch the gate refuses never reaches the door", async () => {
    mountBench([stage({ model: "krea-2", quant: "fp16" })]);
    await openDrill();
    await typePrompt("a red cube");
    pressEnhance();
    await waitFor(() => { expect(resolveEnhance).not.toBe(null); }, { timeout: 8000 });
    resolveEnhance!({ results: { prompt: { positive: "P2" } } }, 200);
    await waitFor(() => {
      const face = writeFace();
      if (face === null || !face.includes("THE COMPOSE GATE REFUSED")) {
        throw new Error("gate face not voiced yet; face: " + face);
      }
    }, { timeout: 8000 });
    expect(writeFace()).toContain("quant");
    const swept = patchCalls().some((c) => {
      const params = (c["patch"] as Record<string, unknown>)?.["params"] as Record<string, unknown> | undefined;
      return params?.["prompt"] === "P2";
    });
    expect(swept).toBe(false);
  });

  test("an enhance write landing over a stale failed key speaks the ONE banner (no enhance dialect)", async () => {
    mountBench([stage({ model: "krea-2" })], { patchFailures: [{ reason: "engine busy" }] });
    await openDrill();
    // the stale failure must sit on a key the sweep does NOT carry
    // (success clears only the keys it wrote): the variant text
    // field's write fails first, the prompt write lands, and the
    // swept prompt lands clean over the surviving variant refusal
    const variantField = await screen.findByLabelText("Variant override", {}, { timeout: 4000 });
    fireEvent.change(variantField, { target: { value: "raw" } });
    await typePrompt("a red cube");
    await waitFor(() => { expect(patchCalls().length).toBeGreaterThanOrEqual(2); }, { timeout: 8000 });
    pressEnhance();
    await waitFor(() => { expect(resolveEnhance).not.toBe(null); }, { timeout: 8000 });
    resolveEnhance!({ results: { prompt: { positive: "P2" } } }, 200);
    // THE ONE VOICE (the 2026-11-02 audit's H-4): the sweep is a
    // write like every other — its settle face is the row's voice,
    // never a second "ENHANCE" dialect. The banner that appears is
    // THE WRITE DID NOT LAND with the ledger's reason and keys.
    await waitFor(() => {
      const face = writeFace();
      if (face === null || !face.includes("THE WRITE DID NOT LAND")) {
        throw new Error("write banner not voiced yet; face: " + face);
      }
    }, { timeout: 8000 });
    expect(writeFace()).not.toContain("ENHANCE");
    expect(writeFace()).toContain("unlanded keys: variant");
  });

  test("a rejected enhance write renders its face (the sweep's own catch, the row's voice)", async () => {
    // the typed write consumes the throw; the swept write meets the
    // scripted failure envelope and rejects into the catch
    mountBench([stage({ model: "krea-2" })], {
      throws: [{ method: "drafts/patch" }],
      patchFailures: [{ reason: "engine flooded" }],
    });
    await openDrill();
    await typePrompt("a red cube");
    await waitFor(() => { expect(patchCalls().length).toBeGreaterThan(0); }, { timeout: 8000 });
    pressEnhance();
    await waitFor(() => { expect(resolveEnhance).not.toBe(null); }, { timeout: 8000 });
    resolveEnhance!({ results: { prompt: { positive: "P2" } } }, 200);
    await waitFor(() => {
      const face = writeFace();
      if (face === null || !face.includes("THE WRITE DID NOT LAND")) {
        throw new Error("write banner not voiced yet; face: " + face);
      }
    }, { timeout: 8000 });
    // the catch half keeps the keys too (draft.ts stamps the row
    // before the rejection reaches it) — the H-4 degraded voice
    // (prefix + reason, keys dropped) is dead
    expect(writeFace()).toContain("engine flooded");
    expect(writeFace()).toContain("unlanded keys: prompt");
  });

  test("a sweep settling after a re-target stands down — the settle face names the stage shown NOW", async () => {
    // THE UNKEYED SEAM: the run-view seat mounts StageDrill without a
    // stage key (draft-run-views), so one instance can observe a new
    // stage id while a swept write is still parked. The drill mounts
    // directly here for exactly that seam; the settle then runs
    // against lastStageRef of the stage shown NOW.
    let release: (() => void) | undefined;
    let gateCalls = 0;
    let enhanceVerb: (() => Promise<void> | void) | undefined;
    const gate = (): Promise<void> => {
      gateCalls += 1;
      if (gateCalls === 1) return Promise.resolve(); // the typed write sails
      return new Promise<void>((resolve) => { release = resolve; }); // the sweep parks
    };
    stubFetch();
    fakes?.unmount();
    fakes = mountEstateFakes({ patchGate: gate });
    const stageA: BenchStageView = stage({ model: "krea-2" });
    const stageB: BenchStageView = { id: "s_1", card: "image-gen", engine: "comfyui", params: { model: "krea-2" } };
    const drillProps = (s: BenchStageView): Record<string, unknown> => ({
      stage: s,
      bench: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [stageA, stageB], sessionKey: "main" },
      running: false,
      onRun: () => {}, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
      onPatchParams: () => {},
      renderStageView: (_o: unknown, fallback: unknown) => fallback,
      bindEnhance: (v: () => Promise<void> | void): void => { enhanceVerb = v; },
    });
    const view = render(h(StageDrill, drillProps(stageA) as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    await waitFor(() => { expect(patchCalls().length).toBe(1); }, { timeout: 8000 });
    enhanceVerb?.();
    await waitFor(() => { expect(resolveEnhance).not.toBe(null); }, { timeout: 8000 });
    resolveEnhance!({ results: { prompt: { positive: "P2" } } }, 200);
    await waitFor(() => { expect(patchCalls().length).toBe(2); }, { timeout: 8000 });
    // the re-target: the SAME instance now shows s_1
    view.rerender(h(StageDrill, drillProps(stageB) as never));
    release?.();
    await waitFor(() => {
      if (stageWriteState("bench-p", "s_0").pending !== 0) throw new Error("sweep write still parked");
    }, { timeout: 8000 });
    // the swept patch reached the door; the face it would have voiced
    // belongs to a stage nobody is looking at — silent, never stale.
    const swept = patchCalls().some((c) => {
      const params = (c["patch"] as Record<string, unknown>)?.["params"] as Record<string, unknown> | undefined;
      return params?.["prompt"] === "P2";
    });
    expect(swept).toBe(true);
    expect(writeFace()).toBe(null);
  });

  test("a REJECTED sweep settling after a re-target stands down — and the new seat opens CLEAN (the F5 law)", async () => {
    // THE FACE FOLLOWS THE SEAT (the 2026-11-02 audit's F5): the
    // retargeted drill reopens with NO carried banner — the typed
    // write's on-stage voice lived on the OLD seat; the rejected
    // sweep settles after the move and the guard holds it; the
    // RETURN to the old stage reopens clean too (the ledger row
    // KEEPS the failure — curable by retyping — but the face never
    // carries across an open).
    let release: (() => void) | undefined;
    let gateCalls = 0;
    let enhanceVerb: (() => Promise<void> | void) | undefined;
    const gate = (): Promise<void> => {
      gateCalls += 1;
      if (gateCalls === 1) return Promise.resolve();
      return new Promise<void>((resolve) => { release = resolve; });
    };
    stubFetch();
    fakes?.unmount();
    fakes = mountEstateFakes({ patchGate: gate, patchFailures: [{ reason: "typed busy" }, { reason: "engine busy" }] });
    const stageA: BenchStageView = stage({ model: "krea-2" });
    const stageB: BenchStageView = { id: "s_1", card: "image-gen", engine: "comfyui", params: { model: "krea-2" } };
    const drillProps = (s: BenchStageView): Record<string, unknown> => ({
      stage: s,
      bench: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [stageA, stageB], sessionKey: "main" },
      running: false,
      onRun: () => {}, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
      onPatchParams: () => {},
      renderStageView: (_o: unknown, fallback: unknown) => fallback,
      bindEnhance: (v: () => Promise<void> | void): void => { enhanceVerb = v; },
    });
    const view = render(h(StageDrill, drillProps(stageA) as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    await waitFor(() => { expect(patchCalls().length).toBe(1); }, { timeout: 8000 });
    // the typed write fails ON-stage — its banner shows while s_0
    // is the seat (the row records prompt + 'typed busy')
    await waitFor(() => {
      const face = writeFace();
      if (face === null || !face.includes("typed busy")) {
        throw new Error("typed banner not voiced on-stage; face: " + face);
      }
    }, { timeout: 8000 });
    enhanceVerb?.();
    await waitFor(() => { expect(resolveEnhance).not.toBe(null); }, { timeout: 8000 });
    resolveEnhance!({ results: { prompt: { positive: "P2" } } }, 200);
    await waitFor(() => { expect(patchCalls().length).toBe(2); }, { timeout: 8000 });
    // the re-target: the SAME instance now shows s_1 — the spec
    // fetch resolves and the freshOpen reset clears the face WITH
    // the reopened form (await the form BEFORE asserting null: the
    // reset lands inside the same .then)
    view.rerender(h(StageDrill, drillProps(stageB) as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    release?.();
    await waitFor(() => {
      if (stageWriteState("bench-p", "s_0").pending !== 0) throw new Error("sweep write still parked");
    }, { timeout: 8000 });
    // the rejected sweep's voice belongs to a seat nobody holds —
    // and the retarget already cleared the typed banner: NULL, both
    // ways, never 'engine busy', never a carried 'typed busy'
    expect(writeFace()).toBe(null);
    // the ledger row KEEPS the failure (a declared-and-held key is
    // never a ghost — the reopen does not cure the row)
    expect(stageWriteState("bench-p", "s_0").failedKeys).toContain("prompt");
    // THE RETURN: s_0 reopens clean too — the banner does not ride
    // back with the seat, the row still holds the curable failure
    view.rerender(h(StageDrill, drillProps(stageA) as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    expect(writeFace()).toBe(null);
    expect(stageWriteState("bench-p", "s_0").failedKeys).toContain("prompt");
  });
});

describe("the run seat's full-doc sync gate", () => {
  test("a full-doc sync the gate refuses errors before Run — no start, no write", async () => {
    mountBench([stage({ model: "krea-2", quant: "fp16" })]);
    await openDrill();
    await typePrompt("x");
    await pressRun();
    await waitFor(() => {
      const err = document.querySelector('[data-testid="stage-error-face"], [class*="runError"]');
      const text = err?.textContent ?? null;
      if (text === null || !text.includes("THE COMPOSE GATE REFUSED")) {
        throw new Error("run gate face not voiced yet; text: " + text);
      }
    }, { timeout: 8000 });
    expect(calls().some((c) => c.method === "runs/start")).toBe(false);
  });
});

// ── THE WALK'S ONE IDENTITY (the 2026-11-02 audit's F6): the drill's
// walk set dedups on the SAME canonical identity the rail dedups on
// (trail.ts's canonicalOutputUrl) — one artifact with NO run_id that
// rides both url spellings (the media route and the gallery proxy)
// collapses to ONE walk entry. A second local spelling is the
// regression this wall fires on. ──────────────────────────────
describe("the walk's one identity (dedupWalkSet rides the canonical seat)", () => {
  test("two spellings of one artifact with NO run_id collapse to one walk entry", () => {
    const walked = dedupWalkSet([
      { url: "/melite-media/runs/run2/c.png" },
      { url: "/infer-gallery/artifact?path=run2%2Fc.png" },
    ]);
    expect(walked).toHaveLength(1);
    // first-wins: the media route's spelling is the one kept
    expect(walked[0]?.url).toBe("/melite-media/runs/run2/c.png");
  });

  test("the gallery spelling leading keeps its own order (first-wins, either face)", () => {
    const walked = dedupWalkSet([
      { url: "/infer-gallery/artifact?path=run2%2Fc.png" },
      { url: "/melite-media/runs/run2/c.png" },
    ]);
    expect(walked).toHaveLength(1);
    expect(walked[0]?.url).toBe("/infer-gallery/artifact?path=run2%2Fc.png");
  });

  test("different artifacts stay different (the canonical seat is a prefix slice, not a hash)", () => {
    const walked = dedupWalkSet([
      { url: "/melite-media/runs/run2/c.png" },
      { url: "/melite-media/runs/run2/d.png" },
      { url: "/melite-media/runs/run3/c.png" },
    ]);
    expect(walked).toHaveLength(3);
  });

  test("run_id remains the FIRST identity (one run, one entry — the trail law)", () => {
    const walked = dedupWalkSet([
      { url: "/melite-media/runs/run2/c.png", runId: "r1" },
      { url: "/melite-media/runs/run2/d.png", runId: "r1" },
      { url: "/melite-media/runs/run2/e.png" },
    ]);
    // r1's second artifact collapses on the RUN; the run_id-less
    // artifact is its own seat (a different file, no run claim)
    expect(walked).toHaveLength(2);
    expect(walked[0]?.url).toBe("/melite-media/runs/run2/c.png");
    expect(walked[1]?.url).toBe("/melite-media/runs/run2/e.png");
  });

  test("a non-string run_id rides the url seat (the alt's own law)", () => {
    // the server's run_id can arrive non-string (a numeric id in a
    // JSON row); identity falls back to the canonical url — both
    // spellings still collapse, the raw === never fires
    const walked = dedupWalkSet([
      { url: "/melite-media/runs/run2/c.png", runId: 7 as unknown as string },
      { url: "/infer-gallery/artifact?path=run2%2Fc.png" },
    ]);
    expect(walked).toHaveLength(1);
  });
});
