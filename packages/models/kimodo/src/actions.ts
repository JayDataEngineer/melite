// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the compose action the motion card binds. The DECL's
// lane_inputs are the ONE facts door (model_path — the Kimodo
// checkpoint load key); the lane IS this file (KimodoLoader →
// KimodoTextToPose → optional RaySomaxBake), pinned to committed
// goldens in tests/golden/ — recorded while the kit's twin existed and
// the oracle compared them byte-for-byte. Creation order IS node-id
// order (the
// recipe law). No filename_prefix node (the NPZ and baked GLB
// write themselves into the output dir — runId rides the door,
// un-graphed).
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

// fps is LANE-INTERNAL (MotionT1Doc default 30.0 — moved verbatim
// from the lane).
const MOTION_BAKE_FPS = 30.0

/** The closed facts shape the compose segment reads. */
export type KimodoFacts = {
  readonly model_path: string;
};

/** The gated params doc the compose segment reads (the card's
 * schema walk validated types and bounds — a same-process typed
 * boundary; the seed arrives minted through the declared
 * seed-sentinel rule, so the ported lane's own mint is a
 * pass-through). */
export type KimodoParams = Record<string, unknown>;

/** The compose facts door: the resolved lane_inputs parsed into
 * the closed shape — a missing model_path refuses field-named
 * here, never composes a KimodoLoader on an empty directory.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseKimodoFacts(raw: LaneInputsFacts): KimodoFacts {
  const value = raw.model_path;
  if (typeof value !== "string" || value === "") {
    throw new Error(`kimodo compose: lane_inputs.model_path = ${JSON.stringify(value)} — a non-empty string is required`);
  }
  return { model_path: value };
}

/** The compose action: the motion_t1 block — Kimodo checkpoint
 * lane + optional preview bake (the prompt admission stays on the
 * card). */
export const compose: ComfyActionSpec<KimodoParams, KimodoFacts> = {
  id: "compose",
  inputs: [],
  outputs: [
    { name: "motion_npz", kind: "MOTION" },
    { name: "animated_glb", kind: "GLB" },
  ],
  // THE DECLARED SURFACE (the write plane, phase 2): the motion
  // card schema's own types and bounds — the family door judges
  // defaults and variant presets against this row. The cfg_type
  // enum is the card's CFG-mode vocabulary.
  params: [
    { name: "prompt", type: "string" },
    { name: "duration_sec", type: "number", bounds: [1, 30] },
    { name: "num_samples", type: "number", bounds: [1, 4] },
    { name: "num_transition_frames", type: "number", bounds: [0, 60] },
    { name: "cfg_type", type: "enum", options: ["separated", "regular", "nocfg"] },
    { name: "cfg_weight_a", type: "number", bounds: [0, 15] },
    { name: "cfg_weight_b", type: "number", bounds: [0, 15] },
    { name: "motion_npz", type: "string" },
    { name: "motion_prompts", type: "string" },
    { name: "motion_constraints", type: "string" },
    { name: "preview_glb", type: "string" },
    { name: "seed", type: "number", rule: "seed-sentinel" },
    // The DiT step count the variant wire stamps ride (turbo rows stamp
    // 10, the flagship 200; the node doc caps the plane at 500).
    { name: "diffusion_steps", type: "number", bounds: [1, 500] },
  ],
  facts: parseKimodoFacts,
  build({ p, facts, g }) {
    const seed = p.seed as number
    const loader = g.node('KimodoLoader', { model_name: facts.model_path }).out()

    // the step-doc STRIPS the text trio before wiring — a padded
    // string never reaches the node.
    const prompts = ((p.motion_prompts ?? '') as string).trim()
    const constraints = ((p.motion_constraints ?? '') as string).trim()
    const chain: Record<string, unknown> = {}
    if (p.motion_npz) chain.prev_motion_npz = p.motion_npz
    if (prompts) chain.motion_prompts = prompts
    if (constraints) chain.motion_constraints = constraints

    const npz = g.node('KimodoTextToPose', {
      model: loader,
      prompt: (p.prompt as string).trim(),
      seed,
      duration_sec: p.duration_sec,
      diffusion_steps: p.diffusion_steps,
      num_samples: p.num_samples,
      num_transition_frames: p.num_transition_frames,
      cfg_type: p.cfg_type,
      cfg_weight_a: p.cfg_weight_a,
      cfg_weight_b: p.cfg_weight_b,
      ...chain,
    }).out()

    if (p.preview_glb) {
      g.node('RaySomaxBake', {
        rigged_glb_path: p.preview_glb,
        motion_npz_path: npz,
        anim_name: 'motion',
        fps: MOTION_BAKE_FPS,
      })
    }
    return npz
  },
};
