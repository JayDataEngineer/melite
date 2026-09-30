// @melite/models-h3 — the film action's facts door: the resolved
// lane_inputs parse into the closed engine shape, and drift (a
// missing lane file, a blank string, a non-string) refuses loud at
// instantiate — never a silent route to a stock lane.
import { describe, it, expect } from "vitest";
import { film, parseH3Facts } from "../src/actions.ts";

const LANE = {
  unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
};

describe("the h3 film action's facts door", () => {
  it("parses the row's unet + the package const's three lane files into the closed engine shape", () => {
    const facts = parseH3Facts(LANE);
    expect(facts).toEqual({
      unet: LANE.unet,
      clip: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
      vae_video: "minimax_h3_video_vae_int8_convrot.safetensors",
      vae_audio: "minimax_h3_audio_vae_fp32.safetensors",
    });
  });

  it("a missing unet refuses loud, naming the key", () => {
    expect(() => parseH3Facts({ ...LANE, unet: undefined }))
      .toThrow(/lane_inputs\.unet = undefined .* non-empty string/);
  });

  it("a blank lane filename refuses loud (an empty weight is no weight)", () => {
    expect(() => parseH3Facts({ ...LANE, unet: "   " })).toThrow(/lane_inputs\.unet = "   ".*non-empty string/);
  });

  it("a non-string lane value refuses loud (never coerced)", () => {
    expect(() => parseH3Facts({ ...LANE, unet: 42 })).toThrow(/lane_inputs\.unet = 42.*non-empty string/);
  });

  it("an absent lane row refuses loud (a family that ships no lane_inputs parses no facts)", () => {
    expect(() => parseH3Facts(undefined)).toThrow(/lane_inputs\.unet = undefined .* non-empty string/);
  });

  it("the film action declares the seed sentinel (GATE S) and the video output", () => {
    expect(film.id).toBe("film");
    expect(film.outputs).toEqual([{ name: "video", kind: "VIDEO" }]);
    expect(film.params).toEqual([{ name: "seed", rule: "seed-sentinel" }]);
    expect(film.facts).toBe(parseH3Facts);
  });
});
