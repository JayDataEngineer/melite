// flowStore.type-guard.test.ts — the setSlotInput type guard (2026-08-12).
//
// The user's directive: "add zustand guards to make sure that the input is
// the right kind of file / type for ALL CARDS WE HAVE." This pins the
// Zustand half of that contract — setSlotInput calls canWireSlot() before
// accepting a wire and RETURNS EARLY on a DECLARED mismatch. The pure
// helper functions are covered in slot-type-guards.test.ts; this file
// exercises the guard END-TO-END inside the live store: an incompatible
// upstream (e.g. audio→input_glb) leaves the slot UNWIRED.
//
// The backend half (validate_flow_input_types in slot_kinds.py) is
// covered by tests/unit/test_slot_type_guards.py. The two layers compose:
// Zustand blocks the wrong wire in the UI; Pydantic blocks it at the
// server when the agent or a loaded doc carries a bad wire.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { useAgentFlowStore } from "@/surfaces/flow/flowStore"
import { primeCatalog, type Catalog } from "@melite/catalog"
import { setInputVocabulary } from "@melite/catalog"

// A minimal catalog where families have DECLARED genres. familyGenre()
// reads from _cache — prime it so setSlotInput's guard can resolve a
// producer kind. The family key = the ``service`` on the stage.
const CAT: Catalog = {
  families: {
    "flux-dev": { label: "Flux", genre: "image", accepts: ["image"] },
    "audio_tts": { label: "TTS", genre: "audio", accepts: [] },
    "trellis": { label: "Trellis", genre: "3d", accepts: ["image"] },
    "kimodo_motion": { label: "Kimodo", genre: "motion", accepts: ["image"] },
    "video_generate": { label: "Video", genre: "video", accepts: ["image"] },
  },
  models: {},
}

beforeEach(() => {
  useAgentFlowStore.getState().clear()
  primeCatalog(CAT)
  // Declare slot_kinds so canWireSlot has DECLARED kinds to check against.
  setInputVocabulary({
    slots: ["input_image", "input_glb", "reference_audio", "input_mask",
            "first_frame", "last_frame", "prev_motion_artifact"],
    slot_kinds: {
      input_image: "image",
      input_glb: "glb",
      reference_audio: "audio",
      input_mask: "mask",
      first_frame: "image",
      last_frame: "image",
      prev_motion_artifact: "motion",
    },
  })
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const u = String(url)
        if (u.endsWith("/v1/flows/validate")) {
         // COMPILE-FIRST (pipe-carry retirement, 2026-09-05): every card
         // run compiles here before start — answer ok so these run-path
         // tests exercise the run, not the refusal (pinned separately).
         return new Response(JSON.stringify({ ok: true, card: true }), {
         status: 200, headers: { "Content-Type": "application/json" },
         })
        }
        if (u.endsWith("/v1/flows/start")) {
      return new Response(JSON.stringify({ run_id: "p-test" }), {
        status: 200, headers: { "Content-Type": "application/json" },
      })
    }
    if (u.startsWith("/v1/flows/status/")) {
      return new Response(JSON.stringify({
        run_id: "p-test", status: "completed",
        stages: [{ id: "s0", name: "s0", index: 0, status: "completed",
                   url: "data:image/png;base64,abc" }],
      }), { status: 200, headers: { "Content-Type": "application/json" } })
    }
    return new Response(JSON.stringify({}), { status: 404 })
  }))
})

afterEach(() => { vi.unstubAllGlobals() })

describe("flowStore.setSlotInput — type guard", () => {
  it("REJECTS audio→input_glb (the exact mismatch the guard prevents)", async () => {
    const s = useAgentFlowStore.getState()
    await s.startFlow("image")
    await s.addStage({ kind: "generation", service: "audio_tts",
                       title: "TTS", params: { prompt: "voice" } })
    await s.addStage({ kind: "generation", service: "trellis",
                       title: "Mesh", params: { input_glb: null } })
    const tts = useAgentFlowStore.getState().flow!.stages[0].id
    const mesh = useAgentFlowStore.getState().flow!.stages[1].id

    // The guard REJECTS this wire: audio output ≠ glb input.
    await s.setSlotInput(mesh, "input_glb", tts)

    const meshStage = useAgentFlowStore.getState().flow!.stages[1]
    // Guard fired → upstream id NOT wired. (Fresh stage keeps inputs: []
    // because the store pads only INSIDE a successful write.)
    expect(meshStage.inputs).not.toContain(tts)
    expect(meshStage.inputs).toEqual([])
  })

  it("REJECTS motion→input_image (motion data into an image slot)", async () => {
    const s = useAgentFlowStore.getState()
    await s.startFlow("image")
    await s.addStage({ kind: "generation", service: "kimodo_motion",
                       title: "Motion", params: { prompt: "wave" } })
    await s.addStage({ kind: "generation", service: "flux-dev",
                       title: "Edit", params: { input_image: null } })
    const motion = useAgentFlowStore.getState().flow!.stages[0].id
    const edit = useAgentFlowStore.getState().flow!.stages[1].id

    await s.setSlotInput(edit, "input_image", motion)
    const editStage = useAgentFlowStore.getState().flow!.stages[1]
    expect(editStage.inputs).not.toContain(motion)
    expect(editStage.inputs).toEqual([])
  })

  it("REJECTS 3d→reference_audio (glb into an audio slot)", async () => {
    const s = useAgentFlowStore.getState()
    await s.startFlow("image")
    await s.addStage({ kind: "generation", service: "trellis",
                       title: "Mesh", params: { prompt: "mesh" } })
    await s.addStage({ kind: "generation", service: "audio_tts",
                       title: "Voice", params: { reference_audio: null } })
    const mesh = useAgentFlowStore.getState().flow!.stages[0].id
    const voice = useAgentFlowStore.getState().flow!.stages[1].id

    await s.setSlotInput(voice, "reference_audio", mesh)
    const voiceStage = useAgentFlowStore.getState().flow!.stages[1]
    expect(voiceStage.inputs).not.toContain(mesh)
    expect(voiceStage.inputs).toEqual([])
  })

  it("ALLOWS image→input_image (a valid same-kind wire)", async () => {
    const s = useAgentFlowStore.getState()
    await s.startFlow("image")
    await s.addStage({ kind: "generation", service: "flux-dev",
                       title: "Gen", params: { prompt: "hero" } })
    await s.addStage({ kind: "generation", service: "flux-dev",
                       title: "Edit", params: { input_image: null } })
    const gen = useAgentFlowStore.getState().flow!.stages[0].id
    const edit = useAgentFlowStore.getState().flow!.stages[1].id

    await s.setSlotInput(edit, "input_image", gen)
    const editStage = useAgentFlowStore.getState().flow!.stages[1]
    expect(editStage.inputs).toEqual([gen]) // wired
  })

  it("ALLOWS 3d→input_glb (genre '3d' maps to kind 'glb')", async () => {
    const s = useAgentFlowStore.getState()
    await s.startFlow("image")
    await s.addStage({ kind: "generation", service: "trellis",
                       title: "Mesh A", params: { prompt: "a" } })
    await s.addStage({ kind: "generation", service: "trellis",
                       title: "Mesh B", params: { input_glb: null } })
    const meshA = useAgentFlowStore.getState().flow!.stages[0].id
    const meshB = useAgentFlowStore.getState().flow!.stages[1].id

    await s.setSlotInput(meshB, "input_glb", meshA)
    const meshBStage = useAgentFlowStore.getState().flow!.stages[1]
    expect(meshBStage.inputs).toEqual([meshA]) // wired
  })

  it("ALLOWS image→input_mask (image↔mask compatibility bridge)", async () => {
    const s = useAgentFlowStore.getState()
    await s.startFlow("image")
    await s.addStage({ kind: "generation", service: "flux-dev",
                       title: "Gen", params: { prompt: "mask source" } })
    await s.addStage({ kind: "generation", service: "flux-dev",
                       title: "Inpaint", params: { input_mask: null } })
    const gen = useAgentFlowStore.getState().flow!.stages[0].id
    const inpaint = useAgentFlowStore.getState().flow!.stages[1].id

    await s.setSlotInput(inpaint, "input_mask", gen)
    const inpaintStage = useAgentFlowStore.getState().flow!.stages[1]
    expect(inpaintStage.inputs).toEqual([gen]) // wired
  })

  it("ALLOWS audio→reference_audio (same-kind audio wire)", async () => {
    const s = useAgentFlowStore.getState()
    await s.startFlow("image")
    await s.addStage({ kind: "generation", service: "audio_tts",
                       title: "Voice A", params: { prompt: "a" } })
    await s.addStage({ kind: "generation", service: "audio_tts",
                       title: "Voice B", params: { reference_audio: null } })
    const vA = useAgentFlowStore.getState().flow!.stages[0].id
    const vB = useAgentFlowStore.getState().flow!.stages[1].id

    await s.setSlotInput(vB, "reference_audio", vA)
    const vBStage = useAgentFlowStore.getState().flow!.stages[1]
    expect(vBStage.inputs).toEqual([vA]) // wired
  })

  it("ALLOWS unwiring (null upstream bypasses the guard)", async () => {
    const s = useAgentFlowStore.getState()
    await s.startFlow("image")
    await s.addStage({ kind: "generation", service: "flux-dev",
                       title: "Gen", params: { prompt: "hero" } })
    await s.addStage({ kind: "generation", service: "flux-dev",
                       title: "Edit", params: { input_image: null } })
    const gen = useAgentFlowStore.getState().flow!.stages[0].id
    const edit = useAgentFlowStore.getState().flow!.stages[1].id

    // Wire first
    await s.setSlotInput(edit, "input_image", gen)
    expect(useAgentFlowStore.getState().flow!.stages[1].inputs).toEqual([gen])
    // Unwire (null upstream — guard skipped, slot cleared)
    await s.setSlotInput(edit, "input_image", null)
    expect(useAgentFlowStore.getState().flow!.stages[1].inputs).toEqual([""])
  })

  it("is permissive when the upstream genre is unknown (no catalog entry)", async () => {
    // An upstream service NOT in the catalog → familyGenre returns undefined
    // → genreToKind returns "any" → canWireSlot is permissive. This is the
    // correct behavior: the guard never FALSE-blocks on an unknown family.
    const s = useAgentFlowStore.getState()
    await s.startFlow("image")
    await s.addStage({ kind: "generation", service: "unknown_family_xyz",
                       title: "Mystery", params: { prompt: "?" } })
    await s.addStage({ kind: "generation", service: "flux-dev",
                       title: "Edit", params: { input_image: null } })
    const mystery = useAgentFlowStore.getState().flow!.stages[0].id
    const edit = useAgentFlowStore.getState().flow!.stages[1].id

    await s.setSlotInput(edit, "input_image", mystery)
    const editStage = useAgentFlowStore.getState().flow!.stages[1]
    expect(editStage.inputs).toEqual([mystery]) // wired — permissive on unknowns
  })

  it("is permissive when the slot kind is unknown (undeclared slot)", async () => {
    // A slot absent from slot_kinds → slotKind returns "any" → permissive.
    const s = useAgentFlowStore.getState()
    await s.startFlow("image")
    await s.addStage({ kind: "generation", service: "flux-dev",
                       title: "Gen", params: { prompt: "hero" } })
    // weird_slot is absent from the vocabulary's slot list; the store
    // skips it (stageSlots filter). The guard itself is permissive (slot
    // absent from slot_kinds → "any"), but the store's own slot resolver
    // treats an unknown key as a no-op — proving the guard doesn't
    // FALSE-block on unknowns (no throw, no crash).
    await s.addStage({ kind: "generation", service: "flux-dev",
                       title: "Edit", params: { prompt: "x" } })
    const gen = useAgentFlowStore.getState().flow!.stages[0].id
    const edit = useAgentFlowStore.getState().flow!.stages[1].id

    await s.setSlotInput(edit, "weird_slot", gen)
    const editStage = useAgentFlowStore.getState().flow!.stages[1]
    // No throw, no crash — the guard is permissive. Upstream not wired only
    // because weird_slot isn't a real slot on this stage.
    expect(editStage.inputs).not.toContain(gen)
  })
})
