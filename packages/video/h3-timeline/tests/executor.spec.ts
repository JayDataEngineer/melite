
// ── the executor battery (TEST-2 breadth, 2026-09-12; the
// clothing-placement pattern): a recording seam drives BOTH doors,
// every canonical-value arm, the render channel, the tile channel,
// and the completed-card presenter. The index face's apply arms
// (comfy present / absent, tools present / absent) ride here too —
// the boot pattern is the tutorial's (services mount as plugins).
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context, Service } from "@deepseek-ai/cordis";
import { ComfyUIService } from "@melite/comfyui-cordis/service";
import { GatewayError, type EstateCall } from "@melite/estate-call";
import type { ToolDefinition, ToolRuntime } from "@deepseek-ai/dsh-tools";
import * as pkg from "../src/index.ts";
import * as cardFace from "../src/card.ts";
import { TOOL_NAME, buildH3TimelineTool as FACE } from "../src/tool.ts";

const DEFAULT_MODEL = "h3-timeline";
const GOOD_ARGS = { prompt: "walks forward, then turns", calls: [{ text: "walks", start_frame: 0, end_frame: 56 }] };

const calls: Array<{ method: string; path: string; body: Record<string, unknown> }> = [];
let n = 0;
let draftsStatus = 200;
let draftsBody: Record<string, unknown> = { draftId: "d_stub" };
let startBody: Record<string, unknown> = { run_id: "r_stub", status: "queued" };

const seam: EstateCall = async (method, path, body) => {
  n += 1; calls[n] = { method, path, body: body as Record<string, unknown> };
  const reply = path === "/v1/flows/drafts"
    ? { status: draftsStatus, body: draftsBody }
    : { status: 200, body: startBody };
  if (reply.status < 200 || reply.status >= 300) {
    const named = (reply.body as { error?: string }).error ?? "door refused";
    throw new GatewayError(reply.status, JSON.stringify(reply.body), named);
  }
  return reply.body;
};

const exec = {
  callId: "t", name: TOOL_NAME, arguments: {}, signal: new AbortController().signal,
  deferContext: () => {}, concludeTurn: () => {}, rootCallId: "t", token: "t",
} as unknown as Parameters<ToolDefinition["execute"]>[1];

const tool = (): ToolDefinition => FACE(seam);

describe("the executor path (two doors, envelope law)", () => {
  it("drafts carry the stage doc naming the model; start lifts params + model + draft_id", async () => {
    draftsStatus = 200; draftsBody = { draftId: "d_9" };
    startBody = { run_id: "r_9", status: "queued" };
    const value = (await tool().execute(GOOD_ARGS, exec)) as Record<string, string>;
    assert.equal(calls[1].path, "/v1/flows/drafts");
    const draft = calls[1].body;
    assert.equal(draft.intent, "h3-timeline");
    const stage = (draft.stages as Array<Record<string, unknown>>)[0]!;
    assert.equal(stage.service, DEFAULT_MODEL, "the unstated model resolves to the boarded default");
    const start = calls[2].body;
    assert.equal(start.draft_id, "d_9");
    assert.equal(start.model, DEFAULT_MODEL);
    assert.deepEqual(value, {
      flow: "h3-timeline", model: DEFAULT_MODEL, draft_id: "d_9", run_id: "r_9", status: "queued",
    });
  });

  it("an EXPLICIT model rides both doors and the canonical value", async () => {
    draftsBody = { draftId: "d_1" };
    startBody = { run_id: "r_1", status: "queued" };
    const value = (await tool().execute({ ...GOOD_ARGS, model: "h3" }, exec)) as Record<string, string>;
    const stage = (calls[3].body.stages as Array<Record<string, unknown>>)[0]!;
    assert.equal(stage.service, "h3");
    assert.equal((calls[4].body as Record<string, unknown>).model, "h3");
    assert.equal(value.model, "h3");
  });

  it("a mint without draftId is a refusal value", async () => {
    draftsBody = { ok: true };
    const value = (await tool().execute(GOOD_ARGS, exec)) as Record<string, string>;
    assert.equal(value.error, "gateway draft POST returned no draftId");
  });

  it("a start-door named refusal resolves canonically", async () => {
    draftsBody = { draftId: "d_ok" };
    startBody = { error: "queue draining" };
    const value = (await tool().execute(GOOD_ARGS, exec)) as Record<string, string>;
    assert.equal(value.error, "queue draining");
  });

  it("a start without run_id is a refusal value", async () => {
    startBody = { status: "queued" };
    const value = (await tool().execute(GOOD_ARGS, exec)) as Record<string, string>;
    assert.equal(value.error, "gateway start returned no run_id");
  });

  it("a start without status folds to queued", async () => {
    startBody = { run_id: "r_s" };
    const value = (await tool().execute(GOOD_ARGS, exec)) as Record<string, string>;
    assert.equal(value.status, "queued");
  });

  it("GatewayError fallbacks: named, then body, then the status voice", async () => {
    draftsBody = { draftId: "d_g" };
    const named: EstateCall = async () => { throw new GatewayError(422, "raw-body", "named-refusal"); };
    const v1 = (await FACE(named).execute(GOOD_ARGS, exec)) as Record<string, string>;
    assert.equal(v1.error, "named-refusal");
    const bodyOnly: EstateCall = async () => { throw new GatewayError(500, "exploded", ""); };
    const v2 = (await FACE(bodyOnly).execute(GOOD_ARGS, exec)) as Record<string, string>;
    assert.equal(v2.error, "exploded");
    const neither: EstateCall = async () => { throw new GatewayError(503, "", ""); };
    const v3 = (await FACE(neither).execute(GOOD_ARGS, exec)) as Record<string, string>;
    assert.equal(v3.error, "estate 503");
  });
});

  it("a pre-aborted signal aborts (cancellation propagates, never a refusal)", async () => {
    const ac = new AbortController();
    ac.abort();
    const dead: EstateCall = async () => { throw new Error("never dialed"); };
    await assert.rejects(
      FACE(dead).execute(GOOD_ARGS, { ...exec, signal: ac.signal } as never),
      /aborted/i,
    );
  });

  it("transport failures resolve canonically (jsonLane wraps status 0)", async () => {
    // jsonLane's contract: every transport fault becomes a
    // GatewayError(0, message, "") — one canonical arm, message as
    // the refusal body.
    const dead: EstateCall = async () => { throw new Error("socket hang up"); };
    const value = (await FACE(dead).execute(GOOD_ARGS, exec)) as Record<string, string>;
    assert.equal(value.error, "socket hang up");
  });

  it("an undefined value is the empty tile (the replay arm)", () => {
    assert.deepEqual(tool().output.presentationMeta!({}, undefined as never), { flow: "h3-timeline", model: "?" });
  });

  it("empty-string meta fields are not truth at the presenter", () => {
    const t2 = tool();
    const refused = t2.presentResult?.(GOOD_ARGS, { meta: { model: "", error: "x" } } as never);
    assert.match(String(refused?.title), /\[\?\] — REFUSED/);
    const ran = t2.presentResult?.(GOOD_ARGS, { meta: { model: "", run_id: "" } } as never);
    assert.match(String(ran?.title), /\[\?\] → \?/);
  });

  it("the prose names the driving field (the card's own input)", () => {
    // rawInput rides the source's own presentCall return — the lib's
    // ToolCallView does not declare it, so the spec reads through the
    // source's shape (never asserted absent: the prose IS the pin).
    const card = tool().presentCall?.(GOOD_ARGS) as unknown as { rawInput?: unknown };
    assert.match(String(card?.rawInput), /shots=1/);
    // calls may arrive as its serialized JSON string (the
    // annotation-only json param) — the prose counts 0 then.
    const asString = tool().presentCall?.({ ...GOOD_ARGS, calls: JSON.stringify(GOOD_ARGS.calls) }) as unknown as { rawInput?: unknown };
    assert.match(String(asString?.rawInput), /shots=0/);
  });

describe("the render channel (one line, both voices)", () => {
  it("refused names the refusal; ran names the model and run id", () => {
    const t = tool();
    const refused = t.output.render({}, { error: "nope" });
    assert.match(String((refused[0] as { text?: string }).text), /h3_timeline REFUSED: nope/);
    const ran = t.output.render({}, { model: "m1", run_id: "r9" });
    assert.match(String((ran[0] as { text?: string }).text), /h3_timeline \[m1\] → r9 — poll with run_status/);
  });

  it("the empty arms: no model, no run id, no value at all", () => {
    const t = tool();
    const gaps = t.output.render({}, {});
    assert.match(String((gaps[0] as { text?: string }).text), /h3_timeline \[\?\] → \?/);
    const bare = t.output.render({}, undefined as never);
    assert.match(String((bare[0] as { text?: string }).text), /h3_timeline \[\?\] → \?/);
    // a present-but-empty error falls through to the run voice.
    const quiet = t.output.render({}, { error: "" });
    assert.match(String((quiet[0] as { text?: string }).text), /→ \?/);
  });
});

describe("the tile channel (presentationMeta truth table)", () => {
  const meta = (): NonNullable<ToolDefinition["output"]["presentationMeta"]> =>
    tool().output.presentationMeta!;

  it("nothing rides but the flow default and the ? model", () => {
    assert.deepEqual(meta()({}, {}), { flow: "h3-timeline", model: "?" });
  });

  it("empty strings and non-strings are NOT truth", () => {
    assert.deepEqual(meta()({}, { run_id: "", draft_id: "", status: "", error: "" }), { flow: "h3-timeline", model: "?" });
    assert.deepEqual(meta()({}, { run_id: 5, draft_id: 7, model: 9 }), { flow: "h3-timeline", model: "9" }, "the model channel stringifies (unguarded) — the ids are the guarded ones");
  });

  it("the full canonical value rides verbatim", () => {
    assert.deepEqual(
      meta()({}, { flow: "f", model: "m", run_id: "r", draft_id: "d", status: "queued", error: "e" }),
      { flow: "f", model: "m", run_id: "r", draft_id: "d", status: "queued", error: "e" },
    );
  });
});

describe("the completed-card presenter (presentResult reads meta)", () => {
  const t = (): ToolDefinition => tool();

  it("meta-less result → undefined (the raw arm)", () => {
    assert.equal(t().presentResult?.(GOOD_ARGS, {} as never), undefined);
    assert.equal(t().presentResult?.(GOOD_ARGS, { meta: null } as never), undefined);
  });

  it("the refusal arm titles REFUSED with the model", () => {
    const view = t().presentResult?.(GOOD_ARGS, { meta: { model: "m1", error: "x" } } as never);
    assert.match(String(view?.title), /REFUSED/);
    assert.match(String(view?.title), /\[m1\]/);
  });

  it("the run arm carries the label, model, and run id (?-gaps pin)", () => {
    const view = t().presentResult?.(GOOD_ARGS, { meta: { model: "m1", run_id: "r9" } } as never);
    assert.match(String(view?.title), /→ r9/);
    const gaps = t().presentResult?.(GOOD_ARGS, { meta: {} } as never);
    assert.match(String(gaps?.title), /\[\?\] → \?/);
    // non-string meta fields are not truth either.
    const nums = t().presentResult?.(GOOD_ARGS, { meta: { model: 5, run_id: 9 } } as never);
    assert.match(String(nums?.title), /\[\?\] → \?/);
  });
});

describe("presentCall prose (validated args only)", () => {
  it("invalid args never present (the defineTool wrapper law)", () => {
    assert.equal(tool().presentCall?.({}), undefined);
  });

  it("validated args name the resolved model (default when unstated)", () => {
    const card = tool().presentCall?.(GOOD_ARGS) as unknown as { rawInput?: unknown };
    assert.ok(card);
    assert.match(String(card.rawInput), new RegExp("model=" + DEFAULT_MODEL + "(\\s|$)"));
    const explicit = tool().presentCall?.({ ...GOOD_ARGS, model: "h3" }) as unknown as { rawInput?: unknown };
    assert.match(String(explicit?.rawInput), /model=h3\s/);
  });
});

/** The tools-service surface stub (the Consumer-owned shape). */
class StubToolsService extends Service {
  registered: ToolDefinition[] = [];
  constructor(ctx: Context) { super(ctx, "tools"); }
  register(tool: ToolDefinition): () => void {
    this.registered.push(tool);
    return () => {
      const i = this.registered.indexOf(tool);
      if (i >= 0) this.registered.splice(i, 1);
    };
  }
}

describe("the dual-face law: the root is the row-mount marker", () => {
  it("comfy AND tools present → the marker still registers NOTHING (the SSOT and melite-tools own the truths)", async () => {
    const ctx = new Context();
    // The second arg is the plugin config (absent here): cordis 4.0.2
    // types require it positionally, so the suite passes undefined
    // (cast with the plugin — the `as never` idiom is the estate's).
    await ctx.plugin(ComfyUIService as never, undefined as never);
    await ctx.plugin(StubToolsService as never, undefined as never);
    const svc = ctx.get("comfyui") as unknown as { cardIds(): string[] };
    const stub = ctx.get("tools") as unknown as StubToolsService;
    pkg.apply(ctx);
    assert.ok(!svc.cardIds().includes("h3-timeline"), "no card from the marker");
    assert.equal(stub.registered.length, 0, "no tool from the marker");
  });

  it("the CARD face registers where the registry seat lives (the SSOT subpath)", async () => {
    const ctx = new Context();
    await ctx.plugin(ComfyUIService as never, undefined as never);
    const svc = ctx.get("comfyui") as unknown as { cardIds(): string[] };
    await ctx.plugin(cardFace as never, undefined as never);
    assert.ok(svc.cardIds().includes("h3-timeline"), "the card registered");
  });
});
