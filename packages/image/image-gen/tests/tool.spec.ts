// @melite/image-image-gen — the TOOL FACE tests.
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
//     one, the root registers nothing — the dual-face law (the tool
//     face is melite-tools' card gate; the root is the composition
//     marker).
import {describe, it, beforeAll, afterAll} from "vitest";
import assert from "node:assert/strict";
import { Context, Service } from "@deepseek-ai/cordis";
import { ComfyUIService } from "@melite/comfyui-cordis/service";
import { emitParamsSpec } from "@melite/comfyui-card-kit/params-emit";
import * as pkg from "../src/index.ts";
import { buildImageGenTool } from "../src/tool.ts";
import { TOOL_NAME } from "../src/wire.ts";
import { parameterSchemaSpecToJsonSchema } from "@deepseek-ai/dsh-tools";
import type { ToolDefinition } from "@deepseek-ai/dsh-tools";
import { identity, schema, BOARDED, SEMANTIC_MODELS } from "../src/card.ts";

const REFUSING_CALL = async (): Promise<never> => { throw new Error("face tests never call the seam") }

// ── the recording seam (EstateCall, the transport contract) ─────────
// The executor's doors are exercised through the SAME jsonLane(call)
// seam production rides; the fake is the estate's far side: it
// records every lane and answers from the fixtures below. No HTTP,
// no server, no port — the aborted string-arg seam is gone.
import { GatewayError, type EstateCall } from "@melite/estate-call";

const calls: Array<{ method: string; path: string; body: Record<string, unknown> }> = [];
let draftsStatus = 200;
let draftsBody: Record<string, unknown> = { draftId: "d_stub_1" };
let startBody: Record<string, unknown> = { run_id: "r_stub_9", status: "queued" };

const seam: EstateCall = async (method, path, body) => {
  calls.push({ method, path, body: body as Record<string, unknown> });
  const reply = path === "/v1/flows/drafts"
    ? { status: draftsStatus, body: draftsBody }
    : { status: 200, body: startBody };
  if (reply.status < 200 || reply.status >= 300) {
    const message = (reply.body as { error?: string }).error ?? "door refused";
    throw new GatewayError(reply.status, JSON.stringify(reply.body), message);
  }
  return reply.body;
};

// Minimal ToolRunContext per the contract's required identity fields
// (the registry materializes real ones; tests fill every required
// field and the executor only consumes signal).
// The semantic style spelling: the first served entry is the
// default pick (value = the wire enum's default, route = the atom
// that crosses to the estate) — derived, never re-spelled here.
const STYLE0 = SEMANTIC_MODELS[0]!;
const FULL_ARGS = { prompt: "a cat in neon rain", model: STYLE0.value };

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
  const tool = buildImageGenTool(REFUSING_CALL);

  it("name is the TOOL-plane law: id, hyphens→underscores, no suffix", () => {
    assert.equal(tool.name, "image_gen");
    assert.equal(TOOL_NAME, "image_gen");
  });

  it("description is the identity's prose", () => {
    assert.equal(tool.description, identity.description);
  });

  it("parameters are the SPEC projection of the same walk — the semantic style enum served, recipe gone (stroke 34)", () => {
    // One walk, two planes: the registry serves the JSON-schema
    // form (/v1/tools); defineTool takes the implicit property map
    // and compiles it — the definition carries the compiled form.
    const spec = emitParamsSpec(schema as never, BOARDED, SEMANTIC_MODELS);
    const compiled = parameterSchemaSpecToJsonSchema(spec as never);
    assert.deepEqual(tool.parameters, compiled);
    // The model input, spelled once: the style enum derived from
    // the boarded DECLs' variant rows — labels in the copy, the
    // first entry's address the default.
    const props = compiled.properties as Record<string, { enum?: string[]; default?: string; description?: string }>;
    assert.deepEqual(props.model!.enum, SEMANTIC_MODELS.map((e) => e.value));
    assert.equal(props.model!.default, STYLE0.value);
    assert.ok(String(props.model!.description).includes(STYLE0.label), "the DECL's own label rides the copy");
    assert.equal("recipe" in props, false, "the recipe knob is gone from the projection");
  });

  it("presentCall claims a generic execute card", () => {
    const card = tool.presentCall?.(FULL_ARGS);
    assert.ok(card, "the tool declares presentCall");
    assert.equal(card.card, "generic");
    assert.equal(card.title, identity.label);
    assert.equal(card.kind, "execute");
    assert.ok(String(card.rawInput).includes(STYLE0.value), "the picked style rides the summary");
    assert.ok(!String(card.rawInput).includes("recipe="), "the dead layer never names itself");
  });
});

describe("the completed card (P0: presentationMeta + presentResult)", () => {
  const tool = buildImageGenTool(REFUSING_CALL);

  it("presentationMeta projects the settled facts (run arm), omitting empty keys", () => {
    const meta = tool.output.presentationMeta?.(FULL_ARGS, {
      flow: "image-gen", model: STYLE0.value, draft_id: "d_77", run_id: "r_9", status: "queued",
    });
    assert.deepEqual(meta, {
      flow: "image-gen", model: STYLE0.value, draft_id: "d_77", run_id: "r_9", status: "queued",
    });
  });

  it("presentationMeta carries the named refusal as a domain outcome", () => {
    const meta = tool.output.presentationMeta?.(FULL_ARGS, {
      flow: "image-gen", model: STYLE0.value, error: "model 'bogus' is not boarded on the image-gen card",
    }) as Record<string, unknown>;
    assert.equal(meta.error, "model 'bogus' is not boarded on the image-gen card");
    assert.ok(!("run_id" in meta), "no run id on a refusal");
  });

  it("presentResult titles the run arm from result.meta — content omitted, the raw render rides", () => {
    const view = tool.presentResult?.(FULL_ARGS, {
      content: [], isError: false,
      meta: tool.output.presentationMeta?.(FULL_ARGS, {
        flow: "image-gen", model: STYLE0.value, run_id: "r_9", status: "queued",
      }),
    });
    assert.ok(view && view.card === "generic");
    assert.equal(view.title, `${identity.label} [${STYLE0.value}] \u2192 r_9`);
    assert.equal(view.content, undefined, "the raw result content renders; presentResult never re-encodes it");
  });

  it("presentResult titles the refusal arm — the reason rides the raw content", () => {
    const view = tool.presentResult?.(FULL_ARGS, {
      content: [], isError: false,
      meta: tool.output.presentationMeta?.(FULL_ARGS, {
        flow: "image-gen", model: STYLE0.value, error: "not boarded",
      }),
    });
    assert.ok(view && view.card === "generic");
    assert.equal(view.title, `${identity.label} [${STYLE0.value}] \u2014 REFUSED`);
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
    const value = (await buildImageGenTool(seam).execute(
      FULL_ARGS, exec,
    )) as Record<string, string>;
    assert.equal(calls.length, 2, "exactly two doors");
    assert.equal(calls[0].path, "/v1/flows/drafts");
    const stage = (calls[0].body.stages as Array<Record<string, unknown>>)[0]!;
    assert.equal(stage.service, STYLE0.route, "the resolved route rides as the stage's service");
    assert.equal(stage.kind, "generation");
    const stageParams = stage.params as Record<string, unknown>;
    assert.equal(stageParams.prompt, "a cat in neon rain");
    assert.ok(!("recipe" in stageParams), "no recipe key travels (stroke 34)");
    assert.ok(!("model" in stageParams), "model rides service, never params");
    assert.equal(calls[1].path, "/v1/flows/start");
    assert.equal(calls[1].body.draft_id, "d_77", "the minted draft rides the start envelope");
    assert.equal(calls[1].body.model, STYLE0.route, "exactly one door key: {model:} at its admission spelling");
    assert.deepEqual(value, { flow: "image-gen", model: STYLE0.value, draft_id: "d_77", run_id: "r_9", status: "queued" });
  });

  it("an unstated model resolves the semantic default (the same law as the row)", async () => {
    calls.length = 0;
    draftsBody = { draftId: "d_1" };
    const value = (await buildImageGenTool(seam).execute({ prompt: "x" }, exec)) as Record<string, string>;
    assert.equal((calls[0].body.stages as Array<Record<string, unknown>>)[0]!.service, STYLE0.route);
    assert.equal(value.model, STYLE0.value);
  });

  it("a named refusal is a CANONICAL value, never a throw", async () => {
    // The door's model-arm refusal (illegal model): admission owns
    // it server-side; the face resolves it as a domain outcome.
    startBody = { error: "model 'bogus' is not boarded on the image-gen card" };
    const value = (await buildImageGenTool(seam).execute(FULL_ARGS, exec)) as Record<string, string>;
    assert.equal(value.error, "model 'bogus' is not boarded on the image-gen card");
    startBody = { run_id: "r_9", status: "queued" };
  });

  it("a drafts-door refusal is canonical too", async () => {
    draftsStatus = 422; draftsBody = { error: "drafts: stage service missing" };
    const value = (await buildImageGenTool(seam).execute(FULL_ARGS, exec)) as Record<string, string>;
    assert.equal(value.error, "drafts: stage service missing");
    draftsStatus = 200; draftsBody = { draftId: "d_1" };
  });

  it("a mint without draftId is a refusal value", async () => {
    draftsBody = { ok: true };
    const value = (await buildImageGenTool(seam).execute(FULL_ARGS, exec)) as Record<string, string>;
    assert.equal(value.error, "gateway draft POST returned no draftId");
  });

  it("a pre-aborted signal aborts immediately (never hangs, no fetch)", async () => {
    calls.length = 0;
    const ctl = new AbortController();
    ctl.abort();
    await assert.rejects(
      buildImageGenTool(seam).execute(FULL_ARGS, { ...exec, signal: ctl.signal }),
    );
    assert.equal(calls.length, 0, "no door was touched");
  });

  it("schema-incomplete args are refused by the contract's own validation", async () => {
    await assert.rejects(
      buildImageGenTool(seam).execute({ model: STYLE0.value }, exec),
      /prompt/,
    );
  });

  it("the renderer explains refusals and run ids", () => {
    const tool = buildImageGenTool(seam);
    const refused = tool.output.render({}, { error: "nope" });
    assert.match(String((refused[0] as { text?: string }).text), /REFUSED: nope/);
    const ran = tool.output.render({}, { model: STYLE0.value, run_id: "r_9" });
    const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(String((ran[0] as { text?: string }).text),
      new RegExp(esc(STYLE0.value) + ".*r_9"));
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

  it("registers NOTHING (the dual-face law): the marker root leaves the tool face to melite-tools' card gate", async () => {
    const { ctx, stub } = await boot(true);
    await ctx.plugin(pkg as unknown as Parameters<typeof ctx.plugin>[0], { call: seam });
    assert.equal(stub!.registered.length, 0, "the marker root registers no tool");
    await ctx.fiber.dispose();
  });

  it("no tools service (the gateway process): the card still registers, no tool", async () => {
    const { ctx } = await boot(false);
    await ctx.plugin(pkg as unknown as Parameters<typeof ctx.plugin>[0], { call: seam });
    const comfy = ctx.get("comfyui") as ComfyUIService;
    assert.ok(comfy.cardIds().includes("image-gen"), "card contribution stands");
    await ctx.fiber.dispose();
  });

  it("SCENARIO B — a standalone agent host (tools, NO comfyui): apply runs, registers nothing, no card", async () => {
    // The hard-gate trap this pins: inject = ['comfyui'] would hold
    // the plugin PENDING forever in this host. The root is the
    // composition marker (dual-face law): no card, and no tool —
    // the tool face rides melite-tools' card gate, mounted where
    // that host composes it.
    const { ctx, stub } = await boot(true, false);
    await ctx.plugin(pkg as unknown as Parameters<typeof ctx.plugin>[0], { call: seam });
    assert.ok(ctx.get("comfyui") === undefined, "no engine service in this host");
    assert.equal(stub!.registered.length, 0, "the marker root registers no tool");
    await ctx.fiber.dispose();
  });
});
