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

// ── Unit tests (no browser required) ────────────────────────────────────────

describe('parseStoreNumber', () => {
  it('extracts store number from full button text', () => {
    expect(parseStoreNumber('In-Store · Las Vegas - Centennial (Store #506)')).toBe('506');
  });

  it('extracts store number from variant format', () => {
    expect(parseStoreNumber('In-Store · Cudahy (Store #467)')).toBe('467');
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
    'sets store #506 (Las Vegas - Centennial) given Durango Dr address',
    async () => {
      const result = await setStore('6720 N DURANGO DR, LAS VEGAS, NV', '506');

      expect(result.storeNum).toBe('506');
      expect(result.storeName).toContain('Centennial');
      expect(result.buttonText).toContain('#506');
    },
    120_000 // long timeout: browser automation
  );

  it(
    'sets store #558 given Decatur Blvd address',
    async () => {
      const result = await setStore('6150 N DECATUR BLVD, LAS VEGAS, NV', '558');

      expect(result.storeNum).toBe('558');
      expect(result.buttonText).toContain('#558');
    },
    120_000
  );
});
