// THE PROMGEN HANDOFF DOC LAWS (C1/C2/C4/C5/C6/C7, 2026-11-16 —
// content defects, not structural ones: the doc tiers are the right
// shape; these walls pin the CONTENT the burn proved was missing).
// Every arm reads the AUTHORED surface an agent actually reads at
// compose time (the AGENT.md entrance, the card's own knob tooltips)
// and, where the doc states numbers a declaration owns, the number
// is checked AGAINST THE DECLARATION (depth: the doc cannot drift
// from the code that composes).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { schema as imageGenSchema } from "../src/card.ts";
import { DECL as H3_DECL } from "@melite/models-h3-image";

const AGENT_MD = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "agents", "AGENT.md"), "utf8");

describe("C2 — the run-press contract states BOTH modes (never a flat 'never yours')", () => {
  it("chat-compose default AND operator-authorized press, named as modes", () => {
    assert.ok(AGENT_MD.includes("OPERATOR-AUTHORIZED MODE"), "the authorized-press mode is named (the operator's 'press it now' orders were the working interface while the doc said 'never yours')");
    assert.ok(/CHAT-COMPOSE MODE/.test(AGENT_MD), "the chat-compose default is named");
    assert.ok(/never yours\b/.test(AGENT_MD) === false || /CHAT-COMPOSE MODE/.test(AGENT_MD), "an absolute 'never yours' claim may not stand without the mode split");
    assert.ok(AGENT_MD.includes("Authorization is per-brief, never a standing lane"), "the authorization is scoped — a new brief returns to chat-compose");
  });
});

describe("C4 — the operator ranking is carried (the served-doc date ban strips the stamp; the registry receipt keeps the date)", () => {
  it("the ranking block names every seat, with no calendar date riding the served doc", () => {
    const at = AGENT_MD.indexOf("THE PHOTOREAL/ANIME ROUTING RANKING");
    assert.ok(at > 0, "the ranking block exists");
    const block = AGENT_MD.slice(at, AGENT_MD.indexOf("## Worked examples") > at ? AGENT_MD.indexOf("## Worked examples") : at + 1600);
    const body = block;
    assert.ok(!/20\d\d-\d\d-\d\d/.test(body), "no calendar date rides the served doc (the origin-label wall's sibling ban)");
    for (const seat of ["moss-image", "krea-2 raw", "anima turbo", "h3-image", "2048-class", "h3-image-edit", "qwen-img-edit-21"]) {
      assert.ok(body.includes(seat), `the ranking names ${seat}`);
    }
    assert.ok(/retired photoreal family is struck/i.test(body), "the struck family is named by its ban-law spelling");
  });
});

describe("C5 — the h3 steps marriage is stated, and its numbers MATCH THE DECLARATION", () => {
  it("the AGENT.md h3 entry states the default marriage and the envelope, equal to the family DECL", () => {
    const entry = AGENT_MD.slice(AGENT_MD.indexOf("**h3-image** —"));
    assert.ok(entry.length > 0, "the h3 entry exists");
    const body = entry.slice(0, entry.indexOf("\n- ") > 0 ? entry.indexOf("\n- ") : 1200);
    const variant = (H3_DECL.variants as Array<{ sampler_envelope?: { steps?: number[], cfg?: number[] }, resolver_defaults?: { steps?: number, cfg?: number } }>)[0]!;
    const envelope = variant.sampler_envelope!;
    const marriage = variant.resolver_defaults!;
    // DEPTH: the doc's numbers are checked against the declaration
    // that composes — authored prose cannot drift from code
    assert.ok(body.includes(`**${String(marriage.steps)} steps / cfg ${String(marriage.cfg)}**`), `the entry states the default marriage (${String(marriage.steps)}/${String(marriage.cfg)}) as composed`);
    assert.ok(body.includes(`[${String(envelope.steps![0])}, ${String(envelope.steps![1])}]`), "the entry states the steps envelope as declared");
    assert.ok(body.includes(`[${String(envelope.cfg![0])}, ${String(envelope.cfg![1])}]`), "the entry states the cfg envelope as declared");
  });
});

describe("C6 — the canvas law lives ON THE CARD SURFACE (the thing read at compose time)", () => {
  it("the width/height knobs carry the per-family canvas-law tooltip", () => {
    // THE BURN'S PROOF THE OLD PLACEMENT WAS WRONG: the under-size
    // happened DESPITE the skill having been read — the skill file
    // is not the compose-time surface; the knob tooltip is.
    // schemastery: .extra('extra', bag(...)) lands in knob.meta.extra
    const dict = (imageGenSchema as unknown as { dict?: Record<string, { meta?: { extra?: { tooltip?: string } } }> }).dict;
    assert.ok(dict !== undefined, "the card schema exposes its knob dict");
    for (const knob of ["width", "height"]) {
      const tooltip = dict[knob]?.meta?.extra?.tooltip ?? "";
      assert.ok(tooltip.includes("2048"), `the ${knob} knob's tooltip names the h3 2048-class canvas law`);
      assert.ok(tooltip.includes("composes poorly"), `the ${knob} knob's tooltip warns that under-size composes poorly on h3`);
    }
  });
});

describe("C7 — the observability path is written down where an agent finds it", () => {
  it("the Doors section names the poll door, the journal, and the ground-truth files", () => {
    const doors = AGENT_MD.slice(AGENT_MD.indexOf("## Doors"));
    assert.ok(doors.includes("run_status"), "the designated poll door is named (G1: it works — poll it)");
    assert.ok(doors.includes("ledger_tail"), "the run journal is named (history)");
    assert.ok(doors.includes("_request.json") && doors.includes("_flow.json"), "the ground-truth run-dir files are named");
    assert.ok(doors.includes("check the filesystem before believing a refusal"), "the disk-over-refusal law is stated (the false-negative burn)");
  });
});

describe("C1 — the digest law is stated at the entrance too", () => {
  it("the Doors section states digests are per-estate-rev", () => {
    const doors = AGENT_MD.slice(AGENT_MD.indexOf("## Doors"));
    assert.ok(doors.includes("DIGESTS ARE PER-ESTATE-REV"), "the digest drift law is written where the habit forms");
    assert.ok(doors.includes("re-load"), "the reload law is stated");
  });
});
