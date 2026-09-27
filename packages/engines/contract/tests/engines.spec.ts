// engines.spec.ts — the engines seat's behavior pins (stroke 53).
// Behavior, not implementation: grammar + loud refusals + the
// effect-owned disposer. The service is mounted through the plugin
// row (a REAL composition — no hand-built service bypass; the
// adapter rows and the door ride this same seat).
import { describe, expect, it, vi } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { engineIdOk, enginesContract, EnginesService } from "../src/index.ts";
import type { EngineExecutor, EngineRecord } from "../src/index.ts";

/** Boot one fiber with the contract row mounted (the composition
 * shape the estate bundle uses; plugin() is awaited — service
 * publication lands when the plugin's apply settles). */
async function boot(): Promise<Context> {
  const ctx = new Context();
  await ctx.plugin(enginesContract as never, undefined as never); // cordis Spread<GetPluginConfig> keeps the config arg positional; the object-plugin ignores it
  return ctx;
}

/** A minimal executor double (the contract's one method). */
function fakeExecutor(): EngineExecutor {
  return {
    executeStages: vi.fn(async (): Promise<never> => {
      throw new Error("not under test here");
    }),
  };
}

function fakeRecord(): EngineRecord {
  return { executor: fakeExecutor() };
}

describe("engineIdOk (the pinned grammar)", () => {
  it("accepts the bare word comfyui", async () => {
    expect(engineIdOk("comfyui")).toBe(true);
  });

  it("accepts the bare word craft (the loop engine, stroke 55)", async () => {
    expect(engineIdOk("craft")).toBe(true);
  });

  it("accepts mcp namespaced ids within the server-name rule", async () => {
    expect(engineIdOk("mcp:blender")).toBe(true);
    expect(engineIdOk("mcp:unity")).toBe(true);
    expect(engineIdOk("mcp:A-9_z")).toBe(true);
  });

  it("refuses foreign bare words, empty servers, and off-grammar ids", async () => {
    expect(engineIdOk("blender")).toBe(false);
    expect(engineIdOk("mcp:")).toBe(false);
    expect(engineIdOk("mcp:bad name")).toBe(false);
    expect(engineIdOk("mcp:" + "x".repeat(33))).toBe(false);
    expect(engineIdOk("")).toBe(false);
    expect(engineIdOk("MCP:blender")).toBe(false);
  });
});

describe("EnginesService.register (loud, effect-owned)", () => {
  it("registers and resolves a grammatical engine", async () => {
    const ctx = await boot();
    const seat = ctx.get("engines") as EnginesService;
    const record = fakeRecord();
    const dispose = seat.register("mcp:blender", record);
    expect(seat.has("mcp:blender")).toBe(true);
    expect(seat.resolve("mcp:blender")).toBe(record);
    expect(seat.ids()).toEqual(["mcp:blender"]);
    dispose();
    expect(seat.has("mcp:blender")).toBe(false);

  });

  it("refuses a non-grammatical id loudly (drift, never a fallback)", async () => {
    const ctx = await boot();
    const seat = ctx.get("engines") as EnginesService;
    expect(() => seat.register("blender", fakeRecord())).toThrow(/not grammatical/);
    expect(() => seat.register("mcp:", fakeRecord())).toThrow(/not grammatical/);

  });

  it("refuses a duplicate id loudly (one id, one provider)", async () => {
    const ctx = await boot();
    const seat = ctx.get("engines") as EnginesService;
    seat.register("comfyui", fakeRecord());
    expect(() => seat.register("comfyui", fakeRecord())).toThrow(
      /registered twice/,
    );

  });
});

describe("EnginesService.resolve (loud on unknown)", () => {
  it("names every registered id in the refusal", async () => {
    const ctx = await boot();
    const seat = ctx.get("engines") as EnginesService;
    seat.register("comfyui", fakeRecord());
    seat.register("mcp:blender", fakeRecord());
    expect(() => seat.resolve("mcp:unity")).toThrow(
      /no engine 'mcp:unity' — registered: comfyui, mcp:blender/,
    );

  });

  it("says none-registered on an empty seat", async () => {
    const ctx = await boot();
    const seat = ctx.get("engines") as EnginesService;
    expect(() => seat.resolve("comfyui")).toThrow(
      /no engine 'comfyui' — registered: none registered on this fiber/,
    );

  });
});

describe("the disposer (HMR-safe registration)", () => {
  it("the register-returned disposer removes exactly its own row", async () => {
    const ctx = await boot();
    const seat = ctx.get("engines") as EnginesService;
    const disposeA = seat.register("comfyui", fakeRecord());
    const disposeB = seat.register("mcp:blender", fakeRecord());
    disposeA();
    expect(seat.has("comfyui")).toBe(false);
    expect(seat.has("mcp:blender")).toBe(true);
    disposeB();
    expect(seat.ids()).toEqual([]);
  });
});
