// @melite/models-h3 — the P2 VALUE wall: the stated sampler knobs
// reach the graph AT their consumers (purge P2 value law, hop
// [4]→[5]). Kills the operator's silent-drop class on the h3 lane:
// a seat-stated seed / sampler / scheduler / steps / denoise that
// never reaches RandomNoise / KSamplerSelect / BasicScheduler is
// the music long-prompt burn in numeric form — the bar shows the
// number, the engine never hears it.
//
// THE CONSUMER MAP (packages/models/h3/src/actions.ts — the lines
// are the law, re-read here, never frozen literals):
//   p.seed (p.noise_seed ?? p.seed) → RandomNoise.noise_seed (:1563)
//   p.sampler_name → KSamplerSelect.sampler_name (:1564)
//   p.sched_name → BasicScheduler.scheduler (:1585-1589)
//   p.steps → BasicScheduler.steps (:1589)
//   p.denoise → BasicScheduler.denoise (:1589)
// THE DOOR: the card def's REAL path — def.schema (the walk) then
// def.compose — the refmod-value-arms wall's proven composeH3, the
// same hop the run rides (refmod-value-arms.spec.ts:137-142).
// THE WITNESS SCOPE: the five sampler knobs above. The census's
// h3 U block beyond them (latent-shape rows, refine:1669, sr /
// sharpen / interp / sla, per-window rows) stays UNWITNESSED until
// its own arms land — this wall names its five and no more.
// THE LIVENESS PROOF (ARM 3, the music wall's ARM-4 pattern): the
// drop variant — a doc WITHOUT the stated seed composes the
// consumer with the schema default, and the arm asserting the
// stated value THROWS with the VALUE ARM voice. A presence arm
// (node exists) would pass on the dropped doc; this arm reds —
// the matcher judges the VALUE, never the shape.
// THE PER-CALL LAW (ARM 2): the film loop's stanza is
// { ...p, ...knobs } (actions.ts:434) — a call's own knobs REPLACE
// the film-level value per key. The split-brain history (the bag
// stomping a user-stated steps, fixed 2026-10-16) is why the
// override direction gets its own arm on a TWO-window doc.
// THE PER-FILE BOOT FIRST (tests/helpers/boot-models.ts header law):
// the models table is lazy — the compose door and the facts reads
// need the booted service before this spec's own imports evaluate.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { getModel, registryIds, registryModel } from "../../../engines/comfyui-cordis/src/models/models.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

type GNode = { class_type: string; inputs: Record<string, unknown> };
type Graph = Record<string, GNode>;

/** THE COMPOSE DOOR — the same def.compose the run rides (hop 4);
 *  gatedResolve (hop 3's admission) runs inside. */
async function composeH3(doc: Record<string, unknown>, runId: string): Promise<Graph> {
  const defs = await loadCardDefs();
  const def = defs.get("h3-timeline");
  assert.ok(def, "the composition root serves the h3-timeline card");
  const model: ModelFacts | undefined = facts.models["h3"];
  assert.ok(model, "the h3 family facts row serves");
  const g = new GraphBuilder();
  def.compose(def.schema({ ...doc }), model, g, runId);
  return g.toJSON() as Graph;
}

/** Assert EVERY composed consumer node of the class (optionally
 *  scoped to one window's id prefix) carries the stated value at
 *  the named input — the VALUE voice, never a presence glance. */
function assertValueAtConsumer(
  graph: Graph,
  cls: string,
  input: string,
  stated: unknown,
  what: string,
  scope = "",
): void {
  const nodes = Object.entries(graph).filter(
    ([id, n]) => n.class_type === cls && (scope === "" || id.startsWith(scope)),
  );
  assert.ok(nodes.length > 0,
    `${what}: no node of class '${cls}'${scope === "" ? "" : ` under '${scope}'`} in the composed graph — the DECL-wired consumer never composed (hop [5])`);
  for (const [id, node] of nodes) {
    const saw = node.inputs[input];
    if (saw === stated) continue;
    assert.fail(
      `${what.toUpperCase()} VALUE ARM (hop [5], the consumer's input): node '${id}' (${cls}) input ` +
      `'${input}' did not carry the stated value verbatim — ` +
      `expected ${JSON.stringify(stated)}, saw ${JSON.stringify(saw)} ` +
      `— the stated value never reached the engine's consumer (THE SILENT UI DROP, ERRORS.md bottom)`,
    );
  }
}

// ── THE STATED VALUES (distinctive non-defaults — a default-echoing
// wall would pass on a default carry and prove nothing) ──
const SEED = 4242; // schema default 42 (schema.ts:110)
const SAMPLER = "dpmpp_2m"; // schema default "euler" (schema.ts:197)
const SCHED = "beta"; // schema default "simple" (schema.ts:200)
const STEPS = 8; // schema default 6, min 4 max 30 (schema.ts:141)
const DENOISE = 0.75; // schema default 1.0 (schema.ts:175)
const SEED_B = 7777;
const STEPS_B = 12;

const SHOT = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  text: "a slow push in", start_frame: 0, end_frame: 56, ...over,
});

describe("the h3 sampler knobs ride VERBATIM to their consumers (purge P2 value law, hop [4]→[5])", () => {
  let def: CardDefinition;
  beforeAll(async () => {
    def = (await loadCardDefs()).get("h3-timeline")!;
    void def;
  });

  it("ARM 1 — single-window: the five stated sampler knobs land at RandomNoise / KSamplerSelect / BasicScheduler", async () => {
    // THE OPERATOR'S GESTURE: the five sampler seats stated on the
    // doc (the film face the seats write), one call, one window.
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
      seed: SEED,
      sampler_name: SAMPLER,
      sched_name: SCHED,
      steps: STEPS,
      denoise: DENOISE,
    }, "h3_value_arm1");
    assertValueAtConsumer(graph, "RandomNoise", "noise_seed", SEED, "seed");
    assertValueAtConsumer(graph, "KSamplerSelect", "sampler_name", SAMPLER, "sampler");
    assertValueAtConsumer(graph, "BasicScheduler", "scheduler", SCHED, "scheduler");
    assertValueAtConsumer(graph, "BasicScheduler", "steps", STEPS, "steps");
    assertValueAtConsumer(graph, "BasicScheduler", "denoise", DENOISE, "denoise");
  });

  it("CONTROL — the unstated doc rides the schema defaults (the harness is sane, the arms above are not default-echoes)", async () => {
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
    }, "h3_value_control");
    assertValueAtConsumer(graph, "RandomNoise", "noise_seed", 42, "default seed");
    assertValueAtConsumer(graph, "KSamplerSelect", "sampler_name", "euler", "default sampler");
    assertValueAtConsumer(graph, "BasicScheduler", "scheduler", "simple", "default scheduler");
    assertValueAtConsumer(graph, "BasicScheduler", "steps", 6, "default steps");
    assertValueAtConsumer(graph, "BasicScheduler", "denoise", 1.0, "default denoise");
  });

  it("ARM 2 — film path: the call's own knobs REPLACE the film-level value per key (window 2 rides the call, window 1 the film)", async () => {
    // THE SPLIT-BRAIN'S HEIR: two windows, one film-level word
    // (seed 4242, steps 8), the second call pinning its own
    // (seed 7777, steps 12). The stanza law ({ ...p, ...knobs })
    // says window1_ hears the film, window2_ the call.
    const graph = await composeH3({
      length: 124,
      calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124, knobs: { seed: SEED_B, steps: STEPS_B } })],
      seed: SEED,
      sampler_name: SAMPLER,
      sched_name: SCHED,
      steps: STEPS,
      denoise: DENOISE,
    }, "h3_value_arm2");
    assertValueAtConsumer(graph, "RandomNoise", "noise_seed", SEED, "film-level seed", "window1_");
    assertValueAtConsumer(graph, "BasicScheduler", "steps", STEPS, "film-level steps", "window1_");
    assertValueAtConsumer(graph, "RandomNoise", "noise_seed", SEED_B, "call-level seed", "window2_");
    assertValueAtConsumer(graph, "BasicScheduler", "steps", STEPS_B, "call-level steps", "window2_");
    // the unreplaced keys still ride the film word on BOTH windows
    assertValueAtConsumer(graph, "KSamplerSelect", "sampler_name", SAMPLER, "film-level sampler", "window1_");
    assertValueAtConsumer(graph, "KSamplerSelect", "sampler_name", SAMPLER, "film-level sampler", "window2_");
    assertValueAtConsumer(graph, "BasicScheduler", "scheduler", SCHED, "film-level scheduler", "window1_");
    assertValueAtConsumer(graph, "BasicScheduler", "scheduler", SCHED, "film-level scheduler", "window2_");
    assertValueAtConsumer(graph, "BasicScheduler", "denoise", DENOISE, "film-level denoise", "window1_");
    assertValueAtConsumer(graph, "BasicScheduler", "denoise", DENOISE, "film-level denoise", "window2_");
  });

  it("ARM 3a (liveness) — the seed DROPPED between seat and compose reds the value arm with the VALUE voice (a presence arm would pass: the node still composes, carrying the default)", async () => {
    // THE DROP CLASS: the seat stated 4242, the compose never saw
    // it — RandomNoise still composes (presence holds) with the
    // schema default 42. The arm asserting 4242 must THROW.
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
      sampler_name: SAMPLER,
      sched_name: SCHED,
      steps: STEPS,
      denoise: DENOISE,
    }, "h3_value_arm3a");
    assertValueAtConsumer(graph, "RandomNoise", "noise_seed", 42, "dropped seed falls back to default");
    assert.throws(
      () => assertValueAtConsumer(graph, "RandomNoise", "noise_seed", SEED, "seed"),
      /SEED VALUE ARM/,
      "the arm PASSED on a dropped seed — it is a presence arm, not a value arm; fix the arm, not the code",
    );
  });

  it("ARM 3b (liveness) — asserting the WRONG steps reds with the VALUE voice (the matcher compares, never glances)", async () => {
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
      seed: SEED,
      sampler_name: SAMPLER,
      sched_name: SCHED,
      steps: STEPS,
      denoise: DENOISE,
    }, "h3_value_arm3b");
    assert.throws(
      () => assertValueAtConsumer(graph, "BasicScheduler", "steps", STEPS + 1, "steps"),
      /STEPS VALUE ARM/,
      "the arm PASSED on a wrong steps value — it is a presence arm, not a value arm; fix the arm, not the code",
    );
  });
});
