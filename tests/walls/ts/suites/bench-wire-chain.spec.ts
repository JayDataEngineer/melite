// bench-wire-chain.spec.ts — THE WHOLE WIRE, END TO END (2026-10-11)
//
// The question this file answers is the operator's: when the AI
// connects one card's output to another card's input, does the
// connection WORK, and does it PERSIST?
//
// Every existing wall looked at one door at a time. The bench suite
// proved the door admits a legal wire and stores it; the merge suite
// proved a merge resolves a link. Neither ever drove a wire from the
// AUTHORING door through the STORE and into the CONSUMER, which is
// the only shape the operator actually touches. That gap is where
// this class of bug lives: a wire can be perfectly legal at the door
// and unrunnable at the merge, and both suites stay green.
//
// So this file builds the chain the run builds —
//   door (add/rewire) → store (re-read from disk) → compose
//   (stage `inputs` → inputNames) → merge (planMerge)
// — and requires the link to resolve at the end. The compose step
// mirrors runsStart's own translation on purpose: if that
// translation is the thing that breaks, this file must break too.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { planMerge } from "../../../../packages/engines/comfyui-cordis/src/comfyui-merge.ts";
import type { MergeRow } from "../../../../packages/engines/comfyui-cordis/src/comfyui-merge.ts";
import {
  addStageBench,
  ensureBench,
  getBench,
  rewireBench,
  removeStageBench,
} from "../../../../packages/estate/drafts/src/bench.ts";
import { boot } from "../../../../packages/estate/drafts/tests/bench-helpers.ts";

/** The compose step, mirroring runsStart:210-221 verbatim in
 *  shape — a stage's `inputs` become the `stage.output` refs the
 *  merge reads. If the bench ever stores a third wiring shape, this
 *  translation is where it would be dropped, so it is written out
 *  rather than imported. */
const inputNamesOf = (
  stages: ReadonlyArray<Record<string, unknown>>,
): Record<string, Record<string, string>> => {
  const out: Record<string, Record<string, string>> = {};
  for (const st of stages) {
    const ins = st["inputs"];
    if (typeof ins !== "object" || ins === null || Array.isArray(ins)) continue;
    const names: Record<string, string> = {};
    for (const [name, ref] of Object.entries(ins as Record<string, unknown>)) {
      const r = ref as Record<string, unknown>;
      if (typeof r?.["stage"] === "string") {
        names[name] = String(r["stage"]) + "." + String(r["output"]);
      }
    }
    out[String(st["id"])] = names;
  }
  return out;
};

/** A compiled stand-in for one stage: the Save that publishes the
 *  image, plus whatever the stage's params spell. The wiring under
 *  test is the bench's, not the card's graph.
 *
 *  The consuming node's class is deliberately NOT `Load*`: a
 *  producer link may only land in a TENSOR slot, and the merge
 *  refuses a `$spell` in a Load file slot by name (the per-stage
 *  path owns the disk handoff). Naming the placeholder Load would
 *  have this fixture measure that gate instead of the wire. */
const compiled = (stageId: string, spelled: readonly string[]): MergeRow =>
  ({
    stageId,
    workflow: {
      save: { class_type: "SaveImage", inputs: {} },
      ...(spelled.length === 0
        ? {}
        : {
            n: {
              class_type: "TensorSink",
              inputs: Object.fromEntries(spelled.map((s) => [s, "$" + s])),
            },
          }),
    },
    params: {},
    outputs: { image: "png" },
    outputNodes: {},
  }) as unknown as MergeRow;

const stagesOf = (bench: unknown): Array<Record<string, unknown>> =>
  (bench as { stages: Array<Record<string, unknown>> }).stages;

describe("a wire survives the whole chain: door → store → compose → merge", () => {
  // NOTE: no afterEach cleanup here. `boot()` (bench-helpers) already
  // owns its temp root through vitest's onTestFinished. A hand-rolled
  // cleanup that joins the state root with ".." walks out of the
  // mkdtemp and aims at the parent — which, for these roots, is the
  // system temp directory. The suite deletes nothing; the helper
  // deletes exactly what it minted.
  let drafts: Awaited<ReturnType<typeof boot>>;

  beforeEach(async () => {
    drafts = await boot();
  });

  it("FORWARD: the door admits it, the store keeps it, the merge resolves it", async () => {
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    await addStageBench(drafts, "s", {
      card: "image-edit",
      expect_rev: 1,
      params: { prompt: "zoom out", image1: "$image" },
      inputs: { image: { stage: "s_0", output: "image" } },
    });

    // STORE: read back off disk, not off the return value.
    const stages = stagesOf(getBench(drafts, "s"));
    expect(stages[1]!["inputs"]).toEqual({ image: { stage: "s_0", output: "image" } });

    // COMPOSE + MERGE: the wire becomes a link that lands on a node.
    const names = inputNamesOf(stages);
    expect(names["s_1"]).toEqual({ image: "s_0.image" });
    const plan = planMerge(
      [compiled("s_0", []), compiled("s_1", ["image"])],
      {},
      names,
    );
    expect((plan.workflow["s_1::n"] as Record<string, unknown>)["inputs"]).toEqual({
      image: ["s_0::save", 0],
    });
  });

  it("BACKWARD: a wire to a LATER stage persists AND resolves (the li-aw defect)", async () => {
    await ensureBench(drafts, { session: "s" });
    // image-edit is authored FIRST and consumes; image-gen is SECOND
    // and produces. Nothing about that is illegal — the door has no
    // position law, and the operator is free to wire either way.
    await addStageBench(drafts, "s", {
      card: "image-edit",
      expect_rev: 0,
      params: { prompt: "zoom out", image1: "$image" },
    });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 1 });

    await rewireBench(drafts, "s", {
      stage: "s_0",
      input: "image",
      expect_rev: 2,
      from: { stage: "s_1", output: "image" },
    });

    const stages = stagesOf(getBench(drafts, "s"));
    expect(stages[0]!["inputs"]).toEqual({ image: { stage: "s_1", output: "image" } });

    const plan = planMerge(
      [compiled("s_0", ["image"]), compiled("s_1", [])],
      {},
      inputNamesOf(stages),
    );
    expect((plan.workflow["s_0::n"] as Record<string, unknown>)["inputs"]).toEqual({
      image: ["s_1::save", 0],
    });
  });

  it("a REWIRE replaces the old edge — the store never carries both", async () => {
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 1 });
    await addStageBench(drafts, "s", {
      card: "image-edit",
      expect_rev: 2,
      params: { prompt: "zoom out", image1: "$image" },
      inputs: { image: { stage: "s_0", output: "image" } },
    });
    // point s_2 at s_1 instead — the old edge must be GONE, not shadowed
    await rewireBench(drafts, "s", {
      stage: "s_2",
      input: "image",
      expect_rev: 3,
      from: { stage: "s_1", output: "image" },
    });
    const stages = stagesOf(getBench(drafts, "s"));
    expect(stages[2]!["inputs"]).toEqual({ image: { stage: "s_1", output: "image" } });
    expect(Object.keys(stages[2]!["inputs"] as object)).toEqual(["image"]);
  });

  it("CLEARING a wire leaves a runnable bench (no link, no stray spell)", async () => {
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    await addStageBench(drafts, "s", {
      card: "image-edit",
      expect_rev: 1,
      params: { prompt: "zoom out", image1: "$image" },
      inputs: { image: { stage: "s_0", output: "image" } },
    });
    await rewireBench(drafts, "s", { stage: "s_1", input: "image", expect_rev: 2 });
    const stages = stagesOf(getBench(drafts, "s"));
    expect(stages[1]!["inputs"]).toEqual({});
  });

  it("removing a stage a wire still points at REFUSES, rather than persisting a phantom", async () => {
    // The write door is the right place for this, and it is already
    // there: the removal would leave s_1's wire naming a stage that
    // no longer exists, so the remove itself refuses by name. (The
    // read path carries its own gate for docs that predate it.)
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    await addStageBench(drafts, "s", {
      card: "image-edit",
      expect_rev: 1,
      params: { prompt: "zoom out", image1: "$image" },
      inputs: { image: { stage: "s_0", output: "image" } },
    });
    let refused = "";
    try {
      await removeStageBench(drafts, "s", { stage: "s_0", expect_rev: 2 });
    } catch (e) {
      refused = (e as Error).message;
    }
    expect(refused).toMatch(/wire-stage-not-found|no such stage/);
    // and the bench is untouched — the refused write mutated nothing
    const stages = stagesOf(getBench(drafts, "s"));
    expect(stages).toHaveLength(2);
    expect(stages[1]!["inputs"]).toEqual({ image: { stage: "s_0", output: "image" } });
  });
});
