// @vitest-environment happy-dom
// cards-tab-picker.spec.tsx — the drill's slot picker + slot flush
// (2026-09-16 burn-down, installment 3b-picker): the edge-law
// narrowing (declared match/mismatch/absent, undeclared field, no
// inputs), the pick's immediate bench flush (url + clear), the
// unset path (held key, base-only key), and the slot-write failure
// voice. The picker menu rides the square provider; the flow modal
// lists the other stages' latest outputs.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes, type EstateRefusal } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from '@melite/card-base/client';
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

// THE ONE-FAKE LAW (stroke 81): estate verbs ride the bound
// namespaces (mountEstateFakes); fetch answers ONLY the /v1
// discovery doors. specMode stays live module state so tests arm
// it before the mount, exactly like the old doors.
type SpecMode = "edge" | "plain" | "mesh";
let specMode: SpecMode = "edge";

let fakes: EstateFakes | null = null;

function calls(): Array<{ method: string; args: Record<string, unknown> }> {
  if (fakes === null) throw new Error("estate fakes not mounted");
  return fakes.calls;
}

/** Every drafts/patch params write, in call order (the slot-write
 *  record the old doors.patches kept). */
function patches(): Array<Record<string, unknown>> {
  return calls()
    .filter((p) => p.method === "drafts/patch")
    .map((p) => (((p.args["patch"] as Record<string, unknown>)["params"] ?? {}) as Record<string, unknown>));
}

function stubFetch(): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      const fields: Parameters<typeof schemaEnvelope>[0] = specMode === "mesh"
        ? {
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
          rigged_glb: { type: "mesh", meta: { description: "Donor mesh" } },
        }
        : {
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
          input_image: { type: "image", meta: { description: "Input image" } },
          extra: { type: "image", meta: { description: "Extra" } },
        };
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        ...(specMode === "edge"
          ? { inputs: [{ name: "input_image", kind: "image", required: true }] }
          : specMode === "mesh"
            ? { inputs: [{ name: "rigged_glb", kind: "mesh", required: true }] }
            : {}),
        schema: schemaEnvelope(fields),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({
        "image-gen": { outputs: { default: "image" } },
        "mesh-gen": { outputs: { default: "mesh" } },
        tts: { outputs: { default: "audio" } },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

interface EstateOpts {
  refusals?: EstateRefusal[];
  throws?: EstateRefusal[];
}

function stages(
  mainParams: Record<string, unknown> = {},
  mainResolved: Record<string, unknown> = {},
  extra: BenchStageView[] = [],
): BenchStageView[] {
  return [
    { id: "s_0", card: "image-gen", engine: "comfyui", params: mainParams, resolved: mainResolved },
    { id: "s_img", card: "image-gen", engine: "comfyui", params: {}, result: { url: "/r/img.png" } },
    { id: "s_tts", card: "tts", title: "Voice", engine: "comfyui", params: {}, result: { url: "/r/voice.wav" } },
    { id: "s_nourl", card: "image-gen", engine: "comfyui", params: {}, result: { url: "" } },
    { id: "s_junk", card: "image-gen", engine: "comfyui", params: {}, result: "junk" },
    { id: "s_ghost", engine: "comfyui", params: {}, result: { url: "/g.png" } },
    ...extra,
  ];
}

function mountBench(
  mainParams: Record<string, unknown> = {},
  mainResolved: Record<string, unknown> = {},
  estate?: EstateOpts,
  extra: BenchStageView[] = [],
  mode: SpecMode = "edge",
): void {
  specMode = mode;
  stubFetch();
  const rows = stages(mainParams, mainResolved, extra);
  fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: rows },
    draftStages: rows as Array<Record<string, unknown>>,
    draftBenchRev: 1,
    refusals: estate?.refusals,
    throws: estate?.throws,
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: rows } as unknown as CardsBenchValue }),
  }));
}

async function openMainDrill(): Promise<void> {
  const user = userEvent.setup();
  const tile = document.querySelector('button[class*="tileInner"]') as HTMLElement;
  await user.click(tile);
  await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
  await screen.findByText("Prompt", {}, { timeout: 4000 });
}

async function openFlowModal(fieldName: string): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: new RegExp(fieldName + " source") }));
  const flow = await screen.findByText("From flow", {}, { timeout: 4000 });
  fireEvent.click(flow.closest('[role="menuitem"], [role="option"], li') as HTMLElement);
  await screen.findAllByTestId("source-pick-row", {}, { timeout: 4000 });
}

function pickRowLabels(): string[] {
  return [...document.querySelectorAll('[data-testid="source-pick-row"]')].map((el) => el.textContent ?? "");
}

describe("the picker narrowing — the edge law, served per field", () => {
  test("a declared image edge offers only image-declared rows", async () => {
    mountBench();
    await openMainDrill();
    await openFlowModal("Input image");
    const labels = pickRowLabels();
    expect(labels.some((t) => t.includes("image-gen"))).toBe(true);
    expect(labels.some((t) => t.includes("Voice"))).toBe(false);
    expect(labels.some((t) => t.includes("s_ghost"))).toBe(false);
  });

  test("a field with no declared edge falls to every row with a url", async () => {
    mountBench();
    await openMainDrill();
    await openFlowModal("Extra");
    const labels = pickRowLabels();
    expect(labels.some((t) => t.includes("image-gen"))).toBe(true);
    expect(labels.some((t) => t.includes("Voice"))).toBe(true);
    expect(labels.some((t) => t.includes("s_ghost"))).toBe(true);
  });

  test("a spec with no inputs falls to every row with a url", async () => {
    mountBench();
    specMode = "plain";
    await openMainDrill();
    await openFlowModal("Input image");
    const labels = pickRowLabels();
    expect(labels.some((t) => t.includes("image-gen"))).toBe(true);
    expect(labels.some((t) => t.includes("Voice"))).toBe(true);
  });
});

describe("the slot flush — a pick writes the bench now, not at Run", () => {
  test("picking a row's output patches the param to its url", async () => {
    mountBench();
    await openMainDrill();
    await openFlowModal("Input image");
    fireEvent.click(
      [...document.querySelectorAll('[data-testid="source-pick-row"]')]
        .find((el) => (el.textContent ?? "").includes("image-gen")) as HTMLElement,
    );
    await waitFor(() => { expect(patches().length).toBeGreaterThan(0); });
    expect(patches()[patches().length - 1]).toEqual({ input_image: "/r/img.png" });
    // the square mirrors the pick (the user layer moved too — the
    // filled square now offers its detach affordance)
    expect(screen.getByRole("button", { name: "Detach Input image" })).toBeTruthy();
  });

  test("the picker's clear row nulls the param (never an empty-string write)", async () => {
    mountBench({ input_image: "/held.png" });
    await openMainDrill();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Input image source/ }));
    const clear = await screen.findByText("— clear —", {}, { timeout: 4000 });
    fireEvent.click(clear.closest('[role="menuitem"], [role="option"], li') as HTMLElement);
    await waitFor(() => { expect(patches().length).toBeGreaterThan(0); });
    expect(patches()[patches().length - 1]).toEqual({ input_image: null });
  });

  test("picking a mesh row's output patches the mesh param to its url", async () => {
    mountBench({}, {}, undefined, [
      { id: "s_mesh", card: "mesh-gen", engine: "comfyui", params: {}, result: { url: "/r/donor.glb" } },
    ], "mesh");
    await openMainDrill();
    await openFlowModal("Donor mesh");
    fireEvent.click(
      [...document.querySelectorAll('[data-testid="source-pick-row"]')]
        .find((el) => (el.textContent ?? "").includes("mesh-gen")) as HTMLElement,
    );
    await waitFor(() => { expect(patches().length).toBeGreaterThan(0); });
    expect(patches()[patches().length - 1]).toEqual({ rigged_glb: "/r/donor.glb" });
    expect(screen.getByRole("button", { name: "Detach Donor mesh" })).toBeTruthy();
  });

  test("a refused slot write voices the door (never a silent pick)", async () => {
    // the refusal is queued at mount (the pick is the first
    // drafts/patch call — no write fires while the drill opens).
    mountBench({}, {}, { refusals: [{ method: "drafts/patch", message: "bench moved" }] });
    await openMainDrill();
    await openFlowModal("Input image");
    fireEvent.click(
      [...document.querySelectorAll('[data-testid="source-pick-row"]')]
        .find((el) => (el.textContent ?? "").includes("image-gen")) as HTMLElement,
    );
    expect(await screen.findByText(/bench moved/, {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a throwing slot write voices the fallback (never a throw past the pick)", async () => {
    // the old stub threw the bare string "kablam" (a non-Error, so
    // the client voiced its 'slot write failed' fallback); the live
    // seam throws Errors, so the queued message IS the voiced text.
    mountBench({}, {}, { throws: [{ method: "drafts/patch", message: "slot write failed" }] });
    await openMainDrill();
    await openFlowModal("Input image");
    fireEvent.click(
      [...document.querySelectorAll('[data-testid="source-pick-row"]')]
        .find((el) => (el.textContent ?? "").includes("image-gen")) as HTMLElement,
    );
    expect(await screen.findByText(/slot write failed/, {}, { timeout: 4000 })).toBeTruthy();
  });
});

describe("the unset path — removing an override re-derives the row", () => {
  test("detaching a held image nulls the bench key now", async () => {
    mountBench({ input_image: "/held.png" });
    await openMainDrill();
    fireEvent.click(screen.getByRole("button", { name: "Detach Input image" }));
    await waitFor(() => { expect(patches().length).toBeGreaterThan(0); });
    expect(patches()[patches().length - 1]).toEqual({ input_image: null });
  });

  test("detaching a base-served image still nulls the bench key", async () => {
    mountBench({}, { input_image: "/base.png" });
    await openMainDrill();
    // the user map never held the key — the unset is a pure null
    // write (the hasOwnProperty passthrough keeps its own map)
    expect(patches()).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Detach Input image" }));
    await waitFor(() => { expect(patches().length).toBeGreaterThan(0); });
    expect(patches()[patches().length - 1]).toEqual({ input_image: null });
  });
});
