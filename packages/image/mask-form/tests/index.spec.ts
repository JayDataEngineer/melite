import { describe, it } from "vitest";
import assert from "node:assert/strict";
import * as mod from "../src/index.ts";

describe("the mask-form host face (row-mounted, registers nothing)", () => {
  it("declares the package name, an empty inject, and a no-op apply", () => {
    assert.equal(mod.name, "@melite/image-mask-form");
    assert.deepEqual(mod.inject, []);
    assert.doesNotThrow(() => mod.apply({} as never));
  });
});
