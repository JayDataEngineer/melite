// models-families-provider.spec.ts — the LANES' seat proof (stroke
// 4): the estate serves the runs doors, whose compose-at-expansion
// reads ctx.get("models"). This spec mounts the families provider
// the way the estate mounts it (a fresh Context, one plugin) and
// proves the seat the DOOR sees: the booted table, not a bare
// service with zero families. The 3088 commission (2026-10-10)
// caught the gap live: the maker's melite_flow on anny-hmr
// refused "no such family in the models seat (registered: none)"
// because the estate mounted the bare catalog provider.
import { describe, it, expect, afterAll } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import modelsFamiliesProvider from "../src/entries/catalog-registry.ts";
import { modelsProvider } from "../src/models/service.ts";

const LANES = [new Context()];

afterAll(() => {
  for (const ctx of LANES) void ctx.fiber.dispose();
});

describe("the families provider (the lanes' models seat)", () => {
  it("populates the seat the door reads: ctx.get('models') is the booted table", async () => {
    const ctx = LANES[0]!;
    await ctx.plugin(modelsFamiliesProvider);
    const seat = ctx.get("models") as unknown as {
      allDecls(): { id: string }[];
      familyCount(): number;
    };
    expect(seat, "the service registers on the context (ctx.get resolves it)").not.toBeUndefined();
    const ids = seat.allDecls().map((d) => d.id);
    // The registry census (35 — 47 at the QWEN FOLD minus the 12
    // frozen-registry fossils of the 2026-10-12 family-kill sweep:
    // auto-detect, basic_resize, dwpose, flux-fill-dev, latentsync,
    // mesh_refine, pixel_upscale, rtx-vsr, see-through,
    // step1x_texture, stretchy-rig, trellis_native) with the three
    // census-verb families named — the flows the commission chain
    // composes.
    expect(ids.length).toBe(33); // 32 -> 33 (2026-10-27, the swap family: viggle-animate, audit 023)
    for (const family of ["anny", "skin", "fit"]) {
      expect(ids, `family ${family} boards the lane seat`).toContain(family);
    }
  });

  it("a bare catalog provider mount registers zero families (the gap, pinned)", async () => {
    const ctx = new Context();
    LANES.push(ctx);
    await ctx.plugin(modelsProvider);
    const seat = ctx.get("models") as unknown as { familyCount(): number };
    expect(seat.familyCount()).toBe(0);
  });

  it("disposing the provider fiber unwinds the whole seat (the ownership chain, pinned)", async () => {
    const ctx = new Context();
    // A SEPARATE lane from LANES: this test disposes it awaitedly
    // so the unwind assertion reads settled state, not a teardown
    // racing the afterAll sweep.
    await ctx.plugin(modelsFamiliesProvider);
    const seat = ctx.get("models") as unknown as { familyCount(): number };
    // THE KILL SWEEP (12 fossils deleted 2026-10-12): 35, not 47.
    expect(seat.familyCount()).toBe(33); // 32 -> 33 (2026-10-27, the swap family: viggle-animate, audit 023)
    await ctx.fiber.dispose();
    // ctx.plugin children are parent-owned: the provider's fiber
    // disposes recursively — the ModelsService registration and
    // every family's effect unwound with it. A future refactor
    // that breaks this chain leaves the lane a ghost seat.
    expect(ctx.get("models")).toBeUndefined();
  });
});
