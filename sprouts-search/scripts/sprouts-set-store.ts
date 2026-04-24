/**
 * sprouts-set-store.ts
 *
 * playwright-core + CDP: Connect to existing Chrome and set a Sprouts in-store location.
 *
 * Usage:
 *   npx ts-node scripts/sprouts-set-store.ts [address] [storeNumber]
 *
 * Example:
 *   npx ts-node scripts/sprouts-set-store.ts "6720 N DURANGO DR, LAS VEGAS, NV" "506"
 *
 * Requirements:
 *   Chrome running with: chrome.exe --remote-debugging-port=9222
 */

import { chromium, Browser, Page } from 'playwright-core';
import { sleep, screenshot, findByText, findLastByText, mouseClick, parseStoreNumber, parseStoreName, SLEEP_MS } from './sprouts-utils';

export interface StoreResult {
  storeNum: string | null;
  storeName: string | null;
  buttonText: string;
}

export { parseStoreNumber, parseStoreName };

/**
 * Set the active Sprouts in-store location via CDP to an existing Chrome instance.
 * @param address  Street address to find stores near
 * @param storeNum Optional store number to select (picks first result if omitted)
 * @returns StoreResult with the confirmed store info
 */
export async function setStore(
  address: string,
  storeNum: string | null = null,
  page?: Page
): Promise<StoreResult> {
  let browser: Browser | undefined;
  let ownedPage = false;

  try {
    if (!page) {
      browser = await chromium.connectOverCDP('http://localhost:9222');
      const contexts = browser.contexts();
      const context = contexts[0] || await browser.newContext({ viewport: { width: 1280, height: 900 } });
      page = context.pages()[0] || await context.newPage();
      await page.setViewportSize({ width: 1280, height: 900 });
      ownedPage = true;
    }

    // ── Step 1: Navigate ───────────────────────────────────────────────────
    console.log('Step 1: Navigating to shop.sprouts.com ...');
    await page.goto('https://shop.sprouts.com', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await sleep(SLEEP_MS);
    console.log('  ✅', page.url());

    // ── Step 0: Handle "How would you like to shop?" onboarding modal ──────
    console.log('Step 0: Checking for onboarding modal...');
    const modalHandled = await page.evaluate(() => {
      // Look for the onboarding modal
      const modalText = document.body.textContent || '';
      if (modalText.includes('How would you like to shop?')) {
        // Find and click the "In-Store" option in the modal
        const allElements = Array.from(document.querySelectorAll<HTMLElement>('*'));
        const inStoreOption = allElements.find(el => {
          const text = el.textContent?.trim() || '';
          return text.includes('In-Store') && el.tagName !== 'BUTTON';
        });

        if (inStoreOption) {
          inStoreOption.click();

          // Then click the Confirm button
          const buttons = Array.from(document.querySelectorAll<HTMLElement>('button'));
          const confirmBtn = buttons.find(b => /confirm/i.test(b.textContent ?? ''));
          if (confirmBtn) {
            confirmBtn.click();
            return { found: true, confirmed: true };
          }
          return { found: true, confirmed: false };
        }
      }
      return { found: false, confirmed: false };
    });

    if (modalHandled.found) {
      await sleep(2000); // Wait for modal to close
      console.log(`  ✅ Onboarding modal handled (confirmed: ${modalHandled.confirmed})`);
    } else {
      console.log('  ℹ️  No onboarding modal found');
    }

    // ── Step 1a: Handle cookie consent if present ──────────────────────────
    console.log('Step 1a: Checking for cookie consent popup...');
    const cookieButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll<HTMLElement>('button'));
      const acceptBtn = buttons.find(b => /accept cookies/i.test(b.textContent ?? ''));
      if (acceptBtn) {
        acceptBtn.click();
        return true;
      }
      return false;
    });
    if (cookieButton) {
      await sleep(1000);
      console.log('  ✅ Accepted cookies');
    } else {
      console.log('  ℹ️  No cookie popup found');
    }

    // ── Step 2: Click store mode button ────────────────────────────────────
    console.log('Step 2: Clicking store mode button ...');
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('button')).some(b => /in-?store/i.test(b.textContent ?? '')),
      { timeout: 20_000 }
    );

    const rect2 = await page.evaluate((): { x: number; y: number; text: string } | null => {
      const btn = Array.from(document.querySelectorAll<HTMLElement>('button')).find(b =>
        /in-?store/i.test(b.textContent ?? '')
      );
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null;
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: btn.textContent?.replace(/\s+/g, ' ').trim().substring(0, 80) ?? '' };
    });
    if (!rect2) throw new Error('Store mode button not found');
    console.log(`  Clicking: "${rect2.text}"`);
    await page.mouse.click(rect2.x, rect2.y);
    await sleep(SLEEP_MS);
    await screenshot(page, 'step2-dropdown');
    console.log('  ✅ Dropdown opened');

    // ── Step 3: Click "Change store" in the In-Store row ───────────────────
    console.log('Step 3: Clicking "Change store" (In-Store row) ...');
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('a, button, span')).some(
          el => el.textContent?.trim() === 'Change store'
        ),
      { timeout: 15_000 }
    );

    const rect3 = await findLastByText(page, /^change store$/i, 'a, button, span');
    if (!rect3) throw new Error('"Change store" not found');
    console.log(`  Clicking at (${Math.round(rect3.x)}, ${Math.round(rect3.y)})`);
    await mouseClick(page, rect3);
    await sleep(SLEEP_MS);
    await screenshot(page, 'step3-location-modal');
    console.log('  ✅ Location modal open');

    // ── Step 4: Click "Near ..." button ────────────────────────────────────
    console.log('Step 4: Clicking "Near ..." button ...');
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('button')).some(b => /near/i.test(b.textContent ?? '')),
      { timeout: 15_000 }
    );

    const rect4 = await findByText(page, /near/i, 'button');
    if (!rect4) throw new Error('"Near" button not found');
    console.log(`  Clicking: "${rect4.text}"`);
    await mouseClick(page, rect4);
    await sleep(SLEEP_MS);
    await screenshot(page, 'step4-address-input');
    console.log('  ✅ Address input opened');

    // ── Step 5: Type address ───────────────────────────────────────────────
    console.log(`Step 5: Typing address "${address}" ...`);
    await page.waitForSelector('input', { timeout: 10_000 });

    const rect5 = await page.evaluate((): { x: number; y: number; text: string } | null => {
      const input = document.querySelector<HTMLInputElement>(
        'input[type="text"], input[type="search"], input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"])'
      );
      if (!input) return null;
      const r = input.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: '' };
    });
    if (rect5) await page.mouse.click(rect5.x, rect5.y);
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(address, { delay: 60 });
    await sleep(SLEEP_MS);
    await screenshot(page, 'step5-typed');
    console.log('  ✅ Address typed');

    // ── Step 6: Select autocomplete suggestion ─────────────────────────────
    console.log('Step 6: Selecting autocomplete suggestion ...');
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[role="option"]').length > 0 ||
        document.querySelectorAll('[role="listbox"] li').length > 0,
      { timeout: 10_000 }
    );

    const rect6 = await page.evaluate((): { x: number; y: number; text: string } | null => {
      const opt =
        document.querySelector<HTMLElement>('[role="option"]') ??
        document.querySelector<HTMLElement>('[role="listbox"] li');
      if (!opt) return null;
      const r = opt.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: opt.textContent?.replace(/\s+/g, ' ').trim().substring(0, 80) ?? '' };
    });
    if (!rect6) throw new Error('No autocomplete suggestion found');
    console.log(`  Clicking: "${rect6.text}"`);
    await page.mouse.click(rect6.x, rect6.y);
    await sleep(SLEEP_MS);
    await screenshot(page, 'step6-suggestion');
    console.log('  ✅ Suggestion selected');

    // ── Step 7: Click "Save Address" ───────────────────────────────────────
    console.log('Step 7: Clicking "Save Address" ...');
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('button')).some(b => /save address/i.test(b.textContent ?? '')),
      { timeout: 10_000 }
    );

    const rect7 = await findByText(page, /save address/i, 'button');
    if (!rect7) throw new Error('"Save Address" not found');
    console.log(`  Clicking: "${rect7.text}"`);
    await mouseClick(page, rect7);
    await sleep(SLEEP_MS);
    await screenshot(page, 'step7-store-list');
    console.log('  ✅ Address saved');

    // ── Step 8: Click "Set as my store" ────────────────────────────────────
    console.log(`Step 8: Setting store ${storeNum ? '#' + storeNum : '(first)'}...`);
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('button')).some(b => /set as my store/i.test(b.textContent ?? '')),
      { timeout: 15_000 }
    );

    const stores: string[] = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('button'))
        .filter(b => /set as my store/i.test(b.textContent ?? ''))
        .map(btn => {
          let el: HTMLElement | null = btn;
          for (let i = 0; i < 8; i++) {
            el = el?.parentElement ?? null;
            if (!el) break;
            const t = el.textContent?.replace(/\s+/g, ' ').trim();
            if (t && t.length > 15 && t.length < 200) return t.substring(0, 100);
          }
          return '?';
        })
    );
    console.log('  Stores available:', stores.slice(0, 5));

    const rect8 = await page.evaluate(({ targetStoreNum }): { x: number; y: number; text: string } | null => {
      const btns = Array.from(document.querySelectorAll<HTMLElement>('button')).filter(b =>
        /set as my store/i.test(b.textContent ?? '')
      );
      let target: HTMLElement | null = null;
      if (targetStoreNum) {
        for (const btn of btns) {
          // Walk up looking for the CLOSEST ancestor that contains this store number
          // but STOP before reaching a container that mentions multiple store numbers
          let el: HTMLElement | null = btn.parentElement;
          for (let i = 0; i < 15; i++) {
            if (!el) break;
            const t = el.textContent ?? '';
            const storeMatches = (t.match(/Store #\d+/g) ?? []);
            // Found a node that mentions our store number
            if (t.includes(`#${targetStoreNum}`)) {
              // Only use it if it doesn't also mention OTHER store numbers (avoid container with all stores)
              const otherStores = storeMatches.filter(m => !m.includes(targetStoreNum));
              if (otherStores.length === 0) {
                target = btn;
                break;
              }
            }
            el = el.parentElement;
          }
          if (target) break;
        }
      }
      if (!target) target = btns[0] ?? null;
      if (!target) return null;
      // Scroll into view before reading coords — prevents clicking off-screen store
      target.scrollIntoView({ behavior: 'instant', block: 'center' });
      const r = target.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: target.textContent?.trim() ?? '' };
    }, { targetStoreNum: storeNum });

    // ── Step 7a: If target store not found, search for it ──────────────────
    if (storeNum && !rect8) {
      console.log(`Step 7a: Store #${storeNum} not found in list, searching by store number...`);
      // TODO: Implement store search by number if needed
      // For now, we'll just continue with the first store
    }

    if (!rect8) throw new Error('"Set as my store" button not found');
    await sleep(500); // let scrollIntoView settle before clicking

    // Use synthetic events to trigger React onClick handler (garbot recommendation)
    const clicked = await page.evaluate(({ targetStoreNum }): boolean => {
      const btns = Array.from(document.querySelectorAll<HTMLElement>('button')).filter(b =>
        /set as my store/i.test(b.textContent ?? '')
      );
      let target: HTMLElement | null = null;
      if (targetStoreNum) {
        for (const btn of btns) {
          let el: HTMLElement | null = btn.parentElement;
          for (let i = 0; i < 15; i++) {
            if (!el) break;
            const t = el.textContent ?? '';
            const storeMatches = (t.match(/Store #\d+/g) ?? []);
            if (t.includes(`#${targetStoreNum}`)) {
              const otherStores = storeMatches.filter(m => !m.includes(targetStoreNum));
              if (otherStores.length === 0) {
                target = btn;
                break;
              }
            }
            el = el.parentElement;
          }
          if (target) break;
        }
      }
      if (!target) target = btns[0] ?? null;
      if (!target) return false;

      // Dispatch synthetic events in sequence to trigger React handlers
      target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
      target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return true;
    }, { targetStoreNum: storeNum });

    if (!clicked) throw new Error('Failed to click "Set as my store" button');

    await sleep(SLEEP_MS);
    await screenshot(page, 'step8-done');
    console.log('  ✅ "Set as my store" clicked with synthetic events!');

    //  Step 8a: Close modal using the X button ───────────────────────────────
    console.log('Step 8a: Closing modal with X button...');

    // Try multiple approaches to close the modal
    const modalClosed = await page.evaluate(() => {
      // Approach 1: Look for X or Close button
      const closeButtons = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]'));
      const closeBtn = closeButtons.find(b => {
        const text = b.textContent?.trim() || '';
        const ariaLabel = b.getAttribute('aria-label') || '';
        return text === 'Close' || text === '×' || text === 'X' ||
               ariaLabel.toLowerCase().includes('close');
      });

      if (closeBtn) {
        closeBtn.click();
        return { method: 'close-button', success: true };
      }

      // Approach 2: Click outside the modal (on backdrop)
      const backdrop = document.querySelector('[role="presentation"], .modal-backdrop, [data-testid="modal-backdrop"]');
      if (backdrop && backdrop instanceof HTMLElement) {
        backdrop.click();
        return { method: 'backdrop', success: true };
      }

      return { method: 'none', success: false };
    });

    await sleep(2000);
    console.log(`  Closed modal via: ${JSON.stringify(modalClosed)}`);

    // If that didn't work, try Escape as fallback
    if (!modalClosed.success) {
      console.log('  ⚠️  Trying Escape key as fallback...');
      await page.keyboard.press('Escape');
      await sleep(1000);
    }

    await screenshot(page, 'step8a-modal-closed');
    console.log('  ✅ Modal closed');

    // ── Step 8b: Click "Shop this store" in map popup (OPTIONAL) ───────────
    console.log('Step 8b: Looking for "Shop this store" popup (optional)...');
    await sleep(2000); // wait for map popup to fully render

    const rect8bInfo = await page.evaluate(() => {
      const allEls = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]'));
      const btn = allEls.find(b => /shop this store/i.test(b.textContent ?? ''));
      if (!btn) return null;
      // Try getBoundingClientRect first
      const bcr = btn.getBoundingClientRect();
      if (bcr.width > 0 && bcr.height > 0) {
        return { x: bcr.left + bcr.width / 2, y: bcr.top + bcr.height / 2, method: 'bcr' };
      }
      return null; // Don't try fallback coordinates - too unreliable in headless
    });

    if (rect8bInfo && rect8bInfo.x > 0 && rect8bInfo.y > 0) {
      console.log(`  Clicking: "Shop this store" at (${Math.round(rect8bInfo.x)}, ${Math.round(rect8bInfo.y)}) via ${rect8bInfo.method}`);
      await page.mouse.click(rect8bInfo.x, rect8bInfo.y);
      await sleep(SLEEP_MS);
      await screenshot(page, 'step8b-final');
      console.log('  ✅ "Shop this store" clicked');
    } else {
      console.log('  ℹ️  No "Shop this store" popup found (optional - continuing)');
      await screenshot(page, 'step8b-skipped');
    }

    // ── Step 8c: Verify store selection via localStorage ───────────────────
    console.log('Step 8c: Verifying store selection via localStorage...');
    const storeData = await page.evaluate(() => {
      // Check localStorage for store data
      const localData = localStorage.getItem('selected_store') ||
                       localStorage.getItem('store') ||
                       localStorage.getItem('storeId');

      // Also check cookies
      const cookies = document.cookie;

      return {
        localStorage: localData,
        cookies: cookies.substring(0, 200), // First 200 chars
        hasStoreData: !!(localData || cookies.includes('store'))
      };
    });

    console.log(`  localStorage: ${storeData.localStorage || '(none)'}`);
    console.log(`  Has store data: ${storeData.hasStoreData}`);
    await screenshot(page, 'step8c-storage-check');

    // ── Step 9: Wait for page to update/reload after store selection ───────
    console.log('Step 9: Waiting for page to update with new store selection...');

    // Wait for either navigation or the store button to update
    try {
      await Promise.race([
        // Wait for navigation (page reload)
        page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => null),
        // Or wait for the store button text to change from the old store
        page.waitForFunction(
          ({ oldStoreNum }) => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const storeButton = buttons.find(b => /in-?store/i.test(b.textContent ?? ''));
            const text = storeButton?.textContent ?? '';
            // Check if button text no longer contains the old store number
            return !text.includes(`#${oldStoreNum}`);
          },
          { oldStoreNum: '8' }, // Phoenix - Indian School Rd. is Store #8 (the default)
          { timeout: 5000 }
        ).catch(() => null)
      ]);
    } catch {
      // If both timeout, continue anyway - we'll verify below
      console.log('  ⚠️  Page update detection timed out - proceeding to verification');
    }

    // Additional wait to ensure DOM is fully updated
    await sleep(2000);
    await screenshot(page, 'step9-page-updated');
    console.log('  ✅ Page update wait complete');

    // ── Verify ─────────────────────────────────────────────────────────────
    console.log('Step 10: Verifying store selection...');
    const storeInfo = await page.evaluate(
      () => {
        // Find all buttons with "in-store" text
        const buttons = Array.from(document.querySelectorAll<HTMLElement>('button'))
          .filter(b => /in-?store/i.test(b.textContent ?? ''));

        // Log all button texts for debugging
        console.log('DEBUG: Found in-store buttons:', buttons.map(b => b.textContent?.trim()));

        // Prefer a button that contains store information (store number or store name)
        const buttonWithStore = buttons.find(b => {
          const text = b.textContent ?? '';
          return /#\d{3,4}/.test(text) || /Store\s*#/i.test(text) || /\(.+?\)/.test(text);
        });

        console.log('DEBUG: Selected button with store info:', buttonWithStore?.textContent?.trim());

        // Fall back to first button with "in-store" text
        const targetButton = buttonWithStore ?? buttons[0];
        const buttonText = targetButton?.textContent?.replace(/\s+/g, ' ').trim() ?? '(check screenshot)';

        // Also try to find store info in nearby elements or page content
        // Look for elements that might contain the store address or number
        let storeContext = '';
        if (targetButton) {
          // Check parent elements for store info
          let parent: HTMLElement | null = targetButton.parentElement;
          for (let i = 0; i < 5 && parent; i++) {
            const parentText = parent.textContent?.replace(/\s+/g, ' ').trim() ?? '';
            if (parentText.length < 500 && (/#\d{3,4}/.test(parentText) || /store #/i.test(parentText))) {
              storeContext = parentText;
              console.log('DEBUG: Found store info in parent element:', storeContext.substring(0, 200));
              break;
            }
            parent = parent.parentElement;
          }
        }

        return { buttonText, storeContext };
      }
    );

    const finalButtonText = storeInfo.buttonText;

    // Try to parse from button text first, then from context if needed
    let parsedStoreNum = parseStoreNumber(finalButtonText);
    if (!parsedStoreNum && storeInfo.storeContext) {
      console.log('   Trying to parse store number from context...');
      parsedStoreNum = parseStoreNumber(storeInfo.storeContext);
    }

    const result: StoreResult = {
      storeNum: parsedStoreNum,
      storeName: parseStoreName(finalButtonText) || parseStoreName(storeInfo.storeContext),
      buttonText: finalButtonText,
    };

    console.log(`\n✅ Done! Store button: "${finalButtonText}"`);
    console.log(`   Parsed store number: ${result.storeNum}`);
    console.log(`   Parsed store name: ${result.storeName}`);
    if (storeNum && result.storeNum === storeNum) {
      console.log(`✅ Confirmed Store #${storeNum} is active`);
    } else if (storeNum) {
      console.log(`⚠️  Could not confirm store #${storeNum} — check screenshot`);
      console.log(`   Expected: "${storeNum}", Got: "${result.storeNum}"`);
    }

    return result;

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    if (ownedPage && browser) {
      await browser.close();
      console.log('   Browser closed.');
    }
  }
}

// ── CLI entry point ──────────────────────────────────────────────────────────
if (require.main === module) {
  const address = process.argv[2] ?? '6720 N DURANGO DR, LAS VEGAS, NV';
  const storeNum = process.argv[3] ?? null;

  console.log(`\n🛒 Sprouts Store Selector`);
  console.log(`   Address: ${address}`);
  console.log(`   Store #: ${storeNum ?? '(nearest)'}\n`);

  setStore(address, storeNum).catch(() => process.exit(1));
}
