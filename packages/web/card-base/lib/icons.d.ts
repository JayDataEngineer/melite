/**
 * Card glyphs — the residue home for media concepts the DSH catalog
 * LACKS (founded 2026-09-12; the 2026-11-05 S5 purge deleted the 17
 * double-agents whose concepts the catalog ships — X, the chevrons,
 * User, Link2, Plus, Check, Loader2, AlertTriangle, TriangleAlert,
 * Copy, Info, Pause, Download, RefreshCw, Play — the catalog is the
 * only home for its own concepts; CONTRACTS §3.7). DSH-pure stroke (law 5):
 * 24×24 viewBox, stroke="currentColor", strokeWidth 2, fill none,
 * round caps/joins. Sizing rides the caller's className
 * (width/height default to 24, overridden by CSS).
 *
 * Same-name drawings unified on the lucide-faithful paths.
 * Genuinely different drawings keep distinct names (EyeAlt, PlayAlt)
 * so no card's look changes.
 *
 * Reached through the `/client` door (`@melite/card-base/client`).
 */
import type { CSSProperties, SVGProps } from "react";
export interface IconProps extends SVGProps<SVGSVGElement> {
    className?: string;
    style?: CSSProperties;
    /** data-testid rides the svg through ...rest (SVGProps' type map
     * carries no data-* index — the history-thumb glyph face passes
     * it; added 2026-10-08 when the preview face's usage outtyped
     * the interface). */
    "data-testid"?: string;
}
export declare function Upload({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function PersonStanding({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Box({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Layers({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Palette({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Move({ className, style, ...rest }: IconProps): import("react").JSX.Element;
/** The circular-arrow glyph, spinning by construction (the Loader2
 *  contract: callers size and tint it, never animate it). */
export declare function Clapperboard({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Type({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Image({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Brush({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Focus({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Expand({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Hand({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function EyeOff({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function RotateCw({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function RotateCcw({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Target({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function ImagePlus({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Camera({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function FileBox({ className, style, ...rest }: IconProps): import("react").JSX.Element;
/** Lucide-faithful `audio-lines` (new 2026-10-08 — the history kind
 * face's audio glyph; no prior card copy existed to unify). */
export declare function AudioLines({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Film({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Crop({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Frame({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Volume2({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function VolumeX({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Maximize({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Minimize2({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Dices({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Square({ className, style, ...rest }: IconProps): import("react").JSX.Element;
export declare function Eye({ className, style, ...rest }: IconProps): import("react").JSX.Element;
/** Motion's simplified eye variant. */
export declare function EyeAlt({ className, style, ...rest }: IconProps): import("react").JSX.Element;
/** Motion's sharp-corner play variant. */
export declare function PlayAlt({ className, style, ...rest }: IconProps): import("react").JSX.Element;
//# sourceMappingURL=icons.d.ts.map
