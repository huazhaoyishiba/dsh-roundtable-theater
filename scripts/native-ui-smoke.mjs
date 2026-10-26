import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Opens an already running test Harness. This check never starts a model request.
if (!process.env.DSH_TEST_URL) throw new Error('Set DSH_TEST_URL to the test Harness URL (including its one-time token).');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1380, height: 950 }, locale: 'zh-CN' });
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(process.env.DSH_TEST_URL);
  await page.getByRole('button', { name: '圆桌剧场', exact: true }).waitFor();
  const notice = page.getByRole('button', { name: '继续', exact: true });
  if (await notice.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)) await notice.click();
  const configureLater = page.getByRole('button', { name: '稍后配置', exact: true });
  if (await configureLater.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false)) await configureLater.click();
  // 0.2 replaces the API-key onboarding with a dismissible sign-in dialog.
  if (await page.getByRole('heading', { name: '开始使用', exact: true }).isVisible()) {
    await page.getByRole('button', { name: '关闭', exact: true }).click();
  }
  await page.getByRole('button', { name: '圆桌剧场', exact: true }).click();
  await page.getByRole('heading', { name: 'AI 圆桌剧场', exact: true }).waitFor();
  const start = page.getByRole('button', { name: '开始这一场', exact: true });
  await start.waitFor();
  await page.waitForFunction(() => { const button = document.querySelector('.rt-primary'); return button && !button.disabled; });
  await mkdir('.test-results', { recursive: true });
  await page.screenshot({ path: '.test-results/native-theater.png', fullPage: true });
  assert.equal(await page.locator('.rt-alert:visible').count(), 0, `native RPC state: ${await page.locator('.rt-alert').innerText()}`);
  assert.equal(await page.locator('.rt-seat').count(), 3);
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('Native Harness sidebar, global panel, browser bundle and RPC state: PASS (no model request).');
} finally { await browser.close(); }
