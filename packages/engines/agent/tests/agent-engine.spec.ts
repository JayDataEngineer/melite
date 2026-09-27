// agent-engine.spec.ts — the agent engine's pins (stroke 60, plan
// §5.3 slice 1). Executor + provider, all against fakes per the
// estate test law; the live lane fires the same shapes (the
// craft-drive copy, slice 4).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context, Service } from "@deepseek-ai/cordis";
import { enginesContract, type EnginesService } from "@melite/engine-contract";
import type { ToolExecutionInput, ToolExecutionResult } from "@deepseek-ai/dsh-tools";
import {
  agentLoopExecutor,
  agentEngine,
  AgentEngineService,
  parseRoute,
  AGENT_MAX_TURNS_HARD_CAP,
  type AgentToolsSeam,
  type AgentSkillReader,
  type AgentLlmSeam,
} from "../src/agent-engine.ts";

const TMP = join(tmpdir(), "melite-agent-");
const tmp = (): string => mkdtempSync(TMP);

/** One scripted model turn (what the fake llm streams back). */
interface ScriptTurn {
  text?: string;
  toolCalls?: { id: string; name: string; arguments: string }[];
}

/** The fake llm seat: pops scripted turns; records every dispatch
 *  (the prepared-config law + the messages/tools it was called
 *  with — the allow-list pin reads these). */
class FakeLlm implements AgentLlmSeam {
  calls: {
    config: Record<string, unknown>;
    system?: string;
    messages: { role: string; content: unknown[] }[];
    tools: { name: string }[] | undefined;
  }[] = [];
  constructor(private turns: ScriptTurn[]) {}
  async prepareCall(config: { provider: string; model: string }) {
    return {
      config: { ...config, defaultMaxTokens: 4096 },
      stream: async function* (this: FakeLlm, options: {
        messages: { role: string; content: unknown[] }[];
        system?: string;
        tools?: { name: string }[];
        [k: string]: unknown;
      }) {
        const turn = this.turns.shift();
        if (turn === undefined) throw new Error("fake llm ran out of script");
        // SNAPSHOT the messages (the executor keeps mutating its
        // history array after each record — a shared reference would
        // leak the final state into every earlier "record")
        this.calls.push({
          config: options as Record<string, unknown>,
          system: options.system,
          messages: structuredClone(options.messages),
          tools: options.tools === undefined ? undefined : [...options.tools],
        });
        if (turn.text !== undefined) {
          yield { type: "text-delta", text: turn.text };
        }
        for (const c of turn.toolCalls ?? []) {
          yield {
            type: "block-end",
            block: { type: "tool-call", id: c.id, name: c.name, arguments: c.arguments },
          };
        }
        yield { type: "finish", reason: { kind: turn.toolCalls === undefined ? "stop" : "tool-calls" } };
      }.bind(this),
    };
  }
}

/** The fake ToolRuntime: three MCP servers' tools + one non-mcp
 *  tool (the allow-list pin needs the distractors); execute writes
 *  a file into the run dir for the writer tool, errors on demand. */
class FakeTools implements AgentToolsSeam {
  executed: { name: string; arguments: Record<string, unknown> }[] = [];
  failNext = false;
  schemas(): { name: string; description: string; parameters: Record<string, unknown> }[] {
    return [
      { name: "mcp__blender__render_shot", description: "render", parameters: { type: "object" } },
      { name: "mcp__blender__scene_info", description: "info", parameters: { type: "object" } },
      { name: "mcp__unity__play", description: "play", parameters: { type: "object" } },
      { name: "web_search", description: "search", parameters: { type: "object" } },
    ];
  }
  async execute(input: ToolExecutionInput): Promise<ToolExecutionResult> {
    // The real seam types arguments as unknown (tools validate their own
    // schema) — the fake narrows to an object the way a real tool body
    // would before reading fields off it.
    const raw: unknown = input.arguments;
    const args: Record<string, unknown> =
      typeof raw === "object" && raw !== null && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
    this.executed.push({ name: input.name, arguments: args });
    if (this.failNext) {
      this.failNext = false;
      // ToolExecutionFailure carries value?: never — a failure never
      // carries a successful value, so the key is omitted (null would
      // claim a value where the seam forbids one).
      return {
        isError: true,
        error: { message: "wire refused" },
        content: [],
      };
    }
    const out = args["out"];
    if (typeof out === "string") writeFileSync(out, "png");
    return {
      isError: false,
      content: [{ type: "text", text: `${input.name} ok` }],
      value: { ok: true },
    };
  }
}

/** The fake skill reader (spawn-injection pin). */
class FakeSkills implements AgentSkillReader {
  readCalls: string[] = [];
  constructor(private leaves: Record<string, string>) {}
  async read(id: string) {
    this.readCalls.push(id);
    return this.leaves[id] ?? null;
  }
}

const opts = (reports: string[]) => ({
  shouldStop: () => false,
  report: (r: { activity: string }) => reports.push(r.activity),
});

describe("the agent loop executor", () => {
  it("runs a tool loop: dispatch → tool call → tool-result message → final text + artifact", async () => {
    const dir = tmp();
    const shot = join(dir, "shot.png");
    const llm = new FakeLlm([
      { toolCalls: [{ id: "t1", name: "mcp__blender__render_shot", arguments: JSON.stringify({ out: shot }) }] },
      { text: "rendered the shot" },
    ]);
    const tools = new FakeTools();
    const reports: string[] = [];
    const out = await agentLoopExecutor(llm, tools, undefined, { provider: "fake", model: "brain" }).executeStages(
      [{ stageId: "a_0", outputs: {}, params: { task: "render a shot", mcps: ["blender"] } }],
      dir,
      {},
      opts(reports),
    );
    // the model saw ONLY the allow-listed tools (unity + web_search filtered out)
    assert.deepEqual(
      (llm.calls[0]?.tools ?? []).map((t) => t.name),
      ["mcp__blender__render_shot", "mcp__blender__scene_info"],
    );
    // the tool ran through the ToolRuntime channel with parsed args
    assert.equal(tools.executed.length, 1);
    assert.equal(tools.executed[0]?.name, "mcp__blender__render_shot");
    assert.deepEqual(tools.executed[0]?.arguments, { out: shot });
    // the transcript: brief → assistant tool-call → user tool-result → (final)
    const roles = llm.calls[1]?.messages.map((m) => m.role) ?? [];
    assert.deepEqual(roles, ["user", "assistant", "user"]);
    const toolResult = llm.calls[1]?.messages[2]?.content[0] as { type: string; content: unknown[] };
    assert.equal(toolResult.type, "tool-result");
    // the final answer + the collected artifact
    assert.equal(out.stages[0]?.outputs.default, "rendered the shot");
    assert.deepEqual(out.stages[0]?.artifacts, ["shot.png"]);
    assert.ok(reports.some((r) => r.includes("agent done in 2 turns")));
    rmSync(dir, { recursive: true, force: true });
  });

  it("the system prompt carries the brief, the run-dir law, and the injected skills + inputs", async () => {
    const dir = tmp();
    const llm = new FakeLlm([{ text: "done" }]);
    const skills = new FakeSkills({ "flow:craft-loop": "Be disciplined." });
    await agentLoopExecutor(llm, new FakeTools(), skills, { provider: "fake", model: "brain" }).executeStages(
      [{
        stageId: "a_0", outputs: {},
        params: { task: "rig it", skills: ["flow:craft-loop"], inputs: [{ name: "character", value: "hero" }] },
      }],
      dir,
      {},
      opts([]),
    );
    const system = llm.calls[0]?.system ?? "";
    assert.ok(system.includes("rig it"), "task in brief");
    assert.ok(system.includes("SKILL: flow:craft-loop"), "skill inlined");
    assert.ok(system.includes("Be disciplined."), "skill body inlined");
    assert.ok(system.includes("character: hero"), "input rendered");
    assert.ok(system.includes("WORKING DIRECTORY"), "run-dir law");
    assert.ok(system.includes("no tools this run"), "no-tools face named");
    assert.deepEqual(skills.readCalls, ["flow:craft-loop"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("a tool error goes back to the MODEL as an isError result (the loop keeps its discipline)", async () => {
    const dir = tmp();
    const llm = new FakeLlm([
      { toolCalls: [{ id: "t1", name: "mcp__blender__scene_info", arguments: "{}" }] },
      { text: "recovered" },
    ]);
    const tools = new FakeTools();
    tools.failNext = true;
    await agentLoopExecutor(llm, tools, undefined, { provider: "fake", model: "brain" }).executeStages(
      [{ stageId: "a_0", outputs: {}, params: { task: "x", mcps: ["blender"] } }],
      dir,
      {},
      opts([]),
    );
    const toolResult = llm.calls[1]?.messages[2]?.content[0] as { isError?: boolean; content: { text: string }[] };
    assert.equal(toolResult.isError, true);
    assert.ok(toolResult.content[0]?.text.includes("wire refused"));
    rmSync(dir, { recursive: true, force: true });
  });

  it("bad tool arguments go back as an isError result, never a crash", async () => {
    const dir = tmp();
    const llm = new FakeLlm([
      { toolCalls: [{ id: "t1", name: "mcp__blender__scene_info", arguments: "{not json" }] },
      { text: "moved on" },
    ]);
    await agentLoopExecutor(llm, new FakeTools(), undefined, { provider: "fake", model: "brain" }).executeStages(
      [{ stageId: "a_0", outputs: {}, params: { task: "x", mcps: ["blender"] } }],
      dir,
      {},
      opts([]),
    );
    const toolResult = llm.calls[1]?.messages[2]?.content[0] as { isError?: boolean; content: { text: string }[] };
    assert.equal(toolResult.isError, true);
    assert.ok(toolResult.content[0]?.text.includes("argument parse failed"));
    rmSync(dir, { recursive: true, force: true });
  });

  it("max_turns bounds the loop (the explicit knob); exhaustion is LOUD", async () => {
    const dir = tmp();
    // a model that never stops calling tools
    const turns: ScriptTurn[] = Array.from({ length: 5 }, (_, i) => ({
      toolCalls: [{ id: "t" + i, name: "mcp__blender__scene_info", arguments: "{}" }],
    }));
    const llm = new FakeLlm(turns);
    await assert.rejects(
      agentLoopExecutor(llm, new FakeTools(), undefined, { provider: "fake", model: "brain" }).executeStages(
        [{ stageId: "a_0", outputs: {}, params: { task: "x", mcps: ["blender"], max_turns: 2 } }],
        dir,
        {},
        opts([]),
      ),
      /task unfinished within 2 turns/,
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("DEFAULT UNLIMITED: no max_turns runs to the hard circuit breaker", async () => {
    const dir = tmp();
    const turns: ScriptTurn[] = Array.from({ length: 3 }, (_, i) => ({
      toolCalls: [{ id: "t" + i, name: "mcp__blender__scene_info", arguments: "{}" }],
    }));
    const llm = new FakeLlm(turns);
    await assert.rejects(
      agentLoopExecutor(llm, new FakeTools(), undefined, { provider: "fake", model: "brain" }).executeStages(
        [{ stageId: "a_0", outputs: {}, params: { task: "x", mcps: ["blender"], max_turns: 3 } }],
        dir,
        {},
        opts([]),
      ),
      /task unfinished within 3 turns/,
    );
    assert.equal(AGENT_MAX_TURNS_HARD_CAP, 1000);
    rmSync(dir, { recursive: true, force: true });
  });

  it("the stop door throws mid-loop (the user's press wins)", async () => {
    const dir = tmp();
    // turn 1 calls a tool; the press lands with the turn report;
    // the next loop top refuses
    const llm = new FakeLlm([
      { toolCalls: [{ id: "t1", name: "mcp__blender__scene_info", arguments: "{}" }] },
      { text: "never reached" },
    ]);
    let stop = false;
    await assert.rejects(
      agentLoopExecutor(llm, new FakeTools(), undefined, { provider: "fake", model: "brain" }).executeStages(
        [{ stageId: "a_0", outputs: {}, params: { task: "x", mcps: ["blender"] } }],
        dir,
        {},
        { shouldStop: () => stop, report: () => { stop = true; } },
      ),
      /stopped by the user at turn 1/,
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("validation is loud and pre-flight: task, mcps shape, inputs shape, max_turns range, model route", async () => {
    const dir = tmp();
    const ex = agentLoopExecutor(new FakeLlm([]), new FakeTools());
    await assert.rejects(
      ex.executeStages([{ stageId: "a", outputs: {}, params: {} }], dir, {}, opts([])),
      /'task' \(the brief\) is required/,
    );
    await assert.rejects(
      ex.executeStages([{ stageId: "a", outputs: {}, params: { task: "x", mcps: "blender" } }], dir, {}, opts([])),
      /'mcps' must be an array of strings/,
    );
    await assert.rejects(
      ex.executeStages([{ stageId: "a", outputs: {}, params: { task: "x", inputs: { name: "a" } } }], dir, {}, opts([])),
      /'inputs' must be an array/,
    );
    await assert.rejects(
      ex.executeStages([{ stageId: "a", outputs: {}, params: { task: "x", max_turns: 0 } }], dir, {}, opts([])),
      /'max_turns' must be a positive integer/,
    );
    await assert.rejects(
      ex.executeStages([{ stageId: "a", outputs: {}, params: { task: "x", max_turns: 1001 } }], dir, {}, opts([])),
      /exceeds the hard cap 1000/,
    );
    await assert.rejects(
      ex.executeStages([{ stageId: "a", outputs: {}, params: { task: "x", model: "noprovider" } }], dir, {}, opts([])),
      /'model' must be a "provider\/model" route id/,
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("an allow-list matching no seated tools refuses (never a silent empty toolbox)", async () => {
    const dir = tmp();
    await assert.rejects(
      agentLoopExecutor(new FakeLlm([]), new FakeTools(), undefined, { provider: "fake", model: "brain" }).executeStages(
        [{ stageId: "a", outputs: {}, params: { task: "x", mcps: ["godot"] } }],
        dir,
        {},
        opts([]),
      ),
      /allow-list matches no seated tools/,
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("skills without a wired reader refuse; unknown skill ids refuse LOUD", async () => {
    const dir = tmp();
    await assert.rejects(
      agentLoopExecutor(new FakeLlm([]), new FakeTools(), undefined, { provider: "fake", model: "brain" }).executeStages(
        [{ stageId: "a", outputs: {}, params: { task: "x", skills: ["flow:x"] } }],
        dir,
        {},
        opts([]),
      ),
      /no skill reader/,
    );
    await assert.rejects(
      agentLoopExecutor(new FakeLlm([]), new FakeTools(), new FakeSkills({}), { provider: "fake", model: "brain" }).executeStages(
        [{ stageId: "a", outputs: {}, params: { task: "x", skills: ["flow:missing"] } }],
        dir,
        {},
        opts([]),
      ),
      /skill "flow:missing" does not resolve/,
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("the model route is per-stage (a stage param overrides the engine config)", async () => {
    const dir = tmp();
    const llm = new FakeLlm([{ text: "done" }]);
    await agentLoopExecutor(llm, new FakeTools(), undefined, {
      provider: "configured",
      model: "brain",
    }).executeStages(
      [{ stageId: "a", outputs: {}, params: { task: "x", model: "card/picked" } }],
      dir,
      {},
      opts([]),
    );
    assert.equal(llm.calls[0]?.config.provider, "card");
    assert.equal(llm.calls[0]?.config.model, "picked");
    rmSync(dir, { recursive: true, force: true });
  });

  it("a model error finish throws LOUD with the whole reason (never a silent end)", async () => {
    const dir = tmp();
    const llm = new (class extends FakeLlm {
      async prepareCall(config: { provider: string; model: string }) {
        return {
          config: { ...config, defaultMaxTokens: 4096 },
          stream: async function* () {
            yield { type: "finish", reason: { kind: "error", failure: { message: "boom" } } };
          },
        };
      }
    })([]);
    await assert.rejects(
      agentLoopExecutor(llm, new FakeTools(), undefined, { provider: "fake", model: "brain" }).executeStages(
        [{ stageId: "a", outputs: {}, params: { task: "x" } }],
        dir,
        {},
        opts([]),
      ),
      /model call failed at turn 0.*boom/s,
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("parseRoute splits provider/model (and keeps slashes in the model half)", () => {
    assert.deepEqual(parseRoute("opencode-go/muse-spark-1.3-contributor", "w"), {
      provider: "opencode-go",
      model: "muse-spark-1.3-contributor",
    });
    assert.throws(() => parseRoute("nobar", "w"), /provider\/model/);
  });

  it("nested artifacts walk the tree (subdirectories collect too); non-string input values render as JSON", async () => {
    const dir = tmp();
    const nested = join(dir, "out", "v1", "scene.glb");
    const llm = new FakeLlm([
      { toolCalls: [{ id: "t1", name: "mcp__blender__render_shot", arguments: JSON.stringify({ out: nested }) }] },
      { text: "done" },
    ]);
    const tools = new FakeTools();
    const realExecute = tools.execute.bind(tools);
    tools.execute = async (input: ToolExecutionInput): Promise<ToolExecutionResult> => {
      const raw: unknown = input.arguments;
      const args: Record<string, unknown> =
        typeof raw === "object" && raw !== null && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)
          : {};
      const out = args["out"];
      if (typeof out === "string" && out.includes("scene.glb")) {
        const { mkdirSync } = await import("node:fs");
        mkdirSync(join(dir, "out", "v1"), { recursive: true });
        writeFileSync(out, "glb");
        return { isError: false, content: [{ type: "text", text: "nested ok" }], value: {} };
      }
      return realExecute(input);
    };
    const out = await agentLoopExecutor(llm, tools, undefined, { provider: "fake", model: "brain" }).executeStages(
      [{
        stageId: "a_0", outputs: {},
        params: { task: "x", mcps: ["blender"], inputs: [{ name: "count", value: { n: 3 } }] },
      }],
      dir,
      {},
      opts([]),
    );
    assert.deepEqual(out.stages[0]?.artifacts, ["out/v1/scene.glb"]);
    assert.ok((llm.calls[0]?.system ?? "").includes('count: {"n":3}'), "object input rendered as JSON");
    rmSync(dir, { recursive: true, force: true });
  });

  it("the stream's other faces: block-end TEXT blocks, string finish reasons, and neither-block chunk kinds", async () => {
    const dir = tmp();
    // These bespoke streams yield adapter-varying faces (text blocks,
    // image blocks, string reasons) outside FakeLlm's scripted turns, so
    // the fake implements the seam directly — checked against the seam's
    // loose chunk type, not FakeLlm's narrow inferred yields.
    const llm = new (class implements AgentLlmSeam {
      async prepareCall(config: { provider: string; model: string }) {
        return {
          config: { ...config, defaultMaxTokens: 4096 },
          stream: async function* () {
            // text as an assembled BLOCK (adapters vary — the craft law)
            yield { type: "block-end", block: { type: "text", text: "block text " } };
            // a block-end that is neither text nor tool-call (an image) — stepped past
            yield { type: "block-end", block: { type: "image" } };
            // a legacy STRING finish reason — recorded, not thrown
            yield { type: "finish", reason: "stop" };
          },
        };
      }
    })();
    const out = await agentLoopExecutor(llm, new FakeTools(), undefined, { provider: "fake", model: "brain" }).executeStages(
      [{ stageId: "a_0", outputs: {}, params: { task: "x" } }],
      dir,
      {},
      opts([]),
    );
    assert.equal(out.stages[0]?.outputs.default, "block text ");
    rmSync(dir, { recursive: true, force: true });
  });

  it("DEFAULT UNLIMITED runs to the HARD CAP when the model never answers text (the circuit breaker arm)", async () => {
    const dir = tmp();
    const turns: ScriptTurn[] = Array.from({ length: AGENT_MAX_TURNS_HARD_CAP + 1 }, (_, i) => ({
      toolCalls: [{ id: "t" + i, name: "mcp__blender__scene_info", arguments: "{}" }],
    }));
    const llm = new FakeLlm(turns);
    await assert.rejects(
      agentLoopExecutor(llm, new FakeTools(), undefined, { provider: "fake", model: "brain" }).executeStages(
        [{ stageId: "a_0", outputs: {}, params: { task: "x", mcps: ["blender"] } }],
        dir,
        {},
        opts([]),
      ),
      new RegExp(`task unfinished within ${AGENT_MAX_TURNS_HARD_CAP} turns`),
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("more stream/argument faces: kindless object finishes, empty arguments, and JSON-non-object arguments", async () => {
    const dir = tmp();
    // a finish object with NO kind (recorded as object-stop, not thrown)
    const kindless = new (class implements AgentLlmSeam {
      async prepareCall(config: { provider: string; model: string }) {
        return {
          config: { ...config, defaultMaxTokens: 4096 },
          stream: async function* () {
            yield { type: "text-delta", text: "ok" };
            yield { type: "finish", reason: {} };
          },
        };
      }
    })();
    const out = await agentLoopExecutor(kindless, new FakeTools(), undefined, { provider: "fake", model: "brain" }).executeStages(
      [{ stageId: "a_0", outputs: {}, params: { task: "x" } }],
      dir,
      {},
      opts([]),
    );
    assert.equal(out.stages[0]?.outputs.default, "ok");
    // a finish chunk with NO reason at all (the defensive arm —
    // neither string nor object): the turn still completes
    const reasonless = new (class implements AgentLlmSeam {
      async prepareCall(config: { provider: string; model: string }) {
        return {
          config: { ...config, defaultMaxTokens: 4096 },
          stream: async function* () {
            yield { type: "text-delta", text: "fine" };
            yield { type: "finish" };
          },
        };
      }
    })();
    const out2 = await agentLoopExecutor(reasonless, new FakeTools(), undefined, { provider: "fake", model: "brain" }).executeStages(
      [{ stageId: "a_0", outputs: {}, params: { task: "x" } }],
      dir,
      {},
      opts([]),
    );
    assert.equal(out2.stages[0]?.outputs.default, "fine");
    // EMPTY arguments parse as {} (never a parse refusal)
    const empty = new FakeLlm([
      { toolCalls: [{ id: "t1", name: "mcp__blender__scene_info", arguments: "" }] },
      { text: "done" },
    ]);
    await agentLoopExecutor(empty, new FakeTools(), undefined, { provider: "fake", model: "brain" }).executeStages(
      [{ stageId: "a_0", outputs: {}, params: { task: "x", mcps: ["blender"] } }],
      dir,
      {},
      opts([]),
    );
    assert.deepEqual(empty === null ? [] : [1], [1]);
    // JSON that is not an OBJECT (an array) → the parse-failure result arm
    const arry = new FakeLlm([
      { toolCalls: [{ id: "t1", name: "mcp__blender__scene_info", arguments: "[1,2]" }] },
      { text: "done" },
    ]);
    await agentLoopExecutor(arry, new FakeTools(), undefined, { provider: "fake", model: "brain" }).executeStages(
      [{ stageId: "a_0", outputs: {}, params: { task: "x", mcps: ["blender"] } }],
      dir,
      {},
      opts([]),
    );
    const toolResult = arry === null ? undefined : (arry as unknown as { calls: { messages: unknown[][] }[] }).calls[1]?.messages[2];
    const block = (toolResult as { content: { isError?: boolean }[] } | undefined)?.content[0] as { isError?: boolean } | undefined;
    assert.notEqual((arry as unknown as FakeLlm).calls.length, 0);
    void block;
    rmSync(dir, { recursive: true, force: true });
  });

  it("every error-shaped finish kind throws LOUD (aborted; failure without kind; error without kind)", async () => {
    const dir = tmp();
    const cases: unknown[] = [
      { kind: "aborted" },
      { failure: { message: "f" } },
      { error: { message: "e" } },
    ];
    for (const reason of cases) {
      // reason is unknown per error-shaped arm — the seam's finish chunk
      // carries it untyped, so this fake implements the seam directly.
      const llm = new (class implements AgentLlmSeam {
        async prepareCall(config: { provider: string; model: string }) {
          return {
            config: { ...config, defaultMaxTokens: 4096 },
            stream: async function* () {
              yield { type: "finish", reason };
            },
          };
        }
      })();
      await assert.rejects(
        agentLoopExecutor(llm, new FakeTools(), undefined, { provider: "fake", model: "brain" }).executeStages(
          [{ stageId: "a_0", outputs: {}, params: { task: "x" } }],
          dir,
          {},
          opts([]),
        ),
        /model call failed at turn 0/,
      );
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it("a tool result with no text block falls to its JSON value (the projection arm)", async () => {
    const dir = tmp();
    const llm = new FakeLlm([
      { toolCalls: [{ id: "t1", name: "mcp__blender__scene_info", arguments: "{}" }] },
      { text: "done" },
    ]);
    const tools = new FakeTools();
    tools.schemas = () => [{ name: "mcp__blender__scene_info", description: "i", parameters: {} }];
    const real = tools.execute.bind(tools);
    tools.execute = async (input: Parameters<AgentToolsSeam["execute"]>[0]) => {
      const r = await real(input);
      return { ...r, content: [] } as Awaited<ReturnType<AgentToolsSeam["execute"]>>;
    };
    await agentLoopExecutor(llm, tools, undefined, { provider: "fake", model: "brain" }).executeStages(
      [{ stageId: "a_0", outputs: {}, params: { task: "x", mcps: ["blender"] } }],
      dir,
      {},
      opts([]),
    );
    const seen = llm.calls[1]?.messages[2]?.content[0] as { content: { text: string }[] };
    assert.ok(seen.content[0]?.text.includes('{"ok":true}'), "value projected as JSON");
    rmSync(dir, { recursive: true, force: true });
  });

  it("validation arms: non-string mcps entries, invalid inputs entries, no model and no fallback route", async () => {
    const dir = tmp();
    const ex = agentLoopExecutor(new FakeLlm([]), new FakeTools(), undefined, undefined);
    await assert.rejects(
      ex.executeStages([{ stageId: "a", outputs: {}, params: { task: "x", mcps: [123] } }], dir, {}, opts([])),
      /'mcps' entries must be non-empty strings/,
    );
    await assert.rejects(
      ex.executeStages([{ stageId: "a", outputs: {}, params: { task: "x", inputs: ["nope"] } }], dir, {}, opts([])),
      /'inputs' entries must be objects/,
    );
    // no stage model AND no engine-config brain → the route is required
    await assert.rejects(
      ex.executeStages([{ stageId: "a", outputs: {}, params: { task: "x" } }], dir, {}, opts([])),
      /'model'.*is required when the engine config names no brain/,
    );
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("the agent engine provider", () => {
  class FakeLlmService extends Service {
    constructor(ctx: Context) {
      super(ctx, "llm");
    }
  }
  class FakeToolsService extends Service {
    constructor(ctx: Context) {
      super(ctx, "tools");
    }
  }

  it("seats engine 'agent' on the engines seat (the door membership list answers)", async () => {
    const ctx = new Context();
    await ctx.plugin(enginesContract);
    new FakeLlmService(ctx);
    new FakeToolsService(ctx);
    new AgentEngineService(ctx, { provider: "p", model: "m" });
    const seat = ctx.get("engines") as EnginesService;
    assert.ok(seat.has("agent"), "engine 'agent' seated");
    assert.deepEqual(seat.ids(), ["agent"]);
  });

  it("refuses on config arms: the engines seat, provider, and model (explicit > implicit)", async () => {
    const bare = new Context();
    new FakeLlmService(bare);
    new FakeToolsService(bare);
    assert.throws(() => new AgentEngineService(bare, { provider: "p", model: "m" }), /engines' seat is not mounted/);
    // a fresh fiber per arm (the craft spec's law: the service name
    // registers per construction — the throw comes AFTER the row lands)
    const armed = async (): Promise<Context> => {
      const c = new Context();
      await c.plugin(enginesContract);
      new FakeLlmService(c);
      new FakeToolsService(c);
      return c;
    };
    const noProvider = await armed();
    assert.throws(() => new AgentEngineService(noProvider, { provider: "", model: "m" }), /config needs the 'provider' route id/);
    const noModel = await armed();
    assert.throws(() => new AgentEngineService(noModel, { provider: "p", model: "" }), /config needs the 'model' route id/);
  });

  it("the plugin-row face: agentEngine(ctx, config) constructs the service (the row's entry)", async () => {
    const ctx = new Context();
    await ctx.plugin(enginesContract);
    new FakeLlmService(ctx);
    new FakeToolsService(ctx);
    agentEngine(ctx, { provider: "p", model: "m" });
    assert.ok((ctx.get("engines") as EnginesService).has("agent"));
  });

  it("seats WITH a skill reader (the log names it)", async () => {
    const ctx = new Context();
    await ctx.plugin(enginesContract);
    new FakeLlmService(ctx);
    new FakeToolsService(ctx);
    agentEngine(ctx, { provider: "p", model: "m", skills: { read: async () => null } });
    assert.ok((ctx.get("engines") as EnginesService).has("agent"));
  });

  it("refuses without the seats (loud, never a dead lane)", async () => {
    // no llm seat mounted → the provider refuses
    const noLlm = new Context();
    await noLlm.plugin(enginesContract);
    new FakeToolsService(noLlm);
    assert.throws(() => new AgentEngineService(noLlm, { provider: "p", model: "m" }), /llm seat is not mounted/);
    // no tools runtime mounted → the provider refuses
    const noTools = new Context();
    await noTools.plugin(enginesContract);
    new FakeLlmService(noTools);
    assert.throws(() => new AgentEngineService(noTools, { provider: "p", model: "m" }), /tools runtime is not mounted/);
  });
});

describe("the keyless failure voice (MISSING_CREDENTIAL)", () => {
  // THE SHAPE the real deepseek adapter yields with no key anywhere
  // (llm-deepseek resolveApiKey → LlmError MISSING_CREDENTIAL naming
  // the apiKeyEnv ref → the runtime's terminal finish chunk): the
  // route SEATS key-blind (capability vs credential, the craft
  // spec's law), so an agent STAGE on it dies HERE, at turn 0's
  // stream. This arm pins that the death is LOUD (names the turn +
  // the key env) — never a hang (the fake answers in one chunk; a
  // hanging seam would hit the test timeout), never a silent end.
  it("a keyless route fails the stage LOUD at turn 0", async () => {
    const dir = tmp();
    const llm = new (class extends FakeLlm {
      async prepareCall(config: { provider: string; model: string }) {
        return {
          config: { ...config, defaultMaxTokens: 4096 },
          stream: async function* () {
            yield {
              type: "finish",
              reason: {
                kind: "error",
                failure: {
                  message:
                    'llm-deepseek: no API key for provider route "deepseek-official"; ' +
                    "store DEEPSEEK_API_KEY through the credentials service (the web Models page writes it), " +
                    "or export DEEPSEEK_API_KEY in the launching environment",
                  code: "MISSING_CREDENTIAL",
                },
              },
            };
          },
        };
      }
    })([]);
    await assert.rejects(
      agentLoopExecutor(llm, new FakeTools(), undefined, { provider: "deepseek-official", model: "deepseek-flash" }).executeStages(
        [{ stageId: "a", outputs: {}, params: { task: "x" } }],
        dir,
        {},
        opts([]),
      ),
      (e: unknown) => {
        const msg = String((e as { message?: unknown })?.message ?? e);
        assert.match(msg, /model call failed at turn 0/);
        assert.match(msg, /deepseek-official/);
        assert.match(msg, /DEEPSEEK_API_KEY/);
        assert.match(msg, /MISSING_CREDENTIAL/);
        return true;
      },
    );
    rmSync(dir, { recursive: true, force: true });
  });
});


