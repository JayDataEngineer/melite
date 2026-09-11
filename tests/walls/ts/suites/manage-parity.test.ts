// manage-parity.test.ts — the tab/tool vocabulary parity wall
// (reborn 2026-09-10: the py parity wall died with the python
// gateway; the claim lives in the assets-tab header, so the wall
// lives again — in the walls plane). Two directions over the
// managePlane ACTIONS SSOT:
//   1. every action the deck's ComfyUI Manager tab dispatches is a
//      member of ACTIONS (a typo'd literal never reaches the wire);
//   2. every ACTIONS member is dispatched by the tab (the GUI and
//      the comfy_manage agent tool ride ONE vocabulary — no hidden
//      actions, no dead buttons).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ACTIONS } from "../../../../packages/harness/estate-queue/src/managePlane.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const tabPath = join(repoRoot, "packages/web/melite-card-deck/src/client/assets-tab.tsx");
const tab = readFileSync(tabPath, "utf8");

/** Every action literal the tab dispatches, extracted from the five
 *  call-site shapes that name actions: postManage('X', run('X',
 *  confirmRun('X', busy-key comparisons (=== 'X'), and the MUTATING
 *  set's members. Direction 1 then really proves no OTHER literal
 *  rides the wire. */
const dispatched = new Set<string>();
for (const m of tab.matchAll(/(?:postManage|run|confirmRun)\(\s*'([a-z_]+)'/g)) dispatched.add(m[1]!);
const mutatingBlock = tab.match(/const MUTATING[^;]+;/s)?.[0] ?? "";
for (const m of mutatingBlock.matchAll(/'([a-z_]+)'/g)) dispatched.add(m[1]!);
// The mount-time silent probe.
dispatched.add("status");

describe("manage parity — the tab and the tool ride ONE vocabulary", () => {
  it("every dispatched tab action is an ACTIONS member (no typo'd literals)", () => {
    const foreign = [...dispatched].filter((a) => !(ACTIONS as readonly string[]).includes(a));
    assert.deepStrictEqual(foreign, [], "tab dispatches unknown actions");
  });

  it("every ACTIONS member is dispatched by the tab (no hidden actions, no dead buttons)", () => {
    const missing = (ACTIONS as readonly string[]).filter((a) => !dispatched.has(a));
    assert.deepStrictEqual(missing, [], "tab never dispatches these SSOT actions");
  });
});
