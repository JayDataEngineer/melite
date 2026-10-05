export interface MediaKindDef {
    readonly label: string;
    readonly exts: readonly string[];
    readonly gallery: readonly string[];
}
export interface MediaKinds {
    readonly kinds: Readonly<Record<'video' | 'image' | 'audio' | 'model', MediaKindDef>>;
    readonly policy: {
        readonly maxListedImages: number;
    };
}
/** The client classifier's vocabulary (DERIVED — see header). */
export declare const MEDIA_KINDS: MediaKinds;
//# sourceMappingURL=media-kinds.d.ts.map
