/**
 * timeline/icons — hand-authored inline-SVG glyphs replacing the old icon
 * package (DSH-pure UI law: no icon dep in this package).
 *
 * Same export names (Film, Image, ListMusic, Mic, Music, X, Zap, ZoomIn,
 * ZoomOut),
 * same 24x24 stroke vocabulary (stroke="currentColor", strokeWidth 2,
 * fill none, round caps/joins), same path data as the lucide icons they
 * replace (icon set v1.39.0, ISC). The `lucide lucide-<name>` classes are
 * preserved in the merged className so mounted DOM keeps its shape;
 * sizing still rides the caller's className (the old h/w utilities now
 * live as svg rules in timeline.module.css).
 */
import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement>

function base(name: string, className: string | undefined): IconProps {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    className: ["lucide", `lucide-${name}`, className].filter(Boolean).join(" "),
  }
}

export function Film({ className, ...rest }: IconProps) {
  return (
    <svg {...base("film", className)} {...rest}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 3v18" />
      <path d="M3 7.5h4" />
      <path d="M3 12h18" />
      <path d="M3 16.5h4" />
      <path d="M17 3v18" />
      <path d="M17 7.5h4" />
      <path d="M17 16.5h4" />
    </svg>
  )
}

export function Image({ className, ...rest }: IconProps) {
  return (
    <svg {...base("image", className)} {...rest}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  )
}

export function ListMusic({ className, ...rest }: IconProps) {
  return (
    <svg {...base("list-music", className)} {...rest}>
      <path d="M16 5H3" />
      <path d="M11 12H3" />
      <path d="M11 19H3" />
      <path d="M21 16V5" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

export function Music({ className, ...rest }: IconProps) {
  return (
    <svg {...base("music", className)} {...rest}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

/** (2026-09-22, the lane-picker law) the gutter's add-door glyph —
 *  same stroke vocabulary, lucide upload path data. */
export function Upload({ className, ...rest }: IconProps) {
  return (
    <svg {...base("upload", className)} {...rest}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  )
}

export function X({ className, ...rest }: IconProps) {
  return (
    <svg {...base("x", className)} {...rest}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

export function ZoomIn({ className, ...rest }: IconProps) {
  return (
    <svg {...base("zoom-in", className)} {...rest}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
      <line x1="11" x2="11" y1="8" y2="14" />
      <line x1="8" x2="14" y1="11" y2="11" />
    </svg>
  )
}

export function Mic({ className, ...rest }: IconProps) {
  return (
    <svg {...base("mic", className)} {...rest}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  )
}

export function Zap({ className, ...rest }: IconProps) {
  return (
    <svg {...base("zap", className)} {...rest}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

export function ZoomOut({ className, ...rest }: IconProps) {
  return (
    <svg {...base("zoom-out", className)} {...rest}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
      <line x1="8" x2="14" y1="11" y2="11" />
    </svg>
  )
}
