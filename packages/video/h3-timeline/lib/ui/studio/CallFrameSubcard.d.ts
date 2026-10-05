import type { LinkArtifact } from "./refUtils.js";
/** The anchor slot — ONE image square in the bus grammar
 * (2026-08-24 affordance law: "first frame / last frame are weak
 * versions compared to other image input nodes — I can't link back
 * to previous outputs"):
 *   • From flow lists the upstream cards' IMAGE artifacts (links);
 *     the write maps URL→NAME (the drop-honesty law: an unmatched
 *     URL writes NOTHING — it would pass through unresolved).
 *   • From file keeps the studio's OWN file law (image-only, 20 MB
 *     cap, readAsDataURL → data: URL; _resolveSource decodes data:
 *     first-class) through the wire's onFile override.
 *   • From media lists the runs library through the same door; the
 *     URL→NAME honesty applies (foreign URLs refuse visibly). */
export declare function FirstFrameSlot({ testId, callIndex, value, onChange, nameToUrl, urlToName, links, }: {
    testId: string;
    callIndex: number;
    value: string | undefined;
    onChange: (source: string) => void;
    nameToUrl: Map<string, string>;
    urlToName: Map<string, string>;
    /** Upstream IMAGE artifacts — the link-to-previous-output rows. */
    links?: LinkArtifact[];
}): import("react").JSX.Element;
/** The call's seam law — carried vs cut (rule 3b). Renders under the
 *  image bus (the seam is the CALL'S join, not a bundle slot).
 *  (2026-09-20: the seam is AUTOMATIC — the drift-control continuation
 *  carries every non-cut join at the director's proven 22-frame
 *  overlap with the soft AV audio release; the seconds picker died
 *  with the MotionContext seam. The one authorable fact left is
 *  whether the join carries at all.) */
export declare function SeamControls({ callIndex, transition, onTransition, }: {
    callIndex: number;
    transition?: "extend" | "cut";
    onTransition?: (t: "extend" | "cut") => void;
}): import("react").JSX.Element;
//# sourceMappingURL=CallFrameSubcard.d.ts.map
