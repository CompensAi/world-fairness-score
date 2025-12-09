#!/usr/bin/env npx tsx
/**
 * ITUC Global Rights Index (GRI) Fetcher
 *
 * Data source: International Trade Union Confederation
 * URL: https://www.ituc-csi.org/global-rights-index
 *
 * The GRI (1-5+) measures workers' rights violations.
 * 1 = Best (sporadic violations), 5+ = Worst (no guarantee of rights)
 *
 * We invert and normalize to 0-100 scale where higher = better.
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../data/raw');
const PROCESSED_DIR = path.join(__dirname, '../data/processed');

// ITUC GRI 2024 ratings
// Source: https://www.ituc-csi.org/global-rights-index
// Original scale: 1 (best) to 5+ (worst)
// Categories:
// 1 = Sporadic violations of rights
// 2 = Repeated violations of rights
// 3 = Regular violations of rights
// 4 = Systematic violations of rights
// 5 = No guarantee of rights
// 5+ = No guarantee of rights due to breakdown of rule of law

const ITUC_GRI_2024: Record<string, { rating: number; category: string }> = {
  // Rating 1 - Sporadic violations (best)
  DNK: { rating: 1, category: 'Sporadic violations' },
  FIN: { rating: 1, category: 'Sporadic violations' },
  NOR: { rating: 1, category: 'Sporadic violations' },
  SWE: { rating: 1, category: 'Sporadic violations' },
  ISL: { rating: 1, category: 'Sporadic violations' },
  IRL: { rating: 1, category: 'Sporadic violations' },
  NLD: { rating: 1, category: 'Sporadic violations' },
  URY: { rating: 1, category: 'Sporadic violations' },
  DEU: { rating: 1, category: 'Sporadic violations' },
  AUT: { rating: 1, category: 'Sporadic violations' },
  ITA: { rating: 1, category: 'Sporadic violations' },

  // Rating 2 - Repeated violations
  BEL: { rating: 2, category: 'Repeated violations' },
  FRA: { rating: 2, category: 'Repeated violations' },
  CAN: { rating: 2, category: 'Repeated violations' },
  JPN: { rating: 2, category: 'Repeated violations' },
  AUS: { rating: 2, category: 'Repeated violations' },
  NZL: { rating: 2, category: 'Repeated violations' },
  CHE: { rating: 2, category: 'Repeated violations' },
  ESP: { rating: 2, category: 'Repeated violations' },
  PRT: { rating: 2, category: 'Repeated violations' },
  CZE: { rating: 2, category: 'Repeated violations' },
  SVK: { rating: 2, category: 'Repeated violations' },
  SVN: { rating: 2, category: 'Repeated violations' },
  CHL: { rating: 2, category: 'Repeated violations' },
  ARG: { rating: 2, category: 'Repeated violations' },
  ZAF: { rating: 2, category: 'Repeated violations' },
  GHA: { rating: 2, category: 'Repeated violations' },
  BWA: { rating: 2, category: 'Repeated violations' },
  MUS: { rating: 2, category: 'Repeated violations' },
  JAM: { rating: 2, category: 'Repeated violations' },
  TTO: { rating: 2, category: 'Repeated violations' },

  // Rating 3 - Regular violations
  USA: { rating: 3, category: 'Regular violations' },
  GBR: { rating: 3, category: 'Regular violations' },
  POL: { rating: 3, category: 'Regular violations' },
  HUN: { rating: 3, category: 'Regular violations' },
  GRC: { rating: 3, category: 'Regular violations' },
  ROU: { rating: 3, category: 'Regular violations' },
  BGR: { rating: 3, category: 'Regular violations' },
  HRV: { rating: 3, category: 'Regular violations' },
  MKD: { rating: 3, category: 'Regular violations' },
  MEX: { rating: 3, category: 'Regular violations' },
  BRA: { rating: 3, category: 'Regular violations' },
  PER: { rating: 3, category: 'Regular violations' },
  BOL: { rating: 3, category: 'Regular violations' },
  DOM: { rating: 3, category: 'Regular violations' },
  SEN: { rating: 3, category: 'Regular violations' },
  KEN: { rating: 3, category: 'Regular violations' },
  IND: { rating: 3, category: 'Regular violations' },
  IDN: { rating: 3, category: 'Regular violations' },
  MYS: { rating: 3, category: 'Regular violations' },
  KOR: { rating: 3, category: 'Regular violations' },
  TWN: { rating: 3, category: 'Regular violations' },
  JOR: { rating: 3, category: 'Regular violations' },
  MAR: { rating: 3, category: 'Regular violations' },
  TUN: { rating: 3, category: 'Regular violations' },
  GEO: { rating: 3, category: 'Regular violations' },
  MDA: { rating: 3, category: 'Regular violations' },
  UKR: { rating: 3, category: 'Regular violations' },
  MNG: { rating: 3, category: 'Regular violations' },
  LKA: { rating: 3, category: 'Regular violations' },
  NPL: { rating: 3, category: 'Regular violations' },

  // Rating 4 - Systematic violations
  CHN: { rating: 4, category: 'Systematic violations' },
  RUS: { rating: 4, category: 'Systematic violations' },
  TUR: { rating: 4, category: 'Systematic violations' },
  IRN: { rating: 4, category: 'Systematic violations' },
  PAK: { rating: 4, category: 'Systematic violations' },
  VNM: { rating: 4, category: 'Systematic violations' },
  THA: { rating: 4, category: 'Systematic violations' },
  PHL: { rating: 4, category: 'Systematic violations' },
  COL: { rating: 4, category: 'Systematic violations' },
  GTM: { rating: 4, category: 'Systematic violations' },
  HND: { rating: 4, category: 'Systematic violations' },
  SLV: { rating: 4, category: 'Systematic violations' },
  NIC: { rating: 4, category: 'Systematic violations' },
  ECU: { rating: 4, category: 'Systematic violations' },
  PRY: { rating: 4, category: 'Systematic violations' },
  HTI: { rating: 4, category: 'Systematic violations' },
  NGA: { rating: 4, category: 'Systematic violations' },
  CIV: { rating: 4, category: 'Systematic violations' },
  CMR: { rating: 4, category: 'Systematic violations' },
  UGA: { rating: 4, category: 'Systematic violations' },
  TZA: { rating: 4, category: 'Systematic violations' },
  ETH: { rating: 4, category: 'Systematic violations' },
  ZWE: { rating: 4, category: 'Systematic violations' },
  ZMB: { rating: 4, category: 'Systematic violations' },
  MOZ: { rating: 4, category: 'Systematic violations' },
  AGO: { rating: 4, category: 'Systematic violations' },
  DZA: { rating: 4, category: 'Systematic violations' },
  EGY: { rating: 4, category: 'Systematic violations' },
  SAU: { rating: 4, category: 'Systematic violations' },
  ARE: { rating: 4, category: 'Systematic violations' },
  QAT: { rating: 4, category: 'Systematic violations' },
  KWT: { rating: 4, category: 'Systematic violations' },
  BHR: { rating: 4, category: 'Systematic violations' },
  OMN: { rating: 4, category: 'Systematic violations' },
  KAZ: { rating: 4, category: 'Systematic violations' },
  AZE: { rating: 4, category: 'Systematic violations' },
  KHM: { rating: 4, category: 'Systematic violations' },
  LAO: { rating: 4, category: 'Systematic violations' },
  BRN: { rating: 4, category: 'Systematic violations' },
  SGP: { rating: 4, category: 'Systematic violations' },
  HKG: { rating: 4, category: 'Systematic violations' },
  ARM: { rating: 4, category: 'Systematic violations' },
  SRB: { rating: 4, category: 'Systematic violations' },
  ALB: { rating: 4, category: 'Systematic violations' },
  BIH: { rating: 4, category: 'Systematic violations' },
  MNE: { rating: 4, category: 'Systematic violations' },
  LBN: { rating: 4, category: 'Systematic violations' },

  // Rating 5 - No guarantee of rights
  BGD: { rating: 5, category: 'No guarantee of rights' },
  MMR: { rating: 5, category: 'No guarantee of rights' },
  BLR: { rating: 5, category: 'No guarantee of rights' },
  VEN: { rating: 5, category: 'No guarantee of rights' },
  IRQ: { rating: 5, category: 'No guarantee of rights' },
  SDN: { rating: 5, category: 'No guarantee of rights' },
  COD: { rating: 5, category: 'No guarantee of rights' },
  SWZ: { rating: 5, category: 'No guarantee of rights' },
  TKM: { rating: 5, category: 'No guarantee of rights' },
  UZB: { rating: 5, category: 'No guarantee of rights' },
  TJK: { rating: 5, category: 'No guarantee of rights' },
  KGZ: { rating: 5, category: 'No guarantee of rights' },

  // Rating 5+ - No guarantee due to breakdown of rule of law
  AFG: { rating: 5.5, category: 'No guarantee - breakdown of rule of law' },
  SYR: { rating: 5.5, category: 'No guarantee - breakdown of rule of law' },
  YEM: { rating: 5.5, category: 'No guarantee - breakdown of rule of law' },
  LBY: { rating: 5.5, category: 'No guarantee - breakdown of rule of law' },
  SOM: { rating: 5.5, category: 'No guarantee - breakdown of rule of law' },
  SSD: { rating: 5.5, category: 'No guarantee - breakdown of rule of law' },
  CAF: { rating: 5.5, category: 'No guarantee - breakdown of rule of law' },
  ERI: { rating: 5.5, category: 'No guarantee - breakdown of rule of law' },
  PRK: { rating: 5.5, category: 'No guarantee - breakdown of rule of law' },
  CUB: { rating: 5, category: 'No guarantee of rights' },
  PSE: { rating: 5.5, category: 'No guarantee - breakdown of rule of law' },
};

/**
 * Convert ITUC rating (1-5.5) to 0-100 scale where higher = better
 * 1 -> 100, 5.5 -> 0
 */
function normalizeGRI(rating: number): number {
  // Linear transformation: 1->100, 5.5->0
  const normalized = 100 - ((rating - 1) / (5.5 - 1)) * 100;
  return Math.round(Math.max(0, Math.min(100, normalized)));
}

function saveITUCData() {
  console.log('='.repeat(60));
  console.log('ITUC Global Rights Index 2024');
  console.log('='.repeat(60));

  // Save raw data
  const rawPath = path.join(DATA_DIR, 'ituc-gri-2024.json');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(rawPath, JSON.stringify(ITUC_GRI_2024, null, 2));
  console.log(`Saved raw data: ${Object.keys(ITUC_GRI_2024).length} countries`);

  // Process data - normalize to 0-100 scale
  const processed: Array<{
    countryIso3: string;
    sourceId: string;
    year: number;
    value: number;
    originalRating: number;
    category: string;
  }> = [];

  for (const [iso3, data] of Object.entries(ITUC_GRI_2024)) {
    processed.push({
      countryIso3: iso3,
      sourceId: 'ituc_gri',
      year: 2024,
      value: normalizeGRI(data.rating),
      originalRating: data.rating,
      category: data.category,
    });
  }

  // Save processed data
  const processedPath = path.join(PROCESSED_DIR, 'ituc-gri.json');
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
  fs.writeFileSync(processedPath, JSON.stringify(processed, null, 2));
  console.log(`Processed ${processed.length} data points`);

  // Print summary by category
  console.log('\nCountries by rating category:');
  const categories = new Map<string, number>();
  for (const data of Object.values(ITUC_GRI_2024)) {
    categories.set(data.category, (categories.get(data.category) || 0) + 1);
  }
  for (const [category, count] of categories) {
    console.log(`  ${category}: ${count} countries`);
  }

  // Print best and worst
  console.log('\nBest workers\' rights (Rating 1):');
  const rating1 = Object.entries(ITUC_GRI_2024)
    .filter(([_, d]) => d.rating === 1)
    .map(([iso]) => iso);
  console.log(`  ${rating1.join(', ')}`);

  console.log('\nWorst workers\' rights (Rating 5+):');
  const rating5plus = Object.entries(ITUC_GRI_2024)
    .filter(([_, d]) => d.rating >= 5)
    .map(([iso]) => iso);
  console.log(`  ${rating5plus.join(', ')}`);

  return processed;
}

async function main() {
  console.log('\nSource: International Trade Union Confederation');
  console.log('Index: Global Rights Index 2024');
  console.log('Original Scale: 1 (best) to 5+ (worst)');
  console.log('Normalized Scale: 0-100 (higher = better)');
  console.log('License: Public\n');

  saveITUCData();
}

if (require.main === module) {
  main().catch(console.error);
}

export { ITUC_GRI_2024, saveITUCData, normalizeGRI };
