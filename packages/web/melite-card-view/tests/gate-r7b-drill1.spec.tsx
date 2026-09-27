// @vitest-environment happy-dom
// gate-r7b-drill1.spec.tsx — StageDrill's gesture fallback arms (the
// R7B burn-down): the slot flush's foreign voice, the enhance
// slot-write guard, and the remove/ungroup foreign voices. CardsTab
// mounts (the drill rides the zoom), estate verbs on
// mountEstateFakes, fetch answering ONLY the /v1 discovery doors +
// the enhance tool.
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/estate-remote";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from "../src/client/spec-form.tsx";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";
import type { StageViewOwnerProps } from "../src/client/types.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

type EstateOpts = Parameters<typeof mountEstateFakes>[0];

const doors: {
  formsTable: "ok" | "fail";
  specFields: "prompt" | "prompt-image";
  specInputs: boolean;
  enhance: "ok" | "deferred";
  enhanceResults: unknown;
  enhanceCalls: number;
} = {
  formsTable: "ok", specFields: "prompt", specInputs: false,
  enhance: "ok", enhanceResults: {}, enhanceCalls: 0,
};

let fakes: EstateFakes | null = null;

function calls(): EstateFakes["calls"] {
  if (fakes === null) throw new Error("estate fakes not mounted");
  return fakes.calls;
}

function stubFetch(): void {
  doors.formsTable = "ok";
  doors.specFields = "prompt";
  doors.specInputs = false;
  doors.enhance = "ok";
  doors.enhanceResults = {};
  doors.enhanceCalls = 0;
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      const fields: Record<string, unknown> = {
        prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
      };
      if (doors.specFields === "prompt-image") {
        fields["input_image"] = { type: "image", meta: { description: "Input image" } };
      }
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        ...(doors.specInputs ? { inputs: [{ name: "input_image", kind: "image", required: true }] } : {}),
        schema: schemaEnvelope(fields),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      if (doors.formsTable === "fail") return new Response("gone", { status: 500 });
      return new Response(JSON.stringify({
        "image-gen": { outputs: { default: "image" } },
        tts: { outputs: { default: "audio" } },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path === "/melite-tools/enhance") {
      doors.enhanceCalls += 1;
      if (doors.enhance === "deferred") return new Promise<Response>(() => {});
      return new Response(JSON.stringify({ results: doors.enhanceResults }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

function mountBench(
  stages: BenchStageView[],
  renderSlot?: Parameters<typeof CardsTab>[0]["renderSlot"],
  estate?: EstateOpts,
): void {
  stubFetch();
  fakes?.unmount();
  fakes = mountEstateFakes({
    benchDoc: {
      draft_id: "bench-p", rev: 1, log: [],
      stages: stages.map((s) => ({ ...s, run_status: (s as { runStatus?: string }).runStatus })),
    },
    draftStages: stages as Array<Record<string, unknown>>,
    draftBenchRev: 1,
    startDocs: estate?.startDocs,
    refusals: estate?.refusals,
    throws: estate?.throws,
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages } as CardsBenchValue }),
    ...(renderSlot !== undefined ? { renderSlot } : {}),
  }));
}

function firstTile(): HTMLElement {
  const el = document.querySelector('button[class*="tileInner"]');
  if (el === null) throw new Error("tile button not found");
  return el as HTMLElement;
}

async function openFirstTile(): Promise<void> {
  const user = userEvent.setup();
  await user.click(firstTile());
  await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
}

describe("the slot flush's foreign voice — a down wire still names the face", () => {
  test("a foreign slot-write throw voices 'slot write failed' (never a throw past the pick)", async () => {
    doors.formsTable = "fail";
    doors.specFields = "prompt-image";
    mountBench([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: {} },
      { id: "s_1", card: "image-gen", engine: "comfyui", params: {}, result: { url: "/b.png" } },
    ], undefined, { throws: [{ method: "drafts/patch", value: "kablam" }] });
    doors.formsTable = "fail";
    doors.specFields = "prompt-image";
    doors.specInputs = true;
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /input image source/i }));
    const flow = await screen.findByText("From flow", {}, { timeout: 4000 });
    fireEvent.click(flow.closest('[role="menuitem"], [role="option"], li') as HTMLElement);
    const rows = await screen.findAllByTestId("source-pick-row", {}, { timeout: 4000 });
    const pick = rows.find((el) => (el.textContent ?? "").includes("/b.png")) ?? rows[rows.length - 1];
    fireEvent.click(pick);
    // the pick wrote the bench row NOW (the slot flush law) — the
    // wire's foreign throw lands as the fallback text
    expect(await screen.findByText("slot write failed", {}, { timeout: 4000 })).toBeTruthy();
    expect(calls().some((p) => p.method === "drafts/patch")).toBe(true);
  });
});

describe("the owners' foreign voices — remove and ungroup fall back loud", () => {
  function mountClaimed(stages: BenchStageView[], claim: (owner: Record<string, unknown>) => unknown, estate?: EstateOpts): void {
    mountBench(stages, ((slot: string, owner: Record<string, unknown>, opts: { fallback: unknown }) => {
      if (slot !== "cards.stage.view") return opts.fallback;
      return h("div", null,
        opts.fallback as never,
        h("div", { "data-testid": "slot-claim" }, claim(owner) as never),
      );
    }) as never, estate);
  }

  function claimWireOwner(stages: BenchStageView[], estate?: EstateOpts): () => StageViewOwnerProps {
    let latest: StageViewOwnerProps | undefined
    mountClaimed(stages, (owner) => {
      // the claim observes the wire owner's untyped test double — the
      // slot hands a Record, the drill owns the full StageViewOwnerProps
      latest = owner as unknown as StageViewOwnerProps
      return null
    }, estate)
    return () => {
      if (latest === undefined) throw new Error("stage owner not mounted")
      return latest
    }
  }

  async function openWireOwner(stages: BenchStageView[], estate?: EstateOpts): Promise<StageViewOwnerProps> {
    const getOwner = claimWireOwner(stages, estate)
    await openFirstTile()
    return getOwner()
  }

  test("wire writes the selected output and clears the slot with null", async () => {
    const owner = await openWireOwner([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: {} },
      { id: "s_1", card: "image-gen", engine: "comfyui", params: {}, result: { url: "/source.png" } },
    ])
    act(() => { owner.onWireSlot?.("input_image", "s_1") })
    await waitFor(() => {
      expect(calls().filter((call) => call.method === "drafts/patch")).toHaveLength(1)
    })
    expect(calls().find((call) => call.method === "drafts/patch")?.args).toMatchObject({
      stageId: "s_0",
      patch: { params: { input_image: "/source.png" } },
      expectRev: 1,
    })
    act(() => { owner.onWireSlot?.("input_image", null) })
    await waitFor(() => {
      expect(calls().filter((call) => call.method === "drafts/patch")).toHaveLength(2)
    })
    expect(calls().filter((call) => call.method === "drafts/patch")[1]?.args).toMatchObject({
      stageId: "s_0",
      patch: { params: { input_image: null } },
      expectRev: 1,
    })
  })

  test("wire refuses a source that is no longer on the bench", async () => {
    const owner = await openWireOwner([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: {} },
      { id: "s_1", card: "image-gen", engine: "comfyui", params: {}, result: { url: "/source.png" } },
    ])
    act(() => { owner.onWireSlot?.("input_image", "s_missing") })
    expect(await screen.findByText("wire source is no longer on the bench: s_missing", {}, { timeout: 4000 })).toBeTruthy()
    expect(calls().some((call) => call.method === "drafts/patch")).toBe(false)
  })

  test("wire surfaces an Error refusal with its message", async () => {
    const owner = await openWireOwner([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: {} },
      { id: "s_1", card: "image-gen", engine: "comfyui", params: {}, result: { url: "/source.png" } },
    ], { throws: [{ method: "drafts/patch", message: "wire down" }] })
    act(() => { owner.onWireSlot?.("input_image", "s_1") })
    expect(await screen.findByText("wire down", {}, { timeout: 4000 })).toBeTruthy()
  })

  test("wire gives a foreign refusal the fallback voice", async () => {
    const owner = await openWireOwner([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: {} },
      { id: "s_1", card: "image-gen", engine: "comfyui", params: {}, result: { url: "/source.png" } },
    ], { throws: [{ method: "drafts/patch", value: "foreign" }] })
    act(() => { owner.onWireSlot?.("input_image", "s_1") })
    expect(await screen.findByText("wire failed", {}, { timeout: 4000 })).toBeTruthy()
  })

  test("a foreign remove throw voices 'remove failed' (never a throw past the gesture)", async () => {
    mountClaimed(
      [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      (owner) => h("button", {
        type: "button", "data-testid": "slot-remove",
        onClick: () => { (owner["onRemove"] as () => void)(); },
      }, "SLOT-REMOVE"),
      { throws: [{ method: "bench/remove-stage", value: "kablam" }] },
    );
    const user = userEvent.setup();
    await user.click(firstTile());
    fireEvent.click(await screen.findByTestId("slot-remove", {}, { timeout: 4000 }));
    expect(await screen.findByText("remove failed", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a foreign ungroup throw voices 'ungroup failed' (never a throw past the gesture)", async () => {
    mountBench(
      [{ id: "g_0", card: "group", engine: "comfyui", params: {}, children: [{ id: "s_0", card: "image-gen" }] } as never],
      undefined,
      { throws: [{ method: "bench/ungroup", value: "kablam" }] },
    );
    const user = userEvent.setup();
    await user.click(firstTile());
    fireEvent.click(await screen.findByText("Ungroup", {}, { timeout: 4000 }));
    expect(await screen.findByText("ungroup failed", {}, { timeout: 4000 })).toBeTruthy();
  });
});
