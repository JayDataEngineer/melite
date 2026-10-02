// @vitest-environment happy-dom
// gate-r7b-door.spec.tsx — the add-card door's three dark arms (round
// 7b): the busy guard (a pick while busy is dropped — the second
// click never specs, never adds), the no-fresh fallback (the bench
// diff finds no fresh row → plain onAdded, never onAddedRow), and the
// dead re-read (fetchBench throws → onAdded, never a stuck door).
// The door mounts DIRECTLY (AddCardDoor, not the tab): the busy and
// no-fresh arms need prop-level control no picker gesture can stage.
// Estate verbs ride mountEstateFakes (the one-lane seam); fetch
// answers ONLY the /v1 discovery doors (catalog, form-spec).
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { AddCardDoor } from "../src/client/add-card-door.tsx";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";
import { schemaEnvelope } from '@melite/card-base/client';
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';

interface Call { method: string; args: Record<string, unknown> }

let fakes: { calls: Call[]; unmount: () => void } | null = null;
let posted: Call[] = [];

// fetch-door controls (the /v1 discovery doors only)
const doors: {
  catalog: Record<string, Record<string, unknown>> | null;
  specHang: boolean;
  specModels: string[];
} = { catalog: null, specHang: false, specModels: [] };

function stubDoors(estateOpts: Parameters<typeof mountEstateFakes>[0] = {}): void {
  fakes?.unmount();
  const estate = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [] },
    draftStages: [],
    draftBenchRev: 1,
    ...estateOpts,
  });
  fakes = estate;
  posted = estate.calls;
  doors.catalog = null;
  doors.specHang = false;
  doors.specModels = [];
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: doors.catalog ?? {} }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/form-spec")) {
      const model = new URL(path, "http://x").searchParams.get("model") ?? "";
      doors.specModels.push(model);
      // THE HANGING SPEC (the busy-guard arm): the first pick's spec
      // never lands, so the door stays busy while the second pick
      // arrives — a resolved spec would close the race before the
      // second click.
      if (doors.specHang) return new Promise<Response>(() => {});
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        schema: schemaEnvelope({
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        }),
      }), { status: 200, headers: { "content-type": "application/json" } });
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

function benchProp(stages: BenchStageView[]): CardsBenchValue {
  return { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages, sessionKey: "s1" };
}

function mountDoor(opts: {
  bench: CardsBenchValue;
  onAdded?: () => void;
  onAddedRow?: (row: BenchStageView) => void;
  onClose?: () => void;
}): { onAdded: ReturnType<typeof vi.fn>; onAddedRow: ReturnType<typeof vi.fn> } {
  const onAdded = vi.fn(opts.onAdded ?? (() => {}));
  const onAddedRow = vi.fn(opts.onAddedRow ?? ((_row: BenchStageView) => {}));
  render(h(AddCardDoor, {
    bench: opts.bench,
    sessionKey: "s1",
    onAdded: () => {
      onAdded();
      opts.onAdded?.();
    },
    // the parent only passes onAddedRow when it wants the auto-open;
    // the no-fresh and dead re-read tests pass one and assert it
    // stays silent while plain onAdded fires.
    ...(opts.onAddedRow !== undefined ? { onAddedRow } : {}),
    onClose: opts.onClose ?? (() => {}),
  }));
  return { onAdded, onAddedRow };
}

describe("the busy guard — a pick while busy is dropped", () => {
  test("the second pick never specs and never adds (the first stays adding…)", async () => {
    stubDoors();
    doors.catalog = {
      alpha: { label: "Alpha", genre: "image" },
      beta: { label: "Beta", genre: "image" },
    };
    doors.specHang = true;
    mountDoor({ bench: benchProp([]) });
    fireEvent.click(await screen.findByRole("button", { name: "Alpha" }, { timeout: 5000 }));
    // the first pick is in flight (the spec hangs) — the door is busy
    expect(await screen.findByText("adding…", {}, { timeout: 5000 })).toBeTruthy();
    // the second pick arrives while busy: the door disables the seats,
    // and a seat rendered disabled never reaches React's dispatcher in
    // this stack (happy-dom swallows the dispatch; React consults the
    // vDOM disabled prop) — so the race the guard exists for is staged
    // by invoking the seat's own COMMITTED onClick off __reactProps$
    // (the props object React's dispatcher itself reads — the node's
    // double-buffered __reactFiber$ still points at the pre-busy
    // render): the component's real pick path with busyId set. The
    // guard must drop it before any spec fetch.
    const beta = screen.getByRole("button", { name: "Beta" });
    expect((beta as HTMLButtonElement).disabled).toBe(true);
    const propsKey = Object.keys(beta).find((k) => k.startsWith("__reactProps$"));
    if (propsKey === undefined) throw new Error("react props missing on the beta seat");
    const committedClick = (beta as unknown as Record<string, { onClick?: () => void }>)[propsKey]?.onClick;
    if (committedClick === undefined) throw new Error("committed onClick missing on the beta seat");
    committedClick();
    await new Promise((r) => setTimeout(r, 200));
    // only the first pick ever reached the spec door; nothing added
    expect(doors.specModels).toEqual(["alpha"]);
    expect(posted.some((p) => p.method === "bench/add-stage")).toBe(false);
  });
});

describe("the no-fresh fallback — the diff finds nothing, plain onAdded", () => {
  test("a bench that already holds the fresh id falls back (never onAddedRow)", async () => {
    // HARNESS LAW: the first bench/add-stage mints fresh_1 — the prop
    // bench already carries that id (a stale snapshot that saw the
    // row), so the post-add diff finds no fresh row and the door
    // falls back to plain onAdded.
    stubDoors();
    doors.catalog = { lone: { label: "Lone", genre: "image", families: ["lone"] } };
    const { onAdded, onAddedRow } = mountDoor({
      bench: benchProp([{ id: "fresh_1", card: "lone", engine: "comfyui", params: {} }]),
      onAddedRow: () => {},
    });
    fireEvent.click(await screen.findByRole("button", { name: "Lone" }, { timeout: 5000 }));
    await waitFor(() => {
      expect(posted.some((p) => p.method === "bench/add-stage")).toBe(true);
    }, { timeout: 5000 });
    await waitFor(() => {
      expect(onAdded).toHaveBeenCalledTimes(1);
    }, { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 200));
    expect(onAddedRow).not.toHaveBeenCalled();
  });
});

describe("the dead re-read — fetchBench throws, onAdded anyway", () => {
  test("a throwing bench/get still lands the add (never a stuck door)", async () => {
    // the throw fires on the FIRST bench/get — addStageWire spends no
    // bench/get (no CAS conflict, no rebase), so the post-add
    // fetchBench is what throws and the catch falls back to onAdded.
    stubDoors({ throws: [{ method: "bench/get", message: "bench gone" }] });
    doors.catalog = { lone: { label: "Lone", genre: "image", families: ["lone"] } };
    const { onAdded, onAddedRow } = mountDoor({
      bench: benchProp([]),
      onAddedRow: () => {},
    });
    fireEvent.click(await screen.findByRole("button", { name: "Lone" }, { timeout: 5000 }));
    await waitFor(() => {
      expect(posted.some((p) => p.method === "bench/add-stage")).toBe(true);
    }, { timeout: 5000 });
    await waitFor(() => {
      expect(onAdded).toHaveBeenCalledTimes(1);
    }, { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 200));
    expect(onAddedRow).not.toHaveBeenCalled();
  });
});
