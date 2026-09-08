/**
 * useListFilter — the ONE list filter/sort/search engine contract.
 *
 * This test pins the engine that every sidebar (History, AppSidebar/Media,
 * Library, Services) will share. It proves:
 *   1. SEARCH — substring over name + searchText accessor
 *   2. SORT — all 7 declarative options (newest/oldest/recent/name-az/
 *      name-za/favorites/largest), driven by the JSON spec
 *   3. PROVENANCE — the agent-generated marker filter (toggle on/off)
 *   4. FAV — favorites/pinned only
 *   5. COMPOSITION — search + filter + sort applied together
 *   6. RESET — returns to the initial state
 *   7. COUNTS — {total, shown} reflect the flow
 *
 * TWIN-TEST: SORT_OPTIONS (TS) is pinned against
 * config/editor/list_filters.json :: sort_options (the SSOT, validated by the
 * pydantic ratchet in backend/core/ui/list_filter_schema.py). If someone
 * edits the JSON without mirroring here (or vice versa), this test fails —
 * same discipline as provenance-badge.test.tsx.
 */
import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { useListFilter, SORT_OPTIONS } from "@melite/ui"
import { Provenance } from "@melite/contracts"
// ── Test domain model ────────────────────────────────────────────────────
interface Thing {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  size: number
  fav: boolean
  provenance?: Provenance
  tags?: string[]
}

const ITEMS: Thing[] = [
  { id: "a", name: "Zebra",  createdAt: 100, updatedAt: 500, size: 10, fav: false, provenance: "agent",    tags: ["animal", "wild"] },
  { id: "b", name: "Apple",  createdAt: 200, updatedAt: 400, size: 30, fav: true,  provenance: "user",     tags: ["fruit", "sweet"] },
  { id: "c", name: "Mango",  createdAt: 300, updatedAt: 300, size: 20, fav: false, provenance: "imported", tags: ["fruit"] },
  { id: "d", name: "Beta",   createdAt: 400, updatedAt: 200, size: 50, fav: true,  provenance: "agent",    tags: ["wild"] },
  { id: "e", name: "Alpha",  createdAt: 500, updatedAt: 100, size: 40, fav: false, provenance: undefined },
]

const accessor = {
  id: (t: Thing) => t.id,
  name: (t: Thing) => t.name,
  createdAt: (t: Thing) => t.createdAt,
  updatedAt: (t: Thing) => t.updatedAt,
  size: (t: Thing) => t.size,
  fav: (t: Thing) => t.fav,
  provenance: (t: Thing) => t.provenance,
  tags: (t: Thing) => t.tags ?? [],
  searchText: (t: Thing) => `${t.name} ${(t.tags ?? []).join(" ")}`,
}

function renderList(opts?: { initialSort?: string }) {
  return renderHook(() => useListFilter(ITEMS, accessor, opts), {
    // initialProps isn't needed; we re-render by changing ITEMS via rerender.
  })
}

// ── Twin-test: SORT_OPTIONS (TS) == sort_options (JSON SSOT) ─────────────
describe("SORT_OPTIONS twin-test (TS mirror ↔ JSON SSOT)", () => {
  it("reads the declarative JSON spec from disk", () => {
    const path = resolve(__dirname, "../../../../../web/ui/src/list_filters.json")
    const raw = readFileSync(path, "utf8")
    expect(() => JSON.parse(raw)).not.toThrow()
  })

  it("has the SAME keys as the JSON sort_options", () => {
    const path = resolve(__dirname, "../../../../../web/ui/src/list_filters.json")
    const json = JSON.parse(readFileSync(path, "utf8"))
    const jsonKeys = Object.keys(json.sort_options).sort()
    const tsKeys = Object.keys(SORT_OPTIONS).sort()
    expect(tsKeys).toEqual(jsonKeys)
  })

  it("each TS entry matches the JSON {field, order, rule, label}", () => {
    const path = resolve(__dirname, "../../../../../web/ui/src/list_filters.json")
    const json = JSON.parse(readFileSync(path, "utf8"))
    for (const [key, expected] of Object.entries(json.sort_options)) {
      const actual = SORT_OPTIONS[key]
      expect(actual, `sort option "${key}"`).toBeDefined()
      // The JSON keys under each option are validated by the pydantic schema;
      // we assert field/order/rule/label match exactly.
      expect(actual.field).toBe((expected as any).field)
      expect(actual.order).toBe((expected as any).order)
      expect(actual.rule).toBe((expected as any).rule)
      expect(actual.label).toBe((expected as any).label)
    }
  })

  it("has exactly the 7 options the JSON declares", () => {
    const keys = Object.keys(SORT_OPTIONS)
    expect(keys).toHaveLength(7)
    expect(keys).toEqual(
      expect.arrayContaining([
        "newest", "oldest", "recent", "name-az", "name-za", "favorites", "largest",
      ]),
    )
  })
})

// ── SEARCH ───────────────────────────────────────────────────────────────
describe("useListFilter — search", () => {
  it("returns all items when search is empty", () => {
    const { result } = renderList()
    expect(result.current.filtered).toHaveLength(5)
  })

  it("matches on the name field", () => {
    const { result } = renderList()
    act(() => result.current.actions.setSearch("mango"))
    expect(result.current.filtered.map((t) => t.id)).toEqual(["c"])
  })

  it("matches on the searchText accessor (tags)", () => {
    const { result } = renderList()
    act(() => result.current.actions.setSearch("fruit"))
    expect(result.current.filtered.map((t) => t.id).sort()).toEqual(["b", "c"])
  })

  it("search is case-insensitive", () => {
    const { result } = renderList()
    act(() => result.current.actions.setSearch("MANGO"))
    expect(result.current.filtered.map((t) => t.id)).toEqual(["c"])
  })

  it("search with no matches returns empty + updates counts", () => {
    const { result } = renderList()
    act(() => result.current.actions.setSearch("zzz"))
    expect(result.current.filtered).toEqual([])
    expect(result.current.counts).toEqual({ total: 5, shown: 0 })
  })
})

// ── SORT ─────────────────────────────────────────────────────────────────
describe("useListFilter — sort (driven by SORT_OPTIONS)", () => {
  it("newest — createdAt desc", () => {
    const { result } = renderList({ initialSort: "newest" })
    expect(result.current.filtered.map((t) => t.id)).toEqual(["e", "d", "c", "b", "a"])
  })

  it("oldest — createdAt asc", () => {
    const { result } = renderList({ initialSort: "oldest" })
    expect(result.current.filtered.map((t) => t.id)).toEqual(["a", "b", "c", "d", "e"])
  })

  it("recent — updatedAt desc (the default)", () => {
    const { result } = renderList()
    expect(result.current.state.sort).toBe("recent")
    expect(result.current.filtered.map((t) => t.id)).toEqual(["a", "b", "c", "d", "e"])
  })

  it("name-az — name asc", () => {
    const { result } = renderList({ initialSort: "name-az" })
    expect(result.current.filtered.map((t) => t.id)).toEqual(["e", "b", "d", "c", "a"])
  })

  it("name-za — name desc", () => {
    const { result } = renderList({ initialSort: "name-za" })
    expect(result.current.filtered.map((t) => t.id)).toEqual(["a", "c", "d", "b", "e"])
  })

  it("favorites — fav first (boolean rule)", () => {
    const { result } = renderList({ initialSort: "favorites" })
    const ids = result.current.filtered.map((t) => t.id)
    // b and d are fav=true; they come first (stable order within the group
    // is not guaranteed, so we check membership of the first two as a set).
    expect(new Set(ids.slice(0, 2))).toEqual(new Set(["b", "d"]))
    expect(new Set(ids.slice(2))).toEqual(new Set(["a", "c", "e"]))
  })

  it("largest — size desc", () => {
    const { result } = renderList({ initialSort: "largest" })
    expect(result.current.filtered.map((t) => t.id)).toEqual(["d", "e", "b", "c", "a"])
  })

  it("setSort changes the sort at runtime", () => {
    const { result } = renderList({ initialSort: "newest" })
    act(() => result.current.actions.setSort("name-az"))
    expect(result.current.state.sort).toBe("name-az")
    expect(result.current.filtered.map((t) => t.id)).toEqual(["e", "b", "d", "c", "a"])
  })
})

// ── PROVENANCE (the agent-generated marker filter) ───────────────────────
describe("useListFilter — provenance", () => {
  it("toggleProvenance(agent) shows only agent items", () => {
    const { result } = renderList()
    act(() => result.current.actions.toggleProvenance("agent"))
    expect(result.current.filtered.map((t) => t.id).sort()).toEqual(["a", "d"])
    expect(result.current.state.provenance).toBe("agent")
  })

  it("toggleProvenance(agent) twice clears the filter", () => {
    const { result } = renderList()
    act(() => result.current.actions.toggleProvenance("agent"))
    act(() => result.current.actions.toggleProvenance("agent"))
    expect(result.current.state.provenance).toBeNull()
    expect(result.current.filtered).toHaveLength(5)
  })

  it("toggleProvenance switches between values exclusively", () => {
    const { result } = renderList()
    act(() => result.current.actions.toggleProvenance("agent"))
    expect(result.current.state.provenance).toBe("agent")
    act(() => result.current.actions.toggleProvenance("imported"))
    expect(result.current.state.provenance).toBe("imported")
    expect(result.current.filtered.map((t) => t.id)).toEqual(["c"])
  })

  it("undefined provenance items are excluded when any provenance filter is on", () => {
    const { result } = renderList()
    act(() => result.current.actions.toggleProvenance("user"))
    // Only item e has provenance===undefined; it must NOT appear.
    expect(result.current.filtered.map((t) => t.id)).toEqual(["b"])
  })
})

// ── FAV ──────────────────────────────────────────────────────────────────
describe("useListFilter — favorites", () => {
  it("toggleFav shows only fav items", () => {
    const { result } = renderList()
    act(() => result.current.actions.toggleFav())
    expect(result.current.state.favOnly).toBe(true)
    expect(result.current.filtered.map((t) => t.id).sort()).toEqual(["b", "d"])
  })

  it("toggleFav twice clears the filter", () => {
    const { result } = renderList()
    act(() => result.current.actions.toggleFav())
    act(() => result.current.actions.toggleFav())
    expect(result.current.state.favOnly).toBe(false)
    expect(result.current.filtered).toHaveLength(5)
  })
})

// ── COMPOSITION ──────────────────────────────────────────────────────────
describe("useListFilter — composition", () => {
  it("search + provenance + sort compose", () => {
    const { result } = renderList({ initialSort: "name-az" })
    // "bet" uniquely matches Beta among all items; Beta is agent-provenanced.
    act(() => result.current.actions.setSearch("bet"))
    act(() => result.current.actions.toggleProvenance("agent"))
    expect(result.current.filtered.map((t) => t.id)).toEqual(["d"])
    expect(result.current.counts).toEqual({ total: 5, shown: 1 })
  })

  it("fav + search compose", () => {
    const { result } = renderList()
    act(() => result.current.actions.toggleFav())
    // "bet" matches Beta (fav=true); the other fav is Apple but it doesn't
    // contain "bet". Provenance is not involved here.
    act(() => result.current.actions.setSearch("bet"))
    expect(result.current.filtered.map((t) => t.id)).toEqual(["d"])
  })
})

// ── RESET + COUNTS ───────────────────────────────────────────────────────
describe("useListFilter — reset + counts", () => {
  it("reset clears search, provenance, favOnly but keeps sort", () => {
    const { result } = renderList({ initialSort: "name-az" })
    act(() => {
      result.current.actions.setSearch("a")
      result.current.actions.toggleProvenance("agent")
      result.current.actions.toggleFav()
    })
    act(() => result.current.actions.reset())
    expect(result.current.state.search).toBe("")
    expect(result.current.state.provenance).toBeNull()
    expect(result.current.state.favOnly).toBe(false)
    // sort persists — reset is about filters, not the sort view.
    expect(result.current.state.sort).toBe("name-az")
    expect(result.current.filtered).toHaveLength(5)
  })

  it("counts reflect total (input) vs shown (filtered)", () => {
    const { result } = renderList()
    expect(result.current.counts).toEqual({ total: 5, shown: 5 })
    act(() => result.current.actions.setSearch("mango"))
    expect(result.current.counts).toEqual({ total: 5, shown: 1 })
  })
})

// ── TAG (selected AND / excluded NOR) ────────────────────────────────────
// Tag layout in ITEMS (after the Phase 2 update):
//   a (Zebra)  → ["animal", "wild"]
//   b (Apple)  → ["fruit", "sweet"]
//   c (Mango)  → ["fruit"]
//   d (Beta)   → ["wild"]
//   e (Alpha)  → [] (untagged)
describe("useListFilter — tags", () => {
  it("selected (single) narrows to items with that tag", () => {
    const { result } = renderList()
    act(() => result.current.actions.toggleTag("fruit", "selected"))
    expect(result.current.state.tagSelected).toEqual(["fruit"])
    expect(result.current.filtered.map((t) => t.id).sort()).toEqual(["b", "c"])
  })

  it("selected (AND) — must have ALL selected tags", () => {
    const { result } = renderList()
    act(() => result.current.actions.toggleTag("fruit", "selected"))
    act(() => result.current.actions.toggleTag("sweet", "selected"))
    // Only Apple has BOTH fruit AND sweet.
    expect(result.current.filtered.map((t) => t.id)).toEqual(["b"])
  })

  it("excluded hides items with that tag", () => {
    const { result } = renderList()
    act(() => result.current.actions.toggleTag("fruit", "excluded"))
    // a, d, e don't have "fruit"; b, c are hidden.
    expect(result.current.filtered.map((t) => t.id).sort()).toEqual(["a", "d", "e"])
  })

  it("excluded (NOR) — hides if ANY excluded tag is present", () => {
    const { result } = renderList()
    act(() => result.current.actions.toggleTag("fruit", "excluded"))
    act(() => result.current.actions.toggleTag("wild", "excluded"))
    // Only e (Alpha, untagged) survives — a has wild, b/c have fruit, d has wild.
    expect(result.current.filtered.map((t) => t.id)).toEqual(["e"])
  })

  it("selected + excluded compose (has fruit, but NOT sweet)", () => {
    const { result } = renderList()
    act(() => result.current.actions.toggleTag("fruit", "selected"))
    act(() => result.current.actions.toggleTag("sweet", "excluded"))
    // b has fruit but ALSO sweet → excluded. c has fruit, no sweet → survives.
    expect(result.current.filtered.map((t) => t.id)).toEqual(["c"])
  })

  it("toggleTag cycles selected → off (three-state)", () => {
    const { result } = renderList()
    act(() => result.current.actions.toggleTag("fruit", "selected"))
    expect(result.current.state.tagSelected).toEqual(["fruit"])
    act(() => result.current.actions.toggleTag("fruit", "selected"))
    expect(result.current.state.tagSelected).toEqual([])
  })

  it("a tag can't be both selected AND excluded (toggle moves it)", () => {
    const { result } = renderList()
    act(() => result.current.actions.toggleTag("fruit", "selected"))
    act(() => result.current.actions.toggleTag("fruit", "excluded"))
    // Moved from selected to excluded — not in both.
    expect(result.current.state.tagSelected).toEqual([])
    expect(result.current.state.tagExcluded).toEqual(["fruit"])
  })

  it("untagged items pass when no tag filter is active", () => {
    const { result } = renderList()
    // e is untagged; with no filter it's included.
    expect(result.current.filtered.map((t) => t.id)).toContain("e")
  })

  it("clearTags empties both selected and excluded", () => {
    const { result } = renderList()
    act(() => result.current.actions.toggleTag("fruit", "selected"))
    act(() => result.current.actions.toggleTag("wild", "excluded"))
    act(() => result.current.actions.clearTags())
    expect(result.current.state.tagSelected).toEqual([])
    expect(result.current.state.tagExcluded).toEqual([])
    expect(result.current.filtered).toHaveLength(5)
  })

  it("tags compose with search + provenance", () => {
    const { result } = renderList({ initialSort: "name-az" })
    act(() => result.current.actions.setSearch("a")) // matches Zebra, Apple, Mango, Beta, Alpha
    act(() => result.current.actions.toggleTag("wild", "selected")) // a, d have wild
    act(() => result.current.actions.toggleProvenance("agent")) // a, d are agent
    // Among agent items with "wild" tag: a (Zebra, animal+wild) and d (Beta, wild).
    // Sorted name-az: Beta(d) < Zebra(a).
    expect(result.current.filtered.map((t) => t.id)).toEqual(["d", "a"])
    expect(result.current.counts).toEqual({ total: 5, shown: 2 })
  })

  it("reset clears tag filters but keeps sort", () => {
    const { result } = renderList({ initialSort: "name-az" })
    act(() => {
      result.current.actions.toggleTag("fruit", "selected")
      result.current.actions.toggleTag("wild", "excluded")
    })
    act(() => result.current.actions.reset())
    expect(result.current.state.tagSelected).toEqual([])
    expect(result.current.state.tagExcluded).toEqual([])
    expect(result.current.state.sort).toBe("name-az")
    expect(result.current.filtered).toHaveLength(5)
  })
})

// ── FUZZY SEARCH (Fuse.js — Phase 3.1) ───────────────────────────────────
// When the accessor provides `searchFields`, the hook uses Fuse.js
// typo-tolerant weighted matching instead of substring. This test suite
// pins: typo tolerance, weighted ranking, the substring fallback, and the
// composition with sort/tag filters.

// A separate accessor that provides searchFields (the Fuse path).
const fuzzyAccessor = {
  ...accessor,
  searchFields: (t: Thing) => ({
    name: t.name,
    tags: (t.tags ?? []).join(" "),
  }),
}

function renderFuzzy(opts?: { initialSort?: string }) {
  return renderHook(() => useListFilter(ITEMS, fuzzyAccessor, opts))
}

describe("useListFilter — fuzzy search (Fuse.js)", () => {
  it("still matches exact substrings (backwards-compatible)", () => {
    const { result } = renderFuzzy()
    act(() => result.current.actions.setSearch("mango"))
    expect(result.current.filtered.map((t) => t.id)).toEqual(["c"])
  })

  it("tolerates typos (fuzzy match)", () => {
    const { result } = renderFuzzy()
    // "mngo" should still match "Mango" via fuzzy.
    act(() => result.current.actions.setSearch("mngo"))
    const ids = result.current.filtered.map((t) => t.id)
    expect(ids).toContain("c")
  })

  it("tolerates missing characters (prefix fuzzy)", () => {
    const { result } = renderFuzzy()
    // "zep" should match "Zebra".
    act(() => result.current.actions.setSearch("zep"))
    expect(result.current.filtered.map((t) => t.id)).toContain("a")
  })

  it("matches on the tags field, not just name", () => {
    const { result } = renderFuzzy()
    // "fruit" is a tag, not part of any name.
    act(() => result.current.actions.setSearch("fruit"))
    const ids = result.current.filtered.map((t) => t.id).sort()
    expect(ids).toEqual(["b", "c"]) // Apple + Mango have the "fruit" tag
  })

  it("falls back to substring when searchFields is NOT provided", () => {
    // The base `accessor` has no searchFields — uses searchText/name substring.
    const { result } = renderHook(() => useListFilter(ITEMS, accessor))
    // Substring search: "mngo" does NOT contain-match "Mango".
    act(() => result.current.actions.setSearch("mngo"))
    expect(result.current.filtered).toEqual([])
    // But "mango" does (exact substring).
    act(() => result.current.actions.setSearch("mango"))
    expect(result.current.filtered.map((t) => t.id)).toEqual(["c"])
  })

  it("fuzzy composes with tag filter (both narrow)", () => {
    const { result } = renderFuzzy()
    act(() => result.current.actions.setSearch("a"))      // fuzzy: matches many
    act(() => result.current.actions.toggleTag("wild", "selected")) // only a, d have wild
    const ids = result.current.filtered.map((t) => t.id).sort()
    expect(ids).toEqual(["a", "d"])
  })

  it("fuzzy + sort compose (results sorted after fuzzy match)", () => {
    const { result } = renderFuzzy({ initialSort: "name-az" })
    act(() => result.current.actions.setSearch("a")) // matches all (fuzzy on "a")
    // Sort by name-az: Alpha, Apple, Beta, Mango, Zebra.
    expect(result.current.filtered.map((t) => t.id)).toEqual(["e", "b", "d", "c", "a"])
  })
})
