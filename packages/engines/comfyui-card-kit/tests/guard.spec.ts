// @melite/comfyui-card-kit — the consumption gate's rare arms
// (mods/guard.ts residual branches: the absent-mods row, the null
// controlnet row, the kind-less ip_adapter row, boot gate (d)).
// The boarding-first happy paths ride the controlnet/ip_adapter
// specs; THESE arms own the defensive fallbacks those never reach.
// Same fakes-and-laws convention: describe/it, node:assert/strict,
// LOUD refusals matched with /regex/.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  assertModUse,
  assertPackFate,
  fireControlNets,
  fireLoras,
  refuseIPAdapterFiring,
} from "../src/mods/guard.ts";

const ZIMAGE = { id: "z-image", mods: ["loras", "controlnet", "ip_adapter"] };

describe("assertModUse (the boarding gate)", () => {
  it("a boarding atom passes (returns nothing)", () => {
    assert.equal(assertModUse(ZIMAGE, "loras"), undefined);
  });

  it("an atom with NO mods row refuses (the ?? [] arm — absent boards nothing)", () => {
    assert.throws(
      () => assertModUse({ id: "solo" }, "loras"),
      /model 'solo' does not board the 'loras' pack/,
    );
  });
});

describe("fireLoras (the empty-bag lane promise on a mods-less atom)", () => {
  it("empty picks ride inert with no gate (no mutation, no throw)", () => {
    assert.deepEqual(fireLoras({ id: "solo" }, {}), []);
  });
});

describe("fireControlNets (the null-row arm)", () => {
  it("a null row reads as the empty row — and refuses naming the missing type (the ?? {} arm)", () => {
    assert.throws(
      () => fireControlNets({ id: "z-image", mods: ["controlnet"] }, { controlnets: [null] }),
      /a controlnet entry names no type/,
    );
  });
});

describe("refuseIPAdapterFiring (the kind-less row)", () => {
  it("a kind-less entry refuses under the '?' name (the cond-expr's second arm)", () => {
    assert.throws(
      () => refuseIPAdapterFiring(ZIMAGE, { ip_adapters: [{}] }),
      /ip_adapters \[\?\] refuses: no executable IP-Adapter lane/,
    );
  });
});

describe("assertPackFate (boot gate (d))", () => {
  it("a fated pack passes (fired AND refused fates both ride)", () => {
    assert.equal(assertPackFate("loras"), undefined);
    assert.equal(assertPackFate("lanpaint"), undefined);
  });

  it("a fateless pack refuses loud, naming the pack", () => {
    assert.throws(
      () => assertPackFate("nope"),
      /pack 'nope' is boarded but has no fate in this plane/,
    );
  });
});
