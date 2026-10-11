// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
// DARK_THEME values are re-skinned to the app's navy/cyan tokens
// (tailwind.css .dark block) — keep in sync if the theme changes:
//   timeCursorColor   → --primary brand cyan oklch(0.84 0.158 196) = #00E9EC
//   backgroundColor   → --blue-2 (#111927, canvas tier — recessed strip)
//   frameLabelColor   → --slate-11 (#B0B4BA, muted foreground)
//   frameTickColor    → --slate-6  (#363A3F, --sidebar-border)
//   promptBorderColor → --blue-1  (#0D1520, darkest tier)
export const DARK_THEME = {
    timeCursorColor: "#00E9EC",
    backgroundColor: "#111927",
    frameLabelColor: "#B0B4BA",
    frameTickColor: "#363A3F",
    promptBorderColor: "#0D1520",
    promptTextColor: "#FFFFFF",
    trackLabelColor: "#B0B4BA",
    trackSeparatorColor: "#363A3F",
    labelOverlayColor: "#111927",
    keyframeBorderColor: "#FFFFFF",
    intervalBorderColor: "#FFFFFF",
    headerShadowColor: "rgba(0, 0, 0, 0.2)",
    topBorderColor: "rgba(0, 0, 0, 0.3)",
};
export const LIGHT_THEME = {
    timeCursorColor: "#2563EB",
    backgroundColor: "#F8F9FA",
    frameLabelColor: "#495057",
    frameTickColor: "#CED4DA",
    promptBorderColor: "#495057",
    promptTextColor: "#FFFFFF",
    trackLabelColor: "#495057",
    trackSeparatorColor: "#CED4DA",
    labelOverlayColor: "#F8F9FA",
    keyframeBorderColor: "#495057",
    intervalBorderColor: "#495057",
    headerShadowColor: "rgba(0, 0, 0, 0.08)",
    topBorderColor: "rgba(0, 0, 0, 0.05)",
};
export const PROMPT_COLORS = [
    [0, 233, 236], // Default (brand cyan oklch(0.84 0.158 196) = rgb(0,233,236))
    [239, 68, 68], // Red
    [249, 115, 22], // Orange
    [234, 179, 8], // Yellow
    [34, 197, 94], // Green
    [59, 130, 246], // Blue
    [168, 85, 247], // Purple
    [236, 72, 153], // Pink
];
export const DEFAULT_PROMPT_COLOR = PROMPT_COLORS[0];
export const PROMPT_TEXT_SHADOW = "rgba(0, 0, 0, 0.5)";
export const HIGHLIGHT_COLOR = "#F4D03F";
export const HIGHLIGHT_BORDER_COLOR = "rgba(255, 255, 255, 0.9)";
export const HIGHLIGHT_SHADOW_COLOR = "rgba(0, 0, 0, 0.3)";
export const HIGHLIGHT_TEXT_COLOR = "#000000";
export const HIGHLIGHT_FONT = "bold 10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const HIGHLIGHT_TEXT_SHADOW_COLOR = "rgba(255, 255, 255, 0.6)";
export const HIGHLIGHT_SHADOW_BLUR = 5;
export const HIGHLIGHT_SHADOW_OFFSET_Y = 2;
export const HIGHLIGHT_BORDER_WIDTH = 1.5;
export const HIGHLIGHT_TEXT_SHADOW_BLUR = 2;
//# sourceMappingURL=styles.js.map