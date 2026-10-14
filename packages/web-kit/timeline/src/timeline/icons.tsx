/**
 * timeline/icons — the timeline-only glyphs plus re-exports of the
 * glyphs @melite/card-base already carries (Film, Image, Upload:
 * same 24x24 stroke vocabulary; the manifest has always declared
 * that dep — the old "no icon dep" header was false). card-base
 * lacks the six music/zoom glyphs, so they stay here, hand-authored
 * on the same lucide path data (v1.39.0, ISC); sizing rides the
 * caller's className. X died with the S5 double-agent purge — close
 * seats import the catalog's IconCloseOutlineRegular directly.
 */
import type { SVGProps } from "react"
export { Film, Image, Upload } from "@melite/card-base/client"

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
