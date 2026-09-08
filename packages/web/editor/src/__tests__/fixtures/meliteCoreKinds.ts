// meliteCoreKinds — the vitest seed for the kinds lane. The TRUTH is
// py/card_kinds.py's TABLE (served on GET /v1/kinds); this fixture is the
// jsdom suite's stand-in for that wire (no server in vitest). The
// cross-door wall (tests/walls/suites/test_form_wire.py G) holds the
// manifest-kind ⊆ registry invariant server-side.
// Welded to the yaml by server-js/tests/gate.kinds.test.ts (lockstep —
// drift is CI failure; the icon-map precedent).
// Deliberately NO imports: bun loads this file cross-tree for the
// lockstep check — the seed type is declared INLINE (kept structurally
// identical to server-js KindDecl: same fields, same literal unions).
interface KindSeed {
  kind: string;
  runnable: boolean;
  executable: boolean;
  formSpec: boolean;
  compound: boolean;
  opensStudio: boolean;
  badgeTone: "default" | "brand";
  icon?: string;
  // Declarative runner family (the dispatcher's SSOT). Absent ===
  // "" (default rule: flowName → chain, executable card → generation).
  // The input kind overrides to its own runner. Lockstep with
  // py/card_kinds.py.
  // Mirror py/card_kinds.KindRunner — closed vocab (lockstep with
  // cardSeam.KindRunner; the fixture is the jsdom stand-in for the
  // /v1/kinds wire).
  runner?: "" | "input";
}
export const MELITE_CORE_KINDS: KindSeed[] = [
  { kind: "generation", runnable: true, executable: true, formSpec: true, compound: false, opensStudio: false, badgeTone: "default" },
  { kind: "chain", runnable: true, executable: true, formSpec: true, compound: false, opensStudio: false, badgeTone: "default" },
  { kind: "card-compose", runnable: true, executable: true, formSpec: true, compound: false, opensStudio: false, badgeTone: "default" },
  { kind: "studio-link", runnable: true, executable: false, formSpec: false, compound: false, opensStudio: true, badgeTone: "brand" },
  { kind: "preview", runnable: true, executable: true, formSpec: false, compound: false, opensStudio: false, badgeTone: "default" },
  { kind: "input", runnable: true, executable: true, formSpec: false, compound: false, opensStudio: false, badgeTone: "default", runner: "input" },
  { kind: "body", runnable: false, executable: false, formSpec: false, compound: false, opensStudio: false, badgeTone: "default", icon: "Box" },
  { kind: "compound", runnable: true, executable: true, formSpec: false, compound: true, opensStudio: false, badgeTone: "default" },
]
