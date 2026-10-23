// comfyui-vram.spec.ts — THE VRAM HEADROOM GATE WALL (the
// "Comfyui should prevent oom" law, operator 2026-10-23). The burn:
// the anny estimator subprocess needed ~12.9 GiB on a 4090 whose
// engine cache held 10.26 GiB — the run died 20 minutes in on a
// 388 MiB alloc, torch's OOM the only diagnosis. The law: the
// estate refuses BEFORE submit when headroom cannot be proven,
// freeing engine cache first — never a mid-run OOM. Every arm here
// fires on its own path (canon axis 3): the knob's admission, the
// probe's refusal voices, the reclaim loop, and the loud refusal
// that names headroom vs budget.
import { describe, it, expect, vi, beforeEach } from "vitest";

// The transport is the ONLY seam mocked: the SDK client's doors
// (getSystemStats / free) are the rig. The unload core
// (comfyui-control) rides REAL — its own wall holds its refusal
// voice; here it exercises through the mocked transport's free().
vi.mock("../src/comfyui-transport.ts", () => ({
  withBound: (work: () => Promise<unknown>): Promise<unknown> => work(),
  sdkClient: (server: string): unknown => ({
    server,
    getSystemStats: async (): Promise<unknown> => statsQueue.shift() ?? statsFallback,
    free: async (body: unknown): Promise<void> => {
      freeCalls.push(body);
    },
  }),
}));

import { normalizeVramBudgetMb, probeVramFreeMb, ensureVramHeadroom, gateVramForStage } from "../src/comfyui-vram.ts";

const MB = 1024 * 1024;

// THE RIG: stats answers shift off a queue (a short probe, then the
// post-/free re-probes); the fallback covers the pass arm's single read.
let statsQueue: unknown[] = [];
let statsFallback: unknown = { devices: [{ name: "cuda:0", vram_total: 25_600 * MB, vram_free: 20_000 * MB }] };
const freeCalls: unknown[] = [];

const probeClient = { getSystemStats: async (): Promise<unknown> => statsQueue.shift() ?? statsFallback };

beforeEach((): void => {
  statsQueue = [];
  statsFallback = { devices: [{ name: "cuda:0", vram_total: 25_600 * MB, vram_free: 20_000 * MB }] };
  freeCalls.length = 0;
  vi.restoreAllMocks();
});

const stats = (freeMb: number): unknown => ({
  devices: [{ name: "cuda:0", vram_total: 25_600 * MB, vram_free: freeMb * MB }],
});

describe("normalizeVramBudgetMb (the knob's admission)", () => {
  it("absent means NO gate — undefined rides back (back-compat law: stages without a budget never probe)", () => {
    expect(normalizeVramBudgetMb(undefined)).toBeUndefined();
  });
  it("a positive finite number is the budget in MiB", () => {
    expect(normalizeVramBudgetMb(13500)).toBe(13500);
  });
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, "big", null])(
    "a present-but-garbage value (%s) REFUSES LOUD — a typo'd budget that silently gated nothing is the failure class this law retires",
    (raw: unknown) => {
      expect(() => normalizeVramBudgetMb(raw)).toThrowError(/vram_budget_mb must be a positive finite number/);
    },
  );
});

describe("probeVramFreeMb (the engine's own numbers, bytes → MiB)", () => {
  it("devices[0].vram_free rides back as MiB", async () => {
    await expect(probeVramFreeMb("http://s:8188", probeClient)).resolves.toBe(20_000);
  });
  it("an empty devices array REFUSES — headroom cannot be proven, never assumed", async () => {
    statsFallback = { devices: [] };
    await expect(probeVramFreeMb("http://s:8188", probeClient)).rejects.toThrowError(
      /reports no devices.*headroom cannot be proven/s,
    );
  });
  it("a devices[0] without a finite vram_free REFUSES with the same voice", async () => {
    statsFallback = { devices: [{ name: "cuda:0" }] };
    await expect(probeVramFreeMb("http://s:8188", probeClient)).rejects.toThrowError(/no finite vram_free/);
  });
});

describe("ensureVramHeadroom (prove, reclaim, or refuse — never a mid-run OOM)", () => {
  it("headroom already proved: NO /free, NO loop, clean return", async () => {
    await expect(ensureVramHeadroom("http://s:8188", 13500, probeClient)).resolves.toBeUndefined();
    expect(freeCalls).toHaveLength(0);
  });
  it("short headroom fires the engine's own /free and the re-probe that meets budget proceeds", async () => {
    statsQueue = [stats(9_000), stats(14_000)];
    await expect(ensureVramHeadroom("http://s:8188", 13500, probeClient)).resolves.toBeUndefined();
    expect(freeCalls).toHaveLength(1);
    expect(freeCalls[0]).toEqual({ unload_models: true, free_memory: true });
  });
  it("still short after the reclaim loop REFUSES LOUD — headroom vs budget vs reclaimed, the numbers named", async () => {
    statsQueue = [stats(9_000), stats(9_500), stats(9_600), stats(9_700)];
    await expect(ensureVramHeadroom("http://s:8188", 13500, probeClient)).rejects.toThrowError(
      /refusing rather than OOM at run time.*9700 MiB free.*13500 MiB.*reclaimed 700 MiB/s,
    );
    expect(freeCalls).toHaveLength(1);
  });
});

describe("gateVramForStage (the stage-door read)", () => {
  it("a params doc without the knob fires NOTHING — no probe traffic (the back-compat arm, its own firing path)", async () => {
    const statsSpy = vi.fn(async (): Promise<unknown> => stats(20_000));
    await expect(
      gateVramForStage("http://s:8188", { workflow: {} }, { getSystemStats: statsSpy }),
    ).resolves.toBeUndefined();
    expect(statsSpy).not.toHaveBeenCalled();
  });
  it("a doc carrying the knob delegates the gate (reclaim arm resolves, /free fired)", async () => {
    statsFallback = stats(9_000);
    statsQueue = [stats(9_000), stats(14_000)];
    await expect(
      gateVramForStage("http://s:8188", { workflow: {}, vram_budget_mb: 13500 }, probeClient),
    ).resolves.toBeUndefined();
    expect(freeCalls).toHaveLength(1);
  });
  it("a garbage knob on the doc refuses with the admission voice", async () => {
    await expect(
      gateVramForStage("http://s:8188", { workflow: {}, vram_budget_mb: -5 }, probeClient),
    ).rejects.toThrowError(/vram_budget_mb must be a positive finite number/);
  });
});
