#!/usr/bin/env node
// uninstall-profile.mjs — remove the inference.cpp DSH profile.
// Node port 2026-11-19 (operator law: npm + python only).
import { rmSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROFILE_NAME = process.env["DSH_PROFILE_NAME"] ?? "inference";
const DST_DIR = join(process.env["DSH_HOME"] ?? join(homedir(), ".dsh"), "profiles", PROFILE_NAME);

if (existsSync(DST_DIR)) {
  rmSync(DST_DIR, { recursive: true, force: true });
  console.log("removed " + DST_DIR);
} else {
  console.log("nothing to remove (" + DST_DIR + " not found)");
}
