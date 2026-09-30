// flows-data.spec.ts — the flow registry: names/getter, from_flow
// expansion (happy + three LOUD dangles), the inline projection, the
// compile-time initials gate, and the skill-body render.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  expandRegistryFlow,
  linkedStage,
  getRegistryFlow,
  registerRegistryFlow,
  registryFlowNames,
  registryFlowToInline,
  extractRequestInitials,
  normalizedInitialValue,
  registryInitialsError,
  registrySkillBody,
} from "../src/flowsData.ts";
import type { RegistryFlow } from "../src/flowsData.ts";
import { composeFamilyStages } from "../src/flowsFamilyCompose.ts";
import { DECL as ANNY_DECL } from "../../../models/anny/src/index.ts";

let ROOT = "";
afterEach(() => {
  if (ROOT !== "") {
    rmSync(ROOT, { recursive: true, force: true });
    ROOT = "";
  }
});

const roots = (): { repoRoot: string; stateRoot: string } => {
  ROOT = mkdtempSync(join(tmpdir(), "flows-"));
  const state = mkdtempSync(join(tmpdir(), "flows-state-"));
  const olds = ROOT;
  ROOT = olds + ":" + state;
  return { repoRoot: olds, stateRoot: state };
};
const dropRoots = (): void => {
  for (const d of ROOT.split(":")) rmSync(d, { recursive: true, force: true });
  ROOT = "";
};

describe("registry", () => {
  it("names thirteen flows (craft-loop stroke 55, agent-spawn stroke 61); the getter answers unknowns with undefined", () => {
    const names = registryFlowNames();
    assert.equal(names.length, 13);
    assert.deepEqual([...names].sort(), names);
    assert.ok(getRegistryFlow("character") !== undefined);
    assert.equal(getRegistryFlow("ghost"), undefined);
  });

  // G1 (2026-10-11): the live seat. The REGISTRY literal is the BOOT
  // SEED, never the registry — a registration must serve at once and
  // its disposer must remove exactly that row (the fiber-owned
  // lifetime the live-reload doc demanded for flows).
  describe("live seat (G1)", () => {
    const liveFlow = (): RegistryFlow => {
      const base = getRegistryFlow("fit-seat")!;
      return { ...base, id: "live-probe", description: "G1 live seat probe" };
    };
    const disposers: Array<() => void> = [];
    const disposeAll = (): void => {
      while (disposers.length > 0) disposers.pop()!();
    };
    afterEach(disposeAll);

    it("a live registration serves at once and the disposer removes exactly that row", () => {
      assert.equal(getRegistryFlow("live-probe"), undefined);
      const seedBefore = registryFlowNames().length;
      disposers.push(registerRegistryFlow(liveFlow()));
      // served at once — names, getter, expansion (no restart, no rebuild)
      assert.ok(registryFlowNames().includes("live-probe"));
      assert.equal(registryFlowNames().length, seedBefore + 1);
      const got = getRegistryFlow("live-probe")!;
      assert.equal(got.description, "G1 live seat probe");
      assert.equal(expandRegistryFlow(got).id, "live-probe");
      // the disposer removes ONLY our row — the seed is untouched
      disposeAll();
      assert.equal(getRegistryFlow("live-probe"), undefined);
      assert.equal(registryFlowNames().length, seedBefore);
      assert.ok(getRegistryFlow("fit-seat") !== undefined);
    });

    it("a duplicate id refuses LOUD (one owner per flow id — the interlock)", () => {
      disposers.push(registerRegistryFlow(liveFlow()));
      assert.throws(() => registerRegistryFlow(liveFlow()), /registered twice/);
    });

    it("a stages-less flow refuses — a flow is a pipeline, an empty one is authoring noise", () => {
      const base = liveFlow();
      assert.throws(
        () => registerRegistryFlow({ ...base, stages: [] }),
        /no stages/,
      );
      assert.throws(
        () => registerRegistryFlow({ ...base, stages: undefined as never }),
        /no stages/,
      );
    });

    it("a disposed row cannot dispose a later twin (the disposer owns identity, not the id)", () => {
      const first = registerRegistryFlow(liveFlow());
      first();
      const second = registerRegistryFlow(liveFlow());
      first(); // stale disposer re-fire must NOT kill the live twin
      assert.ok(getRegistryFlow("live-probe") !== undefined);
      second();
      assert.equal(getRegistryFlow("live-probe"), undefined);
    });

    // THE SEAT-GAP WALL (the 2026-09-28 ledger audit): link
    // resolution read the FROZEN boot literal, so a live-registered
    // flow could never be a from_flow TARGET — the seat was
    // write-only for expansion, and the arm above could not see it
    // (fit-seat carries no links, so its expansion is trivial). A
    // drop-in that registers a flow ANOTHER flow links to is exactly
    // the composition the door exists for.
    it("a live-registered flow is a legal from_flow TARGET (link resolution reads the seat)", () => {
      const seed = getRegistryFlow("fit-seat")!;
      const stageId = seed.stages[0]!.id;
      // the SOURCE: registered live, never in the boot literal
      disposers.push(registerRegistryFlow({ ...seed, id: "live-link-src" }));
      // the LINKER: its only stage links into the live source
      disposers.push(registerRegistryFlow({
        ...seed,
        id: "live-linker",
        stages: [linkedStage("live-link-src", stageId, "linked-seat", {})],
      }));
      const expanded = expandRegistryFlow(getRegistryFlow("live-linker")!);
      const linked = expanded.stages[0]!;
      assert.equal(linked.fromFlow, null, "the link is resolved away");
      assert.equal(linked.engine, seed.stages[0]!.engine,
        "the linked stage CARRIES the source row's engine — proof the resolution read the live source, not a literal miss");
      // and the skill-body path (resolveLink) reads the seat too
      assert.ok(registrySkillBody(getRegistryFlow("live-linker")!).includes(linked.id),
        "the rendered skill body names the linked stage");
    });
  });

  it("expansion resolves from_flow links (single-hop) and copies rows", () => {
    const flow = getRegistryFlow("character")!;
    assert.equal(flow.stages.filter((s) => s.fromFlow !== null).length, 4);
    const expanded = expandRegistryFlow(flow);
    // copies ride the base (engine/card/outputs) under the link id.
    for (const st of expanded.stages) {
      assert.equal(st.fromFlow, null);
      assert.equal(st.engine, "comfyui");
    }
    const body = expanded.stages.find((s) => s.id === "body")!;
    assert.ok(Object.keys(body.inputs).length > 0);
  });

  it("dangling links throw LOUD (flow / stage / chained)", () => {
    const flesh = (stages: RegistryFlow["stages"]): RegistryFlow => ({
      id: "fake",
      description: "d",
      stages,
      initialValidators: {},
      tool: null,
      skillRefs: [],
    });
    const link = (flow: string, stage: string, id: string): RegistryFlow["stages"][number] => ({
      id,
      engine: "",
      card: "",
      description: "",
      inputs: {},
      expected: {},
      outputs: {},
      cardIo: {},
      params: {},
      skipWhen: null,
      fromFlow: { flow, stage },
    });
    assert.throws(
      () => expandRegistryFlow(flesh([link("ghost-flow", "s", "a")])),
      /links unknown flow ghost-flow/,
    );
    assert.throws(
      () => expandRegistryFlow(flesh([link("character", "ghost-stage", "a")])),
      /links unknown stage character\/ghost-stage/,
    );
    // character's coat is itself a link — linking it chains (refused).
    const coat = getRegistryFlow("character")!.stages.find((s) => s.fromFlow !== null)!;
    assert.throws(
      () =>
        expandRegistryFlow(
          flesh([link("character", coat.id, "a")]),
        ),
      /single-hop only/,
    );
  });
});

describe("registryFlowToInline", () => {
  it("projects edges, cards, card_io and skip_when", () => {
    const inline = registryFlowToInline(expandRegistryFlow(getRegistryFlow("character")!)) as {
      stages: Array<Record<string, unknown>>;
    };
    assert.ok(inline.stages.length > 0);
    const linked = inline.stages.find((s) => (s["id"] as string).includes("coat"));
    assert.ok(linked !== undefined && linked["engine"] === "comfyui");
    const skipped = inline.stages.filter((s) => "skip_when" in s);
    assert.equal(skipped.length, 2);
    assert.deepEqual(skipped[0]!["skip_when"], { initial: "starter_image", when: "present" });
    const tts = registryFlowToInline(getRegistryFlow("audio-native-tts")!) as {
      stages: Array<Record<string, unknown>>;
    };
    assert.deepEqual(tts.stages[0]!["card_io"], { wav: "audio" });
    assert.deepEqual(tts.stages[0]!["inputs"], { text: { initial: "prompt" } });
    assert.deepEqual(tts.stages[0]!["outputs"], { wav: "audio" });
    assert.equal(tts.stages[0]!["card"], "tts");
    const kimodo = registryFlowToInline(getRegistryFlow("kimodo-native")!) as {
      stages: Array<Record<string, unknown>>;
    };
    // (the atom vocabulary, stroke 3): the t2m stage is a motion card
    // stage now — the card's flowOutputBindings own the motion_npz
    // channel (card_io), and output_nodes died with the hand-wired
    // literal it annotated
    assert.deepEqual(kimodo.stages[0]!["outputs"], { motion_npz: "data" });
    assert.equal(kimodo.stages[0]!["card"], "motion");
    assert.deepEqual(kimodo.stages[0]!["card_io"], { motion_npz: "data" });
    assert.ok(
      !("output_nodes" in (kimodo.stages[0]!["params"] as Record<string, unknown>)),
    );
    const annyInline = registryFlowToInline(
      // The doors' own order (stroke 4): expand → compose → inline.
      // The census rows carry no outputs — the DECL derivation owns
      // them, and only the composed projection is door-legal.
      composeFamilyStages(expandRegistryFlow(getRegistryFlow("anny-hmr")!), [
        ANNY_DECL,
      ]),
    ) as {
      stages: Array<Record<string, unknown>>;
    };
    assert.ok(!("card" in annyInline.stages[0]!));
    // the composed family stage carries the derived outputs and the
    // workflow envelope (the seam's own projection)
    assert.deepEqual(annyInline.stages[0]!["outputs"], { body: "mesh" });
    const annyParams = annyInline.stages[0]!["params"] as {
      workflow: Record<string, unknown>;
    };
    assert.ok(
      typeof annyParams.workflow === "object" &&
        annyParams.workflow !== null &&
        "MultiHMR2ImageToAnny.0" in annyParams.workflow,
    );
    assert.ok(!("skip_when" in tts.stages[0]!));
  });
});

describe("registryInitialsError", () => {
  it("absent initials ride; photo files stage from every root", () => {
    const r = roots();
    try {
      const anny = getRegistryFlow("anny-hmr")!;
      assert.equal(registryInitialsError(anny, {}, r), null);
      assert.equal(registryInitialsError(anny, { photo: null }, r), null);
      // relative (repo-anchored) hit.
      writeFileSync(join(r.repoRoot, "pic.png"), "png");
      assert.equal(registryInitialsError(anny, { photo: "pic.png" }, r), null);
      // {path:} object hit.
      assert.equal(registryInitialsError(anny, { photo: { path: "pic.png" } }, r), null);
      // absolute hit.
      assert.equal(registryInitialsError(anny, { photo: join(r.repoRoot, "pic.png") }, r), null);
      // artifact-URL hit (state output root).
      mkdirSync(join(r.stateRoot, "output", "run1"), { recursive: true });
      writeFileSync(join(r.stateRoot, "output", "run1", "a.png"), "png");
      assert.equal(
        registryInitialsError(anny, { photo: "/v1/assets/runs/run1/a.png" }, r),
        null,
      );
    } finally {
      dropRoots();
    }
  });

  it("refusals name the fault (type / browser-local / ext / traversal / disk / URL)", () => {
    const r = roots();
    try {
      const anny = getRegistryFlow("anny-hmr")!;
      assert.match(registryInitialsError(anny, { photo: 42 }, r)!, /must be a file path string/);
      assert.match(
        registryInitialsError(anny, { photo: "data:image/png;base64,x" }, r)!,
        /browser-local/,
      );
      assert.match(
        registryInitialsError(anny, { photo: "blob:abc" }, r)!,
        /browser-local/,
      );
      assert.match(registryInitialsError(anny, { photo: "pic.txt" }, r)!, /not a stageable image/);
      assert.match(registryInitialsError(anny, { photo: "nodot" }, r)!, /got extension ""/);
      assert.match(
        registryInitialsError(anny, { photo: "../../pic.png" }, r)!,
        /refuses traversal/,
      );
      assert.match(registryInitialsError(anny, { photo: "missing.png" }, r)!, /not on disk/);
      assert.match(
        registryInitialsError(anny, { photo: "/v1/assets/runs/onlyrun.png" }, r)!,
        /malformed artifact URL/,
      );
      const fit = getRegistryFlow("fit-seat")!;
      // the bone is a REQUIRED initial, so the body cases carry one:
      // an absent bone refuses first, by name.
      // the present-value checks run FIRST, so a bad body hears
      // about the body; the required check answers the absent bone
      assert.match(
        registryInitialsError(fit, { body: "b.txt" }, r)!,
        /not a stageable mesh/,
      );
      writeFileSync(join(r.repoRoot, "b.glb"), "glb");
      writeFileSync(join(r.repoRoot, "p.glb"), "glb");
      assert.match(
        registryInitialsError(fit, { body: "b.glb", prop: "p.glb" }, r)!,
        /"bone" is REQUIRED by the "fit-seat" flow/,
      );
      assert.match(
        registryInitialsError(fit, { body: "b.txt", bone: "hand_r" }, r)!,
        /not a stageable mesh/,
      );
      // a text initial is a BARE NAME: a path never arrives where a
      // name belongs, and an empty one refuses.
      // an EMPTY bone is present-but-empty: the text-kind arm speaks
      // first, with the more specific voice.
      assert.match(
        registryInitialsError(fit, { body: "b.glb", prop: "p.glb", bone: "" }, r)!,
        /"bone" must be a non-empty name/,
      );
      // (the gate walks keys in declaration order, so the two files
      // are real on disk before the bone's own shape is judged)
      writeFileSync(join(r.repoRoot, "b.glb"), "glb");
      writeFileSync(join(r.repoRoot, "p.glb"), "glb");
      assert.match(
        registryInitialsError(fit, { body: "b.glb", prop: "p.glb", bone: "a/b" }, r)!,
        /"bone" is a bare name/,
      );
    } finally {
      dropRoots();
    }
  });

  it("bake_params rides the belt (valid passes, the rest refuse)", () => {
    const r = roots();
    try {
      const ap = getRegistryFlow("anny-params")!;
      const good = JSON.stringify({
        dialect: "authored",
        phenotype: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      });
      assert.equal(registryInitialsError(ap, { params_json: good }, r), null);
      assert.equal(
        registryInitialsError(ap, { params_json: JSON.parse(good) }, r),
        null,
      );
      assert.match(registryInitialsError(ap, { params_json: "nope" }, r)!, /refuses the preset dialect/);
      assert.match(
        registryInitialsError(ap, { params_json: (() => {}) as unknown as string }, r)!,
        /must be a params_json string or object/,
      );
    } finally {
      dropRoots();
    }
  });
});

describe("extractRequestInitials — the engine merge's linkable form", () => {
  it("carries the gate's own shapes as the strings the merge links", () => {
    // file initials: the two blessed spellings normalize to the path
    assert.equal(normalizedInitialValue("photo", "photo", "a/b.png"), "a/b.png");
    assert.equal(
      normalizedInitialValue("photo", "photo", { path: "a/b.png" }),
      "a/b.png",
    );
    // bake_params: a params_json string rides verbatim, an object
    // stringifies (the dialect the belt validates)
    assert.equal(normalizedInitialValue("params_json", "bake_params", "{}"), "{}");
    assert.equal(
      normalizedInitialValue("params_json", "bake_params", { a: 1 }),
      '{"a":1}',
    );
  });

  it("refuses a shape the gate would have refused (never a silent literal)", () => {
    assert.equal(normalizedInitialValue("photo", "photo", { nope: 1 }), null);
    assert.equal(normalizedInitialValue("photo", "photo", 7), null);
    assert.equal(normalizedInitialValue("photo", "photo", ["a"]), null);
    // an unstringifiable object (a function) is the null arm
    assert.equal(
      normalizedInitialValue("params_json", "bake_params", (() => {}) as unknown as object),
      null,
    );
  });

  it("extracts declared keys only; absent stays absent", () => {
    const ansy = getRegistryFlow("anny-hmr-commercial")!;
    const out = extractRequestInitials(ansy, { photo: { path: "p.png" } });
    assert.deepEqual(out, { initials: { photo: "p.png" } });
    // a body value for a key the flow does not declare never rides
    assert.deepEqual(extractRequestInitials(ansy, { photo: "p.png", sneaky: "x" }), {
      initials: { photo: "p.png" },
    });
    // absent initials: the $channel/branch arms own those
    assert.deepEqual(extractRequestInitials(ansy, {}), { initials: {} });
    assert.deepEqual(extractRequestInitials(ansy, { photo: null }), { initials: {} });
  });

  it("names the refusing initial in the door's own voice", () => {
    const ansy = getRegistryFlow("anny-hmr-commercial")!;
    const refused = extractRequestInitials(ansy, { photo: 12 });
    assert.ok("refusal" in refused);
    assert.match(refused.refusal, /"photo" must be a file path string or \{path: \.\.\.\} \(got number\)/);
    const ap = getRegistryFlow("anny-params")!;
    const refusedParams = extractRequestInitials(ap, {
      params_json: (() => {}) as unknown as string,
    });
    assert.ok("refusal" in refusedParams);
    assert.match(
      refusedParams.refusal,
      /"params_json" must be a params_json string or object/,
    );
  });
});

describe("registrySkillBody dangling links (L8 — refuse, never lie)", () => {
  it("a link to an unknown flow THROWS named (never renders the linking row as its own base)", () => {
    const plain = (
      id: string,
      description: string,
    ): RegistryFlow["stages"][number] => ({
      id,
      engine: "comfyui",
      card: "",
      description,
      inputs: {},
      expected: {},
      outputs: {},
      cardIo: {},
      params: {},
      skipWhen: null,
      fromFlow: null,
    });
    const ghostFlow: RegistryFlow = {
      id: "fake",
      description: "d",
      stages: [
        plain("z", ""),
        { ...plain("b", "bee"), fromFlow: { flow: "ghost-flow", stage: "x" } },
      ],
      initialValidators: {},
      tool: null,
      skillRefs: [],
    };
    assert.throws(
      () => registrySkillBody(ghostFlow),
      /stage 'b' links from unknown flow 'ghost-flow' \(known flows: /,
    );
    // and a link to an unknown STAGE of a known flow throws named too
    const ghostStage: RegistryFlow = {
      ...ghostFlow,
      stages: [
        plain("z", ""),
        { ...plain("c", "cee"), fromFlow: { flow: "character", stage: "ghost-stage" } },
      ],
    };
    assert.throws(
      () => registrySkillBody(ghostStage),
      /stage 'c' links from unknown stage 'character\/ghost-stage' \(known stages: /,
    );
    // a plain (unlinked) flow still renders its engine line verbatim
    const text = registrySkillBody({ ...ghostFlow, stages: [plain("z", "")] });
    assert.ok(text.includes("- z (comfyui)\n"));
  });
});

describe("registrySkillBody", () => {
  it("renders heads, edges, outputs, card_io and skip_when", () => {
    const expandedText = registrySkillBody(expandRegistryFlow(getRegistryFlow("character")!));
    assert.ok(expandedText.startsWith("# flow character\n"));
    assert.ok(expandedText.includes("## stages"));
    assert.ok(expandedText.includes("- coat (comfyui):"));
    assert.ok(expandedText.includes("skip when initial 'starter_image' is present"));
    const text = registrySkillBody(getRegistryFlow("character")!);
    assert.ok(text.includes("from skin-apply/coat"));
    const tts = registrySkillBody(getRegistryFlow("audio-native-tts")!);
    assert.ok(tts.includes("card_io wav: audio"));
    assert.ok(tts.includes("initial 'prompt'"));
    const up = registrySkillBody(expandRegistryFlow(getRegistryFlow("image-upscale")!));
    assert.ok(up.includes("stage "));
  });
});

// ── THE FLOW CONSTRUCTION WALL (2026-09-15) ─────────────────────
// The operator's burn: an agent wired inputs:{image:{stage:"stage-1"}}
// onto an image-edit bench row — no such stage, no $image spell, and
// every gate passed; the error surfaced at card-open on a DIFFERENT
// card. The bench now refuses construction-invalid wiring at write
// time (admitWiring). THIS wall holds the registry's own flows to
// the identical law: every registered flow's stages must wire only
// channels their params spell, against stages that exist in the
// flow — a flow that violates its own wiring vocabulary is dead on
// arrival, and no test ever noticed.
describe("the flow construction wall (flows wire what they spell)", () => {
  const spellsOf = (v: unknown, out: Set<string> = new Set()): Set<string> => {
    if (typeof v === "string") {
      if (v.startsWith("$")) out.add(v.slice(1));
    } else if (Array.isArray(v)) {
      for (const x of v) spellsOf(x, out);
    } else if (typeof v === "object" && v !== null) {
      for (const x of Object.values(v as Record<string, unknown>)) spellsOf(x, out);
    }
    return out;
  };

  it("every flow: each wired channel is spelled by its stage's params; every FromStage upstream exists in the flow", () => {
    const names = registryFlowNames();
    assert.ok(names.length > 0, "the registry serves flows");
    for (const name of names) {
      const decl = getRegistryFlow(name);
      assert.ok(decl !== undefined, name + " resolves");
      const flow = expandRegistryFlow(decl);
      const ids = flow.stages.map((s) => s.id);
      for (const st of flow.stages) {
        const spells = spellsOf(st.params);
        for (const [chan, edge] of Object.entries(st.inputs)) {
          const e = edge as { stage?: string; initial?: string };
          if (e.stage !== undefined) {
            assert.ok(
              ids.includes(e.stage),
              name + "/" + st.id + " wires '" + chan + "' from '" + e.stage + "' — no such stage in the flow",
            );
            assert.ok(e.stage !== st.id, name + "/" + st.id + " wires itself");
          } else {
            assert.ok(
              typeof e.initial === "string",
              name + "/" + st.id + " input '" + chan + "' is neither {stage} nor {initial}",
            );
          }
          assert.ok(
            spells.has(chan),
            name + "/" + st.id + " wires '" + chan + "' but no param spells '$" + chan + "' — the wiring feeds nothing",
          );
        }
      }
    }
  });
});
