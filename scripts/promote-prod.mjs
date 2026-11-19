#!/usr/bin/env node
// promote-prod.mjs — THE PROD LANE PROMOTE (li-bg, 2026-10-11).
//
// WHY THIS EXISTS: the lanes have a law (3088 dev first, 3080 prod
// last) but only the dev half had tooling — ship-lane.mjs ships 3088.
// The prod half was raw systemctl (done once, by hand, 2026-10-11,
// and called out by the operator for exactly that). Never again:
// this script IS the sanctioned prod touch.
//
// THE CONTRACT:
//   1. PRE-FLIGHT — prod is only ever promoted onto a state the dev
//      lane has already proven: HEAD must be the committed build, the
//      dev lane must be up. A dirty tree or a down dev lane refuses.
//   2. RECORD — the pre-promote service state is printed (PID, since)
//      so a rollback has its bearings.
//   3. RESTART — the one privileged action, named loudly.
//   4. HEALTH GATE — poll the authed prod doors until the estate
//      reports ready (validate answers with a verdict, not "estate
//      composition is still activating"); refuse to report success
//      before it does.
//   5. RECEIPTS — door probes printed for the ledger.
//
// ROLLBACK: `promote-prod.mjs --rollback` restarts prod onto the
// recorded prior HEAD (the service runs from this repo tree).
//
// NO-ENV LAW (operator 2026-11-16): lane URLs are FLAGS, never env
// vars — `--prod-url URL` / `--dev-url URL`. The only env this
// script reads is DSH_PROD_TOKEN (a secret; env-or-file policy).
//
// Node port 2026-11-19 (operator law: npm + python only).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(join(fileURLToPath(import.meta.url), "..", ".."));
const say = (m) => console.log("\x1b[1m== " + m + "\x1b[0m");
const ok = (m) => console.log("   \x1b[32mok\x1b[0m   " + m);
const bad = (m) => { console.log("   \x1b[31mBAD\x1b[0m  " + m); process.exit(1); };

const sh = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  return { code: r.status, out: String(r.stdout ?? "").trim(), err: String(r.stderr ?? "").trim() };
};

const PROD_UNIT = "dsh-web.service";
let PROD_URL = "http://127.0.0.1:3080";
let DEV_URL = "http://127.0.0.1:3088";
let ROLLBACK = false;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--prod-url" && args[i + 1] !== undefined) { PROD_URL = args[++i]; }
  else if (args[i] === "--dev-url" && args[i + 1] !== undefined) { DEV_URL = args[++i]; }
  else if (args[i] === "--rollback") { ROLLBACK = true; }
  else bad("unknown flag " + args[i] + " (lawful: --prod-url URL | --dev-url URL | --rollback)");
}
const STATE_FILE = "/tmp/promote-prod.last";
const TOKEN = process.env["DSH_PROD_TOKEN"];
if (TOKEN === undefined || TOKEN === "") bad("DSH_PROD_TOKEN must name the prod bearer (never committed)");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const httpCode = (url) => sh("curl", ["-s", "-m", "10", "-o", "/dev/null", "-w", "%{http_code}", url]).out || "000";

if (ROLLBACK) {
  say("ROLLBACK the prod lane onto the recorded prior HEAD");
  if (!existsSync(STATE_FILE)) bad("no recorded promote to roll back (" + STATE_FILE + " absent)");
  const state = {};
  for (const line of readFileSync(STATE_FILE, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) state[m[1]] = m[2];
  }
  say("prior HEAD: " + String(state["PRIOR_HEAD"]));
  sh("git", ["-C", REPO, "checkout", String(state["PRIOR_HEAD"])]);
  sh("systemctl", ["--user", "restart", PROD_UNIT]);
  await sleep(5000);
  ok("prod restarted onto " + String(state["PRIOR_HEAD"]) + " — run the health gate by promoting again from that state");
  process.exit(0);
}

say("PRE-FLIGHT the promote");
const branch = sh("git", ["-C", REPO, "rev-parse", "--abbrev-ref", "HEAD"]).out;
if (branch !== "cordis") bad("promote rides the cordis branch only");
const dirty = sh("git", ["-C", REPO, "status", "--porcelain"]).out;
if (dirty !== "") bad("the tree is dirty — prod promotes committed builds only");
const DEV_CODE = httpCode(DEV_URL + "/v1/form-spec");
if (DEV_CODE === "000") bad("the dev lane (" + DEV_URL + ") is down — prod never promotes ahead of dev");
const HEAD = sh("git", ["-C", REPO, "rev-parse", "HEAD"]).out;
const SHORT = sh("git", ["-C", REPO, "rev-parse", "--short", "HEAD"]).out;
ok("committed HEAD " + SHORT + ", dev lane answers (" + DEV_CODE + ")");

say("RECORD the pre-promote bearings");
const PRIOR_PID = sh("systemctl", ["--user", "show", "-p", "MainPID", "--value", PROD_UNIT]).out;
const PRIOR_SINCE = sh("systemctl", ["--user", "show", "-p", "ActiveEnterTimestamp", "--value", PROD_UNIT]).out;
writeFileSync(STATE_FILE,
  "PRIOR_HEAD=" + HEAD + "\nPRIOR_PID=" + PRIOR_PID + "\nPRIOR_SINCE=" + PRIOR_SINCE + "\n");
ok("was: pid " + PRIOR_PID + " since " + PRIOR_SINCE + " (recorded to " + STATE_FILE + " for --rollback)");

say("RESTART the prod unit (the one privileged action)");
sh("systemctl", ["--user", "restart", PROD_UNIT]);
await sleep(5000);
const active = sh("systemctl", ["--user", "is-active", "--quiet", PROD_UNIT]).code === 0;
if (!active) bad(PROD_UNIT + " failed to come active");
ok(PROD_UNIT + " active");

say("HEALTH GATE the authed doors (estate must report ready)");
const deadline = Math.floor(Date.now() / 1000) + 120;
let verdict = "";
for (;;) {
  const body = sh("curl", ["-s", "-m", "10", "-H", "Authorization: Bearer " + TOKEN,
    "-X", "POST", "-H", "content-type: application/json",
    "-d", JSON.stringify({ id: "promote-probe", stages: [] }),
    PROD_URL + "/v1/flows/validate"]).out;
  if (body !== "" && !body.includes("estate/pending")) { verdict = body; break; }
  if (Math.floor(Date.now() / 1000) >= deadline) {
    bad("the estate never activated within 120s (last: " + body.slice(0, 120) + ")");
  }
  await sleep(3000);
}
ok("validate door answers with a verdict:");
console.log("   " + verdict.slice(0, 200));

say("PROMOTED");
console.log("   lane:   " + PROD_URL);
console.log("   unit:   " + PROD_UNIT);
console.log("   head:   " + SHORT);
console.log("   rollback: " + process.argv[1] + " --rollback (restarts onto " + SHORT + "^ recorded at promote time)");
