/**
 * AnnyShape — the Character Maker, split across the studio's two
 * surfaces (the side-menu order, 2026-09-06: "you never made the side
 * menu you planned" + "you are rendering GLB and not native ANNY,
 * that is why it is low quality").
 *
 *   AnnyCharacterViewport — the MAIN surface: the native anny figure
 *     (/poser shaped bind mesh — 18056 verts, 77 joints, smooth
 *     normals) fills the panel, with the Apply chip floating on it.
 *     The low-poly base-body GLB stays on the Stage as the assembly
 *     placeholder it always was — it is an EXPORT, not the figure.
 *
 *   AnnyShapeBand — the RAIL surface: the grouped BodyShapePanel
 *     sliders (the body card's own panel, the shared-useBodyStudio
 *     scratchpad drives it) + the params↔scratchpad bridge. The band
 *     renders inline when no rail slot exists (standalone tenants).
 *
 * The bridge is the body card's, carried verbatim (it was right):
 * hydrate the scratchpad from stage.params ONCE per stage; write back
 * on every scratchpad change, skipping the immediate echo. Apply
 * bakes the Character through the anny-params queue flow (authored
 * dialect) and hydrates the Body slot — INFERENCE LAW: the queue door,
 * one try, no retry.
 *
 * The 3d/body card itself retires next stroke (its dir + tenant +
 * goldens collide with the in-flight pipe-carry stroke's files —
 * sequenced, not forgotten).
 */
import { useEffect, useRef, useState } from "react"
import { Button } from "@melite/ui/button"
import { RailSection, ViewportAnchor } from "@melite/ui"
import { Loader2, PersonStanding } from "lucide-react"
import { pollFlowRun, collectStageUrls, ensureDraftId } from "@melite/catalog"
import { BodyShapePanel } from "@melite/cards/3d/body/ui/studio/BodyShapePanel"
import { MeshPreviewCanvas } from "@melite/cards/3d/body/ui/studio/MeshPreviewCanvas"
import { characterFromParams, useBodyStudio } from "@melite/cards/3d/body/ui/studio/bodyStudio"
import type { CardStage } from "@melite/contracts"

type ApplyPhase = "idle" | "starting" | "queued" | "running" | "done" | "error"

/** The authored dialect's neutral row — all-0.5 (the estate neutral
 * preset's exact vector; a null coeffs bag means "model defaults"). */
const NEUTRAL_11 = Array.from({ length: 11 }, () => 0.5)

/** SOMA-X simplified-identity face parts (soma/body/identity_model.py
 *  AnnySimplified.ignore_names, Apache 2.0 — NVLabs): labels carrying
 *  these substrings drop out of the 254-label order, leaving the 139
 *  the estimator's scale vector addresses, order-preserved. Restated
 *  here (engine-side python, not importable); the wall pins literal
 *  == source. */
export const ESTIMATE_IGNORED_PARTS = [
  "mouth", "eye", "[REDACTED 2026-11-05]", "cheek", "chin", "ear", "lip", "nose",
] as const

/** The estimator's recipe (anny_preset.json, written by the
 *  commercial chain beside its GLB): the estimated dialect VERBATIM. */
export interface EstimateRecipe {
  phenotype: unknown
  scale: unknown
}

/** estimated recipe → authored scratchpad seed (2026-09-06, operator
 *  order "build the recipe bridge" — which turned out to already
 *  exist: the pipeline is parametric end-to-end, photo → MHR params
 *  → SOMA npz → anny identity_coeffs → GLB; the GLB is baked FROM
 *  these numbers, so seeding them back is exact, not fitting).
 *  phenotype[6] fills dims 0–5 over the identity-space defaults (the
 *  wrapper sets the same 6 BY NAME — gender/age/muscle/weight/
 *  height/proportions — the rest ride model defaults); scale[139]
 *  names itself against the kept 254-label order. THROWS on any
 *  shape drift — a half seed is a wrong body wearing yours. */
export function seedFromEstimate(
  recipe: EstimateRecipe,
  space: { defaults: number[]; localChangesLabels: string[] },
): { coeffs: number[]; localChanges: Record<string, number> } {
  const { phenotype, scale } = recipe
  if (!Array.isArray(phenotype) || phenotype.length !== 6 ||
      !phenotype.every((v): v is number => typeof v === "number" && Number.isFinite(v))) {
    throw new Error(
      `estimate recipe phenotype wants 6 finite numbers, got ${JSON.stringify(phenotype)?.slice(0, 80)}`)
  }
  if (!Array.isArray(space.defaults) || space.defaults.length !== 11 ||
      !space.defaults.every((v) => typeof v === "number" && Number.isFinite(v))) {
    throw new Error("identity space defaults want 11 finite numbers — the poser pack drifted")
  }
  const kept: string[] = []
  const seen = new Set<string>()
  for (const label of space.localChangesLabels) {
    if (typeof label !== "string") continue
    if (ESTIMATE_IGNORED_PARTS.some((part) => label.includes(part))) continue
    if (seen.has(label)) continue
    seen.add(label)
    kept.push(label)
  }
  if (!Array.isArray(scale) || scale.length !== kept.length ||
      !scale.every((v): v is number => typeof v === "number" && Number.isFinite(v))) {
    throw new Error(
      `estimate scale has ${Array.isArray(scale) ? scale.length : "non-array"} entries for ${kept.length} kept morphs — estimator/pack drift; refusing to seed`)
  }
  const coeffs = space.defaults.map((d, i) => (i < 6 ? (phenotype[i] as number) : d))
  const localChanges: Record<string, number> = {}
  kept.forEach((name, i) => { localChanges[name] = scale[i] as number })
  return { coeffs, localChanges }
}

/** The removed ray-era bag (2026-09-06, operator order "NO LEGACY
 *  CODEBASE"): keys the retired body card's bridge persisted on stage
 *  params. Nothing downstream ever read them; the family signature
 *  never declared them. Pure (tested without a store). */
export const LEGACY_BAG_KEYS = ["identityModel", "coeffs", "localChanges", "customTargets"] as const

/** Strip the legacy bag off a params row. Returns the scrubbed row,
 *  or null when there was nothing to strip (no save needed). */
export function scrubLegacyBag(params: Record<string, unknown>): Record<string, unknown> | null {
  if (!LEGACY_BAG_KEYS.some((k) => k in params)) return null
  const next = { ...params }
  for (const k of LEGACY_BAG_KEYS) delete next[k]
  return next
}

/** The persisted lever draft (SculptDraft, the card schema row):
 *  the authored dialect verbatim — the Apply payload, the seed
 *  target, the reopen restore. Snake_case local_changes: THE wire
 *  spelling, single-sourced (the localChanges re-spelling that
 *  silently dropped every slider morph at the bake died here). */
export interface SculptDraftDoc {
  dialect: "authored"
  phenotype: number[]
  local_changes: Record<string, number>
}

/** The neutral draft (the schema row's own default): untouched
 *  stages hydrate AND persist this — reopening a never-sculpted
 *  stage is identical to never opening it. */
export const NEUTRAL_DRAFT: SculptDraftDoc = {
  dialect: "authored",
  phenotype: [...NEUTRAL_11],
  local_changes: {},
}

/** Live scratchpad → draft. Null while the levers never took a
 *  value (coeffs not 11 — panel never opened, no seed): untouched
 *  stages stay clean, no neutral-stamping. Pure. */
export function serializeDraft(editing: {
  coeffs: unknown
  localChanges: unknown
}): SculptDraftDoc | null {
  if (!Array.isArray(editing.coeffs) || editing.coeffs.length !== 11 ||
      !editing.coeffs.every((v): v is number => typeof v === "number" && Number.isFinite(v))) {
    return null
  }
  const local_changes: Record<string, number> = {}
  if (editing.localChanges && typeof editing.localChanges === "object") {
    for (const [k, v] of Object.entries(editing.localChanges as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) local_changes[k] = v
    }
  }
  return {
    dialect: "authored",
    phenotype: [...(editing.coeffs as number[])],
    local_changes,
  }
}

/** Stage params → scratchpad seed. The draft wins (a mid-sculpt
 *  reopen restores the levers, not neutral); else the legacy
 *  Character-bag read (new stages: neutral). Invalid draft shape
 *  falls back LOUD (console — the schema refuses it at the gate
 *  anyway; hydration never invents numbers). Pure. */
export function draftFromParams(params: Record<string, unknown>): {
  coeffs: number[]
  localChanges: Record<string, number>
} | null {
  const d = params.sculpt as Record<string, unknown> | undefined
  if (!d || typeof d !== "object") return null
  if (d.dialect !== "authored") {
    console.error(`[anny-shape] sculpt dialect ${JSON.stringify(d.dialect)} — want "authored"; ignoring draft`)
    return null
  }
  const phenotype = d.phenotype
  const local_changes = d.local_changes
  if (!Array.isArray(phenotype) || phenotype.length !== 11 ||
      !phenotype.every((v) => typeof v === "number" && Number.isFinite(v))) {
    console.error("[anny-shape] sculpt phenotype is not 11 finite numbers; ignoring draft")
    return null
  }
  if (!local_changes || typeof local_changes !== "object" || Array.isArray(local_changes)) {
    console.error("[anny-shape] sculpt local_changes is not an object; ignoring draft")
    return null
  }
  const clean: Record<string, number> = {}
  for (const [k, v] of Object.entries(local_changes as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) clean[k] = v
  }
  return { coeffs: [...(phenotype as number[])], localChanges: clean }
}

/** Echo guard (pure): a draft that already equals the params draft
 *  writes nothing — hydration and the seed's own save never loop.
 *  Canonical JSON on both sides (key order is construction order on
 *  both — serialize and the seed build dialect/phenotype/
 *  local_changes in the same order). */
export function sculptNeedsWrite(
  draft: SculptDraftDoc,
  paramsSculpt: unknown,
): boolean {
  return JSON.stringify(paramsSculpt ?? null) !== JSON.stringify(draft)
}

/** card params → scratchpad, ONCE per stage, then the draft
 *  AUTOSAVES back (2026-09-06, operator order "finish the design"):
 *  every lever change persists onto stage.params.sculpt (debounced
 *  400ms, flushed on unmount/stage-switch) — the ephemeral-draft
 *  era is over. LEGAL, unlike the amputated write-back: sculpt is
 *  a DECLARED family key (SculptDraft row — the gate accepts it),
 *  so persistence can never poison a Run. Echo-guarded: a store
 *  that already equals the params draft writes nothing (hydration
 *  and the seed's own save never loop). Called ONCE by AnnyStudio
 *  — the bridge stays mounted regardless of where the panel
 *  renders (rail tab or viewport drawer); the viewport + panel
 *  read the store live. */
export function useAnnyShapeBridge(stage: CardStage, onSave: (p: Record<string, unknown>) => void) {
  const editing = useBodyStudio((s) => s.editing)
  const setEditing = useBodyStudio((s) => s.setEditing)
  const pendingRef = useRef<SculptDraftDoc | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const paramsRef = useRef(stage.params)
  paramsRef.current = stage.params
  const saveRef = useRef(onSave)
  saveRef.current = onSave

  useEffect(() => {
    // Hydrate: the persisted draft wins, the legacy read is the
    // fallback. A seeded stage reopens mid-sculpt.
    const draft = draftFromParams(stage.params)
    if (draft) {
      // Params-derived base (the stage's own identity rows — more
      // correct than spreading the store's just-initialized
      // defaults) with the persisted draft's levers on top.
      setEditing({ ...characterFromParams(stage.params), coeffs: draft.coeffs, localChanges: draft.localChanges })
    } else {
      setEditing(characterFromParams(stage.params))
    }
    // One-time legacy migration: a stage dirtied by the retired
    // write-back still carries the bag — the card schema
    // (extra="forbid") and the Run gate refuse it LOUD, and no
    // control writes OR clears those keys anymore, so the bridge
    // lifts them once. Explicit + walled, not a silent drop: the
    // values were never user-meaningful beyond the live store.
    const scrubbed = scrubLegacyBag(stage.params)
    if (scrubbed) onSave(scrubbed)
  }, [stage.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave: the debounced draft write-back.
  useEffect(() => {
    const draft = serializeDraft(editing)
    if (!draft) {
      pendingRef.current = null
      return
    }
    const current = paramsRef.current.sculpt as unknown
    if (!sculptNeedsWrite(draft, current)) {
      pendingRef.current = null // echo (hydration / own save) — write nothing
      return
    }
    pendingRef.current = draft
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      const pending = pendingRef.current
      pendingRef.current = null
      if (pending) saveRef.current({ sculpt: pending })
    }, 400)
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
        const pending = pendingRef.current
        pendingRef.current = null
        if (pending) saveRef.current({ sculpt: pending }) // flush on switch/unmount
      }
    }
  }, [editing, stage.id])

  return editing
}

/** Apply: bake the persisted draft through the queue and hydrate
 *  the Body slot. Lives on the viewport (the chip) — the rail needs
 *  no bake button of its own. The payload is the STAGE DRAFT
 *  verbatim (params.sculpt — the autosave keeps it within 400ms of
 *  the levers; the live serialize is the fallback for a stage that
 *  never persisted, neutral last). Verbatim means the wire spelling
 *  is never re-spelled here — the localChanges/local_changes
 *  silent-drop class cannot recur. */
function useAnnyShapeApply(stage: CardStage, onSave: (p: Record<string, unknown>) => void) {
  const editing = useBodyStudio((s) => s.editing)
  const [phase, setPhase] = useState<ApplyPhase>("idle")
  const [note, setNote] = useState<string | null>(null)
  const busy = phase === "starting" || phase === "queued" || phase === "running"

  const apply = async () => {
    setPhase("starting")
    setNote(null)
    // The persisted draft IS the payload (SculptDraft == the
    // anny-params authored wire shape). No re-spelling, no field
    // mapping — stringified straight onto params_json. Unknown
    // morph names refuse LOUD at the bake — never a silent skip.
    const draft = (stage.params.sculpt as SculptDraftDoc | undefined) ??
      serializeDraft(editing) ?? NEUTRAL_DRAFT
    const paramsJson = JSON.stringify(draft)
    try {
      // QUEUE DOOR — raw fetch, no retry (a retry would start a
      // SECOND run). preset_id rides for provenance only.
      // CARD BIRTH LAW (operator order 2026-09-06): the start door
      // 4xxes a start without a doc-backed draft_id — compose the
      // card first, ride the minted id on the envelope.
      const startBody: Record<string, unknown> = {
        flow: "anny-params",
        preset_id: "scratchpad",
        params_json: paramsJson,
      }
      startBody.draft_id = await ensureDraftId(startBody)
      const res = await fetch("/v1/flows/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(startBody),
      })
      const text = await res.text()
      if (!res.ok) {
        throw new Error(`anny-params queue refused: HTTP ${res.status}${text ? `: ${text.slice(0, 400)}` : ""}`)
      }
      let data: Record<string, unknown>
      try {
        data = JSON.parse(text) as Record<string, unknown>
      } catch {
        throw new Error("anny-params queue returned a non-JSON body")
      }
      const runId = data.run_id
      if (typeof runId !== "string" || !runId) {
        throw new Error("anny-params queue returned no run_id")
      }
      setPhase(data.status === "queued" ? "queued" : "running")
      const status = await pollFlowRun(runId, undefined, { onTick: () => setPhase("running") })
      const glbUrl =
        collectStageUrls(status.stages).find((u) => /\.(glb|gltf)(\?|#|$)/i.test(u)) ?? null
      if (!glbUrl) {
        throw new Error(`Shape bake completed with no body GLB — run ${runId}`)
      }
      onSave({ body_glb: glbUrl })
      setPhase("done")
      setNote("Character baked — the shaped body now fills the Body slot.")
    } catch (e) {
      setPhase("error")
      setNote(e instanceof Error ? e.message : String(e))
    }
  }

  return { editing, phase, note, busy, apply }
}

/** The MAIN surface — the native anny figure fills the panel; the
 *  Apply chip floats on it (top-right), the bake note rides below. */
export function AnnyCharacterViewport({ stage, onSave, replacesEstimate }: {
  /** The stage (Apply reads the persisted draft off params). */
  stage: CardStage
  /** E1 write channel — body_glb on Apply. */
  onSave: (params: Record<string, unknown>) => void
  /** True when the Body slot holds an estimated body: the bake
   *  builds from the lever recipe ALONE (anny-params takes no body
   *  input), so Apply REPLACES the photo body — the chip must say
   *  so (2026-09-06: nobody learns the destructive part by losing
   *  a body). */
  replacesEstimate?: boolean
}) {
  const { editing, phase, note, busy, apply } = useAnnyShapeApply(stage, onSave)
  return (
    <div className="relative h-full w-full">
      {/* live native sculpt — the /poser shaped bind mesh (18k verts,
          smooth normals — NOT the 13.7k export GLB), fills the panel */}
      <MeshPreviewCanvas character={editing} className="h-full w-full" />
      {/* The apply verb FLOATS (top-right anchor; the 2.5 offset
        rides className) — a verb, not an overlay row: it writes
        card state, which is the overlays seam's line. */}
      <ViewportAnchor dock="top-right" className="right-2.5 top-2.5">
      <Button
        type="button"
        onClick={() => void apply()}
        disabled={busy}
        title={replacesEstimate
          ? "Bakes a NEW body from the lever recipe alone — the estimated photo body is replaced, not tweaked"
          : "Bake the lever recipe into the Body slot"}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary/90 px-2.5 py-1 text-[11px] font-medium text-primary-foreground shadow-lg hover:bg-primary disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <PersonStanding className="h-3 w-3" />}
        {busy ? "Baking…" : replacesEstimate ? "Replace estimated body" : "Apply to Body"}
      </Button>
      </ViewportAnchor>
      {note && (
        /* the notice strip — bottom anchor, verbatim offsets */
        <ViewportAnchor dock="bottom">
        <p
          role={phase === "error" ? "alert" : "note"}
          title={note}
          className={`line-clamp-3 rounded border px-2 py-1 text-[10px] leading-relaxed ${
            phase === "error"
              ? "border-red-500/40 bg-red-500/10 text-red-300"
              : "border-sky-500/30 bg-sky-500/10 text-sky-200/80"
          }`}
        >
          {note}
        </p>
        </ViewportAnchor>
      )}
    </div>
  )
}

/** The RAIL's Shape section — the grouped sliders (MHR variance
 *  groups; the body card's own panel, unmodified). NATURAL HEIGHT:
 *  the TAB pane owns the one scroll surface (operator order
 *  2026-09-06: "NOT EVEN A SCROLL? ARE YOU CRAZY?" — no nested
 *  scroll boxes, no crushed flex). onExpand moves the panel into the
 *  viewport drawer (the bigger slider surface); the bridge lives in
 *  AnnyStudio and survives the move. */
export function AnnyShapeBand({ onExpand }: {
  /** Opens the viewport drawer (the panel outgrows the 320px rail). */
  onExpand?: () => void
}) {
  return (
    <RailSection
      title="Shape — the character"
      actions={onExpand ? (
        <Button
          type="button"
          onClick={onExpand}
          aria-label="Expand Shape sliders into the viewport drawer"
          title="Bigger slider surface over the figure"
          className="rounded-md border border-muted-foreground/20 px-1.5 py-0.5 text-[10px] text-muted-foreground/70 hover:text-foreground"
        >
          Expand
        </Button>
      ) : undefined}
    >
      <BodyShapePanel />
    </RailSection>
  )
}

/** The VIEWPORT drawer — the Shape sliders as a right-side overlay
 *  (w-80, own scroll) when the rail's 320px is too tight for serious
 *  sculpting. One BodyShapePanel instance at a time: expanded drawer
 *  replaces the rail section (same shared scratchpad either way).
 *  PURE PANEL since the plugin-layout stroke: the caller docks it
 *  (ViewportAnchor dock="edge-right") and this aside carries
 *  layout + look, never geometry. */
export function AnnyShapeDrawer({ onCollapse }: { onCollapse: () => void }) {
  return (
    <aside
      aria-label="Shape — drawer"
      className="flex h-full w-80 flex-col border-l border-sidebar-border/60 bg-[#12121f]/95 backdrop-blur-sm"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-sidebar-border/40 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Shape — the character
        </p>
        <Button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse Shape back into the rail"
          className="rounded-md border border-muted-foreground/20 px-1.5 py-0.5 text-[10px] text-muted-foreground/70 hover:text-foreground"
        >
          Collapse
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <BodyShapePanel />
      </div>
    </aside>
  )
}
