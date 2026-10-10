// @vitest-environment happy-dom
// cards-tab-runview.spec.tsx — the run seat's honest faces
// (2026-09-16 burn-down, installment 3j): the RunView renders from
// the observed run value (no wire choreography): the live cancel,
// the back door, the status dots + artifact thumbs, the restore
// (ok / skipped / thrown), and the draft-less door-less seat.
// Estate verbs ride mountEstateFakes (the one-lane seam); fetch
// answers ONLY the /v1 discovery doors.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';

interface Call { method: string; args: Record<string, unknown> }
// The wire stage's status can be ABSENT (the run doc's per-stage words
// pass no validating door) — the seat's guard folds it to no word.
interface RunStage { id: string; status?: string; url?: string }

let fakes: { calls: Call[]; unmount: () => void } | null = null;
let posted: Call[] = [];
const opened: string[] = [];

function stubEstate(opts: Parameters<typeof mountEstateFakes>[0] = {}): void {
  fakes?.unmount();
  const estate = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 5, log: [], stages: [] },
    ...opts,
  });
  fakes = estate;
  posted = estate.calls;
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
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
  vi.unstubAllGlobals();
});

function mountRun(run: {
  runId: string; status: string; draftId: string | null; stages: RunStage[];
}, openResource?: (address: string) => void, estateOpts: Parameters<typeof mountEstateFakes>[0] = {}): void {
  stubEstate(estateOpts);
  opened.length = 0;
  // NOTE: the door-less seat passes an EMPTY actions object (the tab
  // reads .openResource off it — undefined would crash, which is a
  // different face than "no door")
  const actions = openResource !== undefined ? { openResource } : {};
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/run/r-1" },
      actions: actions as never,
    } }),
    useResource: () => ({
      status: "live" as const,
      value: { kind: "run", runId: run.runId, status: run.status, draftId: run.draftId, stages: run.stages, lastFrame: undefined },
    }),
  } as never));
}

describe("the live run — cancel and back", () => {
  test("cancelling a running run stops it (the button arms while stopping)", async () => {
    mountRun(
      { runId: "r-1", status: "running", draftId: "d-1", stages: [{ id: "a", status: "running" }] },
      (address) => { opened.push(address); },
    );
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Cancel run" }));
    expect(screen.getByRole("button", { name: "cancelling…" })).toBeTruthy();
    await waitFor(() => {
      expect(posted.some((p) => p.method === "runs/stop")).toBe(true);
    }, { timeout: 5000 });
  });

  test("a dead cancel voices the refusal on the run face and re-arms (runs F3)", async () => {
    // was: the arm stuck at "cancelling…" forever on a refused stop —
    // the run face had no voice. The cure inverts the law: the note
    // carries the refusal and the button re-arms for a retry.
    mountRun(
      { runId: "r-1", status: "running", draftId: "d-1", stages: [{ id: "a", status: "running" }] },
      (address) => { opened.push(address); },
      { throws: [{ method: "runs/stop", message: "stop down" }] },
    );
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Cancel run" }));
    await waitFor(() => {
      expect(posted.some((p) => p.method === "runs/stop")).toBe(true);
    }, { timeout: 5000 });
    // the run face carries the refusal verbatim…
    expect(await screen.findByText("stop down", {}, { timeout: 5000 })).toBeTruthy();
    // …and the gesture never pretends it landed: the button re-armed
    expect(screen.getByRole("button", { name: "Cancel run" })).toBeTruthy();
  });

  test("a throwing cancel voices the foreign string verbatim and re-arms (runs F3)", async () => {
    // the door throws the foreign string "gone" verbatim (the old
    // stub's shape) — the note carries it, the arm releases either way.
    mountRun(
      { runId: "r-1", status: "running", draftId: "d-1", stages: [{ id: "a", status: "running" }] },
      (address) => { opened.push(address); },
      { throws: [{ method: "runs/stop", value: "gone" }] },
    );
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Cancel run" }));
    expect(await screen.findByText("gone", {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel run" })).toBeTruthy();
  });

  test("back returns to the bench address", async () => {
    mountRun(
      { runId: "r-1", status: "done", draftId: "d-1", stages: [] },
      (address) => { opened.push(address); },
    );
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Back to bench" }));
    await waitFor(() => {
      expect(opened.length).toBeGreaterThan(0);
    }, { timeout: 5000 });
    expect(opened[0]).toContain("cards/bench");
  });

  test("a settled run offers no cancel (nothing live to stop)", async () => {
    mountRun(
      { runId: "r-1", status: "done", draftId: "d-1", stages: [] },
      (address) => { opened.push(address); },
    );
    await screen.findByText("r-1");
    expect(screen.queryByRole("button", { name: "Cancel run" })).toBeNull();
  });
});

describe("the run stages — dots and thumbs", () => {
  test("every status paints its dot (artifacts ride links, the unknown rides bare)", async () => {
    mountRun(
      {
        runId: "r-1", status: "done", draftId: "d-1",
        stages: [
          { id: "a", status: "done", url: "out/a.png" },
          { id: "b", status: "running" },
          { id: "c", status: "failed" },
          { id: "d", status: "queued" },
          { id: "e", status: "pending" },
          { id: "f", status: "canceled" },
        ],
      },
      (address) => { opened.push(address); },
    );
    await screen.findByText("r-1");
    const first = document.querySelectorAll('li[data-stage-status]');
    expect(first.length).toBe(6);
    // the artifact thumb links out (run-scoped media url)
    const link = document.querySelector('li[data-stage-status="done"] a') as HTMLElement | null;
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toContain("out/a.png");
    // the unknown status rides without a dot (never a lying color)
    const bare = document.querySelector('li[data-stage-status="canceled"]');
    expect(bare?.querySelector('[class*="tileDot"]')).toBeNull();
  });

  test("a stage with no status word renders bare too (the seat's own guard, never a throw)", async () => {
    // The wire stage's status can be absent outright — the dot seat
    // folds it to no word (typeof guard at draft-run-views.tsx): no
    // dot, no lying color, and the classifier never hears it (the
    // persisted-word law's absence arm, pinned 2026-10-12 when the
    // per-file branch gate caught it uncovered).
    mountRun(
      {
        runId: "r-1", status: "done", draftId: "d-1",
        stages: [{ id: "a", status: "running" }, { id: "g" }],
      },
      (address) => { opened.push(address); },
    );
    await screen.findByText("r-1");
    // the two stage tiles; the absent-status one is the li React left
    // without a data-stage-status attribute (undefined is omitted)
    const tiles = Array.from(document.querySelectorAll('li[class*="tile"]'));
    expect(tiles.length).toBe(2);
    const bare = tiles.find((li) => li.getAttribute("data-stage-status") === null);
    expect(bare).toBeDefined();
    // …and no dot span — the same bare face as an unknown word.
    expect(bare?.querySelector('[class*="tileDot"]')).toBeNull();
    // the string-status sibling still paints its dot.
    const withWord = document.querySelector('li[data-stage-status="running"]');
    expect(withWord?.querySelector('[class*="tileDot"]')).not.toBeNull();
  });
});

describe("the restore — the run's stages back on the bench", () => {
  test("a clean draft restores (expect_rev rides the bench rev)", async () => {
    mountRun(
      { runId: "r-1", status: "done", draftId: "d-1", stages: [] },
      (address) => { opened.push(address); },
      { draftStages: [{ id: "s_9", card: "image-gen", engine: "comfyui", params: { prompt: "a barn" } }] },
    );
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Restore to bench" }));
    expect(await screen.findByText("restored 1 stage(s) to the bench", {}, { timeout: 5000 })).toBeTruthy();
    const add = posted.find((p) => p.method === "bench/add-stage");
    expect(add).toBeTruthy();
    expect((add?.args["doc"] as Record<string, unknown>)["expect_rev"]).toBe(5);
    // the restore returns to the bench (onRestored rides onBack)
    await waitFor(() => {
      expect(opened.length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });

  test("a card-less stage skips with its note (never a silent drop)", async () => {
    mountRun(
      { runId: "r-1", status: "done", draftId: "d-1", stages: [] },
      (address) => { opened.push(address); },
      { draftStages: [{ id: "x" }, { id: "s_9", card: "image-gen" }] },
    );
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Restore to bench" }));
    expect(await screen.findByText(/1 skipped/, {}, { timeout: 5000 })).toBeTruthy();
    expect(await screen.findByText(/no card/, {}, { timeout: 5000 })).toBeTruthy();
  });

  test("an unreadable draft voices the throw (never a stuck Restoring)", async () => {
    mountRun(
      { runId: "r-1", status: "done", draftId: "d-1", stages: [] },
      (address) => { opened.push(address); },
      { throws: [{ method: "drafts/get", message: "draft gone" }] },
    );
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Restore to bench" }));
    expect(await screen.findByText(/draft gone/, {}, { timeout: 5000 })).toBeTruthy();
    // settled back to the idle face (retry is armed)
    expect(await screen.findByRole("button", { name: "Restore to bench" }, { timeout: 5000 })).toBeTruthy();
  });

  test("a throwing draft voices the fallback (never empty)", async () => {
    // the door throws the foreign string "gone" verbatim (the old
    // stub's shape) — "unreadable: gone" voices.
    mountRun(
      { runId: "r-1", status: "done", draftId: "d-1", stages: [] },
      (address) => { opened.push(address); },
      { throws: [{ method: "drafts/get", value: "gone" }] },
    );
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Restore to bench" }));
    expect(await screen.findByText(/unreadable: gone/, {}, { timeout: 5000 })).toBeTruthy();
  });
});

describe("the draft-less door-less seat — nothing to restore, nowhere to go", () => {
  test("no draft disables restore and no door hides back", async () => {
    mountRun({ runId: "r-1", status: "done", draftId: null, stages: [] });
    await screen.findByText("r-1");
    expect(screen.queryByRole("button", { name: "Back to bench" })).toBeNull();
    const restore = screen.getByRole("button", { name: "Restore to bench" });
    expect(restore.hasAttribute("disabled")).toBe(true);
    expect(restore.getAttribute("title")).toContain("names no draft");
  });
});
