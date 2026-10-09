// flows-data.spec.ts — the flow registry: names/getter, from_flow
// expansion (happy + three LOUD dangles), the inline projection, the
// compile-time initials gate, and the skill-body render.
import { describe, it, afterEach, afterAll } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  expandRegistryFlow,
  FlowsSeatService,
  seedFlowsSeat,
  fromStage,
  linkedStage,
  plainStage,
  registryFlowToInline,
  extractRequestInitials,
  normalizedInitialValue,
  registryInitialsError,
  registrySkillBody,
} from "../src/flowsData.ts";
import type { RegistryFlow } from "../src/flowsData.ts";
import { CARD_PLANE_ENGINE } from "@melite/contracts/benchStage";
import { composeFamilyStages } from "../src/flowsFamilyCompose.ts";
import { DECL as ANNY_DECL } from "../../../models/anny/src/index.ts";
import { Context } from "@deepseek-ai/cordis";

// THE PURE READS RIDE THE SEED SEAT (J4): a read-only face over the
// boot literal — service-owning code reads ctx.get("meliteFlows").
const SEED = seedFlowsSeat();
// a live-ctx for tests that need a registration surface
const LIVE = new FlowsSeatService(new Context());

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

const ANNY_ESTIMATE_FLOW = (): RegistryFlow => ({
  // the retired anny-hmr row's shape verbatim (the 2026-10-13
  // template cut removed the ROW; the interpreter stays live and the
  // 2026-10-04 commercial-only ruling re-pointed the probe at the
  // surviving action — the anny card's hmr-estimate chip drives it
  // through the commercial lane's verbs)
  id: "anny-estimate-probe",
  description: "d",
  stages: [plainStage({
    id: "estimate",
    engine: CARD_PLANE_ENGINE,
    family: "anny",
    action: "estimate_commercial",
    description: "SAM 3D Body → grounded anny (the commercial estimator)",
    inputs: { photo: { initial: "photo" } },
    expected: { photo: "image" },
    params: { photo: "$photo" },
  })],
  initialValidators: { photo: "photo" },
  tool: null,
  skillRefs: [],
});

describe("registry", () => {
  // EIGHT (2026-10-13, operator template cut): five 3D/rig template
  // rows retired for the Blender-MCP lane (anny-hmr, character,
  // kimodo-native, skin-apply, agent-spawn); the anny lanes the
  // chips drive survive, and body-to-somax stays — the motion
  // studio's import door drives it live.
  // + character-factory (2026-10-09: lift→rig→motion, audit 012).
  it("names nine flows; the getter answers unknowns with undefined", () => {
    const seat = seedFlowsSeat();
    const names = seat.names();
    assert.equal(names.length, 9);
    assert.deepEqual([...names].sort(), names);
    assert.ok(seat.get("anny-hmr-commercial") !== undefined);
    assert.equal(seat.get("ghost"), undefined);
  });

  // G1 (2026-10-11): the live seat. The REGISTRY literal is the BOOT
  // SEED, never the registry — a registration must serve at once and
  // its disposer must remove exactly that row (the fiber-owned
  // lifetime the live-reload doc demanded for flows).
  describe("live seat (G1)", () => {
    // THE SEAT IS A SERVICE (J4 cure): registrations live on one
    // host fiber — a real Context per describe, disposed whole.
    const ctx = new Context();
    const svc = new FlowsSeatService(ctx);
    const liveFlow = (): RegistryFlow => {
      const base = svc.get("fit-seat")!;
      return { ...base, id: "live-probe", description: "G1 live seat probe" };
    };
    const disposers: Array<() => void> = [];
    const disposeAll = (): void => {
      while (disposers.length > 0) disposers.pop()!();
    };
    afterEach(disposeAll);
    afterAll(async () => {
      await ctx.fiber.dispose();
    });

    it("a live registration serves at once and the disposer removes exactly that row", () => {
      assert.equal(svc.get("live-probe"), undefined);
      const seedBefore = svc.names().length;
      disposers.push(svc.register(liveFlow()));
      // served at once — names, getter, expansion (no restart, no rebuild)
      assert.ok(svc.names().includes("live-probe"));
      assert.equal(svc.names().length, seedBefore + 1);
      const got = svc.get("live-probe")!;
      assert.equal(got.description, "G1 live seat probe");
      assert.equal(expandRegistryFlow(got, svc).id, "live-probe");
      // the disposer removes ONLY our row — the seed is untouched
      disposeAll();
      assert.equal(svc.get("live-probe"), undefined);
      assert.equal(svc.names().length, seedBefore);
      assert.ok(svc.get("fit-seat") !== undefined);
    });

    it("a duplicate id refuses LOUD (one owner per flow id — the interlock)", () => {
      disposers.push(svc.register(liveFlow()));
      assert.throws(() => svc.register(liveFlow()), /registered twice/);
    });

    it("a stages-less flow refuses — a flow is a pipeline, an empty one is authoring noise", () => {
      const base = liveFlow();
      assert.throws(
        () => svc.register({ ...base, stages: [] }),
        /no stages/,
      );
      assert.throws(
        () => svc.register({ ...base, stages: undefined as never }),
        /no stages/,
      );
    });

    it("a disposed row cannot dispose a later twin (the disposer owns identity, not the id)", () => {
      const first = svc.register(liveFlow());
      first();
      const second = svc.register(liveFlow());
      first(); // stale disposer re-fire must NOT kill the live twin
      assert.ok(svc.get("live-probe") !== undefined);
      second();
      assert.equal(svc.get("live-probe"), undefined);
    });

    // THE SEAT-GAP WALL (the 2026-09-28 ledger audit): link
    // resolution read the FROZEN boot literal, so a live-registered
    // flow could never be a from_flow TARGET — the seat was
    // write-only for expansion, and the arm above could not see it
    // (fit-seat carries no links, so its expansion is trivial). A
    // drop-in that registers a flow ANOTHER flow links to is exactly
    // the composition the door exists for.
    it("a live-registered flow is a legal from_flow TARGET (link resolution reads the seat)", () => {
      const seed = svc.get("fit-seat")!;
      const stageId = seed.stages[0]!.id;
      // the SOURCE: registered live, never in the boot literal
      disposers.push(svc.register({ ...seed, id: "live-link-src" }));
      // the LINKER: its only stage links into the live source
      disposers.push(svc.register({
        ...seed,
        id: "live-linker",
        stages: [linkedStage("live-link-src", stageId, "linked-seat", {})],
      }));
      const expanded = expandRegistryFlow(svc.get("live-linker")!, svc);
      const linked = expanded.stages[0]!;
      assert.equal(linked.fromFlow, null, "the link is resolved away");
      assert.equal(linked.engine, seed.stages[0]!.engine,
        "the linked stage CARRIES the source row's engine — proof the resolution read the live source, not a literal miss");
      // and the skill-body path (resolveLink) reads the seat too
      assert.ok(registrySkillBody(svc.get("live-linker")!, svc).includes(linked.id),
        "the rendered skill body names the linked stage");
    });
  });

  // THE RAW-WORKFLOW REFUSAL (the strictness audit's fix 8): a
  // stage naming neither card nor family+action on the card-plane
  // engine is the retired authoring shape — it refuses at
  // expansion, named, never serves. The engine-verb plane (craft,
  // agent — stages the runs door drives by engine alone) stays
  // legal: craft-loop and agent-spawn are the live proof (the
  // thirteen-flow expansion walks them clean).
  it("a card-plane stage naming neither card nor family+action refuses at expansion, named", () => {
    const base = SEED.get("fit-seat")!;
    const flow: RegistryFlow = {
      ...base,
      id: "raw-workflow-probe",
      stages: [plainStage({
        id: "raw",
        engine: CARD_PLANE_ENGINE,
        description: "the retired shape",
        inputs: {},
        params: { workflow: {} },
      })],
    };
    assert.throws(
      () => expandRegistryFlow(flow, SEED),
      /raw-workflow-probe stage raw names neither card nor family\+action on engine comfyui .* retired/,
    );
  });

  it("a family stage without an action refuses at expansion, named", () => {
    const base = SEED.get("fit-seat")!;
    const flow: RegistryFlow = {
      ...base,
      id: "family-no-action-probe",
      stages: [plainStage({
        id: "half",
        engine: CARD_PLANE_ENGINE,
        family: "anny",
        description: "the family plane needs both halves",
        inputs: {},
        params: {},
      })],
    };
    assert.throws(
      () => expandRegistryFlow(flow, SEED),
      /family-no-action-probe stage half declares family anny with no action/,
    );
  });

  it("an engine-verb stage (no card, no family) expands clean — craft/agent ride the runs door", () => {
    const base = SEED.get("fit-seat")!;
    const flow: RegistryFlow = {
      ...base,
      id: "engine-verb-probe",
      stages: [plainStage({
        id: "verb",
        engine: "craft",
        description: "an engine the runs door drives directly",
        inputs: {},
        outputs: { default: "image" },
        params: {},
      })],
    };
    const expanded = expandRegistryFlow(flow, SEED);
    assert.equal(expanded.stages[0]!.id, "verb");
    assert.equal(expanded.stages[0]!.engine, "craft");
  });

  it("expansion resolves from_flow links (single-hop) and copies rows", () => {
    // the template cut left no seed row carrying links — the lattice
    // is minted here from survivors (the live-seat wall below mints
    // the same shape; this one pins expansion semantics alone)
    const flow: RegistryFlow = {
      id: "link-probe",
      description: "d",
      stages: [
        linkedStage("anny-hmr-commercial", "estimate", "body", {
          photo: { stage: "img", output: "photo" },
        }),
        linkedStage("fit-seat", "seat", "seat", {}),
      ],
      initialValidators: {},
      tool: null,
      skillRefs: [],
    };
    assert.equal(flow.stages.filter((s) => s.fromFlow !== null).length, 2);
    const expanded = expandRegistryFlow(flow, SEED);
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
      family: "",
      action: "",
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
      () => expandRegistryFlow(flesh([link("ghost-flow", "s", "a")]), SEED),
      /links unknown flow ghost-flow/,
    );
    assert.throws(
      () => expandRegistryFlow(flesh([link("anny-hmr-commercial", "ghost-stage", "a")]), SEED),
      /links unknown stage anny-hmr-commercial\/ghost-stage/,
    );
    // a stage that is ITSELF a link — linking it chains (refused).
    // The source is live-registered: no seed row carries links since
    // the template cut, and live seats are the composition the door
    // exists for (the seat-gap wall's own shape).
    const disposeChain = LIVE.register({
      ...SEED.get("anny-hmr-commercial")!,
      id: "chain-link-src",
      stages: [linkedStage("anny-hmr-commercial", SEED.get("anny-hmr-commercial")!.stages[0]!.id, "chained", {})],
    });
    try {
      assert.throws(
        () => expandRegistryFlow(flesh([link("chain-link-src", "chained", "a")]), LIVE),
        /single-hop only/,
      );
    } finally {
      disposeChain();
    }
  });
});

describe("registryFlowToInline", () => {
  it("projects edges, cards, card_io and skip_when", () => {
    // the retired character row was the only skip_when carrier — the
    // lattice is minted here (the projection law it pinned stays)
    const skipFlow: RegistryFlow = {
      id: "skip-probe",
      description: "d",
      stages: [
        plainStage({
          id: "img", engine: CARD_PLANE_ENGINE, card: "image-gen",
          description: "d",
          inputs: { character_prompt: { initial: "character_prompt" } },
          expected: { character_prompt: "text" },
          outputs: { photo: "image" }, cardIo: { photo: "image" },
          params: { prompt: "$character_prompt" },
          skipWhen: { initial: "starter_image", when: "present" },
        }),
        plainStage({
          id: "gimg", engine: CARD_PLANE_ENGINE, card: "image-gen",
          description: "d",
          inputs: { garment_prompt: { initial: "garment_prompt" } },
          expected: { garment_prompt: "text" },
          outputs: { gimg: "image" }, cardIo: { gimg: "image" },
          params: { prompt: "$garment_prompt" },
          skipWhen: { initial: "garment_image_1", when: "present" },
        }),
        linkedStage("anny-hmr-commercial", "estimate", "body", {
          photo: { stage: "img", output: "photo" },
        }),
      ],
      initialValidators: {},
      tool: null,
      skillRefs: [],
    };
    const inline = registryFlowToInline(expandRegistryFlow(skipFlow, SEED)) as {
      stages: Array<Record<string, unknown>>;
    };
    assert.ok(inline.stages.length > 0);
    const linked = inline.stages.find((s) => (s["id"] as string).includes("body"));
    assert.ok(linked !== undefined && linked["engine"] === "comfyui");
    const skipped = inline.stages.filter((s) => "skip_when" in s);
    assert.equal(skipped.length, 2);
    assert.deepEqual(skipped[0]!["skip_when"], { initial: "starter_image", when: "present" });
    const tts = registryFlowToInline(SEED.get("audio-native-tts")!) as {
      stages: Array<Record<string, unknown>>;
    };
    assert.deepEqual(tts.stages[0]!["card_io"], { wav: "audio" });
    // the initial is named for the channel it feeds (2026-10-04): the
    // row's `$text` spell resolves against a `text` initial, not `prompt`
    assert.deepEqual(tts.stages[0]!["inputs"], { text: { initial: "text" } });
    assert.deepEqual(tts.stages[0]!["outputs"], { wav: "audio" });
    assert.equal(tts.stages[0]!["card"], "tts");
    // (the atom vocabulary, stroke 3): the motion card stage — the
    // card's flowOutputBindings own the motion_npz channel (card_io),
    // and output_nodes died with the hand-wired literal it annotated.
    // The kimodo-native TEMPLATE row retired with the 3D cut; the
    // motion CARD survives and the projection law is minted here.
    const motionFlow: RegistryFlow = {
      id: "motion-probe",
      description: "d",
      stages: [plainStage({
        id: "t2m", engine: CARD_PLANE_ENGINE, card: "motion",
        description: "d",
        inputs: { prompt: { initial: "prompt" } },
        expected: { prompt: "text" },
        outputs: { motion_npz: "data" }, cardIo: { motion_npz: "data" },
        params: { model: "kimodo" },
      })],
      initialValidators: {},
      tool: null,
      skillRefs: [],
    };
    const kimodo = registryFlowToInline(motionFlow) as {
      stages: Array<Record<string, unknown>>;
    };
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
      composeFamilyStages(expandRegistryFlow(ANNY_ESTIMATE_FLOW(), SEED), [
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
        // the commercial estimator's node (the MultiHMR2 arm was
        // deleted 2026-10-04 — operator: commercial route only)
        "Sam3dBodyImageToAnny.0" in annyParams.workflow,
    );
    assert.ok(!("skip_when" in tts.stages[0]!));
  });
});

describe("registryInitialsError", () => {
  it("absent initials ride; photo files stage from every root", () => {
    const r = roots();
    try {
      const anny = SEED.get("anny-hmr-commercial")!;
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
      // the LIVE prefix answers too (the legacy spelling above kept
      // only its own twin; the live media door was never read here)
      assert.equal(
        registryInitialsError(anny, { photo: "/melite-media/runs/run1/a.png" }, r),
        null,
      );
    } finally {
      dropRoots();
    }
  });

  it("refusals name the fault (type / browser-local / ext / traversal / disk / URL)", () => {
    const r = roots();
    try {
      const anny = SEED.get("anny-hmr-commercial")!;
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
      const fit = SEED.get("fit-seat")!;
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
      // a NON-STRING bone is present-but-wrong: the text-kind arm
      // speaks, rather than a path or a number riding as a name
      assert.match(
        registryInitialsError(fit, { body: "b.glb", prop: "p.glb", bone: 42 as never }, r)!,
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
      const ap = SEED.get("anny-params")!;
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
    // a TEXT-kind initial refuses a bare number (a bare NAME is the
    // only legal spelling); fit-seat's bone is the live text initial
    assert.equal(normalizedInitialValue("bone", "text", 42), null);
    const refused = extractRequestInitials(SEED.get("fit-seat")!, { bone: 42 });
    assert.ok("refusal" in refused, "the text initial refuses a number");
    assert.match(refused.refusal, /"bone" must be a bare name \(got number\)/);
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
    const ansy = SEED.get("anny-hmr-commercial")!;
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

  it("every CARD flow declares the initials its $spell names (2026-10-04)", () => {
    // The merge-hole cure. A card flow's stage wires
    // `initial("prompt")` and spells `$prompt` in its params, so its
    // row MUST declare `initialValidators: { prompt: "text" }` — the
    // extractor walks ONLY that map, so an undeclared initial is never
    // lifted and the run dies at the merge with "workflow carries
    // $prompt — neither a FromStage-wired input name nor a request
    // initial". This walks the registry and pins the law for every
    // card-bearing row, so a future row cannot repeat the hole.
    const cardFlows = ["audio-native-tts", "image-upscale", "music-native", "body-to-somax"];
    for (const id of cardFlows) {
      const flow = SEED.get(id)!;
      const declared = Object.keys(flow.initialValidators);
      for (const st of flow.stages) {
        for (const edge of Object.values(st.inputs)) {
          // ONLY initial-fed channels need a validator: a FromStage
          // channel ($image in image-upscale's polish) is resolved by
          // the merge's LINKS, and demanding an initial for it would
          // be a false law.
          if (!("initial" in edge)) continue;
          assert.ok(
            declared.includes(edge.initial),
            id + "/" + st.id + " wires initial(\"" + edge.initial +
              "\") but the row declares no validator for it — the extractor " +
              "walks initialValidators only, so the run would die at the merge",
          );
        }
      }
    }
    // and the tts flow's own text initial LIFTS end to end (the key the
    // tool face advertises — channel, initial, spell and caller key are
    // all `text`, the anny-hmr convention)
    const tts = SEED.get("audio-native-tts")!;
    assert.deepEqual(extractRequestInitials(tts, { text: "hello world" }), {
      initials: { text: "hello world" },
    });
    const toolRow = tts.tool as unknown as { required?: string[] } | null;
    assert.deepEqual(toolRow?.required, ["text"]);
  });

  it("names the refusing initial in the door's own voice", () => {
    const ansy = SEED.get("anny-hmr-commercial")!;
    const refused = extractRequestInitials(ansy, { photo: 12 });
    assert.ok("refusal" in refused);
    assert.match(refused.refusal, /"photo" must be a file path string or \{path: \.\.\.\} \(got number\)/);
    const ap = SEED.get("anny-params")!;
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
      family: "",
      action: "",
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
      () => registrySkillBody(ghostFlow, SEED),
      /stage 'b' links from unknown flow 'ghost-flow' \(known flows: /,
    );
    // and a link to an unknown STAGE of a known flow throws named too
    const ghostStage: RegistryFlow = {
      ...ghostFlow,
      stages: [
        plain("z", ""),
        { ...plain("c", "cee"), fromFlow: { flow: "anny-hmr-commercial", stage: "ghost-stage" } },
      ],
    };
    assert.throws(
      () => registrySkillBody(ghostStage, SEED),
      /stage 'c' links from unknown stage 'anny-hmr-commercial\/ghost-stage' \(known stages: /,
    );
    // a plain (unlinked) flow still renders its engine line verbatim
    const text = registrySkillBody({ ...ghostFlow, stages: [plain("z", "")] }, SEED);
    assert.ok(text.includes("- z (comfyui)\n"));
  });
});

describe("registrySkillBody", () => {
  it("renders heads, edges, outputs, card_io and skip_when", () => {
    // the retired character row was this render's subject — the same
    // lattice (skip_when pair + a linked stage) is minted here
    const skipFlow: RegistryFlow = {
      id: "skip-probe",
      description: "d",
      stages: [
        plainStage({
          id: "img", engine: CARD_PLANE_ENGINE, card: "image-gen",
          description: "d",
          inputs: { character_prompt: { initial: "character_prompt" } },
          expected: { character_prompt: "text" },
          outputs: { photo: "image" }, cardIo: { photo: "image" },
          params: { prompt: "$character_prompt" },
          skipWhen: { initial: "starter_image", when: "present" },
        }),
        linkedStage("anny-hmr-commercial", "estimate", "body", {
          photo: { stage: "img", output: "photo" },
        }),
      ],
      initialValidators: {},
      tool: null,
      skillRefs: [],
    };
    const expandedText = registrySkillBody(expandRegistryFlow(skipFlow, SEED), SEED);
    assert.ok(expandedText.startsWith("# flow skip-probe\n"));
    assert.ok(expandedText.includes("## stages"));
    assert.ok(expandedText.includes("- body (comfyui):"));
    assert.ok(expandedText.includes("skip when initial 'starter_image' is present"));
    const text = registrySkillBody(skipFlow, SEED);
    assert.ok(text.includes("from anny-hmr-commercial/estimate"));
    const tts = registrySkillBody(SEED.get("audio-native-tts")!, SEED);
    assert.ok(tts.includes("card_io wav: audio"));
    assert.ok(tts.includes("initial 'text'"), "the initial is named for the channel (2026-10-04)");
    const up = registrySkillBody(expandRegistryFlow(SEED.get("image-upscale")!, SEED), SEED);
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
    const seat = seedFlowsSeat();
    const names = seat.names();
    assert.ok(names.length > 0, "the registry serves flows");
    for (const name of names) {
      const decl = SEED.get(name);
      assert.ok(decl !== undefined, name + " resolves");
      const flow = expandRegistryFlow(decl, SEED);
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

// ── THE COVERAGE QUEUE'S flowsData BATCH (2026-10-16) ──────────
// Two registry walls whose arms the 2026-10-13 template cut left
// without a seed row: the registration interlock on an UNVALIDATED
// required initial, and the skill-body render of an edge whose
// channel the source stage declares under neither spelling.
describe("registration and render corners (coverage queue batch, 2026-10-16)", () => {
  it("a required initial with no declared validator refuses at registration", () => {
    // THE SEAM'S TWO HALVES MUST AGREE (flowsData:272): a required
    // initial the flow never VALIDATES gets no shape check, and the
    // extractor — which walks initialValidators — never lifts it.
    // The refusal belongs at the one registration, not at the door.
    const base = SEED.get("fit-seat")!;
    const row: RegistryFlow = {
      ...base,
      id: "unvalidated-required-initial",
      requiredInitials: ["seed"],
      initialValidators: {},
    };
    assert.throws(
      () => LIVE.register(row),
      /flow 'unvalidated-required-initial' requires initial 'seed' but declares no validator for it — a required initial needs its kind/,
    );
    assert.equal(
      SEED.get("unvalidated-required-initial"),
      undefined,
      "the refused row never took its seat",
    );
    // the agreeing row still registers — the gate reads the KEY, not
    // the presence of some validator
    const agree: RegistryFlow = {
      ...base,
      id: "validated-required-initial",
      requiredInitials: ["seed"],
      initialValidators: { seed: "photo" },
    };
    const dispose = LIVE.register(agree);
    assert.equal(LIVE.get("validated-required-initial")?.id, "validated-required-initial");
    dispose();
  });

  it("an edge whose channel the source stage declares under no spelling renders kindless", () => {
    // edgeText's kind lookup (:673) reads the source stage's outputs
    // then its card_io; a channel in NEITHER leaves kind "" and the
    // rendered line drops its " (kind)" suffix — the reader learns
    // the channel's kind is unstated instead of reading a guess.
    const flow: RegistryFlow = {
      id: "kindless-edge-probe",
      description: "d",
      stages: [
        plainStage({
          id: "src",
          engine: "craft",
          description: "the producer",
          inputs: {},
          outputs: { photo: "image" },
          cardIo: { wav: "audio" },
          params: {},
        }),
        plainStage({
          id: "sink",
          engine: "craft",
          description: "the consumer",
          inputs: {
            ghost: fromStage("src", "ghost"),
            photo: fromStage("src", "photo"),
            wav: fromStage("src", "wav"),
          },
          params: { ghost: "$ghost", photo: "$photo", wav: "$wav" },
        }),
      ],
      initialValidators: {},
      tool: null,
      skillRefs: [],
    };
    const body = registrySkillBody(flow, SEED);
    // neither outputs nor card_io: no kind suffix at all
    assert.ok(
      body.includes("\n  input ghost: stage src.ghost\n"),
      "the kindless edge rendered with no suffix, got:\n" + body,
    );
    // the two declared spellings still carry their kind, so the
    // kindless line is the missing-channel fact and not the renderer
    assert.ok(body.includes("  input photo: stage src.photo (image)"), "the outputs spelling kept its kind");
    assert.ok(body.includes("  input wav: stage src.wav (audio)"), "the card_io spelling kept its kind");
  });

  // The same run reports the two gate halves this file never reached:
  // a REQUIRED initial that is PRESENT (the absent arms were pinned,
  // the present one rode no seed row), and the "(REQUIRED)" suffix the
  // render owes the agent before it builds a request.
  it("a present required initial clears the gate and rides as its bare name", () => {
    const r = roots();
    try {
      const fit = SEED.get("fit-seat")!;
      writeFileSync(join(r.repoRoot, "b.glb"), "glb");
      writeFileSync(join(r.repoRoot, "p.glb"), "glb");
      // a bare name: no separator, no traversal — the value passes the
      // text gate, continues the walk, and the required check finds it
      assert.equal(registryInitialsError(fit, { body: "b.glb", prop: "p.glb", bone: "hand_r" }, r), null);
      assert.equal(normalizedInitialValue("bone", "text", "hand_r"), "hand_r");
    } finally {
      dropRoots();
    }
  });

  it("a required initial says so on its own rendered edge", () => {
    const body = registrySkillBody(SEED.get("fit-seat")!, SEED);
    assert.ok(
      body.includes("  input bone: initial 'bone' (REQUIRED)"),
      "the render marks the required initial, got:\n" + body,
    );
  });
});
