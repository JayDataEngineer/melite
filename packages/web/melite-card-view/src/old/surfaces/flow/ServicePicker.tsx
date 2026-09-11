// ServicePicker — the action-card browser for the card canvas.
//
// The user authors a flow card-by-card (the ComfyUI-subgraph model:
// each card is a collection of nodes with a customizable interface;
// stringing cards = flow.json). This picker is how a NEW card is born.
//
// ONE SURFACE: ACTION CARDS (operator order, 2026-09-04: "I see this
// twice, repeated in different forms" — the picker listed the operator's
// 13 action cards AND a "What do you want to make?" capability grid over
// the same lanes). The capability section is GONE: the action cards
// (/v1/card-tools, one tile per packages/*/cards/*/tool.json manifest)
// ARE the picker. This is the same law the lane table already enforces
// (python/lane_disclosure.py): the callable surface is action_card |
// template — nothing else births a card here.
//
// MODELS ARE NOT ENTRIES (same day: "the only way to actually do
// inference is through action cards, yet I see the model level as
// available for inference"). The card tile shows its manifest's declared
// model as a SUBTITLE (card identity, not a choice surface); model
// choice lives ON THE CARD (the card form's Model select), never here.
//
// CATEGORIES (operator order: "organize this menu into categories").
// Groups are DERIVED from the cached model catalog's per-model genre —
// no category list lives in this file (see actionCardGroups).
//
// On pick → seed params from the manifest's own declared defaults
// (params_schema.properties[].default) and hand the descriptor to the
// canvas, which calls addStage(). A transient dialog invoked by the
// "+ Add card" action — the authoring equivalent of ComfyUI's "add node".
import { useEffect, useMemo, useState } from "react"
import { Search, Plus, Layers } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@melite/ui/dialog"
import { Skeleton } from "@melite/ui/skeleton"
import { apiJson, getCachedCatalog, onCatalogReady } from "@melite/catalog"
import { type PickedCard } from "@melite/formats"
import { cn } from "@melite/ui"
import { Tip } from "@melite/ui/tip"

// One /v1/card-tools manifest — the operator's own action card (lane).
// Shape mirrors packages/*/cards/*/tool.json (name, model, stage_title,
// description, params_schema with JSON-Schema properties/defaults).
interface CardManifest {
 name: string
 version?: number
 kind?: string
 model: string
 stage_title?: string
 description?: string
 params_schema?: {
  type?: string
  properties?: Record<string, { type?: string; description?: string; default?: unknown }>
  required?: string[]
 }
}

export function ServicePicker({
 open,
 onOpenChange,
 onPick,
 onGroupAction,
 canGroup = false,
}: {
 open: boolean
 onOpenChange: (open: boolean) => void
 onPick: (card: PickedCard) => void
 /** Enter the grouping sub-view (2026-08-12). When provided AND canGroup is
  *  true, a "Group Cards" tile appears at the TOP of the action-card list —
  *  same surface as Image Generation / Edit / Upscale, but instead of
  *  adding a generation stage, it enters a filtered selection view where
  *  the user picks which existing cards to collapse into one compound. */
 onGroupAction?: () => void
 /** Whether the canvas has enough cards to group (≥ 2). Hides the tile on
  *  empty / single-card canvases. */
 canGroup?: boolean
}) {
 const [error, setError] = useState<string | null>(null)
 const [query, setQuery] = useState("")
 // ── Action cards (the lane manifests) — the picker's ONE surface ──
 // THE card surfaces this gateway actually runs: packages/*/cards/*/tool.json
 // served at /v1/card-tools (image_card, tts_card, video_card,
 // humanoid_flow, …). Since 2026-09-04 ("I see this twice") this list IS
 // the picker — the capability grid that duplicated it is gone.
 const [actionCards, setActionCards] = useState<CardManifest[] | null>(null)
 // ── Catalog readiness (category grouping below reads the cached
 // catalog's per-model genre). The catalog loads at boot, long before
 // this dialog opens — but if it lands late, re-render so the tiles
 // settle into their groups instead of sticking in "other".
 const [catalogTick, setCatalogTick] = useState(0)
 useEffect(() => {
 if (!open) return
 return onCatalogReady(() => setCatalogTick((t) => t + 1))
 }, [open])

 useEffect(() => {
 if (!open) return
 let cancelled = false
  apiJson<CardManifest[]>("/v1/card-tools")
   .then((m) => {
    if (cancelled) return
    if (Array.isArray(m)) setActionCards(m)
    else setError("/v1/card-tools returned a non-list payload")
   })
   // FATAL since 2026-09-04 ("I see this twice"): the action cards are
   // the picker's ONE surface — no catalog section remains to fall back
   // on, so a failure must read as "the endpoint broke", never as "no
   // cards exist" (no-silent-swallow).
   .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load action cards") })
 return () => { cancelled = true }
 }, [open])

 const q = query.trim().toLowerCase()

 // (The capability grid — "What do you want to make?" — was REMOVED
 // 2026-09-04 ("I see this twice, repeated in different forms"): it
 // duplicated the action-card list over the same lanes. The family-tiles
 // path ("All models") had already died that morning. ONE surface: the
 // action cards below. Model choice lives on the card form.)

 // Action cards filtered by the search query (title, card name, model).
 const actionCardsMatched = useMemo(() => {
  if (!actionCards) return []
  return actionCards.filter((m) => {
   if (!q) return true
   const hay = [m.name, m.stage_title ?? "", m.model].join(" ").toLowerCase()
   return hay.includes(q)
  })
 }, [actionCards, q])

 // ── CATEGORIES (operator order: "organize this menu into
 // categories"). Groups are DERIVED, never declared: each card's
 // manifest names its model, and the cached model catalog declares
 // that model's genre (image / audio / video / 3d / motion — the
 // model rows are the SSOT, plugin-architecture law). No category
 // list exists in this file: a new genre appears as its own group
 // the moment a model row declares it. A card whose model is absent
 // from the cache reads "other" — honest labeling for unresolvable,
 // never a guess. Groups sort alphabetically (deterministic, no
 // invented ranking); headings render the raw genre string (the
 // uppercase style handles display — zero label mapping).
 const actionCardGroups = useMemo(() => {
  const cat = getCachedCatalog()
  const byGenre = new Map<string, CardManifest[]>()
  for (const m of actionCardsMatched) {
   const raw = cat?.models?.[m.model]?.genre
   const genre =
    (typeof raw === "string" && raw.trim().toLowerCase()) || "other"
   const list = byGenre.get(genre)
   if (list) list.push(m)
   else byGenre.set(genre, [m])
  }
  return [...byGenre.entries()].sort(([a], [b]) => a.localeCompare(b))
  // catalogTick busts the memo when the catalog lands late (the
  // subscription above re-renders; the genre read must re-run).
 }, [actionCardsMatched, catalogTick])

 // Pick an action card: seed params from the manifest's own declared
 // defaults (params_schema.properties[].default) — no catalog defaults
 // intrude, the card lands exactly as its plugin declared it.
 const handleActionCardPick = (m: CardManifest) => {
  const props = m.params_schema?.properties ?? {}
  const params: Record<string, unknown> = {}
  for (const [k, spec] of Object.entries(props)) {
   if (spec.default !== undefined) params[k] = spec.default
  }
  onPick({
   service: m.model,
   title: m.stage_title ?? m.name,
   params,
   kind: m.kind,
  })
  onOpenChange(false)
  setQuery("")
 }

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="max-w-2xl">
 <DialogTitle className="flex items-center gap-2 text-sm">
 <Plus className="h-4 w-4 text-brand" />
 Add a card
 </DialogTitle>
 <div className="relative mt-1">
 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
 <input
 autoFocus
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 placeholder="Search action cards…"
 className="h-8 w-full rounded-md border border-border/60 bg-background pl-8 pr-2 text-xs outline-none focus:border-brand/50"
 />
 </div>
 <div className="mt-2 max-h-[60vh] overflow-y-auto space-y-4">
 {error ? (
 <p className="py-8 text-center text-xs text-destructive">{error}</p>
 ) : !actionCards ? (
 <div
 role="status"
 aria-busy="true"
 aria-label="Loading action cards"
 className="flex flex-col gap-2 py-2"
 >
 {/* Skeleton tiles mirror the action-card grid the fetch will render,
     so the picker reads as "filling in" rather than spinning. */}
 {Array.from({ length: 6 }).map((_, i) => (
 <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-border/40 p-2.5">
 <Skeleton className="h-9 w-9 rounded-md" />
 <Skeleton className="h-3 w-3/4" />
 <Skeleton className="h-2.5 w-1/2" />
 </div>
 ))}
 </div>
 ) : (
 <>
 {/* ── Group Cards action (2026-08-12) — the compound-subgraph entry
     point. Sits at the TOP of the action-card list. Instead of adding
     a generation stage, it enters a FILTERED SUB-VIEW where the user
     picks which existing cards to collapse into one compound parent.
     Only renders when the canvas has ≥ 2 cards (canGroup) and the
     surface wires onGroupAction. ── */}
 {canGroup && onGroupAction && (
 <section className="mb-2">
 <div
 className="flex flex-col gap-0.5 rounded-md border border-brand/30 bg-brand/8 p-1.5 transition-all hover:border-brand/60 hover:bg-brand/12"
 >
 <Tip tip="Group existing cards into one compound">
 <button
 onClick={() => { onGroupAction(); onOpenChange(false); setQuery("") }}
 className="flex flex-col gap-0.5 text-left"
 data-group-action-entry
 >
 <span className="flex items-center gap-1.5 text-[11px] font-semibold text-brand">
 <Layers className="h-3.5 w-3.5" />
 Group Cards
 </span>
 <span className="truncate text-[9px] text-muted-foreground/70">
 Collapse multiple cards into one block
 </span>
 </button>
 </Tip>
 </div>
 </section>
 )}
 {/* ── ACTION CARDS — the operator's own lanes, the ONE surface ──
     One tile per /v1/card-tools manifest (image_card, tts_card,
     video_card, humanoid_flow, …). These are the cards this gateway
     actually runs. Picking seeds the card from the manifest's own
     params_schema defaults — the same contract build_flow applies
     agent-side. */}
 {actionCardGroups.length > 0 && (
  <section data-action-cards>
   <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
    <Layers className="h-3 w-3" />
    Your action cards
   </h4>
   {actionCardGroups.map(([genre, cards]) => (
    <div key={genre} data-card-category={genre} className="mb-2">
     <h5 className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/45">
      {genre}
     </h5>
     <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
      {cards.map((m) => (
       <Tip key={m.name} tip={m.description ?? undefined}>
        <button
         onClick={() => handleActionCardPick(m)}
         data-action-card={m.name}
         className={cn(
          "flex flex-col gap-0.5 rounded-md border border-brand/40 bg-brand/8 px-2.5 py-2 text-left transition-all",
          "hover:border-brand/70 hover:bg-brand/15",
         )}
        >
         <span className="truncate text-[11px] font-semibold text-foreground">
          {m.stage_title ?? m.name}
         </span>
         <span className="truncate font-mono text-[9px] text-muted-foreground/60">
          {m.model}
         </span>
        </button>
       </Tip>
      ))}
     </div>
    </div>
   ))}
  </section>
 )}

 </>
 )}
 </div>
 </DialogContent>
 </Dialog>
 )
}
