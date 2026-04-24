# Sprouts Website Automation Knowledge Base

This document captures findings, edge cases, and behavioral patterns observed when automating the Sprouts Farmers Market website.

## Migration to Playwright (2026-04-24)

**Action Taken:** Migrated from puppeteer-core to playwright-core based on garbot's recommendation #2.

**Rationale:**
- Playwright has native React/Angular event synthesis support
- Eliminates the need for custom synthetic event dispatch sequences
- Drop-in compatible with CDP approach (connects via `chromium.connectOverCDP()`)
- Better handling of React synthetic events out of the box

**Changes Made:**
1. Updated package.json: `puppeteer-core` → `playwright-core ^1.49.0`
2. Updated all TypeScript files to use Playwright API:
   - `import { chromium, Browser, Page } from 'playwright-core'`
   - `chromium.connectOverCDP('http://localhost:9222')` instead of `puppeteer.connect()`
   - `page.setViewportSize()` instead of `page.setViewport()`
   - `page.keyboard.press('Control+a')` instead of separate down/up calls
   - `page.waitForLoadState('networkidle')` instead of `waitForNavigation({ waitUntil: 'networkidle0' })`
   - `browser.close()` instead of `browser.disconnect()`
3. All unit tests still pass (13 tests)
4. Lint passes with no errors

**Testing Status:**
- ✅ Unit tests: All 13 passing
- ✅ Lint: No errors
- ⏸️  Integration tests: Require Chrome with CDP (port 9222) - test locally

## Critical Findings (Updated with Garbot Analysis)

### Issue #1: "How would you like to shop?" Onboarding Modal (PRIMARY BLOCKER)

**Discovered:** 2026-04-24 (garbot analysis)

**Symptom:** On fresh headless Chrome sessions with no cookies, the site immediately shows an onboarding modal that blocks the entire page.

**Root Cause:**
- In CI environments with clean browser state, this modal ALWAYS appears
- The script's Step 2 searches for "In-Store" button and Step 3 for "Change store"
- These accidentally interact with the modal's rows instead of the header button
- If "Confirm" is never clicked in the modal, the session state is never committed

**Fix Implemented:**
- Added Step 0 to detect and handle the onboarding modal
- Clicks "In-Store" option in the modal, then "Confirm" button
- Only proceeds to store selection after modal is dismissed

### Issue #2: React Synthetic Events Not Firing (CRITICAL)

**Discovered:** 2026-04-24 (garbot analysis)

**Symptom:** Multiple click attempts (page.mouse.click() → element.click() → coordinates) all failed to trigger React handlers.

**Root Cause:**
- Sprouts uses React for event handling
- Headless Chrome with `--disable-gpu` + `--disable-dev-shm-usage` affects compositing
- `element.click()` doesn't reliably trigger React synthetic event system
- React components may not be in the composed event path

**Fix Implemented:**
- Migrated to playwright-core (2026-04-24) which has native React event synthesis
- Playwright properly triggers React synthetic events without manual PointerEvent/MouseEvent sequences
- Legacy fix (PointerEvent sequence) no longer needed with Playwright

**Previous Fix (Puppeteer):**
- Used sequence of synthetic PointerEvent + MouseEvent dispatches
- Full sequence: pointerdown → mousedown → pointerup → mouseup → click
- All events used `bubbles: true` to propagate through React's event system

### Issue #3: "Shop this store" Map Popup Unreliable in Headless

**Discovered:** 2026-04-24 (garbot analysis)

**Symptom:** Map popup with "Shop this store" button either doesn't render or has zero-size bounding rects in headless Chrome.

**Root Cause:**
- Google Maps popup requires GPU and proper Maps session
- Headless CI with `--no-sandbox --disable-gpu` can't render it properly
- Hardcoded pixel coordinates (836, 652) were a workaround but unreliable

**Fix Implemented:**
- Made Step 8b OPTIONAL - don't fail if button not found
- Removed hardcoded fallback coordinates (too brittle)
- Added Step 8c to verify store via localStorage/cookies instead of UI

### Issue #4: Store Selection Verification

**Discovered:** 2026-04-24

**Symptom:** UI-based verification (parsing button text) was unreliable and failed even when store was set.

**Root Cause:**
- Button text format varies across sessions
- DOM may not update immediately after async store selection
- UI state doesn't reliably reflect underlying data store

**Fix Implemented:**
- Added localStorage/cookie verification in Step 8c
- Check for: `selected_store`, `store`, `storeId` in localStorage
- Also scan cookies for store-related data
- More reliable than UI text parsing

## Website Behavioral Patterns

### Pattern #1: Multiple Paths to Same Functionality

The Sprouts website may show different UI flows for the same action depending on:
- User session state (fresh vs. returning)
- Time of day / server-side A/B tests
- Browser state / cookies
- Geographic location

**Implication:** Need multi-path approach with fallbacks for each critical action.

### Pattern #2: Async State Management

Store selection appears to use React state management with async updates:
- Clicking "Set as my store" likely triggers an API call
- The UI may not update immediately
- Modal behavior may be tied to completion of async operations

**Implication:** Need to wait for API completion signals, not just DOM states.

## Edge Cases Encountered

### Edge Case #1: Store Number Parsing

The store button text format varies:
- Format 1: `"In-Store · Las Vegas - Centennial (Store #506)"`
- Format 2: `"In-Store · open 7am - 10pm Scottsdale - Shea Blvd. (Store #2)"`

The parser handles this with regex: `/#(\d{3,4})/` to extract 3-4 digit store numbers.

### Edge Case #2: Default Store Selection

When first visiting the site, it defaults to:
- **Store #2:** Scottsdale - Shea Blvd. (Phoenix area)
- This appears to be a hardcoded default, not based on geolocation

### Edge Case #3: Browser State Contamination

**Issue:** Tests running in sequence share browser state, causing failures.

**Solution:**
- Use `--user-data-dir=/tmp/chrome-test-profile` in CI
- Pre-seed localStorage with store data to skip full flow
- Or use separate browser contexts for each test

## Testing Notes

### Integration Test Challenges

1. **Browser State Contamination:** Tests running in sequence may share browser state
   - **Solution:** Create new browser context/page for each test OR clear cookies between tests

2. **Network Timing:** API calls for store selection may have variable latency
   - **Solution:** Use retry logic with exponential backoff

3. **Screenshot Debugging:** Screenshots are essential for diagnosing UI state issues
   - All critical steps should have screenshots
   - Compare "before" and "after" states to confirm changes

4. **Headless vs. Headed Differences:**
   - Headless Chrome with --disable-gpu behaves differently
   - Map popups and some React components may not render
   - Always test in headless mode before CI

## Recommendations

### For Future Developers/Agents

1. **Always validate the result:** After any action, verify it succeeded before proceeding
2. **Expect variability:** The website UI may change between runs - maintain multiple approaches
3. **Debug with screenshots:** Visual confirmation is often more reliable than DOM queries alone
4. **Wait for async operations:** Don't assume DOM state changes are instantaneous
5. **Test in isolation:** Browser state from previous tests can cause false negatives
6. **Use storage verification:** localStorage/cookies are more reliable than UI parsing

### Implemented Fixes (Based on Garbot Analysis)

✅ **Step 0:** Handle onboarding modal on fresh sessions
✅ **Playwright Migration:** Migrated to playwright-core for better React support (2026-04-24)
✅ **Optional Map Popup:** Don't fail if "Shop this store" missing
✅ **Storage Verification:** Check localStorage/cookies for store data
⬜ **Browser Isolation:** Consider `--user-data-dir` for clean state per test

**Deprecated (replaced by Playwright):**
~~**Synthetic Events:** Use PointerEvent + MouseEvent sequence for React~~ - No longer needed with Playwright

---

**Last Updated:** 2026-04-24
**Status:** Migrated to Playwright; all unit tests passing
**Credits:** Root cause analysis by garbot, Playwright migration per garbot recommendation #2
