// laneRelations.spec.ts — the variant rail's shared judges, pinned at
// their one home. The door (estate-queue cardsVariant) and the client
// mirror (card-base composeValidate) both compose these voices; every
// branch here is a voice the two seats must never spell apart.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  judgeSamplerEnvelope,
  samplerEnvelopeCure,
  unknownQuantVoice,
  unknownVariantVoice,
  type SamplerEnvelope,
} from "../src/laneRelations.ts";

describe("unknownVariantVoice (the one spelling)", () => {
  it("quotes the stated variant, the model, and the offered ids", () => {
    assert.equal(
      unknownVariantVoice("krea-2", "z-image", ["raw", "turbo"]),
      'unknown variant "krea-2" for model "z-image" (known: raw, turbo)',
    );
  });
});

describe("unknownQuantVoice (the one spelling)", () => {
  it("names the variant whose cells were searched", () => {
    assert.equal(
      unknownQuantVoice("raw__int8", "z-image", "turbo", ["fp16", "q4"]),
      'unknown quant "raw__int8" for model "z-image" variant "turbo" (known: fp16, q4)',
    );
  });

  it("an empty cell list says so — the (known:) tail never lies", () => {
    assert.equal(
      unknownQuantVoice("fp16", "z-image", "turbo", []),
      'unknown quant "fp16" for model "z-image" variant "turbo" (the variant declares no cells)',
    );
  });
});

describe("samplerEnvelopeCure (the one cure)", () => {
  it("spells the sentence both seats append after the judge's voice", () => {
    assert.equal(
      samplerEnvelopeCure(),
      "The variant rail owns its sampler marriage: state values inside the envelope, or pick a different route.",
    );
  });
});

describe("judgeSamplerEnvelope (the route envelope gate)", () => {
  const env: SamplerEnvelope = { steps: [1, 8], cfg: [1, 2] };
  const turbo = { id: "turbo", route: "krea-2" } as const;

  it("a stated value inside the closed interval is caller agency", () => {
    assert.equal(judgeSamplerEnvelope({ steps: 4, cfg: 1.5 }, env, turbo), null);
  });

  it("the bounds themselves sit inside (closed interval)", () => {
    assert.equal(judgeSamplerEnvelope({ steps: 1, cfg: 2 }, env, turbo), null);
  });

  it("a stated cfg outside refuses with the full voice, route included", () => {
    assert.deepEqual(judgeSamplerEnvelope({ cfg: 3.5 }, env, turbo), {
      knob: "cfg",
      stated: 3.5,
      lo: 1,
      hi: 2,
      voice:
        'stated cfg 3.5 is OUTSIDE the route envelope for variant "turbo" (route krea-2) — the declared envelope is [1, 2]',
    });
  });

  it("steps is judged first when both knobs offend", () => {
    const off = judgeSamplerEnvelope({ steps: 30, cfg: 9 }, env, turbo);
    assert.equal(off?.knob, "steps");
  });

  it("a routeless variant drops the route parenthetical", () => {
    const off = judgeSamplerEnvelope(
      { cfg: 9 },
      env,
      { id: "base" },
    );
    assert.equal(
      off?.voice,
      'stated cfg 9 is OUTSIDE the route envelope for variant "base" — the declared envelope is [1, 2]',
    );
  });

  it("the skips ride verbatim: null envelope, absent bound, non-numeric, non-finite", () => {
    assert.equal(judgeSamplerEnvelope({ cfg: 9 }, null, turbo), null);
    assert.equal(
      judgeSamplerEnvelope({ cfg: 9 }, { steps: [1, 8] }, turbo),
      null,
    );
    assert.equal(
      judgeSamplerEnvelope({ cfg: "later", steps: "soon" }, env, turbo),
      null,
    );
    assert.equal(
      judgeSamplerEnvelope({ cfg: Number.POSITIVE_INFINITY }, env, turbo),
      null,
    );
  });
});
