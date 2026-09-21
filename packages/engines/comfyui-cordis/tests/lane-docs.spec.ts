// lane-docs.spec.ts — THE ENTRANCE-DOC DRIFT WALL (the skill-system
// rework, 2026-09-21). A family's entrance doc (agents/AGENT.md) is
// the FIRST thing an agent reads before composing; if it is vapid
// ("same parameter surface; family override only") the agent
// hand-stamps garbage (the turbo-at-25-steps run). These walls pin
// the doc to the DECL: the marriages the doc names are the DECL's
// ACTUAL values — drift refuses.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DECL as KREA } from "@melite/models-krea-2";
import { KREA_ROWS } from "@melite/models-krea-2/mods/loras";

const doc = readFileSync(
  join(import.meta.dirname, "../models/image/krea-2/agents/AGENT.md"),
  "utf8",
);

describe("krea-2's entrance doc (the lane truth, drift-walled to the DECL)", () => {
  it("names the TURBO marriage — the family defaults VERBATIM", () => {
    const d = KREA.defaults as Record<string, unknown>;
    assert.ok(doc.includes(`steps ${String(d["steps"])}`), "the doc names turbo's married steps (family default)");
    assert.ok(doc.includes(`cfg ${String(d["cfg"])}`), "the doc names turbo's married cfg");
    assert.ok(doc.includes(`${String(d["sampler"])}/${String(d["scheduler"])}`), "the doc names the solver pair");
    assert.ok(/turbo.*DEFAULT|DEFAULT.*turbo/is.test(doc), "turbo is marked the default route");
  });

  it("names the RAW route's resolver_defaults marriage VERBATIM", () => {
    const raw = KREA.variants.find((v) => v.id === "raw");
    assert.ok(raw !== undefined);
    const rd = (raw as { resolver_defaults?: Record<string, unknown> }).resolver_defaults ?? {};
    assert.ok(doc.includes(`steps ${String(rd["steps"])}`), "raw's married steps ride the doc");
    assert.ok(doc.includes(`cfg ${String(rd["cfg"])}`), "raw's married cfg rides the doc");
  });

  it("states the cardinality of the lora catalog and every adapter id", () => {
    assert.ok(doc.includes(`${KREA_ROWS.length}-row`), `the doc names the catalog size (${KREA_ROWS.length})`);
    for (const row of KREA_ROWS) {
      assert.ok(doc.includes(row.id), `the doc names the ${row.id} adapter`);
    }
  });

  it("carries the entrance LAW (read before compose; the rail owns the marriage)", () => {
    assert.ok(/never hand-stamp/i.test(doc), "the never-fight-the-rail law rides");
    assert.ok(/variant rail/i.test(doc));
  });
});
