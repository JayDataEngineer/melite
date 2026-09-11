// Per-slot live wiring (2026-08-08) — the indexed setSlotInput contract.
//
// stage.inputs is an ordered per-slot array: inputs[i] ↔ the i-th slot the
// params declare (stageSlots = INPUT_SLOTS ∩ params). slot 0 = input_image
// (or first_frame on video-gen cards), slot 1 = last_frame / end_image.
// Real cards null-seed their slots (seededParams) — the injection guard is
// FALSY so a wired value lands even when the seeded key is present.
//
// Same execution protocol as flowStore.wiring.spec.ts: POST
// /v1/flows/generate → {run_id} → poll /v1/flows/status/{run_id}.
// The mock serves both per stage; the artifact URL embeds the stage
// counter so assertions can prove stage N's output reached stage N+1.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { useAgentFlowStore } from "@/surfaces/flow/flowStore"
import { useFlowCards } from "@/surfaces/flow/flowCards"
import type { StageDescriptor } from "@melite/contracts"
import { makeDraft } from "@/__tests__/__fixtures__/backendDraft"

const fetchCalls: Array<{ url: string; body: Record<string, unknown> }> = []
let genIdx = 0

beforeEach(() => {
 fetchCalls.length = 0
 genIdx = 0
 useAgentFlowStore.getState().clear()
 vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
 const u = String(url)
 const body = init?.body ? JSON.parse(init.body as string) : {}
 fetchCalls.push({ url: u, body })
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
     return new Response(JSON.stringify({ draftId: "draft-test-slot" }), {
     status: 200, headers: { "Content-Type": "application/json" },
     })
     }
     if (u.endsWith("/v1/flows/start")) {
 const idx = genIdx++
 return new Response(JSON.stringify({ run_id: `p-test-${idx}` }), {
 status: 200, headers: { "Content-Type": "application/json" },
 })
 }
 if (u.startsWith("/v1/flows/status/")) {
 const stage = Number((u.split("/").pop() ?? "").replace("p-test-", ""))
 return new Response(JSON.stringify({
 run_id: `p-test-${stage}`,
 status: "completed",
 stages: [{ id: `s${stage}`, name: `s${stage}`, index: 0, status: "completed", url: `data:image/png;base64,stage${stage}` }],
 }), { status: 200, headers: { "Content-Type": "application/json" } })
 }
 return new Response(JSON.stringify({}), { status: 404 })
 }))
})

afterEach(() => { vi.unstubAllGlobals() })

const genCalls = () => fetchCalls.filter((c) => c.url.endsWith("/v1/flows/start"))

describe("flowStore — indexed per-slot wiring", () => {
 it("wires slot 1 (last_frame) without clobbering slot 0 (first_frame)", async () => {
 const s = useAgentFlowStore.getState()
 await s.startFlow("video")
 await s.addStage({ kind: "generation", service: "flux-dev", title: "Gen A", params: { prompt: "a" } })
 await s.addStage({ kind: "generation", service: "flux-dev", title: "Gen B", params: { prompt: "b" } })
 await s.addStage({
 kind: "generation", service: "video_generate", title: "Video",
 params: { first_frame: null, last_frame: null },
 })
 const stages = useAgentFlowStore.getState().flow!.stages
 const a = stages[0].id
 const b = stages[1].id
 const video = stages[2].id

 // Wire ONLY last_frame (slot 1) — slot 0 stays untouched.
 await useAgentFlowStore.getState().setSlotInput(video, "last_frame", b)
 let inputs = useAgentFlowStore.getState().flow!.stages[2].inputs
 expect(inputs).toEqual(["", b])

 // Wire first_frame (slot 0) — slot 1 keeps its wire.
 await useAgentFlowStore.getState().setSlotInput(video, "first_frame", a)
 inputs = useAgentFlowStore.getState().flow!.stages[2].inputs
 expect(inputs).toEqual([a, b])
 })

 it("unwire sets \"\" (not []) and preserves the fixed-length invariant", async () => {
 const s = useAgentFlowStore.getState()
 await s.startFlow("video")
 await s.addStage({ kind: "generation", service: "flux-dev", title: "Gen", params: { prompt: "a" } })
 await s.addStage({
 kind: "generation", service: "video_generate", title: "Video",
 params: { first_frame: null, last_frame: null },
 })
 const stages = useAgentFlowStore.getState().flow!.stages
 const gen = stages[0].id
 const video = stages[1].id

 await useAgentFlowStore.getState().setSlotInput(video, "last_frame", gen)
 await useAgentFlowStore.getState().setSlotInput(video, "last_frame", null)
 const inputs = useAgentFlowStore.getState().flow!.stages[1].inputs
 expect(inputs).toEqual(["", ""])
 })

 it("unknown slot key is a no-op (preserves existing wires)", async () => {
 const s = useAgentFlowStore.getState()
 await s.startFlow("video")
 await s.addStage({ kind: "generation", service: "flux-dev", title: "Gen", params: { prompt: "a" } })
 await s.addStage({
 kind: "generation", service: "video_generate", title: "Video",
 params: { first_frame: null, last_frame: null },
 })
 const stages = useAgentFlowStore.getState().flow!.stages
 const gen = stages[0].id
 const video = stages[1].id

 await useAgentFlowStore.getState().setSlotInput(video, "first_frame", gen)
 expect(useAgentFlowStore.getState().flow!.stages[1].inputs).toEqual([gen, ""])

 // input_glb is not a declared slot of this card — nothing changes.
 await useAgentFlowStore.getState().setSlotInput(video, "input_glb", gen)
 expect(useAgentFlowStore.getState().flow!.stages[1].inputs).toEqual([gen, ""])
 })

 it("removeStage turns removed ids into \"\" holes instead of filtering", async () => {
 const s = useAgentFlowStore.getState()
 await s.startFlow("video")
 await s.addStage({ kind: "generation", service: "flux-dev", title: "Gen A", params: { prompt: "a" } })
 await s.addStage({ kind: "generation", service: "flux-dev", title: "Gen B", params: { prompt: "b" } })
 await s.addStage({
 kind: "generation", service: "video_generate", title: "Video",
 params: { first_frame: null, last_frame: null },
 })
 const stages = useAgentFlowStore.getState().flow!.stages
 const a = stages[0].id
 const b = stages[1].id
 const video = stages[2].id

 await useAgentFlowStore.getState().setSlotInput(video, "first_frame", a)
 await useAgentFlowStore.getState().setSlotInput(video, "last_frame", b)
 useAgentFlowStore.getState().removeStage(a)
 // Slot 0 becomes a hole; slot 1's wire to B is untouched.
 expect(useAgentFlowStore.getState().flow!.stages[1].inputs).toEqual(["", b])
 })

 it("hydrateDraft adopts the backend-padded inputs (inputIndices + declared slots)", async () => {
 const stages: StageDescriptor[] = [
 { title: "Generate", kind: "generation", service: "flux-dev",
 params: { prompt: "hero", seed: 1 } },
 { title: "Upscale", kind: "generation", service: "seedvr2-ema-3b",
 params: { input_image: null }, inputIndices: [0] },
 { title: "Video", kind: "generation", service: "video_generate",
 params: { first_frame: null, last_frame: null } },
 ]
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("agent flow", stages))
 const pipe = useAgentFlowStore.getState().flow!
 // Upscale: inputIndices [0] → first slot wired.
 expect(pipe.stages[1].inputs).toEqual([pipe.stages[0].id])
 // Video: no inputIndices → padded to its two slots.
 expect(pipe.stages[2].inputs).toEqual(["", ""])
 })

 it("re-running the upstream marks the wired downstream stale", async () => {
 const stages: StageDescriptor[] = [
 { title: "Generate", kind: "generation", service: "flux-dev",
 params: { prompt: "sunset", seed: 1 } },
 { title: "Upscale", kind: "generation", service: "seedvr2-ema-3b",
 params: { input_image: null }, inputIndices: [0] },
 ]
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("gen → upscale", stages))
 await useAgentFlowStore.getState().runAll()
 const pipe = () => useAgentFlowStore.getState().flow!
 expect(pipe().stages[1].status).toBe("done")
 const keyBefore = pipe().stages[1].cacheKey

 // Upstream param change → upstream cacheKey changes → the wired
 // downstream's key changes too → done stage flips stale.
 await useAgentFlowStore.getState().updateStageParams(pipe().stages[0].id, { prompt: "night" })
 expect(pipe().stages[1].status).toBe("stale")
 expect(pipe().stages[1].cacheKey).not.toBe(keyBefore)
 })

 it("null-seeded slot receives the wired value (the real-card shape)", async () => {
 // The F2 regression: seededParams null-seeds {input_image: null} into
 // every input-capable card. The old `in params` guard treated that as
 // "already set" and the wire died. Falsy guard must inject.
 const stages: StageDescriptor[] = [
 { title: "Generate", kind: "generation", service: "flux-dev",
 params: { prompt: "hero", seed: 1 } },
 { title: "Upscale", kind: "generation", service: "seedvr2-ema-3b",
 params: { input_image: null }, inputIndices: [0] },
 ]
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("gen → upscale", stages))
 await useAgentFlowStore.getState().runAll()
 const stage0Url = useAgentFlowStore.getState().flow!.stages[0].result!.assetUrls[0]
 expect(genCalls()[1].body.input_image).toBe(stage0Url)
 })

 it("video-gen wired slot 0 lands in first_frame (params-derived, not end_image)", async () => {
 const stages: StageDescriptor[] = [
 { title: "Generate", kind: "generation", service: "flux-dev",
 params: { prompt: "start", seed: 1 } },
 { title: "Video", kind: "generation", service: "video_generate",
 params: { first_frame: null, last_frame: null }, inputIndices: [0] },
 ]
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("gen → video", stages))
 await useAgentFlowStore.getState().runAll()
 const stage0Url = useAgentFlowStore.getState().flow!.stages[0].result!.assetUrls[0]
 const body = genCalls()[1].body
 expect(body.first_frame).toBe(stage0Url)
 // Only slot 0 was wired — the seeded last_frame: null param passes
 // through untouched, and end_image is not part of this card at all.
 expect(body.end_image).toBeUndefined()
 expect(body.last_frame).toBeNull()
 })

 it("edit card wires slot 0 AND slot 1 → input_image + image2 land in the run body", async () => {
 // The multi-slot grid (2026-08-08): form_edit declares up to 4 slots
 // (input_image/image2/image3/lanpaint_mask). This stage's params
 // declare only the first 3 (the wire test focuses on multi-image);
 // wiring two upstreams must inject into BOTH params — the multi-slot
 // extension of the video-gen contract.
 const stages: StageDescriptor[] = [
 { title: "Gen A", kind: "generation", service: "flux-dev",
 params: { prompt: "a", seed: 1 } },
 { title: "Gen B", kind: "generation", service: "flux-dev",
 params: { prompt: "b", seed: 2 } },
 { title: "Edit", kind: "generation", service: "qwen-image-edit",
 params: { input_image: null, image2: null, image3: null },
 inputIndices: [0, 1] },
 ]
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("a+b → edit", stages))
 await useAgentFlowStore.getState().runAll()
 const pipe = useAgentFlowStore.getState().flow!
 const urlA = pipe.stages[0].result!.assetUrls[0]
 const urlB = pipe.stages[1].result!.assetUrls[0]
 const body = genCalls()[2].body
 expect(body.input_image).toBe(urlA)
 expect(body.image2).toBe(urlB)
 // Slot 2 (image3) unwired — the seeded null passes through.
 expect(body.image3).toBeNull()
 })

 it("motion chain: wired prev_motion_artifact slot lands in the run body (.npz upstream)", async () => {
 // The kimodo chain (2026-08-08): form_motion_kimodo declares exactly
 // one slot — prev_motion_artifact (identity param key = slot key,
 // compile.py _INPUT_PARAM_TO_SLOT). Stage 0 produces the first motion
 // NPZ; the chain card's wire injects the upstream URL under the SAME
 // key, so the node conditions the next clip on the previous one's
 // final pose. The mock serves .npz asset URLs to prove the chain shape
 // (the family's mode-2 detection keys on the .npz suffix).
 vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
 const u = String(url)
 const body = init?.body ? JSON.parse(init.body as string) : {}
 fetchCalls.push({ url: u, body })
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
     return new Response(JSON.stringify({ draftId: "draft-test-slot" }), {
     status: 200, headers: { "Content-Type": "application/json" },
     })
     }
     if (u.endsWith("/v1/flows/start")) {
 const idx = genIdx++
 return new Response(JSON.stringify({ run_id: `p-test-${idx}` }), {
 status: 200, headers: { "Content-Type": "application/json" },
 })
 }
 if (u.startsWith("/v1/flows/status/")) {
 const stage = Number((u.split("/").pop() ?? "").replace("p-test-", ""))
 return new Response(JSON.stringify({
 run_id: `p-test-${stage}`,
 status: "completed",
 stages: [{ id: `s${stage}`, name: `s${stage}`, index: 0, status: "completed", url: `data:application/octet-stream;base64,motion${stage}.npz` }],
 }), { status: 200, headers: { "Content-Type": "application/json" } })
 }
 return new Response(JSON.stringify({}), { status: 404 })
 }))
 const stages: StageDescriptor[] = [
 { title: "Walk", kind: "generation", service: "kimodo",
 params: { prompt: "walk forward", duration_sec: 3, seed: 1 } },
 { title: "Turn", kind: "generation", service: "kimodo",
 params: { prompt: "turn around", duration_sec: 2, seed: 2, prev_motion_artifact: null },
 inputIndices: [0] },
 ]
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("walk → turn", stages))
 await useAgentFlowStore.getState().runAll()
 const stage0Url = useAgentFlowStore.getState().flow!.stages[0].result!.assetUrls[0]
 expect(stage0Url.endsWith(".npz")).toBe(true)
 const body = genCalls()[1].body
 expect(body.prev_motion_artifact).toBe(stage0Url)
 // The kimodo card carries NO image slots — no input_image injection.
 expect(body.input_image).toBeUndefined()
 })

 it("an upstream that fails contributes nothing downstream (chain stops)", async () => {
 vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
 const u = String(url)
 const body = init?.body ? JSON.parse(init.body as string) : {}
 fetchCalls.push({ url: u, body })
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
     return new Response(JSON.stringify({ draftId: "draft-test-slot" }), {
     status: 200, headers: { "Content-Type": "application/json" },
     })
     }
     if (u.endsWith("/v1/flows/start")) {
 return new Response(JSON.stringify({ run_id: "p-fail-0" }), {
 status: 200, headers: { "Content-Type": "application/json" },
 })
 }
 if (u.startsWith("/v1/flows/status/")) {
 return new Response(JSON.stringify({
 run_id: "p-fail-0",
 status: "failed", stages: [], error: "boom",
 }), { status: 200, headers: { "Content-Type": "application/json" } })
 }
 return new Response(JSON.stringify({}), { status: 404 })
 }))
 const stages: StageDescriptor[] = [
 { title: "Generate", kind: "generation", service: "flux-dev",
 params: { prompt: "hero", seed: 1 } },
 { title: "Upscale", kind: "generation", service: "seedvr2-ema-3b",
 params: { input_image: null }, inputIndices: [0] },
 ]
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("gen → upscale", stages))
 await useAgentFlowStore.getState().runAll()
 // Only stage 0 ever POSTed — no upstream result, no downstream run.
 expect(genCalls().length).toBe(1)
 expect(useAgentFlowStore.getState().flow!.stages[1].status).toBe("pending")
 })
})

describe("flowCards adapter — the SlotGrid contract", () => {
 it("actions.onWireSlot routes to the store's setSlotInput", async () => {
 const s = useAgentFlowStore.getState()
 await s.startFlow("video")
 await s.addStage({ kind: "generation", service: "flux-dev", title: "Gen", params: { prompt: "a" } })
 await s.addStage({
 kind: "generation", service: "video_generate", title: "Video",
 params: { first_frame: null, last_frame: null },
 })
 const stages = useAgentFlowStore.getState().flow!.stages
 const gen = stages[0].id
 const video = stages[1].id

 const { result } = renderHook(() => useFlowCards(useAgentFlowStore))
 // The card grid's SlotGrid calls actions.onWireSlot(stageId, slot, id).
 await result.current.actions.onWireSlot!(video, "last_frame", gen)
 expect(useAgentFlowStore.getState().flow!.stages[1].inputs).toEqual(["", gen])
 // And the unwire side: null → "".
 await result.current.actions.onWireSlot!(video, "last_frame", null)
 expect(useAgentFlowStore.getState().flow!.stages[1].inputs).toEqual(["", ""])
 })

 it("the adapter carries NO per-slot VM — the squares live in the drilldown only", async () => {
 // the zoomed out view" — CardStage has no slotWires VM (the type lacks
 // the field entirely); SlotGrid derives wired/attached state from
 // stage.inputs + params in the detail. The adapter only wires the store
 // actions through.
 const stages: StageDescriptor[] = [
 { title: "Generate", kind: "generation", service: "flux-dev",
 params: { prompt: "hero", seed: 1 } },
 { title: "Upscale", kind: "generation", service: "seedvr2-ema-3b",
 params: { input_image: null }, inputIndices: [0] },
 ]
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("gen → upscale", stages))

 const { result } = renderHook(() => useFlowCards(useAgentFlowStore))
 // The wire action still routes to the store (the drilldown's SlotGrid
 // is the only consumer).
 const genId = useAgentFlowStore.getState().flow!.stages[0].id
 const upId = useAgentFlowStore.getState().flow!.stages[1].id
 await result.current.actions.onWireSlot!(upId, "input_image", genId)
 expect(useAgentFlowStore.getState().flow!.stages[1].inputs).toEqual([genId])
 })

 it("input_prep mask → edit lanpaint_mask: named-output wiring lands in the run body", async () => {
 // The optional-named-outputs chain (2026-08-08): input_prep produces a
 // ``mask`` artifact ALONGSIDE its primary ``media``; the backend
 // surfaces both as named_urls in the run status; collectNamedArtifacts
 // populates StageResult.artifacts; the edit card's 4th slot
 // (lanpaint_mask) is wired to the upstream's ``mask`` output via
 // setSlotInput(..., "mask"); collectUpstreamResults injects the mask
 // URL under lanpaint_mask → the edit brick activates LanPaint inpaint.
 //
 // This test uses a custom fetch mock: stage 0's status carries
 // named_urls (media + mask) so the upstream result has BOTH artifacts;
 // stage 1's status is the generic single-URL shape. The generate-call
 // body for the edit must contain lanpaint_mask = the mask URL.
 const maskUrl = "data:image/png;base64,MASK9988"
 const mediaUrl = "data:image/png;base64,MEDIA7766"
 const localCalls: Array<{ url: string; body: Record<string, unknown> }> = []
 let localGen = 0
 vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
 const u = String(url)
 const body = init?.body ? JSON.parse(init.body as string) : {}
 localCalls.push({ url: u, body })
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
     return new Response(JSON.stringify({ draftId: "draft-test-slot" }), {
     status: 200, headers: { "Content-Type": "application/json" },
     })
     }
     if (u.endsWith("/v1/flows/start")) {
 const idx = localGen++
 return new Response(JSON.stringify({ run_id: `p-mask-${idx}` }), {
 status: 200, headers: { "Content-Type": "application/json" },
 })
 }
 if (u.startsWith("/v1/flows/status/")) {
 const stage = Number((u.split("/").pop() ?? "").replace("p-mask-", ""))
 // Stage 0 (input_prep) → BOTH named artifacts; everything else →
 // generic single-URL (the edit's own output).
 const named = stage === 0
 ? { media: mediaUrl, mask: maskUrl }
 : undefined
 return new Response(JSON.stringify({
 run_id: `p-mask-${stage}`,
 status: "completed",
 stages: [{ id: `s${stage}`, name: `s${stage}`, index: 0, status: "completed", url: mediaUrl, named_urls: named }],
 }), { status: 200, headers: { "Content-Type": "application/json" } })
 }
 return new Response(JSON.stringify({}), { status: 404 })
 }))

 const s = useAgentFlowStore.getState()
 await s.startFlow("image")
 // Upstream: a generation stage whose status carries named_urls (the
 // input_prep shape). service is irrelevant — the mock drives the shape.
 await s.addStage({ kind: "generation", service: "flux-dev", title: "Input Prep", params: { prompt: "prep" } })
 // Edit card: all 4 form_edit slots null-seeded.
 await s.addStage({
 kind: "generation", service: "qwen-image-edit", title: "Edit",
 params: { prompt: "edit this", input_image: null, image2: null, image3: null, lanpaint_mask: null },
 })
 const stages = useAgentFlowStore.getState().flow!.stages
 const inputPrep = stages[0].id
 const edit = stages[1].id

 // Wire input_prep's ``mask`` named output → edit's lanpaint_mask (slot 3).
 await s.setSlotInput(edit, "lanpaint_mask", inputPrep, "mask")
 const editStage = useAgentFlowStore.getState().flow!.stages[1]
 expect(editStage.inputs[3]).toBe(inputPrep)
 expect(editStage.inputOutputs?.[3]).toBe("mask")

 await s.runAll()

 // The edit's generate body carries lanpaint_mask = the mask artifact
 // URL (NOT the primary media URL) — the named-output wiring contract.
 const editBody = localCalls.filter((c) => c.url.endsWith("/v1/flows/start"))[1].body
 expect(editBody.lanpaint_mask).toBe(maskUrl)
 // The primary (media) is NOT injected under lanpaint_mask — only the
 // named ``mask`` output the user selected. (input_image stays null:
 // slot 0 was not wired.)
 expect(editBody.input_image).toBeNull()
 })
})
