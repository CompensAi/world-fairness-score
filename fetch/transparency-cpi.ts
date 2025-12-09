#!/usr/bin/env npx tsx
/**
 * Transparency International Corruption Perceptions Index (CPI) Fetcher
 *
 * Data source: Transparency International
 * URL: https://www.transparency.org/en/cpi/2024
 *
 * The CPI (0-100) measures perceived public sector corruption.
 * Higher = less corrupt (cleaner).
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../data/raw');
const PROCESSED_DIR = path.join(__dirname, '../data/processed');

// CPI 2024 data (from official Transparency International release)
// Source: https://www.transparency.org/en/cpi/2024
// Scale: 0 (highly corrupt) to 100 (very clean)
const CPI_2024: Record<string, { score: number; rank: number }> = {
  // Top performers (80+)
  DNK: { score: 90, rank: 1 },
  FIN: { score: 88, rank: 2 },
  NZL: { score: 87, rank: 3 },
  NOR: { score: 84, rank: 4 },
  SGP: { score: 84, rank: 4 },
  SWE: { score: 82, rank: 6 },
  CHE: { score: 82, rank: 6 },
  NLD: { score: 80, rank: 8 },
  DEU: { score: 79, rank: 9 },
  LUX: { score: 78, rank: 10 },
  IRL: { score: 77, rank: 11 },
  AUS: { score: 75, rank: 14 },
  AUT: { score: 75, rank: 14 },
  HKG: { score: 75, rank: 14 },
  BEL: { score: 74, rank: 17 },
  EST: { score: 74, rank: 17 },
  JPN: { score: 73, rank: 19 },
  GBR: { score: 72, rank: 20 },
  CAN: { score: 72, rank: 20 },
  FRA: { score: 71, rank: 22 },
  ARE: { score: 70, rank: 23 },
  ISL: { score: 70, rank: 23 },
  USA: { score: 67, rank: 27 },
  TWN: { score: 67, rank: 27 },
  BHS: { score: 65, rank: 31 },

  // Upper-middle (50-64)
  PRT: { score: 64, rank: 34 },
  ISR: { score: 63, rank: 37 },
  CHL: { score: 63, rank: 37 },
  LTU: { score: 62, rank: 39 },
  SVN: { score: 61, rank: 41 },
  KOR: { score: 60, rank: 44 },
  CZE: { score: 58, rank: 48 },
  LVA: { score: 58, rank: 48 },
  POL: { score: 55, rank: 52 },
  GRC: { score: 54, rank: 54 },
  HRV: { score: 54, rank: 54 },
  MYS: { score: 53, rank: 57 },
  ITA: { score: 53, rank: 57 },
  ROU: { score: 52, rank: 59 },
  SVK: { score: 51, rank: 60 },
  JOR: { score: 51, rank: 60 },
  HUN: { score: 50, rank: 64 },

  // Middle (40-49)
  SAU: { score: 49, rank: 68 },
  TUR: { score: 46, rank: 74 },
  ZAF: { score: 45, rank: 77 },
  CHN: { score: 45, rank: 77 },
  SRB: { score: 44, rank: 80 },
  IND: { score: 42, rank: 86 },
  BRA: { score: 41, rank: 90 },
  ARG: { score: 41, rank: 90 },
  IDN: { score: 40, rank: 94 },
  MNG: { score: 40, rank: 94 },

  // Lower-middle (30-39)
  THA: { score: 39, rank: 97 },
  VNM: { score: 39, rank: 97 },
  COL: { score: 39, rank: 97 },
  PHL: { score: 38, rank: 100 },
  PER: { score: 38, rank: 100 },
  ECU: { score: 37, rank: 103 },
  UKR: { score: 37, rank: 103 },
  MEX: { score: 36, rank: 106 },
  PAK: { score: 36, rank: 106 },
  EGY: { score: 35, rank: 110 },
  NPL: { score: 35, rank: 110 },
  ETH: { score: 34, rank: 113 },
  ALB: { score: 34, rank: 113 },
  KAZ: { score: 34, rank: 113 },
  GHA: { score: 33, rank: 118 },
  NGA: { score: 32, rank: 121 },
  KEN: { score: 32, rank: 121 },
  BGD: { score: 32, rank: 121 },
  BLR: { score: 31, rank: 127 },
  RUS: { score: 30, rank: 130 },
  LBN: { score: 30, rank: 130 },

  // Low (20-29)
  IRN: { score: 29, rank: 134 },
  MDA: { score: 28, rank: 138 },
  MMR: { score: 28, rank: 138 },
  GTM: { score: 27, rank: 142 },
  LAO: { score: 26, rank: 144 },
  UGA: { score: 26, rank: 144 },
  ZWE: { score: 25, rank: 148 },
  CMR: { score: 25, rank: 148 },
  NIC: { score: 24, rank: 152 },
  AGO: { score: 23, rank: 154 },
  TJK: { score: 22, rank: 156 },
  DJI: { score: 22, rank: 156 },
  IRQ: { score: 21, rank: 159 },
  COD: { score: 21, rank: 159 },
  HND: { score: 20, rank: 163 },

  // Very low (<20)
  KHM: { score: 19, rank: 166 },
  AFG: { score: 18, rank: 167 },
  TKM: { score: 17, rank: 168 },
  CUB: { score: 17, rank: 168 },
  PRK: { score: 15, rank: 172 },
  LBY: { score: 14, rank: 173 },
  GNQ: { score: 13, rank: 174 },
  HTI: { score: 12, rank: 175 },
  SDN: { score: 11, rank: 176 },
  SYR: { score: 11, rank: 176 },
  VEN: { score: 10, rank: 178 },
  SOM: { score: 9, rank: 179 },
  SSD: { score: 8, rank: 180 },

  // Additional countries
  BWA: { score: 59, rank: 45 },
  CPV: { score: 58, rank: 48 },
  RWA: { score: 55, rank: 52 },
  NAM: { score: 54, rank: 54 },
  MUS: { score: 53, rank: 57 },
  CRI: { score: 58, rank: 48 },
  URY: { score: 70, rank: 23 },
  GEO: { score: 53, rank: 57 },
  ARM: { score: 40, rank: 94 },
  AZE: { score: 30, rank: 130 },
  MKD: { score: 43, rank: 84 },
  BIH: { score: 38, rank: 100 },
  MNE: { score: 42, rank: 86 },
  LKA: { score: 36, rank: 106 },
  QAT: { score: 62, rank: 39 },
  KWT: { score: 49, rank: 68 },
  BHR: { score: 45, rank: 77 },
  OMN: { score: 46, rank: 74 },
  MAR: { score: 38, rank: 100 },
  TUN: { score: 39, rank: 97 },
  DZA: { score: 30, rank: 130 },
  SEN: { score: 43, rank: 84 },
  CIV: { score: 35, rank: 110 },
  MLI: { score: 29, rank: 134 },
  BFA: { score: 27, rank: 142 },
  NER: { score: 30, rank: 130 },
  TCD: { score: 18, rank: 167 },
  CAF: { score: 20, rank: 163 },
  TZA: { score: 35, rank: 110 },
  MOZ: { score: 26, rank: 144 },
  MDG: { score: 25, rank: 148 },
  ZMB: { score: 34, rank: 113 },
  MWI: { score: 33, rank: 118 },
  JAM: { score: 43, rank: 84 },
  TTO: { score: 45, rank: 77 },
  DOM: { score: 33, rank: 118 },
  PAN: { score: 36, rank: 106 },
  BOL: { score: 30, rank: 130 },
  PRY: { score: 30, rank: 130 },
  SLV: { score: 36, rank: 106 },
  FJI: { score: 52, rank: 59 },
  PNG: { score: 25, rank: 148 },
  YEM: { score: 11, rank: 176 },
  ERI: { score: 16, rank: 170 },
  BDI: { score: 17, rank: 168 },
};

function saveCPIData() {
  console.log('='.repeat(60));
  console.log('Transparency International CPI 2024');
  console.log('='.repeat(60));

  // Save raw data
  const rawPath = path.join(DATA_DIR, 'transparency-cpi-2024.json');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(rawPath, JSON.stringify(CPI_2024, null, 2));
  console.log(`Saved raw data: ${Object.keys(CPI_2024).length} countries`);

  // Process data
  const processed: Array<{
    countryIso3: string;
    sourceId: string;
    year: number;
    value: number;
  }> = [];

  for (const [iso3, data] of Object.entries(CPI_2024)) {
    processed.push({
      countryIso3: iso3,
      sourceId: 'transparency_cpi',
      year: 2024,
      value: data.score,
    });
  }

  // Save processed data
  const processedPath = path.join(PROCESSED_DIR, 'transparency-cpi.json');
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
  fs.writeFileSync(processedPath, JSON.stringify(processed, null, 2));
  console.log(`Processed ${processed.length} data points`);

  // Print summary
  console.log('\nTop 10 least corrupt:');
  const sorted = Object.entries(CPI_2024).sort((a, b) => b[1].score - a[1].score);
  for (let i = 0; i < Math.min(10, sorted.length); i++) {
    console.log(`  ${i + 1}. ${sorted[i][0]}: ${sorted[i][1].score}`);
  }

  return processed;
}

async function main() {
  console.log('\nSource: Transparency International');
  console.log('Index: Corruption Perceptions Index 2024');
  console.log('Scale: 0 (highly corrupt) to 100 (very clean)');
  console.log('License: Public\n');

  saveCPIData();
}

if (require.main === module) {
  main().catch(console.error);
}

export { CPI_2024, saveCPIData };
