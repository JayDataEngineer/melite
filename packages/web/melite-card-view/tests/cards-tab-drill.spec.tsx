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
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes, type EstateRefusal } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/estate-remote";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from "../src/client/spec-form.tsx";
import type { BenchStageRow, CardsBenchValue, CardsDraftValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

type FormSpecMode = "ok" | "huge" | "reject-string" | "deferred";
type FormsMode = "ok" | "deferred";

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

function benchValue(stages: BenchStageRow[]): CardsBenchValue {
  return { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages };
}

function benchDoc(stages: BenchStageRow[]): Record<string, unknown> {
  // rows ride verbatim (readBench passes them through) — the rail
  // reads the same seats the snapshot carries.
  return { draft_id: "bench-p", rev: 1, log: [], stages };
}

interface EstateOpts {
  refusals?: EstateRefusal[];
  throws?: EstateRefusal[];
}

function mountBench(stages: BenchStageRow[], renderSlot?: (...args: never[]) => unknown, estate?: EstateOpts): void {
  doors.formSpec = "ok";
  doors.formsTable = "ok";
  stubFetch();
  fakes = mountEstateFakes({
    benchDoc: benchDoc(stages),
    draftStages: stages as Array<Record<string, unknown>>,
    draftBenchRev: 1,
    refusals: estate?.refusals,
    throws: estate?.throws,
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live", value: benchValue(stages) }),
    ...(renderSlot !== undefined ? { renderSlot } : {}),
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
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector('[data-testid="stage-preview-seat"]')).toBeNull();
    expect(firstTile()).toBeTruthy();
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
    return (impl as typeof fetch)(url, init);
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

  test("a spec failure renders its own words (never a JSON stack)", async () => {
    doors.formSpec = "reject-string";
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    doors.formSpec = "reject-string";
    const user = userEvent.setup();
    await user.click(firstTile());
    expect(await screen.findByText("form-spec unavailable", {}, { timeout: 4000 })).toBeTruthy();
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
    expect(strip?.textContent ?? "").not.toContain("%");
  });
});

describe("the group compound — members, ungroup, and its honesty", () => {
  const group = (children: unknown[]): BenchStageRow => ({ id: "g_0", card: "group", engine: "comfyui", params: {}, children } as never);

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
    expect(await screen.findByText("stale rev", {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByText("Ungroup")).toBeTruthy();
  });
});

describe("the slot-claimed drill — remove and bindRun ride the owner", () => {
  function mountClaimed(stages: BenchStageRow[], claim: (owner: Record<string, unknown>) => unknown, estate?: EstateOpts): void {
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
        actions: {},
      } }),
      useResource: () => ({ status: "live", value }),
    }));
    expect(await screen.findByText("Prompt", {}, { timeout: 4000 })).toBeTruthy();
  });
});
