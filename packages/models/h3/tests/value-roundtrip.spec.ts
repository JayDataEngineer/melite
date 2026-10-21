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
// THE WITNESS SCOPE: the five sampler knobs above, the refine rider
// (ARMs 4-9), the SD-2 sharpen gates (ARMs 10-12), and the P0 class
// map (ARMs 13-23 — every remaining DECL class at its consumer). THE
// 2026-11-09 KNOB-BLOCK REMAINDER (ARMs 24-34, registry row
// models-h3-sampler-value-law): the per-class LIVENESS half (the drop
// variant reds per seat-class — ARM 3a's pattern is the law for every
// class, not just the sampler five), the sla_switch LIVE t4r seat
// (ARM 31 — the census cell ARM 23's narration wrongly retired; the
// alias is read at the t4r attention pick), the sharpen_switch
// retirement pin (ARM 32 — ARM 23 exercised interp_switch only), the
// fps_seconds no-stale ownership (ARM 33 — a stated pin never
// survives the render seat's derivation), and the per-window
// noise_seed film pins (ARM 34).
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
import { film } from "../src/actions.ts";
import { instantiateAction } from "@melite/comfyui-card-kit";

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

/** THE SWITCH-Voice ARM: resolve the ComfySwitchNode that switches ON
 *  to the named class — the switch-value pin rides TOPOLOGY (which
 *  node feeds on_true), never node order (ids are minted, not
 *  contracted). Shared by the SLA/interp/sr/sharpen switch arms. */
function switchCarrying(graph: Graph, onTrueClass: string): { id: string; switch: unknown } {
  for (const [id, n] of Object.entries(graph)) {
    if (n.class_type !== "ComfySwitchNode") continue;
    const onTrue = n.inputs.on_true as unknown;
    if (Array.isArray(onTrue) && typeof onTrue[0] === "string") {
      const upstream = graph[onTrue[0]];
      if (upstream?.class_type === onTrueClass) return { id, switch: n.inputs.switch };
    }
  }
  assert.fail(
    `SWITCH ARM (hop [5]): no ComfySwitchNode switches on a '${onTrueClass}' output — the class's switch never composed (the knob's on/off never reaches the engine)`,
  );
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
      // the row's OWN count (its declared domain [3,3] — value-arms
      // ARM 12): 5 was stateable only while the row declared nothing;
      // the row-domain law now refuses it at compose, as designed.
      refine_steps: 3,
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
      n.class_type === "BasicScheduler" && n.inputs.steps === 3 && n.inputs.denoise === 0.35);
    assert.ok(riderSched.length >= 1, "the rider scheduler carries the STATED steps (the row's own count) at the declared 0.35 refinement window");
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
      refine_steps: 3,
    }, "h3_value_arm5");
    const samplers = Object.entries(graph).filter(([, n]) => n.class_type === "SamplerCustomAdvanced");
    assert.equal(samplers.length, 1,
      `master off must render the plain pass (expected ONE SamplerCustomAdvanced, saw ${samplers.length})`);
  });

  // ARM 4b (the SOTA plan's refine-denoise limb, H3_TIMELINE_RESERACH
  // Stage 3; RE-AIMED by the P0 parameter audit, 2026-11-10): the
  // refine rider's denoise DEFAULT is the SOTA refinement window's
  // own 0.35 — the research band [0.30, 0.35] keeps pass 1's
  // structure (pass 1 owns it), the rider polishes texture. The old
  // default 1.0 (the TaoMate full-denoise mechanic) regenerated the
  // whole window — it stays STATEABLE, never the default (the band
  // arm ARM 36 outlaws an out-of-window default). The knob must
  // reach the rider scheduler; unstated rides 0.35.
  it("ARM 4b — a stated refine_denoise reaches the rider scheduler; unstated rides the declared 0.35 refinement window", async () => {
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
      seed: SEED,
      second_pass_enabled: true,
      refine_lora: "h3_taomate_3step",
      refine_strength: 0.35,
      refine_steps: 3,
      refine_denoise: 0.30,
    }, "h3_value_arm4b");
    // TOPOLOGY FIRST (audit 2026-10-20 debt 5 — rider identity is the
    // EDGE, never value coincidence): the rider scheduler is the node
    // a SamplerCustomAdvanced's sigmas input NAMES. steps===3 could
    // match any scheduler; only the wire says which sampler owns it.
    const edgeId = (v: unknown): string | null =>
      Array.isArray(v) && typeof v[0] === "string" ? v[0] as string : null;
    const schedOf = (g: typeof graph, sid: string, s: { inputs: Record<string, unknown> }): { cls: string; inputs: Record<string, unknown> } | null => {
      const target = edgeId(s.inputs.sigmas);
      if (target === null) throw new Error(`sampler ${sid} wired sigmas as a literal — schedulers only ride edges`);
      const node = g[target];
      return node === undefined ? null : { cls: node.class_type, inputs: node.inputs };
    };
    const samplers = Object.entries(graph).filter(([, n]) => n.class_type === "SamplerCustomAdvanced");
    assert.equal(samplers.length, 2, "the stated refine mounts the rider pass (TWO SamplerCustomAdvanced)");
    const riders = samplers
      .map(([sid, s]) => schedOf(graph, sid, s))
      .filter((sched): sched is { cls: string; inputs: Record<string, unknown> } =>
        sched !== null && sched.cls === "BasicScheduler");
    assert.equal(riders.length, 2, "every sampler's sigmas edge resolves to a BasicScheduler");
    const rider = riders.find((r) => r.inputs.denoise === 0.30);
    assert.ok(rider !== undefined,
      "the RIDER scheduler — identified by its sampler's sigmas edge — carries the stated refine window (research Stage 3: 0.30–0.35)");
    assert.equal(rider!.inputs.steps, 3,
      "the edge-identified rider also carries the refine steps (the window and the count ride the same scheduler)");

    // the counter: UNSTATED keeps the full-denoise rider byte-stable
    const legacy = await composeH3({
      length: 56,
      calls: [SHOT()],
      seed: SEED,
      second_pass_enabled: true,
      refine_lora: "h3_taomate_3step",
      refine_strength: 0.9,
      refine_steps: 3,
    }, "h3_value_arm4b_legacy");
    const legacySamplers = Object.entries(legacy).filter(([, n]) => n.class_type === "SamplerCustomAdvanced");
    const legacyRiders = legacySamplers
      .map(([sid, s]) => schedOf(legacy, sid, s))
      .filter((sched): sched is { cls: string; inputs: Record<string, unknown> } =>
        sched !== null && sched.cls === "BasicScheduler");
    assert.equal(legacyRiders.length, 2, "the legacy counter also wires both schedulers by edge");
    const legacyRider = legacyRiders.find((r) => r.inputs.steps === 3);
    assert.ok(legacyRider !== undefined, "the legacy rider scheduler exists among the edge-resolved pair");
    assert.equal(legacyRider!.inputs.denoise, 0.35,
      "a doc with no refine_denoise rides the declared 0.35 refinement window — the SOTA band's own default (P0 audit 2026-11-10; the full-denoise 1.0 stays a stated mechanic)");
  });

  it("ARM 4c — a refine_denoise outside [0.05, 1] refuses LOUD naming the knob (the schema walk owns the real-doc door)", async () => {
    await assert.rejects(
      composeH3({
        length: 56,
        calls: [SHOT()],
        seed: SEED,
        second_pass_enabled: true,
        refine_lora: "h3_taomate_3step",
        refine_denoise: 0,
      }, "h3_value_arm4c_zero"),
      /refine_denoise/,
      "denoise 0 is a no-op rider — the door refuses it loud, never composes a dead pass",
    );
    await assert.rejects(
      composeH3({
        length: 56,
        calls: [SHOT()],
        seed: SEED,
        second_pass_enabled: true,
        refine_lora: "h3_taomate_3step",
        refine_denoise: 1.5,
      }, "h3_value_arm4c_over"),
      /refine_denoise/,
      "denoise above 1 re-noises past the terminal — the door refuses it loud",
    );
  });

  // ARM 4f (audit 2026-10-20 F1/F4 — the resolver's own firing arm):
  // ARM 4c's probes die at the schemastery walk (which runs INSIDE
  // the card's compose wrapper) before the action body ever runs, so
  // the walk owns every real-doc refusal and resolveRefineSeat's
  // domain check had no judge — deleting its throw left 4c green.
  // This arm judges the FAMILY PLANE (the raw film action through
  // instantiateAction, door.spec's pattern — no schema walk in
  // front), where the resolver IS the refusing seat. One law, both
  // seats: the resolver's domain must equal the declared row
  // [0.05, 1] exactly — the sub-minimal band (0 < d < 0.05) the walk
  // refuses is refused here too, never admitted through the back
  // plane.
  it("ARM 4f — the resolver's own [0.05, 1] voice fires at the family plane (no walk in front)", () => {
    const windowModel: ModelFacts = {
      id: "h3", card: "h3-timeline", defaults: {},
      lane_inputs: { unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors" },
      variants: [], variant_groups: [], outputs: [],
    };
    const base = {
      variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
      second_pass_enabled: true, refine_lora: "h3_taomate_3step",
    };
    for (const bad of [0, 0.02, 1.5]) {
      assert.throws(
        () => {
          const g = new GraphBuilder();
          instantiateAction(film, { ...base, refine_denoise: bad }, windowModel, g, `h3_value_arm4f_${String(bad)}`);
        },
        (err: unknown) => err instanceof Error
          && err.message.includes(`refine_denoise ${String(bad)} falls outside the refinement window [0.05, 1]`),
        `refine_denoise ${bad} must refuse AT THE RESOLVER with its own voice — the walk is not the only owner (the sub-minimal band included: both seats state ONE domain)`,
      );
    }
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
      n.class_type === "BasicScheduler" && n.inputs.steps === 3 && n.inputs.denoise === 0.35);
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
      n.class_type === "BasicScheduler" && n.inputs.steps === 6 && n.inputs.denoise === 0.35);
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

// ── THE P0 WITNESS EXTENSION (purge §7, round 80): the class VALUE
// pins for the census's remaining h3 hop-[5] cells. Every arm composes
// through the SAME door (composeH3 above) and pins the stated value at
// the consumer the actions file wires — the consumer map was probed
// off real composed graphs, never guessed (each class's node/input
// names were dumped from a live compose before the arm froze them).
// Stated values are NON-defaults: a default-echoing arm proves nothing
// (the CONTROL arm above is the harness's own sane-proof).
describe("the h3 class knobs ride VERBATIM to their consumers (P0 witness extension, hop [4]→[5])", () => {
  it("ARM 13 — the shape + clock pins: width/height/length/ref_image_size at the ReferenceToVideo head, fps at the container (single window) and the window clock nodes (film), the derived seconds on the clock, noise_seed at RandomNoise", async () => {
    const graph = await composeH3({
      length: 124, width: 512, height: 480, fps: 30, noise_seed: 909,
      ref_image_size: "720x1280",
      calls: [SHOT({ start_frame: 0, end_frame: 124 })],
    }, "h3_value_arm13");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "width", 512, "width");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "height", 480, "height");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "length", 124, "length");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "ref_image_size", "720x1280", "ref_image_size");
    // SINGLE WINDOW: fps rides the container's fps input verbatim (the
    // interp compensation multiplies it only when interp mounts).
    assertValueAtConsumer(graph, "CreateVideo", "fps", 30, "fps (the container clock)");
    assertValueAtConsumer(graph, "RandomNoise", "noise_seed", 909, "noise_seed");
    // THE FILM PATH: the t4r OPENER carries the clock — fps lands on
    // the per-window clock node and the DERIVED seconds on its own
    // (the no-stale law derives fps_seconds from THIS window's
    // length/fps — window1 = 56/16). The opener composes TWO clock
    // nodes (fps + seconds); the pin reads BOTH values off the
    // window's clock set.
    const film = await composeH3({
      length: 124, fps: 16, ref_images: ["data/input/ref1.png"],
      calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
    }, "h3_value_arm13b");
    const clockValues = Object.entries(film)
      .filter(([id, n]) => n.class_type === "PrimitiveFloat" && id.startsWith("window1_"))
      .map(([, n]) => n.inputs.value).sort((a, b) => Number(a) - Number(b));
    assert.deepEqual(
      clockValues,
      [Math.round((56 / 16) * 1000) / 1000, 16],
      `the window clock set must carry the stated fps AND the derived seconds (saw ${JSON.stringify(clockValues)})`,
    );
  });

  it("ARM 14 — shift_video + shift_audio verbatim at MiniMaxH3SigmaShift", async () => {
    const graph = await composeH3({
      length: 56, shift_video: 11.5, shift_audio: 4.5,
      calls: [SHOT()],
    }, "h3_value_arm14");
    assertValueAtConsumer(graph, "MiniMaxH3SigmaShift", "shift_video", 11.5, "shift_video");
    assertValueAtConsumer(graph, "MiniMaxH3SigmaShift", "shift_audio", 4.5, "shift_audio");
  });

  // ARM 14b-e (the SOTA plan's shift limb, H3_TIMELINE_RESERACH:
  // the 8-step turbo route wants shift_video 12.0, the 4-step 6.0,
  // native/default stays 8): shift_video is a MARRIED knob, the
  // steps law's exact heir — while a distill rides, the knob is the
  // ROW'S (stated on the entry first, else the catalog row's
  // declared default, max across the bag); the resolved bag the
  // estate serves carries it (the resolver stamps it beside steps),
  // and compose falls back to the catalog row BY FILENAME so a
  // hand-authored bag marries too. The doc's OWN stated shift is the
  // user's word and never loses (the __shift_pinned stamp, the
  // __steps_pinned heir).
  it("ARM 14b — a resolved turbo8 bag marries shift 12 + steps 8 from the catalog row (the 8-step route's SOTA point)", async () => {
    const turbo8 = H3_LORA_ROWS.find((r) => r.id === "h3_turbo8_v1")!;
    // the RESOLVED wire shape the estate serves: filename + strength,
    // nothing stated on the entry — the row owns its married knobs
    const graph = await composeH3({
      length: 56,
      loras: [{ name: turbo8.filename, strength: 1 }],
      calls: [SHOT()],
    }, "h3_value_arm14b");
    assertValueAtConsumer(graph, "MiniMaxH3SigmaShift", "shift_video", 12,
      "the mounted 8-step distill's married shift (research: 8-step variants run shift_video 12.0)");
    assertValueAtConsumer(graph, "BasicScheduler", "steps", 8,
      "the mounted 8-step distill's married count (the catalog fallback — the row owns its 8, never the no-distill 6)");
  });

  it("ARM 14c — the user's stated shift never loses to the bag (the pin consult)", async () => {
    const turbo8 = H3_LORA_ROWS.find((r) => r.id === "h3_turbo8_v1")!;
    const graph = await composeH3({
      length: 56, shift_video: 5,
      loras: [{ name: turbo8.filename, strength: 1 }],
      calls: [SHOT()],
    }, "h3_value_arm14c");
    assertValueAtConsumer(graph, "MiniMaxH3SigmaShift", "shift_video", 5,
      "an explicit doc-level shift is the user's word — the marriage applies only to the unstated");
  });

  it("ARM 14d — a row that declares no shift (larryvrh v4: native/default) keeps the declared default 8", async () => {
    const larry = H3_LORA_ROWS.find((r) => r.id === "h3_larryvrh_v4_ema")!;
    const graph = await composeH3({
      length: 56,
      loras: [{ name: larry.filename, strength: 1 }],
      calls: [SHOT()],
    }, "h3_value_arm14d");
    assertValueAtConsumer(graph, "MiniMaxH3SigmaShift", "shift_video", 8,
      "larryvrh's README and the research table put him at native/default shift — the row declares none, the declared default owns");
    assertValueAtConsumer(graph, "BasicScheduler", "steps", 6,
      "his row's married 6 (the README's own 6–8 window, steps declared on the row)");
  });

  it("ARM 14e — the 4-step row marries its 6 (the 4-step SOTA point)", async () => {
    const turbo4 = H3_LORA_ROWS.find((r) => r.id === "h3_turbo4_v1")!;
    const graph = await composeH3({
      length: 56,
      loras: [{ name: turbo4.filename, strength: 1 }],
      calls: [SHOT()],
    }, "h3_value_arm14e");
    assertValueAtConsumer(graph, "MiniMaxH3SigmaShift", "shift_video", 6,
      "the 4-step distill's married shift (research: 4-step runs shift_video 6.0)");
    assertValueAtConsumer(graph, "BasicScheduler", "steps", 4,
      "the 4-step distill's married count");
  });

  it("ARM 15 — every stated sla_* rides H3SLAAttention verbatim + sla_enabled owns the attention switch", async () => {
    // (P0 audit 2026-11-10: the stated values stay NON-defaults.
    // The retuned default is sla_sparsity 0.85 — the research band
    // [0.75, 0.85]'s distilled-at edge (ARM 25/35 own it); block
    // "32" is unchanged (the kernel's own default, the plan's MATCH
    // verdict), so this arm states 0.75 and "64".)
    const graph = await composeH3({
      length: 56,
      sla_sparsity: 0.75, sla_block_size: "64", sla_min_seq_len: 1024,
      sla_dense_last_steps: 3, sla_dense_steps: "0,1", sla_dense_backend: "pytorch",
      sla_reference_protection: "Light", sla_protect_audio: false,
      sla_stabilize_motion: false, sla_disable_fp16_accum: false, sla_enabled: true,
      calls: [SHOT()],
    }, "h3_value_arm15");
    assertValueAtConsumer(graph, "H3SLAAttention", "sparsity_ratio", 0.75, "sla_sparsity");
    assertValueAtConsumer(graph, "H3SLAAttention", "block_size", "64", "sla_block_size");
    assertValueAtConsumer(graph, "H3SLAAttention", "min_seq_len", 1024, "sla_min_seq_len");
    assertValueAtConsumer(graph, "H3SLAAttention", "dense_last_steps", 3, "sla_dense_last_steps");
    assertValueAtConsumer(graph, "H3SLAAttention", "dense_steps", "0,1", "sla_dense_steps");
    assertValueAtConsumer(graph, "H3SLAAttention", "dense_backend", "pytorch", "sla_dense_backend");
    assertValueAtConsumer(graph, "H3SLAAttention", "protect_audio", false, "sla_protect_audio");
    assertValueAtConsumer(graph, "H3SLAAttention", "stabilize_motion", false, "sla_stabilize_motion");
    assertValueAtConsumer(graph, "H3SLAAttention", "disable_fp16_accum", false, "sla_disable_fp16_accum");
    // reference_protection is the enum → boolean fold ('Off' means it):
    // 'Light' composes TRUE at the kernel input — and the fold is
    // liveness-separated from a hardcoded true by the 'Off' leg below
    // (the default 'Heavy Enforcement' also folds true, so only the
    // false leg convicts a wiring that forgot the enum).
    assertValueAtConsumer(graph, "H3SLAAttention", "reference_protection", true, "sla_reference_protection (Light)");
    const off = await composeH3({
      length: 56,
      sla_enabled: true, sla_reference_protection: "Off",
      calls: [SHOT()],
    }, "h3_value_arm15_off");
    assertValueAtConsumer(off, "H3SLAAttention", "reference_protection", false, "sla_reference_protection (Off)");
    assert.equal(switchCarrying(graph, "H3SLAAttention").switch, true, "sla_enabled owns the attention switch");
  });

  it("ARM 16 — attention_backend verbatim at ModelAttentionBackend (the non-SLA arm's backend)", async () => {
    const graph = await composeH3({
      length: 56, attention_backend: "pytorch attention",
      calls: [SHOT()],
    }, "h3_value_arm16");
    assertValueAtConsumer(graph, "ModelAttentionBackend", "attention", "pytorch attention", "attention_backend");
  });

  it("ARM 17 — the interp + sr seats verbatim (model/multiplier at the FILM pair, resolution/DiT model at the SeedVR2 pair), both switches on under the master", async () => {
    const graph = await composeH3({
      length: 56,
      second_pass_enabled: true,
      interpolate_enabled: true, interp_model: "rife47.pth", interp_multiplier: 4,
      sr_switch: true, sr_model: "seedvr2_ema_3b_fp8_e4m3fn.safetensors", sr_resolution: 1440,
      calls: [SHOT()],
    }, "h3_value_arm17");
    assertValueAtConsumer(graph, "FrameInterpolationModelLoader", "model_name", "rife47.pth", "interp_model");
    assertValueAtConsumer(graph, "FrameInterpolate", "multiplier", 4, "interp_multiplier");
    assertValueAtConsumer(graph, "SeedVR2LoadDiTModel", "model", "seedvr2_ema_3b_fp8_e4m3fn.safetensors", "sr_model");
    assertValueAtConsumer(graph, "SeedVR2VideoUpscaler", "resolution", 1440, "sr_resolution");
    assert.equal(switchCarrying(graph, "FrameInterpolate").switch, true, "interpolate_enabled owns the interp switch");
    assert.equal(switchCarrying(graph, "SeedVR2VideoUpscaler").switch, true, "sr_switch owns the super-res switch");
  });

  it("ARM 18 — the five sharpen leaves verbatim in the ImageSharpenKJ method dict + sharpen_enabled owns the sharpen switch", async () => {
    const graph = await composeH3({
      length: 56,
      second_pass_enabled: true, sharpen_enabled: true,
      sharpen_method: "adaptive_usm", sharpen_strength: 0.55,
      sharpen_radius: 2.5, sharpen_threshold: 0.15, sharpen_iterations: 7,
      calls: [SHOT()],
    }, "h3_value_arm18");
    const sharpen = Object.values(graph).find((n) => n.class_type === "ImageSharpenKJ");
    assert.ok(sharpen, "the sharpen node composed (hop [5])");
    const method = sharpen.inputs.method as Record<string, unknown>;
    assert.deepEqual(
      { method: method.method, strength: method.strength, radius: method.radius, threshold: method.threshold, iterations: method.iterations },
      { method: "adaptive_usm", strength: 0.55, radius: 2.5, threshold: 0.15, iterations: 7 },
      "the stated sharpen leaves ride the grouped dict verbatim",
    );
    assert.equal(switchCarrying(graph, "ImageSharpenKJ").switch, true, "sharpen_enabled owns the sharpen switch");
  });

  it("ARM 19 — the media lanes reach their load/trim consumers: first frame + last_frame + ref_images at LoadImage, ref_videos at LoadVideo, the stated trim at Video Slice, ref_audios at LoadAudio", async () => {
    const graph = await composeH3({
      length: 56,
      image: "data/input/first.png", last_frame: "data/input/last.png",
      ref_images: ["data/input/ref1.png", "data/input/ref2.png"],
      ref_videos: ["data/input/motion.mp4"],
      ref_video_trims: [{ start_time: 1.5, duration: 2.5 }],
      ref_audios: ["data/input/voice.wav"],
      calls: [SHOT()],
    }, "h3_value_arm19");
    const loads = Object.values(graph).filter((n) => n.class_type === "LoadImage");
    for (const stated of ["data/input/first.png", "data/input/last.png", "data/input/ref1.png", "data/input/ref2.png"]) {
      assert.ok(loads.some((n) => n.inputs.image === stated),
        `IMAGE LANE VALUE ARM: no LoadImage carries '${stated}' — the stated media never reached the graph`);
    }
    assertValueAtConsumer(graph, "LoadVideo", "file", "data/input/motion.mp4", "ref_videos");
    assertValueAtConsumer(graph, "Video Slice", "start_time", 1.5, "ref_video_trims start");
    assertValueAtConsumer(graph, "Video Slice", "duration", 2.5, "ref_video_trims duration");
    assertValueAtConsumer(graph, "LoadAudio", "audio", "data/input/voice.wav", "ref_audios");
  });

  it("ARM 20 — the refmod dials verbatim at the bake head: mode/pool/identity/save ride MiniMaxH3RefModExtract", async () => {
    const graph = await composeH3({
      length: 56, ref_mods: ["data/input/pack.png"],
      refmod_mode: "Full Reference", refmod_pool: 24, refmod_identity: 700, refmod_save: false,
      calls: [SHOT()],
    }, "h3_value_arm20");
    assertValueAtConsumer(graph, "MiniMaxH3RefModExtract", "mode", "Full Reference", "refmod_mode");
    // THE POOL IS SQUARE AT THE KERNEL: the single dial composes BOTH
    // edges (pool_h AND pool_w) — pin both, never one.
    assertValueAtConsumer(graph, "MiniMaxH3RefModExtract", "pool_h", 24, "refmod_pool (h)");
    assertValueAtConsumer(graph, "MiniMaxH3RefModExtract", "pool_w", 24, "refmod_pool (w)");
    assertValueAtConsumer(graph, "MiniMaxH3RefModExtract", "identity", 700, "refmod_identity");
    assertValueAtConsumer(graph, "MiniMaxH3RefModExtract", "save", false, "refmod_save");
  });

  it("ARM 21 — the k pin: a two-window film's window ordinal reaches the graph as the save naming (w1 AND w2)", async () => {
    const graph = await composeH3({
      length: 124,
      calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
    }, "h3_value_arm21");
    const prefixes = Object.values(graph)
      .filter((n) => n.class_type === "SaveVideo")
      .map((n) => n.inputs.filename_prefix);
    for (const w of ["h3_t4_w1", "h3_t4_w2"]) {
      assert.ok(prefixes.includes(w), `WINDOW ORDINAL VALUE ARM: no SaveVideo names '${w}' (saw ${JSON.stringify(prefixes)}) — the window index never reached the engine's save face`);
    }
  });

  it("ARM 22 — duck_depth_db verbatim at the film mix (duck_db) + the image_name alias reaches LoadImage", async () => {
    // THE FILM HALF: the mix is the film tail (two windows) — the
    // stated duck depth lands at its duck_db input.
    const film = await composeH3({
      length: 124, duck_depth_db: -22,
      audio_clips: [{ src: "data/input/take.wav", start_frame: 0, dur_frames: 24, text: "hello there" }],
      calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
    }, "h3_value_arm22");
    assertValueAtConsumer(film, "MeliteFilmAudioMix", "duck_db", -22, "duck_depth_db");
    // THE ALIAS HALF: the call-level alias is the compose's documented
    // guide read (actions.ts — call.image ?? call.ref_image ??
    // call.image_name); the alias must reach LoadImage exactly like the
    // face's First frame spelling does.
    const alias = await composeH3({
      length: 56,
      calls: [SHOT({ image_name: "data/input/alias.png" })],
    }, "h3_value_arm22b");
    const loads = Object.values(alias).filter((n) => n.class_type === "LoadImage");
    assert.ok(loads.some((n) => n.inputs.image === "data/input/alias.png"),
      "GUIDE ALIAS VALUE ARM: no LoadImage carries the image_name alias — the alias died between seat and graph");
  });

  it("ARM 23 — the legacy switch aliases are retired dead law: a stated interp_switch never rides the interp switch (the primary owns it)", async () => {
    // THE RETIREMENT PIN (actions.ts, the one-owner note): the old
    // renderer-era aliases interp_switch and sharpen_switch are
    // gate-admitted for old drafts but the second-pass wiring reads
    // ONLY the primaries — a stated alias must NOT flip its switch
    // (if it ever does, this arm reds: the alias grew a second owner
    // behind the primary's back). sla_switch is NOT in this class:
    // the t4r arm READS it (the attention pick, actions.ts) — its
    // live seat has its own arm below (ARM 31); the census cell that
    // called it retired was the narration drift this block corrects.
    const graph = await composeH3({
      length: 56,
      second_pass_enabled: true, interp_switch: true,
      calls: [SHOT()],
    }, "h3_value_arm23");
    assert.equal(switchCarrying(graph, "FrameInterpolate").switch, false,
      "the stated legacy interp_switch flipped the interp switch — the alias rode behind the primary's back");
  });
});

// ── THE KNOB-BLOCK REMAINDER (2026-11-09, registry row
// models-h3-sampler-value-law): the class map above WITNESSES the
// seats; this block makes it FIRE. Three honest gaps closed:
// (1) LIVENESS PER CLASS — ARMs 13-23 assert values but only the
//     sampler five carried the ARM 3a drop-class self-red; every
//     class gets its own (the drop variant composes the consumer
//     carrying the declared default, and the stated-value arm must
//     THROW — a presence arm would pass, the VALUE arm is the law).
// (2) THE MIS-NARRATED SEAT — sla_switch is ALIVE on the t4r arm
//     (the attention pick reads it verbatim); it gets its value arms
//     + topology + the default-carrying CONTROL (ARM 31).
// (3) THE UNPINNED OWNERSHIPS — sharpen_switch joins the retirement
//     pair (ARM 32), the internal fps_seconds row's stated pin never
//     survives the render seat (ARM 33), and the per-window
//     noise_seed row rides the film stanza per key (ARM 34).
describe("the h3 knob-block remainder: per-class liveness + the mis-narrated and unpinned seats (2026-11-09, hop [4]→[5])", () => {
  /** The dict-probe with the VALUE voice for the grouped
   *  ImageSharpenKJ method (assertValueAtConsumer reads flat node
   *  inputs; the sharpen leaves ride a nested dict). */
  const sharpenStrengthArm = (graph: Graph, stated: number): void => {
    const sharpen = Object.values(graph).find((n) => n.class_type === "ImageSharpenKJ");
    assert.ok(sharpen, "the sharpen node composed (hop [5])");
    const method = sharpen.inputs.method as Record<string, unknown>;
    if (method.strength === stated) return;
    assert.fail(
      `SHARPEN VALUE ARM (hop [5], the consumer's dict): ImageSharpenKJ method.strength did not carry ` +
      `the stated value verbatim — expected ${JSON.stringify(stated)}, saw ${JSON.stringify(method.strength)} ` +
      `— the stated value never reached the engine's consumer (THE SILENT UI DROP, ERRORS.md bottom)`,
    );
  };
  /** The rider-stack probe with the VALUE voice (the refine strength
   *  rides the LTX stack_data JSON, not a flat input). */
  const riderStrengthArm = (graph: Graph, stated: number): void => {
    const riders = Object.values(graph).filter((n) =>
      n.class_type === "LTX_lora_loader"
      && typeof n.inputs.stack_data === "string"
      && (n.inputs.stack_data as string).includes("taomate"));
    assert.ok(riders.length >= 1, "the refine rider's loader composed (hop [5])");
    const stack = JSON.parse(riders[0]!.inputs.stack_data as string) as Array<{ str: number }>;
    if (stack[0]!.str === stated) return;
    assert.fail(
      `REFINE VALUE ARM (hop [5], the consumer's stack): the rider LTX stack carried strength ` +
      `${JSON.stringify(stack[0]!.str)}, expected the stated ${JSON.stringify(stated)} ` +
      `— the stated value never reached the engine's consumer (THE SILENT UI DROP, ERRORS.md bottom)`,
    );
  };
  /** THE SLA ATTENTION PICK (the t4r arm's own switch): its value,
   *  with the EDGE identities of both branches (ARM 4b's lesson —
   *  identity is the edge, never value coincidence). */
  const slaPick = (graph: Graph): { id: string; sel: unknown; onTrue: string; onFalse: string } => {
    const edge = (v: unknown): string => {
      assert.ok(Array.isArray(v) && typeof v[0] === "string",
        "SLA SWITCH ARM: the attention pick wired a branch as a literal — switches ride edges");
      const upstream = graph[v[0] as string];
      assert.ok(upstream, `SLA SWITCH ARM: the pick's edge named unknown node ${JSON.stringify(v[0])}`);
      return upstream.class_type;
    };
    for (const [id, n] of Object.entries(graph)) {
      if (n.class_type !== "ComfySwitchNode") continue;
      return { id, sel: n.inputs.switch, onTrue: edge(n.inputs.on_true), onFalse: edge(n.inputs.on_false) };
    }
    assert.fail("SLA SWITCH ARM: no ComfySwitchNode in the t4r graph — the attention pick never composed (hop [5])");
  };

  // ── THE PER-CLASS LIVENESS HALF (ARM 3a's pattern, every class):
  // each arm composes the DROP variant (the knob unstated), pins the
  // default the consumer carries, then requires the stated-value arm
  // to THROW with the VALUE voice — the proof the class's value arms
  // are comparators, never presence glances. ──

  it("ARM 24 (liveness, latent-shape) — width/height dropped compose the declared geometry floor at the r2v head, and the stated arms red with the VALUE voice", async () => {
    const graph = await composeH3({ length: 56, calls: [SHOT()] }, "h3_knob_arm24");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "width", 1344, "default width");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "height", 768, "default height");
    assert.throws(
      () => assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "width", 512, "width"),
      /WIDTH VALUE ARM/,
      "the arm PASSED on a dropped width — it is a presence arm, not a value arm; fix the arm, not the code",
    );
    assert.throws(
      () => assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "height", 480, "height"),
      /HEIGHT VALUE ARM/,
      "the arm PASSED on a dropped height — it is a presence arm, not a value arm; fix the arm, not the code",
    );
  });

  // ARM 25 (liveness, SLA; RE-AIMED by the P0 parameter audit,
  // 2026-11-10): the DECLARED default is 0.85 — the research band
  // [0.75, 0.85] (H3_TIMELINE_RESERACH §3 summary matrix) and the
  // kernel's own distilled-at value ("0.85 is the shipped default
  // and what the SLA turbo LoRA was distilled against", the census's
  // H3SLAAttention tooltip). The old 0.9 default sat OUTSIDE the
  // band — a wall pinning a wrong number is a wall worth re-aiming.
  // The stated 0.9 stays a LEGAL speed preset (the node's own "~15%
  // faster" word) and still must ride verbatim when stated.
  it("ARM 25 (liveness, SLA) — sla_sparsity dropped composes the declared 0.85 at the kernel, and the stated arm reds with the VALUE voice", async () => {
    const graph = await composeH3({ length: 56, calls: [SHOT()] }, "h3_knob_arm25");
    assertValueAtConsumer(graph, "H3SLAAttention", "sparsity_ratio", 0.85, "default sla_sparsity");
    assert.throws(
      () => assertValueAtConsumer(graph, "H3SLAAttention", "sparsity_ratio", 0.9, "sla_sparsity"),
      /SLA_SPARSITY VALUE ARM/,
      "the arm PASSED on a dropped sla_sparsity — it is a presence arm, not a value arm; fix the arm, not the code",
    );
  });

  it("ARM 26 (liveness, interp+sr) — interp_multiplier and sr_resolution dropped compose their declared defaults at the FILM/SeedVR2 pair, and the stated arms red", async () => {
    const graph = await composeH3({
      length: 56, second_pass_enabled: true, interpolate_enabled: true, sr_switch: true,
      calls: [SHOT()],
    }, "h3_knob_arm26");
    assertValueAtConsumer(graph, "FrameInterpolate", "multiplier", 2, "default interp_multiplier");
    assertValueAtConsumer(graph, "SeedVR2VideoUpscaler", "resolution", 1080, "default sr_resolution");
    assert.throws(
      () => assertValueAtConsumer(graph, "FrameInterpolate", "multiplier", 4, "interp_multiplier"),
      /INTERP_MULTIPLIER VALUE ARM/,
      "the arm PASSED on a dropped interp_multiplier — it is a presence arm, not a value arm; fix the arm, not the code",
    );
    assert.throws(
      () => assertValueAtConsumer(graph, "SeedVR2VideoUpscaler", "resolution", 1440, "sr_resolution"),
      /SR_RESOLUTION VALUE ARM/,
      "the arm PASSED on a dropped sr_resolution — it is a presence arm, not a value arm; fix the arm, not the code",
    );
  });

  it("ARM 27 (liveness, sharpen) — sharpen_strength dropped composes the node's own rcas 0.3 in the grouped dict, and the stated arm reds with the VALUE voice", async () => {
    const graph = await composeH3({
      length: 56, second_pass_enabled: true, sharpen_enabled: true,
      calls: [SHOT()],
    }, "h3_knob_arm27");
    sharpenStrengthArm(graph, 0.3);
    assert.throws(
      () => sharpenStrengthArm(graph, 0.55),
      /SHARPEN VALUE ARM/,
      "the arm PASSED on a dropped sharpen_strength — it is a presence arm, not a value arm; fix the arm, not the code",
    );
  });

  it("ARM 28 (liveness, refmod) — the dials dropped compose the declared defaults at the bake head, and the stated arms red with the VALUE voice", async () => {
    const graph = await composeH3({
      length: 56, ref_mods: ["data/input/pack.png"],
      calls: [SHOT()],
    }, "h3_knob_arm28");
    assertValueAtConsumer(graph, "MiniMaxH3RefModExtract", "pool_h", 16, "default refmod_pool (h)");
    assertValueAtConsumer(graph, "MiniMaxH3RefModExtract", "pool_w", 16, "default refmod_pool (w)");
    assertValueAtConsumer(graph, "MiniMaxH3RefModExtract", "identity", 500, "default refmod_identity");
    assert.throws(
      () => assertValueAtConsumer(graph, "MiniMaxH3RefModExtract", "pool_h", 24, "refmod_pool"),
      /REFMOD_POOL VALUE ARM/,
      "the arm PASSED on a dropped refmod_pool — it is a presence arm, not a value arm; fix the arm, not the code",
    );
    assert.throws(
      () => assertValueAtConsumer(graph, "MiniMaxH3RefModExtract", "identity", 700, "refmod_identity"),
      /REFMOD_IDENTITY VALUE ARM/,
      "the arm PASSED on a dropped refmod_identity — it is a presence arm, not a value arm; fix the arm, not the code",
    );
  });

  it("ARM 29 (liveness, sigma) — shift_video dropped composes the declared 8 at the sigma shift, and the stated arm reds with the VALUE voice (the receipt's toggle-A twin, in-spec)", async () => {
    const graph = await composeH3({ length: 56, calls: [SHOT()] }, "h3_knob_arm29");
    assertValueAtConsumer(graph, "MiniMaxH3SigmaShift", "shift_video", 8, "default shift_video");
    assert.throws(
      () => assertValueAtConsumer(graph, "MiniMaxH3SigmaShift", "shift_video", 11.5, "shift_video"),
      /SHIFT_VIDEO VALUE ARM/,
      "the arm PASSED on a dropped shift_video — it is a presence arm, not a value arm; fix the arm, not the code",
    );
  });

  it("ARM 30 (liveness, refine) — refine_strength dropped composes the catalog row's 0.7 on the rider stack, and the stated arm reds with the VALUE voice", async () => {
    const graph = await composeH3({
      length: 56, second_pass_enabled: true, refine_lora: "h3_taomate_3step",
      calls: [SHOT()],
    }, "h3_knob_arm30");
    riderStrengthArm(graph, 0.7);
    assert.throws(
      () => riderStrengthArm(graph, 0.9),
      /REFINE VALUE ARM/,
      "the arm PASSED on a dropped refine_strength — it is a presence arm, not a value arm; fix the arm, not the code",
    );
  });

  // ── THE MIS-NARRATED SEAT: sla_switch LIVES on the t4r arm. The
  // attention pick reads it verbatim (actions.ts: the injected scalar
  // replaces the bool node); the census cell that anchored it to the
  // retirement arm narrated a retirement that never happened. ──

  it("ARM 31 — a stated sla_switch rides the t4r attention pick verbatim (both poles), the branches stay SLA-direct vs chunked by edge, and the unstated doc rides the PrimitiveBoolean-false default node", async () => {
    // STATED TRUE: the pick carries the user's word as a literal...
    const on = await composeH3({
      length: 56, image: "data/input/anchor.png", sla_switch: true,
      calls: [SHOT()],
    }, "h3_knob_arm31_on");
    const pickOn = slaPick(on);
    assert.equal(pickOn.sel, true, "the stated sla_switch=true never reached the t4r attention pick (hop [5])");
    assert.equal(pickOn.onTrue, "MiniMaxChunkFeedForward", "the pick's on_true branch must stay the chunked chain");
    assert.equal(pickOn.onFalse, "H3SLAAttention", "the pick's on_false branch must stay the SLA kernel");
    // ...and FALSE is equally the user's word (the pole that proves
    // the seat is a read, not a constant true).
    const off = await composeH3({
      length: 56, image: "data/input/anchor.png", sla_switch: false,
      calls: [SHOT()],
    }, "h3_knob_arm31_off");
    assert.equal(slaPick(off).sel, false, "the stated sla_switch=false never reached the t4r attention pick (hop [5])");
    // CONTROL — UNSTATED rides the default-carrying node (the pick's
    // link into PrimitiveBoolean false). A presence arm passes here
    // (the node still composes); the VALUE arms above are the law.
    const unset = await composeH3({
      length: 56, image: "data/input/anchor.png",
      calls: [SHOT()],
    }, "h3_knob_arm31_unset");
    const pickUnset = slaPick(unset);
    assert.ok(Array.isArray(pickUnset.sel) && typeof pickUnset.sel[0] === "string",
      `the unstated doc's attention pick must ride the bool NODE (saw ${JSON.stringify(pickUnset.sel)})`);
    const boolNode = graph0(unset, pickUnset.sel[0] as string);
    assert.equal(boolNode.class_type, "PrimitiveBoolean", "the unstated pick's default node left the PrimitiveBoolean false seat");
    assert.equal(boolNode.inputs.value, false, "the unstated pick's default node must carry false (the t4r template's SLA-on default)");
  });

  it("ARM 32 — a stated sharpen_switch (the second retired alias) never rides the sharpen switch (the sharpen_enabled primary owns it)", async () => {
    // ARM 23 exercised interp_switch only; the sharpen alias gets its
    // own firing arm (same retirement law, own seat — the toggle that
    // wires the alias in reds THIS arm, not ARM 23).
    const graph = await composeH3({
      length: 56,
      second_pass_enabled: true, sharpen_switch: true,
      calls: [SHOT()],
    }, "h3_knob_arm32");
    assert.equal(switchCarrying(graph, "ImageSharpenKJ").switch, false,
      "the stated legacy sharpen_switch flipped the sharpen switch — the alias rode behind the primary's back");
  });

  // ── THE INTERNAL ROWS (the per-window trio's stand-downs, named):
  // fps_seconds is the render seat's DERIVATION — a stated pin is
  // clobbered before any node reads it (the no-stale law), and the
  // arm makes that ownership fire. ──

  it("ARM 33 — a stated fps_seconds never survives to the clock nodes: the t4r window's clock set stays the DERIVED seconds + the doc fps (the no-stale ownership, firing)", async () => {
    // 31 is in the declared row's [1,60] and is NOT the derived value
    // (56/16 = 3.5) — if a future edit lets the stated pin ride, the
    // clock set grows 31 and this arm reds.
    const graph = await composeH3({
      length: 56, fps: 16, fps_seconds: 31, image: "data/input/anchor.png",
      calls: [SHOT()],
    }, "h3_knob_arm33");
    const clockValues = Object.entries(graph)
      .filter(([, n]) => n.class_type === "PrimitiveFloat")
      .map(([, n]) => n.inputs.value).sort((a, b) => Number(a) - Number(b));
    assert.deepEqual(
      clockValues,
      [Math.round((56 / 16) * 1000) / 1000, 16],
      `the stated fps_seconds leaked to the clock set (saw ${JSON.stringify(clockValues)}) — the internal row grew a stated owner behind the render seat's derivation`,
    );
  });

  it("ARM 34 — the per-window noise_seed row: the film-level word fills BOTH windows' RandomNoise, and the call's own knob REPLACES it per window (window1_ / window2_)", async () => {
    const graph = await composeH3({
      length: 124, noise_seed: 909,
      calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124, knobs: { noise_seed: 555 } })],
    }, "h3_knob_arm34");
    assertValueAtConsumer(graph, "RandomNoise", "noise_seed", 909, "film-level noise_seed", "window1_");
    assertValueAtConsumer(graph, "RandomNoise", "noise_seed", 555, "call-level noise_seed", "window2_");
  });

  // ── THE P0 BAND ARMS (the parameter audit's gate, 2026-11-10 —
  // dev_docs/design/h3-sota-execution-plan-2026-11-10.md §2: "every
  // re-tune lands WITH its wall re-aim in the same change … and each
  // pinned number's wall spec carries the research citation"). ARM 25
  // pins the exact default; these arms make an OUT-OF-BAND default
  // ILLEGAL — a future nudge past either edge reds before the wall
  // can pin it. A stated out-of-band value stays the user's word
  // (ARMs 15/4b judge carriage; these judge the DEFAULT). ──

  it("ARM 35 (band) — the declared sla_sparsity default composes INSIDE the research band [0.75, 0.85] (P0 audit, 2026-11-10)", async () => {
    // CITATION: research band 0.75–0.85 (H3_TIMELINE_RESERACH §3
    // summary matrix; the plan's §2 row) + the kernel's own tooltip —
    // "0.85 is the shipped default and what the SLA turbo LoRA was
    // distilled against; 0.90 is the value validated here and is
    // ~15% faster" (object_info_prod H3SLAAttention). The shipped
    // 0.9 sat OUTSIDE the band — convicted and re-tuned to 0.85.
    const graph = await composeH3({ length: 56, calls: [SHOT()] }, "h3_knob_arm35");
    const sla = Object.values(graph).find((n) => n.class_type === "H3SLAAttention");
    assert.ok(sla, "the SLA kernel composed (hop [5])");
    const seen = sla!.inputs.sparsity_ratio;
    assert.ok(
      typeof seen === "number" && seen >= 0.75 && seen <= 0.85,
      `SLA_SPARSITY BAND ARM: the declared default composed ${JSON.stringify(seen)} — OUTSIDE the research band [0.75, 0.85] ` +
      `(the distilled-at-0.85 kernel contract; moving the default past the band needs the P3 arena's receipt, never a silent literal)`,
    );
  });

  it("ARM 36 (band) — the declared refine_denoise default composes INSIDE the Stage-2 window [0.30, 0.35], edge-identified (P0 audit, 2026-11-10)", async () => {
    // CITATION: the research's refinement window 0.30–0.35 @ 4–6
    // steps (H3_TIMELINE_RESERACH Stage 3; the plan's §2 refine_denoise
    // row; ROADMAP LIMB 1). The shipped 1.0 was the TaoMate
    // full-denoise mechanic — a whole-window regeneration, not a
    // refinement; the default is now 0.35 and 1.0 stays STATEABLE.
    const graph = await composeH3({
      length: 56, second_pass_enabled: true, refine_lora: "h3_taomate_3step",
      calls: [SHOT()],
    }, "h3_knob_arm36");
    // TOPOLOGY FIRST (ARM 4b's lesson): the rider is the scheduler the
    // SECOND SamplerCustomAdvanced's sigmas edge names — never a
    // value-coincidence scan.
    const samplers = Object.entries(graph).filter(([, n]) => n.class_type === "SamplerCustomAdvanced");
    assert.equal(samplers.length, 2, "the refine rider mounts (TWO SamplerCustomAdvanced)");
    const riders = samplers
      .map(([sid, s]) => {
        const edge = s.inputs.sigmas;
        assert.ok(Array.isArray(edge) && typeof edge[0] === "string", `sampler ${sid} wired sigmas as a literal — schedulers ride edges`);
        const node = graph[edge[0] as string];
        assert.ok(node, `sampler ${sid}'s sigmas edge named unknown node`);
        return node;
      })
      .filter((n) => n.class_type === "BasicScheduler");
    assert.equal(riders.length, 2, "every sampler's sigmas edge resolves to a BasicScheduler");
    // The RIDER within the edge-resolved pair: the scheduler carrying
    // the taomate ROW's own 3 steps (the row owns that count — ARM 7;
    // the pair's other member is the primary pass, whose denoise is
    // the main denoise knob, not this law's subject).
    const riderScheds = riders.filter((r) => r.inputs.steps === 3);
    assert.ok(riderScheds.length >= 1, "the rider scheduler (the row's own 3 steps) resolved among the edge pair");
    const seen = riderScheds.map((r) => r.inputs.denoise);
    for (const d of seen) {
      assert.ok(
        typeof d === "number" && d >= 0.3 && d <= 0.35,
        `REFINE_DENOISE BAND ARM: the declared default composed ${JSON.stringify(d)} — OUTSIDE the Stage-2 refinement window [0.30, 0.35] ` +
        `(research LIMB 1; the full-denoise 1.0 stays a stated mechanic, never the default)`,
      );
    }
  });
});

/** Fetch one node by id with the assert voice (the CONTROL arms'
 *  edge reader). */
function graph0(graph: Graph, id: string): GNode {
  const n = graph[id];
  assert.ok(n, `the graph carries no node '${id}' — the edge named a ghost`);
  return n;
}
