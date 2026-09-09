// @melite/melite-3d-clothing-placement — the TOOL FACE tests
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
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { Context, Service } from "@deepseek-ai/cordis";
import { ComfyUIService } from "@comfyui/cordis/service";
import { emitParamsSpec } from "@comfyui/cordis/params-emit";
import * as pkg from "../src/index.ts";
import { buildCardTool, TOOL_NAME } from "../src/tool.ts";
import { parameterSchemaSpecToJsonSchema } from "@deepseek-ai/dsh-tools";
import type { ToolDefinition } from "@deepseek-ai/dsh-tools";
import { identity, schema } from "../src/card.ts";


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
  const tool = buildCardTool("http://irrelevant");

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
    const value = (await buildCardTool(baseUrl).execute(
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
    const value = (await buildCardTool(baseUrl).execute(FULL_ARGS, exec)) as Record<string, string>;
    assert.equal(value.error, "cardGate: garment not staged on this estate");
    draftsStatus = 200; draftsBody = { draftId: "d_1" };
  });

  it("a mint without draftId is a refusal value", async () => {
    draftsBody = { ok: true };
    const value = (await buildCardTool(baseUrl).execute(FULL_ARGS, exec)) as Record<string, string>;
    assert.equal(value.error, "card compose returned no draftId");
  });

  it("schema-incomplete args are refused by the contract's own validation", async () => {
    await assert.rejects(
      buildCardTool(baseUrl).execute({ body: "/tmp/b.glb" }, exec),
      /garment|out_path/,
    );
  });

  it("the renderer explains refusals and run ids", () => {
    const tool = buildCardTool(baseUrl);
    const refused = tool.output.render({}, { error: "nope" });
    assert.match(String((refused[0] as { text?: string }).text), /REFUSED: nope/);
    const ran = tool.output.render({}, { run_id: "r_9" });
    assert.match(String((ran[0] as { text?: string }).text), /r_9/);
  });
});

/** The tools-service surface, stubbed to its Consumer-owned shape. */
class StubToolsService extends Service {
  registered: ToolDefinition[] = [];
  constructor(ctx: Context) {
    super(ctx, "tools");
  }
  register(tool: ToolDefinition): () => void {
    this.registered.push(tool);
    return () => {
      const i = this.registered.indexOf(tool);
      if (i >= 0) this.registered.splice(i, 1);
    };
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

  it("registers its tool where the host provides tools; dispose retracts (HMR)", async () => {
    const { ctx, stub } = await boot(true);
    const fiber = await ctx.plugin(pkg as unknown as Parameters<typeof ctx.plugin>[0], { gateway: baseUrl });
    assert.equal(stub!.registered.length, 1, "one tool contribution");
    assert.equal(stub!.registered[0]!.name, TOOL_NAME);
    await fiber.dispose();
    assert.equal(stub!.registered.length, 0, "fiber dispose retracts the tool");
    await ctx.fiber.dispose();
  });

  it("the registered tool works end-to-end through the stub door", async () => {
    const { ctx, stub } = await boot(true);
    await ctx.plugin(pkg as unknown as Parameters<typeof ctx.plugin>[0], { gateway: baseUrl });
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
    await ctx.plugin(pkg as unknown as Parameters<typeof ctx.plugin>[0], { gateway: baseUrl });
    const comfy = ctx.get("comfyui") as { cardIds(): string[] };
    assert.ok(comfy.cardIds().includes("clothing-placement"), "card contribution stands");
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
