// manage-vocabulary.test.ts — the manage-vocabulary parity wall.
//
// Successor of tests/walls/suites/test_manage_parity.py (condemned —
// read-only spec, never edited). The SSOT moved: python/manage.py's
// Action enum is dead (RIP c0aa2187); the vocabulary lives in
// packages/gateway/doors/src/doors/manage.ts (ACTIONS + HANDLERS +
// LIFECYCLE_GUARDED) and this wall scans those SOURCES as text —
// text-scan by design (the layer-audit pattern): no imports, so the
// wall reads the sources the way an auditor would.
//
// Contract under test:
//   panel (assets-tab.tsx)  ⊆ SSOT   — a button dispatches only real
//                                      actions (a runtime REFUSED
//                                      envelope is a BUG, not a fallback)
//   panel == agent tool               — the 1:1 mirror: whatever the GUI
//                                      can do, the agent can do, and
//                                      nothing else
//   tool   ⊆ SSOT                    — the agent names no phantom action
//   SSOT   ⊆ HANDLERS                — every action has a handler row
//                                      (a dead vocab row is drift)
//   LIFECYCLE_GUARDED == the five lifecycle actions (INFERENCE LAW:
//                                      restart/stop/switch_version/update
//                                      rewrite or kill the live server;
//                                      snapshot_restore rewrites
//                                      extensions + deps under it)
//
// NOTE on the count: the objective brief says "16 actions" but lists 17
// values; the condemned Action enum, the panel, the tool, and ACTIONS
// all carry the same 17 (free is the seventeenth). This wall pins the
// exact SET, so the number follows from the set, not the other way round.
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/manage-vocabulary.test.ts
// (or the whole plane: node tests/walls/ts/run.mjs)
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { REPO_ROOT } from "../helpers/boot.ts";
import { blockOf, diffSets, readSource, stringLiterals } from "../helpers/scan.ts";

const MANAGE_REL = "packages/gateway/doors/src/doors/manage.ts";
const PANEL_REL = "packages/web/melite-card-deck/src/client/assets-tab.tsx";
const TOOL_REL = "packages/harness/melite-tools/src/tools/comfy-manage.ts";

/** The closed vocabulary (the contract — every row below is asserted). */
const CONTRACT: ReadonlySet<string> = new Set([
  "status",
  "logs",
  "search_models",
  "list_extensions",
  "snapshot_list",
  "install_extension",
  "install_extension_url",
  "download_model",
  "provision_model",
  "restart",
  "stop",
  "launch",
  "update",
  "switch_version",
  "free",
  "snapshot_save",
  "snapshot_restore",
]);

const GUARDED: ReadonlySet<string> = new Set([
  "restart",
  "stop",
  "switch_version",
  "update",
  "snapshot_restore",
]);

function manageActions(): Set<string> {
  let text: string;
  try {
    text = readSource(REPO_ROOT, MANAGE_REL);
  } catch {
    assert.fail(
      "manage.ts is missing at " + MANAGE_REL +
        " (the manage-door parent lane has not landed it — this wall " +
        "cannot verify the SSOT until it exists)",
    );
  }
  const block: string = blockOf(text, "export const ACTIONS = [", "] as const");
  return new Set(stringLiterals(block));
}

function handlerRows(): Set<string> {
  const text: string = readSource(REPO_ROOT, MANAGE_REL);
  const block: string = blockOf(text, "const HANDLERS:", "};");
  const out = new Set<string>();
  const re: RegExp = /^  ([a-z_]+): h[A-Za-z0-9_]+,?\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) out.add(m[1] as string);
  return out;
}

function lifecycleGuarded(): Set<string> {
  const text: string = readSource(REPO_ROOT, MANAGE_REL);
  const block: string = blockOf(text, "LIFECYCLE_GUARDED: ReadonlySet<ManageAction> = new Set([", "]);");
  return new Set(stringLiterals(block));
}

/** Every action-shaped string the panel dispatches or keys on (the
 *  condemned regexes, verbatim semantics): run('x') / confirmRun('x') /
 *  postManage('x') / busy === 'x' plus the MUTATING set. */
function panelActions(): Set<string> {
  const text: string = readSource(REPO_ROOT, PANEL_REL);
  const out = new Set<string>();
  for (const re of [/(?:run|confirmRun|postManage)\(\s*'([a-z_]+)'/g, /busy === '([a-z_]+)'/g]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) out.add(m[1] as string);
  }
  const mut: RegExpMatchArray | null = /const MUTATING[^=]*=\s*new Set\(\[(.*?)\]\)/s.exec(text);
  assert.ok(mut !== null, "panel: MUTATING set not found (regex drift?)");
  const inner: RegExpExecArray[] = [...(mut[1] as string).matchAll(/'([a-z_]+)'/g)];
  for (const m of inner) out.add(m[1] as string);
  return out;
}

function toolActions(): Set<string> {
  const text: string = readSource(REPO_ROOT, TOOL_REL);
  const m: RegExpMatchArray | null = /const ACTIONS = \[(.*?)\] as const/s.exec(text);
  assert.ok(m !== null, "comfy-manage.ts: ACTIONS array not found");
  return new Set([...(m[1] as string).matchAll(/'([a-z_]+)'/g)].map((r: RegExpMatchArray): string => r[1] as string));
}

describe("manage vocabulary (SSOT: doors/manage.ts)", () => {
  it("ACTIONS is exactly the 17-action contract set", () => {
    assert.deepEqual(manageActions(), CONTRACT, "SSOT drift: " + diffSets(CONTRACT, manageActions()));
  });

  it("panel dispatches only SSOT actions", () => {
    const vocab: Set<string> = manageActions();
    const panel: Set<string> = panelActions();
    assert.ok(panel.size > 0, "panel scan found no actions (regex drift?)");
    const rogue: string[] = [...panel].filter((a: string): boolean => !vocab.has(a)).sort();
    assert.deepEqual(rogue, [], "panel dispatches unknown SSOT action(s)");
  });

  it("panel and agent tool mirror 1:1 (exact set equality)", () => {
    const panel: Set<string> = panelActions();
    const tool: Set<string> = toolActions();
    assert.deepEqual(panel, tool, "1:1 mirror broke: " + diffSets(tool, panel));
  });

  it("agent tool names no phantom action", () => {
    const vocab: Set<string> = manageActions();
    const tool: Set<string> = toolActions();
    const rogue: string[] = [...tool].filter((a: string): boolean => !vocab.has(a)).sort();
    assert.deepEqual(rogue, [], "comfy_manage tool names action(s) the SSOT refuses");
  });

  it("every SSOT action has a HANDLERS row (and no phantom handler)", () => {
    const vocab: Set<string> = manageActions();
    const rows: Set<string> = handlerRows();
    assert.deepEqual(rows, vocab, "handler coverage drift: " + diffSets(vocab, rows));
  });

  it("LIFECYCLE_GUARDED is exactly the five lifecycle actions", () => {
    assert.deepEqual(lifecycleGuarded(), GUARDED, "guard drift: " + diffSets(GUARDED, lifecycleGuarded()));
  });
});
