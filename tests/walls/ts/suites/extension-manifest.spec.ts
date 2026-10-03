// extension-manifest.spec.ts — THE EXTENSION CENSUS WALL
// (2026-10-13).
//
// Three SSOTs meet at every extension pack, and nothing checked that
// they agree. The audit found all three ways they disagree, each of
// which is a SILENT hole on a fresh estate:
//
//   1. a card's `requires` naming a pack ABSENT from
//      extension_node_types — the missing-extension gate
//      (service.ts:81-91) then reads `expected = []`, its
//      `expected.length > 0` guard skips, and the gate NEVER fires.
//      Four cards (anny, rig, motion, h3-timeline) were in this state.
//   2. a pack in extension_node_types that NO manifest installs — the
//      runtime refuses a pack a fresh estate had no way to obtain.
//      Eleven were (melite-audio-nodes, melite-utility-nodes,
//      melite-blender-proxy-nodes, melite-unity-nodes, and the
//      third-party rows on NOT_YET_INSTALLED below).
//   3. a manifest row installing a pack nothing checks — installed
//      weight with no refusal to back it.
//
// A pack name is NOT shared between the two sides (the manifest name
// is the installed DIRECTORY; the check key is the facts entry), so
// the wall compares by pack IDENTITY — the manifest row's `name` for
// (2)/(3), and for (1) the check map alone. Where a pack is
// deliberately not installed yet, it is named below with its reason.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..", "..");
const PACKAGES = join(ROOT, "packages");
const FACTS = join(ROOT, "packages/engines/comfyui-cordis/data/model-facts.json");

/** Packs the check map knows but no manifest installs. Each name is a
 *  DELIBERATE open item, not an oversight: the third-party rows have
 *  no pinned registry identity in this tree yet, so the install side
 *  cannot be written honestly until one is chosen (the
 *  ref-pinned-git-url law). Melite-owned packs must NOT appear here —
 *  they are real GitHub repos and get a manifest row. */
const NOT_YET_INSTALLED: Readonly<Record<string, string>> = {
  "ComfyUI-Frame-Interpolation": "third-party; no pinned registry identity in this tree",
  "ComfyUI-GGUF": "third-party; no pinned registry identity in this tree",
  "ComfyUI-LTXVideo": "third-party; no pinned registry identity in this tree",
  "comfyui-core-trellis2": "third-party; no pinned registry identity in this tree",
  "comfyui-lanpaint": "third-party; no pinned registry identity in this tree",
  "vnccs_utils": "third-party; no pinned registry identity in this tree",
};

/** Check-map key -> manifest row name, where the two name the SAME
 *  pack under two spellings. The check key is a free name; the manifest
 *  name is the installed directory Manager derives, and the two drifted.
 *  Each entry is a NAMED, accepted mismatch for one upstream repo. */
const SAME_PACK_AS: Readonly<Record<string, string>> = {
  comfyui_nvidia_rtx_nodes: "Nvidia_RTX_Nodes_ComfyUI",
  qweneditutils: "Comfyui-QwenEditUtils",
};

/** Manifest rows whose pack nothing checks — installed with no
 *  refusal to back it. rgthree is a workflow-helper pack with no
 *  nodes our graphs address, so there is nothing to check. */
const NOT_CHECKED: Readonly<Record<string, string>> = {
  "rgthree-comfy": "workflow helpers; no node class our graphs address",
};

const extensionNodeTypes = (): Record<string, readonly string[]> => {
  const facts = JSON.parse(readFileSync(FACTS, "utf8")) as {
    extension_node_types?: Record<string, readonly string[]>;
  };
  return facts.extension_node_types ?? {};
};

/** Every extension row name across the manifests (recursively). */
function manifestRows(dir: string, out: Array<{ name: string; file: string }> = []): Array<{ name: string; file: string }> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      // pnpm's workspace links form symlink cycles under node_modules
      if (entry === "node_modules" || entry === "lib" || entry === "dist") continue;
      manifestRows(full, out);
    } else if (entry === "nodes.yaml" || entry === "extensions.yaml") {
      const text = readFileSync(full, "utf8");
      for (const m of text.matchAll(/^\s*-\s+name:\s*([^\s#]+)/gmu)) {
        out.push({ name: m[1]!, file: full.slice(ROOT.length + 1) });
      }
    }
  }
  return out;
}

/** Every pack a card's `requires` names. */
function cardRequires(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === "node_modules" || entry === "lib") continue;
        walk(full);
      } else if (entry === "card.ts") {
        const text = readFileSync(full, "utf8");
        for (const m of text.matchAll(/requires:\s*\[([^\]]*)\]/gsu)) {
          for (const n of m[1]!.matchAll(/['"]([^'"]+)['"]/gu)) {
            const key = n[1]!;
            if (!out.has(key)) out.set(key, new Set());
            out.get(key)!.add(full.slice(ROOT.length + 1));
          }
        }
      }
    }
  };
  walk(join(ROOT, "packages"));
  return out;
}

describe("THE EXTENSION CENSUS (install side ⇔ check side ⇔ card requires)", () => {
  it("every pack a card REQUIRES is in the check map (the gate must not no-op)", () => {
    const extMap = extensionNodeTypes();
    const missing: string[] = [];
    for (const [pack, cards] of cardRequires()) {
      if (!(pack in extMap)) missing.push(`${pack} (required by ${[...cards].join(", ")})`);
    }
    expect(
      missing,
      "these cards' missing-extension gates read an empty node list and NEVER fire " +
        "(service.ts:84 skips when expected.length === 0)",
    ).toEqual([]);
  });

  it("every check-map pack is either installed by a manifest or named below with a reason", () => {
    const rows = new Set(manifestRows(PACKAGES).map((r) => r.name.toLowerCase()));
    const missing = Object.keys(extensionNodeTypes())
      .filter((pack) => {
        const installed = rows.has(pack.toLowerCase()) ||
          (SAME_PACK_AS[pack] !== undefined && rows.has((SAME_PACK_AS[pack] ?? "").toLowerCase()));
        return !installed && !(pack in NOT_YET_INSTALLED);
      })
      .map((pack) => `${pack} (checked at runtime, installed by no manifest)`);
    expect(missing, "these packs can be refused on an estate that could never obtain them").toEqual([]);
  });

  it("every NOT_YET_INSTALLED entry still has no manifest row (the list does not rot)", () => {
    const rows = new Set(manifestRows(PACKAGES).map((r) => r.name.toLowerCase()));
    const stale = Object.keys(NOT_YET_INSTALLED).filter((pack) => rows.has(pack.toLowerCase()));
    expect(stale, "these now HAVE a manifest row — delete them from NOT_YET_INSTALLED").toEqual([]);
  });

  it("every manifest row is either checked or named below with a reason", () => {
    const extMap = extensionNodeTypes();
    const aliases = new Set(Object.values(SAME_PACK_AS).map((v) => v.toLowerCase()));
    const unchecked = manifestRows(PACKAGES)
      .filter((r) => !(r.name in extMap) && !(r.name in NOT_CHECKED) && !aliases.has(r.name.toLowerCase()))
      .map((r) => `${r.name} (${r.file})`);
    expect(unchecked, "these install a pack nothing checks — weight with no refusal to back it").toEqual([]);
  });

  it("every check-map pack names at least one node class", () => {
    const empty = Object.entries(extensionNodeTypes())
      .filter(([, nodes]) => !Array.isArray(nodes) || nodes.length === 0)
      .map(([pack]) => pack);
    expect(empty, "an empty node list is the silent gate: the check can never pass or fail").toEqual([]);
  });
});
