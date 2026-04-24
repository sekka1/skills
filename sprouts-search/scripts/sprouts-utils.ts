/**
 * sprouts-utils.ts
 *
 * Shared helpers for Sprouts browser automation scripts.
 * Uses Playwright for better React/Angular event synthesis.
 */

import { Page } from 'playwright-core';
import * as path from 'path';

export const SLEEP_MS = 10_000;
export const SCREENSHOT_DIR = path.join(__dirname);

export interface Rect {
  x: number;
  y: number;
  text: string;
}

export const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

export async function screenshot(page: Page, name: string): Promise<void> {
  const p = path.join(SCREENSHOT_DIR, `sprouts-debug-${name}.png`);
  await page.screenshot({ path: p }).catch(() => {});
  console.log(`  📸 ${name}`);
}

/** Find a button/link/element by text pattern and return its center coords. */
export async function findByText(
  page: Page,
  pattern: RegExp,
  selector = 'button, a, [role="button"], span'
): Promise<Rect | null> {
  return page.evaluate(
    (src: string, sel: string): Rect | null => {
      const re = new RegExp(src, 'i');
      const els = Array.from(document.querySelectorAll<HTMLElement>(sel));
      const el = els.find(e => re.test(e.textContent ?? ''));
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null;
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        text: el.textContent?.replace(/\s+/g, ' ').trim().substring(0, 100) ?? '',
      };
    },
    pattern.source,
    selector
  );
}

/** Find the LAST element matching a text pattern (useful for multi-row modals). */
export async function findLastByText(
  page: Page,
  pattern: RegExp,
  selector = 'button, a, [role="button"], span'
): Promise<Rect | null> {
  return page.evaluate(
    (src: string, sel: string): Rect | null => {
      const re = new RegExp(src, 'i');
      const els = Array.from(document.querySelectorAll<HTMLElement>(sel)).filter(e =>
        re.test(e.textContent ?? '')
      );
      const el = els[els.length - 1] ?? null;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null;
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        text: el.textContent?.replace(/\s+/g, ' ').trim().substring(0, 100) ?? '',
      };
    },
    pattern.source,
    selector
  );
}

/** Click at element center using Playwright's native click (properly handles React events). */
export async function mouseClick(page: Page, rect: Rect): Promise<void> {
  await page.mouse.click(rect.x, rect.y);
}

/** Parse store number from button text like "In-Store · Las Vegas - Centennial (Store #506)" */
export function parseStoreNumber(buttonText: string): string | null {
  // Try to match "Store #XXX" or "Store# XXX" or "#XXX" at the end
  const patterns = [
    /Store\s*#\s*(\d+)/i,           // "Store #506" or "Store# 506"
    /\(#(\d+)\)/,                   // "(#506)"
    /#(\d{3,4})\b/,                 // "#506" (3-4 digits to avoid matching single/double digit numbers)
  ];

  for (const pattern of patterns) {
    const match = buttonText.match(pattern);
    if (match && match[1]) {
      // Verify it's a reasonable store number (3-4 digits)
      const storeNum = match[1];
      if (storeNum.length >= 3 && storeNum.length <= 4) {
        return storeNum;
      }
    }
  }

  return null;
}

/** Parse store name from button text */
export function parseStoreName(buttonText: string): string | null {
  const match = buttonText.match(/In-?Store\s*[·•]\s*(.+?)\s*\(Store #/i);
  return match ? match[1].trim() : null;
}
