# Batch Processing Multiple Stores

Process many stores sequentially using a CSV file.

## CSV Format

```csv
Store Name,Store Number,Address Line 1,Address Line 2,City,State,Zip
Las Vegas - Centennial,506,6720 N DURANGO DR,,LAS VEGAS,NV,89149
Lake Mead Blvd,507,7530 W Lake Mead Blvd,,LAS VEGAS,NV,89128
```

## Usage

```bash
npx ts-node scripts/batch-sprouts-search.ts path/to/stores.csv
```

## What It Does

1. Reads store list from CSV
2. Deduplicates by store number
3. Runs sprouts-search.ts for each store sequentially
4. Collects results for target items (A, B, C)
5. Saves progress after each store
6. Outputs summary table when complete

## Output

**Progress file**: `_batch-progress.json` - saved after each store

**Summary table** printed to console:

```
| Store | Location | A: Item One | B: Item Two | C: Item Three |
| ----- | -------- | :---------: | :---------: | :-----------: |
| #506  | Las Vegas, NV | ✅ | ✅ | ❌ |
| #507  | Las Vegas, NV | ❌ | ✅ | ❌ |
```

**Slack message file**: `_slack-message.txt` - formatted message ready to post

## Timeout

Each store gets 6 minutes (360,000ms) to complete. Adjust in the script if needed.

## Error Handling

Failed stores are logged but don't stop the batch. All errors appear in the final summary.
