/**
 * E4.3 — Prompt history.
 *
 * Two layers of prompt memory:
 *
 *   • Per-segment — the last MAX_PER_SEGMENT distinct prompts used on
 *     a given segment (default 10). Drives the inline history dropdown
 *     on the inspector's prompt field.
 *
 *   • Global — the last MAX_GLOBAL distinct prompts across ALL segments
 *     (default 50). Drives a "recent prompts" picker and seeds the
 *     prompt-library autocomplete (E4.7).
 *
 * Both are persisted to localStorage (`tech_noir_prompt_history`) so
 * they survive reloads. Per-segment history is keyed by segment id;
 * when a segment is deleted its history orphan stays behind (cheap —
 * capped at 10 entries × however many segments you've ever authored,
 * and a cleanup pass could be added later if it ever matters).
 *
 * Dedup is case-sensitive (prompt text is the literal identity). The
 * "most recent" wins: re-recording an existing prompt moves it to the
 * front (MRU ordering) so the prompts you actually reuse stay on top.
 */
import { create } from 'zustand'

const STORAGE_KEY = 'tech_noir_prompt_history'
export const MAX_PER_SEGMENT = 10
export const MAX_GLOBAL = 50

interface PromptHistoryStore {
  /** Map of segmentId → MRU list (index 0 = most recent). */
  perSegment: Record<string, string[]>
  /** Global MRU list (index 0 = most recent). */
  global: string[]
  initialized: boolean
  initialize: () => void
  /** Record a prompt for a segment. No-op for empty/whitespace prompts.
   *  Dedupes (moving an existing entry to front) and trims to cap. */
  recordPrompt: (segId: string, prompt: string) => void
  /** Get the per-segment MRU list (empty if none). */
  getSegmentHistory: (segId: string) => string[]
  /** Get the global MRU list (empty if none). */
  getGlobalHistory: () => string[]
  /** Clear all history (per-segment + global). Test helper. */
  reset: () => void
  /** Remove a single segment's history (e.g. on segment delete). */
  forgetSegment: (segId: string) => void
}

interface PersistedShape {
  perSegment: Record<string, string[]>
  global: string[]
}

function load(): PersistedShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { perSegment: {}, global: [] }
    const parsed = JSON.parse(raw)
    return {
      perSegment:
        parsed && typeof parsed.perSegment === 'object' && parsed.perSegment
          ? parsed.perSegment
          : {},
      global: Array.isArray(parsed?.global) ? parsed.global : [],
    }
  } catch (e) {
    // NO SILENT SWALLOW — corrupted localStorage shouldn't make history
    // "just vanish". Log so it's debuggable, then return empty default.
    console.error('[PromptHistory] failed to parse persisted history:', e)
    return { perSegment: {}, global: [] }
  }
}

function persist(perSegment: Record<string, string[]>, global: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ perSegment, global }))
  } catch (e) {
    console.error('[PromptHistory] Failed to persist:', e)
  }
}

/** Insert `value` at the front of `list`, deduping (case-sensitive) and
 *  trimming to `cap`. Returns a NEW array (does not mutate). Pure. */
export function pushMru(
  list: string[],
  value: string,
  cap: number,
): string[] {
  const next = [value, ...list.filter((p) => p !== value)]
  return next.slice(0, cap)
}

export const usePromptHistoryStore = create<PromptHistoryStore>((set, get) => ({
  perSegment: {},
  global: [],
  initialized: false,

  initialize: () => {
    if (get().initialized) return
    const loaded = load()
    set({ perSegment: loaded.perSegment, global: loaded.global, initialized: true })
  },

  recordPrompt: (segId, prompt) => {
    const trimmed = prompt.trim()
    if (!trimmed) return
    set((s) => {
      const segList = s.perSegment[segId] ?? []
      const perSegment = {
        ...s.perSegment,
        [segId]: pushMru(segList, trimmed, MAX_PER_SEGMENT),
      }
      const global = pushMru(s.global, trimmed, MAX_GLOBAL)
      persist(perSegment, global)
      return { perSegment, global }
    })
  },

  getSegmentHistory: (segId) => get().perSegment[segId] ?? [],

  getGlobalHistory: () => get().global,

  forgetSegment: (segId) => {
    set((s) => {
      if (!(segId in s.perSegment)) return {}
      const perSegment = { ...s.perSegment }
      delete perSegment[segId]
      persist(perSegment, s.global)
      return { perSegment }
    })
  },

  reset: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ perSegment: {}, global: [], initialized: false })
  },
}))
