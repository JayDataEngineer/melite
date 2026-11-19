#!/usr/bin/env node
// install-profile.mjs — thin shim; the rail is infer-provision.
//
// Retired 2026-09-03: this entry used to render absolute-path profile
// templates (packages/harness/dsh/profile/*.tmpl) — a drift surface
// the provisioner bundle was built to kill (rows live in the BUNDLE;
// the profile user layer stays EMPTY, so rendered profiles and
// `dsh plugin add` can never drift apart). The templates are deleted;
// this entrypoint forwards to the one renderer.
//
// Node port 2026-11-19 (operator law: npm + python only — no shell
// scripts anywhere in the tree). Same CLI: every argv forwards.
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const target = join(dirname(fileURLToPath(import.meta.url)), "provisioner", "bin", "infer-provision.mjs");
const child = spawn(process.execPath, [target, ...process.argv.slice(2)], { stdio: "inherit" });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("close", (code) => process.exit(code ?? 1));
child.on("error", (err) => { console.error("install-profile: spawn failed:", err.message); process.exit(1); });
