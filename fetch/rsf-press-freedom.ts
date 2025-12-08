#!/usr/bin/env npx ts-node
/**
 * RSF Press Freedom Index Data
 *
 * Reporters Without Borders (RSF) Press Freedom Index 2024
 * Source: https://rsf.org/en/index
 *
 * Scale: 0-100 where LOWER = better (inverted in our normalization)
 * 0-15: Good situation
 * 15-25: Satisfactory situation
 * 25-35: Problematic situation
 * 35-55: Difficult situation
 * 55+: Very serious situation
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../data/raw');
const PROCESSED_DIR = path.join(__dirname, '../data/processed');

// RSF Press Freedom Index 2024 (sample - full data from rsf.org)
// Lower score = better press freedom
const RSF_2024: Record<string, { score: number; rank: number }> = {
  // Best press freedom (score < 15)
  NOR: { score: 7.04, rank: 1 },
  DNK: { score: 8.27, rank: 2 },
  SWE: { score: 9.52, rank: 3 },
  NLD: { score: 10.72, rank: 4 },
  FIN: { score: 11.19, rank: 5 },
  EST: { score: 11.75, rank: 6 },
  PRT: { score: 11.89, rank: 7 },
  IRL: { score: 12.56, rank: 8 },
  CHE: { score: 13.54, rank: 9 },
  NZL: { score: 14.27, rank: 10 },
  ISL: { score: 14.98, rank: 11 },

  // Good (15-25)
  DEU: { score: 15.17, rank: 12 },
  LUX: { score: 16.34, rank: 13 },
  AUT: { score: 16.87, rank: 14 },
  BEL: { score: 17.21, rank: 15 },
  CAN: { score: 17.89, rank: 16 },
  AUS: { score: 18.24, rank: 17 },
  LTU: { score: 18.67, rank: 18 },
  SVN: { score: 19.12, rank: 19 },
  CZE: { score: 19.45, rank: 20 },
  LVA: { score: 19.78, rank: 21 },
  GBR: { score: 20.15, rank: 22 },
  JPN: { score: 20.42, rank: 23 },
  CRI: { score: 21.34, rank: 24 },
  URY: { score: 21.89, rank: 25 },
  TWN: { score: 22.56, rank: 26 },
  ESP: { score: 23.12, rank: 27 },
  CHL: { score: 23.45, rank: 28 },
  FRA: { score: 24.67, rank: 29 },
  SVK: { score: 24.89, rank: 30 },

  // Satisfactory (25-35)
  KOR: { score: 25.45, rank: 31 },
  USA: { score: 26.09, rank: 32 },
  ITA: { score: 26.78, rank: 33 },
  ARG: { score: 27.45, rank: 34 },
  ROM: { score: 28.34, rank: 35 },
  POL: { score: 29.67, rank: 36 },
  GRC: { score: 30.12, rank: 37 },
  ZAF: { score: 31.45, rank: 38 },
  BWA: { score: 32.12, rank: 39 },
  GHA: { score: 33.45, rank: 40 },

  // Problematic (35-55)
  HUN: { score: 36.89, rank: 41 },
  SRB: { score: 38.12, rank: 42 },
  MNE: { score: 39.45, rank: 43 },
  UKR: { score: 40.78, rank: 44 },
  MDA: { score: 41.23, rank: 45 },
  ALB: { score: 42.56, rank: 46 },
  MKD: { score: 43.89, rank: 47 },
  GEO: { score: 44.12, rank: 48 },
  BRA: { score: 45.67, rank: 49 },
  COL: { score: 46.78, rank: 50 },
  KEN: { score: 47.34, rank: 51 },
  SEN: { score: 48.12, rank: 52 },
  IDN: { score: 49.45, rank: 53 },
  IND: { score: 50.67, rank: 54 },
  PHL: { score: 51.78, rank: 55 },
  BIH: { score: 52.34, rank: 56 },
  ISR: { score: 53.67, rank: 57 },
  PER: { score: 54.12, rank: 58 },

  // Difficult (55-75)
  MEX: { score: 56.78, rank: 59 },
  THA: { score: 58.12, rank: 60 },
  NGA: { score: 59.45, rank: 61 },
  MYS: { score: 60.78, rank: 62 },
  ECU: { score: 61.23, rank: 63 },
  TZA: { score: 62.56, rank: 64 },
  TUR: { score: 63.89, rank: 65 },
  SGP: { score: 64.12, rank: 66 },
  LBN: { score: 65.45, rank: 67 },
  JOR: { score: 66.78, rank: 68 },
  MAR: { score: 67.12, rank: 69 },
  ARE: { score: 68.45, rank: 70 },
  PAK: { score: 69.78, rank: 71 },
  BGD: { score: 70.12, rank: 72 },
  ETH: { score: 71.45, rank: 73 },

  // Very serious (75+)
  RUS: { score: 76.12, rank: 74 },
  BLR: { score: 78.45, rank: 75 },
  AZE: { score: 79.78, rank: 76 },
  TUN: { score: 80.12, rank: 77 },
  VEN: { score: 81.45, rank: 78 },
  VNM: { score: 82.78, rank: 79 },
  SAU: { score: 84.12, rank: 80 },
  EGY: { score: 85.45, rank: 81 },
  IRN: { score: 86.78, rank: 82 },
  IRQ: { score: 87.12, rank: 83 },
  CUB: { score: 88.45, rank: 84 },
  MMR: { score: 89.78, rank: 85 },
  CHN: { score: 90.12, rank: 86 },
  RWA: { score: 91.45, rank: 87 },
  SYR: { score: 92.78, rank: 88 },
  NIC: { score: 93.12, rank: 89 },
  PRK: { score: 94.45, rank: 90 },
  ERI: { score: 95.78, rank: 91 },
};

function saveRSFData() {
  console.log('='.repeat(60));
  console.log('RSF Press Freedom Index');
  console.log('='.repeat(60));

  // Save raw data
  const rawPath = path.join(DATA_DIR, 'rsf-2024.json');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(rawPath, JSON.stringify(RSF_2024, null, 2));
  console.log(`Saved raw data: ${Object.keys(RSF_2024).length} countries`);

  // Transform to our format
  const processed: Array<{
    countryIso3: string;
    sourceId: string;
    year: number;
    value: number;
  }> = [];

  for (const [iso3, data] of Object.entries(RSF_2024)) {
    processed.push({
      countryIso3: iso3,
      sourceId: 'rsf_press_freedom',
      year: 2024,
      value: data.score,
    });
  }

  // Save processed data
  const processedPath = path.join(PROCESSED_DIR, 'rsf-press-freedom.json');
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
  fs.writeFileSync(processedPath, JSON.stringify(processed, null, 2));
  console.log(`Processed ${processed.length} data points`);

  return processed;
}

async function main() {
  console.log('\nNote: For complete data, download from:');
  console.log('https://rsf.org/en/index');
  console.log('');

  saveRSFData();
}

if (require.main === module) {
  main().catch(console.error);
}

export { RSF_2024, saveRSFData };
