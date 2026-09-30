// runs-registry-lane-seat.spec.ts — the LANE shape end to end
// (stroke 4): the estate serves the runs doors with the families
// provider mounted — the catalog service plus every family plugin
// in the door's own context — and a family flow composes from
// ctx.get("models"). The start/doors specs pin the door's logic
// against a three-DECL Service fake; this spec pins the WIRING the
// 3088 commission caught live (2026-10-10): the estate used to
// mount the bare catalog provider, the seat held zero families,
// and every family stage refused "registered: none".
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import modelsFamiliesProvider from "@melite/comfyui-cordis/catalog-registry";
import { modelsProvider } from "@melite/comfyui-cordis/models-service";
import { ComfyUIHostService } from "@melite/comfyui-cordis";
import type { EngineJson, FlowResult, MergeRow } from "@melite/comfyui-cordis";
import { RunsRuntimeService } from "../src/runsRegistry.ts";
import { QueueCore } from "../src/queue.ts";
import type { RunRecord } from "../src/runsTypes.ts";

let TMP = "";
afterEach(() => {
  if (TMP !== "") {
    rmSync(TMP, { recursive: true, force: true });
    TMP = "";
  }
});

const remote = async <T>(fn: () => Promise<T>): Promise<T | RemoteError> => {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof RemoteError) return e;
    throw e;
  }
};

/** The estate's seat wiring: the queue core, the door's remote
 *  stubs, and the models seat from the mounted provider — real
 *  families, no fake. */
const laneSeat = async (
  provider: typeof modelsFamiliesProvider,
): Promise<{ svc: RunsRuntimeService; ctx: Context }> => {
  TMP = mkdtempSync(join(tmpdir(), "lane-seat-"));
  const ctx = new Context();
  const core = new QueueCore();
  (ctx as unknown as { queue: unknown }).queue = { core, stateRoot: TMP };
  (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
    get: async (id: string): Promise<unknown> => {
      if (id === "d1") return {};
      throw new RemoteError("draft/not-found", "no doc", { draftId: id });
    },
  };
  (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
    objectInfo: (): unknown => null,
    defsSync: (): unknown => new Map(),
    modelFacts: (): unknown => {
      throw new Error("no facts");
    },
    resolveCardFamily: (mid: unknown): unknown => mid,
    modelMids: (): unknown => new Set<string>(),
  };
  await ctx.plugin(provider);
  const svc = new RunsRuntimeService(ctx as unknown as Context);
  return { svc, ctx };
};

describe("the runs door through the lane's models seat", () => {
  it("the families provider populates the seat the door composes from", async () => {
    const { svc, ctx } = await laneSeat(modelsFamiliesProvider);
    const seat = ctx.get("models") as unknown as { allDecls(): { id: string }[] };
    assert.equal(seat.allDecls().length, 47, "the booted table, not a bare service");
    const err = await remote(() =>
      svc.start({ draft_id: "d1", test: false, flow: "character" }, new AbortController().signal),
    );
    // The COMPOSE refusal comes first, and it is the fit verb's own
    // voice: seat composes before the compiler runs, and the verb
    // needs a bone (no flow initial can carry one yet). The
    // skip_when preview scope the fake-seat pin holds is a LATER,
    // deeper gate — this flow cannot reach it while its fit stage
    // refuses, which is the point: the lowest level that can answer
    // answers.
    assert.ok(err instanceof RemoteError, "the compose refusal, never a crash");
    assert.equal((err as RemoteError).code, "runs/invalid-request");
    assert.match((err as RemoteError).message, /needs a BONE/);
    await ctx.fiber.dispose();
  });

  it("a BARE catalog mount is named as such — not as an unregistered family (the gap, pinned)", async () => {
    const { svc, ctx } = await laneSeat(modelsProvider as typeof modelsFamiliesProvider);
    const seat = ctx.get("models") as unknown as { allDecls(): { id: string }[] };
    assert.equal(seat.allDecls().length, 0);
    const err = await remote(() =>
      svc.start({ draft_id: "d1", test: false, flow: "character" }, new AbortController().signal),
    );
    assert.ok(err instanceof RemoteError);
    assert.equal((err as RemoteError).code, "runs/invalid-request");
    // The seat's own condition, named: this lane mounted the catalog
    // provider WITHOUT the families row, so the table is empty for a
    // reason no registration can fix. "no such family" named a typo
    // on a lane that never had the family in the first place.
    assert.match(
      (err as RemoteError).message,
      /the models seat is mounted with ZERO families/,
    );
    await ctx.fiber.dispose();
  });

  it("the engine merge receives the run's request initials (the door's gate-blessed values, pinned)", async () => {
    const { svc, ctx } = await laneSeat(modelsFamiliesProvider);
    // The engine seat as a cordis-registered subclass (needComfyUI
    // instanceof-gates the host service — a structural fake cannot
    // cross; the override captures the initials the worker threads).
    const seen: Array<Record<string, EngineJson>> = [];
    class CaptureEngine extends ComfyUIHostService {
      constructor(c: Context) {
        super(c, {});
      }
      override executeFlow(
        rows: MergeRow[],
        runDir: string,
        inputNames: Record<string, Record<string, string>>,
        initials: Record<string, EngineJson>,
      ): Promise<FlowResult> {
        seen.push(initials);
        return Promise.resolve({ stages: {}, promptId: "p" });
      }
    }
    new CaptureEngine(ctx);
    const photo: string = join(TMP, "photo.png");
    writeFileSync(photo, "png");
    const ans = await svc.start(
      { draft_id: "d1", test: false, flow: "anny-hmr-commercial", photo },
      new AbortController().signal,
    );
    const row = ((): RunRecord => ans as unknown as { run: RunRecord }).run;
    await settleRun(svc, ans.run_id);
    const live = (svc as unknown as {
      core: { runs: Map<string, RunRecord> };
    }).core.runs.get(ans.run_id) as RunRecord;
    assert.equal(live.status, "completed", "settled: " + live.error);
    // The pin: the start body's photo (gate-validated at the door)
    // reaches the engine merge as a request initial — the worker
    // used to submit {} here, refusing every $spell-carrying stage
    // ("$photo names neither a FromStage-wired input nor a request
    // initial") after the door had already blessed the value.
    assert.deepEqual(seen[0], { photo });
    void row;

    // THE REPLAY PIN (the same wall, one process death later): the
    // durable request body is the shimmed flow_inline doc (the flow
    // name is gone), so a queued run that rehydrates on the next boot
    // arrives at the flow_inline arm — the only extraction used to sit
    // in the flow arm, and the rehydrated run's merge got {} and died
    // at planMerge. Replay the REAL persisted body; the merge must see
    // the same initials.
    const durable = JSON.parse(
      readFileSync(join(TMP, "output", ans.run_id, "_request.json"), "utf8"),
    ) as Record<string, unknown>;
    assert.equal(durable["flow"], undefined, "the shim deleted the flow name — the replay's shape");
    const replay = await svc.start(
      { draft_id: "d1", test: false, ...durable },
      new AbortController().signal,
      { runId: ans.run_id },
    );
    assert.equal(replay.run_id, ans.run_id, "the replay rewrites in place (stroke 83)");
    await settleRun(svc, ans.run_id);
    const replayed = (svc as unknown as {
      core: { runs: Map<string, RunRecord> };
    }).core.runs.get(ans.run_id) as RunRecord;
    assert.equal(replayed.status, "completed", "the replay settled: " + replayed.error);
    assert.deepEqual(seen[1], { photo }, "the rehydrated run's merge still links $photo");

    // A doc whose id names NO registry flow owns no declared initials
    // (a hand-authored or bench-composed inline) — the recovery is
    // skipped, never a refusal.
    const authored = await remote(() =>
      svc.start(
        {
          draft_id: "d1",
          test: false,
          flow_inline: {
            id: "not-a-registry-flow",
            stages: [{ id: "s", engine: "comfyui", params: { workflow: { "1": { class_type: "UNETLoader", inputs: {} } } } }],
          },
        },
        new AbortController().signal,
      ),
    );
    assert.ok(!(authored instanceof RemoteError), "a hand-authored id is not a registry recovery");

    // A NON-STRING id passes the compiler's top gate (it checks key
    // presence, not type), so the recovery's typeof guard is live —
    // a numeric id is not a registry name and recovers nothing.
    const numericId = await remote(() =>
      svc.start(
        {
          draft_id: "d1",
          test: false,
          flow_inline: {
            id: 42 as unknown as string,
            stages: [{ id: "s", engine: "comfyui", params: { workflow: { "1": { class_type: "UNETLoader", inputs: {} } } } }],
          },
        },
        new AbortController().signal,
      ),
    );
    assert.ok(!(numericId instanceof RemoteError), "a non-string id is not a registry recovery");

    // A doc with NO id at all (the compiler's own fixtures' shape)
    // recovers nothing — the id arm is absent, not an error.
    const idless = await remote(() =>
      svc.start(
        {
          draft_id: "d1",
          test: false,
          flow_inline: {
            stages: [{ id: "s", engine: "comfyui", params: { workflow: { "1": { class_type: "UNETLoader", inputs: {} } } } }],
          },
        },
        new AbortController().signal,
      ),
    );
    // The COMPILER owns the id requirement (flow body needs at least
    // id and stages) — it refuses before the recovery arm reads the
    // id, so the recovery's "not a string id" arm is unreachable
    // through the door and the compiler's voice is the one that
    // answers.
    assert.ok(idless instanceof RemoteError, "the compiler refuses an id-less inline");
    assert.equal((idless as RemoteError).code, "runs/invalid-request");
    assert.match((idless as RemoteError).message, /needs at least id and stages/);

    // THE GATE RIDES THE RECOVERY TOO: a hand-authored doc carrying a
    // registry id buys the initial-carrier privilege, never a way
    // around the flow arm's gate. A traversal path in the body
    // refuses here exactly as it refuses on the flow arm — the value
    // would otherwise reach the uploader, which stages local files by
    // extension.
    const traversal = await remote(() =>
      svc.start(
        { draft_id: "d1", test: false, ...durable, photo: "data/input/../../../../etc/hostile.png" },
        new AbortController().signal,
        { runId: "run-traversal" },
      ),
    );
    assert.ok(traversal instanceof RemoteError, "the replay arm runs the same gate");
    assert.equal((traversal as RemoteError).code, "runs/invalid-request");
    assert.match((traversal as RemoteError).message, /refuses traversal/);

    // A mangled durable body refuses loud at the door (the file
    // boundary), naming the initial — never an "[object Object]"
    // literal shipped to the engine.
    const mangled = await remote(() =>
      svc.start(
        { draft_id: "d1", test: false, ...durable, photo: 12 },
        new AbortController().signal,
        { runId: "run-mangled" },
      ),
    );
    assert.ok(mangled instanceof RemoteError, "the mangled replay refuses");
    assert.equal((mangled as RemoteError).code, "runs/invalid-request");
    assert.match((mangled as RemoteError).message, /"photo" must be a file path string/);
    await ctx.fiber.dispose();
  });
});

/** Poll until the run leaves queued/running (the wall's own cadence). */
const settleRun = async (svc: RunsRuntimeService, runId: string): Promise<void> => {
  for (let i = 0; i < 500; i++) {
    const live = (svc as unknown as {
      core: { runs: Map<string, RunRecord> };
    }).core.runs.get(runId);
    if (live !== undefined && live.status !== "queued" && live.status !== "running") return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("never settled " + runId);
};
