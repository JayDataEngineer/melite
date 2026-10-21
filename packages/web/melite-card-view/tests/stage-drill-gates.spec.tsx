// @vitest-environment happy-dom
// @contract cards-drill-departed-surface-arrival
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
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

function stubFetch(specDoc: Record<string, unknown> = axisSpecDoc(), formsDoc?: Record<string, unknown>): void {
  const impl = globalThis.fetch;
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify(specDoc), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify(formsDoc ?? {
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

function mountBench(stages: BenchStageView[], estate?: EstateOpts, specDoc?: Record<string, unknown>): void {
  stubFetch(specDoc);
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
  const tile = document.querySelector('[role="button"][class*="tileInner"]') as HTMLElement;
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

/** The error strip's own face (the gate-refusal banner — the write
 *  face carries the SAME template for its own gate, so the strip is
 *  judged by its testid, never by body text). */
function errorStrip(): string | null {
  return document.querySelector('[data-testid="stage-error-strip"]')?.textContent ?? null;
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
    // THE MENU PICK (S7e): open the axis, click the row
    fireEvent.click(select);
    fireEvent.click(screen.getByRole("menuitem", { name: "Raw" }));
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
    // THE MENU PICK (S7e): open the axis, click the row
    fireEvent.click(select);
    fireEvent.click(screen.getByRole("menuitem", { name: "Turbo" }));
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
    // THE MENU PICK (S7e): open the axis, click the row
    fireEvent.click(select);
    fireEvent.click(screen.getByRole("menuitem", { name: "Turbo" }));
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
    // THE MENU PICK (S7e): open the axis, click the row
    fireEvent.click(select);
    fireEvent.click(screen.getByRole("menuitem", { name: "Turbo" }));
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
    // THE MENU PICK (S7e): open the axis, click the row
    fireEvent.click(select);
    fireEvent.click(screen.getByRole("menuitem", { name: "Turbo" }));
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

  test("a gate refusal naming a field the form does not render carries the field's UNSTAMP affordance — one click unstamps the ghost through the bench door (SD-7: the banner's words ACT)", async () => {
    // THE B8 CLASS, THE LAST MILE (the refusal-without-cure burn):
    // the mirror clause refuses the departed key FIELD-NAMED, but the
    // arrival form renders no control for a field its surface does
    // not declare — the banner named a ghost the operator could not
    // touch. The cure: the banner carries the named field's own
    // unstamp — one click writes the key's null through the bench
    // door (JSON Merge Patch delete), the switch verb's own verdict
    // delivered from the banner's words.
    const doc = axisSpecDoc();
    doc.params = ["prompt", "variant", "input_image"];
    mountBench([stage({ model: "krea-2", double_reference: true })], undefined, doc);
    await openDrill();
    await typePrompt("a red cube");
    await pressRun();
    await waitFor(() => {
      if ((errorStrip() ?? '').includes("'double_reference' fires nothing") === false) {
        throw new Error("gate banner not voiced yet");
      }
    }, { timeout: 8000 });
    const unstamp = await screen.findByRole("button", { name: "Unstamp 'double_reference'" }, { timeout: 4000 });
    fireEvent.click(unstamp);
    await waitFor(() => {
      const del = patchCalls().some((c) => {
        const params = (c["patch"] as Record<string, unknown>)?.["params"] as Record<string, unknown> | undefined;
        return params?.["double_reference"] === null;
      });
      if (!del) throw new Error("the unstamp's null write never issued; calls: " + JSON.stringify(patchCalls()));
    }, { timeout: 8000 });
    // THE BANNER RETIRES WITH ITS GHOST (both faces): the error strip
    // AND the write face carried the same field-named words — the
    // trailing write's gate voices the departed key on its own face —
    // and the act retires each (a later refusal re-voices on its own).
    await waitFor(() => {
      if ((errorStrip() ?? '').includes("'double_reference' fires nothing")) {
        throw new Error("the error strip outlived its unstamp");
      }
    }, { timeout: 8000 });
    await waitFor(() => {
      if ((writeFace() ?? '').includes("'double_reference' fires nothing")) {
        throw new Error("the write face outlived its unstamp");
      }
    }, { timeout: 8000 });
  });

  test("THE ONE-VOICE LAW (E2-3/E2-12): a field-named compose refusal renders EXACTLY ONCE in the card's document — the face that keeps it carries the unstamp and the dismiss", async () => {
    // The operator burn (dev_docs/ERRORS_2.md: "EVEN THE ERROR DISPLAY
    // IS BUGGED IN THE CARD, I SEE IT 3 TIMES" + "THE ERROR DOESN'T
    // EVEN HAVE THE X NEXT TO IT TO CLOSE"): one compose refusal —
    // the ghost key — voiced from THREE seats at once (the form's
    // gate banner above the axes, the drill's error strip with its
    // unstamp, the write face beside it), and the topmost banner
    // carried no affordance at all. The law: within the card's
    // document a given refusal message paints ONCE, on the seat that
    // can act (the strip: unstamp + ×); the derived banner and the
    // write face stand down while their words are already voiced.
    const doc = axisSpecDoc();
    doc.params = ["prompt", "variant", "input_image"];
    mountBench([stage({ model: "krea-2", double_reference: true })], undefined, doc);
    await openDrill();
    await typePrompt("a red cube");
    await pressRun();
    await waitFor(() => {
      if ((errorStrip() ?? '').includes("'double_reference' fires nothing") === false) {
        throw new Error("gate banner not voiced yet");
      }
    }, { timeout: 8000 });
    const body = document.body.textContent ?? "";
    const voices = body.split("'double_reference' fires nothing").length - 1;
    expect(voices, "one refusal, one voice — the operator counted three").toBe(1);
    // the surviving face is the actionable one: the unstamp verb and
    // the dismiss × both ride it (E2-3's other half).
    expect(await screen.findByRole("button", { name: "Unstamp 'double_reference'" }, { timeout: 4000 })).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Dismiss error" }, { timeout: 4000 })).toBeTruthy();
  });

  test("the unstamp's door failure speaks the ledger row's face — the act is a write like any other", async () => {
    // SD-7's unstamp rides the same one-voice law as every write half:
    // a rejecting door speaks the row's unlanded face (never a raw
    // dialect), and the strip still retires on the act — the click's
    // verdict is the door's, the row keeps the failure's memory.
    const doc = axisSpecDoc();
    doc.params = ["prompt", "variant", "input_image"];
    mountBench([stage({ model: "krea-2", double_reference: true })], { throws: [{ method: "drafts/patch" }] }, doc);
    await openDrill();
    await typePrompt("a red cube");
    await pressRun();
    await waitFor(() => {
      if ((errorStrip() ?? '').includes("'double_reference' fires nothing") === false) {
        throw new Error("gate banner not voiced yet");
      }
    }, { timeout: 8000 });
    const unstamp = await screen.findByRole("button", { name: "Unstamp 'double_reference'" }, { timeout: 4000 });
    fireEvent.click(unstamp);
    await waitFor(() => {
      const face = writeFace();
      if (face === null || !face.includes("THE WRITE DID NOT LAND")) {
        throw new Error("unlanded face not voiced yet; face: " + face);
      }
    }, { timeout: 8000 });
    expect(writeFace()).toContain("double_reference");
    expect(errorStrip()).toBe(null);
  });

  test("the re-press after an unstamp starts clean — the flush re-nulls the dropped ghost and the gate judges it gone", async () => {
    // The journey's last visible hop: the unstamp is not just a face
    // edit — the NEXT press lands the delete through the flush (the
    // touched null rides, the gate judges the keyless candidate) and
    // the run STARTS. One arm, the whole hop chain closed.
    const doc = axisSpecDoc();
    doc.params = ["prompt", "variant", "input_image"];
    mountBench([stage({ model: "krea-2", double_reference: true })], undefined, doc);
    await openDrill();
    await typePrompt("a red cube");
    await pressRun();
    await waitFor(() => {
      if ((errorStrip() ?? '').includes("'double_reference' fires nothing") === false) {
        throw new Error("gate banner not voiced yet");
      }
    }, { timeout: 8000 });
    const unstamp = await screen.findByRole("button", { name: "Unstamp 'double_reference'" }, { timeout: 4000 });
    fireEvent.click(unstamp);
    await waitFor(() => {
      const del = patchCalls().some((c) => {
        const params = (c["patch"] as Record<string, unknown>)?.["params"] as Record<string, unknown> | undefined;
        return params?.["double_reference"] === null;
      });
      if (!del) throw new Error("the unstamp's null write never issued");
    }, { timeout: 8000 });
    await pressRun();
    // the flush re-nulled the dropped ghost (touchedRef keeps it) and
    // the gate passed: the press landed its write and STARTED the run.
    await waitFor(() => {
      const flushNull = patchCalls().some((c) => {
        const patch = c["patch"] as Record<string, unknown> | undefined;
        const params = patch?.["params"] as Record<string, unknown> | undefined;
        return params?.["double_reference"] === null && params?.["prompt"] === "a red cube";
      });
      if (!flushNull) throw new Error("the press's flush never carried the re-null; patches: " + JSON.stringify(patchCalls()));
      if (!calls().some((c) => c.method === "runs/start")) throw new Error("the run never started");
    }, { timeout: 8000 });
    expect(errorStrip()).toBe(null);
  });

  test("an already-unstated key still unstamps the bench — the delete is the act (idempotent at the door)", async () => {
    // The banner can outlive its key's user-map entry: the operator
    // fixes the named key the rendered way (the axis-unset deletes it
    // and lands the null; the settle retires the write face's words)
    // while the strip keeps the press's refusal. The Unstamp still
    // fires the bench delete — the act is unconditional, the user-map
    // half just skips an absent key.
    const doc = axisSpecDoc();
    doc.familyLaw = { lanes: [{ lane: "t4_open" }], deadKeys: { t4_open: ["variant"] } };
    mountBench([stage({ model: "krea-2", variant: "raw" })], undefined, doc);
    await openDrill();
    const select = await screen.findByLabelText("Variant", {}, { timeout: 4000 });
    fireEvent.click(select);
    fireEvent.click(screen.getByRole("menuitem", { name: "Turbo" }));
    await waitFor(() => {
      if ((writeFace() ?? "").includes("'variant' fires nothing") === false) {
        throw new Error("write-face refusal not voiced yet; face: " + writeFace());
      }
    }, { timeout: 8000 });
    await pressRun();
    await waitFor(() => {
      if ((errorStrip() ?? "").includes("'variant' fires nothing") === false) {
        throw new Error("gate banner not voiced yet");
      }
    }, { timeout: 8000 });
    const field = await screen.findByLabelText("Variant override", {}, { timeout: 4000 });
    fireEvent.change(field, { target: { value: "" } });
    // the axis-unset's null rides the trailing write's debounce — wait
    // for the LANDED null before judging the face
    await waitFor(() => {
      const del = patchCalls().some((c) => {
        const params = (c["patch"] as Record<string, unknown>)?.["params"] as Record<string, unknown> | undefined;
        return params?.["variant"] === null;
      });
      if (!del) throw new Error("the clear's null write never issued; patches: " + JSON.stringify(patchCalls()));
    }, { timeout: 8000 });
    await awaitWriteSettled();
    expect(writeFace()).toBe(null);
    const unstamp = await screen.findByRole("button", { name: "Unstamp 'variant'" }, { timeout: 4000 });
    fireEvent.click(unstamp);
    await waitFor(() => {
      const dels = patchCalls().filter((c) => {
        const params = (c["patch"] as Record<string, unknown>)?.["params"] as Record<string, unknown> | undefined;
        return params?.["variant"] === null;
      });
      if (dels.length < 2) throw new Error("the unstamp never re-deleted the bench key; patches: " + JSON.stringify(patchCalls()));
    }, { timeout: 8000 });
    expect(errorStrip()).toBe(null);
  });

  test("the unstamp's failure answer is alive-guarded — a re-target orphans it (the row keeps the memory)", async () => {
    // The unstamp is a write like any other: its door answer holds the
    // settle-captures-stageId law. The write parks at the gate, the
    // SAME SEAT re-targets (the run-view seat: one instance, no stage
    // key), the door then rejects — the ledger row for the OLD stage
    // keeps the failure, and the guard holds the voice off the new
    // seat. The press verb rides the captured bindRun (the host's own
    // seam), never a zoom bar.
    let release: (() => void) | undefined;
    const gate = (): Promise<void> => new Promise<void>((resolve) => { release = resolve; });
    const doc = axisSpecDoc();
    doc.params = ["prompt", "variant", "input_image"];
    stubFetch(doc);
    fakes?.unmount();
    fakes = mountEstateFakes({ patchGate: gate, throws: [{ method: "drafts/patch" }] });
    let runVerb: (() => void) | undefined;
    const bind = (r: () => void): void => { runVerb = r; };
    const stageB: BenchStageView = { id: "s_1", card: "image-gen", engine: "comfyui", params: { model: "krea-2" } };
    const view = render(h(StageDrill, { ...drillProps(stage({ model: "krea-2", double_reference: true })), bindRun: bind } as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    runVerb!();
    await waitFor(() => {
      if ((errorStrip() ?? "").includes("'double_reference' fires nothing") === false) {
        throw new Error("gate banner not voiced yet");
      }
    }, { timeout: 8000 });
    const unstamp = await screen.findByRole("button", { name: "Unstamp 'double_reference'" }, { timeout: 4000 });
    fireEvent.click(unstamp);
    await waitFor(() => { expect(patchCalls().length).toBe(1); }, { timeout: 8000 });
    // the re-target while the unstamp is parked at the door
    view.rerender(h(StageDrill, { ...drillProps(stageB), bindRun: bind } as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    release?.();
    await waitFor(() => {
      if (stageWriteState("bench-p", "s_0").pending !== 0) throw new Error("unstamp still parked");
    }, { timeout: 8000 });
    // the row keeps the failure for s_0's return; the new seat is clean
    expect(stageWriteState("bench-p", "s_0").failedKeys).toContain("double_reference");
    expect(writeFace()).toBe(null);
  });

  test("the family clause's field-named refusal unstamps the same way (the h3 inject-keys class: one click per named key, the walk's own verdict)", async () => {
    // THE SD-7 TWIN (the h3 walk voice names the repair): the family
    // clause mirrors the walk's per-key refusal — a stated inject key
    // on the derived lane refuses FIELD-NAMED before the wire — and
    // the same unstamp affordance delivers the repair: the named key
    // unstamps through the bench door, one click per named key.
    const doc = axisSpecDoc();
    doc.familyLaw = {
      lanes: [{ lane: "t4_open" }],
      deadKeys: { t4_open: ["interpolate_enabled", "second_pass_enabled"] },
    };
    mountBench([stage({ model: "krea-2", interpolate_enabled: true })], undefined, doc);
    await openDrill();
    await typePrompt("a red cube");
    await pressRun();
    await waitFor(() => {
      if (!document.body.textContent!.includes("'interpolate_enabled' fires nothing on the t4_open lane")) {
        throw new Error("family-clause banner not voiced yet");
      }
    }, { timeout: 8000 });
    const unstamp = await screen.findByRole("button", { name: "Unstamp 'interpolate_enabled'" }, { timeout: 4000 });
    fireEvent.click(unstamp);
    await waitFor(() => {
      const del = patchCalls().some((c) => {
        const params = (c["patch"] as Record<string, unknown>)?.["params"] as Record<string, unknown> | undefined;
        return params?.["interpolate_enabled"] === null;
      });
      if (!del) throw new Error("the unstamp's null write never issued");
    }, { timeout: 8000 });
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

// ── THE RE-POINT SEAM (the ONE switch semantics at the write seat,
// journey/axis-unification-2026-11-06 cure 4): every frame that moves
// the model key re-derives through modelSwitchPatch before the wire —
// via the schema-level knob (onSet), via the Model rail (onPick), and
// the engine stage's verbatim pass (stroke 66: a brain route is a
// plain field, never a family re-key). The suite had never driven any
// of the three seats. ──────────────────────────────────────────────

/** The knob-face fixture (the semantic-model seat): the model knob
 *  lists WIRE spellings — 'fam-b-1536-int8' is a composed key, the
 *  re-point's real re-key shape. The dual bag (schema array node +
 *  features.modifiers) exercises both bag walks; the junk cfg rides
 *  the departing envelope vocabulary. */
function knobDoc(): Record<string, unknown> {
  return {
    form: 'image-gen', genre: 'image', engine: 'comfyui', model: 'fam-a',
    schema: schemaEnvelope({
      prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
      model: { consts: ['fam-a', 'fam-b-1536-int8'], meta: { description: 'Serving family', default: 'fam-a', extra: { wtype: 'select' } } },
      cfg: { type: 'number', meta: { description: 'Cfg', default: 3.5 } },
      loras: { type: 'array', meta: { description: 'Loras', default: [] } },
      double_reference: { type: 'boolean', meta: { description: 'Double reference', default: false } },
    }),
    variants: [
      { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: {}, route: 'turbo',
        sampler_envelope: { steps: [1, 50], cfg: [1, 2] } },
    ],
    features: { modifiers: [{ param_key: 'loras' }, { param_key: 'ref_mods' }] },
  };
}

/** The base doc the door serves for the composed key (the walk law:
 *  a composed key serves its base family). */
function famBBaseDoc(): Record<string, unknown> {
  return {
    form: 'image-gen', genre: 'image', engine: 'comfyui', model: 'fam-b',
    schema: schemaEnvelope({
      prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
      cfg: { type: 'number', meta: { description: 'Cfg', default: 4.5 } },
      loras: { type: 'array', meta: { description: 'Loras', default: [] } },
    }),
    variants: [
      { id: 'fast', label: 'Fast', group: 'Variant', defaults: {}, route: 'fast',
        sampler_envelope: { steps: [1, 30], cfg: [1, 10] } },
    ],
    features: { modifiers: [{ param_key: 'loras' }] },
  };
}

/** The brain-route fixture (stroke 66): a CARDLESS engine stage's doc
 *  — families render the Model rail; a rail pick here must ride the
 *  re-point verb's engine-stage arm (the frame passes verbatim). */
function brainDoc(model: string): Record<string, unknown> {
  return {
    form: 'image-gen', genre: 'image', engine: 'comfyui', model,
    schema: schemaEnvelope({
      prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
      cfg: { type: 'number', meta: { description: 'Cfg', default: 3.5 } },
      loras: { type: 'array', meta: { description: 'Loras', default: [] } },
    }),
    variants: [
      { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: {}, route: 'turbo',
        sampler_envelope: { steps: [1, 50], cfg: [1, 2] } },
    ],
    families: [{ id: 'comfyui', present: true }, { id: 'other-brain', present: true }],
    features: { modifiers: [{ param_key: 'loras' }] },
  };
}

const servedFamilies: string[] = [];

/** The spec-door stub for the re-point arms: every family key serves
 *  its own doc; the composed key walks to its base (the door's own
 *  walk law); every unstubbed door fails loud. */
function stubSpecDocs(): void {
  servedFamilies.length = 0;
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      const key = path.split("model=")[1] ?? "";
      servedFamilies.push(key);
      const doc = key.startsWith("fam-b") ? famBBaseDoc()
        : key.startsWith("other-brain") ? brainDoc("other-brain")
        : key.startsWith("comfyui") ? brainDoc("comfyui")
        : knobDoc();
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

function patchParamsOf(calls_: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return calls_.map((c) => ((c["patch"] as Record<string, unknown>)?.["params"] ?? {}) as Record<string, unknown>);
}

describe("the re-point seam (one switch semantics at the drill's write seat)", () => {
  test("a composed-key knob pick re-points through the switch law: ONE atomic write carrying the departing vocabulary and both bag walks as nulls", async () => {
    stubSpecDocs();
    fakes?.unmount();
    fakes = mountEstateFakes({});
    render(h(StageDrill, drillProps(stage({ model: "fam-a", variant: "turbo", cfg: 99, loras: ["stuck"], ref_mods: ["stuck2"] })) as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    const knob = await screen.findByLabelText("Serving family", {}, { timeout: 4000 });
    fireEvent.click(knob);
    fireEvent.click(screen.getByRole("menuitem", { name: "Fam B 1536 Int8" }));
    await waitFor(() => {
      const frame = patchParamsOf(patchCalls()).find((p) => p["model"] === "fam-b-1536-int8");
      if (frame === undefined) throw new Error("re-point write not landed; patches: " + JSON.stringify(patchCalls()));
      // THE SWITCH LAW at the write seam: the departing envelope
      // vocabulary dies, and BOTH bag walks null in the SAME frame —
      // the schema-node bag (bagKeysOf sees loras) and the served
      // kind's feature-only bag (the mod-currency clause's ref_mods)
      expect(frame["cfg"]).toBeNull();
      expect(frame["steps"]).toBeNull();
      expect(frame["loras"]).toBeNull();
      expect(frame["ref_mods"]).toBeNull();
      expect(frame["variant"]).toBeNull();
    }, { timeout: 8000 });
    await awaitWriteSettled();
    expect(writeFace()).toBe(null);
  });

  test("a departed SCALAR the arrival never declares dies with its model (B8's cure — the purge's P4): the seed drops it, the run flush nulls the bench key, shared words ride", async () => {
    // The live injury (operator 2026-11-08, item h): a 2511 recipe
    // holding double_reference, the model switched to 21 — the
    // departed knob rode the arrival holding (the arrival form does
    // not render it) and the door refused field-named LIVE. The cure
    // deletes every departed schema field the arrival's schema does
    // not declare from the SEED (the one seat that sees both
    // schemas), so the seed-drop ledger nulls the bench key at the
    // run flush — the drop's domain half, the dead-recipe-layer
    // machinery. Shared words (prompt) never drop.
    stubSpecDocs();
    fakes?.unmount();
    let runs = 0;
    let bound: () => void = () => { throw new Error("bindRun never fired"); };
    fakes = mountEstateFakes({});
    const stageA = stage({ model: "fam-a", variant: "turbo", double_reference: true, prompt: "keep me" });
    render(h(StageDrill, {
      stage: stageA,
      bench: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [stageA], sessionKey: "main" },
      running: false,
      onRun: () => { runs += 1; }, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
      onPatchParams: () => {},
      renderStageView: (_o: unknown, fallback: unknown) => fallback,
      bindRun: (r: () => void) => { bound = r; },
    } as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    const knob = await screen.findByLabelText("Serving family", {}, { timeout: 4000 });
    fireEvent.click(knob);
    fireEvent.click(screen.getByRole("menuitem", { name: "Fam B 1536 Int8" }));
    // the re-point write landed (the switch law's own frame), the
    // arrival spec fetched, the seed dropped the departed scalar
    await waitFor(() => {
      const frame = patchParamsOf(patchCalls()).find((p) => p["model"] === "fam-b-1536-int8");
      if (frame === undefined) throw new Error("re-point write not landed; patches: " + JSON.stringify(patchCalls()));
      // THE PASS-ALONG HALF at the switch frame: a SHARED word never
      // rides the null set — the departed-scalar drop is the seed's
      // verdict, not the switch frame's
      expect(frame).not.toHaveProperty("prompt");
    }, { timeout: 8000 });
    await awaitWriteSettled();
    // THE DROP'S DOMAIN HALF: pressing Run syncs the doc — the seed
    // drop nulls the departed key on the bench (JSON Merge Patch:
    // null deletes), and the start fires (the state is CLEAN — the
    // old live banner is impossible).
    bound();
    await waitFor(() => {
      const sync = patchParamsOf(patchCalls()).find((p) => "double_reference" in p);
      if (sync === undefined) throw new Error("run-flush null not landed; patches: " + JSON.stringify(patchCalls()));
      expect(sync["double_reference"]).toBeNull();
      expect(sync).not.toHaveProperty("prompt");
    }, { timeout: 8000 });
    await awaitWriteSettled();
    expect(writeFace()).toBe(null);
    expect(runs).toBe(1);
  });

  test("a params-only departed knob dies at the rescope when the schemas agree (DRILL a — the purge's P4: the seat passes its arrival)", async () => {
    // THE FINDING-3 FACE (journey 2026-11-08-drill-departed-surface-null-set
    // §NOT COVERED finding 3): BOTH served schemas declare the departed knob
    // (the card schema is per-card; hiding is lane-side), so the schema-fields
    // drop (stage-drill.tsx:384) SKIPS it — the faces are equal. Only the
    // declared-surface null-set (modelSwitchPatch's 4th arg) can clean it,
    // and the rescope (:357) is the seat that HOLDS the arrival doc. The
    // 3-arg call leaves the pair riding the user map and the run door
    // refuses it field-named live (ERRORS item h, the operator's burn).
    // Fixtures: schema faces EQUAL on both docs (the real 2511/21 shape),
    // declared `params` surfaces DERIVED from the DECL files themselves
    // (text-parse, zero engine-graph imports in this env — the verb wall
    // in drill-departed-surface-null-set.spec.ts already proves the verb
    // against the live DECL modules; this arm proves the SEAT passes its
    // arrival doc).
    const paramsOf = (id: string): string[] => {
      // repo-root anchored (vitest runs with cwd at the root; import.meta
      // URLs are vite-rewritten and do not resolve to disk here).
      const text = readFileSync(join(process.cwd(), "packages", "models", id, "src", "index.ts"), "utf8");
      const m = text.match(/"params": \[([\s\S]*?)\]/);
      if (m === null) throw new Error(`no params array parsed from ${id}/src/index.ts`);
      const out = [...m[1].matchAll(/"([^"]+)"/g)].map((g) => g[1]);
      if (out.length === 0) throw new Error(`empty params parsed from ${id}/src/index.ts`);
      return out;
    };
    const FROM = "qwen-img-edit-2511";
    const TO = "qwen-img-edit-21";
    const fromParams = paramsOf(FROM);
    const toParams = paramsOf(TO);
    // THE DERIVED FLOOR (never vacuously green): the burn's pair is the
    // params-surface difference of the two DECLs.
    for (const k of ["double_reference", "use_stock_nodes"]) {
      expect(fromParams, `${FROM} params must declare ${k}`).toContain(k);
      expect(toParams, `${TO} params must not declare ${k}`).not.toContain(k);
    }
    const servedDoc = (id: string, params: string[]): Record<string, unknown> => ({
      form: "image-edit", genre: "image", engine: "comfyui", model: id,
      // EQUAL faces: both schemas declare the departed knobs (finding 3).
      schema: schemaEnvelope({
        prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        model: { consts: [FROM, TO], meta: { description: "Serving family", default: id, extra: { wtype: "select" } } },
        double_reference: { type: "boolean", meta: { description: "Double reference", default: false } },
        use_stock_nodes: { type: "boolean", meta: { description: "Use stock nodes", default: false } },
      }),
      // scaffolding rows (the judged surfaces are schema faces + params,
      // never the matrix): one Variant row per doc routing at its model.
      variants: [
        { id: "v", label: "V", group: "Variant", defaults: { model: id }, route: id },
      ],
      params,
      families: [{ id: FROM, present: true }, { id: TO, present: true }],
    });
    const servedByModel: Record<string, Record<string, unknown>> = {
      [FROM]: servedDoc(FROM, fromParams),
      [TO]: servedDoc(TO, toParams),
    };
    const fetched: string[] = [];
    vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
      const path = String(url);
      if (path.includes("/v1/form-spec")) {
        const key = path.split("model=")[1] ?? "";
        fetched.push(key);
        const doc = servedByModel[key];
        if (doc === undefined) throw new Error("unexpected family on the fetch lane: " + key);
        return new Response(JSON.stringify(doc), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (path.includes("/v1/forms")) {
        return new Response(JSON.stringify({ "image-edit": { outputs: { default: "image" } } }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (path.includes("/v1/model-catalog")) {
        return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error("unexpected door on the fetch lane: " + path);
    });
    fakes?.unmount();
    let runs = 0;
    let bound: () => void = () => { throw new Error("bindRun never fired"); };
    fakes = mountEstateFakes({});
    const stageA = stage({ model: FROM, double_reference: true, use_stock_nodes: true, prompt: "keep the handwriting" });
    (stageA as { card: string }).card = "image-edit";
    render(h(StageDrill, {
      stage: stageA,
      bench: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [stageA], sessionKey: "main" },
      running: false,
      onRun: () => { runs += 1; }, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
      onPatchParams: () => {},
      renderStageView: (_o: unknown, fallback: unknown) => fallback,
      bindRun: (r: () => void) => { bound = r; },
    } as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    const knob = await screen.findByLabelText("Serving family", {}, { timeout: 4000 });
    fireEvent.click(knob);
    const items = screen.getAllByRole("menuitem");
    const target = items.find((el) => {
      const t = el.textContent ?? "";
      return t.includes("21") && !t.includes("2511");
    });
    if (target === undefined) throw new Error("no 21 menuitem; items: " + items.map((el) => el.textContent).join(" | "));
    fireEvent.click(target);
    // the re-point write landed (the gesture's own 3-arg frame — the pair
    // still rides it; the rescope's 4-arg verdict is what cleans the seat)
    await waitFor(() => {
      const frame = patchParamsOf(patchCalls()).find((p) => p["model"] === TO);
      if (frame === undefined) throw new Error("re-point write not landed; patches: " + JSON.stringify(patchCalls()));
    }, { timeout: 8000 });
    // the arrival spec fetched and the rescope settled over it
    await waitFor(() => {
      if (!fetched.some((k) => k === TO)) throw new Error("arrival spec not fetched yet; fetched: " + JSON.stringify(fetched));
    }, { timeout: 8000 });
    await awaitWriteSettled();
    // THE RESCOPE'S VERDICT AT THE FLUSH: the seed drop nulls the departed
    // pair on the bench (not the schema-fields drop — the faces are equal,
    // it skips), and the start fires (the state is CLEAN — the run door's
    // field-named refusal of the live burn is impossible).
    bound();
    await waitFor(() => {
      const sync = patchParamsOf(patchCalls()).find((p) => "double_reference" in p);
      if (sync === undefined) throw new Error("run-flush null not landed; patches: " + JSON.stringify(patchCalls()));
      expect(sync["double_reference"]).toBeNull();
      expect(sync["use_stock_nodes"]).toBeNull();
      expect(sync).not.toHaveProperty("prompt");
    }, { timeout: 8000 });
    await awaitWriteSettled();
    expect(writeFace()).toBe(null);
    expect(runs).toBe(1);
  });

describe("the arrival window (the gesture→settle one-round-trip gap, P4 remainder)", () => {
  // THE BURN: the re-point gesture fires the arrival fetch, but the
  // press does not know a newer spec is coming — run pressed while
  // the arrival fetch pends judges the flush against the STALE
  // (departing) spec and fires the start under it: 2511's
  // double_reference/use_stock_nodes ride the run and the door
  // refuses field-named (ERRORS h live). The rescope gate (DRILL a
  // above) owns the settle; THIS wall owns the window: a press
  // inside it must fence LOUD (no start, a named voice), and the
  // same press after the settle must start clean (the fence lifts
  // with the spec — never a latch). Fixtures ride the DRILL-a
  // 2511→21 pair: equal schema faces, params surfaces derived from
  // the live DECL files.
  function windowDocs(): { servedByModel: Record<string, Record<string, unknown>>; FROM: string; TO: string } {
    const paramsOf = (id: string): string[] => {
      const text = readFileSync(join(process.cwd(), "packages", "models", id, "src", "index.ts"), "utf8");
      const m = text.match(/"params": \[([\s\S]*?)\]/);
      if (m === null) throw new Error(`no params array parsed from ${id}/src/index.ts`);
      const out = [...m[1].matchAll(/"([^"]+)"/g)].map((g) => g[1]);
      if (out.length === 0) throw new Error(`empty params parsed from ${id}/src/index.ts`);
      return out;
    };
    const FROM = "qwen-img-edit-2511";
    const TO = "qwen-img-edit-21";
    const fromParams = paramsOf(FROM);
    const toParams = paramsOf(TO);
    for (const k of ["double_reference", "use_stock_nodes"]) {
      expect(fromParams, `${FROM} params must declare ${k}`).toContain(k);
      expect(toParams, `${TO} params must not declare ${k}`).not.toContain(k);
    }
    const servedDoc = (id: string, params: string[]): Record<string, unknown> => ({
      form: "image-edit", genre: "image", engine: "comfyui", model: id,
      schema: schemaEnvelope({
        prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        model: { consts: [FROM, TO], meta: { description: "Serving family", default: id, extra: { wtype: "select" } } },
        double_reference: { type: "boolean", meta: { description: "Double reference", default: false } },
        use_stock_nodes: { type: "boolean", meta: { description: "Use stock nodes", default: false } },
      }),
      variants: [
        { id: "v", label: "V", group: "Variant", defaults: { model: id }, route: id },
      ],
      params,
      families: [{ id: FROM, present: true }, { id: TO, present: true }],
    });
    return {
      servedByModel: { [FROM]: servedDoc(FROM, fromParams), [TO]: servedDoc(TO, toParams) },
      FROM,
      TO,
    };
  }

  /** The deferred lane: the departing doc resolves at once; the
   *  arrival doc stays pending until releaseArrival runs — the
   *  one-round-trip window held open for the press. */
  function stubDeferredWindow(
    servedByModel: Record<string, Record<string, unknown>>,
    FROM: string,
    TO: string,
  ): { fetched: string[]; releaseArrival: () => void } {
    const fetched: string[] = [];
    let releaseArrival: () => void = () => { throw new Error("arrival fetch never started"); };
    const arrivalGate = new Promise<Response>((resolve) => {
      releaseArrival = () => resolve(new Response(JSON.stringify(servedByModel[TO]), {
        status: 200, headers: { "content-type": "application/json" },
      }));
    });
    vi.stubGlobal("fetch", (url: unknown): Promise<Response> => {
      const path = String(url);
      if (path.includes("/v1/form-spec")) {
        const key = path.split("model=")[1] ?? "";
        fetched.push(key);
        if (key === TO) return arrivalGate;
        const doc = servedByModel[key];
        if (doc === undefined) throw new Error("unexpected family on the fetch lane: " + key);
        return Promise.resolve(new Response(JSON.stringify(doc), {
          status: 200, headers: { "content-type": "application/json" },
        }));
      }
      if (path.includes("/v1/forms")) {
        return Promise.resolve(new Response(JSON.stringify({
          "image-edit": { outputs: { default: "image" } },
        }), { status: 200, headers: { "content-type": "application/json" } }));
      }
      if (path.includes("/v1/model-catalog")) {
        return Promise.resolve(new Response(JSON.stringify({ cards: {} }), {
          status: 200, headers: { "content-type": "application/json" },
        }));
      }
      throw new Error("unexpected door on the fetch lane: " + path);
    });
    return { fetched, releaseArrival: () => releaseArrival() };
  }

  test("W1 — a run pressed while the arrival spec is still settling fences loud: no start under the stale spec", async () => {
    const { servedByModel, FROM, TO } = windowDocs();
    const { fetched } = stubDeferredWindow(servedByModel, FROM, TO);
    fakes?.unmount();
    let runs = 0;
    let bound: () => void = () => { throw new Error("bindRun never fired"); };
    fakes = mountEstateFakes({});
    const stageA = stage({ model: FROM, double_reference: true, use_stock_nodes: true, prompt: "keep the handwriting" });
    (stageA as { card: string }).card = "image-edit";
    render(h(StageDrill, {
      stage: stageA,
      bench: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [stageA], sessionKey: "main" },
      running: false,
      onRun: () => { runs += 1; }, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
      onPatchParams: () => {},
      renderStageView: (_o: unknown, fallback: unknown) => fallback,
      bindRun: (r: () => void) => { bound = r; },
    } as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    const knob = await screen.findByLabelText("Serving family", {}, { timeout: 4000 });
    fireEvent.click(knob);
    const items = screen.getAllByRole("menuitem");
    const target = items.find((el) => {
      const t = el.textContent ?? "";
      return t.includes("21") && !t.includes("2511");
    });
    if (target === undefined) throw new Error("no 21 menuitem; items: " + items.map((el) => el.textContent).join(" | "));
    fireEvent.click(target);
    // the re-point write landed AND the arrival fetch started — but
    // the arrival doc has NOT settled (the gate holds its promise).
    await waitFor(() => {
      const frame = patchParamsOf(patchCalls()).find((p) => p["model"] === TO);
      if (frame === undefined) throw new Error("re-point write not landed; patches: " + JSON.stringify(patchCalls()));
      if (!fetched.some((k) => k === TO)) throw new Error("arrival fetch not started; fetched: " + JSON.stringify(fetched));
    }, { timeout: 8000 });
    await awaitWriteSettled();
    // THE WINDOW PRESS: the start must NOT fire under the stale
    // spec — the seat fences with the settling voice instead. The
    // fast leg names the burn (the start fired); the voice leg
    // names the cure (the fence spoke).
    bound();
    await new Promise((r) => { setTimeout(r, 500); });
    expect(runs).toBe(0);
    const strip = await screen.findByText(/settl/i, {}, { timeout: 8000 });
    expect(strip.className).toMatch(/runError/);
  });

  test("W2 — the same press after the arrival settles starts clean (the fence lifts with the spec)", async () => {
    const { servedByModel, FROM, TO } = windowDocs();
    const { fetched, releaseArrival } = stubDeferredWindow(servedByModel, FROM, TO);
    fakes?.unmount();
    let runs = 0;
    let bound: () => void = () => { throw new Error("bindRun never fired"); };
    fakes = mountEstateFakes({});
    const stageA = stage({ model: FROM, double_reference: true, use_stock_nodes: true, prompt: "keep the handwriting" });
    (stageA as { card: string }).card = "image-edit";
    render(h(StageDrill, {
      stage: stageA,
      bench: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [stageA], sessionKey: "main" },
      running: false,
      onRun: () => { runs += 1; }, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
      onPatchParams: () => {},
      renderStageView: (_o: unknown, fallback: unknown) => fallback,
      bindRun: (r: () => void) => { bound = r; },
    } as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    const knob = await screen.findByLabelText("Serving family", {}, { timeout: 4000 });
    fireEvent.click(knob);
    const items = screen.getAllByRole("menuitem");
    const target = items.find((el) => {
      const t = el.textContent ?? "";
      return t.includes("21") && !t.includes("2511");
    });
    if (target === undefined) throw new Error("no 21 menuitem; items: " + items.map((el) => el.textContent).join(" | "));
    fireEvent.click(target);
    await waitFor(() => {
      if (!fetched.some((k) => k === TO)) throw new Error("arrival fetch not started; fetched: " + JSON.stringify(fetched));
    }, { timeout: 8000 });
    // the arrival lands — the rescope settles over the real doc.
    releaseArrival();
    await awaitWriteSettled();
    await waitFor(() => {
      const frame = patchParamsOf(patchCalls()).find((p) => p["model"] === TO);
      if (frame === undefined) throw new Error("re-point write not landed after settle");
    }, { timeout: 8000 });
    // THE POST-SETTLE PRESS: the fence is gone — the flush nulls the
    // departed pair and the start fires exactly once.
    bound();
    await waitFor(() => {
      const sync = patchParamsOf(patchCalls()).find((p) => "double_reference" in p);
      if (sync === undefined) throw new Error("run-flush null not landed; patches: " + JSON.stringify(patchCalls()));
      expect(sync["double_reference"]).toBeNull();
      expect(sync["use_stock_nodes"]).toBeNull();
    }, { timeout: 8000 });
    await awaitWriteSettled();
    expect(writeFace()).toBe(null);
    expect(runs).toBe(1);
  });

  test("W3 — a model-less arrival never clobbers the user's model with '' (the B8 floor): no silent ride, the refusal names the departed knob", async () => {
    // THE FLOOR'S PROMISE (stage-drill.tsx:374, `arrival !== ''`): the
    // rescope patch CARRIES model:arrival, so an arrival doc that
    // names no model must never seed the holding — the user's model
    // would read '' and the run would fire under no family. The
    // schema faces here are EQUAL (the DRILL-a shape: the pair is in
    // both docs' schemas, only the `params` surfaces differ), so the
    // schema-fields drop cannot clean the pair and the skipped
    // rescope nulls nothing either. The only lawful outcomes are a
    // clean start (impossible — nothing nulled the pair) or a LOUD
    // refusal naming the departed knob. A start under the pair, or
    // a model:'' write, is the silent burn this arm exists to catch.
    const { servedByModel, FROM, TO } = windowDocs();
    const { [TO]: toDoc, ...restDocs } = servedByModel;
    const { model: _dropped, ...modelLessTo } = toDoc as Record<string, unknown>;
    const { fetched, releaseArrival } = stubDeferredWindow({ ...restDocs, [TO]: modelLessTo }, FROM, TO);
    fakes?.unmount();
    let runs = 0;
    let bound: () => void = () => { throw new Error("bindRun never fired"); };
    fakes = mountEstateFakes({});
    const stageA = stage({ model: FROM, double_reference: true, use_stock_nodes: true, prompt: "keep the handwriting" });
    (stageA as { card: string }).card = "image-edit";
    render(h(StageDrill, {
      stage: stageA,
      bench: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [stageA], sessionKey: "main" },
      running: false,
      onRun: () => { runs += 1; }, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
      onPatchParams: () => {},
      renderStageView: (_o: unknown, fallback: unknown) => fallback,
      bindRun: (r: () => void) => { bound = r; },
    } as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    const knob = await screen.findByLabelText("Serving family", {}, { timeout: 4000 });
    fireEvent.click(knob);
    const items = screen.getAllByRole("menuitem");
    const target = items.find((el) => {
      const t = el.textContent ?? "";
      return t.includes("21") && !t.includes("2511");
    });
    if (target === undefined) throw new Error("no 21 menuitem; items: " + items.map((el) => el.textContent).join(" | "));
    fireEvent.click(target);
    await waitFor(() => {
      if (!fetched.some((k) => k === TO)) throw new Error("arrival fetch not started; fetched: " + JSON.stringify(fetched));
    }, { timeout: 8000 });
    // the model-less arrival lands — the rescope floor skips (no
    // model to carry), the B8 schema drop skips (faces equal).
    releaseArrival();
    await awaitWriteSettled();
    const landedModel = patchParamsOf(patchCalls()).find((p) => p["model"] === TO);
    if (landedModel === undefined) throw new Error("re-point write not landed after settle");
    // THE POST-SETTLE PRESS: the pair was nulled nowhere, so the
    // run must NOT fire under it — and no write may ever carry
    // model:'' (the floor). The compose gate refuses the candidate
    // against the served `params` surface, naming the knob.
    bound();
    await awaitWriteSettled();
    expect(runs).toBe(0);
    for (const p of patchParamsOf(patchCalls())) {
      expect(p["model"] ?? TO).not.toBe("");
    }
    const strips = await screen.findAllByText(/double_reference/, {}, { timeout: 8000 });
    expect(strips.length).toBeGreaterThan(0);
    // the run strip carries the gate's field-named refusal (a second
    // face, the form banner, carries the same voice — both loud).
    expect(strips.some((el) => (el as HTMLElement).className?.match(/runError/))).toBe(true);
  });
});

  test("a same-model knob set is NOT a re-point: the ordinary per-key write, no switch nulls", async () => {
    stubSpecDocs();
    fakes?.unmount();
    fakes = mountEstateFakes({});
    render(h(StageDrill, drillProps(stage({ model: "fam-a" })) as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    const knob = await screen.findByLabelText("Serving family", {}, { timeout: 4000 });
    fireEvent.click(knob);
    fireEvent.click(screen.getByRole("menuitem", { name: "Fam A" }));
    await waitFor(() => {
      const frames = patchParamsOf(patchCalls()).filter((p) => p["model"] === "fam-a");
      if (frames.length === 0) throw new Error("same-model write not landed");
      // the re-point never fired: the write carries ONLY the key set
      expect(Object.keys(frames[frames.length - 1])).toEqual(["model"]);
    }, { timeout: 8000 });
    await awaitWriteSettled();
    expect(writeFace()).toBe(null);
  });

  test("an engine stage's rail pick never re-derives: the frame rides verbatim (a brain route is a plain field, never a family re-key)", async () => {
    stubSpecDocs();
    fakes?.unmount();
    fakes = mountEstateFakes({});
    render(h(StageDrill, drillProps({ id: "s_0", engine: "comfyui", params: {} } as unknown as BenchStageView) as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    const rail = await screen.findByLabelText("Model", {}, { timeout: 4000 });
    fireEvent.click(rail);
    fireEvent.click(screen.getByRole("menuitem", { name: "Other Brain" }));
    await waitFor(() => {
      const frame = patchParamsOf(patchCalls()).find((p) => p["model"] === "other-brain");
      if (frame === undefined) throw new Error("rail pick write not landed; patches: " + JSON.stringify(patchCalls()));
      // the rail's own switch frame, undoubled by the drill: the
      // engine stage's re-point arm passes the frame through untouched
      expect(frame["variant"]).toBeNull();
      expect(frame["cfg"]).toBeNull();
      expect(frame["loras"]).toBeNull();
    }, { timeout: 8000 });
    // STROKE 66's spec half: the brain route never re-specs — the
    // drill's fetch family stays the engine id, never the picked key
    expect(servedFamilies.length).toBeGreaterThan(0);
    expect(servedFamilies.every((k) => k === "comfyui")).toBe(true);
    await awaitWriteSettled();
    expect(writeFace()).toBe(null);
  });
});

// ── THE ENGINE DOC'S OWN MODEL FIELD (the agent brain's seat): a
// cardless engine stage serves a doc whose schema declares a free
// `model` field (agentParams' "Brain route" — the one engine-side
// exception to the naming law). Typing it fires onSet('model', v)
// with NO card on the stage: the re-point arm's guard reads the
// absent card and falls through to the plain write. ────────────────

/** The agent-mirrored doc (agentFormDoc's shape): the schema `model`
 *  field is free text — no consts, so no select menu and no rail
 *  (families are empty); `model: 'agent'` is the doc's identity, the
 *  door's engine arm serving it verbatim. */
function agentDoc(): Record<string, unknown> {
  return {
    form: 'agent', genre: 'agent', engine: 'agent', model: 'agent',
    schema: schemaEnvelope({
      prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
      model: { type: 'string', meta: { description: 'Brain route' } },
    }),
    families: [], variants: [],
    features: { modifiers: [] },
  };
}

describe("the engine doc's own model field (the re-point arm's absent-card fall-through)", () => {
  test("typing a brain route writes the one key verbatim: the guard reads the absent card and falls through — no switch nulls, no re-spec", async () => {
    servedFamilies.length = 0;
    vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
      const path = String(url);
      if (path.includes("/v1/form-spec")) {
        const key = path.split("model=")[1] ?? "";
        servedFamilies.push(key);
        if (key !== "agent") throw new Error("the agent stage never specs another family: " + key);
        return new Response(JSON.stringify(agentDoc()), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (path.includes("/v1/forms")) {
        return new Response(JSON.stringify({ "agent": { outputs: { default: "text" } } }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (path.includes("/v1/model-catalog")) {
        return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error("unexpected door on the fetch lane: " + path);
    });
    fakes?.unmount();
    fakes = mountEstateFakes({});
    render(h(StageDrill, drillProps({ id: "s_0", engine: "agent", params: {} } as unknown as BenchStageView) as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    const route = await screen.findByLabelText("Brain route", {}, { timeout: 4000 });
    const user = userEvent.setup();
    await user.type(route, "deepseek-v3");
    await waitFor(() => {
      const frames = patchParamsOf(patchCalls()).filter((p) => p["model"] === "deepseek-v3");
      if (frames.length === 0) throw new Error("brain route write not landed; patches: " + JSON.stringify(patchCalls()));
      // THE PLAIN FIELD FACE (stroke 66): every keystroke frame rides
      // the single key verbatim — the re-point arm never fired, so no
      // switch-law nulls ride along (a brain route is not a re-key)
      for (const frame of frames) expect(Object.keys(frame)).toEqual(["model"]);
    }, { timeout: 8000 });
    // STROKE 66's onSet half: the route never re-specs AS THE PICKED
    // KEY — the cardless family resolves to the engine id every time
    // (the re-arrival after the write refetches the engine's own doc)
    expect(servedFamilies.length).toBeGreaterThan(0);
    expect(servedFamilies.every((k) => k === "agent")).toBe(true);
    await awaitWriteSettled();
    expect(writeFace()).toBe(null);
  });
});

// ── THE MODEL-LESS CARD ALIAS (the door's other honest shape): a
// card whose board carries no model serves `model: null` (discovery's
// specBody emits `res.model ?? null` on the boarded[0]-empty arm).
// The re-point guard reads that null as "no held model" — the alias
// owns no vocabulary, so the switch law collapses to the one-key
// write. ─────────────────────────────────────────────────────────────

/** The alias doc (agentDoc's shape with the door's null identity):
 *  the schema `model` field is free text and families are empty, so
 *  no rail seats it — typing fires the drill's own onSet. */
function routelessDoc(): Record<string, unknown> {
  return {
    form: 'agent', genre: 'agent', engine: 'agent', model: null,
    schema: schemaEnvelope({
      prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
      model: { type: 'string', meta: { description: 'Brain route' } },
    }),
    families: [], variants: [],
    features: { modifiers: [] },
  };
}

describe("the model-less card alias (the re-point guard reads the null held model)", () => {
  test("typing a brain route on a cardless-board alias re-points through the switch law: the null model falls through to the one-key write", async () => {
    servedFamilies.length = 0;
    vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
      const path = String(url);
      if (path.includes("/v1/form-spec")) {
        const key = path.split("model=")[1] ?? "";
        servedFamilies.push(key);
        if (key !== "agent-canvas" && key !== "deepseek-v3") throw new Error("the alias stage never specs another family: " + key);
        return new Response(JSON.stringify(routelessDoc()), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (path.includes("/v1/forms")) {
        return new Response(JSON.stringify({ "agent-canvas": { outputs: { default: "text" } }, "deepseek-v3": { outputs: { default: "text" } } }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (path.includes("/v1/model-catalog")) {
        return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error("unexpected door on the fetch lane: " + path);
    });
    fakes?.unmount();
    fakes = mountEstateFakes({});
    render(h(StageDrill, drillProps({ id: "s_0", card: "agent-canvas", engine: "agent", params: {} } as unknown as BenchStageView) as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    const route = await screen.findByLabelText("Brain route", {}, { timeout: 4000 });
    const user = userEvent.setup();
    await user.type(route, "deepseek-v3");
    await waitFor(() => {
      const frames = patchParamsOf(patchCalls()).filter((p) => p["model"] === "deepseek-v3");
      if (frames.length === 0) throw new Error("alias route write not landed; patches: " + JSON.stringify(patchCalls()));
      // THE ALIAS SWITCH FACE: the guard fired (card rides, null held
      // model ≠ the typed route) but the alias doc owns no departing
      // vocabulary — the switch patch contributes nothing, so every
      // frame still carries the single key verbatim
      for (const frame of frames) expect(Object.keys(frame)).toEqual(["model"]);
    }, { timeout: 8000 });
    // THE PER-MODEL RE-ARRIVAL: the mount spec'd under the card alias
    // (family = the card id, params seed no model); the write re-keys
    // the drill's own family to the typed route and the spec door is
    // re-asked under THAT key
    expect(servedFamilies[0]).toBe("agent-canvas");
    expect(servedFamilies).toContain("deepseek-v3");
    await awaitWriteSettled();
    expect(writeFace()).toBe(null);
  });
});

// ── THE RE-POINT WRITE'S SETTLE FACES (the 2026-11-02 one-voice law
// at the seat the switch cure added): both promise halves × both
// alive-guard arms, each with its OWN firing arm (the split-brain
// lesson). ─────────────────────────────────────────────────────────
describe("the re-point write's settle faces (each half's own guard)", () => {
  const stageB: BenchStageView = { id: "s_1", card: "image-gen", engine: "comfyui", params: { model: "krea-2" } };

  async function openKnobDrill(estate?: EstateOpts): Promise<ReturnType<typeof render>> {
    stubSpecDocs();
    fakes?.unmount();
    fakes = mountEstateFakes(estate);
    return render(h(StageDrill, drillProps(stage({ model: "fam-a" })) as never));
  }

  async function pickFamB(): Promise<void> {
    const knob = await screen.findByLabelText("Serving family", {}, { timeout: 4000 });
    fireEvent.click(knob);
    fireEvent.click(screen.getByRole("menuitem", { name: "Fam B 1536 Int8" }));
  }

  test("a clean re-point settling over a stale failed key speaks the row's voice (the then-half, no re-target)", async () => {
    await openKnobDrill({ patchFailures: [{ reason: "prompt busy" }] });
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    // the residue lands first: the typed prompt's write fails, the key
    // stays failed in the ledger
    await typePrompt("a red cube");
    await waitFor(() => {
      expect(stageWriteState("bench-p", "s_0").failedKeys).toContain("prompt");
    }, { timeout: 8000 });
    // the re-point lands CLEAN — its settle reads the ROW, and the row
    // still holds the prompt failure: the face speaks the row's voice
    await pickFamB();
    await waitFor(() => {
      const face = writeFace();
      if (face === null || !face.includes("unlanded keys: prompt")) {
        throw new Error("row voice not up yet; face: " + face);
      }
    }, { timeout: 8000 });
  });

  test("a clean re-point settling after a re-target stands down (the then-half's guard)", async () => {
    let gateCalls = 0;
    let release: (() => void) | undefined;
    const gate = (): Promise<void> => {
      gateCalls += 1;
      if (gateCalls === 1) return Promise.resolve();
      return new Promise<void>((resolve) => { release = resolve; });
    };
    const view = await openKnobDrill({ patchGate: gate, patchFailures: [{ reason: "prompt busy" }] });
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    await typePrompt("a red cube");
    await waitFor(() => {
      expect(stageWriteState("bench-p", "s_0").failedKeys).toContain("prompt");
    }, { timeout: 8000 });
    await pickFamB(); // the re-point write parks at the door
    view.rerender(h(StageDrill, drillProps(stageB) as never));
    release?.();
    await waitFor(() => {
      if (stageWriteState("bench-p", "s_0").pending !== 0) throw new Error("re-point still parked");
    }, { timeout: 8000 });
    // the guard held: the s_0 residue never voiced onto the s_1 view
    expect(writeFace()).toBe(null);
  });

  test("a re-point the door rejects speaks the row's voice (the refusal half, no re-target)", async () => {
    let release: (() => void) | undefined;
    const gate = (): Promise<void> => new Promise<void>((resolve) => { release = resolve; });
    await openKnobDrill({ patchGate: gate, patchFailures: [{ reason: "model busy" }] });
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    await pickFamB(); // the re-point write parks, then refuses
    release?.();
    await waitFor(() => {
      const face = writeFace();
      if (face === null || !face.includes("unlanded keys:") || !face.includes("model")) {
        throw new Error("refusal voice not up yet; face: " + face);
      }
    }, { timeout: 8000 });
  });

  test("a re-point rejection settling after a re-target stands down (the refusal half's guard)", async () => {
    let release: (() => void) | undefined;
    const gate = (): Promise<void> => new Promise<void>((resolve) => { release = resolve; });
    const view = await openKnobDrill({ patchGate: gate, patchFailures: [{ reason: "model busy" }] });
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    await pickFamB();
    view.rerender(h(StageDrill, drillProps(stageB) as never));
    release?.();
    await waitFor(() => {
      if (stageWriteState("bench-p", "s_0").pending !== 0) throw new Error("re-point still parked");
    }, { timeout: 8000 });
    // the guard held; the row keeps its memory (the next settle re-voices)
    expect(writeFace()).toBe(null);
    expect(stageWriteState("bench-p", "s_0").failedKeys).toContain("model");
  });
});

// ── THE ENHANCE FLIGHT'S ABORT ARM: the drill's unmount aborts the
// ✦ controller; a door answer that arrives after the abort is
// discarded BEFORE the sweep — no write, no ghost, no crash. ────────
describe("the enhance flight abandoned mid-flight", () => {
  test("a door answer landing after the unmount abort writes nothing", async () => {
    stubFetch();
    fakes?.unmount();
    fakes = mountEstateFakes({});
    const binds: Array<() => Promise<void> | void> = [];
    const view = render(h(StageDrill, drillProps(stage({ model: "krea-2", prompt: "a red cube" }), (v) => { binds.push(v); }) as never));
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    expect(binds.length).toBeGreaterThan(0);
    void binds[binds.length - 1](); // the ✦ verb: the fetch parks at the deferred door
    await waitFor(() => {
      if (resolveEnhance === null) throw new Error("enhance flight not parked yet");
    }, { timeout: 8000 });
    view.unmount(); // THE UNMOUNT ABORT (the flight's own controller)
    resolveEnhance?.({ results: { prompt: { positive: "P2" } } }, 200);
    await awaitWriteSettled();
    // the answered door produced NOTHING: the aborted flight's
    // response is discarded before the sweep ever composes a write
    const swept = patchParamsOf(patchCalls()).some((p) => p["prompt"] === "P2");
    expect(swept).toBe(false);
  });
});

// ── THE DRILL'S PREVIEW FACES THROUGH THE DECLARED OUTPUT (the
// tagger seat + the walk's run identity): the seat click reads the
// served doc's own kind and the history rows' run_ids. ──────────────

/** The preview-wire mount (the one-fake law): the bench rides the
 *  bound namespaces, fetch answers only the /v1 discovery doors plus
 *  the artifact body the face under test fetches. */
function stubPreviewWire(opts: { doc: Record<string, unknown>; stage: Record<string, unknown>; body?: string }): CardsBenchValue {
  const bench: CardsBenchValue = {
    kind: "bench", draftId: "bench-face", rev: 1, sessionKey: "face",
    stages: [opts.stage as unknown as BenchStageView], log: [],
  };
  mountEstateFakes({
    benchDoc: { draft_id: "bench-face", rev: 1, stages: [opts.stage], log: [] },
    runDocs: [],
  });
  const outputs = (opts.doc as { outputs?: Record<string, string> }).outputs ?? { default: "image" };
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify(opts.doc), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({ [String(opts.doc["form"])]: { outputs } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (opts.body !== undefined && path === "/out/caption.txt") {
      return new Response(opts.body, { status: 200 });
    }
    throw new Error("unexpected door on the fetch lane: " + path);
  });
  return bench;
}

function mountTab(bench: CardsBenchValue): void {
  const noop = (): void => {};
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: noop },
    } }),
    useResource: () => ({ status: "live" as const, value: bench }),
  }));
}

describe("the drill's preview faces through the declared output", () => {
  test("a declared text output previews its WORDS (the tagger seat: TextStagePreview, never a dead tile)", async () => {
    const bench = stubPreviewWire({
      doc: {
        form: "tagger", genre: "image", engine: "comfyui",
        schema: schemaEnvelope({
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        }),
        outputs: { default: "text" },
      },
      stage: {
        id: "s_0", card: "tagger", title: "the stage", engine: "comfyui", params: {},
        runStatus: "done",
        result: { artifacts: { caption: "/out/caption.txt" } },
      },
      body: "the caption words",
    });
    mountTab(bench);
    const user = userEvent.setup();
    const tile = document.querySelector('[role="button"][class*="tileInner"]') as HTMLElement;
    await user.click(tile);
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await waitFor(() => {
      expect(document.querySelector('[data-testid="stage-preview-text"]')).not.toBeNull();
    }, { timeout: 4000 });
    await waitFor(() => {
      const body = document.querySelector('[data-testid="stage-preview-text-body"]');
      if (body === null) throw new Error("text body not landed yet");
      expect(body.textContent).toBe("the caption words");
    }, { timeout: 4000 });
    // the kind switch routed by the DECLARED output: the image face
    // never mounted for a text card
    expect(document.querySelector('[data-testid="stage-preview-image"]')).toBeNull();
  });

  test("the walk builds at open with the run identity: one seat per run_id, first spelling wins", async () => {
    const bench = stubPreviewWire({
      doc: {
        form: "image-gen", genre: "image", engine: "comfyui",
        schema: schemaEnvelope({
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        }),
      },
      stage: {
        id: "s_0", card: "image-gen", title: "the stage", engine: "comfyui", params: {},
        runStatus: "done",
        result: { run_id: "r0", artifacts: { output: "/media/hero.png" } },
        history: [
          { run_id: "r1", artifacts: { output: "/media/walk.png" } },
          { run_id: "r1", artifacts: { output: "/infer-gallery/artifact?path=%2Fmedia%2Fwalk.png" } },
        ],
      },
    });
    mountTab(bench);
    const user = userEvent.setup();
    const tile = document.querySelector('[role="button"][class*="tileInner"]') as HTMLElement;
    await user.click(tile);
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const seat = await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    fireEvent.click(seat);
    // the lightbox is the LAST img in the seat's document order — the
    // walk's face is read there, never off the preview's own imgs
    const boxImg = (): HTMLImageElement | null => {
      const all = document.querySelectorAll("img");
      return all.length > 0 ? all[all.length - 1] as HTMLImageElement : null;
    };
    // the walk opened at the hero
    await waitFor(() => {
      const img = boxImg();
      if (img === null || (img.getAttribute("alt") ?? "") !== "hero.png") throw new Error("the walk did not open at the hero");
    }, { timeout: 4000 });
    // the walk's archived seat: the run's FIRST spelling
    fireEvent.click(screen.getByTestId("drill-next"));
    await waitFor(() => {
      const img = boxImg();
      if (img === null || (img.getAttribute("alt") ?? "") !== "walk.png") throw new Error("the walk never reached the archived seat");
      expect(img.getAttribute("src")).toBe("/media/walk.png");
    }, { timeout: 4000 });
    // the walk's END holds: the twin spelling never seats
    fireEvent.click(screen.getByTestId("drill-next"));
    await waitFor(() => {
      const img = boxImg();
      if (img === null || (img.getAttribute("alt") ?? "") !== "walk.png") throw new Error("the walk left the line");
      expect(img.getAttribute("src")).toBe("/media/walk.png");
    }, { timeout: 4000 });
    for (const i of Array.from(document.querySelectorAll("img"))) {
      expect((i.getAttribute("src") ?? "").includes("infer-gallery")).toBe(false);
    }
  });
});

// ── E2-11(a): THE REGION-MASK PICKER LAW ────────────────────────────
// The operator's burn: "THIS IS NOT SHOWING MY MASK IN THE ADD REGION
// MASK WHEN I MADE ONE WITH THE MASK NODE IN THE FLOW". The mask mod's
// input seat is NOT a declared card input edge (image-gen declares
// only prompt:text) — so the edge law's narrowing CANNOT apply, and
// the picker serves the RAW artifact rows: a run MASK node's 'seg'
// output (result.url present) IS offered, exactly like every other
// artifact. A future "narrowing" of edge-less fields to image-kind
// producers would drop the mask node (its declared output kind is
// 'seg', not 'image') and re-ship the operator's burn — this wall
// fires the day that happens. An UNRUN stage has no artifact; the
// honest empty ("nothing to pick yet") is the true state, never a
// filter's lie.
describe("THE REGION-MASK PICKER (E2-11a — the mask node's artifact is offered at the mask seat)", () => {
  test("a run mask node's 'seg' artifact lists in the mask mod's From-flow picker — no edge filter drops it", async () => {
    stubFetch({
      ...axisSpecDoc(),
      features: {
        modifiers: [
          {
            kind: "mask", label: "Region Mask", param_key: "mask", cardinality: "list", max_stack: 1,
            fields: [{ name: "input_mask", type: "image", label: "Region Mask" }],
          },
        ],
      },
    }, {
      "image-gen": { outputs: { default: "image" } },
      "mask": { outputs: { default: "seg" } },
    });
    fakes?.unmount();
    fakes = mountEstateFakes({
      benchDoc: {
        draft_id: "bench-p", rev: 1, log: [],
        stages: [
          { ...stage({ model: "krea-2" }), run_status: undefined },
          { id: "s_mask", card: "mask", engine: "comfyui", params: {}, title: "Mask Node",
            result: { url: "/melite-media/runs/r1/region.png" } },
        ],
      },
      draftStages: [
        stage({ model: "krea-2" }),
        { id: "s_mask", card: "mask", engine: "comfyui", params: {}, title: "Mask Node",
          result: { url: "/melite-media/runs/r1/region.png" } },
      ],
      draftBenchRev: 1,
    });
    const view = render(h(StageDrill, {
      ...drillProps(stage({ model: "krea-2" })),
      bench: {
        kind: "bench", draftId: "bench-p", rev: 1, log: [], sessionKey: "main",
        stages: [
          stage({ model: "krea-2" }),
          {
            id: "s_mask", card: "mask", engine: "comfyui", params: {}, title: "Mask Node",
            result: { url: "/melite-media/runs/r1/region.png" },
          } as unknown as BenchStageView,
        ],
      },
    } as never));
    try {
      await screen.findByLabelText("Prompt", {}, { timeout: 6000 });
      // the mod section's add square → the kind menu → the create leaf
      await waitFor(() => {
        if (document.querySelector('[data-testid="cb-mods-section"]') === null) throw new Error("mods section not served");
      }, { timeout: 4000 });
      fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement);
      fireEvent.click(screen.getByRole("menuitem", { name: "Region Mask" }));
      // the FIELD-kind leaf renders the image input as the square;
      // its menu's From flow opens the picker
      fireEvent.click(screen.getByRole("button", { name: "Region Mask source" }));
      fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }, { timeout: 4000 }));
      const rows = await screen.findAllByTestId("source-pick-row", {}, { timeout: 4000 });
      const labels = rows.map((r) => r.textContent ?? "");
      expect(labels.some((l) => l.includes("Mask Node"))).toBe(true);
      // and picking it writes the region artifact into the entry's
      // input_mask (the slot is the wire)
      fireEvent.click(rows.find((r) => (r.textContent ?? "").includes("Mask Node"))!);
      fireEvent.click(screen.getByRole("button", { name: "Add" }));
      await waitFor(() => {
        const call = patchCalls().at(-1);
        const bag = ((call?.patch as Record<string, unknown> | undefined)?.params as Record<string, unknown> | undefined)?.mask;
        if (!Array.isArray(bag) || bag.length !== 1
          || (bag[0] as Record<string, unknown>)?.input_mask !== "/melite-media/runs/r1/region.png") {
          throw new Error("the pick never landed in the mask bag: " + JSON.stringify(call));
        }
      }, { timeout: 6000 });
    } finally {
      view.unmount();
    }
  });
});
