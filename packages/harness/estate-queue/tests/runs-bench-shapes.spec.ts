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
import { FlowsSeatService } from "../src/flowsData.ts";

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
  new FlowsSeatService(ctx);
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
        [
          "image-mesh",
          {
            id: "image-mesh",
            boarded: ["m1"],
            flowKinds: {
              inputs: { mesh: "mesh", text: "text" },
              legacyAliases: { body: "image" },
              outputs: { default: "mesh" },
              requiresModel: true,
            },
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
            // THE STRUCTURED ARTIFACT (2026-10-22): the lane-missing row's
            // typed details are REQUIRED at the fold — a synthetic throw
            // carries them like the real site does.
            { family: "m1", slot: "checkpoint", missing: "x.safetensors", folders: ["checkpoints"], fetchUrl: "https://example/x", kind: "model" },
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
        { draft_id: "d1", test: false },
        sig(),
      ),
    );
    const details = (err as unknown as { details?: Record<string, unknown> }).details ?? {};
    assert.match(String(details["loc"]), /^stages\/"s_0" \(params\.checkpoint\)$/);
    assert.equal(details["expected"], "an existing copy");
    assert.equal(details["got"], "none");
    // THE LANE-MISS ARTIFACT RIDES (2026-10-22): the structured
    // details survive the bench arm beside the loc — the client's
    // weight popup keys on these fields, never on parsing prose.
    assert.equal(details["family"], "m1");
    assert.equal(details["slot"], "checkpoint");
    assert.equal(details["missing"], "x.safetensors");
    assert.deepEqual(details["folders"], ["checkpoints"]);
    assert.equal(details["fetch_url"], "https://example/x");
    assert.equal(details["kind"], "model");
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
            undefined,
            undefined,
            { family: "m1", slot: "checkpoint", missing: "x.safetensors", folders: ["checkpoints"], fetchUrl: "https://example/x", kind: "model" },
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
        { draft_id: "d1", test: false },
        sig(),
      ),
    );
    const details = (err as unknown as { details?: Record<string, unknown> }).details ?? {};
    assert.equal(String(details["loc"]), 'stages/"s_0"');
  });
});

describe("THE KINDS PROJECTION (audit J-E1)", () => {
  it("a bench row with no hand-written expected derives its input kinds from the card's ports — aliases included", async () => {
    // The derivation law's bench half: validate's kindsOk derives
    // kinds from the card ports before it judges; the composed stage
    // used to carry expected ONLY from the row's hand-written bag,
    // and bench rows carry none — the queued run asserted no kinds
    // on its own wired inputs. The projection fills the absent slots
    // (legacy aliases ride, the naming law's lattice half).
    const s = seat({}, {
      stages: [
        { id: "s_0", card: "image-gen", params: { prompt: "x" } },
        {
          id: "s_1",
          card: "image-mesh",
          params: { prompt: "x" },
          inputs: { mesh: { stage: "s_0", output: "default" } },
        },
      ],
    });
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false },
      sig(),
    )) as { run_id: string };
    assert.ok(ans.run_id !== "", "the wired bench ran");
    // the RUN's compiled stage rows are where the projection lands —
    // the snapshot keeps the source doc verbatim (extra keys ride),
    // the compiled rows are what the queue and the merge judge
    const run = s.core.runs.get(ans.run_id) as RunRecord | undefined;
    assert.ok(run !== undefined, "the run registered");
    const mesh = run.stages.find((st) => st.id === "s_1");
    assert.ok(mesh !== undefined, "the bench's first stage compiled a row");
    assert.deepEqual(
      mesh.expected,
      { mesh: "mesh", text: "text", body: "image" },
      "the card's declared kinds (aliases included) fill the absent bag",
    );
  });

  it("a hand-written expected still wins per input — the override is for initials the card cannot know", async () => {
    const s = seat({}, {
      stages: [
        { id: "s_0", card: "image-gen", params: { prompt: "x" } },
        {
          id: "s_1",
          card: "image-mesh",
          params: { prompt: "x" },
          expected: { mesh: "image", extra: "text" },
          inputs: { mesh: { stage: "s_0", output: "default" } },
        },
      ],
    });
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false },
      sig(),
    )) as { run_id: string };
    const run = s.core.runs.get(ans.run_id) as RunRecord | undefined;
    const mesh = run?.stages.find((st) => st.id === "s_1");
    assert.ok(mesh !== undefined, "the row rides compiled");
    assert.deepEqual(
      mesh.expected,
      { mesh: "image", text: "text", body: "image", extra: "text" },
      "the hand-written mesh wins; the card still fills text/body; extra rides",
    );
  });

  it("a card that declares no ports keeps the row's bag verbatim — nothing invented", async () => {
    const s = seat({}, {
      stages: [
        { id: "s_0", card: "image-gen", params: { prompt: "x" } },
        {
          id: "s_1",
          card: "image-edit",
          params: { prompt: "x" },
          inputs: { image: { stage: "s_0", output: "default" } },
        },
      ],
    });
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false },
      sig(),
    )) as { run_id: string };
    const run = s.core.runs.get(ans.run_id) as RunRecord | undefined;
    const edit = run?.stages.find((st) => st.id === "s_1");
    assert.ok(edit !== undefined, "the row rides compiled");
    // a card with no declared ports leaves the bag EMPTY (the
    // compiler defaults an absent expected to {}), never invented
    assert.deepEqual(edit.expected, {}, "no declared ports, no invented kinds — the bag stays empty");
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

  it("an ARCHIVED row composes nowhere on the bench run — the spent stage never re-runs (F11)", async () => {
    // THE FRICTION BURN: spent stages re-ran ahead of newer stages,
    // blocking the queue. The archived mark keeps the row on the
    // bench (provenance) and the compose leaves it out: the run's
    // composed stage list carries the live rows only.
    const s = seat({}, {
      stages: [
        { id: "s_0", card: "image-gen", params: { prompt: "a cat" } },
        {
          id: "s_1",
          card: "image-edit",
          params: { prompt: "x" },
          inputs: { image: { stage: "s_0", output: "default" } },
        },
        // the SPENT stage: marked archived, unwired (the bench door
        // refuses archiving a live-wired upstream, so lawful archived
        // rows are consumers or unwired)
        { id: "s_2", card: "image-gen", params: { prompt: "y" }, archived: true },
      ],
    });
    // the draft door: {draft_id} alone composes every live stage
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false },
      sig(),
    )) as { run_id: string };
    assert.ok(ans.run_id !== "", "the wired bench ran");
    const rec = s.core.runs.get(ans.run_id) as RunRecord | undefined;
    assert.ok(rec !== undefined, "the run registered");
    const benchIds = new Set(
      (rec.stages as Array<{ id?: string }>)
        .map((st) => st.id)
        .filter((id): id is string => typeof id === "string"),
    );
    assert.ok(benchIds.has("s_0"), "the live upstream composed");
    assert.ok(benchIds.has("s_1"), "the live consumer composed");
    assert.equal(
      benchIds.has("s_2"),
      false,
      "the archived row composes nowhere — the spent stage never re-runs",
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

describe("the press's bench read is a FROZEN INSTANT (R7, round-14 race audit)", () => {
  it("a live-bench mutation landing mid-press never straddles into the run's snapshot", async () => {
    // THE ALIAS STRADDLE: the drafts read answers the CACHED doc BY
    // REFERENCE (the cached-object law), so a bench edit landing
    // between the press's read and the snapshot stamp used to reach
    // into the run — a snapshot that was not quite a snapshot. The
    // press now structuredClones its read: compose + snapshot see
    // the SAME frozen instant no matter what the live bench does.
    // The seam is phase-1 compose — an await resume that sits AFTER
    // the bench read and BEFORE the stamp (the door stamps from
    // door.benchDoc once compose returns). Toggle the clone out
    // (runsRegistry's press read) and this wall reds with the
    // straddled stage riding the snapshot.
    const d1: Record<string, unknown> = {
      rev: 1,
      stages: [{ id: "s_0", card: "image-gen", params: { prompt: "x" } }],
    };
    const s = seat({
      phase1Card: async (): Promise<unknown> => {
        // the live bench edits WHILE the press composes — the exact
        // window the audit named (a remove or reorder landing between
        // press and snapshot)
        (d1["stages"] as unknown[])[0] = {
          id: "s_0",
          card: "image-gen",
          params: { prompt: "STRADDLED-MID-PRESS" },
        };
        (d1["stages"] as unknown[]).push({
          id: "s_late",
          card: "image-gen",
          params: { prompt: "late edit" },
        });
        return { skeleton: "edit", card: "image-edit" };
      },
    }, d1);
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
      sig(),
    )) as { run_id: string };
    assert.ok(ans.run_id !== "", "the bench press ran");
    const snap = (s.core.runs.get(ans.run_id) as RunRecord | undefined)?.benchSnapshot as
      { stages: Array<{ id?: unknown }> } | undefined;
    assert.ok(snap !== undefined, "the bench snapshot is stamped");
    assert.deepEqual(
      snap.stages.map((st) => st.id),
      ["s_0"],
      "the FROZEN instant — the late edit never rides",
    );
    const row = snap.stages[0] as { params?: { prompt?: unknown } };
    assert.equal(row.params?.prompt, "x", "the row is the press-time row, not the mutated alias");
  });
});
