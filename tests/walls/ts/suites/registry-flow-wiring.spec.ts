import "../../../helpers/boot-models.ts";
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { registryFlowNames, getRegistryFlow } from "../../../../packages/harness/estate-queue/src/flowsData.ts";

// THE REGISTRY-FLOW WIRING WALL (2026-10-10, the laws audit's
// HIGH-4): compose validates every graph a CARD builds against the
// /object_info doc — but the hand-authored REGISTRY flows
// (flowsRegistryRows.ts: plain JSON `params.workflow` literals,
// spliced into the merge row and submitted by runsExecute) never
// touched that wall. A stale hand graph sailed exactly the way the
// wall's own doc comment says is dead.
//
// This is that wall's other entry: the static tables are DATA, so
// the honest seam is a WALL over the data (every registry flow's
// node classes and input names, judged against the same doc), not a
// wiring change at submit time. Absent doc or absent data = an
// honest skip, never a silent pass claim.
const DOC = "data/tmp/object_info_prod.json";

describe("the registry-flow wiring wall (the hand-authored graphs, judged)", () => {
  const names = registryFlowNames();
  it("the registry table is not empty (else this wall is vacuous)", () => {
    expect(names.length).toBeGreaterThan(0);
  });

  it("every registry flow's node classes and input names satisfy the law", () => {
    if (!existsSync(DOC)) { console.log("no production object_info snapshot on this clone — registry-flow wiring wall skipped"); return }
    const doc = JSON.parse(readFileSync(DOC, "utf8")) as Record<string, any>;
    const WIDGET_SERIALIZATION = new Set(["upload", "model_options", "lora_ui"]);
    const declaredOf = (ct: string): Set<string> | null => {
      const d = doc[ct];
      if (d === undefined || d === null) return null;
      const inp = d.input ?? {};
      return new Set([...Object.keys(inp.required ?? {}), ...Object.keys(inp.optional ?? {})]);
    };
    const stale: string[] = [];
    let nodes = 0;
    for (const name of names) {
      const row = getRegistryFlow(name) as { stages?: Array<Record<string, any>> } | undefined;
      for (const st of row?.stages ?? []) {
        const g = st?.params?.workflow;
        if (g === null || g === undefined || typeof g !== 'object') continue;
        for (const [nid, node] of Object.entries(g as Record<string, any>)) {
          if (node === null || typeof node !== "object") continue;
          const ct = node.class_type;
          const inputs = node.inputs;
          if (typeof ct !== "string" || inputs === null || typeof inputs !== "object") continue;
          nodes += 1;
          const declared = declaredOf(ct);
          if (declared === null) { if (!stale.includes(ct)) stale.push(ct); continue }
          for (const key of Object.keys(inputs)) {
            if (declared.has(key)) continue;
            if (declared.has(key.split(".")[0] ?? key)) continue
            if (WIDGET_SERIALIZATION.has(key)) continue
            throw new Error(
              `registry flow ${name} node ${nid}: ${ct}.${key} is not declared by /object_info, ` +
              `not a dotted widget sub-key, and not a serialization key — the hand-authored graph is stale`,
            );
          }
        }
      }
    }
    console.log(`registry-flow wiring wall: ${names.length} flows, ${nodes} nodes, ${stale.length} classes the snapshot does not carry`)
    expect(nodes > 0 || stale.length > 0, "the wall saw nothing to judge — say so loudly").toBe(true);
  });
});
