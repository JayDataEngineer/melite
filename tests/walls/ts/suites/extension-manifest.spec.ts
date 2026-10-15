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
//      melite-blender-proxy-nodes (left the tree 2026-10-04 with the
//      MCP ruling, li-en), melite-unity-nodes (left the tree
//      2026-10-18 with the M15 ruling — same shape), and the
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
 *  they are real GitHub repos and get a manifest row.
 *  (2026-10-15: ComfyUI-Frame-Interpolation, ComfyUI-LTXVideo and
 *  comfyui-core-trellis2 left this list — they were phantom packs.
 *  Every class they were keyed against is core-served or belongs to
 *  an already-declared pack; core classes live in core_node_types
 *  now, and no graph addresses a pack-owned class of theirs.) */
const NOT_YET_INSTALLED: Readonly<Record<string, string>> = {
  // 2026-10-16, the roster-rows batch: all three left — ComfyUI-GGUF
  // declared at city96@6ea2651e (the §4d gguf channel); lanpaint and
  // vnccs_utils deleted from the check map (mod-only ruling / phantom).
};

/** Check-map key -> manifest row name, where the two name the SAME
 *  pack under two spellings. The check key is a free name; the manifest
 *  name is the installed directory Manager derives, and the two drifted.
 *  Each entry is a NAMED, accepted mismatch for one upstream repo.
 *  (Deleted 2026-10-16, re-audit A8a: the roster now holds
 *  Nvidia_RTX_Nodes_ComfyUI and Comfyui-QwenEditUtils directly —
 *  both keys were gone from the check map, the arm was
 *  unreachable, and the package twin enforces the same law with
 *  no exemption list at all.) */

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

/** Every extension row across the manifests (recursively): name plus
 *  the declared url/ref when the row carries them. */
interface ManifestRow { name: string; file: string; url?: string; ref?: string; desc?: string }
function manifestRows(dir: string, out: ManifestRow[] = []): ManifestRow[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      // pnpm's workspace links form symlink cycles under node_modules
      if (entry === "node_modules" || entry === "lib" || entry === "dist") continue;
      manifestRows(full, out);
    } else if (entry === "nodes.yaml" || entry === "extensions.yaml") {
      const text = readFileSync(full, "utf8");
      for (const m of text.matchAll(/^[ \t]*-[ \t]+name:[ \t]*([^\s#]+)([\s\S]*?)(?=^[ \t]*-[ \t]+name:|(?![\s\S]))/gmu)) {
        const url = /^[ \t]*url:[ \t]*(\S+)/mu.exec(m[2] ?? "");
        const ref = /^[ \t]*ref:[ \t]*(\S+)/mu.exec(m[2] ?? "");
        const descMatch = /^[ \t]*desc:[ \t]*(\S[\s\S]*?)(?=^[ \t]*(?:url|ref|version|required|name):|(?![\s\S]))/mu.exec(m[2] ?? "");
        out.push({ name: m[1]!, file: full.slice(ROOT.length + 1), url: url?.[1], ref: ref?.[1], desc: descMatch?.[1] });
      }
    }
  }
  return out;
}

/** The card-face census floor (R4-04): how many card.ts faces the
 *  walk must find and how many requires rows it must parse. A card
 *  renamed off card.ts silently empties cardRequires() and every
 *  census arm below passes vacuously — the floor makes that
 *  silence LOUD. Grow it when cards land (16 faces live); a shrink
 *  means a rename in progress, never a quiet pass. */
const CARD_FACE_FLOOR = 15;  // -1: quad-remesh left with the autoremesher excision (2026-10-13)
const CARD_REQUIRES_FLOOR = 1;

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

/** Independent card-face count: same walk, no requires regex — the
 *  census floor is judged against this, never against
 *  cardRequires()' own output (a floor read from the function under
 *  test is no floor). */
function cardFaceCount(): number {
  let n = 0;
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === "node_modules" || entry === "lib") continue;
        walk(full);
      } else if (entry === "card.ts") n++;
    }
  };
  walk(join(ROOT, "packages"));
  return n;
}

describe("THE EXTENSION CENSUS (install side ⇔ check side ⇔ card requires)", () => {
  it("every pack a card REQUIRES is in the check map (the gate must not no-op)", () => {
    // THE CENSUS FLOOR (R4-04): first prove the walk found the card
    // faces — an empty census makes every arm below vacuously green.
    expect(cardFaceCount(), "the card-face walk found fewer card.ts faces than the census floor — cards were renamed off card.ts").toBeGreaterThanOrEqual(CARD_FACE_FLOOR);
    const requiresRows = [...cardRequires().values()].reduce((n, set) => n + set.size, 0);
    expect(requiresRows, "the requires walk parsed fewer rows than its floor — the regex or the face drifted").toBeGreaterThanOrEqual(CARD_REQUIRES_FLOOR);
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
      .filter((pack) => !rows.has(pack.toLowerCase()) && !(pack in NOT_YET_INSTALLED))
      .map((pack) => `${pack} (checked at runtime, installed by no manifest)`);
    expect(missing, "these packs can be refused on an estate that could never obtain them").toEqual([]);
  });

  it("every NOT_YET_INSTALLED entry still has no manifest row (the list does not rot)", () => {
    const rows = new Set(manifestRows(PACKAGES).map((r) => r.name.toLowerCase()));
    const stale = Object.keys(NOT_YET_INSTALLED).filter((pack) => rows.has(pack.toLowerCase()));
    expect(stale, "these now HAVE a manifest row — delete them from NOT_YET_INSTALLED").toEqual([]);
  });

  it("every NOT_CHECKED entry's reason still matches the tree (the reasons do not rot)", () => {
    // A8b: rgthree's reason said "no node class our graphs address"
    // while a nodes.yaml desc claimed "Fast Groups Bypasser nodes
    // present in the window graphs" — stale prose contradicting a
    // live wall. The rot gate: every NOT_CHECKED name's manifest
    // desc must not claim a class presence our sources don't use.
    const stale: string[] = [];
    for (const name of Object.keys(NOT_CHECKED)) {
      for (const row of manifestRows(PACKAGES)) {
        if (row.name !== name) continue
        if (/present in|used (by|in)|composed (by|in)/i.test(row.desc ?? "")) {
          stale.push(`${name}: desc claims use ("${(row.desc ?? "").split("\n")[0]}") while NOT_CHECKED says nothing checks it`)
        }
      }
    }
    expect(stale, "descs claiming use a NOT_CHECKED row denies — reconcile the two").toEqual([]);
  });

  it("every manifest row is either checked or named below with a reason", () => {
    const extMap = extensionNodeTypes();
    const unchecked = manifestRows(PACKAGES)
      .filter((r) => !(r.name in extMap) && !(r.name in NOT_CHECKED))
      .map((r) => `${r.name} (${r.file})`);
    expect(unchecked, "these install a pack nothing checks — weight with no refusal to back it").toEqual([]);
  });

  it("every check-map pack names at least one node class", () => {
    const empty = Object.entries(extensionNodeTypes())
      .filter(([, nodes]) => !Array.isArray(nodes) || nodes.length === 0)
      .map(([pack]) => pack);
    expect(empty, "an empty node list is the silent gate: the check can never pass or fail").toEqual([]);
  });

  // THE REGISTRY-ZIP LAW (2026-10-15, the live impact-pack receipt):
  // an unpinned url matches Manager's channel registry map, the ZIP
  // arm runs, and the install lands a version with NO .git — the
  // landed-HEAD verify can then never close. An @<sha>-suffixed url
  // cannot match the registry map, so the git arm always runs.
  it("every url row pins a 40-hex commit sha (the registry-ZIP law)", () => {
    const unpinned = manifestRows(PACKAGES)
      .filter((r) => r.url !== undefined && !/^[0-9a-f]{40}$/iu.test(r.ref ?? ""))
      .map((r) => `${r.name} (${r.file}) url=${r.url} ref=${r.ref ?? "none"}`);
    expect(
      unpinned,
      "an unpinned url rides Manager's registry ZIP arm — the install lands with no .git and no landed HEAD can be verified",
    ).toEqual([]);
  });

  // THE CORE-SERVED LAW (2026-10-15, the phantom-pack cure): a node
  // class the pinned engine CORE serves is keyed in core_node_types,
  // never in extension_node_types — a phantom extension key lies
  // about provenance and blocks fresh estates from packs they do not
  // need (the comfyui-core-trellis2 / FrameInterpolate / CreateVideo
  // receipts).
  it("no core-served class rides an extension key (the phantom-pack law)", () => {
    const facts = JSON.parse(readFileSync(FACTS, "utf8")) as {
      core_node_types?: Record<string, readonly string[]>;
    };
    const coreFiles = facts.core_node_types ?? {};
    const shape = Object.entries(coreFiles)
      .filter(([file]) => !file.startsWith("comfy_extras/") || !Array.isArray(coreFiles[file]) || coreFiles[file].length === 0)
      .map(([file]) => file);
    expect(shape, "core_node_types keys are engine-core file paths, each with at least one class").toEqual([]);
    const coreClasses = new Set(Object.values(coreFiles).flat());
    const phantoms = Object.entries(extensionNodeTypes())
      .flatMap(([pack, nodes]) => nodes.filter((n) => coreClasses.has(n)).map((n) => `${pack} -> ${n}`));
    expect(
      phantoms,
      "these extension keys claim core-served classes — move them to core_node_types",
    ).toEqual([]);
  });
});

// ── THE VENDOR→INSTALL CENSUS (F5, nativity audit 2026-11-05) ─────
// The three-SSOT census above judges check⇔install⇔card-requires,
// but nothing judged the plane BELOW it: the vendored submodules
// themselves. Two packs (FastVAE, timeline-director) sat vendored
// and publish-disciplined while NO manifest row and NO pip dep
// installed them — the family-coverage lesson one plane up (the
// suite green while vendor/ carries dead weight). The census: every
// vendored extension submodule is either (a) named by an install
// row (nodes.yaml/extensions.yaml) or a pip-level uv source, or
// (b) ledgered RETIRED below with its reason. Deletion is the
// operator's call — this wall only makes the state NAMED.
describe("THE VENDOR→INSTALL CENSUS (every vendored submodule is installed or ledgered)", () => {
  /** Vendored extension submodule names from .gitmodules. */
  function vendoredExtensionNames(): string[] {
    const text = readFileSync(join(ROOT, ".gitmodules"), "utf8");
    const out: string[] = [];
    for (const m of text.matchAll(/\[submodule "([^"]+)"\]\n\tpath = (\S+)\n\turl = (\S+)/gu)) {
      if (m[2]!.startsWith("vendor/comfyui_extensions/")) out.push(m[2]!.split("/").pop()!);
    }
    return out;
  }

  /** Pip-level install rows: the [tool.uv.sources] git sources' repo
   *  basenames (the pyproject edge — melite-model-base installs this
   *  way, not as a manifest row). */
  function uvSourceNames(): Set<string> {
    const pyproject = readFileSync(join(ROOT, "infra/comfyui/pyproject.toml"), "utf8");
    const section = /\[tool\.uv\.sources\]\n([\s\S]*?)(?=\n\[|$)/u.exec(pyproject)?.[1] ?? "";
    return new Set([...section.matchAll(/^([\w.-]+) = \{ git = "([^"]+)", rev = "[0-9a-f]{40}" \}/gmu)]
      .map((m) => m[2]!.replace(/\.git$/u, "").split("/").pop()!));
  }

  /** Vendored but installed by NOTHING — each a DELIBERATE,
   *  operator-owned open item with its reason (the publish source of
   *  record stays vendored; deletion is the operator's call, never
   *  the wall's). */
  const RETIRED_VENDORED: Readonly<Record<string, string>> = {
    "ComfyUI-MiniMax-H3-MotionCache-FastVAE":
      "published to the Comfy registry (registry-door roster melite-minimax-h3-motioncache-fastvae 1.0.0) but never estate-installed: no nodes.yaml row, no uv source — the estate's H3 motion-cache lane rides the in-tree h3 family; the vendored tree is the publish source of record only",
    "comfyui-minimax-h3-timeline-director":
      "published to the Comfy registry (roster comfyui-minimax-h3-timeline-director 0.8.0) but never estate-installed: the estate's timeline direction lives in the h3-timeline card/kit; the vendored tree is the publish source of record only",
  };

  it("the census floor: the walk finds the vendored fleet (the vacuous guard)", () => {
    // 11 vendored today; a shrink is a deliberate submodule removal
    // in progress, never a quiet pass.
    expect(vendoredExtensionNames().length,
      "the .gitmodules walk found fewer vendored extension packs than the estate vendors — the reader rotted")
      .toBeGreaterThanOrEqual(10);
  });

  it("every vendored extension submodule is installed by a row or ledgered below", () => {
    const installed = new Set([
      ...manifestRows(PACKAGES).map((r) => r.name),
      ...uvSourceNames(),
    ]);
    const orphans = vendoredExtensionNames()
      .filter((name) => !installed.has(name) && !(name in RETIRED_VENDORED));
    expect(orphans,
      "these vendored packs are installed by NO manifest row and NO uv source, and no retirement names them — dead weight under an all-green suite (the F5 class); ledger them here or install them, never leave them nameless")
      .toEqual([]);
  });

  it("every RETIRED_VENDORED entry still has no install row (the ledger does not rot)", () => {
    const installed = new Set([
      ...manifestRows(PACKAGES).map((r) => r.name),
      ...uvSourceNames(),
    ]);
    const stale = Object.keys(RETIRED_VENDORED).filter((name) => installed.has(name));
    expect(stale,
      "these retired packs now HAVE an install row — move them out of RETIRED_VENDORED; the retirement is a lie while a row installs them")
      .toEqual([]);
  });
});
