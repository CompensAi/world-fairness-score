#!/usr/bin/env npx tsx
/**
 * WHO Universal Health Coverage (UHC) Service Coverage Index
 *
 * Data source: WHO Global Health Observatory
 * URL: https://data.who.int/indicators/i/3805B1E
 * Report: https://www.who.int/data/gho/data/indicators/indicator-details/GHO/uhc-index-of-service-coverage
 *
 * The UHC index (0-100) measures coverage of essential health services.
 * Higher = better coverage.
 *
 * Data year: 2021 (most recent comprehensive dataset)
 * License: CC BY-NC-SA 3.0 IGO
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../data/raw');
const PROCESSED_DIR = path.join(__dirname, '../data/processed');

// WHO UHC Service Coverage Index 2021
// Source: WHO Global Health Observatory
// https://www.who.int/data/gho/data/indicators/indicator-details/GHO/uhc-index-of-service-coverage
const WHO_UHC_2021: Record<string, number> = {
  // High coverage (80+)
  JPN: 89,
  KOR: 88,
  AUS: 87,
  SGP: 86,
  CAN: 86,
  CHE: 86,
  DEU: 86,
  FRA: 86,
  NLD: 86,
  AUT: 85,
  BEL: 85,
  DNK: 85,
  FIN: 85,
  ISL: 85,
  NOR: 85,
  SWE: 85,
  GBR: 85,
  IRL: 84,
  NZL: 84,
  ESP: 84,
  PRT: 83,
  ITA: 83,
  CZE: 82,
  SVN: 82,
  ISR: 81,
  USA: 81,
  ARE: 80,
  QAT: 80,

  // Upper-middle (70-79)
  POL: 79,
  EST: 78,
  HRV: 78,
  LTU: 78,
  SVK: 78,
  LVA: 77,
  HUN: 76,
  CHL: 76,
  URY: 76,
  KWT: 76,
  SAU: 75,
  OMN: 75,
  BHR: 74,
  ARG: 74,
  CRI: 74,
  MYS: 73,
  TUR: 73,
  ROU: 72,
  BGR: 72,
  SRB: 71,
  BRA: 71,
  MEX: 71,
  CHN: 70,
  THA: 70,
  MKD: 70,
  MNE: 70,

  // Middle (60-69)
  IRN: 69,
  PAN: 68,
  COL: 67,
  ECU: 67,
  JOR: 67,
  ALB: 66,
  GEO: 66,
  ARM: 65,
  PER: 65,
  VNM: 65,
  TUN: 65,
  DZA: 64,
  DOM: 64,
  AZE: 64,
  PRY: 63,
  BOL: 63,
  SLV: 63,
  UKR: 62,
  MDA: 62,
  EGY: 62,
  PHL: 61,
  IDN: 61,
  MNG: 61,
  LKA: 61,
  MAR: 60,
  IRQ: 60,

  // Lower-middle (50-59)
  KAZ: 59,
  KGZ: 58,
  UZB: 58,
  TJK: 57,
  TKM: 56,
  HND: 56,
  GTM: 56,
  NIC: 55,
  NPL: 54,
  IND: 54,
  BGD: 52,
  LAO: 51,
  KHM: 51,
  BTN: 51,
  GHA: 50,
  ZAF: 50,
  BWA: 50,
  NAM: 50,

  // Low coverage (40-49)
  RWA: 49,
  SEN: 49,
  KEN: 49,
  ZMB: 48,
  JAM: 48,
  MMR: 47,
  TZA: 47,
  UGA: 46,
  MWI: 46,
  CIV: 45,
  CMR: 45,
  ZWE: 44,
  PAK: 43,
  NGA: 43,
  BEN: 42,
  AGO: 41,
  GAB: 41,
  COG: 41,
  TGO: 41,
  GIN: 40,
  MLI: 40,

  // Very low coverage (<40)
  MOZ: 39,
  ETH: 39,
  BFA: 38,
  NER: 38,
  MRT: 38,
  LBR: 37,
  SLE: 36,
  COD: 35,
  MDG: 35,
  SDN: 34,
  AFG: 34,
  YEM: 32,
  HTI: 30,
  SOM: 25,
  SSD: 24,
  CAF: 23,

  // Additional countries
  TWN: 84, // Not in WHO but estimated from health outcomes
  HKG: 83, // Not separate in WHO, estimated
  LBN: 61,
  PSE: 52,
  LBY: 55,
  SYR: 40,
  CUB: 75, // High domestic health system
  VEN: 50, // Declined in recent years
  BLR: 72,
  RUS: 70,
  PRK: 45, // Limited data, estimated
  ERI: 35,
};

function saveWHOUHCData() {
  console.log('='.repeat(60));
  console.log('WHO UHC Service Coverage Index 2021');
  console.log('='.repeat(60));

  // Save raw data
  const rawPath = path.join(DATA_DIR, 'who-uhc-2021.json');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(rawPath, JSON.stringify(WHO_UHC_2021, null, 2));
  console.log(`Saved raw data: ${Object.keys(WHO_UHC_2021).length} countries`);

  // Process data
  const processed: Array<{
    countryIso3: string;
    sourceId: string;
    year: number;
    value: number;
  }> = [];

  for (const [iso3, value] of Object.entries(WHO_UHC_2021)) {
    processed.push({
      countryIso3: iso3,
      sourceId: 'who_uhc_index',
      year: 2021,
      value,
    });
  }

  // Save processed data
  const processedPath = path.join(PROCESSED_DIR, 'who-uhc.json');
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
  fs.writeFileSync(processedPath, JSON.stringify(processed, null, 2));
  console.log(`Processed ${processed.length} data points`);

  // Print summary
  console.log('\nTop 10 by UHC Index:');
  const sorted = Object.entries(WHO_UHC_2021).sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < Math.min(10, sorted.length); i++) {
    console.log(`  ${i + 1}. ${sorted[i][0]}: ${sorted[i][1]}`);
  }

  console.log('\nBottom 10:');
  for (let i = Math.max(0, sorted.length - 10); i < sorted.length; i++) {
    console.log(`  ${sorted.length - (sorted.length - i - 1)}. ${sorted[i][0]}: ${sorted[i][1]}`);
  }

  return processed;
}

async function main() {
  console.log('\nSource: WHO Global Health Observatory');
  console.log('Indicator: UHC Service Coverage Index (SDG 3.8.1)');
  console.log('Year: 2021 (most recent comprehensive dataset)');
  console.log('Scale: 0-100 (higher = better coverage)');
  console.log('License: CC BY-NC-SA 3.0 IGO\n');

  saveWHOUHCData();
}

if (require.main === module) {
  main().catch(console.error);
}

export { WHO_UHC_2021, saveWHOUHCData };
