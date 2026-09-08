import { cn } from "./utils"
import type { ComponentProps } from "react"

/**
 * ReferenceImageBadge — the pinned source-image preview (born
 * 2026-09-06, operator order: "We need to have an image preview
 * when the card is drilled out for ANNY and IMAGE->3d"; promoted
 * to the kit 2026-09-07 — the pattern-violations audit's
 * promotion-rule case: two consumers across two tenants, pure
 * content since the anchor seam).
 *
 * The real-app pattern (Meshy / Luma / Tripo, every photo-to-3D
 * tool): the source you lifted from stays VISIBLE beside the
 * result — you should never wonder what the mesh came from. This
 * is the small labeled pin: callers wrap it in ViewportAnchor
 * dock="top-right" and this leaf carries look only, never
 * geometry.
 *
 * URL contract: the caller maps the slot value through
 * estateInputUrl (the /v1/assets/inputs preview door); null (no
 * source, or a non-previewable mount path) renders NOTHING — the
 * pin is honest or absent, never a broken frame.
 *
 * shadcn rules: data-slot, cn(), className wins, props spread.
 */
export interface ReferenceImageBadgeProps extends ComponentProps<"figure"> {
  /** Servable image URL (estateInputUrl's output), or null → hide. */
  url: string | null
  /** Human label ("Source photo"). */
  label: string
}

export function ReferenceImageBadge({
  url,
  label,
  className,
  ...props
}: ReferenceImageBadgeProps) {
  if (!url) return null
  return (
    <figure
      data-slot="reference-image-badge"
      data-reference-image
      aria-label={label}
      className={cn(
        "pointer-events-none w-28 overflow-hidden rounded-md border border-sidebar-border/60 bg-[#0e0e1a]/90 shadow-lg backdrop-blur-sm",
        className
      )}
      {...props}
    >
      <img
        src={url}
        alt={label}
        className="h-28 w-full object-contain"
        draggable={false}
      />
      <figcaption className="px-1.5 py-0.5 text-center text-[8px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
        {label}
      </figcaption>
    </figure>
  )
}

export default ReferenceImageBadge