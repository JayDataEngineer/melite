import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { IMPACT_PACKS } from "@melite/comfyui-card-kit/impact";
import { loadCardDefs } from "../src/cardDefs.ts";
import {
  EXT_KEYS,
  findNodesYaml,
  loadExtensionsYaml,
  mergeManifest,
} from "../scripts/provision-extensions-manifest.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const manifest = mergeManifest(repoRoot);
const declarations = findNodesYaml(repoRoot).flatMap(([path]) =>
  loadExtensionsYaml(path).map((row) => ({ row, path: path.slice(repoRoot.length + 1) })));
const defs = await loadCardDefs();
const mask = defs.get("mask");
assert.ok(mask, "the mask card is registered");
const sam2 = (mask.mods ?? []).find((kind) => kind.kind === "sam2");
assert.ok(sam2, "the mask card declares the sam2 arm");
const requirements: string[] = [...sam2.requires ?? []];

const pins = {
  "comfyui-impact-pack": {
    url: "https://github.com/ltdrdata/ComfyUI-Impact-Pack",
    ref: "5bed9d5545ef430406a5d6d7233e5c0a5e75051a",
    pip: [
      "segment-anything",
      "scikit-image",
      "piexif",
      "transformers",
      "opencv-python-headless",
      "scipy",
      "numpy",
      "dill",
      "matplotlib",
      "git+https://github.com/facebookresearch/sam2@2b90b9f5ceec907a1c18123530e92e794ad901a4",
    ],
    nodeTypes: [
      "BboxDetectorSEGS",
      "FaceDetailer",
      "SAMDetectorCombined",
      "SAMLoader",
      "SegmDetectorSEGS",
    ],
  },
  "comfyui-impact-subpack": {
    url: "https://github.com/ltdrdata/ComfyUI-Impact-Subpack",
    ref: "50c7b71a6a224734cc9b21963c6d1926816a97f1",
    pip: [
      "matplotlib",
      "ultralytics>=8.3.162",
      "numpy",
      "opencv-python-headless",
      "dill",
    ],
    nodeTypes: ["UltralyticsDetectorProvider"],
  },
} as const;

const normalized = (url: string): string => url.trim().replace(/\/+$/u, "").replace(/\.git$/iu, "").toLowerCase();
const facts = JSON.parse(readFileSync(join(repoRoot, "packages/engines/comfyui-cordis/data/model-facts.json"), "utf8")) as {
  extension_node_types: Record<string, string[]>;
};

describe("Impact extension declaration SSOT", () => {
  it("the mask SAM2 requirements equal the two immutable manifest rows", () => {
    assert.deepEqual(requirements, [...IMPACT_PACKS]);
    // Set membership over plain strings (the manifest rows carry
    // string names; requirements widens the literal union above).
    const required = new Set<string>(requirements);
    const rows = manifest.filter((row) => required.has(row.name));
    assert.deepEqual(rows.map((row) => row.name), requirements);
    assert.deepEqual(rows.map((row) => ({
      name: row.name,
      url: row.url,
      required: row.required,
      pip: row.pip,
    })), requirements.map((name) => ({
      name,
      url: pins[name as keyof typeof pins].url,
      required: true,
      pip: [...pins[name as keyof typeof pins].pip],
    })));
    // The commit pins ARE declared (2026-10-15, reversing the
    // 2026-10-13 unpin): the unpinned url matched Manager's channel
    // registry map, the ZIP arm ran, and the install landed with no
    // .git — so no landed HEAD could ever be verified (the "not
    // present after a 200" receipt, seven packs over). An @<sha>-
    // suffixed url cannot match the registry map, the git arm always
    // runs, and the landed HEAD verifies — both rows install as real
    // clones at exactly these shas now.
    assert.deepEqual(
      rows.map((row) => row.ref),
      [
        "429d0159ad429e64d2b3916e6e7be9c22d025c3c",
        "50c7b71a6a224734cc9b21963c6d1926816a97f1",
      ],
      "the impact rows land as pinned clones through Manager's git arm",
    );
  });

  it("each mask requirement has exactly one card-owned manifest declaration", () => {
    for (const name of requirements) {
      const pin = pins[name as keyof typeof pins];
      const matches = declarations.filter(({ row }) =>
        row.name === name || normalized(row.url) === normalized(pin.url));
      assert.equal(matches.length, 1,
        `${name} must have one declaration, found ${matches.map(({ path }) => path).join(", ") || "none"}`);
      assert.equal(matches[0]?.row.name, name);
      assert.equal(matches[0]?.path, "packages/image/mask/nodes/extensions.yaml");
    }
  });

  it("both manifest rows carry their required activation node types", () => {
    for (const name of requirements) {
      assert.deepEqual(facts.extension_node_types[name], [...pins[name as keyof typeof pins].nodeTypes]);
    }
  });
});

describe("THE PIN LAW (the extensions law, 2026-10-15)", () => {
  // Manager is the only vendor, and the estate verifies the LANDED
  // HEAD of every row it installed. A row the runtime installs by
  // git_url but declares WITHOUT a ref can never be verified — the
  // runtime arm returns "installed" on trust. (2026-10-15: the
  // registry-ZIP exception is RETIRED — the impact receipts proved
  // an unpinned url lands Manager's registry ZIP with no .git, so
  // EVERY git_url row pins a ref; the walls tier enforces the same
  // law as the registry-ZIP wall.)
  const REGISTRY_ROWS: readonly string[] = [];

  it("every git_url row declares the ref its landed HEAD is verified against", () => {
    const unpinned = manifest
      .filter((row) => row.url !== undefined && (row.ref === undefined || row.ref === ""))
      .map((row) => row.name);
    assert.deepEqual(
      unpinned,
      REGISTRY_ROWS.filter((name) => unpinned.includes(name)),
      `unpinned rows outside the registry install set: ${unpinned
        .filter((name) => !REGISTRY_ROWS.includes(name))
        .join(", ")}`,
    );
  });

  it("a declared ref is a full commit sha — a branch or a tag is not a landed HEAD", () => {
    for (const row of manifest) {
      if (row.ref === undefined || row.ref === "") continue;
      assert.match(
        row.ref,
        /^[0-9a-f]{40}$/u,
        `row ${row.name} declares ref ${row.ref}, which is not a commit sha`,
      );
    }
  });

  it("every pack a CARD requires is a declared row (the fresh-clone gap)", () => {
    // A card's requires is a contract the compose gate enforces
    // (assertModRequires): if no manifest row declares the pack, a
    // fresh clone cannot install what the card demands and the card
    // is unrunnable there. The TTS audit found three such rows in the
    // opposite direction — cards requiring packs nothing declares.
    // This list IS the open item: each entry needs an operator-chosen
    // upstream (url + pinned ref) before it can be declared, and
    // deleting an entry that has been cured fails this wall.
    // (2026-10-15: EMPTY — the three phantom cures closed it:
    // trellis2 is core-served (core_node_types), Frame-Interpolation
    // and LTXVideo keys died with their mis-attributed classes — the
    // graphs address only core and PlagueKind nodes from that set.)
    const UNPROVIDED: readonly string[] = [];
    const required = new Set<string>();
    for (const def of defs.values()) {
      for (const name of [
        ...(def.requires ?? []),
        ...Object.values(def.requiresByFamily ?? {}).flat(),
      ]) {
        required.add(name);
      }
    }
    const declared = new Set(manifest.map((row) => row.name));
    const missing = [...required].filter((name) => !declared.has(name)).sort();
    assert.deepEqual(
      missing,
      [...UNPROVIDED].sort(),
      `cards require packs no row declares: ${missing.join(", ")} — add the declared row (url + pinned ref) and delete the entry here`,
    );
  });

  it("the roster's pack names and the manifest's row names are one vocabulary", () => {
    // Two spellings of one pack (the roster said comfyui_nvidia_rtx_nodes
    // where the row said Nvidia_RTX_Nodes_ComfyUI) meant the install
    // door and the compose gate looked at two different names for the
    // same pack — the RTX row is now declared under the repo name, and
    // this wall keeps the two lists from drifting apart again.
    const rostered = Object.keys(facts.extension_node_types);
    const declared = new Set(manifest.map((row) => row.name));
    // The roster entries with no declared row ARE the open gap — each
    // needs an operator-chosen upstream (url + pinned ref) and its
    // deletion here. (2026-10-15: the three phantom keys left this
    // list with the cards that no longer require them. 2026-10-16,
    // the roster-rows batch closed all three: ComfyUI-GGUF declared
    // at city96@6ea2651e for the §4d gguf channel; comfyui-lanpaint
    // deleted — the operator ruling (2026-10-16) is that LanPaint is
    // MOD-ONLY, installed by hand on the box, never estate-provisioned,
    // so no row will ever declare it and the key dies; vnccs_utils
    // deleted — ModelSamplingAuraFlow is comfy_extras core and
    // UniCanvasNode has no provider on disk and no requiring card.
    // 2026-10-16b, the qwen-edit batch: Comfyui-QwenEditUtils
    // deleted — TextEncodeQwenImageEditPlus is comfy_extras core
    // (nodes_qwen.py); the pack serves only *_lrzjason variants
    // nothing composes, and its model-scoped row died with it.)
    const UNDECLARED_ROSTER: readonly string[] = [];
    const drifted = rostered.filter((name) => !declared.has(name)).sort();
    assert.deepEqual(
      drifted,
      [...UNDECLARED_ROSTER].sort(),
      `the roster names packs no row declares: ${drifted.join(", ")} — declare the row, then delete the entry here`,
    );
  });

  it("the first-party packs' pins equal their vendored submodule commits", () => {
    // ONE TRUTH: the manifest pin and .gitmodules' commit are the
    // same line of the estate's history. If they drift, the vendored
    // tree and the door that installs it name different commits.
    const declared = new Map(
      manifest.filter((row) => row.url?.startsWith("https://github.com/JayDataEngineer/") === true)
        .map((row) => [row.name, row.ref]),
    );
    for (const [name, ref] of declared) {
      if (ref === undefined || ref === "") continue;
      const path = `vendor/comfyui_extensions/${name}`;
      const vendored = execFileSync("git", ["submodule", "status", path], {
        cwd: repoRoot,
        encoding: "utf8",
      }).trim().split(" ")[0] ?? "";
      assert.equal(
        vendored.startsWith("-") || vendored.startsWith("+") ? vendored.slice(1) : vendored,
        ref,
        `${name}: the manifest pins ${ref.slice(0, 8)} but .gitmodules vendors ${vendored.slice(0, 8)}`,
      );
    }
  });

  it("every git+https pip entry carries an @<sha> pin (R8 — the pip leg lands no .git either)", () => {
    // The manifest header's pin law is about the pack url; the pip
    // leg lands no .git the same way, so urlInstalled can never
    // verify an unpinned pip git requirement. Every git+https entry
    // in every yaml pip list names its commit.
    const offenders: string[] = [];
    for (const { row, path } of declarations) {
      for (const entry of row.pip ?? []) {
        if (!entry.startsWith("git+https://")) continue;
        const at = entry.lastIndexOf("@");
        const sha = at === -1 ? "" : entry.slice(at + 1);
        if (!/^[0-9a-f]{40}$/.test(sha)) {
          offenders.push(`${path} [${row.name}]: pip entry ${entry} carries no @<40-hex> pin`);
        }
      }
    }
    assert.deepEqual(offenders, []);
  });

  it("every manifest key is set by at least one row (R7 — no dead keys)", () => {
    // A key no row sets is a dead field with dead branches behind
    // it (ExtRow.registry: required, populated by zero rows,
    // gating install's registry-branch). The allowed-key set stays
    // exactly the keys rows actually carry.
    const seen = new Set<string>();
    for (const { row } of declarations) {
      for (const [key, value] of Object.entries(row)) {
        if (key === "_source") continue;
        if (Array.isArray(value) ? value.length > 0 : value !== "" && value !== undefined) {
          seen.add(key);
        }
      }
    }
    const dead = [...EXT_KEYS].filter((key) => !seen.has(key));
    assert.deepEqual(dead, [], `manifest keys no row sets (dead fields): ${dead.join(", ")}`);
  });
});

// ── THE UV PIN LAW (F2, nativity audit 2026-11-05) ────────────────
// infra/comfyui/pyproject.toml's [tool.uv.sources] freezes pip-level
// Layer C at git revs. Before 2026-11-05 NO wall read those revs —
// the comment "the walls pin that equality" was a paper wall, and
// the melite-model-base pair drifted two commits in silence (gitlink
// b18214cd vs rev 8444fe5d). This describe is the judge the comment
// claimed: every uv git source with a vendored twin pins EXACTLY the
// tracked submodule gitlink, and the lock names the same rev (the
// lock is the deployment truth; a lock that disagrees with the
// pyproject is a half-landed re-pin).
describe("the uv git-source pins equal the vendored submodule gitlinks (F2)", () => {
  const pyproject = readFileSync(join(repoRoot, "infra/comfyui/pyproject.toml"), "utf8");
  const lock = readFileSync(join(repoRoot, "infra/comfyui/uv.lock"), "utf8");

  /** The [tool.uv.sources] git rows: name → { repo, rev }. */
  function uvGitSources(): Map<string, { repo: string; rev: string }> {
    const section = /\[tool\.uv\.sources\]\n([\s\S]*?)(?=\n\[|$)/u.exec(pyproject)?.[1] ?? "";
    const out = new Map<string, { repo: string; rev: string }>();
    for (const m of section.matchAll(/^([\w.-]+) = \{ git = "([^"]+)", rev = "([0-9a-f]{40})" \}/gmu)) {
      out.set(m[1]!, { repo: m[2]!.replace(/\.git$/u, ""), rev: m[3]! });
    }
    return out;
  }

  /** .gitmodules' vendored extension paths under vendor/. */
  function vendoredPaths(): Map<string, string> {
    const text = readFileSync(join(repoRoot, ".gitmodules"), "utf8");
    const out = new Map<string, string>();
    for (const m of text.matchAll(/\[submodule "([^"]+)"\]\n\tpath = (\S+)\n\turl = (\S+)/gu)) {
      if (m[2]!.startsWith("vendor/comfyui_extensions/")) {
        // repo basename (url minus .git) → tracked submodule path
        out.set(m[3]!.replace(/\.git$/u, "").split("/").pop()!, m[2]!);
      }
    }
    return out;
  }

  /** The tracked gitlink for a submodule path — read from the index
   *  (`git ls-tree HEAD`), never the worktree: the gitlink IS the
   *  pin of record and holds even mid-hop. */
  function gitlink(path: string): string {
    return execFileSync("git", ["ls-tree", "HEAD", path], { cwd: repoRoot, encoding: "utf8" })
      .trim().split(/\s+/u)[2] ?? "";
  }

  it("the pyproject carries the uv git sources this law judges (the vacuous guard)", () => {
    assert.ok(uvGitSources().size >= 2,
      "the [tool.uv.sources] parse found no git rows — the section moved or the regex rotted; fix the reader, never the floor");
    assert.ok(vendoredPaths().size >= 8,
      "the .gitmodules parse found fewer vendored extension packs than the estate vendors — the reader rotted");
  });

  it("every uv git source with a vendored twin pins EXACTLY the tracked gitlink", () => {
    const sources = uvGitSources();
    const vendored = vendoredPaths();
    const drifted: string[] = [];
    for (const [name, src] of sources) {
      const path = vendored.get(src.repo.split("/").pop()!);
      if (path === undefined) continue; // no vendored twin — the named-list arm below owns it
      const pin = gitlink(path);
      if (src.rev !== pin) {
        drifted.push(`${name}: pyproject rev ${src.rev.slice(0, 12)} vs vendored gitlink ${pin.slice(0, 12)} (${path})`);
      }
    }
    assert.deepEqual(drifted, [],
      "the pip-level pin and the vendored tree name different commits — re-point the pair DELIBERATELY (verify which rev is the true tree state), never let it drift");
  });

  it("uv.lock resolves every vendored uv source at the pyproject rev (lock ≡ pin)", () => {
    const sources = uvGitSources();
    const vendored = vendoredPaths();
    const drifted: string[] = [];
    for (const [name, src] of sources) {
      if (!vendored.has(src.repo.split("/").pop()!)) continue;
      // the lock carries the rev twice: the consumer's dep row and
      // the package block's own source (rev + resolved commit)
      const depRow = new RegExp(`\\{ name = "${name}", git = "[^"]*\\?rev=([0-9a-f]{40})" \\}`, "u").exec(lock)?.[1];
      const block = new RegExp(`\\[\\[package\\]\\]\\nname = "${name}"[\\s\\S]*?source = \\{ git = "[^"]*\\?rev=([0-9a-f]{40})#`, "u").exec(lock)?.[1];
      assert.ok(depRow !== undefined && block !== undefined,
        `${name}: uv.lock is missing its dep row or its package block — the lock's shape moved`);
      if (depRow !== src.rev) drifted.push(`${name}: uv.lock dep row resolves ${depRow.slice(0, 12)} but pyproject pins ${src.rev.slice(0, 12)}`);
      if (block !== src.rev) drifted.push(`${name}: uv.lock package block resolves ${block.slice(0, 12)} but pyproject pins ${src.rev.slice(0, 12)}`);
    }
    assert.deepEqual(drifted, [],
      "the lock and the pyproject disagree — a half-landed re-pin; regenerate the lock at the pinned rev");
  });

  it("every uv git source WITHOUT a vendored twin is named below (no silent third class)", () => {
    const sources = uvGitSources();
    const vendored = vendoredPaths();
    // Published-only pip packs: repos that are deliberately never
    // vendored as submodules, so no gitlink exists to pin against.
    const NO_VENDORED_TWIN: Readonly<Record<string, string>> = {
      "motion-correction": "kimodo's motion lib, published-only (the vendor path blocked every fresh clone; removed 2026-10-15) — no submodule, the frozen rev IS the pin",
    };
    const unnamed = [...sources.keys()].filter((name) => {
      const repo = sources.get(name)!.repo.split("/").pop()!;
      return !vendored.has(repo) && !(name in NO_VENDORED_TWIN);
    });
    assert.deepEqual(unnamed, [],
      "these uv git sources have no vendored twin and no named reason — name them in NO_VENDORED_TWIN or vendor the repo");
    // and the list does not rot: a named twin that GAINED a submodule
    // must leave the list (the vendored arm would judge it — stale
    // reasons are the paper-wall sin again)
    const stale = Object.keys(NO_VENDORED_TWIN).filter((name) => vendored.has(sources.get(name)?.repo.split("/").pop() ?? ""));
    assert.deepEqual(stale, [], "these named no-twin sources now HAVE a vendored submodule — delete the exemption");
  });
});
