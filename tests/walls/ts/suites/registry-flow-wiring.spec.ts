import "../../../helpers/boot-models.ts";
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { expandRegistryFlow, seedFlowsSeat } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { composeFamilyStages, liveFamilySeat } from "../../../../packages/harness/estate-queue/src/flowsFamilyCompose.ts";

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
  const seat = seedFlowsSeat();
  const names = seat.names();
  it("every registry flow's node classes and input names satisfy the law", () => {
    // E-C6 (the wall audit, 2026-09-28): the doc snapshot lived at
    // data/tmp/ (gitignored) — a fresh clone judged ZERO flows and
    // passed on `names > 0` alone; the skip arm never fired on CI
    // because the wall itself was vacuous there. The wall now reads
    // a TRACKED MINIMAL SNAPSHOT (tests/walls/fixtures/
    // object_info.min.json — every class the registry flows
    // reference, its required/optional INPUT KEY SETS only). When a
    // full production snapshot IS present (data/tmp), the fixture
    // is held against it — a drifted fixture fails wherever the
    // full doc exists, and the fixture alone judges everywhere
    // else. Regenerate (the tracked door — the ONLY way these
    // bytes change):
    //   pnpm --filter @melite/comfyui-cordis exec node
    //     --experimental-strip-types scripts/regen-object-info-min.ts
    //   (--add ClassName seats a NEW class a flow references; a
    //   class the engine dropped fails loud, never a silent drop)
    // — a NEW class in a flow refuses until the fixture is
    // regenerated deliberately.
    const doc = JSON.parse(
      readFileSync(new URL("../../fixtures/object_info.min.json", import.meta.url), "utf8"),
    ) as Record<string, { r?: string[]; o?: string[] }>;
    const LIVE = DOC;
    if (existsSync(LIVE)) {
      const live = JSON.parse(readFileSync(LIVE, "utf8")) as Record<string, any>;
      for (const [ct, min] of Object.entries(doc)) {
        const inp = live[ct]?.input ?? {};
        const liveKeys = [...Object.keys(inp.required ?? {}), ...Object.keys(inp.optional ?? {})];
        const minKeys = [...(min.r ?? []), ...(min.o ?? [])];
        expect([...minKeys].sort(), `fixture drifted from the live snapshot at class ${ct} (regenerate it)`).toEqual([...liveKeys].sort());
      }
    }
    // E-M8 (the wall audit, 2026-09-28): the two EXCUSES are gone.
    // WIDGET_SERIALIZATION allowed three keys nobody declares
    // (0 of 1632 classes), and the dotted-prefix rule allowed ANY
    // sub-key of a declared one (zero dotted keys exist in the tree
    // today). An excuse nobody needs is a hole with a name on it:
    // a graph key typo rode as "a widget sub-key". Every input key
    // is now checked against the class's DECLARED keys, and the
    // dotted-prefix and widget carve can only return as a NAMED,
    // COUNTED exception (a class that really declares them).
    const declaredOf = (ct: string): Set<string> | null => {
      const d = doc[ct];
      if (d === undefined || d === null) return null;
      return new Set([...(d.r ?? []), ...(d.o ?? [])]);
    };
    let nodes = 0;
    let familyNodes = 0;
    let familyStages = 0;
    // E-M8: the dotted-sub-key rule is real (a combo widget's
    // sub-value rides as "key.sub"), so it is kept — but it is
    // PINNED: every dotted key in the tree is named below, and a new
    // one (or a prefix the class does not declare) refuses. An
    // unnumbered excuse is a hole; a numbered one is a census.
    const dottedKeys: string[] = [];
    for (const name of names) {
      const row = seat.get(name);
      if (row === undefined) continue;
      // (the atom vocabulary, stroke 4): a family-action stage
      // composes its graph from the family DECL here — the wall
      // judges the COMPOSED graph, not just hand literals, so a
      // drifted DECL node refuses exactly like a drifted hand node.
      // Seat law: the doors read ctx.get("models"); boot-models.ts
      // boots the SAME registry into the singleton the fallback
      // reads here, so liveFamilySeat() IS the door's seat on this
      // wire (the ctx path is exercised in the door specs).
      const expanded = expandRegistryFlow(row, seat);
      const composed = composeFamilyStages(expanded, liveFamilySeat().decls, liveFamilySeat().state);
      for (let i = 0; i < composed.stages.length; i++) {
        const isFamily = expanded.stages[i].family !== "";
        if (isFamily) familyStages += 1;
        const st = composed.stages[i] as Record<string, any>;
        const g = st?.params?.workflow;
        if (g === null || g === undefined || typeof g !== 'object') continue;
        for (const [nid, node] of Object.entries(g as Record<string, any>)) {
          if (node === null || typeof node !== "object") continue;
          const ct = node.class_type;
          const inputs = node.inputs;
          // E-M8: the old `continue` let a MALFORMED node (no
          // class_type, or non-object inputs) skip the wall silently
          // — a hand graph could go stale exactly here and stay
          // green. A malformed node now refuses, naming the flow and
          // the node: a graph is either judged or it is refused.
          if (typeof ct !== "string" || ct === "") {
            throw new Error(
              `registry flow ${name} node ${nid}: no class_type on a hand-authored graph node — the graph is stale`,
            );
          }
          if (inputs === null || typeof inputs !== "object" || Array.isArray(inputs)) {
            throw new Error(
              `registry flow ${name} node ${nid}: class ${ct} has no object inputs — the graph is stale`,
            );
          }
          nodes += 1;
          if (isFamily) familyNodes += 1;
          const declared = declaredOf(ct);
          // AN UNKNOWN CLASS IS THE WALL'S WHOLE POINT — the first
          // cut collected it into a list whose length then
          // SATISFIED the vacuity gate below: a stale hand graph
          // could never fail this wall. It refuses, loudly, naming
          // the flow and the node.
          if (declared === null) {
            throw new Error(
              `registry flow ${name} node ${nid}: class ${ct} is not declared by /object_info — the hand-authored graph is stale`,
            );
          }
          for (const key of Object.entries(inputs).map(([k]) => k)) {
            if (declared.has(key)) continue;
            const prefix = key.split(".")[0] ?? key;
            if (key.includes(".") && declared.has(prefix)) {
              // a combo widget's sub-value: the PREFIX must be
              // declared, and the exact key is pinned below
              dottedKeys.push(`${ct}.${key}`);
              continue;
            }
            throw new Error(
              `registry flow ${name} node ${nid}: ${ct}.${key} is not declared by /object_info — ` +
              "the hand-authored graph is stale (the widget excuse is gone; a dotted sub-key needs a declared prefix)",
            );
          }
        }
      }
    }
    console.log(`registry-flow wiring wall: ${names.length} flows, ${nodes} nodes judged against the snapshot (${familyNodes} composed from family actions)`)
    // E-M8: the censuses are EXACT (a floor let a fixture or a
    // graph shrink silently — the wall would judge less and say green).
    expect(Object.keys(doc).length, "the tracked fixture carries the flow classes (exact)").toBe(14);
    // the CUT roster's census (2026-10-13: five 3D/rig rows
    // retired; body-to-somax stays — the motion studio drives it)
    // + character-factory (2026-10-09: lift→rig→motion, audit 012)
    // + object-forge (2026-10-11: concept→lift→remesh, all card=)
    expect(names.length, "the registry flows judged, exact").toBe(10);
    // (the atom vocabulary, stroke 4 — completed): EVERY census
    // stage's backend is a declared action now — anny's estimator
    // chains + verbatim bake, and the meld verbs' coat/seat (their
    // cards were retired 2026-09-16; the weightless skin/fit
    // families are the sanctioned seam). Their nodes compose from
    // the family DECLs at expansion, and this wall judges the
    // composed graph on the EXPANDED plane (fromFlow hops
    // materialize, so character's body/skin/fit hops count in).
    // Zero hand-authored nodes remain — every census graph rides
    // the same hierarchy a card stage rides. The CUT roster
    // (2026-10-13) judges 6 family-composed nodes over 3 family
    // stages (anny-hmr-estimator's estimator chain + fit-seat's
    // seat + anny-params' compose; the retired character hop
    // lattice died with its row).
    expect(familyNodes, "the nodes composed from family actions, exact").toBe(6);
    // the STAGE census (exact): an action composing zero nodes would
    // shrink the node count silently — the stage count refuses it.
    expect(familyStages, "the stages composed from family actions, exact").toBe(3);
    expect(nodes - familyNodes, "the hand-authored nodes remaining, exact").toBe(0);
    expect(nodes, "the nodes judged, exact").toBe(6);
    // the dotted sub-keys: the remesh combo's sign_mode sub-values
    // died with the garment literal (the pixal3d mesh action owns
    // that node now). Zero is the current truth — a dotted sub-key
    // reappearing on a hand graph is a deliberate edit.
    expect([...new Set(dottedKeys)].sort(), "the dotted widget sub-keys the graphs use, exactly")
      .toEqual([]);
  });
});
