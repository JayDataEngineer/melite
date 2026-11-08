/** One select option's wire row (the BOTH-shapes law: plain string
 *  labels or {value,label} rows — the atom normalizes). */
export type ExtraOptionRow = string | {
    value: string;
    label: string;
};
/** THE VOCABULARY — every extra-bag key that exists, exactly one
 *  spelling each. A key absent from this list is not part of the
 *  contract; adding one is a deliberate act recorded here with its
 *  type and owners below. */
export declare const EXTRA_KEYS: readonly ["order", "group", "zone", "wtype", "width", "columns", "visible_when", "required_when", "tooltip", "required", "hidden", "families", "max_stack", "media", "placeholder", "options", "optionsFrom", "serveDefault", "default"];
export type ExtraKey = (typeof EXTRA_KEYS)[number];
/** The set form for O(1) membership (the harvest pin's judge). */
export declare const EXTRA_KEY_SET: ReadonlySet<string>;
/** THE PRESENTATION VOCABULARY — every wtype and the seat that
 * renders it:
 *  - atom-routed (the form's atom router switches on them):
 *    number, select, slider, text, textarea, boolean, image,
 *    file, mesh (image/file/mesh route via the square provider)
 *  - rail (the input signature's stack): image_list
 *  - mod-face (rendered by the mod leaf / mod canvas, not atoms):
 *    mask (the region-mask canvas), loras, ip_adapters,
 *    controlnets (the picker bricks)
 */
export declare const WTYPE_SET: readonly ["number", "select", "slider", "text", "textarea", "boolean", "image", "file", "mesh", "image_list", "mask", "loras", "ip_adapters", "controlnets"];
export type Wtype = (typeof WTYPE_SET)[number];
export declare const WTYPE_SEATS: Record<Wtype, 'atom' | 'rail' | 'mod-face'>;
/** THE STACK MEDIA HINT SET (typed pickers on the input rail). mod =
 *  an engine-side .safetensors reference pack (RefMod-style): the
 *  stack renders the file face with a safetensors accept filter,
 *  and compose stems the picked path (the loader resolves stems
 *  against its own models dir). */
export declare const MEDIA_SET: readonly ["video", "audio", "mod"];
export type Media = (typeof MEDIA_SET)[number];
/** THE RAIL/ZONE SEATS (estate-pinned closed since LAW 6). */
export declare const ZONE_SET: readonly ["inputs", "params", "mods"];
export type Zone = (typeof ZONE_SET)[number];
/** THE SCHEMAMASTERY ROLE SET (meta.role — the only roles any
 *  face reads today; params-emit's format path arm). */
export declare const ROLE_SET: readonly ["path"];
/** THE BAG'S SHAPE — the typed write door. Object literals checked
 *  against this refuse unknown keys at compile time (ts2353); the
 *  `bag()` helper re-validates at runtime for spread arms a
 *  literal check cannot see.
 *
 *  OWNERS (the faces that read each key — one spelling each):
 *   - order         form (row order in group; null = undeclared)
 *   - group         form (the group tab the field seats in)
 *   - zone          form (inputs vs params rail split)
 *   - wtype         form (declared presentation: image, image_list,
 *                  textarea, number, select, mesh, …)
 *   - width         form (column span within the group grid)
 *   - columns       form (the group's grid columns, first-seen wins)
 *   - visible_when  form + tool (the "key=value&key2=a|b" grammar;
 *                  fieldVisible interprets; the tool face emits it
 *                  as x-visible-when)
 *   - required_when form (same grammar as visible_when; the required
 *                  star paints only when the guards hold)
 *   - tooltip       form
 *   - required      form + tool (emit-only; compose enforces)
 *   - hidden        form (never renders — the one-list aliases)
 *   - families      form (family scoping: absent family skips) + tool
 *   - max_stack     form (the progressive stack's cap)
 *   - media         form (media-typed hint)
 *   - placeholder   form
 *   - options       form (closed vocabulary; the serve STAMPS this
 *                  key from optionsFrom — same spelling both ways)
 *   - optionsFrom   serve (names the mod pack whose live rows stamp
 *                  options; never rides a served envelope)
 *   - serveDefault  tool (an empty-array default serves only with it)
 *   - default       NO READER TODAY (anny's dynamic spreads write
 *                  it; nothing reads extra.default — the harvest
 *                  report names it; retire or adopt deliberately)
 */
export interface ExtraBag {
    order?: number | null;
    group?: string;
    zone?: Zone;
    /** THE DECLARED HINT (WTYPE_SET's union). The empty string is the
     *  explicit no-hint spelling: extraOf tolerates it as absent (the
     *  engine wall fixture knob({wtype:''}) pins it), every foreign
     *  spelling refuses. */
    wtype?: Wtype | '';
    width?: number;
    columns?: number;
    visible_when?: string;
    /** THE DECLARED CONDITIONAL-REQUIRED (the same grammar as
     *  visible_when: "key=value&…" guards, `!=` negation, `|`-sets).
     *  The star paints exactly when the guards hold — a field the
     *  compose demands only in some states declares WHICH states
     *  (the mask card's sam3 prompt: required unless via_rtdetr). */
    required_when?: string;
    tooltip?: string;
    required?: boolean;
    hidden?: boolean;
    families?: string[];
    max_stack?: number;
    media?: Media;
    placeholder?: string;
    options?: ExtraOptionRow[];
    optionsFrom?: string;
    serveDefault?: boolean;
    /** Number floors as hint-only overrides (params-emit consults them
     *  AFTER validating meta — the knob's own min/max wins). */
    min?: number;
    max?: number;
    default?: unknown;
}
/** THE TYPED WRITE — declarations pass their literal through this
 *  so an unknown key or malformed value fails EVERY wall: tsc at
 *  the literal, this throw at runtime (spread arms), the boot
 *  validator on any served envelope, and the estate law suite on
 *  the wire. Never a silently dead write. */
export declare function bag(b: ExtraBag): ExtraBag;
/** THE TYPED READ — one getter for every face. `extraOf(node)`
 *  narrows a serialized ref node's meta.extra to the bag type;
 *  faces read keys off the result, never off a bare record. */
export declare function extraOf(node: {
    meta?: Record<string, unknown>;
} | null | undefined): Partial<ExtraBag>;
//# sourceMappingURL=extraKeys.d.ts.map
