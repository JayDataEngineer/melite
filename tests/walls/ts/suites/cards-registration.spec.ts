// cards-registration.spec.ts — every card package's registration
// contract (2026-09-11; rebuilt 2026-09-28 on the live registry).
//
// The wall mounts NOTHING FAKE: the production composition itself
// (boot-models + loadCardDefs + theService) is the seat, and every
// cardPackages row is judged from the registry it registers into —
// the same rows the gateway serves. A renamed id, a dropped
// skeleton, a gutted identity, or an unlisted registerCard row all
// fail here before they boot clean.
//
// History: the first form hand-typed 8 card-only paths and mounted
// each card.ts against a fake ctx (inject/apply capture). The wall
// audit's A-C4/A-C5 killed that shape: the hand list had already
// drifted (the live `mask` card was absent; the count `8` duplicated
// the list), the rig exemption was BY NAME, and the model-carrying
// packages never fit the card.ts mount at all (the tool-bash law:
// their apply lives in the package entry, probing a real Context).
//
// Run: npx vitest run tests/walls/ts/suites/cards-registration.spec.ts
// (or the whole gate: pnpm run test)
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import "../../../helpers/boot-models.ts";
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import { cardPackages } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";

const HERE: string = dirname(fileURLToPath(import.meta.url));
const REPO: string = join(HERE, "..", "..", "..", "..");

/** '@melite/image-image-gen/card' → { pkg, genre } — the genre is
 *  derived from the specifier itself, never hand-listed. */
function pkgOf(specifier: string): { pkg: string; genre: string } {
  const noScope = specifier.replace(/^@melite\//, "").replace(/\/card$/, "");
  const at = noScope.indexOf("-");
  return { genre: noScope.slice(0, at), pkg: noScope.slice(at + 1) };
}

const CARDS: Array<{ pkg: string; genre: string }> = cardPackages.map(pkgOf);

/** The stage-view claim a card's client half declares, read from the
 *  bundle's own entry: the key its `defineStageViewRegistration` call
 *  registers under. That bundle cannot be imported into this
 *  engine-plane seat (it imports React and the client seams), so the
 *  claim is read as source; a package with no client entry claims
 *  nothing. Throws when an entry mentions the factory but its key does
 *  not parse — the drift this read would otherwise swallow. */
function stageViewClaim(card: { pkg: string; genre: string }): string | null {
  const entry: string = join(REPO, "packages", card.genre, card.pkg, "src", "client", "index.ts");
  if (!existsSync(entry)) return null;
  const src: string = readFileSync(entry, "utf8");
  if (!src.includes("defineStageViewRegistration(")) return null;
  const m = src.match(/defineStageViewRegistration\(\s*'([^']+)'/);
  assert.ok(m !== null,
    `${card.pkg}: the client entry calls defineStageViewRegistration but its key does not parse (a computed key cannot be joined here)`);
  return m[1]!;
}

interface RowLike {
  id: string;
  skeleton: string;
  boarded: readonly string[];
  schema: unknown;
  identity?: { label: string; description: string; genre: string; icon: string };
  flowKinds?: { requiresModel?: unknown };
  requiresModel?: boolean;
}

describe("every cardPackages row registers one honest row on the live registry", () => {
  beforeAll(async () => {
    await loadCardDefs();
  });

  it("the registry carries EXACTLY the cardPackages set (derived — never a hand count)", () => {
    const svc = theService();
    const ids = svc.cardIds();
    // one card, one package: the seat's own duplicate refusal plus
    // this equality — a card registered but unlisted (or a package
    // listed but not registering) both fail
    assert.equal(ids.length, cardPackages.length,
      `cardPackages lists ${cardPackages.length} but the registry carries ${ids.length}: ${JSON.stringify(ids)}`);
    const listed = CARDS.map((c) => c.pkg).sort();
    assert.deepEqual(ids, listed, "the registry's card ids are exactly the cardPackages rows");
  });

  for (const card of CARDS) {
    it(`${card.pkg}: the registered row carries the row laws`, () => {
      const row = theService().getCardDef(card.pkg) as RowLike | undefined;
      assert.ok(row !== undefined, `${card.pkg} is listed in cardPackages but registers no row`);
      assert.equal(typeof row.id, "string");
      assert.ok(row.id.length > 0, "id non-empty");
      assert.equal(typeof row.skeleton, "string");
      assert.ok(row.skeleton.length > 0, "skeleton non-empty (the compose emits it, never a fallback)");
      assert.ok(Array.isArray(row.boarded), "boarded is an array");
      // A BOARDED LIST IS NOT AN EMPTY LIST (the walls audit's M7,
      // 2026-10-10): `Array.isArray([])` passed for a gutted
      // identity — a card that boarded nothing booted clean here.
      // The PURE-TOOL cards are the honest exemption: a card that
      // declares requiresModel: false composes from loaded inputs
      // and downloads no model, so its list may be empty BY LAW —
      // the law is "a model-carrying card boards at least one
      // family".
      // A-C5 (the wall audit): the exemption was `card.pkg !== "rig"`
      // — BY NAME, an argument in this file. It branches on the ROW'S
      // OWN declaration now (top-level requiresModel or the
      // flowKinds.requiresModel nest, where the pure-tool cards
      // declare it). A pure-tool card MAY still board provisioned
      // families (anny/tagger — weights ride provisions), so the
      // declaration exempts the empty list, nothing else.
      const pureTool = row.requiresModel === false || row.flowKinds?.requiresModel === false;
      if (!pureTool) {
        assert.ok(row.boarded.length > 0,
          `${card.pkg} boards at least one family (an empty list on a model-carrying card is a gutted identity — declare requiresModel: false if it is pure-tool)`);
      }
      assert.ok(row.schema !== undefined && row.schema !== null, "schema present (the surface)");
      // The identity ring (assertCardIdentity enforces presence at
      // boot; this wall pins the genre against the specifier's own
      // derivation — the package cannot drift from its genre seat)
      const identity = row.identity;
      assert.ok(identity !== undefined, "identity present on the row");
      for (const key of ["label", "description", "genre", "icon"] as const) {
        const text = identity?.[key];
        assert.equal(typeof text, "string", `${card.pkg} identity.${key} is a string`);
        assert.ok((text as string).length > 0, `${card.pkg} identity.${key} is non-empty`);
      }
      assert.equal(identity?.genre, card.genre, `${card.pkg} genre is ${card.genre} (derived from its specifier)`);
    });
  }

  // THE CLAIM JOIN (the H3 composition audit F3, 2026-10-10): the unit
  // walls for this seam each mount ONE half against a fake — card-base
  // pins the factory's seam id, each studio's spec mounts its own
  // component directly — and the only true composition wall was the
  // browser e2e, which self-skips without E2E_STUDIO_URL. So nothing
  // held both real halves at once, and nothing joined the claim to the
  // id the rows carry: the bench renders a stage through
  // renderSlot('cards.stage.view', …, { entryKey: owner.cardName }) —
  // the row's CARD ID — so a claim registered under any other key is a
  // studio that never renders its surface, which is the timeline bar's
  // absence one seam over from the incident that opened this round.
  it("THE MANIFEST SWEEP (cards-census wave-2): every cardPackages specifier's package carries the ./card exports row and the built targets (input-prep shipped missing from four rosters; image-gen shipped a built lib/card.js with no exports row — the class has no firing arm)", () => {
    // derived universe: the SSOT itself — no hand list. A specifier
    // '@melite/<genre>-<pkg>/card' names the package dir directly.
    const failures: string[] = [];
    for (const specifier of cardPackages) {
      const { genre, pkg } = pkgOf(specifier);
      const dir: string = join(REPO, "packages", genre, pkg);
      const manifest: string = join(dir, "package.json");
      if (!existsSync(manifest)) { failures.push(`${genre}/${pkg}: no package.json`); continue; }
      const ex: unknown = JSON.parse(readFileSync(manifest, "utf8")).exports;
      const row: unknown = typeof ex === "object" && ex !== null
        ? (ex as Record<string, unknown>)["./card"] : undefined;
      if (row === undefined) { failures.push(`${genre}/${pkg}: src card mounted at '@melite/${genre}-${pkg}/card' but package.json exports carries no './card' row`); continue; }
      for (const target of ["lib/card.js", "lib/card.d.ts"]) {
        if (!existsSync(join(dir, target))) failures.push(`${genre}/${pkg}: exports './card' points at ${target} but the build never emitted it`);
      }
    }
    assert.deepEqual(failures, []);
  });

  it("every stage-view claim names the row's own id (the bench's lookup key)", () => {
    const claims: string[] = [];
    for (const card of CARDS) {
      const claim = stageViewClaim(card);
      if (claim === null) continue;
      const row = theService().getCardDef(card.pkg) as RowLike | undefined;
      assert.ok(row !== undefined, `${card.pkg} claims a stage view but registers no row`);
      assert.equal(claim, row.id,
        `${card.pkg} claims key '${claim}' but its row id is '${row.id}' (the claim must name the id the bench rows carry)`);
      claims.push(`${card.genre}/${card.pkg}=${claim}`);
    }
    // A POSITIVE PIN, not an exemption: the H3 card's claim is the
    // incident this arm exists for, so losing it — a dropped `apply`
    // export, a renamed key — fails here even while every other card
    // still joins.
    assert.ok(claims.includes("video/h3-timeline=h3-timeline"),
      `the stage-view claims were censused (got: ${claims.join(", ")})`);
  });
});
