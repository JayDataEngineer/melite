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
import { DECL } from "../src/index.ts";
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

  it("ARM 7 — unstated refine overrides default from the catalog row (taomate 0.35 @ 3 steps, the spec's refiner operating point)", async () => {
    // ONE OWNER PER KNOB (schema.ts:207-208): refine_lora picks the
    // instrument; strength/steps default FROM THE ROW. Stating only
    // the id must ride the row's operating point — the spec's
    // matrix seats the refiner at 0.35 (light touch, "avoid
    // over-refinement"; timeline audit cure 5, 2026-10-27).
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
    assert.equal(stack[0]!.str, 0.35, "unstated strength defaults from the row (taomate 0.35, the spec's refiner point — cure 5)");
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
  // THE GRAPH-MIRROR RE-PIN (burn b, 2026-10-26): the sharpen limb
  // mounts IFF its gate composes on — no always-built node, no
  // routing switch. The limb's PRESENCE is the gate's verdict home
  // (the serialized graph names the drop by the node's absence);
  // the grouped dict is judged only when the limb rides.
  const sharpenParts = (graph: Record<string, { class_type: string; inputs: Record<string, unknown> }>) => {
    const sharpenEntry = Object.entries(graph).find(([, n]) => n.class_type === "ImageSharpenKJ");
    return {
      present: sharpenEntry !== undefined,
      dict: sharpenEntry?.[1].inputs.method,
    };
  };

  it("ARM 10 (SD-2 master/leaf, gate ON) — a stated sharpen leaf reaches the grouped dict and the sharpen limb rides the graph", async () => {
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
      seed: SEED,
      second_pass_enabled: true,
      sharpen_enabled: true,
      sharpen_strength: 0.65,
    }, "h3_value_arm10");
    const { present, dict } = sharpenParts(graph);
    assert.ok(present, "the master + sharpen gates mount the ImageSharpenKJ limb");
    assert.ok(JSON.stringify(dict).includes("0.65"),
      `the stated leaf rides the grouped dict (saw ${JSON.stringify(dict)})`);
  });

  it("ARM 11 (SD-2 master/leaf, gate OFF) — a stated leaf WITHOUT the gate composes NO sharpen limb (the drop is the DESIGNED gate, named by the node's absence — never a value riding a dead limb)", async () => {
    // THE DOCUMENTED GATE (actions.ts MASTER GATE, 2026-09-22):
    // legacy docs with leaves set but no master render the plain
    // pass. THE MIRROR AMENDMENT (burn b, 2026-10-26): the pre-burn
    // shape kept the limb (and the stated leaf inside it) on the
    // graph behind a false switch — a dead limb carrying values the
    // engine would never use. The graph now names the gate's verdict
    // the only honest way: the limb does not compose.
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
      seed: SEED,
      sharpen_strength: 0.65,
    }, "h3_value_arm11");
    const { present } = sharpenParts(graph);
    assert.ok(!present, "no master ⇒ no ImageSharpenKJ limb at all (the plain pass composes plain)");
  });

  it("ARM 12 (SD-2 master/leaf, master ON + sub-gate OFF) — a second-pass doc WITHOUT the sharpen arm composes no sharpen limb", async () => {
    // THE SUB-GATE'S OWN ARM: second_pass_enabled is the master,
    // sharpen_enabled is the sharpen arm's switch WITHIN it. The
    // operator case: the second pass runs (interp / sr) with
    // sharpening off — the arm must not fire. Masking note: with the
    // master off the sub-gate is unobservable (the && short-circuits
    // false), so THIS arm is the only judge of the sharpen_enabled
    // term — toggle it out and the limb asserts present here.
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
      seed: SEED,
      second_pass_enabled: true,
      sharpen_enabled: false,
      sharpen_strength: 0.65,
    }, "h3_value_arm12");
    const { present } = sharpenParts(graph);
    assert.ok(!present, "the sharpen sub-gate stays closed without sharpen_enabled (the master alone must not sharpen)");
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
      // ref_image_size rides its DEFAULT ("match") since F-10's probe
      // (2026-10-27): the engine's core node answers value_not_in_list
      // for any WxH literal, so the only lawful spelling is the one
      // literal both truths admit — the verbatim witness rides it.
      ref_image_size: "match",
      calls: [SHOT({ start_frame: 0, end_frame: 124 })],
    }, "h3_value_arm13");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "width", 512, "width");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "height", 480, "height");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "length", 124, "length");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "ref_image_size", "match", "ref_image_size");
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
    // THE MIRROR RE-PIN (burn b, 2026-10-26): the limbs' presence IS
    // the switches' verdict — no routing switch composes anymore.
    assert.ok(Object.values(graph).some((n) => n.class_type === "FrameInterpolate"), "interpolate_enabled mounts the interp limb");
    assert.ok(Object.values(graph).some((n) => n.class_type === "SeedVR2VideoUpscaler"), "sr_switch mounts the super-res limb");
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
    assert.ok(Object.values(graph).some((n) => n.class_type === "ImageSharpenKJ"), "sharpen_enabled mounts the sharpen limb (the mirror law: presence is the verdict)");
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
    // THE MIRROR RE-PIN (burn b, 2026-10-26): no switch composes —
    // the alias's crime shape would be a mounted limb.
    assert.ok(!Object.values(graph).some((n) => n.class_type === "FrameInterpolate"),
      "the stated legacy interp_switch mounted the interp limb — the alias rode behind the primary's back");
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

  it("ARM 30 (liveness, refine) — refine_strength dropped composes the catalog row's 0.35 (the spec's refiner point, cure 5) on the rider stack, and the stated arm reds with the VALUE voice", async () => {
    const graph = await composeH3({
      length: 56, second_pass_enabled: true, refine_lora: "h3_taomate_3step",
      calls: [SHOT()],
    }, "h3_knob_arm30");
    riderStrengthArm(graph, 0.35);
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
    // THE MIRROR RE-PIN (burn b, 2026-10-26): no switch composes —
    // the alias's crime shape would be a mounted limb.
    assert.ok(!Object.values(graph).some((n) => n.class_type === "ImageSharpenKJ"),
      "the stated legacy sharpen_switch mounted the sharpen limb — the alias rode behind the primary's back");
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

// ── THE P2 LATENT-UPSCALE ROUTE (the SOTA plan's Phase P2, 2026-11-10 —
// dev_docs/design/h3-sota-execution-plan-2026-11-10.md §4: the vendored
// xmarre pack's MinimaxH3LatentUpscaler3DRefineHandoff rides the pass-1
// joint AV latent in-band, behind second_pass_enabled + the
// upscale_route sub-gate — z_v through the LBH kernel, z_a preserved
// under lock_audio). ARMs 37-39 pin the mount (the class + the full pin
// set + the channel-count and grid-legality topology); ARMs 40-42 the
// three-state switch parity (on / off / off-with-stated-leaf, the ARMs
// 10-12 law's heir); ARMs 43-44 the rider firewall both ways (the rider
// never hijacks the arm, the arm never strands the rider); ARM 45 the
// dropdown-file + Stage-2 schedule liveness; ARM 46 the sigmas-law
// refusal (denoise 1.0 illegal on-arm, legal off-arm). ──
describe("the h3 latent-upscale route: the handoff arm mounts behind second_pass_enabled + upscale_route (P2, hop [4]→[5])", () => {
  const HANDOFF = "MinimaxH3LatentUpscaler3DRefineHandoff";
  const UPSCALE_FILE = "minimax_h3_latent_upscaler_3d_bf16.safetensors";
  /** THE HANDOFF PROBE with the VALUE voice (ARM 4b's lesson): the node
   *  by class, exactly one per window — never a presence glance at a
   *  coincidental class name. */
  const handoff = (graph: Graph): { id: string; node: GNode } => {
    const found = Object.entries(graph).filter(([, n]) => n.class_type === HANDOFF);
    assert.equal(found.length, 1,
      `UPSCALE MOUNT ARM (hop [5]): expected exactly one '${HANDOFF}' in the single-window graph, saw ${found.length} — the arm never mounted (or mounted twice)`);
    return { id: found[0]![0], node: found[0]![1] };
  };
  /** THE EDGE reader (slaPick's heir): the named input must be a link,
   *  and the link must name a node of the expected class. */
  const edgeUpstream = (graph: Graph, fromId: string, input: string, expectCls: string): { id: string; node: GNode } => {
    const from = graph[fromId];
    assert.ok(from, `UPSCALE EDGE ARM: the graph carries no node '${fromId}' — the edge named a ghost`);
    const edge = from.inputs[input];
    assert.ok(Array.isArray(edge) && typeof edge[0] === "string",
      `UPSCALE EDGE ARM: node '${fromId}' (${from.class_type}) input '${input}' is not an edge (saw ${JSON.stringify(edge)}) — schedulers ride edges`);
    const upstream = graph[edge[0] as string];
    assert.ok(upstream, `UPSCALE EDGE ARM: node '${fromId}' input '${input}' named unknown node ${JSON.stringify(edge[0])}`);
    assert.equal(upstream.class_type, expectCls,
      `UPSCALE EDGE ARM: node '${fromId}' input '${input}' resolves to '${upstream.class_type}', expected '${expectCls}' — the arm wired the wrong upstream`);
    return { id: edge[0] as string, node: upstream };
  };
  /** THE STAGE-2 SCHEDULER: the BasicScheduler the handoff's own sigmas
   *  edge names (ARM 36's topology — never a value-coincidence scan). */
  const handoffScheduler = (graph: Graph, hid: string): GNode =>
    edgeUpstream(graph, hid, "sigmas", "BasicScheduler").node;

  it("ARM 37 (mount) — route latent_2x mounts the handoff with the full pin set on edges (the pack's ledge: scale-by, bf16, cuda, cfg 1.0, lock_audio)", async () => {
    const graph = await composeH3({
      length: 56, width: 1280, height: 768,
      second_pass_enabled: true, upscale_route: "latent_2x",
      calls: [SHOT()],
    }, "h3_upscale_arm37");
    const { id, node } = handoff(graph);
    assertValueAtConsumer(graph, HANDOFF, "mode", "scale by multiplier", "handoff mode");
    assertValueAtConsumer(graph, HANDOFF, "scale", 2.0, "handoff scale");
    assertValueAtConsumer(graph, HANDOFF, "lock_audio", true, "handoff lock_audio");
    assertValueAtConsumer(graph, HANDOFF, "precision", "bf16", "handoff precision");
    assertValueAtConsumer(graph, HANDOFF, "device", "cuda", "handoff device");
    assertValueAtConsumer(graph, HANDOFF, "cfg", 1.0, "handoff cfg");
    assertValueAtConsumer(graph, HANDOFF, "model_name", UPSCALE_FILE, "handoff model_name");
    for (const input of ["latent", "noise", "sampler", "model", "positive", "sigmas"]) {
      assert.ok(Array.isArray(node.inputs[input]) && typeof (node.inputs[input] as unknown[])[0] === "string",
        `UPSCALE MOUNT ARM: node '${id}' input '${input}' is not an edge — the handoff's seats ride links, never literals`);
    }
    edgeUpstream(graph, id, "sigmas", "BasicScheduler");
    edgeUpstream(graph, id, "sampler", "KSamplerSelect");
    edgeUpstream(graph, id, "noise", "RandomNoise");
    // THE STAGE-3 MODEL LAW (spec-match cure 1, timeline audit
    // 2026-10-27 — supersedes the shared-stack pin): the handoff
    // still rides the pass-1 stack's conditioning (one prompt
    // voice), but its MODEL edge is FORKED off the pre-LoRA chain
    // whenever the primary bag carries a counting distill (the
    // default bag does — h3_turbo8_v1). Walking the handoff's model
    // edge upstream, the chain must NEVER cross an LTX_lora_loader
    // (the spec's diagnostic matrix: "Distilled LoRAs at low
    // denoise predict invalid noise fields" — the waxy-skin face),
    // while pass 1's own chain crosses exactly the primary one.
    const chainUpstream = (graph: Graph, fromId: string, input: string, maxHops = 8): string[] => {
      const path: string[] = [];
      let cursor = fromId;
      for (let i = 0; i < maxHops; i++) {
        const edge = graph[cursor]?.inputs[input];
        if (!Array.isArray(edge) || typeof edge[0] !== "string") break;
        path.push(edge[0] as string);
        cursor = edge[0] as string;
      }
      return path;
    };
    const pass1 = Object.entries(graph).find(([, n]) => n.class_type === "SamplerCustomAdvanced");
    assert.ok(pass1, "UPSCALE MOUNT ARM: no pass-1 SamplerCustomAdvanced — the arm has no latent to upscale");
    // pass 2: no lora loader anywhere on the model chain
    const pass2Chain = chainUpstream(graph, id, "model");
    const pass2LoraLoaders = pass2Chain.filter((nid) => graph[nid]?.class_type === "LTX_lora_loader");
    assert.equal(pass2LoraLoaders.length, 0,
      `UPSCALE MOUNT ARM (Stage-3 model law): the handoff's model chain crosses ${pass2LoraLoaders.length} LTX_lora_loader node(s) — pass 2 must ride the UN-DISTILLED base at a sub-1 window (the spec's waxy-skin mechanism), nodes: ${pass2Chain.join(", ")}`);
    // ...and the fork is real: the chain reaches the UNET switch
    // (ComfySwitchNode) with a SigmaShift + AdaLN fix above it
    const pass2Classes = pass2Chain.map((nid) => graph[nid]?.class_type);
    for (const expected of ["MiniMaxH3SigmaShift", "H3AdaLNLoRAFix", "ComfySwitchNode"]) {
      assert.ok(pass2Classes.includes(expected),
        `UPSCALE MOUNT ARM (Stage-3 model law): the handoff's model chain ${JSON.stringify(pass2Classes)} lacks '${expected}' — the fork lost the shift grid / the AdaLN fix / the UNET switch`);
    }
    // pass 1: the primary loader still rides ITS chain (the fork
    // must not have starved pass 1 of its distill)
    const pass1Sched = edgeUpstream(graph, pass1[0], "sigmas", "BasicScheduler");
    const pass1Chain = chainUpstream(graph, pass1Sched.id, "model");
    const pass1LoraLoaders = pass1Chain.filter((nid) => graph[nid]?.class_type === "LTX_lora_loader");
    assert.equal(pass1LoraLoaders.length, 1,
      `UPSCALE MOUNT ARM: pass 1's model chain crosses ${pass1LoraLoaders.length} LTX_lora_loader node(s), expected the primary one — the fork starved pass 1`);
    // the conditioning stays SHARED (one prompt voice across passes)
    const passGuider = edgeUpstream(graph, pass1[0], "guider", "BasicGuider").node;
    assert.deepEqual(node.inputs.positive, passGuider.inputs.conditioning,
      `UPSCALE MOUNT ARM: the handoff's positive edge ${JSON.stringify(node.inputs.positive)} is not the pass-1 guider's ${JSON.stringify(passGuider.inputs.conditioning)} — the refinement would hear a forked conditioning`);
  });

  it("ARM 37b (audit 015 C4/C7, the golden blind-spot pin) — the handoff carries the STATED pass-2 geometry in multiplier mode: width/height ride the full-size target, never silent engine defaults", async () => {
    // THE C4 DECISION (audit 015 C4, the width spelling): the
    // handoff keeps p.width/p.height as the pass-2 FULL-SIZE TARGET
    // (aspect kept via keep_proportion; multiplier mode ignores the
    // absolute size and scales z_v 2.0×) — the cure is the SPEC PIN,
    // not a re-spelling: a golden churn here would freeze bytes the
    // engine owns. The pin asserts the stated values AND the mode
    // together — the geometry rows are meaningful only beside
    // 'scale by multiplier', and a mode flip to absolute sizing
    // would make stale width/height a silent wrong-size render.
    // DISTINCTIVE geometry (never the schema default pair): a
    // defaulted seat cannot pass this arm.
    const W = 1024, H = 576;
    const graph = await composeH3({
      length: 56, width: W, height: H,
      second_pass_enabled: true, upscale_route: "latent_2x",
      calls: [SHOT()],
    }, "h3_upscale_arm37b");
    const { id, node } = handoff(graph);
    assert.equal(node.inputs["mode"], "scale by multiplier",
      `UPSCALE GEOMETRY ARM (audit 015 C4): node '${id}' mode must be 'scale by multiplier' — the geometry pin is lawful only in multiplier mode`);
    assertValueAtConsumer(graph, HANDOFF, "width", W, "pass-2 width target");
    assertValueAtConsumer(graph, HANDOFF, "height", H, "pass-2 height target");
    assertValueAtConsumer(graph, HANDOFF, "keep_proportion", true, "aspect kept from the stated pair");
    // THE C7 DEFAULT-SEAT CONFIRMATION: RandomNoise.noise_seed's
    // default seat is already pinned (ARM 13/34 cover the stated
    // seats, the default-seed arm covers the unstated fill) — the
    // one golden blind-spot was THIS node's geometry rows.
  });

  it("ARM 38 (channel-count) — the handoff's latent edge names the pass-1 SAMPLER (the sampled joint AV, 24 video ch — never the empty shell), and lock_audio pins true", async () => {
    const graph = await composeH3({
      length: 56, width: 1280, height: 768,
      second_pass_enabled: true, upscale_route: "latent_2x",
      calls: [SHOT()],
    }, "h3_upscale_arm38");
    const { id } = handoff(graph);
    // THE MIS-WIRE this convicts: the empty-latent node (the 24ch
    // unsampled shell) or any non-sampler upstream — a 16ch wire or an
    // unsampled wire would throw inside the LBH kernel, never here.
    edgeUpstream(graph, id, "latent", "SamplerCustomAdvanced");
    assertValueAtConsumer(graph, HANDOFF, "lock_audio", true, "handoff lock_audio (the audio-preservation pin)");
  });

  it("ARM 39 (grid-legality) — scale 2.0 halves the r2v head (1280×768 → 640×384) and the VAE decode rides the handoff's upscaled latent (no temporal op between)", async () => {
    const graph = await composeH3({
      length: 56, width: 1280, height: 768,
      second_pass_enabled: true, upscale_route: "latent_2x",
      calls: [SHOT()],
    }, "h3_upscale_arm39");
    const { id, node } = handoff(graph);
    assert.equal(node.inputs.scale, 2.0, "the handoff scale is the 2.0 leg (the grid law's only legal factor)");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "width", 640, "halved r2v width");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "height", 384, "halved r2v height");
    // THE TEMPORAL leg: the handoff's latent edge names the sampler
    // DIRECTLY (no frame op between — the edge identity IS the proof).
    const latent = node.inputs.latent as unknown[];
    assert.ok(Array.isArray(latent) && typeof latent[0] === "string", "the handoff latent is not an edge");
    assert.equal(graph[latent[0] as string]?.class_type, "SamplerCustomAdvanced",
      "a node sits between the pass-1 sampler and the handoff — the temporal frames would fork");
    // THE DECODE leg: a VAE decode downstream whose samples edge names
    // the handoff (the upscaled latent decodes, never the pass-1 one).
    const decodes = Object.entries(graph).filter(([, n]) => n.class_type.includes("VAEDecode"));
    assert.ok(decodes.length >= 1, "UPSCALE GRID ARM: no VAE decode in the graph — the upscaled latent never decodes");
    assert.ok(decodes.some(([, d]) => {
      const samples = d.inputs.samples as unknown[];
      return Array.isArray(samples) && samples[0] === id;
    }), `UPSCALE GRID ARM: no VAE decode's samples edge names the handoff '${id}' — the decode still rides the pass-1 latent`);
  });

  it("ARM 40 (switch parity, ON) — route latent_2x: the handoff mounts AND the head halves (the verdict's home)", async () => {
    const graph = await composeH3({
      length: 56, width: 1280, height: 768,
      second_pass_enabled: true, upscale_route: "latent_2x",
      calls: [SHOT()],
    }, "h3_upscale_arm40");
    handoff(graph);
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "width", 640, "halved r2v width (switch ON)");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "height", 384, "halved r2v height (switch ON)");
  });

  it("ARM 41 (switch parity, OFF) — the default route: no handoff anywhere, the head stays stated, the refine rider still mounts (the master is alive)", async () => {
    const graph = await composeH3({
      length: 56, width: 1280, height: 768,
      second_pass_enabled: true, refine_lora: "h3_taomate_3step",
      calls: [SHOT()],
    }, "h3_upscale_arm41");
    assert.ok(!Object.values(graph).some((n) => n.class_type === HANDOFF),
      "UPSCALE SWITCH ARM (OFF): the handoff mounted with the route off — the plain pass is no longer plain");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "width", 1280, "stated r2v width (switch OFF)");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "height", 768, "stated r2v height (switch OFF)");
    const samplers = Object.values(graph).filter((n) => n.class_type === "SamplerCustomAdvanced");
    assert.equal(samplers.length, 2, "the refine rider still mounts with the route off (TWO samplers) — the upscale arm must not strand the rider");
  });

  it("ARM 42 (switch parity, OFF-with-stated-leaf) — the route off with a stated upscale_model composes the plain pass: the leaf drops WITH its unmounted arm", async () => {
    // ARM 5's cross-gate precedent (refine seats without the master
    // compose the plain pass), NOT ARM 11's in-dict carry: an unmounted
    // arm carries nothing — there is no dict to ride, no switch to
    // route, and a refusal would strand old drafts that state the leaf
    // (the gate-admission canon). The firewall matters: the leaf must
    // never summon the mount behind the switch's back.
    const graph = await composeH3({
      length: 56, width: 1280, height: 768,
      second_pass_enabled: true, upscale_model: UPSCALE_FILE,
      calls: [SHOT()],
    }, "h3_upscale_arm42");
    assert.ok(!Object.values(graph).some((n) => n.class_type === HANDOFF),
      "UPSCALE SWITCH ARM (OFF-leaf): the stated upscale_model summoned the mount with the route off — the leaf owns a switch it was never given");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "width", 1280, "stated r2v width (OFF-leaf)");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "height", 768, "stated r2v height (OFF-leaf)");
  });

  it("ARM 43 (rider firewall, ON) — route on + refine_lora: the rider mounts IN-BAND (its sampler's latent edge names the handoff) at the row's own 3 steps", async () => {
    const graph = await composeH3({
      length: 56, width: 1280, height: 768,
      second_pass_enabled: true, upscale_route: "latent_2x", refine_lora: "h3_taomate_3step",
      calls: [SHOT()],
    }, "h3_upscale_arm43");
    const { id } = handoff(graph);
    const samplers = Object.entries(graph).filter(([, n]) => n.class_type === "SamplerCustomAdvanced");
    assert.equal(samplers.length, 2, "route on + rider: TWO samplers (pass-1 + in-band rider)");
    const rider = samplers.find(([, s]) => (s.inputs.latent_image as unknown[])?.[0] === id);
    assert.ok(rider, `UPSCALE RIDER ARM: no sampler's latent_image edge names the handoff '${id}' — the rider is not in-band on the upscaled latent`);
    const sched = edgeUpstream(graph, rider[0], "sigmas", "BasicScheduler").node;
    assert.equal(sched.inputs.steps, 3, "the in-band rider's scheduler carries the taomate row's own 3 steps (ARM 7's marriage survives the arm)");
  });

  it("ARM 44 (rider firewall, OFF) — route off + refine_lora: the rider mounts WITHOUT the handoff at stated geometry (the arm never hijacks the rider)", async () => {
    const graph = await composeH3({
      length: 56, width: 1280, height: 768,
      second_pass_enabled: true, refine_lora: "h3_taomate_3step",
      calls: [SHOT()],
    }, "h3_upscale_arm44");
    assert.ok(!Object.values(graph).some((n) => n.class_type === HANDOFF),
      "UPSCALE RIDER ARM (OFF): the handoff mounted with the route off — the rider's lane is no longer its own");
    const samplers = Object.values(graph).filter((n) => n.class_type === "SamplerCustomAdvanced");
    assert.equal(samplers.length, 2, "the rider still mounts with the route off (TWO samplers)");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "width", 1280, "stated r2v width (rider, route OFF)");
    assertValueAtConsumer(graph, "MiniMaxH3ReferenceToVideo", "height", 768, "stated r2v height (rider, route OFF)");
  });

  it("ARM 45 (liveness, Stage-2 schedule) — the handoff's own scheduler carries the dropped defaults (doc steps + 0.35), the stated denoise rides, and a riderless stated steps drops (ARM 5's cross-gate law)", async () => {
    const graph = await composeH3({
      length: 56, width: 1280, height: 768,
      second_pass_enabled: true, upscale_route: "latent_2x",
      calls: [SHOT()],
    }, "h3_upscale_arm45");
    const { id } = handoff(graph);
    const sched = handoffScheduler(graph, id);
    assert.equal(sched.inputs.steps, 6, "the handoff scheduler carries the doc-default steps when the rider is absent");
    assert.equal(sched.inputs.denoise, 0.35, "the handoff scheduler carries the declared 0.35 when refine_denoise rides unstated");
    assert.throws(
      () => assert.equal(handoffScheduler(graph, id).inputs.denoise, 0.3, "stated denoise"),
      /0\.3\b/,
      "the arm PASSED on a dropped refine_denoise — it is a presence arm, not a value arm; fix the arm, not the code",
    );
    // THE STATED DENOISE rides with NO rider mounted (the P2 verdict's
    // core: refine_denoise is no longer the rider's private seat).
    const stated = await composeH3({
      length: 56, width: 1280, height: 768,
      second_pass_enabled: true, upscale_route: "latent_2x", refine_denoise: 0.3,
      calls: [SHOT()],
    }, "h3_upscale_arm45_stated");
    assert.equal(handoffScheduler(stated, handoff(stated).id).inputs.denoise, 0.3,
      "STAGE-2 DENOISE VALUE ARM: the stated refine_denoise never reached the handoff scheduler — the denoise is still the rider's private seat");
    // THE RIDERLESS STEPS is a cross-gate leaf (ARM 5): stated
    // refine_steps without a rider never reaches the Stage-2 schedule.
    const stepless = await composeH3({
      length: 56, width: 1280, height: 768,
      second_pass_enabled: true, upscale_route: "latent_2x", refine_steps: 9,
      calls: [SHOT()],
    }, "h3_upscale_arm45_stepless");
    assert.equal(handoffScheduler(stepless, handoff(stepless).id).inputs.steps, 6,
      "STAGE-2 STEPS VALUE ARM: a riderless stated refine_steps reached the handoff scheduler — the cross-gate leaf grew an owner behind ARM 5's back");
  });

  it("ARM 46 (sigmas-law refusal) — denoise 1.0 + route latent_2x refuses LOUD naming the vendored sigmas law (run_h3_refinement: 0 <= sigmas[0] < 1); off-arm 1.0 stays legal (the taomate full-denoise mechanic)", async () => {
    // ON-ARM: a full-noise Stage-2 schedule would open AT sigma_max and
    // discard the learned upscaled latent at the engine — the refusal
    // fires HERE, at compose, in the handoff's own voice.
    await assert.rejects(
      composeH3({
        length: 56, width: 1280, height: 768,
        second_pass_enabled: true, upscale_route: "latent_2x", refine_denoise: 1,
        calls: [SHOT()],
      }, "h3_upscale_arm46_refused"),
      /sigmas\[0\] < 1|partial-denoise/,
      "denoise 1.0 on the latent-upscale arm composed a full-noise schedule — the handoff would discard the upscaled latent at the engine (run_h3_refinement refuses sigmas[0] >= 1)",
    );
    // OFF-ARM: 1.0 stays legal — the rider's taomate full-denoise
    // mechanic never crosses the handoff node.
    const graph = await composeH3({
      length: 56, width: 1280, height: 768,
      second_pass_enabled: true, refine_lora: "h3_taomate_3step", refine_denoise: 1,
      calls: [SHOT()],
    }, "h3_upscale_arm46_taomate");
    assert.ok(!Object.values(graph).some((n) => n.class_type === HANDOFF),
      "UPSCALE SIGMAS ARM (OFF): the handoff mounted with the route off — the taomate mechanic must never cross the handoff node");
    const samplers = Object.entries(graph).filter(([, n]) => n.class_type === "SamplerCustomAdvanced");
    assert.equal(samplers.length, 2, "the taomate full-denoise rider still mounts off-arm (TWO samplers)");
    // THE EDGE-IDENTIFIED rider (ARM 4b's topology): the scheduler the
    // rider sampler's sigmas edge NAMES, carrying the row's own 3 steps.
    const rider = samplers.find(([, s]) => {
      const edge = s.inputs.sigmas;
      if (!Array.isArray(edge) || typeof edge[0] !== "string") return false;
      return (graph[edge[0] as string] as GNode)?.inputs.steps === 3;
    });
    assert.ok(rider, "UPSCALE SIGMAS ARM (OFF): no rider scheduler carries the taomate row's own 3 steps — the rider never mounted");
    assert.equal(edgeUpstream(graph, rider[0], "sigmas", "BasicScheduler").node.inputs.denoise, 1,
      "the off-arm rider scheduler does not carry the stated full-denoise 1.0 — the taomate mechanic broke behind the handoff refusal");
  });

  it("ARM 47 — the keyframes lane reaches its consumers: a boundary pin fills the window's silent anchor/end seats (the bundle's input_1/input_2), an interior pin rides MiniMaxH3AddGuide at its generation-local frame_idx", async () => {
    // THE CLASS ARM the census owes for `keyframes` (the DECL row the
    // any-frame setup serves, 2026-11-12): the doc's FILM-absolute
    // pins map to per-window seats at the build door
    // (applyKeyframeCompose) — start pin → the anchor seat, end pin →
    // the FL2VA end anchor, interior → the AddGuide image chain.
    // Value, not presence: the images are read back from the
    // LoadImage nodes the seats wire, and the guide's frame_idx is
    // the pin's generation-local row (no carry on window 1).
    const graph = await composeH3({
      length: 175,
      calls: [SHOT({ text: "first", end_frame: 90 }), SHOT({ text: "then a turn", start_frame: 90, end_frame: 175 })],
      keyframes: [
        { image: "pin_open.png", frame: 0 },
        { image: "pin_mid.png", frame: 20 },
        { image: "pin_end.png", frame: 89 },
      ],
    }, "h3_knob_arm47");
    // THE EDGE READER: a graph input that names another node is a
    // [id, slot] tuple (the serialized OutputHandle).
    const srcOf = (v: unknown): string | null =>
      Array.isArray(v) && typeof v[0] === "string" ? v[0] : null;
    const loadImageCarrying = (path: string): string => {
      const hit = Object.entries(graph).find(
        ([, n]) => n.class_type === "LoadImage" && n.inputs.image === path,
      );
      assert.ok(hit, `KEYFRAMES VALUE ARM: no LoadImage carries '${path}' — the pin never reached the disk handoff (hop [5])`);
      return hit[0];
    };
    const bundle = Object.values(graph).find((n) => n.class_type === "PlagueKindBundleIn");
    assert.ok(bundle, "the pinned windows compose the reference bus (the pins are an image-guide seat)");
    // start pin → bundle input_1 → resize → LoadImage(pin_open.png)
    const anchorMask = srcOf(bundle!.inputs.input_1);
    assert.ok(anchorMask, "the start pin never filled the anchor seat (bundle input_1 unwired)");
    assert.equal(
      srcOf(graph0(graph, anchorMask!).inputs.image),
      loadImageCarrying("pin_open.png"),
      "KEYFRAMES VALUE ARM: bundle input_1 does not trace to the frame-0 pin — the anchor seat took a different image",
    );
    // end pin → bundle input_2 → resize → LoadImage(pin_end.png)
    const endMask = srcOf(bundle!.inputs.input_2);
    assert.ok(endMask, "the end pin never filled the end-anchor seat (bundle input_2 unwired)");
    assert.equal(
      srcOf(graph0(graph, endMask!).inputs.image),
      loadImageCarrying("pin_end.png"),
      "KEYFRAMES VALUE ARM: bundle input_2 does not trace to the ef-1 pin — the end-anchor seat took a different image",
    );
    // interior pin → AddGuide(image) at the pin's generation-local row
    const guide = Object.entries(graph).find(
      ([id, n]) => n.class_type === "MiniMaxH3AddGuide" && n.inputs.image !== undefined && id.startsWith("window1_"),
    );
    assert.ok(guide, "KEYFRAMES VALUE ARM: no window1_ MiniMaxH3AddGuide carries an image — the interior pin never composed");
    assert.equal(guide![1].inputs.frame_idx, 20, "the interior pin's frame_idx is not its generation-local row");
    assert.equal(
      srcOf(guide![1].inputs.image),
      loadImageCarrying("pin_mid.png"),
      "KEYFRAMES VALUE ARM: the guide's image does not trace to the interior pin",
    );
  });
});

/** Fetch one node by id with the assert voice (the CONTROL arms'
 *  edge reader). */
function graph0(graph: Graph, id: string): GNode {
  const n = graph[id];
  assert.ok(n, `the graph carries no node '${id}' — the edge named a ghost`);
  return n;
}

// ─── THE CONSUMER-MAP CENSUS (P2 item #10, 2026-11-12) ─────────────
// THE INVARIANT: every param the family DECLARES is either WITNESSED
// at the input its consumer reads, or REGISTERED with the reason it
// can never be a doc-stated value. Completeness is DERIVED from
// DECL.params — the roster is the DECL's own list, never a hand
// count: a param with no row reds here, a row naming a param the
// DECL never declared reds here, and the table's size is judged
// against the DECL's own size.
// THE WITNESS ROWS judge the MAP — the stated value reaches the
// input the engine reads (hop [5]). The per-class VALUE liveness
// (the drop variants proving each seat is a READ, not a default) is
// the ARMs' law; this block gathers their map into one roster, it
// does not replace them.
// THE GATE ROWS judge the mount-behind-the-gate law (burn b,
// 2026-10-26): the limb's class composes iff its own doc gate is on,
// and composes NO node when the gate is off — presence is the
// switch's verdict.
// THE REGISTER ROWS judge the shrinkable half: a retired alias or a
// derived internal must never become an input key on any census doc.
// THE DOCS ride the same compose door the run rides (hop [4]→[5]);
// each is the proven doc for the limbs it mounts, composed once and
// shared across rows.

type CensusDoc = Record<string, unknown>;
type DocKey = keyof typeof CENSUS_DOCS;

/** ARM 13's doc — the bare single-window first pass: shape, clock,
 *  sampler five, shift grid, attention backend (no image: the t4r
 *  pick would take the attention seat), ref_image_size. */
const CENSUS_FIRST: CensusDoc = {
  length: 124, width: 512, height: 480, fps: 30,
  seed: SEED, sampler_name: "dpmpp_2m", sched_name: "beta", steps: 8, denoise: 0.75,
  shift_video: 11.5, shift_audio: 4.5,
  ref_image_size: "match",
  calls: [SHOT({ start_frame: 0, end_frame: 124 })],
};

/** The attention-backend seat's own doc: the t2v lane (no image —
 *  the t4r lane re-derives its post chain and refuses the key as
 *  lane-dead, schema.ts's unsanctioned-inject guard). */
const CENSUS_BACKEND: CensusDoc = { ...CENSUS_FIRST, attention_backend: "pytorch attention" };

/** The reference bus (hop [5] media lanes) + the RefMod dials. */
const CENSUS_MEDIA: CensusDoc = {
  ...CENSUS_FIRST,
  image: "data/input/first.png",
  ref_images: ["data/input/ref1.png"],
  ref_videos: ["data/input/motion.mp4"],
  ref_video_trims: [{ start_time: 1.5, duration: 2.5 }],
  ref_audios: ["data/input/voice.wav"],
  ref_mods: ["data/input/mod.png"],
  refmod_mode: "Full Reference", refmod_pool: 22, refmod_identity: 650, refmod_save: false,
};

/** The SLA limb (ARM 15) — the dials ride H3SLAAttention, and the
 *  t4r attention pick carries sla_switch (ARM 31 needs the anchor). */
const CENSUS_SLA: CensusDoc = {
  ...CENSUS_MEDIA,
  sla_enabled: true, sla_sparsity: 0.75, sla_block_size: "64", sla_min_seq_len: 1024,
  sla_dense_last_steps: 3, sla_dense_steps: "0,1", sla_dense_backend: "pytorch",
  sla_reference_protection: "Off", sla_protect_audio: true,
  sla_stabilize_motion: true, sla_disable_fp16_accum: true, sla_switch: true,
};

/** The V9 post chain (ARMs 17/18/4): master + interp + sr + sharpen
 *  + the refine rider — every post limb mounted at once. */
const CENSUS_SECOND: CensusDoc = {
  length: 56, fps: 30, steps: 8, denoise: 0.75,
  second_pass_enabled: true,
  interpolate_enabled: true, interp_model: "rife47.pth", interp_multiplier: 4,
  sr_switch: true, sr_model: "seedvr2_ema_3b_fp8_e4m3fn.safetensors", sr_resolution: 1440,
  sharpen_enabled: true, sharpen_method: "rcas", sharpen_radius: 2.5,
  sharpen_strength: 0.55, sharpen_threshold: 0.15, sharpen_iterations: 7,
  refine_lora: "h3_taomate_3step", refine_strength: 0.9, refine_steps: 3, refine_denoise: 0.3,
  calls: [SHOT()],
};

/** The P2 latent-upscale handoff (ARM 37's gate, ARM 43's rider). */
const CENSUS_UPSCALE: CensusDoc = {
  length: 56, fps: 30, steps: 8, denoise: 0.75,
  second_pass_enabled: true,
  upscale_route: "latent_2x",
  upscale_model: "minimax_h3_latent_upscaler_3d_bf16.safetensors",
  refine_denoise: 0.35,
  calls: [SHOT()],
};

const CENSUS_DOCS = {
  first: CENSUS_FIRST,
  backend: CENSUS_BACKEND,
  media: CENSUS_MEDIA,
  sla: CENSUS_SLA,
  noise: { ...CENSUS_FIRST, noise_seed: 909 },
  kpin: { ...CENSUS_FIRST, k: 3 },
  second: CENSUS_SECOND,
  // master off: the refine leaves + every post leaf stated, no door.
  second_off: { ...CENSUS_SECOND, second_pass_enabled: false },
  no_sharpen: { ...CENSUS_SECOND, sharpen_enabled: false },
  no_interp: { ...CENSUS_SECOND, interpolate_enabled: false },
  no_sr: { ...CENSUS_SECOND, sr_switch: false },
  upscale: CENSUS_UPSCALE,
  // ARM 22 — the film half: two windows + the audio take's duck seat.
  film: {
    length: 124, duck_depth_db: -22,
    audio_clips: [{ src: "data/input/take.wav", start_frame: 0, dur_frames: 24, text: "hello there" }],
    calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
  },
  // ARM 22b — the call-level guide alias.
  alias: { length: 56, calls: [SHOT({ image_name: "data/input/alias.png" })] },
  // ARM 47 — the any-frame pins lane.
  pins: {
    length: 175,
    calls: [SHOT({ text: "first", end_frame: 90 }), SHOT({ text: "then a turn", start_frame: 90, end_frame: 175 })],
    keyframes: [
      { image: "pin_open.png", frame: 0 },
      { image: "pin_mid.png", frame: 20 },
      { image: "pin_end.png", frame: 89 },
    ],
  },
} as const satisfies Record<string, CensusDoc>;

type CensusRow =
  | {
    kind: "at"; param: string; doc: DocKey; cls: string; input: string; value: unknown;
    /** "some" judges one carrying node (a lane input several nodes
     *  share, e.g. LoadImage.image); the default judges EVERY node of
     *  the class (the seat is the class's own). */
    mode?: "all" | "some";
    /** Discriminate among several nodes of the class by another input
     *  (the refine rider's scheduler vs pass 1's). */
    where?: { input: string; value: unknown };
  }
  | { kind: "gate"; param: string; on: DocKey; off: DocKey; classes: readonly string[] }
  | { kind: "judge"; param: string; doc: DocKey; judge: (g: Graph) => void; why: string }
  | { kind: "unstatable"; param: string; why: string };

const CENSUS_ROWS: readonly CensusRow[] = [
  // ── the guide / reference bus ─────────────────────────────────
  { kind: "at", param: "image", doc: "media", cls: "LoadImage", input: "image", value: "data/input/first.png", mode: "some" },
  // keyframes LEFT the DECL params roster (audit 013 cure 2, the row
  // death — a document-plane lane now): its consumer law stays pinned
  // by ARM 47 on the pins doc; the census rows judge DECL params only.
  { kind: "at", param: "ref_images", doc: "media", cls: "LoadImage", input: "image", value: "data/input/ref1.png", mode: "some" },
  { kind: "at", param: "ref_videos", doc: "media", cls: "LoadVideo", input: "file", value: "data/input/motion.mp4" },
  { kind: "at", param: "ref_video_trims", doc: "media", cls: "Video Slice", input: "start_time", value: 1.5 },
  { kind: "at", param: "ref_audios", doc: "media", cls: "LoadAudio", input: "audio", value: "data/input/voice.wav" },
  { kind: "at", param: "ref_mods", doc: "media", cls: "LoadImage", input: "image", value: "data/input/mod.png", mode: "some" },
  { kind: "at", param: "duck_depth_db", doc: "film", cls: "MeliteFilmAudioMix", input: "duck_db", value: -22 },
  // ── the shape / clock / sampler five ──────────────────────────
  { kind: "at", param: "seed", doc: "first", cls: "RandomNoise", input: "noise_seed", value: SEED },
  { kind: "at", param: "width", doc: "first", cls: "MiniMaxH3ReferenceToVideo", input: "width", value: 512 },
  { kind: "at", param: "height", doc: "first", cls: "MiniMaxH3ReferenceToVideo", input: "height", value: 480 },
  { kind: "at", param: "length", doc: "first", cls: "MiniMaxH3ReferenceToVideo", input: "length", value: 124 },
  { kind: "at", param: "steps", doc: "first", cls: "BasicScheduler", input: "steps", value: 8 },
  { kind: "at", param: "denoise", doc: "first", cls: "BasicScheduler", input: "denoise", value: 0.75 },
  { kind: "at", param: "sampler_name", doc: "first", cls: "KSamplerSelect", input: "sampler_name", value: "dpmpp_2m" },
  { kind: "at", param: "sched_name", doc: "first", cls: "BasicScheduler", input: "scheduler", value: "beta" },
  { kind: "at", param: "noise_seed", doc: "noise", cls: "RandomNoise", input: "noise_seed", value: 909 },
  { kind: "at", param: "fps", doc: "first", cls: "CreateVideo", input: "fps", value: 30 },
  { kind: "at", param: "shift_video", doc: "first", cls: "MiniMaxH3SigmaShift", input: "shift_video", value: 11.5 },
  { kind: "at", param: "shift_audio", doc: "first", cls: "MiniMaxH3SigmaShift", input: "shift_audio", value: 4.5 },
  { kind: "at", param: "attention_backend", doc: "backend", cls: "ModelAttentionBackend", input: "attention", value: "pytorch attention" },
  { kind: "at", param: "ref_image_size", doc: "first", cls: "MiniMaxH3ReferenceToVideo", input: "ref_image_size", value: "match" },
  {
    kind: "judge", param: "k", doc: "kpin", why: "the window ordinal IS the save naming (ARM 21)",
    judge: (g) => {
      const prefixes = Object.values(g).filter((n) => n.class_type === "SaveVideo").map((n) => n.inputs.filename_prefix);
      assert.deepEqual(prefixes, ["h3_t4_w3"], "CENSUS k: a stated k never became the save naming (the window ordinal seat)");
    },
  },
  // ── the master gate + the V9 post chain ───────────────────────
  {
    kind: "gate", param: "second_pass_enabled", on: "second", off: "second_off",
    classes: ["FrameInterpolate", "SeedVR2VideoUpscaler", "ImageSharpenKJ"],
  },
  { kind: "gate", param: "sharpen_enabled", on: "second", off: "no_sharpen", classes: ["ImageSharpenKJ"] },
  { kind: "at", param: "sharpen_method", doc: "second", cls: "ImageSharpenKJ", input: "method.method", value: "rcas" },
  { kind: "at", param: "sharpen_radius", doc: "second", cls: "ImageSharpenKJ", input: "method.radius", value: 2.5 },
  { kind: "at", param: "sharpen_strength", doc: "second", cls: "ImageSharpenKJ", input: "method.strength", value: 0.55 },
  { kind: "at", param: "sharpen_threshold", doc: "second", cls: "ImageSharpenKJ", input: "method.threshold", value: 0.15 },
  { kind: "at", param: "sharpen_iterations", doc: "second", cls: "ImageSharpenKJ", input: "method.iterations", value: 7 },
  { kind: "gate", param: "interpolate_enabled", on: "second", off: "no_interp", classes: ["FrameInterpolate"] },
  { kind: "at", param: "interp_model", doc: "second", cls: "FrameInterpolationModelLoader", input: "model_name", value: "rife47.pth" },
  { kind: "at", param: "interp_multiplier", doc: "second", cls: "FrameInterpolate", input: "multiplier", value: 4 },
  { kind: "gate", param: "sr_switch", on: "second", off: "no_sr", classes: ["SeedVR2VideoUpscaler"] },
  { kind: "at", param: "sr_resolution", doc: "second", cls: "SeedVR2VideoUpscaler", input: "resolution", value: 1440 },
  { kind: "at", param: "sr_model", doc: "second", cls: "SeedVR2LoadDiTModel", input: "model", value: "seedvr2_ema_3b_fp8_e4m3fn.safetensors" },
  // ── the refine rider (ARMs 4/4b) ──────────────────────────────
  {
    kind: "judge", param: "refine_lora", doc: "second", why: "the rider's own loader stack names the resolved catalog file",
    judge: (g) => {
      const rider = Object.values(g).find((n) => n.class_type === "LTX_lora_loader"
        && typeof n.inputs.stack_data === "string" && n.inputs.stack_data.includes("taomate"));
      assert.ok(rider, "CENSUS refine_lora: no rider loader stack carries the taomate row — the refine seat never mounted its own loader");
    },
  },
  {
    kind: "judge", param: "refine_strength", doc: "second", why: "the rider stack carries the stated strength",
    judge: (g) => {
      const rider = Object.values(g).find((n) => n.class_type === "LTX_lora_loader"
        && typeof n.inputs.stack_data === "string" && n.inputs.stack_data.includes("taomate"));
      assert.ok(rider, "CENSUS refine_strength: no rider loader composed");
      const stack = JSON.parse(rider.inputs.stack_data as string) as Array<{ str: number }>;
      assert.equal(stack[0]?.str, 0.9, "CENSUS refine_strength: the rider stack does not carry the stated strength");
    },
  },
  {
    kind: "at", param: "refine_steps", doc: "second", cls: "BasicScheduler", input: "steps", value: 3,
    where: { input: "denoise", value: 0.3 },
  },
  {
    kind: "at", param: "refine_denoise", doc: "second", cls: "BasicScheduler", input: "denoise", value: 0.3,
    where: { input: "steps", value: 3 },
  },
  // ── the P2 latent-upscale handoff ─────────────────────────────
  {
    kind: "gate", param: "upscale_route", on: "upscale", off: "first",
    classes: ["MinimaxH3LatentUpscaler3DRefineHandoff"],
  },
  {
    kind: "at", param: "upscale_model", doc: "upscale", cls: "MinimaxH3LatentUpscaler3DRefineHandoff",
    input: "model_name", value: "minimax_h3_latent_upscaler_3d_bf16.safetensors",
  },
  // ── the SLA limb ──────────────────────────────────────────────
  {
    kind: "judge", param: "sla_enabled", doc: "sla",
    why: "the SLA kernel's own enabled flag (the branch node composes either way; the flag is the gate)",
    judge: (g) => {
      const kernels = Object.values(g).filter((n) => n.class_type === "H3SLAAttention");
      assert.ok(kernels.length > 0, "CENSUS sla_enabled: no SLA kernel composed on the sla doc");
      for (const k of kernels) {
        assert.equal(k.inputs.enabled, true, "CENSUS sla_enabled: the kernel's enabled flag does not carry the stated gate");
      }
    },
  },
  { kind: "at", param: "sla_sparsity", doc: "sla", cls: "H3SLAAttention", input: "sparsity_ratio", value: 0.75 },
  { kind: "at", param: "sla_block_size", doc: "sla", cls: "H3SLAAttention", input: "block_size", value: "64" },
  { kind: "at", param: "sla_min_seq_len", doc: "sla", cls: "H3SLAAttention", input: "min_seq_len", value: 1024 },
  { kind: "at", param: "sla_dense_last_steps", doc: "sla", cls: "H3SLAAttention", input: "dense_last_steps", value: 3 },
  { kind: "at", param: "sla_dense_steps", doc: "sla", cls: "H3SLAAttention", input: "dense_steps", value: "0,1" },
  { kind: "at", param: "sla_dense_backend", doc: "sla", cls: "H3SLAAttention", input: "dense_backend", value: "pytorch" },
  // 'Off' is the fold's convicting leg (ARM 15): a wiring that forgot
  // the enum hardcodes true and reds here.
  { kind: "at", param: "sla_reference_protection", doc: "sla", cls: "H3SLAAttention", input: "reference_protection", value: false },
  { kind: "at", param: "sla_protect_audio", doc: "sla", cls: "H3SLAAttention", input: "protect_audio", value: true },
  { kind: "at", param: "sla_stabilize_motion", doc: "sla", cls: "H3SLAAttention", input: "stabilize_motion", value: true },
  { kind: "at", param: "sla_disable_fp16_accum", doc: "sla", cls: "H3SLAAttention", input: "disable_fp16_accum", value: true },
  {
    kind: "judge", param: "sla_switch", doc: "sla", why: "the t4r attention pick carries the stated word (ARM 31)",
    judge: (g) => {
      const pick = Object.values(g).find((n) => n.class_type === "ComfySwitchNode");
      assert.ok(pick, "CENSUS sla_switch: no attention pick composed on the t4r doc");
      assert.equal(pick.inputs.switch, true, "CENSUS sla_switch: the pick does not carry the stated true");
    },
  },
  // ── the RefMod dials + the guide alias ───────────────────────
  { kind: "at", param: "refmod_mode", doc: "media", cls: "MiniMaxH3RefModExtract", input: "mode", value: "Full Reference" },
  { kind: "at", param: "refmod_pool", doc: "media", cls: "MiniMaxH3RefModExtract", input: "pool_h", value: 22 },
  { kind: "at", param: "refmod_identity", doc: "media", cls: "MiniMaxH3RefModExtract", input: "identity", value: 650 },
  { kind: "at", param: "refmod_save", doc: "media", cls: "MiniMaxH3RefModExtract", input: "save", value: false },
  { kind: "at", param: "image_name", doc: "alias", cls: "LoadImage", input: "image", value: "data/input/alias.png", mode: "some" },
  // ── THE REGISTER (the shrinkable half) ───────────────────────
  {
    kind: "unstatable", param: "sharpen_switch",
    why: "the renderer-era alias is gate-admitted for old drafts, but the second-pass wiring reads only the sharpen_enabled primary — a stated alias mounts nothing (ARM 32)",
  },
  {
    kind: "unstatable", param: "interp_switch",
    why: "the interp alias is gate-admitted for old drafts, but the interp limb mounts behind interpolate_enabled alone — a stated alias mounts nothing (ARM 23)",
  },
  {
    kind: "unstatable", param: "fps_seconds",
    why: "the render seat DERIVES it from the window's own clock (length / fps); a stated pin is clobbered before any node reads it (the no-stale law, ARM 33)",
  },
];

/** Read a dotted input path (the sharpen method is a grouped dict). */
function readInputPath(inputs: Record<string, unknown>, path: string): unknown {
  let v: unknown = inputs;
  for (const key of path.split(".")) {
    if (v === null || typeof v !== "object") return undefined;
    v = (v as Record<string, unknown>)[key];
  }
  return v;
}

const censusGraphs = new Map<DocKey, Promise<Graph>>();

/** Compose one census doc once (the same compose door the run rides). */
function censusGraph(key: DocKey): Promise<Graph> {
  let p = censusGraphs.get(key);
  if (!p) {
    p = composeH3(CENSUS_DOCS[key], `h3_census_${key}`);
    censusGraphs.set(key, p);
  }
  return p;
}

describe("THE H3 CONSUMER-MAP CENSUS (item #10) — every DECL param is witnessed at its consumer or named unstatable", () => {
  it("CENSUS — completeness is the DECL's own roster; every row fires on its own seat", async () => {
    const declared: readonly string[] = DECL.params ?? [];
    assert.ok(declared.length > 0, "the h3 DECL declares no params — the census has no roster to judge");
    const seen = new Set<string>();
    for (const row of CENSUS_ROWS) {
      assert.ok(!seen.has(row.param), `CENSUS: '${row.param}' is listed twice — one row per param`);
      seen.add(row.param);
    }
    const ghosts = CENSUS_ROWS.map((r) => r.param).filter((p) => !declared.includes(p));
    assert.deepEqual(ghosts, [],
      `CENSUS: the table judges params the DECL never declared (${ghosts.join(", ")}) — a row for a ghost param is a lie about the surface`);
    const unrowed = declared.filter((p) => !seen.has(p));
    assert.deepEqual(unrowed, [],
      `CENSUS: the DECL declares ${declared.length} params but no row judges: ${unrowed.join(", ")} — a param with no witnessed consumer and no named reason is the gap between walls this census closes`);
    assert.equal(CENSUS_ROWS.length, declared.length,
      `CENSUS: the table (${CENSUS_ROWS.length} rows) and the DECL (${declared.length} params) disagree`);

    // Warm every doc once so the register rows can scan all of them.
    const keys = Object.keys(CENSUS_DOCS) as DocKey[];
    const graphs = new Map<DocKey, Graph>();
    for (const key of keys) graphs.set(key, await censusGraph(key));

    for (const row of CENSUS_ROWS) {
      if (row.kind === "at") {
        const g = graphs.get(row.doc)!;
        const nodes = Object.entries(g).filter(([, n]) => n.class_type === row.cls);
        assert.ok(nodes.length > 0,
          `CENSUS ${row.param}: no '${row.cls}' composed on the '${row.doc}' doc — the DECL-wired consumer never reached the graph (hop [5])`);
        const pool = row.where
          ? nodes.filter(([, n]) => readInputPath(n.inputs, row.where!.input) === row.where!.value)
          : nodes;
        assert.ok(pool.length > 0,
          `CENSUS ${row.param}: no '${row.cls}' on '${row.doc}' carries ${JSON.stringify(row.where)} — the discriminating input never landed`);
        const saw = pool.map(([, n]) => readInputPath(n.inputs, row.input));
        const carrying = saw.filter((v) => v === row.value);
        if (row.mode === "some") {
          assert.ok(carrying.length > 0,
            `CENSUS ${row.param}: no '${row.cls}' on '${row.doc}' carries ${JSON.stringify(row.value)} at '${row.input}' (saw ${JSON.stringify(saw)})`);
        } else {
          assert.equal(carrying.length, pool.length,
            `CENSUS ${row.param}: '${row.cls}.${row.input}' on '${row.doc}' did not carry ${JSON.stringify(row.value)} on every composed node (saw ${JSON.stringify(saw)})`);
        }
        continue;
      }
      if (row.kind === "gate") {
        const on = graphs.get(row.on)!;
        const off = graphs.get(row.off)!;
        for (const cls of row.classes) {
          assert.ok(Object.values(on).some((n) => n.class_type === cls),
            `CENSUS ${row.param}: the gate-ON doc ('${row.on}') composes no '${cls}' — the limb never mounted`);
          assert.ok(!Object.values(off).some((n) => n.class_type === cls),
            `CENSUS ${row.param}: the gate-OFF doc ('${row.off}') still composes '${cls}' — the limb mounts behind its gate's back (burn b's always-upscale lie)`) ;
        }
        continue;
      }
      if (row.kind === "judge") {
        row.judge(graphs.get(row.doc)!);
        continue;
      }
      // The register rows: the name must never become an input key.
      for (const [key, g] of graphs) {
        for (const n of Object.values(g)) {
          assert.ok(!(row.param in n.inputs),
            `CENSUS ${row.param}: the name became an input key on '${key}' (${n.class_type}) — ${row.why}`);
        }
      }
    }
  });
});
