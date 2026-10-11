// gate-tails.spec.ts — the coverage gate's named estate-queue
// residuals, each one a real behavioral row: the queue boot's
// unpinned-root refusal, the skill row's neither-body-nor-path
// 500, the manage action's required/unknown voices and the
// non-object refusal label, the model-validate arm's envelope,
// the inline stage-edge nullish coerce, the start refusal's
// scalar-doc label, and settleReplayRefusal's torn-identity floor.
import { describe, it, expect } from "vitest";
import { Context, Service } from "@deepseek-ai/cordis";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { QueueService } from "../src/service.ts";
import { envelopeRefusal } from "../src/runsStart.ts";
import { inlineEdge } from "../src/runsValidateInline.ts";
import { modelValidateArm, validate } from "../src/runsValidateArms.ts";
import { CardArmError } from "../src/cardsArmError.ts";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { FlowsSeatService, plainStage, type RegistryFlow } from "../src/flowsData.ts";
import { applyFlowParamsOverride, overlayAtomFor } from "../src/flowsParamsOverlay.ts";
import { CARD_PLANE_ENGINE } from "@melite/contracts/benchStage";

describe("QueueService's unpinned-root law", () => {
  it("no repoRoot and no stateRoot in config refuses at boot, loud (J12: the env seam is gone)", async () => {
    // The retired seam must NOT pin the root even when set —
    // config is the only spelling (the negative control).
    const had = process.env["MELITE_STATE_ROOT"];
    process.env["MELITE_STATE_ROOT"] = "/tmp/ghost-root-j12";
    const ctx = new Context();
    new FlowsSeatService(ctx);
    try {
      new QueueService(ctx);
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/runs state root is unpinned/);
      expect((e as Error).message).toMatch(/stateRoot \(an absolute tree\) or repoRoot/);
    } finally {
      if (had !== undefined) process.env["MELITE_STATE_ROOT"] = had;
      else delete process.env["MELITE_STATE_ROOT"];
      await ctx.fiber.dispose();
    }
  });
});

describe("envelopeRefusal's scalar labels", () => {
  it("a non-array scalar doc labels its typeof (the ternary's left arm)", () => {
    expect(envelopeRefusal("not-object", "flat").payload["got"]).toBe("string");
    expect(envelopeRefusal("not-object", 7).payload["got"]).toBe("number");
  });
});

describe("inlineEdge's nullish stage members", () => {
  it("nullish stage/output members toll the empty string", () => {
    expect(inlineEdge("w", { stage: null, output: "out" })).toEqual({ kind: "stage", stage: "", output: "out" });
    expect(inlineEdge("w", { stage: "a", output: null })).toEqual({ kind: "stage", stage: "a", output: "" });
  });
});

describe("modelValidateArm (the model envelope)", () => {
  it("a model-less body refuses with the id law's voice", async () => {
    // The arm's status domain is {200, 400} — every return is a
    // literal — so accepting 500 tested nothing, and accepting 200
    // let a wrongly-admitted model-less body pass. `model` is a door
    // key, so the walk reaches the FLOW_ID_RE refusal with an empty
    // name: that IS the strict voice this case claims to probe.
    const ctx = new Context();
    new FlowsSeatService(ctx);
    // the minimal registry stub (J12: the seat's stateRoots manifest
    // is the dangling sweep's call data — no refs in this body, so
    // the empty manifest is the honest pin)
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
      modelFacts: (): unknown => { throw new Error("no facts"); },
      stateRoots: (): string[] => [],
    };
    const ans = await modelValidateArm({ model: undefined } as Record<string, unknown>, ctx);
    expect(ans.status).toBe(400);
    expect((ans.payload as { code?: string }).code).toBe("invalid_request");
    expect((ans.payload as { error?: string }).error).toMatch(/is not a legal identifier/);
    await ctx.fiber.dispose();
  });

  it("a CARD id composes through the {model:} door — the Run press's own shape (2026-10-08, the mask correction's correction)", async () => {
    // the fake-seat pattern (runs-registry-reconcile's rig): a
    // minimal registry stub — facts absent (the door's degrade,
    // handed to prepareCardParams as the explicit facts arg), the
    // decls table carrying the CARD row, the compose stub
    // answering the card-unit path (the live lane owns the real
    // compose proof).
    const ctx = new Context();
    new FlowsSeatService(ctx);
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
      modelFacts: (): unknown => { throw new Error("no facts"); },
      resolveCardFamily: (mid: string): string => mid,
      modelMids: (): unknown => new Set<string>(),
      cardDecls: (): unknown => ({ mask: {} }),
      composeValidateCard: (): Promise<unknown> => Promise.resolve(null),
      stateRoots: (): string[] => [],
    };
    const ans = await modelValidateArm({ model: "mask", params: {} }, ctx);
    expect(ans.status).toBe(200);
    const payload = ans.payload as { ok?: boolean; model?: string; card?: boolean };
    expect(payload.ok).toBe(true);
    expect(payload.model).toBe("mask");
    expect(payload.card).toBe(true);
    await ctx.fiber.dispose();
  });

  // THE ONE-ADMISSION LAW (commission 018's self-critique,
  // 2026-09-25): the inline validate arm composes card stages
  // through the registry's phase1Card — the same walk the start
  // door rides. A schema pass is no longer a runnable promise.
  const cardStage = (params: Record<string, unknown>): Record<string, unknown> => ({
    id: "s_0", engine: "comfyui", inputs: {}, outputs: { out: "image" }, expected: {},
    card: "tts", card_io: { out: "image" }, skip_when: null, params, description: "d",
  });
  // a legal stage row that is NOT a card stage: the walk's filter
  // must skip it (plain engine stages compose through the engine)
  const plainStage = (): Record<string, unknown> => {
    const row = cardStage({});
    row["id"] = "s_plain";
    delete row["card"];
    delete row["card_io"];
    delete row["skip_when"];
    return row;
  };
  const regWith = (phase1Card: unknown, prime: boolean): Record<string, unknown> => ({
    defsSync: (): unknown => new Map([
      ["tts", { requiresModel: true, schema: (p: unknown): unknown => p }],
    ]),
    primeObjectInfo: (): Promise<boolean> => Promise.resolve(prime),
    phase1Card,
  });

  it("a schema-passing stage that refuses at compose fails VALIDATE with the stage's voice (018's law)", async () => {
    const ctx = new Context();
    new FlowsSeatService(ctx);
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = regWith(
      (): Promise<unknown> => Promise.reject(
        new CardArmError(400, "card_compose phase 1: $.ref_audio resolves to no estate file", "card_compose"),
      ),
      true,
    );
    try {
      await expect(validate(
        { flow_inline: { id: "bench", stages: [cardStage({ model: "qwen3-tts", text: "hi", ref_audio: "/v1/assets/runs/run-x/ghost.flac" })] } },
        new AbortController().signal,
        ctx,
      )).rejects.toMatchObject({
        message: expect.stringContaining('"s_0"'),
      });
      // the refusal voice carries the compose law, not just schema
      await validate(
        { flow_inline: { id: "bench", stages: [cardStage({ model: "qwen3-tts", text: "hi", ref_audio: "/v1/assets/runs/run-x/ghost.flac" })] } },
        new AbortController().signal,
        ctx,
      ).catch((e: unknown) => {
        expect((e as Error).message).toContain("resolves to no estate file");
      });
    } finally {
      await ctx.fiber.dispose();
    }
  });

  it("an unreachable engine degrades to the named note, never a closed refusal (bench seat law)", async () => {
    const ctx = new Context();
    new FlowsSeatService(ctx);
    let composed = false;
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = regWith(
      (): Promise<unknown> => { composed = true; return Promise.resolve({}); },
      false,
    );
    try {
      const out = await validate(
        { flow_inline: { id: "bench", stages: [cardStage({ model: "qwen3-tts", text: "hi" })] } },
        new AbortController().signal,
        ctx,
      ) as Record<string, unknown>;
      expect(out["ok"]).toBe(true);
      expect(String(out["note"])).toContain("compose walk skipped");
      expect(composed).toBe(false);
    } finally {
      await ctx.fiber.dispose();
    }
  });

  it("THE WALK-SHAPE LAWS: non-card rows, a non-string model, a foreign throw, and an uncomposable seat each say what they did", async () => {
    // 1. legal NON-card stages are skipped, never composed
    {
      const ctx = new Context();
      new FlowsSeatService(ctx);
      let composed = false;
      (ctx as unknown as { cardRegistry: unknown }).cardRegistry = regWith(
        (): Promise<unknown> => { composed = true; return Promise.resolve({}); },
        true,
      );
      try {
        const out = await validate(
          { flow_inline: { id: "bench", stages: [plainStage(), { ...plainStage(), id: "s_blank", card: "" }] } },
          new AbortController().signal,
          ctx,
        ) as Record<string, unknown>;
        expect(out["ok"]).toBe(true);
        expect(out["note"]).toBeUndefined();
        expect(composed).toBe(false);
        // and a NON-object row refuses in the DOOR's own voice, never a
        // TypeError over it (2026-09-25: Object.keys(null) crashed)
        for (const bad of [null, 42, "text", ["s"]]) {
          await expect(validate(
            { flow_inline: { id: "bench", stages: [bad] } },
            new AbortController().signal,
            ctx,
          )).rejects.toThrow(/is not an object|must be an object/);
        }
        expect(composed).toBe(false);
      } finally {
        await ctx.fiber.dispose();
      }
    }
    // 2. a NON-STRING model row (the card gate only demands presence)
    // composes against the CARD name, never an empty or numeric mid
    {
      const ctx = new Context();
      new FlowsSeatService(ctx);
      const mids: string[] = [];
      (ctx as unknown as { cardRegistry: unknown }).cardRegistry = regWith(
        (body: Record<string, unknown>, mid: string): Promise<unknown> => {
          mids.push(mid);
          expect(body["model"]).toBe("tts");
          return Promise.resolve({});
        },
        true,
      );
      try {
        const out = await validate(
          { flow_inline: { id: "bench", stages: [cardStage({ model: 5 })] } },
          new AbortController().signal,
          ctx,
        ) as Record<string, unknown>;
        expect(out["ok"]).toBe(true);
        expect(mids).toEqual(["tts"]);
      } finally {
        await ctx.fiber.dispose();
      }
    }
    // 3. a FOREIGN throw (not a CardArmError) is re-thrown as itself —
    // the walk never rewrites another layer's bug as a refusal
    {
      const ctx = new Context();
      new FlowsSeatService(ctx);
      (ctx as unknown as { cardRegistry: unknown }).cardRegistry = regWith(
        (): Promise<unknown> => Promise.reject(new TypeError("compose blew up")),
        true,
      );
      try {
        await expect(validate(
          { flow_inline: { id: "bench", stages: [cardStage({ model: "qwen3-tts" })] } },
          new AbortController().signal,
          ctx,
        )).rejects.toBeInstanceOf(TypeError);
      } finally {
        await ctx.fiber.dispose();
      }
    }
    // 4. AN UNPRIMED ENGINE leaves validate usable: the walk reports
    // the schema-only note rather than refusing a bench seat. (A
    // registry that cannot even DEFINE the schema is the door's own
    // LOUD miswire — inlineArm refuses it before the walk is
    // reached.) The registry is a CardRegistryService shape: the
    // walk's own guard for a half-built seat is gone, because the
    // service always carries both methods and a wall for an
    // unreachable arm is a lie.
    const ctx = new Context();
    new FlowsSeatService(ctx);
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = regWith(
      (): Promise<unknown> => Promise.resolve({}),
      false,
    );
    try {
      const out = await validate(
        { flow_inline: { id: "bench", stages: [cardStage({ model: "qwen3-tts" })] } },
        new AbortController().signal,
        ctx,
      ) as Record<string, unknown>;
      expect(out["ok"]).toBe(true);
    } finally {
      await ctx.fiber.dispose();
    }
  });

  it("a clean compose answers the plain 200 payload (no note key)", async () => {
    const ctx = new Context();
    new FlowsSeatService(ctx);
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = regWith(
      (): Promise<unknown> => Promise.resolve({}),
      true,
    );
    try {
      const out = await validate(
        { flow_inline: { id: "bench", stages: [cardStage({ model: "qwen3-tts", text: "hi" })] } },
        new AbortController().signal,
        ctx,
      ) as Record<string, unknown>;
      expect(out["ok"]).toBe(true);
      expect(out["note"]).toBeUndefined();
    } finally {
      await ctx.fiber.dispose();
    }
  });

  it("an unknown id keeps the catalog voice (the card-aware arm widens nothing)", async () => {
    const ctx = new Context();
    new FlowsSeatService(ctx);
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
      modelFacts: (): unknown => { throw new Error("no facts"); },
      resolveCardFamily: (mid: string): string => mid,
      modelMids: (): unknown => new Set<string>(),
      cardDecls: (): unknown => ({}),
      stateRoots: (): string[] => [],
    };
    const ans = await modelValidateArm({ model: "not-a-card", params: {} }, ctx);
    expect(ans.status).toBe(400);
    const err = String((ans.payload as { error?: string }).error ?? "");
    expect(err).toContain("no .catalog.models row not-a-card");
    expect(err).not.toContain("is a CARD");
    await ctx.fiber.dispose();
  });
});

// 2026-10-16 — the coverage queue's runsValidateArms batch: the
// {flow:} shim's compose refusals. The shim expands a registry flow
// and composes its family stages BEFORE the inline compile; every
// refusal the interpreter raises becomes the door's
// runs/invalid-request at loc "stages".
describe("the {flow:} shim's compose refusals (2026-10-16, the coverage queue's runsValidateArms batch)", () => {
  const state = mkdtempSync(join(tmpdir(), "flowshim-"));

  /** The families seat rides a real cordis Service — ctx.get resolves
   *  only injector-registered services (the rig in
   *  runs-registry-doors). */
  class BareSeat extends Service {
    constructor(ctx: Context) {
      super(ctx, "models");
    }
    allDecls(): unknown[] {
      return [];
    }
  }
  class OfflineSeat extends Service {
    constructor(ctx: Context) {
      super(ctx, "models");
    }
    allDecls(): never {
      // a non-Error throw: the door folds what the seat raised with
      // `e instanceof Error ? e.message : String(e)`, and only a
      // non-Error reaches the String half.
      throw "models seat offline";
    }
  }
  const ctxWith = (Seat: new (ctx: Context) => Service): Context => {
    const ctx = new Context();
    new FlowsSeatService(ctx);
    (ctx as unknown as { queue: unknown }).queue = { stateRoot: state, stateRoots: [state] };
    // the shim refuses before the inline compile; the registry is
    // here only so the seat is the shape the door documents.
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
      defsSync: (): unknown => new Map(),
      primeObjectInfo: async (): Promise<boolean> => true,
      phase1Card: async (): Promise<unknown> => ({}),
    };
    new Seat(ctx);
    return ctx;
  };
  const refusal = async (
    Seat: new (ctx: Context) => Service,
  ): Promise<RemoteError<"runs/invalid-request">> => {
    const ctx = ctxWith(Seat);
    try {
      await validate({ flow: "anny-hmr-commercial" }, new AbortController().signal, ctx);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RemoteError);
      return e as RemoteError<"runs/invalid-request">;
    } finally {
      await ctx.fiber.dispose();
    }
  };

  it("a family the models seat cannot name refuses at stages with the interpreter's own voice", async () => {
    // anny-hmr-commercial is a family verb (family anny, action
    // estimate_commercial): a mounted seat serving ZERO families is
    // the "bare mount" condition, and its repair text rides the
    // door's refusal verbatim.
    const err = await refusal(BareSeat);
    expect(err.code).toBe("runs/invalid-request");
    expect(err.details.loc).toBe("stages");
    expect(err.message).toMatch(/ZERO families/);
  });

  it("an unanswering seat (a non-Error throw) folds through String(e) — never a lost or empty voice", async () => {
    const err = await refusal(OfflineSeat);
    expect(err.code).toBe("runs/invalid-request");
    expect(err.details.loc).toBe("stages");
    expect(err.message).toBe("models seat offline");
  });
});

// 2026-10-11 — round-21 flows audit F1: the params door rides
// validate. The shim now applies the SAME overlay the start door
// applies (flowsParamsOverlay's applyFlowParamsOverride), so a
// request start would refuse refuses HERE with the same voice —
// never validate green and 400 at start.
describe("the {flow:} shim rides the params door (round-21 flows audit F1)", () => {
  const state = mkdtempSync(join(tmpdir(), "flowparams-"));

  const probeFlow = (): RegistryFlow => ({
    id: "params-probe",
    description: "the params door's validate-side probe",
    stages: [plainStage({
      id: "gen",
      engine: CARD_PLANE_ENGINE,
      card: "image-gen",
      family: "",
      action: "",
      description: "the gen stage",
      inputs: {},
      params: {},
    })],
    initialValidators: {},
    tool: null,
    skillRefs: [],
  });

  const ctxWith = (decls: Record<string, unknown>): Context => {
    const ctx = new Context();
    new FlowsSeatService(ctx).register(probeFlow());
    (ctx as unknown as { queue: unknown }).queue = { stateRoot: state, stateRoots: [state] };
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
      cardDecls: () => decls,
      defsSync: (): unknown => new Map(),
      primeObjectInfo: async (): Promise<boolean> => true,
      phase1Card: async (): Promise<unknown> => ({}),
    };
    return ctx;
  };

  it("a params key no stage admits refuses at validate with the start door's own voice", async () => {
    const ctx = ctxWith({});
    try {
      await validate({ flow: "params-probe", params: { nope: 1 } }, new AbortController().signal, ctx);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RemoteError);
      const err = e as RemoteError<"runs/invalid-request">;
      expect(err.code).toBe("runs/invalid-request");
      expect(err.details.loc).toBe("params");
      expect(err.message).toBe(
        'no stage of flow params-probe admits param "nope" — a flat params value ' +
        'needs exactly one admitting stage; target a stage with {stage_id: {nope: …}} or drop the key',
      );
    } finally {
      await ctx.fiber.dispose();
    }
  });

  it("a stage-targeted param the card does not admit refuses naming the shared surface", async () => {
    const ctx = ctxWith({});
    try {
      await validate({ flow: "params-probe", params: { gen: { nope: 1 } } }, new AbortController().signal, ctx);
      expect.unreachable();
    } catch (e) {
      const err = e as RemoteError<"runs/invalid-request">;
      expect(err.code).toBe("runs/invalid-request");
      expect(err.details.loc).toBe("params");
      expect(err.message).toBe('card "image-gen" does not admit param "nope" (admitted: [])');
    } finally {
      await ctx.fiber.dispose();
    }
  });
});

// 2026-10-11 — round-22 compose audit Q3a (OVERLAY-ATOM-FOLD): the
// overlay's mod fold spanned the card's families with no scoping, so
// a family-A mod key admitted on a run at family B — the overlay
// greened what compose refuses, two refusals for one body. The fold
// now scopes to the row's owning atom (compose's `if
// (!a.families.includes(envelopeAtom)) continue` fold); the routing
// decision is pinned here — the fold itself rides the booted models
// service, never present in the test fiber.
// 2026-10-11 — round-23 family-compose audit Q1 (unifyOverlayPoint):
// start overlays params BEFORE its initials gate and family-compose;
// validate rode the overlay AFTER compose, so a body tripping both
// gates got params-voice at start and stages-voice at validate. The
// shim now overlays the expanded rows at the start arm's seam — the
// matrix below pins the order on a family flow that trips both.
describe("the overlay and compose gates answer in the start door's order (round-23 audit Q1)", () => {
  const state = mkdtempSync(join(tmpdir(), "floworder-"));

  class BareSeat extends Service {
    constructor(ctx: Context) {
      super(ctx, "models");
    }
    allDecls(): unknown[] {
      return [];
    }
  }

  const familyProbe = (): RegistryFlow => ({
    id: "order-probe",
    description: "the overlay/compose order probe",
    stages: [plainStage({
      id: "fam",
      engine: CARD_PLANE_ENGINE,
      card: "",
      family: "anny",
      action: "estimate_commercial",
      description: "the family stage",
      inputs: {},
      params: {},
    })],
    initialValidators: {},
    tool: null,
    skillRefs: [],
  });

  const ctxWith = (): Context => {
    const ctx = new Context();
    new FlowsSeatService(ctx).register(familyProbe());
    (ctx as unknown as { queue: unknown }).queue = { stateRoot: state, stateRoots: [state] };
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
      cardDecls: (): Record<string, unknown> => ({}),
      defsSync: (): unknown => new Map(),
      primeObjectInfo: async (): Promise<boolean> => true,
      phase1Card: async (): Promise<unknown> => ({}),
    };
    new BareSeat(ctx);
    return ctx;
  };

  it("a body tripping both gates voices params first — the start arm's order, both doors", async () => {
    // The bare models seat would refuse compose ("ZERO families"),
    // and the overlay refuses "nope" — start answers the overlay
    // (its overlay precedes compose); validate must answer the same.
    const ctx = ctxWith();
    try {
      await validate({ flow: "order-probe", params: { nope: 1 } }, new AbortController().signal, ctx);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RemoteError);
      const err = e as RemoteError<"runs/invalid-request">;
      expect(err.code).toBe("runs/invalid-request");
      expect(err.details.loc).toBe("params");
      // The message follows the round-23 audit Q2 family voice (the
      // probe flow is family-only); the arm pins the ORDER — params
      // before stages, the start arm's sequence.
      expect(err.message).toBe(
        'no stage of flow order-probe admits param "nope" — its family stage ' +
        '"fam" ("anny"."estimate_commercial") takes initials, not params',
      );
    } finally {
      await ctx.fiber.dispose();
    }
  });

  it("with params clean, the same body still refuses at stages — the second gate lives", async () => {
    const ctx = ctxWith();
    try {
      await validate({ flow: "order-probe" }, new AbortController().signal, ctx);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RemoteError);
      const err = e as RemoteError<"runs/invalid-request">;
      expect(err.details.loc).toBe("stages");
      expect(err.message).toMatch(/ZERO families/);
    } finally {
      await ctx.fiber.dispose();
    }
  });

  it("a flat param on a family-only flow refuses with the family voice, never card \"\" (round-23 audit Q2)", async () => {
    const ctx = ctxWith();
    try {
      await validate({ flow: "order-probe", params: { bone: 1 } }, new AbortController().signal, ctx);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RemoteError);
      const err = e as RemoteError<"runs/invalid-request">;
      expect(err.details.loc).toBe("params");
      expect(err.message).toBe(
        'no stage of flow order-probe admits param "bone" — its family stage ' +
        '"fam" ("anny"."estimate_commercial") takes initials, not params',
      );
    } finally {
      await ctx.fiber.dispose();
    }
  });

  it("a stage-targeted param at a family stage refuses naming the verb, never card \"\"", async () => {
    const ctx = ctxWith();
    try {
      await validate(
        { flow: "order-probe", params: { fam: { bone: 1 } } },
        new AbortController().signal,
        ctx,
      );
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RemoteError);
      const err = e as RemoteError<"runs/invalid-request">;
      expect(err.details.loc).toBe("params");
      expect(err.message).toBe(
        'stage "fam" of flow order-probe is a family stage ("anny"."estimate_commercial") ' +
        "— family stages take initials, not params; drop the key",
      );
    } finally {
      await ctx.fiber.dispose();
    }
  });
});

// 2026-10-11 — round-22 compose audit Q5d (OVERLAY-POSITIVE-WALL):
// the F1 params walls were one-sided — every arm asserted a refusal,
// so a mutation that broke the overlay's POSITIVE contract (the
// write itself) stayed green. These arms drive the overlay directly
// and assert the mutated rows.
describe("the params overlay's positive arms (round-22 compose audit Q5d)", () => {
  const row = (over: Partial<Record<string, unknown>> = {}): Record<string, unknown> => ({
    id: "gen",
    card: "image-gen",
    family: "",
    params: {},
    ...over,
  });
  const decls = {
    "image-gen": { schemaNames: ["prompt", "seed"], admits: [], boarded: [] },
    "caption-gen": { schemaNames: ["seed"], admits: [], boarded: [] },
  };

  it("a flat known-good key lands on exactly the one admitting stage", () => {
    const a = row({ id: "gen" });
    const b = row({ id: "other", card: "caption-gen", params: { seed: 1 } });
    applyFlowParamsOverride("probe", [a, b], { prompt: "hi" }, decls as never, "");
    expect(a.params).toEqual({ prompt: "hi" });
    expect(b.params).toEqual({ seed: 1 });
  });

  it("a stage-targeted known-good key lands verbatim on that stage", () => {
    const a = row();
    applyFlowParamsOverride("probe", [a], { gen: { prompt: "hi", seed: 7 } }, decls as never, "");
    expect(a.params).toEqual({ prompt: "hi", seed: 7 });
  });
});

describe("the overlay's atom fold (round-22 compose audit Q3a)", () => {
  it("the request's model seat scopes outright — even a multi-family card", () => {
    expect(overlayAtomFor(["fam-a", "fam-b"], "qwen3-tts")).toBe("qwen3-tts");
  });

  it("no seat: a sole boarded family scopes the surface", () => {
    expect(overlayAtomFor(["image-gen"], "")).toBe("image-gen");
  });

  it("no seat: a multi-family card stays unscoped — compose's selector to refuse", () => {
    expect(overlayAtomFor(["fam-a", "fam-b"], "")).toBe("");
  });

  it("no seat and no boarded families stays unscoped", () => {
    expect(overlayAtomFor([], "")).toBe("");
  });
});
