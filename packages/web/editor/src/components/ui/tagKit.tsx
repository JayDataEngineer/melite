// tagKit — the tag presentational family for sidebar list surfaces.
//
// Three components, all reading the tagMap store:
//   <TagBadge>     — the pill (dot + name), compact (dot-only) or full. The
//                    ONE render of a tag everywhere: tile overlays, row strips,
//                    filter chips, the picker list.
//   <TagPicker>    — a popover for adding/removing tags on ONE item. Trigger
//                    is a small + button; the panel lists all tags with
//                    checkboxes + a "create new tag" input.
//   <TagFilterBar> — the filter UI for the useListFilter tag dimension. Shows
//                    selected (solid) + excluded (dimmed) chips; an add dropdown
//                    cycles off → selected → excluded (ST's three-state).
//
// CLOSED SYSTEM: these are the ONLY tag primitives. A surface that needs a new
// tag shape extends this kit, not copies a component. Same discipline as listKit.
import { useState, useRef, useEffect } from "react"
import { Plus, Tag as TagIcon, X, Check, Ban, Pencil, Trash2 } from "lucide-react"
import { cn } from "@melite/ui"
import { Tip } from "@melite/ui/tip"
import { useTagMap, type TagDef, TAG_COLOR_META } from "@melite/catalog"
import type { ListFilterState } from "@melite/ui"

// ── TagBadge — the ONE pill definition ───────────────────────────────────

export function TagBadge({
  tag,
  onRemove,
  onClick,
  compact = false,
  className,
}: {
  tag: TagDef
  /** Render an × button (the remove action for filter chips + editor). */
  onRemove?: () => void
  /** Click handler on the pill body (for filter cycling). When set, the pill
   *  gets a cursor-pointer + hover brightness. */
  onClick?: () => void
  /** Dot-only mode for dense tile overlays. The full pill is for rows + bars. */
  compact?: boolean
  className?: string
}) {
  const meta = TAG_COLOR_META[tag.color] ?? TAG_COLOR_META.brand
  if (compact) {
    return (
      <Tip tip={tag.name}>
        <span
          onClick={onClick}
          aria-label={tag.name}
          className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot, onClick && "cursor-pointer")}
        />
      </Tip>
    )
  }
  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-medium leading-tight transition-colors",
        meta.pill,
        onClick && "cursor-pointer hover:brightness-110",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      <span className="truncate max-w-[80px]">{tag.name}</span>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="shrink-0 hover:brightness-150"
          aria-label={`Remove ${tag.name}`}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  )
}

// ── TagStrip — a row of compact dots (for tile overlays) ─────────────────

export function TagStrip({ itemKey, onClick }: { itemKey: string; onClick?: (tagId: string) => void }) {
  // STABLE-REFERENCE RULE: select `s.map` (the store's object — reference
  // changes only when the store writes), NEVER `s.map[itemKey] ?? []` — the
  // `?? []` would mint a new array per call and loop forever (Zustand's
  // useSyncExternalStore compares snapshots with Object.is: a fresh reference
  // never equals the last one → forced re-render → "Maximum update depth").
  // Derive the per-item value AFTER subscription, in the render body.
  const map = useTagMap((s) => s.map)
  const tags = useTagMap((s) => s.tags)
  const ids = map[itemKey] ?? []
  if (ids.length === 0) return null
  return (
    <div className="flex items-center gap-0.5">
      {ids.map((id) => {
        const def = tags[id]
        if (!def) return null
        return <TagBadge key={id} tag={def} compact onClick={onClick ? () => onClick(id) : undefined} />
      })}
    </div>
  )
}

// ── TagPicker — the add/remove popover for one item ──────────────────────

export function TagPicker({
  itemKey,
  align = "right",
  variant = "row",
}: {
  itemKey: string
  align?: "left" | "right"
  /** "row" (default) — muted, sits in a list row. Matches RowAction's row
   *  variant (`text-muted-foreground/70`). "tile" — dark translucent, sits
   *  over an image preview. Matches RowAction's tile variant
   *  (`bg-black/55 text-foreground/80`) so the tag icon reads against any
   *  backdrop AND matches its sibling RowActions in the same hover layer
   *  (the bug: a faded `text-muted-foreground/70` trigger next to bright
   *  tile RowActions looked washed out). Mirrors RowAction's variant split. */
  variant?: "row" | "tile"
}) {
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState("")
  // Rename mode — per-tag: which id is being renamed + the input value.
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click — matches the AppSidebar sort dropdown pattern.
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // STABLE-REFERENCE RULE (see TagStrip): `s.map` is the stable object; the
  // Set is derived in the render body. `new Set(...)` inside the selector was
  // an infinite re-render loop — every snapshot comparison minted a new Set.
  const tags = useTagMap((s) => s.tags)
  const map = useTagMap((s) => s.map)
  const itemTagIds = new Set(map[itemKey] ?? [])
  const addTagToItem = useTagMap((s) => s.addTagToItem)
  const removeTagFromItem = useTagMap((s) => s.removeTagFromItem)
  const createTag = useTagMap((s) => s.createTag)
  const renameTag = useTagMap((s) => s.renameTag)
  const deleteTag = useTagMap((s) => s.deleteTag)

  const allTags = Object.values(tags).sort((a, b) => a.name.localeCompare(b.name))

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) return
    const id = createTag(name)
    if (id) addTagToItem(itemKey, id)
    setNewName("")
  }

  const handleCommitRename = () => {
    const id = renamingId
    setRenamingId(null)
    if (!id) return
    const name = renameValue.trim()
    if (!name) return // empty → cancel, keep the old name
    renameTag(id, name)
  }

  return (
    <div className="relative" ref={ref}>
      <Tip tip="Tag this item">
        <button
          onClick={(e) => {
            e.stopPropagation()
            // Reset editor state when closing — reopening must show a clean
            // list (no stale rename input or half-typed create value).
            if (open) { setRenamingId(null); setNewName("") }
            setOpen((o) => !o)
          }}
          aria-label="Tag this item"
          className={cn(
          "flex h-5 w-5 items-center justify-center rounded backdrop-blur-sm transition-colors",
          variant === "tile"
            ? "bg-black/55 text-foreground/80 hover:bg-black/80 hover:text-foreground"
            : "text-muted-foreground/70 hover:bg-sidebar/80 hover:text-foreground",
        )}
      >
          <TagIcon className="h-3 w-3" />
        </button>
      </Tip>
      {open && (
        <div
          className={cn(
            "absolute top-full z-50 mt-1 w-44 rounded-lg border border-sidebar-border bg-popover shadow-lg py-1",
            align === "right" ? "right-0" : "left-0",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Tag list with checkboxes */}
          <div className="max-h-40 overflow-y-auto px-1 scrollbar-thin">
            {allTags.length === 0 && (
              <p className="px-2 py-1 text-[10px] text-muted-foreground/50">No tags yet — create one below.</p>
            )}
            {allTags.map((tag) => {
              const on = itemTagIds.has(tag.id)
              const meta = TAG_COLOR_META[tag.color] ?? TAG_COLOR_META.brand
              const renaming = renamingId === tag.id
              return (
                <div
                  key={tag.id}
                  className={cn(
                    "group/tag flex w-full items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors",
                    !renaming && "hover:bg-sidebar-accent",
                  )}
                >
                  {renaming ? (
                    // Inline rename — same contract as the sidebar rows:
                    // Enter/blur commits, Esc cancels, autoFocus + select-all.
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={handleCommitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCommitRename()
                        if (e.key === "Escape") setRenamingId(null)
                      }}
                      autoFocus
                      ref={(el) => { if (el && renaming) el.select() }}
                      aria-label={`Rename ${tag.name}`}
                      className="min-w-0 flex-1 rounded border border-brand/50 bg-background/80 px-1 py-0 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-brand/40"
                    />
                  ) : (
                    <>
                      {/* Toggle — the row body as its own button so the
                          rename/delete actions can be real buttons too (a
                          button can't nest buttons). */}
                      <Tip tip={on ? `Remove ${tag.name}` : `Add ${tag.name}`}>
                      <button
                        onClick={() => (on ? removeTagFromItem(itemKey, tag.id) : addTagToItem(itemKey, tag.id))}
                        aria-label={on ? `Remove ${tag.name}` : `Add ${tag.name}`}
                        aria-pressed={on}
                        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                      >
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
                          <span className="flex-1 truncate text-sidebar-foreground">{tag.name}</span>
                          {on && <Check className="h-3 w-3 text-brand" />}
                        </button>
                      </Tip>
                      {/* Hover actions — operate on the tag REGISTRY (rename/
                          delete the tag itself, not this item's membership).
                          Delete cleans every item's map entry via the store. */}
                      <Tip tip="Rename tag">
                        <button
                          onClick={() => { setRenameValue(tag.name); setRenamingId(tag.id) }}
                          aria-label={`Rename tag ${tag.name}`}
                          className="hidden h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground/60 hover:text-foreground group-hover/tag:flex"
                        >
                          <Pencil className="h-2.5 w-2.5" />
                        </button>
                      </Tip>
                      <Tip tip="Delete tag">
                        <button
                          onClick={() => deleteTag(tag.id)}
                          aria-label={`Delete tag ${tag.name}`}
                          className="hidden h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground/60 hover:text-red-400 group-hover/tag:flex"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </Tip>
                    </>
                  )}
                </div>
              )
            })}
          </div>
          {/* Create new tag */}
          <div className="mt-1 flex items-center gap-1 border-t border-sidebar-border/60 px-1.5 pt-1">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate() } }}
              placeholder="New tag…"
              className="min-w-0 flex-1 rounded border border-sidebar-border/60 bg-background/60 px-1.5 py-0.5 text-[10px] text-foreground outline-none focus:border-brand/50"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              aria-label="Add tag"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground disabled:opacity-30"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TagFilterBar — the filter UI for useListFilter's tag dimension ───────
// Renders the active selected/excluded chips + an add-tag-filter dropdown.
// The parent passes the filter state + actions from useListFilter so this
// component is stateless (the hook owns the state).

export function TagFilterBar({
  state,
  onToggle,
  onClear,
}: {
  state: Pick<ListFilterState, "tagSelected" | "tagExcluded">
  onToggle: (tagId: string, which: "selected" | "excluded") => void
  onClear: () => void
}) {
  const [addOpen, setAddOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!addOpen) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAddOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [addOpen])

  const tags = useTagMap((s) => s.tags)
  const activeCount = state.tagSelected.length + state.tagExcluded.length

  const statusOf = (id: string): "selected" | "excluded" | undefined => {
    if (state.tagSelected.includes(id)) return "selected"
    if (state.tagExcluded.includes(id)) return "excluded"
    return undefined
  }

  const allTags = Object.values(tags).sort((a, b) => a.name.localeCompare(b.name))

  // Don't render the bar at all if there are no tags AND the dropdown is closed
  // — keeps the sidebar clean until the user creates their first tag.
  if (allTags.length === 0 && !addOpen) return null

  return (
    <div className="flex flex-wrap items-center gap-1 pt-0.5">
      {/* Active filter chips */}
      {state.tagSelected.map((id) => {
        const def = tags[id]
        if (!def) return null
        return (
          <TagBadge
            key={`sel-${id}`}
            tag={def}
            onRemove={() => onToggle(id, "selected")}
          />
        )
      })}
      {state.tagExcluded.map((id) => {
        const def = tags[id]
        if (!def) return null
        return (
          <span
            key={`exc-${id}`}
            className="inline-flex items-center gap-0.5 rounded-full border border-sidebar-border/60 bg-sidebar-accent/30 px-1.5 py-px text-[10px] text-muted-foreground line-through opacity-70"
          >
            <Ban className="h-2.5 w-2.5" />
            <span className="truncate max-w-[60px]">{def.name}</span>
            <button
              onClick={() => onToggle(id, "excluded")}
              className="hover:text-foreground"
              aria-label={`Stop excluding ${def.name}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        )
      })}

      {/* Clear-all */}
      {activeCount > 1 && (
        <button
          onClick={onClear}
          className="text-[10px] text-muted-foreground/60 hover:text-foreground underline"
        >
          clear
        </button>
      )}

      {/* Add tag filter dropdown */}
      <div className="relative" ref={ref}>
        <Tip tip="Filter by tag">
        <button
          onClick={() => setAddOpen((o) => !o)}
          aria-label="Filter by tag"
          className={cn(
            "flex h-5 items-center gap-0.5 rounded-full border px-1.5 text-[10px] transition-colors",
            addOpen
              ? "border-brand/50 bg-brand/10 text-brand"
              : "border-sidebar-border/60 bg-sidebar-accent/30 text-muted-foreground hover:text-foreground",
          )}
        >
            <TagIcon className="h-2.5 w-2.5" />
            {activeCount === 0 && <span>Tag</span>}
          </button>
        </Tip>
        {addOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-lg border border-sidebar-border bg-popover shadow-lg py-1">
            <div className="max-h-40 overflow-y-auto px-1 scrollbar-thin">
              {allTags.length === 0 && (
                <p className="px-2 py-1 text-[10px] text-muted-foreground/50">Tag an item first.</p>
              )}
              {allTags.map((tag) => {
                const status = statusOf(tag.id)
                const meta = TAG_COLOR_META[tag.color] ?? TAG_COLOR_META.brand
                return (
                  <div key={tag.id} className="flex items-center gap-0.5 rounded px-1 py-0.5 hover:bg-sidebar-accent">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
                    <span className="flex-1 truncate text-[11px] text-sidebar-foreground">{tag.name}</span>
                    {/* Three-state cycle: off → selected (check) → excluded (ban) → off */}
                    <Tip tip="Must have">
                      <button
                        onClick={() => onToggle(tag.id, "selected")}
                        aria-label="Must have"
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded transition-colors",
                          status === "selected" ? "bg-brand/20 text-brand" : "text-muted-foreground/50 hover:text-foreground",
                        )}
                      >
                        <Check className="h-2.5 w-2.5" />
                      </button>
                    </Tip>
                    <Tip tip="Must not have">
                      <button
                        onClick={() => onToggle(tag.id, "excluded")}
                        aria-label="Must not have"
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded transition-colors",
                          status === "excluded" ? "bg-red-500/20 text-red-400" : "text-muted-foreground/50 hover:text-foreground",
                        )}
                      >
                        <Ban className="h-2.5 w-2.5" />
                      </button>
                    </Tip>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
