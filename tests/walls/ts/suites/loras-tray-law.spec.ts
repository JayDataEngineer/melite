import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

/**
 * THE LORAS TRAY LAW (operator 2026-11-04: "I want the functionality
 * of adding random loras I found online, providing it to the agent,
 * and then having it appear under loras mod with the right name, to
 * just work").
 *
 * The engine's own loras dir is the operator's picker tray. Every
 * weights file under a family dir that boards the loras pack serves
 * as a picker row — the dir names the family, the filename is the
 * right name, the file's presence is the row's truth. No rows file,
 * no per-file blessing, nothing fetched (the mods fate: the tray
 * serves what is already on disk; a tray row claims no source_url
 * because the drop has none — nothing fetches, nothing lies).
 *
 * The seams this pins:
 * - ENUMERATION: family dirs name families; root files, dotfiles,
 *   and non-weights files never serve.
 * - THE SERVE: the real composed mod plane carries a row for every
 *   tray file under a boarding family — static or tray, the file
 *   APPEARS (the operator's drop lands in the picker).
 * - THE RIGHT NAME: a tray row's label is its filename's stem.
 * - DECLARED WIN: declared rows are never shadowed or doubled — the
 *   tray only adds what nothing declared.
 * - THE DIR LAW: env → endpoint base → the runtime tree's own
 *   loras dir, existence-guarded; null never names a missing dir.
 */
describe("the loras tray law", () => {
  it("enumerates the tray: family dirs name the family; root files, dotfiles, and non-weights never serve", async () => {
    const { trayLoraRows } = await import(
      "../../../../packages/engines/comfyui-cordis/src/mods/trayLoras.ts"
    );
    const dir = mkdtempSync(join(tmpdir(), "tray-law-"));
    try {
      mkdirSync(join(dir, "krea-2"));
      mkdirSync(join(dir, "put_loras_here"));
      mkdirSync(join(dir, "not-a-family"));
      writeFileSync(join(dir, "krea-2", "Shapstraction_krea2_epoch.safetensors"), "x");
      writeFileSync(join(dir, "krea-2", "another_one.pt"), "x");
      writeFileSync(join(dir, "krea-2", "README.md"), "not weights");
      writeFileSync(join(dir, "krea-2", ".hidden.safetensors"), "dotfile");
      writeFileSync(join(dir, "not-a-family", "stray.safetensors"), "still a row — the dir is a family dir by shape");
      writeFileSync(join(dir, "root_level.safetensors"), "names no family — never a row");
      const rows = trayLoraRows(dir);
      assert.deepEqual(
        rows.map((r: { id: string, filename: string, families: string[], label: string, category: string, default_strength: number }) =>
          ({ id: r.id, filename: r.filename, families: r.families, label: r.label, category: r.category, default_strength: r.default_strength })),
        [
          {
            id: "Shapstraction_krea2_epoch",
            filename: "krea-2/Shapstraction_krea2_epoch.safetensors",
            families: ["krea-2"],
            label: "Shapstraction_krea2_epoch",
            category: "tray",
            default_strength: 0.8,
          },
          {
            id: "another_one",
            filename: "krea-2/another_one.pt",
            families: ["krea-2"],
            label: "another_one",
            category: "tray",
            default_strength: 0.8,
          },
          {
            id: "stray",
            filename: "not-a-family/stray.safetensors",
            families: ["not-a-family"],
            label: "stray",
            category: "tray",
            default_strength: 0.8,
          },
        ],
        "the tray enumerates weights files under family dirs with the filename as the right name — root files, dotfiles, and non-weights never serve",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("the dir law: env → endpoint base → the runtime tree, and null never names a missing dir", async () => {
    const { resolveEngineLorasDir } = await import(
      "../../../../packages/engines/comfyui-cordis/src/userLoras.ts"
    );
    const { runtimeModelsRoot } = await import(
      "../../../../packages/engines/comfyui-cordis/src/catalog.ts"
    );
    const envBefore = process.env["MELITE_COMFYUI_LORAS_DIR"];
    try {
      delete process.env["MELITE_COMFYUI_LORAS_DIR"];
      // leg 2: the endpoint machine statement's base
      assert.deepEqual(
        resolveEngineLorasDir({ model_base_path: "/tmp/endpoint-base" }),
        "/tmp/endpoint-base/loras",
        "the endpoint model_base_path leg names base + /loras",
      );
      // leg 3: the runtime tree's own dir when it exists (the
      // operator's 'comfyui pathing should be default'), else null —
      // never a guessed path
      const got = resolveEngineLorasDir({});
      const runtimeLoras = join(runtimeModelsRoot(), "loras");
      if (existsSync(runtimeLoras)) {
        assert.deepEqual(got, runtimeLoras, "the engine's own pathing is the default when the runtime tree stands");
      } else {
        assert.deepEqual(got, null, "no runtime tree, no endpoint, no env — the dir is UNDECLARED, never guessed");
      }
      // leg 1: the env override wins over everything
      process.env["MELITE_COMFYUI_LORAS_DIR"] = "/tmp/env-override";
      assert.deepEqual(resolveEngineLorasDir({ model_base_path: "/tmp/endpoint-base" }), "/tmp/env-override",
        "the env override wins — the escape hatch stays");
      // and whatever resolves names an existing dir (the guess-guard)
      delete process.env["MELITE_COMFYUI_LORAS_DIR"];
      const resolved = resolveEngineLorasDir({});
      if (resolved !== null) {
        expect(existsSync(resolved), `the resolved tray dir exists on disk (${resolved})`).toBe(true);
      }
    } finally {
      if (envBefore !== undefined) process.env["MELITE_COMFYUI_LORAS_DIR"] = envBefore;
      else delete process.env["MELITE_COMFYUI_LORAS_DIR"];
    }
  });

  it("the composed picker serves every tray file under a boarding family — declared rows win, tray rows carry the right name", { timeout: 120_000 }, async () => {
    const envBefore = process.env["MELITE_COMFYUI_LORAS_DIR"];
    delete process.env["MELITE_COMFYUI_LORAS_DIR"];
    try {
      const { loadCardDefs, theService } = await import(
        "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts"
      );
      const { resolveEngineLorasDir } = await import(
        "../../../../packages/engines/comfyui-cordis/src/userLoras.ts"
      );
      const { trayLoraRows } = await import(
        "../../../../packages/engines/comfyui-cordis/src/mods/trayLoras.ts"
      );
      const { loadEndpointConfig } = await import(
        "../../../../packages/engines/comfyui-cordis/src/comfyui-config.ts"
      );
      await loadCardDefs();
      const svc = theService();
      const dir = resolveEngineLorasDir(loadEndpointConfig() as unknown as Record<string, unknown>);
      if (dir === null || !existsSync(dir)) {
        console.warn("SKIP-LOUD: no loras tray on this clone — the serve half of the law cannot judge here");
        return;
      }
      const boarding = new Set<string>(svc.lorasBoardingFamilies());
      expect(boarding.size, "families board the loras pack (the tray's registration set is real)").toBeGreaterThan(0);
      const files = trayLoraRows(dir);
      expect(files.length, "the tray walk saw weights files — the walk is not broken").toBeGreaterThan(0);
      // THE OPERATOR'S LAW: every tray file under a boarding family
      // APPEARS in that family's composed catalog — static or tray,
      // the picker serves what the disk holds.
      const unserved: string[] = [];
      for (const fam of boarding) {
        for (const row of svc.modCatalog("loras", fam).rows) {
          // per-family: every file whose family dir is this family
        }
        for (const file of files.filter((f: { families: string[] }) => f.families[0] === fam)) {
          const served = svc.modCatalog("loras", fam).rows.some((r) => r.filename === file.filename);
          if (!served) unserved.push(file.filename);
        }
      }
      expect(unserved, "every tray file under a boarding family appears in the composed picker (a dropped lora that never serves is the operator's exact burn)").toEqual([]);
      // THE RIGHT NAME + THE TRAY MARK: rows the declared tables do
      // not own carry their filename's stem as the label and the
      // tray category — the operator recognizes the drop.
      const trayRows = files.filter(
        (f: { families: string[] }) => boarding.has(f.families[0] ?? ""),
      );
      for (const file of trayRows) {
        const fam = file.families[0] ?? "";
        const row = svc.modCatalog("loras", fam).rows.find((r) => r.filename === file.filename);
        if (row === undefined) continue; // named by a declared row — the declared row wins, judged below
        if (row.category !== "tray") continue; // a declared row owns this filename — its shape is the DECL's
        expect(row.label, `the tray row for ${file.filename} carries the filename's stem (the right name)`).toBe(file.id);
        expect(existsSync(join(dir, file.filename)), `the tray row's file stands on disk (${file.filename})`).toBe(true);
      }
      // DECLARED WIN: no id serves twice in any family's catalog
      // (the merge is id-keyed, first-registered wins — the tray
      // never doubles a declared row).
      for (const fam of boarding) {
        const ids = svc.modCatalog("loras", fam).rows.map((r) => r.id);
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
        expect(dupes, `${fam}: no row id serves twice (the tray never shadows or doubles a declared row)`).toEqual([]);
      }
      // THE LIVE RECEIPT (the operator's own drop, 2026-11-03): the
      // Shapstraction file landed in the engine's loras tray by hand
      // and burned for a day — when it stands on disk, its picker
      // row serves under krea-2 with the drop's own name.
      const dropped = "krea-2/Shapstraction_krea2_3441818_epoch_10.safetensors";
      if (existsSync(join(dir, dropped))) {
        const row = svc.modCatalog("loras", "krea-2").rows.find((r) => r.filename === dropped);
        expect(row, "the operator's dropped Shapstraction lora serves as a krea-2 picker row").toBeDefined();
        expect(row!.label, "the drop's picker row carries the right name").toBe("Shapstraction_krea2_3441818_epoch_10");
        expect(row!.category, "the drop's row is marked tray (no declared provenance — the file is its own)").toBe("tray");
      }
    } finally {
      if (envBefore !== undefined) process.env["MELITE_COMFYUI_LORAS_DIR"] = envBefore;
      else delete process.env["MELITE_COMFYUI_LORAS_DIR"];
    }
  });
});
