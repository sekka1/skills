---
name: sprouts-search
description: Search Sprouts Farmers Market (shop.sprouts.com) for specific items by zip code, city/state, or store number to check in-store availability. Use when the user asks to check if items are in stock at Sprouts, look up Sprouts availability near a zip code or city, or search Sprouts by store. Handles multiple locations and multiple items in one request.
---

# Sprouts In-Store Availability Search

Automated search for item availability at Sprouts Farmers Market stores using Puppeteer browser automation.

## Requirements

**Chrome must be running** with remote debugging enabled before using these scripts:

```bash
chrome.exe --remote-debugging-port=9222
```

Or on macOS/Linux:
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

## Quick Start

Search for items at a specific store:

```bash
cd sprouts-search
npm install
npx ts-node scripts/sprouts-search.ts "STORE_ADDRESS" "STORE_NUM" "search_term"
```

Example:
```bash
npx ts-node scripts/sprouts-search.ts "6720 N DURANGO DR, LAS VEGAS, NV" "506" "redboat"
```

## What the Script Does

1. Connects to Chrome via CDP (localhost:9222)
2. Navigates to shop.sprouts.com
3. Sets the in-store location using the target address and store number
4. Searches for items using the search bar
5. Scrapes all product cards from results
6. Writes detailed results to JSON file
7. Prints summary with explicit ✅ FOUND / ❌ NOT FOUND status

## Output

**Console output** shows:
- Store confirmation
- List of products found
- Availability status for each item

**JSON file** written to results directory:
```json
{
  "store": "506",
  "storeName": "Las Vegas - Centennial",
  "address": "6720 N DURANGO DR, LAS VEGAS, NV",
  "searchTerm": "redboat",
  "products": [
    {
      "name": "Red Boat Lemongrass Vietnamese Curry",
      "price": "$6.99",
      "size": "12 oz",
      "available": true
    }
  ],
  "timestamp": "2026-04-16T20:00:00.000Z"
}
```

## Multi-Store Searches

Process stores sequentially (never in parallel - they share the same Chrome instance):

```bash
npx ts-node scripts/sprouts-search.ts "ADDRESS_1" "STORE_1" "search_term"
# Wait for completion, then:
npx ts-node scripts/sprouts-search.ts "ADDRESS_2" "STORE_2" "search_term"
```

For batch processing multiple stores, use the batch script. See [BATCH.md](BATCH.md) for details.

## Script Reference

**sprouts-search.ts** - Main search script (set store + search items)
**sprouts-set-store.ts** - Set store location only
**sprouts-utils.ts** - Shared helper functions
**batch-sprouts-search.ts** - Process multiple stores from CSV

## Troubleshooting

**Script fails immediately**: Ensure Chrome is running with `--remote-debugging-port=9222`

**Wrong store selected**: Verify store number matches the address location

**No products found**: Item may be out of stock or search term needs adjustment

**Timeout errors**: Increase timeout or check network connection

## Development

Run tests:
```bash
npm test              # Unit tests only (no browser required)
npm run test:integration  # Integration tests (requires Chrome + CDP)
```

Lint code:
```bash
npm run lint
npm run lint:fix
```

Type check:
```bash
npm run typecheck
```
