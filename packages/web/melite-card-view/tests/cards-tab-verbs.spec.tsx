// @vitest-environment happy-dom
// cards-tab-verbs.spec.tsx — the untested verbs (2026-09-16 burn-down,
// installment 3g): the tile trash (remove + refusal voice), the slot
// patch currency on bench and draft drills (ok / refusal / thrown),
// the draft run verb (start + refusal carry), and the picker close.
// Estate verbs ride mountEstateFakes (the one-lane seam, manage
// included); fetch answers ONLY the /v1 discovery doors.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { CardsTab } from "../src/client/CardsTab.tsx";
import type { BenchStageView } from "../src/client/cards-resource.ts";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { resetStageWrites } from "../src/client/draft.ts";

interface Call { method: string; args: Record<string, unknown> }

let fakes: { calls: Call[]; unmount: () => void } | null = null;
let posted: Call[] = [];

// form-spec faces (fetch-level, kept): field overrides, packs flag,
// absent-family flag.
const specCtl: {
  specFields: Record<string, unknown> | null;
  specPacks: boolean;
  specAbsentFamily: boolean;
} = { specFields: null, specPacks: false, specAbsentFamily: false };

// the slot harness — the studio claims and exposes the owner verbs
const slot: {
  claim: boolean;
  owner: null | {
    onPatch: (patch: Record<string, unknown>) => void;
    onRun: () => void;
  };
} = { claim: false, owner: null };

function SlotFace(): React.ReactElement {
  return h("div", null,
    h("button", { type: "button", onClick: () => { slot.owner?.onPatch({ prompt: "slot words" }); } }, "slot patch"),
    h("button", { type: "button", onClick: () => { slot.owner?.onRun(); } }, "slot run"),
  );
}

function renderSlot(slotName: string, owner: Record<string, unknown>): React.ReactElement | undefined {
  if (!slot.claim || slotName !== "cards.stage.view") return undefined;
  slot.owner = {
    onPatch: owner["onPatch"] as (patch: Record<string, unknown>) => void,
    onRun: owner["onRun"] as () => void,
  };
  return h(SlotFace, null);
}

function stubDoors(estateOpts: Parameters<typeof mountEstateFakes>[0] = {}): void {
  fakes?.unmount();
  const benchStages = (estateOpts.draftStages as Array<Record<string, unknown>> | undefined) ?? [
    { id: "s_0", card: "image-gen", title: "s_0", engine: "comfyui", params: { prompt: "a barn" } },
  ];
  const estate = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: benchStages.map((s) => ({ ...s })) },
    draftStages: benchStages,
    draftBenchRev: 1,
    ...estateOpts,
  });
  fakes = estate;
  posted = estate.calls;
  slot.owner = null;
  specCtl.specPacks = false;
  specCtl.specAbsentFamily = false;
  specCtl.specFields = null;
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      const refs: Record<string, unknown> = {};
      const order: string[] = [];
      let uid = 1;
      const fields = specCtl.specFields ?? {
        prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
      };
      for (const [name, field] of Object.entries(fields)) {
        refs[name] = { uid: uid++, ...(field as Record<string, unknown>) };
        order.push(name);
      }
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        ...(specCtl.specAbsentFamily === true ? {
          families: [{ id: "image-gen", present: false }, { id: "tts", present: true }],
          variants: [
            { id: "v-img", label: "Img", group: "Variant", defaults: { model: "image-gen" }, route: "image-gen" },
            { id: "v-tts", label: "Tts", group: "Variant", defaults: { model: "tts" }, route: "tts" },
          ],
        } : {}),
        ...(specCtl.specPacks === true ? {
          packs: [{ id: "p-1", present: false }],
        } : {}),
        schema: { uid: 0, refs, order },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({ "image-gen": { outputs: { default: "image" } } }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

afterEach(() => {
  cleanup();
  fakes?.unmount();
  fakes = null;
  unbindEstateRemote();
  // THE LEDGER RESET (the one-press/one-engine law — see
  // card-drill.spec's afterEach): a refusal recorded by one test
  // must not refuse the next test's run.
  resetStageWrites();
  vi.unstubAllGlobals();
});

const STAGES: BenchStageView[] = [
  { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a barn" } },
];

function mountBench(estateOpts: Parameters<typeof mountEstateFakes>[0] = {}, stages: BenchStageView[] = STAGES, spec: { absentFamily?: boolean; packs?: boolean } = {}): void {
  stubDoors({
    draftStages: stages.map((s) => ({ ...s }) as unknown as Record<string, unknown>),
    ...estateOpts,
  });
  if (spec.absentFamily === true) specCtl.specAbsentFamily = true;
  if (spec.packs === true) specCtl.specPacks = true;
  render(h(CardsTab, {
    renderSlot,
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({
      status: "live" as const,
      value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages },
    }),
  } as never));
}

function mountDraft(estateOpts: Parameters<typeof mountEstateFakes>[0] = {}, stages: BenchStageView[] = STAGES, spec: { absentFamily?: boolean; packs?: boolean } = {}): void {
  stubDoors({
    draftStages: stages.map((s) => ({ ...s }) as unknown as Record<string, unknown>),
    ...estateOpts,
  });
  if (spec.absentFamily === true) specCtl.specAbsentFamily = true;
  if (spec.packs === true) specCtl.specPacks = true;
  render(h(CardsTab, {
    renderSlot,
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/draft/draft-1/s_0" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({
      status: "live" as const,
      value: { kind: "draft", draftId: "draft-1", stageId: "s_0", rev: 1, stages },
    }),
  } as never));
}

async function openZoom(): Promise<HTMLElement> {
  await waitFor(() => {
    if (document.querySelector('button[class*="tileInner"]') === null) throw new Error("no tile");
  });
  fireEvent.click(document.querySelector('button[class*="tileInner"]') as HTMLElement);
  const patch = await screen.findByText("slot patch", {}, { timeout: 5000 });
  return patch;
}

describe("the tile trash — remove rides the revision fence", () => {
  beforeEach(() => { slot.claim = false; });

  test("trash posts bench/remove-stage (the tile, not the drill)", async () => {
    mountBench();
    const trash = await screen.findByTestId("tile-remove", {}, { timeout: 5000 });
    fireEvent.click(trash);
    await waitFor(() => {
      expect(posted.some((p) => p.method === "bench/remove-stage")).toBe(true);
    });
    const post = posted.find((p) => p.method === "bench/remove-stage");
    expect((post?.args as { doc: unknown }).doc).toMatchObject({ stage: "s_0" });
  });

  test("a refused trash voices the refusal at bench level (never silent)", async () => {
    mountBench({ refusals: [{ method: "bench/remove-stage", message: "rev moved under you" }] });
    const trash = await screen.findByTestId("tile-remove", {}, { timeout: 5000 });
    fireEvent.click(trash);
    expect(await screen.findByText("rev moved under you", {}, { timeout: 5000 })).toBeTruthy();
  });

  test("a throwing trash voices the throw's own words (never empty)", async () => {
    // the door throws the foreign string "gone" verbatim (the old
    // envelope stub's shape) — the face speaks it verbatim (the
    // failureText law), never a fixed fallback that masks it.
    mountBench({ throws: [{ method: "bench/remove-stage", value: "gone" }] });
    const trash = await screen.findByTestId("tile-remove", {}, { timeout: 5000 });
    fireEvent.click(trash);
    expect(await screen.findByText("gone", {}, { timeout: 5000 })).toBeTruthy();
  });
});

describe("the bench slot patch currency — the zoom's onPatchParams ride", () => {
  beforeEach(() => { slot.claim = true; });

  test("a slot patch posts drafts/patch (the zoom binds stage + rev)", async () => {
    mountBench();
    await openZoom();
    fireEvent.click(screen.getByText("slot patch"));
    await waitFor(() => {
      expect(posted.some((p) => p.method === "drafts/patch")).toBe(true);
    });
    const post = posted.find((p) => p.method === "drafts/patch");
    expect(post?.args).toMatchObject({ draftId: "bench-p", stageId: "s_0", patch: { params: { prompt: "slot words" } } });
  });

  test("a refused slot patch voices the refusal (the drill stays open)", async () => {
    mountBench({ refusals: [{ method: "drafts/patch", message: "rev moved under you" }] });
    await openZoom();
    fireEvent.click(screen.getByText("slot patch"));
    // the voice lands twice (bench rail + zoom startError) — either proves it
    expect(await screen.findAllByText(/rev moved under you/, {}, { timeout: 5000 })).not.toHaveLength(0);
  });

  test("a throwing slot patch voices the throw's own words (never empty)", async () => {
    // the foreign string "gone" surfaces verbatim (the failureText
    // law), never a fixed fallback that masks it — inside the
    // ledger's one-home voice (the 2026-11-02 law + the 2026-10-15
    // stretch cure: the seat settles through the coalescer, so the
    // face is the row's voice carrying the throw's words, never the
    // bare throw)
    mountBench({ throws: [{ method: "drafts/patch", value: "gone" }] });
    await openZoom();
    fireEvent.click(screen.getByText("slot patch"));
    const banners = await screen.findAllByText(/THE WRITE DID NOT LAND/, {}, { timeout: 5000 });
    expect(banners.map((b) => b.textContent).join("\n")).toContain("gone");
  });
});

describe("the draft slot currency — patch and run ride the draft's own rev", () => {
  beforeEach(() => { slot.claim = true; });

  test("a draft slot patch posts drafts/patch (stage + rev fenced)", async () => {
    mountDraft();
    await screen.findByText("slot patch", {}, { timeout: 5000 });
    fireEvent.click(screen.getByText("slot patch"));
    await waitFor(() => {
      expect(posted.some((p) => p.method === "drafts/patch")).toBe(true);
    });
    const post = posted.find((p) => p.method === "drafts/patch");
    expect(post?.args).toMatchObject({ draftId: "draft-1", stageId: "s_0", patch: { params: { prompt: "slot words" } } });
  });

  test("a refused draft patch voices the refusal (the draft stays put)", async () => {
    // the refusal's words ride inside the ledger's one-home voice
    // (same law as the bench arm above)
    mountDraft({ refusals: [{ method: "drafts/patch", message: "draft moved" }] });
    await screen.findByText("slot patch", {}, { timeout: 5000 });
    fireEvent.click(screen.getByText("slot patch"));
    const banners = await screen.findAllByText(/THE WRITE DID NOT LAND/, {}, { timeout: 5000 });
    expect(banners.map((b) => b.textContent).join("\n")).toContain("draft moved");
  });

  test("a throwing draft patch voices the throw's own words (never empty)", async () => {
    // the foreign number 42 surfaces as "42" (the failureText law),
    // never a fixed fallback that masks it — inside the ledger's
    // one-home voice (same law as the bench arm above)
    mountDraft({ throws: [{ method: "drafts/patch", value: 42 }] });
    await screen.findByText("slot patch", {}, { timeout: 5000 });
    fireEvent.click(screen.getByText("slot patch"));
    const banners = await screen.findAllByText(/THE WRITE DID NOT LAND/, {}, { timeout: 5000 });
    expect(banners.map((b) => b.textContent).join("\n")).toContain("42");
  });

  test("a draft slot run starts the pass (runs/start carries the draft)", async () => {
    mountDraft({ startDocs: [{ run_id: "r_7" }] });
    await screen.findByText("slot run", {}, { timeout: 5000 });
    fireEvent.click(screen.getByText("slot run"));
    await waitFor(() => {
      expect(posted.some((p) => p.method === "runs/start")).toBe(true);
    });
  });

  test("a refused draft run carries the refusal (the draft never spins)", async () => {
    mountDraft({ refusals: [{ method: "runs/start", message: "no engine today" }] });
    await screen.findByText("slot run", {}, { timeout: 5000 });
    fireEvent.click(screen.getByText("slot run"));
    expect(await screen.findByText("no engine today", {}, { timeout: 5000 })).toBeTruthy();
  });
});

describe("the slot manage verbs — provision and pack ride the manage door", () => {
  beforeEach(() => { slot.claim = false; });
  // the drill's generic detail (no studio claim): the offered-but-
  // absent faces render from the served declaration
  const ABSENT: BenchStageView[] = [
    { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a barn", model: "image-gen" } },
  ];

  test("a boarded-but-absent held model offers its download (queued, then true)", async () => {
    mountDraft({}, ABSENT, { absentFamily: true });
    const dl = await screen.findByText("Download Image Gen", {}, { timeout: 5000 });
    fireEvent.click(dl);
    await waitFor(() => {
      expect(fakes?.calls.filter((c) => c.method === "manage/act").map((c) => c.args["doc"])).toEqual([{ action: "provision_model", model: "image-gen" }]);
    }, { timeout: 5000 });
    expect(await screen.findByText(/Download queued/, {}, { timeout: 5000 })).toBeTruthy();
  });

  test("a missing pack offers its install (the id rides as nodes)", async () => {
    mountDraft({}, STAGES, { packs: true });
    const inst = await screen.findByRole("button", { name: /Install/, }, { timeout: 5000 });
    fireEvent.click(inst);
    await waitFor(() => {
      expect(fakes?.calls.filter((c) => c.method === "manage/act").map((c) => c.args["doc"])).toEqual([{ action: "install_extension", nodes: ["p-1"] }]);
    }, { timeout: 5000 });
  });
});

describe("the picker close — the door dismisses without landing", () => {
  beforeEach(() => { slot.claim = false; });

  test("closing the picker returns to the rail (nothing lands)", async () => {
    mountBench();
    await waitFor(() => {
      if (document.querySelector('button[class*="tileInner"]') === null) throw new Error("no tile");
    });
    const add = screen.getByRole("button", { name: "Add a card" });
    fireEvent.click(add);
    const close = await screen.findByRole("button", { name: "Close picker" }, { timeout: 5000 });
    fireEvent.click(close);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Close picker" })).toBeNull();
    });
    expect(posted.some((p) => p.method === "bench/add-stage")).toBe(false);
  });
});
