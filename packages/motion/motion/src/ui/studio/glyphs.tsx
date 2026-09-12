/**
 * Motion studio glyphs — hand-authored inline SVGs replacing the
 * old lucide-react imports (DSH-pure stroke, law 5). Same export
 * names as the icon components they replace, so call sites only
 * change the import line.
 *
 * Every glyph: 24×24 viewBox, stroke="currentColor", strokeWidth 2,
 * fill none, round caps/joins. Sizing rides the caller's className
 * (studio CSS-module classes now).
 */
import type { CSSProperties } from "react"

export interface IconProps {
  className?: string
  style?: CSSProperties
}

function Svg({
  className,
  style,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
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
    >
      {children}
    </svg>
  )
}

export function AlertTriangle({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Svg>
  )
}

export function Info({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </Svg>
  )
}

export function Pause({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <rect x="14" y="4" width="4" height="16" rx="1" />
      <rect x="6" y="4" width="4" height="16" rx="1" />
    </Svg>
  )
}

export function Play({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M6 4l14 8-14 8V4z" />
    </Svg>
  )
}

export function Download({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </Svg>
  )
}

export function Eye({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

export function EyeOff({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61" />
      <path d="m2 2 20 20" />
    </Svg>
  )
}

export function RefreshCw({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </Svg>
  )
}

export function Move({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="m5 9-3 3 3 3" />
      <path d="m9 5 3-3 3 3" />
      <path d="m15 19-3 3-3-3" />
      <path d="m19 9 3 3-3 3" />
      <path d="M2 12h20" />
      <path d="M12 2v20" />
    </Svg>
  )
}

export function RotateCw({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </Svg>
  )
}

export function RotateCcw({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </Svg>
  )
}

export function Target({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </Svg>
  )
}

export function Plus({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  )
}

export function ImagePlus({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M16 5h6" />
      <path d="M19 2v6" />
      <path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      <circle cx="9" cy="9" r="2" />
    </Svg>
  )
}

export function X({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Svg>
  )
}

export function Upload({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </Svg>
  )
}

export function Link2({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M9 17H7A5 5 0 0 1 7 7h2" />
      <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
      <path d="M8 12h8" />
    </Svg>
  )
}

export function PersonStanding({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <circle cx="12" cy="5" r="1" />
      <path d="m9 20 3-6 3 6" />
      <path d="m6 8 6 2 6-2" />
      <path d="M12 10v4" />
    </Svg>
  )
}

export function User({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Svg>
  )
}

export function Camera({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </Svg>
  )
}

export function FileBox({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </Svg>
  )
}

export function Box({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M21 8.5v7a2 2 0 0 1-1 1.73l-6 3.5a2 2 0 0 1-2 0l-6-3.5A2 2 0 0 1 5 15.5v-7a2 2 0 0 1 1-1.73l6-3.5a2 2 0 0 1 2 0l6 3.5a2 2 0 0 1 1 1.73Z" />
      <path d="m5.3 7.3 6.7 3.9 6.7-3.9" />
      <path d="M12 22V11" />
    </Svg>
  )
}

export function Palette({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <circle cx="13.5" cy="6.5" r="1" />
      <circle cx="17.5" cy="10.5" r="1" />
      <circle cx="8.5" cy="7.5" r="1" />
      <circle cx="6.5" cy="12.5" r="1" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.26-.29-.43-.68-.43-1.12A1.68 1.68 0 0 1 14.46 16h2.08A5.46 5.46 0 0 0 22 10.5C21.94 5.75 17.5 2 12 2Z" />
    </Svg>
  )
}

export function Check({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  )
}

export function Layers({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="m12 2 9 4.9-9 4.9-9-4.9L12 2Z" />
      <path d="m3 11.9 9 4.9 9-4.9" />
      <path d="m3 16.9 9 4.9 9-4.9" />
    </Svg>
  )
}

export function Film({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
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

export function ChevronLeft({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="m15 18-6-6 6-6" />
    </Svg>
  )
}

export function ChevronRight({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="m9 18 6-6-6-6" />
    </Svg>
  )
}

export function Crop({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M18 22V8a2 2 0 0 0-2-2H2" />
    </Svg>
  )
}

export function Frame({ className, style }: IconProps) {
  return (
    <Svg className={className} style={style}>
      <path d="M22 6H2" />
      <path d="M22 18H2" />
      <path d="M6 2v20" />
      <path d="M18 2v20" />
    </Svg>
  )
}
