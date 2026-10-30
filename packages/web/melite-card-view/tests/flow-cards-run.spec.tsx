// @vitest-environment happy-dom
/**
 * flow-cards-run.spec.tsx — FlowCards' rendered faces the row-law
 * spec leaves uncovered (2026-09-16 burn-down):
 *
 *   faces    — composing / draft-failed / legacy-note / error+retry /
 *              the status-precedence row faces (data-status deep-equal
 *              over the whole dot map, service/prompt present+absent).
 *   unmount  — resolving after unmount sets nothing (no act warning,
 *              the door still serves the next mount).
 *   run      — THE GESTURE: open drill → edit → Run = drafts/patch
 *              FIRST (the CAS rev + the coerced patch, changed keys
 *              only), then runs/start, then close + refresh. And the
 *              no-edit Run (patch null → straight to start, never a
 *              lying patch).
 *
 * The doors ride the live one-lane seam (stroke 81): mountEstateFakes
 * binds fakes over the mounted Typert namespaces; the recorded
 * {method, args} call log is asserted (order, count, arg values). No
 * fetch stub answers an estate verb. The live tail (1.8's consumer
 * tail, closed 2026-10-12): the run press seeds it and the run
 * frames ride it (the unbound carrier is the unmounted face — one
 * snapshot, no interval; a bound one rides movement to terminal).
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement as h } from "react";
import { FlowCards } from "../src/client/FlowCards.tsx";
import type { ToolCallBlockView } from "../src/client/types.ts";
import { patchStageParams, resetStageWrites } from "../src/client/draft.ts";
import { bindRunFramesRemote } from "../src/client/cards-resource.ts";
import { mountEstateFakes, type EstateFakesOptions } from "./estate-harness.ts";
import { RemoteStreamCarrierError } from "@deepseek-ai/dsh-api-gateway/client";
import type { ClientRemote, RemoteStreamItem } from "@deepseek-ai/dsh-api-gateway/client";
import type { RemoteStreamHandle } from "@deepseek-ai/dsh-typert-protocol";
import type { RunRow } from "@melite/estate-runs";
import { draftIdOf } from "@melite/contracts/benchStage";

type Fakes = ReturnType<typeof mountEstateFakes>;
let active: Fakes | null = null;

/** Mount the one-lane fakes for one test (drained in afterEach). */
function wire(opts: EstateFakesOptions = {}): Fakes {
  active?.unmount();
  active = mountEstateFakes(opts);
  return active;
}

afterEach(() => {
  active?.unmount();
  active = null;
  cleanup();
  // the write ledger is module state shared across tests in this
  // file (same discipline as the tab specs): a refusal recorded by
  // one test must not refuse the next test's run.
  resetStageWrites();
  // the run-frames carrier is module state too (the entry's handed-
  // down bind): a bound test leaves nothing for the next one.
  bindRunFramesRemote(undefined);
  vi.unstubAllGlobals();
});

function settled(over: Partial<ToolCallBlockView> = {}): ToolCallBlockView {
  return {
    kind: "tool-result", callId: "c1", toolName: "melite_flow",
    argsRaw: JSON.stringify({ model: "krea-2" }),
    isError: false, meta: { draft_id: "draft-1" }, content: [],
    ...over,
  } as unknown as ToolCallBlockView;
}

const DOC = {
  draft_id: "draft-1",
  intent: "the film",
  bench: { rev: 3, log: [] },
  stages: [
    { id: "s_0", title: "gen", kind: "generation", service: "krea-2", status: "running", params: { prompt: "a green cone", steps: 8, turbo: false } },
    { id: "s_1", title: "up", kind: "post", status: "cached", params: {} },
    { id: "s_2", title: "wait", kind: "post", status: "pending", params: {} },
    { id: "s_3", title: "bad", kind: "post", status: "error", params: {} },
    { id: "s_4", title: "fresh", kind: "post", params: {} },
  ],
};

/** A fresh copy of the doc's stages per mount — the drafts/patch fake
 *  applies patches into the served rows, and sharing one object across
 *  tests would leak one gesture's edit into the next test's drill. */
function freshStages(): Array<Record<string, unknown>> {
  return DOC.stages.map((s) => ({ ...s, params: { ...(s.params as Record<string, unknown>) } }));
}

/** The standard doc over the live one-lane seam (bench rev 3, the
 *  start door minting r_1); extra harness options ride per test. */
function stubDraftDoc(extra: EstateFakesOptions = {}): Fakes {
  return wire({ draftStages: freshStages(), draftBenchRev: 3, draftIntent: DOC.intent, startDocs: [{ run_id: "r_1" }], ...extra });
}

describe("the waiting faces — composing, failed, legacy", () => {
  test("an unsettled call with no draft composes (never a hang)", async () => {
    stubDraftDoc();
    render(h(FlowCards, { block: { callId: "c1", toolName: "melite_flow" } as unknown as ToolCallBlockView }));
    expect(await screen.findByText("composing…", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a settled error renders the failed face (never a hang)", async () => {
    stubDraftDoc();
    render(h(FlowCards, { block: settled({ isError: true }) }));
    expect(await screen.findByText("draft failed", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a settled success that predates the draft contract renders the superseded note", async () => {
    stubDraftDoc();
    const { container } = render(h(FlowCards, {
      block: settled({ meta: null, content: [{ text: "nothing to see" }] }),
    }));
    const note = await screen.findByText("cards · earlier draft", {}, { timeout: 4000 });
    expect(note).toBeTruthy();
    expect(container.querySelector('[data-legacy="1"]')).toBeTruthy();
  });
});

describe("the row faces — status precedence, service, prompt", () => {
  test("every status distills onto the row (the dot map's domain)", async () => {
    stubDraftDoc();
    const { container } = render(h(FlowCards, { block: settled() }));
    await screen.findByText("gen", {}, { timeout: 4000 });
    const rows = [...container.querySelectorAll("[data-stage]")];
    expect(rows.map((r) => [r.getAttribute("data-stage"), r.getAttribute("data-status")])).toEqual([
      // the folded CardStatus rides the row verbatim (2026-10-01,
      // pending→queued same day): named statuses keep their name (the
      // dot map knows them all); the estate's queued-for-start word
      // folds to queued (the waiting face, warning dot); the
      // no-information home is pending — no dot, never a fake state.
      ["s_0", "running"], // live draft status rides (running)
      ["s_1", "cached"], // cached keeps its name (its dot is done-colored)
      ["s_2", "queued"], // pending folds to queued (the waiting dot)
      ["s_3", "error"], // error keeps its name (the error dot)
      ["s_4", "pending"], // no status → pending (no dot, never a fake state)
    ]);
  });

  test("service + prompt pills render when present, vanish when absent", async () => {
    stubDraftDoc();
    const { container } = render(h(FlowCards, { block: settled() }));
    await screen.findByText("gen", {}, { timeout: 4000 });
    // the serviced, prompted row carries both pills
    expect(await screen.findByText("krea-2", {}, { timeout: 4000 })).toBeTruthy();
    expect(await screen.findByText("a green cone", {}, { timeout: 4000 })).toBeTruthy();
    // the bare row carries only its kind pill (no service, no prompt)
    const bare = container.querySelector('[data-stage="s_4"]');
    expect(bare?.textContent).toContain("post");
    expect(bare?.textContent).not.toContain("krea-2");
  });

  test("the header names the draft's intent (the model's header loses)", async () => {
    stubDraftDoc();
    render(h(FlowCards, { block: settled() }));
    expect(await screen.findByText("the film", {}, { timeout: 4000 })).toBeTruthy();
  });
});

describe("the error face — named refusal + retry", () => {
  test("a dead hydration renders the refusal; retry re-reads and lands the rows", async () => {
    // The refusal is one-shot: the first drafts/get refuses, the
    // retry's re-read serves the doc.
    const fakes = stubDraftDoc({ refusals: [{ method: "drafts/get", message: "no_such_draft" }] });
    render(h(FlowCards, { block: settled() }));
    const retry = await screen.findByText(/retry/, {}, { timeout: 4000 });
    expect(retry.textContent).toContain("no_such_draft");
    fireEvent.click(retry);
    expect(await screen.findByText("gen", {}, { timeout: 4000 })).toBeTruthy();
    expect(fakes.calls.filter((c) => c.method === "drafts/get")).toHaveLength(2);
  });

  test("a foreign hydration failure renders the default face (never a blank death)", async () => {
    // ADAPTED (reported): the old lane threw the bare string "kablam"
    // (rendered as 'draft hydration failed'); the live seam rejects
    // with an Error carrying the text, which the face renders verbatim.
    wire({
      draftStages: freshStages(), draftBenchRev: 3,
      throws: [{ method: "drafts/get", message: "kablam" }],
    });
    render(h(FlowCards, { block: settled() }));
    const face = await screen.findByText(/retry/, {}, { timeout: 4000 });
    expect(face.textContent).toContain("kablam");
  });
});

describe("unmount before resolve — the late answer lands nowhere", () => {
  // ADAPTED (reported): the old lane gated the answer behind a
  // deferred fetch; the live seam answers immediately, so the race is
  // built by unmounting synchronously — before the in-flight
  // hydration promise lands.
  test("no state lands on the unmounted card; the next mount hydrates clean", async () => {
    stubDraftDoc();
    const errs: unknown[][] = [];
    const orig = console.error;
    console.error = (...args: unknown[]): void => { errs.push(args); };
    try {
      const mounted = render(h(FlowCards, { block: settled() }));
      mounted.unmount();
      // the in-flight hydration is a microtask chain (stubbed fetch —
      // no real tasks): flush it, not a 50ms sleep, then read the
      // absence of act warnings.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(errs.filter((a) => String(a[0]).includes("not wrapped in act"))).toEqual([]);
      // the door still serves: a fresh mount hydrates
      render(h(FlowCards, { block: settled() }));
      expect(await screen.findByText("gen", {}, { timeout: 4000 })).toBeTruthy();
    } finally {
      console.error = orig;
    }
  });

  test("a rejection after unmount sets nothing (the catch degrades, never warns)", async () => {
    wire({
      draftStages: freshStages(), draftBenchRev: 3,
      throws: [{ method: "drafts/get", message: "door died late" }],
    });
    const errs: unknown[][] = [];
    const orig = console.error;
    console.error = (...args: unknown[]): void => { errs.push(args); };
    try {
      const mounted = render(h(FlowCards, { block: settled() }));
      mounted.unmount();
      // same microtask-chain flush as the resolve arm above.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(errs.filter((a) => String(a[0]).includes("not wrapped in act"))).toEqual([]);
    } finally {
      console.error = orig;
    }
  });
});

describe("THE GESTURE — open drill, edit, Run = patch FIRST, then start", () => {
  test("an edit Runs what the user SEES (CAS rev + coerced patch, changed keys only)", async () => {
    const seen = stubDraftDoc().calls;
    const { container } = render(h(FlowCards, { block: settled() }));
    await screen.findByText("gen", {}, { timeout: 4000 });
    // open the in-card drill (no shell face in this harness)
    (container.querySelector('[data-stage="s_0"]') as HTMLElement).click();
    expect(await screen.findByText("Card gen", {}, { timeout: 4000 })).toBeTruthy();
    // retype steps 8 → 9 (the raw string coerces once, at patch time;
    // the drill rides a body portal — portal-safe display-value query)
    fireEvent.change(screen.getByDisplayValue("8"), { target: { value: "9" } });
    fireEvent.click(await screen.findByText("Run", {}, { timeout: 4000 }));
    // the drill closes and the card refreshes behind it
    await waitFor(() => { expect(screen.queryByText("Card gen")).toBeNull(); }, { timeout: 4000 });
    const patch = seen.find((c) => c.method === "drafts/patch");
    expect(patch?.args).toEqual({
      draftId: "draft-1", stageId: "s_0",
      patch: { params: { steps: 9 } },
      expectRev: 3,
    });
    const start = seen.find((c) => c.method === "runs/start");
    // F21 (2026-10-30): the drill's press names its bench stage —
    // bench_stage_id is what the run door persists and the sidecar maps
    // back as benchStageId, the tile's last_run binding
    expect(start?.args).toEqual({ doc: { draft_id: "draft-1", bench_stage_id: "s_0" } });
    // the patch LANDED BEFORE the start read it (the shared-state law)
    expect(seen.map((c) => c.method).indexOf("drafts/patch"))
      .toBeLessThan(seen.map((c) => c.method).indexOf("runs/start"));
  });

  test("a no-edit Run patches nothing (never a lying patch)", async () => {
    const seen = stubDraftDoc().calls;
    const { container } = render(h(FlowCards, { block: settled() }));
    await screen.findByText("gen", {}, { timeout: 4000 });
    (container.querySelector('[data-stage="s_1"]') as HTMLElement).click();
    expect(await screen.findByText("Card up", {}, { timeout: 4000 })).toBeTruthy();
    fireEvent.click(await screen.findByText("Run", {}, { timeout: 4000 }));
    await waitFor(() => { expect(screen.queryByText("Card up")).toBeNull(); }, { timeout: 4000 });
    expect(seen.map((c) => c.method)).not.toContain("drafts/patch");
    expect(seen.map((c) => c.method)).toContain("runs/start");
  });

  test("a refused Run renders its name in the drill (never a silent death)", async () => {
    stubDraftDoc({ refusals: [{ method: "drafts/patch", message: "admission: unknown stage" }] });
    const { container } = render(h(FlowCards, { block: settled() }));
    await screen.findByText("gen", {}, { timeout: 4000 });
    (container.querySelector('[data-stage="s_0"]') as HTMLElement).click();
    expect(await screen.findByText("Card gen", {}, { timeout: 4000 })).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue("8"), { target: { value: "11" } });
    fireEvent.click(await screen.findByText("Run", {}, { timeout: 4000 }));
    // the drill STAYS OPEN with the named refusal (the run never started)
    expect(await screen.findByText(/admission: unknown stage/, {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a dead write refuses the chat-tile run (the audit's A2) — the drill stays open, no runs/start", async () => {
    const seen = stubDraftDoc({ patchFailures: [{ draftId: "draft-1", stageId: "s_0", delivered: false, reason: "stage not found" }] }).calls;
    // THE DEAD WRITE, through the REAL channel — then a no-edit Run
    // (patch null: the tile's own patch is skipped, so ONLY the
    // ledger stands between the press and the engine).
    await expect(patchStageParams(draftIdOf("draft-1"), "s_0", { steps: 99 }, 3)).rejects.toThrow(/stage not found/);
    const { container } = render(h(FlowCards, { block: settled() }));
    await screen.findByText("gen", {}, { timeout: 4000 });
    (container.querySelector('[data-stage="s_0"]') as HTMLElement).click();
    expect(await screen.findByText("Card gen", {}, { timeout: 4000 })).toBeTruthy();
    fireEvent.click(await screen.findByText("Run", {}, { timeout: 4000 }));
    expect(await screen.findByText(/THE WRITE DID NOT LAND/, {}, { timeout: 4000 })).toBeTruthy();
    expect(seen.map((c) => c.method)).not.toContain("runs/start");
  });

  test("closing the drill unrunned refreshes behind it (never a stale card)", async () => {
    const seen = stubDraftDoc().calls;
    const { container } = render(h(FlowCards, { block: settled() }));
    await screen.findByText("gen", {}, { timeout: 4000 });
    (container.querySelector('[data-stage="s_0"]') as HTMLElement).click();
    expect(await screen.findByText("Card gen", {}, { timeout: 4000 })).toBeTruthy();
    expect(seen.filter((c) => c.method === "drafts/get")).toHaveLength(1);
    // the drill's own close (no Run): the card re-reads behind it
    fireEvent.click(await screen.findByRole("button", { name: "Close card" }, { timeout: 4000 }));
    await waitFor(() => { expect(screen.queryByText("Card gen")).toBeNull(); }, { timeout: 4000 });
    expect(seen.filter((c) => c.method === "drafts/get")).toHaveLength(2);
    expect(seen.map((c) => c.method)).not.toContain("runs/start");
  });
});

describe("THE SHELL CLAIM — a claimed surface opens, never the drill", () => {
  test("openSurface true carries the stage address (the in-card drill stays shut)", async () => {
    stubDraftDoc();
    const claimed: string[] = [];
    const { container } = render(h(FlowCards, {
      block: settled(),
      openSurface: (address: string) => { claimed.push(address); return true; },
    }));
    await screen.findByText("gen", {}, { timeout: 4000 });
    (container.querySelector('[data-stage="s_0"]') as HTMLElement).click();
    await new Promise((r) => setTimeout(r, 300));
    // the shell took it: the stage address rode out, no drill opened
    expect(claimed).toHaveLength(1);
    expect(claimed[0]).toContain("draft-1");
    expect(claimed[0]).toContain("s_0");
    expect(screen.queryByText("Card gen")).toBeNull();
  });
});

/* -- THE RUN STREAM FAKE (the run view spec's supervisor + channel
 * model, copied local on purpose — importing it across spec files
 * would run their suites): channels keyed by run id with push/drop
 * controls, and a $stream supervisor that classifies carrier loss
 * and reconnects. The channels ride mountEstateFakes' openRunStream
 * (the runs/subscribe verb); the remote rides bindRunFramesRemote
 * (the entry's handed-down carrier, cards-resource.ts). */
interface RunChannel {
  key: string;
  open: boolean;
  queue: Array<Record<string, unknown>>;
  wake: (() => void) | undefined;
}

function fakeRunStream(): {
  remote: ClientRemote;
  open: (runId: string, signal: AbortSignal) => RemoteStreamHandle<RunRow, never>;
  push: (runId: string, doc: Record<string, unknown>) => void;
  drop: () => void;
} {
  const channels: RunChannel[] = [];
  const pending = new Map<string, Array<Record<string, unknown>>>();
  const openChannel = (key: string): RemoteStreamHandle<RunRow, never> => {
    const channel: RunChannel = { key, open: true, queue: [...(pending.get(key) ?? [])], wake: undefined };
    pending.delete(key);
    channels.push(channel);
    return {
      [Symbol.asyncIterator]: () => ({
        next: (): Promise<IteratorResult<RunRow>> =>
          new Promise((resolve) => {
            const step = (): void => {
              channel.wake = undefined;
              if (!channel.open) return resolve({ done: true, value: undefined as never });
              const head = channel.queue.shift();
              if (head === undefined) {
                channel.wake = step;
                return;
              }
              resolve({ done: false, value: head as RunRow });
            };
            step();
          }),
      }),
      send: (): void => { throw new Error("fake runs handle has no uplink") },
      end: (): void => { channel.open = false; channel.wake?.(); },
      dispose: (): void => { channel.open = false; channel.wake?.(); },
    };
  };
  const $stream = <T,>(options: {
    name: string;
    open: (signal: AbortSignal) => AsyncIterable<T> | Promise<AsyncIterable<T>>;
    ended: (accepted: boolean) => Error;
    carrierFailed?: (error: RemoteStreamCarrierError) => void;
  }): { [Symbol.asyncIterator](): AsyncIterator<RemoteStreamItem<T>>; dispose(): Promise<void> } => {
    const lifetime = new AbortController();
    const queue: Array<RemoteStreamItem<T>> = [];
    const parked: Array<{
      resolve: (result: IteratorResult<RemoteStreamItem<T>>) => void;
      reject: (error: Error) => void;
    }> = [];
    let failed: Error | undefined;
    let channel: RunChannel | undefined;
    const closeChannel = (): void => {
      if (channel !== undefined && channel.open) {
        channel.open = false;
        channel.wake?.();
      }
    };
    const deliver = (): void => {
      while (parked.length > 0 && queue.length > 0) {
        const head = queue.shift()!;
        parked.shift()!.resolve({ done: false, value: head });
      }
    };
    lifetime.signal.addEventListener("abort", () => {
      closeChannel();
      for (const waiter of parked.splice(0)) waiter.resolve({ done: true, value: undefined as never });
    });
    const run = async (): Promise<void> => {
      if (lifetime.signal.aborted) return;
      while (!lifetime.signal.aborted && failed === undefined) {
        try {
          const before = channels.length;
          const iterable = await options.open(lifetime.signal);
          if (lifetime.signal.aborted) {
            for (const c of channels.slice(before)) { c.open = false; c.wake?.(); }
            return;
          }
          channel = channels.at(-1);
          let accepted = false;
          for await (const value of iterable) {
            if (lifetime.signal.aborted || failed !== undefined) return;
            queue.push({ generation: 0, value, signal: lifetime.signal, accept: () => { accepted = true } });
            deliver();
          }
          if (lifetime.signal.aborted) return;
          throw options.ended(accepted);
        } catch (error) {
          if (lifetime.signal.aborted || failed !== undefined) return;
          if (error instanceof RemoteStreamCarrierError) {
            options.carrierFailed?.(error);
            await Promise.resolve();
            continue;
          }
          failed = error instanceof Error ? error : new Error(String(error));
          for (const waiter of parked.splice(0)) waiter.reject(failed);
          return;
        }
      }
    };
    void run();
    return {
      [Symbol.asyncIterator]: () => ({
        next: (): Promise<IteratorResult<RemoteStreamItem<T>>> =>
          new Promise((resolve, reject) => {
            if (lifetime.signal.aborted) return resolve({ done: true, value: undefined as never });
            const head = queue.shift();
            if (head !== undefined) return resolve({ done: false, value: head });
            if (failed !== undefined) return reject(failed);
            parked.push({ resolve, reject });
          }),
      }),
      dispose: async (): Promise<void> => { lifetime.abort(); },
    };
  };
  const push = (key: string, doc: Record<string, unknown>): void => {
    const live = channels.filter((c) => c.key === key && c.open).at(-1);
    if (live === undefined) {
      pending.set(key, [...(pending.get(key) ?? []), doc]);
      return;
    }
    live.queue.push(doc);
    live.wake?.();
  };
  const drop = (): void => { for (const c of channels) { c.open = false; c.wake?.(); } };
  return {
    remote: { $stream } as unknown as ClientRemote,
    open: (runId: string, _signal: AbortSignal) => openChannel(runId),
    push,
    drop,
  };
}

describe("THE LIVE TAIL — the run press seeds it, the run frames ride it (1.8's consumer tail closed; the interval poll is dead)", () => {
  test("an unbound carrier serves one snapshot then ends — never an interval", async () => {
    const seen = stubDraftDoc().calls;
    const { container } = render(h(FlowCards, { block: settled() }));
    await screen.findByText("gen", {}, { timeout: 4000 });
    (container.querySelector('[data-stage="s_1"]') as HTMLElement).click();
    fireEvent.click(await screen.findByText("Run", {}, { timeout: 4000 }));
    await waitFor(() => {
      expect(seen.filter((c) => c.method === "runs/status" && c.args.runId === "r_1")).toHaveLength(1);
    }, { timeout: 4000 });
    // the unmounted face ends the tail: no subscribe attempt, and no
    // status re-read ever — the window spans the retired poll's full
    // 1500ms interval, so a re-seeded cadence would land inside it.
    await new Promise((r) => setTimeout(r, 1700));
    expect(seen.filter((c) => c.method === "runs/status")).toHaveLength(1);
    expect(seen.map((c) => c.method)).not.toContain("runs/subscribe");
  });

  test("a terminal hydrate ends the tail and refetches the draft once", async () => {
    const fakes = stubDraftDoc();
    fakes.setRunStatus("completed");
    const seen = fakes.calls;
    const { container } = render(h(FlowCards, { block: settled() }));
    await screen.findByText("gen", {}, { timeout: 4000 });
    (container.querySelector('[data-stage="s_1"]') as HTMLElement).click();
    fireEvent.click(await screen.findByText("Run", {}, { timeout: 4000 }));
    // press refresh (2) then the terminal frame's refetch (3): the
    // write-back stamps a fresh createdAt, and the reset tail never
    // re-hydrates.
    await waitFor(() => {
      expect(seen.filter((c) => c.method === "drafts/get")).toHaveLength(3);
    }, { timeout: 4000 });
    await new Promise((r) => setTimeout(r, 300));
    expect(seen.filter((c) => c.method === "drafts/get")).toHaveLength(3);
    expect(seen.filter((c) => c.method === "runs/status")).toHaveLength(1);
  });

  test("a bound carrier rides movement: stage frames fold onto rows, a loss is voiceless, terminal refetches — and unmount kills the tail", async () => {
    const fake = fakeRunStream();
    const fakes = stubDraftDoc({ openRunStream: fake.open });
    bindRunFramesRemote(fake.remote);
    const seen = fakes.calls;
    const { container } = render(h(FlowCards, { block: settled() }));
    await screen.findByText("gen", {}, { timeout: 4000 });
    (container.querySelector('[data-stage="s_1"]') as HTMLElement).click();
    fireEvent.click(await screen.findByText("Run", {}, { timeout: 4000 }));
    // the stream opened for the started run (the hydrate rode runs/status)
    await waitFor(() => {
      expect(seen.filter((c) => c.method === "runs/subscribe")).toHaveLength(1);
    }, { timeout: 4000 });
    expect(seen.filter((c) => c.method === "runs/subscribe")[0]?.args).toEqual({ runId: "r_1" });
    // movement: a stage frame with a url folds onto row s_0 — the
    // thumb the old poll never could serve (its live was never set)
    fake.push("r_1", { run_id: "r_1", status: "running", stages: [{ id: "st-0", status: "done", url: "a.png" }] });
    const thumb = await screen.findByAltText("gen", {}, { timeout: 4000 });
    expect((thumb as HTMLImageElement).src).toContain("r_1");
    // carrier loss: one failure frame — voiceless here (the last live
    // stays), and the supervisor's own reconnect reopens the channel
    fake.drop();
    await new Promise((r) => setTimeout(r, 60));
    expect(screen.queryByAltText("gen")).not.toBeNull();
    // recovered channel: the terminal frame ends the tail with ONE
    // more draft refetch (mount + the press's own refresh + this)
    fake.push("r_1", { run_id: "r_1", status: "completed", stages: [{ id: "st-0", status: "done", url: "a.png" }] });
    await waitFor(() => {
      expect(seen.filter((c) => c.method === "drafts/get")).toHaveLength(3);
    }, { timeout: 4000 });
    // unmount kills the tail: a later push finds no reader, no
    // refetch ever fires again
    cleanup();
    fake.push("r_1", { run_id: "r_1", status: "failed", stages: [] });
    fake.drop();
    await new Promise((r) => setTimeout(r, 120));
    expect(seen.filter((c) => c.method === "drafts/get")).toHaveLength(3);
  });
});
