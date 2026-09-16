// @vitest-environment happy-dom
// cards-tab-run.spec.tsx — the drill's model-key, family, race, and
// run-flush arms (2026-09-16 burn-down, installment 3b): the bench /
// user model key arms, the engineless family arm, the empty-url
// candidate arm, the reject-after-unmount guard, and the run verb's
// flush-then-start law (held-only keys ride as null-deletes; a dead
// patch voices instead of starting).
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from "../src/client/spec-form.tsx";
import type { BenchStageRow, CardsBenchValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

interface FrameAnswer { value?: unknown; refuse?: string; thrown?: unknown }
interface Doors {
  formSpec: "ok" | "deferred-reject";
  formsTable: "ok";
  frames: Record<string, (args: Record<string, unknown>) => FrameAnswer>;
  posted: Array<{ method: string; args: Record<string, unknown> }>;
  rejectFormSpec: ((reason: unknown) => void) | null;
}

const doors: Doors = { formSpec: "ok", formsTable: "ok", frames: {}, posted: [], rejectFormSpec: null };

function specBody(): Record<string, unknown> {
  return {
    form: "image-gen", genre: "image", engine: "comfyui",
    schema: schemaEnvelope({
      prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
    }),
  };
}

function stubFetch(): void {
  doors.posted = [];
  doors.frames = {};
  doors.rejectFormSpec = null;
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      if (doors.formSpec === "deferred-reject") {
        return new Promise<Response>((_resolve, reject) => { doors.rejectFormSpec = reject; });
      }
      return new Response(JSON.stringify(specBody()), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({}), {
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
      const answer = route !== undefined ? route(frame.payload.args) : { value: {} };
      if (answer.thrown !== undefined) throw answer.thrown;
      const result = answer.refuse === undefined
        ? { ok: true, value: answer.value ?? {} }
        : { ok: false, error: { message: answer.refuse } };
      return new Response(JSON.stringify({ type: "server-response", rpcId: frame.rpcId, result }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    return new Response("no", { status: 500 });
  });
}

function mountBench(stages: BenchStageRow[]): void {
  doors.formSpec = "ok";
  stubFetch();
  const doc = {
    draft_id: "bench-p", rev: 1, log: [],
    stages: stages.map((s) => ({ ...s, run_status: s.runStatus })),
  };
  const impl = globalThis.fetch;
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url);
    if (path.startsWith("/api/")) {
      const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string };
      if (frame.method === "bench/get") {
        return new Response(JSON.stringify({
          type: "server-response", rpcId: frame.rpcId,
          result: { ok: true, value: doc },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      // the run verb's fresh-read law composes the estate's row
      if (frame.method === "drafts/get") {
        return new Response(JSON.stringify({
          type: "server-response", rpcId: frame.rpcId,
          result: { ok: true, value: { draft_id: "bench-p", stages } },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
    }
    return (impl as typeof fetch)(url, init);
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live", value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages } as CardsBenchValue }),
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

function zoomCard(): HTMLElement {
  const el = document.querySelector('div[class*="zoomCard"]');
  if (el === null) throw new Error("zoom card not found");
  return el as HTMLElement;
}

describe("the drill's model key — the spec follows the effective model", () => {
  test("an empty held model falls to the card (never a model-key hang)", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "" } }]);
    await openFirstTile();
    expect(await screen.findByText("Prompt", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a held model re-specs by model key and seeds the user layer", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    await openFirstTile();
    expect(await screen.findByText("Prompt", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("an engineless row specs by card id (the engine fallback never fires)", async () => {
    mountBench([{ id: "s_0", card: "image-gen", params: {} }]);
    await openFirstTile();
    expect(await screen.findByText("Prompt", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a result with an empty url serves no candidate (never a dead pick)", async () => {
    mountBench([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: {} },
      { id: "s_1", card: "image-gen", engine: "comfyui", params: {}, result: { url: "" } },
    ]);
    await openFirstTile();
    expect(await screen.findByText("Prompt", {}, { timeout: 4000 })).toBeTruthy();
  });
});

describe("the drill's reject-after-unmount guard — a late failure stays silent", () => {
  test("closing before the spec fails drops the failure (no crash)", async () => {
    doors.formSpec = "deferred-reject";
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    doors.formSpec = "deferred-reject";
    const impl = globalThis.fetch;
    vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
      if (String(url).includes("/v1/form-spec")) {
        return new Promise<Response>((_resolve, reject) => { doors.rejectFormSpec = reject; });
      }
      return (impl as typeof fetch)(url, init);
    });
    const user = userEvent.setup();
    await user.click(firstTile());
    await screen.findByText("form…", {}, { timeout: 4000 });
    fireEvent.click(screen.getByLabelText("Collapse card"));
    expect(document.querySelector('[data-testid="stage-preview-seat"]')).toBeNull();
    doors.rejectFormSpec!(new Error("gone"));
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector('[data-testid="stage-preview-seat"]')).toBeNull();
    expect(firstTile()).toBeTruthy();
  });
});

describe("the run verb — the flush-then-start law", () => {
  test("held-only keys flush as null-deletes before the start", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "p", recipe: "old", model: "image-gen" } }]);
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const area = document.querySelector("textarea");
    if (area === null) throw new Error("prompt field not found");
    await user.type(area, "!!!");
    doors.frames["drafts/patch"] = () => ({ value: { delivered: true, rev: 2 } });
    doors.frames["runs/start"] = () => ({ refuse: "no engine today" });
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => {
      const patch = doors.posted.find((p) => JSON.stringify(p.args).includes('"recipe":null'));
      expect(patch).toBeTruthy();
    });
    const patch = doors.posted.find((p) => JSON.stringify(p.args).includes('"recipe":null'))!;
    expect(JSON.stringify(patch.args)).toContain('"prompt":"p!!!"');
    // the start still fired after the flush
    await waitFor(() => {
      expect(doors.posted.some((p) => p.method === "runs/start")).toBe(true);
    });
  });

  test("a dead patch voices instead of starting (never a silent drop)", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "p", recipe: "old" } }]);
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const area = document.querySelector("textarea");
    if (area === null) throw new Error("prompt field not found");
    await user.type(area, "!!!");
    // only the patch door throws a non-Error — the patch dies first
    const impl = globalThis.fetch;
    vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
      const path = String(url);
      if (path.startsWith("/api/")) {
        const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string; payload: { args: Record<string, unknown> } };
        doors.posted.push({ method: frame.method, args: frame.payload.args });
        if (frame.method === "drafts/patch") throw "kablam";
      }
      return (impl as typeof fetch)(url, init);
    });
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    expect(await screen.findByText("run failed", {}, { timeout: 4000 })).toBeTruthy();
    expect(doors.posted.some((p) => p.method === "runs/start")).toBe(false);
  });
});
