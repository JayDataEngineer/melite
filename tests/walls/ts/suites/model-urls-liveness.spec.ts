// model-urls-liveness.spec.ts — THE URL-LIVENESS GATE (2026-10-12
// model audit, fix 5: a single 404 sat in-tree with zero CI
// signal).
//
// Every declared download URL — family provisions (the cardDefs
// union: DECL rows + variant-cell artifacts + card-owned rows) —
// must answer a keyless ranged GET with 2xx, and when the row
// declares size_bytes the served content-length must agree. This is
// the ONLY network-touching wall; set MELITE_WALLS_OFFLINE=1 to
// skip it on machines without egress (the skip is LOUD in the
// output, never silent).
//
// Run: npx vitest run tests/walls/ts/suites/model-urls-liveness.spec.ts

import { describe, it } from "vitest";
import assert from "node:assert/strict";
import "../../../helpers/boot-models.ts";
import { registryIds, registryModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { loadCardDefs, provisionsByFamily } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";

const OFFLINE = process.env["MELITE_WALLS_OFFLINE"] === "1";

/** One keyless range probe: resolves the final status + full
 *  content-length (a 0-byte range costs nothing to serve).
 *  @param url the declared download URL
 *  @returns status code and the served full size, or null when the
 *  server states no length. */
async function probe(
  url: string,
): Promise<{ status: number; length: number | null }> {
  const res = await fetch(url, { method: "GET", headers: { range: "bytes=0-0" }, redirect: "follow" });
  const cr = res.headers.get("content-range");
  if (cr !== null) {
    const total = Number.parseInt(cr.split("/")[1] ?? "", 10);
    await res.body?.cancel();
    return { status: res.status, length: Number.isNaN(total) ? null : total };
  }
  const cl = res.headers.get("content-length");
  await res.body?.cancel();
  return { status: res.status, length: cl === null ? null : Number.parseInt(cl, 10) };
}

describe.skipIf(OFFLINE)("THE URL-LIVENESS GATE (every declared download answers)", { timeout: 120_000 }, () => {
  it("every declared URL is live and size-honest", async () => {
    const byFamily = await provisionsByFamily(await loadCardDefs());
    const rows = Object.entries(byFamily).flatMap(([family, v]) =>
      (v.provisions ?? []).map((row) => ({ family, ...row })),
    );
    assert.ok(rows.length >= 60, `the declared-row census moved (${rows.length} rows) — update this floor deliberately`);

    const dead: string[] = [];
    const sizeLiars: string[] = [];
    const CONCURRENCY = 8;
    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const batch = rows.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(async (row) => {
        try {
          const seen = await probe(row.url);
          if (seen.status < 200 || seen.status >= 300) {
            dead.push(`${row.family}: ${row.url} -> HTTP ${seen.status}`);
          } else if (
            row.size_bytes !== undefined && seen.length !== null &&
            seen.length !== row.size_bytes
          ) {
            sizeLiars.push(
              `${row.family}: ${row.name} declares ${row.size_bytes} bytes, source serves ${seen.length}`,
            );
          }
        } catch (e) {
          dead.push(`${row.family}: ${row.url} -> ${e instanceof Error ? e.message : String(e)}`);
        }
      }));
    }
    assert.deepEqual(dead, [], `dead declared URLs (fresh provisioning would 404):\n${dead.join("\n")}`);
    assert.deepEqual(sizeLiars, [], `declared sizes disagree with the source:\n${sizeLiars.join("\n")}`);
  });

  // THE SNAPSHOT-REPOS ARM (the model-families audit fix 8).
  // Every snapshot_provisions row pins an upstream repo + revision.
  // The pinned files the node loads (config + weights) must answer
  // a keyless ranged GET at the pinned revision.
  // Same offline law as the URL arm: MELITE_WALLS_OFFLINE=1 skips.
  it("every pinned snapshot file is live at its pinned revision", async () => {
    // Registry ids, never route views: a route view re-carries its
    // family's rows, so a model-ids walk counts one declaration
    // three times.
    const rows = registryIds().flatMap((id) =>
      (registryModel(id).snapshot_provisions ?? []).map((row) => ({ family: id, ...row })),
    );
    assert.equal(rows.length, 2, `the snapshot-row census moved (${rows.length} rows) — update this pin deliberately`);
    const dead: string[] = [];
    for (const row of rows) {
      for (const file of ["config.json", "model.safetensors"]) {
        const url = `https://huggingface.co/${row.repo_id}/resolve/${row.revision}/${file}`;
        try {
          const seen = await probe(url);
          if (seen.status < 200 || seen.status >= 300) {
            dead.push(`${row.family}: ${url} -> HTTP ${seen.status}`);
          }
        } catch (e) {
          dead.push(`${row.family}: ${url} -> ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
    assert.deepEqual(dead, [], `dead pinned snapshot files (fresh snapshot provisioning would 404):\n${dead.join("\n")}`);
  });
});
