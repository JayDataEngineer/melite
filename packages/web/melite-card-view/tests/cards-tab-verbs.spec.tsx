// @vitest-environment happy-dom
// cards-tab-verbs.spec.tsx — the untested verbs (2026-09-16 burn-down,
// installment 3g): the tile trash (remove + refusal voice), the slot
// patch currency on bench and draft drills (ok / refusal / thrown),
// the draft run verb (start + refusal carry), and the picker close.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { CardsTab } from "../src/client/CardsTab.tsx";
import type { BenchStageRow } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

interface FrameAnswer { value?: unknown; refuse?: string; thrown?: unknown }

const doors: {
  posted: Array<{ method: string; args: Record<string, unknown> }>;
  frames: Record<string, (args: Record<string, unknown>) => FrameAnswer>;
  specFields: Record<string, unknown> | null;
  specPacks: boolean;
  specAbsentFamily: boolean;
} = { posted: [], frames: {}, specFields: null, specPacks: false, specAbsentFamily: false };

// the slot harness — the studio claims and exposes the owner verbs
const slot: {
  claim: boolean;
  owner: null | {
    onPatch: (patch: Record<string, unknown>) => void;
    onRun: () => void;
  };
  manageResults: boolean[];
  manageCalls: Array<Record<string, unknown>>;
} = { claim: false, owner: null, manageResults: [], manageCalls: [] };

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

function stubFetch(): void {
  doors.posted = [];
  doors.frames = {};
  doors.specFields = null;
  slot.owner = null;
  slot.manageResults = [];
  slot.manageCalls = [];
  doors.specPacks = false;
  doors.specAbsentFamily = false;
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url);
    if (path === "/api/manage/act") {
      const frame = JSON.parse(String(init?.body)) as { payload: { args: { doc: Record<string, unknown> } } };
      slot.manageCalls.push(frame.payload.args.doc);
      return new Response(JSON.stringify({ result: { ok: true, value: {} } }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/form-spec")) {
      const refs: Record<string, unknown> = {};
      const order: string[] = [];
      let uid = 1;
      const fields = doors.specFields ?? {
        prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
      };
      for (const [name, field] of Object.entries(fields)) {
        refs[name] = { uid: uid++, ...(field as Record<string, unknown>) };
        order.push(name);
      }
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        ...(doors.specAbsentFamily === true ? {
          families: [{ id: "image-gen", present: false }, { id: "tts", present: true }],
          variants: [
            { id: "v-img", label: "Img", group: "Variant", defaults: { model: "image-gen" }, route: "image-gen" },
            { id: "v-tts", label: "Tts", group: "Variant", defaults: { model: "tts" }, route: "tts" },
          ],
        } : {}),
        ...(doors.specPacks === true ? {
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
    if (path.startsWith("/api/")) {
      const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string; payload: { args: Record<string, unknown> } };
      doors.posted.push({ method: frame.method, args: frame.payload.args });
      const route = doors.frames[frame.method];
      if (route !== undefined) {
        const answer = route(frame.payload.args);
        if (answer.thrown !== undefined) throw answer.thrown;
        if (answer.refuse !== undefined) {
          return new Response(JSON.stringify({
            type: "server-response", rpcId: frame.rpcId,
            result: { ok: false, error: { message: answer.refuse } },
          }), { status: 200, headers: { "content-type": "application/json" } });
        }
        return new Response(JSON.stringify({
          type: "server-response", rpcId: frame.rpcId,
          result: { ok: true, value: answer.value ?? {} },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({
        type: "server-response", rpcId: frame.rpcId, result: { ok: true, value: {} },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("no", { status: 500 });
  });
}

const STAGES: BenchStageRow[] = [
  { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a barn" } },
];

function mountBench(prestage?: () => void, stages: BenchStageRow[] = STAGES): void {
  stubFetch();
  doors.frames["bench/get"] = () => ({
    value: {
      draft_id: "bench-p", rev: 1, log: [],
      stages: stages.map((s) => ({ ...s, run_status: s.runStatus })),
    },
  });
  doors.frames["drafts/get"] = () => ({
    value: { draft_id: "bench-p", bench: { rev: 1 }, stages },
  });
  doors.frames["drafts/patch"] = () => ({ value: { delivered: true } });
  if (prestage !== undefined) prestage();
  render(h(CardsTab, {
    renderSlot,
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({
      status: "live",
      value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages },
    }),
  } as never));
}

function mountDraft(prestage?: () => void, stages: BenchStageRow[] = STAGES): void {
  stubFetch();
  doors.frames["drafts/get"] = () => ({
    value: { draft_id: "draft-1", bench: { rev: 1 }, stages },
  });
  doors.frames["drafts/patch"] = () => ({ value: { delivered: true } });
  if (prestage !== undefined) prestage();
  render(h(CardsTab, {
    renderSlot,
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/draft/draft-1/s_0" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({
      status: "live",
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
      expect(doors.posted.some((p) => p.method === "bench/remove-stage")).toBe(true);
    });
    const post = doors.posted.find((p) => p.method === "bench/remove-stage");
    expect((post?.args as { doc: unknown }).doc).toMatchObject({ stage: "s_0" });
  });

  test("a refused trash voices the refusal at bench level (never silent)", async () => {
    mountBench(() => {
      doors.frames["bench/remove-stage"] = () => ({ refuse: "rev moved under you" });
    });
    const trash = await screen.findByTestId("tile-remove", {}, { timeout: 5000 });
    fireEvent.click(trash);
    expect(await screen.findByText("rev moved under you", {}, { timeout: 5000 })).toBeTruthy();
  });

  test("a throwing trash voices the fallback (never empty)", async () => {
    mountBench(() => {
      doors.frames["bench/remove-stage"] = () => ({ thrown: "gone" });
    });
    const trash = await screen.findByTestId("tile-remove", {}, { timeout: 5000 });
    fireEvent.click(trash);
    expect(await screen.findByText("remove failed", {}, { timeout: 5000 })).toBeTruthy();
  });
});

describe("the bench slot patch currency — the zoom's onPatchParams ride", () => {
  beforeEach(() => { slot.claim = true; });

  test("a slot patch posts drafts/patch (the zoom binds stage + rev)", async () => {
    mountBench();
    await openZoom();
    fireEvent.click(screen.getByText("slot patch"));
    await waitFor(() => {
      expect(doors.posted.some((p) => p.method === "drafts/patch")).toBe(true);
    });
    const post = doors.posted.find((p) => p.method === "drafts/patch");
    expect(post?.args).toMatchObject({ draftId: "bench-p", stageId: "s_0", patch: { params: { prompt: "slot words" } } });
  });

  test("a refused slot patch voices the refusal (the drill stays open)", async () => {
    mountBench(() => {
      doors.frames["drafts/patch"] = () => ({ refuse: "rev moved under you" });
    });
    await openZoom();
    fireEvent.click(screen.getByText("slot patch"));
    // the voice lands twice (bench rail + zoom startError) — either proves it
    expect(await screen.findAllByText(/rev moved under you/, {}, { timeout: 5000 })).not.toHaveLength(0);
  });

  test("a throwing slot patch voices the fallback (never empty)", async () => {
    mountBench(() => {
      doors.frames["drafts/patch"] = () => ({ thrown: "gone" });
    });
    await openZoom();
    fireEvent.click(screen.getByText("slot patch"));
    expect(await screen.findAllByText(/patch failed/, {}, { timeout: 5000 })).not.toHaveLength(0);
  });
});

describe("the draft slot currency — patch and run ride the draft's own rev", () => {
  beforeEach(() => { slot.claim = true; });

  test("a draft slot patch posts drafts/patch (stage + rev fenced)", async () => {
    mountDraft();
    await screen.findByText("slot patch", {}, { timeout: 5000 });
    fireEvent.click(screen.getByText("slot patch"));
    await waitFor(() => {
      expect(doors.posted.some((p) => p.method === "drafts/patch")).toBe(true);
    });
    const post = doors.posted.find((p) => p.method === "drafts/patch");
    expect(post?.args).toMatchObject({ draftId: "draft-1", stageId: "s_0", patch: { params: { prompt: "slot words" } } });
  });

  test("a refused draft patch voices the refusal (the draft stays put)", async () => {
    mountDraft(() => {
      doors.frames["drafts/patch"] = () => ({ refuse: "draft moved" });
    });
    await screen.findByText("slot patch", {}, { timeout: 5000 });
    fireEvent.click(screen.getByText("slot patch"));
    expect(await screen.findByText("draft moved", {}, { timeout: 5000 })).toBeTruthy();
  });

  test("a throwing draft patch voices the fallback (never empty)", async () => {
    mountDraft(() => {
      doors.frames["drafts/patch"] = () => ({ thrown: 42 });
    });
    await screen.findByText("slot patch", {}, { timeout: 5000 });
    fireEvent.click(screen.getByText("slot patch"));
    expect(await screen.findByText("patch failed", {}, { timeout: 5000 })).toBeTruthy();
  });

  test("a draft slot run starts the pass (runs/start carries the draft)", async () => {
    mountDraft(() => {
      doors.frames["runs/start"] = () => ({ value: { run_id: "r_7" } });
    });
    await screen.findByText("slot run", {}, { timeout: 5000 });
    fireEvent.click(screen.getByText("slot run"));
    await waitFor(() => {
      expect(doors.posted.some((p) => p.method === "runs/start")).toBe(true);
    });
  });

  test("a refused draft run carries the refusal (the draft never spins)", async () => {
    mountDraft(() => {
      doors.frames["runs/start"] = () => ({ refuse: "no engine today" });
    });
    await screen.findByText("slot run", {}, { timeout: 5000 });
    fireEvent.click(screen.getByText("slot run"));
    expect(await screen.findByText("no engine today", {}, { timeout: 5000 })).toBeTruthy();
  });
});

describe("the slot manage verbs — provision and pack ride the manage door", () => {
  beforeEach(() => { slot.claim = false; });
  // the drill's generic detail (no studio claim): the offered-but-
  // absent faces render from the served declaration
  const ABSENT: BenchStageRow[] = [
    { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a barn", model: "image-gen" } },
  ];

  test("a boarded-but-absent held model offers its download (queued, then true)", async () => {
    mountDraft(() => { doors.specAbsentFamily = true; }, ABSENT);
    const dl = await screen.findByText("Download Image Gen", {}, { timeout: 5000 });
    fireEvent.click(dl);
    await waitFor(() => {
      expect(slot.manageCalls).toEqual([{ action: "provision_model", model: "image-gen" }]);
    }, { timeout: 5000 });
    expect(await screen.findByText(/Download queued/, {}, { timeout: 5000 })).toBeTruthy();
  });

  test("a missing pack offers its install (the id rides as nodes)", async () => {
    mountDraft(() => { doors.specPacks = true; });
    const inst = await screen.findByRole("button", { name: /Install/, }, { timeout: 5000 });
    fireEvent.click(inst);
    await waitFor(() => {
      expect(slot.manageCalls).toEqual([{ action: "install_extension", nodes: ["p-1"] }]);
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
    expect(doors.posted.some((p) => p.method === "bench/add-stage")).toBe(false);
  });
});
