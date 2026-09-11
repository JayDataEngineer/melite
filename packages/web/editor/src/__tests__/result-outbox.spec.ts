/**
 * resultOutbox — durable result-PATCH persistence.
 *
 * The stage-result PATCH used to be fire-and-forget (`void fetch().catch()`).
 * A tab close / reload / gateway blip before it landed = the generated
 * output NEVER persisted server-side = the reopened thread's action card
 * lost its output preview forever. The outbox makes the PATCH durable:
 * queued in localStorage first, retried on failure, flushed at boot.
 *
 * Pinned here:
 *  • enqueue → immediate flush → PATCH lands → queue drains
 *  • failed PATCH is RETAINED (attempts++) for the ticker/boot retry
 *  • re-run dedupes: same draft:stage queued twice → ONE entry, last body
 *  • entries older than 7 days are dropped at read (bounded growth)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

const apiFetchMock = vi.fn()
vi.mock("@melite/catalog/api", () => ({
  apiFetch: (...a: unknown[]) => apiFetchMock(...a),
}))

import {
  enqueueResultPatch,
  enqueueStagePatch,
  flushResultPatches,
  pendingResultPatches,
} from "../surfaces/flow/resultOutbox"

const BODY = {
  result: {
    assetUrls: ["/editor/runs/r1/out.png"],
    artifacts: {},
    metadata: { runId: "r1" },
    completedAt: 123456,
    durationSec: 4.2,
  },
  runStatus: "done",
}

function ok(): Response {
  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
function fail(): Response {
  return new Response("boom", { status: 503 })
}

beforeEach(() => {
  localStorage.clear()
  apiFetchMock.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("resultOutbox", () => {
  it("enqueue → immediate flush → PATCH lands → queue drains", async () => {
    apiFetchMock.mockResolvedValue(ok())
    enqueueResultPatch("draft-d1", "s1", BODY)
    await flushResultPatches()
    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = apiFetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/v1/flows/drafts/draft-d1/stages/s1")
    expect(init.method).toBe("PATCH")
    expect(JSON.parse(String(init.body))).toEqual(BODY)
    expect(pendingResultPatches()).toBe(0)
    expect(localStorage.getItem("melite:flow:outbox:v1")).toBeNull()
  })

  it("failed PATCH is retained with attempts++ — every pass retries the head once", async () => {
    apiFetchMock.mockImplementation(async () => fail())
    // Pass A (enqueue's immediate flush) fails → retained, attempts=1.
    enqueueResultPatch("draft-d1", "s1", BODY)
    // Pass B (the explicit flush call) retries the head once → attempts=2.
    await flushResultPatches()
    expect(pendingResultPatches()).toBe(1)
    const queued = JSON.parse(
      localStorage.getItem("melite:flow:outbox:v1")!,
    ) as Array<{ id: string; attempts: number }>
    expect(queued[0].attempts).toBe(2)
    expect(apiFetchMock).toHaveBeenCalledTimes(2)

    // Recovery: the server comes back → the next pass drains the queue.
    apiFetchMock.mockImplementation(async () => ok())
    await flushResultPatches()
    expect(pendingResultPatches()).toBe(0)
    expect(localStorage.getItem("melite:flow:outbox:v1")).toBeNull()
  })

  it("a 404 is a ZOMBIE, not a retry — dropped immediately, and the queue behind it still drains", async () => {
    // 2026-08-16 (live log): PATCH /v1/flows/drafts/p_bdef8fql/stages/
    // s_pvxjof5k → 404, retried every tick. The draft had been REBUILT
    // server-side with new stage ids — that (draft, stage) pair can never
    // exist again. The old contract kept it at the head forever ("stop on
    // first failure"), starving every entry behind it for the whole 7-day
    // MAX_AGE window. A 404/410 is undeliverable BY CONSTRUCTION: drop it,
    // keep delivering.
    apiFetchMock
      .mockResolvedValueOnce(new Response("gone", { status: 404 }))
      .mockResolvedValueOnce(ok())
    enqueueResultPatch("draft-z1", "s_pvxjof5k", BODY)
    enqueueResultPatch("draft-z1", "s_ux9hrf5n", BODY)
    await flushResultPatches()
    // Both passes ran: the zombie was dropped (warned, not retried), the
    // live entry behind it delivered — no head-of-line starvation.
    expect(apiFetchMock).toHaveBeenCalledTimes(2)
    expect(pendingResultPatches()).toBe(0)
    expect(localStorage.getItem("melite:flow:outbox:v1")).toBeNull()
    // And a later pass does NOT retry the zombie (it's gone, not retained).
    await flushResultPatches()
    expect(apiFetchMock).toHaveBeenCalledTimes(2)
  })

  it("concurrent flush calls SERIALIZE — one PATCH per entry (regression: double-delivery)", async () => {
    // 2026-08-14 catch: the async-body version of flushResultPatches read
    // _flushInFlight at await time — two same-tick calls both resumed off
    // the stale resolved promise and ran CONCURRENT passes, PATCHing the
    // entry twice (and attempts+=2 on failure). The synchronous chain
    // capture makes passes strictly sequential.
    apiFetchMock.mockResolvedValue(ok())
    enqueueResultPatch("draft-d1", "s1", BODY)
    const p1 = flushResultPatches()
    const p2 = flushResultPatches() // same tick as p1
    await Promise.all([p1, p2])
    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    expect(pendingResultPatches()).toBe(0)
  })

  it("a network rejection also retains the entry (no throw)", async () => {
    apiFetchMock.mockRejectedValueOnce(new Error("network died"))
    enqueueResultPatch("draft-d1", "s1", BODY)
    await expect(flushResultPatches()).resolves.toBeUndefined()
    expect(pendingResultPatches()).toBe(1)
  })

  it("re-run dedupes per draft:stage — ONE entry, LAST body wins", async () => {
    apiFetchMock.mockResolvedValue(ok())
    const first = { ...BODY, result: { ...BODY.result, completedAt: 1 } }
    const second = { ...BODY, result: { ...BODY.result, completedAt: 2 } }
    enqueueResultPatch("draft-d1", "s1", first)
    enqueueResultPatch("draft-d1", "s1", second)
    await flushResultPatches()
    // Both enqueues flushed; the second PATCH body is the one that stuck.
    const bodies = apiFetchMock.mock.calls.map(
      (c) => JSON.parse(String((c[1] as RequestInit).body)).result.completedAt,
    )
    expect(bodies[bodies.length - 1]).toBe(2)
    expect(pendingResultPatches()).toBe(0)
  })

  it("enqueueStagePatch delivers a wires-only PATCH (inputs + inputOutputs)", async () => {
    // 2026-08-22 card-wiring verdict: wires must reach the SERVER draft,
    // not just the client store. A wires-only patch carries no result —
    // the server keeps the legacy result-only contract separate.
    apiFetchMock.mockResolvedValue(ok())
    enqueueStagePatch("draft-d1", "s1", {
      inputs: ["s0", ""],
      inputOutputs: [null, "mask"],
    })
    await flushResultPatches()
    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = apiFetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/v1/flows/drafts/draft-d1/stages/s1")
    expect(init.method).toBe("PATCH")
    expect(JSON.parse(String(init.body))).toEqual({
      inputs: ["s0", ""],
      inputOutputs: [null, "mask"],
    })
    expect(pendingResultPatches()).toBe(0)
  })

  it("enqueueStagePatch MERGES with a queued result — one PATCH carries result AND wires", async () => {
    apiFetchMock.mockImplementation(async () => fail())
    enqueueResultPatch("draft-d1", "s1", BODY)
    await flushResultPatches()
    // Result still queued (failed). Now a wire edit merges in.
    enqueueStagePatch("draft-d1", "s1", { inputs: ["s0"] })
    apiFetchMock.mockImplementation(async () => ok())
    await flushResultPatches()
    // 3 passes total: result-enqueue flush (fail), explicit flush (fail),
    // stage-patch flush (ok — the MERGED body).
    expect(apiFetchMock).toHaveBeenCalledTimes(3)
    const body = JSON.parse(
      String((apiFetchMock.mock.calls[2] as [string, RequestInit])[1].body),
    )
    expect(body.result.completedAt).toBe(123456)
    expect(body.inputs).toEqual(["s0"])
    expect(pendingResultPatches()).toBe(0)
  })

  it("a re-run result enqueue PRESERVES queued params (merge, not replace)", async () => {
    apiFetchMock.mockImplementation(async () => fail())
    enqueueStagePatch("draft-d1", "s1", { params: { image1: "data:image/png;base64,AA" } })
    await flushResultPatches()
    enqueueResultPatch("draft-d1", "s1", BODY)
    apiFetchMock.mockImplementation(async () => ok())
    await flushResultPatches()
    // 2 passes now (F1 coalescing, 2026-09-01): the stage enqueue no
    // longer fires its own immediate pass (it trails by 120ms during
    // gesture bursts) — pass 1 = the explicit flush (fail, retained),
    // pass 2 = the result-enqueue flush delivering the MERGED union.
    const body = JSON.parse(
      String((apiFetchMock.mock.calls[1] as [string, RequestInit])[1].body),
    )
    expect(body.params.image1).toBe("data:image/png;base64,AA")
    expect(body.result.completedAt).toBe(123456)
  })

  it("params patches merge key-wise (an upload then a wire null both land)", async () => {
    apiFetchMock.mockResolvedValue(ok())
    enqueueStagePatch("draft-d1", "s1", { params: { image1: "data:image/png;base64,AA" } })
    enqueueStagePatch("draft-d1", "s1", { params: { image2: null } })
    await flushResultPatches()
    const body = JSON.parse(
      String((apiFetchMock.mock.calls[apiFetchMock.mock.calls.length - 1] as [string, RequestInit])[1].body),
    )
    expect(body.params).toEqual({ image1: "data:image/png;base64,AA", image2: null })
  })

  it("patches for DIFFERENT stages stay independent entries (no cross-contamination)", async () => {
    apiFetchMock.mockResolvedValue(ok())
    enqueueStagePatch("draft-d1", "s1", { inputs: ["s0"] })
    enqueueStagePatch("draft-d1", "s2", { params: { image1: "data:image/png;base64,BB" } })
    await flushResultPatches()
    expect(apiFetchMock).toHaveBeenCalledTimes(2)
    const bodies = apiFetchMock.mock.calls.map(
      (c) => JSON.parse(String((c[1] as RequestInit).body)) as Record<string, unknown>,
    )
    const s1Body = bodies.find((b) => "inputs" in b)!
    const s2Body = bodies.find((b) => "params" in b)!
    expect(s1Body.inputs).toEqual(["s0"])
    expect((s1Body as { params?: unknown }).params).toBeUndefined()
    expect(s2Body.params).toEqual({ image1: "data:image/png;base64,BB" })
    expect(pendingResultPatches()).toBe(0)
  })

  it("a wires patch merged into a FAILED (retained) entry delivers the UNION on recovery", async () => {
    // Delivery gate: every pass FAILS until the test flips the flag. This
    // makes "the entry was retained" deterministic -- the immediate flush
    // inside enqueue* cannot accidentally deliver before we merge.
    let failing = true
    apiFetchMock.mockImplementation(async () => {
      if (failing) return new Response("boom", { status: 503 })
      return ok()
    })
    enqueueResultPatch("draft-d9", "s9", BODY)
    await flushResultPatches()
    expect(pendingResultPatches()).toBe(1) // retained
    // Merge the wire arrays INTO the retained entry.
    enqueueStagePatch("draft-d9", "s9", { inputs: ["s8"], inputOutputs: [null] })
    expect(pendingResultPatches()).toBe(1) // still ONE entry, now carrying both
    failing = false
    await flushResultPatches()             // recovery -> ONE PATCH, union body
    const last = JSON.parse(
      String((apiFetchMock.mock.calls[apiFetchMock.mock.calls.length - 1] as [string, RequestInit])[1].body),
    ) as Record<string, unknown>
    expect(last.result).toBeDefined()
    expect(last.inputs).toEqual(["s8"])
    expect(last.inputOutputs).toEqual([null])
    expect(pendingResultPatches()).toBe(0)
  })

    it("entries older than 7 days are dropped at read", () => {
    const stale = Date.now() - 8 * 24 * 60 * 60 * 1000
    localStorage.setItem(
      "melite:flow:outbox:v1",
      JSON.stringify([
        { id: "d:s", draftId: "d", stageId: "s", body: BODY, enqueuedAt: stale, attempts: 5 },
      ]),
    )
    expect(pendingResultPatches()).toBe(0)
  })

  it("malformed queue payload degrades to empty (never throws)", () => {
    localStorage.setItem("melite:flow:outbox:v1", "{not json")
    expect(pendingResultPatches()).toBe(0)
  })
})
