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
import { H3_LORA_ROWS } from "@melite/models-h3/mods/loras";

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

  it("ARM 4 — second_pass_enabled + refine seats mount the T3 refine rider (TWO SamplerCustomAdvanced; the LTX stack carries the catalog file + stated strength; the rider scheduler carries the stated steps)", async () => {
    // THE REFINE BURN (round-48 probe): the schema serves
    // refine_lora/_strength/_steps and the film params row carries
    // them, but NOTHING assembled p.refine — the rider never mounted
    // and the plain pass rendered under stating seats. A stated
    // refine MUST reach its three consumers: the LTX stack_data
    // (file + strength), the rider scheduler (steps), and the
    // second sampler itself.
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
      seed: SEED,
      second_pass_enabled: true,
      refine_lora: "h3_taomate_3step",
      refine_strength: 0.9,
      refine_steps: 5,
    }, "h3_value_arm4");
    const samplers = Object.entries(graph).filter(([, n]) => n.class_type === "SamplerCustomAdvanced");
    assert.equal(samplers.length, 2,
      `the stated refine mounts the rider pass (expected TWO SamplerCustomAdvanced, saw ${samplers.length}) — the seats stated but the plain pass rendered`);
    const ltx = Object.entries(graph).filter(([, n]) => n.class_type === "LTX_lora_loader");
    assert.ok(ltx.length >= 2, "the rider owns its OWN loader (the primary stack never changes)");
    const rider = ltx.find(([, n]) =>
      typeof n.inputs.stack_data === "string" && (n.inputs.stack_data as string).includes("taomate"));
    assert.ok(rider, "the rider loader's stack carries the resolved catalog file");
    const stack = JSON.parse(rider![1].inputs.stack_data as string) as Array<{ lora: string; str: number }>;
    assert.equal(stack[0]!.str, 0.9, "the rider stack carries the STATED strength");
    const riderSched = Object.entries(graph).filter(([, n]) =>
      n.class_type === "BasicScheduler" && n.inputs.steps === 5 && n.inputs.denoise === 1.0);
    assert.ok(riderSched.length >= 1, "the rider scheduler carries the STATED steps at full denoise");
  });

  it("ARM 5 (master-off guard) — refine seats WITHOUT second_pass_enabled compose the plain pass (exactly ONE SamplerCustomAdvanced)", async () => {
    // THE GUARD the cure must not break: legacy docs carry refine
    // leaves with no master (actions.ts:1677-1680) and render the
    // plain pass, byte-stable. The master is the only door.
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
      seed: SEED,
      refine_lora: "h3_taomate_3step",
      refine_strength: 0.9,
      refine_steps: 5,
    }, "h3_value_arm5");
    const samplers = Object.entries(graph).filter(([, n]) => n.class_type === "SamplerCustomAdvanced");
    assert.equal(samplers.length, 1,
      `master off must render the plain pass (expected ONE SamplerCustomAdvanced, saw ${samplers.length})`);
  });

  it("ARM 6 — a bogus refine_lora id refuses LOUD naming the knob (the compose door refuses hand-spelled ids)", async () => {
    // THE PROMISED REFUSAL (schema.ts:211 — LORAS ARE ONLY MODS, the
    // compose door refuses unknown ids loud): a hand-spelled id must
    // never compose clean. The round-48 probe composed it clean —
    // this arm is the red-proof of the missing refusal.
    await assert.rejects(
      composeH3({
        length: 56,
        calls: [SHOT()],
        seed: SEED,
        second_pass_enabled: true,
        refine_lora: "no_such_refiner",
      }, "h3_value_arm6"),
      /refine_lora/,
      "a hand-spelled refine id composed clean — the promised loud refusal is missing",
    );
  });

  it("ARM 7 — unstated refine overrides default from the catalog row (taomate 0.7 @ 3 steps)", async () => {
    // ONE OWNER PER KNOB (schema.ts:207-208): refine_lora picks the
    // instrument; strength/steps default FROM THE ROW. Stating only
    // the id must ride the row's operating point.
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
      seed: SEED,
      second_pass_enabled: true,
      refine_lora: "h3_taomate_3step",
    }, "h3_value_arm7");
    const samplers = Object.entries(graph).filter(([, n]) => n.class_type === "SamplerCustomAdvanced");
    assert.equal(samplers.length, 2, "the id alone mounts the rider (row defaults fill strength/steps)");
    const ltx = Object.entries(graph).filter(([, n]) => n.class_type === "LTX_lora_loader");
    const rider = ltx.find(([, n]) =>
      typeof n.inputs.stack_data === "string" && (n.inputs.stack_data as string).includes("taomate"));
    assert.ok(rider, "the rider loader's stack carries the resolved catalog file");
    const stack = JSON.parse(rider![1].inputs.stack_data as string) as Array<{ lora: string; str: number }>;
    assert.equal(stack[0]!.str, 0.7, "unstated strength defaults from the row (taomate 0.7)");
    const riderSched = Object.entries(graph).filter(([, n]) =>
      n.class_type === "BasicScheduler" && n.inputs.steps === 3 && n.inputs.denoise === 1.0);
    assert.ok(riderSched.length >= 1, "unstated steps default from the row (taomate 3)");
  });

  it("ARM 8 — a stated refine_steps outside the ROW's declared domain refuses LOUD naming the domain (the re-homed row-domain law, F2)", async () => {
    // THE RE-HOMED LAW (F2 — one owner, one voice): the service's
    // refine-steps-range refusal moves to the compose door (the only
    // assembler). The turbo row declares [4,8]: 9 rides admission
    // (the schema's max is 10) but violates the row; 2 rides
    // admission (the schema's min is 1) but violates the row. Both
    // must refuse naming the domain — and an in-domain count must
    // still ride (the control pins the cure against over-refusal).
    const doc = (steps: number, runId: string) => ({
      length: 56,
      calls: [SHOT()],
      seed: SEED,
      second_pass_enabled: true,
      refine_lora: "h3_lightx2v_turbo",
      refine_steps: steps,
    });
    await assert.rejects(
      composeH3(doc(9, "h3_value_arm8hi"), "h3_value_arm8hi"),
      /declared domain \[4, 8\]/,
      "an above-domain refine count composed clean — the row-domain law is missing at the door",
    );
    await assert.rejects(
      composeH3(doc(2, "h3_value_arm8lo"), "h3_value_arm8lo"),
      /declared domain \[4, 8\]/,
      "a below-domain refine count composed clean — the row-domain law is missing at the door",
    );
    const graph = await composeH3(doc(6, "h3_value_arm8ok"), "h3_value_arm8ok");
    const riderSched = Object.entries(graph).filter(([, n]) =>
      n.class_type === "BasicScheduler" && n.inputs.steps === 6 && n.inputs.denoise === 1.0);
    assert.ok(riderSched.length >= 1, "an in-domain refine count still rides the rider scheduler");
  });

  it("ARM 9 — every served loras row declares default_strength and steps (the door's ?? never falls through)", async () => {
    // THE VACUITY LOCK (F2): resolveRefineSeat's `?? row.X`
    // fallbacks are reachable ONLY through a row missing the field —
    // all eleven rows declare both, so the door carries NO
    // steps-required / strength-fallback branches (dead code is
    // refused HERE, never grown in the door). A future stepless or
    // strengthless row reds THIS arm first, forcing the door branch
    // WITH its own firing arm.
    assert.ok(H3_LORA_ROWS.length > 0, "the served loras table is non-empty");
    for (const row of H3_LORA_ROWS) {
      assert.equal(typeof row.default_strength, "number",
        `row '${row.id}' declares no default_strength — the door's strength ?? falls through; add the field or the door branch with its arm`);
      assert.ok(Number.isInteger(row.steps),
        `row '${row.id}' declares no integer steps — the door's steps ?? falls through; add the field or the door branch with its arm`);
    }
  });

  // ── SD-2 master/leaf either-or (the purge audit's stated-seat class,
  // UI purge 2026-11-08): the sharpen leaves state per-leaf, the
  // master gate owns the verdict. The witness pins the drop AS
  // DESIGNED: the stated value always rides the graph's grouped dict
  // with its named switch beside it — never a silent value-vanish. ──
  const sharpenParts = (graph: Record<string, { class_type: string; inputs: Record<string, unknown> }>) => {
    const sharpenEntry = Object.entries(graph).find(([, n]) => n.class_type === "ImageSharpenKJ");
    assert.ok(sharpenEntry, "the post chain builds the sharpen node (the grouped dict's home)");
    const sharpenId = sharpenEntry![0];
    const sw = Object.entries(graph).find(([, n]) =>
      n.class_type === "ComfySwitchNode" && JSON.stringify(n.inputs.on_true ?? "").includes(sharpenId));
    assert.ok(sw, "a switch routes the sharpened branch (the master gate's verdict home)");
    return { dict: sharpenEntry![1].inputs.method, sw: sw![1].inputs.switch };
  };

  it("ARM 10 (SD-2 master/leaf, gate ON) — a stated sharpen leaf reaches the grouped dict and the switch routes the sharpened branch", async () => {
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
      seed: SEED,
      second_pass_enabled: true,
      sharpen_enabled: true,
      sharpen_strength: 0.65,
    }, "h3_value_arm10");
    const { dict, sw } = sharpenParts(graph);
    assert.ok(JSON.stringify(dict).includes("0.65"),
      `the stated leaf rides the grouped dict (saw ${JSON.stringify(dict)})`);
    assert.equal(sw, true, "the master gate routes the sharpened branch (on_true) when enabled");
  });

  it("ARM 11 (SD-2 master/leaf, gate OFF) — the stated leaf still rides the graph dict (the drop is the DESIGNED switch, named in the graph — never a silent value-vanish) while the switch routes the plain pass", async () => {
    // THE DOCUMENTED GATE (actions.ts MASTER GATE, 2026-09-22):
    // legacy docs with leaves set but no master render the plain
    // pass. The purge class is only silent if the stated value ALSO
    // vanishes — it does not: the leaf loop reads every stated leaf
    // into the dict, and the switch carries the verdict beside it.
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
      seed: SEED,
      sharpen_strength: 0.65,
    }, "h3_value_arm11");
    const { dict, sw } = sharpenParts(graph);
    assert.ok(JSON.stringify(dict).includes("0.65"),
      `the stated leaf rides the grouped dict even gate-off (saw ${JSON.stringify(dict)})`);
    assert.equal(sw, false, "the master gate routes the plain pass without the gate (the designed verdict, named in the graph)");
  });

  it("ARM 12 (SD-2 master/leaf, master ON + sub-gate OFF) — a second-pass doc WITHOUT the sharpen arm routes the plain pass while the stated leaf still rides the dict", async () => {
    // THE SUB-GATE'S OWN ARM: second_pass_enabled is the master,
    // sharpen_enabled is the sharpen arm's switch WITHIN it. The
    // operator case: the second pass runs (interp / sr) with
    // sharpening off — the arm must not fire. Masking note: with the
    // master off the sub-gate is unobservable (the && short-circuits
    // false), so THIS arm is the only judge of the sharpen_enabled
    // term — toggle it out and the switch asserts true here.
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
      seed: SEED,
      second_pass_enabled: true,
      sharpen_enabled: false,
      sharpen_strength: 0.65,
    }, "h3_value_arm12");
    const { dict, sw } = sharpenParts(graph);
    assert.ok(JSON.stringify(dict).includes("0.65"),
      `the stated leaf rides the grouped dict even arm-off (saw ${JSON.stringify(dict)})`);
    assert.equal(sw, false, "the sharpen sub-gate stays closed without sharpen_enabled (the master alone must not sharpen)");
  });
});
