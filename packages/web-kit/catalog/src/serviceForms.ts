// Service-form lookup helper — converts the form-tag vocabulary from
// /v1/forms (rail-derived: plugins/<id>/rail/*.yaml since C-RAIL) into "given a sidebar_key,
// which form-tag does it belong to?" lookups.
//
// Replaces the hardcoded `selectedService === "tts_speak"` /
// `selectedService === "voice_creator"` / etc. string comparisons scattered
// across GenerateFormBody with form-tag-driven checks:
//
//   isForm(selectedService, "form_tts")         // was: === "tts_speak"
//   isForm(selectedService, "form_voice")       // was: === "voice_creator"
//   isForm(selectedService, "form_music")       // was: === "generate_music"
//   isForm(selectedService, "form_sound")       // was: === "generate_sound"
//   isForm(selectedService, "form_generate")    // was: === "generate" || "generate_image"
//   isForm(selectedService, "form_edit")        // was: === "edit"
//
// Adding a new audio surface (e.g. form_podcast) is now a YAML edit, not a
// new `selectedService === "..."` branch in N components.

import { apiFetch } from "./api.ts"
import { createClientStore } from "./clientStore.ts"

export interface FormEntry {
  /** sidebar_key — the MCP tool / surface name shown in the sidebar. */
  sidebar_key?: string
  /** Human label for the sidebar entry. */
  label?: string
  /** UiGenre grouping ("image", "audio", "video", ...). */
  genre?: UiGenre
  /** Default backend service for the form. */
  default_service?: string
  /** Form-tag description. */
  description?: string
  /** §16 C-RAIL (rail-owned /v1/forms): explicit row order within the
   * genre group (absent on legacy payloads → sorts last, label order). */
  order?: number
  /** Lucide icon name (the plugin rail's closed vocabulary; null/absent
   * → the genre header icon governs, as today). */
  icon?: string | null
  /** The owning plugin id (rail-owned vocabulary provenance). */
  plugin?: string
}

export type FormsData = Record<string, FormEntry>

/** UiGenre keys used by the sidebar grouping. The literal union keeps the
 *  known genres type-safe (matches GENRE_ORDER in ServicesSidebar) while
 *  the `(string & {})` tail lets the backend add genres without a TS churn.
 *  Mirrors the values emitted by /v1/forms `genre` (the YAML `ui.genre`).
 *  Named UiGenre (DRY sweep J16, 2026-10-18): this OPEN ui union
 *  is a different vocabulary from the CLOSED lane grammar enum
 *  (comfyui-cordis generated/vocab.ts GenreValues) — distinct
 *  domains that merely shared a name. */
export type UiGenre =
  | "image"
  | "video"
  | "audio"
  | "motion"
  | "avatar"
  | "3d"
  | "creative"
  | "specialized"
  | "training"
  | "external"
  | (string & {})

/** A resolved sidebar row — form entries, MCP tools, /v1/services entries,
 *  studio links, and the external AI-Chat link all reduce to this shape
 *  before grouping by genre. One input shape for the SectionHeader+ListRow
 *  flow; ServicesSidebar is the canonical consumer. */
export interface SidebarItem {
  /** The onSelect payload — MCP tool name, service name, sidebar_key, or a
   *  `_studio` / `_llm_chat` sentinel. */
  name: string
  /** Human label for the row. */
  label: string
  /** UiGenre grouping (drives SectionHeader + ordering). */
  genre: UiGenre
}

// THE SANCTIONED SEAT (the hand-roll row 1.7): the forms cache is a
// module-level value with subscribers — `createClientStore` owns the
// record, the observation and the publication. The cache itself moves
// INTO the record (it was module state anyway); the exported accessors
// keep their names and their shapes.
const formsStore = createClientStore<{ cache: FormsData }>({ cache: {} })
let _inflight: Promise<FormsData> | null = null

export async function loadForms(opts?: { force?: boolean }): Promise<FormsData> {
  if (Object.keys(formsStore.getState().cache).length > 0 && !opts?.force) return formsStore.getState().cache
  if (_inflight) return _inflight
  _inflight = (async () => {
    try {
      const res = await apiFetch("/v1/forms")
      if (!res.ok) {
        console.warn("[serviceForms] /v1/forms failed:", res.status)
        return formsStore.getState().cache
      }
      const data = await res.json()
      // A 200 IS NOT A FORMS DOC (audit R-E3, 2026-10-22): an error
      // body riding status 200 (a gateway's lie) must not wipe the
      // good cache — the !ok and catch legs warn and keep the stale
      // cache, and this leg speaks the same law: ingest ONLY a
      // record-shaped forms map, never the ?? {} fallback that
      // emptied the sidebar on the first force load.
      const forms: unknown = (data as { forms?: unknown } | null)?.forms
      if (typeof forms !== "object" || forms === null || Array.isArray(forms)) {
        console.warn("[serviceForms] /v1/forms 200 with malformed body — keeping cache")
        return formsStore.getState().cache
      }
      // The record IS the publication: a changed cache notifies the
      // store's subscribers, and an unchanged one notifies nobody — the
      // engine's own patch law, replacing the hand-rolled notify().
      formsStore.setState({ cache: forms as FormsData })
      return formsStore.getState().cache
    } catch (e) {
      console.warn("[serviceForms] fetch error:", e)
      return formsStore.getState().cache
    } finally {
      _inflight = null
    }
  })()
  return _inflight
}

export function getCachedForms(): FormsData {
  return formsStore.getState().cache
}

export function subscribeForms(fn: () => void): () => void {
  return formsStore.subscribe(() => { fn() })
}

// ── Selectors ──────────────────────────────────────────────────────────────
//
// PRIMITIVE LOOKUPS — the bedrock of the "dumb legobox" frontend.
//
// These functions replace bespoke boolean classification. Instead of
// `isImageGen`/`isImageEdit`/`isAudio` flags with hardcoded string checks
// and fallback chains, the rest of the app calls ONE lookup:
//
//     const tag = formForSidebarKey(selectedService)   // → "form_generate"
//     const genre = forms[tag]?.genre                  // → "image"
//
// Adding a new surface (form_inpaint, form_upscale, form_video, ...) is a
// rail YAML edit (plugins/<id>/rail/) — these selectors pick it up with zero
// code changes. That's the point: primitives scale, bespoke branches rot.

/**
 * Reverse-lookup: given a sidebar_key (the value the rest of the app calls
 * `selectedService`), return the form-tag it belongs to. This is THE
 * primitive that drives every render decision in GenerateFormBody.
 */
export function formForSidebarKey(sidebarKey: string, forms: FormsData = formsStore.getState().cache): string | undefined {
  for (const [formTag, entry] of Object.entries(forms)) {
    if (entry.sidebar_key === sidebarKey) return formTag
  }
  return undefined
}

/**
 * Check whether the given sidebar_key belongs to the given form-tag.
 * Internal — the convenience predicates below are the public API.
 */
function isForm(sidebarKey: string, formTag: string, forms: FormsData = formsStore.getState().cache): boolean {
  return forms[formTag]?.sidebar_key === sidebarKey
}

/** True if the sidebar_key belongs to ANY of the given form-tags. */
function isInAnyForm(sidebarKey: string, formTags: string[], forms: FormsData = formsStore.getState().cache): boolean {
  return formTags.some((t) => isForm(sidebarKey, t, forms))
}

/**
 * Convenience predicates for the common form-tags. Each returns true when
 * the given sidebar_key belongs to that form-tag's surface.
 */
export const isTtsForm      = (k: string) => isForm(k, "form_tts")
export const isVoiceForm    = (k: string) => isForm(k, "form_voice")
export const isVoiceStudioForm = (k: string) => isForm(k, "form_voice_studio")
export const isMusicForm    = (k: string) => isForm(k, "form_music")
export const isGenerateForm = (k: string) => isForm(k, "form_generate")
export const isEditForm     = (k: string) => isForm(k, "form_edit")

/**
 * True if the sidebar_key belongs to any audio-genre form-tag.
 * (form_tts, form_voice, form_voice_studio, form_music, form_sound)
 */
export function isAudioForm(sidebarKey: string, forms: FormsData = formsStore.getState().cache): boolean {
  return isInAnyForm(sidebarKey, ["form_tts", "form_voice", "form_voice_studio", "form_music", "form_sound"], forms)
}

/**
 * The ordered sidebar rows from a forms payload (§16 C-RAIL: /v1/forms is
 * rail-derived and carries `order`). Grouped by genre, sorted by
 * (order ?? Infinity, label) within the group — the entry's plugin-
 * declared order is the law; entries without one (legacy payloads) sort
 * last, label-alphabetical. Pure: the sidebar + tests share ONE item
 * builder, no drift between render and pin.
 */
export function formSidebarItems(forms: FormsData): Record<string, SidebarItem[]> {
  const out: Record<string, SidebarItem[]> = {}
  for (const d of Object.values(forms)) {
    const genre = d.genre
    const key = d.sidebar_key
    if (!genre || !key) continue
    const order = typeof d.order === "number" ? d.order : Infinity
    ;(out[genre] ??= []).push({ name: key, label: d.label || key, genre, order } as SidebarItem)
  }
  for (const items of Object.values(out)) {
    // ORDER PRESENCE (2026-09-12): every item pushed above carries a
    // numeric `order` (a missing declaration became Infinity at the push
    // site), so the comparator reads it directly — no `?? Infinity`
    // fallback. The fallback's right operand is unreachable through this
    // builder (the comparator only ever sees pushed items), and v8 counts
    // an unevaluated `??` operand as an uncovered branch.
    items.sort(
      (a, b) =>
        (a as SidebarItem & { order: number }).order -
          (b as SidebarItem & { order: number }).order ||
        a.label.localeCompare(b.label),
    )
  }
  return out
}
