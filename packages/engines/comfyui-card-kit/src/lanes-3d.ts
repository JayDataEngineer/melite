import { GraphBuilder, OutputHandle, stripEmptyAutofill } from './graph.ts'
import type { PromptGraph, StripTable } from './graph.ts'
import type { ModelFacts } from './facts.ts'
import { mintSeed } from './graph-helpers.ts'
import {
  renderGLBViews,
  positive,
} from './blocks/poser-kit.ts'

/** The wired-tensor law (the lanes-image precedent, ported 1:1):
 *  a '$name' value names an upstream stage's wired output — the
// ── archetype III: the poser turnaround family ──────────────────────
// Body → assemble (CompositeCharacter / FitProp / SkinApply) → the
// shared 8-view turnaround tail (blocks/poser-kit renderGLBViews).
// The strip tables stay EMPTY so the pin's autofills ride
// (the GraphBuilder pin defaults own that behavior).

/** (DESCOPE 2026-09-05 — moved verbatim from the anny card.) The
 *  table stays EMPTY, so the pin's hair/outfit "" autofills ride. */
export const ANNY_STRIP: StripTable = {}

export function finalizeAnny(graph: PromptGraph): PromptGraph {
  return stripEmptyAutofill(graph, ANNY_STRIP)
}

// annyLane IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the
// anny family composes its own lane in its declared action
// (packages/models/anny/src/actions.ts, pinned to committed goldens in
// that family's tests/golden/). This arm is deleted; the family is the
// only home of the lane.
// REMOVED stroke 87 (operator order): the fit lane (fitLane + finalizeFit +
// FIT_STRIP + fitModelStem) and the skin lane (skinLane + finalizeSkin +
// SKIN_STRIP + the KIND_TABLE sidecar port) — the cards retired to the
// blender MCP spawn-skills door; nothing composes these lanes anymore.

// ── the motion lane ────────────────────────────────────────────────
// KimodoLoader → KimodoTextToPose → optional RaySomaxBake. No
// filename_prefix (the NPZ and baked GLB write themselves into the
// output dir — runId rides the door, un-graphed).

// fps is LANE-INTERNAL (MotionT1Doc default 30.0 — moved verbatim
// from the motion card).
const MOTION_BAKE_FPS = 30.0

/** Optional empties are ABSENT, never ""-wired (moved verbatim from
 *  the motion card — the CONDITIONAL strip variant). */
export const MOTION_STRIP: StripTable = {
  KimodoTextToPose: ['prev_motion_npz', 'motion_prompts', 'motion_constraints'],
}

export function finalizeMotion(graph: PromptGraph): PromptGraph {
  return stripEmptyAutofill(graph, MOTION_STRIP)
}

// motionLane IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the
// kimodo family composes its own lane in its declared action
// (packages/models/kimodo/src/actions.ts, pinned to committed goldens in
// that family's tests/golden/). This arm is deleted; the family is the
// only home of the lane.
// ── the single-node + staging lanes ───────────────────────────────
// quad-remesh (ONE-implementation rule: the AutoRemesher node IS the
// lane), upscale-tools (SeedVR2), input-prep (staged-source restage).

// quadRemeshLane IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the
// autoremesher family composes its own lane in its declared action
// (packages/models/autoremesher/src/actions.ts, pinned to committed goldens in
// that family's tests/golden/). This arm is deleted; the family is the
// only home of the lane.
// ── archetype V: the mesh lift family (img-to-mesh, bespoke) ───────
// THREE families behind one card: the dual guided lift head, the
// shared structure→shape→texture→bake chain, and the rig-copy arm.
// Moved verbatim from the img-to-mesh card; the card keeps the schema
// + per-family requires + arm dispatch (the multi-family story stays
// where the families board).

export const MESH_RESOLUTIONS: readonly string[] = ['1024', '1536']
export const MESH_BG_MODES: readonly string[] = ['auto', 'on', 'off']
export const MESH_PIXAL_FOVS: readonly string[] = ['auto', '35', '49.13', '60', '75', '90']
export const MESH_BAKE_SIZES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['atlas_size', ['2048', '4096']],
  ['ao_size', ['512', '1024']],
  ['normal_size', ['1024', '2048']],
]
export const MESH_ATLAS_SIZES = MESH_BAKE_SIZES[0][1]
export const MESH_AO_SIZES = MESH_BAKE_SIZES[1][1]
export const MESH_NORMAL_SIZES = MESH_BAKE_SIZES[2][1]

// The 3D lane rows are NOT unet-shaped — read fields from
// model.lane_inputs, cast as you read (the facts file carries
// whatever the model row declared).
interface MeshLane {
  unet: string
  vae: string
  texture_vae: string
  clip_vision: string
  background_removal: string
}

// MESHLANEOF IS GONE (the kit-arm retirement, 2026-09-30): it existed for the
// mesh arms, and each mesh family now carries its own copy inside its
// declared action — the kit's copy had no reader.
// LOADLIFTHEADS IS GONE (the kit-arm retirement, 2026-09-30): it existed for the
// mesh arms, and each mesh family now carries its own copy inside its
// declared action — the kit's copy had no reader.

// CUTBACKGROUND IS GONE (the kit-arm retirement, 2026-09-30): it existed for the
// mesh arms, and each mesh family now carries its own copy inside its
// declared action — the kit's copy had no reader.
// SHAREDLIFTCHAIN IS GONE (the kit-arm retirement, 2026-09-30): it existed for the
// mesh arms, and each mesh family now carries its own copy inside its
// declared action — the kit's copy had no reader.

// TRELLISARM IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the trellis2-native
// family composes its own lane in its declared action (pinned to committed
// goldens in that family's tests/golden/). This arm is deleted; the family is
// the only home of the lane.
// PIXALARM IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the pixal3d
// family composes its own lane in its declared action (pinned to committed
// goldens in that family's tests/golden/). This arm is deleted; the family is
// the only home of the lane.

// THE RIG ARMS ARE FAMILY-OWNED (the kit-arm retirement, 2026-09-30 —
// closed by the card-system stroke): the rig card's three lanes are the
// families' declared actions — transfer_rig's `transfer` (the copy
// lane), gem_soma's `rig` (the SOMA-77 auto lane), anycreature's
// `bind` (the species lane). The card's mode knob names the family;
// every node is composed family-side, each lane pinned to a committed
// golden.
// ── the rig card's arms (ROADMAP card program P0) ───────────────────
// "skeleton + weights on this GLB" — three real lanes over the
// vendored packs, all path-based (no checkpoints):
//  · auto   — KimodoExportFBX in its 'apply_weights' action (the
//             dispatch is INPUT-driven: source_glb without npz_path
//             → the SOMA-77 template's hand-painted LBS weights
//             transfer onto the source mesh; file_format 'glb'; the
//             node IS the output capture — it writes itself).
//  · copy   — transferRigArm verbatim (KimodoTransferWeights +
//             SaveRiggedModel): GPU KNN weight transfer from a
//             rigged donor onto the clothed target.
//  · species — RayCreatureRigBridge: bind a static mesh onto an
//             anyCreature skeleton (armature + baked idles), the
//             node writes itself.
// The fourth lane (skintokens/TokenRig) stays OUT until the
// external ComfyUI-SkinToken pack is vendored + verified — a lane
// whose node cannot register is not a lane (LAW 2).



// ADMITMESHLIFT IS GONE (the kit-arm retirement, 2026-09-30): it existed for the
// mesh arms, and each mesh family now carries its own copy inside its
// declared action — the kit's copy had no reader.
