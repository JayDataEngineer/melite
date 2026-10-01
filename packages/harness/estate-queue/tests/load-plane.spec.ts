// load-plane.spec.ts — Melite load: package resolution, agents
// docs (caps, sorts, skips), the tool-call signature, digests,
// skill lines/refs, leaf docs, and the card/flow bundles.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bootModels, loadCardDefs, resolveRepoRoot } from "@melite/comfyui-cordis";
import {
  bundleDigest,
  cardSkillDocs,
  flowLeafDocs,
  loadCard,
  loadFlow,
  resolveCardPackageDir,
  skillLineForRef,
  skillLinesForCard,
  skillLinesForFamilies,
  toolRowFor,
} from "../src/loadPlane.ts";
import { toolBaseRows } from "../src/toolProjection.ts";
import type { CardDefinition } from "@melite/comfyui-cordis";

const REPO = resolveRepoRoot();
const DEF = (over: Record<string, unknown> = {}): CardDefinition =>
  ({
    identity: { label: "L", description: "d" },
    boarded: ["fam-a", "ghost-fam", "missing-fam"],
    schema: { dict: {} },
    ...over,
  }) as unknown as CardDefinition;

/** A REAL card definition, loaded through the models plane — the
 *  lane contract is read from the live DECLs, so a fabricated
 *  def would pin nothing. */
const realCardDef = async (id: string): Promise<CardDefinition> => {
  await bootModels();
  const defs = await loadCardDefs();
  const def = defs.get(id);
  if (def === undefined) throw new Error("no card def for " + id);
  return def as unknown as CardDefinition;
};

describe("resolveCardPackageDir", () => {
  it("resolves real ids through the genre tier", () => {
    assert.equal(resolveCardPackageDir(REPO, "anny"), join(REPO, "packages", "3d", "anny"));
    assert.equal(
      resolveCardPackageDir(REPO, "image-gen"),
      join(REPO, "packages", "image", "image-gen"),
    );
  });

  it("unknown ids and missing tiers refuse LOUD", () => {
    assert.throws(() => resolveCardPackageDir(REPO, "ghost-card"), /unknown card 'ghost-card'/);
    assert.throws(
      () => resolveCardPackageDir(join(tmpdir(), "no-such-repo-zzz"), "anny"),
      /no packages tier/,
    );
  });
});

describe("cardSkillDocs", () => {
  it("serves AGENT.md first from a real card", () => {
    const docs = cardSkillDocs(join(REPO, "packages", "3d", "anny"));
    assert.ok(docs.length > 0);
    assert.equal(docs[0]?.path, "src/agents/AGENT.md");
  });

  it("missing agents dirs read nothing", () => {
    assert.deepEqual(cardSkillDocs(join(tmpdir(), "no-such-dir-zzz")), []);
  });

  it("sorts AGENT.md first, caps the byte budget", () => {
    const dir = mkdtempSync(join(tmpdir(), "agents-"));
    try {
      const agents = join(dir, "src", "agents");
      mkdirSync(agents, { recursive: true });
      // 0.md sorts before AGENT.md (byte order) so AGENT.md rides
      // the comparator as `a` at least once.
      writeFileSync(join(agents, "z.md"), "z");
      writeFileSync(join(agents, "AGENT.md"), "a");
      writeFileSync(join(agents, "0.md"), "0");
      writeFileSync(join(agents, "a.md"), "x".repeat(40000));
      const docs = cardSkillDocs(dir);
      assert.deepEqual(docs.map((d) => d.path), [
        "src/agents/AGENT.md",
        "src/agents/0.md",
        "src/agents/a.md",
      ]);
      assert.equal(docs[2]?.text.length, 32768 - 2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("unreadable docs skip but are NAMED (M6 — never a silent narrow)", () => {
    const dir = mkdtempSync(join(tmpdir(), "agents-unread-"));
    const errors: string[] = [];
    const orig = console.error;
    console.error = (...a: unknown[]) => { errors.push(a.join(" ")); };
    try {
      const agents = join(dir, "src", "agents");
      mkdirSync(join(agents, "skip.md"), { recursive: true }); // EISDIR stand-in
      writeFileSync(join(agents, "keep.md"), "k");
      assert.deepEqual(cardSkillDocs(dir).map((d) => d.path), ["src/agents/keep.md"]);
      assert.equal(errors.length, 1, "the unreadable doc is named");
      assert.match(errors[0]!, /card skill doc unreadable/);
      assert.match(errors[0]!, /skip\.md/);
      // the normal no-agents card stays SILENT (ENOENT is not a defect)
      errors.length = 0;
      assert.deepEqual(cardSkillDocs(join(tmpdir(), "no-such-dir-zzz")), []);
      assert.equal(errors.length, 0);
      // a non-ENOENT failure on the agents DIR itself is named too
      const dir2 = mkdtempSync(join(tmpdir(), "agents-notdir-"));
      try {
        mkdirSync(join(dir2, "src"), { recursive: true });
        writeFileSync(join(dir2, "src", "agents"), "not a directory");
        assert.deepEqual(cardSkillDocs(dir2), []);
        assert.equal(errors.length, 1);
        assert.match(errors[0]!, /card agents dir unreadable/);
      } finally {
        rmSync(dir2, { recursive: true, force: true });
      }
    } finally {
      console.error = orig;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("toolRowFor", () => {
  const rows = (def: CardDefinition) =>
    toolBaseRows(new Map([["c", def]]));

  it("emits the /v1/tools envelope (both required arms)", () => {
    const plain = toolRowFor("c", DEF(), rows(DEF()));
    assert.equal(plain["name"], "c_card");
    assert.equal(plain["stage_title"], "L");
    assert.equal("required" in (plain["params_schema"] as Record<string, unknown>), false);
    const req = DEF({ schema: { dict: { p: { type: "string", meta: { extra: { required: true } } } } } });
    const out = toolRowFor("c", req, rows(req));
    assert.deepEqual((out["params_schema"] as { required: string[] }).required, ["p"]);
  });

  it("THE LANE CONTRACT RIDES THE BUNDLE (the agent's primary face states the laws — the DECL audit's gap 1)", async () => {
    // 2026-10-10: the load bundle's signature served NO lanes key at
    // all, so melite_load's lane line — the agent's main contract
    // face — rendered nothing and the agent learned every lane law
    // by hitting a bench refusal. The projection is now the shared
    // contracts-floor construction (one implementation with
    // /v1/card-tools, so the faces cannot drift).
    const tts = await realCardDef("tts");
    // the tool projection's real row for this card
    const proj = toolBaseRows(new Map([["tts", tts]]));
    const out = toolRowFor("tts", tts, proj);
    const lanes = out["lanes"] as Record<string, { base: string[]; relations?: Record<string, unknown> }> | undefined;
    assert.ok(lanes !== undefined, "the bundle signature carries the lane contracts");
    const fam = lanes["qwen3-tts"] ?? lanes["qwen3-tts-voicedesign"];
    assert.ok(fam !== undefined, "a declared tts family rides the contract: " + Object.keys(lanes).join(","));
    assert.ok(fam.base.includes("text"), "the family's base surface rides: " + fam.base.join(","));
    const required = (fam.relations?.["required"] as Array<{ fields?: string[] }> | undefined) ?? [];
    assert.ok(required.some((r) => (r.fields ?? []).includes("text")),
      "the required text law rides the contract the bench enforces");
    const together = (fam.relations?.["together"] as Array<{ fields?: string[] }> | undefined) ?? [];
    assert.ok(together.some((r) => (r.fields ?? []).includes("voice_name")),
      "the export pair law rides too");
  });

  it("a card whose families declare nothing carries no lanes key (the legacy stand-down)", () => {
    const def = DEF({ boarded: [] as string[] });
    const out = toolRowFor("c", def, rows(def));
    assert.equal("lanes" in out, false, "nothing declared, nothing invented");
  });

  it("missing rows refuse LOUD; carriers win", () => {
    assert.throws(() => toolRowFor("ghost", DEF(), rows(DEF())), /no tool row for card 'ghost'/);
    const def = DEF({ schema: { dict: {} }, schemaCarrier: { dict: { q: { type: "string" } } } });
    const out = toolRowFor("c", def, rows(def));
    assert.ok("q" in ((out["params_schema"] as { properties: Record<string, unknown> }).properties));
  });
});

describe("bundleDigest", () => {
  it("sha16-stable, content-sensitive", () => {
    const a = bundleDigest({ x: 1 });
    assert.match(a, /^[0-9a-f]{16}$/);
    assert.equal(bundleDigest({ x: 1 }), a);
    assert.notEqual(bundleDigest({ x: 2 }), a);
  });
});

describe("skillLinesForCard", () => {
  it("walks the real planes (arrays, never refusals)", () => {
    const lines = skillLinesForCard(REPO, "image-gen");
    assert.ok(Array.isArray(lines));
    for (const l of lines) assert.equal(typeof (l as { id?: unknown }).id, "string");
    assert.deepEqual(skillLinesForCard(join(tmpdir(), "no-such-repo-zzz"), "image-gen"), []);
  });
});

describe("flowLeafDocs", () => {
  it("missing leaves read nothing", () => {
    assert.deepEqual(flowLeafDocs(REPO, "no-such-flow-zzz"), []);
  });

  it("ranks SKILL/AGENT first, recurses, skips non-md, caps at 8", () => {
    const repo = mkdtempSync(join(tmpdir(), "leaf-"));
    try {
      const leaf = join(repo, "flows", "f");
      mkdirSync(join(leaf, "0sub"), { recursive: true });
      writeFileSync(join(leaf, "0sub", "c.md"), "c");
      writeFileSync(join(leaf, "AGENT.md"), "a");
      writeFileSync(join(leaf, "b.md"), "b");
      writeFileSync(join(leaf, "d.txt"), "nope");
      for (let i = 1; i <= 8; i++) writeFileSync(join(leaf, "e" + i + ".md"), "e" + i);
      const docs = flowLeafDocs(repo, "f");
      assert.equal(docs.length, 8);
      assert.equal(docs[0]?.path, "flows/f/AGENT.md");
      assert.ok(docs.some((d) => d.path === "flows/f/0sub/c.md"));
      assert.ok(docs.every((d) => d.path.endsWith(".md")));
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("the byte budget breaks; dangling links skip", () => {
    const repo = mkdtempSync(join(tmpdir(), "leaf2-"));
    try {
      const leaf = join(repo, "flows", "f");
      mkdirSync(leaf, { recursive: true });
      writeFileSync(join(leaf, "AGENT.md"), "y".repeat(40000));
      writeFileSync(join(leaf, "b.md"), "b");
      symlinkSync(join(leaf, "missing-target"), join(leaf, "s.md"));
      const docs = flowLeafDocs(repo, "f");
      assert.equal(docs.length, 1);
      assert.equal(docs[0]?.text.length, 32768);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

describe("skillLineForRef", () => {
  it("dangling refs line null (never a refusal)", () => {
    assert.deepEqual(skillLineForRef(REPO, "card:ghost-card-zzz"), {
      ref: "card:ghost-card-zzz",
      line: null,
    });
    assert.deepEqual(skillLineForRef(join(tmpdir(), "no-such-repo-zzz"), "card:x"), {
      ref: "card:x",
      line: null,
    });
  });
});

describe("loadCard", () => {
  // the fake registry now carries the presence seam (modelMids) —
  // the no-silent-drop law's machine half rides every hints row
  const cards = {
    defsSync: () => new Map([["anny", DEF()]]),
    modelMids: () => new Set(["fam-a"]),
  };
  const models = {
    allDecls: () => [
      { id: "fam-a", label: "A", description: "first" },
      { id: "ghost-fam", label: "G" },
    ],
    resolveCatalogArtifact: (id: string) => id === "fam-a"
      ? [{ relative_path: "checkpoints", name: "a.safetensors" }]
      : [],
    checkModelPresent: (folder: string, name: string) =>
      folder === "checkpoints" && name === "a.safetensors" ? "/models/a.safetensors" : null,
  };

  it("an unknown card answers in the LOAD door's voice, never the engine's bootstrap voice", async () => {
    // The ORDER, pinned by making the two failures mutually
    // exclusive: a seat whose every read throws (the bootstrap
    // refusal) must lose to the card's own refusal for a name that
    // does not exist, and win for a name that does. Both seat reads
    // are reached through the SAME accessor the function uses, so
    // the fixture is the one the code actually takes.
    const bootstrap = () => {
      throw new Error("models service not booted — await bootModels() first");
    };
    const exploding = { allDecls: bootstrap, checkModelPresent: bootstrap, checkModelPathPresent: bootstrap, resolveCatalogArtifact: bootstrap } as unknown as never;
    // unknown card: the card's refusal, never the dependency's
    assert.throws(
      () => loadCard(REPO, cards as never, exploding, "ghost-card"),
      /disclose: unknown card 'ghost-card'/,
      "the referent is admitted before the dependency is read",
    );
    // known card: the dependency's refusal still surfaces (the order
    // swap must not swallow a real bootstrap failure)
    assert.throws(
      () => loadCard(REPO, cards as never, exploding, "anny"),
      /models service not booted/,
      "a seated card reaches the dependency and hears its refusal",
    );
  });

  it("an absent seat falls back to the booted singleton (the lane-seat law's degrade arm)", () => {
    // The booted singleton is the fallback when the context mounts no
    // models seat — the same degrade the flow arm rides. It must not
    // throw on a lane that never seated one.
    const b = loadCard(REPO, cards as never, null, "anny");
    assert.equal(b["name"], "anny");
    assert.ok(Array.isArray(b["model_hints"]));
  });

  it("bundles signature + agents + skills + hints + digest", () => {
    const b = loadCard(REPO, cards as never, models as never, "anny");
    assert.equal(b["name"], "anny");
    assert.equal(b["kind"], "card");
    assert.equal((b["signature"] as { name: string }).name, "anny_card");
    assert.ok(Array.isArray(b["agents"]));
    assert.ok(Array.isArray(b["skills"]));
    // presence rides every hint (present for fam-a, absent for
    // ghost-fam — the LLM sees the machine truth at load time)
    assert.deepEqual(b["model_hints"], [
      { id: "fam-a", label: "A", description: "first", present: true },
      { id: "ghost-fam", label: "G", description: "", present: false },
    ]);
    // THE PACK HINTS (stroke 18): the card's declared extension
    // packs serve presence-marked — this fixture's DEF carries no
    // requires, so the empty list (never absent)
    assert.deepEqual(b["pack_hints"], []);
    assert.match(String(b["digest"]), /^[0-9a-f]{16}$/);
  });

  it("marks a local model path present without a downloadable catalog row", () => {
    const def = DEF({ boarded: ["local-fam"] });
    const cardsLocal = {
      defsSync: () => new Map([["image-gen", def]]),
      modelMids: () => new Set(["local-fam"]),
    };
    const modelsLocal = {
      allDecls: () => [{
        id: "local-fam",
        label: "Local",
        lane_inputs: { model_path: "audio/Qwen3-TTS" },
      }],
      checkModelPathPresent: (path: string) => path === "audio/Qwen3-TTS" ? "/models/audio/Qwen3-TTS" : null,
      resolveCatalogArtifact: () => {
        throw new Error("no downloadable provisions");
      },
    };
    const b = loadCard(REPO, cardsLocal as never, modelsLocal as never, "image-gen");
    assert.deepEqual(b["model_hints"], [{ id: "local-fam", label: "Local", description: "", present: true }]);
  });

  it("pack_hints carry the declared packs with the gate's presence marks", () => {
    // a DEF declaring requires + a family slice — presence rides the
    // engine read (the booted singleton: unknown marks in this
    // world; the mark's shape is the wall, not the machine)
    const defReq = {
      identity: { label: "L", description: "d" },
      boarded: [],
      schema: { dict: {} },
      requires: ["pack-flat"],
      requiresByFamily: { "fam-a": ["pack-fam"] },
    } as unknown as CardDefinition;
    const cards2 = {
      defsSync: () => new Map([["anny", defReq]]),
      modelMids: () => new Set(["fam-a"]),
    };
    const b = loadCard(REPO, cards2 as never, models as never, "anny");
    const hints = b["pack_hints"] as Array<{ id: string; present: boolean | null }>;
    assert.deepEqual(hints.map((h) => h.id).sort(), ["pack-fam", "pack-flat"]);
    for (const h of hints) {
      assert.ok(h.present === null || typeof h.present === "boolean");
    }
  });

  it("a pack named by both requires and a family slice serves once", () => {
    // the union dedupes: pack-fam rides the flat requires AND
    // fam-a's slice — one id, one presence mark (the skip arm).
    const defDup = {
      identity: { label: "L", description: "d" },
      boarded: [],
      schema: { dict: {} },
      requires: ["pack-flat", "pack-fam"],
      requiresByFamily: { "fam-a": ["pack-fam"] },
    } as unknown as CardDefinition;
    const cardsDup = {
      defsSync: () => new Map([["anny", defDup]]),
      modelMids: () => new Set(["fam-a"]),
    };
    const b = loadCard(REPO, cardsDup as never, models as never, "anny");
    const hints = b["pack_hints"] as Array<{ id: string; present: boolean | null }>;
    assert.deepEqual(hints.map((h) => h.id), ["pack-flat", "pack-fam"]);
  });

  it("unknown cards refuse LOUD", () => {
    assert.throws(
      () => loadCard(REPO, cards as never, models as never, "ghost"),
      /unknown card 'ghost'/,
    );
  });

  it("boarded families' model skills ride the bundle (the one-load contract)", () => {
    // the operator's anima case: loading a card boarded on anima
    // serves model:anima:prompt-enhance beside the card lines — the
    // agent reads the prompt guide before compose, never hunts it
    // after. A boarded ghost contributes nothing, never a refusal.
    const defAnima = DEF({ boarded: ["anima", "ghost-fam"] });
    const cardsAnima = {
      defsSync: () => new Map([["anny", defAnima]]),
      modelMids: () => new Set(["anima"]),
    };
    const modelsAnima = {
      allDecls: () => [{ id: "anima", label: "Anima", description: "anime" }],
    };
    const b = loadCard(REPO, cardsAnima as never, modelsAnima as never, "anny");
    const ids = (b["skills"] as Array<{ id?: unknown }>).map((l) => l.id);
    assert.ok(ids.includes("model:anima:prompt-enhance"));
    assert.ok(!ids.some((id) => String(id).startsWith("model:ghost-fam")));
  });

  it("skillLinesForFamilies emits boarded order, entrance first", () => {
    const lines = skillLinesForFamilies(REPO, ["z-image", "anima", "ghost-fam"]);
    const ids = lines.map((l) => (l as { id?: unknown }).id);
    assert.ok(ids.includes("model:z-image:prompt-enhance"));
    assert.ok(ids.includes("model:anima:prompt-enhance"));
    // boarded order holds across families
    assert.ok(
      ids.indexOf("model:z-image:prompt-enhance") < ids.indexOf("model:anima:prompt-enhance"),
    );
  });
});

describe("loadFlow", () => {
  it("null-tool flows serve null signatures; linked stages ride verbatim", () => {
    const a = loadFlow(REPO, "anny-hmr");
    assert.equal(a["signature"], null);
    assert.deepEqual(a["refs"], []);
    const c = loadFlow(REPO, "character");
    const stages = c["stages"] as Array<{ fromFlow?: unknown }>;
    assert.ok(stages.some((s) => s.fromFlow !== undefined));
  });

  it("tooled flows serve the overlay; skill refs resolve with lines", () => {
    const t = loadFlow(REPO, "audio-native-tts");
    assert.equal((t["signature"] as { name: string }).name, "speak");
    assert.match(String(t["digest"]), /^[0-9a-f]{16}$/);
    const u = loadFlow(REPO, "image-upscale");
    const uSkills = u["skills"] as Array<{ id?: unknown }>;
    assert.ok(uSkills.some((l) => l.id === "card:image-gen"));
    assert.deepEqual(u["refs"], [
      "card:image-gen",
      "card:upscale-tools",
      "model:krea-2",
      "model:krea-2:prompt-enhance",
      "model:z-image:prompt-enhance",
    ]);
    const skills = u["skills"] as Array<{ id?: unknown }>;
    assert.ok(skills.length > 0);
  });

  it("unknown flows refuse LOUD", () => {
    assert.throws(() => loadFlow(REPO, "ghost-flow"), /unknown flow 'ghost-flow'/);
  });
});

describe("toolRowFor — the mods projection (stroke 79)", () => {
  it("serves the declared kinds beside params_schema (the agent contract — verbatim, leaf_face never rides)", () => {
    const def = DEF({
      mods: [
        { kind: "sam3", label: "SAM3", param_key: "sam3", cardinality: "list", category: "standalone", leaf_face: "bbox-canvas",
          fields: [{ name: "prompt" }, { name: "bbox_x" }] },
        { kind: "draw", label: "Draw", param_key: "draw", cardinality: "list", category: "ordered", leaf_face: "paint-canvas",
          fields: [{ name: "payload" }] },
      ] as never,
    });
    const out = toolRowFor("c", def, toolBaseRows(new Map([["c", def]])));
    assert.deepEqual(out["modifiers"], [
      { kind: "sam3", category: "standalone", cardinality: "list", fields: ["prompt", "bbox_x"] },
      { kind: "draw", category: "ordered", cardinality: "list", fields: ["payload"] },
    ], "verbatim kinds; leaf_face stays a UI concern (never rides)");
  });

  it("a kindless card serves NO modifiers key (never an empty array)", () => {
    const out = toolRowFor("c", DEF(), toolBaseRows(new Map([["c", DEF()]])));
    assert.equal("modifiers" in out, false);
  });

  it("a category-less kind omits the category (ordered is the default, never spelled)", () => {
    const def = DEF({
      mods: [{ kind: "loras", label: "L", param_key: "loras", cardinality: "list" }] as never,
    });
    const out = toolRowFor("c", def, toolBaseRows(new Map([["c", def]])));
    const nameless = DEF({
      mods: [{ kind: "loras", label: "L", param_key: "loras", cardinality: "list", fields: [{}, { name: "strength" }] }] as never,
    });
    assert.deepEqual(out["modifiers"], [{ kind: "loras", cardinality: "list", fields: [] }]);
    assert.deepEqual(
      (toolRowFor("c", nameless, toolBaseRows(new Map([["c", nameless]])))["modifiers"] as Array<{ fields: string[] }>)[0]["fields"],
      ["", "strength"],
      "a nameless field row degrades to '' (never a crash, never a drop)",
    );
  });
});
