export declare const TagColor: {
    readonly brand: "brand";
    readonly sky: "sky";
    readonly violet: "violet";
    readonly rose: "rose";
    readonly emerald: "emerald";
    readonly amber: "amber";
    readonly cyan: "cyan";
};
export type TagColor = (typeof TagColor)[keyof typeof TagColor];
export declare const TAG_COLOR_VALUES: readonly TagColor[];
/** Is the value a valid TagColor? Gates untrusted JSON (localStorage,
 *  a future server payload) before it enters the store. */
export declare function isTagColor(v: unknown): v is TagColor;
export interface TagColorMeta {
    /** Solid dot class for compact tile overlays (h-2 w-2 circle). */
    dot: string;
    /** Pill classes: border + bg + text for the inline badge. */
    pill: string;
}
export declare const TAG_COLOR_META: Record<TagColor, TagColorMeta>;
export interface TagDef {
    /** Stable slug — used as the dict key + the tag_map entry. */
    id: string;
    /** Display name. */
    name: string;
    /** From the closed TagColor enum. */
    color: TagColor;
}
/**
 * Hydrate the store from the server (canonical) + enable server pushes.
 * Called once by the app shell on mount. The store already has the
 * localStorage cache (loaded synchronously at module init), so the UI renders
 * immediately; this replaces it with the server copy if one exists (the server
 * wins ties — it's the cross-device source of truth). After this call,
 * mutations push to the server via the debounced PUT.
 *
 * Silent on failure: if the server is unreachable, the store keeps the
 * localStorage cache and server pushes stay disabled (offline mode).
 */
export declare function initTagSync(): Promise<void>;
export interface TagMapState {
    /** The registry: tagId → TagDef. */
    tags: Record<string, TagDef>;
    /** The forward index (the "tag_map"): entityKey → tagId[]. */
    map: Record<string, string[]>;
    /** Create a tag. Returns the new tag's id. Color auto-cycles if omitted. */
    createTag: (name: string, color?: TagColor) => string;
    renameTag: (id: string, name: string) => void;
    recolorTag: (id: string, color: TagColor) => void;
    /** Delete a tag from the registry AND every item's tag list. */
    deleteTag: (id: string) => void;
    /** Replace all tags on an item. */
    setItemTags: (key: string, tagIds: string[]) => void;
    addTagToItem: (key: string, tagId: string) => void;
    removeTagFromItem: (key: string, tagId: string) => void;
    /** O(1) forward lookup — which tags are on this item? */
    tagsOf: (key: string) => string[];
    /** Does this item have this tag? (the hot path for filtering) */
    hasTag: (key: string, tagId: string) => boolean;
}
export declare const useTagMap: import("./clientStore.js").BoundStore<TagMapState>;
/** Read tagsOf without a React subscription. The useListFilter accessor uses
 *  this so the filter flow doesn't need to re-subscribe on every item. */
export declare function tagsOf(key: string): string[];
//# sourceMappingURL=tagMap.d.ts.map
