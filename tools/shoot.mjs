#!/usr/bin/env node
// Headless screenshots of the game's pages, for checking changes without
// a person at a browser. Starts the Vite dev server itself, opens each
// page in headless Chromium (software WebGL), waits for it to say it's
// done, and saves a full-page screenshot; the page's console goes to
// stdout.
//
//   npm run shoot -- [options] <page> [<page> ...]
//
// <page> is a path under the site root with its query, e.g.
//   'gametest.html?scenario=blonde&catch=1'   (scripted game scenarios)
//   'kongtest.html?sheet=walk&views=side,front' (animation contact sheets)
//   'kongtest.html?model=blonde&sheet=fall'
//
// Options:
//   --out <dir>      where the screenshots go (default: shots/, ignored by git)
//   --timeout <ms>   give up waiting after this long (default 600000)
//   --wait <ms>      for pages that never say they're done: just wait
//   --size <WxH>     viewport (default 1300x900)
//   --click <text>   click the link with this text first (e.g. a menu
//                    entry: 'The Story'), as a player would
//   --every <ms>     with --wait: also a screenshot every <ms> (name_<ms>.png),
//                    e.g. to see the story's opening play out
//   --tap            with --every: tap the middle of the page before each
//                    (to move through the story as a player would)
//
// A page is done when window.harness.done (gametest.html) or
// window.sheetDone (kongtest.html's sheets) is true. Exits non-zero if a
// page throws, times out, or gametest reports a failed check.
//
// Chromium: playwright-core's own build of chrome-headless-shell, in
// ~/.cache/ms-playwright (install it with
// `npx playwright-core install chromium-headless-shell` if it's missing),
// or set CHROME to a browser binary.

import { mkdirSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = { out: 'shots', timeout: 600000, wait: 0, size: '1300x900' };
const pages = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--tap') opt.tap = true;
  else if (a.startsWith('--')) opt[a.slice(2)] = args[++i];
  else pages.push(a);
}
if (!pages.length) {
  console.error('usage: npm run shoot -- [--out dir] [--timeout ms] [--wait ms] [--size WxH] <page> ...');
  process.exit(2);
}
mkdirSync(opt.out, { recursive: true });
const [width, height] = opt.size.split('x').map(Number);

const server = await createServer({ server: { port: 5190, strictPort: false }, logLevel: 'warn' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  executablePath: process.env.CHROME || undefined,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

let failed = false;
for (const path of pages) {
  const page = await browser.newPage({ viewport: { width, height } });
  const name = path.replace(/\.html\??/, '_').replace(/[^\w.,=-]+/g, '_').replace(/_+$/, '').slice(0, 120) || 'page';
  console.log(`=== ${path}`);
  page.on('console', (m) => {
    const t = m.text();
    if (!/^\[vite\]|trying to load|^Settings\(/.test(t)) console.log(`  ${t}`);
  });
  page.on('pageerror', (e) => { failed = true; console.log(`  PAGE ERROR ${e.stack ?? e.message}`); });
  const t0 = Date.now();
  await page.goto(base + path);
  if (opt.click) await page.getByText(opt.click, { exact: true }).first().click();
  if (opt.wait && opt.every) {
    for (let at = Number(opt.every); at <= Number(opt.wait); at += Number(opt.every)) {
      await page.waitForTimeout(Number(opt.every));
      if (opt.tap) await page.mouse.click(width / 2, height / 2);
      await page.waitForTimeout(opt.tap ? 300 : 0);
      await page.screenshot({ path: `${opt.out}/${name}_${at}.png` });
    }
  } else if (opt.wait) await page.waitForTimeout(Number(opt.wait));
  else {
    await page.waitForFunction(() => window.harness?.done || window.sheetDone, null, { timeout: Number(opt.timeout), polling: 250 })
      .catch(() => { failed = true; console.log('  TIMED OUT'); });
  }
  const ok = await page.evaluate(() => window.harness ? window.harness.ok : true);
  if (!ok) failed = true;
  const file = `${opt.out}/${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  -> ${file} (${((Date.now() - t0) / 1000).toFixed(1)}s${ok ? '' : ', FAILED'})`);
  await page.close();
}
await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
