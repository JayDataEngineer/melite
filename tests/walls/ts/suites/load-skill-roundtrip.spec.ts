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
import { assertHermeticRode } from "../../../helpers/hermetic-engine.ts";
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
import { mountFamilyRoster } from "../lib/family-roster.ts";
import { hSkillRead } from "../../../../packages/harness/estate-queue/src/skillPlane.ts";
import type { DiscloseDirectoryService } from "../../../../packages/harness/estate-queue/src/index.ts";
import type { LoadResolverService } from "../../../../packages/harness/estate-queue/src/loadRegistry.ts";

let ctx: Context;
// J12: the runs root is the beforeAll's minted config root — the
// retired env seam no longer names it.
let stateRoot = "";
const stashed: Record<string, string | undefined> = {};

// repo is the WORKSPACE ROOT for the doc walkers (engineDirs /
// cardRows walk <repo>/packages/engines on disk — resolveRepoRoot
// derives the same root, file-anchored, in production).
const repo = join(import.meta.dirname, "..", "..", "..", "..");

beforeAll(async () => {
  for (const k of ["DSH_HOME"]) stashed[k] = process.env[k];
  stateRoot = mkdtempSync(join(tmpdir(), "load-roundtrip-wall-"));
  const root = stateRoot;
  ctx = new Context();
  // cross-copy plugin shapes ride the honest Plugin cast — never
  // poisons the ctx.plugin overload into a required Config.
  await ctx.plugin(timerPlugin as unknown as Plugin);
  await ctx.plugin(Storage as unknown as Plugin);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as unknown as Plugin, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as unknown as Plugin, { backend: "json" });
  // J12: the roots ride plugin configs (the retired env seams)
  await ctx.plugin(draftsPlugin as unknown as Plugin, { storageRoot: join(root, "storage") });
  // THE FAMILY ROWS — the composition the bundle censuses (the
  // patch roster; direct-mount rigs seat them themselves)
  await mountFamilyRoster(ctx);
  await ctx.plugin(estateBundle as unknown as Plugin, { stateRoot: root });
  // the settle budget holds the FULL battery's oversubscription
  // (10k-test fleet, transform-heavy), not just the idle tree
  const deadline = Date.now() + 60_000;
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
// 28 (2026-10-22): anima's A2 — the authored agents/AGENT.md entrance
// (model:anima) + the anima-prompt-writing skill ride the image-gen
// card's family lines (skillLinesForFamilies boards entrance + skills
// for every boarded family).
// 29 (2026-10-22): qwen-img-21's character-sheet skill (004/C7) —
// the family's first authored skill, boarded by image-gen.
// 30 (2026-11-02): h3's keyframe-flow skill — migrated from the
// retired h3-keyframe leaf (its craft survived its route; the
// spellings ride the live h3 door).
// 30 -> 32 (2026-11-09, the h3-timeline board==offer cure): the
// card boards its offered lane addresses, and each carried address
// advertises its own skill line (both round-tripped 200 + body in
// the arm above — the offer is real, so its skill line is real).
// 32 → 33 (2026-11-08, the third edit lane): the image-edit card's
// agent line now advertises the fibo2-edit prompt-enhance skill —
// the family-lane-law wall serves model:fibo2-edit from
// comfyui-cordis/models/image/fibo2-edit/agents/skills/prompt-enhance.
// 33 → 34 (2026-10-27, the CinemaDir lane): the h3-timeline card's
// cinemadir skill (src/agents/skills/cinemadir/SKILL.md) rides the
// card walk like its three siblings — round-tripped 200 + body in the
// arm above; row cards-cinemadir-skill walls its content.
// 34 → 35 (2026-10-27, the openjutsu lane, feature 023): the
// openjutsu card's openjutsu skill (src/agents/skills/openjutsu/
// SKILL.md) rides the card walk like its siblings — round-tripped
// 200 + body in the arm above; the byte-equal served twin is the
// seated wall's own arm (viggle-openjutsu-seated.spec.ts).
// 35 -> 36 (2026-10-28, the swap build): the h3-timeline swap
// SKILL.md joins the card-skill plane — the R0a/b/c doors ride
// AGENT.md only (the mask precedent: full doc under agents, never
// a tier-1 line), so the trio adds no lines.
// 36 -> 35 (2026-11-12): the openjutsu lane deleted by operator
// order — its card's skill line dies with the card.
// 35 -> 36 (2026-11-13, the reshoot build): the h3-timeline
// reshoot SKILL.md joins the card-skill plane — the census owed
// this bump the day it landed (the mixed tree hid it until the
// Tier-1 batch forced the recount).
// 36 -> 47 (2026-11-13, the qwen-img-edit-21 Tier-1 batch): the
// family's authored entrance (agents/AGENT.md) + ten craft skills
// (design-sheet, headshot, product-shot, poster, try-on,
// outfit-swap, relight, zooms, angles, whats-next) ride the
// image-edit card's load line — every id round-tripped 200 with a
// body in the arm above before the bump.
// 47 -> 48 (2026-11-12, the extend-video flow): the h3 family's
// extend-flow skill (when to extend vs re-roll, the anchor law)
// joins the h3-timeline card's load line with its landing.
// 48 -> 49 (2026-11-12, the tts friction dossier's B5 cure): the
// qvoice-cycle skill (the save→perform cycle, its grammar, its
// refusals, the address law) joins the tts card's load line — the
// id round-tripped 200 with a body in the arm above before this
// repin (the census's own law).
const EXPECTED_CARD_SKILLS = 49;
// 8 → 11 (2026-10-11): object-forge's skillRefs — image-gen +
// img-to-mesh card lines and z-image's prompt-enhance ride the flow
// bundle (card:quad-remesh resolves null — the card ships no agent
// doc — so it is not in the row's refs).
// 11 → 18 (2026-11-12, recounted at the extend-video landing): the
// mixed tree accumulated seven uncounted rides since the 11 pin
// (skill-ref rows and leaves landed with their flows without a
// census bump — the same mixed-tree drift the card-skills' 36→47
// recount met) plus the extend-video leaf SKILL.md; every advertised
// id round-tripped 200 with a body in the arm above before this
// repin (the census's own law).
// 18 -> 19 (2026-11-12, the tts friction dossier's B5 cure): the
// qvoice-cycle skill rides the tts card's line, and the
// audio-native-tts flow stages the tts card — its bundle advertises
// the card's skills, so the new skill rides this census too. The id
// round-tripped 200 with a body in the arm above before this repin.
const EXPECTED_FLOW_SKILLS = 19;

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

describe("the hermetic engine (the gate-37 flake cure: no live socket on the boot path)", () => {
  it("every prime rode the mock", () => {
    assertHermeticRode();
  });
});
