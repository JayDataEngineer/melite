// @vitest-environment happy-dom
// flow-sidebar-scroll.spec.tsx — the FLOW panel's own scroll law
// (operator volley 2026-10-24, items d+j: "errors flow above the
// visually available area" / "too much content and I can't scroll
// down"). The sibling cards-tab-scroll wall pins the TAB seat
// (.tabScroll); THIS wall pins the panel inside it — the bench and
// run bodies (section[data-cards-bench] / section[data-run-status])
// where a flow's stages and errors render. Three arms, one per
// invariant: (1) the panel body IS the scroll container (the
// overflow/min-height law, asserted structurally); (2) error rows
// render INSIDE the scrollable region in order — the first error at
// the top of the scroll content, never above it; (3) tall content
// scrolls on the panel, not the shell. Plus the CSS-contract arm,
// the same honest plane the sibling reads (happy-dom does no
// layout — the stylesheet text is the contract).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { CardsTab } from "../src/client/CardsTab.tsx";
import type { BenchStageView } from "../src/client/cards-resource.ts";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/client";
import { repoRoot } from "./repo-root.ts";

let fakes: { calls: Array<{ method: string; args: Record<string, unknown> }>; unmount: () => void } | null = null;

function stubDoors(estateOpts: Parameters<typeof mountEstateFakes>[0] = {}): void {
  fakes?.unmount();
  fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 5, log: [], stages: [] },
    ...estateOpts,
  });
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    // THE SAVE DOOR (bench ensure): refused here, so the save error
    // face drives deterministically — slug-taken is a refusal to
    // surface, never a rebase (the audit V-E7 law).
    if (path === "/v1/bench/ensure") {
      return new Response(JSON.stringify({ error: "slug taken", code: "bench/slug-taken" }), {
        status: 409, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify({ form: "image-gen" }), {
        status: 200, headers: { "content-type": "application/json" },
      });
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
  vi.unstubAllGlobals();
});

function tabInfo(address: string): () => unknown {
  return () => ({ tab: {
    kind: "sidebar.right.pane.tab", contentId: undefined,
    navigation: { address },
    actions: { openResource: () => {} },
  } });
}

function benchValue(stages: BenchStageView[]): unknown {
  return { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages };
}

/** The clipping host pane: 200px tall, overflow hidden — the same
 *  sidebar seat the sibling wall mounts. */
function mountInClip(node: ReturnType<typeof h>): void {
  render(h("div", { style: { height: "200px", overflow: "hidden" }, "data-testid": "clip-host" }, node));
}

function benchPanel(): HTMLElement {
  const panel = document.querySelector("section[data-cards-bench]");
  if (panel === null) throw new Error("bench panel section missing");
  return panel as HTMLElement;
}

function runPanel(): HTMLElement {
  const panel = document.querySelector("section[data-run-status]");
  if (panel === null) throw new Error("run panel section missing");
  return panel as HTMLElement;
}

/** card.module.css is the honest contract in happy-dom (no layout):
 *  slice a rule's declaration block out of the file text. */
function ruleBlock(law: string, selector: string): string | null {
  const at = law.indexOf(selector + " {");
  if (at < 0) return null;
  const end = law.indexOf("}", at);
  if (end < 0) return null;
  return law.slice(at, end + 1);
}

const LAW = join(repoRoot(), "packages/web/melite-card-view/src/client/card.module.css");

describe("1 — the flow panel body is the scroll container (the d+j seat, not the shell)", () => {
  test("the bench panel carries the scroll law: fills the tab seat, min-zero, scrolls its own axis", async () => {
    const stages: BenchStageView[] = [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }];
    stubDoors();
    mountInClip(h(CardsTab, {
      useTabInfo: tabInfo("dsh-resource://cards/bench"),
      useResource: () => ({ status: "live" as const, value: benchValue(stages) }),
    } as never));
    const panel = benchPanel();
    expect(panel.tagName).toBe("SECTION");
    expect(panel.className).toMatch(/cardsBench/);
    // the panel sits inside the tab seat — the seat scrolls the tab,
    // the panel scrolls the flow (nested scrollers, the studio law).
    expect(screen.getByTestId("cards-tab-scroll").contains(panel)).toBe(true);
    const law = readFileSync(LAW, "utf8");
    const bench = ruleBlock(law, ".cardsBench");
    expect(bench, ".cardsBench must exist in card.module.css").not.toBeNull();
    expect(bench).toContain("overflow-y: auto");
    expect(bench).toContain("min-width: 0");
    expect(bench).toContain("flex: 1 1 0%");
    // NOTE: min-height:0 — the half that lets the scroll FORM — is
    // arm 3's leg (one half per arm, so each toggle reds exactly one
    // arm's tests).
  });

  test("the run panel carries the same scroll law", async () => {
    stubDoors();
    mountInClip(h(CardsTab, {
      useTabInfo: tabInfo("dsh-resource://cards/run/r-1"),
      useResource: () => ({
        status: "live" as const,
        value: { kind: "run", runId: "r-1", status: "running", draftId: "d-1", stages: [{ id: "a", status: "running" }] },
      }),
    } as never));
    await screen.findByText("r-1");
    const panel = runPanel();
    expect(panel.tagName).toBe("SECTION");
    expect(panel.className).toMatch(/runView/);
    expect(screen.getByTestId("cards-tab-scroll").contains(panel)).toBe(true);
    const law = readFileSync(LAW, "utf8");
    const run = ruleBlock(law, ".runView");
    expect(run, ".runView must exist in card.module.css").not.toBeNull();
    expect(run).toContain("overflow-y: auto");
    expect(run).toContain("min-width: 0");
    expect(run).toContain("flex: 1 1 0%");
    // NOTE: min-height:0 is arm 3's leg (one half per arm).
  });

  test("both panel headers stay anchored (sticky over their own scroll)", async () => {
    const law = readFileSync(LAW, "utf8");
    const benchHead = ruleBlock(law, ".benchHead");
    expect(benchHead, ".benchHead must exist in card.module.css").not.toBeNull();
    expect(benchHead).toContain("position: sticky");
    expect(benchHead).toContain("top: 0");
    const runHead = ruleBlock(law, ".runHead");
    expect(runHead, ".runHead must exist in card.module.css").not.toBeNull();
    expect(runHead).toContain("position: sticky");
    expect(runHead).toContain("top: 0");
  });
});

describe("2 — error rows render INSIDE the scrollable region in order (never above it)", () => {
  test("a refused bench save voices below the header, before the grid — never inside the header row", async () => {
    const stages: BenchStageView[] = [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }];
    stubDoors();
    mountInClip(h(CardsTab, {
      useTabInfo: tabInfo("dsh-resource://cards/bench"),
      useResource: () => ({ status: "live" as const, value: benchValue(stages) }),
    } as never));
    // drive the save into its refusal: Save → name → Save (the outer
    // Save's accessible name is its content — the mint title is a
    // tooltip, never the role name).
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.change(screen.getByPlaceholderText("flow name"), { target: { value: "demo" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const err = await screen.findByTestId("bench-save-error", {}, { timeout: 5000 });
    expect(err.textContent).toContain("save refused (slug taken)");
    const panel = benchPanel();
    // INTO the panel's scroll content…
    expect(panel.contains(err)).toBe(true);
    // …never trapped inside the header's space-between row (the d-item:
    // the error squeezed beside the buttons and flowed above the
    // visible content, the top cut off)…
    const head = panel.querySelector("header");
    expect(head).not.toBeNull();
    expect(head!.contains(err)).toBe(false);
    // …first error at the top of the content, in order: header, error,
    // grid (the only <p> before the tile list).
    const tags = Array.from(panel.children).map((el) => el.tagName);
    expect(tags).toEqual(["HEADER", "P", "OL"]);
    expect(panel.children[1]).toBe(err);
  });

  test("a refused run stop voices on the run face between the actions and the stage list", async () => {
    stubDoors({ throws: [{ method: "runs/stop", message: "stop down" }] });
    mountInClip(h(CardsTab, {
      useTabInfo: tabInfo("dsh-resource://cards/run/r-1"),
      useResource: () => ({
        status: "live" as const,
        value: { kind: "run", runId: "r-1", status: "running", draftId: "d-1", stages: [{ id: "a", status: "running" }] },
      }),
    } as never));
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Cancel run" }));
    const note = await screen.findByTestId("run-note", {}, { timeout: 5000 });
    expect(note.textContent).toContain("stop down");
    const panel = runPanel();
    expect(panel.contains(note)).toBe(true);
    // in order: header, actions, note, stage list.
    const tags = Array.from(panel.children).map((el) => el.tagName);
    expect(tags).toEqual(["HEADER", "DIV", "P", "OL"]);
    expect(panel.children[2]).toBe(note);
    // the note's wrap law is ruled (the sibling missing-rule class:
    // css.restoreNote shipped with no rule — UA margins shoved the
    // strip). The stylesheet owns it now.
    const law = readFileSync(LAW, "utf8");
    const restoreNote = ruleBlock(law, ".restoreNote");
    expect(restoreNote, "css.restoreNote must exist in card.module.css").not.toBeNull();
    expect(restoreNote).toContain("margin: 0");
    expect(restoreNote).toContain("overflow-wrap: anywhere");
  });

  test("a failed run's terminal stage error voices in the panel body below the header (the runface-error cure)", async () => {
    // THE GAP (audit 2026-10-12-flow-sidebar-scroll §8 first bullet):
    // the run branch nulled the tab-level terminalStageErrorOf read
    // (the DRAFT shape { runStatus, result.error }), while the run
    // wire serves { status, error } rows the draft read folds to
    // not-failed — a failed RUN's WHY rendered nowhere, only the
    // per-tile status word. The cure voices the run shape's terminal
    // error INSIDE the panel, directly below the header (the same
    // below-the-header law as the bench save error above), in the
    // draft face's own .runError voice — no new CSS.
    stubDoors();
    mountInClip(h(CardsTab, {
      useTabInfo: tabInfo("dsh-resource://cards/run/r-1"),
      useResource: () => ({
        status: "live" as const,
        value: { kind: "run", runId: "r-1", status: "failed", draftId: "d-1", stages: [{ id: "a", status: "failed", error: "node 3 blew up" }] },
      }),
    } as never));
    const err = await screen.findByTestId("run-stage-error", {}, { timeout: 5000 });
    expect(err.textContent).toContain("node 3 blew up");
    const panel = runPanel();
    // INTO the panel's scroll content, never above it…
    expect(panel.contains(err)).toBe(true);
    // …directly below the header: header, error, actions, stage list
    // (no note here — the note seat below stays [DIV, P, OL] when it
    // lands; null renders nothing, so the refused-stop order above
    // is untouched).
    const tags = Array.from(panel.children).map((el) => el.tagName);
    expect(tags).toEqual(["HEADER", "P", "DIV", "OL"]);
    expect(panel.children[1]).toBe(err);
    // the draft face's own loud voice, not a new class.
    expect(err.className).toMatch(/runError/);
  });

  test("a failed run with only a run-level reason voices the fallback (no single stage owns it)", async () => {
    // THE OBSERVER'S FALLBACK (terminalOutcomeOf's own stage-first
    // order in cards-resource.ts): when no single stage owns the
    // reason, the runs seat stamps the text on the run itself.
    stubDoors();
    mountInClip(h(CardsTab, {
      useTabInfo: tabInfo("dsh-resource://cards/run/r-1"),
      useResource: () => ({
        status: "live" as const,
        value: { kind: "run", runId: "r-1", status: "failed", draftId: "d-1", error: "gpu gone", stages: [{ id: "a", status: "failed" }] },
      }),
    } as never));
    const err = await screen.findByTestId("run-stage-error", {}, { timeout: 5000 });
    expect(err.textContent).toContain("gpu gone");
    expect(runPanel().contains(err)).toBe(true);
  });

  test("a clean run voices no stage error (the seat stays header-actions-list)", async () => {
    stubDoors();
    mountInClip(h(CardsTab, {
      useTabInfo: tabInfo("dsh-resource://cards/run/r-1"),
      useResource: () => ({
        status: "live" as const,
        value: { kind: "run", runId: "r-1", status: "done", draftId: "d-1", stages: [{ id: "a", status: "done" }] },
      }),
    } as never));
    await screen.findByText("r-1");
    expect(screen.queryByTestId("run-stage-error")).toBeNull();
    const tags = Array.from(runPanel().children).map((el) => el.tagName);
    expect(tags).toEqual(["HEADER", "DIV", "OL"]);
  });
});

describe("3 — tall content scrolls on the panel (scrollHeight > clientSize on the container, not the shell)", () => {
  test("scroll-to-max on the bench panel reveals the last tile (never stranded below the fold)", async () => {
    const stages: BenchStageView[] = Array.from({ length: 50 }, (_, i) => (
      { id: "s_" + i, card: "image-gen", engine: "comfyui", params: {} }
    ));
    stubDoors();
    mountInClip(h(CardsTab, {
      useTabInfo: tabInfo("dsh-resource://cards/bench"),
      useResource: () => ({ status: "live" as const, value: benchValue(stages) }),
    } as never));
    const panel = benchPanel();
    const tiles = panel.querySelectorAll("[data-stage-id]");
    expect(tiles.length).toBe(50);
    const last = tiles[tiles.length - 1] as HTMLElement;
    expect(panel.contains(last)).toBe(true);
    // happy-dom does no layout (scrollHeight/clientHeight read 0), so
    // the wall mounts the panel's measured geometry the way filmSeam
    // mounts getBoundingClientRect — and judges the structural half:
    // the PANEL accepts and HOLDS scroll-to-max with the last tile
    // inside it (in a browser, the panel's own overflow-y:auto +
    // min-height:0 law makes that offset real; arm 1 owns the
    // overflow-y half, THIS arm the min-height half — the half that
    // lets the scroll FORM instead of pushing the shell taller).
    const law = readFileSync(LAW, "utf8");
    const bench = ruleBlock(law, ".cardsBench");
    expect(bench, ".cardsBench must exist in card.module.css").not.toBeNull();
    expect(bench).toContain("min-height: 0");
    Object.defineProperty(panel, "scrollHeight", { value: 5200, configurable: true });
    Object.defineProperty(panel, "clientHeight", { value: 200, configurable: true });
    expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight);
    panel.scrollTop = panel.scrollHeight - panel.clientHeight;
    expect(panel.scrollTop).toBe(5000);
    expect(panel.contains(last)).toBe(true);
  });

  test("a long run's stage list rides inside the run panel's scroll content", async () => {
    const runStages = Array.from({ length: 30 }, (_, i) => ({ id: "a_" + i, status: "done" }));
    stubDoors();
    mountInClip(h(CardsTab, {
      useTabInfo: tabInfo("dsh-resource://cards/run/r-1"),
      useResource: () => ({
        status: "live" as const,
        value: { kind: "run", runId: "r-1", status: "done", draftId: "d-1", stages: runStages },
      }),
    } as never));
    await screen.findByText("r-1");
    const panel = runPanel();
    const rows = panel.querySelectorAll("li");
    expect(rows.length).toBe(30);
    expect(panel.contains(rows[rows.length - 1])).toBe(true);
    // the run panel's own min-height half (arm 1 owns its overflow-y).
    const law = readFileSync(LAW, "utf8");
    const run = ruleBlock(law, ".runView");
    expect(run, ".runView must exist in card.module.css").not.toBeNull();
    expect(run).toContain("min-height: 0");
    Object.defineProperty(panel, "scrollHeight", { value: 3200, configurable: true });
    Object.defineProperty(panel, "clientHeight", { value: 200, configurable: true });
    expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight);
    panel.scrollTop = panel.scrollHeight - panel.clientHeight;
    expect(panel.scrollTop).toBe(3000);
    expect(panel.contains(rows[rows.length - 1])).toBe(true);
  });
});

describe("the CSS contract — the error voice still owns its style (no drive-by restyle)", () => {
  test("css.runError is DEFINED and unchanged (the refusal's loud face)", async () => {
    const law = readFileSync(LAW, "utf8");
    const runError = ruleBlock(law, ".runError");
    expect(runError, "css.runError must exist in card.module.css").not.toBeNull();
    expect(runError).toContain("overflow-wrap: anywhere");
    expect(runError).toContain("margin: 0");
  });
});
