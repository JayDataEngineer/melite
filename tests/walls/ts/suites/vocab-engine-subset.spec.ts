import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
// because nobody regenerated. This wall closes that gap against the
// production /object_info snapshot when the clone carries one (the
// same self-skip contract as registry-flow-wiring): every name the
// kit serves must exist in the engine the lane actually runs. The
// live read belongs to the lane run (test:lane); this is the
// repo-side floor under it.

// The snapshot is an UNTRACKED CACHE (data/tmp), refreshed by
// fetching /object_info from the CONFIGURED engine endpoint — the
// same source the regen door reads (127.0.0.1:8188 on this clone;
// curl -s http://127.0.0.1:8188/object_info > data/tmp/object_info_prod.json).
// Its first refresh under this wall (2026-10-10) caught the cache a
// sampler stale: the vocab carried cfgpp_ud10_ab from a live regen
// while the September cache predated the pack — exactly the regen
// gap the wall exists for, found on its first run.
const DOC = join(process.cwd(), "data", "tmp", "object_info_prod.json");

type ObjectInfo = {
  KSampler?: { input?: { required?: Record<string, unknown> } };
};

describe("THE ENGINE-SUBSET WALL — the kit's vocabularies name only what the engine runs", () => {
  it("every served sampler/scheduler exists in the production /object_info", (ctx) => {
    // A SELF-SKIP IS NOT A PASS (AGENTS.md): the skip is REPORTED
    // (ctx.skip — the runner counts it skipped, never passed), so a
    // clone without the cache cannot read green on this wall.
    if (!existsSync(DOC)) {
      ctx.skip(true);
      return;
    }
    const doc = JSON.parse(readFileSync(DOC, "utf8")) as ObjectInfo;
    const req = doc.KSampler?.input?.required ?? {};
    const samplerList = (req["sampler_name"] as unknown as [string[]] | undefined)?.[0];
    const schedulerList = (req["scheduler"] as unknown as [string[]] | undefined)?.[0];
    expect(samplerList, "the snapshot's KSampler carries sampler_name").toBeDefined();
    expect(schedulerList, "the snapshot's KSampler carries scheduler").toBeDefined();
    const engineSamplers = new Set(samplerList ?? []);
    const engineSchedulers = new Set(schedulerList ?? []);

    const deadSamplers = SAMPLER_OPTIONS.filter((n) => !engineSamplers.has(n));
    const deadSchedulers = SCHEDULER_OPTIONS.filter((n) => !engineSchedulers.has(n));
    expect(
      deadSamplers,
      `the kit serves sampler names the production engine does not run (${deadSamplers.join(", ")}) — regenerate the vocab (packages/engines/comfyui-cordis/scripts/regen-vocab.ts); every card menu carries the dead name and every pick 400s at the engine`,
    ).toEqual([]);
    expect(
      deadSchedulers,
      `the kit serves scheduler names the production engine does not run (${deadSchedulers.join(", ")}) — regenerate the vocab (packages/engines/comfyui-cordis/scripts/regen-vocab.ts)`,
    ).toEqual([]);
  });

  it("the vocabularies are non-empty and duplicate-free (a broken regen cannot serve a hollow menu)", () => {
    expect(SAMPLER_OPTIONS.length).toBeGreaterThan(10);
    expect(SCHEDULER_OPTIONS.length).toBeGreaterThan(5);
    expect(new Set(SAMPLER_OPTIONS).size).toBe(SAMPLER_OPTIONS.length);
    expect(new Set(SCHEDULER_OPTIONS).size).toBe(SCHEDULER_OPTIONS.length);
  });
});
