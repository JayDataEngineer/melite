// provision-models — declaration provision rows: estate streaming download + sha256 gate.
// Split from scripts/provision.ts (pure move — no logic changes).

import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { loadCardDefs, provisionsByFamily } from "../src/cardDefs.ts";
import { DEFAULT_CONFIG, DRY, RUNTIME, die, info, warn } from "./provision-shared.ts";
import { boundModelFolders, loadConfig } from "./provision-config.ts";
import { sameWorld } from "./provision-extensions-install.ts";

// ── models via the estate downloader + frozen catalog + sha256 gate ──

export function sha256Of(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export interface ProvisionRow {
  name: string;
  folder: string;
  url: string;
  sha256: string;
}

export async function catalogProvisions(): Promise<Array<{ family: string; row: ProvisionRow }>> {
  // The MODEL-side download places, TS-natively from the declaration
  // rows (the engine's provisionsByFamily — DECL provisions + card-
  // owned provisions; the model.py cell/provision walks died with
  // the py plane and the frozen catalog re-home died with the blob).
  const defs = await loadCardDefs();
  const byFamily = await provisionsByFamily(defs);
  const out: Array<{ family: string; row: ProvisionRow }> = [];
  for (const fam of Object.keys(byFamily).sort()) {
    for (const row of byFamily[fam]?.provisions ?? []) out.push({ family: fam, row });
  }
  return out;
}

export async function fetchVerified(workspace: string,
    storeRoot: string, label: string, url: string, name: string,
    sub: string, want: string): Promise<string> {
  // One artifact through the ESTATE downloader (plain TS streaming
  // fetch into the workspace models tree — the comfy-mcp rail died
  // with the no-external-python stroke, 2026-09-10), then
  // sha256-verified. Returns ok | skipped | bad.
  const rel = sub ? "models/" + sub : "models";
  const dest = join(workspace, rel, name);
  const store = sub ? join(storeRoot, sub, name) : join(storeRoot, name);
  if (existsSync(store)) return "skipped";
  info("  [model] " + label + " -> " + rel + "/");
  if (DRY) {
    console.log("[dry-run] download " + url + " -> " + rel + "/" +
      name);
    return "skipped";
  }
  try {
    mkdirSync(dirname(dest), { recursive: true });
    const r = await fetch(url);
    if (!(r.status >= 200 && r.status < 300) || r.body === null) {
      warn("  [model] " + name + ": download refused: HTTP " + r.status);
      return "bad";
    }
    const tmp = dest + ".part";
    await pipeline(Readable.fromWeb(r.body as never),
      createWriteStream(tmp));
    renameSync(tmp, dest);
  } catch (exc) {
    warn("  [model] " + name + ": download raised: " +
      String(exc).slice(0, 160));
    return "bad";
  }
  let verifyAt = dest;
  // THE POINTER TEST: with download pointers laid (cmd paths), dest
  // resolves THROUGH the symlink onto the configured store — same
  // real file, nothing to move.
  if (existsSync(dest)) {
    try {
      if (realpathSync(dest) !== store) {
        mkdirSync(dirname(store), { recursive: true });
        renameSync(dest, store);
        verifyAt = store;
        info("  [model] " + name + ": moved to the weights store");
      }
    } catch (exc) {
      warn("  [model] " + name + ": move to store failed (" + exc +
        "); verifying in place");
    }
  }
  if (want) {
    const got = sha256Of(verifyAt).toLowerCase();
    if (got !== want) {
      try { unlinkSync(verifyAt); } catch { /* gone */ }
      warn("  [model] " + name + ": sha256 mismatch — deleted");
      return "bad";
    }
  }
  info("  [model] " + name + ": verified");
  return "ok";
}

export async function stepModels(): Promise<boolean> {
  const cfg = loadConfig(DEFAULT_CONFIG);
  if (cfg.provision !== "managed") {
    die("provision=" + JSON.stringify(cfg.provision) + " — BYO " +
      "deployments own their model tree; the estate never " +
      "downloads into a user workspace");
  }
  {
    const workspace = RUNTIME;
    if (!sameWorld(workspace, "sha-verified model downloads")) return false;
    const bound = boundModelFolders(cfg);
    const storeRoot = bound.download_path;
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
      const st = await fetchVerified(workspace, storeRoot,
        family + "/provision/" + name, url, name, sub, want);
      if (st === "ok") ok += 1;
      else if (st === "bad") bad += 1;
      else skipped += 1;
    }
    if (ok === 0 && skipped === 0 && bad === 0) {
      info("no frozen-catalog provisions declared");
      return true;
    }
    info("models: " + ok + " downloaded+verified, " + skipped +
      " present, " + bad + " failed");
    return bad === 0;
  }
}
