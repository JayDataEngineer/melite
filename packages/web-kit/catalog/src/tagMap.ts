// tagMap — the tag registry + forward index, synced to the server.
//
// THE PATTERN (SillyTavern's tags.js, 2026-08-09):
//   map[entityKey] = [tagId, ...]   — forward index, O(1) per-item lookup
//   tags[tagId]    = TagDef          — the registry (name + color)
//
// Tags are RUNTIME data (user-created), not static config — so they don't live
// in config/editor/list_filters.json. But their COLOR vocabulary is closed by
// the pydantic TagColor enum (backend/core/ui/list_filter_schema.py); the TS
// mirror below is twin-tested against that enum. A tag never drifts into an
// arbitrary hex that breaks the theme.
//
// PERSISTENCE (server-canonical, localStorage-cached):
//   • The server is the source of truth — GET/PUT /v1/tags exchanges a full
//     TagDocument ({tags, map}), validated by the pydantic ratchet on BOTH
//     read (corrupt file → empty fallback) and write (422 on any violation).
//   • localStorage (`melite:tag-map:v1`) is a write-through cache + offline
//     fallback. The store hydrates from it SYNCHRONOUSLY on first load (so the
//     UI renders instantly), then `initTagSync()` replaces it with the server
//     copy if one exists (the server wins ties).
//   • Mutations are optimistic: actions update local state immediately, then a
//     debounced effect pushes the full document via PUT. localStorage is
//     written synchronously on every mutation so the cache is never stale.
//   • Server sync is GATED: it only activates after `initTagSync()` is called
//     (by the app shell on mount) — the tag-map suites that exercise the
//     server seat call it deliberately.
import { createClientStore, type GetState, type SetState } from "./clientStore"
import { apiFetch } from "./api"

// ── TagColor — TS mirror of the pydantic enum ────────────────────────────
// SSOT: backend/core/ui/list_filter_schema.py :: TagColor. This TS const is
// the front-end mirror; tag-map.test.ts pins that the values match, and
// test_list_filter_schema.py pins the backend. Drift between the two fails
// one of the two test suites — never the UI at runtime.
export const TagColor = {
  brand: "brand",
  sky: "sky",
  violet: "violet",
  rose: "rose",
  emerald: "emerald",
  amber: "amber",
  cyan: "cyan",
} as const
export type TagColor = (typeof TagColor)[keyof typeof TagColor]
export const TAG_COLOR_VALUES: readonly TagColor[] = Object.values(TagColor)

/** Is the value a valid TagColor? Gates untrusted JSON (localStorage,
 *  a future server payload) before it enters the store. */
export function isTagColor(v: unknown): v is TagColor {
  return typeof v === "string" && (TAG_COLOR_VALUES as string[]).includes(v)
}

// ── Presentation: each color → Tailwind classes for the badge ────────────
// One source of truth for the dot (tile overlay), the pill (inline badge),
// and any future tag surface. Adding a color means a row here AND a backend
// enum edit in the same PR.
export interface TagColorMeta {
  /** Solid dot class for compact tile overlays (h-2 w-2 circle). */
  dot: string
  /** Pill classes: border + bg + text for the inline badge. */
  pill: string
}

export const TAG_COLOR_META: Record<TagColor, TagColorMeta> = {
  brand:   { dot: "bg-brand",       pill: "border-brand/30 bg-brand/10 text-brand" },
  sky:     { dot: "bg-sky-500",     pill: "border-sky-500/30 bg-sky-500/10 text-sky-400" },
  violet:  { dot: "bg-violet-500",  pill: "border-violet-500/30 bg-violet-500/10 text-violet-400" },
  rose:    { dot: "bg-rose-500",    pill: "border-rose-500/30 bg-rose-500/10 text-rose-400" },
  emerald: { dot: "bg-emerald-500", pill: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  amber:   { dot: "bg-amber-500",   pill: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
  cyan:    { dot: "bg-cyan-500",    pill: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400" },
}

// ── Types ────────────────────────────────────────────────────────────────
export interface TagDef {
  /** Stable slug — used as the dict key + the tag_map entry. */
  id: string
  /** Display name. */
  name: string
  /** From the closed TagColor enum. */
  color: TagColor
}

// ── Slug + color helpers ─────────────────────────────────────────────────
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "tag"
  )
}

/** Generate a unique tag id from a name, appending -2, -3, … on collision. */
function uniqueId(name: string, existing: Set<string>): string {
  const base = slugify(name)
  if (!existing.has(base)) return base
  let n = 2
  while (existing.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

/** Cycle through the palette so consecutive new tags get distinct colors. */
function nextColor(count: number): TagColor {
  return TAG_COLOR_VALUES[count % TAG_COLOR_VALUES.length]
}

// ── Persistence ──────────────────────────────────────────────────────────
// Server-canonical with a localStorage cache. See the module header for the
// full strategy; the key invariant is: every mutation writes localStorage
// synchronously (cache stays fresh) + schedules a debounced server PUT (the
// server is canonical). The boundary validator (`validateDocument`) is shared
// by both the localStorage load AND the server hydrate so the ratchet is in
// one place.
const STORAGE_KEY = "melite:tag-map:v1"
const SYNC_DEBOUNCE_MS = 500

interface PersistedShape {
  tags: Record<string, TagDef>
  map: Record<string, string[]>
}

/**
 * Boundary ratchet — gate untrusted JSON (localStorage OR a server payload)
 * before it enters the store. Drops any tag whose color isn't in the closed
 * enum, then rebuilds the forward index dropping orphan entries. This is the
 * front-end mirror of the pydantic TagDocument validator; the server enforces
 * the same rules on PUT, but we don't trust the wire even from our own server
 * — defense in depth.
 */
function validateDocument(parsed: Partial<PersistedShape> | null | undefined): PersistedShape {
  const empty: PersistedShape = { tags: {}, map: {} }
  if (!parsed) return empty
  const tags: Record<string, TagDef> = {}
  for (const [id, def] of Object.entries(parsed.tags ?? {})) {
    if (def && typeof def.name === "string" && isTagColor(def.color)) {
      tags[id] = { id, name: def.name, color: def.color }
    }
  }
  // Rebuild the map dropping any tagId that no longer exists in the registry.
  const knownIds = new Set(Object.keys(tags))
  const map: Record<string, string[]> = {}
  for (const [key, ids] of Object.entries(parsed.map ?? {})) {
    if (Array.isArray(ids)) {
      const clean = ids.filter((id) => typeof id === "string" && knownIds.has(id))
      if (clean.length > 0) map[key] = clean
    }
  }
  return { tags, map }
}

function loadPersisted(): PersistedShape {
  if (typeof localStorage === "undefined") return { tags: {}, map: {} }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { tags: {}, map: {} }
    return validateDocument(JSON.parse(raw) as Partial<PersistedShape>)
  } catch {
    return { tags: {}, map: {} } // corrupt JSON — fall back to empty, never throw
  }
}

// ── Server sync ──────────────────────────────────────────────────────────
// Gated: server pushes only fire after initTagSync() flips this flag,
// which every tag-map suite that exercises the sync calls on purpose
// (tag-map.spec.ts's hydrate + debounced-PUT arms); the init-*.spec.ts
// files each mount one module so the first successful hydrate does not
// latch the flag for their siblings. A suite that never calls it fires
// no PUT and leaves no timer behind.
let serverSyncEnabled = false
let syncTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Write-through to localStorage (synchronous cache) + schedule a debounced
 * server PUT. Called from every mutation action. The localStorage write is
 * unconditional (offline fallback stays fresh); the server PUT is gated by
 * `serverSyncEnabled`. Failures are swallowed (the local state is still
 * valid; the next successful mutation retries).
 */
function scheduleSync(data: PersistedState) {
  // 1. Synchronous local cache — never throws, privacy-mode safe.
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tags: data.tags, map: data.map }),
    )
  } catch {
    // Quota / privacy mode — silently degrade to in-memory only.
  }
  // 2. Debounced server push — only after the app shell has opted in.
  if (!serverSyncEnabled || typeof fetch === "undefined") return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    apiFetch("/v1/tags", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: data.tags, map: data.map }),
    }).catch((e) => {
      // Server unreachable / 422 — keep the local state (still valid locally).
      // The cache stays consistent; the next mutation retries the PUT.
      console.warn("[tagMap] server sync failed:", e)
    })
  }, SYNC_DEBOUNCE_MS)
}

/**
 * Hydrate the store from the server (canonical) + enable server pushes.
 * Called once by the app shell on mount. The store already has the
 * localStorage cache (loaded synchronously at module init), so the UI renders
 * immediately; this replaces it with the server copy if one exists (the server
 * wins ties — it's the cross-device source of truth). After this call,
 * mutations push to the server via the debounced PUT.
 *
 * Silent on failure: if the server is unreachable, the store keeps the
 * localStorage cache and server pushes stay disabled (offline mode).
 */
export async function initTagSync(): Promise<void> {
  if (serverSyncEnabled) return // idempotent — the app shell may call twice
  if (typeof fetch === "undefined") return
  try {
    const res = await apiFetch("/v1/tags")
    if (!res.ok) return
    const doc = validateDocument(await res.json() as Partial<PersistedShape>)
    // Server is canonical — replace the localStorage-hydrated state wholesale.
    useTagMap.setState({ tags: doc.tags, map: doc.map })
    serverSyncEnabled = true
  } catch {
    // Server unreachable — stay on the localStorage cache, don't enable pushes.
    // Not an error: offline mode is a first-class state.
  }
}

// Zustand's set/get types need the full shape including actions; sync only
// reads tags + map (the data fields), so we narrow to that subset.
type PersistedState = Pick<TagMapState, "tags" | "map">

// ── The store ────────────────────────────────────────────────────────────
export interface TagMapState {
  /** The registry: tagId → TagDef. */
  tags: Record<string, TagDef>
  /** The forward index (the "tag_map"): entityKey → tagId[]. */
  map: Record<string, string[]>
  // ── Registry actions ──
  /** Create a tag. Returns the new tag's id. Color auto-cycles if omitted. */
  createTag: (name: string, color?: TagColor) => string
  renameTag: (id: string, name: string) => void
  recolorTag: (id: string, color: TagColor) => void
  /** Delete a tag from the registry AND every item's tag list. */
  deleteTag: (id: string) => void
  // ── Index actions ──
  /** Replace all tags on an item. */
  setItemTags: (key: string, tagIds: string[]) => void
  addTagToItem: (key: string, tagId: string) => void
  removeTagFromItem: (key: string, tagId: string) => void
  /** O(1) forward lookup — which tags are on this item? */
  tagsOf: (key: string) => string[]
  /** Does this item have this tag? (the hot path for filtering) */
  hasTag: (key: string, tagId: string) => boolean
}

const initial = loadPersisted()

const tagMapActions = (set: SetState<TagMapState>, get: GetState<TagMapState>): Omit<TagMapState, "tags" | "map"> => ({

  createTag: (name, color) => {
    const trimmed = name.trim()
    if (!trimmed) return ""
    const existing = new Set(Object.keys(get().tags))
    const id = uniqueId(trimmed, existing)
    const c = color ?? nextColor(Object.keys(get().tags).length)
    set((s) => {
      const tags = { ...s.tags, [id]: { id, name: trimmed, color: c } }
      scheduleSync({ tags, map: s.map })
      return { tags }
    })
    return id
  },

  renameTag: (id, name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    set((s) => {
      const def = s.tags[id]
      if (!def) return s
      const tags = { ...s.tags, [id]: { ...def, name: trimmed } }
      scheduleSync({ tags, map: s.map })
      return { tags }
    })
  },

  recolorTag: (id, color) => {
    if (!isTagColor(color)) return
    set((s) => {
      const def = s.tags[id]
      if (!def) return s
      const tags = { ...s.tags, [id]: { ...def, color } }
      scheduleSync({ tags, map: s.map })
      return { tags }
    })
  },

  deleteTag: (id) => {
    set((s) => {
      if (!s.tags[id]) return s
      const tags = { ...s.tags }
      delete tags[id]
      // Remove the tag from every item's list (the forward index).
      const map: Record<string, string[]> = {}
      for (const [key, ids] of Object.entries(s.map)) {
        const filtered = ids.filter((t) => t !== id)
        if (filtered.length > 0) map[key] = filtered
      }
      scheduleSync({ tags, map })
      return { tags, map }
    })
  },

  setItemTags: (key, tagIds) => {
    const known = new Set(Object.keys(get().tags))
    // Dedupe + drop unknown tag ids (the ratchet — only registered tags stick).
    const clean = [...new Set(tagIds)].filter((id) => known.has(id))
    set((s) => {
      const map = { ...s.map }
      if (clean.length > 0) map[key] = clean
      else delete map[key] // don't keep empty entries
      scheduleSync({ tags: s.tags, map })
      return { map }
    })
  },

  addTagToItem: (key, tagId) => {
    if (!get().tags[tagId]) return // unknown tag — refuse silently
    set((s) => {
      const current = s.map[key] ?? []
      if (current.includes(tagId)) return s // already has it
      const map = { ...s.map, [key]: [...current, tagId] }
      scheduleSync({ tags: s.tags, map })
      return { map }
    })
  },

  removeTagFromItem: (key, tagId) => {
    set((s) => {
      const current = s.map[key]
      if (!current || !current.includes(tagId)) return s
      const next = current.filter((t) => t !== tagId)
      const map = { ...s.map }
      if (next.length > 0) map[key] = next
      else delete map[key]
      scheduleSync({ tags: s.tags, map })
      return { map }
    })
  },

  tagsOf: (key) => get().map[key] ?? [],

  hasTag: (key, tagId) => (get().map[key] ?? []).includes(tagId),
})

export const useTagMap = createClientStore<TagMapState>((set, get) => ({
  ...tagMapActions(set, get),
  tags: initial.tags,
  map: initial.map,
}))

// ── Non-hook helpers (for use outside React, e.g. in the filter accessor) ─
/** Read tagsOf without a React subscription. The useListFilter accessor uses
 *  this so the filter flow doesn't need to re-subscribe on every item. */
export function tagsOf(key: string): string[] {
  return useTagMap.getState().map[key] ?? []
}
