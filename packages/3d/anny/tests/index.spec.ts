// @melite/3d-anny — the HOST face (the composition marker, the
// dual-face law): the loader applies THIS face node-side and it
// registers NOTHING — the card def rides the CARD face (./card),
// the studio rides the client face (src/client). The first spec to
// pin it: the package name, the empty inject, the no-op apply.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { apply, inject, name } from "../src/index.ts";

describe("the host face (the row-mount marker)", () => {
  it("names the package (the cardPackages SSOT row)", () => {
    assert.equal(name, "@melite/3d-anny");
  });

  it("injects nothing (no services — the face registers nothing)", () => {
    assert.deepEqual(inject, []);
  });

  it("apply runs clean on a real Context and returns nothing (the studio rides the client face)", () => {
    const ctx = new Context();
    assert.equal(apply(ctx), undefined);
  });
});
