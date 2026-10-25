// catalog-provisions-join.spec.ts — THE POSITIVE CATALOG→PROVISIONS
// JOIN (journey contract-gap audit A6, 2026-11-07, deferred with a
// named home — closed 2026-11-12). The join had no positive judge:
// url-liveness judged the DECL, the registry judged censuses, the
// dead-ref checks ran card→family — but "every catalog row the boot
// serves resolves to a provision artifact" was judged by NOBODY. A
// family that declares a downloadable surface while the projection
// filters it away (blank provision name/url — resolveArtifactRows
// skips those rows) serves in the catalog while the manage door's
// rail throws the union miss for every coordinate: drift invisible
// to every existing wall.
//
// DEPTH LAW: the surface derives from the DECL (getModel — the
// declaration plane), NOT from the projected catalog row; deriving
// both sides from the projection would mirror the resolver's own
// filter and pass while the truth burns. The join side walks the
// real resolver at the family default and every variant × quant.
//
// The arm rides the REAL boot (boot-models.ts — the full family
// table through the library face, never a frozen roster). The
// artifact-less utility class (no provisions, no cell artifacts —
// input/mask/concat) is derived from the DECL and counted, never
// skipped silently.
//
// Run: npx vitest run tests/walls/ts/suites/catalog-provisions-join.spec.ts

import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { modelsService } from "../../../../packages/engines/comfyui-cordis/src/models/service.ts";

describe("THE POSITIVE CATALOG→PROVISIONS JOIN (A6)", () => {
  it("every family that declares a downloadable surface resolves to a downloadable row at some coordinate; artifact-less families are derived and counted", (): void => {
    const svc = modelsService();
    const rows = svc.catalogModels();
    // the real boot's own floor: the family table serves (a silent
    // empty catalog would make the join vacuously green)
    assert.ok(rows.length >= 32, `the real boot serves the family table (got ${rows.length})`);

    const drift: string[] = [];
    const defaultMisses: string[] = [];
    const artifactLess: string[] = [];
    for (const row of rows) {
      // THE DECLARED SURFACE — the declaration plane, independent
      // of the projection the resolver reads
      const decl = svc.getModel(row.id);
      const declaresProvisions = (decl.provisions?.length ?? 0) > 0;
      const declaresArtifact = decl.variants.some((v) => v.cells.some((c) => c.artifact !== undefined && c.artifact !== null));
      if (!declaresProvisions && !declaresArtifact) {
        artifactLess.push(row.id);
        continue;
      }
      // THE JOIN: family defaults first, then every explicit
      // variant × quant — one hit anywhere satisfies the positive
      let hit = false;
      const coords: Array<[string, string]> = [["", ""]];
      for (const v of decl.variants) for (const c of v.cells) coords.push([v.id, c.quant]);
      for (const [variant, quant] of coords) {
        try {
          if (svc.resolveCatalogArtifact(row.id, variant, quant).length > 0) {
            hit = true;
            break;
          }
        } catch {
          // CatalogMiss / the not-a-Quant ValueError are the row's
          // own refusal texts — the join walks the next coordinate;
          // a coordinate that reds is only drift when ALL of them do
        }
      }
      if (!hit) drift.push(row.id);
      // THE DEFAULT TIER — the door's bare ask: the manage door's
      // no-coordinate request resolves the family default (first
      // variant, first cell — the matrix-fallback law). A family
      // that resolves only at DEEP coordinates leaves its bare ask
      // answering the union miss — the row serves, the door 404s.
      let defaultHit = false;
      try {
        defaultHit = svc.resolveCatalogArtifact(row.id).length > 0;
      } catch {
        // the union-miss text is the refusal under judgment — the
        // default tier records it as a named default-miss below
      }
      if (hit && !defaultHit) defaultMisses.push(row.id);
    }
    assert.deepEqual(
      drift,
      [],
      "families that DECLARE a downloadable surface (provisions rows or cell artifacts) but resolve NOWHERE — the A6 drift class: the manage door's rail throws the union miss for every coordinate of a row the catalog still serves",
    );
    assert.deepEqual(
      defaultMisses,
      [],
      "families whose DEFAULT (first variant, first cell) resolves nothing while deeper coordinates hit — the manage door's bare ask 404s on a row the catalog serves",
    );
    assert.ok(
      artifactLess.length > 0,
      "the derived artifact-less utility class is present and counted (the input/mask/concat planes — its absence would mean the derivation broke)",
    );
  });
});
