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
import { apiFetch } from "./api.js";
import { createClientStore } from "./clientStore.js";
// THE SANCTIONED SEAT (the hand-roll row 1.7): the forms cache is a
// module-level value with subscribers — `createClientStore` owns the
// record, the observation and the publication. The cache itself moves
// INTO the record (it was module state anyway); the exported accessors
// keep their names and their shapes.
const formsStore = createClientStore({ cache: {} });
let _inflight = null;
export async function loadForms(opts) {
    if (Object.keys(formsStore.getState().cache).length > 0 && !opts?.force)
        return formsStore.getState().cache;
    if (_inflight)
        return _inflight;
    _inflight = (async () => {
        try {
            const res = await apiFetch("/v1/forms");
            if (!res.ok) {
                console.warn("[serviceForms] /v1/forms failed:", res.status);
                return formsStore.getState().cache;
            }
            const data = await res.json();
            // A 200 IS NOT A FORMS DOC (audit R-E3, 2026-10-22): an error
            // body riding status 200 (a gateway's lie) must not wipe the
            // good cache — the !ok and catch legs warn and keep the stale
            // cache, and this leg speaks the same law: ingest ONLY a
            // record-shaped forms map, never the ?? {} fallback that
            // emptied the sidebar on the first force load.
            const forms = data?.forms;
            if (typeof forms !== "object" || forms === null || Array.isArray(forms)) {
                console.warn("[serviceForms] /v1/forms 200 with malformed body — keeping cache");
                return formsStore.getState().cache;
            }
            // The record IS the publication: a changed cache notifies the
            // store's subscribers, and an unchanged one notifies nobody — the
            // engine's own patch law, replacing the hand-rolled notify().
            formsStore.setState({ cache: forms });
            return formsStore.getState().cache;
        }
        catch (e) {
            console.warn("[serviceForms] fetch error:", e);
            return formsStore.getState().cache;
        }
        finally {
            _inflight = null;
        }
    })();
    return _inflight;
}
export function getCachedForms() {
    return formsStore.getState().cache;
}
export function subscribeForms(fn) {
    return formsStore.subscribe(() => { fn(); });
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
export function formForSidebarKey(sidebarKey, forms = formsStore.getState().cache) {
    for (const [formTag, entry] of Object.entries(forms)) {
        if (entry.sidebar_key === sidebarKey)
            return formTag;
    }
    return undefined;
}
/**
 * Check whether the given sidebar_key belongs to the given form-tag.
 * Internal — the convenience predicates below are the public API.
 */
function isForm(sidebarKey, formTag, forms = formsStore.getState().cache) {
    return forms[formTag]?.sidebar_key === sidebarKey;
}
/** True if the sidebar_key belongs to ANY of the given form-tags. */
function isInAnyForm(sidebarKey, formTags, forms = formsStore.getState().cache) {
    return formTags.some((t) => isForm(sidebarKey, t, forms));
}
/**
 * Convenience predicates for the common form-tags. Each returns true when
 * the given sidebar_key belongs to that form-tag's surface.
 */
export const isTtsForm = (k) => isForm(k, "form_tts");
export const isVoiceForm = (k) => isForm(k, "form_voice");
export const isVoiceStudioForm = (k) => isForm(k, "form_voice_studio");
export const isMusicForm = (k) => isForm(k, "form_music");
export const isGenerateForm = (k) => isForm(k, "form_generate");
export const isEditForm = (k) => isForm(k, "form_edit");
/**
 * True if the sidebar_key belongs to any audio-genre form-tag.
 * (form_tts, form_voice, form_voice_studio, form_music, form_sound)
 */
export function isAudioForm(sidebarKey, forms = formsStore.getState().cache) {
    return isInAnyForm(sidebarKey, ["form_tts", "form_voice", "form_voice_studio", "form_music", "form_sound"], forms);
}
/**
 * The ordered sidebar rows from a forms payload (§16 C-RAIL: /v1/forms is
 * rail-derived and carries `order`). Grouped by genre, sorted by
 * (order ?? Infinity, label) within the group — the entry's plugin-
 * declared order is the law; entries without one (legacy payloads) sort
 * last, label-alphabetical. Pure: the sidebar + tests share ONE item
 * builder, no drift between render and pin.
 */
export function formSidebarItems(forms) {
    const out = {};
    for (const d of Object.values(forms)) {
        const genre = d.genre;
        const key = d.sidebar_key;
        if (!genre || !key)
            continue;
        const order = typeof d.order === "number" ? d.order : Infinity;
        (out[genre] ??= []).push({ name: key, label: d.label || key, genre, order });
    }
    for (const items of Object.values(out)) {
        // ORDER PRESENCE (2026-09-12): every item pushed above carries a
        // numeric `order` (a missing declaration became Infinity at the push
        // site), so the comparator reads it directly — no `?? Infinity`
        // fallback. The fallback's right operand is unreachable through this
        // builder (the comparator only ever sees pushed items), and v8 counts
        // an unevaluated `??` operand as an uncovered branch.
        items.sort((a, b) => a.order -
            b.order ||
            a.label.localeCompare(b.label));
    }
    return out;
}
//# sourceMappingURL=serviceForms.js.map
