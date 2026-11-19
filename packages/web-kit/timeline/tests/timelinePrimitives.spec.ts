// timelinePrimitives.spec.ts — the viser canvas constants + themes: value
// pins (the canvas painters consume these verbatim) + module presence for
// the types-only leaves (messages/types carry no runtime code).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  FRAME_LABELS_HEIGHT,
  TRACK_HEIGHT,
} from "../src/timeline/viser-timeline/TimelineConstants.ts";
import {
  DRAW_BUFFER,
  KEYFRAME_HIT_RADIUS,
  KEYFRAME_RADIUS,
  TRACK_LABEL_WIDTH,
} from "../src/timeline/viser-timeline/constants.ts";
import {
  DARK_THEME,
  DEFAULT_PROMPT_COLOR,
  HIGHLIGHT_BORDER_COLOR,
  HIGHLIGHT_BORDER_WIDTH,
  HIGHLIGHT_COLOR,
  HIGHLIGHT_FONT,
  HIGHLIGHT_SHADOW_BLUR,
  HIGHLIGHT_SHADOW_COLOR,
  HIGHLIGHT_SHADOW_OFFSET_Y,
  HIGHLIGHT_TEXT_COLOR,
  HIGHLIGHT_TEXT_SHADOW_BLUR,
  HIGHLIGHT_TEXT_SHADOW_COLOR,
  LIGHT_THEME,
  PROMPT_COLORS,
  PROMPT_TEXT_SHADOW,
} from "../src/timeline/viser-timeline/styles.ts";
import type { TimelineTheme } from "../src/timeline/viser-timeline/styles.ts";
import "../src/timeline/viser-timeline/messages.ts";
import "../src/timeline/viser-timeline/types.ts";

const THEME_KEYS: ReadonlyArray<keyof TimelineTheme> = [
  "timeCursorColor",
  "backgroundColor",
  "frameLabelColor",
  "frameTickColor",
  "promptBorderColor",
  "promptTextColor",
  "trackLabelColor",
  "trackSeparatorColor",
  "labelOverlayColor",
  "keyframeBorderColor",
  "intervalBorderColor",
  "headerShadowColor",
  "topBorderColor",
];

describe("layout constants", () => {
  it("pins the viser geometry", () => {
    assert.equal(FRAME_LABELS_HEIGHT, 28);
    assert.equal(TRACK_HEIGHT, 30);
    assert.equal(DRAW_BUFFER, 100);
    assert.equal(TRACK_LABEL_WIDTH, 80);
    assert.equal(KEYFRAME_RADIUS, 6);
    assert.equal(KEYFRAME_HIT_RADIUS, 10);
  });
});

describe("themes", () => {
  it("dark + light cover every theme slot", () => {
    for (const theme of [DARK_THEME, LIGHT_THEME]) {
      for (const key of THEME_KEYS) {
        assert.equal(typeof theme[key], "string", key);
      }
    }
  });
  it("dark is the navy/cyan skin, light differs", () => {
    assert.equal(DARK_THEME.timeCursorColor, "#00E9EC");
    assert.equal(DARK_THEME.backgroundColor, "#111927");
    assert.notEqual(LIGHT_THEME.backgroundColor, DARK_THEME.backgroundColor);
  });
});

describe("prompt + highlight paint", () => {
  it("serves eight prompt colors headed by brand cyan", () => {
    assert.equal(PROMPT_COLORS.length, 8);
    assert.deepEqual(PROMPT_COLORS[0], [0, 233, 236]);
    assert.equal(DEFAULT_PROMPT_COLOR, PROMPT_COLORS[0]);
    assert.equal(typeof PROMPT_TEXT_SHADOW, "string");
  });
  it("pins the highlight callout style", () => {
    assert.equal(HIGHLIGHT_COLOR, "#F4D03F");
    assert.equal(HIGHLIGHT_BORDER_COLOR, "rgba(255, 255, 255, 0.9)");
    assert.equal(HIGHLIGHT_SHADOW_COLOR, "rgba(0, 0, 0, 0.3)");
    assert.equal(HIGHLIGHT_TEXT_COLOR, "#000000");
    assert.ok(HIGHLIGHT_FONT.startsWith("bold 10px"));
    assert.equal(HIGHLIGHT_TEXT_SHADOW_COLOR, "rgba(255, 255, 255, 0.6)");
    assert.equal(HIGHLIGHT_SHADOW_BLUR, 5);
    assert.equal(HIGHLIGHT_SHADOW_OFFSET_Y, 2);
    assert.equal(HIGHLIGHT_BORDER_WIDTH, 1.5);
    assert.equal(HIGHLIGHT_TEXT_SHADOW_BLUR, 2);
  });
});
