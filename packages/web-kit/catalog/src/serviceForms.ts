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

import { apiFetch } from "./api"

export interface FormEntry {
  /** sidebar_key — the MCP tool / surface name shown in the sidebar. */
  sidebar_key?: string
  /** Human label for the sidebar entry. */
  label?: string
  /** Genre grouping ("image", "audio", "video", ...). */
  genre?: Genre
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

/** Genre keys used by the sidebar grouping. The literal union keeps the
 *  known genres type-safe (matches GENRE_ORDER in ServicesSidebar) while
 *  the `(string & {})` tail lets the backend add genres without a TS churn.
 *  Mirrors the values emitted by /v1/forms `genre` (the YAML `ui.genre`). */
export type Genre =
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
  /** Genre grouping (drives SectionHeader + ordering). */
  genre: Genre
}

let _cache: FormsData = {}
let _inflight: Promise<FormsData> | null = null
const _listeners = new Set<() => void>()

function notify(): void {
  for (const fn of _listeners) {
    try { fn() } catch (e) { console.warn("[serviceForms] listener error:", e) }
  }
}

export async function loadForms(opts?: { force?: boolean }): Promise<FormsData> {
  if (Object.keys(_cache).length > 0 && !opts?.force) return _cache
  if (_inflight) return _inflight
  _inflight = (async () => {
    try {
      const res = await apiFetch("/v1/forms")
      if (!res.ok) {
        console.warn("[serviceForms] /v1/forms failed:", res.status)
        return _cache
      }
      const data = await res.json()
      _cache = (data?.forms ?? {}) as FormsData
      notify()
      return _cache
    } catch (e) {
      console.warn("[serviceForms] fetch error:", e)
      return _cache
    } finally {
      _inflight = null
    }
  })()
  return _inflight
}

export function getCachedForms(): FormsData {
  return _cache
}

export function subscribeForms(fn: () => void): () => void {
  _listeners.add(fn)
  return () => { _listeners.delete(fn) }
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
export function formForSidebarKey(sidebarKey: string, forms: FormsData = _cache): string | undefined {
  for (const [formTag, entry] of Object.entries(forms)) {
    if (entry.sidebar_key === sidebarKey) return formTag
  }
  return undefined
}

/**
 * Check whether the given sidebar_key belongs to the given form-tag.
 * Internal — the convenience predicates below are the public API.
 */
function isForm(sidebarKey: string, formTag: string, forms: FormsData = _cache): boolean {
  return forms[formTag]?.sidebar_key === sidebarKey
}

/** True if the sidebar_key belongs to ANY of the given form-tags. */
function isInAnyForm(sidebarKey: string, formTags: string[], forms: FormsData = _cache): boolean {
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
export function isAudioForm(sidebarKey: string, forms: FormsData = _cache): boolean {
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
    items.sort(
      (a, b) =>
        ((a as SidebarItem & { order?: number }).order ?? Infinity) -
          ((b as SidebarItem & { order?: number }).order ?? Infinity) ||
        a.label.localeCompare(b.label),
    )
  }
  return out
}
