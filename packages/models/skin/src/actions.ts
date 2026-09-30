// actions.ts — the skin family's declared actions (the atom
// vocabulary, stroke 4): the apply-skin verb's backend. The meld
// skin laws own the nodes (deterministic maps — SkinPack/SkinSidecar
// carry no checkpoint, so the family is weightless); the flow row
// routes, this declaration owns the graph. The proof's framing
// (768/1.2/50/64/transparent) is FIXED here — a verb's framing is
// not a bench surface (SubActionMod law: knobs never join a card
// schema; the 2026-09-16 retirement order keeps the skin CARD dead
// — the family is the sanctioned seam, not a card revival).
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { OutputHandle } from "@melite/comfyui-card-kit/graph";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

/** The apply-skin facts door: the coat reads NOTHING off a lane
 *  (deterministic texture synthesis — no weights load), so the door
 *  is the weightless vacuous parse, present to keep the action
 *  contract's one-door law, refusing nothing.
 *  @param _raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the empty facts shape */
export function parseSkinFacts(_raw: LaneInputsFacts): Record<string, never> {
  return {}
}

/** The coat action (the flow 'skin-apply' the meld chips drive):
 *  SkinPack (maps) → SkinSidecar (kind sidecar) → SkinApply (graft)
 *  → the 4-view proof sheet. Every param rides VERBATIM — a $-ref
 *  passes through untyped-by-design (the inline compile and the
 *  merged worker own resolution, exactly as the retired hand
 *  literal's refs rode).
 *
 *  NO "seed-sentinel" rule is declared on `coat` — DELIBERATELY. The
 *  sentinel mints a NUMBER (-1 → random at render); this lane's
 *  seed arrives as a `$` channel ref the merged worker resolves
 *  per run from the flow's own input (one resolution, shared by
 *  every node that names it — the sentinel's sharing guarantee,
 *  held by the channel instead of the mint). A rule here would
 *  refuse the ref at compose (mintSeed takes ints only). The
 *  vendor node declares seed INT min 0 — the resolved channel value
 *  must be a non-negative int; the flow's input contract owns
 *  that, nothing downstream re-gates it. */
export interface CoatParams {
  readonly body: string;
  readonly kind: string;
  readonly map_size: string | number;
  readonly seed: string | number;
}

/** THE VERB'S FIXED VOCABULARY — the SkinPack/SkinSidecar nodes' own
 *  declared defaults, not an invention here. The engine refuses
 *  anything else by name: seed is INT min 0 (the -1 random sentinel
 *  belongs to the CARD compose's mint, never to a raw graph — the
 *  node says so in its own refusal), and kind is a combo of the 20
 *  meld kinds. A 1024 map and a "scars" kind were plausible guesses
 *  that the engine rejected; the node's default is the truth. */
export const COAT_KIND = "keeper";
export const COAT_MAP_SIZE = 512;
export const COAT_SEED = 20260906;

export const coat: ComfyActionSpec<{ readonly body: string }, Record<string, never>> = {
  id: "coat",
  laneIndependent: true,
  outputs: [{ name: "skin", kind: "mesh" }],
  // THE KNOBS ARE THE ACTION'S, NOT THE REQUEST'S (stroke-89: an
  // estimation knob never joins the request schema; the flow's
  // initialValidators admit only photo/glb/bake_params, so a knob
  // spelled `$map_size` could never be linkable — the merged worker
  // refused "carries $map_size — neither a FromStage-wired input nor
  // a request initial"). The body rides as the request initial; the
  // detail kind, the map size and the seed are the verb's own
  // vocabulary, fixed in build below exactly as the anny estimator
  // fixes conf_thresh and dist_thresh_nms.
  params: [{ name: "body" }],
  facts: parseSkinFacts,
  build({ p, g }): OutputHandle {
    // THE VERB'S FIXED VOCABULARY: the detail kind, the map size and
    // the seed (the sentinel's -1 mints a fresh one at render).
    const pack = g.node("SkinPack", {
      size: COAT_MAP_SIZE,
      seed: COAT_SEED,
    });
    const scar = g.node("SkinSidecar", {
      kind: COAT_KIND,
      size: COAT_MAP_SIZE,
      seed: COAT_SEED,
    });
    g.node("SaveImage", {
      images: pack.out(0),
      filename_prefix: "skin_apply/out_albedo",
    });
    g.node("SaveImage", {
      images: pack.out(1),
      filename_prefix: "skin_apply/out_normal",
    });
    g.node("SaveText", {
      text: scar.out(0),
      filename_prefix: "skin_apply/out_kind",
      format: "json",
    });
    const apply = g.node("SkinApply", {
      body_glb_path: p.body,
      albedo: pack.out(0),
      normal: pack.out(1),
    });
    return g.node("RayRenderGLBViews", {
      glb_path: apply.out(0),
      resolution: 768,
      framing: 1.2,
      focal_length: 50,
      samples: 64,
      transparent: true,
    }).out(0);
  },
};
