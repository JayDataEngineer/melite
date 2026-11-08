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
  // A per-request cap (15 s, 2026-11-16): a stalled upstream socket
  // is NOT a verdict — without the cap one hung range GET burns the
  // suite's whole 120 s budget and the arm dies as "timed out"
  // naming nothing. With the cap the stall surfaces as a named dead
  // entry (the same law as TC_POOL=3: a wall that destabilises the
  // suite is not a wall).
  const res = await fetch(url, { method: "GET", headers: { range: "bytes=0-0" }, redirect: "follow", signal: AbortSignal.timeout(15_000) });
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
  // 300 s (2026-11-16): this arm walks 152 pinned files SEQUENTIALLY
  // (range GETs, keyed by declaration order). Solo it finishes in
  // ~40 s; inside the full tier, 220 sibling suites compete for the
  // wire and the walk tripled past the describe's 120 s — a budget
  // miss, not a dead pin (every file answers under a 15 s cap). The
  // arm owns a wider clock rather than destabilising the tier.
  it("every pinned snapshot file is live at its pinned revision", { timeout: 300_000 }, async () => {
    // Registry ids, never route views: a route view re-carries its
    // family's rows, so a model-ids walk counts one declaration
    // three times.
    const rows = registryIds().flatMap((id) =>
      (registryModel(id).snapshot_provisions ?? []).map((row) => ({ family: id, ...row })),
    );
    // 2 -> 3 (2026-10-13): the kimodo rig joins — its snapshot row
    // pins nvidia/Kimodo-SOMA-RP-v1.1 at a 40-hex revision
    // 3 -> 4 (JOY-CAPTION GRADUATION, the weightless cure): the
    // beta-one tree joins — its snapshot row pins
    // fancyfeast/llama-joycaption-beta-one-hf-llava at a 40-hex
    // revision with 13 load-covering literals (every literal is
    // probed below; a dead file is a red wall, not a bigger census)
    // 4 -> 18 (burn d, 2026-10-26, the no-link all-green burn — how
    // models without links stayed all green): florence2's fourteen whole-repo trees
    // join, one pinned row per selectable checkpoint (the node's own
    // snapshot_download target, pre-seeded — every literal probed
    // below at its pinned revision).
    assert.equal(rows.length, 18, `the snapshot-row census moved (${rows.length} rows) — update this pin deliberately`);
    const dead: string[] = [];
    for (const row of rows) {
      // The row's own allow_patterns are the probed truth: literals
      // only (globs like stats/** enumerate, they do not HEAD).
      // kimodo carries config.yaml, not the generic config.json —
      // the probe follows the declaration, not a guess.
      const files = (row.allow_patterns ?? []).filter(
        (p: string) => !/[*?[]/.test(p),
      );
      if (files.length === 0) files.push("config.json", "model.safetensors");
      for (const file of files) {
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
