# Cookie Jars for Integration Testing

## The Problem

Integration tests fail in CI because GitHub Actions starts with a completely fresh Chrome
instance (zero cookies). When Sprouts sees a new visitor, it shows an onboarding modal
("How would you like to shop?") that blocks the store selection flow, causing the script to
fail at Step 3 ("Change store" not found).

## The Solution

Pre-seed the browser with a cookie jar that was exported from a real, working session
**after the target store was already set**. The key cookies are:

- `splash_page = -1` — suppresses the onboarding modal
- `select_store = true` — tells Sprouts a store has already been configured
- `__Host-instacart_sid` + `_instacart_session_id` — Instacart session with the store
  preference baked in server-side

When these cookies are loaded before navigating to shop.sprouts.com, the site behaves
exactly as it does in a real browser session: no modal, store pre-selected.

## Cookie Files

Located in `tests/fixtures/`:

| File | Store | Location |
|------|-------|----------|
| `cookies-507.json` | #507 | Las Vegas – Lake Mead Blvd |
| `cookies-558.json` | #558 | Las Vegas – Decatur Blvd |
| `cookies-449.json` | #449 | Hayward, CA |

## How to Use in Tests

### Option A — Skip setStore(), use cookie jar directly (recommended for search tests)

```typescript
import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer-core';

it('finds Red Boat at Store #507', async () => {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null,
  });
  const page = await browser.newPage();

  // Load cookie jar for this store
  const cookies = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'fixtures', 'cookies-507.json'), 'utf8')
  );
  await page.setCookie(...cookies);

  // Navigate — store #507 will already be active, no modal, no setup needed
  await page.goto('https://shop.sprouts.com', { waitUntil: 'domcontentloaded' });

  // Verify correct store is active (optional sanity check)
  const storeButton = await page.$eval(
    'button',
    (btns: HTMLElement[]) =>
      Array.from(btns).find(b => /in-?store/i.test(b.textContent ?? ''))?.textContent ?? ''
  );
  expect(storeButton).toContain('#507');

  // Now run the search
  const result = await searchAtStore('redboat', page);
  expect(result.storeNum).toBe('507');
  // ... assert products
}, 120_000);
```

### Option B — Load cookies before calling setStore() (for setStore tests)

If you want to test `setStore()` itself (switching from one store to another):

```typescript
// Load any valid cookie jar first (just to bypass the modal)
const cookies = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'cookies-507.json'), 'utf8')
);
await page.setCookie(...cookies);
await page.goto('https://shop.sprouts.com', { waitUntil: 'domcontentloaded' });

// Now switch to a different store
const result = await setStore('6150 N DECATUR BLVD, LAS VEGAS, NV', '558');
expect(result.storeNum).toBe('558');
```

## Test Architecture Recommendation

Split the integration tests into two concerns:

1. **`setStore` tests** — test that store switching works (use any cookie jar to bypass modal)
2. **`searchAtStore` tests** — test product search (use per-store cookie jar, skip setStore entirely)

This makes search tests faster (no 2-3 min store switching), more reliable, and more focused.

## Important Notes

### Cookie Expiry

These cookies were exported 2026-04-24. Expiry timeline:

| Cookie | Expires |
|--------|---------|
| `__Host-instacart_sid` | ~30 days (May 2026) |
| `_instacart_session_id` | Session (re-created on next run) |
| `splash_page`, `select_store` | ~1 year (2027) |
| Analytics cookies | 90 days – 2 years |

When tests start failing again due to expired session cookies, re-export by:
1. Running the `export-store-cookies.ts` script locally (requires Chrome with CDP on port 9222)
2. Committing the updated `tests/fixtures/cookies-*.json` files

### Privacy

These are anonymous session cookies — no login, no personal data, no payment info.
Sprouts/Instacart uses anonymous visitor sessions. Safe to commit to a public repo.

### Running the Export Script

```bash
cd sprouts-search
node -r ts-node/register/transpile-only export-store-cookies.ts
```

Requires Chrome running with `--remote-debugging-port=9222` and the store selection
script to work (same prerequisites as the main search script).
