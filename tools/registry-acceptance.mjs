#!/usr/bin/env node
// registry-acceptance.mjs — the CONTENT gate for a melite npm registry.
//
// The systemd unit gate (estate-provision ./apply npm-registry) proves the
// SERVICE: unit byte-identical, active, /-/ping answers. A ping says the
// server is up — not that it serves the release. THIS tool proves content,
// against ANY registry URL (the local registry, npmjs, GitHub Packages):
//
//   per package (from the release manifest):
//     1. packument exists and carries the exact manifest version;
//     2. the packument's own dist.integrity (sha512) verifies against the
//        bytes THE REGISTRY serves — npm-level integrity, not ours alone;
//     3. the served bytes are byte-identical (sha256) to the gated release
//        row — the registry serves THE bytes, not lookalikes;
//   then a cold install:
//     4. a fresh directory with a scope-redirected .npmrc installs a
//        representative set FROM THE REGISTRY, and node_modules carries
//        each at the exact version (npm verifies packument integrity
//        during install, so a corrupt tarball fails this gate too).
//
// Exit 0 only when every gate passes. Any miss — missing packument,
// version mismatch, integrity failure, byte drift, install failure —
// exits non-zero with the row named. A gate that cannot fail is a log
// line; the failure modes are pinned in tools/registry-acceptance.spec.ts.
//
// Usage:
//   node tools/registry-acceptance.mjs --registry URL --from DIR
//        [--no-install] [--packages @melite/a,@melite/b] [--keep]
//
// --from DIR holds release-manifest.json (the authority). --packages
// overrides the install set (acceptance of ALL rows always runs).

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve as pathResolve } from "node:path";
import { tmpdir } from "node:os";

const argv = process.argv.slice(2);
const registry = flagValue("--registry");
const from = flagValue("--from");
if (!registry || !from || !existsSync(join(from, "release-manifest.json"))) {
  console.error("usage: node tools/registry-acceptance.mjs --registry URL --from DIR [--no-install] [--packages LIST] [--keep]");
  process.exit(2);
}
const doInstall = !argv.includes("--no-install");
const keep = argv.includes("--keep");
const installList = flagValue("--packages")?.split(",").map((s) => s.trim()).filter(Boolean);

function flagValue(flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

const manifest = JSON.parse(readFileSync(join(from, "release-manifest.json"), "utf8"));
const version = manifest.tag.replace(/^v/, "");

function rowName(file) {
  const stem = file.replace(/\.tgz$/, "");
  const base = stem.slice(0, -(version.length + 1));
  return base.startsWith("melite-plugin-")
    ? `@melite-plugin/${base.slice("melite-plugin-".length)}`
    : `@${base.replace(/-(.*)$/, "/$1")}`;
}
const rows = manifest.packages.map((r) => ({ ...r, name: rowName(r.file) }));

let bad = 0;
const fail = (msg) => { bad += 1; console.error(`  ✗ ${msg}`); };
const ok = (msg) => console.log(`  ✓ ${msg}`);

function fetchBuf(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 4) return reject(new Error("too many redirects"));
    const mod = url.startsWith("https") ? "node:https" : "node:http";
    import(mod).then(({ get }) => {
      get(url, { timeout: 30000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          const next = new URL(res.headers.location, url).toString();
          return resolve(fetchBuf(next, redirects + 1));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
        res.on("error", reject);
      }).on("error", reject);
    });
  });
}

// ── gate 1-3: per-row acceptance ──────────────────────────────────────
console.log(`registry acceptance: ${rows.length} rows against ${registry}`);
const accepted = [];
for (const row of rows) {
  const spec = `${row.name}@${version}`;
  let pack, bytes;
  // A dead/unreachable registry is a GATE FAILURE with the row named —
  // not an unhandled rejection (a crash is also non-zero, but the gate
  // must say WHICH claim failed, not just die).
  try {
    pack = await fetchBuf(`${registry.replace(/\/$/, "")}/${encodeURIComponent(row.name).replace("%40", "@")}`);
  } catch (e) {
    fail(`${spec}: packument unreachable (${String(e.message).split("\n")[0]})`);
    continue;
  }
  if (pack.status !== 404 && pack.status !== 200) {
    fail(`${spec}: packument HTTP ${pack.status}`);
    continue;
  }
  if (pack.status === 404) { fail(`${spec}: packument missing`); continue; }
  let doc;
  try { doc = JSON.parse(pack.body.toString("utf8")); }
  catch { fail(`${spec}: packument is not JSON`); continue; }
  const pv = doc.versions?.[version];
  if (!pv) { fail(`${spec}: packument lacks version ${version}`); continue; }

  const tarballUrl = new URL(pv.dist.tarball, registry).toString();
  try {
    bytes = await fetchBuf(tarballUrl);
  } catch (e) {
    fail(`${spec}: tarball unreachable (${String(e.message).split("\n")[0]})`);
    continue;
  }
  if (bytes.status !== 200) { fail(`${spec}: tarball HTTP ${bytes.status}`); continue; }

  // npm-level integrity from the packument — sha512 base64.
  const integ = /^sha512-(.+)$/.exec(pv.dist.integrity || "");
  if (!integ && pv.dist.integrity) { fail(`${spec}: packument integrity is not sha512`); continue; }
  if (integ) {
    const got = createHash("sha512").update(bytes.body).digest("base64");
    if (got !== integ[1]) {
      if (process.env.MELITE_ACCEPT_DEBUG) {
        console.error(`    [debug] url=${tarballUrl} len=${bytes.body.length}`);
        console.error(`    [debug] got=${got}\n    [debug] want=${integ[1]}`);
        console.error(`    [debug] head=${bytes.body.subarray(0, 40).toString("latin1")}`);
      }
      fail(`${spec}: sha512 MISMATCH packument vs served bytes`); continue;
    }
  }

  // byte-identity against the gated release row — sha256.
  const want = createHash("sha256").update(bytes.body).digest("hex");
  if (want !== row.sha256) { fail(`${spec}: sha256 DRIFT vs release manifest`); continue; }
  ok(`${spec} (${row.bytes} bytes, integrity+identity verified)`);
  accepted.push(row);
}

// ── gate 4: cold install from THIS registry ───────────────────────────
if (doInstall && accepted.length) {
  const picks = installList?.length
    ? installList
    : [accepted[0].name, accepted[Math.floor(accepted.length / 2)].name, accepted[accepted.length - 1].name];
  const dir = mkdtempSync(join(tmpdir(), "melite-accept-"));
  const host = new URL(registry).host;
  // BOTH melite scopes redirect — a mixed set must never fall through to
  // npmjs silently (that would make the gate prove npmjs, not the target).
  writeFileSync(join(dir, ".npmrc"),
    `@melite:registry=${registry.replace(/\/$/, "")}\n` +
    `@melite-plugin:registry=${registry.replace(/\/$/, "")}\n` +
    `//${host}/:_authToken=local-install-only\n`);
  // PIN the project root: /tmp itself can be a stale npm project (a stray
  // package.json/lock above the probe dir makes npm report "up to date"
  // and write into the PARENT tree — a false-green install). A probe-local
  // package.json stops the walk-up at THIS dir.
  writeFileSync(join(dir, "package.json"),
    JSON.stringify({ name: "melite-acceptance-probe", private: true, version: "0.0.0" }));
  const scope = "@melite(-plugin)?";
  console.log(`cold install in ${dir}: ${picks.join(", ")} (scope ${scope} -> ${registry})`);
  let installOk = false;
  try {
    const out = execFileSync("npm", ["install", "--no-audit", "--no-fund", ...picks],
      { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, npm_config_userconfig: join(dir, ".npmrc") } });
    installOk = true;
    if (process.env.MELITE_ACCEPT_DEBUG) console.error(`    [npm] ${out.slice(0, 400).split("\n").join("\n    [npm] ")}`);
    for (const name of picks) {
      const pj = join(dir, "node_modules", name, "package.json");
      if (!existsSync(pj)) { fail(`${name}: not in node_modules after install`); continue; }
      const got = JSON.parse(readFileSync(pj, "utf8")).version;
      if (got !== version) fail(`${name}: node_modules has ${got}, want ${version}`);
      else ok(`${name}@${got} installed from the registry`);
    }
  } catch (e) {
    fail(`npm install failed: ${String(e.stderr || e.message).split("\n").slice(-4).join(" | ")}`);
  }
  if (!keep && !process.env.MELITE_ACCEPT_KEEP) {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* tmp */ }
  } else if (installOk) {
    console.log(`  (kept for inspection: ${dir})`);
  }
}

console.log(bad ? `\n${bad} failure(s) — registry acceptance FAILED` : `\nall ${rows.length} rows accepted`);
process.exit(bad ? 1 : 0);
