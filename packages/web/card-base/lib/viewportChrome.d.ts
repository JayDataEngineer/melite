/**
 * ViewportFrame + ViewportAnchor + ReferenceImageBadge — the preview
 * port's CHROME family (hour 15, the preview-port interaction law):
 * docks AROUND the shared stage components, never inside. Grown from
 * anny's studio-local copies (same props, same data attributes,
 * DSW-token styling) and promoted when the body studio needed the
 * same seams — selection + per-asset errors are the STAGE's surface;
 * anchors, badges and in-card action buttons dock on these.
 */
import type { ComponentProps, ReactElement, ReactNode } from "react";
export interface ViewportFrameProps extends ComponentProps<"div"> {
    /** Accessible label for the viewport region (renders as aria-label). */
    label?: string;
    /** Shown when there is nothing on the stage. */
    empty?: ReactNode;
}
export declare function ViewportFrame({ children, label, empty, className, style, ...props }: ViewportFrameProps): ReactElement;
export type ViewportAnchorDock = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "bottom-center" | "bottom" | "fill" | "edge-right" | "edge-left";
export interface ViewportAnchorProps extends ComponentProps<"div"> {
    /** Where the content docks (default top-right — the pin shape). */
    dock?: ViewportAnchorDock;
}
export declare function ViewportAnchor({ dock, className, ...props }: ViewportAnchorProps): ReactElement;
export interface ReferenceImageBadgeProps extends ComponentProps<"figure"> {
    /** Servable image URL, or null → hide. */
    url: string | null;
    /** Human label ("Source photo"). */
    label: string;
}
export declare function ReferenceImageBadge({ url, label, className, ...props }: ReferenceImageBadgeProps): ReactElement | null;
//# sourceMappingURL=viewportChrome.d.ts.map