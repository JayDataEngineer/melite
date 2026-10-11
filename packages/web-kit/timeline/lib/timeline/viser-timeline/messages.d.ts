import type { TimelineTrack, TimelineKeyframe, TimelinePrompt } from "./types.ts";
/** A locked/translation interval on a keyframe track (viser shape). */
export interface TimelineInterval {
    uuid: string;
    track_id: string;
    start_frame: number;
    end_frame: number;
    value: number | null;
    opacity: number;
    locked: boolean;
}
export interface TimelineMessage {
    type: "TimelineMessage";
    enabled: boolean;
    fps: number;
    start_frame: number;
    end_frame: number;
    current_frame: number;
    prompts: TimelinePrompt[];
    tracks: TimelineTrack[];
    keyframes: TimelineKeyframe[];
    intervals: TimelineInterval[];
    mode: string;
    constraints_enabled: boolean;
    default_text: string;
    default_duration: number;
    min_prompt_duration: number;
    max_prompt_duration: number | null;
    default_num_frames_zoom: number;
    max_frames_zoom: number;
}
//# sourceMappingURL=messages.d.ts.map