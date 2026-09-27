import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
      ref: row.ref,
      required: row.required,
      pip: row.pip,
    })), requirements.map((name) => ({
      name,
      url: pins[name as keyof typeof pins].url,
      ref: pins[name as keyof typeof pins].ref,
      required: true,
      pip: [...pins[name as keyof typeof pins].pip],
    })));
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
