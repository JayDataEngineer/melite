// @vitest-environment happy-dom
// cards-tab-drill.spec.tsx — the shared drilldown's mount and state
// arms (2026-09-16 burn-down, installment 3a): fresh-open seeding,
// the model-key fallbacks, the cardless raw face, the huge-spec
// surface report, the spec-failure face, the unmount-mid-load
// guards, the preview-seat click/keyboard arms, the webhook faces,
// the group compound, the slot-claimed remove/bindRun, and the
// draft view's noop surface. CardsTab mounted whole (the
// preview-dispatch harness); fetch stubbed whole per door with
// deferred form-spec / forms-table for the race tests.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { resetFormsEdgeMetaForTests } from "../src/client/forms-edge-meta.ts"
import { mountEstateFakes, type EstateFakes, type EstateRefusal } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { resetPickCellsForTests } from '@melite/card-base/client';
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from '@melite/card-base/client';
import type { BenchStageView, CardsBenchValue, CardsDraftValue } from "../src/client/cards-resource.ts";
// THE RE-POINT RESCOPE's REAL ROWS (2026-11-06, the anima burn): the
// wall arms below serve the two burn families' DECL truth through the
// real /v1/form-spec door stub — krea-2's turbo (int8 cell, the
// [4,8]/[1,2] envelope) against anima's turbo (int8_convrot + bf16,
// resolver steps 8 / cfg 1). The serializer-parity wall itself is the
// sync lane's (discovery.ts); these fixtures ride the DECLs' own rows
// so the drill's law judges real coordinates, never hand spellings.
import { DECL as krea2WallDecl } from "../../../models/krea-2/src/index.ts";
import { DECL as animaWallDecl } from "../../../models/anima/src/index.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

type FormSpecMode = "ok" | "huge" | "reject-string" | "deferred";
type FormsMode = "ok" | "deferred" | "reject";

interface Controller {
  formSpec: FormSpecMode;
  formsTable: FormsMode;
  resolveFormSpec: ((body: unknown) => void) | null;
  resolveFormsTable: ((body: unknown) => void) | null;
}

const doors: Controller = {
  formSpec: "ok",
  formsTable: "ok",
  resolveFormSpec: null,
  resolveFormsTable: null,
};

// THE ONE-FAKE LAW (stroke 81): estate verbs ride the bound
// namespaces (mountEstateFakes); fetch answers ONLY the /v1
// discovery doors.
let fakes: EstateFakes | null = null;

function calls(): Array<{ method: string; args: Record<string, unknown> }> {
  if (fakes === null) throw new Error("estate fakes not mounted");
  return fakes.calls;
}

function specBody(): Record<string, unknown> {
  return {
    form: "image-gen", genre: "image", engine: "comfyui",
    ...(doors.formSpec === "huge" ? { size: "huge" } : {}),
    schema: schemaEnvelope({
      prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
    }),
  };
}

function stubFetch(): void {
  doors.resolveFormSpec = null;
  doors.resolveFormsTable = null;
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      if (doors.formSpec === "reject-string") throw "kablam";
      if (doors.formSpec === "deferred") {
        return new Promise<Response>((resolve) => {
          doors.resolveFormSpec = (body: unknown) => resolve(new Response(JSON.stringify(body), {
            status: 200, headers: { "content-type": "application/json" },
          }));
        });
      }
      return new Response(JSON.stringify(specBody()), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/forms")) {
      if (doors.formsTable === "reject") throw new Error("forms table down");
      if (doors.formsTable === "deferred") {
        return new Promise<Response>((resolve) => {
          doors.resolveFormsTable = (body: unknown) => resolve(new Response(JSON.stringify(body), {
            status: 200, headers: { "content-type": "application/json" },
          }));
        });
      }
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

function benchValue(stages: BenchStageView[]): CardsBenchValue {
  return { kind: "bench", draftId: "bench-p", sessionKey: "p", rev: 1, log: [], stages };
}

function benchDoc(stages: BenchStageView[]): Record<string, unknown> {
  // rows ride verbatim (readBench passes them through) — the rail
  // reads the same seats the snapshot carries.
  return { draft_id: "bench-p", rev: 1, log: [], stages };
}

interface EstateOpts {
  refusals?: EstateRefusal[];
  throws?: EstateRefusal[];
}

function mountBench(stages: BenchStageView[], renderSlot?: Parameters<typeof CardsTab>[0]["renderSlot"], estate?: EstateOpts, wallDocs?: Record<string, Record<string, unknown>>): void {
  doors.formSpec = "ok";
  doors.formsTable = "ok";
  if (wallDocs !== undefined) stubFetchWall(wallDocs);
  else stubFetch();
  fakes = mountEstateFakes({
    benchDoc: benchDoc(stages),
    draftStages: stages as Array<Record<string, unknown>>,
    draftBenchRev: 1,
    refusals: estate?.refusals,
    throws: estate?.throws,
  });
  const view = render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value: benchValue(stages) }),
    ...(renderSlot !== undefined ? { renderSlot } : {}),
  }));
  (globalThis as { __cardsTabView?: unknown }).__cardsTabView = view;
}
  test("THE EMPTY-FACE FALLBACK: a stopped run with no landed outputs shows the HISTORY HEAD — the latest gen is never lost", async () => {
    const stages: BenchStageView[] = [{
      id: "s_0", card: "image-gen", engine: "comfyui",
      params: { prompt: "same" }, runStatus: "stopped",
      // the stopped run never landed — the current face is empty
      result: { run_id: "run-stopped" },
      // the LAST LANDED gen sits at history head
      history: [
        { run_id: "run-last", url: "/last.png", artifacts: { "gen.png": "/last.png" } },
        { run_id: "run-old", url: "/old.png", artifacts: { "old.png": "/old.png" } },
      ],
    } as never];
    mountBench(stages);
    await openFirstTile();
    const hero = (previewSeat().querySelector("img") as HTMLImageElement | null)?.getAttribute("src") ?? null;
    expect(hero).toBe("/last.png");
  });

  test("a failed forms-table fetch never blocks the drill (null edge meta falls to the unfiltered picker)", async () => {
    const stages: BenchStageView[] = [{
      id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "x" }, runStatus: "done",
      result: { run_id: "run-1", url: "/a.png", artifacts: { "a.png": "/a.png" } },
    } as never];
    mountBench(stages); // mounts the tab (doors reset to ok)
    resetFormsEdgeMetaForTests();
    doors.formsTable = "reject"; // the drill's OWN mount (below) fetches against the rejected table
    await openFirstTile();
    expect(document.querySelector('[data-testid="stage-preview-seat"]')).not.toBeNull();
    // the mount effect's catch ran (the fetch rejected) — the seat still renders
  });

  test("THE REPORT CLAIM (ROADMAP 11e): a run's named verdicts render under the preview, one atom per report", async () => {
    const stages: BenchStageView[] = [{
      id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "x" }, runStatus: "done",
      result: {
        run_id: "run-rig", url: "/a.png", artifacts: { "a.png": "/a.png" },
        reports: {
          validate: {
            kind: "report", status: "pass", title: "game-ready gate",
            chips: ["triangles", "uv"], rows: { triangles: 14980, skinned: true },
          },
          lint: { kind: "report", status: "warn" },
        },
      },
    } as never];
    mountBench(stages);
    await openFirstTile();
    const section = document.querySelector('[data-testid="stage-reports"]');
    expect(section).not.toBeNull();
    const cards = section!.querySelectorAll('[data-testid="report-card"]');
    expect(cards.length).toBe(2);
    // the full face: status word, title, chips, rows
    expect(section!.textContent).toContain("game-ready gate");
    expect(section!.textContent).toContain("PASS");
    expect(section!.textContent).toContain("triangles");
    expect(section!.textContent).toContain("14980");
    // the untitled report renders its own name (the title law)
    expect(section!.textContent).toContain("lint");
    expect(section!.textContent).toContain("WARN");
  });

  test("no reports, no section — the outputs column stays the preview alone", async () => {
    const stages: BenchStageView[] = [{
      id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "x" }, runStatus: "done",
      result: { run_id: "run-1", url: "/a.png", artifacts: { "a.png": "/a.png" } },
    } as never];
    mountBench(stages);
    await openFirstTile();
    expect(document.querySelector('[data-testid="stage-reports"]')).toBeNull();
  });

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

function previewSeat(): HTMLElement {
  const el = document.querySelector('[data-testid="stage-preview-seat"]');
  if (el === null) throw new Error("preview seat not found");
  return el as HTMLElement;
}

function drilldownOpen(): boolean {
  return document.querySelector('[aria-label="Close preview"]') !== null;
}

// THE UNMOUNT GUARD RUNS FIRST (module-cache law): the forms
// edge-meta promise caches per session — this race needs its fetch
// PENDING, so it mounts before any other drill warms the cache.
describe("the drill's unmount guards — late answers never touch a dead drill", () => {
  test("closing mid-load drops both answers (no crash, no resurrection)", async () => {
    doors.formSpec = "deferred";
    doors.formsTable = "deferred";
    // the edge-meta cache is MODULE state (one fetch per session): a
    // warm cache from an earlier test would answer instantly and the
    // deferred door would never arm — reset so THIS mount truly waits
    // (and again after, so later walls refetch their own truth)
    resetFormsEdgeMetaForTests();
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    doors.formSpec = "deferred";
    doors.formsTable = "deferred";
    stubFetchDeferredOnly();
    const user = userEvent.setup();
    await user.click(firstTile());
    // the detail mounted and waits on both doors
    await screen.findByText("form…", {}, { timeout: 4000 });
    // close SYNCHRONOUSLY (no await between — microtasks must not run)
    fireEvent.click(screen.getByLabelText("Collapse card"));
    expect(document.querySelector('[data-testid="stage-preview-seat"]')).toBeNull();
    // the late answers land on a dead drill — alive is false, nothing happens
    doors.resolveFormSpec!(specBody());
    doors.resolveFormsTable?.({});
    // delivery is promise continuations (microtasks): flush, not a
    // 50ms window — the drop runs before the timer would fire.
    await new Promise((r) => setTimeout(r, 0));
    expect(document.querySelector('[data-testid="stage-preview-seat"]')).toBeNull();
    expect(firstTile()).toBeTruthy();
    resetFormsEdgeMetaForTests();
  });
});

/** Re-stub only the deferred doors after a mount reset them (the
 *  mount helper resets modes; races re-arm after). */
function stubFetchDeferredOnly(): void {
  const impl = globalThis.fetch;
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      return new Promise<Response>((resolve) => {
        doors.resolveFormSpec = (body: unknown) => resolve(new Response(JSON.stringify(body), {
          status: 200, headers: { "content-type": "application/json" },
        }));
      });
    }
    if (path.includes("/v1/forms")) {
      return new Promise<Response>((resolve) => {
        doors.resolveFormsTable = (body: unknown) => resolve(new Response(JSON.stringify(body), {
          status: 200, headers: { "content-type": "application/json" },
        }));
      });
    }
    return (impl as typeof fetch)(url as string, init);
  });
}

describe("the drill's mount arms — every row opens its truth", () => {
  test("a junk-params row opens and seeds empty (never a throw on the seed)", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: ["junk"] } as never]);
    await openFirstTile();
    expect(await screen.findByText("Prompt", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a modeless row specs by card id (the family falls through)", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    await openFirstTile();
    expect(await screen.findByText("Prompt", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a cardless engineless row shows its raw params (never a hang)", async () => {
    mountBench([{ id: "s_0", engine: "" }]);
    const user = userEvent.setup();
    await user.click(firstTile());
    const pre = await screen.findByText("{}", {}, { timeout: 4000 });
    expect(pre.tagName).toBe("PRE");
  });

  test("a huge spec reports its surface and still renders", async () => {
    doors.formSpec = "huge";
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    // the mode must be set BEFORE the mount's stubFetch resets it —
    // re-arm after mount (the fetch reads the mode per request)
    doors.formSpec = "huge";
    await openFirstTile();
    expect(await screen.findByText("Prompt", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a spec failure renders its own words (even a thrown string, never a JSON stack)", async () => {
    doors.formSpec = "reject-string";
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    doors.formSpec = "reject-string";
    const user = userEvent.setup();
    await user.click(firstTile());
    // the harness throws the plain string "kablam" — the face speaks
    // the thrower's words verbatim (the failureText law), not a
    // fixed fallback that masks them
    expect(await screen.findByText("kablam", {}, { timeout: 4000 })).toBeTruthy();
  });
});

describe("the preview seat — click and keyboard map the hero", () => {
  test("no artifacts: the click is a no-op (never an empty drilldown)", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, result: {} }]);
    await openFirstTile();
    fireEvent.click(previewSeat());
    await new Promise((r) => setTimeout(r, 50));
    expect(drilldownOpen()).toBe(false);
  });

  test("an unpreviewable url: the click is a no-op (the sniff found no kind)", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, result: { artifacts: { file: "/x.unknown" } } }]);
    await openFirstTile();
    fireEvent.click(previewSeat());
    await new Promise((r) => setTimeout(r, 50));
    expect(drilldownOpen()).toBe(false);
  });

  test("a mesh hero opens the drilldown and closes again", async () => {
    mountBench([{ id: "s_0", card: "anny", engine: "comfyui", params: {}, result: { artifacts: { turn: "/out/body.glb" } } }]);
    await openFirstTile();
    fireEvent.click(previewSeat());
    const close = await screen.findByLabelText("Close preview", {}, { timeout: 4000 });
    expect(close).toBeTruthy();
    fireEvent.click(close);
    await waitFor(() => { expect(drilldownOpen()).toBe(false); });
  });

  test("Enter on the seat opens the drilldown (the keyboard path)", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, result: { artifacts: { img: "/out/pic.png" } } }]);
    await openFirstTile();
    fireEvent.keyDown(previewSeat(), { key: "Enter" });
    expect(await screen.findByLabelText("Close preview", {}, { timeout: 4000 })).toBeTruthy();
  });
});

describe("the webhook faces — the tap's fold renders live", () => {
  test("a top-level activity shows the engine line", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, activity: "node 12" } as never]);
    await openFirstTile();
    const line = await screen.findByLabelText("engine activity", {}, { timeout: 4000 });
    expect(line.textContent).toBe("node 12");
  });

  test("a live progress folds to percent (value/max ride along)", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, progress: { value: 1, max: 4 } } as never]);
    await openFirstTile();
    const strip = document.querySelector('[data-testid="drill-webhooks"]');
    expect(strip?.textContent).toContain("25% (1/4)");
  });

  test("a zero-max progress shows no percent (never a divide face)", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, progress: { value: 1, max: 0 } } as never]);
    await openFirstTile();
    const strip = document.querySelector('[data-testid="drill-webhooks"]');
    // THE VACUOUS PASS (wall audit M19): `strip?.textContent ?? ""`
    // made this arm green even when the strip never rendered — the
    // no-% claim judged an empty string. The strip renders
    // unconditionally (stage-drill.tsx webhookFeed), so its absence
    // is a real crime, never a pass.
    expect(strip, "the webhook strip must render even without a percent face").not.toBeNull();
    expect(strip!.textContent ?? "").not.toContain("%");
  });
});

describe("the group compound — members, ungroup, and its honesty", () => {
  const group = (children: unknown[]): BenchStageView => ({ id: "g_0", card: "group", engine: "comfyui", params: {}, children } as never);

  test("members list, junk filtered (never a throw on a bad child)", async () => {
    mountBench([group([
      { id: "s_0", card: "image-gen", title: "A" },
      { id: "s_1" },
      "junk", null, { noid: true },
    ])]);
    const user = userEvent.setup();
    await user.click(firstTile());
    expect(await screen.findByText(/A compound of 2 stages\./, {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("s_1")).toBeTruthy();
  });

  test("Ungroup spills the compound and closes (the wire's rev rides)", async () => {
    // the harness's bench/ungroup answers OK by default (the old
    // {rev: 2} frame's intent: success closes the drill).
    mountBench([group([{ id: "s_0", card: "image-gen" }])]);
    const user = userEvent.setup();
    await user.click(firstTile());
    fireEvent.click(await screen.findByText("Ungroup", {}, { timeout: 4000 }));
    await waitFor(() => { expect(document.querySelector('[data-testid="stage-preview-seat"]')).toBeNull(); });
    const call = calls().find((p) => p.method === "bench/ungroup");
    expect((call?.args["doc"] as Record<string, unknown>)["stage"]).toBe("g_0");
  });

  test("a refused Ungroup keeps the drill and says why (the button frees)", async () => {
    mountBench(
      [group([{ id: "s_0", card: "image-gen" }])],
      undefined,
      { refusals: [{ method: "bench/ungroup", message: "stale rev" }] },
    );
    const user = userEvent.setup();
    await user.click(firstTile());
    fireEvent.click(await screen.findByText("Ungroup", {}, { timeout: 4000 }));
    // The refusal rides the client's async failure path and renders on a
    // macrotask; the budget must exceed a LOADED event loop (the sibling
    // drill2 case failed once in a full-suite run with a 4s wait inside
    // a 5s test; this arm then measured 15.5s in a full pre-push run —
    // fixed budgets sized for an idle box starve under the whole dom
    // suite's workers). 25s stays inside the 30s test budget.
    expect(await screen.findByText("stale rev", {}, { timeout: 25000 })).toBeTruthy();
    expect(screen.getByText("Ungroup")).toBeTruthy();
  }, 30_000);
});

describe("the slot-claimed drill — remove and bindRun ride the owner", () => {
  function mountClaimed(stages: BenchStageView[], claim: (owner: Record<string, unknown>) => unknown, estate?: EstateOpts): void {
    mountBench(stages, ((slot: string, owner: Record<string, unknown>, opts: { fallback: unknown }) => {
      if (slot !== "cards.stage.view") return opts.fallback;
      // the claim WRAPS the generic body (the error faces still
      // render) and adds the gesture button beside it
      return h("div", null,
        opts.fallback as never,
        h("div", { "data-testid": "slot-claim" }, claim(owner) as never),
      );
    }) as never, estate);
  }

  test("the owner's remove spills through the wire and closes", async () => {
    mountClaimed(
      [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      (owner) => h("button", {
        type: "button", "data-testid": "slot-remove",
        onClick: () => { (owner["onRemove"] as () => void)(); },
      }, "SLOT-REMOVE"),
    );
    const user = userEvent.setup();
    await user.click(firstTile());
    fireEvent.click(await screen.findByTestId("slot-remove", {}, { timeout: 4000 }));
    await waitFor(() => { expect(document.querySelector('[data-testid="stage-preview-seat"]')).toBeNull(); });
    expect(calls().some((p) => p.method === "bench/remove-stage")).toBe(true);
  });

  test("a refused remove keeps the drill and says why", async () => {
    mountClaimed(
      [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      (owner) => h("button", {
        type: "button", "data-testid": "slot-remove",
        onClick: () => { (owner["onRemove"] as () => void)(); },
      }, "SLOT-REMOVE"),
      { refusals: [{ method: "bench/remove-stage", message: "ghost rev" }] },
    );
    const user = userEvent.setup();
    await user.click(firstTile());
    fireEvent.click(await screen.findByTestId("slot-remove", {}, { timeout: 4000 }));
    expect(await screen.findByText("ghost rev", {}, { timeout: 4000 })).toBeTruthy();
    expect(document.querySelector('[data-testid="stage-preview-seat"]')).not.toBeNull();
  });

  test("the owner's bindRun claims without a bound verb (never a throw)", async () => {
    mountClaimed(
      [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      (owner) => h("button", {
        type: "button", "data-testid": "slot-bind",
        onClick: () => { (owner["bindRun"] as (r: () => void) => void)(() => {}); },
      }, "SLOT-BIND"),
    );
    const user = userEvent.setup();
    await user.click(firstTile());
    fireEvent.click(await screen.findByTestId("slot-bind", {}, { timeout: 4000 }));
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector('[data-testid="stage-preview-seat"]')).not.toBeNull();
  });
});

describe("the output history — the slot sees hero and archive aligned", () => {
  test("the preview owner carries history and its params notes", async () => {
    const owners: Array<Record<string, unknown>> = [];
    mountBench(
      [{
        id: "s_0", card: "image-gen", engine: "comfyui",
        params: { prompt: "new" },
        result: { url: "/new.png", artifacts: { img: "/new.png" } },
        history: [{ url: "/old.png", params: { prompt: "old" } }],
      } as never],
      ((slot: string, owner: Record<string, unknown>, opts: { fallback: unknown }) => {
        if (slot === "cards.stage.preview") owners.push(owner);
        return opts.fallback;
      }) as never,
    );
    await openFirstTile();
    await waitFor(() => { expect(owners.length).toBeGreaterThan(0); });
    const last = owners[owners.length - 1]!;
    expect(last["history"]).toEqual([[{ name: "output", url: "/old.png" }]]);
    expect(last["historyNotes"]).toEqual(["prompt"]);
  });
});

describe("the draft view's drill — the noop surface stays silent", () => {
  test("an unclaimed draft stage drills without a surface host", async () => {
    stubFetch();
    // the drill still reads through the bound namespaces (the old
    // default-{} drafts/get is now the harness's honest draft row).
    fakes = mountEstateFakes();
    const value: CardsDraftValue = {
      kind: "draft", draftId: "draft-1", stageId: "s_0",
      intent: "the film", rev: 1,
      stages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
    };
    render(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/draft/draft-1/s_0" },
        actions: { openResource: () => {} },
      } }),
      useResource: () => ({ status: "live" as const, value }),
    }));
    expect(await screen.findByText("Prompt", {}, { timeout: 4000 })).toBeTruthy();
  });
});

// ── THE WALK ARROWS ON THE CARD (2026-09-20, the operator's
// catch: "where are my side arrows when I open an image so scroll
// through to others") ─────────────────────────────────────────
// The stage preview's seat opens the shared MediaDrilldown with
// the FROZEN-AT-OPEN walk set: the current run's artifacts + every
// archived generation, newest first. The arrows walk it.
describe("the drilldown walk — the card's opened image scrolls the stage gallery", () => {
  test("opening the preview walks the LINE — right deeper into history, left back to current; the ends hold (operator 2026-09-21: left must go OUT of history, not deeper)", async () => {
    mountBench([{
      id: "s_0", card: "image-gen", engine: "comfyui",
      params: { prompt: "new" },
      result: { url: "/cur.png", artifacts: { img: "/cur.png" } },
      history: [
        { url: "/h1.png", artifacts: { img: "/h1.png" } },
        { url: "/h2.png", artifacts: { img: "/h2.png" } },
      ],
    } as never]);
    await openFirstTile();
    fireEvent.click(previewSeat());
    // the drilldown opened with arrows (3 walkable: current + 2 history)
    const next = await screen.findByTestId("drill-next", {}, { timeout: 4000 });
    expect(document.querySelector('[data-testid="drill-prev"]')).not.toBeNull();
    const hero = () => (document.querySelector('div[class*="lightbox"] img') as HTMLImageElement | null)?.getAttribute("src") ?? null;
    expect(hero()).toBe("/cur.png");
    const user = userEvent.setup();
    await user.click(next);                       // → history[0]
    expect(hero()).toBe("/h1.png");
    await user.click(screen.getByTestId("drill-next")); // → history[1]
    expect(hero()).toBe("/h2.png");
    await user.click(screen.getByTestId("drill-next")); // at the tail: HOLDS — never wraps to current
    expect(hero()).toBe("/h2.png");
    await user.click(screen.getByTestId("drill-prev")); // ← toward current
    expect(hero()).toBe("/h1.png");
    await user.click(screen.getByTestId("drill-prev")); // ← arrives at current
    expect(hero()).toBe("/cur.png");
    await user.click(screen.getByTestId("drill-prev")); // ← at current: HOLDS the viewer open (no close-on-walk)
    await waitFor(() => { expect(drilldownOpen()).toBe(true); }, { timeout: 1000 });
    expect(hero()).toBe("/cur.png");
  });

  test("THE WALK DEDUP LAW: the landing archive puts the CURRENT gen at history's head — the walk holds one seat per url, so the first › visibly moves (operator 2026-09-20: 'clicking the arrow does literally nothing')", async () => {
    mountBench([{
      id: "s_0", card: "image-gen", engine: "comfyui",
      params: { prompt: "new" },
      result: { url: "/cur.png", artifacts: { img: "/cur.png" } },
      history: [
        { url: "/cur.png", artifacts: { img: "/cur.png" } }, // the landing: SAME url as current
        { url: "/old.png", artifacts: { img: "/old.png" } },
      ],
    } as never]);
    await openFirstTile();
    fireEvent.click(previewSeat());
    await screen.findByTestId("drill-next", {}, { timeout: 4000 });
    const hero = () => (document.querySelector('div[class*="lightbox"] img') as HTMLImageElement | null)?.getAttribute("src") ?? null;
    expect(hero()).toBe("/cur.png");
    const user = userEvent.setup();
    await user.click(screen.getByTestId("drill-next")); // the FIRST step must reach the OLDER gen, not an identical twin
    expect(hero()).toBe("/old.png");
  });

  test("a stage with NO history paints no arrows (one artifact, nothing to walk)", async () => {
    mountBench([{
      id: "s_0", card: "image-gen", engine: "comfyui",
      params: {},
      result: { url: "/only.png", artifacts: { img: "/only.png" } },
    } as never]);
    await openFirstTile();
    fireEvent.click(previewSeat());
    await screen.findByLabelText("Close preview", {}, { timeout: 4000 });
    expect(document.querySelector('[data-testid="drill-next"]')).toBeNull();
    expect(document.querySelector('[data-testid="drill-prev"]')).toBeNull();
  });

  // THE OPERATOR'S CATCH (2026-09-23, told 5+ times): "when I
  // reload card history and open the timeline / h3 card, the
  // preview only shows of the three clips ONE clip." The stage's
  // result must carry the FULL gallery (the wand's stamp — see
  // bench-load's FULL GALLERY wall); the card's drill walks ALL of
  // it with the concatenated FILM as the hero. The window naming
  // is the real estate spelling (h3_t4_w2_00004_.mp4).
  test("THE FULL GALLERY ON THE CARD — an h3 stage restores ALL THREE clips, hero = the concatenated film, and the player FITS THE BOX", async () => {
    mountBench([{
      id: "s_0", card: "image-gen", engine: "comfyui",
      params: { prompt: "the storm" },
      result: {
        run_id: "run-rh3",
        url: "/h3_t4_film_00021_.mp4",
        artifacts: {
          "h3-film/h3_t4_film_00021_.mp4": "/h3_t4_film_00021_.mp4",
          "h3-film/h3_t4_w1_00005_.mp4": "/h3_t4_w1_00005_.mp4",
          "h3-film/h3_t4_w2_00004_.mp4": "/h3_t4_w2_00004_.mp4",
        },
      },
    } as never]);
    await openFirstTile();
    fireEvent.click(previewSeat());
    const next = await screen.findByTestId("drill-next", {}, { timeout: 4000 });
    const src = (): string | null =>
      document.querySelector('div[class*="lightbox"] video')?.getAttribute("src") ?? null;
    // the hero is the FILM — never a window clip
    expect(src()).toBe("/h3_t4_film_00021_.mp4");
    const user = userEvent.setup();
    await user.click(next);                                  // → window 1 of 3
    expect(src()).toBe("/h3_t4_w1_00005_.mp4");
    await user.click(screen.getByTestId("drill-next"));      // → window 2 of 3
    expect(src()).toBe("/h3_t4_w2_00004_.mp4");
    await user.click(screen.getByTestId("drill-next"));      // tail HOLDS — never wraps
    expect(src()).toBe("/h3_t4_w2_00004_.mp4");
    // FIT THE BOX, NOT THE VIEWPORT (same operator catch, same
    // sitting): the MODAL's player sizes to the seat — no 94vw
    // (scoped to the lightbox: the card's preview face renders its
    // own video hero outside the modal).
    const el = document.querySelector('div[class*="lightbox"] video') as HTMLElement;
    expect(el.style.width).toBe("100%");
    expect(el.style.objectFit).toBe("contain");
    expect(el.style.maxWidth).toBe("");
  });
});

// ── THE STICKY HERO (2026-09-20, the operator's catch: "it jumps
// around when I press run") ─────────────────────────────────────
// The run's start patch CLEARS the row's urls (result {run_id}
// only — the estate's ARCHIVE law depends on that overwrite, so
// the ROW must clear). The VIEW holds: while the stage runs, the
// drill serves the LAST LANDED artifacts for the stage — the hero
// never falls to an old archive mid-run, never blanks, never
// jumps. The new image takes the seat when it LANDS.
describe("the sticky hero — the preview never jumps mid-run", () => {
  test("landed → running (row cleared, archive riding the same write) → hero UNCHANGED; terminal lands → the NEW image takes the seat", async () => {
    doors.formSpec = "ok";
    doors.formsTable = "ok";
    stubFetch();
    const stages: BenchStageView[] = [{
      id: "s_0", card: "image-gen", engine: "comfyui",
      params: { prompt: "same" },
      runStatus: "done",
      result: { run_id: "run-1", url: "/old.png", artifacts: { img: "/old.png" } },
    } as never];
    fakes = mountEstateFakes({
      benchDoc: benchDoc(stages),
      draftStages: stages as Array<Record<string, unknown>>,
      draftBenchRev: 1,
    });
    const view = render(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/bench" },
        actions: { openResource: () => {} },
      } }),
      useResource: () => ({ status: "live" as const, value: benchValue(stages) }),
    }));
    await openFirstTile();
    const seatImg = (): string | null =>
      (previewSeat().querySelector("img") as HTMLImageElement | null)?.getAttribute("src") ?? null;
    expect(await waitFor(() => expect(seatImg()).toBe("/old.png")));
    // THE RUN STARTS: the start patch clears the row AND archives
    // the superseded landed result into history in the SAME write
    // (the estate's archive law) — the faithful running frame.
    const row = stages[0] as unknown as Record<string, unknown>;
    row["runStatus"] = "running";
    row["result"] = { run_id: "run-2" };
    row["history"] = [{ run_id: "run-1", url: "/old.png", artifacts: { img: "/old.png" } }];
    view.rerender(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/bench" },
        actions: { openResource: () => {} },
      } }),
      useResource: () => ({ status: "live" as const, value: benchValue(stages) }),
    }));
    // THE LAW: the hero HOLDS the previous generation mid-run —
    // never a blank seat, never a fall to an old archive. No
    // client memory: the head IS the last landed (ledger #44).
    expect(seatImg()).toBe("/old.png");
    // THE TERMINAL LANDS: the new image takes the seat.
    row["runStatus"] = "done";
    row["result"] = { run_id: "run-2", url: "/new.png", artifacts: { img: "/new.png" } };
    view.rerender(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/bench" },
        actions: { openResource: () => {} },
      } }),
      useResource: () => ({ status: "live" as const, value: benchValue(stages) }),
    }));
    await waitFor(() => expect(seatImg()).toBe("/new.png"));
  });

  test("a FRESH stage (never run) previews nothing even while another ran — derivation is per-row, never leftovers", async () => {
    mountBench([{
      id: "s_0", card: "image-gen", engine: "comfyui",
      params: { prompt: "x" },
      runStatus: "running",
      result: { run_id: "run-9" },
    } as never]);
    await openFirstTile();
    // no artifacts ever landed for s_0: the seat shows the render
    // hint, never another stage's leftovers
    expect(previewSeat().querySelector("img")).toBeNull();
  });
});

// ── THE PICK ROUND-TRIP AT THE DRILL SEAM (2026-09-21, the
// operator's catch: "when I click a history item, the last gen is
// LOST — no way to recover the actual latest gen until a new
// gen") ────────────────────────────────────────────────────────
// The law (the toggle law, 2026-09-16): a history pick is a VIEW,
// not a one-way door — the picked tile toggles back and the badge
// returns. This wall drives the WHOLE tab (tile → drill → strip →
// pick → toggle → badge) so the drill's owner wiring can never
// break the round-trip the presenter promises.
describe("the history pick round-trip at the drill seam", () => {
  test("pick shows the archived gen; the toggle click AND the badge both return the LATEST gen", async () => {
    resetPickCellsForTests();
    mountBench([{
      id: "s_0", card: "image-gen", engine: "comfyui",
      params: { prompt: "x" }, runStatus: "done",
      result: { run_id: "run-n", url: "/cur.png", artifacts: { img: "/cur.png" } },
      history: [{ run_id: "run-p", url: "/old.png", artifacts: { img: "/old.png" } }],
    } as never]);
    await openFirstTile();
    const hero = (): string | null =>
      (previewSeat().querySelector("img") as HTMLImageElement | null)?.getAttribute("src") ?? null;
    await waitFor(() => expect(hero()).toBe("/cur.png"));
    // THE PICK: click the archived generation's tile
    const tiles = document.querySelectorAll('[data-testid="stage-output-history"] button');
    expect(tiles.length).toBe(1);
    fireEvent.click(tiles[0] as HTMLElement);
    await waitFor(() => expect(hero()).toBe("/old.png"));
    expect(document.querySelector('[data-testid="history-stale-badge"]')).not.toBeNull();
    // THE SEAT BUBBLE (the operator's catch, 2026-09-21, proven
    // LIVE): the strip and badge ride INSIDE the walk-opening seat —
    // an unconsumed click picked AND opened the lightbox, which ate
    // every later click (the jsdom suite never saw it: no
    // hit-testing — only this assertion locks it). No inner click
    // may ever open the walk; the hero (and keyboard Enter) owns it.
    expect(drilldownOpen()).toBe(false);
    // THE RETURN, ARM 1 — the badge
    fireEvent.click(document.querySelector('[data-testid="history-stale-badge"]') as HTMLElement);
    await waitFor(() => expect(hero()).toBe("/cur.png"));
    expect(drilldownOpen()).toBe(false);
    // THE RETURN, ARM 2 — the toggle click on the picked tile
    fireEvent.click(tiles[0] as HTMLElement);
    await waitFor(() => expect(hero()).toBe("/old.png"));
    expect(drilldownOpen()).toBe(false);
    fireEvent.click(tiles[0] as HTMLElement);
    await waitFor(() => expect(hero()).toBe("/cur.png"));
    expect(document.querySelector('[data-testid="history-stale-badge"]')).toBeNull();
    expect(drilldownOpen()).toBe(false);
  });
});

// ── THE SEAT SURVIVES THE REFRESH (2026-09-21, the operator's
// catch: "when it's genning I can't click anything and it forces
// me to scroll up") ─────────────────────────────────────────────
// Every observer patch pushes a fresh bench frame. The DSH
// client-resources contract owns the survival (packages/client/
// resources/README: `failed` arrives WITH the last value beside
// the failure; `loading` means not-yielded-YET — a held record
// never re-enters it). NO client memory: these walls feed the
// TRUE-contract snapshots — a failure frame carries its value,
// and the seat survives on the snapshot alone (ledger #44: the
// heldValue ref is deleted).
describe("the zoom bar carries NO build claim (2026-11-06: the operator read the stale hand literal as evidence the estate served a month-old bundle)", () => {
  test("no hand-dated build span rides the chrome — freshness is the STAMP PLANE's to judge, never the chrome's to date", async () => {
    const stages: BenchStageView[] = [{
      id: "s1", card: "image-gen", engine: "comfyui", title: "Stage Generate Image",
      params: { prompt: "A" }, runStatus: "done",
    } as never];
    mountBench(stages);
    await openFirstTile();
    await waitFor(() => {
      if (document.querySelector("div[class*='zoomBar']") === null) throw new Error("zoom bar not mounted yet");
    });
    // the zoom bar may carry the stage title and its affordances —
    // a dated build claim is a staleness assertion the build never
    // refreshes (cruft that lied); assert NO span's text matches a
    // build-date shape.
    const spans = Array.from(document.querySelectorAll("div[class*='zoomBar'] span"));
    expect(spans.length).toBeGreaterThan(0);
    for (const sp of spans) {
      expect(sp.textContent ?? "").not.toMatch(/build \d\d-\d\d/);
    }
  });
});

describe("the seat survives the refresh (the DSH failed-keeps-value contract)", () => {
  test("a 'failed' frame carries the last value — the drill stays mounted, scrolled, and clickable", async () => {
    const stages: BenchStageView[] = [{
      id: "s_0", card: "image-gen", engine: "comfyui",
      params: { prompt: "same" }, runStatus: "running",
      result: { run_id: "run-2" },
    } as never];
    mountBench(stages);
    await openFirstTile();
    const seat = previewSeat();
    // the user has scrolled the drill's detail
    const detail = document.querySelector("div[class*='zoomDetail']") as HTMLElement | null;
    expect(detail).not.toBeNull();
    detail!.scrollTop = 120;
    const seatNode = previewSeat();
    expect(seatNode).toBe(seat);
    // THE FAILURE FRAME: the stream reports failure BESIDE the
    // last value (the DSH shape) — the drill must NOT unmount,
    // and the failure is LOUD beside the body
    rerenderTab(stages, "failed", "stream broke mid-run");
    expect(document.querySelector('[data-testid="stage-preview-seat"]')).not.toBeNull();
    expect(document.querySelector("div[class*='zoomDetail']")).toBe(detail);
    expect((document.querySelector("div[class*='zoomDetail']") as HTMLElement).scrollTop).toBe(120);
    expect(document.querySelector('[data-testid="cards-refresh-failed"]')?.textContent)
      .toContain("stream broke mid-run");
    // and a click still lands (the Run affordance answers)
    const runBtn = document.querySelector('button[class*="zoomBar"] button, [data-testid="drill-run"]');
    if (runBtn !== null) expect((runBtn as HTMLElement).hasAttribute("disabled")).toBe(false);
    // back live: still mounted, same node
    rerenderTab(stages, "live");
    expect(document.querySelector("div[class*='zoomDetail']")).toBe(detail);
    // the no-message arm voices its own fallback beside the body
    rerenderTab(stages, "failed");
    expect(document.querySelector('[data-testid="cards-refresh-failed"]')?.textContent)
      .toContain("last good state");
    expect(document.querySelector('[data-testid="stage-preview-seat"]')).not.toBeNull();
  });

  test("a fresh subscribe push (new object identities, same stage) never remounts the scroll container", async () => {
    const stages: BenchStageView[] = [{
      id: "s_0", card: "image-gen", engine: "comfyui",
      params: { prompt: "same" }, runStatus: "running",
      result: { run_id: "run-2" },
    } as never];
    mountBench(stages);
    await openFirstTile();
    const detail = document.querySelector("div[class*='zoomDetail']") as HTMLElement;
    detail.scrollTop = 90;
    // the push: a whole new value tree, same stage id
    rerenderTab([{ ...stages[0], params: { prompt: "same" } } as never], "live");
    const after = document.querySelector("div[class*='zoomDetail']") as HTMLElement;
    expect(after).toBe(detail);
    expect(after.scrollTop).toBe(90);
  });
});

  test("a first-mount failure (nothing ever shown) voices the failure — never a seat", async () => {
    // No value beside the failure: the stream died before its
    // first yield. The face is the failure's own words (or the
    // fallback), never a body, never silence.
    const stages: BenchStageView[] = [{
      id: "s_0", card: "image-gen", engine: "comfyui",
      params: { prompt: "same" }, runStatus: "done",
      result: { run_id: "run-2", url: "/cur.png", artifacts: { img: "/cur.png" } },
    } as never];
    mountBench(stages);
    const view = (globalThis as { __cardsTabView?: { rerender: (el: unknown) => void } }).__cardsTabView;
    expect(view).not.toBeUndefined();
    view!.rerender(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/bench" },
        actions: { openResource: () => {} },
      } }),
      useResource: () => ({ status: "failed" as const, value: undefined, failure: { message: "stream broke before first yield" } }),
    }));
    expect(document.querySelector('[data-testid="stage-preview-seat"]')).toBeNull();
    expect(document.body.textContent).toContain("stream broke before first yield");
    // the no-message arm voices its own fallback text
    view!.rerender(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/bench" },
        actions: { openResource: () => {} },
      } }),
      useResource: () => ({ status: "failed" as const, value: undefined }),
    }));
    expect(document.body.textContent).toContain("cards resource failed");
    expect(document.querySelector('[data-testid="stage-preview-seat"]')).toBeNull();
  });

function rerenderTab(stages: BenchStageView[], status: "live" | "loading" | "failed", failure?: string): void {
  const view = (globalThis as { __cardsTabView?: { rerender: (el: unknown) => void } }).__cardsTabView;
  if (view === undefined) throw new Error("no held view — mountBench must expose it");
  view.rerender(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({
      status,
      value: benchValue(stages),
      ...(failure === undefined ? {} : { failure: { message: failure } }),
    }),
  }));
}

// ── THE RE-POINT RESCOPE AT THE DRILL'S WRITE SEAM (2026-11-06, the
// anima burn: dev_docs/audits/journey/anima-turbo-quant-burn-
// 2026-11-06 cure 3 + dev_docs/audits/journey/axis-unification-
// 2026-11-06 cure 4) — ONE SWITCH SEMANTICS: a params write that
// CHANGES the model key re-scopes axes + bags through the switch law
// at the seam where it lands, no matter which face authored it. The
// arms serve the REAL DECL rows (krea-2 turbo: the int8 cell, the
// [4,8]/[1,2] envelope; anima base/turbo: int8_convrot + bf16,
// resolver steps 8 / cfg 1) through the real /v1/form-spec door and
// judge the LANDED DOOR WRITE (the estate fakes' drafts/patch frame)
// — the doc the run composes, never a client-side copy. THE BURN
// RECEIPT: krea-2's lora bag + its int8 quant riding onto anima.
// (The served-shape fixtures ride the DECLs' own rows; serializer
// parity itself is the sync lane's wall.) ──────────────────────────

interface WallCell { quant?: string; label?: string; route?: string }
interface WallRow {
  id: string; label: string; group: string; route?: string; hint?: string;
  sampler_envelope?: Record<string, [number, number]> | null;
  resolver_defaults?: Record<string, unknown> | null;
  wire_defaults?: Record<string, unknown> | null;
  cells?: WallCell[];
}
interface WallDecl { id: string; label?: string; variants?: WallRow[] }

const WALL_KREA2 = krea2WallDecl as WallDecl;
const WALL_ANIMA = animaWallDecl as WallDecl;

// the served loras kind (the mod currency the real lane serves — the
// card schema never declares the bag; features.modifiers names it)
const WALL_LORA_KIND = {
  kind: "lora", label: "LoRA", param_key: "loras", cardinality: "multi",
  options: [{ value: "krea2_realism_lora", label: "Krea2 Realism Lora" }],
};

function wallSpec(decl: WallDecl, opts?: { modelField?: boolean }): Record<string, unknown> {
  const variants: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  for (const v of decl.variants ?? []) {
    if (v.group !== "Variant" && v.group !== "Recipe") continue;
    variants.push({
      id: v.id, label: v.label, group: v.group,
      defaults: { ...(v.resolver_defaults ?? {}), ...(v.wire_defaults ?? {}) },
      route: v.route ?? "", hint: v.hint ?? null, engine: "comfyui",
      sampler_envelope: v.sampler_envelope ?? null,
      quant: null, vram_peak_gb: null, owner: "",
    });
    if (v.group !== "Variant") continue;
    for (const c of v.cells ?? []) {
      if (typeof c.quant !== "string" || c.quant === "") continue;
      // THE SERVED ID (discovery.specVariants' own rule): a cell quant
      // that already served rides namespaced (`${variant}__${quant}`)
      // — the fixture spells the serializer's ids, never its own
      const id = seen.has(c.quant) ? `${v.id}__${c.quant}` : c.quant;
      seen.add(id);
      variants.push({
        id, label: c.label ?? c.quant, group: "Quant",
        defaults: {}, route: c.route ?? "", hint: null, engine: "comfyui",
        sampler_envelope: null, quant: c.quant, vram_peak_gb: null, owner: v.id,
      });
    }
  }
  return {
    form: "image-gen", genre: "image", engine: "comfyui",
    model: decl.id, label: decl.label ?? decl.id, size: "small",
    variants,
    families: [
      { id: "krea-2", label: "Krea 2", present: true },
      { id: "anima", label: "Anima", present: true },
    ],
    schema: schemaEnvelope({
      prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
      // THE KNOB FACE (arm 1): the schema-level model field the
      // semantic-model lane writes — a bare model key through a form
      // field, no axes, no bag
      ...(opts?.modelField === true
        ? { model: { type: "string", meta: { description: "Style" } } }
        : {}),
    }),
    features: { modifiers: [WALL_LORA_KIND] },
    mod_schemas: {},
    inputs: [], outputs: [],
  };
}

const WALL_DOCS = {
  "krea-2": wallSpec(WALL_KREA2),
  "anima": wallSpec(WALL_ANIMA),
};
const WALL_DOCS_KNOB = {
  "krea-2": wallSpec(WALL_KREA2, { modelField: true }),
  "anima": wallSpec(WALL_ANIMA, { modelField: true }),
};

const wallDoors: { specUrls: string[] } = { specUrls: [] };

function stubFetchWall(docs: Record<string, Record<string, unknown>>): void {
  doors.resolveFormSpec = null;
  doors.resolveFormsTable = null;
  wallDoors.specUrls = [];
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      const model = decodeURIComponent(path.split("model=")[1] ?? "");
      wallDoors.specUrls.push(model);
      const doc = docs[model];
      if (doc === undefined) throw new Error("wall door: no served doc for " + model);
      return new Response(JSON.stringify(doc), {
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

/** THE BURN HOLDING: krea-2's own rows — its turbo variant, its int8
 *  cell, its realism lora (the operator's DOM, hop 3 → the saved
 *  doc). */
function burnParams(withBag: boolean): Record<string, unknown> {
  return {
    model: "krea-2", variant: "turbo", quant: "int8", prompt: "the burn",
    ...(withBag ? { loras: [{ id: "krea2_realism_lora" }] } : {}),
  };
}

/** The landed params frames (the door's STAGE_PATCH_KEYS envelope —
 *  the law rides under `params`). */
function wallWrites(): Array<Record<string, unknown>> {
  return calls()
    .filter((c) => c.method === "drafts/patch")
    .map((c) => ((c.args.patch as Record<string, unknown>)["params"] ?? {}) as Record<string, unknown>);
}

async function openWallDrill(): Promise<void> {
  await openFirstTile();
  await screen.findByText("Prompt", {}, { timeout: 4000 });
}

async function wallAxes(): Promise<HTMLElement> {
  return await waitFor(() => {
    const el = document.querySelector('[data-model-axes="1"]');
    if (el === null) throw new Error("model axes not found");
    return el as HTMLElement;
  });
}

async function axisFace(label: string): Promise<string> {
  const axes = await wallAxes();
  const btn = axes.querySelector(`[aria-label="${label}"]`);
  if (btn === null) throw new Error(`axis button not found: ${label}`);
  return (btn as HTMLElement).textContent ?? "";
}

describe("THE RE-POINT RESCOPE AT THE WRITE SEAM — the anima burn cures", () => {
  test("THE KNOB RE-POINT: a schema-level model re-point lands the WHOLE switch law — neither the krea-2 lora bag nor the foreign quant persists in the landed doc", async () => {
    mountBench([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: burnParams(true) } as never,
    ], undefined, undefined, WALL_DOCS_KNOB);
    await openWallDrill();
    // the burn's face: the krea-2 lora tile rides the krea-2 stage
    expect(document.querySelector('[data-mod-tile="loras-0"]')).not.toBeNull();
    // THE OPERATOR'S RE-POINT (the semantic-model face): ONE bare
    // model key — exactly the write the tool face / an agent patch /
    // a stage copy lands
    fireEvent.change(screen.getByLabelText("Style"), { target: { value: "anima" } });
    // THE LANDED DOC: the door write carries the model AND the law's
    // nulls — the bag, the foreign quant, the axes, and the departing
    // envelope numerics die in the SAME CAS frame
    await waitFor(() => { expect(wallWrites().length).toBe(1); });
    const frame = wallWrites()[0]!;
    expect(frame["model"]).toBe("anima");
    expect(frame["loras"]).toBeNull();
    expect(frame["quant"]).toBeNull();
    expect(frame["variant"]).toBeNull();
    expect(frame["steps"]).toBeNull();
    expect(frame["cfg"]).toBeNull();
    // THE ARRIVAL (real fetch → the anima spec lands): the tile is
    // GONE, the model face re-pointed, the axes re-seeded to anima's
    // own first rows
    expect(await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 })).toBeTruthy();
    await waitFor(() => {
      expect(document.querySelector('[data-mod-tile="loras-0"]')).toBeNull();
    });
    await waitFor(async () => { expect(await axisFace("Model")).toBe("Anima"); });
    await waitFor(async () => { expect(await axisFace("Variant")).toContain("Base V1.0"); });
    await waitFor(async () => { expect(await axisFace("Quant")).toContain("INT8 ConvRot"); });
    expect(wallDoors.specUrls).toContain("anima");
  });

  test("THE RAIL RE-KEY, REAL FETCH: mount krea-2 with a held lora, switch to anima — tile GONE, axes cleared, arrival defaults stamped, and the door write carries the bag null", async () => {
    mountBench([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: burnParams(true) } as never,
    ], undefined, undefined, WALL_DOCS);
    await openWallDrill();
    expect(document.querySelector('[data-mod-tile="loras-0"]')).not.toBeNull();
    // THE MODEL RAIL (the one model gesture the axes serve): the
    // pick's frame re-derives through the switch law against the FULL
    // holding — the served schema never names the loras bag (the one
    // array node image-gen serves is reference_images), so the MOD-
    // CURRENCY clause is what kills it
    const user = userEvent.setup();
    await user.click(await within(await wallAxes()).getByLabelText("Model"));
    await user.click(screen.getByRole("menuitem", { name: "Anima" }));
    await waitFor(() => { expect(wallWrites().length).toBe(1); });
    const frame = wallWrites()[0]!;
    expect(frame["model"]).toBe("anima");
    expect(frame["loras"]).toBeNull();
    expect(frame["quant"]).toBeNull();
    // the anima spec lands over the real door: tile GONE, the axes
    // cleared and re-stamped with the arrival's own rows
    await waitFor(() => {
      expect(document.querySelector('[data-mod-tile="loras-0"]')).toBeNull();
    });
    await waitFor(async () => { expect(await axisFace("Model")).toBe("Anima"); });
    await waitFor(async () => { expect(await axisFace("Variant")).toContain("Base V1.0"); });
    await waitFor(async () => { expect(await axisFace("Quant")).toContain("INT8 ConvRot"); });
    expect(wallDoors.specUrls).toContain("anima");
  });

  test("THE BENCH-ROW BAG THE PICK CANNOT SEE: an external writer's bag on the bench row dies with the switch — the pick's own holding never saw it", async () => {
    // the bag is NOT in the mount: the user map seeds clean, so the
    // axes' own pickHeld (resolved + user) can never see the bag that
    // arrives on the bench row below
    const stages: BenchStageView[] = [
      { id: "s_0", card: "image-gen", engine: "comfyui", params: burnParams(false) } as never,
    ];
    mountBench(stages, undefined, undefined, WALL_DOCS);
    await openWallDrill();
    expect(document.querySelector('[data-mod-tile="loras-0"]')).toBeNull();
    // THE EXTERNAL WRITER (the studio / the agent's bag write): the
    // bag lands on the BENCH row after open — the drill's user map
    // never reseeds (stage.id + modelKey are unmoved)
    stages[0]!.params = { ...burnParams(false), loras: [{ id: "krea2_realism_lora" }] };
    rerenderTab(stages, "live");
    // THE SWITCH: the seam's holding is the FULL doc (bench row under
    // the user map — what the run composes), so the bag dies in the
    // landed write even though the rail's own pick patch missed it
    const user = userEvent.setup();
    await user.click(await within(await wallAxes()).getByLabelText("Model"));
    await user.click(screen.getByRole("menuitem", { name: "Anima" }));
    await waitFor(() => { expect(wallWrites().length).toBe(1); });
    const frame = wallWrites()[0]!;
    expect(frame["model"]).toBe("anima");
    expect(frame["loras"]).toBeNull();
    expect(frame["quant"]).toBeNull();
    await waitFor(async () => { expect(await axisFace("Model")).toBe("Anima"); });
  });
});
