// host-marker.spec.ts — THE DUAL-FACE LAW's marker test (2026-11-09,
// the fallback extermination): the package ROOT is the composition
// marker the web row mounts — node-side it registers NOTHING (the
// card def rides ./card, composed by the cardPackages SSOT in the
// engine plane; the studio rides ./client). The boot probe caught the
// bare-card face crashing the melite-test lane with
// `ctx.comfyui.registerCard is not a function` — this arm pins the
// marker's law: apply() effects nothing.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { apply, name, inject } from "../src/index.ts";

describe("the input-prep host marker (the dual-face law: the mounted face registers nothing)", () => {
  it("apply() effects nothing and the package names itself", () => {
    const effects: unknown[] = [];
    const ctx = {
      effect: (value: unknown): void => { effects.push(value); },
    };
    assert.doesNotThrow(() => apply(ctx as never));
    assert.equal(effects.length, 0, "the marker registers no effect node-side");
    assert.equal(name, "@melite/image-input-prep");
    assert.deepEqual(inject, []);
  });
});
