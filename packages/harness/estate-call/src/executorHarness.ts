// executorHarness.ts — THE EXECUTOR BATTERY (cruft audit row 10,
// 2026-10-12). Six per-card executor specs replicated one
// gateway-transport harness 267-275 lines at a time (1,627 total;
// every pair shares 223-243 lines — measured). This is the test
// plane's twin of cardTool.ts: the builder absorbed the tool
// skeleton, this absorbs the spec skeleton around it.
//
// WHAT THE HARNESS OWNS (identical for every card executor):
//   the recording seam (drafts/start status bodies under mutable
//   controls), the exec stub, the envelope arms (mint, named
//   refusals, missing run_id, status fold, GatewayError fallbacks,
//   abort, transport), the render channel, the tile truth table,
//   the completed-card presenter, and the presentCall core.
// WHAT THE CARD SPEC STILL OWNS: its builder + args + models, the
// draft intent it asserts, its driving-field prose, any variant
// rows (tts), and its index/apply face (h3's dual-face law).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GatewayError, type EstateCall } from "./estateCall.ts";
import type { ToolDefinition } from "@deepseek-ai/dsh-tools";

/** One recorded gateway call, as the seam logs it. */
export interface RecordedCall {
  method: string;
  path: string;
  body: Record<string, unknown>;
}

/** The mutable reply bodies the seam answers from (the spec arms
 *  reassign between rows — the recording seam's controls; both doors
 *  always reply 200, refusal rows speak through an error key).
 * @param draftsBody the drafts door's reply body
 * @param startBody the start door's reply body */
export interface SeamControls {
  draftsBody: Record<string, unknown>;
  startBody: Record<string, unknown>;
}

/** The seam machinery: recording call, controls, exec stub, and the
 *  card's tool under construction. */
export interface ExecutorHarness {
  seam: EstateCall;
  calls: Array<RecordedCall>;
  controls: SeamControls;
  exec: Parameters<ToolDefinition["execute"]>[1];
  tool: () => ToolDefinition;
  goodArgs: Record<string, unknown>;
  defaultModel: string;
}

/** Build the recording seam and the exec stub around a card tool
 *  builder. The seam answers /v1/flows/drafts from the drafts
 *  controls and every other path from startBody — always 200 (the
 *  refusal law rides error keys in the body; the status-throw law
 *  is the GatewayError fallback rows' own).
 * @param makeTool the card's builder (buildMusicTool &c)
 * @param goodArgs the card's minimal valid arguments
 * @param defaultModel the boarded default the unstated model resolves to
 * @returns the harness: seam, calls ledger, controls, exec, tool */
export function executorHarness(
  makeTool: (call: EstateCall) => ToolDefinition,
  goodArgs: Record<string, unknown>,
  defaultModel: string,
): ExecutorHarness {
  const calls: Array<RecordedCall> = [];
  let n = 0;
  const controls: SeamControls = {
    draftsBody: { draftId: "d_stub" },
    startBody: { run_id: "r_stub", status: "queued" },
  };
  const seam: EstateCall = async (method, path, body) => {
    n += 1;
    calls[n] = { method, path, body: body as Record<string, unknown> };
    // The recording seam is a 200-door recorder: refusal rows reply
    // through the BODY (an error key), never a non-2xx status — the
    // status-throw law is the GatewayError fallback rows' own, driven
    // through local seams below.
    return path === "/v1/flows/drafts" ? controls.draftsBody : controls.startBody;
  };
  // The runtime fields beyond signal are never read by the card
  // executors (no deferral on this lane); the cast forgives their
  // absence rather than stubbing two closures nothing would call.
  const exec = {
    callId: "t", name: "t", arguments: {}, signal: new AbortController().signal,
    rootCallId: "t", token: "t",
  } as unknown as Parameters<ToolDefinition["execute"]>[1];
  return { seam, calls, controls, exec, tool: () => makeTool(seam), goodArgs, defaultModel };
}

/** The battery's per-card configuration.
 * @param makeTool the card's tool builder
 * @param goodArgs the card's minimal valid arguments
 * @param defaultModel the boarded default (the unstated resolution)
 * @param explicitModel a second, explicit model address the enum offers
 * @param draftIntent the intent the drafts door must carry
 * @param flow the flow id (envelope value + tile default)
 * @param renderLabel the render prose's card label when it is not the
 *  flow id (the tool-plane names: image_gen, image_edit, h3_timeline)
 * @param drivingField the presentCall prose pin for the card's driving field
 * @param defaultAnchor the default-model prose anchor (h3 pins "(\\s|$)")
 * @param explicitAnchor the explicit-model prose anchor (gen/edit/h3
 *  pin a trailing word boundary "\\s"; the rest match unanchored) */
export interface BatteryConfig {
  makeTool: (call: EstateCall) => ToolDefinition;
  goodArgs: Record<string, unknown>;
  defaultModel: string;
  explicitModel: string;
  draftIntent: string;
  flow: string;
  renderLabel?: string;
  drivingField: RegExp;
  defaultAnchor?: string;
  explicitAnchor?: string;
}

/** Register the five shared describes (envelope, render, tile,
 *  presenter, presentCall) around a card tool. Returns the harness
 *  for the card's own extra rows.
 * @param cfg the per-card configuration
 * @returns the executor harness (seam, calls, controls, exec, tool) */
export function registerExecutorBattery(cfg: BatteryConfig): ExecutorHarness {
  const h = executorHarness(cfg.makeTool, cfg.goodArgs, cfg.defaultModel);
  const { calls, controls, exec, tool, goodArgs, defaultModel } = h;

  describe("the executor path (two doors, envelope law)", () => {
    it("drafts carry the stage doc naming the model; start lifts params + model + draft_id", async () => {
      controls.draftsBody = { draftId: "d_9" };
      controls.startBody = { run_id: "r_9", status: "queued" };
      const value = (await tool().execute(goodArgs, exec)) as Record<string, string>;
      assert.equal(calls[1]!.path, "/v1/flows/drafts");
      const draft = calls[1]!.body;
      assert.equal(draft.intent, cfg.draftIntent);
      const stage = (draft.stages as Array<Record<string, unknown>>)[0]!;
      assert.equal(stage.service, defaultModel, "the unstated model resolves to the boarded default");
      const start = calls[2]!.body;
      assert.equal(start.draft_id, "d_9");
      assert.equal(start.model, defaultModel);
      assert.deepEqual(value, {
        flow: cfg.flow, model: defaultModel, draft_id: "d_9", run_id: "r_9", status: "queued",
      });
    });

    it("an EXPLICIT model rides both doors and the canonical value", async () => {
      controls.draftsBody = { draftId: "d_1" };
      controls.startBody = { run_id: "r_1", status: "queued" };
      const value = (await tool().execute({ ...goodArgs, model: cfg.explicitModel }, exec)) as Record<string, string>;
      const stage = (calls[3]!.body.stages as Array<Record<string, unknown>>)[0]!;
      assert.equal(stage.service, cfg.explicitModel);
      assert.equal((calls[4]!.body as Record<string, unknown>).model, cfg.explicitModel);
      assert.equal(value.model, cfg.explicitModel);
    });

    it("a mint without draftId is a refusal value", async () => {
      controls.draftsBody = { ok: true };
      const value = (await tool().execute(goodArgs, exec)) as Record<string, string>;
      assert.equal(value.error, "gateway draft POST returned no draftId");
    });

    it("a start-door named refusal resolves canonically", async () => {
      controls.draftsBody = { draftId: "d_ok" };
      controls.startBody = { error: "queue draining" };
      const value = (await tool().execute(goodArgs, exec)) as Record<string, string>;
      assert.equal(value.error, "queue draining");
    });

    it("a start without run_id is a refusal value", async () => {
      controls.startBody = { status: "queued" };
      const value = (await tool().execute(goodArgs, exec)) as Record<string, string>;
      assert.equal(value.error, "gateway start returned no run_id");
    });

    it("a start without status folds to queued", async () => {
      controls.startBody = { run_id: "r_s" };
      const value = (await tool().execute(goodArgs, exec)) as Record<string, string>;
      assert.equal(value.status, "queued");
    });

    it("GatewayError fallbacks: named, then body, then the status voice", async () => {
      controls.draftsBody = { draftId: "d_g" };
      const named: EstateCall = async () => { throw new GatewayError(422, "raw-body", "named-refusal"); };
      const v1 = (await cfg.makeTool(named).execute(goodArgs, exec)) as Record<string, string>;
      assert.equal(v1.error, "named-refusal");
      const bodyOnly: EstateCall = async () => { throw new GatewayError(500, "exploded", ""); };
      const v2 = (await cfg.makeTool(bodyOnly).execute(goodArgs, exec)) as Record<string, string>;
      assert.equal(v2.error, "exploded");
      const neither: EstateCall = async () => { throw new GatewayError(503, "", ""); };
      const v3 = (await cfg.makeTool(neither).execute(goodArgs, exec)) as Record<string, string>;
      assert.equal(v3.error, "estate 503");
    });

    it("a pre-aborted signal aborts before the gateway is dialed", async () => {
      const ac = new AbortController();
      ac.abort();
      const dialed = calls.length;
      await assert.rejects(
        cfg.makeTool(h.seam).execute(goodArgs, { ...exec, signal: ac.signal } as never),
        /aborted/i,
      );
      assert.equal(calls.length, dialed, "the seam was never dialed");
    });

    it("transport failures resolve canonically (jsonLane wraps status 0)", async () => {
      // jsonLane's contract: every transport fault becomes a
      // GatewayError(0, message, "") — one canonical arm, message as
      // the refusal body.
      const dead: EstateCall = async () => { throw new Error("socket hang up"); };
      const value = (await cfg.makeTool(dead).execute(goodArgs, exec)) as Record<string, string>;
      assert.equal(value.error, "socket hang up");
    });
  });

  describe("the render channel (one line, both voices)", () => {
    it("refused names the refusal; ran names the model and run id", () => {
      const t = tool();
      const refused = t.output.render({}, { error: "nope" });
      assert.match(String((refused[0] as { text?: string }).text), new RegExp((cfg.renderLabel ?? cfg.flow) + " REFUSED: nope"));
      const ran = t.output.render({}, { model: "m1", run_id: "r9" });
      assert.match(String((ran[0] as { text?: string }).text), new RegExp((cfg.renderLabel ?? cfg.flow) + " \\[m1\\] → r9 — poll with run_status"));
    });

    it("the empty arms: no model, no run id, no value at all", () => {
      const t = tool();
      const gaps = t.output.render({}, {});
      assert.match(String((gaps[0] as { text?: string }).text), new RegExp((cfg.renderLabel ?? cfg.flow) + " \\[\\?\\] → \\?"));
      // the source tolerates undefined though the lib's render signature
      // does not declare it — the pin documents the tolerance.
      const bare = t.output.render({}, undefined as never);
      assert.match(String((bare[0] as { text?: string }).text), new RegExp((cfg.renderLabel ?? cfg.flow) + " \\[\\?\\] → \\?"));
      // a present-but-empty error falls through to the run voice.
      const quiet = t.output.render({}, { error: "" });
      assert.match(String((quiet[0] as { text?: string }).text), /→ \?/);
    });
  });

  describe("the tile channel (presentationMeta truth table)", () => {
    const meta = (): NonNullable<ToolDefinition["output"]["presentationMeta"]> =>
      tool().output.presentationMeta!;

    it("nothing rides but the flow default and the ? model", () => {
      assert.deepEqual(meta()({}, {}), { flow: cfg.flow, model: "?" });
    });

    it("empty strings and non-strings are NOT truth", () => {
      assert.deepEqual(meta()({}, { run_id: "", draft_id: "", status: "", error: "" }), { flow: cfg.flow, model: "?" });
      assert.deepEqual(meta()({}, { run_id: 5, draft_id: 7, model: 9 }), { flow: cfg.flow, model: "9" }, "the model channel stringifies (unguarded) — the ids are the guarded ones");
    });

    it("an undefined value is the empty tile (the replay arm)", () => {
      assert.deepEqual(tool().output.presentationMeta!({}, undefined as never), { flow: cfg.flow, model: "?" });
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
      assert.equal(t().presentResult?.(goodArgs, {} as never), undefined);
      assert.equal(t().presentResult?.(goodArgs, { meta: null } as never), undefined);
    });

    it("the refusal arm titles REFUSED with the model", () => {
      const view = t().presentResult?.(goodArgs, { meta: { model: "m1", error: "x" } } as never);
      assert.match(String(view?.title), /REFUSED/);
      assert.match(String(view?.title), /\[m1\]/);
    });

    it("the run arm carries the label, model, and run id (?-gaps pin)", () => {
      const view = t().presentResult?.(goodArgs, { meta: { model: "m1", run_id: "r9" } } as never);
      assert.match(String(view?.title), /→ r9/);
      const gaps = t().presentResult?.(goodArgs, { meta: {} } as never);
      assert.match(String(gaps?.title), /\[\?\] → \?/);
      // non-string meta fields are not truth either.
      const nums = t().presentResult?.(goodArgs, { meta: { model: 5, run_id: 9 } } as never);
      assert.match(String(nums?.title), /\[\?\] → \?/);
    });

    it("empty-string meta fields are not truth at the presenter", () => {
      const t2 = tool();
      const refused = t2.presentResult?.(goodArgs, { meta: { model: "", error: "x" } } as never);
      assert.match(String(refused?.title), /\[\?\] — REFUSED/);
      const ran = t2.presentResult?.(goodArgs, { meta: { model: "", run_id: "" } } as never);
      assert.match(String(ran?.title), /\[\?\] → \?/);
    });
  });

  describe("presentCall prose (validated args only)", () => {
    it("invalid args never present (the defineTool wrapper law)", () => {
      assert.equal(tool().presentCall?.({}), undefined);
    });

    it("validated args name the resolved model (default when unstated)", () => {
      // rawInput rides the source's own presentCall return — the lib's
      // ToolCallView does not declare it.
      const card = tool().presentCall?.(goodArgs) as unknown as { rawInput?: unknown };
      assert.ok(card);
      assert.match(String(card.rawInput), new RegExp("model=" + defaultModel + (cfg.defaultAnchor ?? "")));
      const explicit = tool().presentCall?.({ ...goodArgs, model: cfg.explicitModel }) as unknown as { rawInput?: unknown };
      assert.match(String(explicit?.rawInput), new RegExp("model=" + cfg.explicitModel + (cfg.explicitAnchor ?? "")));
    });

    it("the prose names the driving field (the card's own input)", () => {
      const card = tool().presentCall?.(goodArgs) as unknown as { rawInput?: unknown };
      assert.match(String(card?.rawInput), cfg.drivingField);
    });
  });

  return h;
}
