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
    // NO commit pin is declared for either pack (2026-10-13): Manager
    // installs them as registry ZIPs — the live engine reports ver
    // "8.28.3" with no .git and no sha — so a declared commit could
    // never be verified and the declaration was a lie about what
    // Manager installed. Under the Manager-only + verify-landed-HEAD
    // law an unverifiable pin must not be declarable at all.
    // (an absent ref reads as "" through the manifest reader)
    assert.deepEqual(rows.map((row) => row.ref), ["", ""], "no unverifiable pin is declared");
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
  // runtime arm returns "installed" on trust. So every git_url row
  // declares its ref, and only a row Manager installs from the
  // REGISTRY (no .git, no sha — the 2026-10-13 Impact decision) may
  // go without one, named in one place.
  const REGISTRY_ROWS: readonly string[] = [...IMPACT_PACKS];

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
