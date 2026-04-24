/**
 * sprouts-search.ts
 *
 * Full end-to-end Sprouts item search:
 *   1. Set the in-store location to a target store (via sprouts-set-store)
 *   2. Search for items using the site search bar
 *   3. Record availability results
 *   4. Write results to JSON
 *
 * Usage:
 *   npx ts-node scripts/sprouts-search.ts [address] [storeNumber] [searchTerm]
 *
 * Example:
 *   npx ts-node scripts/sprouts-search.ts "6720 N DURANGO DR, LAS VEGAS, NV" "506" "redboat"
 *
 * Requirements:
 *   Chrome running with: chrome.exe --remote-debugging-port=9222
 *
 * Key lessons:
 *   - Use nativeInputValueSetter to trigger React's synthetic onChange on the search input
 *   - Use form.dispatchEvent(submit) to navigate — Enter key is blocked by autocomplete dropdown
 *   - Product cards are div[role="group"] containing a[role="button"] with img[alt] = product name
 *   - Availability: aria-disabled="true" on the card link = unavailable
 */

import { chromium, Browser, Page } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';
import { sleep, screenshot } from './sprouts-utils';
import { setStore } from './sprouts-set-store';

const SEARCH_SLEEP_MS = 15_000;

export interface ProductResult {
  name: string;
  price: string | null;
  size: string | null;
  available: boolean;
}

export interface SearchResult {
  store: string | null;
  storeName: string | null;
  address: string;
  searchTerm: string;
  products: ProductResult[];
  timestamp: string;
}

/**
 * Search for items at a Sprouts store.
 * Assumes the store is already set (or call setStore first).
 * Page should be on shop.sprouts.com.
 */
export async function searchItems(page: Page, searchTerm: string): Promise<ProductResult[]> {
  console.log(`\nStep 9: Searching for "${searchTerm}" ...`);

  // Wait for search input
  await page.waitForFunction(
    () => document.querySelector<HTMLInputElement>('#search-bar-input') !== null,
    { timeout: 15_000 }
  );

  // React synthetic event trigger: nativeInputValueSetter forces React to recognize the value.
  // page.keyboard.type() does NOT update React state — the search query stays empty.
  await page.evaluate((term: string) => {
    const input = document.querySelector<HTMLInputElement>('#search-bar-input');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (setter) {
      setter.call(input, term);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, searchTerm);

  await sleep(2000);
  console.log(`  ✅ Set "${searchTerm}" via React input setter`);

  // Submit form — navigates to /store/sprouts/s?k=<term>
  // Do NOT use Enter key — autocomplete dropdown intercepts it.
  await page.evaluate(() => {
    const form = document.querySelector<HTMLFormElement>('form[role="search"]');
    if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });

  console.log(`  ⏳ Waiting ${SEARCH_SLEEP_MS / 1000}s for search results to load...`);
  await sleep(SEARCH_SLEEP_MS);
  await screenshot(page, 'step9-search-results');

  const currentUrl = page.url();
  console.log(`  URL: ${currentUrl}`);
  if (!currentUrl.includes('/s?')) {
    console.warn('  ⚠️  URL does not look like a search results page');
  }

  // Step 10: Scrape product cards
  // Structure: div[role="group"] > a[role="button"] > img[alt=product name]
  // Available: aria-disabled != "true" and no "not available" text
  console.log('Step 10: Scraping product results ...');
  const products: ProductResult[] = await page.evaluate((): ProductResult[] => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('div[role="group"]'));

    return cards.map(card => {
      const link = card.querySelector<HTMLAnchorElement>('a[role="button"], a[href*="products"]');
      const img = card.querySelector<HTMLImageElement>('img[data-testid="item-card-image"], img[alt]');
      const name = img?.getAttribute('alt')?.trim() ?? 'Unknown';
      if (!name || name === 'Unknown' || name.length < 2) return null;

      // Price: find a leaf element whose text starts with "$"
      const allLeafEls = Array.from(card.querySelectorAll<HTMLElement>('span, p, div'))
        .filter(el => el.children.length === 0 && el.textContent);
      const priceEl = allLeafEls.find(el => /^\$\d/.test(el.textContent?.trim() ?? ''));
      const price = priceEl?.textContent?.trim() ?? null;

      // Size: leaf element with units
      const sizeEl = allLeafEls.find(el =>
        /\d+(\.\d+)?\s*(oz|fl oz|lb|lbs|g|ml|ct|pk|count|pack)/i.test(el.textContent ?? '')
      );
      const size = sizeEl?.textContent?.trim() ?? null;

      const isDisabled = link?.getAttribute('aria-disabled') === 'true';
      const unavailableText = /not available|out of stock|unavailable/i.test(card.textContent ?? '');
      const available = !isDisabled && !unavailableText;

      return { name, price, size, available };
    }).filter((p): p is ProductResult => p !== null);
  });

  console.log(`  Found ${products.length} product(s)`);
  products.forEach(p => {
    const status = p.available ? '✅' : '❌';
    console.log(`  ${status} ${p.name}${p.price ? ` — ${p.price}` : ''}${p.size ? ` (${p.size})` : ''}`);
  });

  return products;
}

/**
 * Full workflow: set store + search for items.
 */
export async function searchAtStore(
  address: string,
  storeNum: string | null,
  searchTerm: string
): Promise<SearchResult> {
  let browser: Browser | undefined;

  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
    const context = contexts[0] || await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page: Page = context.pages()[0] || await context.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });

    const storeResult = await setStore(address, storeNum, page);
    const products = await searchItems(page, searchTerm);

    return {
      store: storeResult.storeNum,
      storeName: storeResult.storeName,
      address,
      searchTerm,
      products,
      timestamp: new Date().toISOString(),
    };

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('   Browser closed.');
    }
  }
}

/**
 * Write results to JSON file.
 */
export function writeResults(result: SearchResult, outputDir: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const filename = `${result.store ?? 'unknown'}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
  console.log(`\n📄 Results written to: ${filepath}`);
  return filepath;
}

// ── Target items: explicitly checked in summary ──────────────────────────────
// Each entry: { label, match: (name) => boolean }
const TARGET_ITEMS = [
  { label: 'A: Red Boat Lemongrass Vietnamese Curry',       match: (n: string) => /lemongrass/i.test(n) && !/spicy/i.test(n) && /red boat/i.test(n) },
  { label: 'B: Red Boat Spicy Lemongrass Vietnamese Curry', match: (n: string) => /spicy/i.test(n) && /lemongrass/i.test(n) && /red boat/i.test(n) },
  { label: 'C: Red Boat Sweet & Savory Simmer Sauce',       match: (n: string) => /sweet/i.test(n) && /savory/i.test(n) && /red boat/i.test(n) },
];

// ── CLI entry point ──────────────────────────────────────────────────────────
if (require.main === module) {
  const address = process.argv[2] ?? '6720 N DURANGO DR, LAS VEGAS, NV';
  const storeNum = process.argv[3] ?? '506';
  const searchTerm = process.argv[4] ?? 'redboat';
  const outputDir = process.argv[5] ?? path.join(__dirname, '..', '..', 'sprouts-results');

  console.log(`\n🛒 Sprouts Item Search`);
  console.log(`   Address:    ${address}`);
  console.log(`   Store #:    ${storeNum}`);
  console.log(`   Search:     ${searchTerm}`);
  console.log(`   Output dir: ${outputDir}\n`);

  searchAtStore(address, storeNum, searchTerm)
    .then(result => {
      writeResults(result, outputDir);

      console.log('\n📋 Summary:');
      console.log(`   Store: #${result.store ?? '?'} — ${result.storeName ?? '?'}`);
      console.log(`   Total products scraped: ${result.products.length}`);

      console.log('\n🎯 Target items:');
      for (const target of TARGET_ITEMS) {
        const hit = result.products.find(p => target.match(p.name));
        if (hit) {
          console.log(`   ✅ FOUND    — ${target.label}`);
          console.log(`               → "${hit.name}"${hit.price ? ` ${hit.price}` : ''}${hit.size ? ` (${hit.size})` : ''}`);
        } else {
          console.log(`   ❌ NOT FOUND — ${target.label}`);
        }
      }
    })
    .catch(() => process.exit(1));
}
