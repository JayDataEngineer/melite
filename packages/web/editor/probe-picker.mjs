import { chromium } from '@playwright/test'
import { homedir } from 'node:os'
import path from 'node:path'
const browser = await chromium.launch({ executablePath: path.join(homedir(), '.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'), args: ['--no-sandbox'], headless: true })
const page = await browser.newPage()
await page.goto('http://127.0.0.1:5173/editor/', { waitUntil: 'domcontentloaded', timeout: 120_000 })
await page.getByRole('button', { name: 'Agent', exact: true }).waitFor({ state: 'visible', timeout: 60_000 })
await page.getByRole('button', { name: /^Library$/ }).first().click()
await page.locator('text=Author a flow').first().waitFor({ state: 'visible', timeout: 60_000 })
await page.getByRole('button', { name: /add your first card|add a card/i }).first().click()
const dialog = page.getByRole('dialog')
await dialog.getByText('What do you want to make?').waitFor({ state: 'visible', timeout: 30_000 })
console.log('DIALOG INNERTEXT:\n' + (await dialog.innerText()).slice(0, 1200))
console.log('\nBUTTONS:', JSON.stringify(await dialog.getByRole('button').allInnerTexts()))
console.log('SELECTS:', await dialog.locator('select').count())
console.log('RADIOS:', await dialog.locator('[role="radio"]').count())
await browser.close()
