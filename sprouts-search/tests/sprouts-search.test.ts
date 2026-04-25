/**
 * sprouts-search.test.ts
 *
 * Unit + integration tests for sprouts-search.ts
 *
 * Unit tests: no browser needed
 * Integration tests: require Chrome with --remote-debugging-port=9222
 *
 * Run: npx vitest run scripts/sprouts-search.test.ts
 */

import { describe, it, expect } from 'vitest';
import { writeResults, ProductResult, SearchResult } from '../scripts/sprouts-search';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Unit tests ───────────────────────────────────────────────────────────────

describe('writeResults', () => {
  it('writes a JSON file to the output directory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sprouts-test-'));
    const result: SearchResult = {
      store: '507',
      storeName: 'Las Vegas - Lake Mead Blvd',
      address: '6720 N DURANGO DR, LAS VEGAS, NV',
      searchTerm: 'redboat',
      products: [
        { name: 'Red Boat Fish Sauce', price: '$9.49', size: '8.45 fl oz', available: true },
      ],
      timestamp: '2026-04-16T00:00:00.000Z',
    };

    const filepath = writeResults(result, tmpDir);

    expect(fs.existsSync(filepath)).toBe(true);
    const written = JSON.parse(fs.readFileSync(filepath, 'utf8')) as SearchResult;
    expect(written.store).toBe('507');
    expect(written.products).toHaveLength(1);
    expect(written.products[0].name).toBe('Red Boat Fish Sauce');

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('uses store number as filename', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sprouts-test-'));
    const result: SearchResult = {
      store: '999',
      storeName: 'Test Store',
      address: '123 Test St',
      searchTerm: 'test',
      products: [],
      timestamp: new Date().toISOString(),
    };

    const filepath = writeResults(result, tmpDir);
    expect(path.basename(filepath)).toBe('999.json');

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('uses "unknown.json" when store is null', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sprouts-test-'));
    const result: SearchResult = {
      store: null,
      storeName: null,
      address: '',
      searchTerm: '',
      products: [],
      timestamp: new Date().toISOString(),
    };

    const filepath = writeResults(result, tmpDir);
    expect(path.basename(filepath)).toBe('unknown.json');

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('creates the output directory if it does not exist', () => {
    const tmpDir = path.join(os.tmpdir(), `sprouts-test-${Date.now()}-new`);
    expect(fs.existsSync(tmpDir)).toBe(false);

    const result: SearchResult = {
      store: '1',
      storeName: null,
      address: '',
      searchTerm: '',
      products: [],
      timestamp: new Date().toISOString(),
    };

    writeResults(result, tmpDir);
    expect(fs.existsSync(tmpDir)).toBe(true);

    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('ProductResult shape', () => {
  it('has expected fields', () => {
    const p: ProductResult = {
      name: 'Red Boat Spicy Lemongrass Vietnamese Curry',
      price: '$6.99',
      size: '12 oz',
      available: true,
    };
    expect(p.name).toBeTruthy();
    expect(p.available).toBe(true);
  });
});

// ── Integration tests (require Chrome + CDP on port 9222) ────────────────────

describe('searchAtStore integration', () => {
  it(
    'finds Red Boat items at Store #507 (Las Vegas - Lake Mead Blvd)',
    async () => {
      // Load cookie jar for store #507 (bypasses modal and pre-selects store)
      const cookiesPath = path.join(__dirname, 'fixtures', 'cookies-507.json');
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));

      const { chromium } = await import('playwright-core');
      const browser = await chromium.connectOverCDP('http://localhost:9222');
      const contexts = browser.contexts();
      const context = contexts[0] || await browser.newContext({ viewport: { width: 1280, height: 900 } });

      // Clear existing cookies and load store-specific cookies
      await context.clearCookies();
      await context.addCookies(cookies);

      const page = context.pages()[0] || await context.newPage();
      await page.setViewportSize({ width: 1280, height: 900 });

      try {
        // Navigate with cookies already set - store #507 should be active
        await page.goto('https://shop.sprouts.com', { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForTimeout(3000);

        // Search for items using the searchItems function
        const { searchItems } = await import('../scripts/sprouts-search');
        const products = await searchItems(page, 'redboat');

        // Should find products
        expect(products.length).toBeGreaterThan(0);

        // Target items A and B should be present and available
        const names = products.map(p => p.name.toLowerCase());

        const hasSpicyCurry = names.some(n => n.includes('spicy') && n.includes('lemongrass'));
        const hasRegularCurry = names.some(n => n.includes('lemongrass') && !n.includes('spicy'));

        expect(hasSpicyCurry).toBe(true);  // Item A
        expect(hasRegularCurry).toBe(true); // Item B

        // Available items should have available=true
        const spicyCurry = products.find(p =>
          p.name.toLowerCase().includes('spicy') && p.name.toLowerCase().includes('lemongrass')
        );
        expect(spicyCurry?.available).toBe(true);
      } finally {
        await browser.close();
      }
    },
    180_000
  );

  it(
    'returns products with name, price/size fields populated',
    async () => {
      // Load cookie jar for store #507
      const cookiesPath = path.join(__dirname, 'fixtures', 'cookies-507.json');
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));

      const { chromium } = await import('playwright-core');
      const browser = await chromium.connectOverCDP('http://localhost:9222');
      const contexts = browser.contexts();
      const context = contexts[0] || await browser.newContext({ viewport: { width: 1280, height: 900 } });

      // Clear existing cookies and load store-specific cookies
      await context.clearCookies();
      await context.addCookies(cookies);

      const page = context.pages()[0] || await context.newPage();
      await page.setViewportSize({ width: 1280, height: 900 });

      try {
        // Navigate with cookies already set
        await page.goto('https://shop.sprouts.com', { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForTimeout(3000);

        // Search for items
        const { searchItems } = await import('../scripts/sprouts-search');
        const products = await searchItems(page, 'redboat');

        // At least some products should have price data
        const withPrice = products.filter(p => p.price !== null);
        expect(withPrice.length).toBeGreaterThan(0);

        // At least some should have size data
        const withSize = products.filter(p => p.size !== null);
        expect(withSize.length).toBeGreaterThan(0);

        // All names should be non-empty
        products.forEach(p => {
          expect(p.name.length).toBeGreaterThan(2);
        });
      } finally {
        await browser.close();
      }
    },
    180_000
  );

  it(
    'finds Red Boat 40 N Fish Sauce at Store #449 (Hayward, CA)',
    async () => {
      // Load cookie jar for store #449
      const cookiesPath = path.join(__dirname, 'fixtures', 'cookies-449.json');
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));

      const { chromium } = await import('playwright-core');
      const browser = await chromium.connectOverCDP('http://localhost:9222');
      const contexts = browser.contexts();
      const context = contexts[0] || await browser.newContext({ viewport: { width: 1280, height: 900 } });

      // Clear existing cookies and load store-specific cookies
      await context.clearCookies();
      await context.addCookies(cookies);

      const page = context.pages()[0] || await context.newPage();
      await page.setViewportSize({ width: 1280, height: 900 });

      try {
        // Navigate with cookies already set - store #449 should be active
        await page.goto('https://shop.sprouts.com', { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForTimeout(3000);

        // Search for items
        const { searchItems } = await import('../scripts/sprouts-search');
        const products = await searchItems(page, 'red boat');

        // Should find products
        expect(products.length).toBeGreaterThan(0);

        // Look for Red Boat 40 N Fish Sauce specifically
        const targetProduct = products.find(p =>
          p.name.toLowerCase().includes('red boat') &&
          p.name.toLowerCase().includes('40') &&
          p.name.toLowerCase().includes('fish sauce')
        );

        // This test verifies the item is found
        expect(targetProduct).toBeDefined();
        expect(targetProduct?.name).toContain('Red Boat');
        expect(targetProduct?.name).toContain('40');
        expect(targetProduct?.available).toBe(true);
      } finally {
        await browser.close();
      }
    },
    180_000
  );
});