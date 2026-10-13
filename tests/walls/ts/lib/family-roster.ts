// family-roster.ts — the walls' family-row mounter (ROADMAP
// "Models-boot Loader composition", 2026-10-13). The estate bundle
// boots as a Loader composition: family plugins arrive as
// cordis.patch.yml rows (the DSH shape), the bundle's census gate
// awaits and censuses them. A wall that mounts the bundle directly
// (no Loader) must mount the SAME rows itself or the census
// refuses a table with no families (cards board models —
// validateBootContracts, the cards-vs-table law).
//
// One truth: the roster is READ from the estate's own patch file —
// never a hand-maintained list that rots (a new family package
// lands, every direct-mount wall keeps booting).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import type { Context, Plugin } from "@deepseek-ai/cordis";

/** A family row of the estate's cordis.patch.yml. */
interface PatchRow {
  id?: string;
  name?: string;
}

/** Mount every family row the estate's composition declares, in
 * patch order, into the given context.
 *
 * @param ctx — the wall's root context (the rows mount alongside
 * the estate bundle, exactly as the Loader would seat them).
 * @returns the mounted family fibers, in roster order. */
export async function mountFamilyRoster(ctx: Context): Promise<unknown[]> {
  const yml = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../../../../packages/web/melite-estate/cordis.patch.yml"),
    "utf8",
  );
  // cordis.patch.yml is a top-level LIST of patch ops; the insert
  // op carries the row maps
  const ops = parse(yml) as Array<{ insert?: PatchRow[] }>;
  const rows = (ops[0]?.insert ?? []).filter(
    (row) => row.id !== undefined && row.id.startsWith("family-") && row.name !== undefined,
  );
  const fibers: unknown[] = [];
  for (const row of rows) {
    const mod = (await import(row.name!)) as { default?: Plugin };
    fibers.push(ctx.plugin(mod.default!));
  }
  return fibers;
}
