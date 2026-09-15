// mcp-engine.spec.ts — the MCP engine provider's pins (stroke 54,
// plan §3 step 5). The executor rides a FAKE ToolRuntime (the
// structural slice) — the live blender face is separately
// live-fired (mcp_server.py against the real binary; the probe
// lives in the stroke-54 ledger row). These pins hold the WIRE
// LAW: public tool names, verbatim args, containment, artifacts,
// isError refusals, stop threading, and the plugin's seat rows.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context, Service } from "@deepseek-ai/cordis";
import { enginesContract, type EnginesService } from "@melite/engine-contract";
import {
  mcpExecutor,
  mcpServerOf,
  McpEnginesService,
  type McpToolCaller,
} from "../src/mcp-engine.ts";
import type { ToolExecutionInput, ToolExecutionResult } from "@deepseek-ai/dsh-tools";

const TMP = join(tmpdir(), "melite-mcp-engine-");
const tmp = (): string => mkdtempSync(TMP);

/** A fake ToolRuntime: records inputs, answers per test. */
class FakeTools {
  calls: ToolExecutionInput[] = [];
  answer: (input: ToolExecutionInput) => ToolExecutionResult = () => ({
    isError: false as const,
    value: { ok: true },
    content: [{ type: "text" as const, text: '{"melite_result":{"macro":"x"}}' }],
  });
  execute = async (input: ToolExecutionInput): Promise<ToolExecutionResult> => {
    this.calls.push(input);
    return this.answer(input);
  };
}

const opts = {
  shouldStop: () => false,
  report: (u: Record<string, unknown>) => {
    taps.push(u);
  },
};
let taps: Record<string, unknown>[] = [];

describe("mcpServerOf (the id grammar)", () => {
  it("splits mcp:<server>; refuses bare ids and comfyui", () => {
    assert.equal(mcpServerOf("mcp:blender"), "blender");
    assert.equal(mcpServerOf("mcp:A-9_z"), "A-9_z");
    assert.throws(() => mcpServerOf("blender"), /must be 'mcp:<server>'/);
    assert.throws(() => mcpServerOf("comfyui"), /must be 'mcp:<server>'/);
    assert.throws(() => mcpServerOf("mcp:bad name"), /must be 'mcp:<server>'/);
  });
});

describe("mcpExecutor (the wire law)", () => {
  it("calls mcp__<server>__<tool> with verbatim args; outputs the text block; taps activity", async () => {
    const dir = tmp();
    const tools = new FakeTools();
    taps = [];
    const out = await mcpExecutor(tools, "mcp:blender").executeStages(
      [{ stageId: "s1", outputs: {}, params: { tool: "scene_info", args: { limit: 8 } } }],
      dir,
      {},
      opts,
    );
    assert.equal(tools.calls.length, 1);
    assert.equal(tools.calls[0]?.name, "mcp__blender__scene_info");
    assert.deepEqual(tools.calls[0]?.arguments, { limit: 8 });
    assert.match(String(tools.calls[0]?.callId), /^melite-engine-/);
    assert.ok(tools.calls[0]?.signal instanceof AbortSignal);
    assert.equal(out.stages[0]?.outputs.default, '{"melite_result":{"macro":"x"}}');
    assert.match(String(taps[0]?.["activity"]), /mcp blender ok \(s1, 0 artifacts\)/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("collects run-dir new files as artifacts; missing args default to {}", async () => {
    const dir = tmp();
    const tools = new FakeTools();
    tools.answer = () => ({
      isError: false as const,
      value: {},
      content: [{ type: "text" as const, text: "rendered" }],
    });
    tools.execute = async (input) => {
      // the "tool" writes the artifact, as the real one would
      writeFileSync(join(dir, "shot.png"), "PNG");
      return tools.answer(input);
    };
    const out = await mcpExecutor(tools, "mcp:blender").executeStages(
      [{ stageId: "r", outputs: {}, params: { tool: "render_shot", args: { out: join(dir, "shot.png") } } }],
      dir,
      {},
      opts,
    );
    assert.deepEqual(out.stages[0]?.artifacts, ["shot.png"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("refuses an args.out outside the run dir BEFORE any wire call", async () => {
    const dir = tmp();
    const tools = new FakeTools();
    await assert.rejects(
      mcpExecutor(tools, "mcp:blender").executeStages(
        [{ stageId: "e", outputs: {}, params: { tool: "render_shot", args: { out: "/etc/passwd.png" } } }],
        dir,
        {},
        opts,
      ),
      /must land inside the run dir/,
    );
    assert.equal(tools.calls.length, 0, "no wire call after refusal");
    rmSync(dir, { recursive: true, force: true });
  });

  it("refuses non-object args and a missing tool name; nothing runs", async () => {
    const dir = tmp();
    const tools = new FakeTools();
    await assert.rejects(
      mcpExecutor(tools, "mcp:blender").executeStages(
        [{ stageId: "a", outputs: {}, params: { tool: "x", args: [1, 2] } }],
        dir,
        {},
        opts,
      ),
      /'args' must be a JSON object/,
    );
    await assert.rejects(
      mcpExecutor(tools, "mcp:blender").executeStages(
        [{ stageId: "b", outputs: {}, params: { args: {} } }],
        dir,
        {},
        opts,
      ),
      /non-empty 'tool'/,
    );
    assert.equal(tools.calls.length, 0);
    rmSync(dir, { recursive: true, force: true });
  });

  it("an isError tool result THROWS (the stage fails; the runs lane settles)", async () => {
    const dir = tmp();
    const tools = new FakeTools();
    tools.answer = () => ({
      isError: true as const,
      error: { message: "boom: the macro refused" },
    });
    await assert.rejects(
      mcpExecutor(tools, "mcp:blender").executeStages(
        [{ stageId: "f", outputs: {}, params: { tool: "render_shot", args: {} } }],
        dir,
        {},
        opts,
      ),
      /mcp blender.render_shot failed: boom: the macro refused/,
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("shouldStop crosses into the call's abort signal", async () => {
    const dir = tmp();
    const tools = new FakeTools();
    let seen: AbortSignal | undefined;
    tools.execute = async (input) => {
      seen = input.signal;
      // hold the call until the stop press lands
      for (let i = 0; i < 40 && !seen?.aborted; i++) {
        await new Promise((r) => setTimeout(r, 25));
      }
      return { isError: false as const, value: {}, content: [] };
    };
    let stop = false;
    const timer = setTimeout(() => {
      stop = true;
    }, 150);
    await mcpExecutor(tools, "mcp:blender").executeStages(
      [{ stageId: "s", outputs: {}, params: { tool: "execute_code", args: { code: "pass" } } }],
      dir,
      {},
      { shouldStop: () => stop, report: () => {} },
    );
    clearTimeout(timer);
    assert.ok(seen?.aborted, "the stop press aborted the tool call's signal");
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("the provider (seat rows)", () => {
  /** The fake tools runtime as a real cordis Service named 'tools'
   *  (the name ToolRuntime itself registers under). */
  class FakeToolsService extends Service {
    calls: ToolExecutionInput[] = [];
    constructor(ctx: Context) {
      super(ctx, "tools");
    }
    execute = async (input: ToolExecutionInput): Promise<ToolExecutionResult> => {
      this.calls.push(input);
      return {
        isError: false,
        value: { ok: true },
        content: [{ type: "text", text: "wire ok" }],
      };
    };
  }

  it("registers configured engines; the FULL VERTICAL runs (seat resolve -> executor -> wire name)", async () => {
    const ctx = new Context();
    await ctx.plugin(enginesContract);
    const tools = new FakeToolsService(ctx);
    new McpEnginesService(ctx, { engines: ["mcp:blender"] });
    const seat = ctx.get("engines") as EnginesService;
    assert.ok(seat.has("mcp:blender"), "registered");
    assert.deepEqual(seat.ids(), ["mcp:blender"]);
    // the vertical: resolve through the SEAT, execute, check the wire
    const dir = tmp();
    const out = await seat
      .resolve("mcp:blender")
      .executor.executeStages(
        [{ stageId: "v", outputs: {}, params: { tool: "scene_info", args: {} } }],
        dir,
        {},
        { shouldStop: () => false, report: () => {} },
      );
    assert.equal(tools.calls[0]?.name, "mcp__blender__scene_info");
    assert.equal(out.stages[0]?.outputs.default, "wire ok");
    rmSync(dir, { recursive: true, force: true });
  });

  it("refuses loudly when the seat or the tools runtime is missing", async () => {
    const ctx = new Context();
    assert.throws(
      () => new McpEnginesService(ctx, { engines: [] }),
      /'engines' seat is not mounted/,
    );
    const ctx2 = new Context();
    await ctx2.plugin(enginesContract);
    assert.throws(
      () => new McpEnginesService(ctx2, { engines: [] }),
      /tools runtime is not mounted/,
    );
  });

  it("default config registers NOTHING (explicit > implicit)", async () => {
    const ctx = new Context();
    await ctx.plugin(enginesContract);
    new FakeToolsService(ctx);
    new McpEnginesService(ctx, {});
    assert.deepEqual((ctx.get("engines") as EnginesService).ids(), []);
  });
});
