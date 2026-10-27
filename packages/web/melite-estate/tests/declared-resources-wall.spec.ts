// THE DECLARED-RESOURCES WALL (2026-10-13, operator order: "WE WANT
// TO CATCH ERRORS BEFORE THE APP SHIPS, BEFORE WE OPEN AND USE THE
// APP"). Every resource the assets tab can offer — family models,
// card provisions, extensions — resolves HERE, through the ONE
// contract door the seat itself consumes (declarationPort; zero
// drift: the wall never re-derives a plan). A ref that cannot
// produce a plan is a download dialog waiting to fail mid-session:
// it reds in CI, named, with its register row's cure.
//
// Three laws, the face-lane-unity precedent:
//   1. every observed debt — a download-intent refusal, or a cell
//      naming a source with no artifact — carries a REGISTER row (a
//      NEW violation reds loud; the set never grows silently);
//   2. every register row must still be violated (a stale row reds —
//      the cure landed, the row is deleted debt);
//   3. every plan that DOES resolve is structurally load-bearing:
//      non-empty, absolute https urls, one-segment names, folders.
import "../../../../tests/helpers/boot-models.ts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { loadCardDefs, modelsService } from "@melite/comfyui-cordis";
import { declarationPort } from "../src/provisioning.ts";
import type { ResourceRef } from "@melite/estate-provisioning";

// The wall runs against the REAL checkout's declarations (the
// extensions manifest and model facts ride the repo root) — never
// the rig's fixture root a sibling spec may have left in the env.
// FOUR hops (tests → melite-estate → web → packages → repo). The old
// five-hop pin landed one directory ABOVE the checkout and stayed
// green only because the audit-019 F1 walk served ZERO extension
// refs — the extension branch never ran, so the wrong root was never
// exercised. The shipped-manifest cure surfaced the 24 refs and the
// mispin with them.
process.env["MELITE_REPO_ROOT"] = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
);

/** The refs whose declaration debt is REGISTERED: the key is the
 *  family id (model families), `card/<id>`, or `extension/<id>`;
 *  the value names the verified upstream truth and the owed cure.
 *  Both arms consume it — the resolve arm (a download-intent family
 *  whose plan refuses) and the half-shape arm (cells naming sources
 *  with no artifact) — and the stale check deletes a row the day
 *  its cure lands. */
// THE REGISTER IS EMPTY (2026-10-13): the four audio families'
// cures LANDED — ace-step and moss cells carry CLI-verified
// artifact rows (source_url + sha256 + size), music3 and yue2
// shed their stale GGUF sources (their Comfy-Org safetensors
// provisions were already the truth), and the ace-step sft/xl
// phantoms are deleted. A future half-shape offender reds here
// unregistered — the register is for acknowledged, dated debt
// only, never a permanent exemption.
const REGISTERED_PROVISION_REPAIRS: Record<string, string> = {};

/** The register key a ref's debt lives under. */
const registerKey = (ref: ResourceRef): string =>
  ref.kind === "model"
    ? (ref.owner === "family" ? ref.id : `card/${ref.id}`)
    : `extension/${ref.id}`;

/** Does the family DECLARE download intent? A tool family (tagger,
 *  upscale-tools, input-prep…) declares no weights and downloads
 *  nothing — a plan-less resolve is its honest answer, never a
 *  defect. The defect class is download intent that produces no
 *  plan: a cell naming a source (the declaration SAYS this family
 *  has weights) with no artifact row to fetch it with. Snapshot
 *  rows are intent too (2026-11-10): a whole-dir tree is bytes the
 *  family promises to fetch. */
const declaresDownloadIntent = (id: string): boolean => {
  const decl = modelsService().getModel(id) as {
    provisions?: readonly unknown[];
    snapshot_provisions?: readonly unknown[];
    variants?: readonly {
      cells?: readonly { source?: unknown }[];
    }[];
  };
  if ((decl.provisions ?? []).length > 0) return true;
  if ((decl.snapshot_provisions ?? []).length > 0) return true;
  return (decl.variants ?? []).some((v) =>
    (v.cells ?? []).some((c) => c.source !== null && c.source !== undefined),
  );
};

/** Does the family DECLARE FETCHABLE BYTES — provisions, snapshot
 *  rows, or a variant-cell artifact? THE ROSTER LAW's truth source
 *  (the 8 false-'failed' rows + lying-Download cure, 2026-11-10):
 *  list() offers exactly these families; a hand-placed-only family
 *  (moss-sfx's source tree, tool families) has no fetchable row and
 *  must never appear — a listed-but-unplannable ref is a 'failed'
 *  face for weights that were never downloadable. */
const declaresFetchableBytes = (id: string): boolean => {
  const decl = modelsService().getModel(id) as {
    provisions?: readonly unknown[];
    snapshot_provisions?: readonly unknown[];
    variants?: readonly {
      cells?: readonly { artifact?: unknown }[];
    }[];
  };
  if ((decl.provisions ?? []).length > 0) return true;
  if ((decl.snapshot_provisions ?? []).length > 0) return true;
  return (decl.variants ?? []).some((v) =>
    (v.cells ?? []).some((c) => c.artifact !== null && c.artifact !== undefined),
  );
};

const freshPort = async (): Promise<{
  refs: readonly ResourceRef[];
  resolve: (ref: ResourceRef) => Promise<unknown>;
}> => {
  const ctx = new Context();
  const defs = await loadCardDefs();
  const original = ctx.get.bind(ctx);
  ctx.get = ((name: string, optional?: boolean) => {
    if (name === "cardRegistry") return { defsSync: () => defs };
    return original(name, optional);
  }) as typeof ctx.get;
  const port = declarationPort(ctx);
  // the optional walk door, asserted loud — an undefined door is a
  // provisioning contract break, not an empty walk
  const listDoor = port.list;
  assert.ok(listDoor, "declarationPort serves no list door");
  return { refs: await listDoor.call(port), resolve: port.resolve.bind(port) };
};

describe("the declared resources resolve before the app ships", () => {
  test("every plan resolves sound and every source names its artifact", async () => {
    const { refs, resolve: resolveRef } = await freshPort();
    // >= 40 -> >= 35 -> >= 30 -> >= 20 (2026-11-10: the fetchable
    // roster law — 10 hand-placed/tool families left the roster
    // with their false-'failed' faces; 24 enumerate now, the floor
    // stays a silent-boot-failure trip, not a census).
    assert.ok(
      refs.length >= 20,
      `the declaration port enumerated ${refs.length} refs — the ` +
        `registry boot failed silently (families+cards+extensions ` +
        `expect dozens)`,
    );

    const refused: string[] = [];
    const structural: string[] = [];
    // The register keys with observed debt this pass — the stale
    // check needs BOTH arms' signals, so one pass collects them.
    const violated = new Set<string>();

    for (const ref of refs) {
      const key = registerKey(ref);
      let plan: { items: { kind: string; name?: string; url?: string; folder?: string }[] };
      try {
        plan = (await resolveRef(ref)) as typeof plan;
      } catch (error: unknown) {
        const cure = REGISTERED_PROVISION_REPAIRS[key];
        const intent =
          ref.kind !== "model" ||
          ref.owner !== "family" ||
          declaresDownloadIntent(ref.id);
        violated.add(key);
        if (cure === undefined && intent) {
          refused.push(
            `${key}: ${(error as Error).message} — a NEW provision ` +
              `refusal on a family that DECLARES download intent; ` +
              `the assets tab would offer a download that fails ` +
              `mid-session. Register it with its verified upstream ` +
              `cure, or fix the declaration.`,
          );
        }
        continue;
      }
      if (plan.items.length === 0) {
        structural.push(`${key}: resolved an EMPTY plan`);
      }
      for (const item of plan.items) {
        if (item.kind === "model") {
          if (!/^https:\/\/.+/.test(item.url ?? "")) {
            structural.push(`${key}: item '${item.name}' url is not ` +
              `absolute https: '${String(item.url)}'`);
          }
          const name = item.name ?? "";
          if (name === "" || name.includes("/") || name.includes("\\")) {
            structural.push(`${key}: item name '${name}' is not one ` +
              `path segment (the landed file's name must be a ` +
              `basename)`);
          }
          if ((item.folder ?? "") === "") {
            structural.push(`${key}: item '${name}' names no folder`);
          }
        } else if (item.kind === "snapshot") {
          // THE SNAPSHOT ARM (2026-11-10): a whole-dir tree row is
          // load-bearing the same way a single-file row is — repo,
          // revision pin, patterns, one-segment tree name, folder.
          // A malformed pin here is a Download button that fetches
          // the wrong tree or nothing.
          const snap = item as { name?: string; folder?: string; repoId?: string; revision?: string; allowPatterns?: string[] };
          if (!/^[^/\s]+\/[^/\s]+$/.test(snap.repoId ?? "")) {
            structural.push(`${key}: snapshot '${snap.name}' repoId ` +
              `is not owner/name: '${String(snap.repoId)}'`);
          }
          if (!/^[0-9a-f]{40}$/i.test(snap.revision ?? "")) {
            structural.push(`${key}: snapshot '${snap.name}' revision ` +
              `is not a 40-hex pin: '${String(snap.revision)}'`);
          }
          if ((snap.allowPatterns ?? []).length === 0) {
            structural.push(`${key}: snapshot '${snap.name}' carries ` +
              `no allow patterns (the fetch has no bounds)`);
          }
          const name = snap.name ?? "";
          if (name === "" || name.includes("/") || name.includes("\\")) {
            structural.push(`${key}: snapshot name '${name}' is not ` +
              `one path segment (the landed tree's name)`);
          }
          if ((snap.folder ?? "") === "") {
            structural.push(`${key}: snapshot '${name}' names no folder`);
          }
        }
      }
    }

    // The half-shape arm (the ModelDecl contract — the same schema
    // registerFamily validates): source = the landed file's name,
    // artifact = the download. A cell with one and not the other is
    // the half-shape — downloadable-looking in the face,
    // undeliverable at the seat. The resolve arm alone cannot see a
    // family whose provisions rows mask a dead cell (music3, yue2:
    // the plan succeeds on the provisions items while the weights
    // cell delivers nothing) — this arm cannot be fooled.
    for (const id of modelsService().registryIds()) {
      const decl = modelsService().getModel(id) as {
        variants?: readonly {
          id?: string;
          cells?: readonly {
            quant?: string;
            source?: unknown;
            artifact?: unknown;
          }[];
        }[];
      };
      for (const v of decl.variants ?? []) {
        for (const c of v.cells ?? []) {
          if (
            c.source !== null &&
            c.source !== undefined &&
            (c.artifact === null || c.artifact === undefined)
          ) {
            violated.add(id);
            if (REGISTERED_PROVISION_REPAIRS[id] === undefined) {
              refused.push(
                `${id}/${v.id ?? "?"}/${c.quant ?? "?"}: source ` +
                  `${JSON.stringify(c.source)} with no artifact row — ` +
                  `the declaration names weights it cannot fetch. ` +
                  `Register the family with its verified upstream ` +
                  `cure, or add the artifact row.`,
              );
            }
          }
        }
      }
    }

    const staleRows = Object.keys(REGISTERED_PROVISION_REPAIRS)
      .filter((key) => !violated.has(key))
      .map((key) =>
        `${key} is registered as broken but shows no debt this pass — ` +
          `the cure landed; delete the register row (dead debt is ` +
          `deleted, never parked).`,
      );
    assert.deepEqual(refused, [], "NEW declaration debt");
    assert.deepEqual(staleRows, [], "stale register rows");
    assert.deepEqual(structural, [], "structurally unsound plans");
  });

  test("the register holds only refs that exist", async () => {
    const { refs } = await freshPort();
    const declared = new Set(refs.map(registerKey));
    const ghosts = Object.keys(REGISTERED_PROVISION_REPAIRS).filter(
      (key) => !declared.has(key),
    );
    assert.deepEqual(
      ghosts,
      [],
      "register rows naming no declared ref (renamed or deleted " +
        "families leave their debt row behind)",
    );
  });

  // THE ROSTER LAW (the 8 false-'failed' rows + the lying Download
  // button, 2026-11-10): list() offers the families that declare
  // fetchable bytes (provisions | snapshots | cell artifact) — a
  // fetchable family OFF the roster is a hidden Download. BURN D
  // (2026-10-26, "how does models without links go all green?")
  // SUPERSEDED the hide: hand-placed-only families RIDE the roster
  // as the debt band — the census row serves fetchable:false and
  // the assets tab renders the hand-placed copy (never a failed
  // face: a zero-item plan aggregates 'absent', and the band copy
  // owns the Download door). Hidden was never green, it was
  // invisible.
  test("the roster offers every family — fetchable rows carry a Download, hand-only rows ride the debt band", async () => {
    const { refs } = await freshPort();
    const listed = new Set(refs
      .filter((ref) => ref.kind === "model" && ref.owner === "family")
      .map((ref) => ref.id));
    const expected = new Set(modelsService().registryIds());
    const hidden = [...expected].filter((id) => !listed.has(id));
    const phantom = [...listed].filter((id) => !expected.has(id));
    assert.deepEqual(
      hidden,
      [],
      "a family missing from the roster is invisible — fetchable " +
        "rows hide a Download, hand-only rows hide the debt band",
    );
    assert.deepEqual(
      phantom,
      [],
      "roster rows naming no registry family are phantoms",
    );
    const handOnly = [...listed].filter((id) => !declaresFetchableBytes(id));
    assert.ok(handOnly.length > 0, "the debt band exists — hand-only families are named, not hidden");
  });
});
