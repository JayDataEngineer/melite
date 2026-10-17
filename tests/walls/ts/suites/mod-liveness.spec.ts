// mod-liveness.spec.ts — THE ENGINE-INPUT / LISTING HONESTY WALL
// (journey-closure E6, refs-mods' still-owed set: rows 116-118).
//
// Three laws, six firing arms (LAW 4.3 — each invariant rides its
// own arm; arms 2 and 3 each carry a second firing test).
//
// ARM 1 — THE MOD-FILE LIVENESS LAW (hop [6]/[7]; refs-mods row 116).
//   The engine listing's mod files are ALIVE: every registered loras
//   row's file is live in the engine's SERVED listing at serve time —
//   the real roster (the booted service's own flavor registrations +
//   the user rows door) × the engine's live combo (the served
//   /object_info, the same doc the lora_list door reads). A pick
//   whose file left the input dir is a 400 AFTER the money is spent;
//   this arm says so here, naming the id.
//   ARM 1b is the red-proof: a FIXTURE file (own bytes, a temp seat
//   shaped like the walk's input contract) present serves, REMOVED
//   stops serving — the judge reds NAMING THE ID — restored
//   cmp-verified (sha256 both ways).
//
// ARM 2 — THE OBJECT_INFO CACHE STALENESS LAW (hop [7]; refs-mods
//   row 117). The listing doors (lora_list, refmods_list) cannot
//   serve stale bytes after a change: a landing busts the process
//   cache and the next listing matches the engine's CURRENT doc.
//   Both arms drive the REAL dispatchManage doors over the REAL
//   global oiCache (no ctx.objectInfo seam — the seam is exactly
//   what bypasses the cache under judgment), against a local
//   generation-tagged engine double; COMFYUI_URL is the one env seam
//   resolveEngineBaseUrl reads.
//
// ARM 3 — THE MENU/COMPOSE FLAVOR LAW (hop [4]/[7]; refs-mods row
//   118, the drift ADJUDICATED: pinned lawful, honest-empty voice —
//   D5's value plane (the door, cards-admission-matrix T7) owns the
//   foreign-value refusal; this wall owns the two catalog faces).
//   For every served (card, key, pack) cell the menu's rows EQUAL
//   the compose catalog's rows that the run's family owns — the
//   menu never offers a row the door will refuse, and never hides a
//   row the door would take. Ownership derives from the REAL
//   registrations (the same read valueFamilies judges with); the
//   run family is the facts ladder owner ≡ the menu's own
//   route→atom fold. The audit's concrete faces ride as regression
//   cells: image-gen@anima honest-empty (the krea-2 sibling rows
//   never offer), the burn cell refusing at the real door, the h3
//   lane's positive control.
//
// The engine seat: arm 1 needs the LIVE engine (:8188 on lane
// machines — the E1 lane). MELITE_WALLS_OFFLINE=1 skips arm 1 LOUD
// (the model-urls-liveness class law); arms 2-3 are hermetic and
// always run.
//
// Run: npx vitest run tests/walls/ts/suites/mod-liveness.spec.ts

import { describe, it, expect } from "vitest";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../../helpers/boot-models.ts";
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import { registryIds, owningAtom, getModel, registryModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { resolveEngineBaseUrl } from "../../../../packages/engines/comfyui-cordis/src/comfyui-config.ts";
import { liveObjectInfo, invalidateObjectInfo } from "../../../../packages/engines/comfyui-cordis/src/comfyui-transport.ts";
import {
  loraNamesFromObjectInfo,
  refmodNamesFromObjectInfo,
  readUserLoraRows,
  unboardedRows,
  userLorasPath,
  validateUserLoraRow,
  type UserLoraRow,
} from "../../../../packages/engines/comfyui-cordis/src/userLoras.ts";
import { boardedMap, resolveSpecKey, specBody } from "../../../../packages/harness/melite-tools/src/discovery.ts";
import { dispatchManage } from "../../../../packages/harness/estate-queue/src/managePlane.ts";
import type { ManageCtx } from "../../../../packages/harness/estate-queue/src/managePlane.ts";
import { factsPath } from "../../../../packages/harness/estate-queue/src/cardsFacts.ts";
import { loadFacts } from "../../../../packages/engines/comfyui-card-kit/src/facts.ts";
import { ComposeRefusal } from "../../../../packages/engines/comfyui-card-kit/src/errors.ts";

const OFFLINE = process.env["MELITE_WALLS_OFFLINE"] === "1";

type Row = { id: string; filename: string; families: string[] };

/** The loras-pack roster the doors serve, derived (never hand-listed):
 *  the booted service's own loras flavor registrations + the user
 *  rows file when present. */
function registeredLorasRows(): Row[] {
  const svc = theService();
  const rows: Row[] = svc
    .flavorRegistrations()
    .filter((f) => f.pack === "loras")
    .flatMap((f) => (f.rows ?? []).map((r): Row => ({ id: r.id, filename: r.filename, families: [...f.families] })));
  const userFile = readUserLoraRows(userLorasPath());
  rows.push(...userFile.rows.map((r): Row => ({ id: r.id, filename: r.filename, families: [...r.families] })));
  return rows;
}

/** The engine input dir's listing contract, made explicit for the
 *  fixture seat: every lora file under the root, relative subpaths —
 *  the same shape the engine's folder_paths enumeration serves as the
 *  LoraLoaderModelOnly combo. */
function loraListing(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string, prefix: string): void => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix === "" ? name.name : `${prefix}/${name.name}`;
      if (name.isDirectory()) walk(join(dir, name.name), rel);
      else if (/\.(safetensors|ckpt|pt|bin|gguf)$/i.test(name.name)) out.push(rel);
    }
  };
  walk(root, "");
  return out.sort();
}

const sha256 = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

describe("ARM 1 — THE MOD-FILE LIVENESS LAW (every registered mod id's file is live in the engine input dir at serve time)", () => {
  describe.skipIf(OFFLINE)("the live engine seat", () => {
    it("every registered loras row's file is in the engine's served listing", { timeout: 60_000 }, async () => {
      const rows = registeredLorasRows();
      assert.ok(
        rows.length >= 30,
        `the registered-row census moved (${rows.length} rows) — update this floor deliberately`,
      );
      let server: string;
      try {
        server = resolveEngineBaseUrl();
      } catch (e) {
        throw new Error(
          `no engine endpoint configured — the live liveness arm cannot prove the listing (${e instanceof Error ? e.message : String(e)}); point COMFYUI_URL at the engine or set MELITE_WALLS_OFFLINE=1 for the loud skip`,
        );
      }
      const doc = await liveObjectInfo(server);
      const combo = loraNamesFromObjectInfo(doc);
      assert.ok(
        combo.length > 0,
        "the engine's served listing carries no LoraLoaderModelOnly combo — the loras door cannot be honest against this engine",
      );
      const unboarded = unboardedRows(rows, combo);
      assert.deepEqual(
        unboarded,
        [],
        `registered loras rows with NO live file in the engine input dir (a pick 400s at /prompt after the money is spent):\n${unboarded.join("\n")}`,
      );

      // THE CONTROLNET CLASS RIDES THE SAME DOC (one listing law): the
      // z-image lane loads its union file through ModelPatchLoader —
      // the wall reads that combo with the same bounds-checked grammar
      // the exported readers spell (node → input → required → name).
      const cnRows = theService()
        .flavorRegistrations()
        .filter((f) => f.pack === "controlnet")
        .flatMap((f) => (f.rows ?? []).map((r): Row => ({ id: r.id, filename: r.filename, families: [...f.families] })));
      const node = (doc as Record<string, unknown>)["ModelPatchLoader"] as
        | { input?: { required?: { name?: unknown } } }
        | undefined;
      const cnNames: string[] = (() => {
        const field = node?.input?.required?.name;
        if (!Array.isArray(field)) return [];
        const names = field[0];
        return Array.isArray(names) ? names.filter((n): n is string => typeof n === "string" && n !== "") : [];
      })();
      if (cnRows.length > 0 && cnNames.length > 0) {
        const cnUnboarded = unboardedRows(cnRows, cnNames);
        assert.deepEqual(
          cnUnboarded,
          [],
          `registered controlnet rows with no live file in the engine input dir:\n${cnUnboarded.join("\n")}`,
        );
      }
    });
  });

  it("ARM 1b — the red-proof: a mod file present serves, REMOVED stops serving (the arm reds NAMING THE ID; restore cmp-verified)", () => {
    const seat = mkdtempSync(join(tmpdir(), "e6-loras-seat-"));
    try {
      // the fixture (own bytes, not the tree's real mods) in the seat's
      // family subdir — the roster's own filename grammar. A KEEPER
      // file stays beside it: removing ONE lora must not empty the
      // listing (the real engine keeps its other files — an emptied
      // combo is the honest-absent pole that refuses nothing).
      mkdirSync(join(seat, "e6-redproof"), { recursive: true });
      const file = join(seat, "e6-redproof", "e6_redproof_lora.safetensors");
      writeFileSync(file, Buffer.alloc(64, 9));
      writeFileSync(join(seat, "e6-redproof", "e6_redproof_keeper.safetensors"), Buffer.alloc(32, 5));
      const before = sha256(file);

      // the row registers through the REAL validator (the user rows
      // door's own row shape — no wall-private catalog)
      const { row, problem } = validateUserLoraRow(
        { id: "e6_redproof_lora", filename: "e6-redproof/e6_redproof_lora.safetensors", families: ["e6-fixture"] },
        0,
      );
      assert.equal(problem, undefined, "the fixture row must validate clean through the real door");
      const rows: UserLoraRow[] = row !== undefined ? [row] : [];

      // PRESENT: the file is live in the input dir — the row serves
      assert.deepEqual(
        unboardedRows(rows, loraListing(seat)),
        [],
        "a present fixture file must serve (the liveness judge's green pole)",
      );

      // REMOVED: the file leaves the input dir — the arm reds NAMING
      // THE ID (the red-proof's shape: the judge, not a presence probe)
      renameSync(file, join(seat, "e6-redproof", "e6_redproof_lora.moved"));
      const unboarded = unboardedRows(rows, loraListing(seat));
      assert.equal(unboarded.length, 1, "the removed fixture must unboard exactly one row");
      assert.ok(
        unboarded[0]?.includes("e6_redproof_lora"),
        `the red must NAME THE ID, got: ${String(unboarded[0])}`,
      );

      // RESTORED, cmp-verified: same name, same bytes, serving again
      renameSync(join(seat, "e6-redproof", "e6_redproof_lora.moved"), file);
      assert.equal(sha256(file), before, "the restored bytes differ — the fixture did not survive the proof");
      assert.deepEqual(unboardedRows(rows, loraListing(seat)), []);
    } finally {
      rmSync(seat, { recursive: true, force: true });
    }
  });
});

// ── ARM 2 — the listing doors over the REAL global cache ──────────

/** A manage ctx with NO objectInfo seam — the seam's absence routes
 *  objectInfoDoc to the estate's global liveObjectInfo, which is the
 *  cache under judgment. Mirrors the manage-lora-doors ctx shape. */
function cacheCtx(repoRoot: string): ManageCtx {
  const fakeProvisioning = {
    ensure: async (): Promise<never> => { throw new Error("unreached"); },
    activate: async (): Promise<never> => { throw new Error("unreached"); },
    restart: async (): Promise<never> => { throw new Error("unreached"); },
    waitUntilReady: async (): Promise<never> => { throw new Error("unreached"); },
  } as unknown as ManageCtx["provisioning"];
  return {
    repoRoot,
    endpoint: () => ({ provision: "managed", url: process.env["COMFYUI_URL"] ?? "" }),
    models: { allDecls: () => [] } as unknown as ManageCtx["models"],
    provisioning: fakeProvisioning,
    timeout: (cb: () => void): (() => void) => {
      const t = setTimeout(cb, 0);
      return () => { clearTimeout(t); };
    },
  } as unknown as ManageCtx;
}

/** The generation-tagged engine double: every /object_info fetch
 *  answers the CURRENT generation (G1: one lora + one refmod stem;
 *  G2: the landed world). Generation changes only when the arm moves
 *  it — the double IS the engine's world. */
function engineDouble(): Promise<{
  base: string
  servedCount: () => number
  setGeneration: (g: number) => void
  close: () => Promise<void>
}> {
  let generation = 1;
  let served = 0;
  const srv = createServer((req, res) => {
    if (String(req.url).includes("object_info")) {
      served += 1;
      const g = generation;
      const loras = g === 1 ? ["e6-gen1/alpha.safetensors"] : ["e6-gen1/alpha.safetensors", "beta.safetensors"];
      const stems = g === 1 ? ["(none)", "pack_a"] : ["(none)", "pack_a", "pack_b"];
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        generation: g,
        LoraLoaderModelOnly: { input: { required: { lora_name: [loras, {}] } } },
        MiniMaxH3RefModsLoader: { input: { required: { mod_1: [stems, {}] } } },
      }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end("{}");
  });
  return new Promise((resolve) => {
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr !== null ? addr.port : 0;
      resolve({
        base: `http://127.0.0.1:${port}`,
        servedCount: () => served,
        setGeneration: (g: number): void => { generation = g; },
        close: () => new Promise<void>((res) => { srv.closeAllConnections(); srv.close(() => res()); }),
      });
    });
  });
}

type ManageAnswer = { ok: boolean; detail: string; data?: Record<string, unknown> };
const manage = (doc: Record<string, unknown>, ctx: ManageCtx): Promise<ManageAnswer> =>
  dispatchManage(doc, ctx).then((out) => (out as unknown as [number, ManageAnswer])[1]);

describe("ARM 2 — THE OBJECT_INFO CACHE STALENESS LAW (the listing doors serve the current graph, never stale bytes)", () => {
  it("a landing busts the cache: the doors re-fetch and the listing matches the CHANGED engine", { timeout: 30_000 }, async () => {
    const engine = await engineDouble();
    const repoRoot = mkdtempSync(join(tmpdir(), "e6-cache-root-"));
    const lorasDir = mkdtempSync(join(tmpdir(), "e6-cache-loras-"));
    const srcRoot = mkdtempSync(join(tmpdir(), "e6-land-src-"));
    const prevUrl = process.env["COMFYUI_URL"];
    const prevDir = process.env["MELITE_COMFYUI_LORAS_DIR"];
    process.env["COMFYUI_URL"] = engine.base;
    process.env["MELITE_COMFYUI_LORAS_DIR"] = lorasDir;
    try {
      const ctx = cacheCtx(repoRoot);
      // G1: both listing doors read the cached doc (ONE fetch fills it)
      const list1 = await manage({ action: "lora_list" }, ctx);
      assert.equal(list1.ok, true, list1.detail);
      assert.deepEqual((list1.data as Record<string, unknown>)["engine_loras"], ["e6-gen1/alpha.safetensors"]);
      const ref1 = await manage({ action: "refmods_list" }, ctx);
      assert.deepEqual((ref1.data as Record<string, unknown>)["stems"], ["pack_a"]);
      assert.equal(engine.servedCount(), 1, "the two listing reads must share ONE cached fetch");

      // THE WORLD CHANGES (a file lands; the engine's doc would change)
      // and the REAL LANDING DOOR fires — lora_install drops the cache
      // and re-reads BEFORE answering (the :1862 drop-then-read law).
      const src = join(srcRoot, "beta.safetensors");
      writeFileSync(src, Buffer.alloc(32, 3));
      // move the world forward ONLY after the fixture exists — the
      // double's G2 names the landed file, as the restarted engine would
      engine.setGeneration(2);

      const inst = await manage({ action: "lora_install", path: src, families: ["e6-fixture"] }, ctx);
      const instData = (inst.data ?? {}) as Record<string, unknown>;
      // the door's OWN post-drop read must answer the CURRENT doc — the
      // freshly landed name is already in the served combo (no restart
      // owed against a world the cache has not outlived)
      assert.equal(instData["in_combo_now"], true,
        `the landing door answered against a stale doc (in_combo_now=${String(instData["in_combo_now"])}) — the drop did not precede its read`);

      // the NEXT listing serves the changed world — never the stale G1
      const list2 = await manage({ action: "lora_list" }, ctx);
      assert.deepEqual((list2.data as Record<string, unknown>)["engine_loras"],
        ["e6-gen1/alpha.safetensors", "beta.safetensors"],
        "lora_list served STALE bytes after the landing — the cache outlived the change");
      const ref2 = await manage({ action: "refmods_list" }, ctx);
      assert.deepEqual((ref2.data as Record<string, unknown>)["stems"], ["pack_a", "pack_b"],
        "refmods_list served STALE stems after the landing");
      assert.equal(engine.servedCount(), 2,
        "exactly two fetches: the G1 fill and the landing's post-drop re-fetch — cached reads never re-fetch");
    } finally {
      if (prevUrl === undefined) delete process.env["COMFYUI_URL"];
      else process.env["COMFYUI_URL"] = prevUrl;
      if (prevDir === undefined) delete process.env["MELITE_COMFYUI_LORAS_DIR"];
      else process.env["MELITE_COMFYUI_LORAS_DIR"] = prevDir;
      rmSync(repoRoot, { recursive: true, force: true });
      rmSync(lorasDir, { recursive: true, force: true });
      rmSync(srcRoot, { recursive: true, force: true });
      await engine.close();
    }
  });

  it("an invalidation landing mid-fetch never poisons the door's next read", { timeout: 30_000 }, async () => {
    // the double's FIRST fetch is held until the arm releases it — the
    // invalidation lands while the door's read is in flight. A holder
    // object, not a bare let: the resolver assigns from a callback, so
    // a bare `releaseFirst?.()` narrows to never-callable.
    const gate: { release: (() => void) | null } = { release: null };
    const held = new Promise<void>((resolve) => { gate.release = resolve; });
    let generation = 1;
    let served = 0;
    const srv = createServer((req, res) => {
      if (String(req.url).includes("object_info")) {
        served += 1;
        const g = generation;
        const loras = g === 1 ? ["e6-stale/old.safetensors"] : ["e6-fresh/new.safetensors"];
        if (served === 1) {
          void held.then(() => {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({
              generation: g,
              LoraLoaderModelOnly: { input: { required: { lora_name: [loras, {}] } } },
            }));
          });
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          generation: g,
          LoraLoaderModelOnly: { input: { required: { lora_name: [loras, {}] } } },
        }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
    });
    const base = await new Promise<string>((resolve) => {
      srv.listen(0, "127.0.0.1", () => {
        const addr = srv.address();
        resolve(`http://127.0.0.1:${typeof addr === "object" && addr !== null ? addr.port : 0}`);
      });
    });
    const repoRoot = mkdtempSync(join(tmpdir(), "e6-race-root-"));
    const prevUrl = process.env["COMFYUI_URL"];
    process.env["COMFYUI_URL"] = base;
    try {
      const ctx = cacheCtx(repoRoot);
      const inFlight = manage({ action: "lora_list" }, ctx);
      // the world changes and the invalidator fires MID-FLIGHT — the
      // exact function every landing door calls (managePlane's
      // invalidateLiveObjectInfo rides this export, keyed the same way)
      generation = 2;
      invalidateObjectInfo(base);
      gate.release?.();
      const answer = await inFlight;
      assert.deepEqual((answer.data as Record<string, unknown>)["engine_loras"], ["e6-fresh/new.safetensors"],
        "the mid-flight read answered the PRE-DROP doc — the stale fetch was served instead of discarded");
      // the poisoned bytes never entered the cache: the next read must
      // answer the CURRENT doc without re-fetching (served stays 2)
      const again = await manage({ action: "lora_list" }, ctx);
      assert.deepEqual((again.data as Record<string, unknown>)["engine_loras"], ["e6-fresh/new.safetensors"]);
      assert.equal(served, 2, "the post-drop read must ride the re-fetch's cache, never a third fetch");
    } finally {
      if (prevUrl === undefined) delete process.env["COMFYUI_URL"];
      else process.env["COMFYUI_URL"] = prevUrl;
      rmSync(repoRoot, { recursive: true, force: true });
      srv.closeAllConnections();
      await new Promise<void>((res) => srv.close(() => res()));
    }
  });
});

// ── ARM 3 — the menu/compose flavor law (the two catalog faces) ───

/** The owning families of one mod id, derived from the REAL
 *  registrations — the same read the door's value plane judges with
 *  (service.ts valueFamilies), spelled from the public registration
 *  door so the wall derives rather than copies. */
function owningFamilies(pack: string, id: string): string[] {
  const owned = new Set<string>();
  for (const f of theService().flavorRegistrations()) {
    if (f.pack !== pack) continue;
    if ((f.rows ?? []).some((r) => r.id === id)) {
      for (const fam of f.families) owned.add(fam);
    }
  }
  return [...owned].sort();
}

describe("ARM 3 — THE MENU/COMPOSE FLAVOR LAW (the menu's rows equal the composable rows on every served lane)", () => {
  it("menu rows ≡ the compose catalog's run-family-owned rows, across the derived serve universe", async () => {
    const svc = theService();
    const defs = await loadCardDefs();
    const boarded = boardedMap(defs);
    const drift: string[] = [];
    let cells = 0;
    // the universe is DERIVED: every registry address ∪ every card id
    // (the alias-key pole), resolved through the spec door's own walk
    for (const key of [...registryIds(), ...defs.keys()]) {
      const res = resolveSpecKey(key, defs, boarded);
      const model = res?.model;
      if (res === null || model === undefined) continue;
      const def = defs.get(res.card);
      if (def === undefined) continue;
      // THE REAL MENU DOOR: the served form-spec body — the exact
      // projection the client's mods leaf renders (never a re-read of
      // the service accessor, which could silently stop matching the
      // walk)
      const body = specBody(svc, defs, res);
      const envelopeKey = owningAtom(model);
      const menuMods = body.features?.modifiers;
      assert.ok(
        menuMods !== undefined,
        `the served spec for ${res.card}@${model} carries no modifiers leaf — the menu door's mods face is gone`,
      );
      for (const mod of menuMods) {
        const pack = mod.schema_key;
        assert.ok(
          pack !== undefined,
          `a served modifier for ${res.card}@${model} carries no schema_key — the menu door's mod face is unattributed`,
        );
        cells += 1;
        // the menu face: the served options, verbatim
        const menuIds = (mod.options ?? []).map((o) => o.value).sort();
        // the compose face: the door's own catalog
        const compose = svc.modCatalogForCompose(pack, model, def.boarded ?? []);
        // THE LAW: the menu offers exactly the composable rows — the
        // compose catalog's rows the run's family owns (the door's
        // value plane). The compose catalog may carry the door-refused
        // remainder (the boarded-families fallback; D5's wall owns the
        // refusal half) — it may never OWN a row the menu hides, and
        // the menu may never offer a row the door refuses.
        const owned = compose.rows.filter((r) => owningFamilies(pack, r.id).includes(envelopeKey)).map((r) => r.id).sort();
        if (menuIds.join("|") !== owned.join("|")) {
          drift.push(
            `${res.card}@${model}/${pack}: menu=[${menuIds.join(",") || "∅"}] composable=[${owned.join(",") || "∅"}]` +
            ` compose=[${compose.rows.map((r) => r.id).sort().join(",") || "∅"}]`,
          );
        }
      }
    }
    assert.ok(
      cells >= 20,
      `the served-cell census moved (${cells} cells) — update this floor deliberately`,
    );
    assert.deepEqual(
      drift,
      [],
      `the menu and the compose catalogs disagree about what composes ` +
      `(a pick the menu offers must survive the door; a row the door takes must be offered):\n${drift.join("\n")}`,
    );
  });

  it("the audit's concrete faces: image-gen@anima honest-empty, the burn cell refuses at the real door, h3 is the positive control", async () => {
    const svc = theService();
    // THE FACTS SEAT (the compose door's own requirement — the D5
    // harness shape): the real facts file through the kit's one
    // loader, riding the models registry reads (the boot's own
    // derivation — facts.ts injects, callers pass the reads).
    svc.setFacts(loadFacts(factsPath(), {
      getModel: (id: string) => getModel(id),
      registryIds: () => registryIds(),
      registryModel: (id: string) => registryModel(id),
    }));
    // THE HONEST-EMPTY CELL (the drift's menu side is the LAWFUL half):
    // anima carries no first-party loras rows — the menu serves none,
    // and the krea-2 sibling rows (compose's fallback remainder) are
    // exactly the rows the door refuses. The menu never offers them.
    const menuAnima = svc.modCatalog("loras", "anima");
    assert.deepEqual(
      menuAnima.rows.map((r) => r.id),
      [],
      "image-gen@anima must serve the honest empty (no anima rows exist)",
    );
    const composeAnima = svc.modCatalogForCompose("loras", "anima", ["krea-2", "z-image", "anima", "qwen-img-21", "flux-klein"]);
    const foreign = composeAnima.rows.filter((r) => !owningFamilies("loras", r.id).includes("anima"));
    assert.ok(
      foreign.length > 0,
      "the drift cell must still exist in the compose catalog (the fallback remainder) — the door-refused half D5's wall judges",
    );

    // THE BURN CELL AT THE REAL DOOR (hop 4): a krea-2 pick on an anima
    // run refuses NAMED — the composable-set law's enforcement half.
    try {
      svc.compose("image-gen", "anima", {
        prompt: "e6 flavor-law burn cell",
        loras: [{ id: "krea2_realism_lora", strength: 0.7 }],
      }, "e6-flavor-burn");
      assert.fail("a foreign-family pick composed GREEN — the door's value plane is down (D5's wall would also red)");
    } catch (e) {
      assert.ok(e instanceof ComposeRefusal, `the refusal must be a ComposeRefusal, got: ${String(e)}`);
      assert.equal(e.code, "foreign-family-value", `the door's own value-plane code, not an incidental wall (got ${e.code})`);
      assert.ok(e.message.includes("krea2_realism_lora"), "the refusal names the value");
      assert.ok(e.message.includes("'krea-2'"), "the refusal names the value's family");
      assert.ok(e.message.includes("'anima'"), "the refusal names the run's family");
    }

    // THE POSITIVE CONTROL: the h3 lane serves its roster on BOTH faces
    // (the run family owns every row — menu and compose agree in full)
    const menuH3 = svc.modCatalog("loras", "h3").rows.map((r) => r.id).sort();
    const composeH3 = svc.modCatalogForCompose("loras", "h3", ["h3"]).rows.map((r) => r.id).sort();
    assert.ok(menuH3.length >= 10, `the h3 roster census moved (${menuH3.length}) — update this floor deliberately`);
    assert.deepEqual(menuH3, composeH3, "the h3 lane's two faces must serve the same rows");
    for (const id of menuH3) {
      assert.ok(
        owningFamilies("loras", id).includes("h3"),
        `h3 row '${id}' is not owned by the h3 family — the positive control's ownership moved`,
      );
    }
  });
});
