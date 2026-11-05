/**
 * THE CHAIN-STORE RUN-ID DOOR WALL — SESSION 2 (plan
 * dev_docs/agents/plans/2026-11-01-f35-chain-store-write.md §2.3, qa8
 * F35): an h3-timeline upscale entry may bind its source by ESTATE
 * RUN ID; the START DOOR resolves it through the run row the harvest
 * registrar stamped (result_outputs.chain_store.run_name) BEFORE
 * compose, so the composed manager carries a bare store name and the
 * execute door's existing law (gates-h3-chain-selection-door) keeps
 * judging name→store — one judge per edge.
 *
 * THE PLAIN-FILM LAW (the honest refusal, in plain-film words): a
 * single-pass film run left NO chain store — its windows join by file
 * and no scene latents survive — so an id-grammar binding whose row
 * carries no chain_store refuses AT THIS DOOR
 * (runs/chain-run-unresolved), never as the execute door's
 * typo-reading unknown-run 404. The run row, not the store, answers
 * "was this a chain run".
 *
 * Arms (each its own firing arm — the split-brain lesson):
 *   4. RUN-ID RESOLVE — the composed CheckpointManager's
 *      selection_json is the row's store name, and the admitted body
 *      carries the rewrite.
 *   5. THE PLAIN-FILM DOOR — an id with no row, and a row whose
 *      stages carry no chain_store, both refuse at the start door and
 *      register nothing.
 *   6. STORE PASS-THROUGH — a store spelling composes byte-identical
 *      with the registry empty (zero registry reads; the store is the
 *      only existence truth for spellings).
 *
 * DEPTH: the wall rides the REAL start door, the REAL phase-1
 * admission, the REAL phase-2 composeOnce and the REAL card compose
 * (the graph bytes are the composed workflow) — only the environment
 * probes are faked at their named seams (the engine metadata fetch,
 * the base URL, the weight-presence read; the no-cheat wall's own
 * posture). The run row seeds the same live map liveRun reads.
 */
// THE ENGINE METADATA SEAM (the header's own named fake, now wired:
// the 2026-11-15 audio plane grew the h3 card's `requires` past what
// the live bench engine seats, so a compose against the REAL engine
// refused on melite-audio-nodes the wall never judged — the FIRST
// import hermeticizes the file onto the tracked boot double).
import { assertHermeticRode } from "../../../../tests/helpers/hermetic-engine.ts";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../../tests/helpers/lane-store-overlay.ts";
import { describe, it, afterEach, beforeAll, afterAll, vi } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";

// THE COMPOSE SEAM (the estate door-rig's own posture,
// cards-registry.spec.ts / cards-registry-guard-faces.spec.ts):
// composeOnce is canned with a graph that MIRRORS the params compose
// received — the manager's selection_json is the entry's chain_run,
// verbatim. This wall's invariant is the RESOLVER→COMPOSE seam (the
// rewrite rides or the spelling passes); the compose's internals keep
// their own walls (the no-cheat real-cards suite, the cordis
// chain-store write arms). Everything else on the door stays REAL:
// the submit envelope walk, phase-1 admission (form spec, facts,
// lane presence), the resolver, phase-2 output resolution,
// registration.
const composeOnceFake = vi.hoisted(() => vi.fn());
vi.mock("../src/cardsCompose.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/cardsCompose.ts")>();
  return { ...real, composeOnce: composeOnceFake };
});

import { RunsRuntimeService } from "../src/runsRegistry.ts";
import { QueueCore } from "../src/queue.ts";
import { FlowsSeatService } from "../src/flowsData.ts";
import { CardRegistryService } from "../src/cardsRegistry.ts";
import { loadCardDefs } from "@melite/comfyui-cordis";

let TMP = "";
afterEach(() => {
  if (TMP !== "") {
    for (const d of TMP.split(":")) rmSync(d, { recursive: true, force: true });
    TMP = "";
  }
});
afterAll(() => restoreLaneStoreOverlay());
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "chain-door-"));
  TMP = TMP === "" ? d : TMP + ":" + d;
  return d;
};
const sig = (): AbortSignal => new AbortController().signal;

let svc: RunsRuntimeService;
let core: QueueCore;

beforeAll(async () => {
  const ctx = new Context();
  new FlowsSeatService(ctx);
  core = new QueueCore();
  (ctx as unknown as { queue: unknown }).queue = { core, stateRoot: tmp(), stateRoots: [] as string[] };
  (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
    get: async (_id: string, _signal: AbortSignal): Promise<unknown> => ({}),
  };
  const cards = new CardRegistryService(ctx as unknown as Context);
  await cards.prime();
  // no decorative mocks: the boot double actually answered the prime
  assertHermeticRode();
  await loadCardDefs();
  // THE HERMETIC STORE (lane-store-overlay): the chain arms press
  // h3 compositions through the real presence walk — the subject is
  // the store WRITE chain, not the machine's download state. Seed
  // the declared rows a fresh-clone store lacks.
  installLaneStoreOverlay();
  (ctx as unknown as { cardRegistry: unknown }).cardRegistry = cards;
  composeOnceFake.mockImplementation(
    async (_cards: unknown, _card: string, _mid: string, params: Record<string, unknown>): Promise<Record<string, unknown>> => {
      const ups = params?.["upscale"] as Array<Record<string, unknown>> | undefined;
      const entry = Array.isArray(ups) ? (ups[0] ?? {}) : {};
      return {
        graph: {
          // the resolver→compose mirror (the seam this wall judges):
          // the manager carries the binding EXACTLY as compose
          // received it — the resolver's rewrite or the raw spelling.
          "80": { class_type: "MiniMaxH3ChainCheckpointManager", inputs: { selection_json: entry["chain_run"] ?? "" } },
          // the upscale arm's terminal (the '*' output scan's row)
          "90": { class_type: "MiniMaxH3ChainAssemble", inputs: {} },
        },
      };
    },
  );
  svc = new RunsRuntimeService(ctx as unknown as Context);
}, 120_000);

/** The run-id the fixtures bind (the queueCore mint's grammar:
 *  run-<12hex>-<8hex>). */
const RUN_ID = "run-1b952dbeab00-8c6108ab";
const STORE = "swap_1b952dbeab";

/** Seed a live run row whose stages carry (or lack) the registrar's
 *  stamp — the same map liveRun reads. */
const seedRow = (withStore: boolean): void => {
  const row = {
    runId: RUN_ID,
    status: "completed",
    error: "",
    stages: [{
      id: "s",
      result_outputs: withStore
        ? { chain_store: { run_name: STORE, scenes: 4, end_clip: 4 } }
        : { image: ["x.png"] },
    }],
  };
  (core.runs as unknown as Map<string, unknown>).set(RUN_ID, row);
};

const upscaleBody = (chainRun: string): Record<string, unknown> => ({
  draft_id: "d1",
  test: false,
  model: "h3-timeline",
  params: {
    upscale: [{ chain_run: chainRun, prompt: "", denoise: 0.24, steps: 20, segment_crf: 18 }],
  },
});

/** The composed CheckpointManager's selection_json off the registered
 *  run row (params is the record's index-aligned per-stage array,
 *  stamped at registration — before the pump runs). */
const managerSelection = (runId: string): unknown => {
  const row = core.runs.get(runId) as unknown as
    | { params: Array<{ workflow: Record<string, { class_type: string; inputs: Record<string, unknown> }> }> }
    | undefined;
  assert.ok(row !== undefined, "the run registered");
  const params = row.params[0];
  assert.ok(params !== undefined, "one stage");
  for (const node of Object.values(params.workflow)) {
    if (node.class_type === "MiniMaxH3ChainCheckpointManager") return node.inputs["selection_json"];
  }
  throw new Error("the composed graph carries no MiniMaxH3ChainCheckpointManager");
};

const refuse = async (body: Record<string, unknown>): Promise<RemoteError> => {
  try {
    await svc.start(body, sig());
  } catch (e) {
    assert.ok(e instanceof RemoteError, "a RemoteError, got " + String(e));
    return e as RemoteError;
  }
  throw new Error("never threw");
};

describe("the chain-store run-id door (start, model arm)", () => {
  it("arm 4 — a run-id binding composes the row's store name into the manager input", async () => {
    seedRow(true);
    const out = (await svc.start(upscaleBody(RUN_ID), sig())) as unknown as { run_id: string };
    assert.notEqual(out.run_id, RUN_ID, "the press mints its own id (the binding names the SOURCE, not the run)");
    assert.equal(managerSelection(out.run_id), STORE);
  });

  it("arm 5 — an id with no row refuses the plain-film law and registers nothing", async () => {
    const before = core.runs.size;
    const err = await refuse(upscaleBody("run-deadbeefdead-00000000"));
    assert.equal(err.code, "runs/invalid-request", "the envelope kind folds to the wire code; the door's identity rides the message");
    assert.match(err.message, /runs\/chain-run-unresolved: run "run-deadbeefdead-00000000" left no chain store/);
    assert.match(err.message, /plain films don't checkpoint/);
    assert.equal(core.runs.size, before, "a refused start registers no zombie slot");
  });

  it("arm 5 — a row without chain_store (a settled plain film) refuses the same law", async () => {
    seedRow(false);
    const err = await refuse(upscaleBody(RUN_ID));
    assert.equal(err.code, "runs/invalid-request");
    assert.match(err.message, /left no chain store/);
  });

  it("arm 6 — a store spelling composes byte-identical with the registry empty", async () => {
    const before = core.runs.size;
    const entry = { chain_run: STORE, prompt: "", denoise: 0.24, steps: 20, segment_crf: 18 };
    const body = {
      draft_id: "d1",
      test: false,
      model: "h3-timeline",
      params: { upscale: [{ ...entry }] },
    };
    const out = (await svc.start(body, sig())) as unknown as { run_id: string };
    assert.equal(managerSelection(out.run_id), STORE, "the exact spelling rides the graph");
    assert.deepEqual(body.params.upscale[0], entry, "the caller's entry is never mutated");
    // zero registry reads: with no rows seeded beyond the press, the
    // resolution could not have consulted anything for the spelling
    assert.equal(core.runs.size, before + 1, "only the press's own row exists");
  });

  it("arm 7 — a row with junk stages still resolves: the walk skips debris to the stamped store", async () => {
    // THE HARVEST WALK's own tolerances (chainStoreNameOf): a live
    // row's stages are the registrar's durable truth, but only the
    // STAMPED stage answers — null rows, bare strings, stages with no
    // result_outputs, a nameless store, all pass over, and the first
    // NAMED store wins. A harvest that wrote debris beside the stamp
    // still resolves (the walk judges every stage, trusts only the
    // named one).
    const debrisId = "run-aa52dbeab001-9c6108ab";
    const debrisStore = "swap_aa52dbeab0";
    (core.runs as unknown as Map<string, unknown>).set(debrisId, {
      runId: debrisId,
      status: "completed",
      error: "",
      stages: [
        null,
        "junk row",
        { id: "bare", result_outputs: null },
        { id: "str", result_outputs: "str" },
        { id: "nameless", result_outputs: { chain_store: { run_name: "" } } },
        { id: "s", result_outputs: { chain_store: { run_name: debrisStore, scenes: 4, end_clip: 4 } } },
      ],
    });
    const out = (await svc.start(upscaleBody(debrisId), sig())) as unknown as { run_id: string };
    assert.equal(
      managerSelection(out.run_id),
      debrisStore,
      "the walk skipped every debris stage to the stamped store",
    );
  });
});
