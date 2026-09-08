// flowParamEditor — ParamEditor, the card's param editor, moved
// VERBATIM from FlowCard.tsx (Cut 1d). The editor owns the draft,
// the form-spec contract state and the swap/select/enhance handlers; the
// MODEL zone renders through <AxisRows/> (flowAxisRows) and the
// PARAMS zone through <ParamFields/> (flowParamFields) — both pure
// props components, never hooks. The vocabulary-application body lives
// in flowParamSync (applySpecVocabularyToDraft) so the owned-fetch
// and shared-in-flight paths share ONE pure implementation.
import { useState, useEffect, useRef } from "react"
import { Button } from "@melite/ui/button"
import { isUndeclaredWireSlot,  loadCatalog, dropdownModels, presetsForRoute } from "@melite/catalog"
import { evalVisibleWhen, type FormSpec, type FormFeatures, type SelectOptions, type FormField, type SchemaGroupDef } from "@melite/contracts"
import { useSpecContractStore } from "@/surfaces/shared/specContractStore"
import { inputSlots, cardSlotsFor } from "@melite/catalog"
import { useAgentFlowStore } from "./flowStore"
import { zoneByField } from "@melite/formats"
import { kindHasFormSpec } from "@melite/slots"
import { AxisRows } from "./flowAxisRows"
import { ParamFields } from "./flowParamFields"
import { applySpecVocabularyToDraft } from "./flowParamSync"
import type { CardStage } from "@melite/contracts"
export function ParamEditor({ stage, onSave, onDraftChange }: {
  stage: CardStage
  onSave: (params: Record<string, unknown>, service?: string) => void
  /** Live-draft reporter — fires whenever the in-editor draft (params +
  * model/variant) changes, so a parent can flush it on Run. The typed
  * prompt otherwise lives ONLY in this local draft: Run reads
  * stage.params (the last Apply), so without a flush a just-typed
  * prompt never reaches the backend (the "prompt is required" run
  * failure, p…-prefix compile-path runs). Mirrors the Apply payload. */
  onDraftChange?: (params: Record<string, unknown>, service?: string) => void
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>(() => ({ ...stage.params }))
  // For an imported flow card, stage.service is the FAMILY name
  // (e.g. "video_generate"), not a catalog model key. The form-spec
  // endpoint filters groups by model_def["family"] — if it can't resolve
  // a model_def for the service string, the family filter no-ops and the
  // card dumps every engine's fields (ltx_*, wan_*, vace_*, h3_* all at
  // once). The brick's params.model carries the real catalog key
  // (e.g. "h3") for imported cards — prefer it so the filter
  // resolves. Normal Create cards carry the model key directly in
  // stage.service; params.model is the same value or absent, so this
  // is a safe fallback.
  const _initialService =
    typeof stage.params?.model === "string" && stage.params.model
      ? stage.params.model
      : stage.service
  const [draftService, setDraftService] = useState(_initialService)
  // Model picker options — the form's TREE-HEAD folder names, flat (no
  // optgroups; variant/quant routes never appear here — see the loader
  // effect for the axis-route exclusion).
  const [modelOpts, setModelOpts] = useState<{ key: string; label: string }[]>([])
  // Axis-cell → tree-head map (2026-08-16): a route any model's
  // ``variants`` declare resolves to the model whose folder it lives in.
  // The Model select's DISPLAY value for a cell service (a revived card
  // sitting on qwen-img-edit-2511-int8) is its folder (qwen-img-edit-2511)
  // — the model row IS a directory; the cell shows on its own axis row.
  const [modelHeads, setModelHeads] = useState<Record<string, string>>({})
  // Model-list fetch failure (2026-08-12): surfaced on the Model row —
  // never a silent single-option collapse (forbid all fallbacks).
  const [modelListError, setModelListError] = useState<string | null>(null)
  const [modelListRetry, setModelListRetry] = useState(0)
  // Form-spec field vocabulary for the CURRENT service, by field name —
  // schema-driven editing (2026-08-07: "sampler is free-text, there are
  // finite options"): select fields render as dropdowns with the spec's
  // options, never as free-text inputs. Populated on mount for the card's
  // service and refreshed on model swap by handleModelChange.
  const [specFields, setSpecFields] = useState<Record<string, { type?: string; label?: string; options?: SelectOptions; min?: number | null; max?: number | null; step?: number | null; tooltip?: string | null }>>({})
  // The DECLARED modifier wire locations (spec features.modifiers
  // param_keys — loras/controlnets/ip_adapters/image_ops). LoRA is a MOD,
  // never a standalone addition (2026-08-09): the free-text grid must not
  // render the mod bags as raw JSON rows — the SubcardGrid owns them.
  // Derived from the SAME spec fetch as specFields, so a model swap
  // (handleModelChange → contract store loadFormSpec → rememberSpecFields)
  // refreshes it.
  const [specModifierKeys, setSpecModifierKeys] = useState<string[]>([])
  // visible_when conditions per field name — from schema_groups (the flat
  // fields list does NOT carry them; only schema_groups does). The card
  // editor evaluates them against the live draft so mode-gated fields
  // (upscale: prompt/input_mask show only in inpaint mode, the detail
  // knobs only in face/hands/body) appear and disappear as the user picks
  // a mode — 2026-08-08.
  const [specVw, setSpecVw] = useState<Record<string, string | null>>({})
  // 4-zone form-card anatomy (card-studio-pattern.md §4): each schema
  // group's zone — where its NON-slot fields render. Slot-typed fields
  // always render in Inputs via SlotGrid regardless of zone; the Model
  // zone is the features-driven catalog-tree row, never a schema group.
  // The params flow uses this as the render-proof backstop: non-params
  // fields belong to their zone's surface. Default "params" for
  // untagged groups (formZones.zoneByField).
  const [specZones, setSpecZones] = useState<Record<string, string>>({})
  // SPEC VERDICT FACE (2026-08-12): the form-spec is the card's field
  // vocabulary — without it a raw draft is OLD fields / phantom cruft /
  // missing mods with zero explanation (operator directive: forbid ALL
  // fallbacks). Verdict is state: error/violation → the red face + Retry
  // REPLACES the form; only a contract-clean spec renders it.
  const [specVerdict, setSpecVerdict] = useState<"idle" | "loaded" | "error" | "violation">("idle")
  const [specVerdictMsg, setSpecVerdictMsg] = useState("")
  const [specRetry, setSpecRetry] = useState(0)
  // The record whose vocabulary was last applied to the draft (identity
  // guard so the shared-in-flight path never double-applies).
  const seededRecRef = useRef<{ state: string } | null>(null)
  // Form-spec defaults for the CURRENT service — the mode handler seeds
  // missing knobs from here when the user switches into a mode/region
  // that owns them (the bag never carried them — catalog defaults no
  // longer seed the detail knobs, 2026-08-08 — so without seeding they'd
  // stay invisible even though their visible_when now passes).
  const [specDefaults, setSpecDefaults] = useState<Record<string, unknown>>({})
  // form-spec features for the CURRENT service — variant toggle rows
  // (Quant / Speed / sibling mode) + group headings. Refreshed on model
  // swap. Without this the flow card showed neither the toggles nor
  // the active submodel (Turbo vs Raw, FP8/Q8/Q5) — 2026-08-08.
  const [specFeatures, setSpecFeatures] = useState<FormFeatures | null>(null)
  // Per-model LLM enhance system prompt (form-spec.enhance_prompt — the
  // backend is the single source of truth, sourced from
  // the catalog tree's SKILL bundles). Empty string = this model has no
  // enhance prompt in the catalogue → the Enhance button never renders.
  // Refreshed alongside the rest of the spec on mount + model swap.
  const [specEnhancePrompt, setSpecEnhancePrompt] = useState<string>("")
  // Multi-field enhance prompts: {field_name: system_prompt}. Carried from
  // the form-spec's enhance_prompts dict. Music cards (ACE-Step, MiniMax
  // Music 3) have both "prompt" (the caption) and "lyrics" entries → two
  // Enhance buttons on one card.
  // For backward compat, if the spec only carries singular enhance_prompt,
  // this is derived as {prompt: enhance_prompt}.
  const [specEnhancePrompts, setSpecEnhancePrompts] = useState<Record<string, string>>({})
  // Enhance-button in-flight + error state. Mirrors GeneratePopover's UX
  // (Wand2 → Loader2 spinner while the single-shot LLM call is in flight;
  // a missing LLM key or backend error surfaces inline).
  const [enhancing, setEnhancing] = useState(false)
  // AGENT ENHANCE (2026-08-22): the ✦ Agent Enhance button's in-flight
  // state — the agent system sweeps EVERY declared field over the harness
  // model (/melite-tools/enhance {model}) and all results land at once.
  const [agentEnhancing, setAgentEnhancing] = useState(false)
  const [enhanceError, setEnhanceError] = useState<string | null>(null)
  
  // ── Slot ATTACHMENT ownership, at COMMIT time (2026-08-23 ──
  // "I WAS SENDING AN IMAGE"). Attachments (data: URLs, /editor/assets/…
  // run-artifact URLs, uploaded filenames) are written by the ATTACH
  // surfaces (SlotGrid, the card body's upload/drop/paste) straight into
  // stage.params — never by this text form. This editor's draft is a
  // MOUNT SNAPSHOT and its `stage` prop goes stale the moment an attach
  // lands, so a render-time guard CANNOT see the attachment: the seed
  // commit (applySpecVocabulary → auto-save) then re-writes the stale
  // snapshot's null over the fresh URL and the run 400s "requires an
  // input image but none was provided" (live-probed 2026-08-23:
  // actions.onEditSave CALLED with the data URL at t=0, store reverted
  // to null by the seed PATCH at t≈+50ms — invisible to 300ms sampling).
  // The read must hit the LIVE STORE at the moment of commit. Null seeds
  // for FRESH cards (store key absent/null) still ride — the Inputs
  // squares need them (2026-08-21 "can't upload images" stays intact) —
  // and detach paths (SlotGrid's {[slot]:null}) commit directly through
  // onEditSave, never through this payload.
  const stripOwnedAttachments = (params: Record<string, unknown>): Record<string, unknown> => {
    const live = useAgentFlowStore.getState().flow?.stages.find((s) => s.id === stage.id)?.params ?? {}
    const slots = inputSlots() as readonly string[]
    let stripped = false
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(params)) {
      if (slots.includes(k) && typeof live[k] === "string" && live[k]) {
        stripped = true
        continue
      }
      out[k] = v
    }
    return stripped ? out : params
  }

  // Build the SUBMIT payload: the draft MINUS fields whose visible_when
  // condition is currently false. Hidden fields (inpaint_region / detail
  // knobs when mode='upscale'; prompt/input_mask outside free-mask inpaint)
  // stay in the local draft so the user can switch modes without losing
  // values, but they must NOT ride into the request — the family CONTRACT
  // forbids them for the active discriminator and would 400 the run
  // (upscale + inpaint_region='free' → "forbidden when mode='upscale'",
  // every upscale run). The gate mirrors the render gate (isVisible below):
  // what the user can't see is not sent. The agent / /v1/run callers that
  // bypass the card still hit the family's own CONTRACT — this is the
  // card-side half of the same declarative rule.
  const visibleParams = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(draft)) {
      // "model" is the ROUTE CARRIER, tracked by draftService — never a
      // draft field (2026-08-13: visibleParams leaking it re-wrote the
      // stale carrier on every auto-save; the store's route-carrier sync
      // and the run-body guard own the route now). Strip it here so the
      // form can never resurrect a stale carrier into stage.params.
      if (k === "model") continue
      // ── Mod-bag keys are SubcardGrid's zone (2026-08-18: "I can click
      // and add, but I can NOT actually see them persist!") ── ParamEditor's
      // draft is a MOUNT SNAPSHOT; SubcardGrid commits the mod bags
      // (loras/controlnets/…) straight into stage.params through its own
      // onEditSave. Letting THIS payload carry the snapshot's mod keys
      // (e.g. `loras: null` from the catalog default) re-clobbers a
      // JUST-ADDED mod: updateStageParams merges {...stage.params,
      // ...params}, so an explicit null/[] WINS over the committed array
      // — the tile appeared, then the debounced auto-save (which re-fires
      // when the spec lands / on any edit) silently deleted it. Same
      // ownership rule as the "model" carrier strip above: this editor
      // never writes a key another surface owns. Merge semantics never
      // DELETE keys, so omitting them preserves the committed bag.
      if (specModifierKeys.includes(k)) continue
      const cond = specVw[k]
      if (!cond || evalVisibleWhen(cond, draft)) out[k] = v
}
    return out
}

  // Load the model catalog so the user can switch families (anima ↔ krea2
  // ↔ flux etc. — they share most params, only the service key changes).
  // The list derives from THIS STAGE'S MODEL's catalog form — never a
  // hardcoded form tag (2026-08-07: the upscale card used to offer every
  // generation family because the list was pinned to form_generate). A
  // model whose form has no visible siblings (upscale models are all
  // hide_from_dropdown) yields a picker with just the stage's own model.
  useEffect(() => {
    let cancelled = false
    loadCatalog()
      .then((cat) => {
        if (cancelled) return
        const form = cat.models?.[stage.service]?.form
        // MODEL FOLDER NAMES, FLAT (2026-08-16 operator rules):
        //   1. "models come from folder names" — the option text IS the
        //      route key (qwen-img-edit-2511, krea-2 …), never the
        //      family label ("Image Edit");
        //   2. NO submenus — a flat list, one option per model;
        //   3. TREE HEADS ONLY — any route another model's ``variants``
        //      declares (variant siblings like krea-2-raw, quant cells
        //      like krea-2-q8) belongs to ITS OWN axis dropdown, never
        //      the Model dropdown. The axes filter each other
        //      (Variant filters Quant); the Model list NEVER shifts
        //      when a quant is picked — the re-run below is
        //      recomputed, but the RESULT is the same heads list every
        //      time. A revived card sitting on a cell displays the
        //      cell's FOLDER (modelHeads) in the Model select.
        const all = form ? dropdownModels(form, cat) : []
        // A route is an AXIS CELL (excluded from the Model list) only
        // when a NON-HIDDEN model's variants declare it (key !== r).
        // Two patterns survive this gate — both are FOLDER heads and
        // must stay in the list (verified against the live catalog
        // 2026-08-16: the result equals the model.yaml folder set for
        // every form):
        //   • self-routes — ace-step's turbo variant declares route:
        //     ace-step, h3's fl2va declares route: h3, music3's
        //     int8_convrot declares route: music3 (the head IS its own
        //     default cell);
        //   • declarations from HIDDEN cells — krea-2-raw's cell block
        //     re-declares turbo → route: krea-2; a hidden tier must not
        //     demote the folder head (the first cut compared against
        //     every model, so each family excluded its own head and the
        //     Model list emptied — the "your [REDACTED 2026-11-05] breaks" report).
        const isAxisRoute = (r: string) =>
          Object.entries(cat.models ?? {}).some(
            ([key, m]) =>
              key !== r &&
              !m?.hide_from_dropdown &&
              (m?.variants ?? []).some((v) => v?.route === r),
          )
        const heads = all.filter((r) => !isAxisRoute(r))
        // THE MODEL LIST NEVER SHIFTS (2026-08-16 operator rule: "the
        // quants change the available models?"). This effect re-runs on
        // every stage.service change — and the old code pushed the
        // current service unconditionally, so picking Quant=INT8 appended
        // qwen-img-edit-2511-int8 to the Model dropdown (the bug shipped
        // to the user). The list is the form's tree heads, PERIOD: a
        // cell route is reached through its axis dropdowns, never the
        // Model list.
        setModelOpts(heads.map((r) => ({ key: r, label: r })))
        // Cell → folder map for the select's display value. HIDDEN cells
        // never map (2026-08-17): krea-2-raw's own variants block re-
        // declares raw → route krea-2-raw AFTER the visible head krea-2,
        // so the last-writer-wins loop pointed krea-2-raw → krea-2-raw —
        // the Model select displayed "anima" (jsdom's first option) for
        // a value matching no option. A hidden tier is not a display
        // folder for the Model row.
        const headOf: Record<string, string> = {}
        for (const [key, m] of Object.entries(cat.models ?? {})) {
          if (m?.hide_from_dropdown) continue
          for (const v of m?.variants ?? []) {
            if (v?.route) headOf[v.route] = key
          }
        }
        setModelHeads(headOf)
        setModelListError(null)
    })
      .catch((e: unknown) => {
        // NEVER a silent fallback (2026-08-12): the picker must not
        // collapse to one option with no explanation — the failure is
        // surfaced on the Model row (visible chip + Retry).
        if (!cancelled) {
          setModelListError(e instanceof Error ? e.message : String(e))
          console.error(`[ParamEditor] model catalog load failed for ${stage.service}.`, e)
        }
    })
    return () => { cancelled = true }
  }, [stage.service, modelListRetry])

  // Fetch the form-spec's field vocabulary for the card's service (mount
  // only — swaps go through handleModelChange, which refreshes this too).
  // Guard (2026-08-10): body/studio-link/input/preview stages carry a
  // display label as `service` (e.g. "body"), not a catalog model —
  // fetching a form-spec for it is a category error (used to 500, now
  // 404, but still pointless). Only generation/chain have catalog models.
  useEffect(() => {
  if (!kindHasFormSpec(stage.kind)) return
    let cancelled = false
    // The contract store validates first — only a contract-clean spec
    // (state "loaded") reaches the draft; violations stay in the store.
    useSpecContractStore.getState().loadFormSpec(draftService, { fresh: true })
      .then((record) => {
        if (cancelled) return
        if (record.state === "error" || record.state === "violation") {
          setSpecVerdict(record.state)
          setSpecVerdictMsg(
            record.state === "error"
              ? record.error ?? "The form-spec could not be loaded."
              : "The form-spec declares capabilities that cannot render on this card.",
          )
          console.error(
            `[ParamEditor] form-spec for ${draftService} unavailable (${record.state}) — card form hidden, never a degraded raw draft.`,
            record,
          )
          return
        }
        if (record.state !== "loaded" || !record.spec) return
        // Fresh record reached the draft — mark it so the specRec effect
        // (below) doesn't re-apply. The shared-in-flight race (a fetch
        // started before this mount) is covered by that effect.
        seededRecRef.current = record
        setSpecVerdict("loaded")
        applySpecVocabulary(record.spec as FormSpec)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        // NEVER a silent fallback (2026-08-12): a card whose spec cannot
        // load renders the red face, never a degraded raw draft.
        setSpecVerdict("error")
        setSpecVerdictMsg(e instanceof Error ? e.message : String(e))
        console.error(
          `[ParamEditor] form-spec fetch for ${draftService} failed — card form hidden, never a degraded raw draft.`,
          e,
        )
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specRetry])
  
  // CARD-OPEN REVALIDATION subscription (2026-08-12): the fresh fetch's
  // .then above owns the common path, but a SHARED in-flight fetch (one
  // already running when this card opened) resolves through the store —
  // this subscription applies the vocabulary / verdict the moment the
  // record lands, so no card can ever sit on a raw draft because it
  // didn't own the fetch.
  const specRec = useSpecContractStore((s) =>
    kindHasFormSpec(stage.kind) ? s.records[draftService] : undefined,
  )
  useEffect(() => {
    if (!specRec) return
    if (specRec.state === "error" || specRec.state === "violation") {
      setSpecVerdict(specRec.state)
      setSpecVerdictMsg(
        specRec.state === "error"
          ? specRec.error ?? "The form-spec could not be loaded."
          : "The form-spec declares capabilities that cannot render on this card.",
      )
      console.error(
        `[ParamEditor] form-spec for ${draftService} ${specRec.state} — card form hidden, never a degraded raw draft.`,
        specRec,
      )
      return
    }
    if (specRec.state !== "loaded" || !specRec.spec || seededRecRef.current === specRec) return
    seededRecRef.current = specRec
    setSpecVerdict("loaded")
    applySpecVocabulary(specRec.spec as FormSpec)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specRec])
  // LOAD-TIME SANITIZE (2026-08-14): a RESTORED draft (hydrated from a past
  // run via loadRun, or a saved card) can carry values that are HIDDEN under
  // the current visible_when — e.g. qwen3_variant "Base" + voice "serena"
  // (serena is a catalog default seeded into the bag; Base never reads it).
  // The change-handler clears hidden fields only when the controlling field
  // CHANGES — a restored draft never fires it, so the stale combo sailed
  // through to the engine and the backend fail-loud validator killed the
  // run (pc81a817a, 2026-08-14: "Talker mode 'Base' silently ignores:
  // voice"). One-shot per service: delete hidden residue, never touch
  // visible fields, never re-run after the first pass (user edits are not
  // clobbered — the dropdown change-handler owns subsequent passes).
  const sanitizedForRef = useRef<string | null>(null)
  useEffect(() => {
    if (!kindHasFormSpec(stage.kind)) return
    if (Object.keys(specVw).length === 0) return
    if (sanitizedForRef.current === draftService) return
    sanitizedForRef.current = draftService
    setDraft((d) => {
      let next = d
      for (const [fname, cond] of Object.entries(specVw)) {
        if (!cond || !(fname in next)) continue
        if (evalVisibleWhen(cond, next)) continue
        if (next === d) next = { ...d }
        delete next[fname]
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specVw, draftService, stage.kind])
  // Report the live draft up so the parent (CardDetailModal) can flush it
  // on Run. Without this, a prompt typed into the textarea lives only in
  // this local draft — Run reads stage.params (the last Apply), so the
  // prompt never reaches the backend. The payload mirrors Apply exactly
  // (params + the swapped service when the model/variant diverged).
  useEffect(() => {
    onDraftChange?.(visibleParams(), draftService !== stage.service ? draftService : undefined)
  }, [draft, draftService, stage.service, onDraftChange, specVw])
  
  // ── Auto-save (2026-08-09): the "Save & mark stale" button is GONE. ──
  // Every parameter edit persists to the store automatically via a 300ms
  // debounce. updateStageParams already marks the flow + downstream
  // stale on every param change — the old button's "mark stale" half was
  // redundant; the button was just a gate on WHEN persistence happened.
  // Now: type → 300ms → saved. The Run button still flushes via
  // onDraftChange (pendingEditRef) for the sub-300ms case where the user
  // clicks Run mid-debounce. Skip mount: the draft starts as a copy of
  // stage.params, so persisting it is a no-op that needlessly marks stale.
  //  — but ONLY when it IS the unchanged mount copy. The spec-seed
  // (applySpecVocabulary → setDraft) can land DURING the mount commit
  // when the contract record is already cached (the picker prefetches
  // specs for its tiles), so the effect's FIRST fire already sees the
  // seeded draft. Blindly skipping that fire dropped the null-seeded
  // slot keys (input_image/image2/image3 on edit cards) from ever
  // reaching stage.params — fresh cards rendered NO input squares and
  // accepted NO uploads (the "can't upload images" report). Reference
  // identity is the discriminator: the seed always produces a NEW draft
  // object, the untouched mount copy is the useState initializer itself.
  const didMountRef = useRef(false)
  const initialDraftRef = useRef(draft)
  const lastSavedParamsRef = useRef<Record<string, unknown> | null>(null)
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
        if (draft === initialDraftRef.current) return
}
    const svc = draftService !== stage.service ? draftService : undefined
    const params = stripOwnedAttachments(visibleParams())
    // CONTENT DEDUPE (2026-08-22): both spec-delivery paths (owned fetch +
    // shared-in-flight subscription) can land the same vocabulary; saving an
    // unchanged bag twice is noise (a pointless store write + stale mark).
    // A fire whose payload equals the last persist is dropped here.
    const last = lastSavedParamsRef.current
    if (
      last !== null &&
      Object.keys(params).length === Object.keys(last).length &&
      Object.keys(params).every((k) => Object.is(params[k], last[k]))
    ) {
      seedFlushRef.current = false
      return
    }
    // THE SEED FLUSHES NOW (2026-08-22): a fire flagged by
    // applySpecVocabulary is the slot-key null-seed the Inputs zone renders
    // from — persist it SYNCHRONOUSLY so the squares exist in the reveal's
    // first paint (the 300ms debounce made them pop in after the expand).
    if (seedFlushRef.current) {
      seedFlushRef.current = false
      if (landedModsRef.current) {
        Object.assign(params, landedModsRef.current)
        landedModsRef.current = null
      }
      lastSavedParamsRef.current = params
      onSave(params, svc)
      return
    }
    lastSavedParamsRef.current = params
    const id = setTimeout(() => onSave(params, svc), 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, draftService, specVw])
  
  // Categorize params into visual groups for hierarchy.
  const TEXT_KEYS = new Set(["prompt", "negative_prompt"])
  // When the lyrics enhance prompt is declared (music cards — ACE-Step,
  // MiniMax Music 3), claim lyrics for a dedicated block with its own
  // Enhance button (below).
  // When NOT declared, lyrics stays in the generic textarea grid — no
  // duplicate rendering, no hidden field.
  if (specEnhancePrompts["lyrics"]) TEXT_KEYS.add("lyrics")
  // NUMERIC_KEYS was a hardcoded allowlist that decided which params got a
  // bare <input type="number"> vs which fell through to free-text. The
  // unified NumberField (2026-08-10) replaces it: numeric routing is now
  // TYPE-DRIVEN — any param whose value is a number OR whose spec declares
  // a numeric/slider type routes through NumberField. No hardcoded list,
  // no leak of numeric values into the free-text grid.
  // INPUT_SLOTS is the shared vocabulary (lib/inputSlots.ts — the ONE
  // source, read by ParamEditor, CardDetailModal's Input slots section,
  // + CardTile's drop resolver). Seeded null from the picker when the
  // model declares an input; values are data: URLs, ComfyUI input
  // filenames, or server artifact URLs from upstream steps.
  // User-authored values that survive a model swap (2026-08-07 — "I change
  // the model, but the defaults stay the same"): the prompt text and any
  // attached inputs. EVERYTHING ELSE re-seeds from the new model's declared
  // form-spec defaults — switching anima → krea2 → flux must swap their
  // recipes (steps/cfg/size), not keep the old model's.
  // Index the form-spec's fields by name so rendering can be schema-driven
  // (select fields → dropdowns with the spec's finite options — never
  // free-text inputs; 2026-08-07).
  const rememberSpecFields = (spec: { fields?: FormField[]; schema_groups?: SchemaGroupDef[]; defaults?: Record<string, unknown>; features?: FormFeatures; enhance_prompt?: string; enhance_prompts?: Record<string, string> }) => {
    // Two-source MERGE — flat fields first, schema_groups ENRICH.
    // Flat fields carry the base type + options (the FormField enum is
    // render-limited: no "slider", no "textarea"). schema_groups is the
    // RENDERING source of truth (formSpec.ts): the full SchemaFieldType
    // vocabulary + min/max/step + tooltip. The merge lets schema_groups
    // OVERRIDE the flat type when it carries a richer one (slider vs the
    // flat "number") while still falling back to the flat type when the
    // schema_groups entry only carries default/visible_when (the test
    // mock's shape; also a defensive fallback for any future backend that
    // emits schema_groups entries without re-declaring the type).
    const byName: Record<string, { type?: string; label?: string; options?: SelectOptions; min?: number | null; max?: number | null; step?: number | null; tooltip?: string | null }> = {}
    for (const f of spec.fields ?? []) {
      byName[f.name] = { type: f.type, label: f.label ?? undefined, options: f.options ?? undefined }
}

    for (const g of spec.schema_groups ?? []) {
      for (const f of g.fields ?? []) {
        if (!f.name) continue
        byName[f.name] = {
          type: f.type ?? byName[f.name]?.type,
          label: f.label ?? byName[f.name]?.label,
          options: f.options ?? byName[f.name]?.options,
          min: f.min ?? undefined,
          max: f.max ?? undefined,
          step: f.step ?? undefined,
          tooltip: f.tooltip ?? undefined,
}
}
}
    setSpecFields(byName)
    // Capture the per-model enhance system prompt. Empty/absent = no
    // Enhance button renders for this card (the catalogue has no
    // enhance_prompt entry for the route).
    setSpecEnhancePrompt(spec.enhance_prompt ?? "")
    // Multi-field enhance prompts: prefer the plural dict; fall back to
    // singular → {prompt: ...} for backward compat. Empty {} = no buttons.
    setSpecEnhancePrompts(spec.enhance_prompts ?? (spec.enhance_prompt ? { prompt: spec.enhance_prompt } : {}))
    // The declared modifier wire locations (2026-08-09): the free-text
    // grid skips the mod bags entirely — they are subcards, never
    // standalone param rows. Declared-only: a service with no modifiers
    // feature skips nothing.
    setSpecModifierKeys(
      (spec.features?.modifiers ?? []).map((m) => m.param_key).filter(Boolean),
  )
    // visible_when lives ONLY on schema_groups (the flat fields list drops
    // it) — walk the groups so the editor can gate fields on the draft.
    const vw: Record<string, string | null> = {}
    // Schema field defaults are the VOCABULARY defaults (the builder SCHEMA
    // declares them: inpaint_region → "free", detection_threshold → 0.35).
    // Catalog defaults override per-model. Without the merge, the mode/
    // region seeding below would find specDefaults[knob] undefined — the
    // knobs were removed from the catalog defaults (2026-08-08).
    const schemaDefaults: Record<string, unknown> = {}
    for (const g of spec.schema_groups ?? []) {
      for (const f of g.fields ?? []) {
        if (!f.name) continue
        if (f.visible_when) vw[f.name] = f.visible_when
        if (f.default !== undefined && f.default !== null && !(f.name in schemaDefaults)) {
          schemaDefaults[f.name] = f.default
}
}
}
    setSpecVw(vw)
    setSpecZones(Object.fromEntries(zoneByField(spec.schema_groups ?? [])))
    setSpecDefaults({ ...schemaDefaults, ...(spec.defaults ?? {}) })
    setSpecFeatures(spec.features ?? null)
}

  // Apply a (contract-valid) form-spec's vocabulary to the draft: seed
  // schema-declared fields the draft doesn't carry + purge stale keys the
  // form no longer declares (2026-08-10 purge). Extracted so BOTH the
  // owned-fetch path (.then) and the shared-in-flight path (specRec
  // effect) apply the SAME vocabulary — the card can never silently keep
  // a raw draft (2026-08-12: forbid all fallbacks).

  // THE SEED FLUSHES NOW (2026-08-22, "the INPUTS squares load after the
  // card fully loads" verdict): applySpecVocabulary null-seeds the declared
  // slot keys into the draft — the keys SlotGrid's Inputs zone renders from.
  // Under the old flow that seed reached stage.params only through the
  // 300ms debounce, so on a fresh card the squares popped in a beat AFTER
  // the zoom reveal. When the seed CHANGED the draft, the very next
  // auto-save fires IMMEDIATELY (no timer), landing the keys inside the
  // reveal's own commit cascade. When it changed NOTHING (the warm case —
  // the picker already null-seeded every slot), the draft keeps its
  // identity: no re-render, no save fire at all. User keystrokes keep the
  // debounce.
  const seedFlushRef = useRef(false)
  // ── LANDED MOD BAGS (2026-09-06 recipe landing) ─────────────────────
  // The group-default landing stamps mod keys (loras) into the DRAFT —
  // but the mod zone is SubcardGrid's ownership: visibleParams strips
  // mod keys from EVERY auto-save payload (an old law — the mount
  // snapshot must never clobber a committed bag). The landing is the
  // ONE legitimate writer of an absent bag, so its stamps ride the
  // seed flush ONCE through this side-channel, then never again.
  const landedModsRef = useRef<Record<string, unknown> | null>(null)
  const applySpecVocabulary = (spec: FormSpec) => {
    rememberSpecFields(spec)
    setDraft((d) => {
      const next = applySpecVocabularyToDraft(d, spec, draftService, TEXT_KEYS)
      const same =
        Object.keys(next).length === Object.keys(d).length &&
        Object.keys(next).every((k) => Object.is(next[k], d[k]))
      seedFlushRef.current = !same
      if (!same) {
        const mods: Record<string, unknown> = {}
        // Read from the SPEC argument — the specModifierKeys STATE is
        // still the stale [] at this point (setSpecModifierKeys was
        // called a line up, async). The spec in hand is the truth.
        const modKeys = (spec.features?.modifiers ?? []).map(
          (m) => m.param_key).filter(Boolean)
        for (const mk of modKeys) {
          if (next[mk] !== undefined && next[mk] !== "" && !Object.is(next[mk], d[mk])) {
            mods[mk] = next[mk]
          }
        }
        if (Object.keys(mods).length > 0) landedModsRef.current = mods
      }
      return same ? d : next
    })
  }

  const handleModelChange = (service: string) => {
    setDraftService(service)
    // Contract store: only a validated spec may drive the swap. fresh: true
    // (2026-08-12) — a model swapped ONTO a cached record could carry a
    // session-stale vocabulary; the backend catalog is the truth.
    useSpecContractStore.getState().loadFormSpec(service, { fresh: true })
      .then((record) => {
        if (record.state === "error" || record.state === "violation") {
          setSpecVerdict(record.state)
          setSpecVerdictMsg(
            record.state === "error"
              ? record.error ?? "The form-spec could not be loaded."
              : "The form-spec declares capabilities that cannot render on this card.",
          )
          console.error(
            `[ParamEditor] form-spec for ${service} ${record.state} on model swap — card form hidden, never a degraded raw draft.`,
            record,
          )
          return
        }
        if (record.state !== "loaded" || !record.spec) return
        const spec = record.spec as FormSpec
        seededRecRef.current = record
        setSpecVerdict("loaded")
        rememberSpecFields(spec)
    setDraft((d) => {
          const next: Record<string, unknown> = { ...spec.defaults }
          // Model-aware preservation (2026-08-14): the preserve set carries
          // the GLOBAL slot vocab, so swapping onto an edit card would
          // carry input_image across (stale post-IMAGE1 — form_edit
          // declares image1/image2/image3) and a swap onto moss-tts would
          // carry voice_file (its schema declares [] — closed). Restrict
          // to the TARGET service's schema-derived slots (modelSlotsFor
          // wins — the model's schema is the vocabulary), plus the
          // canonical-but-undeclared WIRE slots (isUndeclaredWireSlot —
          // the seam; see the mount purge in paramSync).
          const formSlots = cardSlotsFor(service, spec.form)
          const preserve = new Set<string>(TEXT_KEYS)
          for (const s of formSlots ?? (inputSlots() as readonly string[])) preserve.add(s)
          for (const k of Object.keys(d)) {
            if (isUndeclaredWireSlot(k)) preserve.add(k)
          }
          // Variant override keys are ORTHOGONAL axis state (2026-08-11
          // Lightning-LoRA-survives-quant-swap regression): switching one
          // axis (Quant — route/model) must NOT reset another axis's state
          // (Variant — loras_selected / sampling_steps / guide_scale).
          // Preserve every key ANY variant declares as an override so the
          // user's selections across independent axes survive the swap.
          // The swapped variant's route still composes via
          // composeVariantRoute (the service string); only the VALUE of
          // shared override keys is preserved (the draft already reflects
          // the user's live selections — a Quant swap isn't a Variant reset).
          // Top-level on the wire: /v1/form-spec emits `variants` next to
          // `features` (the FormSpecRow SSOT), not under it. Reading the
          // legacy `features.variants` path yielded [] for every card
          // and the override-preservation logic stopped seeing any
          // variant keys (the model-picker-only + no-variant-tabs class).
          for (const v of spec.variants ?? []) {
            for (const k of Object.keys(v.defaults ?? {})) preserve.add(k)
          }
          for (const k of Object.keys(d)) {
            if (preserve.has(k) && d[k] !== undefined && d[k] !== null) next[k] = d[k]
}
      return next
    })
    })
      .catch((e: unknown) => {
        // NEVER silent (2026-08-12): a swap that can't load its spec must
        // not pretend the old vocabulary is current. The draft values
        // (the user's edits) stay, but the verdict face explains why the
        // form can't render — no fallback, no phantom rows.
        setSpecVerdict("error")
        setSpecVerdictMsg(e instanceof Error ? e.message : String(e))
        console.error(`[ParamEditor] form-spec fetch for ${service} failed on model swap.`, e)
    })
}

  // ── Auto-follow the GUI picker (2026-09-06, operator order: "I
  // should auto have it work on what I have selected"). The card
  // iframe is same-origin with the DSH GUI; readPickerModel() reads
  // the picker's live selection from the parent DOM, and
  // resolvePickerRoute() maps the display name onto a live route.
  // NO FALLBACK (queue lane law): embedded + unreadable/unresolvable
  // selection REFUSES loudly — never silently serves another model.
  // "" = standalone editor (no picker exists → host default serves).
  const pickerLlm = async (): Promise<string> => {
    const { fetchEnhanceRoutes, readPickerModel, resolvePickerRoute, isEmbedded } =
      await import("@melite/catalog")
    if (!isEmbedded()) return ""
    const pick = readPickerModel()
    if (!pick) {
      throw new Error(
        "Enhance couldn't read the model selected in the GUI — reload the card view and press again",
      )
    }
    const routes = await fetchEnhanceRoutes()
    if (!routes) {
      throw new Error(
        "Enhance couldn't list the live model routes — is the DSH host serving the card view?",
      )
    }
    const route = resolvePickerRoute(routes, pick)
    if (!route) {
      throw new Error(
        `The model selected in the GUI ("${pick}") matches no live route — select another model and press again`,
      )
    }
    return route
  }

  // ── Tooltip label: WHICH model serves the enhance buttons (operator
  // order 2026-09-06: "ON THE TOOLTIPS … HAVE IT SHOW THE [REDACTED 2026-11-05]
  // MODEL"). Resolved on mount; shows the picker's route, the host
  // default (standalone), or the refusal reason (embedded, unreadable).
  const [serveLabel, setServeLabel] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    void pickerLlm()
      .then((r) => {
        if (live) setServeLabel(r === "" ? "host default model" : r)
      })
      .catch((e: unknown) => {
        if (live) setServeLabel("selection unreadable — press Enhance to see why")
        void e
      })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Prompt Enhance — the "Enhance" button across from the Prompt label.
  // Renders ONLY when the model's form-spec carries an enhance_prompt
  // (the catalogue declares one for this route). Single-shot LLM call:
  // takes the human words + the per-model enhance system prompt, returns
  // a rewritten prompt. Serving model: the GUI picker's selection when
  // it resolves, else the host default — never a walk, never a fallback.
  const onEnhance = async (fieldName: string = "prompt") => {
    if (enhancing) return
    const current = String(draft[fieldName] ?? "").trim()
    // Resolve the system prompt: prefer the plural dict, fall back to
    // specEnhancePrompt for the "prompt" field (backward compat).
    const systemPrompt = specEnhancePrompts[fieldName] ?? (fieldName === "prompt" ? specEnhancePrompt : "")
    if (!current || !systemPrompt) return
    setEnhanceError(null)
    const { enhancePrompt } = await import("@melite/catalog")
    setEnhancing(true)
    try {
      const result = await enhancePrompt(systemPrompt, current, (await pickerLlm()) || undefined)
      setDraft((d) => ({
        ...d,
        [fieldName]: result.positive,
        // Carry the negative back ONLY for the prompt field, when the card
        // carries negative_prompt AND the backend produced one (distilled
        // variants return "" since they ignore negatives — don't clobber
        // an existing negative with an empty string).
        ...(fieldName === "prompt" && "negative_prompt" in d && result.negative ? { negative_prompt: result.negative } : {}),
      }))
    } catch (e: unknown) {
      setEnhanceError(e instanceof Error ? e.message : String(e))
    } finally {
      setEnhancing(false)
}
}

  // ── Agent Enhance — the agent system's orchestration core in one press.
  // POST /melite-tools/enhance {model} → EVERY declared field enhanced over
  // the harness model; results land keyed by field name. The draft carries
  // the same field names as the spec (prompt / lyrics / …), so application
  // is a straight sweep. negative_prompt only for the prompt field, and
  // only when non-empty (same no-clobber rule as one-shot above).
  const onAgentEnhance = async () => {
    if (agentEnhancing || enhancing) return
    const current = String(draft.prompt ?? "").trim()
    if (!current) return
    setEnhanceError(null)
    const { agentEnhance } = await import("@melite/catalog")

    setAgentEnhancing(true)
    try {
      const results = await agentEnhance(
        String(stage.service ?? ""),
        current,
        undefined,
        (await pickerLlm()) || undefined,
      )
      setDraft((d) => {
        const next: Record<string, unknown> = { ...d }
        for (const [field, r] of Object.entries(results)) {
          if (field === "prompt") {
            next.prompt = r.positive
            // Carry the negative ONLY when the card has the field AND the
            // backend produced one — never clobber with "".
            if ("negative_prompt" in next && r.negative) next.negative_prompt = r.negative
          } else {
            next[field] = r.positive
          }
        }
        return next
      })
    } catch (e: unknown) {
      setEnhanceError(e instanceof Error ? e.message : String(e))
    } finally {
      setAgentEnhancing(false)
    }
  }

  // Select change with mode-aware seeding — the upscale family's ``mode``
  // select drives visible_when (detail knobs on `mode != 'upscale'`,
  // prompt + input_mask on `mode == 'inpaint'`). The bag never carried
  // the detail knobs or the mask, so picking a mode must seed them from
  // the form-spec defaults or the freshly-revealed fields would be empty:
  // face/hands/body → seed detection_threshold / denoise / guide_size /
  // max_size (spec defaults, only when absent)
  // inpaint → seed input_mask: null (SlotGrid draws the square;
  // wiring/attach fills it)
  // anything else → drop input_mask (the square is inpaint-only; the
  // run wire stays clean in upscale mode)
  const handleSelectChange = (k: string, value: string) => {
    setDraft((d) => {
      const next: Record<string, unknown> = { ...d, [k]: value }
      if (k === "preset" && value) {
        // Workflow Preset → recipe params, POPULATED (2026-08-10): the
        // preset select used to be a server-side-only knob that applied
        // invisibly (and, pre-falsy-gate, literally never — the brick's
        // sentinel-None gates never fired against the card's prompt:"").
        // The catalog IS the data: the model's presets/<id>.yaml files
        // via presetsForRoute (own → family block → family head — the
        // SAME precedence the backend options resolver uses; the old
        // inline read lost the presets the moment the user switched
        // quant tier, because sibling routes carry no presets dict).
        // UNTOUCHED rule (2026-08-16): a preset owns the fields the
        // user hasn't personalized — empty fields AND fields still at
        // the spec default (a seeded default is not a choice; the old
        // empty-only fill made every preset a no-op on a fresh card —
        // Duration was already 60, so Draft (30 s) filled nothing).
        // A value the user actually SET wins — the brick's layer
        // (edit_image.py: explicit args win) agrees.
        const presets = presetsForRoute(stage.service)
        const pp = presets?.[value]?.params
        if (pp && typeof pp === "object") {
          for (const [pk, pv] of Object.entries(pp)) {
            const cur = next[pk]
            const untouched =
              cur === undefined || cur === null || cur === ""
              || (Array.isArray(cur) && cur.length === 0)
              || JSON.stringify(cur) === JSON.stringify(specDefaults[pk])
            if (untouched) next[pk] = pv
}
}
}
      // ── Discriminator change — ONE generic visible_when reconciler ──
      // (2026-08-15). Any select whose key some visible_when condition
      // references is a discriminator (mode, inpaint_region, qwen3_variant,
      // …). Changing one must do exactly two things, for EVERY gated field:
      //   1. DELETE fields that became hidden — stale values must not ride
      //      into the request (the family CONTRACT forbids them for the
      //      active discriminator and would 400 the run — silent-drop
      //      prevention, the same rule visibleParams applies on submit).
      //   2. SEED fields that became visible — slots (input_mask,
      //      reference_audio) null-seed so SlotGrid draws the square; form
      //      fields take their spec default so they render with a value.
      // The three bespoke handlers this replaces (the upscale mode branch,
      // the inpaint_region branch, the qwen3_variant branch) hardcoded their
      // own field lists — correct for upscale/tts, WRONG for the inpaint
      // card: switching its mode to extend deleted the PROMPT (extend needs
      // it) and never seeded the outpaint pads (CONTRACT requires them →
      // every run 400s); switching to refine never seeded refine_denoise
      // (the dial stayed invisible — "zero way to actually interface it").
      // Declaration order carries the loop: a compound condition
      // (`mode == 'inpaint' && inpaint_region == 'free'`) evaluates AFTER
      // inpaint_region was seeded, because specVw preserves schema_groups
      // order and the spec declares the sub-mode before its dependents.
      const isDiscriminator = Object.values(specVw).some(
        (cond) => !!cond && new RegExp(`\\b${k}\\b`).test(cond),
      )
      if (isDiscriminator) {
        const slotVocab = new Set<string>(inputSlots())
        for (const [fname, cond] of Object.entries(specVw)) {
          if (!cond) continue
          const nowVisible = evalVisibleWhen(cond, next)
          if (!nowVisible) {
            delete next[fname]
          } else if (!(fname in next)) {
            if (slotVocab.has(fname)) {
              next[fname] = null
            } else {
              const dv = specDefaults[fname]
              next[fname] = dv !== undefined ? dv : ""
            }
          }
        }
      }
      return next
    })
}

  return (
    <div className="mt-2.5 rounded-md border border-sidebar-border/50 bg-sidebar/40 p-2.5 space-y-2.5">
      {/* SPEC VERDICT FACE (2026-08-12): a card whose form-spec cannot
          load/validate renders THIS, never a raw draft — a raw draft is
          old fields, phantom cruft and missing mods with zero explanation
          (operator directive: forbid all fallbacks). Retry revalidates. */}
      {(specVerdict === "error" || specVerdict === "violation") && (
        <div data-testid="card-spec-verdict" className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-[11px] text-destructive">
          <div className="font-semibold">
            {specVerdict === "error" ? "Card form unavailable" : "Card form contract violation"}
          </div>
          <p className="mt-1 break-words">{specVerdictMsg}</p>
          <p className="mt-1 text-muted-foreground/80">
            This card cannot be rendered accurately without its form-spec. Fix the spec
            (or the gateway), then retry — nothing is shown rather than something stale.
          </p>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => {
              setSpecRetry((n) => n + 1)
              setSpecVerdict("idle")
            }}
            className="mt-2 border-destructive/40 px-2 py-1 text-[10px] font-semibold hover:bg-destructive/20"
          >
            Retry
          </Button>
        </div>
      )}
      {specVerdict !== "error" && specVerdict !== "violation" && (
        <>
      <AxisRows
        specDefaults={specDefaults}
        modelOpts={modelOpts}
        modelHeads={modelHeads}
        modelListError={modelListError}
        draftService={draftService}
        draft={draft}
        spec={specRec?.spec as FormSpec | null}
        specVw={specVw}
        onModelChange={handleModelChange}
        onApplyDraft={(rest) => setDraft(rest)}
      />

      {modelListError && (
        <p data-testid="model-list-error" className="flex items-center justify-between gap-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-600">
          <span className="truncate">Model list unavailable — {modelListError}</span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => {
              setModelListRetry((n) => n + 1)
              setModelListError(null)
            }}
            className="shrink-0 border-amber-500/40 px-1.5 py-0.5 font-semibold hover:bg-amber-500/20"
          >
            Retry
          </Button>
        </p>
      )}

      <ParamFields
        draft={draft}
        stage={stage}
        specFields={specFields}
        specVw={specVw}
        specZones={specZones}
        specModifierKeys={specModifierKeys}
        specFeatures={specFeatures}
        specEnhancePrompt={specEnhancePrompt}
        specEnhancePrompts={specEnhancePrompts}
        enhancing={enhancing}
        enhanceError={enhanceError}
        onFieldChange={(updater) => setDraft(updater)}
        onSelectChange={handleSelectChange}
        onEnhancePrompt={(fieldName) => onEnhance(fieldName)}
        onAgentEnhancePrompt={() => onAgentEnhance()}
        serveLabel={serveLabel}
        agentEnhancing={agentEnhancing}
      />
        </>
      )}
    </div>
  )
}
