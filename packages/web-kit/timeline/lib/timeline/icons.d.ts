/**
 * timeline/icons — the timeline-only glyphs plus re-exports of the
 * glyphs @melite/card-base already carries (Film, Image, Upload, X:
 * path-identical drawings, same 24x24 stroke vocabulary; the
 * manifest has always declared that dep — the old "no icon dep"
 * header was false). card-base lacks the six music/zoom glyphs, so
 * they stay here, hand-authored on the same lucide path data
 * (v1.39.0, ISC); sizing rides the caller's className.
 */
import type { SVGProps } from "react";
export { Film, Image, Upload, X } from "@melite/card-base/client";
type IconProps = SVGProps<SVGSVGElement>;
export declare function ListMusic({ className, ...rest }: IconProps): import("react").JSX.Element;
export declare function Music({ className, ...rest }: IconProps): import("react").JSX.Element;
export declare function ZoomIn({ className, ...rest }: IconProps): import("react").JSX.Element;
export declare function Mic({ className, ...rest }: IconProps): import("react").JSX.Element;
export declare function Zap({ className, ...rest }: IconProps): import("react").JSX.Element;
export declare function ZoomOut({ className, ...rest }: IconProps): import("react").JSX.Element;
//# sourceMappingURL=icons.d.ts.map
