/**
 * h3-timeline studio icons — hand-authored inline-SVG glyphs (the
 * DSH-documented stand-in pattern for glyphs DSH doesn't ship).
 *
 * Same export names the studio used from the old icon package (X,
 * ChevronLeft, ChevronDown, Link2, Upload,
 * Clapperboard, TriangleAlert): 24px stroke icons,
 * stroke="currentColor", strokeWidth 2, fill none,
 * strokeLinecap/Join round — that look, hand-drawn as simple
 * SVGs (chevrons, X, plus, link arcs, upload arrow, clapperboard,
 * alert triangle). Sized by the caller's className (width/height
 * default to 24 and are overridden by CSS).
 */
import type { SVGProps } from "react"

function base({
  className,
  children,
  ...rest
}: SVGProps<SVGSVGElement>) {
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
      className={className}
      {...rest}
    >
      {children}
    </svg>
  )
}

export function X(props: SVGProps<SVGSVGElement>) {
  return base({
    ...props,
    children: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
  })
}

export function ChevronDown(props: SVGProps<SVGSVGElement>) {
  return base({
    ...props,
    children: <path d="m6 9 6 6 6-6" />,
  })
}

export function ChevronLeft(props: SVGProps<SVGSVGElement>) {
  return base({
    ...props,
    children: <path d="m15 18-6-6 6-6" />,
  })
}

export function Link2(props: SVGProps<SVGSVGElement>) {
  return base({
    ...props,
    children: (
      <>
        <path d="M9 17H7A5 5 0 0 1 7 7h2" />
        <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
        <line x1="8" x2="16" y1="12" y2="12" />
      </>
    ),
  })
}

export function Upload(props: SVGProps<SVGSVGElement>) {
  return base({
    ...props,
    children: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
      </>
    ),
  })
}

export function Clapperboard(props: SVGProps<SVGSVGElement>) {
  return base({
    ...props,
    children: (
      <>
        <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" />
        <path d="m6.2 5.3 3.1 3.9" />
        <path d="m12.4 3.4 3.1 4" />
        <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      </>
    ),
  })
}

export function TriangleAlert(props: SVGProps<SVGSVGElement>) {
  return base({
    ...props,
    children: (
      <>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),
  })
}
