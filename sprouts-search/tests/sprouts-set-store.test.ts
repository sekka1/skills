/**
 * sprouts-set-store.test.ts
 *
 * Integration tests for the Sprouts store selector.
 * Requires Chrome running with: chrome.exe --remote-debugging-port=9222
 *
 * Run: npx vitest run scripts/sprouts-set-store.test.ts
 */

import { describe, it, expect } from 'vitest';
import { setStore, parseStoreNumber, parseStoreName } from '../scripts/sprouts-set-store';
import * as fs from 'fs';
import * as path from 'path';

// ── Unit tests (no browser required) ────────────────────────────────────────

describe('parseStoreNumber', () => {
  it('extracts store number from full button text', () => {
    expect(parseStoreNumber('In-Store · Las Vegas - Centennial (Store #506)')).toBe('506');
  });

  it('extracts store number from variant format', () => {
    expect(parseStoreNumber('In-Store · Cudahy (Store #467)')).toBe('467');
  });

  it('extracts store number from parentheses format', () => {
    expect(parseStoreNumber('In-Store · Location (#449)')).toBe('449');
  });

  it('extracts store number from standalone hash format', () => {
    expect(parseStoreNumber('Store location #558')).toBe('558');
  });

  it('ignores single or double digit numbers', () => {
    // Should not match single digit "2" in button text
    expect(parseStoreNumber('In-Store 2 items')).toBeNull();
    expect(parseStoreNumber('Select option #2')).toBeNull();
  });

  it('returns null when no store number present', () => {
    expect(parseStoreNumber('Change store')).toBeNull();
    expect(parseStoreNumber('')).toBeNull();
  });
});

describe('parseStoreName', () => {
  it('extracts store name from full button text', () => {
    expect(parseStoreName('In-Store · Las Vegas - Centennial (Store #506)')).toBe('Las Vegas - Centennial');
  });

  it('returns null when format does not match', () => {
    expect(parseStoreName('Change store')).toBeNull();
  });
});

// ── Integration tests (requires Chrome + CDP on port 9222) ──────────────────

describe('setStore integration', () => {
  it(
    'sets store #507 (Las Vegas - Lake Mead Blvd) given Durango Dr address',
    async () => {
      // Load cookie jar to bypass the onboarding modal (use any store's cookies)
      const cookiesPath = path.join(__dirname, 'fixtures', 'cookies-507.json');
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));

      const { chromium } = await import('playwright-core');
      const browser = await chromium.connectOverCDP('http://localhost:9222');
      const contexts = browser.contexts();
      const context = contexts[0] || await browser.newContext({ viewport: { width: 1280, height: 900 } });

      // Clear existing cookies and load to bypass modal
      await context.clearCookies();
      await context.addCookies(cookies);

      const page = context.pages()[0] || await context.newPage();
      await page.setViewportSize({ width: 1280, height: 900 });

      try {
        // Test store switching
        const result = await setStore('6720 N DURANGO DR, LAS VEGAS, NV', '507', page);

        expect(result.storeNum).toBe('507');
        expect(result.storeName).toContain('Lake Mead');
        expect(result.buttonText).toContain('#507');
      } finally {
        await browser.close();
      }
    },
    120_000 // long timeout: browser automation
  );

  it(
    'sets store #558 given Decatur Blvd address',
    async () => {
      // Load cookie jar to bypass the onboarding modal
      const cookiesPath = path.join(__dirname, 'fixtures', 'cookies-507.json');
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));

      const { chromium } = await import('playwright-core');
      const browser = await chromium.connectOverCDP('http://localhost:9222');
      const contexts = browser.contexts();
      const context = contexts[0] || await browser.newContext({ viewport: { width: 1280, height: 900 } });

      // Clear existing cookies and load to bypass modal
      await context.clearCookies();
      await context.addCookies(cookies);

      const page = context.pages()[0] || await context.newPage();
      await page.setViewportSize({ width: 1280, height: 900 });

      try {
        // Test store switching
        const result = await setStore('6150 N DECATUR BLVD, LAS VEGAS, NV', '558', page);

        expect(result.storeNum).toBe('558');
        expect(result.buttonText).toContain('#558');
      } finally {
        await browser.close();
      }
    },
    120_000
  );
});