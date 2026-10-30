// @vitest-environment happy-dom
// error-dismiss.spec.tsx — THE RED × (operator 2026-11-05: "errors
// stick there FOREVER"): every error face in the card drilldown and
// the flow sidetab carries a dismiss control that retires it — the
// drill's run refusal, the zoom bar, the stage drill's error/write/
// enhance/group faces, the tab strip (local claims retire outright,
// derived row voices silence by text), the bench panel rows, and the
// run face's stage error + note. Two laws per face: (1) the × clears
// the face; (2) a NEW failure re-voices (the silence never eats a
// fresh refusal). The control rides the catalog Button (ghost sm +
// the close glyph — the S6d close-× idiom, never a hand-rolled
// button, never a native title: the chrome + tip canons hold).
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h, type ReactElement } from "react";
import { mountEstateFakes, type EstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote, schemaEnvelope } from '@melite/card-base/client';
import { resetStageWrites, stageWriteState } from "../src/client/draft.ts";
import { CardDrill } from "../src/client/card-drill.tsx";
import { CardsTab } from "../src/client/CardsTab.tsx";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";
import { draftIdOf } from '@melite/contracts/benchStage';

type EstateOpts = Parameters<typeof mountEstateFakes>[0];

let fakes: EstateFakes | null = null;

function stubFetch(): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path === "/v1/bench/ensure") {
      return new Response(JSON.stringify({ error: "slug taken", code: "bench/slug-taken" }), {
        status: 409, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui", model: "image-gen",
        schema: schemaEnvelope({
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        }),
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
    if (path.includes("/melite-tools/enhance")) {
      return new Response("upstream melite down", { status: 502 });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

function mountTab(stages: BenchStageView[], opts?: {
  estate?: EstateOpts
  resource?: unknown
  log?: Array<Record<string, unknown>>
  /** Serve a failed snapshot (the refresh-failed arm) instead of live. */
  failedSnapshot?: string
}): void {
  stubFetch();
  fakes?.unmount();
  fakes = mountEstateFakes({
    benchDoc: {
      draft_id: "bench-p", rev: 1, log: opts?.log ?? [],
      stages: stages.map((s) => ({ ...s, run_status: (s as { runStatus?: string }).runStatus })),
    },
    draftStages: stages as Array<Record<string, unknown>>,
    draftBenchRev: 1,
    throws: opts?.estate?.throws,
    patchFailures: opts?.estate?.patchFailures,
  });
  const value = opts?.resource ?? (
    { kind: "bench", draftId: "bench-p", rev: 1, log: opts?.log ?? [], stages } as unknown as CardsBenchValue
  );
  const snapshot = opts?.failedSnapshot !== undefined
    ? { status: "failed" as const, value: value as never, failure: new Error(opts.failedSnapshot) }
    : { status: "live" as const, value: value as never };
  render(h(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/bench" },
        actions: { openResource: () => {} },
      },
    }),
    useResource: () => snapshot,
  } as never));
}

function mountRun(run: { runId: string; status: string; draftId: string | null; stages: Array<Record<string, unknown>> }, estate?: EstateOpts): void {
  stubFetch();
  fakes?.unmount();
  fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 5, log: [], stages: [] },
    ...(estate ?? {}),
  });
  render(h(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/run/r-1" },
        actions: {},
      },
    }),
    useResource: () => ({
      status: "live" as const,
      value: { kind: "run", runId: run.runId, status: run.status, draftId: run.draftId, stages: run.stages },
    }),
  } as never));
}

afterEach(() => {
  cleanup();
  fakes?.unmount();
  fakes = null;
  unbindEstateRemote();
  // THE LEDGER ISOLATION RESET (the cross-test pollution law): the
  // write ledger is accountable module state — a refusal recorded by
  // one test must not refuse the next test's press.
  resetStageWrites();
  vi.unstubAllGlobals();
});

const cleanStage = (): BenchStageView =>
  ({ id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a red cube" } }) as unknown as BenchStageView;

const failedStage = (error: string): BenchStageView =>
  ({ ...cleanStage(), runStatus: "failed", result: { error } }) as unknown as BenchStageView;

function firstTile(): HTMLElement {
  const el = document.querySelector('[role="button"][class*="tileInner"]');
  if (el === null) throw new Error("tile button not found");
  return el as HTMLElement;
}

function zoomCard(): HTMLElement {
  const el = document.querySelector('div[class*="zoomCard"]');
  if (el === null) throw new Error("zoom card not found");
  return el as HTMLElement;
}

async function openFirstTile(): Promise<void> {
  const user = userEvent.setup();
  await user.click(firstTile());
  await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
}

/** The × inside a face's own element (every face owns exactly one). */
function dismissIn(scope: HTMLElement): void {
  fireEvent.click(within(scope).getByRole("button", { name: "Dismiss error" }));
}

/** The tab strip's own <p> — a direct child of the scroll seat that
 *  owns a × AND rides the .runError face. Since audit 017 C4 the
 *  refresh-failed line owns a × too, so "any × P" would grab the
 *  wrong face; the strip is the run-verb face, keyed by class. */
function tabStrip(): HTMLElement | null {
  const seat = screen.queryByTestId("cards-tab-scroll");
  if (seat === null) return null;
  const direct = Array.from(seat.children).find((el) =>
    el.tagName === "P" && el.className.includes("runError") &&
    el.querySelector('[aria-label="Dismiss error"]') !== null);
  return (direct as HTMLElement | undefined) ?? null;
}

async function awaitStrip(): Promise<HTMLElement> {
  let strip: HTMLElement | null = null;
  await waitFor(() => {
    strip = tabStrip();
    if (strip === null) throw new Error("tab strip not up yet");
  }, { timeout: 4000 });
  return strip as unknown as HTMLElement;
}

describe("the drilldown's run refusal (CardDrill) carries a × that retires it", () => {
  test("a throwing onRun voices, and the × clears the face", async () => {
    render(h(CardDrill, {
      title: "Card hero",
      fields: [{ key: "prompt", value: "hi", atom: "text" }],
      thumbUrl: null,
      running: false,
      onRun: async () => { throw new Error("drill boom"); },
      onClose: () => {},
    }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Run" }));
    const face = await screen.findByText("drill boom", {}, { timeout: 4000 });
    const row = face.closest("span") as HTMLElement;
    dismissIn(row);
    await waitFor(() => { expect(screen.queryByText("drill boom")).toBeNull(); });
  });
});

describe("the zoom bar (the drilldown's top strip) carries a × that retires it", () => {
  test("a failed row's bar error dismisses — the tile keeps the row's truth", async () => {
    mountTab([failedStage("node 3 blew up")]);
    await openFirstTile();
    const bar = await screen.findByTestId("drill-run-error", {}, { timeout: 4000 });
    expect(bar.textContent ?? "").toContain("node 3 blew up");
    dismissIn(bar);
    await waitFor(() => { expect(screen.queryByTestId("drill-run-error")).toBeNull(); });
    // THE ROW KEEPS ITS TRUTH (the dismissal retires the FACE, never
    // the state): the tile still carries the failure below.
    expect(screen.getByTestId("tile-run-error").textContent ?? "").toContain("node 3 blew up");
  });
});

describe("the stage drill's faces each carry a × that retires only its own face", () => {
  async function openRefusedDrill(): Promise<void> {
    // TWO scripted failures (one-shot queue): the typed write lands
    // refused (the write face), and the Run press's flush lands
    // refused too (the error face) — runs/start never fires, in
    // either settle order.
    mountTab([cleanStage()], { estate: { patchFailures: [{ reason: "flush down" }, { reason: "flush down" }] } });
    await openFirstTile();
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const area = document.querySelector("textarea");
    if (area === null) throw new Error("prompt field not found");
    await user.type(area, "x");
    await screen.findByTestId("stage-write-face", {}, { timeout: 8000 });
    await waitFor(() => {
      if (stageWriteState(draftIdOf("bench-p"), "s_0").pending !== 0) throw new Error("write still in flight");
    }, { timeout: 8000 });
    await user.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => {
      if (document.querySelectorAll('div[class*="drillRunRow"]').length < 2) throw new Error("both faces not up yet");
    }, { timeout: 8000 });
  }

  function drillRows(): { errorRow: HTMLElement; writeRow: HTMLElement } {
    const rows = Array.from(document.querySelectorAll('div[class*="drillRunRow"]'));
    const writeRow = rows.find((r) => r.querySelector('[data-testid="stage-write-face"]') !== null);
    const errorRow = rows.find((r) => r.querySelector('[data-testid="stage-write-face"]') === null);
    if (writeRow === undefined || errorRow === undefined) throw new Error("both drill faces missing");
    return { errorRow: errorRow as HTMLElement, writeRow: writeRow as HTMLElement };
  }

  test("the run-error × clears the error face and keeps the write face", async () => {
    await openRefusedDrill();
    const { errorRow, writeRow } = drillRows();
    dismissIn(errorRow);
    await waitFor(() => {
      if (document.querySelectorAll('div[class*="drillRunRow"]').length !== 1) throw new Error("error face still up");
    });
    expect(writeRow.isConnected).toBe(true);
    expect(screen.getByTestId("stage-write-face")).toBeTruthy();
  });

  test("the write-face × clears the write face and keeps the error face", async () => {
    await openRefusedDrill();
    const { errorRow, writeRow } = drillRows();
    dismissIn(writeRow);
    await waitFor(() => { expect(screen.queryByTestId("stage-write-face")).toBeNull(); });
    expect(errorRow.isConnected).toBe(true);
    expect(document.querySelectorAll('div[class*="drillRunRow"]').length).toBe(1);
  });

  test("the enhance note's × clears it (refusal re-arms on the next press)", async () => {
    mountTab([cleanStage()]);
    await openFirstTile();
    await screen.findByLabelText("Prompt", {}, { timeout: 4000 });
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Agent Enhance" }));
    const note = await screen.findByTestId("enhance-note", {}, { timeout: 5000 });
    expect(note.textContent ?? "").toContain("enhance failed (502: upstream melite down)");
    dismissIn(note as HTMLElement);
    await waitFor(() => { expect(screen.queryByTestId("enhance-note")).toBeNull(); });
  });

  test("the group face's × clears a refused ungroup", async () => {
    mountTab(
      [{ id: "g_0", card: "group", engine: "comfyui", params: {}, children: [{ id: "s_0", card: "image-gen" }] } as never],
      { estate: { throws: [{ method: "bench/ungroup", message: "ungroup failed" }] } },
    );
    const user = userEvent.setup();
    await user.click(firstTile());
    fireEvent.click(await screen.findByText("Ungroup", {}, { timeout: 4000 }));
    // (2026-10-30 flake audit FLAKE 2) await the verb's THROW before
    // polling the DOM: the withRebase transport throw propagates
    // immediately, but the face's paint rides the still-settling
    // mount cascade — under the full pool the fixed 4000ms poll reded
    // while the throw was already recorded, closing the coverage
    // window on the group face's span. The fake's own call record is
    // the settle point; the paint then gets double budget.
    await waitFor(
      () => { expect(fakes?.calls.some((c) => c.method === "bench/ungroup")).toBe(true); },
      { timeout: 8000 },
    );
    const face = await screen.findByText("ungroup failed", {}, { timeout: 8000 });
    const row = face.closest("div") as HTMLElement;
    dismissIn(row);
    // THE LOAD BUDGET (the round-6 battery): this repaint is one state
    // commit, but under the full 1000-file battery the paint can land
    // past testing-library's 1 s default and red a cure that holds —
    // the same under-load class the lane-strike note carries (FLAKE 5).
    await waitFor(() => { expect(screen.queryByText("ungroup failed")).toBeNull(); }, { timeout: 8000 });
  });
});

describe("the flow sidetab's strip carries a × that retires it — and a new failure re-voices", () => {
  test("a derived bench voice dismisses — the tile keeps the row's truth", async () => {
    mountTab([failedStage("node 3 blew up")]);
    const strip = await awaitStrip();
    expect(strip.textContent ?? "").toContain("node 3 blew up");
    dismissIn(strip);
    await waitFor(() => { expect(tabStrip()).toBeNull(); });
    expect(screen.getByTestId("tile-run-error").textContent ?? "").toContain("node 3 blew up");
  });

  test("a derived draft voice dismisses", async () => {
    mountTab([failedStage("draft blew up")], {
      resource: {
        kind: "draft", draftId: "bench-p", stageId: "s_0", intent: "image-gen", rev: 1,
        stages: [failedStage("draft blew up")],
      },
    });
    const strip = await awaitStrip();
    expect(strip.textContent ?? "").toContain("draft blew up");
    dismissIn(strip);
    await waitFor(() => { expect(tabStrip()).toBeNull(); });
  });

  test("a local claim dismisses outright (no derived voice to silence)", async () => {
    // a failed refresh snapshot voices the refresh-failed line; Run
    // ALL then refuses to compose from last-good state — a LOCAL
    // verb claim with no derived voice behind it.
    mountTab([cleanStage()], { failedSnapshot: "engine cold" });
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    const strip = await awaitStrip();
    expect(strip.textContent ?? "").toContain("refresh failed");
    dismissIn(strip);
    await waitFor(() => { expect(tabStrip()).toBeNull(); });
  });

  test("the silence ends at clean rows — the same words re-voice on the next failure", async () => {
    // ONE mount, three resources: the silence is tab state, so only
    // a re-render (never a remount) proves the re-arm.
    stubFetch();
    fakes?.unmount();
    fakes = mountEstateFakes({
      benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [] },
      draftStages: [],
      draftBenchRev: 1,
    });
    let stages: BenchStageView[] = [failedStage("node 3 blew up")];
    const tabInfo = (): unknown => ({
      tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/bench" },
        actions: { openResource: () => {} },
      },
    });
    const element = (): ReactElement => h(CardsTab, {
      useTabInfo: tabInfo,
      useResource: () => ({
        status: "live" as const,
        value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages } as unknown as CardsBenchValue,
      }),
    } as never);
    const view = render(element());
    dismissIn(await awaitStrip());
    await waitFor(() => { expect(tabStrip()).toBeNull(); });
    // the rows go clean (the re-arm): the silence retires with them…
    stages = [cleanStage()];
    view.rerender(element());
    await waitFor(() => { expect(tabStrip()).toBeNull(); });
    // …so the NEXT failure voices even in the exact same words.
    stages = [failedStage("node 3 blew up")];
    view.rerender(element());
    const revoiced = await awaitStrip();
    expect(revoiced.textContent ?? "").toContain("node 3 blew up");
  });
});

describe("the bench panel's rows each carry a × that retires only its own row", () => {
  test("a refused save dismisses", async () => {
    mountTab([cleanStage()]);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.change(screen.getByPlaceholderText("flow name"), { target: { value: "demo" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const err = await screen.findByTestId("bench-save-error", {}, { timeout: 5000 });
    expect(err.textContent ?? "").toContain("save refused (slug taken)");
    dismissIn(err);
    await waitFor(() => { expect(screen.queryByTestId("bench-save-error")).toBeNull(); });
  });

  test("a refused undo dismisses", async () => {
    mountTab([cleanStage()], {
      log: [{ kind: "add-stage" }],
      estate: { throws: [{ method: "bench/undo", message: "undo down" }] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    const err = await screen.findByTestId("bench-reload-error", {}, { timeout: 5000 });
    expect(err.textContent ?? "").toContain("undo refused");
    dismissIn(err);
    await waitFor(() => { expect(screen.queryByTestId("bench-reload-error")).toBeNull(); });
  });
});

describe("the run face's voices each carry a ×", () => {
  test("the terminal stage error dismisses", async () => {
    mountRun(
      { runId: "r-1", status: "failed", draftId: "d-1", stages: [{ id: "a", status: "failed", error: "node 3 blew up" }] },
    );
    const err = await screen.findByTestId("run-stage-error", {}, { timeout: 5000 });
    expect(err.textContent ?? "").toContain("node 3 blew up");
    dismissIn(err);
    await waitFor(() => { expect(screen.queryByTestId("run-stage-error")).toBeNull(); });
  });

  test("the restore/stop note dismisses", async () => {
    mountRun(
      { runId: "r-1", status: "running", draftId: "d-1", stages: [{ id: "a", status: "running" }] },
      { throws: [{ method: "runs/stop", message: "stop down" }] },
    );
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Cancel run" }));
    const note = await screen.findByTestId("run-note", {}, { timeout: 5000 });
    expect(note.textContent ?? "").toContain("stop down");
    dismissIn(note);
    await waitFor(() => { expect(screen.queryByTestId("run-note")).toBeNull(); });
  });
});

describe("the bench tile's failure face carries a × that retires it", () => {
  /** Same-mount re-render (the tile's dismissal is component state —
   *  only a re-render, never a remount, proves the silence + re-arm
   *  laws). Rev bumps move BenchView's live copy (its effect keys on
   *  draftId + rev); stage ids stay stable so tiles never remount. */
  function mountRerenderable(stages: BenchStageView[], rev: number): {
    show: (next: BenchStageView[], nextRev: number) => void
  } {
    stubFetch();
    fakes?.unmount();
    fakes = mountEstateFakes({
      benchDoc: {
        draft_id: "bench-p", rev, log: [],
        stages: stages.map((s) => ({ ...s, run_status: (s as { runStatus?: string }).runStatus })),
      },
      draftStages: stages as Array<Record<string, unknown>>,
      draftBenchRev: 1,
    });
    const element = (value: CardsBenchValue): ReactElement => h(CardsTab, {
      useTabInfo: () => ({
        tab: {
          kind: "sidebar.right.pane.tab", contentId: undefined,
          navigation: { address: "dsh-resource://cards/bench" },
          actions: { openResource: () => {} },
        },
      }),
      useResource: () => ({ status: "live" as const, value: value as never }),
    } as never);
    const view = render(element({ kind: "bench", draftId: "bench-p", rev, log: [], stages } as unknown as CardsBenchValue));
    return {
      show: (next: BenchStageView[], nextRev: number): void => {
        view.rerender(element({ kind: "bench", draftId: "bench-p", rev: nextRev, log: [], stages: next } as unknown as CardsBenchValue));
      },
    };
  }

  test("the × clears the tile face — the tile keeps the failure (face retired, not state)", async () => {
    mountTab([failedStage("node 3 blew up")]);
    const face = await screen.findByTestId("tile-run-error", {}, { timeout: 4000 });
    expect(face.textContent ?? "").toContain("node 3 blew up");
    dismissIn(face);
    await waitFor(() => { expect(screen.queryByTestId("tile-run-error")).toBeNull(); });
    // the tile itself stays failed below the retired face
    expect(firstTile().getAttribute("data-status")).toBe("error");
  });

  test("the × consumes its click — the drill does NOT open", async () => {
    mountTab([failedStage("node 3 blew up")]);
    const face = await screen.findByTestId("tile-run-error", {}, { timeout: 4000 });
    dismissIn(face);
    await waitFor(() => { expect(screen.queryByTestId("tile-run-error")).toBeNull(); });
    // the tile button underneath never fired (no seat-bubble drill)
    expect(screen.queryByTestId("stage-preview-seat")).toBeNull();
  });

  test("a stale error carry on a non-failed row stays silent (the original gate holds)", async () => {
    mountTab([{ ...cleanStage(), runStatus: "done", result: { error: "stale carry" } } as never]);
    await waitFor(() => { expect(document.querySelector('[data-stage-id="s_0"]')).not.toBeNull(); }, { timeout: 4000 });
    expect(screen.queryByTestId("tile-run-error")).toBeNull();
  });

  test("a new refusal text re-voices; clean rows re-arm the same words", async () => {
    const { show } = mountRerenderable([failedStage("node 3 blew up")], 1);
    const face = await screen.findByTestId("tile-run-error", {}, { timeout: 4000 });
    dismissIn(face);
    await waitFor(() => { expect(screen.queryByTestId("tile-run-error")).toBeNull(); });
    // a NEW refusal text voices through the silence (silence is per text)
    show([failedStage("node 9 blew up")], 2);
    const face2 = await screen.findByTestId("tile-run-error", {}, { timeout: 4000 });
    expect(face2.textContent ?? "").toContain("node 9 blew up");
    dismissIn(face2);
    await waitFor(() => { expect(screen.queryByTestId("tile-run-error")).toBeNull(); });
    // clean rows retire the silence — the same words voice again after
    show([cleanStage()], 3);
    await waitFor(() => { expect(document.querySelector('[data-stage-id="s_0"]')).not.toBeNull(); });
    show([failedStage("node 9 blew up")], 4);
    const face3 = await screen.findByTestId("tile-run-error", {}, { timeout: 4000 });
    expect(face3.textContent ?? "").toContain("node 9 blew up");
  });
});

// THE PLACEMENT LAW (audit 017, 2026-11-12 — the operator's "the TTS
// card errors do not have the X"): the × EXISTED since 2026-10-15 but
// painted at the top-right corner of the whole BROWSER WINDOW —
// .errorDismiss is position:absolute while every ancestor up to
// .zoomOverlay (position:fixed; inset:0) was static, so the nearest
// positioned ancestor was the VIEWPORT and the operator read the
// error as having no X at all. Presence-only arms (this file's whole
// prior life, and the 2026-11-05 regression audit's "wall 18/18
// green") cannot see placement — this arm judges the ANCHOR CONTRACT
// at its truth home: the stylesheet.
describe("THE PLACEMENT LAW — the × anchors to the error's own face, never the viewport", () => {
  test(".runError (and .enhanceRow) position the × 's anchor — the absolute child lands on the error, not the window corner", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { join, dirname } = await import("node:path");
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/client/card.module.css"), "utf8");
    const block = (name: string): string => {
      const m = css.match(new RegExp("\\." + name + "\\s*\\{[^}]*\\}", "m"));
      expect(m, "." + name + " block exists in card.module.css").not.toBeNull();
      return m![0]!;
    };
    const runError = block("runError");
    expect(runError, ".runError must carry position:relative — the × 's positioned ancestor is the error's own element (the anchor cure, audit 017 C1)").toMatch(/position\s*:\s*relative/);
    const enhanceRow = block("enhanceRow");
    expect(enhanceRow, ".enhanceRow must carry position:relative — the success note carries no .runError to anchor its ×").toMatch(/position\s*:\s*relative/);
    const dismiss = block("errorDismiss");
    expect(dismiss, ".errorDismiss stays position:absolute — the anchor contract: absolute child, positioned error parent").toMatch(/position\s*:\s*absolute/);
  });
});
