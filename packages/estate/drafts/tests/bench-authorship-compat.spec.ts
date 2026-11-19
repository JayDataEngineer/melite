// bench-authorship-compat.spec.ts — THE STORED-ROWS COMPAT (the
// authorship rename, CONTRACTS.md §4 debt 6): rows already persisted
// carry the row's authorship source under the LEGACY key; the read
// path resolves the NEW key and falls back to the legacy one when
// the new is absent — ONE-WAY (the writer never emits the legacy
// key, and a healed row never regains it).
import { test } from "vitest";
import assert from "node:assert/strict";
import { AUTHORSHIP_KEY, AUTHORSHIP_LEGACY_KEY } from "@melite/contracts/benchStage";
import { addStageBench, getBench, normalizeStages } from "../src/bench.ts";
import { boot, seed } from "./bench-helpers.ts";

test("a row persisted under the LEGACY authorship key reads back through the NEW key (the one-way reader)", async () => {
  const drafts = await boot();
  await seed(drafts, "legacy-read", {
    stages: [{ id: "a", card: "hero", params: {}, [AUTHORSHIP_LEGACY_KEY]: "agent" }],
  });
  const served = (getBench(drafts, "legacy-read").stages as Array<Record<string, unknown>>)[0]!;
  assert.equal(served[AUTHORSHIP_KEY], "agent",
    "the stored-rows reader resolves the legacy key through the new one");
  assert.equal(AUTHORSHIP_LEGACY_KEY in served, false,
    "the read heals in place — the legacy spelling never serves");
});

test("the restore coordinate carried by the LEGACY key survives the load arm (the repair law reads it)", async () => {
  // The load/birth arm reads the coordinate after the heal, so a
  // restored row persisted before the rename keeps its mark — the
  // model-repair law must keep exempting it at admission.
  const [restored] = normalizeStages(
    [{ id: "s_0", [AUTHORSHIP_LEGACY_KEY]: "restored" }, { id: "s_1" }],
    "agent" as never,
  );
  assert.equal(restored[AUTHORSHIP_KEY], "restored",
    "a legacy-keyed restored row keeps its coordinate");
});

test("a fresh write emits ONLY the new authorship key (the writer never emits the legacy spelling)", async () => {
  const drafts = await boot();
  await seed(drafts, "fresh-write", {
    stages: [{ id: "a", card: "hero", params: {} }],
  });
  const bench = getBench(drafts, "fresh-write");
  await addStageBench(drafts, "fresh-write", {
    card: "hero", params: {}, expect_rev: bench.rev,
  });
  const doc = drafts.table("docs").get("bench-fresh-write") as {
    doc: { stages: Array<Record<string, unknown>> };
  };
  const added = doc.doc.stages.find((r) => r["id"] !== "a")!;
  assert.equal(added[AUTHORSHIP_KEY], "agent", "the add door stamps the new key");
  assert.equal(AUTHORSHIP_LEGACY_KEY in added, false,
    "the persisted row carries no legacy spelling");
});
