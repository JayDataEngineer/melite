// estate-composition.spec.ts — the melite-estate bundle composes
// (2026-09-11: @melite-plugin/dsh-estate mounts the full engine
// tier — models, host, drafts, queue, cards, disclose, manage,
// skills, load, runs, media — and NOTHING booted it whole. The
// disclose/manage/runs walls mount their own slices; an order break
// or a dropped row in the bundle would pass every slice wall and
// fail only at boot).
//
// The wall mounts the bundle over the disclose wall's storage rig
// and asserts the seat plane (every provider's seat resolves) plus
// one behavior per plane proving the wiring is live, not merely
// present: disclose rows, drafts bench round-trip, manage status
// (test-flagged: no engine dialed).
//
// Run: npx vitest run tests/walls/ts/suites/estate-composition.spec.ts
// (or the whole gate: pnpm run test)
import "../../../helpers/boot-models.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {describe, it, beforeAll} from "vitest";
import assert from "node:assert/strict";
import { Context, type Plugin } from '@deepseek-ai/cordis';
import timerPlugin from '@deepseek-ai/cordis-plugin-timer';
import draftsPlugin from '@melite/estate-drafts';
import Storage from '@deepseek-ai/dsh-storage';
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from '@deepseek-ai/dsh-storage-json';
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from '@deepseek-ai/dsh-storage-domain';
import estateBundle from "../../../../packages/web/melite-estate/src/index.ts";
import type { DiscloseDirectoryService } from "../../../../packages/harness/estate-queue/src/index.ts";
import type { ManageGatewayService } from "../../../../packages/harness/estate-queue/src/manageRegistry.ts";
import { registryFlowNames } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { theService } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";

let ctx: Context;

beforeAll(async () => {
  const root = mkdtempSync(join(tmpdir(), "estate-composition-wall-"));
  process.env["MELITE_STATE_ROOT"] = root;
  ctx = new Context();
  // cross-copy plugin shapes ride the honest Plugin cast — never
  // poisons the ctx.plugin overload into a required Config.
  await ctx.plugin(timerPlugin as unknown as Plugin);
  await ctx.plugin(Storage as unknown as Plugin);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as unknown as Plugin, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as unknown as Plugin, { backend: "json" });
  // THE BUNDLE — the whole engine tier in load order.
  await ctx.plugin(estateBundle as unknown as Plugin);
});

function seat<T>(name: string): T {
  const svc = ctx.get(name, false) as T | undefined;
  assert.ok(svc, `the ${name} seat is live after the bundle mount`);
  return svc;
}

/** The bundle fans its rows out un-awaited (apply fires ctx.plugin
 *  per row and returns — the host fiber settles them). The wall
 *  waits the same way the host does: poll until every claimed seat
 *  resolves, LOUD on timeout (a row that never settles is a
 *  composition break, not a slow machine). */
async function settle(names: string[]): Promise<void> {
  const deadline = Date.now() + 15_000;
  for (;;) {
    const missing: string[] = names.filter((n) => ctx.get(n, false) === undefined);
    if (missing.length === 0) return;
    if (Date.now() > deadline) {
      assert.fail(`the bundle never settled these seats: ${missing.join(", ")}`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe("the estate bundle composes", () => {
  it("every provider seat settles (no order break, no dropped row)", async () => {
    await settle([
      "queue",
      "draftsRemote",
      "benchRemote",
      "cardRegistry",
      "disclose",
      "manage",
      "meliteSkills",
      "load",
      "runs",
      "comfyui",
    ]);
  }, 30000);

  it("the disclose plane answers through the bundle (cards + flows ride — EXACT, derived)", async () => {
    // B-C5 (the wall audit): `>= 11` while the registry held 13, and
    // `cards.length >= 1`, were floors over an SSOT that already
    // existed — registryFlowNames() and the card registry. Exact
    // two-way equality now: the bundle's disclose plane serves
    // EXACTLY the registered flows and cards, and the counts derive
    // from the owning declarations, never from this file.
    const disclose = seat<DiscloseDirectoryService>("disclose");
    const all = disclose.discover("all", "", "");
    assert.ok(Array.isArray(all.flows), "flows ride");
    const servedFlows = (all.flows as Array<{ name?: string }>).map((f) => f.name ?? String(f)).sort();
    const wantFlows = registryFlowNames();
    assert.ok(wantFlows.length > 0, "census floor: the flow registry declares flows (the import rotted)");
    assert.deepEqual(servedFlows, wantFlows,
      "the disclose plane serves exactly the flow registry's names");
    assert.ok(Array.isArray(all.cards), "cards ride");
    const servedCards = (all.cards as Array<{ name?: string; id?: string }>).map((c) => c.name ?? c.id ?? String(c)).sort();
    const wantCards = theService().cardIds();
    assert.ok(wantCards.length > 0, "census floor: the card registry declares cards (the import rotted)");
    assert.deepEqual(servedCards, wantCards,
      "the disclose plane serves exactly the card registry's ids");
  }, 30000);

  it("the drafts plane round-trips through the bundle (bench ensure/get — the birth row, exactly)", async () => {
    // B-C5: `typeof rev === "number"` accepted any rev on what is a
    // FRESH bundle (mkdtemp) — the birth row's law is exact: rev 0
    // (no writes happened), and the row exists after ensure.
    const bench = seat<{ ensure(doc: unknown, signal: AbortSignal): Promise<unknown>; get(session: string, signal: AbortSignal): Promise<{ rev: number; created?: string }> }>("benchRemote");
    const sig = new AbortController().signal;
    await bench.ensure({ session: "main" }, sig);
    const row = await bench.get("main", sig);
    assert.notEqual(row, undefined, "the bench row exists after ensure");
    assert.equal(row.rev, 0, "a fresh bundle's birth bench carries rev 0 (ensure wrote nothing)");
  }, 30000);

  it("the manage plane answers through the bundle (status, no engine dialed)", async () => {
    const manage = seat<ManageGatewayService>("manage");
    const sig = new AbortController().signal;
    const env = await manage.act({ action: "status", test: true }, sig);
    assert.equal(env.ok, true, "status answers test-flagged with no engine");
  });
}, 30000);
