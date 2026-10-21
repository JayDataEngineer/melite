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
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..", "..");
import assert from "node:assert/strict";
import type { ToolDefinition } from "../../../../packages/harness/melite-tools/src/types.ts";
import { meliteFlow } from "../../../../packages/harness/melite-tools/src/tools/melite-flow.ts";

import { comfyManage } from "../../../../packages/harness/melite-tools/src/tools/comfy-manage.ts";
import { meliteDiscover } from "../../../../packages/harness/melite-tools/src/tools/melite-discover.ts";

import { meliteConstruct } from "../../../../packages/harness/melite-tools/src/tools/melite-construct.ts";
import { ledgerTail } from "../../../../packages/harness/melite-tools/src/tools/ledger-tail.ts";
import { meliteLoad } from "../../../../packages/harness/melite-tools/src/tools/melite-load.ts";

import { runStatus } from "../../../../packages/harness/melite-tools/src/tools/run-status.ts";
import { skillRead } from "../../../../packages/harness/melite-tools/src/tools/skill-read.ts";
import { meliteView } from "../../../../packages/harness/melite-tools/src/tools/melite-view.ts";
import { meliteRead } from "../../../../packages/harness/melite-tools/src/tools/melite-read.ts";
import { MELITE_TOOL_NAMES } from "../../../../packages/harness/melite-tools/src/index.ts";

import type { Estate } from "../../../../packages/harness/melite-tools/src/estate.ts";

// F-1 re-roll (2026-11-05): the factories' first parameter drifted the
// request-closure → the typed Estate lanes (the URL grammar stays the
// browser face's own; a URL pin would re-roll to the lane NAME, but no
// arm here dials). This wall never dials (construction + presentCall
// only), so every lane refuses naming itself — one undialed typed seam
// here, not eleven below.
const LANES: Estate = new Proxy({} as Estate, {
  get: (_target, lane) => (..._args: unknown[]) => {
    throw new Error(`tool-presentation wall never dials the estate (lane ${String(lane)} reached)`);
  },
});
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
  ["comfy_manage", comfyManage(LANES)],
  // the expansion thunk is execute-time only — this wall never executes,
  // so a no-op stands in (the seat law is index.spec's subject).
  ["melite_discover", meliteDiscover(LANES, () => {})],
  ["melite_flow", meliteFlow(LANES)],
  ["melite_construct", meliteConstruct(LANES)],
  ["ledger_tail", ledgerTail(LANES)],
  ["melite_load", meliteLoad(LANES)],
  ["run_status", runStatus(LANES)],
  ["melite_skill_read", skillRead(LANES)],
  ["melite_view", meliteView(STUB_CTX)],
  ["melite_read", meliteRead(STUB_CTX)],
];

// F-L2 (the wall audit, 2026-09-28): this set was a HAND COPY of
// dsh-tools' ToolCallKind union — a type-only union cannot be
// imported at runtime, so the copy was the only option, and it
// rots the moment the host adds a kind (the wall would then refuse
// a legitimate kind). The set is now DERIVED from the host's own
// declaration: the installed dsh-tools package is located, its
// version is PINNED (the union is a host fact, and a host bump may
// change it deliberately), and the union's members are read out of
// the host's own source.
const DSH_TOOLS_DIR: string = (() => {
  // The pinned cell: the store holds a cell per version that ever
  // resolved (0.1.7 lingered after the 0.2.0 hop), so the walk must
  // select the cell the workspace DECLARES, not the first match.
  const declaredRow = (() => {
    const d = JSON.parse(readFileSync("packages/harness/melite-tools/package.json", "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const row = d.dependencies?.["@deepseek-ai/dsh-tools"] ?? d.devDependencies?.["@deepseek-ai/dsh-tools"];
    return row === undefined ? null : row.replace(/^[\^~>=<\s]*/, "");
  })();
  const roots: string[] = [join(REPO ?? "", "node_modules", ".pnpm")];
  for (const r of roots) {
    if (!existsSync(r)) continue;
    const cells: string[] = [];
    for (const e of readdirSync(r, { withFileTypes: true })) {
      if (!e.isDirectory() || !e.name.startsWith("@deepseek-ai+dsh-tools@")) continue;
      const dir = join(r, e.name, "node_modules", "@deepseek-ai", "dsh-tools");
      if (existsSync(join(dir, "package.json"))) cells.push(dir);
    }
    if (cells.length === 0) continue;
    if (declaredRow !== null) {
      const hit = cells.find((c) => {
        const v = (JSON.parse(readFileSync(join(c, "package.json"), "utf8")) as { version?: string }).version ?? "";
        return v === declaredRow || satisfiesCell(c, declaredRow);
      });
      if (hit !== undefined) return hit;
      throw new Error(
        `the pinned dsh-tools ${declaredRow} has no store cell — run pnpm install (cells seen: ${cells.length})`,
      );
    }
    return cells[0];
  }
  throw new Error("the installed dsh-tools package is not found — the kind oracle has no host to read");

  function satisfiesCell(cell: string, row: string): boolean {
    // exact rows only for now — a caret row matches by prefix on the
    // release line (0.2.0-rc.x), which is all the workspace declares.
    if (row.startsWith("^")) {
      const line = row.slice(1).split("-rc.")[0] + "-rc.";
      const v = (JSON.parse(readFileSync(join(cell, "package.json"), "utf8")) as { version?: string }).version ?? "";
      return v.startsWith(line);
    }
    return false;
  }
})();

const DSH_TOOLS_VERSION: string = (
  JSON.parse(readFileSync(join(DSH_TOOLS_DIR, "package.json"), "utf8")) as { version?: string }
).version ?? "";

const KINDS: Set<string> = new Set((() => {
  const decl = readFileSync(join(DSH_TOOLS_DIR, "lib", "types", "presentation.d.ts"), "utf8")
    .match(/export type ToolCallKind =([^;]+);/);
  if (decl === null) throw new Error("dsh-tools no longer declares ToolCallKind where this wall reads it");
  return [...decl[1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
})());

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

  it("the kind oracle is the host's own declaration (version rides the one lockstep line, union derived)", () => {
    // F-L2: the host is a PINNED dependency — a bump that changes
    // the union is a deliberate edit here, not a silent drift, and
    // the members the wall judges are read from the host, never
    // retyped beside it. The version arm DERIVES the expected line
    // from the workspace's own declared row (dep-doctor proves all
    // dsh-* rows sit on it) — a hardcoded literal here drifted twice
    // (0.1.5 → 0.1.7 missed, 0.1.7 → 0.2.0 caught) without ever
    // judging the union; the MEMBERS arm below is the real oracle.
    const declared = JSON.parse(
      readFileSync("packages/harness/melite-tools/package.json", "utf8"),
    );
    const row = declared.dependencies?.["@deepseek-ai/dsh-tools"]
      ?? declared.devDependencies?.["@deepseek-ai/dsh-tools"];
    const want = String(row).replace(/^[\^~>=<\s]*/, "");
    assert.ok(DSH_TOOLS_VERSION === want,
      `the host dsh-tools (${DSH_TOOLS_VERSION}) must be the workspace's pinned ${want} — a bump that changes ToolCallKind says so here`);
    assert.deepEqual([...KINDS].sort(),
      ["delete", "edit", "execute", "fetch", "move", "other", "read", "search"],
      "the host's ToolCallKind members, read from the host's own source");
  });

  it("every card is generic with a non-empty title and a vocabulary kind", () => {
    for (const [name, def] of ALL) {
      const view = def.presentCall!({ ["probe_" + name]: true });
      // (§7 P7 single-resolve): the probe object rides the gate's
      // schema face — tools with required params refuse it
      // (undefined), all-optional tools render. Both are the ONE
      // seat's outputs; a throw or a non-generic card is neither.
      if (view === undefined) continue;
      assert.equal(view?.card, "generic", `${name} card`);
      assert.ok(view?.title && view.title.length > 0, `${name} title`);
      // F-L2: `kind === undefined ||` excused a MISSING kind — the
      // icon-picking bridge reads it, and a view without one shows
      // no affordance. Every card now carries a declared kind.
      assert.equal(typeof view?.kind, "string", `${name} declares a kind (an icon-picking bridge reads it)`);
      assert.ok(KINDS.has(view!.kind!), `${name} kind "${String(view?.kind)}" is in the host's ToolCallKind union`);
    }
  });

  it("salient ids ride the title", () => {
    const byName = new Map(ALL);
    assert.match(byName.get("melite_flow")!.presentCall!({ card: "c9", model: "m9" })!.title, /c9/);
    assert.match(byName.get("melite_flow")!.presentCall!({ flow: "f9" })!.title, /f9/);
    assert.match(
      // (§7 P7: schema-valid adhoc stages — the gate passes them to
      // the presenter; the pre-purge `{}` items were refused by the
      // gate and only rendered through the deleted second seat.)
      byName.get("melite_flow")!.presentCall!({ stages: [{ id: "a", engine: "e" }, { id: "b", engine: "e" }, { id: "c", engine: "e" }] })!.title,
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

  it("junk args never throw, and the gate owns the invalid face (streaming + replay safety)", () => {
    // (§7 P7 single-resolve — THE seat arm): non-object args are
    // refused by defineTool's gate (undefined) on EVERY tool. The
    // pre-purge re-attach rendered the generic card for all of
    // these: the old wall red against the cure (organic red at
    // /tmp/pv-organic-red.txt — actual undefined, expected
    // 'generic'), and restoring any one re-attach reds THIS arm
    // (toggle red at /tmp/pv-toggle-red.txt — melite_load renders
    // a view for null).
    const refused: unknown[] = [null, undefined, 42, "x", [], true];
    for (const [name, def] of ALL) {
      for (const junk of refused) {
        let view;
        assert.doesNotThrow(() => {
          view = def.presentCall!(junk);
        }, `${name} threw on ${JSON.stringify(junk)}`);
        assert.equal(view, undefined, `${name} renders a view for ${JSON.stringify(junk)} — the gate must own the face`);
      }
    }
    // Object args ride the gate's schema face (host-owned): tools
    // with required params refuse them, all-optional tools render
    // the generic card. Either is the one seat's output — never a
    // throw, never a non-generic card.
    const objects: unknown[] = [{ nested: { deep: [null] } }];
    for (const [name, def] of ALL) {
      for (const junk of objects) {
        let view;
        assert.doesNotThrow(() => {
          view = def.presentCall!(junk);
        }, `${name} threw on ${JSON.stringify(junk)}`);
        if (view === undefined) continue;
        assert.equal((view as { card?: unknown }).card, "generic", `${name} non-generic card for object junk`);
      }
    }
  });
});
