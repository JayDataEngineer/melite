// runs-bench-shapes.spec.ts — the bench-compose and wire-census
// shapes the runs door judges but no wall had built: a card refusal
// that carries its own loc (the bench stage's name rides BESIDE it)
// and a self-wired bench whose census walks junk rows, junk input
// refs and a wire with no output.
import { describe, it, expect, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context, Service } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { RunsRuntimeService } from "../src/runsRegistry.ts";
import { CardArmError } from "../src/cardsRegistry.ts";
import { QueueCore } from "../src/queue.ts";
import type { RunRecord } from "../src/runsTypes.ts";

let TMP = "";
afterEach(() => {
  if (TMP !== "") {
    rmSync(TMP, { recursive: true, force: true });
    TMP = "";
  }
});
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "runs-bench-shapes-"));
  TMP = d;
  return d;
};
const sig = (): AbortSignal => new AbortController().signal;

interface Seat {
  svc: RunsRuntimeService;
  core: QueueCore;
}

class ModelsSeatFake extends Service {
  constructor(ctx: Context) {
    super(ctx, "models");
  }
  allDecls(): unknown[] {
    return [];
  }
}

/** The model-door seat with a phase1/2 compose pair: the graph rides
 *  verbatim. cardOver replaces the card plane's methods; d1Doc is the
 *  bench the draft seat serves at read time. */
const seat = (
  cardOver: Record<string, (...args: never[]) => unknown> = {},
  d1Doc: Record<string, unknown> = {},
  draftReadFails = false,
): Seat => {
  const state = tmp();
  const ctx = new Context();
  const core = new QueueCore();
  (ctx as unknown as { queue: unknown }).queue = { core, stateRoot: state };
  new ModelsSeatFake(ctx);
  // draftReadFails models the draft vanishing BETWEEN the door's
  // existence probe and the bench read: the probe answers, the read
  // that stamps the snapshot does not.
  let reads = 0;
  (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
    get: async (): Promise<unknown> => {
      reads += 1;
      if (draftReadFails && reads > 1) {
        throw new RemoteError("draft/not-found", "no doc", { draftId: "d1" });
      }
      return d1Doc;
    },
  };
  const cards: Record<string, (...args: never[]) => unknown> = {
    objectInfo: (): unknown => null,
    defsSync: (): unknown =>
      new Map([
        [
          "image-gen",
          {
            id: "image-gen",
            boarded: ["m1"],
            flowKinds: { inputs: {}, outputs: { default: "image" }, requiresModel: true },
            schema: (v: unknown): unknown => v,
          },
        ],
        [
          "image-edit",
          {
            id: "image-edit",
            boarded: ["m1"],
            flowKinds: { inputs: {}, outputs: { default: "image" }, requiresModel: true },
            schema: (v: unknown): unknown => v,
          },
        ],
      ]),
    modelFacts: (): unknown => ({ m1: {} }),
    resolveCardFamily: (): unknown => "m1",
    modelMids: (): unknown => new Set<string>(),
    phase1Card: async (): Promise<unknown> => ({ skeleton: "edit", card: "image-edit" }),
    phase2Card: async (): Promise<unknown> => ({
      graph: { workflow: { "1": { class_type: "SaveImage", inputs: {} } } },
      outputs: {},
      outputNodes: {},
    }),
    ...cardOver,
  };
  (ctx as unknown as { cardRegistry: unknown }).cardRegistry = cards;
  const svc = new RunsRuntimeService(ctx);
  return { svc, core };
};

const remote = async (fn: () => Promise<unknown>): Promise<RemoteError> => {
  try {
    await fn();
  } catch (e) {
    assert.ok(e instanceof RemoteError, "a RemoteError, got " + String(e));
    return e as RemoteError;
  }
  throw new Error("never threw");
};

const GRAPH = { workflow: { "1": { class_type: "SaveImage", inputs: {} } } };

describe("the bench-stage refusal that carries its own loc", () => {
  it("the card plane's loc rides BESIDE the bench stage's name", async () => {
    // The bench arm keeps the card arm's evidence whole and adds the
    // stage name: loc, expected and got all survive, because the
    // loc-carry branch reads them off the mapped details.
    const s = seat(
      {
        phase1Card: async (): Promise<unknown> => {
          throw new CardArmError(
            400,
            "lane presence: family 'm1' declares checkpoint 'x.safetensors' but no store copy exists — fetch it: https://example/x",
            "lane_input_missing",
            "params.checkpoint",
            "an existing copy",
            "none",
          );
        },
      },
      {
        stages: [
          { id: "s_0", card: "image-gen", params: { model: "m1", prompt: "x" } },
          {
            id: "s_1",
            card: "image-edit",
            params: { prompt: "x" },
            inputs: { image: { stage: "s_0", output: "default" } },
          },
        ],
      },
    );
    const err = await remote(() =>
      s.svc.start(
        { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
        sig(),
      ),
    );
    const details = (err as unknown as { details?: Record<string, unknown> }).details ?? {};
    assert.match(String(details["loc"]), /^stages\/"s_0" \(params\.checkpoint\)$/);
    assert.equal(details["expected"], "an existing copy");
    assert.equal(details["got"], "none");
  });

  it("an EMPTY loc still names the stage — no empty parens", async () => {
    const s = seat(
      {
        phase1Card: async (): Promise<unknown> => {
          throw new CardArmError(
            400,
            "lane presence: family 'm1' declares checkpoint 'x.safetensors' but no store copy exists — fetch it: https://example/x",
            "lane_input_missing",
            "",
          );
        },
      },
      {
        stages: [
          { id: "s_0", card: "image-gen", params: { model: "m1", prompt: "x" } },
          {
            id: "s_1",
            card: "image-edit",
            params: { prompt: "x" },
            inputs: { image: { stage: "s_0", output: "default" } },
          },
        ],
      },
    );
    const err = await remote(() =>
      s.svc.start(
        { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
        sig(),
      ),
    );
    const details = (err as unknown as { details?: Record<string, unknown> }).details ?? {};
    assert.equal(String(details["loc"]), 'stages/"s_0"');
  });
});

describe("the benches the census does not walk", () => {
  it("a bench whose stages are not an array composes nothing to wire — the run rides the card arm", async () => {
    // The census walks an array of rows; a stages bag that is not an
    // array declares no wires by construction, so the census stands
    // down and the card arm composes the body as asked.
    const s = seat({}, { stages: "not-an-array" });
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
      sig(),
    )) as { run_id: string };
    assert.ok(ans.run_id !== "", "the card arm ran the caller's own stage");
    assert.equal(s.core.runs.size, 1);
  });

  it("a bench whose rows mix junk and a real stage registers — the snapshot keeps the loadable row", async () => {
    // THE CONTRACTED SNAPSHOT: a bench run stamps its stage list
    // through the contract's save face — a null row and a row whose
    // params bag is not an object both ride as they were authored
    // (never coerced into a shape they do not have), and the
    // composable row beside them rides composed.
    const s = seat({}, {
      stages: [
        null,
        { id: "s_0", card: "image-gen", params: "not-a-bag" },
        {
          id: "s_1",
          card: "image-edit",
          params: { prompt: "x" },
          inputs: { image: { stage: "s_0", output: "default" } },
        },
      ],
    });
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
      sig(),
    )) as { run_id: string };
    assert.ok(ans.run_id !== "", "the wired bench ran");
    const snap = (s.core.runs.get(ans.run_id) as RunRecord | undefined)?.benchSnapshot as
      { stages: unknown[] } | undefined;
    assert.ok(snap !== undefined, "the bench snapshot is stamped");
    // THE CONTRACT (runs-start's snapshot law): unloadable rows DROP
    // with named warnings, the loadable row rides composed.
    assert.equal(snap.stages.length, 1, "junk rows drop, the loadable row rides");
    assert.equal(
      (snap.stages[0] as { id?: unknown }).id,
      "s_1",
      "the composable row is the one that persists",
    );
  });

  it("an UNWIRED bench rides the card arm's snapshot: junk rows pass through, params that are not a bag coerce to themselves", async () => {
    // The card arm registers with the bench doc beside it, and that
    // registration maps every row on a COPY: a null row is not a row
    // and rides untouched, a row whose params is not an object skips
    // its card's carrier (never coerced into a shape it never had).
    const s = seat({}, {
      stages: [
        null,
        "scalar row",
        { id: "s_0", card: "image-gen", params: { prompt: "x" } },
        { id: "s_1", card: "image-gen", params: "not-a-bag" },
      ],
    });
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
      sig(),
    )) as { run_id: string };
    assert.ok(ans.run_id !== "", "the card arm ran the caller's stage");
    const snap = (s.core.runs.get(ans.run_id) as RunRecord | undefined)?.benchSnapshot as
      { stages: unknown[] } | undefined;
    assert.ok(snap !== undefined, "the bench snapshot is stamped beside the run");
    assert.equal(snap.stages.length, 1, "unloadable rows drop under the contract");
    assert.equal((snap.stages[0] as { id?: unknown }).id, "s_0", "the loadable row rides");
  });

  it("a draft read that fails stamps NO bench snapshot — the card arm still runs the caller's stage", async () => {
    const s = seat({}, {}, true);
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
      sig(),
    )) as { run_id: string };
    assert.ok(ans.run_id !== "", "the card arm ran without a bench doc");
    assert.equal((s.core.runs.get(ans.run_id) as RunRecord | undefined)?.benchSnapshot, undefined);
  });

  it("a bench stage's UNKNOWN card-plane failure keeps its own identity — the arm never renames it", async () => {
    // The bench arm's catch translates the CARD arm's refusals; an
    // error that is not one of ours (a transport fault, a shape bug)
    // is not a verdict and must arrive as itself.
    const s = seat({
      phase2Card: async (): Promise<unknown> => {
        throw new Error("engine socket closed");
      },
    }, {
      stages: [
        { id: "s_0", card: "image-gen", params: { model: "m1", prompt: "x" } },
        { id: "s_1", card: "image-edit", params: { prompt: "x" }, inputs: { image: { stage: "s_0", output: "default" } } },
      ],
    });
    await expect(
      s.svc.start(
        { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
        sig(),
      ),
    ).rejects.toThrow(/engine socket closed/);
    assert.equal(s.core.runs.size, 0);
  });
});

describe("the self-wire census over junk shapes", () => {
  it("junk rows and junk input refs are skipped; the self-wire still refuses, named", async () => {
    // The census walks the SAME doc twice (the wired-rows pass, then
    // the self-wire pass). Both passes skip a non-object row and a
    // non-object inputs bag; the wired-rows pass additionally skips a
    // ref that names no stage. The self-wire is what the door names.
    const s = seat({}, {
      stages: [
        null,
        {
          id: "s_1",
          card: "image-edit",
          params: { prompt: "x" },
          inputs: {
            self_wire: { stage: "s_1", output: "default" },
            wire_without_output: { stage: "s_1" },
            junk_ref: 5,
          },
        },
        { id: "s_2", card: "image-edit", params: { prompt: "x" }, inputs: "not-an-object" },
      ],
    });
    const err = await remote(() =>
      s.svc.start(
        { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
        sig(),
      ),
    );
    assert.equal(err.code, "runs/invalid-request");
    assert.match(err.message, /SELF-WIRE/);
    assert.equal(s.core.runs.size, 0);
  });
});
