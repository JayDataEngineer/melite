// @vitest-environment happy-dom
// cards-tab-sweep2.spec.tsx — the remainder sweep, part 2 (2026-09-16
// burn-down, installment 3l): the last reachable arms — the picker's
// busy guard, the add re-read catch, the seat's Enter key, and the
// card-less drilldown head. Grouping's whole block is documented
// absent (exempt with proof — setGrouping's only sites pass false).
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes, type EstateRefusal } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { resetCardFamiliesCache } from '@melite-plugin/melite-run-wire';
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from '@melite/card-base/client';
import type { BenchStageView } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  // the tab reads the catalog at mount now (tile names) — the wire
  // caches per boot, so each test starts cold like a fresh boot.
  resetCardFamiliesCache();
  vi.unstubAllGlobals();
});

const doors: {
  specFields: Record<string, unknown> | null;
  catalog: Record<string, Record<string, unknown>>;
} = {
  specFields: null, catalog: {},
};

// THE ONE-FAKE LAW (stroke 81): estate verbs ride the bound
// namespaces (mountEstateFakes); fetch answers ONLY the /v1
// discovery doors.
let fakes: EstateFakes | null = null;

function calls(): Array<{ method: string; args: Record<string, unknown> }> {
  if (fakes === null) throw new Error("estate fakes not mounted");
  return fakes.calls;
}

function stubFetch(): void {
  doors.specFields = null;
  doors.catalog = {};
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        schema: schemaEnvelope((doors.specFields ?? {
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        }) as Parameters<typeof schemaEnvelope>[0]),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({}), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: doors.catalog }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

const STAGES: BenchStageView[] = [
  { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a barn" } },
];

interface EstateOpts {
  refusals?: EstateRefusal[];
  throws?: EstateRefusal[];
}

function estateOpts(stages: BenchStageView[], estate?: EstateOpts): Parameters<typeof mountEstateFakes>[0] {
  // ROW COPIES: the seam mutates its rows in place (add pushes,
  // remove splices, patch merges) — handing it the snapshot's own
  // array aliases the render snapshot, and the add's before/after
  // diff then sees no fresh row (no auto-open). Copies keep the
  // snapshot pristine; the served truth still matches row-for-row.
  const benchRows = stages.map((s) => ({ ...s }));
  const draftRows = stages.map((s) => ({ ...s }));
  return {
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: benchRows },
    draftStages: draftRows as Array<Record<string, unknown>>,
    draftBenchRev: 1,
    refusals: estate?.refusals,
    throws: estate?.throws,
  };
}

function mount(stages: BenchStageView[] = STAGES, estate?: EstateOpts): void {
  stubFetch();
  fakes = mountEstateFakes(estateOpts(stages, estate));
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({
      status: "live" as const,
      value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages },
    }),
  } as never));
}

async function openZoom(): Promise<void> {
  await waitFor(() => {
    if (document.querySelector('[role="button"][class*="tileInner"]') === null) throw new Error("no tile");
  });
  fireEvent.click(document.querySelector('[role="button"][class*="tileInner"]') as HTMLElement);
  await waitFor(() => {
    if (document.querySelector('div[class*="zoomCard"]') === null) throw new Error("no zoom");
  }, { timeout: 5000 });
}

async function openPicker(): Promise<void> {
  await waitFor(() => {
    if (screen.queryByRole("button", { name: "Add a card" }) === null) throw new Error("no add");
  });
  fireEvent.click(screen.getByRole("button", { name: "Add a card" }));
  await screen.findByRole("button", { name: "Close picker" }, { timeout: 5000 });
}

describe("the picker busy guard — one pick in flight, never two adds", () => {
  test("a second pick mid-flight returns before any second door fires", async () => {
    // RECEIPT NOTE: the card buttons disable while busyId holds, so
    // the drill's `busyId !== null` guard is defense-in-depth for an
    // unreachable UI state (exempt with proof). What rides here is
    // the reachable law: one flight, one add, whatever the presses.
    //
    // The old stub hand-served s_9 on re-read so the add auto-opened
    // its zoom; the live seam appends its own fresh row on add (rev
    // bump included), so the same zoom opens with no hand staging.
    mount();
    doors.catalog = {
      lone: { label: "Lone", genre: "image", families: ["lone"] },
      duo: { label: "Duo", genre: "image", families: ["duo"] },
    };
    // the mount-time read cached the pre-arm catalog — re-arm the
    // doors cold so the picker reads the armed rows, not the stale.
    resetCardFamiliesCache();
    await openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Lone" }, { timeout: 5000 }));
    // the first pick owns the flight — the second returns at the guard
    fireEvent.click(await screen.findByRole("button", { name: "Duo" }, { timeout: 5000 }));
    await waitFor(() => {
      if (document.querySelector('div[class*="zoomCard"]') === null) throw new Error("no fresh zoom");
    }, { timeout: 5000 });
    const adds = calls().filter((p) => p.method === "bench/add-stage");
    expect(adds).toHaveLength(1);
    expect(JSON.stringify(adds[0]?.args)).toContain("lone");
  });
});

describe("the add re-read catch — a dead bench after a live add still lands", () => {
  test("a throwing re-read falls to the plain add (never a stuck picker)", async () => {
    // the old stub threw the bare string "gone" on EVERY bench/get
    // (a non-Error, so the client voiced its 'bench reload failed'
    // fallback); the live seam throws Errors and its throw queue is
    // one-shot per call — so the dead read is armed AFTER the live
    // mount-time reads by rebinding mid-test (no re-render; the
    // remote binding is read at call time, the fetch stub untouched).
    // TWO throws: the harness queue is one-shot per call while the
    // old flag threw on every read — the add's re-read eats the
    // first, the plain onAdded's reload eats the second and voices
    // the fallback.
    mount();
    doors.catalog = { lone: { label: "Lone", genre: "image", families: ["lone"] } };
    // same cold re-arm as the busy-guard arm (mount-time read).
    resetCardFamiliesCache();
    await openPicker();
    fakes?.unmount();
    fakes = mountEstateFakes(estateOpts(STAGES, {
      throws: [
        { method: "bench/get", message: "bench reload failed" },
        { method: "bench/get", message: "bench reload failed" },
      ],
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Lone" }, { timeout: 5000 }));
    // the picker closes (the add landed) and the fallback voices —
    // no auto-open (the re-read never named a fresh row)
    expect(await screen.findByText("bench reload failed", {}, { timeout: 5000 })).toBeTruthy();
    expect(document.querySelector('div[class*="zoomCard"]')).toBeNull();
    expect(screen.queryByRole("button", { name: "Close picker" })).toBeNull();
  });
});

describe("the preview seat keys — Enter opens like Space", () => {
  test("Enter on the seat opens the drilldown (never Space-only)", async () => {
    mount([{
      id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a barn" },
      result: { artifacts: { "my render": "/renders/a.png" } },
    } as BenchStageView]);
    await openZoom();
    const seat = await screen.findByTestId("stage-preview-seat", {}, { timeout: 5000 });
    seat.focus();
    fireEvent.keyDown(seat, { key: "Enter" });
    expect(await screen.findByText("my render", {}, { timeout: 5000 })).toBeTruthy();
  });

  test("other keys on the seat stay quiet (never a stray drilldown)", async () => {
    mount([{
      id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a barn" },
      result: { artifacts: { "my render": "/renders/a.png" } },
    } as BenchStageView]);
    await openZoom();
    const seat = await screen.findByTestId("stage-preview-seat", {}, { timeout: 5000 });
    seat.focus();
    fireEvent.keyDown(seat, { key: "a" });
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.queryByText("my render")).toBeNull();
  });
});

describe("the card-less drilldown — the head falls to the stage id", () => {
  test("a stageless card caption still names the row (never blank)", async () => {
    mount([{
      id: "s_0", engine: "comfyui", params: { prompt: "a barn" },
      result: { artifacts: { output: "/renders/a.png" } },
    } as BenchStageView]);
    await openZoom();
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 5000 });
    fireEvent.click(screen.getByTestId("stage-preview-seat"));
    // the drilldown opens on the basename (the head took the id arm)
    expect(await screen.findByText("a.png", {}, { timeout: 5000 })).toBeTruthy();
  });
});

describe("the grouping absence — selection mode has no entry", () => {
  test("no Group action rides the bench (the dead state's receipt)", async () => {
    mount([
      ...STAGES,
      { id: "s_1", card: "image-gen", engine: "comfyui", params: {} },
    ]);
    await screen.findByText("rev 1");
    // setGrouping's only sites pass false (init + exit): no affordance
    // ever flips it — tiles carry no grouping mark, no bar renders.
    // If an entry lands one day, this trips and the exemption is revisited.
    expect(document.querySelector('li[data-grouping="on"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /Group \d+ cards/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });
});
