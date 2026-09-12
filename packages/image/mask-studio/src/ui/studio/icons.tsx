// icons — hand-authored inline-SVG glyphs replacing the old icon package.
//
// Same export names the package used from the old icon package (inventory via
// grep over src/). Lucide look: 24×24 viewBox, stroke="currentColor",
// strokeWidth 2, fill none, round caps/joins. Sizing rides the
// caller's className (mask.module.css size classes), exactly like the
// old icon package's className sizing pattern did.
import type { JSX } from "react"

export interface GlyphProps {
  className?: string
}

function Svg({ className, children }: GlyphProps & { children: React.ReactNode }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

export function Brush({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
      <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
    </Svg>
  )
}

export function Eraser({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </Svg>
  )
}

export function Eye({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

export function Link2({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M9 17H7A5 5 0 0 1 7 7h2" />
      <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
      <path d="M8 12h8" />
    </Svg>
  )
}

export function Move({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="m5 9-3 3 3 3" />
      <path d="m9 5 3-3 3 3" />
      <path d="m15 19-3 3-3-3" />
      <path d="m19 9 3 3-3 3" />
      <path d="M2 12h20" />
      <path d="M12 2v20" />
    </Svg>
  )
}

export function ScanFace({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
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

export function Square({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
    </Svg>
  )
}

export function Trash2({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </Svg>
  )
}

export function X({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Svg>
  )
}

export function BoxSelect({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
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

export function Expand({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="m15 15 6 6" />
      <path d="m21 15v6h-6" />
      <path d="m9 9-6-6" />
      <path d="m3 9V3h6" />
    </Svg>
  )
}

export function Focus({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

export function ChevronDown({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  )
}

export function Loader2({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </Svg>
  )
}

export function Play({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="m6 3 14 9-14 9V3z" />
    </Svg>
  )
}

export function Plus({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </Svg>
  )
}

export function Sparkles({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M9.94 15.5a2 2 0 0 0-1.44-1.44L2 12l6.5-2.06a2 2 0 0 0 1.44-1.44L12 2l2.06 6.5a2 2 0 0 0 1.44 1.44L22 12l-6.5 2.06a2 2 0 0 0-1.44 1.44L12 22l-2.06-6.5z" />
      <path d="M19 3v4" />
      <path d="M21 5h-4" />
    </Svg>
  )
}

export function ImageUp({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
      <path d="m14 17 2-2 2 2" />
      <path d="M16 15v4" />
    </Svg>
  )
}

export function Hourglass({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
      <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </Svg>
  )
}

export function Hand({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
      <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </Svg>
  )
}

export function PersonStanding({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <circle cx="12" cy="5" r="1" />
      <path d="m9 20 3-6 3 6" />
      <path d="m6 8 6 2 6-2" />
      <path d="M12 10v4" />
    </Svg>
  )
}

export function User({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Svg>
  )
}

export function AlertTriangle({ className }: GlyphProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Svg>
  )
}
