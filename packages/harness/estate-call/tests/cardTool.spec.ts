// cardTool.spec.ts — THE CARD-TOOL BUILDER WALL (roadmap §13, raised
// 2026-09-20 by the audio-cards DRY audit). Six tool faces each
// restated the same ~150-line skeleton — this wall pins the builder
// that owns it: the two-door execute (drafts → start), the envelope
// arms, the named-refusal mapping, the presentation projections, and
// the seams each card still owns (name/flow/label/params/preview).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GatewayError, type EstateCall } from "../src/estateCall.ts";
import { defineCardTool, normalizeJsonArrayParams } from "../src/cardTool.ts";

// ── the fake lane: every call the builder makes, answered per test ──
let draftBody: Record<string, unknown> = {}
let startBody: Record<string, unknown> = {}
let respond: (method: string, path: string) => unknown = () => ({})
const call: EstateCall = async (method, path, body) => {
  if (path === "/v1/flows/drafts") { draftBody = body as Record<string, unknown>; return respond(method, path) }
  if (path === "/v1/flows/start") { startBody = body as Record<string, unknown>; return respond(method, path) }
  throw new Error(`unexpected path ${path}`)
}

const tool = defineCardTool(call, {
  name: "music",
  flow: "music",
  label: "Music",
  description: "Generate music — structured captions with tagged lyrics",
  parameters: { prompt: { type: "string", required: true } } as never,
  defaultModel: "music3",
  previewField: "prompt",
})

describe("the card-tool builder", () => {
  it("names itself and carries the card's prose", () => {
    assert.equal(tool.name, "music")
    assert.equal(tool.description, "Generate music — structured captions with tagged lyrics")
  })

  it("presentCall previews the card's own driving field", () => {
    const out = tool.presentCall?.({ model: "yue2", prompt: "warm indie pop with female vocals" }) as Record<string, unknown>
    assert.equal(out.rawInput, "model=yue2 prompt=warm indie pop with female vocals")
  })

  it("presentCall previews the unstated default model", () => {
    const out = tool.presentCall?.({ prompt: "p" }) as Record<string, unknown>
    assert.ok(String(out.rawInput).startsWith("model=music3 "))
  })

  it("presentationMeta projects the run arm, empty keys omitted", () => {
    const out = tool.output.presentationMeta?.(undefined, {
      flow: "music", model: "music3", run_id: "r1", draft_id: "", status: "",
    })
    assert.deepEqual(out, { flow: "music", model: "music3", run_id: "r1" })
  })

  it("render REFUSED on the error arm, the run line otherwise", () => {
    const refused = tool.output.render?.(undefined, { error: "nope" })
    assert.deepEqual(refused, [{ type: "text", text: "music REFUSED: nope" }])
    const ok = tool.output.render?.(undefined, { model: "music3", run_id: "r9" })
    assert.deepEqual(ok, [{ type: "text", text: "music [music3] → r9 — poll with run_status" }])
  })

  it("presentResult titles off the projection, never re-derives", () => {
    // (the defineTool wrapper validates args before the presenter runs —
    // invalid/undefined args → undefined, the same arm)
    const ARGS = { prompt: "p" }
    const refused = tool.presentResult?.(ARGS, { meta: { model: "music3", error: "x" } })
    assert.deepEqual(refused, { card: "generic", title: "Music [music3] — REFUSED" })
    const done = tool.presentResult?.(ARGS, { meta: { model: "music3", run_id: "r2" } })
    assert.deepEqual(done, { card: "generic", title: "Music [music3] → r2" })
    assert.equal(tool.presentResult?.(ARGS, { content: {} }), undefined)
  })

  it("execute walks BOTH doors and returns the queued envelope", async () => {
    respond = () => ({ draftId: "d1" })
    // two-phase respond: drafts answers d1, start answers the run
    let phase = 0
    respond = () => { phase += 1; return phase === 1 ? { draftId: "d1" } : { run_id: "r5", status: "running" } }
    const out = await tool.execute({ model: "yue2", prompt: "p", lyrics: "l" }, undefined) as Record<string, unknown>
    assert.deepEqual(out, { flow: "music", model: "yue2", draft_id: "d1", run_id: "r5", status: "running" })
    // DOOR ONE carries the model as the stage's service + the params stanza
    assert.deepEqual(draftBody, {
      intent: "music",
      stages: [{ title: "Music", kind: "generation", service: "yue2", params: { prompt: "p", lyrics: "l" } }],
    })
    // DOOR TWO lifts params BESIDE the envelope keys + draft_id
    assert.deepEqual(startBody, { prompt: "p", lyrics: "l", model: "yue2", draft_id: "d1" })
  })

  it("execute resolves the unstated model to the card's default", async () => {
    let phase = 0
    respond = () => { phase += 1; return phase === 1 ? { draftId: "d1" } : { run_id: "r6" } }
    const out = await tool.execute({ prompt: "p" }, undefined) as Record<string, unknown>
    assert.equal(out.model, "music3")
    assert.equal(out.status, "queued")
  })

  it("refuses LOUD on a draftless draft POST", async () => {
    respond = () => ({ draftId: "" })
    const out = await tool.execute({ prompt: "p" }, undefined) as Record<string, unknown>
    assert.deepEqual(out, { flow: "music", model: "music3", error: "gateway draft POST returned no draftId" })
  })

  it("the named refusal arm (the {error} body)", async () => {
    let phase = 0
    respond = () => { phase += 1; return phase === 1 ? { draftId: "d1" } : { error: "duration out of bounds" } }
    const out = await tool.execute({ prompt: "p" }, undefined) as Record<string, unknown>
    assert.deepEqual(out, { flow: "music", model: "music3", error: "duration out of bounds" })
  })

  it("refuses on a runless start", async () => {
    let phase = 0
    respond = () => { phase += 1; return phase === 1 ? { draftId: "d1" } : { status: "queued" } }
    const out = await tool.execute({ prompt: "p" }, undefined) as Record<string, unknown>
    assert.deepEqual(out, { flow: "music", model: "music3", error: "gateway start returned no run_id" })
  })

  it("GatewayError maps to the error arm (named → body → status)", async () => {
    respond = () => { throw new GatewayError(400, "raw body text", "named refusal") }
    const out = await tool.execute({ prompt: "p" }, undefined) as Record<string, unknown>
    assert.equal(out.error, "named refusal")
    respond = () => { throw new GatewayError(500, "plain body", "") }
    const out2 = await tool.execute({ prompt: "p" }, undefined) as Record<string, unknown>
    assert.equal(out2.error, "plain body")
    respond = () => { throw new GatewayError(502, "", "") }
    const out3 = await tool.execute({ prompt: "p" }, undefined) as Record<string, unknown>
    assert.equal(out3.error, "estate 502")
  })

  it("a pre-aborted signal propagates raw (never a refusal value)", async () => {
    // jsonLane wraps LANE faults into GatewayError — the only raw
    // propagate path is the pre-abort throw BEFORE the lane dials.
    const aborted = defineCardTool(async () => { throw new Error("must not dial") }, {
      name: "music", flow: "music", label: "Music", description: "d",
      parameters: { prompt: { type: "string", required: true } } as never,
      defaultModel: "music3", previewField: "prompt",
    })
    await assert.rejects(() => aborted.execute({ prompt: "p" }, { signal: AbortSignal.abort() }))
  })

  it("declared JSON-array params normalize before both doors", async () => {
    let phase = 0
    respond = () => { phase += 1; return phase === 1 ? { draftId: "d1" } : { run_id: "r8" } }
    const unwrapping = defineCardTool(call, {
      name: "h3", flow: "h3", label: "H3", description: "d",
      parameters: {
        calls: { type: "json", required: true },
        clips: { type: "json" },
      } as never,
      defaultModel: "h3",
      jsonArrayParams: ["calls", "clips"],
      previewValue: (a) => `shots=${Array.isArray(a.calls) ? (a.calls as unknown[]).length : 0}`,
    })
    const out = await unwrapping.execute({
      calls: '[{"text":"a"}]',
      clips: '[{"src":"line.flac"}]',
    }, undefined) as Record<string, unknown>
    assert.equal(out.run_id, "r8")
    assert.deepEqual(draftBody.stages?.[0]?.params?.calls, [{ text: "a" }])
    assert.deepEqual(draftBody.stages?.[0]?.params?.clips, [{ src: "line.flac" }])
    assert.deepEqual(startBody.calls, [{ text: "a" }])
    assert.deepEqual(startBody.clips, [{ src: "line.flac" }])
  })

  it("declared JSON-array params leave native arrays and invalid JSON strings untouched", async () => {
    let phase = 0
    respond = () => { phase += 1; return phase === 1 ? { draftId: "d1" } : { run_id: "r9" } }
    const arrays = defineCardTool(call, {
      name: "h3", flow: "h3", label: "H3", description: "d",
      parameters: { calls: { type: "json", required: true }, clips: { type: "json" } } as never,
      defaultModel: "h3",
      jsonArrayParams: ["calls", "clips"],
    })
    const nativeCalls = [{ text: "native" }]
    const nativeClips = [{ src: "native.flac" }]
    await arrays.execute({ calls: nativeCalls, clips: nativeClips }, undefined)
    assert.deepEqual(startBody.calls, nativeCalls)
    assert.deepEqual(startBody.clips, nativeClips)

    phase = 0
    const objectJson = '{"text":"not an array"}'
    const malformed = '[{"src":'
    await arrays.execute({ calls: objectJson, clips: malformed }, undefined)
    assert.equal(startBody.calls, objectJson)
    assert.equal(startBody.clips, malformed)
  })

  it("normalizes declared JSON arrays without mutating the input", () => {
    const input = Object.freeze({
      calls: '[{"text":"a"}]',
      clips: '{"src":"not-an-array"}',
      native: [{ src: 'line.flac' }],
      malformed: '[{"src":',
      empty: '',
      unlisted: '[1,2]',
    })
    const out = normalizeJsonArrayParams(input, ['calls', 'clips', 'native', 'malformed', 'empty', 'absent'])
    assert.notStrictEqual(out, input)
    assert.deepEqual(out.calls, [{ text: 'a' }])
    assert.equal(out.clips, '{"src":"not-an-array"}')
    assert.deepEqual(out.native, [{ src: 'line.flac' }])
    assert.equal(out.malformed, '[{"src":')
    assert.equal(out.empty, '')
    assert.equal(Object.hasOwn(out, 'absent'), false)
    assert.equal(out.unlisted, '[1,2]')
    assert.equal(input.calls, '[{"text":"a"}]')
    assert.deepEqual(normalizeJsonArrayParams({}, undefined), {})
  })

  it("uses a custom preview projection when the card owns one", () => {
    const custom = defineCardTool(call, {
      name: "custom", flow: "custom", label: "Custom", description: "d",
      parameters: { prompt: { type: "string", required: true } } as never,
      defaultModel: "default", previewValue: (args) => `shot=${String(args.prompt)}`,
    })
    const out = custom.presentCall?.({ prompt: "hero" }) as Record<string, unknown>
    assert.equal(out.rawInput, "model=default shot=hero")
  })

  it("projection helpers use their empty-value fallbacks", () => {
    const fallback = defineCardTool(call, {
      name: "fallback", flow: "fallback", label: "Fallback", description: "d",
      parameters: { other: { type: "string" } } as never,
      defaultModel: "default", previewField: "missing",
    })
    const preview = fallback.presentCall?.({ other: "x" }) as Record<string, unknown>
    assert.equal(preview.rawInput, "model=default missing=")
    const meta = tool.output.presentationMeta?.(undefined, undefined) as Record<string, unknown>
    assert.deepEqual(meta, { flow: 'music', model: '?' })
    const fullMeta = tool.output.presentationMeta?.(undefined, {
      flow: 'music', model: 'music3', run_id: '', draft_id: 'd', status: 'queued', error: 'no',
    }) as Record<string, unknown>
    assert.deepEqual(fullMeta, { flow: 'music', model: 'music3', draft_id: 'd', status: 'queued', error: 'no' })
    const rendered = tool.output.render?.(undefined, undefined) as Array<{ text?: string }>
    assert.deepEqual(rendered, [{ type: 'text', text: 'music [?] → ? — poll with run_status' }])
    const result = tool.presentResult?.({ prompt: 'p' }, { meta: {} }) as Record<string, unknown>
    assert.deepEqual(result, { card: 'generic', title: 'Music [?] → ?' })
  })

  it('an omitted JSON-array parameter leaves the declared key absent', async () => {
    let phase = 0
    respond = () => { phase += 1; return phase === 1 ? { draftId: 'd1' } : { run_id: 'r1' } }
    const partial = defineCardTool(call, {
      name: 'partial', flow: 'partial', label: 'Partial', description: 'd',
      parameters: { calls: { type: 'json' }, clips: { type: 'json' } } as never,
      defaultModel: 'default', jsonArrayParams: ['calls', 'clips'],
    })
    const out = await partial.execute({ calls: '[]' }, undefined) as Record<string, unknown>
    assert.equal(out.run_id, 'r1')
  })

  it('non-string envelope members take the defensive refusal and success arms', async () => {
    respond = () => ({ draftId: 42 })
    const noDraft = await tool.execute({ prompt: 'p' }, undefined) as Record<string, unknown>
    assert.match(String(noDraft.error), /no draftId/)
    let phase = 0
    respond = () => { phase += 1; return phase === 1 ? { draftId: 'd1' } : { error: 7, run_id: 'r1' } }
    const started = await tool.execute({ prompt: 'p' }, undefined) as Record<string, unknown>
    assert.equal(started.run_id, 'r1')
    assert.equal(started.error, undefined)
  })
})
