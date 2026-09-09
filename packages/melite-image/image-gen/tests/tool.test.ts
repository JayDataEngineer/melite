// @melite/melite-image-image-gen — the TOOL FACE tests.
//
// Laws proven here:
//  1. SINGLE SPELLING: the tool's name/prose/parameters derive from
//     the same card data the registry serves — the model knob and
//     the recipe enum ride the SAME walk that serves /v1/tools.
//  2. THE EXECUTOR PATH: the model-card law — the stage doc names
//     the model as the stage's service (door one mints, door two
//     starts with {model, draft_id}) — against a stub gateway (the
//     only external dependency; mocked per the REAL-composition
//     law). The face stays thin: admission legality and the facts
//     stamp overlay belong to the door, server-side.
//  3. NAMED REFUSALS ARE CANONICAL: a gateway refusal resolves as a
//     domain outcome {error}, never a throw (the DSH tool contract).
//  4. THE OPTIONAL TOOLS SERVICE: where the composing host provides
//     one, apply registers the tool (Scenario B: tools WITHOUT
//     comfyui — the standalone agent host).
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { Context, Service } from "@deepseek-ai/cordis";
import { ComfyUIService } from "@comfyui/cordis/service";
import { emitParamsSpec } from "@comfyui/cordis/params-emit";
import * as pkg from "../src/index.ts";
import { buildImageGenTool } from "../src/tool.ts";
import { TOOL_NAME } from "../src/wire.ts";
import { parameterSchemaSpecToJsonSchema } from "@deepseek-ai/dsh-tools";
import type { ToolDefinition } from "@deepseek-ai/dsh-tools";
import { identity, schema, BOARDED } from "../src/card.ts";

// ── stub gateway (the external service, mocked) ────────────────────
let server: Server;
let baseUrl = "";
const calls: Array<{ method: string; path: string; body: Record<string, unknown> }> = [];
let draftsStatus = 200;
let draftsBody: Record<string, unknown> = { draftId: "d_stub_1" };
let startBody: Record<string, unknown> = { run_id: "r_stub_9", status: "queued" };

before(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (d?: Buffer) => { if (d) chunks.push(d); });
    req.on("end", () => {
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown> : {};
      calls.push({ method: String(req.method), path: String(req.url), body });
      const json = (status: number, payload: unknown) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(payload));
      };
      if (req.url === "/v1/flows/drafts") return json(draftsStatus, draftsBody);
      if (req.url === "/v1/flows/start") return json(200, startBody);
      json(404, { error: "no such door" });
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});

after(() => { server.close(); });

// Minimal ToolRunContext per the contract's required identity fields
// (the registry materializes real ones; tests fill every required
// field and the executor only consumes signal).
const FULL_ARGS = { prompt: "a cat in neon rain", model: "krea-2", recipe: "cinematic" };

const exec = {
  callId: "test-call",
  name: TOOL_NAME,
  arguments: {},
  signal: new AbortController().signal,
  deferContext: () => {},
  concludeTurn: () => {},
  rootCallId: "test-call",
  token: "test-token",
} as unknown as Parameters<ToolDefinition["execute"]>[1];

describe("single spelling (the emission derives from the card)", () => {
  const tool = buildImageGenTool("http://irrelevant");

  it("name is the TOOL-plane law: id, hyphens→underscores, no suffix", () => {
    assert.equal(tool.name, "image_gen");
    assert.equal(TOOL_NAME, "image_gen");
  });

  it("description is the identity's prose", () => {
    assert.equal(tool.description, identity.description);
  });

  it("parameters are the SPEC projection of the same walk — model knob synthesized, recipe rides", () => {
    // One walk, two planes: the registry serves the JSON-schema
    // form (/v1/tools); defineTool takes the implicit property map
    // and compiles it — the definition carries the compiled form.
    const spec = emitParamsSpec(schema as never, BOARDED);
    const compiled = parameterSchemaSpecToJsonSchema(spec as never);
    assert.deepEqual(tool.parameters, compiled);
    // The model input, spelled once: enum from the boarded array.
    const props = compiled.properties as Record<string, { enum?: string[] }>;
    assert.deepEqual(props.model!.enum, [...BOARDED]);
    assert.deepEqual(props.recipe!.enum, ["standard", "fast_draft", "cinematic"]);
  });

  it("presentCall claims a generic execute card", () => {
    const card = tool.presentCall?.(FULL_ARGS);
    assert.ok(card, "the tool declares presentCall");
    assert.equal(card.card, "generic");
    assert.equal(card.title, identity.label);
    assert.equal(card.kind, "execute");
    assert.ok(String(card.rawInput).includes("krea-2"), "model rides the summary");
    assert.ok(String(card.rawInput).includes("cinematic"), "recipe rides the summary");
  });
});

describe("the completed card (P0: presentationMeta + presentResult)", () => {
  const tool = buildImageGenTool("http://irrelevant");

  it("presentationMeta projects the settled facts (run arm), omitting empty keys", () => {
    const meta = tool.output.presentationMeta?.(FULL_ARGS, {
      flow: "image-gen", model: "krea-2", draft_id: "d_77", run_id: "r_9", status: "queued",
    });
    assert.deepEqual(meta, {
      flow: "image-gen", model: "krea-2", draft_id: "d_77", run_id: "r_9", status: "queued",
    });
  });

  it("presentationMeta carries the named refusal as a domain outcome", () => {
    const meta = tool.output.presentationMeta?.(FULL_ARGS, {
      flow: "image-gen", model: "krea-2", error: "model 'bogus' is not boarded on the image-gen card",
    }) as Record<string, unknown>;
    assert.equal(meta.error, "model 'bogus' is not boarded on the image-gen card");
    assert.ok(!("run_id" in meta), "no run id on a refusal");
  });

  it("presentResult titles the run arm from result.meta — content omitted, the raw render rides", () => {
    const view = tool.presentResult?.(FULL_ARGS, {
      content: [], isError: false,
      meta: tool.output.presentationMeta?.(FULL_ARGS, {
        flow: "image-gen", model: "krea-2", run_id: "r_9", status: "queued",
      }),
    });
    assert.ok(view && view.card === "generic");
    assert.equal(view.title, `${identity.label} [krea-2] \u2192 r_9`);
    assert.equal(view.content, undefined, "the raw result content renders; presentResult never re-encodes it");
  });

  it("presentResult titles the refusal arm — the reason rides the raw content", () => {
    const view = tool.presentResult?.(FULL_ARGS, {
      content: [], isError: false,
      meta: tool.output.presentationMeta?.(FULL_ARGS, {
        flow: "image-gen", model: "krea-2", error: "not boarded",
      }),
    });
    assert.ok(view && view.card === "generic");
    assert.equal(view.title, `${identity.label} [krea-2] \u2014 REFUSED`);
  });

  it("meta-less replay (nested or projected-out call) keeps the pending title: presentResult returns undefined", () => {
    // The contract: absent projector output → no completed intent; the
    // pending title stands and the raw content renders.
    const view = tool.presentResult?.(FULL_ARGS, { content: [], isError: false, meta: undefined });
    assert.equal(view, undefined);
  });
});

describe("the executor path (two doors, the model-card law)", () => {
  it("drafts mints a stage doc naming the model as service; start rides {model, draft_id}", async () => {
    calls.length = 0;
    draftsStatus = 200; draftsBody = { draftId: "d_77" };
    startBody = { run_id: "r_9", status: "queued" };
    const value = (await buildImageGenTool(baseUrl).execute(
      FULL_ARGS, exec,
    )) as Record<string, string>;
    assert.equal(calls.length, 2, "exactly two doors");
    assert.equal(calls[0].path, "/v1/flows/drafts");
    const stage = (calls[0].body.stages as Array<Record<string, unknown>>)[0]!;
    assert.equal(stage.service, "krea-2", "the model rides as the stage's service");
    assert.equal(stage.kind, "generation");
    const stageParams = stage.params as Record<string, unknown>;
    assert.equal(stageParams.prompt, "a cat in neon rain");
    assert.equal(stageParams.recipe, "cinematic", "the recipe travels inside the stage params");
    assert.ok(!("model" in stageParams), "model rides service, never params");
    assert.equal(calls[1].path, "/v1/flows/start");
    assert.equal(calls[1].body.draft_id, "d_77", "the minted draft rides the start envelope");
    assert.equal(calls[1].body.model, "krea-2", "exactly one door key: {model:}");
    assert.deepEqual(value, { flow: "image-gen", model: "krea-2", draft_id: "d_77", run_id: "r_9", status: "queued" });
  });

  it("an unstated model resolves boarded[0] (the same law as the row)", async () => {
    calls.length = 0;
    draftsBody = { draftId: "d_1" };
    const value = (await buildImageGenTool(baseUrl).execute({ prompt: "x" }, exec)) as Record<string, string>;
    assert.equal((calls[0].body.stages as Array<Record<string, unknown>>)[0]!.service, "krea-2");
    assert.equal(value.model, "krea-2");
  });

  it("a named refusal is a CANONICAL value, never a throw", async () => {
    // The door's model-arm refusal (illegal model): admission owns
    // it server-side; the face resolves it as a domain outcome.
    startBody = { error: "model 'bogus' is not boarded on the image-gen card" };
    const value = (await buildImageGenTool(baseUrl).execute(FULL_ARGS, exec)) as Record<string, string>;
    assert.equal(value.error, "model 'bogus' is not boarded on the image-gen card");
    startBody = { run_id: "r_9", status: "queued" };
  });

  it("a drafts-door refusal is canonical too", async () => {
    draftsStatus = 422; draftsBody = { error: "drafts: stage service missing" };
    const value = (await buildImageGenTool(baseUrl).execute(FULL_ARGS, exec)) as Record<string, string>;
    assert.equal(value.error, "drafts: stage service missing");
    draftsStatus = 200; draftsBody = { draftId: "d_1" };
  });

  it("a mint without draftId is a refusal value", async () => {
    draftsBody = { ok: true };
    const value = (await buildImageGenTool(baseUrl).execute(FULL_ARGS, exec)) as Record<string, string>;
    assert.equal(value.error, "gateway draft POST returned no draftId");
  });

  it("a pre-aborted signal aborts immediately (never hangs, no fetch)", async () => {
    calls.length = 0;
    const ctl = new AbortController();
    ctl.abort();
    await assert.rejects(
      buildImageGenTool(baseUrl).execute(FULL_ARGS, { ...exec, signal: ctl.signal }),
    );
    assert.equal(calls.length, 0, "no door was touched");
  });

  it("schema-incomplete args are refused by the contract's own validation", async () => {
    await assert.rejects(
      buildImageGenTool(baseUrl).execute({ model: "krea-2" }, exec),
      /prompt/,
    );
  });

  it("the renderer explains refusals and run ids", () => {
    const tool = buildImageGenTool(baseUrl);
    const refused = tool.output.render({}, { error: "nope" });
    assert.match(String((refused[0] as { text?: string }).text), /REFUSED: nope/);
    const ran = tool.output.render({}, { model: "krea-2", run_id: "r_9" });
    assert.match(String((ran[0] as { text?: string }).text), /krea-2.*r_9/);
  });
});

/** The tools-service surface, stubbed to its Consumer-owned shape. */
class StubToolsService extends Service {
  registered: ToolDefinition[] = [];
  /** The service-side disposer record: the REAL runtime attaches
   *  these to the calling plugin (tutorial ch.2 — harness
   *  registries attach their disposers themselves; proven upstream
   *  in core/tools' own specs). The stub models the protocol. */
  disposers: Array<() => void> = [];
  constructor(ctx: Context) {
    super(ctx, "tools");
  }
  register(tool: ToolDefinition): () => void {
    this.registered.push(tool);
    const disposer = () => {
      const i = this.registered.indexOf(tool);
      if (i >= 0) this.registered.splice(i, 1);
    };
    this.disposers.push(disposer);
    return disposer;
  }
}

describe("the optional tools service (the host contribution)", () => {
  // The documented test idiom: services mount as plugins (tutorial
  // ch.3 — a Service subclass is itself a plugin; ctx.plugin attaches
  // the fiber lifecycle ctx.get's strict default requires), and
  // teardown disposes the root fiber.
  const boot = async (withTools: boolean, withComfy = true) => {
    const ctx = new Context();
    if (withComfy) await ctx.plugin(ComfyUIService);
    let stub: StubToolsService | undefined;
    if (withTools) {
      await ctx.plugin(StubToolsService);
      stub = ctx.get("tools") as unknown as StubToolsService;
    }
    return { ctx, stub };
  };

  it("registers bare; the registration participates in the service's disposal protocol", async () => {
    const { ctx, stub } = await boot(true);
    const fiber = await ctx.plugin(pkg as unknown as Parameters<typeof ctx.plugin>[0], { gateway: baseUrl });
    assert.equal(stub!.registered.length, 1, "one tool contribution");
    assert.equal(stub!.registered[0]!.name, TOOL_NAME);
    assert.equal(stub!.disposers.length, 1, "the registration returned a disposer");
    stub!.disposers[0]!();
    assert.equal(stub!.registered.length, 0, "the service's disposer retracts the tool");
    await fiber.dispose();
    await ctx.fiber.dispose();
  });

  it("no tools service (the gateway process): the card still registers, no tool", async () => {
    const { ctx } = await boot(false);
    await ctx.plugin(pkg as unknown as Parameters<typeof ctx.plugin>[0], { gateway: baseUrl });
    const comfy = ctx.get("comfyui") as { cardIds(): string[] };
    assert.ok(comfy.cardIds().includes("image-gen"), "card contribution stands");
    await ctx.fiber.dispose();
  });

  it("SCENARIO B — a standalone agent host (tools, NO comfyui): apply runs, the tool registers, no card", async () => {
    // The hard-gate trap this pins: inject = ['comfyui'] would hold
    // the plugin PENDING forever in this host — no card, and CRITICALLY
    // no tool. Both faces optional: each composition takes what it can.
    const { ctx, stub } = await boot(true, false);
    await ctx.plugin(pkg as unknown as Parameters<typeof ctx.plugin>[0], { gateway: baseUrl });
    assert.ok(ctx.get("comfyui") === undefined, "no engine service in this host");
    assert.equal(stub!.registered.length, 1, "the tool face stands alone");
    assert.equal(stub!.registered[0]!.name, TOOL_NAME);
    await ctx.fiber.dispose();
  });
});
