// AppSidebar — the Media drawer: the archive, DERIVED from the run protocol.
//
// An asset is a 1-level flow (R1, 2026-08-06): GET /v1/flows/runs
// returns every run with its flat `artifacts` list, and listMedia()
// (surfaces/library/media.ts) flattens those into MediaAssets. The client
// asset store is gone — the archive is server-derived, read-only here.
// DELETE is SERVER-BACKED
// (DELETE /v1/flows/runs/{run_id} removes the run's dir + sidecar:
// an asset IS a run artifact, so deleting the run deletes its assets).
// What remains: search, sort, download, select (opens the preview
// dialog), delete (trash on tile/row hover), the run-artifact drag
// payload, and "recover generation settings" from the run's params.
import type { AppSidebarProps } from "@melite/contracts"
import { ScrollArea } from "@melite/ui/scroll-area"
import { Badge } from "@melite/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@melite/ui/collapsible"
import { AssetMedia } from "../assets/AssetMedia"
import { FolderOpen, Image, Film, Music, ChevronDown, Download, Wand2, Box, Activity, Search, ArrowUpDown, Trash2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { editorClient } from "@/rpc/editorClient"
import { useToastStore } from "@melite/ui"
import {
 CATEGORY_LABEL, CATEGORY_ORDER, listMedia,
 type MediaAsset, type MediaCategory,
} from "../library/media"
import { useMediaVersion } from "../library/mediaVersion"
import { useHiddenRuns } from "../library/hiddenRuns"
import { useListFilter, SORT_OPTIONS } from "@melite/ui"
import { RowAction, SearchInput, ListLoading, ListEmpty, ListError, VirtualList, SIDEBAR_TILE_PX } from "@/components/ui/listKit"
import { TagStrip, TagPicker, TagFilterBar } from "@/components/ui/tagKit"
import { tagsOf, useTagMap } from "@melite/catalog"

// Category glyphs. Video gets Film — NOT a second Image (the old copy of
// the images icon made the two sections read as duplicates); audio keeps
// the music-note glyph for every TTS/voice/sfx/music artifact.
const ICONS: Record<MediaCategory, typeof Image> = {
 image: Image, audio: Music, video: Film, mesh: Box, motion: Activity, other: FolderOpen,
}

// Media exposes a SUBSET of the declarative sort vocabulary (the 5 that make
// sense for assets — no "recent"/updatedAt, no "favorites"/fav). The keys +
// labels come from config/editor/list_filters.json via SORT_OPTIONS; this
// array just picks which ones to surface in the dropdown. Adding a sort option
// is a JSON edit, not a per-sidebar code change.
const MEDIA_SORT_KEYS = ["newest", "oldest", "name-az", "name-za", "largest"] as const

// Tile grid sizing (2026-08-22): tiles are FIXED-SIZE — the old rail's
// (256 − p-2×2 − gap-1)/2 = 118px — and NEVER resize with the panel. Extra
// width becomes MORE COLUMNS (stack more next to each other when there is
// room), not bigger icons. Grid padding p-2×2 = 16, gap-1 = 4. The constant
// lives in listKit (SIDEBAR_TILE_PX) — TileGrid applies the same law to the
// non-virtualized grids (LibrarySidebar) from ONE definition site.
const TILE_W = SIDEBAR_TILE_PX
const GRID_PAD = 16
const GRID_GAP = 4
/** Columns that fit the viewport at the fixed tile size (≥2, the rail's). */
function tileColumns(viewport: HTMLElement | null): number {
 const w = viewport?.clientWidth ?? 256
 return Math.max(2, Math.floor((w - GRID_PAD + GRID_GAP) / (TILE_W + GRID_GAP)))
}
// Row height for the virtualizer: aspect-square tiles at the FIXED width
// (+ the row's vertical padding pt-1/pb-2 = 12px) — a constant now, so the
// estimate is exact; measureElement still self-corrects.
function estimateTileRow(_viewport: HTMLElement | null): number {
 return TILE_W + 12
}

// Compact icon-row estimate: text-xs (16) + py-1 (8) + the row wrapper's
// pb-1/pt-0.5 (6). Same measureElement self-correction applies.
const ASSET_ROW_ESTIMATE = 30

export function AppSidebar({ open, onToggle, onSelectAsset, onOpenRun }: AppSidebarProps) {
 return (
 <>
 {open && (
 <div className="hidden md:block w-64 shrink-0">
 <SidebarBody onSelectAsset={onSelectAsset} onOpenRun={onOpenRun} />
 </div>
 )}
 {open && (
 <div className="fixed inset-0 z-50 md:hidden">
 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onToggle} />
 <div className="fixed left-0 top-0 bottom-0 w-64 shadow-2xl">
 <SidebarBody onSelectAsset={onSelectAsset} onOpenRun={onOpenRun} />
 </div>
 </div>
 )}
 </>
 )
}

export function SidebarBody({ onSelectAsset, onOpenRun }: { onSelectAsset?: (a: MediaAsset) => void; onOpenRun?: (a: MediaAsset) => void }) {
 // The archive is fetched fresh whenever the drawer opens (it's mounted
 // conditionally). No store to keep in sync — the run protocol is the
 // single source of truth. mediaVersion bumps when a run lands "done" →
 // re-fetch so a freshly-generated image appears WITHOUT a toggle.
 const mediaVersion = useMediaVersion((s) => s.version)
 // HIDDEN-RUNS FILTER (2026-08-12): cards with saveToAssets === false
 // add their runId to the hiddenRuns store; the sidebar filters those
 // runs out so intermediate / throwaway generations don't clog the
 // library. ``hiddenVersion`` re-renders the filter immediately on
 // toggle (before the next mediaVersion bump).
 const hiddenRunIds = useHiddenRuns((s) => s.hiddenRunIds)
 const hiddenVersion = useHiddenRuns((s) => s.version)
  const [media, setMedia] = useState<MediaAsset[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // DELETED-RUN GUARD (2026-08-14): runIds deleted during THIS mount. Delete
  // is server-backed; the mediaVersion bump refetches /v1/flows/runs.
  // That refetch can land with a STALE list — apiFetch dedups an in-flight
  // GET on the same URL (lib/api.ts), or the race simply loses — which
  // RESURRECTS the just-deleted run. The server already removed it, so every
  // later delete of that tile 404s ("Run not found") and the tile is stuck
  // forever. Filtering the set out of every setMedia makes the delete
  // authoritative for this mount; the next mount re-reads the server truth.
  const deletedRunIds = useRef<Set<string>>(new Set())
  const load = useCallback(async () => {
    setError(null)
    try {
      const all = await listMedia()
      setMedia(deletedRunIds.current.size
        ? all.filter((a) => !deletedRunIds.current.has(a.runId))
        : all)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load media")
      setMedia([])
    }
  }, [])
 useEffect(() => { load() }, [load, mediaVersion, hiddenVersion])

 // Apply the hidden-runs filter BEFORE the list-filter engine so search,
 // sort, + category grouping all operate on the already-filtered set.
 // ``hiddenRunIds.size === 0`` is the fast path (no allocation — every
 // run is shown, the common case).
 const visibleMedia = useMemo(
 () => (hiddenRunIds.size === 0 ? (media ?? []) : (media ?? []).filter((a) => !hiddenRunIds.has(a.runId))),
 [media, hiddenRunIds, hiddenVersion],
 )

 const [sortOpen, setSortOpen] = useState(false)


 // The shared scroll container — VirtualList instances (one per open
 // category) all window against this same viewport.
 const viewportRef = useRef<HTMLDivElement>(null)
 // Columns at the FIXED tile size — re-chunked when the viewport resizes
 // (the DSH panel is user-draggable; the editor rail never changes, so
 // the observer simply never fires there).
 const [cols, setCols] = useState(2)
 useEffect(() => {
 const el = viewportRef.current
 if (el === null) return
 setCols(tileColumns(el))
 const ro = new ResizeObserver(() => { setCols(tileColumns(el)) })
 ro.observe(el)
 return () => { ro.disconnect() }
 }, [])

 const handleDownload = (a: MediaAsset) => {
 const link = document.createElement("a")
 link.href = a.url
 link.download = a.name
 link.click()
 }

  // Delete = DELETE the RUN server-side (the archive is server-derived —
  // an asset IS a run artifact; deleting the run removes all its artifacts
  // from the server). The run protocol persists everything, so a delete
  // that never left the browser would LIE. NO confirm popup (2026-08-14:
  // the user deletes directly — "delete the popup"), then drop the run's
  // assets from the local list + bump mediaVersion so every other derived
  // view (provenance badges, dialog) recounts. The run-protocol delete is
  // recoverable (trash/recycle is out of scope here) — the trash button
  // IS the affordance, and a 400/404 refusal surfaces as a toast.
  const handleDelete = useCallback(async (a: MediaAsset) => {
    try {
      const res = await editorClient.deleteRun(a.runId)
      if ("error" in res) {
        // Idempotent delete (2026-08-14): a not-found IS success — the run
        // is already gone server-side (the stale-refetch race deleted it
        // earlier), so the tile must vanish, not stick. not-found is the
        // ONLY error treated as success; a still-running 400 still toasts
        // and keeps the tile (stop it first).
        if (res.code === "not-found") {
          deletedRunIds.current.add(a.runId)
          setMedia((m) => (m ? m.filter((x) => x.runId !== a.runId) : m))
          useMediaVersion.getState().bump()
          return
        }
        useToastStore.getState().addToast("error", String(res.error))
        return
      }
      deletedRunIds.current.add(a.runId)
      setMedia((m) => (m ? m.filter((x) => x.runId !== a.runId) : m))
      useMediaVersion.getState().bump()
    } catch (e) {
      useToastStore.getState().addToast("error", e instanceof Error ? e.message : "Delete failed")
    }
  }, [])

 // ── Filter + sort via the shared engine ─────────────────────────────────
 // ONE useListFilter call on the flat media list; category grouping happens
 // AFTER (in the render loop) and preserves the sort order within each group
 // (Array.prototype.filter is stable). Search/sort/tag state lives in the
 // hook — the hook is the single definition of those mechanics.
 //
 // TAG integration (Phase 2): the `tags` accessor reads the forward index
 // via the non-hook tagsOf() helper (O(1), no re-subscribe per item). The
 // `searchText` extends search to include tag NAMES so typing "portrait"
 // finds items tagged portrait even if the filename doesn't match.
 const tagNames = useTagMap((s) => s.tags)
 const list = useListFilter(
 visibleMedia,
 {
 id: (a) => a.id,
 name: (a) => a.name,
 createdAt: (a) => a.createdAt,
 size: (a) => a.size,
 tags: (a) => tagsOf(a.id),
 searchFields: (a) => ({
 name: a.name,
 tags: tagsOf(a.id).map((id) => tagNames[id]?.name).filter(Boolean).join(" "),
 }),
 },
 { initialSort: "newest" },
 )

 return (
 <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
 {/* Header */}
 <div className="flex items-center px-3 h-12 border-b border-sidebar-border/70 bg-sidebar">
 <div className="flex flex-col leading-none">
 <span className="text-[11px] font-semibold tracking-[0.22em]">MEDIA</span>
 <span className="mt-0.5 text-[9px] text-muted-foreground/70">{visibleMedia.length} {visibleMedia.length === 1 ? "item" : "items"}</span>
 </div>
 </div>

 {/* Search + Sort + Tag filter */}
 {visibleMedia.length > 0 && (
 <div className="space-y-1.5 px-2.5 py-2 border-b border-sidebar-border/70">
 <div className="flex gap-1.5">
 <div className="flex-1">
 <SearchInput
 value={list.state.search}
 onChange={list.actions.setSearch}
 placeholder="Search…"
 icon={Search}
 />
 </div>
 <div className="relative">
 <button onClick={() => setSortOpen((o) => !o)}
 className="flex h-7 items-center gap-1 rounded-md border border-sidebar-border/60 bg-sidebar-accent/30 px-1.5 text-[10px] text-muted-foreground/70 hover:text-sidebar-foreground hover:border-brand/40 transition-colors">
 <ArrowUpDown className="h-3 w-3" />
 </button>
 {sortOpen && (
 <>
 <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
 <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-sidebar-border bg-popover shadow-lg py-1">
 {MEDIA_SORT_KEYS.map((key) => (
 <button key={key} onClick={() => { list.actions.setSort(key); setSortOpen(false) }}
 className={`w-full px-3 py-1.5 text-left text-[11px] transition-colors hover:bg-sidebar-accent ${list.state.sort === key ? "text-brand font-medium" : "text-sidebar-foreground/70"}`}>
 {SORT_OPTIONS[key].label}
 </button>
 ))}
 </div>
 </>
 )}
 </div>
 </div>
 {/* Tag filter — selected/excluded chips + the add-tag dropdown.
 Hidden until the user creates their first tag (TagFilterBar
 returns null when the registry is empty). */}
 <TagFilterBar
 state={list.state}
 onToggle={list.actions.toggleTag}
 onClear={list.actions.clearTags}
 />
 </div>
 )}

 {/* Category list — virtualization replaces pagination: the DOM holds
 only the visible window per open category (VirtualList), so a
 category with hundreds of assets scrolls continuously instead of
 paging 20/50 at a time. */}
 <ScrollArea viewportRef={viewportRef} className="flex-1 scrollbar-thin">
 {media === null ? (
 <ListLoading title="Loading media…" />
 ) : error ? (
 <ListError message={error} onRetry={load} />
 ) : visibleMedia.length === 0 ? (
 <ListEmpty
 icon={FolderOpen}
 title={hiddenRunIds.size > 0 ? "All media hidden." : "No media yet."}
 hint={hiddenRunIds.size > 0
 ? "Toggle “Save to assets” on a card to unhide its output."
 : "Every run's artifacts land here."}
 />
 ) : list.filtered.length === 0 ? (
 <ListEmpty title="No matches." hint="Try a different search." />
 ) : (
 CATEGORY_ORDER.map((cat) => {
 // Category grouping runs AFTER the hook's search+sort (stable
 // filter preserves within-group order). allItems is the full
 // category; filtered is search-narrowed + sorted by the hook.
 const filtered = list.filtered.filter((a) => a.category === cat)
 if (filtered.length === 0) return null
 const Icon = ICONS[cat]
 // Image / video / mesh / motion get visual tiles; audio + "other"
 // render as compact icon rows.
 const isTile = cat === "image" || cat === "video" || cat === "mesh" || cat === "motion"

 return (
 // 2026-08-27 (rev 2): categories COLLAPSED by default — operator verdict:
 // "media is just the video slop, not the nice categories like before".
 // Open-by-default booted into a tile wall (hundreds of run artifacts in
 // the face); the categorical read IS the header row (label + count) per
 // section, expand on demand. Counts shrink as test-run slop gets purged.
 <Collapsible key={cat} defaultOpen={false} className="group/collapsible">
 <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
 <span className="h-1 w-1 rounded-full bg-brand/60" />
 <Icon className="h-3.5 w-3.5" />
 <span className="flex-1 text-left tracking-tight">{CATEGORY_LABEL[cat]}</span>
 <Badge variant="secondary" className="h-4 min-w-4 px-1 justify-center text-[10px] tabular-nums">{filtered.length}</Badge>
 <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-data-[panel-open]/collapsible:rotate-180" />
 </CollapsibleTrigger>
 <CollapsibleContent>
 {isTile ? (
 // Tiles: virtualize ROWS of the 2-col grid (each virtual
 // item is one grid row of ≤2 tiles) — the grid itself is
 // untouched, only the DOM is windowed.
 (() => {
 const rows: MediaAsset[][] = []
 for (let i = 0; i < filtered.length; i += cols) rows.push(filtered.slice(i, i + cols))
 return (
 <VirtualList
 items={rows}
 parentRef={viewportRef}
 estimateSize={() => estimateTileRow(viewportRef.current)}
 render={(row) => (
 <div className="grid gap-1 p-2 pt-1" style={{ gridTemplateColumns: `repeat(${cols}, ${TILE_W}px)` }}>
 {row.map((a) => (
 <AssetTile key={a.id} a={a}
 onSelectAsset={onSelectAsset}
 onDownload={handleDownload}
 onDelete={handleDelete}
 onOpenRun={onOpenRun ? () => onOpenRun(a) : undefined} />
 ))}
 </div>
 )}
 />
 )
 })()
 ) : (
 <VirtualList
 items={filtered}
 parentRef={viewportRef}
 estimateSize={() => ASSET_ROW_ESTIMATE}
 render={(a) => (
 <div className="px-2 pb-1 pt-0.5">
 <AssetRow key={a.id} a={a} Icon={Icon}
 onSelectAsset={onSelectAsset} onDownload={handleDownload} onDelete={handleDelete} />
 </div>
 )}
 />
 )}
 </CollapsibleContent>
 </Collapsible>
 )
 })
 )}
 </ScrollArea>
 </div>
 )
}

const DRAG_MIME = "application/tech-noir-asset"
function dragPayload(a: MediaAsset) {
 return JSON.stringify({ url: a.url, type: a.type, name: a.name, id: a.id })
}

function AssetTile({ a, onSelectAsset, onDownload, onDelete, onOpenRun }: {
 a: MediaAsset
 onSelectAsset?: (a: MediaAsset) => void
 onDownload: (a: MediaAsset) => void
 onDelete?: (a: MediaAsset) => void
 onOpenRun?: () => void
}) {
 return (
 <div className="group/item relative cursor-pointer overflow-hidden rounded-lg border border-sidebar-border/60 bg-sidebar-accent/30 transition-all hover:border-brand/40 hover:ring-1 hover:ring-brand/30"
 onClick={() => onSelectAsset?.(a)}
 draggable onDragStart={(e) => { e.dataTransfer.setData(DRAG_MIME, dragPayload(a)) }}>
 <AssetMedia asset={a} mode="tile" className="pointer-events-none w-full aspect-square object-cover bg-sidebar-accent/40" />
 <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-1.5 pt-3 pb-0.5">
 {/* Tag dots — sit ABOVE the name in the gradient overlay. Null when
 untagged, so the name sits flush at the bottom as before. */}
 <TagStrip itemKey={a.id} />
 <span className="block truncate text-[9px] text-foreground/90">{a.name}</span>
 </div>
 <div className="absolute top-1 right-1 hidden group-hover/item:flex gap-0.5">
 {onOpenRun && (
 <RowAction variant="tile" onClick={(e) => { e.stopPropagation(); onOpenRun() }} title="Replace flow with this run"><Wand2 className="h-3 w-3" /></RowAction>
 )}
 <RowAction variant="tile" onClick={(e) => { e.stopPropagation(); onDownload(a) }} title="Download"><Download className="h-3 w-3" /></RowAction>
 {onDelete && (
 <RowAction variant="tile" danger onClick={(e) => { e.stopPropagation(); onDelete(a) }} title="Delete"><Trash2 className="h-3 w-3" /></RowAction>
 )}
 {/* Tag editor — opens the TagPicker popover for this item. Tile
 variant matches the sibling RowActions (dark translucent) so the
 tag icon isn't the one faded button in the hover layer. */}
 <TagPicker itemKey={a.id} variant="tile" />
 </div>
 </div>
 )
}

function AssetRow({ a, Icon, onSelectAsset, onDownload, onDelete }: {
 a: MediaAsset; Icon: typeof Image
 onSelectAsset?: (a: MediaAsset) => void
 onDownload: (a: MediaAsset) => void
 onDelete?: (a: MediaAsset) => void
}) {
 return (
 <div className="group/item flex items-center gap-2 px-2 py-1 rounded-md text-xs hover:bg-sidebar-accent cursor-pointer transition-colors"
 onClick={() => onSelectAsset?.(a)}
 draggable onDragStart={(e) => { e.dataTransfer.setData(DRAG_MIME, dragPayload(a)) }}>
 <Icon className="h-3.5 w-3.5 shrink-0 text-brand/70" />
 <span className="flex-1 truncate">{a.name}</span>
 {/* Tag dots inline — subtle, only visible when tagged. */}
 <TagStrip itemKey={a.id} />
 <div className="hidden group-hover/item:flex gap-0.5 shrink-0">
 <RowAction onClick={(e) => { e.stopPropagation(); onDownload(a) }} title="Download"><Download className="h-3 w-3" /></RowAction>
 {onDelete && (
 <RowAction danger onClick={(e) => { e.stopPropagation(); onDelete(a) }} title="Delete"><Trash2 className="h-3 w-3" /></RowAction>
 )}
 <TagPicker itemKey={a.id} />
 </div>
 </div>
 )
}
