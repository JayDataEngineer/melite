/** studio.tsx — THE DECLARATIVE STUDIO (primitive ④, 2026-09-21):
 *  the stage view owns ORGANIZATION over the SAME form-spec SSOT —
 *  and organization is now DATA, not a client half. A card declares
 *  its group partition (expose/fold + titles) and its preview kind;
 *  the base renders everything else: spec fetch, value seeding +
 *  resolved layering, the square provider, the patch-first run law,
 *  the bindRun ref dispatch, run polling, the envelope lift,
 *  error/loading faces, StudioShell composition.
 *
 *  A studio client half survives ONLY as a declaration + seam
 *  registration (img-to-mesh is the first: ~30 lines, zero react
 *  machinery, zero three, zero css). A TRUE takeover — content no
 *  renderer can declare (motion's timeline, h3's call-card strip) —
 *  rides beside this renderer as an extra pane, never a fork. */
import { createElement as h } from 'react';
import type { StageViewOwnerProps } from '@melite/contracts';
/** The studio surface declaration — the card's ~5 lines. `expose`
 *  names the groups that sit open on the rail; `folds` names the
 *  groups folded behind disclosure rows (key = group, value = the
 *  row title + its semantic glyph); `preview` names the shared
 *  stage kind (`mesh` = the ONE GlbStagePreview — never a
 *  card-owned viewport). */
export interface StudioDeclaration {
    /** The served form-spec id (the useFormSpec key). */
    model: string;
    /** Groups rendered open, in order. */
    expose: readonly string[];
    /** Folded groups + their disclosure rows. */
    folds: Readonly<Record<string, FoldRow>>;
    /** The shared preview kind. */
    preview: 'mesh';
}
/** The fold-glyph palette — the DSH-native fold icon law: the
 *  CALLER supplies the row's OWN semantic glyph (reference
 *  ToolRow.tsx:37 `icon: ReactNode`; details-row.tsx:29-39 maps
 *  every tool to its own glyph), NEVER a blanket fold icon.
 *  Catalog-first: branch = pipeline passes, sliders = knobs
 *  (details-row.tsx:37 maps workflow→Branch the same way); the
 *  residue members (box, layers) name media concepts the catalog
 *  lacks — argued per the icons.tsx residue law. Archive glyphs
 *  are absent BY LAW (reference F9: IconArchive… names the
 *  archive domain, never a fold). */
declare const FOLD_GLYPHS: {
    readonly branch: import("react").FunctionComponentElement<import("@deepseek-ai/dsh-client-ui-primitives").IconProps>;
    readonly sliders: import("react").FunctionComponentElement<import("@deepseek-ai/dsh-client-ui-primitives").IconProps>;
    readonly box: import("react").FunctionComponentElement<import("./icons.js").IconProps>;
    readonly layers: import("react").FunctionComponentElement<import("./icons.js").IconProps>;
};
/** A fold's glyph id — the palette's keys, typed at the call site. */
export type FoldGlyph = keyof typeof FOLD_GLYPHS;
/** One disclosure row: the title copy + the row's own glyph. */
export interface FoldRow {
    title: string;
    icon: FoldGlyph;
}
/** The construction door: one obvious way to build a declaration,
 *  typed at the call site. Runtime-frozen. */
export declare function defineStudioDeclaration(declaration: StudioDeclaration): Readonly<StudioDeclaration>;
/** THE ONE data-driven studio renderer. Props are the seam's own
 *  currency (StageViewOwnerProps) plus the card's declaration. */
export declare function DeclarativeStudio(props: StageViewOwnerProps & {
    declaration: StudioDeclaration;
}): ReturnType<typeof h>;
export {};
//# sourceMappingURL=studio.d.ts.map