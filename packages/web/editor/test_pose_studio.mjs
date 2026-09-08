import pw from './node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core/index.js';
const { chromium } = pw;

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/chromium-browser',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.goto('http://localhost:30080/editor/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

try {
  const poseBtn = page.getByRole('navigation').getByRole('button', { name: 'Pose Studio' });
  await poseBtn.click();
  await page.waitForTimeout(1000);
  console.log('Opened Pose Studio');
} catch (e) {
  console.log('Pose Studio button click failed:', e.message.slice(0,100));
}

try {
  const t2pTab = page.getByRole('tab', { name: 'Text to Pose' });
  if (await t2pTab.count() > 0) {
    await t2pTab.click();
    await page.waitForTimeout(2000);
    console.log('Clicked Text to Pose tab');
  }
} catch (e) {
  console.log('T2P tab click failed:', e.message.slice(0,100));
}

await page.screenshot({ path: '/tmp/pose_studio_bind.png' });
console.log('Screenshot saved: bind pose');

const canvases = await page.locator('canvas').count();
console.log(`Canvas count: ${canvases}`);
const timelineCommands = await page.getByText('Timeline Commands').count();
console.log(`Timeline Commands: ${timelineCommands > 0}`);
const generateBtn = await page.getByRole('button', { name: /Generate/ }).count();
console.log(`Generate button: ${generateBtn > 0}`);
const lightingSection = await page.getByText('Lighting').count();
console.log(`Lighting section: ${lightingSection > 0}`);
const cocoBranding = await page.getByText(/COCO/i).count();
console.log(`COCO branding: ${cocoBranding} (should be 0)`);
const somaBranding = await page.getByText(/SOMA-77/i).count();
console.log(`SOMA-77 branding: ${somaBranding > 0}`);

console.log(`\nConsole errors: ${errors.length}`);
for (const e of errors.slice(0, 5)) console.log(`  ${e.slice(0, 200)}`);

await browser.close();
console.log('Done.');
