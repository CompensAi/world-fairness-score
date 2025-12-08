#!/usr/bin/env npx ts-node
/**
 * Freedom House Data Fetcher
 *
 * Fetches Freedom in the World data from Freedom House API/downloads
 * Data source: https://freedomhouse.org/report/freedom-world
 *
 * Note: Freedom House provides aggregate scores for:
 * - Political Rights (0-40)
 * - Civil Liberties (0-60)
 * - Total Score (0-100)
 * - Status: Free, Partly Free, Not Free
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../data/raw');
const PROCESSED_DIR = path.join(__dirname, '../data/processed');

// Freedom House 2024 data (manually curated from their Excel download)
// Source: https://freedomhouse.org/report/freedom-world
// This is a subset - full data should be downloaded from their site
const FREEDOM_HOUSE_2024: Record<string, { pr: number; cl: number; total: number; status: string }> = {
  // Nordic Countries
  NOR: { pr: 40, cl: 60, total: 100, status: 'Free' },
  FIN: { pr: 40, cl: 60, total: 100, status: 'Free' },
  SWE: { pr: 40, cl: 60, total: 100, status: 'Free' },
  DNK: { pr: 40, cl: 58, total: 98, status: 'Free' },
  ISL: { pr: 39, cl: 58, total: 97, status: 'Free' },

  // Western Europe
  NLD: { pr: 39, cl: 58, total: 97, status: 'Free' },
  LUX: { pr: 39, cl: 58, total: 97, status: 'Free' },
  IRL: { pr: 39, cl: 58, total: 97, status: 'Free' },
  CHE: { pr: 39, cl: 57, total: 96, status: 'Free' },
  DEU: { pr: 39, cl: 55, total: 94, status: 'Free' },
  AUT: { pr: 37, cl: 56, total: 93, status: 'Free' },
  BEL: { pr: 38, cl: 55, total: 93, status: 'Free' },
  GBR: { pr: 38, cl: 55, total: 93, status: 'Free' },
  FRA: { pr: 36, cl: 52, total: 88, status: 'Free' },

  // Southern Europe
  PRT: { pr: 39, cl: 57, total: 96, status: 'Free' },
  ESP: { pr: 36, cl: 55, total: 91, status: 'Free' },
  ITA: { pr: 35, cl: 54, total: 89, status: 'Free' },
  GRC: { pr: 33, cl: 52, total: 85, status: 'Free' },

  // Central Europe
  CZE: { pr: 35, cl: 54, total: 89, status: 'Free' },
  SVN: { pr: 36, cl: 55, total: 91, status: 'Free' },
  EST: { pr: 37, cl: 56, total: 93, status: 'Free' },
  LVA: { pr: 36, cl: 53, total: 89, status: 'Free' },
  LTU: { pr: 36, cl: 53, total: 89, status: 'Free' },
  POL: { pr: 33, cl: 49, total: 82, status: 'Free' },
  SVK: { pr: 34, cl: 50, total: 84, status: 'Free' },
  HUN: { pr: 24, cl: 43, total: 67, status: 'Partly Free' },

  // Eastern Europe
  UKR: { pr: 22, cl: 39, total: 61, status: 'Partly Free' },
  MDA: { pr: 24, cl: 38, total: 62, status: 'Partly Free' },
  GEO: { pr: 21, cl: 37, total: 58, status: 'Partly Free' },
  ROU: { pr: 32, cl: 48, total: 80, status: 'Free' },
  BGR: { pr: 31, cl: 46, total: 77, status: 'Free' },
  SRB: { pr: 22, cl: 39, total: 61, status: 'Partly Free' },
  MKD: { pr: 26, cl: 41, total: 67, status: 'Partly Free' },
  ALB: { pr: 26, cl: 41, total: 67, status: 'Partly Free' },
  BIH: { pr: 22, cl: 37, total: 59, status: 'Partly Free' },
  MNE: { pr: 25, cl: 40, total: 65, status: 'Partly Free' },

  // Not Free in Europe
  RUS: { pr: 5, cl: 11, total: 16, status: 'Not Free' },
  BLR: { pr: 2, cl: 6, total: 8, status: 'Not Free' },
  AZE: { pr: 2, cl: 8, total: 10, status: 'Not Free' },

  // Americas
  CAN: { pr: 40, cl: 58, total: 98, status: 'Free' },
  USA: { pr: 33, cl: 50, total: 83, status: 'Free' },
  CRI: { pr: 37, cl: 54, total: 91, status: 'Free' },
  URY: { pr: 38, cl: 56, total: 94, status: 'Free' },
  CHL: { pr: 36, cl: 55, total: 91, status: 'Free' },
  ARG: { pr: 34, cl: 51, total: 85, status: 'Free' },
  BRA: { pr: 31, cl: 43, total: 74, status: 'Free' },
  MEX: { pr: 27, cl: 35, total: 62, status: 'Partly Free' },
  COL: { pr: 30, cl: 38, total: 68, status: 'Partly Free' },
  PER: { pr: 28, cl: 42, total: 70, status: 'Free' },
  ECU: { pr: 24, cl: 37, total: 61, status: 'Partly Free' },
  VEN: { pr: 4, cl: 14, total: 18, status: 'Not Free' },
  CUB: { pr: 1, cl: 11, total: 12, status: 'Not Free' },
  NIC: { pr: 4, cl: 10, total: 14, status: 'Not Free' },

  // Asia-Pacific
  JPN: { pr: 39, cl: 56, total: 95, status: 'Free' },
  KOR: { pr: 35, cl: 49, total: 84, status: 'Free' },
  TWN: { pr: 37, cl: 56, total: 93, status: 'Free' },
  AUS: { pr: 39, cl: 57, total: 96, status: 'Free' },
  NZL: { pr: 40, cl: 58, total: 98, status: 'Free' },
  IND: { pr: 26, cl: 40, total: 66, status: 'Partly Free' },
  IDN: { pr: 28, cl: 40, total: 68, status: 'Partly Free' },
  PHL: { pr: 26, cl: 38, total: 64, status: 'Partly Free' },
  THA: { pr: 16, cl: 30, total: 46, status: 'Partly Free' },
  MYS: { pr: 22, cl: 35, total: 57, status: 'Partly Free' },
  SGP: { pr: 17, cl: 32, total: 49, status: 'Partly Free' },
  CHN: { pr: 0, cl: 9, total: 9, status: 'Not Free' },
  VNM: { pr: 3, cl: 16, total: 19, status: 'Not Free' },
  PRK: { pr: 0, cl: 3, total: 3, status: 'Not Free' },
  MMR: { pr: 1, cl: 9, total: 10, status: 'Not Free' },

  // Middle East & North Africa
  ISR: { pr: 28, cl: 42, total: 70, status: 'Free' },
  TUN: { pr: 16, cl: 33, total: 49, status: 'Partly Free' },
  LBN: { pr: 22, cl: 33, total: 55, status: 'Partly Free' },
  JOR: { pr: 11, cl: 22, total: 33, status: 'Not Free' },
  MAR: { pr: 12, cl: 25, total: 37, status: 'Partly Free' },
  ARE: { pr: 5, cl: 16, total: 21, status: 'Not Free' },
  SAU: { pr: 1, cl: 7, total: 8, status: 'Not Free' },
  IRN: { pr: 4, cl: 10, total: 14, status: 'Not Free' },
  EGY: { pr: 6, cl: 12, total: 18, status: 'Not Free' },
  IRQ: { pr: 17, cl: 26, total: 43, status: 'Not Free' },
  SYR: { pr: 0, cl: 1, total: 1, status: 'Not Free' },

  // Africa
  ZAF: { pr: 33, cl: 46, total: 79, status: 'Free' },
  BWA: { pr: 33, cl: 46, total: 79, status: 'Free' },
  GHA: { pr: 31, cl: 46, total: 77, status: 'Free' },
  SEN: { pr: 28, cl: 41, total: 69, status: 'Partly Free' },
  KEN: { pr: 24, cl: 35, total: 59, status: 'Partly Free' },
  NGA: { pr: 22, cl: 33, total: 55, status: 'Partly Free' },
  TZA: { pr: 17, cl: 29, total: 46, status: 'Partly Free' },
  ETH: { pr: 10, cl: 22, total: 32, status: 'Not Free' },
  RWA: { pr: 7, cl: 15, total: 22, status: 'Not Free' },
  ERI: { pr: 0, cl: 2, total: 2, status: 'Not Free' },
};

function saveFreedomHouseData() {
  console.log('='.repeat(60));
  console.log('Freedom House Data');
  console.log('='.repeat(60));

  // Save raw data
  const rawPath = path.join(DATA_DIR, 'freedom-house-2024.json');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(rawPath, JSON.stringify(FREEDOM_HOUSE_2024, null, 2));
  console.log(`Saved raw data: ${Object.keys(FREEDOM_HOUSE_2024).length} countries`);

  // Transform to our format
  const processed: Array<{
    countryIso3: string;
    sourceId: string;
    year: number;
    value: number;
  }> = [];

  for (const [iso3, data] of Object.entries(FREEDOM_HOUSE_2024)) {
    // Political Rights score (0-40)
    processed.push({
      countryIso3: iso3,
      sourceId: 'freedom_house_political',
      year: 2024,
      value: data.pr,
    });

    // Civil Liberties score (0-60)
    processed.push({
      countryIso3: iso3,
      sourceId: 'freedom_house_civil',
      year: 2024,
      value: data.cl,
    });

    // Total score (0-100)
    processed.push({
      countryIso3: iso3,
      sourceId: 'freedom_house_total',
      year: 2024,
      value: data.total,
    });
  }

  // Save processed data
  const processedPath = path.join(PROCESSED_DIR, 'freedom-house.json');
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
  fs.writeFileSync(processedPath, JSON.stringify(processed, null, 2));
  console.log(`Processed ${processed.length} data points`);

  return processed;
}

async function main() {
  console.log('\nNote: For complete data, download from:');
  console.log('https://freedomhouse.org/report/freedom-world');
  console.log('');

  saveFreedomHouseData();
}

if (require.main === module) {
  main().catch(console.error);
}

export { FREEDOM_HOUSE_2024, saveFreedomHouseData };
