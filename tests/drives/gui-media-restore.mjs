// The :3088 melite-test lane GUI gate — the media sidebar's history wand.
// The operator's law: "there is a media right sidebar, with history buttons
// on the previews … it use to send me back to the bench with this history
// loaded — this is a CORE FEATURE, how is it not tested for." Plus the
// hover ask: "make sure the history button on the media preview there only
// shows on hover."
//
// Boots headless chromium against the running lane and pins the wand's
// whole contract at the browser:
//   1. HOVER LAW   — the wand rides every tile but computed opacity is 0
//                    until the tile is hovered (and back to 0 off-hover).
//   2. RESTORE     — pressing the wand fires the chain
//                    GET /infer-gallery/flow?run_id → GET /v1/bench/<session>
//                    → POST /v1/bench/ensure, mints/activates the Media Flow
//                    tab, and the bench lands visible.
//   3. DEDUPE      — a second press focuses the SAME tab (no mint storm).
//   4. SURVIVAL    — returning to Media remounts an intact grid.
//
//   node test/gui-media-restore.mjs
//
// Env: GUI_URL (default http://127.0.0.1:3088), GUI_TOKEN, GUI_LOG (default
// /home/user/.dsh-dev/melite-test-3088.log). Token auto-discovers from the
// boot log's latest "dsh web:" line. Exit 0 = all four contract legs hold;
// exit 1 = banner names each miss.

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const URL_BASE = process.env.GUI_URL ?? "http://127.0.0.1:3088";
const LOG = process.env.GUI_LOG ?? "/home/user/.dsh-dev/melite-test-3088.log";

function fail(msg) {
  console.error(`GUI MEDIA RESTORE GATE: FAIL — ${msg}`);
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

const WAND = '[data-infer-media-panel="1"] [aria-label="Open as cards — this run"]';
// Scoped face of the same wand: a Playwright .locator(sel) chained on the
// TILE evaluates its selector INSIDE the tile subtree — the panel-root
// ancestor segment of WAND lies outside that scope and matches nothing.
const WAND_IN = '[aria-label="Open as cards — this run"]';
const TILE = '[data-infer-media-panel="1"] div[style*="grid-template-columns"] > button';

const { chromium } = await import(resolvePlaywright());
const token = discoverToken();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const misses = [];
try {
  await page.goto(`${URL_BASE}/?token=${token}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(8000);
  // THE NOTICE CLASS, NOT A BAKED TITLE (the tour spine's law,
  // li-bu — mirrors estate-lane-sidebar.spec.ts: shells retitle the
  // first-run notice mid-arc, so match /Notice/ + Continue, retried).
  for (let round = 0; round < 3; round++) {
    const notice = page
      .getByRole("dialog")
      .filter({ hasText: /Notice/ })
      .getByRole("button", { name: "Continue" });
    if ((await notice.count()) === 0) break;
    await notice.click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }
  // THE STRIP HIDES UNTIL A CONVERSATION IS REALLY OPEN — when the
  // expand seat is absent, open one through the hero composer.
  const expandSeat = page.locator("[data-sidebar-right-expand]").first();
  if ((await expandSeat.count()) === 0) {
    const hero = page.getByRole("textbox", { name: /Describe what you want to build/ });
    await hero.fill("lane gate: opening the shell for the media restore audit", { timeout: 15000 });
    await hero.press("Enter");
    await page.waitForTimeout(8000);
  }
  await page.locator("[data-sidebar-right-expand]").first().click({ timeout: 30000 });
  await page.waitForTimeout(2000);
  // The Media surface: a strip GUIDE now (the dockkit-tab chrome the
  // old gate clicked retired with the panel-list redesign).
  const mediaGuide = page.getByText("Media", { exact: true });
  if ((await mediaGuide.count()) > 0) {
    await mediaGuide.first().click({ timeout: 30000 });
  } else {
    misses.push("media: no Media guide in the strip");
  }
  await page.locator(WAND).first().waitFor({ timeout: 20000 }).catch(() => {});
  const wandCount = await page.locator(WAND).count();
  if (wandCount === 0) misses.push("media: the artifacts grid rendered zero wands");

  // ---- Leg 1: hover law --------------------------------------------------
  if (wandCount > 0) {
    const firstWand = page.locator(WAND).first();
    const firstTile = page.locator(TILE).first();
    const opacityOf = () => firstWand.evaluate((el) => getComputedStyle(el).opacity);
    const atRest = await opacityOf();
    if (atRest !== "0") misses.push(`hover: wand opacity at rest is ${atRest}, want 0`);
    await firstTile.hover();
    await page.waitForTimeout(350);
    const onHover = await opacityOf();
    if (onHover !== "1") misses.push(`hover: wand opacity on tile hover is ${onHover}, want 1`);
    await page.mouse.move(10, 10);
    await page.waitForTimeout(350);
    const offHover = await opacityOf();
    if (offHover !== "0") misses.push(`hover: wand opacity off-hover is ${offHover}, want 0`);
    await page.screenshot({ path: "/tmp/gui-media-restore-hover.png" });
  }

  // ---- Leg 2: the restore chain ------------------------------------------
  // A minted surface is a new exact-text "Media Flow" node (guide or
  // tab header — the count grows by one per mint, never more).
  const flowTabs = async () => page.getByText("Media Flow", { exact: true }).count();
  const baselineFlowTabs = await flowTabs();
  const net = [];
  const onResp = (r) => {
    const u = r.url();
    if (u.includes("/v1/") || u.includes("/infer-gallery/flow")) {
      net.push(`${r.status()} ${r.request().method()} ${new URL(u).pathname}${new URL(u).search}`);
    }
  };
  page.on("response", onResp);
  await page.locator(TILE).first().locator(WAND_IN).first().click();
  await page.waitForTimeout(4000);
  page.off("response", onResp);
  const sawFlow = net.some((l) => l.includes("GET /infer-gallery/flow?run_id="));
  const sawBenchRead = net.some((l) => /GET \/v1\/bench\//.test(l));
  const sawEnsure = net.some((l) => l.includes("POST /v1/bench/ensure"));
  if (!sawFlow) misses.push(`restore: no flow read fired (net: ${net.join(" | ") || "none"})`);
  if (!sawBenchRead) misses.push("restore: no bench read fired");
  if (!sawEnsure) misses.push("restore: no bench ensure fired");
  const flowCount1 = await flowTabs();
  if (flowCount1 !== baselineFlowTabs + 1) {
    misses.push(`restore: expected ${baselineFlowTabs + 1} "Media Flow" node(s) after the press, saw ${flowCount1}`);
  }
  const feedBanner = await page
    .locator('[data-infer-media-panel="1"]')
    .textContent()
    .catch(() => "");
  if ((feedBanner ?? "").includes("failed to load runs")) {
    misses.push("restore: the feed-error banner faced on a healthy feed");
  }
  await page.screenshot({ path: "/tmp/gui-media-restore-pressed.png" });

  // ---- Leg 3+4: dedupe + grid survival -----------------------------------
  // Back to the archive through the TAB STRIP (the hashed class infix
  // `_stripTabs_` is stable across rebuilds; exact text pins the tab).
  const archiveTab = page
    .locator('[data-sidebar-right-panel] [class*="_stripTabs_"] > div')
    .filter({ hasText: /^Media$/ });
  if ((await archiveTab.count()) > 0) {
    await archiveTab.first().click({ timeout: 30000 });
    await page.locator(WAND).first().waitFor({ timeout: 20000 });
    if ((await page.locator(WAND).count()) === 0) misses.push("survival: the grid lost its wands on return");
  } else {
    misses.push("survival: the archive tab vanished after the press");
  }
  await page.locator(TILE).first().locator(WAND_IN).first().click();
  await page.waitForTimeout(3500);
  const flowCount2 = await flowTabs();
  if (flowCount2 !== Math.max(baselineFlowTabs + 1, flowCount1)) {
    misses.push(`dedupe: press two minted another surface (${flowCount1} → ${flowCount2})`);
  }
  await page.screenshot({ path: "/tmp/gui-media-restore-dedupe.png" });

  if (misses.length > 0) fail(misses.join(" · "));
  console.log(
    `GUI MEDIA RESTORE GATE: PASS — hover-reveal holds, the press fired ` +
      `flow→bench→ensure and landed the Media Flow tab, a second press ` +
      `deduped, and the grid survived the round trip.`,
  );
} catch (err) {
  fail(err?.message?.split("\n")[0] ?? String(err));
} finally {
  await browser.close();
}
