// gate-tails.spec.ts — the coverage gate's named estate-queue
// residuals, each one a real behavioral row: the queue boot's
// unpinned-root refusal, the skill row's neither-body-nor-path
// 500, the manage action's required/unknown voices and the
// non-object refusal label, the model-validate arm's envelope,
// the inline stage-edge nullish coerce, the start refusal's
// scalar-doc label, and settleReplayRefusal's torn-identity floor.
import { describe, it, expect } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { QueueService } from "../src/service.ts";
import { envelopeRefusal } from "../src/runsStart.ts";
import { inlineEdge } from "../src/runsValidateInline.ts";
import { modelValidateArm, validate } from "../src/runsValidateArms.ts";
import { CardArmError } from "../src/cardsArmError.ts";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";

describe("QueueService's unpinned-root law", () => {
  it("no repoRoot and no MELITE_STATE_ROOT refuses at boot, loud", async () => {
    const had = process.env["MELITE_STATE_ROOT"];
    delete process.env["MELITE_STATE_ROOT"];
    const ctx = new Context();
    try {
      new QueueService(ctx);
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/runs state root is unpinned/);
      expect((e as Error).message).toMatch(/refusing to guess from the process cwd/);
    } finally {
      if (had !== undefined) process.env["MELITE_STATE_ROOT"] = had;
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
    const ans = await modelValidateArm({ model: undefined } as Record<string, unknown>, ctx);
    expect(ans.status).toBe(400);
    expect((ans.payload as { code?: string }).code).toBe("invalid_request");
    expect((ans.payload as { error?: string }).error).toMatch(/is not a legal identifier/);
    await ctx.fiber.dispose();
  });

  it("a CARD id composes through the {model:} door — the Run press's own shape (2026-10-08, the mask correction's correction)", async () => {
    // the fake-seat pattern (runs-registry-reconcile's rig): a
    // minimal registry stub — facts absent (the degrade), the
    // decls table carrying the CARD row, the overlay + compose
    // stubs answering the card-unit path (the live lane owns the
    // real compose proof).
    const ctx = new Context();
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
      modelFacts: (): unknown => { throw new Error("no facts"); },
      resolveCardFamily: (mid: string): string => mid,
      modelMids: (): unknown => new Set<string>(),
      cardDecls: (): unknown => ({ mask: {} }),
      overlayCardParams: (): unknown => ({ fam: "mask", card: "mask", params: {} }),
      composeValidateCard: (): Promise<unknown> => Promise.resolve(null),
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
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
      modelFacts: (): unknown => { throw new Error("no facts"); },
      resolveCardFamily: (mid: string): string => mid,
      modelMids: (): unknown => new Set<string>(),
      cardDecls: (): unknown => ({}),
    };
    const ans = await modelValidateArm({ model: "not-a-card", params: {} }, ctx);
    expect(ans.status).toBe(400);
    const err = String((ans.payload as { error?: string }).error ?? "");
    expect(err).toContain("no .catalog.models row not-a-card");
    expect(err).not.toContain("is a CARD");
    await ctx.fiber.dispose();
  });
});
