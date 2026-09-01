// useListFilter — the ONE list filter/sort/search engine for every sidebar.
//
// Each sidebar (History, AppSidebar/Media, Library, Services) has different
// domain items but the SAME filter mechanics: substring/fuzzy search, sort
// by a field, optional tag (selected/excluded), optional provenance, optional
// favorite. This hook owns those mechanics; the sidebar provides TYPE-SAFE
// field accessors that map its domain model to the generic shape.
//
// DECLARATIVE: the available sort options + which FilterTypes apply live in
// packages/ui/src/list_filters.json (validated by the twin test in
// schema.py). This hook reads that spec via the sortOptions import below;
// adding a sort option is a JSON edit, not a code change here.
//
// CLOSED VOCABULARY: FilterType + Provenance come from the pydantic enum.
// A sidebar can't invent a filter dimension — it picks from the enum.
//
// Reference: SillyTavern's EntitiesFilter class (public/scripts/filters.js) —
// one class, one predicate per FILTER_TYPE, composed in applyFilters(). We
// mirror that discipline as a React hook.
import { useState, useMemo, useCallback } from "react"
import Fuse from "fuse.js"
import { Provenance, isProvenance } from "@melite/contracts"
// ── The declarative sort vocabulary ──────────────────────────────────────
// SSOT: packages/ui/src/list_filters.json :: sort_options (validated by the
// pydantic ratchet in backend/core/ui/list_filter_schema.py). This TS
// constant is the front-end mirror; the twin test
// (tests/unit/test_list_filter_schema.py :: test_committed_spec_*) pins the
// JSON side, and src/__tests__/list-filter.test.ts pins that this constant
// matches. Adding a sort option = JSON edit + one row here, in the same PR.
export interface SortOption {
  field: string
  order: "asc" | "desc" | "random"
  rule: "value" | "boolean"
  label: string
}
export const SORT_OPTIONS: Record<string, SortOption> = {
  newest:    { field: "createdAt", order: "desc", rule: "value",   label: "Newest" },
  oldest:    { field: "createdAt", order: "asc",  rule: "value",   label: "Oldest" },
  recent:    { field: "updatedAt", order: "desc", rule: "value",   label: "Recent" },
  "name-az": { field: "name",      order: "asc",  rule: "value",   label: "A–Z" },
  "name-za": { field: "name",      order: "desc", rule: "value",   label: "Z–A" },
  favorites: { field: "fav",       order: "desc", rule: "boolean", label: "Favorites" },
  largest:   { field: "size",      order: "desc", rule: "value",   label: "Largest" },
}

// ── Field accessors — the type-safe bridge to any domain model ───────────

export interface ListItemAccessor<T> {
  id: (item: T) => string
  name: (item: T) => string
  createdAt?: (item: T) => number
  updatedAt?: (item: T) => number
  size?: (item: T) => number
  fav?: (item: T) => boolean
  provenance?: (item: T) => Provenance | undefined
  /** Tag ids on this item — feeds the TAG filter (selected/excluded). The
   *  caller typically reads from the tagMap store: `tags: (a) => tagsOf(a.id)`. */
  tags?: (item: T) => string[]
  /** Custom search text (default: name). Return additional searchable text
   *  — tags, description, service name — for the substring match.
   *  SUPERSEDED by ``searchFields`` when both are provided (fuzzy wins). */
  searchText?: (item: T) => string
  /** Named search fields for Fuse.js fuzzy matching. When provided + a query
   *  is active, replaces substring search with typo-tolerant weighted fuzzy
   *  matching. The returned object maps field names to their text; weights
   *  are assigned by field name via FIELD_WEIGHTS below ('name' > 'tags' >
   *  everything else). Falls back to searchText/name substring when absent.
   *
   *  Example: ``searchFields: (a) => ({ name: a.name, tags: tagNames })``
   *  This is the SillyTavern pattern — Fuse.js with weighted keys. */
  searchFields?: (item: T) => Record<string, string>
}

// ── Declarative Fuse.js weights ──────────────────────────────────────────
// SSOT for field→weight. Higher = ranks first in fuzzy results. Adding a new
// weighted field is a row here, not a code change in the filter pipeline.
// ST uses { name: 10, tags: 10 } — we give name the edge since filenames are
// the user's primary mental model for finding media.
const FIELD_WEIGHTS: Record<string, number> = {
  name: 0.6,
  tags: 0.3,
}
const DEFAULT_FIELD_WEIGHT = 0.1
const FUSE_THRESHOLD = 0.4 // 0 = exact, 1 = anything; 0.4 = typo-tolerant

// ── Filter state — mirrors ST's filterData record ────────────────────────

export interface ListFilterState {
  search: string
  sort: string // key into SORT_OPTIONS
  provenance: Provenance | null // null = no provenance filter
  favOnly: boolean
  /** Tag ids that MUST be present (AND — narrowing). Mirrors ST's
   *  FILTER_STATES.SELECTED. Empty = no selected filter. */
  tagSelected: string[]
  /** Tag ids that MUST NOT be present (NOR — hiding). Mirrors ST's
   *  FILTER_STATES.EXCLUDED. Empty = no excluded filter. */
  tagExcluded: string[]
}

const INITIAL_STATE: ListFilterState = {
  search: "",
  sort: "recent",
  provenance: null,
  favOnly: false,
  tagSelected: [],
  tagExcluded: [],
}

// ── The hook ──────────────────────────────────────────────────────────────

export function useListFilter<T>(
  items: T[],
  accessor: ListItemAccessor<T>,
  opts?: { initialSort?: string },
): {
  state: ListFilterState
  filtered: T[]
  counts: { total: number; shown: number }
  actions: {
    setSearch: (s: string) => void
    setSort: (s: string) => void
    toggleProvenance: (p: Provenance) => void
    toggleFav: () => void
    /** Toggle a tag between selected → excluded → undefined (three-state,
     *  ST's FILTER_STATES cycle). Passing the same state twice clears it. */
    toggleTag: (tagId: string, which: "selected" | "excluded") => void
    /** Clear all tag filters (both selected + excluded). */
    clearTags: () => void
    reset: () => void
  }
} {
  // The caller's initial sort is part of the "blank slate" — reset() must
  // return to THIS, not to the hardcoded INITIAL_STATE default. A sidebar
  // that opens sorted by "name-az" should reset back to "name-az".
  const initialSort = opts?.initialSort ?? INITIAL_STATE.sort
  const [state, setState] = useState<ListFilterState>({
    ...INITIAL_STATE,
    sort: initialSort,
  })

  const setSearch = useCallback(
    (search: string) => setState((s) => ({ ...s, search })),
    [],
  )
  const setSort = useCallback(
    (sort: string) => setState((s) => ({ ...s, sort })),
    [],
  )
  const toggleProvenance = useCallback(
    (p: Provenance) =>
      setState((s) => ({
        ...s,
        provenance: s.provenance === p ? null : p,
      })),
    [],
  )
  const toggleFav = useCallback(
    () => setState((s) => ({ ...s, favOnly: !s.favOnly })),
    [],
  )
  const toggleTag = useCallback(
    (tagId: string, which: "selected" | "excluded") =>
      setState((s) => {
        const list = which === "selected" ? s.tagSelected : s.tagExcluded
        const other = which === "selected" ? s.tagExcluded : s.tagSelected
        // Toggling on one side removes from the other (a tag can't be both
        // selected AND excluded — ST's three-state semantics).
        const cleanOther = other.filter((t) => t !== tagId)
        const has = list.includes(tagId)
        const cleanList = has ? list.filter((t) => t !== tagId) : [...list, tagId]
        return which === "selected"
          ? { ...s, tagSelected: cleanList, tagExcluded: cleanOther }
          : { ...s, tagExcluded: cleanList, tagSelected: cleanOther }
      }),
    [],
  )
  const clearTags = useCallback(
    () => setState((s) => ({ ...s, tagSelected: [], tagExcluded: [] })),
    [],
  )
  const reset = useCallback(
    () => setState({ ...INITIAL_STATE, sort: initialSort }),
    [initialSort],
  )

  const filtered = useMemo(() => {
    // 1. SEARCH — Fuse.js fuzzy (when searchFields provided) or substring.
    //    Fuse.js: typo-tolerant, weighted by field name. The Fuse instance is
    //    rebuilt per filter cycle — fine for sidebar-sized lists (<500 items).
    //    For larger lists, memoize outside the hook (Phase 3.3).
    let result = items
    const q = state.search.toLowerCase().trim()
    if (q) {
      if (accessor.searchFields) {
        // ── Fuse.js fuzzy path ──
        // Build docs + derive weighted keys from the first doc's field names.
        const docs = result.map((item) => accessor.searchFields!(item))
        const fieldNames = docs.length > 0 ? Object.keys(docs[0]) : []
        const keys = fieldNames.map((name) => ({
          name,
          weight: FIELD_WEIGHTS[name] ?? DEFAULT_FIELD_WEIGHT,
        }))
        const fuse = new Fuse(docs, {
          keys,
          threshold: FUSE_THRESHOLD,
          includeScore: false,
          ignoreLocation: true, // match anywhere in the field (not just start)
        })
        const matches = fuse.search(q)
        // refIndex maps back to the original result array (docs was built from
        // result in the same order). The sort step below re-orders as needed.
        result = matches.map((m) => result[m.refIndex])
      } else {
        // ── Substring fallback (the pre-Phase-3 path) ──
        result = result.filter((item) => {
          const text = (accessor.searchText?.(item) ?? accessor.name(item)).toLowerCase()
          return text.includes(q)
        })
      }
    }

    // 2. TAG — selected (AND: must have ALL) + excluded (NOR: must have NONE).
    //    ST's FILTER_STATES.SELECTED/EXCLUDED pattern. The accessor reads from
    //    the tagMap forward index — O(1) per item via the non-hook tagsOf().
    if (state.tagSelected.length > 0 || state.tagExcluded.length > 0) {
      result = result.filter((item) => {
        const itemTags = new Set(accessor.tags?.(item) ?? [])
        // SELECTED = AND: every selected tag must be present (narrowing).
        for (const t of state.tagSelected) {
          if (!itemTags.has(t)) return false
        }
        // EXCLUDED = NOR: none of the excluded tags may be present (hiding).
        for (const t of state.tagExcluded) {
          if (itemTags.has(t)) return false
        }
        return true
      })
    }

    // 3. PROVENANCE — the agent-generated marker filter.
    if (state.provenance && isProvenance(state.provenance)) {
      result = result.filter(
        (item) => accessor.provenance?.(item) === state.provenance,
      )
    }

    // 3. FAV — favorites/pinned only.
    if (state.favOnly) {
      result = result.filter((item) => accessor.fav?.(item) === true)
    }

    // 4. SORT — driven by the declarative spec.
    const spec = SORT_OPTIONS[state.sort]
    if (spec) {
      const dir = spec.order === "asc" ? 1 : -1
      const sorted = [...result]
      if (spec.order === "random") {
        // Fisher-Yates — stable within a single render.
        for (let i = sorted.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[sorted[i], sorted[j]] = [sorted[j], sorted[i]]
        }
        result = sorted
      } else if (spec.rule === "boolean") {
        sorted.sort((a, b) => {
          // Treat fav=true as the larger value so desc (dir=-1) surfaces it
          // first — same sign convention as the value branch below. The
          // earlier `(bf - af) * dir` had the sign inverted: with dir=-1 it
          // pushed favorites to the back instead of the front.
          const af = accessor.fav?.(a) ? 1 : 0
          const bf = accessor.fav?.(b) ? 1 : 0
          return (af - bf) * dir
        })
        result = sorted
      } else {
        const field = spec.field as "createdAt" | "updatedAt" | "size" | "name"
        const getter = accessor[field] ?? accessor.name
        sorted.sort((a, b) => {
          const av = getter(a)
          const bv = getter(b)
          if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir
          return String(av).localeCompare(String(bv)) * dir
        })
        result = sorted
      }
    }

    return result
  }, [items, state, accessor])

  const counts = useMemo(
    () => ({ total: items.length, shown: filtered.length }),
    [items.length, filtered.length],
  )

  return { state, filtered, counts, actions: { setSearch, setSort, toggleProvenance, toggleFav, toggleTag, clearTags, reset } }
}
