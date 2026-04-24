# Sprouts Search Skill

Automated browser-based search for checking in-store availability at Sprouts Farmers Market locations.

## Features

- ✅ Search any Sprouts store by address and store number
- ✅ Batch processing for multiple stores from CSV
- ✅ Detailed JSON output with product availability
- ✅ Unit and integration tests
- ✅ ESLint code quality checks
- ✅ TypeScript type safety
- ✅ GitHub Actions CI/CD pipeline

## Structure

```
sprouts-search/
├── SKILL.md                    # Skill definition for Claude
├── BATCH.md                    # Batch processing documentation
├── README.md                   # This file
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── vitest.config.ts            # Test configuration
├── eslint.config.js            # Linting rules
├── scripts/                    # Source code
│   ├── sprouts-search.ts       # Main search script
│   ├── sprouts-set-store.ts    # Store selection logic
│   ├── sprouts-utils.ts        # Shared utilities
│   └── batch-sprouts-search.ts # Batch processor
└── tests/                      # Test files
    ├── sprouts-search.test.ts
    └── sprouts-set-store.test.ts
```

## Installation

```bash
cd sprouts-search
npm install
```

## Usage

### Prerequisites

Chrome must be running with remote debugging:

```bash
# Windows
chrome.exe --remote-debugging-port=9222

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Linux
google-chrome --remote-debugging-port=9222
```

### Single Store Search

```bash
npx ts-node scripts/sprouts-search.ts "ADDRESS" "STORE_NUM" "SEARCH_TERM"
```

Example:
```bash
npx ts-node scripts/sprouts-search.ts "6720 N DURANGO DR, LAS VEGAS, NV" "506" "redboat"
```

### Batch Search

```bash
npx ts-node scripts/batch-sprouts-search.ts path/to/stores.csv
```

## Development

### Run Tests

```bash
# Unit tests only (no browser required)
npm test

# Integration tests (requires Chrome with remote debugging)
npm run test:integration

# All tests with coverage
npm run test:coverage
```

### Linting

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Type Checking

```bash
npm run typecheck
```

## CI/CD

GitHub Actions automatically runs on PRs that modify files in `sprouts-search/`:

1. **Lint and Test** - Runs linting, type checking, and unit tests
2. **Integration Test** - Runs E2E tests with headless Chrome

See [.github/workflows/sprouts-search-ci.yml](../.github/workflows/sprouts-search-ci.yml) for details.

## How It Works

1. **Connect via CDP**: Uses Puppeteer to connect to existing Chrome instance
2. **Set Store**: Navigates UI to select target store location
3. **Search**: Enters search term and waits for results
4. **Scrape**: Extracts product data from result cards
5. **Output**: Writes JSON file and prints summary

### Key Technical Details

- Uses `nativeInputValueSetter` to trigger React's synthetic onChange events
- Real mouse clicks via `getBoundingClientRect` for React-safe interactions
- Form submit event dispatch to bypass autocomplete dropdown
- Sequential store processing (shares Chrome instance)

## Troubleshooting

**"Connection refused" error**
- Ensure Chrome is running with `--remote-debugging-port=9222`
- Check that no firewall is blocking localhost:9222

**"Timeout" errors**
- Slow network: Increase timeout values in scripts
- Page structure changed: Update selectors in code

**Wrong store selected**
- Verify store number matches the address
- Check store number extraction logic in `parseStoreNumber()`

## License

MIT
