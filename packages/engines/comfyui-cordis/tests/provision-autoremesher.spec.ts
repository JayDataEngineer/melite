// provision-autoremesher — the pinned quad-remesh binary's own law:
// the tag, URL, digest, and install path stay coherent (a re-pin
// that updates one without the other is the classic drift; the
// ghost of the provision-sharing audit was exactly a binary no
// clone could obtain).
import { describe, it, expect } from "vitest";
import {
  AUTOREMESHER_TAG,
  AUTOREMESHER_URL,
  AUTOREMESHER_SHA256,
  AUTOREMESHER_DIR,
  AUTOREMESHER_BIN,
} from "../scripts/provision-autoremesher.ts";
import { sep } from "node:path";
import { REPO } from "../scripts/provision-shared.ts";

describe("the autoremesher artifact pin", () => {
  it("the tag names the upstream ref the binary was built at", () => {
    expect(AUTOREMESHER_TAG).toBe("autoremesher-d9ef96bd");
  });
  it("the URL is the release asset on the pack's own remote", () => {
    expect(AUTOREMESHER_URL).toBe(
      "https://github.com/JayDataEngineer/melite-autoremesher-nodes/releases/download/" +
        AUTOREMESHER_TAG + "/autoremesher-asset",
    );
  });
  it("the digest is a 64-hex sha256 (never a moved asset passing silently)", () => {
    expect(AUTOREMESHER_SHA256).toMatch(/^[0-9a-f]{64}$/);
  });
  it("the install path lives inside the estate's runtime tree", () => {
    expect(AUTOREMESHER_DIR.startsWith(REPO + sep)).toBe(true);
    expect(AUTOREMESHER_BIN).toBe(
      [AUTOREMESHER_DIR, "autoremesher"].join(sep),
    );
  });
});
