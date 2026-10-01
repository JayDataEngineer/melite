import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { SAMPLER_OPTIONS, SCHEDULER_OPTIONS } from "../../../../packages/engines/comfyui-card-kit/src/vocab.ts";

// THE ENGINE-SUBSET WALL (Part VIII's owed wall, the cheap tier —
// li-aq). The CANNOT-SAY table's row "the engine's /object_info is
// the value domain" named an engine-read wall; the vocab's own
// design (vocab.ts) already refuses the frozen-snapshot equality
// wall — the arrays are GENERATED from the live engine through the
// regen door, and drift is a loud git diff at regen time. What that
// design cannot see is the REGEN GAP: the engine DROPS a sampler
// (an upstream rename, a pack uninstall) and the generated file
// still offers the dead name — every card menu carries it, every
// pick 400s at the engine, and the "loud git diff" never happens
// because nobody regenerated. This wall closes that gap: every name
// the kit serves must exist in the engine the lane actually runs.
//
// THE FIXTURE IS THE FLOOR (schema-gate-inventory fix 1, 2026-10):
// the wall used to read only the UNTRACKED production cache
// (data/tmp/object_info_prod.json, refreshed by fetching
// /object_info from the CONFIGURED engine endpoint —
// curl -s http://127.0.0.1:8188/object_info > data/tmp/object_info_prod.json)
// and self-skip without it, so a fresh clone judged nothing. The
// tracked value fixture (KSampler's two combo lists, the
// projection of the same cache, held in pinned-combos.min.json)
// is now judged UNCONDITIONALLY. The cache's first refresh under
// this wall (2026-10-10) caught a sampler stale: the vocab carried
// cfgpp_ud10_ab from a live regen while the September cache
// predated the pack — exactly the regen gap the wall exists for,
// found on its first run.
// ksampler-vocab.min.json is GONE (cruft audit #9): its two rosters
// duplicated pinned-combos.min.json's dotted keys byte for byte, and
// the live-cache drift arm below it was subsumed by
// vocab-rails-subset.spec.ts:133-150 (both KSampler keys + eight
// more). This floor now reads the one tracked engine truth.
const FIXTURE = new URL("../../fixtures/pinned-combos.min.json", import.meta.url);

type VocabFixture = Record<string, string[]>;

const deadNames = (served: string[], engine: string[]) =>
  served.filter((n) => !engine.includes(n));

describe("THE ENGINE-SUBSET WALL — the kit's vocabularies name only what the engine runs", () => {
  it("every served sampler/scheduler exists in the tracked engine fixture, unconditionally", () => {
    const vocab = JSON.parse(readFileSync(FIXTURE, "utf8")) as VocabFixture;
    const samplers = vocab["KSampler.sampler_name"] ?? [];
    const schedulers = vocab["KSampler.scheduler"] ?? [];
    expect(samplers.length, "the fixture carries the sampler roster").toBeGreaterThan(0);
    expect(schedulers.length, "the fixture carries the scheduler roster").toBeGreaterThan(0);

    const deadSamplers = deadNames(SAMPLER_OPTIONS, samplers);
    const deadSchedulers = deadNames(SCHEDULER_OPTIONS, schedulers);
    expect(
      deadSamplers,
      `the kit serves sampler names the fixture's engine does not run (${deadSamplers.join(", ")}) — regenerate the vocab (packages/engines/comfyui-cordis/scripts/regen-vocab.ts) AND the fixture (re-project KSampler from the refreshed cache); every card menu carries the dead name and every pick 400s at the engine`,
    ).toEqual([]);
    expect(
      deadSchedulers,
      `the kit serves scheduler names the fixture's engine does not run (${deadSchedulers.join(", ")}) — regenerate the vocab (packages/engines/comfyui-cordis/scripts/regen-vocab.ts) AND the fixture`,
    ).toEqual([]);
  });

  it("the vocabularies are non-empty and duplicate-free (a broken regen cannot serve a hollow menu)", () => {
    // F-L1 (the wall audit, 2026-09-28): `> 10` / `> 5` are floors
    // against a real roster of 45 samplers and 9 schedulers — a
    // regen that dropped twenty names passed. The censuses are exact.
    expect(SAMPLER_OPTIONS.length).toBe(45);
    expect(SCHEDULER_OPTIONS.length).toBe(9);
    expect(new Set(SAMPLER_OPTIONS).size).toBe(SAMPLER_OPTIONS.length);
    expect(new Set(SCHEDULER_OPTIONS).size).toBe(SCHEDULER_OPTIONS.length);
  });
});
