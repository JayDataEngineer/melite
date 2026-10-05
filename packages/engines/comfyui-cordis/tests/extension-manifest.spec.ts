import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { IMPACT_PACKS } from "@melite/comfyui-card-kit/impact";
import { loadCardDefs } from "../src/cardDefs.ts";
import {
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
      "git+https://github.com/facebookresearch/sam2",
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
    // UniCanvasNode has no provider on disk and no requiring card.)
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
});
