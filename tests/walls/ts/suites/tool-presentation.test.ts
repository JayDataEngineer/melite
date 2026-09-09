// tool-presentation.test.ts — S3 walls for the presentCall disclosure
// composition (dsh-tools presentCall/GenericCallView, vendored @141eb6f):
// every melite-tool declares a pure pending-call card (title + kind +
// salient rawInput) instead of the generic fallback (title = tool name,
// raw args dump).
//
// Pinned: all 13 tools expose presentCall (the rework kept the
// count: flow_catalog + card_catalog died, melite_discover +
// melite_load joined); cards are 'generic' with a
// non-empty title; kinds come from the ToolCallKind vocabulary; salient
// ids ride the title/rawInput; junk args (null/undefined/garbage) never
// throw (the registry may call presenters during streaming AND replay).
// presentResult stays UNIMPLEMENTED everywhere (adaptation 4 — omission
// is the designed default).
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/tool-presentation.test.ts
// (or the whole plane: node tests/walls/ts/run.mjs)
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ToolDefinition } from "../../../../packages/harness/melite-tools/src/types.ts";
import { buildFlow } from "../../../../packages/harness/melite-tools/src/tools/build-flow.ts";
import { cardRun } from "../../../../packages/harness/melite-tools/src/tools/card-run.ts";
import { comfyManage } from "../../../../packages/harness/melite-tools/src/tools/comfy-manage.ts";
import { meliteDiscover } from "../../../../packages/harness/melite-tools/src/tools/melite-discover.ts";
import { flowRun } from "../../../../packages/harness/melite-tools/src/tools/flow-run.ts";
import { laneBundleLoad } from "../../../../packages/harness/melite-tools/src/tools/lane-bundle-load.ts";
import { laneBundlePeek } from "../../../../packages/harness/melite-tools/src/tools/lane-bundle-peek.ts";
import { ledgerTail } from "../../../../packages/harness/melite-tools/src/tools/ledger-tail.ts";
import { meliteLoad } from "../../../../packages/harness/melite-tools/src/tools/melite-load.ts";
import { refineDraft } from "../../../../packages/harness/melite-tools/src/tools/refine-draft.ts";
import { runStatus } from "../../../../packages/harness/melite-tools/src/tools/run-status.ts";
import { skillIndex } from "../../../../packages/harness/melite-tools/src/tools/skill-index.ts";
import { skillRead } from "../../../../packages/harness/melite-tools/src/tools/skill-read.ts";

const GW = "http://127.0.0.1:9"; // never dialed — construction + presentCall only
const STUB_LLM = { complete: async () => ({ text: "stub" }) };

const ALL: Array<[string, ToolDefinition]> = [
  ["build_flow", buildFlow(GW)],
  ["card_run", cardRun(GW)],
  ["comfy_manage", comfyManage(GW)],
  ["melite_discover", meliteDiscover(GW)],
  ["flow_run", flowRun(GW)],
  ["lane_bundle_load", laneBundleLoad(GW)],
  ["lane_bundle_peek", laneBundlePeek(GW)],
  ["ledger_tail", ledgerTail(GW)],
  ["melite_load", meliteLoad(GW)],
  ["refine_draft", refineDraft(GW)],
  ["run_status", runStatus(GW)],
  ["skill_index", skillIndex(GW)],
  ["skill_read", skillRead(GW)],
];

const KINDS = new Set([
  "read",
  "edit",
  "delete",
  "move",
  "search",
  "execute",
  "fetch",
  "other",
]);

describe("presentCall disclosure composition", () => {
  it("all 13 tools declare presentCall; presentResult stays omitted", () => {
    assert.equal(ALL.length, 13);
    for (const [name, def] of ALL) {
      assert.equal(typeof def.presentCall, "function", `${name} needs presentCall`);
      assert.equal(def.presentResult, undefined, `${name} must not implement presentResult`);
    }
  });

  it("every card is generic with a non-empty title and a vocabulary kind", () => {
    for (const [name, def] of ALL) {
      const view = def.presentCall!({ ["probe_" + name]: true });
      assert.equal(view?.card, "generic", `${name} card`);
      assert.ok(view?.title && view.title.length > 0, `${name} title`);
      assert.ok(view?.kind === undefined || KINDS.has(view.kind), `${name} kind`);
    }
  });

  it("salient ids ride the title", () => {
    const byName = new Map(ALL);
    assert.match(byName.get("card_run")!.presentCall!({ draftId: "d123" })!.title, /d123/);
    assert.match(byName.get("flow_run")!.presentCall!({ template: "t9" })!.title, /t9/);
    assert.match(byName.get("run_status")!.presentCall!({ runId: "r42" })!.title, /r42/);
    assert.match(byName.get("refine_draft")!.presentCall!({ draftId: "d7", params: {} })!.title, /d7/);
    assert.match(byName.get("skill_read")!.presentCall!({ id: "s1" })!.title, /s1/);
    assert.match(
      byName.get("lane_bundle_load")!.presentCall!({ kind: "card", name: "c1" })!.title,
      /c1/,
    );
    assert.match(
      byName.get("build_flow")!.presentCall!({ flow: { stages: [{}, {}] } })!.title,
      /2 stages/,
    );
    assert.match(
      byName.get("melite_discover")!.presentCall!({ lookup: "cards", tags: "image,upscale" })!.title,
      /image,upscale/,
    );
    assert.match(
      byName.get("melite_load")!.presentCall!({ name: "upscale-tools", inference_type: "card" })!.title,
      /upscale-tools/,
    );
  });

  it("junk args never throw (streaming + replay safety)", () => {
    const junks: unknown[] = [null, undefined, 42, "x", [], true, { nested: { deep: [null] } }];
    for (const [name, def] of ALL) {
      for (const junk of junks) {
        let view;
        assert.doesNotThrow(() => {
          view = def.presentCall!(junk);
        }, `${name} threw on ${JSON.stringify(junk)}`);
        assert.equal((view as { card?: unknown } | undefined)?.card, "generic", name);
      }
    }
  });
});
