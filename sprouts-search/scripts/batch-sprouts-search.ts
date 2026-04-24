#!/usr/bin/env node
// batch-sprouts-search.ts
// Reads the store CSV, runs sprouts-search.ts for each store sequentially,
// collects target item results, and posts a summary to Slack when done.

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const CSV_PATH = process.argv[2] ?? 'C:\\Users\\chris\\.openclaw\\media\\inbound\\e5cdcf7b-b59d-4b01-b1fc-c4fb0a7fadb8.csv';
const RESULTS_DIR = path.join(__dirname, '..', '..', 'sprouts-results');
const SKILL_DIR = __dirname;

interface StoreRow {
  name: string;
  num: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface StoreResult {
  store: string;
  storeName: string;
  city: string;
  state: string;
  A: boolean;
  B: boolean;
  C: boolean;
  error?: string;
}

function parseCSV(filePath: string): StoreRow[] {
  const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
  const stores: StoreRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const [, numRaw, addr1, , city, state, zip] = cols;
    const num = numRaw?.trim();
    if (!num || !addr1) continue;
    stores.push({ name: cols[0], num, address: addr1, city, state, zip });
  }
  // Deduplicate by store number (keep first occurrence)
  const seen = new Set<string>();
  return stores.filter(s => {
    if (seen.has(s.num)) return false;
    seen.add(s.num);
    return true;
  });
}

function hasItem(products: Array<{name: string}>, matchFn: (n: string) => boolean): boolean {
  return products.some(p => matchFn(p.name));
}

function runStore(store: StoreRow): StoreResult {
  const addr = `${store.address}, ${store.city}, ${store.state}`;
  const num = store.num.replace(/\s/g, '').replace(/^#/, '');
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running Store #${num} — ${store.city}, ${store.state}`);
  console.log(`Address: ${addr}`);

  try {
    execSync(
      `npx ts-node sprouts-search.ts "${addr}" ${num} redboat`,
      { cwd: SKILL_DIR, stdio: 'inherit', timeout: 360_000 }
    );

    const jsonPath = path.join(RESULTS_DIR, `${num}.json`);
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const products: Array<{name: string}> = data.products ?? [];

    return {
      store: num,
      storeName: data.storeName ?? '',
      city: store.city,
      state: store.state,
      A: hasItem(products, n => /lemongrass/i.test(n) && !/spicy/i.test(n) && /red boat/i.test(n)),
      B: hasItem(products, n => /spicy/i.test(n) && /lemongrass/i.test(n) && /red boat/i.test(n)),
      C: hasItem(products, n => /sweet/i.test(n) && /savory/i.test(n) && /red boat/i.test(n)),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`ERROR for store #${num}: ${msg}`);
    return { store: num, storeName: '', city: store.city, state: store.state, A: false, B: false, C: false, error: msg.slice(0, 100) };
  }
}

function postToSlack(results: StoreResult[]): void {
  const errors = results.filter(r => r.error);
  const e = (v: boolean) => v ? '✅' : '❌';

  let msg = `*Sprouts Red Boat availability — ${results.length} stores*\n\n`;
  msg += `| Store | Location | A: Lemongrass Curry | B: Spicy Lemongrass Curry | C: Sweet & Savory |\n`;
  msg += `| ----- | -------- | :-----------------: | :-----------------------: | :---------------: |\n`;
  for (const r of results) {
    const loc = `${r.city}, ${r.state}`;
    msg += `| #${r.store} | ${loc} | ${e(r.A)} | ${e(r.B)} | ${e(r.C)} |\n`;
  }

  const aCount = results.filter(r => r.A).length;
  const bCount = results.filter(r => r.B).length;
  const cCount = results.filter(r => r.C).length;
  const allThree = results.filter(r => r.A && r.B && r.C).map(r => `#${r.store} ${r.city} ${r.state}`);

  msg += `\n*A:* ${aCount} stores  |  *B:* ${bCount} stores  |  *C:* ${cCount} stores`;
  if (allThree.length) msg += `\n*All 3:* ${allThree.join(' · ')}`;

  if (errors.length) {
    msg += `\n\n*Errors (${errors.length} stores):*\n`;
    for (const r of errors) {
      msg += `• #${r.store} ${r.city}, ${r.state} — ${r.error}\n`;
    }
  }

  msg += `\n_Run completed: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}_`;

  // Use OpenClaw message tool via exec (no SDK available in script context)
  // Write message to a temp file and use openclaw CLI
  const tmpFile = path.join(RESULTS_DIR, '_slack-message.txt');
  fs.writeFileSync(tmpFile, msg);
  console.log('\n\n' + '='.repeat(60));
  console.log('BATCH COMPLETE. Slack message:');
  console.log(msg);
  console.log('='.repeat(60));
  console.log(`SLACK_MSG_FILE:${tmpFile}`);
}

// Main
const stores = parseCSV(CSV_PATH);
console.log(`Found ${stores.length} unique stores. Starting batch run...\n`);

const results: StoreResult[] = [];
for (const store of stores) {
  const result = runStore(store);
  results.push(result);
  // Save progress after each store
  fs.writeFileSync(
    path.join(RESULTS_DIR, '_batch-progress.json'),
    JSON.stringify(results, null, 2)
  );
}

postToSlack(results);
