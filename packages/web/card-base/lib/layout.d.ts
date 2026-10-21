/**
 * THE ESTATE'S LAYOUT GRAMMAR (2026-09-18, promoted from h3's studio
 * kit — the operator's question: "no other card will need ControlRow,
 * SectionLabel, PaneHeader in the future ever?"). Rows, section
 * headings, pane chrome, empty states, tooltip anchors: the grammar
 * EVERY card speaks. One definition in the shared base; cards compose
 * them — composition is the card's own geometry, these pieces are the
 * estate's. Moved VERBATIM (JSX + CSS) from the h3 kit; the kit
 * re-exports as a bridge so existing import sites keep one door.
 */
import type { ComponentProps, ReactElement, ReactNode } from 'react';
/** The bubble's side relative to the anchor — the DSH Tooltip's own
 *  three placements. */
export type TipSide = 'top' | 'bottom' | 'right';
/** The estate's tooltip anchor: the DSH Tooltip atom over a REAL
 *  layout box (a display:contents or fragment child measures a zero
 *  rect and pins the bubble to the viewport corner).
 * @param props.tip - bubble text; absent renders the child bare.
 * @param props.side - bubble placement, default 'top'.
 * @param props.delayDuration - hover delay in ms, default 300.
 * @param props.fill - the anchor fills its parent (display:block) instead
 *  of hugging the child (E2-10 THE SHRINK: the timeline ruler's hug-face
 *  anchor shrink-wrapped the width-auto band to its 62px chip — a 1064px
 *  face with a 62px hit seat. Fill is opt-in, for band seats only).
 * @param props.children - the single anchor element. */
export declare function Tip({ tip, side, delayDuration, fill, children }: {
    tip?: string;
    side?: TipSide;
    delayDuration?: number;
    fill?: boolean;
    children: ReactElement;
}): ReactElement;
export type ControlDensity = 'md' | 'sm';
export declare function ControlRow({ label, hint, children, density, className, }: {
    label: ReactNode;
    hint?: ReactNode;
    children: ReactNode;
    density?: ControlDensity;
    className?: string;
}): ReactElement;
export declare function SectionLabel({ children, tail, className, }: {
    children: ReactNode;
    tail?: ReactNode;
    className?: string;
}): ReactElement;
/** The empty face every pane speaks (the DSH empty-state shape: a
 *  glyph over the copy — reference WorkspaceBrowser.tsx:266-280
 *  EmptySessions). `variant: 'bare'` seats a caller-styled face (the
 *  seat's own module css owns the geometry); `rest` forwards element
 *  attrs (data-testid hooks ride through).
 * @param props.icon - the face's glyph, rendered before the title.
 * @param props.title - the empty face's copy.
 * @param props.hint - optional second line.
 * @param props.variant - 'pane' (the estate pane block), 'overlay'
 *   (absolute, for viewport seats), or 'bare' (caller css only).
 * @param props.className - merged after the variant class.
 * @param props.rest - div attrs forwarded (data-* / aria-*). */
export declare function EmptyState({ icon, title, hint, variant, className, ...rest }: Omit<ComponentProps<'div'>, 'title'> & {
    icon?: ReactNode;
    title: ReactNode;
    hint?: ReactNode;
    variant?: 'overlay' | 'pane' | 'bare';
    className?: string;
}): ReactElement;
/** Skeleton — the quiet loading block (promoted 2026-09-18 from
 *  motion's kit, where it was the estate's only copy): a bare div
 *  with the estate pulse. EmptyState is the pane's empty face;
 *  Skeleton is its loading face. */
export declare function Skeleton({ className, ...props }: ComponentProps<'div'>): ReactElement;
export type PaneHeaderVariant = 'strip' | 'preview';
export declare function PaneHeader({ title, meta, hint, lead, variant, className, }: {
    title?: ReactNode;
    meta?: ReactNode;
    hint?: ReactNode;
    lead?: ReactNode;
    variant?: PaneHeaderVariant;
    className?: string;
}): ReactElement;
export declare function PaneShell({ children, className }: {
    children: ReactNode;
    className?: string;
}): ReactElement;
//# sourceMappingURL=layout.d.ts.map
