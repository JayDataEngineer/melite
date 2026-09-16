// craft-engine.spec.ts — the craft loop engine's pins (stroke 55,
// plan §2.3). Executor + critic + provider, all against fakes per
// the estate test law; the live lane fires the same shapes.
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
  CraftEngineService,
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

/** A scripted critic: pops verdicts; records what it saw. */
class ScriptedCritic implements CraftCritic {
  saw: { iteration: number; artifacts: readonly string[] }[] = [];
  constructor(private verdicts: CraftCritique[]) {}
  async critique(input: { iteration: number; artifacts: readonly string[] }): Promise<CraftCritique> {
    this.saw.push({ iteration: input.iteration, artifacts: [...input.artifacts] });
    const v = this.verdicts.shift();
    if (v === undefined) throw new Error("critic ran out of script");
    return v;
  }
}

/** A fake engines seat: one engine 'fake' whose act writes a file
 *  per call and reports it as the artifact. */
class FakeEngines implements CraftEngines {
  acts: CraftCommand[] = [];
  constructor(private runDir: string) {}
  resolve(id: string): { executor: { executeStages: import("@melite/engine-contract").EngineExecutor["executeStages"] } } {
    if (id !== "fake") throw new Error("no engine " + id);
    return {
      executor: {
        executeStages: async (rows) => {
          const n = this.acts.length;
          this.acts.push({ engine: id, params: rows[0]?.params as Record<string, never> });
          const name = `shot-${n}.png`;
          writeFileSync(join(this.runDir, name), "PNG");
          return {
            stages: [{ stageId: String(rows[0]?.stageId), outputs: {}, artifacts: [name] }],
          };
        },
      },
    };
  }
}

const stage = (params: Record<string, unknown>): Parameters<import("@melite/engine-contract").EngineExecutor["executeStages"]>[0][number] => ({
  stageId: "s",
  outputs: {},
  params: params as Record<string, never>,
});

const runOpts = (shouldStop: () => boolean = () => false) => ({
  shouldStop,
  report: () => {},
});

describe("craftLoopExecutor (the loop law)", () => {
  it("done on the first iteration: the note lands, the act's artifact is collected", async () => {
    const dir = tmp();
    const engines = new FakeEngines(dir);
    const critic = new ScriptedCritic([{ verdict: "done", note: "matches the brief" }]);
    const out = await craftLoopExecutor(engines, critic).executeStages(
      [stage({ agent_prompt: "a red cube", inputs: { command: { engine: "fake", params: { n: 1 } } } })],
      dir,
      {},
      runOpts(),
    );
    assert.equal(engines.acts.length, 1);
    assert.equal(critic.saw.length, 1);
    assert.equal(out.stages[0]?.outputs.default, "matches the brief");
    assert.deepEqual(out.stages[0]?.artifacts, ["shot-0.png"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("refine re-acts with the critic's next command; artifacts ACCUMULATE", async () => {
    const dir = tmp();
    const engines = new FakeEngines(dir);
    const critic = new ScriptedCritic([
      { verdict: "refine", note: "too dark", command: { engine: "fake", params: { n: 2 } } },
      { verdict: "done", note: "good" },
    ]);
    const out = await craftLoopExecutor(engines, critic).executeStages(
      [stage({ agent_prompt: "p", inputs: { command: { engine: "fake", params: { n: 1 } } } })],
      dir,
      {},
      runOpts(),
    );
    assert.equal(engines.acts.length, 2);
    assert.deepEqual(engines.acts[1]?.params, { n: 2 });
    assert.deepEqual(out.stages[0]?.artifacts, ["shot-0.png", "shot-1.png"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("max_iterations exhausts LOUD (the circuit breaker); the hard cap refuses at the door", async () => {
    const dir = tmp();
    const engines = new FakeEngines(dir);
    const critic = new ScriptedCritic([
      { verdict: "refine", command: { engine: "fake", params: {} } },
      { verdict: "refine", command: { engine: "fake", params: {} } },
    ]);
    await assert.rejects(
      craftLoopExecutor(engines, critic).executeStages(
        [stage({ agent_prompt: "p", inputs: { command: { engine: "fake", params: {} } }, max_iterations: 2 })],
        dir,
        {},
        runOpts(),
      ),
      /no done verdict within 2 iterations/,
    );
    assert.equal(engines.acts.length, 2, "the cap counts acts, not critiques");
    const over = craftLoopExecutor(engines, critic).executeStages(
      [stage({
        agent_prompt: "p",
        inputs: { command: { engine: "fake", params: {} } },
        max_iterations: CRAFT_MAX_ITERATIONS_HARD_CAP + 1,
      })],
      dir,
      {},
      runOpts(),
    );
    await assert.rejects(over, new RegExp(`exceeds the hard cap ${CRAFT_MAX_ITERATIONS_HARD_CAP}`));
    rmSync(dir, { recursive: true, force: true });
  });

  it("refuses bad params LOUD before any act (prompt, inputs, command, max_iterations)", async () => {
    const dir = tmp();
    const engines = new FakeEngines(dir);
    const critic = new ScriptedCritic([]);
    const exec = craftLoopExecutor(engines, critic);
    await assert.rejects(
      exec.executeStages([stage({ inputs: { command: { engine: "fake", params: {} } } })], dir, {}, runOpts()),
      /'agent_prompt'.*is required/,
    );
    await assert.rejects(exec.executeStages([stage({ agent_prompt: "p" })], dir, {}, runOpts()), /'inputs' must be a JSON object/);
    await assert.rejects(
      exec.executeStages([stage({ agent_prompt: "p", inputs: {} })], dir, {}, runOpts()),
      /command must be a JSON object/,
    );
    await assert.rejects(
      exec.executeStages([stage({ agent_prompt: "p", inputs: { command: { engine: "", params: {} } } })], dir, {}, runOpts()),
      /non-empty 'engine'/,
    );
    await assert.rejects(
      exec.executeStages([stage({ agent_prompt: "p", inputs: { command: { engine: "fake", params: {} } }, max_iterations: 0 })], dir, {}, runOpts()),
      /'max_iterations' must be a positive integer/,
    );
    await assert.rejects(
      exec.executeStages([stage({ agent_prompt: "p", inputs: { command: { engine: "fake", params: {} } }, model: "" })], dir, {}, runOpts()),
      /'model' must be a non-empty route id/,
    );
    assert.equal(engines.acts.length, 0);
    rmSync(dir, { recursive: true, force: true });
  });

  it("the stop press aborts LOUD between iterations; a bad refine verdict is loud", async () => {
    const dir = tmp();
    const engines = new FakeEngines(dir);
    const stopCritic = new ScriptedCritic([]);
    await assert.rejects(
      craftLoopExecutor(engines, stopCritic).executeStages(
        [stage({ agent_prompt: "p", inputs: { command: { engine: "fake", params: {} } } })],
        dir,
        {},
        runOpts(() => true),
      ),
      /stopped by the user at iteration 0/,
    );
    const badVerdict = new ScriptedCritic([{ verdict: "meh" } as unknown as CraftCritique]);
    await assert.rejects(
      craftLoopExecutor(engines, badVerdict).executeStages(
        [stage({ agent_prompt: "p", inputs: { command: { engine: "fake", params: {} } } })],
        dir,
        {},
        runOpts(),
      ),
      /verdict "meh" — 'done' or 'refine' only|verdict .*meh.*— 'done' or 'refine' only/,
    );
    const badRefine = new ScriptedCritic([{ verdict: "refine", note: "x" }]);
    await assert.rejects(
      craftLoopExecutor(engines, badRefine).executeStages(
        [stage({ agent_prompt: "p", inputs: { command: { engine: "fake", params: {} } } })],
        dir,
        {},
        runOpts(),
      ),
      /refine \(iteration 0\): command must be a JSON object/,
    );
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("llmCritic (the real critic's law, against seam fakes)", () => {
  const routeLlm = (
    providers: string[],
    models: Record<string, string[]>,
    imageCapable: string[],
  ): CraftLlmSeam => ({
    listProviders: () => providers.map((id) => ({ id })),
    listModels: async (provider) => (models[provider] ?? []).map((id) => ({ id })),
    resolveModelInfo: async (provider, model) => ({
      inputModalities: imageCapable.includes(`${provider}/${model}`) ? ["text", "image"] : ["text"],
    }),
    prepareCall: async () => { throw new Error("unreached"); },
  });

  it("picks the FIRST image-capable route round-robin; none → null", async () => {
    const llm = routeLlm(["a", "b"], { a: ["t1"], b: ["t2", "v1"] }, ["b/v1"]);
    assert.deepEqual(await resolveImageCapableRoute(llm), { provider: "b", model: "v1" });
    const blind = routeLlm(["a"], { a: ["t1"] }, []);
    assert.equal(await resolveImageCapableRoute(blind), null);
    const dead = routeLlm([], {}, []);
    assert.equal(await resolveImageCapableRoute(dead), null);
    const brokenList = routeLlm(["x"], {}, []);
    assert.equal(await resolveImageCapableRoute(brokenList), null);
  });

  class FakeAttSvc extends Service {
    constructor(ctx: Context) {
      super(ctx, "attachments");
    }
  }
  const mountLlm = (ctx: Context, seam: CraftLlmSeam): void => {
    // the service IS the seam (the real LlmRuntime carries these
    // methods itself) — the fake delegates onto itself
    class FakeLlmSvc extends Service {
      constructor(ctx2: Context) {
        super(ctx2, "llm");
        Object.assign(this, seam);
      }
    }
    new FakeLlmSvc(ctx);
  };

  it("auto-route mount seats craft when a vision route exists; quiet-skips otherwise", async () => {
    const noLlm = new Context();
    await noLlm.plugin(enginesContract);
    const logs: string[] = [];
    await craftEngineAutoRoute(noLlm, (l) => logs.push(l));
    assert.match(logs[0], /no llm seat/);
    const noAtt = new Context();
    await noAtt.plugin(enginesContract);
    mountLlm(noAtt, routeLlm(["b"], { b: ["v1"] }, ["b/v1"]));
    await craftEngineAutoRoute(noAtt, (l) => logs.push(l));
    assert.match(logs[1], /no attachments seat/);
    const sighted = new Context();
    await sighted.plugin(enginesContract);
    mountLlm(sighted, routeLlm(["b"], { b: ["v1"] }, ["b/v1"]));
    new FakeAttSvc(sighted);
    const logs3: string[] = [];
    await craftEngineAutoRoute(sighted, (l) => logs3.push(l));
    assert.match(logs3[0], /critic route b\/v1/);
    assert.ok((sighted.get("engines") as EnginesService).has("craft"), "seated");
    const blind = new Context();
    await blind.plugin(enginesContract);
    mountLlm(blind, routeLlm(["b"], { b: ["t1"] }, []));
    new FakeAttSvc(blind);
    const logs4: string[] = [];
    await craftEngineAutoRoute(blind, (l) => logs4.push(l));
    assert.match(logs4[0], /no image-capable route/);
    assert.ok(!(blind.get("engines") as EnginesService).has("craft"), "blind lane seats no craft");
  });

  const makeLlm = (chunks: string[], imageCapable = true): CraftLlmSeam & { messages: unknown[] } => {
    const seam = {
      messages: [] as unknown[],
      listProviders: () => [{ id: "p" }],
      listModels: async () => [{ id: "m" }],
      resolveModelInfo: async () => ({ inputModalities: imageCapable ? ["text", "image"] : ["text"] }),
      prepareCall: async (config: { provider: string; model: string }) => {
        // The fake materializes a default the caller never named
        // (the real seat fills defaultMaxTokens) and enforces the
        // dispatch-equals-prepared law the live-fire caught us
        // breaking — a rebuilt {provider, model} dies here.
        const preparedConfig = { ...config, maxTokens: 1024 };
        return {
          config: preparedConfig,
          stream: async function* (options: { provider: string; model: string; maxTokens?: unknown; messages: unknown[] }): AsyncIterable<{ type: string; text?: string }> {
            assert.equal(options.provider, preparedConfig.provider, "dispatch rides the prepared config");
            assert.equal(options.model, preparedConfig.model, "dispatch rides the prepared config");
            assert.equal(options.maxTokens, 1024, "dispatch carries the prepared defaults");
            seam.messages.push(options.messages);
            for (const c of chunks) yield { type: "text-delta", text: c };
            yield { type: "finish" };
          },
        };
      },
    };
    return seam;
  };

  it("gates the route on image modality, attaches the artifact, parses the JSON verdict", async () => {
    const dir = tmp();
    writeFileSync(join(dir, "shot.png"), "PNG");
    const llm = makeLlm(['{"verdict":"done","note":"ok"}']);
    const saved: unknown[] = [];
    const attachments: CraftAttachmentsSeam = {
      saveImage: async (input) => {
        saved.push(input);
        return { attachmentId: "att-1", mediaType: input.mediaType, bytes: 3, width: 4, height: 4 };
      },
    };
    const verdict = await llmCritic(llm, attachments, { provider: "p", model: "m" }).critique({
      iteration: 0,
      prompt: "brief",
      command: { engine: "fake", params: {} },
      artifacts: ["shot.png"],
      runDir: dir,
      signal: new AbortController().signal,
    });
    assert.deepEqual(verdict, { verdict: "done", note: "ok" });
    assert.equal(saved.length, 1, "the capture attached");
    const content = ((llm.messages[0] as unknown as { content: { type: string }[] }[])[0]).content;
    assert.deepEqual(content.map((b) => b.type), ["text", "image"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("refuses a non-image route LOUD and a no-JSON answer LOUD", async () => {
    const dir = tmp();
    const blind = makeLlm(["{}"], false);
    await assert.rejects(
      llmCritic(blind, { saveImage: async () => ({ attachmentId: "", mediaType: "", bytes: 0, width: 0, height: 0 }) }, { provider: "p", model: "m" }).critique({
        iteration: 0, prompt: "p", command: { engine: "e", params: {} }, artifacts: [], runDir: dir, signal: new AbortController().signal,
      }),
      /does not accept image input/,
    );
    const rambling = makeLlm(["I think it looks great!"]);
    await assert.rejects(
      llmCritic(rambling, { saveImage: async () => ({ attachmentId: "", mediaType: "", bytes: 0, width: 0, height: 0 }) }, { provider: "p", model: "m" }).critique({
        iteration: 0, prompt: "p", command: { engine: "e", params: {} }, artifacts: [], runDir: dir, signal: new AbortController().signal,
      }),
      /answered no JSON/,
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("accumulates a whole block-end text block (adapters that never stream deltas)", async () => {
    const blocky = makeLlm([]);
    const origPrepare = blocky.prepareCall;
    blocky.prepareCall = (async (config: { provider: string; model: string }) => {
      const prepared = await origPrepare(config);
      return {
        ...prepared,
        stream: async function* (): AsyncIterable<{ type: string; text?: string }> {
          yield { type: "block-start", index: 0, blockType: "text" } as unknown as { type: string; text?: string };
          yield { type: "block-end", index: 0, block: { type: "text", text: '{"verdict":"done","note":"blocky"}' } } as unknown as { type: string; text?: string };
          yield { type: "finish", reason: "stop" } as unknown as { type: string; text?: string };
        },
      };
    }) as typeof blocky.prepareCall;
    const verdict = await llmCritic(blocky, { saveImage: async () => ({ attachmentId: "", mediaType: "", bytes: 0, width: 0, height: 0 }) }, { provider: "p", model: "m" }).critique({
      iteration: 0, prompt: "p", command: { engine: "e", params: {} }, artifacts: [], runDir: tmp(), signal: new AbortController().signal,
    });
    assert.deepEqual(verdict, { verdict: "done", note: "blocky" });
  });

  it("walks closing braces back past trailing commentary (spark's verdict + chatter)", async () => {
    const chatty = makeLlm([]);
    const origPrepare = chatty.prepareCall;
    chatty.prepareCall = (async (config: { provider: string; model: string }) => {
      const prepared = await origPrepare(config);
      return {
        ...prepared,
        stream: async function* (): AsyncIterable<{ type: string; text?: string }> {
          yield { type: "text-delta", text: 'Here is my verdict: {"verdict":"refine","note":"fix the } hinge"} Let me know!' } as unknown as { type: string; text?: string };
          yield { type: "finish", reason: { kind: "stop" } } as unknown as { type: string; text?: string };
        },
      };
    }) as typeof chatty.prepareCall;
    const verdict = await llmCritic(chatty, { saveImage: async () => ({ attachmentId: "", mediaType: "", bytes: 0, width: 0, height: 0 }) }, { provider: "p", model: "m" }).critique({
      iteration: 0, prompt: "p", command: { engine: "e", params: {} }, artifacts: [], runDir: tmp(), signal: new AbortController().signal,
    });
    assert.deepEqual(verdict, { verdict: "refine", note: "fix the } hinge" });
  });

  it("surfaces the stream protocol's failure finish LOUD (never an empty no-JSON)", async () => {
    const failing = makeLlm([]);
    const origPrepare = failing.prepareCall;
    failing.prepareCall = (async (config: { provider: string; model: string }) => {
      const prepared = await origPrepare(config);
      return {
        ...prepared,
        stream: async function* (): AsyncIterable<{ type: string; text?: string }> {
          yield { type: "finish", reason: { kind: "error", failure: { message: "adapter blew up", code: "PROVIDER_500", status: 500 } } } as unknown as { type: string; text?: string };
        },
      };
    }) as typeof failing.prepareCall;
    await assert.rejects(
      llmCritic(failing, { saveImage: async () => ({ attachmentId: "", mediaType: "", bytes: 0, width: 0, height: 0 }) }, { provider: "p", model: "m" }).critique({
        iteration: 0, prompt: "p", command: { engine: "e", params: {} }, artifacts: [], runDir: tmp(), signal: new AbortController().signal,
      }),
      // The WHOLE reason object rides the message (never a guessed
      // .message — adapters nest it differently per provider).
      /craft critic call failed: \{.*adapter blew up.*PROVIDER_500/s,
    );
  });

  it("treats an object stop reason as a normal finish (the histogram refusal diagnoses the text)", async () => {
    // pi-ai reports a clean stop as {"kind":"stop"} with no text
    // carrier the critic accumulates — the loop must reach the
    // no-JSON refusal (which names the chunk histogram), never throw
    // a phantom call failure.
    const stopping = makeLlm([]);
    const origPrepare = stopping.prepareCall;
    stopping.prepareCall = (async (config: { provider: string; model: string }) => {
      const prepared = await origPrepare(config);
      return {
        ...prepared,
        stream: async function* (): AsyncIterable<{ type: string; text?: string }> {
          yield { type: "thinking-delta", text: "hmm" } as unknown as { type: string; text?: string };
          yield { type: "finish", reason: { kind: "stop" } } as unknown as { type: string; text?: string };
        },
      };
    }) as typeof stopping.prepareCall;
    await assert.rejects(
      llmCritic(stopping, { saveImage: async () => ({ attachmentId: "", mediaType: "", bytes: 0, width: 0, height: 0 }) }, { provider: "p", model: "m" }).critique({
        iteration: 0, prompt: "p", command: { engine: "e", params: {} }, artifacts: [], runDir: tmp(), signal: new AbortController().signal,
      }),
      /craft critic answered no JSON \(got "", chunks \{"thinking-delta":1,"finish":1\}, finish "stop"\)/,
    );
  });
});

describe("the provider (seat row)", () => {
  class FakeLlmService extends Service {
    constructor(ctx: Context) {
      super(ctx, "llm");
    }
  }
  class FakeAttachmentsService extends Service {
    constructor(ctx: Context) {
      super(ctx, "attachments");
    }
  }

  it("registers engine 'craft' with the llm critic (explicit route config)", async () => {
    const ctx = new Context();
    await ctx.plugin(enginesContract);
    new FakeLlmService(ctx);
    new FakeAttachmentsService(ctx);
    new CraftEngineService(ctx, { provider: "p", model: "m" });
    const seat = ctx.get("engines") as EnginesService;
    assert.ok(seat.has("craft"));
    assert.deepEqual(seat.ids(), ["craft"]);
  });

  it("refuses LOUD when the seat, llm, attachments, or the route config is missing", async () => {
    // a fresh fiber per arm (the service name registers per
    // construction — the throw comes AFTER the row lands)
    const bootRow = async (): Promise<Context> => {
      const c = new Context();
      await c.plugin(enginesContract);
      return c;
    };
    const bare = new Context();
    assert.throws(() => new CraftEngineService(bare, { provider: "p", model: "m" }), /'engines' seat is not mounted/);
    const noLlm = await bootRow();
    assert.throws(() => new CraftEngineService(noLlm, { provider: "p", model: "m" }), /llm seat is not mounted/);
    const noAtt = await bootRow();
    new FakeLlmService(noAtt);
    assert.throws(() => new CraftEngineService(noAtt, { provider: "p", model: "m" }), /attachments seat is not mounted/);
    for (const [label, cfg, want] of [
      ["provider", {}, /needs the critic 'provider' route/],
      ["model", { provider: "p" }, /needs the critic 'model' route id/],
    ] as const) {
      const c = await bootRow();
      new FakeLlmService(c);
      new FakeAttachmentsService(c);
      assert.throws(() => new CraftEngineService(c, cfg as { provider?: string; model?: string }), want, label);
    }
  });

  describe("the named preference (MELITE_CRITIC_ROUTE)", () => {
    // The AutoRoute reads the llm seat through the seam — a fake
    // with a scripted modality table per route.
    class ScriptedLlm extends Service {
      constructor(ctx: Context, readonly table: Record<string, string[] | Error>) {
        super(ctx, "llm");
      }
      listProviders(): { id: string }[] {
        return [{ id: "b" }, { id: "s" }];
      }
      async listModels(provider: string): Promise<{ id: string }[]> {
        return provider === "b" ? [{ id: "v1" }] : [{ id: "spark" }];
      }
      async resolveModelInfo(provider: string, model: string): Promise<{ inputModalities?: readonly string[] }> {
        const entry = this.table[`${provider}/${model}`];
        if (entry instanceof Error) throw entry;
        return { inputModalities: entry ?? ["text"] };
      }
    }
    const bootSeated = async (table: Record<string, string[] | Error>, prefer?: { provider: string; model: string }) => {
      const ctx = new Context();
      await ctx.plugin(enginesContract);
      new ScriptedLlm(ctx, table);
      new FakeAttachmentsService(ctx);
      const lines: string[] = [];
      const seatedReturn = await craftEngineAutoRoute(ctx, (line) => lines.push(line), prefer);
      const seat = ctx.get("engines") as EnginesService;
      assert.equal(seatedReturn, seat.has("craft"));
      return { lines, seated: seat.has("craft") };
    };

    it("seats the NAMED image-capable route (explicit beats the enumeration)", async () => {
      // enumeration would pick b/v1 (first); the named s/spark wins.
      const { lines, seated } = await bootSeated(
        { "b/v1": ["text", "image"], "s/spark": ["text", "image"] },
        { provider: "s", model: "spark" },
      );
      assert.equal(seated, true);
      assert.ok(lines.some((l) => l.includes("s/spark (named)")), lines.join(" | "));
    });

    it("seats NOTHING loud when the named route is blind (no silent substitution)", async () => {
      const { lines, seated } = await bootSeated(
        { "b/v1": ["text", "image"], "s/spark": ["text"] },
        { provider: "s", model: "spark" },
      );
      assert.equal(seated, false);
      assert.ok(lines.some((l) => l.includes("NOT seated") && l.includes("modalities [text]") && l.includes("no silent substitution")), lines.join(" | "));
    });

    it("seats NOTHING loud when the named route is unresolvable", async () => {
      const { lines, seated } = await bootSeated(
        { "b/v1": ["text", "image"], "s/ghost": new Error("no such route") },
        { provider: "s", model: "ghost" },
      );
      assert.equal(seated, false);
      assert.ok(lines.some((l) => l.includes("NOT seated") && l.includes("does not resolve") && l.includes("no such route")), lines.join(" | "));
    });
  });
});

describe("the keyless failure voice (MISSING_CREDENTIAL)", () => {
  // THE SHAPE the real deepseek adapter yields with no key anywhere
  // (llm-deepseek resolveApiKey → LlmError MISSING_CREDENTIAL naming
  // the apiKeyEnv ref → the runtime's terminal finish chunk):
  // resolveModelInfo/prepareCall are pure metadata (key-blind by DSH
  // law — capability vs credential), so a seated route with no key
  // dies HERE, at stream time. These arms pin that the death is
  // LOUD (names the route + the key env) — never a hang (the fake
  // answers in one chunk; a hanging seam would hit the test
  // timeout), never a silent empty no-JSON.
  const keylessReason = {
    kind: "error",
    failure: {
      message:
        'llm-deepseek: no API key for provider route "deepseek-official"; ' +
        "store DEEPSEEK_API_KEY through the credentials service (the web Models page writes it), " +
        "or export DEEPSEEK_API_KEY in the launching environment",
      code: "MISSING_CREDENTIAL",
    },
  };
  const keylessLlm = (): CraftLlmSeam => ({
    listProviders: () => [{ id: "deepseek-official" }],
    listModels: async () => [{ id: "deepseek-flash" }],
    // image-capable: the route SEATS (key-blind) — the keylessness
    // only surfaces at stream time below.
    resolveModelInfo: async () => ({ inputModalities: ["text", "image"] }),
    prepareCall: async (config: { provider: string; model: string }) => ({
      config: { ...config },
      stream: async function* (): AsyncIterable<{ type: string; text?: string }> {
        yield { type: "finish", reason: keylessReason } as unknown as { type: string; text?: string };
      },
    }),
  });
  const noopAttachments: CraftAttachmentsSeam = {
    saveImage: async (i) => ({ attachmentId: "a", mediaType: i.mediaType, bytes: 1, width: 1, height: 1 }),
  };
  const loud = (e: unknown): boolean => {
    const msg = String((e as { message?: unknown })?.message ?? e);
    assert.match(msg, /craft critic call failed/);
    assert.match(msg, /deepseek-official/);
    assert.match(msg, /DEEPSEEK_API_KEY/);
    assert.match(msg, /MISSING_CREDENTIAL/);
    return true;
  };

  it("the critic refuses LOUD naming the route's missing key", async () => {
    const dir = tmp();
    await assert.rejects(
      llmCritic(keylessLlm(), noopAttachments, { provider: "deepseek-official", model: "deepseek-flash" }).critique({
        iteration: 0, prompt: "p", command: { engine: "e", params: {} }, artifacts: [], runDir: dir, signal: new AbortController().signal,
      }),
      loud,
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("a craft STAGE on the keyless route fails LOUD at the first critique (the loop never spins)", async () => {
    const dir = tmp();
    const engines = new FakeEngines(dir);
    const critic = llmCritic(keylessLlm(), noopAttachments, { provider: "deepseek-official", model: "deepseek-flash" });
    await assert.rejects(
      craftLoopExecutor(engines, critic).executeStages(
        [stage({ agent_prompt: "p", inputs: { command: { engine: "fake", params: {} } } })],
        dir,
        {},
        runOpts(),
      ),
      loud,
    );
    assert.equal(engines.acts.length, 1, "the act ran once; the loop died on the critique, never spinning");
    rmSync(dir, { recursive: true, force: true });
  });
});
