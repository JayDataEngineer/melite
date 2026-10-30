// seed-sweep.spec.ts — THE SEED-SWEEP WALL (friction #9, the melite
// friction report 2026-10-28: "no batch/seed-sweep primitive" — each
// seed roll was a separate melite_flow + run_status + melite_view
// cycle, and ~5 of the session's 7 generation rounds were seed
// iterations). The cure: `seeds: [...]` on a {model:} card body
// fans out to ONE run per seed under ONE shared run-id prefix.
//
// THE LAW, one arm per judged direction (canon axis 3):
//   FAN-OUT      a three-seed press registers THREE runs — one per
//                seed, each body carrying ITS seed and no seeds key.
//   PREFIX       every id is `run-<base>-s<k>`, ONE base, k in seed
//                order — the family is identifiable everywhere ids
//                appear (registry, runs tree, the answer face).
//   ANSWER       sweep_runs lists every id in seed order, run_id is
//                the first; a single press carries NO sweep_runs.
//   SETTLES      the serial pump runs the family in prefix order and
//                every row completes exactly once.
//   REPLAY       one press_key re-pressed answers the SAME family —
//                nothing re-mints (the double-GPU-spend class).
//   REFUSES      the wrong shapes refuse LOUD before any mint:
//                seeds on a non-model door, seed+seeds both stated,
//                a non-array or empty array, a non-integer seat, and
//                over the SEED_SWEEP_MAX cap.
//
// The card seat is stubbed at the registry seam (phase1/phase2 —
// the card compose's own walls own the seed→graph hop); everything
// downstream (registration, enqueue, the pump, the engine gate) is
// REAL, mirroring runs-registry-two-press.spec.ts's harness.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIHostService } from "@melite/comfyui-cordis";
import type { FlowResult, MergeRow, EngineJson } from "@melite/comfyui-cordis";
import { RunsRuntimeService } from "../src/runsRegistry.ts";
import { QueueCore } from "../src/queue.ts";
import { FlowsSeatService } from "../src/flowsData.ts";
import { expandSeedSweep, SEED_SWEEP_MAX, DOOR_KNOB_PROBES } from "../src/queueSubmit.ts";
import { CARD_ENVELOPE_KEYS } from "../src/cardsRegistry.ts";
import { liftCardParams } from "../src/cardsVariant.ts";
import { sweepRunIds } from "../src/queueCore.ts";
import type { RunRecord } from "../src/runsTypes.ts";

let TMP = "";
afterEach(() => {
  if (TMP !== "") {
    for (const d of TMP.split(":")) rmSync(d, { recursive: true, force: true });
    TMP = "";
  }
});
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "seed-sweep-"));
  TMP = TMP === "" ? d : TMP + ":" + d;
  return d;
};
const sig = (): AbortSignal => new AbortController().signal;

/** Every body the card arm composed, in mint order — the FAN-OUT
 *  judge reads here (each body's OWN seed, no seeds key). */
const p1Bodies: Array<Record<string, unknown>> = [];

interface Seat {
  svc: RunsRuntimeService;
  core: QueueCore;
  /** Set `failAtSeed` to make the stub card arm throw when composing
   *  that seed's body (the mint-failure arm). */
  gate: { failAtSeed?: number };
}

const seat = (): Seat => {
  const state = tmp();
  const ctx = new Context();
  new FlowsSeatService(ctx);
  const core = new QueueCore();
  const gate: { failAtSeed?: number } = {};
  (ctx as unknown as { queue: unknown }).queue = { core, stateRoot: state };
  (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
    get: async (): Promise<unknown> => ({}),
  };
  // THE CARD SEAT STUB (the registry seam): phase1 captures the
  // per-run body; phase2 answers a spell-free graph. The card
  // compose's own walls own the seed→graph hop — this wall owns the
  // FAN-OUT, and a stubbed graph keeps it hers.
  (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
    phase1Card: async (body: Record<string, unknown>): Promise<unknown> => {
      if (gate.failAtSeed !== undefined && body["seed"] === gate.failAtSeed) {
        throw new Error("stub card arm exploded at seed " + String(gate.failAtSeed));
      }
      p1Bodies.push(body);
      return { card: "image-gen", skeleton: "image-gen", fam: "fam" };
    },
    phase2Card: async (): Promise<unknown> => ({
      graph: { "1": { class_type: "StubNode", inputs: {} } },
      outputNodes: {},
      outputs: {},
    }),
    objectInfo: (): unknown => null,
    defsSync: (): unknown => new Map(),
    modelFacts: (): unknown => {
      throw new Error("no facts");
    },
    resolveCardFamily: (mid: unknown): unknown => mid,
    modelMids: (): unknown => new Set<string>(),
    composeValidateCard: async (): Promise<unknown> => null,
  };
  const svc = new RunsRuntimeService(ctx as unknown as Context);
  return { svc, core, gate };
};

/** The engine seat (two-press's GatedEngine verbatim in shape): each
 *  execute holds until released, so submit order is observable. */
class GatedEngine extends ComfyUIHostService {
  received: string[] = [];
  inFlight = 0;
  maxInFlight = 0;
  private resolvers: Map<string, () => void> = new Map();
  constructor(ctx: Context) {
    super(ctx as unknown as never, {});
  }
  override executeFlow(
    rows: MergeRow[],
    runDir: string,
    _inputNames: Record<string, Record<string, string>>,
    _initials: Record<string, EngineJson>,
    _opts: { shouldStop?: () => void; report?: (updates: Record<string, EngineJson>) => void } = {},
  ): Promise<FlowResult> {
    const runId = basename(runDir);
    this.received.push(runId);
    this.inFlight += 1;
    this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
    return new Promise<FlowResult>((resolve) => {
      this.resolvers.set(runId, () => {
        this.inFlight -= 1;
        resolve({
          stages: Object.fromEntries(
            rows.map((r) => [r.stageId, { outputs: {}, artifacts: [] }]),
          ),
          promptId: "p-" + runId,
        });
      });
    });
  }
  release(runId: string): void {
    const r = this.resolvers.get(runId);
    if (r === undefined) throw new Error("no held execute for " + runId);
    this.resolvers.delete(runId);
    r();
  }
}

const engineOf = (s: Seat): GatedEngine => {
  const ctx = (s.svc as unknown as { ctx: Context }).ctx;
  return new GatedEngine(ctx);
};

const waitUntil = async (what: string, probe: () => boolean): Promise<void> => {
  for (let i = 0; i < 300; i++) {
    if (probe()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("never observed: " + what);
};

const rowSettled = async (s: Seat, runId: string): Promise<RunRecord> => {
  for (let i = 0; i < 300; i++) {
    const row = s.core.runs.get(runId) as RunRecord | undefined;
    if (row !== undefined &&
        (row.status === "completed" || row.status === "failed" || row.status === "stopped")) {
      return row;
    }
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("run never settled " + runId);
};

const sweepBody = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  draft_id: "d1",
  test: false,
  model: "fam",
  ...over,
});

describe("THE SEED-SWEEP WALL (one press, N seeds — friction #9)", () => {
  it("FAN-OUT + PREFIX + ANSWER: a three-seed press registers three runs, one body per seed, one shared prefix, sweep_runs in seed order", async () => {
    const s = seat();
    const engine = engineOf(s);
    p1Bodies.length = 0;
    const answer = await s.svc.start(sweepBody({ seeds: [7, 42, 256] }), sig());
    // THE ANSWER FACE: the family lists in seed order, run_id is the first
    assert.ok(Array.isArray(answer.sweep_runs), "the sweep answer carries sweep_runs");
    assert.equal(answer.sweep_runs!.length, 3);
    assert.equal(answer.run_id, answer.sweep_runs![0]);
    assert.equal(answer.status, "queued");
    // THE PREFIX LAW: one base, -s<k> in seed order
    const bases = new Set(answer.sweep_runs!.map((id: string): string => id.replace(/-s\d+$/, "")));
    assert.equal(bases.size, 1, "every sweep id shares ONE base: " + [...bases]);
    for (const [k, id] of answer.sweep_runs!.entries()) {
      assert.match(id, /^run-[0-9a-f]{12}-[0-9a-f]{8}-s\d+$/, "sweep id shape");
      assert.ok(id.endsWith("-s" + String(k)), "seat " + k + " rides its own suffix: " + id);
    }
    // THE REGISTRATION: three rows, exactly the answer's ids
    assert.equal(s.core.runs.size, 3, "one run per seed, nothing more");
    for (const id of answer.sweep_runs!) assert.ok(s.core.runs.has(id), id + " is registered");
    // THE FAN-OUT BODIES: each composed body carries ITS seed and no seeds key
    assert.equal(p1Bodies.length, 3);
    const seedsSeen = p1Bodies.map((b): unknown => b["seed"]);
    assert.deepEqual(seedsSeen, [7, 42, 256], "each run's body carries its own seed, in order");
    for (const b of p1Bodies) {
      assert.equal(b["seeds"], undefined, "the per-run body never carries the sweep key");
    }
    // SETTLES: release the family, prefix order, every row completes once
    await waitUntil("the engine received s0", () => engine.received.length === 1);
    for (const id of answer.sweep_runs!) {
      engine.release(id);
      await rowSettled(s, id);
    }
    await waitUntil("the engine received all three", () => engine.received.length === 3);
    assert.deepEqual(engine.received, [...answer.sweep_runs!], "the pump submits the family in prefix order");
    for (const id of answer.sweep_runs!) {
      assert.equal((s.core.runs.get(id) as RunRecord).status, "completed");
    }
  });

  it("REPLAY: one press_key re-pressed answers the SAME family — nothing re-mints", async () => {
    const s = seat();
    engineOf(s);
    p1Bodies.length = 0;
    const first = await s.svc.start(
      sweepBody({ press_key: "sweep-replay-1", seeds: [1, 2] }), sig(),
    );
    assert.equal(s.core.runs.size, 2);
    const again = await s.svc.start(
      sweepBody({ press_key: "sweep-replay-1", seeds: [1, 2] }), sig(),
    );
    assert.equal(again.run_id, first.run_id, "the replay answers the first run's id");
    assert.deepEqual(again.sweep_runs, first.sweep_runs, "the replay answers the SAME family");
    assert.equal(s.core.runs.size, 2, "the replay mints NOTHING");
    assert.equal(p1Bodies.length, 2, "the card arm composed exactly the first press's bodies");
  });

  it("SINGLE DOOR UNTOUCHED: a body with no seeds key mints one run and carries no sweep_runs", async () => {
    const s = seat();
    engineOf(s);
    p1Bodies.length = 0;
    const answer = await s.svc.start(sweepBody({ seed: 5 }), sig());
    assert.equal(s.core.runs.size, 1);
    assert.equal(answer.sweep_runs, undefined, "a single press never carries sweep_runs");
    assert.doesNotMatch(answer.run_id, /-s\d+$/, "a single run keeps the legacy id shape");
    assert.equal(p1Bodies.length, 1);
    assert.equal(p1Bodies[0]!["seed"], 5);
  });

  it("REFUSES (each shape, nothing minted)", async () => {
    const s = seat();
    engineOf(s);
    p1Bodies.length = 0;
    const refused = async (body: Record<string, unknown>, needle: string): Promise<void> => {
      await assert.rejects(
        (): Promise<unknown> => s.svc.start(body, sig()),
        (e: unknown): boolean => {
          assert.ok(e instanceof Error, "the refusal is an Error");
          assert.ok(e.message.includes(needle), "voice names the law: " + e.message);
          return true;
        },
      );
      assert.equal(s.core.runs.size, 0, "a refused sweep mints nothing: " + needle);
    };
    await refused(
      { draft_id: "d1", test: false, flow_inline: { id: "x", stages: [] }, seeds: [1] },
      "rides the model (card) door alone",
    );
    await refused(
      { draft_id: "d1", test: false, seeds: [1] },
      "this body names no door",
    );
    await refused(sweepBody({ seed: 5, seeds: [1, 2] }), 'both "seed" and "seeds" stated');
    await refused(
      sweepBody({ params: { seed: 5 }, seeds: [1, 2] }),
      'both "seed" and "seeds" stated',
    );
    await refused(sweepBody({ seeds: [] }), '"seeds" must be a non-empty array');
    await refused(sweepBody({ seeds: "nope" }), '"seeds" must be a non-empty array');
    await refused(sweepBody({ seeds: [1, "x"] }), "seeds[1]");
    await refused(sweepBody({ seeds: [0.5, 1] }), "seeds[0]");
    await refused(
      sweepBody({ seeds: Array.from({ length: SEED_SWEEP_MAX + 1 }, (_v, k: number): number => k) }),
      "caps at " + SEED_SWEEP_MAX,
    );
    assert.equal(p1Bodies.length, 0, "no body ever composed");
  });

  it("THE TWIN: two concurrent presses on one press_key — exactly one mints, both answer the same family", async () => {
    const s = seat();
    engineOf(s);
    p1Bodies.length = 0;
    const body = sweepBody({ press_key: "sweep-twin-1", seeds: [11, 22] });
    const [a, b] = await Promise.all([s.svc.start(body, sig()), s.svc.start(body, sig())]);
    assert.deepEqual(b.sweep_runs, a.sweep_runs, "the twin answers the family");
    assert.equal(a.run_id, b.run_id);
    assert.equal(s.core.runs.size, 2, "one mint only — the reservation held");
    assert.equal(p1Bodies.length, 2);
  });

  it("MINT FAILURE: a mid-loop card-arm throw fails the press loud, cleans its reservation, and the retry re-mints fresh", async () => {
    const s = seat();
    engineOf(s);
    s.gate.failAtSeed = 22;
    await assert.rejects(
      (): Promise<unknown> => s.svc.start(sweepBody({ press_key: "sweep-fail-1", seeds: [11, 22] }), sig()),
      /stub card arm exploded at seed 22/,
    );
    // the failed press left ONE partial run (seed 11 minted before the
    // throw) and NO reservation — the same key re-presses fresh.
    assert.equal(s.core.runs.size, 1, "the seats before the throw stand");
    const partialId = [...s.core.runs.keys()][0]! as string;
    s.gate.failAtSeed = undefined;
    const retry = await s.svc.start(sweepBody({ press_key: "sweep-fail-1", seeds: [11, 22] }), sig());
    assert.equal(s.core.runs.size, 3, "the retry minted its own family (no twin held the key)");
    assert.equal(retry.sweep_runs!.length, 2);
    assert.ok(!retry.sweep_runs!.includes(partialId), "the retry's family is fresh ids");
  });

  it("THE STALE SWEEP ROW: one swept row kills the family's replay — the re-press re-mints", async () => {
    const s = seat();
    engineOf(s);
    const first = await s.svc.start(sweepBody({ press_key: "sweep-stale-1", seeds: [1, 2] }), sig());
    assert.equal(s.core.runs.size, 2);
    // the row vanishes (swept from disk, seat restarted) — the mirror
    // entry must die with it, never answer a ghost family
    s.core.runs.delete(first.sweep_runs![1]! as never);
    const again = await s.svc.start(sweepBody({ press_key: "sweep-stale-1", seeds: [1, 2] }), sig());
    assert.equal(s.core.runs.size, 3, "old survivor + a fresh family");
    assert.notEqual(again.run_id, first.run_id, "the re-press is a NEW family");
    assert.equal(again.sweep_runs!.length, 2);
  });

  it("AN ABORTED PRESS mints nothing: the sweep door refuses a dead signal before any run registers", async () => {
    const s = seat();
    engineOf(s);
    const ac = new AbortController();
    ac.abort(new Error("operator cancelled"));
    await assert.rejects(
      (): Promise<unknown> => s.svc.start(sweepBody({ seeds: [1, 2] }), ac.signal),
    );
    assert.equal(s.core.runs.size, 0, "a dead signal mints nothing");
  });

  it("THE SWEEP MIRROR'S CAP: past PRESS_MEMORY_MAX sweep keys, the oldest dies and its re-press re-mints", async () => {
    const s = seat();
    engineOf(s);
    const first = await s.svc.start(sweepBody({ press_key: "evict-000", seeds: [9] }), sig());
    for (let i = 1; i <= 64; i++) {
      await s.svc.start(sweepBody({ press_key: "evict-" + String(i).padStart(3, "0"), seeds: [i] }), sig());
    }
    assert.equal(s.core.runs.size, 65, "one run per press");
    // evict-000 fell off the mirror — its re-press is a FRESH mint, not a replay
    const re = await s.svc.start(sweepBody({ press_key: "evict-000", seeds: [9] }), sig());
    assert.equal(s.core.runs.size, 66, "the evicted key re-minted");
    assert.notEqual(re.run_id, first.run_id);
  });

  it("THE PURE EXPANSION: absent seeds is the legacy single verdict; the id family mints one base; the sweep key is door vocabulary and the probe is a knob", () => {
    assert.deepEqual(expandSeedSweep({ model: "fam" }), { kind: "single" });
    const sweep = expandSeedSweep({ model: "fam", seeds: [3, 4, 5] });
    assert.equal(sweep.kind, "sweep");
    if (sweep.kind === "sweep") assert.deepEqual(sweep.seeds, [3, 4, 5]);
    const ids = sweepRunIds(3);
    const bases = new Set(ids.map((id: string): string => id.replace(/-s\d+$/, "")));
    assert.equal(bases.size, 1, "one mint, one base");
    assert.deepEqual(ids.map((id: string): string => id.slice(id.lastIndexOf("-s") + 1)), ["s0", "s1", "s2"]);
    // THE ENVELOPE SEATS: `seeds` is door vocabulary (lifted off the
    // card's params — a stray sweep key never rides admission);
    // `seed` is a KNOB (the probe's target, deliberately NOT
    // envelope-registered, so liftCardParams carries the per-run
    // seed into the card's params — the sweep's whole point).
    assert.ok(CARD_ENVELOPE_KEYS.includes("seeds"), "seeds is envelope-registered");
    assert.ok(!CARD_ENVELOPE_KEYS.includes("seed"), "seed stays a knob (never lifted)");
    assert.deepEqual(DOOR_KNOB_PROBES, ["seed"], "the probe list names exactly the seed knob");
    const lifted = liftCardParams({ model: "fam", seeds: [1], seed: 7 });
    assert.equal(lifted["seeds"], undefined, "the sweep key lifts OFF the params");
    assert.equal(lifted["seed"], 7, "the per-run seed lifts ONTO the params");
    // THE PROBE'S STANZA SEATS: a non-object params stanza (array,
    // string, null) is not a knob seat — the sweep proceeds
    for (const bad of [[], "x", null] as unknown[]) {
      const v = expandSeedSweep({ model: "fam", params: bad, seeds: [1] });
      assert.equal(v.kind, "sweep", "a non-object stanza never trips the probe");
    }
  });
});
