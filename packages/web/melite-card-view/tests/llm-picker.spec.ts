/**
 * llm-picker.spec.ts — the enhance model picker's pure filter (the
 * package-local firing arm of the infra-enhance-llm-picker wall; the
 * coverage seat for llm-picker.ts — the walls tier runs in its own
 * pool, never under coverage). The law is judged estate-wide at
 * tests/walls/ts/suites/enhance-llm-picker.spec.ts; this suite owns
 * the per-branch proof.
 */
import { describe, expect, it } from "vitest";
import { filterLlmRoutes } from "../src/client/llm-picker.ts";

describe("filterLlmRoutes (the enhance picker's search)", () => {
  const routes = [
    "zai/glm-5.3",
    "opencode-go/muse-spark",
    "deepseek-official/deepseek-chat",
    "xiaomi/mi-mo-7b",
  ];

  it("blank query keeps the whole list, order preserved", () => {
    expect(filterLlmRoutes(routes, "")).toEqual(routes);
    expect(filterLlmRoutes(routes, "   ")).toEqual(routes);
  });

  it("case-insensitive substring over the full route spelling", () => {
    expect(filterLlmRoutes(routes, "GLM")).toEqual(["zai/glm-5.3"]);
    expect(filterLlmRoutes(routes, "spark")).toEqual(["opencode-go/muse-spark"]);
    expect(filterLlmRoutes(routes, "zai/")).toEqual(["zai/glm-5.3"]);
  });

  it("no match is empty — the panel states it, never a guess", () => {
    expect(filterLlmRoutes(routes, "gpt-9")).toEqual([]);
  });

  it("returns a copy, never the caller's array", () => {
    const out = filterLlmRoutes(routes, "");
    expect(out).not.toBe(routes);
    expect(out).toEqual(routes);
  });
});
