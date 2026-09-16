// @vitest-environment happy-dom
// cards-tab-runview.spec.tsx — the run seat's honest faces
// (2026-09-16 burn-down, installment 3j): the RunView renders from
// the observed run value (no wire choreography): the live cancel,
// the back door, the status dots + artifact thumbs, the restore
// (ok / skipped / thrown), and the draft-less door-less seat.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { CardsTab } from "../src/client/CardsTab.tsx";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

interface FrameAnswer { value?: unknown; refuse?: string; thrown?: unknown }
interface RunStage { id: string; status: string; url?: string }

const doors: {
  posted: Array<{ method: string; args: Record<string, unknown> }>;
  frames: Record<string, (args: Record<string, unknown>) => FrameAnswer>;
  opened: string[];
  draftStages: Array<Record<string, unknown>> | { thrown: unknown };
} = { posted: [], frames: {}, opened: [], draftStages: [] };

function stubFetch(): void {
  doors.posted = [];
  doors.frames = {};
  doors.opened = [];
  doors.draftStages = [];
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
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
    if (path.startsWith("/api/")) {
      const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string; payload: { args: Record<string, unknown> } };
      doors.posted.push({ method: frame.method, args: frame.payload.args });
      if (frame.method === "drafts/get") {
        if (!Array.isArray(doors.draftStages)) throw doors.draftStages.thrown;
        return new Response(JSON.stringify({
          type: "server-response", rpcId: frame.rpcId,
          result: { ok: true, value: { draft_id: "d-1", bench: { rev: 1 }, stages: doors.draftStages } },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (frame.method === "bench/get") {
        return new Response(JSON.stringify({
          type: "server-response", rpcId: frame.rpcId,
          result: { ok: true, value: { draft_id: "bench-p", rev: 5, log: [], stages: [] } },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
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

function mountRun(run: {
  runId: string; status: string; draftId: string | null; stages: RunStage[];
}, openResource?: (address: string) => void): void {
  stubFetch();
  doors.frames["bench/add-stage"] = () => ({ value: { rev: 6 } });
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
      status: "live",
      value: { kind: "run", runId: run.runId, status: run.status, draftId: run.draftId, stages: run.stages, lastFrame: undefined },
    }),
  } as never));
}

describe("the live run — cancel and back", () => {
  test("cancelling a running run stops it (the button arms while stopping)", async () => {
    mountRun(
      { runId: "r-1", status: "running", draftId: "d-1", stages: [{ id: "a", status: "running" }] },
      (address) => { doors.opened.push(address); },
    );
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Cancel run" }));
    expect(screen.getByRole("button", { name: "cancelling…" })).toBeTruthy();
    await waitFor(() => {
      expect(doors.posted.some((p) => p.method === "runs/stop")).toBe(true);
    }, { timeout: 5000 });
  });

  test("a dead cancel sticks on cancelling (the failure never clears the arm)", async () => {
    mountRun(
      { runId: "r-1", status: "running", draftId: "d-1", stages: [{ id: "a", status: "running" }] },
      (address) => { doors.opened.push(address); },
    );
    doors.frames["runs/stop"] = () => ({ thrown: new Error("stop down") });
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Cancel run" }));
    await waitFor(() => {
      expect(doors.posted.some((p) => p.method === "runs/stop")).toBe(true);
    }, { timeout: 5000 });
    // the stop threw — the button stays armed-stopping (the run seat
    // carries no error rail; the gesture never pretends it landed)
    expect(screen.getByRole("button", { name: "cancelling…" })).toBeTruthy();
  });

  test("a throwing cancel sticks too (never an empty arm)", async () => {
    mountRun(
      { runId: "r-1", status: "running", draftId: "d-1", stages: [{ id: "a", status: "running" }] },
      (address) => { doors.opened.push(address); },
    );
    doors.frames["runs/stop"] = () => ({ thrown: "gone" });
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Cancel run" }));
    await waitFor(() => {
      expect(doors.posted.some((p) => p.method === "runs/stop")).toBe(true);
    }, { timeout: 5000 });
    expect(screen.getByRole("button", { name: "cancelling…" })).toBeTruthy();
  });

  test("back returns to the bench address", async () => {
    mountRun(
      { runId: "r-1", status: "done", draftId: "d-1", stages: [] },
      (address) => { doors.opened.push(address); },
    );
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Back to bench" }));
    await waitFor(() => {
      expect(doors.opened.length).toBeGreaterThan(0);
    }, { timeout: 5000 });
    expect(doors.opened[0]).toContain("cards/bench");
  });

  test("a settled run offers no cancel (nothing live to stop)", async () => {
    mountRun(
      { runId: "r-1", status: "done", draftId: "d-1", stages: [] },
      (address) => { doors.opened.push(address); },
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
      (address) => { doors.opened.push(address); },
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
});

describe("the restore — the run's stages back on the bench", () => {
  test("a clean draft restores (expect_rev rides the bench rev)", async () => {
    doors.draftStages = [];
    mountRun(
      { runId: "r-1", status: "done", draftId: "d-1", stages: [] },
      (address) => { doors.opened.push(address); },
    );
    doors.draftStages = [{ id: "s_9", card: "image-gen", engine: "comfyui", params: { prompt: "a barn" } }];
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Restore to bench" }));
    expect(await screen.findByText("restored 1 stage(s) to the bench", {}, { timeout: 5000 })).toBeTruthy();
    const add = doors.posted.find((p) => p.method === "bench/add-stage");
    expect(add).toBeTruthy();
    expect((add?.args["doc"] as Record<string, unknown>)["expect_rev"]).toBe(5);
    // the restore returns to the bench (onRestored rides onBack)
    await waitFor(() => {
      expect(doors.opened.length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });

  test("a card-less stage skips with its note (never a silent drop)", async () => {
    doors.draftStages = [];
    mountRun(
      { runId: "r-1", status: "done", draftId: "d-1", stages: [] },
      (address) => { doors.opened.push(address); },
    );
    doors.draftStages = [{ id: "x" }, { id: "s_9", card: "image-gen" }];
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Restore to bench" }));
    expect(await screen.findByText(/1 skipped/, {}, { timeout: 5000 })).toBeTruthy();
    expect(await screen.findByText(/no card/, {}, { timeout: 5000 })).toBeTruthy();
  });

  test("an unreadable draft voices the throw (never a stuck Restoring)", async () => {
    doors.draftStages = [];
    mountRun(
      { runId: "r-1", status: "done", draftId: "d-1", stages: [] },
      (address) => { doors.opened.push(address); },
    );
    doors.draftStages = { thrown: new Error("draft gone") };
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Restore to bench" }));
    expect(await screen.findByText(/draft gone/, {}, { timeout: 5000 })).toBeTruthy();
    // settled back to the idle face (retry is armed)
    expect(await screen.findByRole("button", { name: "Restore to bench" }, { timeout: 5000 })).toBeTruthy();
  });

  test("a throwing draft voices the fallback (never empty)", async () => {
    doors.draftStages = [];
    mountRun(
      { runId: "r-1", status: "done", draftId: "d-1", stages: [] },
      (address) => { doors.opened.push(address); },
    );
    doors.draftStages = { thrown: "gone" };
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
