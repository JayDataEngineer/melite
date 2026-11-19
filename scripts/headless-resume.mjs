#!/usr/bin/env node
// headless-resume.mjs — the quota-stop wrapper (roadmap section 25).
//
// A headless maker commission that dies on LLM quota must STOP with
// a resume token, never a silent residue: the brief, the transcript
// tails, and the exact re-invocation that resumes it. The maker
// resumes from brief + transcript (the transcript IS the durable
// loop state — the headless app owns no mid-loop snapshot), so the
// token records WHERE the next commission picks up, not a snapshot.
//
// Usage: headless-resume.mjs <brief-file> [out-prefix] [timeout-s]
//   out-prefix defaults to /tmp/chat; timeout-s defaults to 540.
// Exit: 0 the commission exited 0; 75 quota-death (EX_TEMPFAIL —
//   the token at <out-prefix>-resume.token.md says when to retry);
//   any other code is the commission's own (loud, no token).
//
// Knobs (tests stub the binary; operators inherit the recipe):
//   HEADLESS_DSH_BIN  the dsh binary (default: the recipe path)
//   HEADLESS_PROFILE  the headless profile (default: headless)
//
// Node port 2026-11-19 (operator law: npm + python only). The wall
// (scripts/headless-resume.spec.ts) drives this file; the classifier
// words are unchanged.
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const BRIEF = process.argv[2] ?? "";
if (BRIEF === "") {
  console.error("usage: headless-resume.mjs <brief-file> [out-prefix] [timeout-s]");
  process.exit(1);
}
const OUT = process.argv[3] ?? "/tmp/chat";
const TIMEOUT_S = process.argv[4] ?? "540";
const DSH_BIN = process.env["HEADLESS_DSH_BIN"] ??
  (() => { const w = spawnSync("which", ["dsh"], { encoding: "utf8" }); return w.status === 0 ? w.stdout.trim() : "dsh"; })();
const PROFILE = process.env["HEADLESS_PROFILE"] ?? "headless";
const MISE = join(homedir(), ".local", "share", "mise", "installs", "node", "24.21.0", "bin");
process.env["PATH"] = MISE + ":" + (process.env["PATH"] ?? "");

const OUT_TXT = OUT + "-out.txt";
const OUT_ERR = OUT + "-err.txt";
const TOKEN = OUT + "-resume.token.md";

const child = spawn(process.execPath, [DSH_BIN, "--profile", PROFILE, readFileSync(BRIEF, "utf8")], {
  stdio: ["ignore", "pipe", "pipe"],
});
let outTxt = "", outErr = "";
child.stdout.on("data", (d) => { outTxt += String(d); });
child.stderr.on("data", (d) => { outErr += String(d); });
const timer = setTimeout(() => child.kill("SIGKILL"), Number(TIMEOUT_S) * 1000);
const CODE = await new Promise((res) => child.on("close", (c) => { clearTimeout(timer); res(c ?? 1); }));
writeFileSync(OUT_TXT, outTxt);
writeFileSync(OUT_ERR, outErr);

// THE CLASSIFIER (the only logic — everything else is the recipe):
// quota-death speaks 429/quota/RESOURCE_EXHAUSTED/rate-limit on the
// transcript stderr (the loop own voice, attempt006 receipt).
if (/429|quota|resource_exhausted|rate\.?limit|overloaded/i.test(outErr)) {
  const resetMatch = outErr.match(/reset[^"]{0,80}/i);
  const RESET_LINE = resetMatch ? resetMatch[0] : "";
  const CALLS = String((outErr.match(/tool/g) ?? []).length);
  const tail = (s, n) => s.split("\n").slice(-n).join("\n");
  writeFileSync(TOKEN,
    "# resume token -- quota death (do NOT edit by hand)\n" +
    "\n" +
    "- brief: " + BRIEF + "\n" +
    "- stdout: " + OUT_TXT + " (maker last words are the tail)\n" +
    "- stderr: " + OUT_ERR + " (the transcript -- " + CALLS + " tool-call lines)\n" +
    "- exit: " + String(CODE) + "\n" +
    "- reset: " + (RESET_LINE !== "" ? RESET_LINE : "unknown -- retry after the usual window") + "\n" +
    "\n" +
    "## last stdout words\n" + tail(outTxt, 20) + "\n" +
    "\n" +
    "## resume\n" +
    "Re-invoke this same script with the same brief once the reset passes;\n" +
    "point the next brief at this token + the transcript above so the new\n" +
    "maker continues the loop instead of restarting it.\n");
  console.error("headless-resume: quota death (exit " + String(CODE) + ") -- token at " + TOKEN);
  process.exit(75);
}

process.exit(CODE);
