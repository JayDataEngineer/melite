// provision-audiocore — the pinned native artifact's own law: the
// tag, URL, digest, and install path stay coherent (a re-pin that
// updates one without the other is the classic drift; the ghost of
// the TTS chain audit T4 was exactly an undeclared .so).
import { describe, it, expect } from "vitest";
import {
  AUDIOCORE_TAG,
  AUDIOCORE_URL,
  AUDIOCORE_SHA256,
  AUDIOCORE_DIR,
  AUDIOCORE_LIB,
} from "../scripts/provision-audiocore.ts";
import { sep } from "node:path";
import { REPO } from "../scripts/provision-shared.ts";

describe("the audiocore artifact pin", () => {
  it("the URL is the release asset at the tag (first-party fork)", () => {
    expect(AUDIOCORE_URL).toBe(
      "https://github.com/JayDataEngineer/audio.cpp/releases/download/" +
        AUDIOCORE_TAG + "/libaudiocore_native.so",
    );
  });
  it("the digest is a 64-hex sha256 (never a moved asset passing silently)", () => {
    expect(AUDIOCORE_SHA256).toMatch(/^[0-9a-f]{64}$/);
  });
  it("the install path lives inside the estate's runtime tree", () => {
    expect(AUDIOCORE_DIR.startsWith(REPO + sep)).toBe(true);
    expect(AUDIOCORE_LIB).toBe(
      [AUDIOCORE_DIR, "libaudiocore_native.so"].join(sep),
    );
  });
});
