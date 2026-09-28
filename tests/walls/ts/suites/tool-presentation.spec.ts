// tool-presentation.spec.ts — S3 walls for the presentCall disclosure
// composition (dsh-tools presentCall/GenericCallView, vendored @141eb6f):
// every melite-tool declares a pure pending-call card (title + kind +
// salient rawInput) instead of the generic fallback (title = tool name,
// raw args dump).
//
// Pinned: the wall's tool set equals MELITE_TOOL_NAMES exactly (the
// registry derivation — index.ts seats the tools, this wall houses
// them; orphans and squatters both fail); every tool exposes
// presentCall (the rework unified card_run + flow_run + build_flow +
// refine_draft into melite_flow); cards are 'generic' with a
// non-empty title; kinds come from the ToolCallKind vocabulary; salient
// ids ride the title/rawInput; junk args (null/undefined/garbage) never
// throw (the registry may call presenters during streaming AND replay).
// presentResult stays UNIMPLEMENTED everywhere (adaptation 4 — omission
// is the designed default).
//
// Run: npx vitest run tests/walls/ts/suites/tool-presentation.spec.ts
// (or the whole gate: pnpm run test)
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import type { ToolDefinition } from "../../../../packages/harness/melite-tools/src/types.ts";
import { meliteFlow } from "../../../../packages/harness/melite-tools/src/tools/melite-flow.ts";

import { comfyManage } from "../../../../packages/harness/melite-tools/src/tools/comfy-manage.ts";
import { meliteDiscover } from "../../../../packages/harness/melite-tools/src/tools/melite-discover.ts";

import { meliteConstruct } from "../../../../packages/harness/melite-tools/src/tools/melite-construct.ts";
import { ledgerTail } from "../../../../packages/harness/melite-tools/src/tools/ledger-tail.ts";
import { meliteLoad } from "../../../../packages/harness/melite-tools/src/tools/melite-load.ts";

import { runStatus } from "../../../../packages/harness/melite-tools/src/tools/run-status.ts";
import { skillIndex } from "../../../../packages/harness/melite-tools/src/tools/skill-index.ts";
import { skillRead } from "../../../../packages/harness/melite-tools/src/tools/skill-read.ts";
import { meliteView } from "../../../../packages/harness/melite-tools/src/tools/melite-view.ts";
import { meliteRead } from "../../../../packages/harness/melite-tools/src/tools/melite-read.ts";
import { MELITE_TOOL_NAMES } from "../../../../packages/harness/melite-tools/src/index.ts";

import type { EstateRequest } from "../../../../packages/harness/melite-tools/src/estate.ts";

// the factories' seam drifted gateway-string → request-closure; this
// wall never dials (construction + presentCall only), so the undialed
// URL stands in for the closure — one cast here, not eleven below.
const GW = "http://127.0.0.1:9" as unknown as EstateRequest;
const STUB_LLM = { complete: async () => ({ text: "stub" }) };
// the observe doors take the harness Context, not the request — an
// undialed stand-in with the one method their presentCall paths touch.
const STUB_CTX = { get: (): undefined => undefined } as never;

// THE REGISTRY DERIVATION (the wall audit's M13, 2026-09-28): this
// list used to be nine hand-named tools while index.ts seated ELEVEN
// (melite_view + melite_read rode the deferred doors outside the
// wall) — a hand list the registry outgrew silently. The set below is
// now pinned EQUAL to MELITE_TOOL_NAMES: a tool registered without a
// wall row fails the equality, and a wall row without a registry seat
// fails it too. The count is never spelled again.
const ALL: Array<[string, ToolDefinition]> = [
  ["comfy_manage", comfyManage(GW)],
  ["melite_discover", meliteDiscover(GW)],
  ["melite_flow", meliteFlow(GW)],
  ["melite_construct", meliteConstruct(GW)],
  ["ledger_tail", ledgerTail(GW)],
  ["melite_load", meliteLoad(GW)],
  ["run_status", runStatus(GW)],
  ["melite_skill_index", skillIndex(GW)],
  ["melite_skill_read", skillRead(GW)],
  ["melite_view", meliteView(STUB_CTX)],
  ["melite_read", meliteRead(STUB_CTX)],
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
  it("the wall's tool set IS the registry's tool set (no orphans, no squatters)", () => {
    // THE M13 KILL: the wall judges every tool the plugin can own —
    // derived, not hand-counted. Adding a tool to index.ts without a
    // wall row (or vice versa) breaks this equality, not production.
    const wallNames = ALL.map(([name]) => name).sort();
    const registryNames = [...MELITE_TOOL_NAMES].sort();
    assert.deepEqual(
      wallNames,
      registryNames,
      "the wall and the registry disagree — every registered tool needs a wall row",
    );
  });

  it("every tool declares presentCall; presentResult stays omitted", () => {
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
    assert.match(byName.get("melite_flow")!.presentCall!({ card: "c9", model: "m9" })!.title, /c9/);
    assert.match(byName.get("melite_flow")!.presentCall!({ flow: "f9" })!.title, /f9/);
    assert.match(
      byName.get("melite_flow")!.presentCall!({ stages: [{}, {}, {}] })!.title,
      /adhoc \(3 stages\)/,
    );
    assert.match(byName.get("run_status")!.presentCall!({ runId: "r42" })!.title, /r42/);
    assert.match(byName.get("melite_skill_read")!.presentCall!({ id: "s1" })!.title, /s1/);
    assert.match(
      byName.get("melite_construct")!.presentCall!({ verb: "add_stage", card: "image-gen" })!.title,
      /add_stage · image-gen/,
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
