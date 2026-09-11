// LibrarySidebar — the Library tab's optional right rail (task #74).
//
// ONE discovery surface (ONE_SURFACE Phase 4, 2026-08-11): what can be
// made lives HERE — capabilities (models/families cards) + the AI
// Generated group + flow templates — in ONE view, mirroring the agent's
// surface 1:1. The separate "Flow Nodes" left drawer was merged into
// this rail (plan D2); its ActivityBar icon is gone with it.
//
// The ACTION vocabulary, in the user's words (2026-08-07): "Flows are a
// series of connected actions. Actions can be arbitrary: generate_image,
// edit, enhance, speak, make_voice, generate_music. So the user or AI
// doesn't need to understand any complexities." The capabilities layer IS
// that vocabulary — one intent ("Generate"), resolved backend-side to a
// default family + model + working params. This rail is its persistent
// surface:
//
//   Capabilities — the SAME tiles as the ServicePicker dialog, rendered
//   into the rail. Click = the card lands on the canvas (addStage) —
//   ComfyUI's "add node from sidebar" model. No modal auto-open: the
//   canvas stays in view; the user clicks the tile to zoom.
//
//   AI Generated (Phase 4) — the catalog's ``genre: ai_generated``
//   families (agent-persisted workspace workflows, synthesized by
//   _merge_workspace_catalog) as tiles. They have NO capabilities (the
//   backend synthesizes family + model entries only), so they can never
//   surface as capability tiles — this section IS their surface. Same
//   card derivation path the picker used for its (removed 2026-09-04)
//   family grid (familyEntryToCard, one path — no drift).
//
//   Flows (Phase 4) — the flow TEMPLATES (the former FlowNodes
//   drawer, merged per plan D2). One search (this rail's input) filters
//   capabilities + AI Generated tiles + flow rows; the flow rows
//   keep their rename/delete hover actions.
//
// GROUPED + SORTED (2026-08-08): capabilities are grouped by their media
// GENRE (the family's ``genre:`` field — image / video / audio / 3d), in a
// stable display order, and alphabetically within each group. The genre is
// the catalog SSOT (no substring classifiers) — every capability's default
// family MUST declare genre, or it lands in "More" (a catalog gap to fix,
// not a silent UI hack).
//
// DECLARATIVE (2026-08-10): the prior hardcoded <section> for the Body
// studio button is gone. Studio-kind capabilities now flow through the
// same declarative flow as generation capabilities, sourced from
// lib/studioCapabilities.ts (typed registry — adding Body was one entry,
// adding Pose/Director later is one entry each). The genre order + icons
// come from lib/sidebarGenres.ts — shared with ServicesSidebar, one
// taxonomy instead of two. A SearchInput (listKit) filters by label so the
// catalog is scannable past a handful of entries. No more hardcoded slop:
// every tile in this rail comes from a typed registry.
//
// The run archive is NOT here. Past runs live in the left Media drawer
// (AppSidebar — artifact tiles, "Open as cards") and in each card's detail
// modal. ONE archive surface, not two (2026-08-07).
//
// The capability→card derivation is the SHARED lib/capabilityCards.ts (the
// ServicePicker's helpers) — one implementation, the dialog and the rail
// cannot drift (rule 4).
import { useCallback, useEffect, useMemo, useState } from "react"
import { Search, Shapes, Sparkles } from "lucide-react"
import { SearchInput, SectionHeader, TileGrid } from "@/components/ui/listKit"
import { Tip } from "@melite/ui/tip"
import { loadCatalog, type CapabilityEntry, type Catalog } from "@melite/catalog"
import {
  getCachedForms,
  loadForms,
  subscribeForms,
  type FormsData,
} from "@melite/catalog"
import {
  capabilityToCard,
  capabilityDragPayload,
  CAPABILITY_DRAG_MIME,
  familyEntryToCard,
  type PickedCard,
} from "@melite/formats"
import { familyProvenance, formatLastRun, type FamilyProvenance } from "@melite/catalog"
import { STUDIO_CAPABILITIES, type StudioCapability } from "@melite/slots"
import {
  SIDEBAR_GENRE_ICON,
  genreLabel,
  sidebarBucket,
  type SidebarGenre,
} from "@melite/formats"
import { editorClient } from "@/rpc/editorClient"
import { narrowMediaRuns } from "./media"
import { useMediaVersion } from "./mediaVersion"
import { useLibraryFlowStore } from "../flow/flowStore"
import { cn } from "@melite/ui"

/** Unified sidebar item — generation-kind (catalog) and studio-kind (the
 *  typed registry) reduce to this discriminated shape before grouping.
 *  Switching on `kind` in the render keeps the click/drag handlers honest:
 *  a generation cap resolves through capabilityToCard; a studio cap
 *  carries its own defaultParams + studio target. */
type UnifiedItem =
  | { kind: "generation"; id: string; cap: CapabilityEntry }
  | { kind: "studio"; cap: StudioCapability }

/** Shorten a capability label for the compact sidebar tile by stripping the
 *  trailing genre word — the section header already names the category, so
 *  "Edit Image" under "Image" → "Edit", "Generate Image" → "Generate".
 *  Sidebar-only PRESENTATION: the canonical label (ServicePicker tile, card
 *  title, tooltip, run archive) is never touched — only this rail's compact
 *  tile reads the shortened form. Never strips to empty ("Video" under
 *  "Video" stays "Video"); falls through verbatim when the label doesn't end
 *  in the genre word ("Preprocess", "Mask", "Mesh"). */
function sidebarTileLabel(label: string, genre: string): string {
  const word = genreLabel(genre)
  const stripped = label.replace(new RegExp(`\\s*${word}\\s*$`, "i"), "").trim()
  return stripped || label
}

/** Compact tile class — a child of the shared TileGrid (listKit), whose
 *  auto-fill grid owns the layout law: FIXED-SIZE cells, extra rail width
 *  becomes MORE COLUMNS, never wider tiles (the Media archive's sizing
 *  law — the old flex-wrap min-w-[50%] + flex-1 stretched instead). The
 *  inner flex here is only the label/badge row inside the cell. */
const COMPACT_TILE_CLASS = cn(
  "flex min-w-0 items-center gap-1 rounded-md border border-brand/25 bg-brand/5 px-2 py-1.5 text-left",
  "cursor-grab active:cursor-grabbing transition-all hover:border-brand/60 hover:bg-brand/10",
)

/** The Library sidebar's display order — the primary genres users navigate
 *  by, plus an "Other" bucket (motion/3d/mesh collapsed by sidebarBucket).
 *  Intentionally shorter than SIDEBAR_GENRE_ORDER (the superset used by
 *  ServicesSidebar): the Library is capability-first, not an exhaustive
 *  family list. Niche genres don't get their own section header here —
 *  they live under "Other". */
const LIBRARY_GENRE_ORDER: readonly SidebarGenre[] = [
  "image", "video", "audio", "text", "other", "unknown",
] as const

export function LibrarySidebar() {
  const addStage = useLibraryFlowStore((s) => s.addStage)
  const [cat, setCat] = useState<Catalog | null>(null)
  // Search (2026-08-10): the catalog is too long to scan unfiltered. The
  // SearchInput from listKit filters by label (case-insensitive substring);
  // an empty query shows everything. Matches the AppSidebar pattern.
  const [query, setQuery] = useState("")

  useEffect(() => {
    let cancelled = false
    loadCatalog()
      .then((c) => { if (!cancelled) setCat(c) })
      // Fetch failures + contract violations are REPORTED by the loadCatalog
      // funnel into useCatalogContractStore — which fires an error TOAST
      // with Retry. Nothing local to hold (2026-08-11 → toast 2026-08-14).
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Forms — the card vocabulary (2026-08-12). /v1/forms carries the
  // sidebar_key ui blocks; the Cards section's membership test is "does this
  // family's form declare a sidebar_key". Same shared-store pattern as
  // ServicesSidebar: init from cache (no empty flash on remount), subscribe
  // for live fills. loadForms is idempotent and dedupes across surfaces.
  const [forms, setForms] = useState<FormsData>(() => getCachedForms())
  useEffect(() => {
    const unsub = subscribeForms(() => setForms({ ...getCachedForms() }))
    void loadForms().then((d) => setForms({ ...d }))
    return unsub
  }, [])

  // Provenance (2026-08-09): which capabilities have already produced runs.
  // Fold the SAME runs payload the Media drawer derives its archive from —
  // the archive is the trace of each action. mediaVersion bumps when a run
  // lands "done" → re-fold so a fresh run badges its tile WITHOUT a toggle.
  // Failures stay silent: provenance is a badge, never a blocker.
  const mediaVersion = useMediaVersion((s) => s.version)
  const [provenance, setProvenance] = useState<Record<string, FamilyProvenance>>({})
  useEffect(() => {
    let cancelled = false
    editorClient.listRuns()
      .then((runs) => {
        if (cancelled) return
        setProvenance(familyProvenance(narrowMediaRuns(runs ?? [])))
      })
      .catch(() => { if (!cancelled) setProvenance({}) })
    return () => { cancelled = true }
  }, [mediaVersion])

  const handleCapabilityPick = useCallback((_capId: string, cap: CapabilityEntry) => {
    const card = capabilityToCard(cat, cap, cap.resolved)
    // card.kind rides through from capabilityToCard: "generation" for model-
    // resolved caps, "input" for the model-less input capability. The
    // default fallback covers caps that don't declare kind (the pre-input
    // catalog shape) so this never silently misroutes a stage.
    void addStage({ kind: card.kind ?? "generation", service: card.service, title: card.title, params: card.params })
  }, [cat, addStage])

  const handleStudioPick = useCallback((cap: StudioCapability) => {
    void addStage({
      kind: "body",
      service: cap.studio,
      title: cap.label,
      params: cap.defaultParams,
    })
  }, [addStage])

  // Drag → populate a card (2026-08-08): "clicking and dragging from the
  // right sidebar onto the middle part should populate the card". The tile
  // writes its fully-resolved card (service + title + params + kind) under
  // the capability MIME; a card whose tile is under the cursor on drop
  // repurposes itself to that capability. Click without movement still
  // addStages (the button's onClick) — the browser distinguishes the two by
  // pointer travel, same as AppSidebar's asset tiles.
  const handleCapabilityDragStart = useCallback((capId: string, card: PickedCard) => {
    return (e: React.DragEvent) => {
      e.dataTransfer.setData(CAPABILITY_DRAG_MIME, capabilityDragPayload(capId, card))
      // Firefox requires an effect to be set or the drag never starts.
      e.dataTransfer.effectAllowed = "copy"
    }
  }, [])

  // Group capabilities by their default family's genre, sorted within each
  // group by label. Genre is the catalog SSOT — no substring guessing.
  // Studio-kind capabilities (Body) join the SAME grouping flow via
  // their own genre field; they're tile-equivalents, not special-cased.
  // The search filter narrows by label BEFORE grouping — empty query = all.
  const groups = useMemo<Record<SidebarGenre, UnifiedItem[]>>(() => {
    const buckets: Record<string, UnifiedItem[]> = {}
    const q = query.trim().toLowerCase()
    const matches = (label: string) => !q || label.toLowerCase().includes(q)
    // Generation capabilities from the catalog.
    for (const [capId, cap] of Object.entries(cat?.capabilities ?? {})) {
      if (!matches(cap.label)) continue
      const fam = cat?.families?.[cap.default_family]
      // kind:input capabilities are UTILITY tools (media prep), not creative
      // actions — they bucket into "Other" regardless of their family's genre.
      const genre: SidebarGenre = cap.kind === "input" ? "other" : sidebarBucket(fam?.genre ?? "unknown")
      ;(buckets[genre] ??= []).push({ kind: "generation", id: capId, cap })
    }
    // Studio-kind capabilities from the typed registry (Mesh, future
    // Pose/Director). Same grouping logic, different click handler — the
    // kind discriminator in render switches between them. sidebarBucket
    // maps the studio's granular genre (3d) into the "other" display bucket.
    for (const cap of STUDIO_CAPABILITIES) {
      if (!matches(cap.label)) continue
      const genre: SidebarGenre = sidebarBucket(cap.genre)
      ;(buckets[genre] ??= []).push({ kind: "studio", cap })
    }
    // Both UnifiedItem variants carry cap.label, so no narrowing is needed
    // to sort by label — the discriminator only matters in render (click/drag).
    for (const k of Object.keys(buckets)) {
      buckets[k].sort((a, b) => a.cap.label.localeCompare(b.cap.label))
    }
    return buckets
  }, [cat, query])

  // AI Generated group (Phase 4): families with genre "ai_generated" —
  // agent-persisted workspace workflows (synthesized by the backend's
  // _merge_workspace_catalog). They have NO capabilities, so they can
  // never surface as capability tiles — this memo IS their surface. Same
  // derivation as the ServicePicker's "All models" group: familyEntryToCard
  // → addStage (one path, the dialog and the rail cannot drift).
  const aiGenerated = useMemo(() => {
    if (!cat) return []
    const q = query.trim().toLowerCase()
    // `?? {}` guards a catalog body without families (same defensiveness as
    // the groups memo's `cat?.capabilities ?? {}`) — an empty body must
    // render as "no AI Generated tiles", never throw.
    return Object.entries(cat?.families ?? {})
      .filter(([, f]) => (f.genre ?? "") === "ai_generated")
      .map(([famId, f]) => ({ famId, f }))
      .filter(({ famId, f }) => !q || f.label.toLowerCase().includes(q) || famId.toLowerCase().includes(q))
      .sort((a, b) => a.f.label.localeCompare(b.f.label))
  }, [cat, query])

  const handleFamilyPick = useCallback((famId: string) => {
    if (!cat?.families?.[famId]) return
    const card = familyEntryToCard(cat, famId, cat.families[famId])
    void addStage({
      kind: card.kind ?? "generation",
      service: card.service,
      title: card.title,
      params: card.params,
    })
  }, [cat, addStage])

  // Cards group (2026-08-12): the families that are REAL CARDS — the ones
  // the card system implements, declared via the form-tag ui block
  // (service_tags.yaml sidebar_key/label/genre — the tracker's "appears in
  // the sidebar" mechanism). NOT "every family in the catalog": the
  // auto-generate services (lance, anima, gem_soma, latentsync, hy_motion,
  // kimodo_export) carry forms without a sidebar_key and must NEVER render
  // here — they are not cards, they are backend services. The sidebar_key
  // vocabulary is the SSOT: a family is a card iff its form declares a
  // sidebar_key. Capability defaults (krea-2, trellis, kimodo, …) are
  // already the face of a capability tile — excluded here.
  const cardFamilies = useMemo(() => {
    if (!cat) return []
    const q = query.trim().toLowerCase()
    const defaults = new Set(
      Object.values(cat.capabilities ?? {})
        .map((c) => c.default_family)
        .filter((f): f is string => typeof f === "string"),
    )
    const cardIds = new Set(
      Object.values(forms)
        .map((f) => f.sidebar_key)
        .filter((k): k is string => typeof k === "string" && k.length > 0),
    )
    return Object.entries(cat.families ?? {})
      .filter(([famId]) => !defaults.has(famId) && cardIds.has(famId))
      .map(([famId, f]) => ({ famId, f }))
      .filter(({ famId, f }) => !q || f.label.toLowerCase().includes(q) || famId.toLowerCase().includes(q))
      .sort((a, b) => a.f.label.localeCompare(b.f.label))
  }, [cat, query, forms])

  const total = Object.values(groups).reduce((n, g) => n + g.length, 0)

  return (
    // H-RIGHT (2026-08-21): bare pane CONTENT — the RightPanelHost owns
    // the chrome (title/close/width + the internal tab strip). This
    // component is a `right.panels` entry (rightPanelEntries.tsx).
    <div className="h-full flex flex-col">
      {/* ── The catalog verdict (2026-08-11 → toast 2026-08-14):
             loadCatalog reports into the contract store; a violation or
             fetch error fires an error TOAST with Retry — the 2026-08-14
             rule: errors surface through toasts ONLY, never a persistent
             line in the webapp. ── */}

      {/* ── Search — ONE input, the whole surface: capability + studio
             tiles, AI Generated tiles, and flow rows all filter on it
             (Phase 4 — the merged discovery surface shares one search). ── */}
      <div className="px-2 pt-2 pb-1">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search library…"
          icon={Search}
        />
      </div>

      {/* ── The action vocabulary — capability tiles, grouped + sorted ── */}
      <section className="px-2 pb-3">
        {cat && total === 0 && aiGenerated.length === 0 && cardFamilies.length === 0 && (
          <p className="py-2 text-center text-[10px] text-muted-foreground/60">
            {query.trim() ? `Nothing matches "${query.trim()}" in this surface.` : "No capabilities declared in the catalog."}
          </p>
        )}

        <div className="space-y-2">
          {LIBRARY_GENRE_ORDER.map((genre) => {
            const items = groups[genre]
            if (!items || items.length === 0) return null
            const Icon = genre === "other" ? Shapes : (SIDEBAR_GENRE_ICON[genre] ?? Sparkles)
            return (
              // Bigger section headers (text-sm font-semibold) name the
              // category so the compact tiles beneath can drop the genre
              // word from their labels ("Edit Image" → "Edit"). The tiles
              // sit on the shared TileGrid auto-fill law — fixed-size
              // cells; a wider rail fits MORE per row, nothing stretches.
              // The section carries the context; the tile carries
              // the verb. The full label + family · model stay in the
              // tooltip for drill-down — only the sidebar tile is compact.
              <SectionHeader
                key={genre}
                title={genreLabel(genre)}
                icon={Icon}
                count={items.length}
                defaultOpen
                className="text-sm font-semibold text-foreground/80 px-2 py-2"
              >
                <TileGrid>
                  {items.map((item) => {
                    // Discriminate: generation-kind resolves through the
                    // catalog; studio-kind carries its own defaultParams.
                    if (item.kind === "studio") {
                      const { cap } = item
                      return (
                        <Tip key={cap.id} tip={`${cap.label} · ${cap.description} · opens the studio on drill-down · drag onto a card to populate, click to add`}>
                          <button
                            onClick={() => handleStudioPick(cap)}
                            draggable
                            onDragStart={handleCapabilityDragStart(cap.id, {
                              service: cap.studio,
                              title: cap.label,
                              params: cap.defaultParams,
                              kind: "body",
                            })}
                            data-capability-tile={cap.id}
                            className={COMPACT_TILE_CLASS}
                          >
                            <span className="truncate text-[11px] font-semibold text-foreground">{sidebarTileLabel(cap.label, genre)}</span>
                          </button>
                        </Tip>
                      )
                    }
                    // Generation-kind: the catalog path. The compact tile
                    // drops the mono subtitle (family · model) — the tooltip
                    // carries the capability's DECLARED DESCRIPTION instead
                    // of model trivia (2026-08-25) — and shortens the label
                    // by the genre word (the section header already names it).
                    // The provenance badge stays: it's the signal that a
                    // capability has already produced runs, too useful to
                    // hide behind a hover.
                    const { id: capId, cap } = item
                    const card = capabilityToCard(cat, cap, cap.resolved)
                    const prov = provenance[cap.default_family]
                    const provTitle = prov
                      ? ` · ${prov.count} completed run${prov.count === 1 ? "" : "s"} · last ${formatLastRun(prov.lastRunAt)}`
                      : ""
                    return (
                      <Tip key={capId} tip={`${cap.description || cap.label}${provTitle} · drag onto a card to populate, click to add`}>
                        <button
                          onClick={() => handleCapabilityPick(capId, cap)}
                          onDragStart={handleCapabilityDragStart(capId, card)}
                          draggable
                          data-capability-tile={capId}
                          className={COMPACT_TILE_CLASS}
                        >
                          <span className="truncate text-[11px] font-semibold text-foreground">{sidebarTileLabel(cap.label, genre)}</span>
                          {prov && (
                            <span
                              aria-label={`${prov.count} completed run${prov.count === 1 ? "" : "s"} · last ${formatLastRun(prov.lastRunAt)}`}
                              className="ml-auto rounded-full bg-emerald-500/15 px-1 text-[9px] font-bold tabular-nums text-emerald-400"
                            >
                              ✓ {prov.count}
                            </span>
                          )}
                        </button>
                      </Tip>
                    )
                  })}
                </TileGrid>
              </SectionHeader>
            )
          })}

          {/* ── Cards — the card families (2026-08-12). Membership is
             form-tag driven: only families whose form declares a
             sidebar_key (the service_tags.yaml ui block) render here —
             texture_project, transfer_rig, composite_character, somax,
             video_upscale, … The auto-generate services (lance, anima,
             gem_soma, latentsync, hy_motion) have no sidebar_key and can
             never appear. Capability defaults already have their own
             tile. Same tile shape as the capability tiles (compact,
             fixed-cell on the shared TileGrid); click = addStage. ── */}
          {cardFamilies.length > 0 && (
            <SectionHeader
              title="Cards"
              icon={Shapes}
              count={cardFamilies.length}
              defaultOpen
              className="text-sm font-semibold text-foreground/80 px-2 py-2"
            >
              <TileGrid>
                {cardFamilies.map(({ famId, f }) => (
                  <Tip key={famId} tip={`${f.label} · ${f.genre ?? "card"} family · click to add`}>
                    <button
                      onClick={() => handleFamilyPick(famId)}
                      data-family-tile={famId}
                      className={COMPACT_TILE_CLASS}
                    >
                      <span className="truncate text-[11px] font-semibold text-foreground">{f.label}</span>
                    </button>
                  </Tip>
                ))}
              </TileGrid>
            </SectionHeader>
          )}

          {/* ── AI Generated — the workflow families (Phase 4). They have
             no capabilities, so this dedicated section is their only
             surface outside the ServicePicker dialog. Same tile shape as
             the capability tiles (compact, fixed-cell) — click = addStage.
             ── */}
          {aiGenerated.length > 0 && (
            <SectionHeader
              title="AI Generated"
              icon={Sparkles}
              count={aiGenerated.length}
              defaultOpen
              className="text-sm font-semibold text-foreground/80 px-2 py-2"
            >
              <TileGrid>
                {aiGenerated.map(({ famId, f }) => (
                  <Tip key={famId} tip={`${f.label} · workflow family (workspace-persisted) · click to add`}>
                    <button
                      onClick={() => handleFamilyPick(famId)}
                      data-ai-generated-tile={famId}
                      className={COMPACT_TILE_CLASS}
                    >
                      <span className="truncate text-[11px] font-semibold text-foreground">{f.label}</span>
                    </button>
                  </Tip>
                ))}
              </TileGrid>
            </SectionHeader>
          )}
        </div>

      </section>
    </div>
  )
}
