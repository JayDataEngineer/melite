// provision — the ONE provisioning orchestrator (TS port of tools/provision.py,
// deleted at the NO-ESTATE-PYTHON cut, 2026-09-08).
//
// Operator orders: PROVISIONING LAW (2026-09-03) + NO-ESTATE-PYTHON
// (2026-09-08) + NO-EXTERNAL-PYTHON (2026-09-10): the ONE vendor is
// ComfyUI-Manager, BUILT INTO the managed ComfyUI as a custom node
// (vendored at the pinned ref by `provision sync` — the auto-build)
// and served on ComfyUI's own port. Estate legs (git installs, model
// downloads, core/manager checkouts) are plain TS. No estate Python
// is written, imported, or executed by this tool; no external
// manager binary, MCP server, or comfy-cli is spawned.
//
// Instance provisioning — one interface, two modes:
//   byo (default)  the user's own ComfyUI, anywhere. VERIFIED, never installed.
//   managed        a lockfile-pinned ComfyUI under data/runtime/comfyui/
//                  with the built-in manager vendored into custom_nodes/.
// Declaration provisioning:
//   extensions     ComfyUI-Manager's node queue per declaration row
//                  (/manager/queue/install + start; the engine must
//                  be up — every row carries its git url, first-party
//                  packs at github.com/JayDataEngineer/<pack>, the
//                  same repos vendor/comfyui_extensions references
//                  as submodules).
//   models         ComfyUI-Manager's install_model queue per declaration
//                  provision row (the engine's provisionsByFamily —
//                  DECL + card-owned rows), followed by shared TS
//                  sha256 presence verification.
//   all            extensions + models.
//
// Config is read TS-natively: inference.config.json at the repo root
// supplies the provisioning/layout defaults. The endpoint file
// (packages/engines/comfyui-cordis/data/comfyui_endpoint.json) is the
// live deployment surface and may override named engine fields when set;
// the runtime engine resolves its URL from COMFYUI_URL or the endpoint file.
// Present-but-empty endpoint keys die LOUD (QUEUE LANE LAW).
//
// Commands (nouns kept stable — the manage door's restart-refusal
// text names `provision boot-cmd`):
//   verify | paths | sync | boot-cmd [config]
//   extensions | models | all [--dry-run]
//   dsh | manage <action> [key=value ...] | commercial [--no-warmup]
//
// Usage (any OS — Windows, macOS, Linux; pnpm + ComfyUI, no wrappers):
//   pnpm run provision -- <command>
//   node --experimental-strip-types packages/engines/comfyui-cordis/scripts/provision.ts <command>
// Erasable-syntax TS only: no enums, no namespaces.

import { DEFAULT_CONFIG, info, setDry } from "./provision-shared.ts";
import { loadConfig } from "./provision-config.ts";
import { cmdPaths } from "./provision-instance-layout.ts";
import { cmdBootCmd, cmdManifest, cmdSync, cmdVerify } from "./provision-instance-managed.ts";
import { stepExtensions } from "./provision-extensions-install.ts";
import { stepModels } from "./provision-models.ts";
import { cmdDsh } from "./provision-dsh.ts";
import { cmdManage } from "./provision-manage.ts";
import { cmdCommercial } from "./provision-commercial.ts";

export * from "./provision-shared.ts";
export * from "./provision-config.ts";
export * from "./provision-extensions-manifest.ts";
export * from "./provision-instance-layout.ts";
export * from "./provision-instance-managed.ts";
export * from "./provision-extensions-install.ts";
export * from "./provision-models.ts";
export * from "./provision-dsh.ts";
export * from "./provision-manage.ts";
export * from "./provision-commercial.ts";

// ── main ────────────────────────────────────────────────────────

function usage(): void {
  console.log("usage: provision <command> [args]");
  console.log("  paths|sync|boot-cmd|verify|manifest [config]");
  console.log("  extensions|models|all [--dry-run]");
  console.log("  dsh | manage <action> [key=value ...] | commercial [--no-warmup]");
}

async function main(): Promise<number> {
  // `pnpm run provision -- <cmd>` forwards the separator literally on
  // some pnpm versions; drop it so both spellings parse identically.
  const raw = process.argv.slice(2);
  if (raw[0] === "--") raw.shift();
  const argv = raw;
  const cmd = argv[0];
  if (!cmd || cmd === "--help" || cmd === "-h") {
    usage();
    return cmd ? 0 : 2;
  }
  if (cmd === "dsh") {
    cmdDsh();
    return 0;
  }
  if (cmd === "commercial") {
    cmdCommercial(!argv.includes("--no-warmup"));
    return 0;
  }
  if (cmd === "manage") {
    return cmdManage(argv.slice(1));
  }
  if (cmd === "paths" || cmd === "sync" || cmd === "boot-cmd" ||
      cmd === "verify" || cmd === "manifest") {
    if (cmd === "manifest") {
      cmdManifest();
      return 0;
    }
    const cfg = loadConfig(argv[1] ?? DEFAULT_CONFIG);
    if (cmd === "paths") cmdPaths(cfg);
    else if (cmd === "sync") cmdSync(cfg);
    else if (cmd === "boot-cmd") cmdBootCmd(cfg);
    else await cmdVerify(cfg);
    return 0;
  }
  if (cmd === "extensions" || cmd === "models" || cmd === "all") {
    setDry(argv.includes("--dry-run"));
    let rc = 0;
    if (cmd === "all" || cmd === "extensions") {
      if (!await stepExtensions()) rc = 1;
    }
    if (cmd === "all" || cmd === "models") {
      if (!await stepModels()) rc = 1;
    }
    info("==========================================");
    info(rc === 0 ? "provision complete"
      : "provision FINISHED WITH FAILURES");
    return rc;
  }
  console.log("REFUSED: unknown command " + JSON.stringify(cmd));
  usage();
  return 2;
}

main().then(
  (rc) => process.exit(rc),
  (e) => {
    console.error("[provision] FATAL: " + String(e).slice(0, 500));
    process.exit(1);
  });
