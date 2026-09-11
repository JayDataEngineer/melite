// CardDetailModal — the "zoom in" on a flow card (ONE card kit).
//
// Every surface (Flow tab, Assets tab, Agent tab) opens the same detail
// modal for the same reasons: large media preview, untruncated prompt, every
// param, input wiring, console, and the Run / Edit actions. Surfaces feed it
// a CardStage view-model + CardActions callbacks — no store hooks live here.
//
// Sections, top to bottom:
// • Preview — the default media preview (hero + motion picker + gallery + thumbs)
// • Error block
// • Prompt (full, untruncated)
// • Parameters (read-only grid, or the shared ParamEditor in edit mode)
// • Console — stage.console (the run's log_tail) + error + copy
// • Comfy graph — the per-step composed graph ("comfy-script renders
// below" — captured at execution time, Phase C)
// • Wireable input slots (top of the card) + raw metadata
// • Action bar (Run / Re-run / Edit)
import { useState, useEffect, useCallback, useRef } from "react";
import { X, Play, RotateCw, Pencil, AlertCircle, Image as ImageIcon, Sparkles, Clock, Terminal, GitBranch, Copy, ChevronDown, ChevronUp, Download, Save, SaveOff } from "lucide-react";
import { evalVisibleWhen, notchesOf, type CardStage, type CardActions } from "@melite/contracts"
import { kindHasFormSpec, kindOpensStudio } from "@melite/slots";
import {
  StatusChip,
  ServiceBadge,
  UpstreamBadge,
  CardActivityLine,
  CardProgressBar,
} from "./FlowCard";
import { ProvenanceBadge } from "@melite/ui/ProvenanceBadge";
import { Skeleton } from "@melite/ui/skeleton";
import { Tip } from "@melite/ui/tip";
import { InputCardEditor } from "./InputCardEditor";
import { MissingArtifactCell } from "./cardElements";
import { SlotGrid } from "./SlotGrid"
import { ParamGrid } from "./ParamGrid"
import { CardOutputs } from "./CardOutputs"
import { stageSlots } from "@melite/catalog";
import { formOf, narrowGenre } from "@melite/catalog";
import { SubcardGrid } from "./SubcardGrid";
import { hasModifierCapability, modifiersFeatureOf } from "@melite/contracts";
import { useToastStore } from "@melite/ui";
import { useSpecContractStore } from "@/surfaces/shared/specContractStore";
import { cn } from "@melite/ui";
import { audioViewerSlot, meshViewerSlot } from "@melite/slots";

export interface CardDetailBodyProps {
 stage: CardStage;
 /** All stages of the enclosing run — for the input-wiring lookups. */
 upstreams: CardStage[];
 running: boolean;
 actions: Partial<CardActions>;
 /** Clicking the card's output image opens the asset lightbox over the
 * ordered flow card outputs (2026-08-08). Optional so authoring-only
 * surfaces (no lightbox) can omit it. */
 onOpenOutput?: (stage: CardStage) => void;
 /** The drilldown's exit (collapse back to the tile). Optional: a surface
 * with no exit callback renders no X. The X lives IN the header rail
 * (2026-08-22) — same flex row, same chip treatment as Run / In Library —
 * not absolutely positioned over the card corner. */
 onCollapse?: () => void;
}


/**
 * The shared detail body (header + preview + prompt + params + console +
 * graph + actions). Rendered by CardDetailInline — the ONE detail surface
 * (canvas expand-in-place + chat, 2026-08-07: "instead of a modal popup,
 * the card expands with the other cards shrinking"). The legacy Dialog
 * wrapper (CardDetailModal) was the second design — deleted.
 */
function CardDetailBody({
 stage,
 upstreams,
 running,
 actions,
 onOpenOutput,
 onCollapse,
}: CardDetailBodyProps) {
 // drilldown view"). The body is THE card form — always the ParamEditor
 // when the surface can save (the canvas always can). The old result-based
 // flip (setEditing(!stage.result) → a read-only view once a result
 // attached) made the zoomed card CHANGE after loading/generation — the
 // input image became unchangeable. Derived, not state: no flip, no toggle.
 const editing = actions.onEditSave != null;
 const [consoleOpen, setConsoleOpen] = useState(true);
 // Inline rename — the tagKit contract (Enter/blur commits,
 // Esc cancels, autoFocus + select-all). Presence-gated on actions.onRename:
 // surfaces without rename wiring render the plain title, unchanged.
 const [renaming, setRenaming] = useState(false);
 const [renameValue, setRenameValue] = useState("");
 const commitRename = () => {
 setRenaming(false);
 const title = renameValue.trim();
 if (!title || title === stage.title) return; // empty → cancel; unchanged → no-op
 actions.onRename?.(stage.id, title);
 };
 // Schema-driven Modifiers (LoRA + ControlNet subcards) for the card's
 // service: the form-spec is fetched once per service and is the GATE —
 // a service whose spec declares no loras/controlnet capability never
 // renders the subcard grid (rule 3: the catalog is the single source of
 // truth). Fetched for authoring surfaces (onEditSave) regardless of edit
 // mode — the subcard grid is ALWAYS visible in the drill-down.
 //
 // THE CONTRACT (2026-08-11): the spec lives in the Zustand
 // specContractStore — the ONLY path a form-spec enters the app.
 // loadFormSpec validates it (validateSpecContract) before it can drive
 // any UI: a fetch error → state "error" (visible banner + Retry), a spec
 // that declares a capability that cannot render → state "violation"
 // (fail-loud banner — NEVER an empty dropdown). There is no local spec
 // state to silently hold a broken spec.
 const specRec = useSpecContractStore((s) =>
 kindHasFormSpec(stage.kind) ? s.records[stage.service] : undefined,
 );
 const [modifiersSpecRetry, setModifiersSpecRetry] = useState(0);
 // Prompt-visible: SCHEMA-DERIVED, never a domain literal. The form's
 // schema_groups carry each field's visible_when; the generic evaluator
 // decides against the stage's live params (2026-08-21 — this replaced a
 // hardcoded `mode === "inpaint"` mirror of the upscale family's value:
 // core must not know any plugin's param VALUES, only the seams).
 const promptVisible = (() => {
  const groups = specRec?.state === "loaded" ? specRec.spec?.schema_groups : undefined
  for (const g of groups ?? []) {
   for (const f of g.fields ?? []) {
    if (f.name !== "prompt") continue
    return f.visible_when
     ? evalVisibleWhen(f.visible_when, stage.params ?? {})
     : true
   }
  }
  // No spec (or no prompt field declared): the prompt-copy question is
  // moot — fall back to "params" copy only when a prompt key exists but
  // no schema vouches for it rendering.
  return false
 })()
 // Live params mirror — subcard edits fire per change (strength sliders)
 // and must write the LATEST card params, not a render-stale closure.
 const paramsRef = useRef<Record<string, unknown>>(stage.params);
 useEffect(() => {
 paramsRef.current = stage.params;
 }, [stage.params]);

 useEffect(() => {
 // Fetched for EVERY drilldown (not just authoring surfaces): the
 // read-only param grid skips the DECLARED modifier wire locations
 // (loras/controlnets — "LoRA is always a MOD, not a standalone
 // addition", 2026-08-09) from this spec; the SubcardGrid itself stays
 // gated on onEditSave below.
 //
 // Guard (2026-08-10): only generation/chain stages own a catalog model.
 // body/studio-link/input/preview stages carry a display label as
 // `service` (e.g. "body") — fetching a form-spec for it is a category
 // error that used to 500 (the server now 404s, but the fetch is still
 // pointless). Skip cleanly.
 //
 // The fetch + validation live in the specContractStore (the ONE path a
 // spec enters the app). The store record's state IS the guard: error /
 // violation / absent = fetch (the Retry button bumps
 // modifiersSpecRetry, which re-runs this and refetches) (2026-08-11).
 //
 // OPEN-TIME FRESHNESS moved UP into the zoom door (2026-08-22): the
 // overlay fires the fresh revalidation AT OPEN — during the expand morph —
 // and HOLDS the skeleton until every element's verdict lands ("the card
 // stays a skeleton until all elements are ready, then it pops once").
 // This body subscribes PASSIVELY: refiring fresh: true here would flip the
 // record back to "loading" AFTER the reveal — the second pop this design
 // killed. The passive call dedups against the door's in-flight fetch (and
 // still cold-fetches for non-zoom renders).
 if (!kindHasFormSpec(stage.kind)) return;
 void useSpecContractStore.getState().loadFormSpec(stage.service);
 }, [stage.service, stage.kind, modifiersSpecRetry]);

 // NOTE (2026-08-08): NO editing flip here — the drilldown is ONE UI.
 // The old auto-switch (no result → edit mode, result → view mode) made
 // the zoomed card change after generation/revive and locked the input
 // image away ("You literally can't even change the input image"). The
 // editor is always the card; the preview + console carry the run info
 // (see the editing-derived const above).

 // Pending ParamEditor draft (params + optional swapped service). The
 // editor's local draft is auto-saved to stage.params on a 300ms debounce
 // (no Apply button — 2026-08-09); Run reads stage.params. The debounce
 // means a prompt typed in the last 300ms before Run hasn't hit the store
 // yet — without this flush it never reaches the backend (the
 // "generate_image: prompt is required" run failure). ParamEditor reports
 // its live draft via onDraftChange; we snapshot it into this ref and
 // replay it through onEditSave before Run. updateStageParams's set() is
 // synchronous (Zustand), so the flushed params are in the store before
 // executeStage captures the stage.
 const pendingEditRef = useRef<{
 params: Record<string, unknown>;
 service?: string;
 } | null>(null);
 const onDraftChange = useCallback(
 (params: Record<string, unknown>, service?: string) => {
 pendingEditRef.current = { params, service };
 },
 [],
 );
 const handleRun = useCallback(() => {
 if (pendingEditRef.current && actions.onEditSave) {
 actions.onEditSave(
 stage.id,
 pendingEditRef.current.params,
 pendingEditRef.current.service,
 );
 }
 actions.onRun?.(stage.id);
 }, [stage.id, actions]);


 return (
 <div
 // No fixed height, no internal scrollbar (2026-08-07): the expanded
 // card stretches TALL with its content — if it overflows the
 // viewport, the OUTER surface scrolls, never a scrollbar inside
 // the card. SQUARE LAW supersession (2026-08-23): inside the zoom
 // overlay the card is a bounded ≈square panel (flowCardZoom) —
 // the body fills it and the CONTROLS column scrolls internally;
 // below md (and outside the overlay) it still stretches tall.
 className="flex min-h-0 flex-col h-full"
 data-card-detail
 onDoubleClick={
 kindOpensStudio(stage.kind) && actions.onOpenInStudio
 ? () => actions.onOpenInStudio!(stage.id)
 : undefined
 }
 >
 {/* ── Header — the title IS the top (2026-08-10). The raw service
 route key ("krea-2") used to sit here as the ServiceBadge text;
 that's an implementation detail the user doesn't need. The badge
 is icon-only now (genre glyph), and the CARD TITLE is the
 prominent label — flex-1 so Run stays pinned right. Run lives
 here too (2026-08-07): the primary action, one glance away. The
 Collapse X joined the SAME rail (2026-08-22) — it used to be an
 absolutely-positioned corner square with its own ghost/red styling,
 a stranger to the row it floated over. ── */}
 <div className="flex items-center gap-2 border-b px-4 py-2.5 bg-sidebar/40">
 <ServiceBadge
 service={stage.service}
 genre={stage.genre}
 kind={stage.kind}
 />
 <ProvenanceBadge provenance={stage.provenance} />
 <UpstreamBadge stage={stage} />
 {/* Title — prominent, takes the remaining space (pushes Run right).
 Inline rename (Enter/blur commits, Esc cancels) + subtitle. */}
 <div className="flex min-w-0 flex-1 items-center gap-1.5">
 {renaming && actions.onRename ? (
 <input
 value={renameValue}
 onChange={(e) => setRenameValue(e.target.value)}
 onBlur={commitRename}
 onKeyDown={(e) => {
 if (e.key === "Enter") commitRename();
 if (e.key === "Escape") setRenaming(false);
 }}
 autoFocus
 ref={(el) => { if (el && renaming) el.select(); }}
 aria-label="Rename card"
 className="min-w-0 flex-1 rounded border border-brand/50 bg-background/80 px-1 py-0 text-sm font-semibold text-foreground outline-none focus:ring-1 focus:ring-brand/40"
 />
 ) : (
 <h3 className="truncate text-sm font-semibold text-foreground">
 {stage.title}
 </h3>
 )}
 {actions.onRename && !renaming && (
 <Tip tip="Rename card">
 <button
 onClick={() => { setRenameValue(stage.title); setRenaming(true); }}
 className="shrink-0 text-muted-foreground/50 transition-colors hover:text-foreground"
 aria-label="Rename card"
 >
 <Pencil className="h-3 w-3" />
 </button>
 </Tip>
 )}
 {stage.subtitle && (
 <span className="truncate text-[11px] text-muted-foreground/50">
 {stage.subtitle}
 </span>
 )}
 </div>
 {stage.result && stage.result.durationSec !== undefined && (
 <span className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground/70">
 <Clock className="h-3 w-3" />
 {stage.result.durationSec.toFixed(1)}s
 </span>
 )}
 {!kindOpensStudio(stage.kind) &&
 stage.kind !== "preview" &&
 stage.kind !== "body" &&
 actions.onRun && (
 <button
 onClick={handleRun}
 disabled={running}
 className={cn(
 "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all",
 "disabled:cursor-not-allowed disabled:opacity-50",
 "border-brand/40 bg-brand/15 text-brand hover:bg-brand/25",
 )}
 >
 {stage.status === "done" || stage.status === "reused" ? (
 <RotateCw className="h-3.5 w-3.5" />
 ) : (
 <Play className="h-3.5 w-3.5" />
 )}
 {stage.status === "done" || stage.status === "reused"
 ? "Re-run"
 : stage.status === "stale"
 ? "Re-run (stale)"
 : "Run"}
 </button>
 )}
 {/* Save-to-assets toggle (2026-08-12) — hide/unhide the card's output
     in the left sidebar. ALWAYS visible in the detail header (this is
     where the user manages the card). Save = saved (default); SaveOff =
     hidden from sidebar (still persists on disk). 2026-08-16: Save/
     SaveOff icons — was Bookmark/BookmarkCheck, matching the card's
     hover toggle (FlowCard). */}
 {actions.onToggleSaveToAssets && (
 <Tip tip={stage.saveToAssets === false
 ? "Hidden from sidebar — click to show in library"
 : "Saved to library — click to hide from sidebar"}>
 <button
 onClick={() => actions.onToggleSaveToAssets!(stage.id, stage.saveToAssets === false)}
 data-save-to-assets={stage.saveToAssets === false ? "off" : "on"}
 className={cn(
 "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all",
 stage.saveToAssets === false
 ? "border-border/60 bg-background/60 text-muted-foreground hover:bg-sidebar-accent"
 : "border-brand/40 bg-brand/10 text-brand hover:bg-brand/20",
 )}
 >
 {stage.saveToAssets === false
 ? <SaveOff className="h-3.5 w-3.5" />
 : <Save className="h-3.5 w-3.5" />}
  <span className="hidden sm:inline">
  {stage.saveToAssets === false ? "Hidden" : "In Library"}
  </span>
  </button>
  </Tip>
  )}
  {/* Running spinner — NEXT TO THE COLLAPSE X (2026-08-22 operator
      request): it used to ride with the badges at the row's left corner
      ("the loading circle is in the top corner"); the run state reads at
      the header's right edge instead, beside the exit. Same StatusChip,
      position only. */}
  <StatusChip running={running} />
  {/* Collapse (X) — the drilldown's exit as a MEMBER of the header rail
      (2026-08-22). Same flex row → same vertical centering and right edge
      as its neighbors; same chip anatomy as the save toggle's muted
      ("Hidden") state instead of the old floating translucent square that
      flipped red on hover. Only renders when the host provides an exit. */}
  {onCollapse && (
  <Tip tip="Collapse">
  <button
  onClick={onCollapse}
  aria-label="Collapse"
  className={cn(
  "flex items-center rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
  "border-border/60 bg-background/60 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
  )}
  >
  <X className="h-4 w-4" />
  </button>
  </Tip>
  )}
  </div>


  {/* ── Live ComfyUI run strip (2026-08-14) ──
  The SAME activity line + KSampler progress bar the compact tile carries,
  so the ZOOMED card shows the ComfyUI connection at work — model loads
  ("loading CheckpointLoaderSimple"), sampling ("sampling 5/20"), then the
  step bar. Identical no-lie contract: renders ONLY while running with a
  real WS frame / step frame — no frame, no strip (never a fake spinner
  or shimmer). The components null themselves, so this strip is the
  presence gate for the whole live-run block. */}
  {running && (stage.activity || stage.progress) && (
  <div
  className="border-b border-sidebar-border/40 bg-sidebar/20 px-4 py-2"
  data-card-live-strip
  >
  <CardActivityLine stage={stage} running={running} />
  <CardProgressBar stage={stage} running={running} />
  </div>
  )}
  {/* ── SQUARE LAW body split (2026-08-23; rail flipped 2026-09-05,
  operator order: outputs RIGHT of the form): FORM left (scrolls),
  OUTPUT right (fixed 42% rail) at md+. Below md (narrow embeds) it
  stacks exactly as before. */}
  <div className="flex min-h-0 flex-1 flex-row" data-card-detail-body>
  <div className="min-w-0 flex-1 min-h-0 overflow-y-auto scrollbar-thin">

 {/* ── Input slots — the WIREABLE squares (Phase A/B, 2026-08-08) ──
 Every input slot the card declares gets ONE SlotSquare BELOW
 the output preview: file / asset / wire to an earlier card
 (live reference — wire BEFORE the upstream has run; the square
 shows its thumbnail when it produces). Replaces the frozen-URL
 "stage" picker + the read-only Input Wiring list. NOT rendered
 for kind:"input" (the input family is a SOURCE — InputCardEditor
 owns its slot). ── */}
 {stage.kind !== "input" &&
 actions.onEditSave &&
 // Form-aware (2026-08-10): the guard must match what SlotGrid
 // actually renders. stageSlots(params, form) returns [] for
 // text-only forms (form_generate — the closed zero-slot
 // vocabulary), so the "Inputs" header + empty grid disappear.
 // The old hasInputSlots(params) scanned the GLOBAL slot union,
 // saw a lingering input_image key, and rendered "Inputs" above
 // an empty SlotGrid — a header with nothing under it.
 stageSlots(stage.params, formOf(stage.service), stage.service).length > 0 && (
 <div className="border-b border-sidebar-border/40 bg-sidebar/20 px-4 py-3">
 <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
 Inputs
 </label>
 <SlotGrid
 stage={stage}
 upstreams={upstreams}
 onSaveParams={(params) =>
 // userEdit: slot attaches are real edits — never normalized away.
 actions.onEditSave?.(stage.id, params, undefined, { userEdit: true })
 }
 // SlotGrid's wire callback is stage-scoped (slotKey,
 // upstreamId, outputName) — bind this card's id onto the
 // actions contract (stageId, slotKey, upstreamId, outputName).
 onWireSlot={
 actions.onWireSlot
 ? (slotKey, upstreamId, outputName) =>
 actions.onWireSlot!(
 stage.id,
 slotKey,
 upstreamId,
 outputName,
 )
 : undefined
 }
 />
 </div>
 )}

 {/* ── Error ─────────────────────────────────────────────── */}
 {stage.status === "error" && stage.error && (
 <div className="mx-4 mt-3 rounded-md border border-destructive/30 bg-destructive/8 px-3 py-2">
 <div className="flex items-start gap-2">
 <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
 {/* Full error (2026-08-10): backend errors carry real
 newlines once the JSON is unescaped (validation
 reports, doc parse errors) — pre-wrap keeps the
 report's line structure, break-words keeps long
 tokens from overflowing the modal. */}
 <p className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-destructive">
 {stage.error}
 </p>
 </div>
 </div>
 )}

 {/* ── Title + subtitle moved to the HEADER (2026-08-10): the
 card title is the prominent label at the top of the detail
 now — next to the genre-icon chip, not buried below the
 preview + inputs. ── */}

 {/* ── All params grid ───────────────────────────────────── */}
 <div className="px-4 pb-3">
 {stage.kind === "input" ? (
 // The doc-driven input family has no catalog entry + no form
 // spec; its params shape is FIXED by the family signature
 // (source / crop / scale / trim / volume). InputCardEditor
 // renders that fixed set, gated by the detected media type
 // (image→crop+scale, video→scale+trim, audio→trim+volume).
 // ParamGrid + SubcardGrid don't apply — no schema, no LoRA/CN.
 <>
 <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
 Media Prep
 </label>
 <InputCardEditor
 stage={stage}
 onSave={(params) =>
 // userEdit: explicit editor commits are real edits — never normalized.
 actions.onEditSave?.(stage.id, params, undefined, { userEdit: true })
 }
 />
 </>
 ) : notchesOf(
 // NOTCH LAW (2026-09-03, plan B1): the spec's layout notch IS the
 // studio door for python action cards — notchesOf is THE single
 // definition of what the defaults are (absent keys = base defaults).
 // A card declaring layout="studio" (h3-timeline today) authors its
 // params in its registered studio body (cardStudios resolves the
 // tenant); an inline ParamGrid here would be a second authoring
 // surface. The notch audit pins both directions server-side — a
 // studio-declaring card always has its tenant.
 // the store holds the validated spec typed as FormSpec (the
 // validator's crossing at the store boundary) — no cast needed.
 specRec?.state === "loaded" ? specRec.spec : null,
 ).layout === "studio" ? (
 null
 ) : narrowGenre(stage.genre) === "motion" ? (
 // CARDBLESS-LANE BRIDGE: motion has no card.py yet, so its spec
 // carries no layout notch — this predicate (and mask-studio's below)
 // covers the cardless lanes until they declare cards. The notch
 // above is the authoritative door for cards that have one; these
 // two bridges retire with their lanes' card.py (the open item).
 null
 ) : stage.service === "mask-studio" ? (
 // Mask cards have a registered studio (cardStudios.ts, tenant #3): the
 // zoom overlay renders CardStudio + MaskStudioEditor there — this
 // inline path is unreachable for them. Same guard as motion's: the
 // studio renders the schema fields as native canvas-adjacent controls
 // (detect modes, scrub thresholds, the output strip); a ParamGrid here
 // would be a second authoring surface for the same params.
 null
 ) : (
 <>
 {/* 4-zone anatomy (card-studio-pattern.md §4): in EDIT mode the
 ParamEditor renders the zone headers itself (Model →
 Parameters); the outer "Parameters" label would duplicate
 them, so it is suppressed here. Read-only keeps it — the
 read-only grid has no zone headers of its own. Studio-linked
 cards (actions.onEdit) render the read-only grid too, so the
 label stays for them. */}
 {!(editing && !actions.onEdit) && (
 <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
 Parameters
 </label>
 )}
 <ParamGrid
 stage={stage}
 editing={editing && !actions.onEdit}
 onSave={(p, svc) => {
 actions.onEditSave?.(stage.id, p, svc);
 }}
 onDraftChange={onDraftChange}
 // The DECLARED modifier wire locations (loras / controlnets
 // / ip_adapters / image_ops — spec features.modifiers
 // param_keys). LoRA is a MOD, never a standalone addition
 // (2026-08-09): the read-only param grid must not render the
 // mod bags as raw JSON rows — the SubcardGrid owns them.
 modifierParamKeys={modifiersFeatureOf(specRec?.spec ?? null).map(
 (k) => k.param_key,
 )}
 />

 {/* ── Modifier subcards (docs/design/modifier-subcards.md) ────
 Image-capability cards carry loras/controlnets in the same
 param bag the run wire compiles (compile → family →
 apply_loras / apply_controlnets). The mini-grid exists iff
 the service's form-spec declares the capability — ALWAYS
 visible in the drill-down (influence is never behind an
 Edit-mode click). Order = drag; edits persist through the
 same onEditSave → updateStageParams path (cache keys +
 stale marking just work). */}
 {/* NO SILENT DROPS (2026-08-11): a failed fetch is a VISIBLE error
 with Retry, and a spec that violates the contract (declared
 capability that cannot render — zero options / all-uninstalled /
 malformed) is a fail-loud VIOLATION banner. Neither can ever be a
 silently-hidden mod grid. Verdicts come from the specContractStore —
 the only path a form-spec enters the app. */}
 {/* NO SILENT LOADING (2026-08-11): the form-spec fetch retries 502s for
  up to ~15s (apiFetch budget) — during a gateway restart window that
  whole stretch used to render NOTHING below the params ("open create
  image, no mod slot; reopen it, mod slot" — the fetch had resolved
  between close and reopen). The loading verdict gets a face too: a bare
  empty form is never a state this surface can be in. */}
 {/* 2026-08-14: the loading face is a shadcn SKELETON shaped like the
 grid it stands in for (heading bar + md tiles — SlotSquare md is
 h-20 w-20 rounded-lg), not a text strip: the user watches the mod
 region's shape materialize instead of reading about it. The testid
 + role=status stay — the face must remain discoverable (NO SILENT
 LOADING, 2026-08-11). */}
 {actions.onEditSave && specRec?.state === "loading" && (
 <div
 className="mt-3 space-y-2.5"
 data-testid="modifiers-spec-loading"
 role="status"
 aria-label="Loading modifiers"
 >
 <Skeleton className="h-3 w-28" />
 <div className="flex gap-1.5">
 <Skeleton className="h-20 w-20 rounded-lg" />
 <Skeleton className="h-20 w-20 rounded-lg" />
 <Skeleton className="h-20 w-20 rounded-lg" />
 </div>
 </div>
 )}
 {actions.onEditSave && specRec?.state === "error" && (
 <div
 className="mx-4 mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm"
 data-testid="modifiers-spec-error"
 >
 <div className="min-w-0">
 <div className="font-medium text-red-400">
 Modifiers failed to load — capabilities hidden
 </div>
 <div className="mt-0.5 break-words font-mono text-xs text-red-300/80">
 {specRec.error}
 </div>
 </div>
 <button
 type="button"
 onClick={() => setModifiersSpecRetry((n) => n + 1)}
 className="shrink-0 rounded border border-red-500/50 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20"
 >
 Retry
 </button>
 </div>
 )}
 {actions.onEditSave && specRec?.state === "violation" && (
 <div
 className="mx-4 mb-3 flex items-start justify-between gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
 data-testid="modifiers-contract-violation"
 >
 <div className="min-w-0">
 <div className="font-medium text-amber-400">
 CONTRACT VIOLATION — declared modifiers cannot render
 </div>
 {specRec.violations.map((v, i) => (
 <div
 key={i}
 className="mt-1 break-words font-mono text-xs text-amber-300/80"
 >
 <span className="font-semibold">{v.kind}:</span> {v.message}
 </div>
 ))}
 </div>
 <button
 type="button"
 onClick={() => setModifiersSpecRetry((n) => n + 1)}
 className="shrink-0 rounded border border-amber-500/60 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/20"
 >
 Retry
 </button>
 </div>
 )}
 {actions.onEditSave &&
 specRec?.state === "loaded" &&
 specRec.spec &&
 hasModifierCapability(specRec.spec) && (
 <>
 {/* ── Mods zone — the ADD-MODS BUTTON flow ONLY (2026-09-05,
 operator order, verbatim: "THERE WAS A BUTTON WE HAD TO ADD
 [REDACTED 2026-11-05] MODS... YOU ADDED A MENU, I DIDN'T WANT THAT" — the
 menu sections are deleted; the mask rides the button beside
 LoRA/ControlNet as an addable tile kind). Skip-empty: no
 modifier capability → no header. ── */}
 <SubcardGrid
 stage={stage}
 formSpec={specRec.spec}
 onSaveParams={(params) =>
 // userEdit: the mod-bag commit — the store must ALWAYS write it
 // (the additive swallow deleted the first add on key-less bags).
 actions.onEditSave?.(stage.id, params, undefined, { userEdit: true })
 }
 toast={(type, msg) =>
 useToastStore
 .getState()
 .addToast(type as "error" | "success" | "info", msg)
 }
 priorStages={upstreams.filter((s) => {
 const idx = upstreams.findIndex((u) => u.id === s.id);
 return idx < upstreams.findIndex((u) => u.id === stage.id) && s.result?.assetUrls?.length;
 })}
 />
 </>
 )}
 </>
 )}
 </div>

 {/* ── Comfy graph ("comfy-script renders below") ────────── */}
 {stage.comfyGraph != null && (
 <div className="mx-4 mb-3 rounded-lg border border-sidebar-border/50 bg-sidebar/30 p-3">
 <details className="group">
 <summary className="flex cursor-pointer items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 hover:text-foreground">
 <GitBranch className="h-3 w-3 text-brand/70" />
 Comfy graph (this step's workflow)
 <ChevronDown className="ml-auto h-3 w-3 transition-transform group-open:rotate-180" />
 </summary>
 <pre className="mt-1.5 max-h-48 overflow-auto rounded bg-background/60 p-2 text-[10px] leading-tight text-muted-foreground scrollbar-thin">
 {typeof stage.comfyGraph === "string"
 ? stage.comfyGraph
 : JSON.stringify(stage.comfyGraph, null, 2)}
 </pre>
 </details>
 </div>
 )}

 {/* ── Console (run log tail — replaces the three-pane right
 pane; every surface's detail gets the same console) ── */}
 {stage.console && (
 <div className="mx-4 mb-3 rounded-lg border border-sidebar-border/50 bg-sidebar/30 p-3">
 <div className="flex items-center gap-2">
 <Terminal className="h-3 w-3 text-brand/70" />
 <button
 onClick={() => setConsoleOpen((c) => !c)}
 className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 hover:text-foreground"
 >
 Console
 {consoleOpen ? (
 <ChevronUp className="h-3 w-3" />
 ) : (
 <ChevronDown className="h-3 w-3" />
 )}
 </button>
 <Tip tip="Copy log">
 <button
 onClick={() =>
 navigator.clipboard?.writeText(stage.console ?? "")
 }
 className="ml-auto flex items-center gap-1 rounded border border-sidebar-border/50 px-1.5 py-0.5 text-[9px] text-muted-foreground hover:border-brand/40 hover:text-brand"
 >
 <Copy className="h-2.5 w-2.5" /> Copy
 </button>
 </Tip>
 </div>
 {consoleOpen && (
 <pre className="mt-1.5 max-h-40 overflow-auto rounded bg-background/60 p-2 text-[10px] leading-tight text-muted-foreground scrollbar-thin whitespace-pre-wrap">
 {stage.console}
 </pre>
 )}
 </div>
 )}

 {/* ── Metadata ──────────────────────────────────────────── */}
 {stage.result && Object.keys(stage.result.metadata).length > 0 && (
 <div className="px-4 pb-4">
 <details className="group">
 <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 hover:text-foreground">
 Raw metadata ({Object.keys(stage.result.metadata).length}{" "}
 keys)
 </summary>
 <pre className="mt-1.5 max-h-40 overflow-auto rounded bg-sidebar/40 p-2 text-[10px] leading-tight text-muted-foreground scrollbar-thin">
 {JSON.stringify(stage.result.metadata, null, 2)}
 </pre>
 </details>
 </div>
 )}
  </div>

  <div className="w-[42%] shrink-0 border-l border-sidebar-border/40">
 {/* ── Outputs zone (the action-card form pattern, 2026-08-16:
 Outputs → Inputs → Model → Parameters → Mods) — the RIGHT RAIL
 (2026-09-05 operator order: outputs sit RIGHT of the form):
 the declared output contract (primary artifact + format vocabulary +
 optional outputs, from the catalog family block) above the artifacts
 themselves. ONE shared component for every card (CardOutputs) — the
 old unlabeled "Large preview" block IS this zone's artifact area. */}
 <CardOutputs stage={stage}>
 {/* ── Large preview — the OUTPUT, FIRST */}
 {stage.result && stage.result.assetUrls.length > 0 ? (
 <CardPreview stage={stage} onOpenOutput={onOpenOutput} />
 ) : (
 <div className="flex items-center gap-2 bg-sidebar/20 px-4 py-2 text-muted-foreground/40">
 {kindOpensStudio(stage.kind) ? (
 <>
 <Sparkles className="h-3.5 w-3.5 text-brand/40" />
 <span className="text-[11px]">
 Double-click to open in studio
 </span>
 </>
 ) : (
 <>
 <ImageIcon className="h-3.5 w-3.5" />
 {/* Schema-honest copy: prompt-less stages (upscale, 3D,
 edit) never tell the user to "type your prompt"
 (2026-08-07 — the upscale card used to be served a
 fake {prompt, seed} form; the copy followed). */}
 <span className="text-[11px]">
 {stage.params &&
 "prompt" in stage.params &&
 // Prompt copy ONLY when the served schema says the prompt field
 // renders under the current params (promptVisible above — the
 // schema_groups visible_when, evaluated generically).
 promptVisible
 ? "No output yet — type your prompt and Run"
 : "No output yet — set your parameters and Run"}
 </span>
 </>
 )}
 </div>
 )}
 </CardOutputs>
  </div>
  </div>

 {/* ── Action bar — the external studio handoff ONLY (2026-08-08): the
 "Edit params" toggle is GONE with the edit/view flip — the
 drilldown is ONE UI and the editor is always on the card. Run
 lives in the header; the card's X (collapse) is the exit. Hidden
 for preview/body kinds. ── */}
 {stage.kind !== "preview" &&
 stage.kind !== "body" &&
 actions.onEdit && (
 <div className="flex items-center gap-2 border-t px-4 py-2.5 bg-sidebar/30">
 <button
 onClick={() => actions.onEdit?.(stage.id)}
 className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors border-sidebar-border/50 text-muted-foreground hover:border-brand/40 hover:text-brand"
 >
 <Pencil className="h-3.5 w-3.5" />
 Edit params
 </button>
 </div>
 )}
 </div>
 );
}

// ── The inline detail — THE detail (1:1 everywhere) ─────────────────────────
// ONE DESIGN (2026-08-07): the card expands INLINE — "instead of a modal
// popup, the card expands with the other cards shrinking." The modal
// (CardDetailModal) was the second design — deleted (rule 4).

/** The expand-in-place detail (canvas + chat, 2026-08-07). Renders the
 * IDENTICAL body everywhere — 1:1 detail, no overlay. The surface owns
 * the panel's sizing; the body fills it (h-full flex-col). */
export function CardDetailInline(props: CardDetailBodyProps) {
 return <CardDetailBody {...props} />;
}

// ── Default preview — hero + motion picker + gallery + thumbs ──────────────

export function CardPreview({
 stage,
 onOpenOutput,
}: {
 stage: CardStage;
 /** Clicking the output image opens the asset lightbox over the ordered
 * flow card outputs (2026-08-08) — the zoom-in cursor signals it. */
 onOpenOutput?: (stage: CardStage) => void;
}) {
 const [motionIdx, setMotionIdx] = useState<number | null>(null);
 const [galleryIdx, setGalleryIdx] = useState(0);
 // Pruned-run state (2026-09-05): dead artifact URLs swap to the missing
 // cell at onError — a bare <img> renders its alt text ("krea-2") as
 // document content. A set: the hero shows one url while up to 8 thumbs
 // render beside it. Compared by url so a re-run renders without a reset.
 const [deadUrls, setDeadUrls] = useState<ReadonlySet<string>>(new Set());
 const markDead = (url: string) =>
 setDeadUrls((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
 useEffect(() => {
 setMotionIdx(null);
 setGalleryIdx(0);
 }, [stage.id]);

 const urls = stage.result?.assetUrls ?? [];
 const gallery = stage.result?.gallery ?? [];
 const mps = stage.result?.motionPreviews ?? [];
 const isGlb = (u: string) => u.endsWith(".glb") || u.endsWith(".gltf");
 const isVideo = (u: string) =>
 u.endsWith(".mp4") || u.endsWith(".webm") || u.startsWith("data:video/");
 // Genre-driven like FlowCard's isAudioOutput — the catalog declares
 // `genre: audio` on every audio family; extension-only matching missed
 // artifact URLs without a suffix (or with query params) and fell through
 // to the <img> branch → broken image in the drilldown.
 const isAudio = (u: string) =>
 stage.genre === "audio" ||
 /\.(mp3|wav|flac|ogg|m4a|aac)(\?|#|$)/i.test(u) ||
 u.startsWith("data:audio/");

 const showingMotion = mps.length > 0 && motionIdx !== null;
 const galleryUrl =
 gallery.length > 0
 ? gallery[Math.min(galleryIdx, gallery.length - 1)]?.url
 : undefined;
 const previewUrl = showingMotion
 ? (mps[motionIdx!]?.url ?? urls[0])
 : (galleryUrl ?? urls[0]);

 return (
 <div className="relative flex items-center justify-center overflow-hidden bg-sidebar/20 min-h-0 flex-1">
 {/* Motion picker — auto-baked motion previews (kimodo etc.) */}
 {mps.length > 0 && (
 <div className="flex flex-wrap items-center gap-1 bg-sidebar/40 px-3 py-2">
 <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/60">
 Motion
 </span>
 <button
 onClick={() => setMotionIdx(null)}
 className={cn(
 "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
 motionIdx === null
 ? "bg-brand/20 text-brand"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 Main output
 </button>
 {mps.map((m, i) => (
 <button
 key={i}
 onClick={() => setMotionIdx(i)}
 className={cn(
 "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
 motionIdx === i
 ? "bg-brand/20 text-brand"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 {m.label}
 </button>
 ))}
 </div>
 )}

 {!previewUrl ? (
 // Guarded: assetUrls can hold a non-string entry from a revived
 // doc, making urls[0] undefined — the isVideo/isAudio/isGlb
 // helpers would crash on .endsWith (motion card 2026-08-10).
 // Explicit state, never blank.
 <div className="flex items-center justify-center bg-sidebar/20 px-4 py-8 text-xs text-muted-foreground/40">
 No output to show
 </div>
 ) : isVideo(previewUrl) ? (
 <video
 src={previewUrl}
 className="max-h-full w-auto max-w-full object-contain"
 controls
 autoPlay
 loop
 muted
 playsInline
 />
 ) : isAudio(previewUrl) ? (
 // Audio output — the full WaveSurfer waveform (bars) + play/pause
 // transport + seek-on-click. This is the "waves" the user can
 // interact with in the drilldown. Replaces the bare
 // <audio controls> that rendered no waveform at all.
 <div className="p-4">
 <AudioViewerFromSeam url={previewUrl} />
 <div className="mt-2 flex items-center justify-between gap-2">
 <Tip tip={previewUrl}>
 <span
 className="truncate font-mono text-[10px] text-muted-foreground/60"
 >
 {decodeURIComponent(previewUrl.split("/").pop() ?? "audio")}
 </span>
 </Tip>
 <button
 onClick={() => {
 // Canonical download pattern (AppSidebar.handleDownload):
 // an <a> with download= forces a named save — the browser
 // never shows the "blob" dialog with an unknown filename.
 const link = document.createElement("a")
 link.href = previewUrl
 link.download = decodeURIComponent(
 previewUrl.split("/").pop() ?? "audio",
 )
 link.click()
 }}
 className="inline-flex items-center gap-1.5 rounded-md border border-brand/30 bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand transition-colors hover:bg-brand/20"
 >
 <Download className="h-3.5 w-3.5" />
 Save audio
 </button>
 </div>
 </div>
 ) : isGlb(previewUrl) ? (
 // Live GLB view — baked motion clips play (kimodo GLB previews),
 // static GLBs render as stills (the mixer only exists when clips do).
 // Replaces the static Box placeholder (2026-08-10 motion card).
 <div className="flex h-full items-center justify-center">
 <div className="h-full w-full">
 <MeshViewerFromSeam url={previewUrl} className="h-full" />
 </div>
 <p className="pointer-events-none absolute right-3 top-3 font-mono text-[10px] text-muted-foreground/60">
 {previewUrl.split("/").pop()}
 </p>
 </div>
 ) : (
 deadUrls.has(previewUrl) ? (
 <MissingArtifactCell label={stage.title} className="max-h-full w-full self-stretch" />
 ) : (
 <img
 src={previewUrl}
 alt={`${stage.title} output`}
 className="max-h-full w-auto max-w-full object-contain"
 onClick={onOpenOutput ? () => onOpenOutput(stage) : undefined}
 style={onOpenOutput ? { cursor: "zoom-in" } : undefined}
 onError={() => markDead(previewUrl)}
 />
 )
 )}

 {/* Gallery nav (render_glb_views → 8 views) */}
 {gallery.length > 1 && (
 <div className="flex items-center gap-2 bg-sidebar/30 px-3 py-1.5">
 <button
 onClick={() => setGalleryIdx((i) => Math.max(0, i - 1))}
 className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
 aria-label="Previous view"
 >
 ←
 </button>
 <span className="font-mono text-[9px] tabular-nums text-muted-foreground/70">
 {gallery[Math.min(galleryIdx, gallery.length - 1)]?.name ??
 `${galleryIdx + 1}/${gallery.length}`}
 </span>
 <button
 onClick={() =>
 setGalleryIdx((i) => Math.min(gallery.length - 1, i + 1))
 }
 className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
 aria-label="Next view"
 >
 →
 </button>
 <div className="ml-auto flex gap-1">
 {gallery.map((_, i) => (
 <button
 key={i}
 onClick={() => setGalleryIdx(i)}
 className={cn(
 "h-1.5 rounded-full transition-all",
 i === Math.min(galleryIdx, gallery.length - 1)
 ? "w-3 bg-brand"
 : "w-1.5 bg-sidebar-border/60",
 )}
 aria-label={`View ${i + 1}`}
 />
 ))}
 </div>
 </div>
 )}

 {/* Thumbs strip */}
 {urls.length > 1 && (
 <div className="flex gap-1 overflow-x-auto scrollbar-thin bg-sidebar/30 px-2 py-1.5">
 {urls.slice(0, 8).map((url, i) => (
 typeof url === "string" && deadUrls.has(url) ? (
 <MissingArtifactCell
 key={i}
 label={`${stage.title} view ${i + 1}`}
 className="h-12 w-12 shrink-0 rounded border border-sidebar-border/60"
 />
 ) : (
 <img
 key={i}
 src={url}
 alt={`${stage.title} view ${i + 1}`}
 className="h-12 w-12 shrink-0 rounded border border-sidebar-border/60 object-cover"
 onError={() => { if (typeof url === "string") markDead(url) }}
 />
 )
 ))}
 </div>
 )}
 </div>
 );
}

// ── Sub-components ────────────────────────────────────────────────────────

// ── Input slots (Phase A/B, 2026-08-08) ────────────────────────────────────
// The wireable squares live in SlotGrid.tsx (one SlotSquare per declared
// slot, top of the card): file / asset / wire to an earlier card — live
// reference, wireable BEFORE the upstream has run. INPUT_SLOTS stays here
// as the shared vocabulary (ParamGrid's hide-set).

// ── viewer seam hosts (2026-08-21) ────────────────────────────────────────
// The dialog's audio/GLB viewers FLOW IN over the ui-claim wire
// (audio / 3d); these are thin hosts — subscribe, resolve,
// render, and fail honest (a visible "disabled" note) when the owning
// plugin's claim is absent.

function AudioViewerFromSeam({ url }: { url: string }) {
  audioViewerSlot.useVersion()
  const Viewer = audioViewerSlot.resolve(null)?.Viewer
  if (!Viewer) {
    return (
      <div className="p-4 text-sm text-muted-foreground/60">audio viewer plugin disabled</div>
    )
  }
  return <Viewer url={url} mode="full" />
}

function MeshViewerFromSeam({ url, className }: { url: string; className?: string }) {
  meshViewerSlot.useVersion()
  const Viewer = meshViewerSlot.resolve(null)?.Viewer
  if (!Viewer) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground/60">
        mesh viewer plugin disabled
      </div>
    )
  }
  return <Viewer url={url} mode="full" className={className} />
}
