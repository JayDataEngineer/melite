// load-skill-roundtrip.spec.ts — THE ID NAMESPACE LAW (R3 of the
// progressive-disclosure rework, operator 2026-10-08).
//
// Every skill id the LOAD plane advertises, the estate's own read
// door must serve. This is the wall the operator's 12:14
// instant-fail bought: melite_load printed ids
// (`card:h3-timeline:video-timeline`) that one consumer or another
// refused. The seat 502s that day were the boot wedge, but the wall
// pins the round-trip so an id-namespace split can never ride
// silently again — whatever the load seat says, hSkillRead answers
// 200 with a body.
//
// Run: npx vitest run tests/walls/ts/suites/load-skill-roundtrip.spec.ts
import "../../../helpers/boot-models.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { Context, type Plugin } from "@deepseek-ai/cordis";
import timerPlugin from "@deepseek-ai/cordis-plugin-timer";
import draftsPlugin from "@melite/estate-drafts";
import Storage from "@deepseek-ai/dsh-storage";
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from "@deepseek-ai/dsh-storage-json";
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from "@deepseek-ai/dsh-storage-domain";
import estateBundle from "../../../../packages/web/melite-estate/src/index.ts";
import { hSkillRead } from "../../../../packages/harness/estate-queue/src/skillPlane.ts";
import type { DiscloseDirectoryService } from "../../../../packages/harness/estate-queue/src/index.ts";
import type { LoadResolverService } from "../../../../packages/harness/estate-queue/src/loadRegistry.ts";

let ctx: Context;
const stashed: Record<string, string | undefined> = {};

// repo is the WORKSPACE ROOT for the doc walkers (engineDirs /
// cardRows walk <repo>/packages/engines on disk — resolveRepoRoot
// derives the same root, file-anchored, in production).
const repo = join(import.meta.dirname, "..", "..", "..", "..");

beforeAll(async () => {
  for (const k of ["MELITE_STATE_ROOT", "DSH_HOME"]) stashed[k] = process.env[k];
  const root = mkdtempSync(join(tmpdir(), "load-roundtrip-wall-"));
  process.env["MELITE_STATE_ROOT"] = root;
  ctx = new Context();
  // cross-copy plugin shapes ride the honest Plugin cast — never
  // poisons the ctx.plugin overload into a required Config.
  await ctx.plugin(timerPlugin as unknown as Plugin);
  await ctx.plugin(Storage as unknown as Plugin);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as unknown as Plugin, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as unknown as Plugin, { backend: "json" });
  await ctx.plugin(draftsPlugin as unknown as Plugin);
  await ctx.plugin(estateBundle as unknown as Plugin);
  const deadline = Date.now() + 15_000;
  const seats = ["disclose", "meliteSkills", "load"];
  while (seats.some((n) => ctx.get(n, false) === undefined)) {
    if (Date.now() > deadline) assert.fail("the bundle never settled: " + seats.join(", "));
    await new Promise((r) => setTimeout(r, 50));
  }
});

afterAll(() => {
  for (const [k, v] of Object.entries(stashed)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

interface SkillLine { id?: string }

// C-M8 (the wall audit, 2026-09-28): the advertisement censuses,
// pinned exactly at the wall's own read (the ids are read above and
// every one of them round-tripped, so this number is the truth of
// the tree, not a guess). A card or flow that loses its skill line
// moves this and says so.
// 26 (2026-10-16): the h3 bundle's two vendored guide rows
// (model:h3:h3-guide-base.md / h3-guide-ref.md) ride the card's
// advertised skill set — the phantom-tool cure's serve side.
const EXPECTED_CARD_SKILLS = 26;
const EXPECTED_FLOW_SKILLS = 8;

describe("the id namespace law: load-advertised ids round-trip through the read door", () => {
  it("every CARD skill line it advertises, hSkillRead serves 200 with a body", async () => {
    const disclose = ctx.get("disclose") as DiscloseDirectoryService;
    const cards = disclose.discover("cards", "", "") as { cards: Array<{ id?: string; name?: string }> };
    const ids = (cards.cards ?? []).map((c) => c.id ?? c.name).filter(Boolean) as string[];
    // C-M8 (the wall audit, 2026-09-28): `>= 10` let the card plane
    // shrink silently. The census is the CARD REGISTRY's, exactly.
    const { loadCardDefs } = await import("../../../../packages/engines/comfyui-cordis/src/cardDefs.ts");
    assert.equal(ids.length, (await loadCardDefs()).size,
      "the card plane is the card registry, exactly (no floor, no drift)");
    const stateRoot = process.env["MELITE_STATE_ROOT"] as string;
    const loader = ctx.get("load") as LoadResolverService;
    let advertised = 0;
    for (const id of ids) {
      const bundle = loader.load("card", id).bundle as { skills?: SkillLine[] };
      for (const line of bundle.skills ?? []) {
        const sid = line.id;
        if (typeof sid !== "string" || sid.length === 0) continue;
        advertised += 1;
        const res = hSkillRead(repo, stateRoot, sid);
        assert.equal(res.status, 200, `load advertises ${sid} but the read door answers ${res.status}`);
        const payload = res.payload as { body?: string; content?: string };
        const body = payload.body ?? payload.content ?? "";
        assert.ok(typeof body === "string" && body.length > 0, `${sid} served 200 with an empty body`);
      }
    }
    // the law is only testable if the planes actually advertise —
    // and the advertisement is a CENSUS, not a floor: every
    // advertised id was read above, so the exact count is the
    // roster's own (a card that lost its skill line would show).
    assert.equal(advertised, EXPECTED_CARD_SKILLS,
      `exactly ${String(EXPECTED_CARD_SKILLS)} card skill ids advertised across ${String(ids.length)} cards`);
  });

  it("every FLOW skill line it advertises, hSkillRead serves 200 with a body", async () => {
    const disclose = ctx.get("disclose") as DiscloseDirectoryService;
    const flows = disclose.discover("flows", "", "") as { flows: Array<{ name?: string }> };
    const names = (flows.flows ?? []).map((f) => f.name).filter(Boolean) as string[];
    // C-M8: exact, against the flow registry (13 today).
    const { seedFlowsSeat } = await import("../../../../packages/harness/estate-queue/src/flowsData.ts");
    assert.equal(names.length, seedFlowsSeat().names().length,
      "the flow plane is the flow registry, exactly (no floor, no drift)");
    const stateRoot = process.env["MELITE_STATE_ROOT"] as string;
    const loader = ctx.get("load") as LoadResolverService;
    let advertised = 0;
    for (const name of names) {
      const bundle = loader.load("flow", name).bundle as { skills?: SkillLine[] };
      for (const line of bundle.skills ?? []) {
        const sid = line.id;
        if (typeof sid !== "string" || sid.length === 0) continue;
        advertised += 1;
        const res = hSkillRead(repo, stateRoot, sid);
        assert.equal(res.status, 200, `flow ${name} advertises ${sid} but the read door answers ${res.status}`);
        // C-C1 (the wall audit): this arm checked ONLY the status —
        // the card arm's body law (200 with a NON-EMPTY body) was
        // never copied over, so a 200 with an empty body passed for
        // every flow skill. Same law, same door.
        const payload = res.payload as { body?: string; content?: string };
        const body = payload.body ?? payload.content ?? "";
        assert.ok(typeof body === "string" && body.length > 0, `${sid} served 200 with an empty body`);
      }
    }
    assert.equal(advertised, EXPECTED_FLOW_SKILLS,
      `exactly ${String(EXPECTED_FLOW_SKILLS)} flow skill ids advertised — nothing to pin, nothing to lose`);
  });
});
