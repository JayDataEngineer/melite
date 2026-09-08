/**
 * tagMap server sync — initTagSync + the debounced PUT gate.
 *
 * THE CONTRACT: the server is canonical (GET hydrates on mount), localStorage
 * is a write-through cache, and server pushes are GATED (no PUTs until
 * initTagSync arms the flag). Tests use vi.resetModules + dynamic import so
 * each test starts with a FRESH module (gate off, empty store) — the gate is
 * module-level state that can't be reset any other way.
 *
 * apiFetch is mocked throughout — no live server. The mock returns a
 * Response-shaped { ok, json } object.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

vi.mock("@melite/catalog/api", () => ({
  // Each vi.resetModules() re-runs this factory → a fresh vi.fn() per test.
  apiFetch: vi.fn(),
}))

function mockLocalStorage() {
  let store: Record<string, string> = {}
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v },
      removeItem: (k: string) => { delete store[k] },
      clear: () => { store = {} },
    },
    writable: true,
    configurable: true,
  })
}

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response
}

beforeEach(() => {
  mockLocalStorage()
  vi.resetModules()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

// ── initTagSync — hydration ───────────────────────────────────────────────

describe("initTagSync — hydrate from GET /v1/tags", () => {
  it("replaces store state with the server document", async () => {
    const { apiFetch } = await import("@melite/catalog/api")
    const { useTagMap, initTagSync } = await import("@melite/catalog")
    vi.mocked(apiFetch).mockResolvedValue(
      jsonResponse({
        tags: { portrait: { id: "portrait", name: "Portrait", color: "violet" } },
        map: { "img-1": ["portrait"] },
      }),
    )
    await initTagSync()
    expect(useTagMap.getState().tags.portrait.name).toBe("Portrait")
    expect(useTagMap.getState().map["img-1"]).toEqual(["portrait"])
  })

  it("validates the server payload at the boundary (drops unknown color)", async () => {
    const { apiFetch } = await import("@melite/catalog/api")
    const { useTagMap, initTagSync } = await import("@melite/catalog")
    vi.mocked(apiFetch).mockResolvedValue(
      jsonResponse({
        tags: {
          good: { id: "good", name: "Good", color: "sky" },
          bad: { id: "bad", name: "Bad", color: "purple" }, // rejected
        },
        map: { "img-1": ["good", "bad"] }, // 'bad' pruned from the map too
      }),
    )
    await initTagSync()
    expect(Object.keys(useTagMap.getState().tags)).toEqual(["good"])
    expect(useTagMap.getState().map["img-1"]).toEqual(["good"])
  })

  it("falls back to the localStorage cache on fetch failure (offline)", async () => {
    const { apiFetch } = await import("@melite/catalog/api")
    // Seed the cache BEFORE the module import — loadPersisted() runs at
    // module init and reads localStorage synchronously; seeding after the
    // import would never reach the already-created store.
    localStorage.setItem(
      "melite:tag-map:v1",
      JSON.stringify({
        tags: { cached: { id: "cached", name: "Cached", color: "sky" } },
        map: {},
      }),
    )
    const { useTagMap, initTagSync } = await import("@melite/catalog")
    vi.mocked(apiFetch).mockRejectedValue(new Error("ECONNREFUSED"))
    await initTagSync()
    // Cache survives; server push stays disabled (silent offline mode).
    expect(useTagMap.getState().tags.cached.name).toBe("Cached")
  })

  it("falls back silently on a non-ok response", async () => {
    const { apiFetch } = await import("@melite/catalog/api")
    const { useTagMap, initTagSync } = await import("@melite/catalog")
    vi.mocked(apiFetch).mockResolvedValue(jsonResponse({ error: "down" }, false))
    await initTagSync()
    expect(Object.keys(useTagMap.getState().tags)).toHaveLength(0)
  })

  it("is idempotent (second call is a no-op)", async () => {
    const { apiFetch } = await import("@melite/catalog/api")
    const { initTagSync } = await import("@melite/catalog")
    vi.mocked(apiFetch).mockResolvedValue(jsonResponse({ tags: {}, map: {} }))
    await initTagSync()
    await initTagSync()
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
})

// ── The gate — server push only after initTagSync ─────────────────────────

describe("server push gate (debounced PUT)", () => {
  it("does NOT PUT before initTagSync (the gate holds)", async () => {
    const { apiFetch } = await import("@melite/catalog/api")
    const { useTagMap } = await import("@melite/catalog")
    vi.mocked(apiFetch).mockResolvedValue(jsonResponse({ ok: true }))
    useTagMap.getState().createTag("Portrait")
    vi.useFakeTimers()
    await vi.advanceTimersByTimeAsync(2000)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it("PUTs the full document after initTagSync (debounced 500ms)", async () => {
    const { apiFetch } = await import("@melite/catalog/api")
    const { useTagMap, initTagSync } = await import("@melite/catalog")
    vi.mocked(apiFetch).mockResolvedValue(jsonResponse({ tags: {}, map: {} }))
    await initTagSync()
    vi.mocked(apiFetch).mockClear()

    vi.useFakeTimers()
    useTagMap.getState().createTag("Portrait")
    expect(apiFetch).not.toHaveBeenCalled() // before the debounce fires

    await vi.advanceTimersByTimeAsync(600)
    expect(apiFetch).toHaveBeenCalledWith(
      "/v1/tags",
      expect.objectContaining({ method: "PUT" }),
    )
    const body = JSON.parse(vi.mocked(apiFetch).mock.calls[0][1]!.body as string)
    expect(body.tags.portrait).toBeDefined()
    expect(body.tags.portrait.color).toBe("brand") // first color in the cycle
  })

  it("coalesces rapid mutations into one PUT", async () => {
    const { apiFetch } = await import("@melite/catalog/api")
    const { useTagMap, initTagSync } = await import("@melite/catalog")
    vi.mocked(apiFetch).mockResolvedValue(jsonResponse({ tags: {}, map: {} }))
    await initTagSync()
    vi.mocked(apiFetch).mockClear()

    vi.useFakeTimers()
    useTagMap.getState().createTag("A")
    useTagMap.getState().createTag("B")
    useTagMap.getState().createTag("C")
    await vi.advanceTimersByTimeAsync(1000)

    const putCalls = vi
      .mocked(apiFetch)
      .mock.calls.filter((c) => c[1]?.method === "PUT")
    expect(putCalls).toHaveLength(1) // coalesced — one PUT carries all three
    const body = JSON.parse(putCalls[0][1]!.body as string)
    expect(Object.keys(body.tags).sort()).toEqual(["a", "b", "c"])
  })

  it("writes localStorage synchronously even before initTagSync (cache freshness)", async () => {
    const { useTagMap } = await import("@melite/catalog")
    useTagMap.getState().createTag("Portrait")
    // The cache is written synchronously on every mutation, regardless of the
    // gate. So an offline-first session never loses data.
    const raw = localStorage.getItem("melite:tag-map:v1")
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!).tags.portrait).toBeDefined()
  })

  it("swallows PUT failure (local state stays valid)", async () => {
    const { apiFetch } = await import("@melite/catalog/api")
    const { useTagMap, initTagSync } = await import("@melite/catalog")
    vi.mocked(apiFetch).mockResolvedValue(jsonResponse({ tags: {}, map: {} }))
    await initTagSync()
    vi.mocked(apiFetch).mockRejectedValue(new Error("422"))

    vi.useFakeTimers()
    useTagMap.getState().createTag("Portrait")
    await vi.advanceTimersByTimeAsync(1000)
    // The local state keeps the tag despite the PUT failure. The mutation was
    // optimistic; the failed sync is retried on the next mutation.
    expect(useTagMap.getState().tags.portrait).toBeDefined()
  })
})
