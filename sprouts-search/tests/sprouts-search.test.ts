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
import { searchAtStore, writeResults, ProductResult, SearchResult } from '../scripts/sprouts-search';
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
      const result = await searchAtStore(
        '6720 N DURANGO DR, LAS VEGAS, NV',
        '507',
        'redboat'
      );

      // Store should be confirmed
      expect(result.store).toBe('507');
      expect(result.storeName).toContain('Lake Mead');

      // Should find products
      expect(result.products.length).toBeGreaterThan(0);

      // Target items A and B should be present and available
      const names = result.products.map(p => p.name.toLowerCase());

      const hasSpicyCurry = names.some(n => n.includes('spicy') && n.includes('lemongrass'));
      const hasRegularCurry = names.some(n => n.includes('lemongrass') && !n.includes('spicy'));

      expect(hasSpicyCurry).toBe(true);  // Item A
      expect(hasRegularCurry).toBe(true); // Item B

      // Available items should have available=true
      const spicyCurry = result.products.find(p =>
        p.name.toLowerCase().includes('spicy') && p.name.toLowerCase().includes('lemongrass')
      );
      expect(spicyCurry?.available).toBe(true);
    },
    180_000
  );

  it(
    'returns products with name, price/size fields populated',
    async () => {
      const result = await searchAtStore(
        '6720 N DURANGO DR, LAS VEGAS, NV',
        '506',
        'redboat'
      );

      // At least some products should have price data
      const withPrice = result.products.filter(p => p.price !== null);
      expect(withPrice.length).toBeGreaterThan(0);

      // At least some should have size data
      const withSize = result.products.filter(p => p.size !== null);
      expect(withSize.length).toBeGreaterThan(0);

      // All names should be non-empty
      result.products.forEach(p => {
        expect(p.name.length).toBeGreaterThan(2);
      });
    },
    180_000
  );

  it(
    'finds Red Boat 40 N Fish Sauce at Store #449 (Hayward, CA)',
    async () => {
      const result = await searchAtStore(
        '26207 Mission Blvd, Hayward, CA 94544',
        '449',
        'red boat'
      );

      // Store should be confirmed
      expect(result.store).toBe('449');
      expect(result.address).toBe('26207 Mission Blvd, Hayward, CA 94544');

      // Should find products
      expect(result.products.length).toBeGreaterThan(0);

      // Look for Red Boat 40 N Fish Sauce specifically
      const targetProduct = result.products.find(p =>
        p.name.toLowerCase().includes('red boat') &&
        p.name.toLowerCase().includes('40') &&
        p.name.toLowerCase().includes('fish sauce')
      );

      // This test verifies the item is found
      expect(targetProduct).toBeDefined();
      expect(targetProduct?.name).toContain('Red Boat');
      expect(targetProduct?.name).toContain('40');
      expect(targetProduct?.available).toBe(true);
    },
    180_000
  );
});
