// The motion→bake join (2026-08-15, "motion bake time") — the architectural
// pin for the decision BAKE STAYS A SEPARATE CARD:
//
//   [Kimodo motion card]  --motion_npz-->  [Bake Motion card]  <--input_glb--  [Trellis card]
//     text → SOMA-77 NPZ                     NPZ + rig → animated GLB           image → rigged GLB
//
// The motion card MAKES motion; bake APPLIES it (the substrate's own words —
// bake_motion.py: "WHY THIS IS A SEPARATE BRICK FROM kimodo_motion"). This
// file pins the JOIN at the three seams a collapse would have to break:
//   1. the bake card declares exactly two slots — input_glb + motion_npz —
//      in the catalog's declared order (compile FormConfig form_3d_bake_motion);
//   2. each wire is TYPE-GUARDED (slot_kinds): motion→motion_npz and
//      3d→input_glb pass; image→motion_npz and motion→input_glb are blocked
//      before the request ever reaches the server;
//   3. the run body carries the NAMED artifacts — the bake card's motion_npz
//      is the motion card's artifacts["motion_npz"], NOT its primary URL
//      (a motion card's primary asset is not necessarily the NPZ), and
//      input_glb is the trellis card's "glb" artifact.
//
// Same execution protocol as flowStore.slot-wiring.spec.ts: POST
// /v1/flows/start → {run_id} → poll /v1/flows/status/{run_id}.
// The mock serves per-run NAMED artifacts so the join assertions prove the
// named-output path, not the primary fallback.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { stageSlots } from "@melite/catalog"
import { primeCatalog, formOf, type Catalog } from "@melite/catalog"
import { useAgentFlowStore } from "@/surfaces/flow/flowStore"

const fetchCalls: Array<{ url: string; body: Record<string, unknown> }> = []
let genIdx = 0
/** Per-run terminal status: named_urls = the artifacts THAT run produced. */
const RUN_ARTIFACTS: Array<Record<string, string>> = []

beforeEach(() => {
  fetchCalls.length = 0
  genIdx = 0
  RUN_ARTIFACTS.length = 0
  useAgentFlowStore.getState().clear()
  // The REAL catalog shape (editor_catalog.get_catalog + compile
  // .input_vocabulary, trimmed to the three families under test — every
  // field is the shape the backend sends, not a test invention).
  primeCatalog({
    families: {
      kimodo: { label: "Kimodo", genre: "motion" },
      trellis: { label: "Trellis", genre: "3d" },
      bake_motion: { label: "Bake Motion", genre: "3d" },
      krea: { label: "Krea", genre: "image" },
    },
    models: {
      kimodo: { family: "kimodo", form: "form_motion_kimodo", input_slots: [], prompt_in_form: true },
      trellis: { family: "trellis", form: "form_3d_trellis", input_slots: ["input_image"], prompt_in_form: false },
      bake_motion: {
        family: "bake_motion", form: "form_3d_bake_motion",
        input_slots: ["input_glb", "motion_npz"], prompt_in_form: false,
        defaults: { anim_name: "Walk", fps: 30.0 },
      },
      "krea-2": { family: "krea", form: "form_generate", input_slots: [], prompt_in_form: true },
    },
    input_vocabulary: {
      slots: ["input_image", "input_glb", "motion_npz"],
      aliases: {},
      form_slots: { form_3d_bake_motion: ["input_glb", "motion_npz"] },
      slot_kinds: { input_image: "image", input_glb: "glb", motion_npz: "motion" },
    },
  } as unknown as Catalog)
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url)
    const body = init?.body ? JSON.parse(init.body as string) : {}
    fetchCalls.push({ url: u, body })
    // The params contract endpoint (server/app.py flow_family_param_
    // schemas — executeStage validates every run against the family's
    // schema before POSTing). Shapes below are the backend's own dump
    // (all_family_param_schemas), trimmed to the fields the card sends.
    if (u.endsWith("/v1/flows/families/param-schemas")) {
      return new Response(JSON.stringify({
        bake_motion: {
          additionalProperties: false,
          required: ["comfy_url"],
          properties: {
            comfy_url: { type: "string" },
            glb_artifact: { type: "string", default: "rigged_glb" },
            motion_artifact: { type: "string", default: "motion_npz" },
            anim_name: { type: "string", default: "motion" },
            fps: { type: "number", default: 30.0 },
            output_artifact: { type: "string", default: "animated_glb" },
          },
        },
        trellis: {
          additionalProperties: false,
          required: ["comfy_url"],
          properties: {
            comfy_url: { type: "string" },
            rig_with_somax: { type: "boolean", default: true },
            seed: { type: "integer", default: 42 },
          },
        },
        kimodo_motion: {
          additionalProperties: false,
          required: ["comfy_url"],
          properties: {
            comfy_url: { type: "string" },
            prompt: { type: "string" },
            seed: { type: "integer", default: 42 },
            duration_sec: { type: "number", default: 5.0 },
          },
        },
        // The catalog-family ALIAS of kimodo_motion (same object, second
        // key) — the real all_family_param_schemas serves both forms so
        // the frontend's model→catalog-family lookup always hits. A mock
        // serving only the registry key lies about the wire shape and
        // trips the phantom-family gate (correctly — BLOCKS = GOOD).
        kimodo: {
          additionalProperties: false,
          required: ["comfy_url"],
          properties: {
            comfy_url: { type: "string" },
            prompt: { type: "string" },
            seed: { type: "integer", default: 42 },
            duration_sec: { type: "number", default: 5.0 },
          },
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } })
    }
        if (u.endsWith("/v1/flows/validate")) {
         // COMPILE-FIRST (pipe-carry retirement, 2026-09-05): every card
         // run compiles here before start — answer ok so these run-path
         // tests exercise the run, not the refusal (pinned separately).
         return new Response(JSON.stringify({ ok: true, card: true }), {
         status: 200, headers: { "Content-Type": "application/json" },
         })
        }
        // CARD BIRTH LAW (2026-09-06): compose-first — the run mints
        // its card here before start. Served so these run-path tests
        // exercise the run, not the compose (refused composes are
        // pinned separately).
        if (u.endsWith("/v1/flows/drafts")) {
          return new Response(JSON.stringify({ draftId: "draft-test-motion-bake" }), {
            status: 200, headers: { "Content-Type": "application/json" },
          })
        }
        if (u.endsWith("/v1/flows/start")) {
      const idx = genIdx++
      return new Response(JSON.stringify({ run_id: `p-mb-${idx}` }), {
        status: 200, headers: { "Content-Type": "application/json" },
      })
    }
    if (u.startsWith("/v1/flows/status/")) {
      const stage = Number((u.split("/").pop() ?? "").replace("p-mb-", ""))
      return new Response(JSON.stringify({
        run_id: `p-mb-${stage}`,
        status: "completed",
        stages: [{
          id: `s${stage}`, name: `s${stage}`, index: 0, status: "completed",
          url: `data:application/octet-stream;base64,primary${stage}`,
          named_urls: RUN_ARTIFACTS[stage] ?? {},
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } })
    }
    return new Response(JSON.stringify({}), { status: 404 })
  }))
})

afterEach(() => vi.unstubAllGlobals())

const genCalls = () => fetchCalls.filter((c) => c.url.endsWith("/v1/flows/start"))

/** Build the canonical join in the store: trellis → bake ← kimodo. */
async function buildJoin() {
  const s = useAgentFlowStore.getState()
  await s.startFlow("motion bake")
  await s.addStage({ kind: "generation", service: "trellis", title: "Trellis", params: { input_image: null, rig_with_somax: true } })
  await s.addStage({ kind: "generation", service: "kimodo", title: "Motion", params: { prompt: "a person waving" } })
  await s.addStage({
    kind: "generation", service: "bake_motion", title: "Bake Motion",
    // The picker's null-seed for both declared slots (seededParams).
    params: { input_glb: null, motion_npz: null, anim_name: "Walk", fps: 30.0 },
  })
  const stages = useAgentFlowStore.getState().flow!.stages
  return { trellis: stages[0], motion: stages[1], bake: stages[2] }
}

describe("the bake card's slot contract (form_3d_bake_motion)", () => {
  it("declares exactly [input_glb, motion_npz] — the two-arrow join, in catalog order", async () => {
    await buildJoin()
    const bake = useAgentFlowStore.getState().flow!.stages[2]
    // formOf resolves through the primed catalog (models.bake_motion.form).
    expect(formOf("bake_motion")).toBe("form_3d_bake_motion")
    expect(stageSlots(bake.params, formOf(bake.service), bake.service)).toEqual([
      "input_glb", "motion_npz",
    ])
  })
})

describe("the join's type guard (slot_kinds)", () => {
  it("wires motion→motion_npz and 3d→input_glb; blocks motion→input_glb (kind mismatch)", async () => {
    const { trellis, motion, bake } = await buildJoin()
    const s = useAgentFlowStore.getState()

    // The two LEGAL arrows land at their own indices.
    await s.setSlotInput(bake.id, "motion_npz", motion.id, "motion_npz")
    await s.setSlotInput(bake.id, "input_glb", trellis.id, "glb")
    const b = useAgentFlowStore.getState().flow!.stages[2]
    expect(b.inputs).toEqual([trellis.id, motion.id])
    expect(b.inputOutputs).toEqual(["glb", "motion_npz"])

    // The CROSSED arrow is rejected: a motion NPZ is not a GLB. Unwire
    // first (one wire per slot), then try the swap — it must NOT land.
    await s.setSlotInput(bake.id, "input_glb", null)
    await s.setSlotInput(bake.id, "input_glb", motion.id)
    const crossed = useAgentFlowStore.getState().flow!.stages[2]
    expect(crossed.inputs).toEqual(["", motion.id])
  })

  it("an image card wiring into motion_npz is REJECTED before the wire lands", async () => {
    const s = useAgentFlowStore.getState()
    await s.startFlow("guard")
    await s.addStage({ kind: "generation", service: "krea-2", title: "Image", params: { prompt: "x" } })
    await s.addStage({ kind: "generation", service: "bake_motion", title: "Bake", params: { input_glb: null, motion_npz: null } })
    const stages = useAgentFlowStore.getState().flow!.stages
    const img = stages[0]
    const bake = stages[1]

    await s.setSlotInput(bake.id, "motion_npz", img.id, "motion_npz")
    // The guard rejects BEFORE any padding lands — the card is untouched.
    const after = useAgentFlowStore.getState().flow!.stages[1]
    expect(after.inputs).toEqual([])
    expect(after.inputOutputs ?? []).toEqual([])
  })
})

describe("the run body (the join executes as named artifacts)", () => {
  it("runAll sends the bake card's motion_npz = the motion card's NAMED motion_npz artifact, input_glb = trellis's glb", async () => {
    const { trellis, motion, bake } = await buildJoin()
    const s = useAgentFlowStore.getState()
    await s.setSlotInput(bake.id, "input_glb", trellis.id, "glb")
    await s.setSlotInput(bake.id, "motion_npz", motion.id, "motion_npz")
    // Per-run named artifacts: trellis → glb; kimodo → motion_npz (+ its
    // openpose sidecar, so "the named pick" is distinguishable from "the
    // only artifact"); bake → the animated GLB.
    RUN_ARTIFACTS.push(
      { glb: "data:model/gltf-binary;base64,TRGLB" },
      { motion_npz: "data:application/octet-stream;base64,MOTNPZ", motion_npz_openpose: "data:image/png;base64,OP" },
      { animated_glb: "data:model/gltf-binary;base64,BAKED" },
    )

    await useAgentFlowStore.getState().runAll()

    // Three runs, in order — the bake card ran LAST (topological).
    expect(genCalls()).toHaveLength(3)
    const bakeBody = genCalls()[2].body
    expect(bakeBody.model).toBe("bake_motion")
    // The NAMED picks, not the primary fallback (primary of run 1 is NOT
    // the NPZ — this is the assertion a primary-only injection would fail).
    expect(bakeBody.input_glb).toBe("data:model/gltf-binary;base64,TRGLB")
    expect(bakeBody.motion_npz).toBe("data:application/octet-stream;base64,MOTNPZ")
    // The card's own params ride along untouched.
    expect(bakeBody.anim_name).toBe("Walk")
    expect(bakeBody.fps).toBe(30.0)
    // And the bake card's result carries the animated GLB as a named
    // artifact — the output the next card wires.
    const done = useAgentFlowStore.getState().flow!.stages[2]
    expect(done.result?.artifacts.animated_glb).toBe("data:model/gltf-binary;base64,BAKED")
  })
})
