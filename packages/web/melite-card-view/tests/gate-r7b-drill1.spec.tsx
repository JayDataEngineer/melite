// @vitest-environment happy-dom
// gate-r7b-drill1.spec.tsx — StageDrill's gesture fallback arms (the
// R7B burn-down): the slot flush's foreign voice, the enhance
// slot-write guard, and the remove/ungroup foreign voices. CardsTab
// mounts (the drill rides the zoom), estate verbs on
// mountEstateFakes, fetch answering ONLY the /v1 discovery doors +
// the enhance tool.
import { LOADED_WAIT } from "../../../../tests/helpers/loaded-wait.ts";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { resetStageWrites } from "../src/client/draft.ts";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from '@melite/card-base/client';
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";
import type { StageViewOwnerProps } from "../src/client/types.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  // the write ledger is module-level memory; specs share draft/stage
  // ids, so a refusal recorded by one test must not refuse the next
  // (the same discipline as unbindEstateRemote — the audit's
  // order-dependent-green finding: this file had NO reset, so its
  // greens rode on the suites that ran before it).
  resetStageWrites();
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
      const fields: Parameters<typeof schemaEnvelope>[0] = {
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
      // THE CATALOG'S CARD ROWS (the writer-mint cut, 2026-11-08): the
      // run seat resolves a stage's default family from this cards
      // section and refuses an uncarried card — the empty section made
      // every run arm refuse ("cannot default its family"). The rows
      // carry the stages' real boarded atoms; boarded[0] is the
      // default family the start doc rides.
      return new Response(JSON.stringify({ cards: {
        "image-gen": { families: ["krea-2", "z-image", "anima", "qwen-img-21", "flux-klein", "moss-image"] },
      } }), {
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
    patchFailures: estate?.patchFailures,
    patchAnswerRevs: estate?.patchAnswerRevs,
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages } as unknown as CardsBenchValue }),
    ...(renderSlot !== undefined ? { renderSlot } : {}),
  }));
}

function firstTile(): HTMLElement {
  const el = document.querySelector('[role="button"][class*="tileInner"]');
  if (el === null) throw new Error("tile button not found");
  return el as HTMLElement;
}

async function openFirstTile(): Promise<void> {
  const user = userEvent.setup();
  await user.click(firstTile());
  await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
}

// THE AUTHORING CONTRACT (2026-10-10, the operator's live face:
// "Generate Image: lane 'krea-2/turbo' refuses the state: this lane
// requires 'prompt' — 'prompt' is not stated" — and "THERE SHOULD
// HAVE BEEN A CONTRACT, SO USERS CAN ADD CARDS"). The contract: what
// you TYPE in a card IS that card's state on the bench. The add
// door seeds the axes (model/variant ride the row) but a typed
// schema field went to React state alone — CardForm forwards its
// onPatch to the MODS section only — so the run's fresh-read
// composed a row that never heard the prompt and the lane refused.
// These pins hold the contract: the typed value rides the row, and
// the run composes what the studio shows.
describe("the authoring contract — a typed field RIDES the row", () => {
  test("typing a prompt patches the stage row (the value the studio shows is the value the engine gets)", async () => {
    mountBench([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: {} },
    ]);
    doors.specFields = "prompt";
    await openFirstTile();
    const field = await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    fireEvent.change(field, { target: { value: "a red cloak" } });
    await waitFor(() => {
      const patches = calls().filter((c) => c.method === "drafts/patch");
      // the print: what the door actually received
      if (patches.length === 0) throw new Error("no drafts/patch yet; calls: " + JSON.stringify(calls().map((c) => c.method)));
      expect(patches.length).toBeGreaterThan(0);
      // THE DOOR'S DOC SHAPE: the write's key is `params` (a flat
      // {prompt} doc is an unknown key the door refuses).
      const landed = patches.some((c) => {
        const patch = c.args["patch"] as Record<string, unknown>;
        // STRICT SHAPE (the audit's permissive-matcher finding): the
        // door's doc wraps the fields under `params` — a flat
        // {prompt} body is an unknown key the door REFUSES, so the
        // pin must demand the wrap, not tolerate its absence.
        const params = patch["params"];
        if (typeof params !== "object" || params === null) return false;
        return (params as Record<string, unknown>)["prompt"] === "a red cloak";
      });
      if (!landed) throw new Error("prompt never rode a patch; patches: " + JSON.stringify(patches.map((c) => c.args["patch"])));
      expect(landed).toBe(true);
    }, { timeout: 4000 });
  });

  test("a DEAD WRITE shows its face on the form the moment the door answers (the audit's silent branch)", { timeout: LOADED_WAIT() }, async () => {
    // THE WRITE-SEAT AUDIT'S SILENT-DEAD-WRITE FINDING (2026-10-10):
    // the ordinary authoring branch swallowed its failures
    // (`.catch(() => {})`), so a typed edit whose write died surfaced
    // ONLY as a run refusal, minutes later, with no face at the
    // field. The scheduled write's promise settles when the door
    // ANSWERED now, and the drill puts the failure on the form —
    // the slot arm's own law, generalized to every authoring write.
    mountBench([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: {} },
    ], undefined, {
      patchFailures: [{ delivered: false, reason: "bench/stale-window" }],
    });
    doors.specFields = "prompt";
    await openFirstTile();
    const field = await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    fireEvent.change(field, { target: { value: "a red cloak" } });
    // THE THROWN-VERB SETTLEMENT LAW (flake-slowness-wave2): this face
    // rides a refused write's async failure path and renders on a
    // macrotask — a 4s real-timer poll starves under coverage's ±40%
    // settlement swing; every settlement poll on a failure verb rides
    // the siblings' 15s/30s pairing.
    const face = await screen.findByTestId("stage-write-face", {}, { timeout: LOADED_WAIT() * 0.5 });
    expect(face.textContent).toContain("THE WRITE DID NOT LAND");
    expect(face.textContent).toContain("bench/stale-window");
    expect(face.textContent).toContain("studio shows your edit");
  });

  test("the typed prompt reaches the RUN start body (no lane refusal can say 'prompt is not stated')", async () => {
    mountBench([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: {} },
    ]);
    doors.specFields = "prompt";
    await openFirstTile();
    const field = await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    fireEvent.change(field, { target: { value: "a red cloak" } });
    // the drill's own Run press — the bench chrome's Play (the drill
    // binds the press through bindRun, so the tile's own verb runs
    // the OPEN stage, the operator's one-press path)
    const run = await screen.findByRole("button", { name: /play/i }, { timeout: 4000 });
    fireEvent.click(run);
    await waitFor(() => {
      const starts = calls().filter((c) => c.method === "runs/start");
      expect(starts.length).toBeGreaterThan(0);
      const doc = starts[starts.length - 1]!.args["doc"] as Record<string, unknown>;
      expect(JSON.stringify(doc)).toContain("a red cloak");
    }, { timeout: 6000 });
  });
});

describe("the slot flush's foreign voice — a down wire still names the face", () => {
  test("a foreign slot-write throw voices its own words (never a throw past the pick)", { timeout: LOADED_WAIT() }, async () => {
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
    // wire's foreign throw lands as its own words inside the face
    // W9 aligned this voice: the foreign throw rides the same
    // THE WRITE DID NOT LAND prefix as the other arms, speaking its
    // thrown string verbatim (the failureText law) — never a third
    // face, never a fallback that masks the throw.
    // THE THROWN-VERB SETTLEMENT LAW (flake-slowness-wave2): gate23
    // reded this arm solo under --coverage at the old 4s budget — the
    // C1 raise missed it. 15s/30s, the remove/ungroup siblings' law.
    expect(await screen.findByText(/kablam/, {}, { timeout: LOADED_WAIT() * 0.5 })).toBeTruthy();
    expect(calls().some((p) => p.method === "drafts/patch")).toBe(true);
  });
});

describe("the slot flush's REFUSED write — the third face speaks the write voice (W9)", () => {
  test("a refused slot-write voices 'THE WRITE DID NOT LAND' naming the unlanded key (one voice with the other arms)", { timeout: LOADED_WAIT() }, async () => {
    mountBench([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: {} },
      { id: "s_1", card: "image-gen", engine: "comfyui", params: {}, result: { url: "/b.png" } },
    ], undefined, { patchFailures: [{ delivered: false, reason: "bench/stale-window" }] });
    // modes AFTER the mount — stubFetch re-arms the defaults
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
    // the SAME voice the typing arm and the run gate speak: the
    // prefix, the door's reason, the unlanded key by name — never a
    // third face (the raw door text alone) again
    await screen.findByText(
      /THE WRITE DID NOT LAND[\s\S]*bench\/stale-window[\s\S]*unlanded keys: input_image/,
      {},
      // the refused write's settlement (thrown-verb law, 15s/30s)
      { timeout: LOADED_WAIT() * 0.5 },
    );
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

  test("wire surfaces an Error refusal with its message (the ONE voice: the row's face)", { timeout: LOADED_WAIT() }, async () => {
    const owner = await openWireOwner([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: {} },
      { id: "s_1", card: "image-gen", engine: "comfyui", params: {}, result: { url: "/source.png" } },
    ], { throws: [{ method: "drafts/patch", message: "wire down" }] })
    act(() => { owner.onWireSlot?.("input_image", "s_1") })
    // THE ONE VOICE (the 2026-11-02 one-home law): the wire-in's
    // failure face is the ledger row's — prefix, the door's reason,
    // the unlanded key — never the raw error strip. draft.ts stamps
    // the throw as the row's lastError before the rejection reaches
    // this catch, so the row owns the words the face shows.
    // Thrown-verb settlement: 15s/30s (flake-slowness-wave2).
    const face = await screen.findByTestId("stage-write-face", {}, { timeout: LOADED_WAIT() * 0.5 });
    expect(face.textContent).toContain("THE WRITE DID NOT LAND");
    expect(face.textContent).toContain("wire down");
    expect(face.textContent).toContain("unlanded keys: input_image");
  })

  test("wire gives a foreign refusal its own words (the row carries the verbatim string)", { timeout: LOADED_WAIT() }, async () => {
    const owner = await openWireOwner([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: {} },
      { id: "s_1", card: "image-gen", engine: "comfyui", params: {}, result: { url: "/source.png" } },
    ], { throws: [{ method: "drafts/patch", value: "foreign" }] })
    act(() => { owner.onWireSlot?.("input_image", "s_1") })
    // the foreign string surfaces verbatim (the failureText law)
    // INSIDE the one voice — the row recorded 'foreign' as the
    // write's lastError; the face derives from the row.
    // Thrown-verb settlement: 15s/30s (flake-slowness-wave2).
    const face = await screen.findByTestId("stage-write-face", {}, { timeout: LOADED_WAIT() * 0.5 });
    expect(face.textContent).toContain("THE WRITE DID NOT LAND");
    expect(face.textContent).toContain("foreign");
    expect(face.textContent).toContain("unlanded keys: input_image");
  })

  test("a foreign remove throw voices its own words (never a throw past the gesture)", { timeout: LOADED_WAIT() }, async () => {
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
    // THE FLAKE CURE (flake-slowness-wave2 class 1/2): thrown-verb
    // settlement under coverage instrumentation swings ±40%; the
    // ungroup sibling below already rides 15s — this arm never got
    // it. Same cure, same shape.
    expect(await screen.findByText("kablam", {}, { timeout: LOADED_WAIT() * 0.5 })).toBeTruthy();
  });

  test("a foreign ungroup throw voices its own words (never a throw past the gesture)", async () => {
    mountBench(
      [{ id: "g_0", card: "group", engine: "comfyui", params: {}, children: [{ id: "s_0", card: "image-gen" }] } as never],
      undefined,
      { throws: [{ method: "bench/ungroup", value: "kablam" }] },
    );
    const user = userEvent.setup();
    await user.click(firstTile());
    fireEvent.click(await screen.findByText("Ungroup", {}, { timeout: 4000 }));
    // (the error surface is a useState that never expires — under the
    // full-suite parallel load the click's promise can outlive a 4s
    // polling window while the assertion itself is unaffected; the
    // wider window is load headroom, not a weaker claim)
    expect(await screen.findByText("kablam", {}, { timeout: LOADED_WAIT() * 0.5 })).toBeTruthy();
  });
});
