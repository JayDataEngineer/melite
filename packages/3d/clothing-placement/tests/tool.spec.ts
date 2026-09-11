// @melite/3d-clothing-placement — the TOOL FACE tests
// (M2′ stroke 2, 2026-09-09).
//
// Laws proven here:
//  1. SINGLE SPELLING: the tool's name/prose/parameters derive from
//     the same card data the registry serves — never a second
//     spelling of schema or identity.
//  2. THE EXECUTOR PATH: the card's own law (its header) — the flow
//     path, two doors (drafts mints, start queues) — against a stub
//     gateway (the only external dependency; mocked per the
//     REAL-composition law).
//  3. NAMED REFUSALS ARE CANONICAL: a gateway refusal resolves as a
//     domain outcome {error}, never a throw (the DSH tool contract).
//  4. THE OPTIONAL TOOLS SERVICE: where the composing host provides
//     one, apply registers the tool and fiber dispose retracts it
//     (HMR law) — and through that registered tool the full loop
//     works end-to-end.
import {describe, it, beforeAll, afterAll} from "vitest";
import assert from "node:assert/strict";
import { Context, Service } from "@deepseek-ai/cordis";
import { ComfyUIService } from "@melite/comfyui-cordis/service";
import { emitParamsSpec } from "@melite/comfyui-cordis/params-emit";
import * as pkg from "../src/index.ts";
import { buildCardTool, TOOL_NAME } from "../src/tool.ts";
import { parameterSchemaSpecToJsonSchema } from "@deepseek-ai/dsh-tools";
import type { ToolDefinition } from "@deepseek-ai/dsh-tools";
import { identity, schema } from "../src/card.ts";

const REFUSING_CALL = async (): Promise<never> => { throw new Error("face tests never call the seam") }


// ── the recording seam (EstateCall, the transport contract) ─────────
// The same image-gen pattern: the fake IS the estate's far side;
// no HTTP, no server, no port.
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
const FULL_ARGS = { body: "/tmp/b.glb", garment: "/tmp/g.glb", out_path: "/tmp/out.glb" };

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
  const tool = buildCardTool(REFUSING_CALL);

  it("name is the TOOL-plane law: id, hyphens\u2192underscores, no suffix", () => {
    // Two planes: the DSH tool is clothing_placement (cookbook's
    // plain read_file convention); the REGISTRY ROW stays
    // clothing_placement_card (cardWireName — pinned by the
    // composition test).
    assert.equal(tool.name, "clothing_placement");
    assert.equal(TOOL_NAME, "clothing_placement");
  });

  it("description is the identity's prose", () => {
    assert.equal(tool.description, identity.description);
  });

  it("parameters are the SPEC projection of the same walk", () => {
    // Two planes from one walk: the registry serves the JSON-schema
    // form (/v1/tools); defineTool takes the implicit property map
    // and compiles it — the definition carries the compiled form.
    const spec = emitParamsSpec(schema as never, []);
    const compiled = parameterSchemaSpecToJsonSchema(spec as never);
    assert.deepEqual(tool.parameters, compiled);
  });

  it("presentCall claims a generic execute card", () => {
    const card = tool.presentCall?.(FULL_ARGS);
    assert.ok(card, "the tool declares presentCall");
    assert.equal(card.card, "generic");
    assert.equal(card.title, identity.label);
    assert.equal(card.kind, "execute");
    assert.ok(String(card.rawInput).includes("garment"));
  });
});

describe("the executor path (two doors, flow law)", () => {
  it("drafts mints, start queues, the canonical value carries both ids", async () => {
    calls.length = 0;
    draftsStatus = 200; draftsBody = { draftId: "d_77" };
    startBody = { run_id: "r_9", status: "queued" };
    const value = (await buildCardTool(seam).execute(
      FULL_ARGS, exec,
    )) as Record<string, string>;
    assert.equal(calls.length, 2, "exactly two doors");
    assert.equal(calls[0].path, "/v1/flows/drafts");
    assert.equal(calls[0].body.flow, "clothing-placement", "the card id is the flow name");
    assert.equal(calls[0].body.body, "/tmp/b.glb", "params ride the compose envelope");
    assert.equal(calls[1].path, "/v1/flows/start");
    assert.equal(calls[1].body.draft_id, "d_77", "the minted draft rides the start envelope");
    assert.deepEqual(value, { flow: "clothing-placement", draft_id: "d_77", run_id: "r_9", status: "queued" });
  });

  it("a named refusal is a CANONICAL value, never a throw", async () => {
    // Schema-complete args: defineTool auto-validates before execute,
    // so the refusal under test is the GATEWAY's, not the schema's.
    draftsStatus = 422; draftsBody = { error: "cardGate: garment not staged on this estate" };
    const value = (await buildCardTool(seam).execute(FULL_ARGS, exec)) as Record<string, string>;
    assert.equal(value.error, "cardGate: garment not staged on this estate");
    draftsStatus = 200; draftsBody = { draftId: "d_1" };
  });

  it("a mint without draftId is a refusal value", async () => {
    draftsBody = { ok: true };
    const value = (await buildCardTool(seam).execute(FULL_ARGS, exec)) as Record<string, string>;
    assert.equal(value.error, "card compose returned no draftId");
  });

  it("a pre-aborted signal aborts immediately (never hangs, no fetch)", async () => {
    calls.length = 0;
    const ctl = new AbortController();
    ctl.abort();
    await assert.rejects(
      buildCardTool(seam).execute(FULL_ARGS, { ...exec, signal: ctl.signal }),
    );
    assert.equal(calls.length, 0, "no door was touched");
  });

  it("schema-incomplete args are refused by the contract's own validation", async () => {
    await assert.rejects(
      buildCardTool(seam).execute({ body: "/tmp/b.glb" }, exec),
      /garment|out_path/,
    );
  });

  it("the renderer explains refusals and run ids", () => {
    const tool = buildCardTool(seam);
    const refused = tool.output.render({}, { error: "nope" });
    assert.match(String((refused[0] as { text?: string }).text), /REFUSED: nope/);
    const ran = tool.output.render({}, { run_id: "r_9" });
    assert.match(String((ran[0] as { text?: string }).text), /r_9/);
  });

  it("the renderer's empty arms: no error, no run id", () => {
    const tool = buildCardTool(seam);
    // error present-but-empty falls through to the run-id voice.
    const quiet = tool.output.render({}, { error: "" });
    assert.match(String((quiet[0] as { text?: string }).text), /clothing_placement → \?/);
    // no value at all: the ? placeholder names the gap.
    const bare = tool.output.render({}, undefined);
    assert.match(String((bare[0] as { text?: string }).text), /clothing_placement → \?/);
  });

  it("presentCall refuses to present UNVALIDATED args (the DSH wrapper law)", () => {
    // defineTool wraps presentCall: args failing the compiled
    // parameter schema return undefined at the seam, never reaching
    // the card body (dsh-tools index.js — pinned here because the
    // card's own prose relies on it: body/garment are always
    // present when the body runs).
    assert.equal(buildCardTool(seam).presentCall?.({}), undefined);
    // Validated args present the execute card with both files named.
    const card = buildCardTool(seam).presentCall?.(FULL_ARGS);
    assert.ok(card);
    assert.match(String(card.rawInput), /body=\/tmp\/b.glb garment=\/tmp\/g.glb/);
  });

  it("presentationMeta carries ONLY the truth it has", () => {
    const meta = buildCardTool(seam).output.presentationMeta;
    assert.ok(meta, "the tile channel is declared");
    // Nothing but the flow: every optional spread folds away.
    assert.deepEqual(meta({}, {}), { flow: "clothing-placement" });
    // Empty strings are NOT truth.
    assert.deepEqual(meta({}, { run_id: "", draft_id: "" }), { flow: "clothing-placement" });
    // Non-strings are NOT truth either (the channel is typed).
    assert.deepEqual(meta({}, { run_id: 5, draft_id: 7, status: 1 }), { flow: "clothing-placement" });
    // The full canonical value rides verbatim.
    assert.deepEqual(
      meta({}, { run_id: "r1", draft_id: "d1", status: "running", error: "late" }),
      { flow: "clothing-placement", run_id: "r1", draft_id: "d1", status: "running", error: "late" },
    );
    // Mixed: some fields present, some absent.
    assert.deepEqual(meta({}, { draft_id: "d2", status: "queued" }), { flow: "clothing-placement", draft_id: "d2", status: "queued" });
  });

  it("the snake_case draft spelling mints too (the door's two spellings)", async () => {
    draftsStatus = 200; draftsBody = { draft_id: "d_snake" };
    startBody = { run_id: "r_1", status: "queued" };
    const value = (await buildCardTool(seam).execute(FULL_ARGS, exec)) as Record<string, string>;
    assert.equal(value.draft_id, "d_snake");
    assert.equal(calls[1].body.draft_id, "d_snake");
  });

  it("a start-door named refusal resolves canonically (never throws)", async () => {
    draftsStatus = 200; draftsBody = { draftId: "d_ok" };
    const prevStart = startBody;
    startBody = { error: "queue is draining" };
    try {
      const value = (await buildCardTool(seam).execute(FULL_ARGS, exec)) as Record<string, string>;
      assert.equal(value.error, "queue is draining");
    } finally {
      startBody = prevStart;
    }
  });

  it("GatewayError fallbacks: unparseable body, then the status voice", async () => {
    // Body is not JSON → named folds to the raw body.
    const seamRaw: EstateCall = async () => {
      throw new GatewayError(500, "upstream exploded", "InternalError");
    };
    const v1 = (await buildCardTool(seamRaw).execute(FULL_ARGS, exec)) as Record<string, string>;
    assert.equal(v1.error, "upstream exploded");
    // Body parses but carries no error → the raw body still wins.
    const seamJson: EstateCall = async () => {
      throw new GatewayError(422, JSON.stringify({ note: "no error field" }), "Unprocessable");
    };
    const v2 = (await buildCardTool(seamJson).execute(FULL_ARGS, exec)) as Record<string, string>;
    assert.equal(v2.error, JSON.stringify({ note: "no error field" }));
    // Empty body AND empty named → the status voice.
    const seamEmpty: EstateCall = async () => {
      throw new GatewayError(503, "", "Unavailable");
    };
    const v3 = (await buildCardTool(seamEmpty).execute(FULL_ARGS, exec)) as Record<string, string>;
    assert.equal(v3.error, "estate 503");
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
    // The tool-bash shape: the entry calls tools.register directly —
    // no ctx.effect wrapper. The service attaches the returned
    // disposer to the calling plugin itself (tutorial ch.2); our
    // registration must hand it one that retracts.
    const { ctx, stub } = await boot(true);
    const fiber = await ctx.plugin(pkg as unknown as Parameters<typeof ctx.plugin>[0], { call: seam });
    assert.equal(stub!.registered.length, 1, "one tool contribution");
    assert.equal(stub!.registered[0]!.name, TOOL_NAME);
    assert.equal(stub!.disposers.length, 1, "the registration returned a disposer");
    stub!.disposers[0]!();
    assert.equal(stub!.registered.length, 0, "the service's disposer retracts the tool");
    await fiber.dispose();
    await ctx.fiber.dispose();
  });

  it("the registered tool works end-to-end through the stub door", async () => {
    const { ctx, stub } = await boot(true);
    await ctx.plugin(pkg as unknown as Parameters<typeof ctx.plugin>[0], { call: seam });
    calls.length = 0;
    draftsStatus = 200; draftsBody = { draftId: "d_e2e" };
    startBody = { run_id: "r_e2e", status: "queued" };
    const value = (await stub!.registered[0]!.execute(FULL_ARGS, exec)) as Record<string, string>;
    assert.equal(value.run_id, "r_e2e");
    assert.equal(calls[0]!.body.flow, "clothing-placement");
    await ctx.fiber.dispose();
  });

  it("no tools service (the gateway process): the card still registers, no tool", async () => {
    const { ctx } = await boot(false);
    await ctx.plugin(pkg as unknown as Parameters<typeof ctx.plugin>[0], { call: seam });
    const comfy = ctx.get("comfyui") as { cardIds(): string[] };
    assert.ok(comfy.cardIds().includes("clothing-placement"), "card contribution stands");
    await ctx.fiber.dispose();
  });

  it("SCENARIO B — a standalone agent host (tools, NO comfyui): apply runs, the tool registers, no card", async () => {
    // The hard-gate trap this pins: inject = ['comfyui'] would hold
    // the plugin PENDING forever in this host — no card, and CRITICALLY
    // no tool. Both faces optional: each composition takes what it can.
    const { ctx, stub } = await boot(true, false);
    await ctx.plugin(pkg as unknown as Parameters<typeof ctx.plugin>[0], { call: seam });
    assert.ok(ctx.get("comfyui") === undefined, "no engine service in this host");
    assert.equal(stub!.registered.length, 1, "the tool face stands alone");
    assert.equal(stub!.registered[0]!.name, TOOL_NAME);
    await ctx.fiber.dispose();
  });
});
