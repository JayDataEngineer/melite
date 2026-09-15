// seams.spec.ts — the service-class seams restored to per-file 100
// (§TEST-20 debt burn-down, stroke 71): the loop's rare arms, the
// critic's stream/parse fallbacks, the factory + boot mounts. Same
// fakes-and-laws convention as craft-engine.spec.ts.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context, Service } from "@deepseek-ai/cordis";
import { enginesContract, type EnginesService } from "@melite/engine-contract";
import {
  craftLoopExecutor,
  craftEngineAutoRoute,
  resolveImageCapableRoute,
  llmCritic,
  craftEngine,
  craftCallId,
  CRAFT_MAX_ITERATIONS_HARD_CAP,
  type CraftCritic,
  type CraftCritique,
  type CraftCommand,
  type CraftEngines,
  type CraftLlmSeam,
  type CraftAttachmentsSeam,
} from "../src/craft-engine.ts";

const TMP = join(tmpdir(), "melite-craft-");
const tmp = (): string => mkdtempSync(TMP);

class ScriptedCritic implements CraftCritic {
  constructor(private verdicts: CraftCritique[]) {}
  async critique(): Promise<CraftCritique> {
    const v = this.verdicts.shift();
    if (v === undefined) throw new Error("critic ran out of script");
    return v;
  }
}

/** The degenerate engines seat: acts land NO stage row (the nested
 * engine's empty vertical — artifacts stay empty). */
class EmptyActEngines implements CraftEngines {
  resolve(): { executor: { executeStages: import("@melite/engine-contract").EngineExecutor["executeStages"] } } {
    return { executor: { executeStages: async () => ({ stages: [] }) } };
  }
}

class OneShotEngines implements CraftEngines {
  resolve(): { executor: { executeStages: import("@melite/engine-contract").EngineExecutor["executeStages"] } } {
    return {
      executor: {
        executeStages: async () => {
          const name = "only.png";
          writeFileSync(join(this.dir, name), "PNG");
          return { stages: [{ stageId: "a", outputs: {}, artifacts: [name] }] };
        },
      },
    };
  }
  constructor(private dir: string) {}
}

const stage = (params: Record<string, unknown>): Parameters<import("@melite/engine-contract").EngineExecutor["executeStages"]>[0][number] => ({
  stageId: "s",
  outputs: {},
  params: params as Record<string, never>,
});

const runOpts = () => ({ shouldStop: () => false, report: () => {} });

describe("the loop's rare arms (per-file 100 restoration)", () => {
  it("a run with NO max_iterations finishes on done (the undefined-max walk through the breaker check)", async () => {
    const dir = tmp();
    const engines = new OneShotEngines(dir);
    const out = await craftLoopExecutor(engines, new ScriptedCritic([{ verdict: "done", note: "n" }])).executeStages(
      [stage({ agent_prompt: "p", command: { engine: "fake", params: {} } })],
      dir,
      {},
      runOpts(),
    );
    assert.equal(out.stages[0]?.outputs.default, "n");
    rmSync(dir, { recursive: true, force: true });
  });

  it("an empty nested vertical: no artifacts, done without a note → the outputs default is the empty join", async () => {
    const dir = tmp();
    const out = await craftLoopExecutor(new EmptyActEngines(), new ScriptedCritic([{ verdict: "done" }])).executeStages(
      [stage({ agent_prompt: "p", command: { engine: "fake", params: {} } })],
      dir,
      {},
      runOpts(),
    );
    assert.equal(out.stages[0]?.outputs.default, "");
    assert.deepEqual(out.stages[0]?.artifacts, []);
    rmSync(dir, { recursive: true, force: true });
  });

  it("done without a note over PRESENT artifacts: the join names them", async () => {
    const dir = tmp();
    const out = await craftLoopExecutor(new OneShotEngines(dir), new ScriptedCritic([{ verdict: "done" }])).executeStages(
      [stage({ agent_prompt: "p", command: { engine: "fake", params: {} } })],
      dir,
      {},
      runOpts(),
    );
    assert.equal(out.stages[0]?.outputs.default, "only.png");
    rmSync(dir, { recursive: true, force: true });
  });

  it("the HARD CAP arm: no max set, 1000 refusals → the cap itself breaks the loop LOUD", async () => {
    const dir = tmp();
    const refines: CraftCritique[] = Array.from({ length: CRAFT_MAX_ITERATIONS_HARD_CAP }, () => ({
      verdict: "refine",
      command: { engine: "fake", params: {} } as CraftCommand,
    }));
    await assert.rejects(
      craftLoopExecutor(new OneShotEngines(dir), new ScriptedCritic(refines)).executeStages(
        [stage({ agent_prompt: "p", command: { engine: "fake", params: {} } })],
        dir,
        {},
        runOpts(),
      ),
      new RegExp(`no done verdict within ${CRAFT_MAX_ITERATIONS_HARD_CAP} iterations`),
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("the circuit breaker with max set refuses LOUD naming the bound", async () => {
    const dir = tmp();
    await assert.rejects(
      craftLoopExecutor(new OneShotEngines(dir), new ScriptedCritic([{ verdict: "refine", command: { engine: "fake", params: {} } }])).executeStages(
        [stage({ agent_prompt: "p", command: { engine: "fake", params: {} }, max_iterations: 1 })],
        dir,
        {},
        runOpts(),
      ),
      /no done verdict within 1 iterations/,
    );
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("resolveImageCapableRoute: a throwing route steps past", () => {
  it("an unresolvable route does not stop the sweep; a modality-less route reads as blind", async () => {
    const llm: CraftLlmSeam = {
      listProviders: () => [{ id: "dead" }, { id: "blank" }, { id: "live" }],
      listModels: async () => [{ id: "m" }],
      resolveModelInfo: async (provider) => {
        if (provider === "dead") throw new Error("provider dead");
        if (provider === "blank") return {};
        return { inputModalities: ["image"] };
      },
      prepareCall: async () => { throw new Error("unreached"); },
    };
    assert.deepEqual(await resolveImageCapableRoute(llm), { provider: "live", model: "m" });
  });
});

describe("llmCritic's stream and scrape arms", () => {
  const NOOP_ATT: CraftAttachmentsSeam = {
    saveImage: async (i) => ({ attachmentId: "a", mediaType: i.mediaType, bytes: 1, width: 1, height: 1 }),
  };

  const makeLlm = (
    chunks: Array<{ type: string; text?: string; reason?: unknown }>,
    modalities: readonly string[] | null = ["text", "image"],
  ): CraftLlmSeam => ({
    listProviders: () => [{ id: "p" }],
    listModels: async () => [{ id: "m" }],
    resolveModelInfo: async () => (modalities === null ? {} : { inputModalities: modalities }),
    prepareCall: async () => ({
      config: { provider: "p", model: "m" },
      stream: async function* (): AsyncIterable<{ type: string; text?: string; reason?: unknown }> {
        for (const c of chunks) yield c;
      },
    }),
  });

  const call = (llm: CraftLlmSeam, artifacts: string[], dir: string) =>
    llmCritic(llm, NOOP_ATT, { provider: "p", model: "m" }).critique({
      iteration: 0, prompt: "b", command: { engine: "e", params: {} }, artifacts,
      runDir: dir, signal: new AbortController().signal,
    });

  it("an undefined modality list refuses (the ?? [] walk)", async () => {
    const dir = tmp();
    await assert.rejects(call(makeLlm([], null), [], dir), /does not accept image input/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("a non-image newest artifact attaches nothing", async () => {
    const dir = tmp();
    writeFileSync(join(dir, "notes.txt"), "T");
    const llm = makeLlm([{ type: "text-delta", text: '{"verdict":"done"}' }, { type: "finish" }]);
    const verdict = await call(llm, ["notes.txt"], dir);
    assert.equal(verdict.verdict, "done");
    rmSync(dir, { recursive: true, force: true });
  });

  it("every image extension maps its media type (gif, webp, jpeg)", async () => {
    const dir = tmp();
    const types: string[] = [];
    const att: CraftAttachmentsSeam = {
      saveImage: async (i) => { types.push(i.mediaType); return { attachmentId: "a", mediaType: i.mediaType, bytes: 1, width: 1, height: 1 }; },
    };
    for (const ext of ["gif", "webp", "jpg"]) {
      const name = `shot.${ext}`;
      writeFileSync(join(dir, name), "X");
      await llmCritic(makeLlm([{ type: "text-delta", text: '{"verdict":"done"}' }, { type: "finish" }]), att, { provider: "p", model: "m" }).critique({
        iteration: 0, prompt: "b", command: { engine: "e", params: {} }, artifacts: [name],
        runDir: dir, signal: new AbortController().signal,
      });
    }
    assert.deepEqual(types, ["image/gif", "image/webp", "image/jpeg"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("a clean object stop names its kind; a kindless object is an object-stop (the no-JSON refusal names which)", async () => {
    const dir = tmp();
    const stopKind = makeLlm([{ type: "finish", reason: { kind: "stop" } }]);
    await assert.rejects(call(stopKind, [], dir), /finish "stop"/);
    const kindless = makeLlm([{ type: "finish", reason: {} }]);
    await assert.rejects(call(kindless, [], dir), /finish "object-stop"/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("an answer with no brace refuses with the chunk histogram", async () => {
    const dir = tmp();
    await assert.rejects(call(makeLlm([{ type: "text-delta", text: "no json here" }, { type: "finish" }]), [], dir), /answered no JSON/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("trailing commentary after the JSON walks the closing braces back until one parses", async () => {
    const dir = tmp();
    const verdict = await call(makeLlm([
      { type: "text-delta", text: 'Sure! {"verdict":"refine","command":{"engine":"e"}} hope this helps' },
      { type: "finish" },
    ]), [], dir);
    assert.equal(verdict.verdict, "refine");
    rmSync(dir, { recursive: true, force: true });
  });

  it("a brace-text that never parses refuses LOUD", async () => {
    const dir = tmp();
    await assert.rejects(call(makeLlm([{ type: "text-delta", text: "{ not json" }, { type: "finish" }]), [], dir), /answered no JSON/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("braces that never parse walk every closing brace before refusing", async () => {
    const dir = tmp();
    await assert.rejects(call(makeLlm([{ type: "text-delta", text: "{ not } json }" }, { type: "finish" }]), [], dir), /answered no JSON/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("a parsed verdict outside done|refine refuses LOUD", async () => {
    const dir = tmp();
    await assert.rejects(call(makeLlm([{ type: "text-delta", text: '{"verdict":"maybe"}' }, { type: "finish" }]), [], dir), /'done' or 'refine' only/);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("the factory + boot mounts", () => {
  class FakeAttSvc extends Service {
    constructor(ctx: Context) { super(ctx, "attachments"); }
  }
  const mountLlm = (ctx: Context, seam: CraftLlmSeam): void => {
    class FakeLlmSvc extends Service {
      constructor(ctx2: Context) { super(ctx2, "llm"); Object.assign(this, seam); }
    }
    new FakeLlmSvc(ctx);
  };
  const seeingLlm = (): CraftLlmSeam => ({
    listProviders: () => [{ id: "p" }],
    listModels: async () => [{ id: "m" }],
    resolveModelInfo: async () => ({ inputModalities: ["image"] }),
    prepareCall: async () => { throw new Error("unreached"); },
  });

  it("craftEngine refuses without the engines seat; seats with all seats mounted", async () => {
    assert.throws(() => craftEngine(new Context(), { provider: "p", model: "m" }), /engines' seat is not mounted/);
    const ctx = new Context();
    await ctx.plugin(enginesContract);
    mountLlm(ctx, seeingLlm());
    new FakeAttSvc(ctx);
    craftEngine(ctx, { provider: "p", model: "m" });
    assert.ok((ctx.get("engines") as EnginesService).has("craft"), "seated");
  });

  it("craftCallId carries the melite-craft prefix", () => {
    assert.match(craftCallId(), /^melite-craft-[0-9a-f-]+$/);
  });

  it("a NAMED route that fails to resolve seats NOTHING, naming the resolve error", async () => {
    const ctx = new Context();
    await ctx.plugin(enginesContract);
    const llm: CraftLlmSeam = {
      listProviders: () => [{ id: "p" }],
      listModels: async () => [{ id: "m" }],
      resolveModelInfo: async () => { throw new Error("no credential"); },
      prepareCall: async () => { throw new Error("unreached"); },
    };
    mountLlm(ctx, llm);
    new FakeAttSvc(ctx);
    const logs: string[] = [];
    const seated = await craftEngineAutoRoute(ctx, (l) => logs.push(l), { provider: "p", model: "m" });
    assert.equal(seated, false);
    assert.match(logs[0]!, /does not resolve \(no credential\)/);
  });

  it("a NAMED route whose resolve throws a MESSAGE-LESS value names the raw value", async () => {
    const ctx = new Context();
    await ctx.plugin(enginesContract);
    mountLlm(ctx, {
      listProviders: () => [{ id: "p" }],
      listModels: async () => [{ id: "m" }],
      resolveModelInfo: async () => { throw "boom"; },
      prepareCall: async () => { throw new Error("unreached"); },
    });
    new FakeAttSvc(ctx);
    const logs: string[] = [];
    const seated = await craftEngineAutoRoute(ctx, (l) => logs.push(l), { provider: "p", model: "m" });
    assert.equal(seated, false);
    assert.match(logs[0]!, /does not resolve \(boom\)/);
  });

  it("a NAMED route resolving with NO modality list seats NOTHING, naming the empty list", async () => {
    const ctx = new Context();
    await ctx.plugin(enginesContract);
    mountLlm(ctx, {
      listProviders: () => [{ id: "p" }],
      listModels: async () => [{ id: "m" }],
      resolveModelInfo: async () => ({}),
      prepareCall: async () => { throw new Error("unreached"); },
    });
    new FakeAttSvc(ctx);
    const logs: string[] = [];
    const seated = await craftEngineAutoRoute(ctx, (l) => logs.push(l), { provider: "p", model: "m" });
    assert.equal(seated, false);
    assert.match(logs[0]!, /modalities \[\]/);
  });

  it("a NAMED route that resolves blind seats NOTHING, naming the modality list", async () => {
    const ctx = new Context();
    await ctx.plugin(enginesContract);
    mountLlm(ctx, {
      listProviders: () => [{ id: "p" }],
      listModels: async () => [{ id: "m" }],
      resolveModelInfo: async () => ({ inputModalities: ["text"] }),
      prepareCall: async () => { throw new Error("unreached"); },
    });
    new FakeAttSvc(ctx);
    const logs: string[] = [];
    const seated = await craftEngineAutoRoute(ctx, (l) => logs.push(l), { provider: "p", model: "m" });
    assert.equal(seated, false);
    assert.match(logs[0]!, /modalities \[text\]/);
  });

  it("a NAMED seeing route seats (the '(named)' log)", async () => {
    const ctx = new Context();
    await ctx.plugin(enginesContract);
    mountLlm(ctx, seeingLlm());
    new FakeAttSvc(ctx);
    const logs: string[] = [];
    const seated = await craftEngineAutoRoute(ctx, (l) => logs.push(l), { provider: "p", model: "m" });
    assert.equal(seated, true);
    assert.match(logs[0]!, /\(named\)/);
    assert.ok((ctx.get("engines") as EnginesService).has("craft"), "seated");
  });
});
