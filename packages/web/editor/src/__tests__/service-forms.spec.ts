/**
 * Unit tests for lib/serviceForms.ts — the form-tag vocabulary loader +
 * selector layer driving every render decision in GenerateFormBody.
 *
 * Architecture note: the convenience predicates (isTtsForm, isVoiceForm, ...)
 * do NOT accept a `forms` argument — they close over the module-level _cache.
 * formForSidebarKey and isAudioForm DO accept an explicit forms table. So:
 *   - The explicit-forms selectors are tested as pure fns (static import).
 *   - The cache-closing predicates + loadForms caching are tested via dynamic
 *     imports + vi.resetModules() so each group gets a fresh _cache/_inflight.
 *
 * Zero prior coverage. The isAudioForm predicate powers which sidebar icon +
 * form body renders; a regression in its tag list would mis-classify every
 * new audio surface.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  formForSidebarKey, isAudioForm, getCachedForms,
} from "@melite/catalog"
import type { FormsData } from "@melite/catalog"

const FORMS: FormsData = {
  form_tts: { sidebar_key: "tts_speak", label: "TTS", genre: "audio" },
  form_voice: { sidebar_key: "voice_creator", label: "Voice", genre: "audio" },
  form_voice_studio: { sidebar_key: "voice_studio", label: "VoiceID", genre: "audio" },
  form_music: { sidebar_key: "generate_music", label: "Music", genre: "audio" },
  form_sound: { sidebar_key: "generate_sound", label: "Sound", genre: "audio" },
  form_generate: { sidebar_key: "generate", label: "Generate", genre: "image" },
  form_edit: { sidebar_key: "edit", label: "Edit", genre: "image" },
}

function mkRes(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "Content-Type": "application/json" } })
}

// ════════════════════════════════════════════════════════════════════════════
// Pure selectors — explicit forms table, no module state
// ════════════════════════════════════════════════════════════════════════════
describe("serviceForms — formForSidebarKey (reverse lookup, explicit forms)", () => {
  it("returns the form-tag for a known sidebar_key", () => {
    expect(formForSidebarKey("tts_speak", FORMS)).toBe("form_tts")
    expect(formForSidebarKey("generate", FORMS)).toBe("form_generate")
  })
  it("returns undefined for an unknown sidebar_key", () => {
    expect(formForSidebarKey("nope", FORMS)).toBeUndefined()
  })
  it("returns undefined for an empty forms table", () => {
    expect(formForSidebarKey("tts_speak", {})).toBeUndefined()
  })
})

describe("serviceForms — isAudioForm (explicit forms)", () => {
  it("returns true for every audio sidebar_key", () => {
    for (const k of ["tts_speak", "voice_creator", "voice_studio", "generate_music", "generate_sound"]) {
      expect(isAudioForm(k, FORMS)).toBe(true)
    }
  })
  it("returns false for image-genre keys", () => {
    expect(isAudioForm("generate", FORMS)).toBe(false)
    expect(isAudioForm("edit", FORMS)).toBe(false)
  })
  it("returns false for an unknown key", () => {
    expect(isAudioForm("unknown", FORMS)).toBe(false)
  })
})

describe("serviceForms — getCachedForms (cold cache, no fetch yet)", () => {
  it("returns {} before any loadForms has run in this module instance", () => {
    expect(getCachedForms()).toEqual({})
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Cache-closing predicates + loadForms — dynamic import + resetModules
// ════════════════════════════════════════════════════════════════════════════
describe("serviceForms — convenience predicates (via populated _cache)", () => {
  let preds: typeof import("@melite/catalog")

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn().mockResolvedValue(
      mkRes(JSON.stringify({ forms: FORMS }))) }))
    preds = await import("@melite/catalog")
    await preds.loadForms() // populate _cache with FORMS
  })

  it("isTtsForm matches only the form_tts sidebar_key", () => {
    expect(preds.isTtsForm("tts_speak")).toBe(true)
    expect(preds.isTtsForm("voice_creator")).toBe(false)
  })
  it("isVoiceForm / isVoiceStudioForm / isMusicForm / isGenerateForm / isEditForm each match their own key", () => {
    expect(preds.isVoiceForm("voice_creator")).toBe(true)
    expect(preds.isVoiceStudioForm("voice_studio")).toBe(true)
    expect(preds.isMusicForm("generate_music")).toBe(true)
    expect(preds.isGenerateForm("generate")).toBe(true)
    expect(preds.isEditForm("edit")).toBe(true)
  })
  it("the predicates are mutually exclusive for distinct surfaces (exactly one hit each)", () => {
    const keys = ["tts_speak", "voice_creator", "voice_studio", "generate_music", "generate", "edit"]
    for (const k of keys) {
      const hits = [
        preds.isTtsForm(k), preds.isVoiceForm(k), preds.isVoiceStudioForm(k),
        preds.isMusicForm(k), preds.isGenerateForm(k), preds.isEditForm(k),
      ].filter(Boolean).length
      expect(hits).toBe(1)
    }
  })
  it("predicates return false for an unknown key (empty cache miss)", () => {
    expect(preds.isTtsForm("unknown")).toBe(false)
    expect(preds.isGenerateForm("unknown")).toBe(false)
  })
  it("predicates return false for every key when _cache is empty (no surface loaded)", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn() }))
    const cold = await import("@melite/catalog")
    expect(cold.isTtsForm("tts_speak")).toBe(false)
    expect(cold.isGenerateForm("generate")).toBe(false)
  })
})

describe("serviceForms — loadForms caching & inflight", () => {
  let loadForms: typeof import("@melite/catalog").loadForms
  let apiFetch: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn() }))
    const api = await import("@melite/catalog/api")
    apiFetch = api.apiFetch as unknown as ReturnType<typeof vi.fn>
    const mod = await import("@melite/catalog")
    loadForms = mod.loadForms
  })

  it("fetches /v1/forms and caches data.forms", async () => {
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: { form_tts: { sidebar_key: "tts_speak" } } })))
    const out = await loadForms()
    expect(out).toEqual({ form_tts: { sidebar_key: "tts_speak" } })
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
  it("returns the cached value on a second call WITHOUT refetching (non-empty cache)", async () => {
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: { form_x: { sidebar_key: "x" } } })))
    await loadForms()
    await loadForms() // cache hit
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
  it("dedupes concurrent calls via _inflight (one fetch for two parallel callers)", async () => {
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: { form_y: { sidebar_key: "y" } } })))
    const [a, b] = await Promise.all([loadForms(), loadForms()])
    expect(a).toEqual(b)
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
  it("force:true bypasses the cache and refetches", async () => {
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: { form_a: { sidebar_key: "a" } } })))
    await loadForms()
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: { form_b: { sidebar_key: "b" } } })))
    const out = await loadForms({ force: true })
    expect(out).toEqual({ form_b: { sidebar_key: "b" } })
    expect(apiFetch).toHaveBeenCalledTimes(2)
  })
  it("returns the existing cache on a non-OK response (no clobber)", async () => {
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: { form_first: { sidebar_key: "f" } } })))
    await loadForms()
    apiFetch.mockResolvedValueOnce(mkRes("down", 503))
    const out = await loadForms({ force: true })
    expect(out).toEqual({ form_first: { sidebar_key: "f" } })
  })
  it("returns the existing cache when apiFetch throws (network error)", async () => {
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: { form_keep: { sidebar_key: "k" } } })))
    await loadForms()
    apiFetch.mockRejectedValueOnce(new Error("network"))
    const out = await loadForms({ force: true })
    expect(out).toEqual({ form_keep: { sidebar_key: "k" } })
  })
  it("clears _inflight after success (a later call hits cache, not the inflight branch)", async () => {
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: { form_z: { sidebar_key: "z" } } })))
    await loadForms()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    await loadForms() // cache hit (non-empty) — no fetch
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
  it("treats an empty data.forms as a still-cold cache (the guard keys on Object.keys length > 0)", async () => {
    // An empty-forms response leaves _cache empty → the next call refetches.
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: {} })))
    await loadForms()
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: { form_late: { sidebar_key: "l" } } })))
    const out = await loadForms()
    expect(out).toEqual({ form_late: { sidebar_key: "l" } })
    expect(apiFetch).toHaveBeenCalledTimes(2)
  })
})

describe("serviceForms — subscribeForms", () => {
  it("fires the listener when loadForms succeeds, and the unsubscribe stops notifications", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn().mockResolvedValue(
      mkRes(JSON.stringify({ forms: { form_x: {} } }))) }))
    const { loadForms, subscribeForms, getCachedForms } = await import("@melite/catalog")
    const listener = vi.fn()
    const unsub = subscribeForms(listener)
    await loadForms()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(Object.keys(getCachedForms())).toEqual(["form_x"])
    unsub()
    const { apiFetch } = await import("@melite/catalog/api")
    ;(apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mkRes(JSON.stringify({ forms: { form_y: {} } })))
    await loadForms({ force: true })
    expect(listener).toHaveBeenCalledTimes(1) // still 1 after unsubscribe
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Additional subscribeForms + notify edges
// ════════════════════════════════════════════════════════════════════════════
describe("serviceForms — subscribeForms additional edges", () => {
  it("a listener that throws is caught; other listeners still fire (try/catch in loop)", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn().mockResolvedValue(
      mkRes(JSON.stringify({ forms: { form_a: {} } }))) }))
    const { loadForms, subscribeForms } = await import("@melite/catalog")
    const good = vi.fn()
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    subscribeForms(() => { throw new Error("listener boom") })
    subscribeForms(good)
    await loadForms()
    // The throwing listener was caught (warn logged); good still fired.
    expect(good).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/listener error/i), expect.any(Error))
    warnSpy.mockRestore()
  })
  it("multiple listeners all fire on a successful load", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn().mockResolvedValue(
      mkRes(JSON.stringify({ forms: { form_a: {} } }))) }))
    const { loadForms, subscribeForms } = await import("@melite/catalog")
    const a = vi.fn(), b = vi.fn(), c = vi.fn()
    subscribeForms(a)
    subscribeForms(b)
    subscribeForms(c)
    await loadForms()
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
    expect(c).toHaveBeenCalledTimes(1)
  })
  it("subscribeForms with the same function twice → Set dedups to one notification", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn().mockResolvedValue(
      mkRes(JSON.stringify({ forms: { form_a: {} } }))) }))
    const { loadForms, subscribeForms } = await import("@melite/catalog")
    const fn = vi.fn()
    subscribeForms(fn)
    subscribeForms(fn) // same ref → Set ignores the duplicate
    await loadForms()
    expect(fn).toHaveBeenCalledTimes(1)
  })
  it("unsubscribe is idempotent — calling it twice doesn't throw", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn() }))
    const { subscribeForms } = await import("@melite/catalog")
    const fn = vi.fn()
    const unsub = subscribeForms(fn)
    unsub()
    expect(() => unsub()).not.toThrow()
  })
  it("loadForms does NOT notify on a failed fetch (catch returns _cache without notify)", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn().mockRejectedValue(new Error("net")) }))
    const { loadForms, subscribeForms } = await import("@melite/catalog")
    const listener = vi.fn()
    subscribeForms(listener)
    await loadForms()
    expect(listener).not.toHaveBeenCalled()
  })
  it("loadForms does NOT notify on a non-OK response (warn + return _cache without notify)", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn().mockResolvedValue(mkRes("down", 503)) }))
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { loadForms, subscribeForms } = await import("@melite/catalog")
    const listener = vi.fn()
    subscribeForms(listener)
    await loadForms()
    expect(listener).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/\/v1\/forms failed/i), 503)
    warnSpy.mockRestore()
  })
  it("a listener subscribed AFTER loadForms already ran does NOT fire on retro-load", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn().mockResolvedValue(
      mkRes(JSON.stringify({ forms: { form_a: {} } }))) }))
    const { loadForms, subscribeForms } = await import("@melite/catalog")
    await loadForms() // load first
    const lateListener = vi.fn()
    subscribeForms(lateListener)
    // No re-load → lateListener doesn't fire (it missed the notify).
    expect(lateListener).not.toHaveBeenCalled()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// formForSidebarKey + isAudioForm — default _cache param
// ════════════════════════════════════════════════════════════════════════════
describe("serviceForms — default _cache param", () => {
  it("formForSidebarKey uses the module-level _cache when no forms arg is passed", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn().mockResolvedValue(
      mkRes(JSON.stringify({ forms: { form_tts: { sidebar_key: "tts_speak" } } }))) }))
    const { loadForms, formForSidebarKey } = await import("@melite/catalog")
    await loadForms()
    expect(formForSidebarKey("tts_speak")).toBe("form_tts")
  })
  it("formForSidebarKey returns undefined on a cold cache (no loadForms yet)", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn() }))
    const { formForSidebarKey } = await import("@melite/catalog")
    expect(formForSidebarKey("tts_speak")).toBeUndefined()
  })
  it("isAudioForm uses the module-level _cache when no forms arg is passed", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn().mockResolvedValue(
      mkRes(JSON.stringify({ forms: { form_tts: { sidebar_key: "tts_speak" } } }))) }))
    const { loadForms, isAudioForm } = await import("@melite/catalog")
    await loadForms()
    expect(isAudioForm("tts_speak")).toBe(true)
  })
  it("isAudioForm returns false on a cold cache (no loadForms yet)", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn() }))
    const { isAudioForm } = await import("@melite/catalog")
    expect(isAudioForm("tts_speak")).toBe(false)
  })
  it("explicit forms arg OVERRIDES the module-level _cache", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn().mockResolvedValue(
      mkRes(JSON.stringify({ forms: { form_real: { sidebar_key: "real" } } }))) }))
    const { loadForms, formForSidebarKey } = await import("@melite/catalog")
    await loadForms()
    // Module cache has "real", but explicit arg has "override" — the arg wins.
    expect(formForSidebarKey("override", { form_x: { sidebar_key: "override" } })).toBe("form_x")
    expect(formForSidebarKey("real", { form_x: { sidebar_key: "override" } })).toBeUndefined()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// formForSidebarKey — first-match-wins + missing sidebar_key
// ════════════════════════════════════════════════════════════════════════════
describe("serviceForms — formForSidebarKey first-match + edges", () => {
  it("returns the FIRST form-tag when two tags share the same sidebar_key", () => {
    const forms: FormsData = {
      form_first: { sidebar_key: "dup" },
      form_second: { sidebar_key: "dup" },
    }
    // Object.entries order: insertion order for string keys → form_first first.
    expect(formForSidebarKey("dup", forms)).toBe("form_first")
  })
  it("returns undefined when entries have no sidebar_key field", () => {
    const forms: FormsData = {
      form_a: { label: "no key" },
      form_b: {},
    }
    expect(formForSidebarKey("tts_speak", forms)).toBeUndefined()
  })
  it("entry with empty-string sidebar_key only matches an empty-string lookup", () => {
    const forms: FormsData = { form_a: { sidebar_key: "" } }
    expect(formForSidebarKey("", forms)).toBe("form_a")
    expect(formForSidebarKey("tts_speak", forms)).toBeUndefined()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// isAudioForm — all audio keys + composition
// ════════════════════════════════════════════════════════════════════════════
describe("serviceForms — isAudioForm exhaustive", () => {
  it("returns true for every one of the 5 audio genre form-tags", () => {
    const forms: FormsData = {
      form_tts: { sidebar_key: "tts_speak", genre: "audio" },
      form_voice: { sidebar_key: "voice_creator", genre: "audio" },
      form_voice_studio: { sidebar_key: "voice_studio", genre: "audio" },
      form_music: { sidebar_key: "generate_music", genre: "audio" },
      form_sound: { sidebar_key: "generate_sound", genre: "audio" },
    }
    const audioKeys = ["tts_speak", "voice_creator", "voice_studio", "generate_music", "generate_sound"]
    for (const k of audioKeys) {
      expect(isAudioForm(k, forms), `expected '${k}' to be audio`).toBe(true)
    }
  })
  it("returns false for a video-genre key when present in the table", () => {
    const forms: FormsData = {
      form_video: { sidebar_key: "generate_video", genre: "video" },
    }
    expect(isAudioForm("generate_video", forms)).toBe(false)
  })
  it("returns false for a three-d genre key (form_3d)", () => {
    const forms: FormsData = {
      form_3d: { sidebar_key: "generate_3d", genre: "3d" },
    }
    expect(isAudioForm("generate_3d", forms)).toBe(false)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// loadForms — data.forms null/missing shapes
// ════════════════════════════════════════════════════════════════════════════
describe("serviceForms — loadForms data.forms shapes", () => {
  it("data.forms null → ?? {} → empty cache → next call refetches", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn() }))
    const api = await import("@melite/catalog/api")
    const apiFetch = api.apiFetch as unknown as ReturnType<typeof vi.fn>
    const { loadForms } = await import("@melite/catalog")
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: null })))
    await loadForms()
    // null → data?.forms ?? {} → {} → cache stays empty.
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: { form_late: {} } })))
    const out = await loadForms()
    expect(out).toEqual({ form_late: {} })
    expect(apiFetch).toHaveBeenCalledTimes(2)
  })
  it("data null entirely → data?.forms ?? {} → empty cache", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn() }))
    const api = await import("@melite/catalog/api")
    const apiFetch = api.apiFetch as unknown as ReturnType<typeof vi.fn>
    const { loadForms } = await import("@melite/catalog")
    apiFetch.mockResolvedValueOnce(mkRes("null"))
    await loadForms()
    // null data → data?.forms is undefined → ?? {} → cache empty → next refetches.
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: { form_x: {} } })))
    expect(await loadForms()).toEqual({ form_x: {} })
  })
  it("data.forms is a non-object truthy value (array) → cast as FormsData (defensive)", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn() }))
    const api = await import("@melite/catalog/api")
    const apiFetch = api.apiFetch as unknown as ReturnType<typeof vi.fn>
    const { loadForms, getCachedForms } = await import("@melite/catalog")
    // An array is truthy → passes the `?? {}` guard → cast as FormsData.
    // Object.keys on an array returns ["0","1",...] → non-empty → cached.
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: [{ sidebar_key: "x" }] })))
    await loadForms()
    // The cache is now the array (cast). Object.keys > 0 → cached.
    expect(Object.keys(getCachedForms()).length).toBeGreaterThan(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// loadForms — inflight lifecycle
// ════════════════════════════════════════════════════════════════════════════
describe("serviceForms — inflight lifecycle", () => {
  it("clears _inflight after a FAILED fetch (next call starts fresh)", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn() }))
    const api = await import("@melite/catalog/api")
    const apiFetch = api.apiFetch as unknown as ReturnType<typeof vi.fn>
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { loadForms } = await import("@melite/catalog")
    // First call throws.
    apiFetch.mockRejectedValueOnce(new Error("net"))
    await loadForms()
    // Second call should NOT reuse inflight (it was cleared in finally).
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: { form_ok: {} } })))
    const out = await loadForms()
    expect(out).toEqual({ form_ok: {} })
    expect(apiFetch).toHaveBeenCalledTimes(2)
    warnSpy.mockRestore()
  })
  it("clears _inflight after a non-OK response", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn() }))
    const api = await import("@melite/catalog/api")
    const apiFetch = api.apiFetch as unknown as ReturnType<typeof vi.fn>
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { loadForms } = await import("@melite/catalog")
    apiFetch.mockResolvedValueOnce(mkRes("down", 500))
    await loadForms()
    // Inflight cleared → next call fetches again.
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: { form_ok: {} } })))
    await loadForms()
    expect(apiFetch).toHaveBeenCalledTimes(2)
    warnSpy.mockRestore()
  })
  it("force:true shares inflight across concurrent callers", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn() }))
    const api = await import("@melite/catalog/api")
    const apiFetch = api.apiFetch as unknown as ReturnType<typeof vi.fn>
    const { loadForms } = await import("@melite/catalog")
    // Seed cache first.
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: { form_a: {} } })))
    await loadForms()
    // Two concurrent force calls — only one fetch.
    apiFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ forms: { form_b: {} } })))
    const [a, b] = await Promise.all([loadForms({ force: true }), loadForms({ force: true })])
    expect(a).toEqual(b)
    expect(apiFetch).toHaveBeenCalledTimes(2) // seed + one force fetch
  })
})

// ════════════════════════════════════════════════════════════════════════════
// getCachedForms — after load
// ════════════════════════════════════════════════════════════════════════════
describe("serviceForms — getCachedForms after load", () => {
  it("returns the populated cache after a successful load", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn().mockResolvedValue(
      mkRes(JSON.stringify({ forms: { form_a: { sidebar_key: "a" }, form_b: { sidebar_key: "b" } } }))) }))
    const { loadForms, getCachedForms } = await import("@melite/catalog")
    await loadForms()
    const cache = getCachedForms()
    expect(Object.keys(cache).sort()).toEqual(["form_a", "form_b"])
  })
  it("returns the same object reference across calls (no copy)", async () => {
    vi.resetModules()
    vi.doMock("@melite/catalog/api", () => ({ apiFetch: vi.fn().mockResolvedValue(
      mkRes(JSON.stringify({ forms: { form_a: {} } }))) }))
    const { loadForms, getCachedForms } = await import("@melite/catalog")
    await loadForms()
    expect(getCachedForms()).toBe(getCachedForms())
  })
})

// ════════════════════════════════════════════════════════════════════════════
// FormEntry + FormsData type shape sanity
// ════════════════════════════════════════════════════════════════════════════
describe("serviceForms — type shape sanity", () => {
  it("FormEntry has all optional fields", () => {
    const entry = {
      sidebar_key: "tts_speak",
      label: "TTS",
      genre: "audio",
      default_service: "tts",
      description: "Text to speech",
    }
    expect(entry.sidebar_key).toBe("tts_speak")
    expect(entry.genre).toBe("audio")
  })
  it("FormEntry can be an empty object (all fields optional)", () => {
    const entry: import("@melite/catalog").FormEntry = {}
    expect(entry).toEqual({})
  })
  it("FormsData is a Record<string, FormEntry>", () => {
    const forms: FormsData = {
      form_a: { sidebar_key: "a" },
      form_b: { sidebar_key: "b", label: "B" },
    }
    expect(Object.keys(forms)).toHaveLength(2)
  })
})

// ── §16 C-RAIL: formSidebarItems — the ONE ordered sidebar item builder ────
// /v1/forms is rail-derived and carries order; this pure builder is shared
// by ServicesSidebar's render and this pin, so render and law can't drift.
import { formSidebarItems } from "@melite/catalog"

describe("formSidebarItems (rail-owned /v1/forms ordering)", () => {
  it("groups by genre and honors the declared order within a group", () => {
    const items = formSidebarItems({
      form_upscale: { sidebar_key: "upscale", label: "Upscale", genre: "image", order: 70 },
      form_edit: { sidebar_key: "edit", label: "Edit", genre: "image", order: 10 },
      form_generate: { sidebar_key: "generate", label: "Generate", genre: "image", order: 20 },
      form_music: { sidebar_key: "generate_music", label: "Music", genre: "audio", order: 10 },
      form_sound: { sidebar_key: "generate_sound", label: "Sound", genre: "audio", order: 20 },
    })
    expect(items.image!.map((i) => i.name)).toEqual(["edit", "generate", "upscale"])
    expect(items.audio!.map((i) => i.name)).toEqual(["generate_music", "generate_sound"])
  })

  it("sorts order-less (legacy) entries last, label-alphabetical", () => {
    const items = formSidebarItems({
      form_a: { sidebar_key: "z_legacy", label: "Z Legacy", genre: "image" },
      form_b: { sidebar_key: "a_legacy", label: "A Legacy", genre: "image" },
      form_c: { sidebar_key: "railed", label: "Railed", genre: "image", order: 1 },
    })
    expect(items.image!.map((i) => i.name)).toEqual(["railed", "a_legacy", "z_legacy"])
  })

  it("skips entries without sidebar_key or genre (hidden/internal forms)", () => {
    const items = formSidebarItems({
      form_admin: { label: "Admin" }, // no sidebar_key — never a row
      form_x: { sidebar_key: "x" }, // key without genre — ungroupable
      form_y: { sidebar_key: "y", label: "Y", genre: "image", order: 1 },
    })
    expect(items.image!.map((i) => i.name)).toEqual(["y"])
  })

  it("falls back to the sidebar_key as label when label is absent", () => {
    const items = formSidebarItems({
      form_y: { sidebar_key: "y", genre: "image", order: 1 },
    })
    expect(items.image![0]!.label).toBe("y")
  })
})
