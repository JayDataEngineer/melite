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
import { emitParamsSchema } from "@comfyui/cordis/params-emit";
import * as pkg from "../src/index.ts";
import { buildCardTool, type CardToolShape } from "../src/tool.ts";
import { identity, schema } from "../src/card.ts";
import { cardWireName } from "@comfyui/cordis/service";

const WIRE = cardWireName("clothing-placement");

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

const exec = { signal: new AbortController().signal };

describe("single spelling (the emission derives from the card)", () => {
  const tool = buildCardTool("http://irrelevant");

  it("name is the id law's wire name", () => {
    assert.equal(tool.name, "clothing_placement_card");
    assert.equal(tool.name, WIRE);
  });

  it("description is the identity's prose", () => {
    assert.equal(tool.description, identity.description);
  });

  it("parameters are the SAME projection the registry serves", () => {
    const expected = emitParamsSchema(schema as never, []);
    assert.deepEqual(JSON.parse(JSON.stringify(tool.parameters)), JSON.parse(JSON.stringify(expected)));
  });

  it("presentCall claims a generic execute card", () => {
    const card = tool.presentCall({ body: "/tmp/body.glb", garment: "/tmp/hat.glb" });
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
    const value = await buildCardTool(baseUrl).execute(
      { body: "/tmp/b.glb", garment: "/tmp/g.glb", out_path: "/tmp/out.glb" }, exec,
    );
    assert.equal(calls.length, 2, "exactly two doors");
    assert.equal(calls[0].path, "/v1/flows/drafts");
    assert.equal(calls[0].body.flow, "clothing-placement", "the card id is the flow name");
    assert.equal(calls[0].body.body, "/tmp/b.glb", "params ride the compose envelope");
    assert.equal(calls[1].path, "/v1/flows/start");
    assert.equal(calls[1].body.draft_id, "d_77", "the minted draft rides the start envelope");
    assert.deepEqual(value, { flow: "clothing-placement", draft_id: "d_77", run_id: "r_9", status: "queued" });
  });

  it("a named refusal is a CANONICAL value, never a throw", async () => {
    draftsStatus = 422; draftsBody = { error: "cardGate: garment missing" };
    const value = await buildCardTool(baseUrl).execute({ body: "/tmp/b.glb" }, exec);
    assert.equal(value.error, "cardGate: garment missing");
    draftsStatus = 200; draftsBody = { draftId: "d_1" };
  });

  it("a mint without draftId is a refusal value", async () => {
    draftsBody = { ok: true };
    const value = await buildCardTool(baseUrl).execute({ body: "/tmp/b.glb" }, exec);
    assert.equal(value.error, "card compose returned no draftId");
  });

  it("the renderer explains refusals and run ids", () => {
    const tool = buildCardTool(baseUrl);
    const refused = tool.output.render({}, { error: "nope" });
    assert.match(refused[0]!.text, /REFUSED: nope/);
    const ran = tool.output.render({}, { run_id: "r_9" });
    assert.match(ran[0]!.text, /r_9/);
  });
});

/** The tools-service surface, stubbed to its Consumer-owned shape. */
class StubToolsService extends Service {
  registered: CardToolShape[] = [];
  constructor(ctx: Context) {
    super(ctx, "tools");
  }
  register(tool: CardToolShape): () => void {
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
  const boot = async (withTools: boolean) => {
    const ctx = new Context();
    await ctx.plugin(ComfyUIService);
    let stub: StubToolsService | undefined;
    if (withTools) {
      await ctx.plugin(StubToolsService);
      stub = ctx.get("tools") as StubToolsService;
    }
    return { ctx, stub };
  };

  it("registers its tool where the host provides tools; dispose retracts (HMR)", async () => {
    const { ctx, stub } = await boot(true);
    const fiber = await ctx.plugin(pkg as unknown as Parameters<typeof ctx.plugin>[0], { gateway: baseUrl });
    assert.equal(stub!.registered.length, 1, "one tool contribution");
    assert.equal(stub!.registered[0]!.name, WIRE);
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
    const value = await stub!.registered[0]!.execute({ body: "/tmp/b.glb", garment: "/tmp/g.glb" }, exec);
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
});
