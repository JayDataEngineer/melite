import type * as React from "react";
export interface LaneHeadProps {
    /** The shell's variant — one of the four former grammars, kept as a
     *  data hook so tenants and walls can address each row class. */
    variant: "prompts" | "beats" | "audio" | "kf";
    /** The identity slot: an icon element (prompts/beats/audio) or a
     *  dot color (kf tracks — the track's rgb). Exactly one. */
    glyph?: React.ReactNode;
    /** The kf tracks' color dot (rendered in the glyph slot). */
    dotColor?: string;
    label: string;
    /** The accent tint (audio layers) — rides the shell's color so the
     *  glyph and label read like the clips. Absent → neutral. */
    accent?: string;
    /** Row height px — the SAME number the lane body takes (the
     *  head↔body pairing, mirrored by the parity wall, not trusted to
     *  two call sites staying in sync by hand). */
    height: number;
    /** The row's hover voice (the audio heads' bed/drop title; the kf
     *  head's pin-law title). Absent → no title. */
    title?: string;
    /** The audio heads' glyph-name hook (data-audio-icon — the tenant
     *  wall tints and addresses the head by it). Absent → no attr. */
    iconAttr?: string;
    /** The add-door slot (the upload button element). */
    door?: React.ReactNode;
    /** The detach slot (the × button element). */
    detach?: React.ReactNode;
}
/** One head, one grammar (SD-8). */
export declare function LaneHead(props: LaneHeadProps): React.JSX.Element;
//# sourceMappingURL=LaneHead.d.ts.map
