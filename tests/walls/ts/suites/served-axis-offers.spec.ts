// served-axis-offers.spec.ts — THE AXIS-OFFER WALLS (operator
// report, 2026-10-21: "I see a duped variant in the timeline node").
//
// The lesion: discovery's head-alias rule (the 2026-11-02 fold law)
// serves the family-address row (`<lane>__head`, route = the family
// id) carrying the resolving lane's label VERBATIM — and the rail's
// offer read (rowsFor → composingRows) offered it beside the lane
// itself. Two identical labels on one picker; worse, the alias id
// is refused by the compose door (the family matrix holds no such
// row), so the duped pick was a TRAP ROW that could only end in a
// refused run.
//
// THE CURE SEAT (2026-10-21): the alias row stays served (the
// address law — a migration address old drafts name must ride the
// served doc, never table-only) but is marked `alias: true`, and
// rowsFor (the one read every pick, ground, and chain seats on)
// skips alias rows. An alias is an ADDRESS, never an OFFER.
//
// Arm A — THE OFFER-UNITY LAW: for every card, every axis group's
// RENDERED offer set (composingRows under each reachable parent
// selection — the rail's own read, never the flat roster: a Quant
// cell composes only with its owning variant, so same-label cells
// on different lanes never co-render and are legal) carries no two
// rows with the same label. A duped label at one selection is
// either a trap alias or a colliding lane; both burn the operator
// at the picker.
//
// Arm B — THE ALIAS-NEVER-OFFERED LAW: no row marked alias:true
// appears in any rowsFor output. Guards the marker's honesty — a
// marked-but-offered alias is the same trap row.
//
// Arm C — THE ADDRESS-PARITY LAW (the fold law held): for every
// family whose id no DECL row routes, the served doc still carries
// a row routing the family id. Guards the deletion cure — dropping
// the alias to silence Arm A would strand old drafts at the door.
//
// Run: npx vitest run tests/walls/ts/suites/served-axis-offers.spec.ts
import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { getModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { formSpecArm } from "../../../../packages/harness/melite-tools/src/discovery.ts";
import { axisGroups, composingRows, rowsFor, type FormSpecDoc } from "../../../../packages/web/card-base/src/spec.ts";

// The wall judges the REAL checkout's declarations — never a
// fixture root a sibling spec may have left in the env.
process.env["MELITE_REPO_ROOT"] = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
);

const defs = await loadCardDefs();
/** The card roster (loadCardDefs' own map: card id → def) with the
 *  boarded edge resolved — the stateability wall's own join. */
const CARDS: Array<{ cardId: string; families: string[] }> = [];
for (const [cardId, def] of defs) {
  CARDS.push({ cardId, families: [...(def.boarded ?? [])] });
}

interface VariantDecl {
  id: string;
  route?: string;
  cells?: Array<{ route?: string }>;
}

interface FamilyDeclShape {
  id?: string;
  variants?: VariantDecl[];
}

function familyOf(id: string): FamilyDeclShape | null {
  const m = getModel(id);
  return (m ?? null) as FamilyDeclShape | null;
}

/** Every address a card serves its family matrix at — the card id
 *  and each boarded family id (the stateability wall's roster walk,
 *  one spelling). */
function addressesOf(cardId: string, families: string[]): string[] {
  return [cardId, ...families];
}

describe("the axis offer set carries one row per lane (offer unity)", () => {
  for (const { cardId, families } of CARDS) {
    for (const address of addressesOf(cardId, families)) {
      it(`'${address}' offers no duped axis labels`, async () => {
        const doc = (await formSpecArm(address)) as FormSpecDoc | null;
        if (doc === null) return; // an address with no served spec is Arm C's neighbor wall's law
        const groups = axisGroups(doc);
        for (const g of groups) {
          // every reachable parent selection: each prior axis' rows,
          // one active at a time (the chain's own law — an axis
          // filters only the axes BELOW it, so a group's offers
          // depend on the actives ABOVE it; walk them all)
          const selections: Array<Record<string, string | undefined>> = [{}];
          for (const prior of groups) {
            if (prior === g) break;
            const next: Array<Record<string, string | undefined>> = [];
            for (const sel of selections) {
              for (const row of rowsFor(doc, prior)) next.push({ ...sel, [prior]: row.id });
            }
            selections.splice(0, selections.length, ...next);
          }
          for (const sel of selections) {
            const rows = composingRows(doc, g, sel);
            const labels = rows.map((r) => r.label);
            const seen = new Set<string>();
            for (const label of labels) {
              assert.ok(
                !seen.has(label),
                `axis '${g}' on '${address}' under selection ${JSON.stringify(sel)} offers the label '${label}' twice — the picker shows a duped variant (rows: ${JSON.stringify(rows.map((r) => r.id))})`,
              );
              seen.add(label);
            }
          }
        }
      });
    }
  }
});

describe("an alias is an address, never an offer", () => {
  for (const { cardId, families } of CARDS) {
    for (const address of addressesOf(cardId, families)) {
      it(`'${address}' never offers a marked alias row`, async () => {
        const doc = (await formSpecArm(address)) as FormSpecDoc | null;
        if (doc === null) return;
        for (const g of axisGroups(doc)) {
          for (const row of rowsFor(doc, g)) {
            assert.ok(
              row.alias !== true,
              `row '${row.id}' on axis '${g}' of '${address}' is marked alias yet rides the offer read — a trap row the door refuses`,
            );
          }
        }
      });
    }
  }
});

describe("the family address still rides the served doc (address parity)", () => {
  for (const { families } of CARDS) {
    for (const famId of families) {
      it(`family '${famId}' keeps its unrouted id addressable`, async () => {
        const decl = familyOf(famId);
        if (decl === null) return;
        const routed = new Set<string>();
        for (const v of decl.variants ?? []) {
          if (v.route) routed.add(v.route);
          for (const c of v.cells ?? []) if (c.route) routed.add(c.route);
        }
        if (routed.has(famId)) return; // a row routes the family id — no alias owed
        // the fold law: the head alias must ride the doc
        const doc = (await formSpecArm(famId)) as FormSpecDoc | null;
        if (doc === null) return;
        const rows = doc.variants ?? [];
        const alias = rows.find((r) => r.route === famId);
        assert.ok(
          alias !== undefined,
          `family '${famId}' is unrouted by its own DECL rows but the served doc carries no row routing it — a draft naming the family address has no lane (the fold law, 2026-11-02)`,
        );
        assert.ok(
          alias.alias === true,
          `family '${famId}''s address row '${alias.id}' is not marked alias — it will ride the offer read as a trap row`,
        );
      });
    }
  }
});
