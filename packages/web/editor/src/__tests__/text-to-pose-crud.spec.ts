/**
 * Unit tests for lib/text-to-pose.ts — the CRUD / cache / models / registry /
 * examples / BVH export surface that the existing text-to-pose-lib.spec.ts
 * does NOT reach.
 *
 * text-to-pose-lib.spec.ts already covers: pickFrame, formatBytes,
 * encodeBufferToB64, sliceFrameAsB64, submitTextToPose, pollJob, waitForJob,
 * cancelJob. This file fills the remaining gap: every small fetch-wrapper
 * that component tests mock away wholesale.
 *
 * Mocks ONLY apiFetch (the network choke point). Every test exercises the
 * real module so a regression in URL shape, error-message format, or the
 * 404-idempotent DELETE rule surfaces here, not as a flaky E2E.
 *
 * Coverage:
 *   - Cache: listPoseCache (happy/error), deletePoseCacheEntry
 *     (happy/404-idempotent/error), clearPoseCache (returns cleared count).
 *   - Models + registry: listModels, listRegistry (happy/error).
 *   - Examples: listExamples (with + without model query), loadExample
 *     (loadGt toggle).
 *   - Constraints CRUD: listConstraints (body.entries ?? []), saveConstraints
 *     (body.error preferred), loadConstraints (returns body.constraints),
 *     deleteConstraints (404-idempotent).
 *   - Scenes CRUD: listScenes (body.entries ?? []), saveScene, loadScene
 *     (returns body.scene), deleteScene (404-idempotent).
 *   - BVH export: exportBVH happy + error (body.error preferred).
 *
 * Zero prior coverage of these functions.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@melite/catalog/api", () => ({ apiFetch: vi.fn() }))

import { apiFetch } from "@melite/catalog"
import {
  listPoseCache, deletePoseCacheEntry, clearPoseCache,
  listModels, listRegistry,
  listExamples, loadExample,
  listConstraints, saveConstraints, loadConstraints, deleteConstraints,
  listScenes, saveScene, loadScene, deleteScene,
  exportBVH,
} from "@melite/catalog"

// ── Helpers ─────────────────────────────────────────────────────────────────
function mkJsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset()
})

// ── Cache ───────────────────────────────────────────────────────────────────
describe("text-to-pose CRUD — cache", () => {
  it("listPoseCache returns the parsed body on 200", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkJsonRes({ entries: [{ hash: "abc", size: 1024 }] }),
    )
    const out = await listPoseCache()
    expect(out.entries[0].hash).toBe("abc")
    expect(apiFetch).toHaveBeenCalledWith("/poser/text-to-pose/cache")
  })
  it("listPoseCache throws on non-2xx with the status code", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 500))
    await expect(listPoseCache()).rejects.toThrow(/500/)
  })
  it("deletePoseCacheEntry issues DELETE and resolves void on 200", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 200))
    await expect(deletePoseCacheEntry("abc")).resolves.toBeUndefined()
    expect(apiFetch).toHaveBeenCalledWith("/poser/text-to-pose/cache/abc", { method: "DELETE" })
  })
  it("deletePoseCacheEntry is 404-idempotent (no throw on Not Found)", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 404))
    await expect(deletePoseCacheEntry("gone")).resolves.toBeUndefined()
  })
  it("deletePoseCacheEntry throws on non-404 error", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 500))
    await expect(deletePoseCacheEntry("abc")).rejects.toThrow(/500/)
  })
  it("clearPoseCache returns the cleared count from the body", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({ cleared: 7 }))
    const out = await clearPoseCache()
    expect(out).toBe(7)
    expect(apiFetch).toHaveBeenCalledWith("/poser/text-to-pose/cache/clear", { method: "POST" })
  })
  it("clearPoseCache throws on non-2xx", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 503))
    await expect(clearPoseCache()).rejects.toThrow(/503/)
  })
})

// ── Models + registry ───────────────────────────────────────────────────────
describe("text-to-pose CRUD — models + registry", () => {
  it("listModels returns the parsed body on 200", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkJsonRes({ models: [{ id: "soma-rp", label: "Soma", local: true, is_default: true }], default: "soma-rp" }),
    )
    const out = await listModels()
    expect(out.models).toHaveLength(1)
    expect(out.default).toBe("soma-rp")
    expect(apiFetch).toHaveBeenCalledWith("/poser/text-to-pose/models")
  })
  it("listModels throws on non-2xx", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 500))
    await expect(listModels()).rejects.toThrow(/Models list failed.*500/)
  })
  it("listRegistry returns the parsed tree on 200", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkJsonRes({
        datasets: ["humanoid"],
        tree: { humanoid: { skeletons: [{ label: "SOMA", key: "soma77", versions: [] }] } },
        default_dataset: "humanoid",
        default_skeleton: "soma77",
        default_version: "v1",
      }),
    )
    const out = await listRegistry()
    expect(out.datasets).toEqual(["humanoid"])
    expect(out.default_version).toBe("v1")
    expect(apiFetch).toHaveBeenCalledWith("/poser/text-to-pose/registry")
  })
  it("listRegistry throws on non-2xx", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 404))
    await expect(listRegistry()).rejects.toThrow(/Registry fetch failed.*404/)
  })
})

// ── Examples ────────────────────────────────────────────────────────────────
describe("text-to-pose CRUD — examples", () => {
  it("listExamples without model omits the query param", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({ examples: [] }))
    await listExamples()
    const url = vi.mocked(apiFetch).mock.calls[0][0] as string
    expect(url).not.toContain("model=")
  })
  it("listExamples with model appends ?model=<model>", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkJsonRes({ examples: [{ id: "ex1", name: "Walk", model: "soma-rp", has_motion: true, has_constraints: false, meta: {} }] }),
    )
    const out = await listExamples("soma-rp")
    const url = vi.mocked(apiFetch).mock.calls[0][0] as string
    expect(url).toContain("model=soma-rp")
    expect(out.examples[0].id).toBe("ex1")
  })
  it("listExamples throws on non-2xx", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 500))
    await expect(listExamples()).rejects.toThrow(/Examples list failed.*500/)
  })
  it("loadExample builds /examples/<model>/<id> and omits load_gt by default", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkJsonRes({ id: "ex1", model: "soma-rp", meta: { duration: 5 } }),
    )
    await loadExample("soma-rp", "ex1")
    const url = vi.mocked(apiFetch).mock.calls[0][0] as string
    expect(url).toContain("/poser/text-to-pose/examples/soma-rp/ex1")
    expect(url).not.toContain("load_gt=")
  })
  it("loadExample with loadGt=true appends ?load_gt=true", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkJsonRes({ id: "ex1", model: "soma-rp", meta: {} }),
    )
    await loadExample("soma-rp", "ex1", true)
    const url = vi.mocked(apiFetch).mock.calls[0][0] as string
    expect(url).toContain("load_gt=true")
  })
  it("loadExample throws on non-2xx", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 404))
    await expect(loadExample("soma-rp", "missing")).rejects.toThrow(/Example load failed.*404/)
  })
})

// ── Constraints CRUD ────────────────────────────────────────────────────────
describe("text-to-pose CRUD — constraints", () => {
  it("listConstraints returns body.entries (or [] when missing)", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkJsonRes({ entries: [{ name: "pin", filename: "pin.json", saved_at: 123 }] }),
    )
    const out = await listConstraints()
    expect(out).toHaveLength(1)
    expect(out[0].filename).toBe("pin.json")
  })
  it("listConstraints returns [] when body.entries is absent", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}))
    expect(await listConstraints()).toEqual([])
  })
  it("listConstraints throws on non-2xx", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 500))
    await expect(listConstraints()).rejects.toThrow(/Constraints list failed.*500/)
  })
  it("saveConstraints POSTs {name, constraints} and resolves void on 200", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 200))
    await saveConstraints("my-pin", { keyframes: [] })
    const [url, init] = vi.mocked(apiFetch).mock.calls[0]
    expect(url).toBe("/poser/text-to-pose/constraints/save")
    expect(init?.method).toBe("POST")
    const body = JSON.parse(init?.body as string)
    expect(body.name).toBe("my-pin")
    expect(body.constraints).toEqual({ keyframes: [] })
  })
  it("saveConstraints prefers body.error on failure over generic status message", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkJsonRes({ error: "name already exists" }, 409),
    )
    await expect(saveConstraints("dup", {})).rejects.toThrow(/name already exists/)
  })
  it("saveConstraints falls back to status when body.error absent", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 500))
    await expect(saveConstraints("x", {})).rejects.toThrow(/Save failed.*500/)
  })
  it("loadConstraints returns body.constraints", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkJsonRes({ constraints: { keyframes: [{ frame: 0 }] } }),
    )
    const out = await loadConstraints("pin.json")
    expect(out).toEqual({ keyframes: [{ frame: 0 }] })
  })
  it("loadConstraints throws on non-2xx", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 404))
    await expect(loadConstraints("missing.json")).rejects.toThrow(/Load failed.*404/)
  })
  it("deleteConstraints issues DELETE and is 404-idempotent", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 404))
    await expect(deleteConstraints("gone.json")).resolves.toBeUndefined()
    const [url, init] = vi.mocked(apiFetch).mock.calls[0]
    expect(url).toBe("/poser/text-to-pose/constraints/gone.json")
    expect(init?.method).toBe("DELETE")
  })
  it("deleteConstraints throws on non-404 error", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 500))
    await expect(deleteConstraints("x.json")).rejects.toThrow(/Delete failed.*500/)
  })
})

// ── Scenes CRUD ─────────────────────────────────────────────────────────────
describe("text-to-pose CRUD — scenes", () => {
  it("listScenes returns body.entries (or [] when missing)", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkJsonRes({ entries: [{ name: "scene1", filename: "scene1.json", saved_at: 456 }] }),
    )
    const out = await listScenes()
    expect(out[0].name).toBe("scene1")
  })
  it("listScenes returns [] when body.entries is absent", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}))
    expect(await listScenes()).toEqual([])
  })
  it("listScenes throws on non-2xx", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 500))
    await expect(listScenes()).rejects.toThrow(/Scenes list failed.*500/)
  })
  it("saveScene POSTs {name, scene} and resolves void on 200", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 200))
    await saveScene("scene-a", { identity: "soma" })
    const [url, init] = vi.mocked(apiFetch).mock.calls[0]
    expect(url).toBe("/poser/text-to-pose/scenes/save")
    expect(init?.method).toBe("POST")
    const body = JSON.parse(init?.body as string)
    expect(body.name).toBe("scene-a")
    expect(body.scene).toEqual({ identity: "soma" })
  })
  it("saveScene prefers body.error on failure", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkJsonRes({ error: "disk full" }, 500),
    )
    await expect(saveScene("x", {})).rejects.toThrow(/disk full/)
  })
  it("loadScene returns body.scene", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkJsonRes({ scene: { identity: "soma", params: { seed: 42 } } }),
    )
    const out = await loadScene("scene1.json")
    expect(out).toEqual({ identity: "soma", params: { seed: 42 } })
  })
  it("loadScene throws on non-2xx", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 404))
    await expect(loadScene("missing.json")).rejects.toThrow(/Load failed.*404/)
  })
  it("deleteScene issues DELETE and is 404-idempotent", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 404))
    await expect(deleteScene("gone.json")).resolves.toBeUndefined()
    const [url, init] = vi.mocked(apiFetch).mock.calls[0]
    expect(url).toBe("/poser/text-to-pose/scenes/gone.json")
    expect(init?.method).toBe("DELETE")
  })
  it("deleteScene throws on non-404 error", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 500))
    await expect(deleteScene("x.json")).rejects.toThrow(/Delete failed.*500/)
  })
})

// ── BVH export ──────────────────────────────────────────────────────────────
describe("text-to-pose CRUD — BVH export", () => {
  it("exportBVH POSTs the SOMA-77 + rotmat frames and returns the bvh payload", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkJsonRes({ bvh: "HIERARCHY\n...", frames: 10, joints: 77 }),
    )
    const out = await exportBVH([[[0, 0, 0]]], [[[[1, 0, 0, 0]]]], 30)
    expect(out.bvh).toContain("HIERARCHY")
    expect(out.frames).toBe(10)
    const [url, init] = vi.mocked(apiFetch).mock.calls[0]
    expect(url).toBe("/poser/text-to-pose/export/bvh")
    expect(init?.method).toBe("POST")
    const body = JSON.parse(init?.body as string)
    expect(body.fps).toBe(30)
    expect(body.frames_soma77_3d).toEqual([[[0, 0, 0]]])
  })
  it("exportBVH prefers body.error on failure", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkJsonRes({ error: "rotmat shape mismatch" }, 422),
    )
    await expect(exportBVH([], [], 30)).rejects.toThrow(/rotmat shape mismatch/)
  })
  it("exportBVH falls back to status code when body.error absent", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkJsonRes({}, 500))
    await expect(exportBVH([], [], 30)).rejects.toThrow(/BVH export failed.*500/)
  })
})
