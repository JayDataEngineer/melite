import { requireText } from "@melite/comfyui-card-kit/facts";
// fps is LANE-INTERNAL (MotionT1Doc default 30.0 — moved verbatim
// from the lane).
const MOTION_BAKE_FPS = 30.0;
/** The compose facts door: the resolved lane_inputs parsed into
 * the closed shape — a missing model_path refuses field-named
 * here, never composes a KimodoLoader on an empty directory.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factory reads */
export function parseKimodoFacts(raw) {
    return { model_path: requireText(raw, "model_path", "kimodo compose") };
}
/** The compose action: the motion_t1 block — Kimodo checkpoint
 * lane + optional preview bake (the prompt admission stays on the
 * card). */
export const compose = {
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
        { name: "duration_sec", type: "number", bounds: [1, 10] },
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
        { name: "diffusion_steps", type: "number", bounds: [10, 200] },
    ],
    facts: parseKimodoFacts,
    build({ p, facts, g }) {
        const seed = p.seed;
        const loader = g.node('KimodoLoader', { model_name: facts.model_path }).out();
        // the step-doc STRIPS the text trio before wiring — a padded
        // string never reaches the node.
        const prompts = (p.motion_prompts ?? '').trim();
        const constraints = (p.motion_constraints ?? '').trim();
        const chain = {};
        if (p.motion_npz)
            chain.prev_motion_npz = p.motion_npz;
        if (prompts)
            chain.motion_prompts = prompts;
        if (constraints)
            chain.motion_constraints = constraints;
        const npz = g.node('KimodoTextToPose', {
            model: loader,
            prompt: p.prompt.trim(),
            seed,
            duration_sec: p.duration_sec,
            diffusion_steps: p.diffusion_steps,
            num_samples: p.num_samples,
            num_transition_frames: p.num_transition_frames,
            cfg_type: p.cfg_type,
            cfg_weight_a: p.cfg_weight_a,
            cfg_weight_b: p.cfg_weight_b,
            ...chain,
        }).out();
        if (p.preview_glb) {
            g.node('RaySomaxBake', {
                rigged_glb_path: p.preview_glb,
                motion_npz_path: npz,
                anim_name: 'motion',
                fps: MOTION_BAKE_FPS,
            });
        }
        return npz;
    },
};
//# sourceMappingURL=actions.js.map