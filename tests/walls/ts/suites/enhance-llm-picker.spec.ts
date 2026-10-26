/**
 * @contract infra-enhance-llm-picker
 * THE FULL-LIST + SEARCH LAW (burn e, operator 2026-10-26: "DROPDOWN
 * FOR ENHANCE LLM SELECTION IN CARDS IS MISSING MANY MODELS AND HAS
 * NO SEARCH").
 *
 * The card's ✦ model picker is served by TWO seats:
 *   - the LIST: resolveHarnessRoutes → the /melite-tools/catalog door
 *     → fetchEnhanceRoutes — every registered provider × every
 *     advertised model. The retired walk's 12-route slice starved
 *     every provider's 13th+ model (one provider advertising 40
 *     showed 12 interleaved routes total).
 *   - the SEARCH: filterLlmRoutes — the zoom bar dropdown's panel
 *     field. A hundreds-long scroll-only list is not a picker.
 *
 * Arms:
 *   1. COMPLETENESS — a provider advertising many more models than
 *      its siblings serves WHOLE: no length cap, no starvation, the
 *      round-robin cadence preserved.
 *   2. THE DOOR — the catalog route serves the resolver's COMPLETE
 *      list verbatim (the picker's source is the live list, never a
 *      restated copy — and never a sliced one).
 *   3. THE SEARCH — the filter: case-insensitive substring on the
 *      full route spelling, blank = everything, order preserved, no
 *      match = empty (the panel states it, never guesses).
 */
import { describe, expect, it } from "vitest";
import { resolveHarnessRoutes, routeName } from "../../../../packages/harness/melite-tools/src/llm-complete.ts";
import { filterLlmRoutes } from "../../../../packages/web/melite-card-view/src/client/llm-picker.ts";
import type { LlmStreamSeam } from "../../../../packages/harness/melite-tools/src/llm-complete.ts";

/** The structural seam fake (the real LlmRuntime's Pick, test-light). */
function seam(providers: Array<{ id: string; models: string[] }>): LlmStreamSeam {
  return {
    listProviders: () => providers.map((p) => ({ id: p.id })),
    listModels: async (provider: string) => {
      const p = providers.find((row) => row.id === provider);
      return (p?.models ?? []).map((id) => ({ id, provider }));
    },
    stream: () => {
      throw new Error("not exercised by this wall");
    },
  };
}

describe("enhance-llm-picker (burn e)", () => {
  it("ARM 1 — the route list is COMPLETE: a wide provider serves WHOLE, no slice, no starvation", async () => {
    // The live shape the operator burned: one provider advertises 50
    // models, its siblings one each. The retired walk's slice showed
    // 12; the picker starved 38+ models.
    const wide = Array.from({ length: 50 }, (_, i) => "model-" + String(i + 1).padStart(2, "0"));
    const routes = await resolveHarnessRoutes(seam([
      { id: "wide-one", models: wide },
      { id: "solo-a", models: ["alpha"] },
      { id: "solo-b", models: ["beta"] },
    ]));
    // every route serves — 50 + 1 + 1
    expect(routes).toHaveLength(52);
    // round-robin cadence: the solos' only routes ride in the first
    // round, ahead of the wide provider's second model
    expect(routes.slice(0, 3).map(routeName)).toEqual([
      "wide-one/model-01", "solo-a/alpha", "solo-b/beta",
    ]);
    // the wide provider's LAST model is present — the starvation arm
    expect(routes.map(routeName)).toContain("wide-one/model-50");
    // and every one between
    for (const m of wide) {
      expect(routes.map(routeName)).toContain("wide-one/" + m);
    }
  });

  it("ARM 2 — the catalog door's list is the resolver's COMPLETE output, verbatim", async () => {
    // The door (doors.ts catalog route) maps resolveHarnessRoutes'
    // output through routeName and nothing else — the picker's source
    // IS the live list. This arm pins that seam: the names the door
    // would serve equal the complete resolution, no slicing layer in
    // between.
    const models = Array.from({ length: 30 }, (_, i) => "m" + i);
    const routes = await resolveHarnessRoutes(seam([{ id: "p", models }]));
    const served = routes.map(routeName);
    expect(served).toHaveLength(30);
    expect(served[0]).toBe("p/m0");
    expect(served[29]).toBe("p/m29");
  });

  it("ARM 3 — the picker's search: substring, case-insensitive, blank = all, order kept, no guess", () => {
    const routes = [
      "zai/glm-5.3",
      "opencode-go/muse-spark",
      "deepseek-official/deepseek-chat",
      "xiaomi/mi-mo-7b",
    ];
    // blank query: the whole list, order preserved
    expect(filterLlmRoutes(routes, "")).toEqual(routes);
    expect(filterLlmRoutes(routes, "   ")).toEqual(routes);
    // case-insensitive substring over the full route spelling
    expect(filterLlmRoutes(routes, "GLM")).toEqual(["zai/glm-5.3"]);
    expect(filterLlmRoutes(routes, "spark")).toEqual(["opencode-go/muse-spark"]);
    // provider-side match works through the same one comparison
    expect(filterLlmRoutes(routes, "zai/")).toEqual(["zai/glm-5.3"]);
    // a stem matches every variant, order preserved
    expect(filterLlmRoutes(routes, "deepseek")).toEqual([
      "deepseek-official/deepseek-chat",
    ]);
    // no match = empty (the panel states it — never a guess)
    expect(filterLlmRoutes(routes, "gpt-9")).toEqual([]);
  });
});
