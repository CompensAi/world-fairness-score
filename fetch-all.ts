#!/usr/bin/env npx ts-node
/**
 * Fetch All World Fairness Score Data
 *
 * This script fetches data from all sources and prepares it for calculation.
 *
 * Usage:
 *   npx ts-node scripts/world-fairness-score/fetch-all.ts
 */

import { fetchAllIndicators as fetchWorldBank } from './fetch/world-bank';
import { saveFreedomHouseData } from './fetch/freedom-house';
import { saveRSFData } from './fetch/rsf-press-freedom';

async function main() {
  console.log('='.repeat(60));
  console.log('World Fairness Score - Data Fetcher');
  console.log('='.repeat(60));
  console.log('');

  const startTime = Date.now();

  // 1. World Bank (API)
  console.log('\n[1/3] Fetching World Bank data (API)...');
  try {
    await fetchWorldBank();
  } catch (error) {
    console.error('World Bank fetch failed:', error);
  }

  // 2. Freedom House (static data)
  console.log('\n[2/3] Processing Freedom House data...');
  try {
    saveFreedomHouseData();
  } catch (error) {
    console.error('Freedom House processing failed:', error);
  }

  // 3. RSF Press Freedom (static data)
  console.log('\n[3/3] Processing RSF Press Freedom data...');
  try {
    saveRSFData();
  } catch (error) {
    console.error('RSF processing failed:', error);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log(`Data fetching complete in ${elapsed}s`);
  console.log('='.repeat(60));

  console.log('\nNext steps:');
  console.log('1. Review data in scripts/world-fairness-score/data/');
  console.log('2. Run calculation: npm run wfs:calculate');
  console.log('3. Generate output: npm run wfs:generate');
}

main().catch(console.error);
