export interface FormEntry {
    /** sidebar_key — the MCP tool / surface name shown in the sidebar. */
    sidebar_key?: string;
    /** Human label for the sidebar entry. */
    label?: string;
    /** Genre grouping ("image", "audio", "video", ...). */
    genre?: Genre;
    /** Default backend service for the form. */
    default_service?: string;
    /** Form-tag description. */
    description?: string;
    /** §16 C-RAIL (rail-owned /v1/forms): explicit row order within the
     * genre group (absent on legacy payloads → sorts last, label order). */
    order?: number;
    /** Lucide icon name (the plugin rail's closed vocabulary; null/absent
     * → the genre header icon governs, as today). */
    icon?: string | null;
    /** The owning plugin id (rail-owned vocabulary provenance). */
    plugin?: string;
}
export type FormsData = Record<string, FormEntry>;
/** Genre keys used by the sidebar grouping. The literal union keeps the
 *  known genres type-safe (matches GENRE_ORDER in ServicesSidebar) while
 *  the `(string & {})` tail lets the backend add genres without a TS churn.
 *  Mirrors the values emitted by /v1/forms `genre` (the YAML `ui.genre`). */
export type Genre = "image" | "video" | "audio" | "motion" | "avatar" | "3d" | "creative" | "specialized" | "training" | "external" | (string & {});
/** A resolved sidebar row — form entries, MCP tools, /v1/services entries,
 *  studio links, and the external AI-Chat link all reduce to this shape
 *  before grouping by genre. One input shape for the SectionHeader+ListRow
 *  flow; ServicesSidebar is the canonical consumer. */
export interface SidebarItem {
    /** The onSelect payload — MCP tool name, service name, sidebar_key, or a
     *  `_studio` / `_llm_chat` sentinel. */
    name: string;
    /** Human label for the row. */
    label: string;
    /** Genre grouping (drives SectionHeader + ordering). */
    genre: Genre;
}
export declare function loadForms(opts?: {
    force?: boolean;
}): Promise<FormsData>;
export declare function getCachedForms(): FormsData;
export declare function subscribeForms(fn: () => void): () => void;
/**
 * Reverse-lookup: given a sidebar_key (the value the rest of the app calls
 * `selectedService`), return the form-tag it belongs to. This is THE
 * primitive that drives every render decision in GenerateFormBody.
 */
export declare function formForSidebarKey(sidebarKey: string, forms?: FormsData): string | undefined;
/**
 * Convenience predicates for the common form-tags. Each returns true when
 * the given sidebar_key belongs to that form-tag's surface.
 */
export declare const isTtsForm: (k: string) => boolean;
export declare const isVoiceForm: (k: string) => boolean;
export declare const isVoiceStudioForm: (k: string) => boolean;
export declare const isMusicForm: (k: string) => boolean;
export declare const isGenerateForm: (k: string) => boolean;
export declare const isEditForm: (k: string) => boolean;
/**
 * True if the sidebar_key belongs to any audio-genre form-tag.
 * (form_tts, form_voice, form_voice_studio, form_music, form_sound)
 */
export declare function isAudioForm(sidebarKey: string, forms?: FormsData): boolean;
/**
 * The ordered sidebar rows from a forms payload (§16 C-RAIL: /v1/forms is
 * rail-derived and carries `order`). Grouped by genre, sorted by
 * (order ?? Infinity, label) within the group — the entry's plugin-
 * declared order is the law; entries without one (legacy payloads) sort
 * last, label-alphabetical. Pure: the sidebar + tests share ONE item
 * builder, no drift between render and pin.
 */
export declare function formSidebarItems(forms: FormsData): Record<string, SidebarItem[]>;
//# sourceMappingURL=serviceForms.d.ts.map
