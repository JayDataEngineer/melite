// inputSlots — the input-slot vocabulary, fed from the DECLARATIVE source.
//
// The backend owns the vocabulary: compile.py's input_vocabulary()
// (canonical slot keys = the union of every form's input_slots + the
// wireable family params, plus the family-param → slot alias map). The
// catalog response carries it as "input_vocabulary"; modelCatalog.ts feeds
// it here on load. A param key is a slot iff it appears in the current
// vocabulary — the frontend never hand-maintains the list.
//
// The three frontend consumers — PipelineCard's ParamEditor skip list,
// CardDetailModal's Input slots section, + CardTile's drop resolver —
// all read through inputSlots() / the helpers here. Rule 4: one shape,
// everywhere, in one edit.
//
// FALLBACK_SLOTS is ONLY the pre-catalog boot default (a mirror of the
// backend's _CARD_SLOTS); the catalog's declared vocabulary REPLACES it the
// moment it loads — if the two ever drift, the catalog wins.
//
// `source` is intentionally ABSENT — it's the doc-driven input family's
// slot (InputCardEditor owns it, NOT the manual-attach surface).

/** Pre-catalog boot default, mirroring compile.py's _CARD_SLOTS. */
const FALLBACK_SLOTS = [
 "input_image", "image1", "image2", "image3", "reference_image", "end_image",
 "first_frame", "last_frame",
 "lanpaint_mask",
 "input_mask",
 "source_image", "source_glb", "input_glb",
 "prev_motion_artifact",
 "preview_glb",
 "reference_audio",
 "voice_file",
] as const

/** Family input-param name → its slot key (compile.py _INPUT_PARAM_TO_SLOT,
 * delivered via the catalog's input_vocabulary.aliases). Identity entries
 * (input_image → input_image) are skipped by normalizeSlotParams. */
export type InputVocabulary = {
 slots?: readonly string[]
 aliases?: Record<string, string>
 /** Per-form override of `aliases` (compile.py input_vocabulary.form_aliases
 * → _form_slot_aliases). A multi-slot form whose family param names
 * collide with another form's slot — input_artifact → image1 on form_edit
 * but → input_image on form_upscale — declares the difference here. The
 * form-aware fold (normalizeSlotParams with a form) uses
 * form_aliases[form] ?? aliases; without it a revived edit card folds
 * input_artifact onto a phantom INPUT_IMAGE square (2026-08-09). */
 form_aliases?: Record<string, Record<string, string>>
 /** Per-form DECLARED slot list (compile.py input_vocabulary.form_slots →
 * FormConfig.input_slots). A form's declared slots are its CLOSED slot
 * vocabulary: normalizeSlotParams purges any global-slot param key the
 * form did NOT declare (2026-08-10 — a revived pre-IMAGE1 edit card
 * carrying both input_image and image1 rendered TWO squares for the
 * same slot; the user's purge policy). Text-only forms resolve []
 * (CLOSED zero-slot vocabulary — form_generate, form_llm_text); the
 * purge fires and drops every global-slot key. Unknown forms (not in
 * the payload) are absent — global fallback, no purge. */
 form_slots?: Record<string, string[]>
 /** Per-MODEL declared slot list (2026-08-14) — the catalog folds each
 * model entry's schema-derived ``input_slots`` here (modelCatalog.ts).
 * THE model's schema is the vocabulary, never the form: qwen3-tts-base
 * derives [voice_file, reference_audio] from build_tts.SCHEMA while
 * moss-tts derives [] (no clone capability) — a form-level list would
 * leak voice_file onto every model of the form (the 2026-08-14 user
 * catch). Same semantics as form_slots: an empty [] is a CLOSED
 * zero-slot vocabulary (purge + zero squares). Absent = unknown model
 * (fall back to the form, then the global vocabulary). */
 model_slots?: Record<string, string[]>
 /** Per-slot FileKind (2026-08-12): slot key → expected file type
 * (image / mask / glb / audio / video / motion / voice / any).
 * Drives the setSlotInput type guard (canWireSlot) — mirrors the
 * backend's slot_kinds.py so both sides enforce the same contract.
 * Absent = pre-catalog boot; slotKind() returns "any" (permissive). */
 slot_kinds?: Record<string, string>
 /** Canonical slots no form/model declares but families read (the
 * compile.py exemption list — replaces the boot mirror when served). */
 undeclared_slots?: readonly string[]
}

let _slots: readonly string[] = FALLBACK_SLOTS
let _aliases: Record<string, string> = {}
let _formAliases: Record<string, Record<string, string>> = {}
let _formSlots: Record<string, string[]> = {}
let _modelSlots: Record<string, string[]> = {}
let _slotKinds: Record<string, string> = {}

/** Canonical-but-undeclared wire slots (the 2026-08-21 seam for the
 * lanpaint_mask exemption): slots the FAMILIES read on the wire even
 * though no form/model declares them — a wireable mask arriving from
 * input_prep's optional ``mask`` output. The purge sites (paramSync's
 * mount purge, paramEditor's swap preserve, normalizeSlotParams' fold)
 * used to hardcode the ONE literal each; the mirror lives HERE beside
 * FALLBACK_SLOTS with the same law: this is the boot mirror of
 * compile.py's exemption list — a served ``undeclared_slots`` on the
 * vocabulary wire REPLACES it the moment one exists. */
const FALLBACK_UNDECLARED_WIRE_SLOTS: readonly string[] = ["lanpaint_mask"]
let _undeclaredWireSlots: readonly string[] = FALLBACK_UNDECLARED_WIRE_SLOTS

/** Is this key a canonical wire slot no form/model declares? (protected
 *  from the closed-vocabulary purge — the value is live wiring, not a
 *  stale form value.) */
export function isUndeclaredWireSlot(key: string): boolean {
 return _undeclaredWireSlots.includes(key)
}

/** Feed the vocabulary from the catalog (modelCatalog.ts calls this on
 * every successful load). Replaces — not merges — the boot default: the
 * catalog's declaration is the truth. Test-only callers pass a fixture. */
export function setInputVocabulary(v: InputVocabulary): void {
 if (Array.isArray(v.slots) && v.slots.length > 0) _slots = v.slots
 if (Array.isArray(v.undeclared_slots)) _undeclaredWireSlots = v.undeclared_slots
 if (v.aliases && typeof v.aliases === "object") _aliases = { ...v.aliases }
 if (v.form_aliases && typeof v.form_aliases === "object") {
 _formAliases = Object.fromEntries(
 Object.entries(v.form_aliases).filter(
 ([, m]) => m && typeof m === "object",
 ),
 )
 }
 if (v.form_slots && typeof v.form_slots === "object") {
 // NO s.length>0 filter: an empty [] is a CLOSED zero-slot vocabulary
 // (form_generate, form_llm_text — text-only forms). Dropping [] here
 // made formSlotsFor return undefined → stageSlots fell back to the
 // GLOBAL slot union → the generate_image family's shared SCHEMA field
 // input_image null-seeded onto every text-to-image card and rendered
 // a phantom INPUT_IMAGE square (2026-08-10). [] stays in so the gate
 // closes: stageSlots returns [] (no squares) + normalizeSlotParams
 // purges every global-slot key.
 _formSlots = Object.fromEntries(
 Object.entries(v.form_slots).filter(
 ([, s]) => Array.isArray(s),
 ),
 )
 }
 if (v.model_slots && typeof v.model_slots === "object") {
 // Same []-preserving semantics as form_slots: an empty [] is a CLOSED
 // zero-slot model (moss-tts — no clone capability → zero squares +
 // purge). Dropping [] would fall back to the global union and render
 // phantom squares the model's schema doesn't serve.
 _modelSlots = Object.fromEntries(
 Object.entries(v.model_slots).filter(([, s]) => Array.isArray(s)),
 )
 }
 if (v.slot_kinds && typeof v.slot_kinds === "object") {
 _slotKinds = { ...v.slot_kinds }
 }
}

/** The per-form alias table for a form (form_aliases[form] ?? global). */
export function formAliasesFor(form?: string | null): Record<string, string> {
 if (form && _formAliases[form]) return _formAliases[form]
 return _aliases
}

/** The form's DECLARED slot list (form_slots[form]). undefined = UNKNOWN
 * form (global-slot fallback — be permissive). [] = the form declares a
 * CLOSED zero-slot vocabulary (text-only: form_generate, form_llm_text)
 * — stageSlots renders zero squares + normalizeSlotParams PURGES every
 * global-slot key. The empty-array-as-truthy semantics is the gate. */
export function formSlotsFor(form?: string | null): readonly string[] | undefined {
 if (form && form in _formSlots) return _formSlots[form]
 return undefined
}

/** The MODEL's declared slot list (model_slots[service] — the catalog
 * route key). undefined = UNKNOWN model (fall back to the form, then the
 * global vocabulary — be permissive for non-catalog services). [] = the
 * model's schema declares a CLOSED zero-slot vocabulary (moss-tts — no
 * clone capability): stageSlots renders zero squares + normalizeSlotParams
 * PURGES every slot key. THE model's schema-derived vocabulary WINS over
 * the form's (2026-08-14 — a form-level list leaks slots onto models of
 * the form whose schema doesn't serve them). */
export function modelSlotsFor(
 service?: string | null,
): readonly string[] | undefined {
 if (service && service in _modelSlots) return _modelSlots[service]
 return undefined
}

/** THE per-model slot list for a service: modelSlotsFor(service) ??
 * formSlotsFor(form) ?? undefined. Used by the card's declared-vocabulary
 * purge — the model's schema is the vocabulary, the form is the fallback
 * for non-catalog services, and unknown services stay permissive. */
export function cardSlotsFor(
 service?: string | null,
 form?: string | null,
): readonly string[] | undefined {
 return modelSlotsFor(service) ?? formSlotsFor(form)
}

/** The current canonical slot list, in declared order. */
export function inputSlots(): readonly string[] {
 return _slots
}

/** True if the params carry at least one input slot. */
export function hasInputSlots(params: Record<string, unknown>): boolean {
 return _slots.some((k) => k in params)
}

/** The first input slot declared in the params, in vocabulary order.
 * CardTile's drop target uses this to decide which slot a dropped asset
 * fills (most cards have exactly one). null = the card carries no slot
 * (drop rejected). */
export function firstInputSlot(params: Record<string, unknown>): string | null {
 return _slots.find((k) => k in params) ?? null
}

/** THE slot-list source: the slot keys a stage's params declare, in
 * vocabulary order. Store (setSlotInput + collectUpstreamResults),
 * SlotGrid, and the CardTile strip all derive the per-slot array from
 * here — slot index i ↔ stageSlots(params)[i].
 *
 * **Form-aware** (2026-08-10): when the card's ``form`` is known and the
 * form DECLARES its slots (form_slots[form]), the filter list is the
 * form's slots, NOT the global _slots union. A revived pre-IMAGE1 edit
 * card whose params still carry ``input_image`` (loaded before the catalog
 * arrived → normalizeSlotParams couldn't purge it) would otherwise render
 * a phantom 4th square. The form's declared slots are the CLOSED
 * vocabulary — a stale global-slot key outside them is invisible here
 * even if it lingers in params. Callers without a form fall back to the
 * global _slots filter (unchanged).
 *
 * **Model-aware** (2026-08-14): when the card's ``service`` (catalog
 * model route) declares its slots (model_slots[service]), THE MODEL'S
 * list is the filter — never the form's. qwen3-tts-base → [voice_file,
 * reference_audio]; moss-tts → [] (zero squares — no clone capability).
 * A form-level list would leak voice_file onto moss-tts (the user catch).
 * Unknown services fall back to the form, then the global filter. */
export function stageSlots(
 params: Record<string, unknown>,
 form?: string | null,
 service?: string | null,
): string[] {
 const declared = cardSlotsFor(service, form)
 if (declared) return declared.filter((k) => k in params)
 return _slots.filter((k) => k in params)
}

/** Re-normalize an inputs array to the fixed per-slot invariant:
 * length === slots.length, missing entries padded with "". Never
 * truncates — agent-written/loaded docs keep their length as written
 * (reads are index-safe: slots[i] undefined → skipped). */
export function padInputs(
 inputs: readonly string[],
 slots: readonly string[],
): string[] {
 const padded = [...inputs]
 while (padded.length < slots.length) padded.push("")
 return padded
}

/** Fold family input-param names onto the slot vocabulary (idempotent).
 *
 * Agent-written descriptors and revived run params can carry the FAMILY's
 * param names (input_artifact / image_artifact / glb_artifact — the
 * form_edit/form_upscale compile names) instead of the slot keys; the
 * backend resolves ONLY the slot keys (compile._resolve_input_value), so
 * an unnormalized card would render no square AND silently lose its input
 * on re-run. Every card materializer (addStage, the hydrates, and the
 * BACKEND build_pipeline — drafts.py folds before persisting, 2026-08-13)
 * runs this so the card speaks one vocabulary.
 *
 * Precedence: an explicit slot-key value wins over an alias; a real alias
 * value wins over a null slot placeholder (the picker's null-seed).
 *
 * ``form`` — when the card's form is known, the fold uses the form's
 * DECLARED alias table (form_aliases[form] ?? aliases): form_edit folds
 * input_artifact → image1 (NOT the global input_image — the 2026-08-09
 * IMAGE1 contract), while form_upscale keeps input_artifact → input_image.
 * The form's declared slot list (form_slots[form]) additionally PURGES
 * stale global-slot keys the form never declared — input_image can never
 * survive on an edit card (2026-08-10 purge policy).
 *
 * **Model-aware** (2026-08-14): when ``service`` is a catalog model whose
 * schema-derived list (model_slots[service]) exists, THE MODEL'S list is
 * the purge gate — never the form's. On moss-tts ([]) every slot key is
 * purged (voice_file can never survive a model swap onto it); on
 * qwen3-tts-base ([voice_file, reference_audio]) both squares' keys are
 * protected. Unknown services fall back to the form's gate.
 */
export function normalizeSlotParams(
 params: Record<string, unknown>,
 form?: string | null,
 service?: string | null,
): Record<string, unknown> {
 const aliases = formAliasesFor(form)
 const out: Record<string, unknown> = {}
 // Pass 1: verbatim copy — everything except keys that RENAME.
 for (const [k, v] of Object.entries(params)) {
 const alias = aliases[k]
 if (alias === undefined || alias === k) out[k] = v
 }
 // Pass 2: slot-vocabulary keys that were aliased out stay (they win) —
 // EXCEPT keys the form/model did not declare. The declared slots are
 // the CLOSED vocabulary: a global-slot key outside them is STALE on this
 // card and purged (the 2026-08-10 purge — a revived pre-IMAGE1 edit card
 // carrying both input_image and image1 rendered TWO squares for the same
 // slot; the 2026-08-14 audio purge — voice_file surviving a swap onto
 // moss-tts). Canonical-but-undeclared WIRE slots are exempt
 // (isUndeclaredWireSlot — the seam at the top of this module):
 // purging those would drop live wiring on revive.
 const declared = cardSlotsFor(service, form)
 for (const k of _slots) {
 if (!(k in params)) continue
 if (declared && !declared.includes(k) && !isUndeclaredWireSlot(k)) {
 // Pass 1 may have written the key verbatim (it has no form alias) —
 // the purge must REMOVE it, not just refuse to re-add it.
 delete out[k]
 continue
 }
 out[k] = params[k]
 }
 // Pass 3: fold the aliases onto their slots when the slot key is absent
 // or still a null placeholder.
 for (const [alias, slot] of Object.entries(aliases)) {
 if (alias === slot) continue
 if (!(alias in params)) continue
 const cur = out[slot]
 if (cur === undefined || cur === null) out[slot] = params[alias]
 }
 return out
}

// ── FileKind vocabulary + slot-type guard (2026-08-12) ───────────────────
//
// Mirrors backend/core/pipelines/slot_kinds.py — the SAME vocabulary on
// both sides of the wire. The catalog delivers slot_kinds via
// input_vocabulary; familyGenres arrive as the family's ``genre`` field.
// Together they drive canWireSlot() — the guard setSlotInput calls before
// accepting a wire (rejects e.g. audio→input_glb at the UI layer before
// the request ever reaches the backend).

/** The closed FileKind vocabulary — a backend drift lands here on api:sync. */
export type FileKind =
 | "image" | "mask" | "glb" | "audio" | "video" | "motion" | "voice" | "text"
 | "any"

/** Per-slot FileKind (from the catalog's input_vocabulary.slot_kinds).
 * Unknown slot → "any" (permissive — the guard never blocks on a missing
 * declaration, only on a DECLARED mismatch). */
export function slotKind(slotKey: string): FileKind {
 const k = _slotKinds[slotKey]
 if (k && typeof k === "string") return k as FileKind
 return "any"
}

/** Map a family's catalog ``genre`` to its output FileKind (the PRODUCER
 * side). Unknown / missing genre → "any" (permissive). Mirrors
 * slot_kinds.genre_to_kind. */
const GENRE_TO_KIND: Record<string, FileKind> = {
 image: "image",
 video: "video",
 audio: "audio",
 "3d": "glb",
 motion: "motion",
 ai_generated: "image",
 text: "text",
}

export function genreToKind(genre: string | null | undefined): FileKind {
 if (!genre) return "any"
 return GENRE_TO_KIND[genre] ?? "any"
}

/** May a producer of ``producer`` kind feed a consumer of ``consumer``
 * kind? Mirrors slot_kinds.kinds_compatible:
 *   • "any" on either side → compatible (permissive for unknowns).
 *   • Same kind → compatible.
 *   • image ↔ mask → compatible (a mask is an image).
 *   • Everything else → incompatible. */
export function kindsCompatible(producer: FileKind, consumer: FileKind): boolean {
 if (producer === "any" || consumer === "any") return true
 if (producer === consumer) return true
 if ((producer === "image" && consumer === "mask") ||
 (producer === "mask" && consumer === "image")) return true
 return false
}

/** The slot-type guard: may an upstream stage whose family has ``genre``
 * feed ``slotKey``? This is the function setSlotInput calls. Returns
 * ``true`` when the wire is type-safe (or when either side is unknown —
 * permissive) and ``false`` when a DECLARED mismatch is detected. */
export function canWireSlot(
 genre: string | null | undefined,
 slotKey: string,
): boolean {
 return kindsCompatible(genreToKind(genre), slotKind(slotKey))
}
