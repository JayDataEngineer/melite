// The :3088 melite-test lane GUI gate — the operator's law: "I need to see
// ALL MODELS ... HOW DO YOU NOT TEST FOR THIS."
//
// Boots headless chromium against the running lane, opens the real model
// picker and the real agent-preset menu, and asserts BOTH surfaces carry the
// operator's live web-profile rows (mirrored into
// dev_docs/deployment/studio-lane-rows.yml and rendered by estate-provision).
//
//   node test/gui-model-picker.mjs
//
// Env: GUI_URL (default http://127.0.0.1:3088), GUI_TOKEN, GUI_LOG (default
// /home/user/.dsh-dev/melite-test-3088.log). Token auto-discovers from the
// boot log's latest "dsh web:" line. Exit 0 = both surfaces complete;
// exit 1 = any missing entry (banner names each miss).

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const URL_BASE = process.env.GUI_URL ?? "http://127.0.0.1:3088";
const LOG = process.env.GUI_LOG ?? "/home/user/.dsh-dev/melite-test-3088.log";

// What must be visible, per the mirrored web-profile rows (studio-lane-rows.yml).
const REQUIRED_PROVIDER_GROUPS = ["xiaomi-token-plan-sgp", "openrouter", "zai", "opencode-go", "opencode-go-chat"];
const REQUIRED_MODEL_SENTINELS = [
  "MiMo-V2.5",
  "DeepSeek V4.1 Flash",
  "GLM-5.3 Flash (Coding Plan)",
  "Muse Spark 1.3 (Contributor)",
  "LongCat 2.5 Preview Free (Go, limited time)",
  "Qwen3.8-27B",
];
const REQUIRED_PRESETS = [
  "Game Studio (Master)",
  "Orchestrator",
  "Mega Unity Console",
  "Mega Godot Console",
  "Mega Blender Console",
  "Game Master — Unity flow",
  "Game Master — Godot flow",
  "DSH Dev (economy subagents)",
  "Deep Research",
  "Investing",
  "Media Production",
  "MELD Playtester (Flash)",
];

function fail(msg) {
  console.error(`GUI MODEL GATE: FAIL — ${msg}`);
  process.exit(1);
}

function resolvePlaywright() {
  const pnpmRoot = join(process.cwd(), "node_modules/.pnpm");
  const dirs = readdirSync(pnpmRoot)
    .filter((d) => d.startsWith("playwright@"))
    .sort()
    .reverse();
  if (dirs.length === 0) fail("playwright not found under node_modules/.pnpm");
  return new URL(
    `file://${join(pnpmRoot, dirs[0], "node_modules/playwright/index.mjs")}`,
  ).href;
}

function discoverToken() {
  if (process.env.GUI_TOKEN) return process.env.GUI_TOKEN;
  const log = readFileSync(LOG, "utf8");
  const lines = log.split("\n").filter((l) => l.includes("dsh web:"));
  if (lines.length === 0) fail(`no "dsh web:" line in ${LOG} — is the seat booted?`);
  const m = lines[lines.length - 1].match(/token=([A-Za-z0-9_-]+)/);
  if (!m) fail("boot log web line carries no token");
  return m[1];
}

const { chromium } = await import(resolvePlaywright());
const token = discoverToken();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
try {
  await page.goto(`${URL_BASE}/?token=${token}`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(3500);
  const cont = page.locator('button:has-text("Continue")');
  if (await cont.count()) {
    await cont.first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(600);
  }

  const leafTexts = async () =>
    page.evaluate(() => {
      const seen = new Set();
      for (const el of document.querySelectorAll("*")) {
        if (el.children.length === 0) {
          const t = (el.textContent || "").trim().replace(/\s+/g, " ");
          if (t.length > 1 && t.length < 100) seen.add(t);
        }
      }
      return [...seen];
    });

  // Model picker: trigger -> "Model" row -> catalog.
  await page.locator('[aria-label^="Select model"]').click({ timeout: 20000 });
  await page.waitForTimeout(600);
  await page.getByText("Model", { exact: true }).first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const models = await leafTexts();
  await page.screenshot({ path: "/tmp/gui-model-picker-models.png" });
  const missingModels = [
    ...REQUIRED_PROVIDER_GROUPS.filter((p) => !models.includes(p)).map((p) => `provider:${p}`),
    ...REQUIRED_MODEL_SENTINELS.filter((m) => !models.includes(m)).map((m) => `model:${m}`),
  ];
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // Agent-preset menu: the composer preset trigger.
  await page.locator('button:has-text("Standard mode")').first().click({ timeout: 20000 });
  await page.waitForTimeout(1500);
  const presets = await page.evaluate(() => {
    const seen = new Set();
    for (const el of document.querySelectorAll("[role=menuitem], [role=option], [role=menu] *, li, button")) {
      const t = (el.textContent || "").trim().replace(/\s+/g, " ");
      if (t.length > 1 && t.length < 100) seen.add(t);
    }
    return [...seen];
  });
  await page.screenshot({ path: "/tmp/gui-model-picker-presets.png" });
  const missingPresets = REQUIRED_PRESETS.filter((p) => !presets.includes(p));

  const missing = [...missingModels, ...missingPresets];
  if (missing.length > 0) fail(`missing from the live GUI: ${missing.join(", ")}`);
  console.log(
    `GUI MODEL GATE: PASS — ${REQUIRED_PROVIDER_GROUPS.length} provider groups, ` +
      `${REQUIRED_MODEL_SENTINELS.length} sentinel models, ${REQUIRED_PRESETS.length} agent presets visible.`,
  );
} catch (err) {
  fail(err?.message?.split("\n")[0] ?? String(err));
} finally {
  await browser.close();
}
