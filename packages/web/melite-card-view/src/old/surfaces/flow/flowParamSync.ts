// flowParamSync — the form-spec vocabulary application, extracted from
// ParamEditor as a PURE function (moved VERBATIM from FlowCard.tsx,
// Cut 1d): seed schema-declared fields the draft doesn't carry + purge
// stale keys the form no longer declares (2026-08-10 purge). Pure so BOTH
// the owned-fetch path (.then) and the shared-in-flight path (specRec
// effect) apply the SAME vocabulary through the editor's setDraft — the
// card can never silently keep a raw draft (2026-08-12: forbid all
// fallbacks). `textKeys` is the editor's TEXT_KEYS set (prompt /
// negative_prompt / conditionally lyrics) — the base rendering
// categories the purge always keeps.
import { evalVisibleWhen, variantGroupDefault, type FormSpec } from "@melite/contracts"
import { isUndeclaredWireSlot,  inputSlots, cardSlotsFor } from "@melite/catalog"
import { applyVariantOverrides, deriveActiveVariant } from "@/surfaces/generate/PresetGroup"

export function applySpecVocabularyToDraft(
  d: Record<string, unknown>,
  spec: FormSpec,
  draftService: string,
  textKeys: Set<string>,
): Record<string, unknown> {
        // ── Seed schema-declared fields the draft doesn't carry yet ──────
        // Without this, fields whose default lives ONLY on the builder
        // SCHEMA (not the catalog YAML's `defaults:`) never enter the
        // draft, and the editor renders only the subset the catalog
        // happened to seed. ACE-Step was the reported regression: its
        // catalog `defaults:` carries just seed+duration, so the music
        // card showed 3 fields (prompt/duration/seed) instead of 12 —
        // lyrics + the 3 model selects + the 4 generation knobs + the 2
        // sampling sliders were all invisible. handleModelChange does
        // this same merge on swap; the mount path now does too.
          //
        // Two correctness constraints (learned from the upscale two-tier
        // matrix tests, which the first cut of this fix broke):
        // 1. DEFAULTS come from schema_groups (where Field.default
        // lives), with spec.defaults layered on top — NOT from the
        // flat spec.fields list, which carries no defaults. The
        // upscale mock puts detection_threshold's 0.35 only in
        // schema_groups; reading the flat list seeded "" instead.
        // 2. RESPECT visible_when — a field whose condition doesn't
        // pass against the current draft is NOT seeded. Otherwise
        // the empty string clobbers the undefined that
        // handleSelectChange's `if (next.X === undefined)` guard
        // relies on to seed mode-gated fields (inpaint_region,
        // detection_threshold) with their real defaults when the
        // user picks the mode. Invisible fields stay out of the
        // draft; handleSelectChange owns their seeding.
          // schema_groups → {name: default}; spec.defaults overrides.
    const schemaDefaults: Record<string, unknown> = {}
    const vw: Record<string, string | null> = {}
    for (const g of spec.schema_groups ?? []) {
      for (const f of g.fields ?? []) {
        if (!f.name) continue
        if (f.visible_when) vw[f.name] = f.visible_when
        if (f.default !== undefined && f.default !== null && !(f.name in schemaDefaults)) {
          schemaDefaults[f.name] = f.default
}
}
}
          const mergedDefaults = { ...schemaDefaults, ...(spec.defaults ?? {}) }
          
          const next: Record<string, unknown> = { ...d }
          const slotSet = new Set<string>((inputSlots() as readonly string[]))
          let added = false
    for (const f of spec.fields ?? []) {
              if (!f.name || f.name in next) continue
            const inVocab = slotSet.has(f.name)
            const isBinary = f.type === "file" || f.type === "image"
              || f.type === "audio" || f.type === "video"
            // Schema-declared slot (in the input vocabulary) — null-seed
            // so SlotGrid renders the square. This is how reference_audio
            // surfaces on qwen3-tts voice cards: it's a Field(type="audio",
            // families=("qwen3-tts",)) in build_tts.SCHEMA + a slot in
            // compile._CARD_SLOTS. moss_tts filters the Field out, so its
            // card never sees the slot. Without this null-seed, an
            // expanded voice card shows no attach square even though
            // the schema declares one (the bug: reference_audio invisible).
            if (inVocab) {
              const cond = vw[f.name]
              if (cond && !evalVisibleWhen(cond, next)) continue
              next[f.name] = null
              added = true
              continue
}
            // Binary field NOT in the vocabulary — no rendering path on
            // the card (not a slot, not a form input). Skip rather than
            // seed a null that the UI has no surface for.
            if (isBinary) continue
            // Skip fields gated invisible by visible_when — let the mode
            // select's handleSelectChange seed them on demand.
              const cond = vw[f.name]
              if (cond && !evalVisibleWhen(cond, next)) continue
            const dv = mergedDefaults[f.name]
            next[f.name] = dv !== undefined ? dv : (f.default ?? "")
              added = true
}
          // ── Schema-groups pass: catch slot-vocab fields EXCLUDED from
          // spec.fields by FEATURE_FIELD_TYPES ──────────────────────────
          // The flat spec.fields list skips "audio"/"image"/"video"/
          // "voice_file" types (they're in FEATURE_FIELD_TYPES, excluded
          // to prevent double-rendering in the legacy GenerateFormBody).
          // But FlowCard's SlotGrid NEEDS these null-seeded so it can
          // render the attach square. reference_audio (type "audio",
          // families=("qwen3-tts",)) is the canonical case: it's in
          // _CARD_SLOTS + schema_groups, but NOT in spec.fields — without
          // this pass, the mount-seed never null-seeds it and the voice
          // clone reference square never appears on qwen3-tts cards.
    for (const g of spec.schema_groups ?? []) {
      for (const f of g.fields ?? []) {
              if (!f.name || f.name in next) continue
              if (!slotSet.has(f.name)) continue
              const cond = vw[f.name]
              if (cond && !evalVisibleWhen(cond, next)) continue
              next[f.name] = null
              added = true
}
}
          // ── LAND ON THE GROUP DEFAULT (operator order, 2026-09-06:
          // "there should be default, and that is what we land on") ──
          // A group that declares a default variant (the Recipe axis)
          // LANDS a fresh draft on it: the default's overrides are
          // stamped (applyVariantOverrides — the same path a pick
          // takes), so the dropdown derives it as ACTIVE and the card
          // opens on the recipe, not on nothing. Two guards keep user
          // state sovereign:
          //  1. an ACTIVE variant of the group wins (never re-stamp
          //     over a pick);
          //  2. any override key carrying REAL state means the group
          //     was touched — a cleared [] bag stays cleared. The
          //     seeding pass above stamps absent fields with the
          //     inert "" seed; "" is never meaningful state for a
          //     recipe's keys (a loras list never legitimately holds
          //     it), so the landing treats it as untouched.
          for (const gid of Object.keys(spec.features?.variant_groups ?? {})) {
            const defId = variantGroupDefault(spec, gid)
            if (!defId) continue
            const groupVariants = (spec.variants ?? []).filter(
              (v) => (v.group || "Variant") === gid)
            if (groupVariants.length === 0) continue
            if (deriveActiveVariant(groupVariants, next)) continue
            const defVar = groupVariants.find((v) => v.id === defId)
            if (!defVar) continue
            const keys = Object.keys(defVar.defaults ?? {})
            if (keys.some((key) => key !== "model" && next[key] !== undefined && next[key] !== "")) continue
            const patched = applyVariantOverrides(next, defVar)
            delete patched.model
            for (const key of keys) if (key !== "model") next[key] = patched[key]
            added = true
          }
          // ── Purge STALE keys the form no longer declares (2026-08-10) ──
          // The form-spec is the CLOSED vocabulary for params. A revived
          // card can carry keys the form has since DROPPED — dead since
          // the merged-GGUF SCHEMA cleanup (dit_variant / lm_variant /
          // vae_variant on ace-step music cards) or dead since the IMAGE1
          // migration (input_image on edit cards). The rendering grid's
          // only path for an undeclared key is the catch-all free-text
          // input, so they show up as PHANTOM ROWS the user can't explain
          // ("WHY THE DO I SEE THAT?"). Drop them at spec-load: what
          // the form doesn't declare doesn't exist on this card.
          //
          // Declared = spec.fields ∪ schema_groups ∪ form-declared slots
          // ∪ mod-bag param_keys ∪ the base rendering categories
          // (TEXT_KEYS / NUMERIC_KEYS — prompt, seed, steps, cfg, …).
          // The base categories are kept because a spec may OMIT them
          // from its fields list while the rendering grid still owns
          // them via the hardcoded categorization (a real-world spec
          // always declares them; a minimalist mock may not). lanpaint_mask
          // exempts canonical-but-undeclared WIRE slots (isUndeclaredWireSlot
          // — the seam; purging those would drop live wiring on revive).
          const declared = new Set<string>()
          for (const f of spec.fields ?? []) if (f.name) declared.add(f.name)
          for (const g of spec.schema_groups ?? [])
            for (const f of g.fields ?? [])
              if (f.name) declared.add(f.name)
          for (const k of textKeys) declared.add(k)
          // Type-driven numeric protection (2026-08-10): replaces the old
          // hardcoded NUMERIC_KEYS allowlist. Any key whose draft value is
          // a number is a real param the NumberField grid will render —
          // protect it from the purge even if this spec doesn't list it
          // (catalog defaults seed seed/duration/etc.; a minimalist mock
          // may omit them from fields). Mirrors the routing logic in
          // isNumericField below.
          for (const k of Object.keys(d)) {
            if (typeof d[k] === "number") declared.add(k)
}
          // The model's schema-derived slots are its closed slot vocabulary
          // (2026-08-14 — the user directive: the card shows ONLY what the
          // model expects). qwen3-tts-base declares [voice_file,
          // reference_audio]; moss-tts declares [] (closed — every slot key
          // purges, voice_file can never survive a swap onto it). Fall back
          // to the form's declared slots (form_edit → image1/image2/image3,
          // NOT the global input_image), then to the global vocab when
          // neither declares — an unknown service (yaml brick) keeps every
          // slot it carries.
          const modelSlotList = cardSlotsFor(draftService, spec.form)
          for (const s of modelSlotList ?? (inputSlots() as readonly string[])) declared.add(s)
          // (isUndeclaredWireSlot covers exactly the canonical wire slots)
          for (const k of Object.keys(d)) {
            if (isUndeclaredWireSlot(k)) declared.add(k)
          }
          for (const m of spec.features?.modifiers ?? [])
            if (m.param_key) declared.add(m.param_key)
            // ── Exempt variant override keys from the purge ───────────────
            // Patch-only variants (Qwen3-TTS CustomVoice/Base/VoiceDesign,
            // qwen-img-edit-2511 Lightning/Standard) write override keys into the
            // draft (qwen3_variant, loras_selected, sampling_steps, …).
            // Some of these keys are NOT declared form fields (qwen3_variant
            // has no Field in build_tts.SCHEMA — the Variant dropdown IS
            // its only surface). Without this exemption the purge deletes
            // them, breaking deriveActiveVariant (can't match overrides
            // against an absent value) and dropping the engine's variant
            // selector from the /v1/run payload entirely.
            for (const v of spec.variants ?? [])
            for (const key of Object.keys(v.defaults ?? {}))
            declared.add(key)
          let dropped = false
          for (const k of Object.keys(next)) {
            if (!declared.has(k)) {
              delete next[k]
              dropped = true
}
}
          // No changes = no state write = no spurious auto-save / stale
          // marking. The common case (catalog defaults already cover the
          // schema, no stale keys) becomes a no-op.
          return (added || dropped) ? next : d
}
