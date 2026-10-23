// comfyui-vram.spec.ts — THE VRAM HEADROOM GATE WALL (the
// "ComfyUI should prevent oom" law, operator 2026-10-23, refined
// the same round: "ComfyUI manages VRAM auto" / "only comfyui uses
// the GPU"). The burn: the anny estimator subprocess needed ~13.8
// GiB free on a 4090 whose engine held 10.26 GiB managed residency
// — the run died mid-flight on a 388 MiB alloc, torch's OOM the
// only diagnosis. The law: the estate refuses BEFORE submit when
// headroom cannot be proven — and NEVER evicts (no /free, no
// nudge, no restarts: the engine's own management owns residency;
// an earlier arm fired /free from here and evicted the operator's
// managed cache — retired). Every arm fires on its own path.
import { describe, it, expect, vi, beforeEach } from "vitest";

// The transport is the ONLY seam mocked: the SDK client's
// getSystemStats door is the rig. The free() door counts CALLS —
// the never-evicts law's oracle (it must stay zero on every path).
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

// THE RIG: stats answers shift off a queue; the fallback covers the
// pass arm's single read.
let statsQueue: unknown[] = [];
let statsFallback: unknown = { devices: [] };
const freeCalls: unknown[] = [];

const probeClient = { getSystemStats: async (): Promise<unknown> => statsQueue.shift() ?? statsFallback };

beforeEach((): void => {
  statsQueue = [];
  statsFallback = { devices: [] };
  freeCalls.length = 0;
  vi.restoreAllMocks();
});

const MB = 1024 * 1024;
const stats = (freeMb: number): unknown => ({
  devices: [{ name: "cuda:0", vram_total: 25_600 * MB, vram_free: freeMb * MB }],
});

describe("normalizeVramBudgetMb (the knob's admission)", () => {
  it("absent means NO gate — undefined rides back (back-compat law: stages without a budget never probe)", () => {
    expect(normalizeVramBudgetMb(undefined)).toBeUndefined();
  });
  it("a positive finite number is the budget in MiB", () => {
    expect(normalizeVramBudgetMb(15500)).toBe(15500);
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
    statsFallback = { devices: [{ name: "cuda:0", vram_total: 25_600 * MB, vram_free: 20_000 * MB }] };
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

describe("ensureVramHeadroom (prove or refuse — the estate NEVER evicts)", () => {
  it("headroom proved: clean return, ZERO /free calls (ComfyUI manages VRAM auto)", async () => {
    statsFallback = stats(20_000);
    await expect(ensureVramHeadroom("http://s:8188", 15500, probeClient)).resolves.toBeUndefined();
    expect(freeCalls).toHaveLength(0);
  });
  it("short headroom REFUSES LOUD on the ONE probe — the numbers named, and /free is NEVER fired (the engine's own management owns residency)", async () => {
    statsFallback = stats(9_000);
    await expect(ensureVramHeadroom("http://s:8188", 15500, probeClient)).rejects.toThrowError(
      /refusing rather than OOM at run time.*9000 MiB free.*15500 MiB.*never evicts/s,
    );
    expect(freeCalls, "the never-evicts law: the estate does not command the engine's memory").toHaveLength(0);
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
  it("a doc carrying the knob delegates the gate (proved arm resolves, /free never fired)", async () => {
    statsFallback = stats(20_000);
    await expect(
      gateVramForStage("http://s:8188", { workflow: {}, vram_budget_mb: 15500 }, probeClient),
    ).resolves.toBeUndefined();
    expect(freeCalls).toHaveLength(0);
  });
  it("a garbage knob on the doc refuses with the admission voice", async () => {
    await expect(
      gateVramForStage("http://s:8188", { workflow: {}, vram_budget_mb: -5 }, probeClient),
    ).rejects.toThrowError(/vram_budget_mb must be a positive finite number/);
  });
});
