#!/usr/bin/env node
// lane-dev.mjs — THE DEV BUILD for the lane's plugins (documented path:
// references/deepseek-harness/docs/development.md `dev:web` contract +
// packages/client/hmr/README.md — "any watch process using the shared
// Client tsdown preset" attaches to a host started elsewhere).
//
// What this does: one `tsdown --watch` per client-bundle package. On
// every save it rewrites lib/client.js; the lane on :3088 (already
// running) polls bundle stats, calls rebuilt(), and swaps the plugin
// into the open page over HMR — no restart, no refresh.
//
// Why nothing can go stale: every bundle URL is rev-pinned from the
// file's mtime/size and served immutable; a changed bundle gets a NEW
// rev and the old URL 404s (client-modules.md). Old bytes are
// un-serveable by construction. F5 always boots the live composition.
//
// Server-side (harness/engine src) changes still need lane-rebuild.mjs
// — that script restarts the lane; this one hot-swaps browser plugins.
//
// Node port 2026-11-19 (operator law: npm + python only).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import net from "node:net";

const REPO = resolve(join(fileURLToPath(import.meta.url), "..", ".."));
process.chdir(REPO);

// deployment env (.env is gitignored; .env.example documents every knob)
if (existsSync(join(REPO, ".env"))) {
  for (const line of readFileSync(join(REPO, ".env"), "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const PORT = 3088;
const LOG = join(homedir(), ".dsh-dev", "melite-test-3088.log");

function portAnswers() {
  return new Promise((res) => {
    const s = net.connect({ host: "127.0.0.1", port: PORT, timeout: 1500 });
    s.on("connect", () => { s.destroy(); res(true); });
    s.on("error", () => res(false));
    s.on("timeout", () => { s.destroy(); res(false); });
  });
}

// Same discovery as lane-rebuild.mjs: every tsdown client package,
// except harness-tools (wall-mandated full-tsc output, never tsdown).
function tsdownDirs() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === "node_modules") continue;
      const full = join(dir, entry.name);
      if (existsSync(join(full, "tsdown.config.ts"))) out.push(full);
      else walk(full);
    }
  };
  walk(join(REPO, "packages"));
  return out
    .filter((d) => d !== join(REPO, "packages", "harness", "melite-tools"))
    .sort();
}

const up = await portAnswers();
if (!up) {
  console.error("lane on :" + PORT + " is DOWN — start it first (systemctl --user start dsh-melite-test or ./scripts/lane-rebuild.mjs)");
  process.exit(1);
}

const DIRS = tsdownDirs();
const pids = [];
const cleanup = () => { for (const p of pids) { try { process.kill(p, "SIGTERM"); } catch { /* already gone */ } } };
process.on("SIGINT", () => { cleanup(); process.exit(0); });
process.on("SIGTERM", () => { cleanup(); process.exit(0); });

for (const d of DIRS) {
  const log = join("/tmp", "lane-dev-" + basename(d) + ".log");
  const child = spawn(join(d, "node_modules", ".bin", "tsdown"), ["--watch"], {
    cwd: d, detached: false, stdio: ["ignore", "pipe", "pipe"],
  });
  const { createWriteStream } = await import("node:fs");
  const stream = createWriteStream(log, { flags: "a" });
  child.stdout.pipe(stream); child.stderr.pipe(stream);
  pids.push(child.pid);
  console.log("  watch  " + d);
}

console.log("");
console.log("WATCHING " + String(DIRS.length) + " plugin bundles → :" + PORT + " swaps live on save.");
let TOK = "";
try {
  const text = readFileSync(LOG, "utf8");
  const lines = text.split("\n").filter((l) => l.includes("dsh web:"));
  if (lines.length > 0) TOK = lines[lines.length - 1].replace(/^.*dsh web: /, "");
} catch { /* no log yet — no token to print */ }
if (TOK !== "") console.log("open: " + TOK);
console.log("stop with Ctrl-C (server-side src changes: ./scripts/lane-rebuild.mjs)");
setInterval(() => { /* keep the process alive for the watchers */ }, 60_000);
