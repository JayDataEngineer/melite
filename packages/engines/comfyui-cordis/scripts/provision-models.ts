// provision-models — declaration provision rows: ComfyUI-Manager queue + sha256 gate.
// Split from scripts/provision.ts (pure move — no logic changes).

import { createHash } from "node:crypto";
import { closeSync, openSync, readSync } from "node:fs";
import {
  ComfyUiManagerHttpClient,
  ComfyUiManagerProvider,
  VerifiedArtifactWriter,
} from "@melite/estate-provisioning";
import { loadCardDefs, provisionsByFamily } from "../src/cardDefs.ts";
import { cascadeInit } from "../src/models/models.ts";
import { DEFAULT_CONFIG, DRY, die, info, warn } from "./provision-shared.ts";
import { boundModelFolders, engineUrl, loadConfig } from "./provision-config.ts";

// ── models via the estate downloader + frozen catalog + sha256 gate ──

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

export async function catalogProvisions(): Promise<Array<{ family: string; row: ProvisionRow }>> {
  // The MODEL-side download places, TS-natively from the declaration
  // rows (the engine's provisionsByFamily — DECL provisions + card-
  // owned provisions; the model.py cell/provision walks died with
  // the py plane and the frozen catalog re-home died with the blob).
  // The boot never fires at import (ledger li-cq): callers of the
  // sync singleton readers await the shared entry first.
  await cascadeInit();
  const defs = await loadCardDefs();
  const byFamily = await provisionsByFamily(defs);
  const out: Array<{ family: string; row: ProvisionRow }> = [];
  for (const fam of Object.keys(byFamily).sort()) {
    for (const row of byFamily[fam]?.provisions ?? []) out.push({ family: fam, row });
  }
  return out;
}

export async function fetchVerified(_workspace: string,
    storeRoot: string, label: string, url: string, name: string,
    sub: string, want: string,
    manager?: Pick<ComfyUiManagerProvider, "installModel">): Promise<string> {
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
    return "skipped";
  }
  if (manager === undefined) {
    warn("  [model] " + name + ": ComfyUI-Manager is unavailable; refusing a direct model download");
    return "bad";
  }
  try {
    const installed = await manager.installModel({
      id: label,
      name,
      savePath: sub,
      url,
      filename: name,
    });
    if (!installed.installed) {
      warn("  [model] " + name + ": ComfyUI-Manager refused the model install");
      return "bad";
    }
    const landed = await writer.inspect({
      root: storeRoot,
      relativePath,
      expectedSha256: want,
    });
    if (!landed.present) {
      warn("  [model] " + name + ": Manager queue completed but declared bytes are absent or mismatched");
      return "bad";
    }
    info("  [model] " + name + ": verified (" + landed.sha256 + ")");
    return "ok";
  } catch (error: unknown) {
    warn("  [model] " + name + ": " + (error instanceof Error ? error.message : String(error)).slice(0, 200));
    return "bad";
  }
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
          new ComfyUiManagerHttpClient({ baseUrl: endpoint, requestTimeoutMs: 30_000, queueTimeoutMs: 300_000 }),
        );
      } catch (error: unknown) {
        die("ComfyUI-Manager is required for model provisioning: " + (error instanceof Error ? error.message : String(error)));
      }
    }
    let ok = 0, bad = 0, skipped = 0;
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
        family + "/provision/" + name, url, name, sub, want, manager);
      if (st === "ok") ok += 1;
      else if (st === "bad") bad += 1;
      else skipped += 1;
    }
    if (ok === 0 && skipped === 0 && bad === 0) {
      info("no frozen-catalog provisions declared");
      return true;
    }
    // DRY presence is an EXISTENCE probe — the sha gate runs only in
    // a real pass, and the plan says so (never "verified").
    info("models: " + ok + " downloaded+verified, " + skipped +
      " present" + (DRY ? " (dry: existence probe, sha unverified)" : "") +
      ", " + bad + " failed");
    return bad === 0;
  }
}
