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
import type { CSSProperties, SVGProps } from "react"
export interface IconProps extends SVGProps<SVGSVGElement> {
  className?: string
  style?: CSSProperties
  /** data-testid rides the svg through ...rest (SVGProps' type map
   * carries no data-* index — the history-thumb glyph face passes
   * it; added 2026-10-08 when the preview face's usage outtyped
   * the interface). */
  "data-testid"?: string
}

function Svg({ className, style, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </svg>
  )
}

export function Upload({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5" />
      <path d="M12 3v12" />
    </Svg>
  )
}

export function PersonStanding({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <circle cx="12" cy="5" r="1" />
      <path d="m9 20 3-6 3 6" />
      <path d="m6 8 6 2 6-2" />
      <path d="M12 10v4" />
    </Svg>
  )
}

export function Box({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M21 8.5v7a2 2 0 0 1-1 1.73l-6 3.5a2 2 0 0 1-2 0l-6-3.5A2 2 0 0 1 5 15.5v-7a2 2 0 0 1 1-1.73l6-3.5a2 2 0 0 1 2 0l6 3.5a2 2 0 0 1 1 1.73Z" />
      <path d="m5.3 7.3 6.7 3.9 6.7-3.9" />
      <path d="M12 22V11" />
    </Svg>
  )
}

export function Layers({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="m12 2 9 4.9-9 4.9-9-4.9L12 2Z" />
      <path d="m3 11.9 9 4.9 9-4.9" />
      <path d="m3 16.9 9 4.9 9-4.9" />
    </Svg>
  )
}

export function Palette({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <circle cx="13.5" cy="6.5" r="1" />
      <circle cx="17.5" cy="10.5" r="1" />
      <circle cx="8.5" cy="7.5" r="1" />
      <circle cx="6.5" cy="12.5" r="1" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.26-.29-.43-.68-.43-1.12A1.68 1.68 0 0 1 14.46 16h2.08A5.46 5.46 0 0 0 22 10.5C21.94 5.75 17.5 2 12 2Z" />
    </Svg>
  )
}

export function Move({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="m5 9-3 3 3 3" />
      <path d="m9 5 3-3 3 3" />
      <path d="m15 19-3 3-3-3" />
      <path d="m19 9 3 3-3 3" />
      <path d="M2 12h20" />
      <path d="M12 2v20" />
    </Svg>
  )
}

/** The circular-arrow glyph, spinning by construction (the Loader2
 *  contract: callers size and tint it, never animate it). */
export function Clapperboard({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" />
      <path d="m6.2 5.3 3.1 3.9" />
      <path d="m12.4 3.4 3.1 4" />
      <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </Svg>
  )
}

export function Type({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M4 7V5h16v2" />
      <path d="M12 5v14" />
      <path d="M9 19h6" />
    </Svg>
  )
}

export function Image({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5a1.5 1.5 0 0 0-2 0L6 21" />
    </Svg>
  )
}

export function Brush({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
      <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
    </Svg>
  )
}

export function Focus({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

export function Expand({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="m15 15 6 6" />
      <path d="m21 15v6h-6" />
      <path d="m9 9-6-6" />
      <path d="m3 9V3h6" />
    </Svg>
  )
}

export function Hand({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
      <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </Svg>
  )
}

export function EyeOff({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61" />
      <path d="m2 2 20 20" />
    </Svg>
  )
}

export function RotateCw({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </Svg>
  )
}

export function RotateCcw({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </Svg>
  )
}

export function Target({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </Svg>
  )
}

export function ImagePlus({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M16 5h6" />
      <path d="M19 2v6" />
      <path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      <circle cx="9" cy="9" r="2" />
    </Svg>
  )
}

export function Camera({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </Svg>
  )
}

export function FileBox({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </Svg>
  )
}

/** Lucide-faithful `audio-lines` (new 2026-10-08 — the history kind
 * face's audio glyph; no prior card copy existed to unify). */
export function AudioLines({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M2 10v3" />
      <path d="M6 6v11" />
      <path d="M10 3v18" />
      <path d="M14 8v7" />
      <path d="M18 5v13" />
      <path d="M22 10v3" />
    </Svg>
  )
}

export function Film({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 3v18" />
      <path d="M3 7.5h4" />
      <path d="M3 12h18" />
      <path d="M3 16.5h4" />
      <path d="M17 3v18" />
      <path d="M17 7.5h4" />
      <path d="M17 16.5h4" />
    </Svg>
  )
}

export function Crop({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M18 22V8a2 2 0 0 0-2-2H2" />
    </Svg>
  )
}

export function Frame({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M22 6H2" />
      <path d="M22 18H2" />
      <path d="M6 2v20" />
      <path d="M18 2v20" />
    </Svg>
  )
}

export function Volume2({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </Svg>
  )
}

export function VolumeX({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="22" x2="16" y1="9" y2="15" />
      <line x1="16" x2="22" y1="9" y2="15" />
    </Svg>
  )
}

export function Maximize({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </Svg>
  )
}

export function Minimize2({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M4 14h6v6" />
      <path d="M20 10h-6V4" />
      <path d="m14 10 7-7" />
      <path d="m3 21 7-7" />
    </Svg>
  )
}

export function Dices({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <rect width="12" height="12" x="2" y="10" rx="2" ry="2" />
      <path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6" />
      <path d="M6 18h.01" />
      <path d="M10 14h.01" />
      <path d="M15 6h.01" />
      <path d="M18 9h.01" />
    </Svg>
  )
}

/* ── lucide-faithful keepers (one drawing, one name) ──────────── */

export function Square({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
    </Svg>
  )
}

export function Eye({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

/** Motion's simplified eye variant. */
export function EyeAlt({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

/** Motion's sharp-corner play variant. */
export function PlayAlt({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M6 4l14 8-14 8V4z" />
    </Svg>
  )
}
