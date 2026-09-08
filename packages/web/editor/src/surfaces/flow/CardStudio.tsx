/**
 * CardStudio — the universal wide authoring surface for a card (spec:
 * docs/design/card-studio-pattern.md, Phase 1). ONE frame, TWO regions:
 *
 *   RAIL (left)  ALL the chrome, stacked: title + close, the tenant's
 *                projected TOOLS (§7.10), the NODE INPUTS fold (E3 — the
 *                SAME ParamGrid the card detail renders, from the same
 *                params; collapsed by default), and Run. Vertical space
 *                is the scarce axis (the subjects are human figures): no
 *                full-width strips, no badges bar, no contract line — the
 *                tenant pays ZERO chrome height (spec §7.9/§7.11).
 *   TENANT       the genre's bespoke param editor, full panel height and
 *                all remaining width (VIEWPORT above, STRIP below — the
 *                tenant owns its internal layout; motion = 3D stage +
 *                timeline strip). Props per StudioTenantProps (E1):
 *                {stage, running, onSave} + the optional CALLER forwards
 *                upstreams / onRun / onWireSlot (tenant #3, 2026-08-15).
 *
 * THE FRAME IS NOT A PORTAL (2026-08-15, "the animation is for a small
 * card" verdict): CardZoomOverlay renders THIS component as the content of
 * its shared-element box. The tile therefore morphs STRAIGHT into the
 * wide studio panel — there is no 680px intermediate card to cover, and
 * closing reverses the SAME morph back into the tile. No portal, no
 * backdrop, no Esc handler, no entrance animation here: the overlay owns
 * all of it (skeleton-during-morph, backdrop click, layered Esc).
 *
 * AI-FIRST (spec §1): the studio adds ZERO agent surface. Everything it
 * writes is node inputs via onSave — the same channel the agent uses. It
 * exists only because humans can't type joint arrays.
 *
 * WIDTH LIVES HERE (spec §5/§7.1): the card stays uniform at 680px; the
 * studio-sized shared box is the only place that gets wide. No per-genre
 * width exceptions.
 *
 * State across open/close (spec §5): studio state = f(stage.params) — the
 * tenant rehydrates on mount; ephemeral view state (frameIdx, zoom) resets
 * and is NEVER persisted to params.
 */
import { useCallback, useEffect, useState } from "react"
import { ChevronDown, Play, RotateCw, SlidersHorizontal, Square, X } from "lucide-react"
import type { CardStage } from "@melite/contracts"
import { loadCatalog, dropdownModels, cardSlotsFor, inputSlots, isUndeclaredWireSlot } from "@melite/catalog"
import { CardRunFeedback } from "./CardRunFeedback"
import type { CardBody } from "@melite/slots"
import { ParamGrid } from "./ParamGrid"
import { StudioRailCtx } from "@melite/slots"
import { Tip } from "@melite/ui/tip"
import { cn } from "@melite/ui"
import { editorClient } from "@/rpc/editorClient"
import { useToastStore } from "@melite/ui"

/** The tenant contract (E1): onSave is the ONLY param write channel; the
 *  two optional forwards are the CALLER's functions, never the tenant's
 *  own state. A tenant has no store access, no stage setState, no
 *  fetches, no RPC imports (card-studio-boundary.test.ts).
 *
 *  Added at tenant #3 (2026-08-15, the mask studio — an image-CONSUMING
 *  card): `upstreams` is read-only context (wire resolution), `onRun` is
 *  the shell's Run forwarded (one-gesture flows: Segm/Bbox write params
 *  THEN run), `onWireSlot` is the ONE graph-edge channel → setSlotInput
 *  (the same write the form view's SlotGrid makes — a wire is not a
 *  param, so it is not onSave, but it is still the caller's action, the
 *  identical write the unflagged form view offers). Motion (#1) and body
 *  (#2) accept {stage, onSave} and are unaffected. */

/** A registered studio entry (tenant + its declared write surface) —
 *  defined ONCE in cardStudios.ts (E2/E4) so the shell's prop type can't
 *  drift weaker than the registry's. */

export function CardStudio({
  stage,
  running,
  entry,
  onSave,
  onServiceChange,
  onClose,
  onRun,
  upstreams,
  onWireSlot,
}: {
  stage: CardStage
  running: boolean
  entry: CardBody
  /** The ONE param write channel, routed by the caller to updateStageParams —
   *  identical to the inline editor's and the agent's path. */
  onSave: (params: Record<string, unknown>) => void
  /** Model switch (2026-09-06, the missing Model dropdown): the shell owns
   *  the service picker the way it owns Run — genre-blind, catalog-driven
   *  (siblings = the stage service catalog form, same derivation as the
   *  form world AxisRows). The caller commits (params, service) through
   *  the SAME onEditSave door the form world uses. Tenants stay untouched
   *  (E1 — a switch is not a param, so it is not onSave). Absent = no
   *  picker (read-only hosts keep the studio usable on its bound model). */
  onServiceChange?: (params: Record<string, unknown>, service: string) => void
  /** Collapse the drilldown (the overlay's onClose — same morph back). */
  onClose: () => void
  /** Bound by the caller (actions.onRun bound to stage.id). Studio Run is
   *  the direct action — the studio holds no ParamEditor draft to flush. */
  onRun?: () => void
  /** READ-ONLY context forwarded to the tenant (StudioTenantProps): the
   *  run's stages in order. Never a write channel. */
  upstreams?: CardStage[]
  /** The graph-edge channel, stage-scoped by the caller — forwarded to
   *  the tenant verbatim (tenants that don't wire ignore it). */
  onWireSlot?: (
    slotKey: string,
    upstreamId: string | null,
    outputName?: string | null,
  ) => void
}) {
  const [paramsOpen, setParamsOpen] = useState(false)
  // The rail's TOOLS slot (§7.10): tenants PROJECT their tool buttons into
  // this div via StudioRail (a portal). The shell stays genre-blind — it
  // owns the slot, never the tools.
  const [toolsEl, setToolsEl] = useState<HTMLDivElement | null>(null)
  const Tenant = entry.body
  const toast = useToastStore((s) => s.addToast)

  // ── MODEL SWITCH (2026-09-06, the missing Model dropdown) ──────────
  // Siblings = the stage service catalog form (same derivation as the
  // form world AxisRows: tree heads only — variant/quant cells belong
  // to their own axis dropdowns, never this list; cell display maps
  // through modelHeads). Rendered only when the caller commits switches
  // AND more than one sibling exists. A stage whose service is not a
  // catalog model (display-label services) yields no form, no row.
  const [modelOpts, setModelOpts] = useState<{ key: string }[]>([])
  const [modelHeads, setModelHeads] = useState<Record<string, string>>({})
  const [modelForm, setModelForm] = useState<string | null>(null)
  useEffect(() => {
    if (!onServiceChange) return
    let cancelled = false
    loadCatalog()
      .then((cat) => {
        if (cancelled) return
        const form = cat.models?.[stage.service]?.form ?? null
        setModelForm(form)
        if (!form) { setModelOpts([]); return }
        const isAxisRoute = (r: string) =>
          Object.entries(cat.models ?? {}).some(
            ([key, m]) =>
              key !== r &&
              !m?.hide_from_dropdown &&
              (m?.variants ?? []).some((v) => v?.route === r),
          )
        setModelOpts(dropdownModels(form, cat).filter((r) => !isAxisRoute(r)).map((r) => ({ key: r })))
        const headOf: Record<string, string> = {}
        for (const [key, m] of Object.entries(cat.models ?? {})) {
          if (m?.hide_from_dropdown) continue
          for (const v of m?.variants ?? []) {
            if (v?.route) headOf[v.route] = key
          }
        }
        setModelHeads(headOf)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setModelOpts([])
          setModelForm(null)
          console.error("[CardStudio] model catalog load failed for " + stage.service + ".", e)
        }
      })
    return () => { cancelled = true }
  }, [stage.service, onServiceChange])

  const handleServiceChange = useCallback((target: string) => {
    if (!onServiceChange || target === stage.service) return
    // Model-aware preservation (mirrors the form world): the TARGET
    // service schema vocabulary wins — extra=forbid rows refuse stale
    // keys, so a trellis input_image carried onto transfer_rig would be
    // a refusal, never a silent extra. TEXT_KEYS mirrors the form world
    // text vocabulary; wire slots always survive the swap.
    const preserve = new Set<string>(["prompt", "negative_prompt", "lyrics"])
    for (const s of cardSlotsFor(target, modelForm) ?? inputSlots()) preserve.add(s)
    for (const k of Object.keys(stage.params)) {
      if (isUndeclaredWireSlot(k)) preserve.add(k)
    }
    const next: Record<string, unknown> = {}
    for (const k of Object.keys(stage.params)) {
      if (preserve.has(k)) next[k] = stage.params[k]
    }
    onServiceChange(next, target)
  }, [onServiceChange, stage.service, stage.params, modelForm])

  // ── Stop (control plane, shell-owned 2026-08-15) ─────────────────────
  // The shell owns Run, so it owns Interrupt — the ONE RPC a tenant ever
  // needed was motion's Freeze (editorClient.stopRun), and a tenant that
  // imports the RPC facade can bypass onSave entirely. Moved here, no
  // tenant has any reason to import editorClient (enforced by
  // card-studio-boundary.test.ts). runId: the store stamps the ACTIVE
  // run's id on the stage from the first poll tick (CardStage.runId,
  // 2026-08-15); the metadata fallback only exists post-completion —
  // deriving from metadata ALONE left Stop unrenderable mid-run (the
  // bug: "Run button doesn't turn into stop button after a run").
  const runId =
    stage.runId ??
    (typeof stage.result?.metadata?.runId === "string"
      ? (stage.result.metadata.runId as string)
      : null)
  const handleStop = useCallback(() => {
    if (!running || !runId) return
    toast("info", "Stopping run…")
    editorClient.stopRun(runId).catch((e: unknown) => {
      toast("error", `Stop failed: ${(e as Error).message}`)
    })
  }, [running, runId, toast])

  // SIZING IS DETERMINISTIC (2026-08-15): the frame is h-full/min-h-0 of
  // the shared box from the FIRST frame — never content-hugging. A hugging
  // frame re-sizes as the tenant's async content settles (mesh load,
  // timeline measure) and the morph plays against a moving target.
  // Fixed frame first, content fills it.
  return (
    <StudioRailCtx.Provider value={toolsEl}>
    <div
      data-testid="card-studio-panel"
      role="dialog"
      aria-modal="true"
      aria-label={`${stage.title} — studio`}
      className="relative flex h-full min-h-0 w-full flex-row"
    >
      {/* The overall-card close — one floating ✕ at the panel's
          TOP-RIGHT corner (2026-09-02, operator: "the X button on the
          top right of the OVERALL card, not that little section"). It
          used to share the left rail's title line, which lands ~320px
          in and reads as top-LEFT of the whole studio. A direct child
          of the panel (the `relative` root) so the corner is the
          CARD's corner; same size/hover as the old rail ✕, with a
          chrome-solid background so it never dissolves into tenant
          content underneath. */}
      <Tip tip="Close studio (Esc)">
        <button
          onClick={onClose}
          aria-label="Close studio (Esc)"
          data-testid="card-studio-close"
          className="absolute right-3 top-3 z-50 flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-sidebar/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-destructive hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </Tip>
      {/* ── THE RAIL (left) — ALL the chrome ────────────────────────── */}
      {/* Vertical space is the scarce axis: title, tools, the
          node-inputs fold, Run. Nothing else — no badges bar, no contract
          line (v2 verdict: a bar that restates the contract is noise; the
          contract lives in the spec, not the UI). The tenant pays zero
          chrome height and gets the full panel. */}
      <div className="flex min-h-0 w-[320px] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-sidebar/25">
        {/* Title block */}
        <div className="shrink-0 border-b border-white/[0.07] bg-gradient-to-b from-brand/[0.08] to-transparent px-4 pb-3 pt-4">
          {/* Title owns the line alone. CLOSE lives at the TOP-RIGHT OF
              THE OVERALL CARD now (2026-09-02, operator: "the X button
              on the top right of the OVERALL card, not that little
              section") — sharing this rail title line put it ~320px in,
              which reads as top-LEFT of the whole studio. */}
          <div className="flex items-start gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold leading-7 text-foreground">
                {stage.title}
              </h3>
              {stage.subtitle && (
                <p className="truncate text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
                  {stage.subtitle}
                </p>
              )}
              {onServiceChange && modelOpts.length > 1 && (
                <label className="mt-2 block">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                    Model
                  </span>
                  <select
                    data-testid="studio-model-select"
                    value={modelHeads[stage.service] ?? stage.service}
                    onChange={(e) => handleServiceChange(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-background/60 px-2 py-1.5 text-xs text-foreground"
                  >
                    {modelOpts.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.key}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* TOOLS — tenant-projected via StudioRail (§7.10). The slot GROWS
            (flex-1, min-h-0): a tenant may project small button rows
            (motion — they sit at the top, Run pinned below) or a tall
            authoring panel (body — the slider stack fills the rail).
            Empty (display:none) for tenants that don't project; the
            tenant's own borders/chrome live in the portaled content. */}
        <div data-studio-tools ref={setToolsEl} className="min-h-0 flex-1 empty:hidden" />

        {/* NODE INPUTS — the fold (§7.11). The form view stays
            shell-owned (E3); what changed is DEFAULT + chrome: collapsed
            until asked for (it is reference data — the tools are the
            working params, this is the raw node signature, and stacking
            both open read as "two parameter spots"). A plain disclosure,
            not a menu system: one header button, one chevron.
            OMITTED for ownsParams tenants (2026-08-16): when the tenant
            renders the whole param surface itself, the fold is a stale
            duplicate of the flat form — the "same forms as before"
            complaint on the mask rail. */}
        {!entry.ownsParams && (
        <>
        <button
          onClick={() => setParamsOpen((v) => !v)}
          aria-expanded={paramsOpen}
          data-testid="studio-params-toggle"
          className="flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70 transition-colors hover:text-brand"
        >
          <SlidersHorizontal className="h-3 w-3 text-brand/80" />
          Node inputs
          <ChevronDown
            className={cn("ml-auto h-3.5 w-3.5 transition-transform", !paramsOpen && "-rotate-90")}
          />
        </button>
        {paramsOpen && (
          <div data-studio-params className="min-h-0 flex-1 overflow-y-auto border-b border-white/[0.07] p-3">
            {/* Read-only in v1: the fold is the agent's-eye view (E3);
                authoring lives in the tenant. editing=false avoids the
                one-way prompt mirror desync (card1 → prompt param is
                write-only in MCE). */}
            <ParamGrid stage={stage} editing={false} onSave={() => {}} />
          </div>
        )}
        </>
        )}

        {/* LIVE FEEDBACK (2026-08-15; the full block 2026-09-06) — the
            shared drilldown block (CardRunFeedback): run state line
            (always while running — StatusChip parity; frame-less
            lanes — kimodo motion, TRELLIS, TTS — used to show NOTHING
            mid-run), the SAME WS activity line + KSampler progress
            bar the tile renders (CardActivity.tsx), and the CONSOLE
            drilldown (the status door's include_log tail, polled
            live — the RPC always documented the enrichment; the pane
            had lost both its caller and its server end). Pinned above
            the footer so the run you just started reports IN the
            panel you started it from. */}
        <CardRunFeedback stage={stage} running={running} />

        {/* FULL ERROR (2026-08-15) — the studio is the wide surface; it gets
            the complete message, never a truncated line. The tile's toast
            says "(full error on the card)"; THIS is where the full error
            lives when the card is open. Scroll-capped so a ComfyUI stack
            trace can't blow out the rail; pre-wrap so paths wrap, not
            overflow. */}
        {stage.status === "error" && stage.error && (
          <div
            data-studio-error={stage.id}
            className="mt-2 max-h-56 shrink-0 overflow-y-auto rounded border border-destructive/40 bg-destructive/10 p-2.5 font-mono text-[9px] leading-snug break-words whitespace-pre-wrap text-destructive"
          >
            {stage.error}
          </div>
        )}

        {/* Footer — Run (or Stop mid-run), pinned to the bottom of the rail */}
        <div className="mt-auto shrink-0 border-t border-white/[0.07] px-3.5 py-3">
          {running && runId ? (
            <Tip tip="Interrupt the run now — finished output stays">
              <button
                onClick={handleStop}
                data-testid="studio-stop-button"
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-red-400/50 bg-red-400/15 px-3.5 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-400/25"
              >
                <Square className="h-3.5 w-3.5" />
                Stop
              </button>
            </Tip>
          ) : (
            onRun && (
              <Tip tip="Run this card's flow">
                <button
                  onClick={onRun}
                  data-testid="studio-run-button"
                  className="flex w-full items-center justify-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-brand/25 transition-all hover:bg-brand/85"
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
              </Tip>
            )
          )}
        </div>
      </div>

      {/* ── TENANT — full height, all remaining width ───────────────── */}
      {/* The tenant owns its internal layout (VIEWPORT above, STRIP
          below). While it's open the rail shows the exact param state it
          writes — every gesture lands there live (E1). The column is a
          FLEX COLUMN and the tenant stretches (flex-1 from the tenant
          root) — percentage min-heights through a scroll container are
          the fragile link that left the stage hugging its 340px floor
          ("only takes up the top third", 2026-08-15); flex-basis sizing
          resolves against the definite column height with no percentages. */}
      <div
        className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgba(0,233,236,0.04),transparent_55%)]"
        data-studio-viewport
      >
        <Tenant
          stage={stage}
          running={running}
          onSave={onSave}
          upstreams={upstreams}
          onRun={onRun}
          onWireSlot={onWireSlot}
         
        />
      </div>
    </div>
    </StudioRailCtx.Provider>
  )
}
