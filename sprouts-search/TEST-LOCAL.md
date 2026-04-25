# Testing the E2E Test Locally

This document explains how to test the Hayward store E2E test locally before pushing.

## Prerequisites

1. **Install Google Chrome** (if not already installed)

2. **Start Chrome with Remote Debugging**:

   **Windows:**
   ```powershell
   chrome.exe --remote-debugging-port=9222
   ```

   **macOS:**
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 &
   ```

   **Linux:**
   ```bash
   google-chrome --remote-debugging-port=9222 &
   ```

3. **Install Dependencies** (if not already done):
   ```bash
   cd sprouts-search
   npm install
   ```

## Running the Specific E2E Test

To run only the Hayward store test:

```bash
npm test -- --testNamePattern="finds Red Boat 40 N Fish Sauce at Store #449"
```

To run all integration tests:

```bash
npm run test:integration
```

## Expected Behavior

The test will:
1. Connect to Chrome via CDP (localhost:9222)
2. Navigate to shop.sprouts.com
3. Set store to #449 (26207 Mission Blvd, Hayward, CA 94544)
4. Search for "red boat"
5. Look for "Red Boat 40 N Fish Sauce" in the results
6. Verify the item is found and available

**Pass Criteria:**
- The item "Red Boat 40 N Fish Sauce" is found in the search results
- The item is marked as available

**Fail Criteria:**
- The item is not found in the search results

## Troubleshooting

**Test times out or fails to connect:**
- Ensure Chrome is running with `--remote-debugging-port=9222`
- Check that no firewall is blocking localhost:9222
- Verify Chrome DevTools Protocol is accessible at http://localhost:9222/json/version

**Item not found:**
- Verify the store actually carries this item (inventory may change)
- Check the search term is correct ("red boat")
- Review the scraped products in the console output

**Wrong store selected:**
- Verify store #449 exists at the given address
- Check the store number extraction logic in `parseStoreNumber()`

## Manual Verification

You can also run the script directly:

```bash
npx ts-node scripts/sprouts-search.ts "26207 Mission Blvd, Hayward, CA 94544" "449" "red boat"
```

This will output the search results to the console and save them to a JSON file in the results directory.
