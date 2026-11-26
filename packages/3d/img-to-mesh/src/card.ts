import type {} from '@melite/comfyui-card-kit/service-faces'
// Tier 3 — the img-to-mesh card (the trellis_t1 / pixal_t1 /
// transfer_rig_t1 renderer port). THREE families behind one card
// (requires_by_family in the python card): the arm branches on
// model.id inside compose — the dispatch stays HERE (bespoke), the
// arms ride @melite/comfyui-card-kit.
//
// NUMBERING LAW : the reference renderers
// assign
// `<Class>.<index>` ids in POST-ORDER DFS from the output node —
// NOT python creation order. The one visible flip: the SHAPE guided
// arm is numbered before the STRUCT arm (CFGOverride.0/.RescaleCFG.0
// = shape 0.769/0.5; .1 = struct 0.667/0.7) even though the python
// source builds struct first. The GraphBuilder numbers at CREATION,
// so this port creates the shape arm first. KSampler keeps the
// natural struct→shape→tex1→tex2 order; VAELoader shape→texture;
// MeshSmoothNormals decimate→textured.
//
// AUTOFILL LAW: the reference strips only the empty autofills it overrides
// (LoadImage.upload, KSampler.control_after_generate). Other
// pin autofills SURVIVE into the served graph and are emitted
// here as literals: RemeshMesh band/project_back,
// ImageCropToMask background/grow_mask, MoGeInference
// apply_mask/batch_size/force_projection/fov_x_degrees. Everything
// else is exactly the inputs the engine consumes — no more.
// (fix_poles and the sign-mode separation flags are card params
// since 2026-10-12 — the schema defaults ARE the official
// template's calibration, all four false: the 2026-11-17 holes
// burn killed melite's ON-by-default deviation on remesh_qef and
// remesh_drop_enclosed — drop_enclosed ON deletes the nested
// interior shells TRELLIS output carries, punching visible holes.)
//
// FAMILIES LAW (2026-09-21, the DRY stroke): `families` declares
// BASE family ids ONLY (the boarded ids) — the client walk
// resolves the served model key (a composed variant-quant row,
// e.g. 'pixal3d-1536-int8') to its base via
// resolveFamilyKey before matching. Composed row ids are never
// spelled here; a new variant/quant cell needs NO card change.
//
// REQUIRES SHAPE: per-family requires (trellis2-native→
// comfyui-core-trellis2, pixal3d→comfyui-core-trellis2+ComfyUI-MoGe,
// transfer-rig→melite-autorig-nodes; card-level requires is EMPTY).
// Card-level `requires` carries the UNION (flat consumers + the drift
// wall's (b) flat leg), while `requiresByFamily` below carries the
// per-family map — the compose door merges the ACTIVE family's slice;
// gating on the union alone over-claims (a trellis run must never
// demand the autorig pack).
import type { Context } from '@melite/comfyui-card-kit/card-definition'
import z from '@deepseek-ai/schemastery'
import { declaredAction, instantiateAction, MESH_RESOLUTIONS, MESH_PIXAL_FOVS, MESH_ATLAS_SIZES, MESH_AO_SIZES, MESH_NORMAL_SIZES } from '@melite/comfyui-card-kit'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'
import type { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import { primeFamilySeats, seatOf } from './family-seats.ts'
import { SAMPLERS, SCHEDULERS, vocabulary } from '@melite/comfyui-card-kit/vocab'
import { bag } from '@melite/contracts/extraKeys'
import { ComposeRefusal } from '@melite/comfyui-card-kit/errors';
import { seedExtra } from '@melite/comfyui-card-kit/fields'
import { callableSchema, gatedResolve } from '@melite/comfyui-card-kit/admission'

const schema = z.object({
  // Ride keys (no .default — the compose-door cascade overlays model
  // defaults, then explicit params): input_image is required; the
  // rig GLBs are ABSENT/defaultless (transfer-rig's model row
  // carries no defaults either) and refused per-arm in compose, so a
  // lift call never names them and a rig call names both. Bare
  // z.string() is the image-gen prompt precedent (optional at parse,
  // refused loud at compose).
  // THE HONEST FACE (2026-11-26, the mesh lane's defect board): the
  // tooltip is the one surface every door reads before a press, so the
  // lane's declared limits ride HERE — faces, scale, printability —
  // and the bake's inferred material rides the atlas knob below. The
  // wall `tests/lift-disclosure.spec.ts` judges these words against the
  // live schema, the live action wiring, and the DECL.
  input_image: z.string().role('path').description("Source image").extra('extra', bag({ order: 0, group: "input", columns: 1, tooltip: "One clear object, tight framing — the card crops it to a square and conditions on it directly. FACES AND FINE PRINT come back generic: this lane resolves object-scale form, never a likeness. NOT PRINT-READY: no knob states a physical size (the mesh carries no metric scale — scale it downstream) and thin features or interior shells can tear off a plate — validate watertightness in a slicer before printing.", required: true, families: ['pixal3d', 'trellis2-native'],  wtype: 'image', })),
  rigged_glb: z.string().role('path').description("Rigged source GLB").extra('extra', bag({ order: 0, group: "input", columns: 1, tooltip: "The SOMA-rigged clean mesh — JOINTS_0/WEIGHTS_0 + armature. The rig donor.", families: ['transfer-rig'], wtype: 'mesh' })),
  target_glb: z.string().role('path').description("Target GLB").extra('extra', bag({ order: 1, group: "input", columns: 1, tooltip: "The clothed mesh — geometry + textures, no rig. Receives the rig.", families: ['transfer-rig'], wtype: 'mesh' })),
  seed: z.number().description("Seed").step(1).extra('extra', bag(seedExtra({ order: 1, group: 'input', width: 1, tooltip: 'Same seed + image = same mesh take.', families: ['pixal3d', 'trellis2-native'] }))),
  // Select knobs coerce wire strings at compose (the skin map_size
  // precedent) — enum hints ride extra.options, never validation.
  resolution: vocabulary(MESH_RESOLUTIONS).description("Resolution").extra('extra', bag({ order: 0, group: "generation", width: 1, tooltip: "Upsample target (the live node accepts 1024–2048; the family routes serve 1024 and 1536). All tiers run the full official chain — upsample + both texture passes + remesh tail. THE RECIPE DIAL overrides this knob: High is the group default (1536 + remesh 1024 + 1M faces), Standard is the calibrated floor (1024 + remesh 768 + 700k), Fast previews at remesh 128 + 10k, Quality is the 32GB-only pass (1536 + remesh 2048 + 2M). A press that stamps no tier lands at the family floor.", families: ['pixal3d', 'trellis2-native'], wtype: 'select' })),
  steps: z.number().description("Steps").min(4).max(60).step(1).extra('extra', bag({ order: 1, group: "generation", width: 1, tooltip: "STRUCTURE stage steps (the lift). Shape + texture stages ride their own knobs in the Stage section.", families: ['pixal3d', 'trellis2-native'], wtype: 'number' })),
  cfg: z.number().description("CFG").min(1).max(15).step(0.5).extra('extra', bag({ order: 2, group: "generation", width: 1, tooltip: "Structure-stage guidance. 7.5 is the official template calibration (the 3.0 default under-samples the coarse shape). Lower runs looser.", families: ['pixal3d', 'trellis2-native'] })),
  camera_fov: vocabulary(MESH_PIXAL_FOVS).description("Camera FoV").extra('extra', bag({ order: 4, group: "generation", width: 1, tooltip: "Pixal3D only — per-image horizontal FoV feeding the camera transform matrix. auto: MoGeInference estimates from the source image (recommended); a literal degree value skips MoGe (operator-vouched camera, e.g. calibrated).", families: ['pixal3d'],  wtype: 'select' })),
  shape_steps: z.number().description("Shape steps").min(4).max(60).step(1).extra('extra', bag({ order: 0, group: "stage", width: 1, tooltip: "Shape-stage steps. 20 is the official template calibration.", families: ['pixal3d', 'trellis2-native'],  wtype: 'number' })),
  shape_cfg: z.number().description("Shape CFG").min(1).max(15).step(0.5).extra('extra', bag({ order: 1, group: "stage", width: 1, tooltip: "Shape-stage guidance. 7.5 is the official template calibration.", families: ['pixal3d', 'trellis2-native'] })),
  tex1_steps: z.number().description("Texture pass 1 steps").min(4).max(60).step(1).extra('extra', bag({ order: 2, group: "stage", width: 1, tooltip: "First texture pass steps (upsampled latent, simple scheduler). 12 is the official calibration.", families: ['pixal3d', 'trellis2-native'],  wtype: 'number' })),
  tex1_cfg: z.number().description("Texture pass 1 CFG").min(1).max(15).step(0.5).extra('extra', bag({ order: 3, group: "stage", width: 1, tooltip: "First texture pass guidance. 7.5 is the official calibration.", families: ['pixal3d', 'trellis2-native'] })),
  tex2_steps: z.number().description("Texture pass 2 steps").min(4).max(60).step(1).extra('extra', bag({ order: 4, group: "stage", width: 1, tooltip: "Second texture pass steps (raw unet — the detail pass). 12 is the official calibration.", families: ['pixal3d', 'trellis2-native'],  wtype: 'number' })),
  tex2_cfg: z.number().description("Texture pass 2 CFG").min(1).max(15).step(0.5).extra('extra', bag({ order: 5, group: "stage", width: 1, tooltip: "Second texture pass guidance. 1.0 is the official calibration (near-verbatim detail sampling).", families: ['pixal3d', 'trellis2-native'] })),
  remesh_resolution: z.number().description("Remesh resolution").min(128).max(2048).step(64).extra('extra', bag({ order: 0, group: "mesh", width: 1, tooltip: "UDF remesh voxel resolution. 768 is the official calibration; lower = lighter mesh, coarser surface.", families: ['pixal3d', 'trellis2-native'],  wtype: 'number' })),
  remesh_qef: z.boolean().description("Remesh QEF").default(false).extra('extra', bag({ order: 1, group: "mesh", width: 1, tooltip: "Quadratic-error edge fitting in the UDF solve. FALSE is the official template's calibration — an explicit pick, never a default (the 2026-11-17 reversion: melite's ON-by-default deviation is dead).", families: ['pixal3d', 'trellis2-native'] })),
  remesh_drop_inverted: z.boolean().description("Drop inverted").default(false).extra('extra', bag({ order: 2, group: "mesh", width: 1, tooltip: "Drop inside-out surface components after the solve — separated parts that come out with flipped normals. Off is the official template's calibration.", families: ['pixal3d', 'trellis2-native'] })),
  remesh_drop_enclosed: z.boolean().description("Drop enclosed").default(false).extra('extra', bag({ order: 3, group: "mesh", width: 1, tooltip: "Drop fully-enclosed interior shells. FALSE is the official template's calibration — ON deletes real geometry: TRELLIS output carries nested shells and deleting every enclosed one punches holes through the visible surface (the 2026-11-17 holes burn; never a default again).", families: ['pixal3d', 'trellis2-native'] })),
  remesh_fix_poles: z.boolean().description("Fix poles").default(false).extra('extra', bag({ order: 4, group: "mesh", width: 1, tooltip: "Repair pole vertices at voxel-grid corners (pinched star patterns). Off is the core default.", families: ['pixal3d', 'trellis2-native'] })),
  decimate_faces: z.number().description("Decimate faces").min(10000).max(2000000).step(10000).extra('extra', bag({ order: 5, group: "mesh", width: 1, tooltip: "Exact face count after decimation (midpoint placement). 700000 is the official calibration.", families: ['pixal3d', 'trellis2-native'],  wtype: 'number' })),
  smooth_angle: z.number().description("Smooth angle").min(0).max(180).step(5).extra('extra', bag({ order: 6, group: "mesh", width: 1, tooltip: "Normal-smoothing crease angle, applied before unwrap and after texturing. 180 is the official calibration.", families: ['pixal3d', 'trellis2-native'] })),
  atlas_size: vocabulary(MESH_ATLAS_SIZES).description("Atlas size").extra('extra', bag({ order: 0, group: "bake", width: 1, tooltip: "Unwrap + baked color atlas resolution. 4096 is the official calibration (VRAM-heavy); 2048 is the lighter fallback. THE BAKE'S MATERIAL IS INFERRED: the same voxel color field yields base color AND the metallic + roughness maps, and this card has no knob for either — surface response (gloss/metalness) is the model's inference, never a setting. The unwrap pads one texel per island, so a tighter atlas bleeds at the seams.", families: ['pixal3d', 'trellis2-native'],  wtype: 'select' })),
  ao_size: vocabulary(MESH_AO_SIZES).description("AO bake size").extra('extra', bag({ order: 1, group: "bake", width: 1, tooltip: "Ambient-occlusion bake resolution. 1024 is the official calibration.", families: ['pixal3d', 'trellis2-native'],  wtype: 'select' })),
  normal_size: vocabulary(MESH_NORMAL_SIZES).description("Normal bake size").extra('extra', bag({ order: 2, group: "bake", width: 1, tooltip: "Normal-map bake resolution. 2048 is the official calibration.", families: ['pixal3d', 'trellis2-native'],  wtype: 'select' })),
  struct_sampler: SAMPLERS.description("Structure sampler").extra('extra', bag({ order: 0, group: "lab", width: 1, tooltip: "Structure-stage sampler. euler is the official template pick.", families: ['pixal3d', 'trellis2-native'],  wtype: 'select' })),
  struct_scheduler: SCHEDULERS.description("Structure scheduler").extra('extra', bag({ order: 1, group: "lab", width: 1, tooltip: "Structure-stage scheduler. normal is the official pick.", families: ['pixal3d', 'trellis2-native'],  wtype: 'select' })),
  shape_sampler: SAMPLERS.description("Shape sampler").extra('extra', bag({ order: 2, group: "lab", width: 1, tooltip: "Shape-stage sampler. euler is the official pick.", families: ['pixal3d', 'trellis2-native'],  wtype: 'select' })),
  shape_scheduler: SCHEDULERS.description("Shape scheduler").extra('extra', bag({ order: 3, group: "lab", width: 1, tooltip: "Shape-stage scheduler. normal is the official pick.", families: ['pixal3d', 'trellis2-native'],  wtype: 'select' })),
  tex1_sampler: SAMPLERS.description("Texture pass 1 sampler").extra('extra', bag({ order: 4, group: "lab", width: 1, tooltip: "First texture pass sampler. euler is the official pick.", families: ['pixal3d', 'trellis2-native'],  wtype: 'select' })),
  tex1_scheduler: SCHEDULERS.description("Texture pass 1 scheduler").extra('extra', bag({ order: 5, group: "lab", width: 1, tooltip: "First texture pass scheduler. simple is the official pick (the only non-normal scheduler in the template).", families: ['pixal3d', 'trellis2-native'],  wtype: 'select' })),
  tex2_sampler: SAMPLERS.description("Texture pass 2 sampler").extra('extra', bag({ order: 6, group: "lab", width: 1, tooltip: "Second texture pass sampler. euler is the official pick.", families: ['pixal3d', 'trellis2-native'],  wtype: 'select' })),
  tex2_scheduler: SCHEDULERS.description("Texture pass 2 scheduler").extra('extra', bag({ order: 7, group: "lab", width: 1, tooltip: "Second texture pass scheduler. normal is the official pick.", families: ['pixal3d', 'trellis2-native'],  wtype: 'select' })),
  sd3_shift: z.number().description("SD3 shift").min(1).max(10).step(0.5).extra('extra', bag({ order: 8, group: "lab", width: 1, tooltip: "ModelSamplingSD3 shift on the structure arm. 5.0 is the official template calibration.", families: ['pixal3d', 'trellis2-native'],  wtype: 'number' })),
  rescale_struct: z.number().description("Structure rescale").min(0.1).max(1).step(0.05).extra('extra', bag({ order: 9, group: "lab", width: 1, tooltip: "Structure-arm RescaleCFG multiplier. 0.7 is the official calibration.", families: ['pixal3d', 'trellis2-native'] })),
  rescale_shape: z.number().description("Shape rescale").min(0.1).max(1).step(0.05).extra('extra', bag({ order: 10, group: "lab", width: 1, tooltip: "Shape-arm RescaleCFG multiplier (also feeds texture pass 1 — one node). 0.5 is the official calibration.", families: ['pixal3d', 'trellis2-native'] })),
  override_struct: z.number().description("Structure override %").min(0).max(1).step(0.001).extra('extra', bag({ order: 11, group: "lab", width: 1, tooltip: "Structure-arm CFGOverride start percent. 0.667 is the official calibration.", families: ['pixal3d', 'trellis2-native'] })),
  override_shape: z.number().description("Shape override %").min(0).max(1).step(0.001).extra('extra', bag({ order: 12, group: "lab", width: 1, tooltip: "Shape-arm CFGOverride start percent. 0.769 is the official calibration.", families: ['pixal3d', 'trellis2-native'] })),
  // NO filename_prefix (card: "the run routes outputs by run id
  // (compose stamps the prefix internally). The schema still admits
  // the key — old drafts keep working" — admission is schemastery's
  // non-strict object + the door's explicit-params overlay; it is
  // never a declared knob, and compose never reads it: prefixes are
  // family constants below).
})

const schemaFn = callableSchema(schema)

export const inject = ['comfyui']

// THE IDENTITY RUNG (native 2026-09-10 — migrated from the frozen
// identity ring; the card owns its label/description/genre/icon).
export const identity = {
  label: 'Generate 3D',
  description: 'The 3D lane — lift one image into a textured mesh (.glb) on native TRELLIS.2 (DINOv3 conditioning) or native Pixal3D (pixel-aligned + MoGe camera FOV, hero tier), or copy a rig onto a target GLB (transfer-rig); one surface, one arm per family.',
  genre: '3d',
  icon: 'box',
}

// THE FAMILY BINDINGS (the atom vocabulary, stroke 3): every
// boarded family's declared action, keyed by the row's family
// address — the id-switch dispatch died with them. THE PLUGIN LAW
// (L3 cure): the DECL resolves from the family's SEAT
// (family-seats.ts) at compose time — the verb map below is the
// card's declared compose contract (which action each family
// composes), keyed by the LITERAL family ids; a missing family
// package refuses at the dispatch's own loud voice below, never at
// this module's load. A family-less row (the declared fallback)
// refuses here too — never a silent second copy.
const FAMILY_ACTIONS: Record<string, 'mesh' | 'transfer'> = {
  'pixal3d': 'mesh',
  'trellis2-native': 'mesh',
  'transfer-rig': 'transfer',
}

export function composeFamilyAction(
  p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string,
): void {
  const family = String(model.family ?? model.id)
  const verb = FAMILY_ACTIONS[family]
  const seat = verb === undefined ? undefined : seatOf(family)
  if (seat === undefined) {
    throw new Error(
      `no declared action for family '${family}' on the img-to-mesh card — every boarded family (pixal3d, trellis2-native, transfer-rig) composes its own segment; this address owns none (a family package absent from the install refuses here, by name)`)
  }
  void instantiateAction(declaredAction(seat.decl, verb), p, model, g, runId)
}

export function apply(ctx: Context): void {
  // THE PLUGIN LAW (L3): prime the family seats fire-and-forget —
  // registration NEVER waits on a family package (a missing one
  // costs its own seat; the compose seat reads what primed).
  void primeFamilySeats()
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'img-to-mesh',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'img-to-mesh',
    // boarded order IS the default order (2026-09-15: Pixal3D
    // first — the operator's standing pick; the discovery arms
    // derive the default family/service from boarded[0], the picker
    // lists in this order). THE PLUGIN LAW (L3): literal family ids
    // — the packages resolve through ./family-seats.ts (guarded
    // dynamic seats, primed at registration); a missing family
    // package costs its OWN seat, never this card's load. The
    // binding is judged by the family-coverage wall on the dev tree.
    boarded: ['pixal3d', 'trellis2-native', 'transfer-rig'],
    tags: ['3d', 'image', 'generate'],
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: '3d', order: 10 },
    // size:'huge' (2026-09-12): the cards.stage.view studio surface
    // wants room — the estate's only size class, served top-level by
    // the door, consumed by the zoom card's width law.
    surface: { layout: 'studio', size: 'huge' },
    flowKinds: {
      // The GLB inputs declare the 'mesh' lane kind (primitive ③ —
      // the edge law: the picker offers only upstream outputs whose
      // kind matches, so a lift's mesh feeds a rig's donor/target
      // directly, never an image row).
      inputs: { input_image: 'image', rigged_glb: 'mesh', target_glb: 'mesh' },
      outputs: { default: 'mesh' },
      requiresModel: true,
    },
    flowOutputBindings: [
      {
        channel: 'default',
        node: 'Save3DAdvanced.0',
        nodeClass: 'Save3DAdvanced',
        when: (params) => String(params.rigged_glb ?? '').trim() === '' && String(params.target_glb ?? '').trim() === '',
      },
      {
        channel: 'default',
        node: 'SaveRiggedModel.0',
        nodeClass: 'SaveRiggedModel',
        when: (params) => String(params.rigged_glb ?? '').trim() !== '' && String(params.target_glb ?? '').trim() !== '',
      },
    ],
    // Per-family truth (requires_by_family declaration — the door
    // gates the ACTIVE family's slice; the flat list carries the
    // UNION for flat consumers, see file header). trellis2 rides
    // the ENGINE CORE (core_node_types: nodes_trellis2.py — served
    // by the pinned core, never an extension row), so its families
    // declare no pack: an empty slice gates nothing, by construction.
    requires: ['ComfyUI-MoGe', 'melite-autorig-nodes'],
    requiresByFamily: {
      'trellis2-native': [],
      pixal3d: ['ComfyUI-MoGe'],
      'transfer-rig': ['melite-autorig-nodes'],
    },
    schema: schemaFn,
    compose(p, model, g, runId) {
      // THE SCHEMA GATE (the audio-trio admission precedent — the
      // card's own declaration validates the last hop into the
      // engine): schemastery walk enforces declared types + bounds
      // (a steps=500 draft refuses LOUD here, never composes —
      // declared 4..60; the closed vocabularies refuse outside
      // their rows), fills defaults, passes undeclared keys through
      // inert. The composer's reads below are reads of the GATED doc.
      const doc = gatedResolve('img-to-mesh', schemaFn, ['model', 'input_image', 'rigged_glb', 'target_glb'], p)
      // THE PAIRED GLB LANE (round-22 compose audit Q4b, EXHAUSTIVE-WHEN):
      // rigged_glb and target_glb are one paired transfer lane — both or
      // neither, on EVERY family. The lift arms ignore the pair, so a
      // mixed state composed fine there and the producer walk then
      // selected no output at all: zero outputs, silently. The mixed
      // state refuses here, before any arm; the producer predicates
      // stay exclusive on the states that remain reachable.
      const riggedSet = String(doc.rigged_glb ?? '').trim() !== ''
      const targetSet = String(doc.target_glb ?? '').trim() !== ''
      if (riggedSet !== targetSet) {
        throw new ComposeRefusal(
          'bad-value',
          `card 'img-to-mesh': rigged_glb and target_glb are one paired transfer lane — ` +
            `${riggedSet ? "rigged_glb is set but target_glb is empty" : "target_glb is set but rigged_glb is empty"}; ` +
            `set both for the rig transfer, or neither for the image-to-mesh lift`,
        )
      }
      // The arm IS the family's declared action (runId rides the
      // signature; prefixes are family constants, not run-scoped,
      // not knobs). THE PLUGIN LAW (L3): the DECL rides the family's
      // seat; the refusal below is the dispatch's own loud voice —
      // a multi-family card never guesses a sibling's lane silently,
      // and a family package absent from the install refuses here,
      // by name (the kit arms stay as the byte-oracles until the
      // final interlock retires them).
      composeFamilyAction(doc, model, g, runId)
    },
  }))
}
