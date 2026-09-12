/**
 * Card glyphs — the ONE hand-authored inline-SVG set (founded
 * 2026-09-12, debt extermination: the five studio-local copies —
 * anny/ideo/mask icons, motion glyphs, h3 icons — collapsed here).
 * DSH-pure stroke (law 5): 24×24 viewBox, stroke="currentColor",
 * strokeWidth 2, fill none, round caps/joins. Sizing rides the
 * caller's className (width/height default to 24, overridden by CSS).
 *
 * Same-name drawings unified on the lucide-faithful paths (X,
 * Upload, Link2, Plus, AlertTriangle verified path-identical across
 * all copies; the line/polyline element variants render the same and
 * fold to the path form). Genuinely different drawings keep distinct
 * names (Trash2Alt, EyeAlt, PlayAlt, SunSparkle, WandSparkles) so no
 * card's look changes; ideo's unused Square is dropped, mask's
 * lucide Square survives. TriangleAlert aliases AlertTriangle.
 *
 * Per-seam subpath: `@melite/card-base/icons`.
 */
import type { CSSProperties, SVGProps } from "react"

export interface IconProps extends SVGProps<SVGSVGElement> {
  className?: string
  style?: CSSProperties
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

export function X({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Svg>
  )
}

export function ChevronDown({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  )
}

export function ChevronUp({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="m18 15-6-6-6 6" />
    </Svg>
  )
}

export function ChevronLeft({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="m15 18-6-6 6-6" />
    </Svg>
  )
}

export function ChevronRight({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="m9 18 6-6-6-6" />
    </Svg>
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

export function User({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Svg>
  )
}

export function Link2({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M9 17H7A5 5 0 0 1 7 7h2" />
      <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
      <path d="M8 12h8" />
    </Svg>
  )
}

export function Plus({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  )
}

export function Check({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M20 6 9 17l-5-5" />
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

export function Loader2({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </Svg>
  )
}

export function AlertTriangle({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Svg>
  )
}

/** h3's name for the alert triangle — same drawing. */
export function TriangleAlert({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Svg>
  )
}

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

export function Copy({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  )
}

export function Grid3x3({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </Svg>
  )
}

export function Magnet({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15" />
      <path d="m5 8 4 4" />
      <path d="m12 15 4 4" />
    </Svg>
  )
}

export function Maximize2({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M15 3h6v6" />
      <path d="m21 3-7 7" />
      <path d="m3 21 7-7" />
      <path d="M9 21H3v-6" />
    </Svg>
  )
}

export function Wand2({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
      <path d="m14 7 3 3" />
      <path d="M5 6v4" />
      <path d="M19 14v4" />
      <path d="M3 8h4" />
      <path d="M17 16h4" />
    </Svg>
  )
}

export function Code2({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
    </Svg>
  )
}

export function RectangleHorizontal({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
    </Svg>
  )
}

export function RectangleVertical({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <rect x="6" y="2" width="12" height="20" rx="2" />
    </Svg>
  )
}

export function ClipboardCopy({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
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

export function Eraser({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </Svg>
  )
}

export function ScanFace({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
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

export function BoxSelect({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M5 3H3v2" />
      <path d="M9 3H7" />
      <path d="M17 3h-2" />
      <path d="M21 3h-2v2" />
      <path d="M21 9v2" />
      <path d="M21 15v2" />
      <path d="M21 21h-2v-2" />
      <path d="M15 21h-2" />
      <path d="M9 21H7" />
      <path d="M3 21v-2" />
      <path d="M3 15v-2" />
      <path d="M3 9V7" />
      <path d="M9 3h2" />
    </Svg>
  )
}

export function Hourglass({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
      <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </Svg>
  )
}

export function ImageUp({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
      <path d="m14 17 2-2 2 2" />
      <path d="M16 15v4" />
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

export function Info({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </Svg>
  )
}

export function Pause({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <rect x="14" y="4" width="4" height="16" rx="1" />
      <rect x="6" y="4" width="4" height="16" rx="1" />
    </Svg>
  )
}

export function Download({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
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

export function RefreshCw({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
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

/* ── lucide-faithful keepers (one drawing, one name) ──────────── */

export function Square({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
    </Svg>
  )
}

/** Ideo's inset-square variant (16×16 at 4,4 — the aspect presets). */
export function SquareSmall({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </Svg>
  )
}

export function Trash2({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
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

export function Play({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="m6 3 14 9-14 9V3z" />
    </Svg>
  )
}

export function Sparkles({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M12 3l1.9 5.8 5.8 1.9-5.8 1.9L12 18.4l-1.9-5.8L4.3 10.7l5.8-1.9L12 3z" />
      <path d="M19 3l.7 2.1 2.1.7-2.1.7L19 8.6l-.7-2.1-2.1-.7 2.1-.7L19 3z" />
    </Svg>
  )
}

/* ── variant drawings (distinct looks, distinct names) ────────── */

/** Mask's trash lid variant (straight handle bar). */
export function Trash2Alt({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
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

/** Ideo's sun-rays sparkle variant. */
export function SunSparkle({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M12 3v3m0 12v3M5.6 5.6l2.2 2.2m8.4 8.4 2.2 2.2M3 12h3m12 0h3M5.6 18.4l2.2-2.2m8.4-8.4 2.2-2.2" />
      <path d="M12 8.5 13.7 12l3.8 1.5-3.8 1.5L12 18.5 10.3 15l-3.8-1.5L10.3 12 12 8.5Z" />
    </Svg>
  )
}

/** Mask's wand sparkle variant. */
export function WandSparkles({ className, style, ...rest }: IconProps) {
  return (
    <Svg className={className} style={style} {...rest}>
      <path d="M9.94 15.5a2 2 0 0 0-1.44-1.44L2 12l6.5-2.06a2 2 0 0 0 1.44-1.44L12 2l2.06 6.5a2 2 0 0 0 1.44 1.44L22 12l-6.5 2.06a2 2 0 0 0-1.44 1.44L12 22l-2.06-6.5z" />
      <path d="M19 3v4" />
      <path d="M21 5h-4" />
    </Svg>
  )
}
