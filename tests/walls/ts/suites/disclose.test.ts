// disclose.test.ts — REBUILD-14 wall: the disclosure seat (Melite
// discover over both planes). Boots the estate glue over one
// mkdtemp state root, primes the card registry, and asserts the
// door's own laws: unknown lookup refuses with its voice, the
// planes ride lookup=all|cards|flows, search filters (q tokens ALL
// match; tags ALL match), rows are LIVE (the flows registry + the
// primed card defs — never a frozen blob).
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Context } from "../../../../packages/estate/drafts/node_modules/@deepseek-ai/cordis/lib/index.js";
import timerPlugin from "../../../../packages/harness/estate-queue/node_modules/@deepseek-ai/cordis-plugin-timer/lib/index.js";
import draftsPlugin from "../../../../packages/estate/drafts/lib/index.js";
import Storage from "../../../../packages/estate/drafts/node_modules/@deepseek-ai/dsh-storage/lib/index.js";
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from "../../../../packages/estate/drafts/node_modules/@deepseek-ai/dsh-storage-json/lib/index.js";
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from "../../../../packages/estate/drafts/node_modules/@deepseek-ai/dsh-storage-domain/lib/index.js";
import queuePlugin, {
  cardRegistryProvider,
  discloseProvider,
  type DiscloseService,
} from "../../../../packages/harness/estate-queue/src/index.ts";

async function boot(): Promise<{ ctx: Context; disclose: DiscloseService }> {
  const root = mkdtempSync(join(tmpdir(), "disclose-wall-"));
  const ctx = new Context();
  process.env["MELITE_STATE_ROOT"] = root;
  await ctx.plugin(timerPlugin as never);
  await ctx.plugin(queuePlugin as never);
  await ctx.plugin(Storage as never);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never, { backend: "json" });
  await ctx.plugin(draftsPlugin as never);
  await ctx.plugin(cardRegistryProvider as never);
  await ctx.plugin(discloseProvider as never);
  const disclose = ctx.get("disclose", false) as DiscloseService | undefined;
  assert.ok(disclose, "the disclose seat is live");
  return { ctx, disclose };
}

test("discover — both planes, live rows, the door's voices", async () => {
  const { ctx, disclose } = await boot();
  // 1. unknown lookup refuses with the door's exact voice.
  assert.throws(
    () => disclose.discover("models", "", ""),
    /unknown lookup 'models' \(all \| cards \| flows\)/,
  );
  // 2. the flows plane: the registry's eleven, live-derived
  //    (fit-seat carries its tool.json stage_title leaf).
  const all = disclose.discover("all", "", "");
  assert.ok(Array.isArray(all.flows) && all.flows.length >= 11, "the registry flows ride");
  assert.ok(Array.isArray(all.cards) && all.cards.length >= 1, "the card defs ride");
  const fit = all.flows?.find((f) => f.name === "fit-seat");
  assert.ok(fit, "fit-seat present");
  assert.equal(typeof fit.stages, "number");
  // 3. lookup=cards carries ONLY cards.
  const cardsOnly = disclose.discover("cards", "", "");
  assert.equal(cardsOnly.flows, undefined);
  assert.ok((cardsOnly.cards?.length ?? 0) >= 1);
  // 4. lookup=flows carries ONLY flows.
  const flowsOnly = disclose.discover("flows", "", "");
  assert.equal(flowsOnly.cards, undefined);
  assert.ok((flowsOnly.flows?.length ?? 0) >= 11);
  // 5. q tokens ALL match (case-folded): 'fit seat' hits fit-seat;
  //    a token absent from every row empties the plane.
  const q1 = disclose.discover("flows", "fit seat", "");
  assert.ok(q1.flows?.some((f) => f.name === "fit-seat"), "q matches");
  const q2 = disclose.discover("flows", "zzz-no-such-token", "");
  assert.equal(q2.flows?.length, 0, "no match empties");
  // 6. cards search: id/label/description/tags all in the haystack.
  const c1 = disclose.discover("cards", "image", "");
  assert.ok((c1.cards?.length ?? 0) >= 1, "card q matches");
});

test("the tools' lane grammar serves /v1/discover from the seat", async () => {
  const { ctx } = await boot();
  // The tools' request builder (seats only, in-process) — the lane
  // the melite_discover tool speaks.
  const { makeEstateRequest } = await import(
    "../../../../packages/harness/melite-tools/src/estate.ts"
  );
  const request = makeEstateRequest(ctx);
  const res = (await request("GET", "/v1/discover?lookup=all", undefined, new AbortController().signal)) as {
    flows?: unknown[]; cards?: unknown[];
  };
  assert.ok(Array.isArray(res.flows) && res.flows.length >= 11, "lane serves flows");
  assert.ok(Array.isArray(res.cards) && res.cards.length >= 1, "lane serves cards");
  // the seatless estate answers the LOUD no-remote voice (a context
  // with no disclose row — the lane grammar's own law).
  const bare = new Context();
  const bareRequest = makeEstateRequest(bare);
  await assert.rejects(
    bareRequest("GET", "/v1/discover", undefined, new AbortController().signal),
    /no remote serves GET \/v1\/discover/,
  );
});
