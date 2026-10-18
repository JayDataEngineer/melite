// models-store-law.spec.ts — the store's two truths, machine-judged:
// every DECL provisions row names a REAL artifact (bytes on disk at
// the declared size), and the store carries no file the estate
// cannot name (the dead-weight class: no provisions row, no
// lane_inputs wire, no mods/ file, no tracked reference, no
// hf-cache symlink resolves it). Silence is not a third option —
// a store file is either named or deleted, never merely present.
//
// The store root rides the runtime overlay (data/inference.local.json,
// untracked — the same ground truth the engine reads); a virgin
// clone without the overlay skips LOUD with this reason and the
// DECL-shape arms below still judge the tracked half.
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { readlinkSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..", "..", "..");

const sh = (args: string[]): string =>
  execFileSync(args[0]!, args.slice(1), { cwd: ROOT, encoding: "utf8" }).trim();

/** The runtime overlay's store root, or none on a virgin clone. */
function storeRoot(): string | undefined {
  const overlay = join(ROOT, "data", "inference.local.json");
  if (!existsSync(overlay)) return undefined;
  try {
    const cfg = JSON.parse(readFileSync(overlay, "utf8")) as {
      models?: { read_root?: string; download_root?: string };
    };
    return cfg.models?.read_root ?? cfg.models?.download_root;
  } catch {
    return undefined;
  }
}

/** The deployed engine's models dir (the symlink wire's source). */
function engineModelsDir(): string | undefined {
  const overlay = join(ROOT, "data", "inference.local.json");
  if (!existsSync(overlay)) return undefined;
  try {
    const cfg = JSON.parse(readFileSync(overlay, "utf8")) as {
      engines?: { comfyui?: { models_dir?: string } };
    };
    return cfg.engines?.comfyui?.models_dir;
  } catch {
    return undefined;
  }
}

/** Every provisions row across the model families: {folder,name,size}. */
function provisionRows(): { folder: string; name: string; size: number; decl: string }[] {
  const decls = sh(["git", "ls-files", "packages/models/*/src/index.ts"]).split("\n").filter(Boolean);
  const rows: { folder: string; name: string; size: number; decl: string }[] = [];
  for (const decl of decls) {
    const src = readFileSync(join(ROOT, decl), "utf8");
    // provisions rows are object literals pairing name/folder (+size_bytes)
    for (const m of src.matchAll(/\{[^{}]*?"name":\s*"([^"]+)"[^{}]*?"folder":\s*"([^"]+)"[^{}]*?\}/gu)) {
      const lit = m[0];
      const size = /"size_bytes":\s*(\d+)/u.exec(lit);
      rows.push({ name: m[1]!, folder: m[2]!, size: size ? Number(size[1]) : 0, decl });
    }
    for (const m of src.matchAll(/\{[^{}]*?"folder":\s*"([^"]+)"[^{}]*?"name":\s*"([^"]+)"[^{}]*?\}/gu)) {
      const lit = m[0];
      const size = /"size_bytes":\s*(\d+)/u.exec(lit);
      rows.push({ name: m[2]!, folder: m[1]!, size: size ? Number(size[1]) : 0, decl });
    }
  }
  // de-dup (both regex orders can catch one row)
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = `${r.folder}/${r.name}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

describe("THE MODELS-STORE LAW — real artifacts, no unnamed bytes", () => {
  const STORE = storeRoot();

  it("the DECL plane is armed (rows exist and carry sizes)", () => {
    const rows = provisionRows();
    expect(rows.length, "provisions rows found — the parse is not broken").toBeGreaterThan(50);
    const sized = rows.filter((r) => r.size > 0);
    expect(sized.length, "rows carrying size_bytes").toBeGreaterThan(50);
  });

  it("every provisions row resolves to a real artifact at the declared size", { timeout: 60_000 }, () => {
    if (STORE === undefined) {
      console.warn("SKIP-LOUD: no store overlay on this clone — the disk half of the law cannot judge here");
      return;
    }
    const rows = provisionRows();
    const missing: string[] = [];
    const wrongSize: string[] = [];
    for (const r of rows) {
      const p = join(STORE, r.folder, r.name);
      if (!existsSync(p)) {
        missing.push(`${r.decl}: ${r.folder}/${r.name}`);
        continue;
      }
      if (r.size > 0 && statSync(p).size !== r.size) {
        wrongSize.push(`${r.folder}/${r.name}: declared ${r.size}, disk ${statSync(p).size}`);
      }
    }
    // A declared row absent from the disk is a NAMED debt: the DECL
    // promises the bytes, ensure() fills them on first provision. The
    // floor pins exactly which rows are owed today — a NEW absence
    // fails loud (a DECL lost its artifact silently), and the floor
    // shrinks only when the downloads land (receipts in the ledger).
    const OWED_FLOOR = [
      // The DMAD distill row (2026-10-18, audit 009/W2): declared +
      // pinned; the 2.0 GB pull rode the velocity arena's first
      // stacked load and LANDED 2026-10-24 — the floor entry left
      // the same day the download landed (the wall's own law).
      // 2026-10-13: the three qwen-img-21 rows left (the bytes
      // landed). 2026-10-12 (second sweep): the kimodo rig row
      // LEFT — the pinned 6c9233af tree fetched into BOTH the
      // engine models dir and the store (config.yaml +
      // model.safetensors 1133185036 B + stats/motion npy sextet;
      // the "30 GB" note was stale — the rig is 1.1 GB).
      // 2026-10-12 (joy-g + store pull): the joycaption row LEFT —
      // the 13 pinned literals landed ENGINE-side (lane_homes
      // LLavacheckpoints pre-seed) and the STORE mirror (16 GB)
      // landed the same sweep, clearing the floor the wall's own
      // law names.
      "packages/models/seedvr2-ema/src/index.ts: SEEDVR2/seedvr2_ema_3b_fp8_e4m3fn.safetensors",
      // 2026-10-17 (h3 checkpoint axis): the Singularity fine-tune
      // row declares its 20.9 GB int8 prune — provisioned as a
      // bench experiment, not yet fetched.
      "packages/models/h3/src/index.ts: diffusion_models/Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors",
    ].sort();
    expect(missing.sort(), "provisions rows with no artifact at the declared path (new rows = silent DECL loss; rows gone from the floor = downloads landed, update the floor)").toEqual(OWED_FLOOR);
    expect(wrongSize, "artifacts whose bytes disagree with the DECL").toEqual([]);
  });

  it("the store carries no file the estate cannot name (dead weight = 0)", { timeout: 240_000 }, () => {
    if (STORE === undefined) {
      console.warn("SKIP-LOUD: no store overlay on this clone — the disk half of the law cannot judge here");
      return;
    }
    // The named set: every quoted weights name OR named directory path
    // in ANY tracked text file (TS walls, lane_inputs wires, mods/
    // tables, fixture pins, vendored engine packs — pack wiring lives
    // in .py). A file is named when its basename matches OR an
    // ancestor directory is the tail of a quoted path (sharded and
    // hf trees wire at tree granularity).
    const tracked = sh(["git", "ls-files"]).split("\n").filter(Boolean);
    const named = new Set<string>(); // basenames the tree names
    for (const row of provisionRows()) named.add(row.name);
    const binary = /\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|mp4|webm|gz|xz|zst|zip|tar|pt2|onnx_data| safetensors)$/u;
    for (const f of tracked) {
      if (binary.test(f)) continue;
      let text: string;
      try {
        text = readFileSync(join(ROOT, f), "utf8");
      } catch {
        continue;
      }
      for (const m of text.matchAll(/["'`]([^"'`\\\n]{3,200}?\.(?:safetensors|pth|pt|gguf|onnx|npz|bin|sft|ckpt|engine|msgpack|h5))["'`]/gu)) {
        named.add(m[1]!.split("/").pop()!);
      }
    }
    // lane_inputs wires name MODEL TREES (sharded/hf trees load as a
    // unit): every quoted value in a DECL's lane_inputs object is a
    // directory wire. Ancestor dirs matching a wire make the file alive.
    const decls = sh(["git", "ls-files", "packages/models/*/src/index.ts"]).split("\n").filter(Boolean);
    const namedDirs = new Set<string>();
    for (const decl of decls) {
      const src = readFileSync(join(ROOT, decl), "utf8");
      for (const m of src.matchAll(/"lane_inputs":\s*\{([\s\S]*?)\}/gu)) {
        for (const v of m[1]!.matchAll(/:\s*"([^"]+)"/gu)) namedDirs.add(v[1]!);
      }
    }

    // The walk: every file under the store root. hf-cache blobs are
    // content-addressed (blobs/<sha>) — no text can name them; a blob
    // is alive when a snapshot symlink in the same cache points at it.
    const files: string[] = [];
    const walk = (d: string): void => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.isFile()) files.push(p);
      }
    };
    walk(STORE);
    expect(files.length, "the store walk saw files — the walk is not broken").toBeGreaterThan(300);

    const aliveBlobs = new Set<string>();
    const scanSymlinks = (d: string): void => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) scanSymlinks(p);
        else if (e.isSymbolicLink()) {
          try {
            aliveBlobs.add(resolve(d, readlinkSync(p)));
          } catch {
            /* a broken symlink names nothing */
          }
        }
      }
    };
    scanSymlinks(STORE);

    // The engine symlink wire: the deployed engine serves store bytes
    // through symlinks in its own models dir — a symlinked store file
    // is alive even when no tracked text names it.
    const ENGINE = engineModelsDir();
    let engineWired = new Set<string>();
    if (ENGINE !== undefined && existsSync(ENGINE)) {
      const linked: string[] = [];
      const scanLinks = (d: string): void => {
        let entries;
        try {
          entries = readdirSync(d, { withFileTypes: true });
        } catch {
          return;
        }
        for (const e of entries) {
          const p = join(d, e.name);
          if (e.isDirectory()) scanLinks(p);
          else if (e.isSymbolicLink()) linked.push(p);
        }
      };
      scanLinks(ENGINE);
      for (const link of linked) {
        try {
          engineWired.add(resolve(link, "..", readlinkSync(link)));
        } catch {
          /* a broken engine symlink names nothing */
        }
      }
    } else {
      console.warn("SKIP-LOUD: no engine models_dir in the overlay — the symlink wire cannot judge here");
    }

    const dead: string[] = [];
    // hf model trees load as a unit: a config/tokenizer/README file
    // rides the named weights beside it (its tree dying kills it too).
    const companion = /^(?:config|configuration|generation_config|preprocessor_config|processor_config|tokenizer_config|special_tokens_map|model_index|scheduler)\.json$|^tokenizer\.(?:json|model)$|^merges\.txt$|^vocab\.(?:json|bin)$|^README(?:\.[^.]+)?\.md$|^LICENSE(\.txt)?$|^NOTICE\.txt$|^CACHEDIR\.TAG$|^\.gitattributes$|^\.gitignore$/u;
    // hf cache plumbing and ComfyUI's placeholder markers
    const plumbing = /(?:^|\/)(?:\.cache|\.locks)\//u;
    const marker = /(?:^|\/)put_[a-z0-9_]+_here$/u;
    // non-weights files the deployed engine itself ships at the same
    // relative path (folder READMEs, example yamls) are scaffolding
    const weightsFile = /\.(?:safetensors|pth|pt|gguf|onnx|npz|bin|sft|ckpt|engine|msgpack|h5|fbx)$/u;
    let enginePaths: Set<string> | undefined;
    if (ENGINE !== undefined && existsSync(ENGINE)) {
      enginePaths = new Set<string>();
      const scanAll = (d: string, base: string): void => {
        let entries;
        try {
          entries = readdirSync(d, { withFileTypes: true });
        } catch {
          return;
        }
        for (const e of entries) {
          if (e.isDirectory()) scanAll(join(d, e.name), `${base}${e.name}/`);
          else enginePaths!.add(`${base}${e.name}`);
        }
      };
      scanAll(ENGINE, "");
    }
    for (const p of files) {
      const base = p.split("/").pop()!;
      const dir = p.slice(0, p.length - base.length - 1);
      const rel = p.slice(STORE.length + 1);
      if (plumbing.test(rel) || marker.test(rel) || /\/refs\/(?:main|\w+)$/u.test(rel)) continue;
      if (base.endsWith(".metadata") || base === ".lock" || base === ".no_exist") continue;
      // engine-parity scaffolding: a non-weights file the deployed
      // engine itself ships at the same relative path. ORDER MATTERS
      // (the vae_approx red, 2026-11-05): this check rode BELOW the
      // companion branch, so an engine-shipped README in a plumbing
      // dir (vae_approx/ — its weights are engine-owned, never
      // DECL-named) died as a "dead tree's companion" before parity
      // could save it. Parity is the broader law; it judges first —
      // derived from the overlay's own engine dir, so it holds on
      // every machine that names its engine, no hand list.
      if (enginePaths !== undefined && !weightsFile.test(base) && enginePaths.has(rel)) continue;
      if (companion.test(base)) {
        const ridesTree = files.some((o) => {
          if (!o.startsWith(`${dir}/`)) return false;
          const ob = o.split("/").pop()!;
          return ob !== base && !companion.test(ob) && named.has(ob);
        });
        if (ridesTree) continue;
        dead.push(rel); // the tree is dead; its companions die with it
        continue;
      }
      if (aliveBlobs.has(p)) continue;
      if (named.has(base)) continue;
      if (engineWired.has(p)) continue;
      // engine-parity scaffolding: a non-weights file the deployed
      // engine itself ships at the same relative path
      if (enginePaths !== undefined && !weightsFile.test(base) && enginePaths.has(rel)) continue;
      // directory wire: an ancestor dir matches a lane_inputs value's tail
      let dirWired = false;
      for (const d of namedDirs) {
        if (rel === d || rel.startsWith(`${d}/`) || rel.endsWith(`/${d}`) || rel.includes(`/${d}/`)) {
          dirWired = true;
          break;
        }
      }
      if (dirWired) continue;
      dead.push(rel);
    }
    expect(dead, "store files no DECL/lane/mods/fixture names — name them or delete them").toEqual([]);
  });

  it("the overlay's store root exists when declared (the IaC contract's first hop)", () => {
    if (STORE === undefined) {
      console.warn("SKIP-LOUD: no store overlay on this clone");
      return;
    }
    expect(existsSync(STORE), `the overlay's read_root exists: ${STORE}`).toBe(true);
  });
});
