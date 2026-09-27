// @vitest-environment happy-dom
// cards-tab-run.spec.tsx — the drill's model-key, family, race, and
// run-flush arms (2026-09-16 burn-down, installment 3b): the bench /
// user model key arms, the engineless family arm, the empty-url
// candidate arm, the reject-after-unmount guard, and the run verb's
// flush-then-start law (held-only keys ride as null-deletes; a dead
// patch voices instead of starting).
// Estate verbs ride mountEstateFakes (the one-lane seam); the
// deferred-reject formSpec half stays on fetch verbatim (/v1/* are
// still fetch in prod).
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from "../src/client/spec-form.tsx";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/estate-remote";

interface Call { method: string; args: Record<string, unknown> }

let fakes: { calls: Call[]; unmount: () => void } | null = null;
let posted: Call[] = [];

// the fetch half (kept verbatim): the form-spec mode + the deferred
// reject capture. /v1/form-spec stays on fetch by design.
const formCtl: {
  formSpec: "ok" | "deferred-reject";
  rejectFormSpec: ((reason: unknown) => void) | null;
} = { formSpec: "ok", rejectFormSpec: null };

function specBody(): Record<string, unknown> {
  return {
    form: "image-gen", genre: "image", engine: "comfyui",
    schema: schemaEnvelope({
      prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
    }),
  };
}

function stubDoors(estateOpts: Parameters<typeof mountEstateFakes>[0] = {}): void {
  fakes?.unmount();
  const estate = mountEstateFakes(estateOpts);
  fakes = estate;
  posted = estate.calls;
  formCtl.rejectFormSpec = null;
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      if (formCtl.formSpec === "deferred-reject") {
        return new Promise<Response>((_resolve, reject) => { formCtl.rejectFormSpec = reject; });
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
    throw new Error("estate door on the fetch lane: " + path);
  });
}

afterEach(() => {
  cleanup();
  fakes?.unmount();
  fakes = null;
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

function mountBench(stages: BenchStageView[], estateOpts: Parameters<typeof mountEstateFakes>[0] = {}): void {
  formCtl.formSpec = "ok";
  stubDoors({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: stages.map((s) => ({ ...s })) },
    draftStages: stages.map((s) => ({ ...s }) as unknown as Record<string, unknown>),
    draftBenchRev: 1,
    ...estateOpts,
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
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    // re-arm the deferred reject AFTER the mount (the mount's own
    // spec fetch already resolved ok — this second stub answers the
    // drill's fetch, which fires on open below).
    formCtl.formSpec = "deferred-reject";
    const user = userEvent.setup();
    await user.click(firstTile());
    await screen.findByText("form…", {}, { timeout: 4000 });
    fireEvent.click(screen.getByLabelText("Collapse card"));
    expect(document.querySelector('[data-testid="stage-preview-seat"]')).toBeNull();
    formCtl.rejectFormSpec!(new Error("gone"));
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector('[data-testid="stage-preview-seat"]')).toBeNull();
    expect(firstTile()).toBeTruthy();
  });
});

describe("the run verb — the flush-then-start law", () => {
  test("held-only keys flush as null-deletes before the start", async () => {
    mountBench(
      [{ id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "p", recipe: "old", model: "image-gen" } }],
      { refusals: [{ method: "runs/start", message: "no engine today" }] },
    );
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const area = document.querySelector("textarea");
    if (area === null) throw new Error("prompt field not found");
    await user.type(area, "!!!");
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => {
      const patch = posted.find((p) => JSON.stringify(p.args).includes('"recipe":null'));
      expect(patch).toBeTruthy();
    });
    const patch = posted.find((p) => JSON.stringify(p.args).includes('"recipe":null'))!;
    expect(JSON.stringify(patch.args)).toContain('"prompt":"p!!!"');
    // the start still fired after the flush
    await waitFor(() => {
      expect(posted.some((p) => p.method === "runs/start")).toBe(true);
    });
  });

  test("a dead patch voices instead of starting (never a silent drop)", async () => {
    // only the patch door throws the foreign string "kablam" verbatim
    // (the old stub's shape) — the "run failed" fallback voices and
    // the start never fires.
    mountBench(
      [{ id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "p", recipe: "old" } }],
      { throws: [{ method: "drafts/patch", value: "kablam" }] },
    );
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const area = document.querySelector("textarea");
    if (area === null) throw new Error("prompt field not found");
    await user.type(area, "!!!");
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    expect(await screen.findByText("run failed", {}, { timeout: 4000 })).toBeTruthy();
    expect(posted.some((p) => p.method === "runs/start")).toBe(false);
  });
});
