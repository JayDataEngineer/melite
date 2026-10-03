// provision-models — declaration provision rows: ComfyUI-Manager queue + sha256 gate.
// Split from scripts/provision.ts (pure move — no logic changes).

import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  ComfyUiManagerHttpClient,
  ComfyUiManagerProvider,
  VerifiedArtifactWriter,
} from "@melite/estate-provisioning";
import { loadCardDefs, provisionsByFamily } from "../src/cardDefs.ts";
import { cascadeInit } from "../src/models/models.ts";
import type * as CATALOG from "../src/models/families/contract.ts";
import { DEFAULT_CONFIG, DRY, RUNTIME, die, info, warn } from "./provision-shared.ts";
import { boundModelFolders, engineUrl, loadConfig } from "./provision-config.ts";

// ── models via the estate downloader + frozen catalog + sha256 gate ──

/** The Manager whitelist key this estate's declared rows match on:
 *  check_whitelist_for_model compares save_path+base+filename between
 *  the install payload and the model list, so both sides mint the
 *  same tag. */
export const MELITE_MODEL_BASE = "melite";

export interface LocalModelListRow {
  name: string;
  type: string;
  base: string;
  save_path: string;
  filename: string;
  url: string;
}

/**
 * Writes Manager's LOCAL model-list (read by get_data_by_mode('local')
 * from <manager-install>/model-list.json) with one row per declared
 * provision — the file that admits estate rows into Manager's install
 * whitelist. Deterministic: rows are sorted by save_path+filename so
 * repeated runs byte-match.
 *
 * @param listPath absolute path of the manager-local model-list.json
 * @param rows the declared provision rows (family + ProvisionRow)
 */
export function writeManagerLocalModelList(listPath: string,
    rows: ReadonlyArray<{ family: string; row: Pick<ProvisionRow, "name" | "folder" | "url"> }>): void {
  const list: LocalModelListRow[] = rows
    .map(({ family, row }) => ({
      name: family + "/" + row.name,
      type: MELITE_MODEL_BASE,
      base: MELITE_MODEL_BASE,
      save_path: row.folder.replace(/^\/+|\/+$/g, ""),
      filename: row.name,
      url: row.url,
    }))
    .sort((a, b) =>
      a.save_path + "/" + a.filename < b.save_path + "/" + b.filename ? -1 : 1);
  mkdirSync(dirname(listPath), { recursive: true });
  writeFileSync(listPath,
    JSON.stringify({ models: list }, null, 2) + "\n");
  info("  [model] manager local model-list: " + list.length +
    " rows → " + listPath);
}

/**
 * Pins Manager's security_level to 'weak' — the tier whose install
 * gates accept the declared-row channel (non-.safetensors installs
 * are otherwise refused unless their url sits in the public catalog).
 * The estate's per-row sha256 gate is the actual download boundary:
 * every queued file is digest-verified after Manager lands it, so
 * 'weak' plus verification is tighter than the default level without
 * it. Idempotent: replaces only the security_level line; reports
 * whether a RUNNING engine would need a restart (Manager caches its
 * config at read).
 *
 * @param configPath absolute path of user/__manager/config.ini
 * @returns true when the on-disk line was already 'weak'
 */
export function ensureManagerSecurityWeak(configPath: string): boolean {
  const wanted = "security_level = weak";
  if (!existsSync(configPath)) {
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, "[default]\n" + wanted + "\n");
    info("  [model] manager config: security_level=weak (digest gate " +
      "owns the boundary; engine restart applies it)");
    return false;
  }
  const text = readFileSync(configPath, "utf8");
  const lines = text.split("\n");
  let seen = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s*security_level\s*=/.test(lines[i])) {
      seen = lines[i].trim() === wanted;
      if (!seen) {
        lines[i] = wanted;
        writeFileSync(configPath, lines.join("\n"));
        info("  [model] manager config: security_level=weak (digest " +
          "gate owns the boundary; engine restart applies it)");
      }
      return seen;
    }
  }
  writeFileSync(configPath, text.replace(/\n*$/u, "\n") + wanted + "\n");
  info("  [model] manager config: security_level=weak appended " +
    "(digest gate owns the boundary; engine restart applies it)");
  return false;
}

/** Cheap existence probe for DRY runs: confined path, no hashing. A
 *  symlink counts (the inspect read law resolves in-store links). */
async function artifactExists(storeRoot: string, relativePath: string): Promise<boolean> {
  try {
    const { resolveConfinedPath } = await import("@melite/estate-provisioning");
    const { lstat } = await import("node:fs/promises");
    const kind = await lstat(resolveConfinedPath(storeRoot, relativePath));
    return kind.isFile() || kind.isSymbolicLink();
  } catch {
    return false;
  }
}

export function sha256Of(path: string): string {
  const h = createHash("sha256");
  const fd = openSync(path, "r");
  try {
    const chunk = Buffer.alloc(8 * 1024 * 1024);
    for (;;) {
      const n = readSync(fd, chunk, 0, chunk.length, null);
      if (n === 0) break;
      h.update(chunk.subarray(0, n));
    }
  } finally {
    closeSync(fd);
  }
  return h.digest("hex");
}

export interface ProvisionRow {
  name: string;
  folder: string;
  url: string;
  sha256: string;
  size_bytes?: number;
}

export async function catalogProvisions(): Promise<Array<{ family: string; row: CATALOG.ProvisionRow }>> {
  // The MODEL-side download places, TS-natively from the declaration
  // rows (the engine's provisionsByFamily — DECL provisions + card-
  // owned provisions; the model.py cell/provision walks died with
  // the py plane and the frozen catalog re-home died with the blob).
  // The boot never fires at import (ledger li-cq): callers of the
  // sync singleton readers await the shared entry first.
  await cascadeInit();
  const defs = await loadCardDefs();
  const byFamily = await provisionsByFamily(defs);
  const out: Array<{ family: string; row: CATALOG.ProvisionRow }> = [];
  for (const fam of Object.keys(byFamily).sort()) {
    for (const row of byFamily[fam]?.provisions ?? []) out.push({ family: fam, row });
  }
  return out;
}

/** Deletes a landed artifact (a truncated partial) through the same
 *  confinement the writer enforces, so Manager's next queue round
 *  re-downloads instead of skipping the existing file.
 *
 *  @param storeRoot absolute store root
 *  @param relativePath store-relative artifact path
 */
async function removePartial(storeRoot: string, relativePath: string): Promise<void> {
  const { resolveConfinedPath } = await import("@melite/estate-provisioning");
  const { rm } = await import("node:fs/promises");
  await rm(resolveConfinedPath(storeRoot, relativePath), { force: true });
}

export async function fetchVerified(_workspace: string,
    storeRoot: string, label: string, url: string, name: string,
    sub: string, want: string,
    manager?: Pick<ComfyUiManagerProvider, "installModel">,
    tags?: { type: string; base: string; sizeBytes?: number }): Promise<string> {
  const relativePath = sub === "" ? name : sub.replace(/^\/+|\/+$/gu, "") + "/" + name;
  const writer = new VerifiedArtifactWriter(storeRoot);
  // DRY is a PLAN, never the work (2026-10-12): hashing every present
  // row's full sha made --dry-run read 731GB off the estate store for
  // a download plan. A dry run probes EXISTENCE only — the real run
  // keeps the full inspect (sha gate) on every row.
  if (!DRY) {
    const existing = await writer.inspect({
      root: storeRoot,
      relativePath,
      expectedSha256: want,
    });
    if (existing.present) return "skipped";
  } else if (await artifactExists(storeRoot, relativePath)) {
    return "skipped";
  }
  info("  [model] " + label + " -> " + relativePath);
  if (DRY) {
    console.log("[dry-run] ComfyUI-Manager install_model " + url + " -> " + relativePath);
    return "planned";
  }
  if (manager === undefined) {
    warn("  [model] " + name + ": ComfyUI-Manager is unavailable; refusing a direct model download");
    return "bad";
  }
  // Manager marks a dead stream done (IncompleteRead class): the
  // landed bytes land short and only the digest gate sees it. Retry
  // the whole queue round after DELETING the partial — Manager skips
  // downloads whose destination file already exists.
  const attempts = 3;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let queued = true;
    try {
      const installed = await manager.installModel({
        id: label,
        name,
        savePath: sub,
        url,
        filename: name,
        ...(tags === undefined ? {} : tags),
      });
      queued = installed.installed;
    } catch (error: unknown) {
      // An honest-budget timeout on a live link means the stream
      // died mid-file — same remedy as a digest mismatch.
      warn("  [model] " + name + ": attempt " + String(attempt) + "/" + String(attempts) +
        " " + (error instanceof Error ? error.message : String(error)).slice(0, 160));
      queued = false;
    }
    if (!queued && attempt < attempts) {
      await removePartial(storeRoot, relativePath);
      continue;
    }
    if (!queued) {
      warn("  [model] " + name + ": ComfyUI-Manager did not complete the install in " +
        String(attempts) + " attempts");
      return "bad";
    }
    const landed = await writer.inspect({
      root: storeRoot,
      relativePath,
      expectedSha256: want,
    });
    if (landed.present) {
      info("  [model] " + name + ": verified (" + landed.sha256 + ")");
      return "ok";
    }
    if (attempt < attempts) {
      warn("  [model] " + name + ": attempt " + String(attempt) + "/" + String(attempts) +
        " landed absent or mismatched bytes — deleting the partial and re-queueing");
      await removePartial(storeRoot, relativePath);
      continue;
    }
    warn("  [model] " + name + ": Manager queue completed but declared bytes are absent or mismatched");
    return "bad";
  }
  return "bad";
}

export async function stepModels(): Promise<boolean> {
  const cfg = loadConfig(DEFAULT_CONFIG);
  if (cfg.provision !== "managed") {
    die("provision=" + JSON.stringify(cfg.provision) + " — BYO " +
      "deployments own their model tree; the estate never " +
      "downloads into a user workspace");
  }
  {
    const bound = boundModelFolders(cfg);
    const storeRoot = bound.download_path;
    let manager: ComfyUiManagerProvider | undefined;
    if (!DRY) {
      try {
        const endpoint = engineUrl(cfg);
        if (endpoint === "") throw new Error("ComfyUI endpoint URL is not configured");
        manager = new ComfyUiManagerProvider(
          // The floor wait fits an unknown-size artifact on a slow
          // link (multi-GB model files, not extensions); rows that
          // declare size_bytes raise it further at the provider.
          new ComfyUiManagerHttpClient({ baseUrl: endpoint, requestTimeoutMs: 30_000, queueTimeoutMs: 900_000 }),
        );
      } catch (error: unknown) {
        die("ComfyUI-Manager is required for model provisioning: " + (error instanceof Error ? error.message : String(error)));
      }
      // The declared rows ride Manager's LOCAL model-list channel:
      // /manager/queue/install_model whitelists every request by
      // save_path+base+filename against the channel catalog
      // (manager_server.py check_whitelist_for_model), and most
      // estate rows (pinned HF artifacts) exist in NO public
      // catalog. get_data_by_mode('local') reads
      // <manager-install>/model-list.json — the sanctioned file for
      // exactly this. Non-.safetensors files additionally require
      // security_level 'weak' (the url-whitelist tier); the estate's
      // per-row sha256 gate is the actual boundary, so 'weak' plus
      // digest verification is tighter than the default level
      // without it. Both writes are idempotent; a running engine
      // reads the local list per request but caches its config —
      // restart the engine when the security line changes.
      const rows = await catalogProvisions();
      const listPath = join(RUNTIME, "custom_nodes", "comfyui-manager",
        "model-list.json");
      if (existsSync(dirname(listPath))) {
        writeManagerLocalModelList(listPath, rows);
      } else {
        warn("  [model] ComfyUI-Manager is not installed yet — local " +
          "model-list NOT written (run the extensions step first)");
      }
      ensureManagerSecurityWeak(join(RUNTIME, "user", "__manager", "config.ini"));
    }
    let ok = 0, bad = 0, skipped = 0, planned = 0;
    for (const { family, row } of await catalogProvisions()) {
      const url = String(row.url ?? "");
      const name = String(row.name ?? "").trim();
      const sub = String(row.folder ?? "").trim()
        .replace(/^\/+|\/+$/g, "");
      const want = String(row.sha256 ?? "").trim().toLowerCase();
      if (!url || !name) {
        warn("  [model] " + family + " provision " + JSON.stringify(name) +
          " has no url/name — refusing (declare the download place, " +
          "never guess it)");
        bad += 1;
        continue;
      }
      if (!want) {
        warn("  [model] " + family + " provision " + JSON.stringify(name) +
          " has no sha256 — refusing (unverifiable bytes never land)");
        bad += 1;
        continue;
      }
      const st = await fetchVerified("", storeRoot,
        family + "/provision/" + name, url, name, sub, want, manager,
        { type: MELITE_MODEL_BASE, base: MELITE_MODEL_BASE,
          ...(row.size_bytes === undefined ? {} : { sizeBytes: row.size_bytes }) });
      if (st === "ok") ok += 1;
      else if (st === "bad") bad += 1;
      else if (st === "planned") planned += 1;
      else skipped += 1;
    }
    if (ok === 0 && skipped === 0 && bad === 0 && planned === 0) {
      info("no frozen-catalog provisions declared");
      return true;
    }
    // DRY presence is an EXISTENCE probe — the sha gate runs only in
    // a real pass, and the plan says so (never "verified"). PLANNED
    // rows are the plan itself: what a real run would queue.
    info("models: " + ok + " downloaded+verified, " + skipped +
      " present" + (DRY ? " (dry: existence probe, sha unverified)" : "") +
      ", " + planned + " planned, " + bad + " failed");
    return bad === 0;
  }
}
