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
  const zoom = document.querySelector('div[class*="zoomCard"]') as HTMLElement;
  fireEvent.click(within(zoom).getByRole("button", { name: "Agent Enhance" }));
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

  test("an enhance write landing over a stale failed key speaks the enhance banner", async () => {
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
    await waitFor(() => {
      const face = writeFace();
      if (face === null || !face.includes("THE ENHANCE DID NOT LAND")) {
        throw new Error("enhance banner not voiced yet; face: " + face);
      }
    }, { timeout: 8000 });
    expect(writeFace()).toContain("unlanded keys: variant");
  });

  test("a rejected enhance write renders its face (the sweep's own catch)", async () => {
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
      if (face === null || !face.includes("THE ENHANCE DID NOT LAND")) {
        throw new Error("enhance banner not voiced yet; face: " + face);
      }
    }, { timeout: 8000 });
    expect(writeFace()).toContain("engine flooded");
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
