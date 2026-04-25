/**
 * export-store-cookies.ts
 *
 * Sets each target store and exports a cookie jar for use in integration tests.
 * Run: npx ts-node export-store-cookies.ts
 */

import { chromium } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';
import { setStore } from './sprouts-set-store';

const STORES = [
  { num: '507', address: '7530 W LAKE MEAD BLVD, LAS VEGAS, NV' },
  { num: '558', address: '6150 N DECATUR BLVD, LAS VEGAS, NV' },
  { num: '449', address: '26207 MISSION BLVD, HAYWARD, CA 94544' },
];

const FIXTURES_DIR = path.join(__dirname, '..', 'tests', 'fixtures');

(async () => {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  for (const store of STORES) {
    console.log(`\n=== Setting store #${store.num} ===`);
    await setStore(store.address, store.num);

    // Connect fresh to grab cookies after store is set
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
    const context = contexts[0];

    // Get all cookies using Playwright's context API
    const cookies = await context.cookies();
    const sproutsCookies = cookies.filter(c => c.domain.includes('sprouts.com'));

    const outPath = path.join(FIXTURES_DIR, `cookies-${store.num}.json`);
    fs.writeFileSync(outPath, JSON.stringify(sproutsCookies, null, 2));
    console.log(`✅ Saved ${sproutsCookies.length} cookies → ${outPath}`);

    await browser.close();
  }

  console.log('\n✅ All done. Cookie jars exported to tests/fixtures/');
})().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
