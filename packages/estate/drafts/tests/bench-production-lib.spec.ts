import { test } from "vitest";
import assert from "node:assert/strict";
import { ensureBench as ensureBenchProduction } from "../lib/bench.js";
import { boot } from "./bench-helpers.ts";

test("the production bench export strips every archive field from a new bench", async () => {
  const drafts = await boot();
  const born = await ensureBenchProduction(drafts, {
    session: "production-lib",
    stages: [{
      id: "s_0",
      card: "sfx",
      params: { prompt: "thunder" },
      history: [{ run_id: "foreign", url: "/foreign/output.flac" }],
      resultParams: { prompt: "foreign" },
      runStatus: "completed",
      resolved: { model: "foreign" },
    }],
  });
  const [row] = born.stages as Array<Record<string, unknown>>;
  for (const key of ["history", "resultParams", "runStatus", "resolved"]) {
    assert.equal(key in row, false, `${key} must be absent from the production birth`);
  }
});
