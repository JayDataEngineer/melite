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
 * fetch stub answers an estate verb. KNOWN UNREACHABLES (exemption
 * candidates, the live-null induction — see the file header note in
 * the final report): the poll effect (live is never set), the thumb
 * img (thumbUrl is null whenever live is), the draftId-gone throw.
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement as h } from "react";
import { FlowCards } from "../src/client/FlowCards.tsx";
import type { ToolCallBlockView } from "../src/client/types.ts";
import { patchStageParams, resetStageWrites } from "../src/client/draft.ts";
import { mountEstateFakes, type EstateFakesOptions } from "./estate-harness.ts";

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
      await new Promise((resolve) => setTimeout(resolve, 50));
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
      await new Promise((resolve) => setTimeout(resolve, 50));
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
    expect(start?.args).toEqual({ doc: { draft_id: "draft-1" } });
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
    await expect(patchStageParams("draft-1", "s_0", { steps: 99 }, 3)).rejects.toThrow(/stage not found/);
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
