// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
//
// Vendored from viser/client/src/WebsocketMessages.ts — TimelineMessage only.
// The motion card synthesizes this shape from local state (no viser
// websocket). Field names and types are identical to viser's so the
// vendored Timeline.tsx renders the demo's bar byte-for-byte.

import type { TimelineTrack, TimelineKeyframe, TimelinePrompt } from "./types";

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
