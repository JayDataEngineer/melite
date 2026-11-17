// families-table-drift.spec.ts — the row↔DECL pairing is authored
// truth (2026-11-17): a family module whose DECL.id differs from its
// FAMILY_ROWS entry REFUSES the whole load — that is authoring
// drift, never runtime absence, so it never retires alone. The W9
// census wall pins both columns textually; this spec owns the live
// refusal half.
import { describe, it, expect, vi } from "vitest";

vi.mock("@melite/models-yue2", async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return { ...mod, DECL: { ...(mod.DECL as { id: string }), id: "yue-drift" } };
});

import { loadFamilies } from "../src/models/families/index.ts";

describe("a loaded DECL whose id drifted from its row refuses the load", () => {
  it("the drift refusal names the row, the DECL's id, and the pinned id", async () => {
    await expect(loadFamilies()).rejects.toThrow(
      /family table drift: @melite\/models-yue2 DECL\.id is 'yue-drift' but its row pins 'yue2'/,
    );
  });
});
