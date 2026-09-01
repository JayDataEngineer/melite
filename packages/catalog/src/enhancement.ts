import { create } from 'zustand'
import { apiFetch } from "./api"

// The ONE sampling parameter for every LLM call (agent + Enhance). The
// backend keystore owns it (POST /v1/llm/temperature); this store mirrors
// it so the sidebar's Parameters knob renders + writes it. Default mirrors
// the backend's llm_keystore default.
export const DEFAULT_TEMPERATURE = 0.7
const MIN_TEMPERATURE = 0.0
const MAX_TEMPERATURE = 2.0

function clampTemperature(t: number): number {
  return Math.min(MAX_TEMPERATURE, Math.max(MIN_TEMPERATURE, t))
}

// The ONE context-window budget (the sidebar Model section's "Max context"
// knob, 2026-08-15). Backend keystore owns it (POST /v1/llm/max-context);
// this store mirrors it. In TOKENS: past the budget the agent clears older
// tool results (keeping the most recent 3). Defaults + clamp mirror the
// backend's llm_keystore constants.
export const DEFAULT_MAX_CONTEXT = 128_000
export const MIN_MAX_CONTEXT = 8_000
export const MAX_MAX_CONTEXT = 1_000_000

function clampMaxContext(c: number): number {
  return Math.round(Math.min(MAX_MAX_CONTEXT, Math.max(MIN_MAX_CONTEXT, c)))
}

export interface EnhanceModel {
  id: string
  name: string
  baseUrl: string       // e.g. "https://api.openai.com/v1"
  apiKey: string        // Only used temporarily, not persisted
  model: string         // e.g. "gpt-4o-mini"
  keyId?: string        // Backend key ID for secure storage
}

interface BackendKeyMeta {
  key_id: string
  name: string
  baseUrl: string
  model: string
  active?: boolean
}

interface EnhancementStore {
  models: EnhanceModel[]
  activeId: string | null
  /**
   * The SECOND model used by the ✨ Enhance buttons ONLY (2026-08-14). The
   * agent + Ideogram AI + LLMChatDialog keep using the active model. null =
   * "use the active model" (the pre-feature behavior). Managed from the
   * right sidebar's model dropdown; the header dialog still manages which
   * endpoints exist.
   */
  enhanceId: string | null
  /** Global sampling temperature (the sidebar's Parameters knob). Mirrors
   *  the backend keystore; POST /v1/llm/temperature on change. */
  temperature: number
  /** Global max-context token budget (the Model section's Max context
   *  knob). Mirrors the backend keystore; POST /v1/llm/max-context on
   *  change. Past it the agent clears older tool results. */
  maxContext: number
  /**
   * Load the saved model list. IndexedDB reads are async, so the store is
   * created empty and hydrated after boot (see App.tsx). Also performs a
   * one-time migration of the legacy localStorage key into IndexedDB.
   */
  hydrate: () => Promise<void>
  addModel: (model: Omit<EnhanceModel, 'id'>) => EnhanceModel
  updateModel: (id: string, patch: Partial<Omit<EnhanceModel, 'id'>>) => void
  removeModel: (id: string) => void
  setActive: (id: string | null) => void
  activeModel: () => EnhanceModel | undefined
  setEnhance: (id: string | null) => void
  /** The model for Enhance calls: the enhanceId choice, else the active
   *  (agent) model. */
  enhanceModel: () => EnhanceModel | undefined
  setTemperature: (temperature: number) => void
  setMaxContext: (maxContext: number) => void
  /**
   * Reconcile IndexedDB with the backend keystore (GET /v1/llm/keys):
   *   - drop local entries whose keyId no longer exists on the backend
   *     (these would otherwise 404 with "Key not found" on next Enhance)
   *   - add backend entries not yet present locally
   *   - preserve activeId if still valid; otherwise fall back to first model
   *   - preserve enhanceId if still valid; otherwise reset to null
   *   - reconcile the global temperature from GET /v1/llm/keys/active
   * Local-only entries without a keyId (legacy, pre-keystore) are left alone.
   * Idempotent: writes only if something changed. Assumes hydrate() already ran.
   */
  syncFromBackend: () => Promise<void>
}

// ═══════════════════════════════════════════════════════════════════════════
// IndexedDB persistence
// ═══════════════════════════════════════════════════════════════════════════
// localStorage's ~5MB quota is too small once many model endpoints are saved —
// setItem HARD-fails the whole write with QuotaExceededError, losing every
// entry. Switch to IndexedDB (effectively unlimited, ~10s of MB+), same
// wrapper shape as lib/inpaintProjectStore.ts.
const DB_NAME = 'tech_noir_enhance_db'
const DB_VERSION = 1
const STORE = 'enhance'
const KEY = 'state'

// Legacy pre-IndexedDB key, migrated into IDB on first hydrate then removed.
const LEGACY_KEY = 'tech_noir_enhance'

// What's actually stored on disk — apiKey is transient and never persisted.
type PersistedModel = Omit<EnhanceModel, 'apiKey'>

interface PersistedState {
  models: PersistedModel[]
  activeId: string | null
  enhanceId: string | null
  temperature: number
  maxContext: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB unavailable'))
        return
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

async function idbGet(): Promise<PersistedState | null> {
  const db = await openDb()
  const tx = db.transaction(STORE, 'readonly')
  const req = tx.objectStore(STORE).get(KEY)
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as PersistedState) ?? null)
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(state: PersistedState): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).put(state, KEY)
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
    tx.onabort = () => rej(tx.error)
  })
}

/** Strip API keys from any untrusted payload before it's stored/returned. */
function sanitize(state: PersistedState): PersistedState {
  const models = (Array.isArray(state.models) ? state.models : [])
    .map((m) => {
      // PersistedModel carries no apiKey, but untrusted input (legacy JSON)
      // may — strip it defensively.
      const { apiKey: _, ...rest } = m as PersistedModel & { apiKey?: string }
      return rest
    })
  return {
    models,
    activeId: state.activeId ?? null,
    enhanceId: state.enhanceId ?? null,
    temperature: typeof state.temperature === 'number'
      ? clampTemperature(state.temperature)
      : DEFAULT_TEMPERATURE,
    maxContext: typeof state.maxContext === 'number'
      ? clampMaxContext(state.maxContext)
      : DEFAULT_MAX_CONTEXT,
  }
}

async function loadPersisted(): Promise<PersistedState> {
  // One-time migration from the legacy localStorage key. Write it through to
  // IDB and clear the old key so stale data isn't re-read on every boot.
  try {
    const legacyRaw = localStorage.getItem(LEGACY_KEY)
    if (legacyRaw) {
      const migrated = sanitize(JSON.parse(legacyRaw) as PersistedState)
      await idbPut(migrated)
      localStorage.removeItem(LEGACY_KEY)
      return migrated
    }
  } catch (e) {
    // NO SILENT SWALLOW — a broken/oversized legacy payload shouldn't make
    // saved endpoints "just vanish". Log so it's debuggable.
    console.error('[enhancement] failed to migrate persisted models:', e)
  }
  try {
    const saved = await idbGet()
    if (saved) return sanitize(saved)
  } catch (e) {
    // NO SILENT SWALLOW — IndexedDB failures (quota, corruption, version
    // upgrade) shouldn't make saved endpoints "just vanish". Log so we know.
    console.error('[enhancement] failed to load persisted models:', e)
  }
  return { models: [], activeId: null, enhanceId: null, temperature: DEFAULT_TEMPERATURE, maxContext: DEFAULT_MAX_CONTEXT }
}

function persist(models: EnhanceModel[], activeId: string | null, enhanceId: string | null, temperature: number, maxContext: number) {
  // Never store API keys in IndexedDB - only metadata.
  const safeModels = models.map(({ apiKey: _, ...rest }) => rest)
  idbPut({ models: safeModels, activeId, enhanceId, temperature, maxContext }).catch((e: unknown) => {
    // NO SILENT SWALLOW — quota/IDB failures shouldn't silently drop saved
    // endpoints. Log so we know persistence is broken.
    console.error('[enhancement] failed to persist models:', e)
  })
}

/** Test hook — clears the cached DB connection so a fresh fake can be installed. */
export function _resetEnhanceDbForTests(): void {
  dbPromise = null
}

let _nextId = 1
function uid(): string { return `em_${_nextId++}_${Date.now().toString(36)}` }

export const useEnhanceStore = create<EnhancementStore>((set, get) => {
  return {
    models: [],
    activeId: null,
    enhanceId: null,
    temperature: DEFAULT_TEMPERATURE,
    maxContext: DEFAULT_MAX_CONTEXT,

    hydrate: async () => {
      const saved = await loadPersisted()
      set((s) => {
        // Don't clobber models added before hydration finished (e.g. a quick
        // addModel during boot) — in-memory state wins.
        if (s.models.length > 0) return s
        // Persisted models carry no apiKey — restore the in-memory contract.
        const models = saved.models.map((m) => ({ ...m, apiKey: '' }))
        return {
          models,
          activeId: saved.activeId,
          enhanceId: saved.enhanceId,
          temperature: saved.temperature,
          maxContext: saved.maxContext,
        }
      })
    },

    addModel: (partial) => {
      const model: EnhanceModel = { ...partial, id: uid() }
      set((s) => {
        const models = [...s.models, model]
        const activeId = s.activeId ?? model.id
        persist(models, activeId, s.enhanceId, s.temperature, s.maxContext)
        return { models, activeId }
      })
      return model
    },

    updateModel: (id, patch) => set((s) => {
      const models = s.models.map((m) => m.id === id ? { ...m, ...patch } : m)
      persist(models, s.activeId, s.enhanceId, s.temperature, s.maxContext)
      return { models }
    }),

    removeModel: (id) => set((s) => {
      const models = s.models.filter((m) => m.id !== id)
      const activeId = s.activeId === id ? (models[0]?.id ?? null) : s.activeId
      // If the Enhance choice was removed, fall back to "use the agent
      // model" (null) — never leave it dangling at a removed endpoint.
      const enhanceId = s.enhanceId === id ? null : s.enhanceId
      persist(models, activeId, enhanceId, s.temperature, s.maxContext)
      return { models, activeId, enhanceId }
    }),

    setActive: (id) => {
      persist(get().models, id, get().enhanceId, get().temperature, get().maxContext)
      set({ activeId: id })
      // Notify the backend so the master AI agent picks up the new endpoint.
      // The backend's active key is the SINGLE source of truth for the agent
      // (keystore → /v1/llm/keys/active → langgraph _build_model). Fire-and-
      // forget; if it fails the next syncFromBackend will reconcile.
      const model = get().models.find((m) => m.id === id)
      const keyId = model?.keyId
      if (keyId) {
        apiFetch(`/v1/llm/keys/${keyId}/activate`, { method: "POST" })
          .catch((e: unknown) => console.error("[enhancement] activate POST failed:", e))
      }
    },

    activeModel: () => {
      const s = get()
      return s.models.find((m) => m.id === s.activeId)
    },

    setEnhance: (id) => {
      persist(get().models, get().activeId, id, get().temperature, get().maxContext)
      set({ enhanceId: id })
    },

    enhanceModel: () => {
      const s = get()
      return s.models.find((m) => m.id === s.enhanceId)
        ?? s.models.find((m) => m.id === s.activeId)
    },

    setTemperature: (temperature) => {
      const clamped = clampTemperature(temperature)
      persist(get().models, get().activeId, get().enhanceId, clamped, get().maxContext)
      set({ temperature: clamped })
      // Mirror the knob to the backend keystore — the ONE source of truth
      // for the master agent's per-run temperature. Fire-and-forget; a
      // failure surfaces via the backend-state badge, not a toast here.
      apiFetch("/v1/llm/temperature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temperature: clamped }),
      }).catch((e: unknown) => console.error("[enhancement] temperature POST failed:", e))
    },

    setMaxContext: (maxContext) => {
      const clamped = clampMaxContext(maxContext)
      persist(get().models, get().activeId, get().enhanceId, get().temperature, clamped)
      set({ maxContext: clamped })
      // Mirror the knob to the backend keystore (the agent's
      // ContextWindowMiddleware reads it per run). Fire-and-forget; a
      // failure surfaces via the backend-state badge, not a toast here.
      apiFetch("/v1/llm/max-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_context: clamped }),
      }).catch((e: unknown) => console.error("[enhancement] max-context POST failed:", e))
    },

    syncFromBackend: async () => {
      try {
        const res = await apiFetch('/v1/llm/keys')
        if (!res.ok) {
          // NO SILENT SWALLOW — log so a 4xx/5xx on /v1/llm/keys doesn't
          // look like "no keys registered." Fall through to IndexedDB.
          console.error(`[enhancement] /v1/llm/keys returned ${res.status}, skipping backend sync`)
          return
        }
        const data = await res.json()
        const backend = (data.keys || []) as BackendKeyMeta[]
        const backendIds = new Set(backend.map((k) => k.key_id))

        set((s) => {
          // Drop local entries pointing at deleted backend key_ids.
          // Keep keyless legacy entries (no keyId) — they're pre-keystore.
          const surviving = s.models.filter(
            (m) => !m.keyId || backendIds.has(m.keyId)
          )

          // Add backend entries that have no local counterpart.
          const localIds = new Set(
            surviving.map((m) => m.keyId).filter(Boolean) as string[]
          )
          const added: EnhanceModel[] = backend
            .filter((k) => !localIds.has(k.key_id))
            .map((k) => ({
              id: uid(),
              name: k.name,
              baseUrl: k.baseUrl,
              apiKey: '',
              model: k.model,
              keyId: k.key_id,
            }))

          const models = added.length || surviving.length !== s.models.length
            ? [...surviving, ...added]
            : s.models

          // Preserve activeId if it still points at a real model;
          // otherwise auto-select the first so the user doesn't have to.
          // HONOR the backend's `active` flag: if the backend marked a key
          // active (via POST /activate), that's the source of truth — the
          // master AI agent uses whatever the backend says is active.
          let activeId = s.activeId
          const backendActive = backend.find((k) => k.active)
          if (backendActive) {
            const localActive = models.find((m) => m.keyId === backendActive.key_id)
            if (localActive) activeId = localActive.id
          }
          if (!activeId || !models.find((m) => m.id === activeId)) {
            activeId = models[0]?.id ?? null
          }

          // Preserve the Enhance choice if still valid; otherwise reset to
          // null (use the agent model).
          const enhanceId = s.enhanceId && models.find((m) => m.id === s.enhanceId)
            ? s.enhanceId
            : null

          if (models === s.models && activeId === s.activeId && enhanceId === s.enhanceId) return s
          persist(models, activeId, enhanceId, s.temperature, s.maxContext)
          return { models, activeId, enhanceId }
        })

        // Reconcile the global knobs from the backend's active credentials
        // (the keystore is the agent's source of truth — the knobs must
        // reflect what the agent will actually use).
        try {
          const activeRes = await apiFetch('/v1/llm/keys/active')
          if (activeRes.ok) {
            const active = await activeRes.json() as { temperature?: unknown; max_context?: unknown }
            if (typeof active.temperature === 'number') {
              const t = clampTemperature(active.temperature)
              if (Math.abs(t - get().temperature) > 0.0001) {
                persist(get().models, get().activeId, get().enhanceId, t, get().maxContext)
                set({ temperature: t })
              }
            }
            if (typeof active.max_context === 'number') {
              const mc = clampMaxContext(active.max_context)
              if (mc !== get().maxContext) {
                persist(get().models, get().activeId, get().enhanceId, get().temperature, mc)
                set({ maxContext: mc })
              }
            }
          } else if (activeRes.status !== 404) {
            // NO SILENT SWALLOW — a real failure (not "no keys yet") must log.
            console.error(`[enhancement] /v1/llm/keys/active returned ${activeRes.status}`)
          }
        } catch (e) {
          console.error('[enhancement] failed to reconcile temperature/max-context:', e)
        }
      } catch (e) {
        // Backend unreachable during boot — fall back to IndexedDB, but
        // NO SILENT SWALLOW: log so a broken /v1/llm/keys endpoint doesn't
        // look like "everything's fine, just no keys yet."
        console.error('[enhancement] syncFromBackend failed, using IndexedDB:', e)
      }
    },
  }
})
