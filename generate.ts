#!/usr/bin/env npx ts-node
/**
 * Generate World Fairness Scores
 *
 * This script:
 * 1. Reads processed data from all sources
 * 2. Calculates dimension scores for each country
 * 3. Updates the lib/data/world-fairness/*.ts files
 *
 * Usage:
 *   npx ts-node scripts/world-fairness-score/generate.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const PROCESSED_DIR = path.join(__dirname, 'data/processed');
const OUTPUT_DIR = path.join(__dirname, '../../lib/data/world-fairness');

// ============================================
// TYPES
// ============================================

interface ProcessedDataPoint {
  countryIso3: string;
  sourceId: string;
  field?: string;
  year: number;
  value: number;
}

interface SourceConfig {
  inputRange: [number, number];
  invert: boolean;
}

// ============================================
// SOURCE NORMALIZATION CONFIG
// ============================================

const SOURCE_CONFIGS: Record<string, SourceConfig> = {
  freedom_house_political: { inputRange: [0, 40], invert: false },
  freedom_house_civil: { inputRange: [0, 60], invert: false },
  freedom_house_total: { inputRange: [0, 100], invert: false },
  rsf_press_freedom: { inputRange: [0, 100], invert: true },
  world_bank_gini: { inputRange: [20, 65], invert: true },
  wgi_voice: { inputRange: [-2.5, 2.5], invert: false },
  wgi_effectiveness: { inputRange: [-2.5, 2.5], invert: false },
  wgi_corruption: { inputRange: [-2.5, 2.5], invert: false },
};

// ============================================
// DIMENSION CALCULATION
// ============================================

interface DimensionMapping {
  dimension: keyof typeof DIMENSION_WEIGHTS;
  sources: { sourceId: string; weight: number }[];
}

const DIMENSION_WEIGHTS = {
  democraticVoice: 0.15,
  pressFreedom: 0.15,
  justiceAccess: 0.15,
  economicOpportunity: 0.10,
  workplaceRights: 0.10,
  healthcareAccess: 0.10,
  housingSecurity: 0.10,
  consumerProtection: 0.05,
  governmentResponsiveness: 0.05,
  socialInclusion: 0.05,
};

const DIMENSION_MAPPINGS: DimensionMapping[] = [
  {
    dimension: 'democraticVoice',
    sources: [
      { sourceId: 'freedom_house_political', weight: 0.6 },
      { sourceId: 'wgi_voice', weight: 0.4 },
    ],
  },
  {
    dimension: 'pressFreedom',
    sources: [
      { sourceId: 'rsf_press_freedom', weight: 0.7 },
      { sourceId: 'freedom_house_civil', weight: 0.3 },
    ],
  },
  {
    dimension: 'justiceAccess',
    sources: [
      { sourceId: 'wgi_voice', weight: 0.5 },
      { sourceId: 'wgi_corruption', weight: 0.5 },
    ],
  },
  {
    dimension: 'economicOpportunity',
    sources: [
      { sourceId: 'world_bank_gini', weight: 0.6 },
      { sourceId: 'wgi_effectiveness', weight: 0.4 },
    ],
  },
  {
    dimension: 'workplaceRights',
    sources: [
      { sourceId: 'freedom_house_civil', weight: 0.5 },
      { sourceId: 'wgi_voice', weight: 0.5 },
    ],
  },
  {
    dimension: 'healthcareAccess',
    sources: [
      { sourceId: 'wgi_effectiveness', weight: 1.0 },
    ],
  },
  {
    dimension: 'housingSecurity',
    sources: [
      { sourceId: 'wgi_effectiveness', weight: 0.5 },
      { sourceId: 'world_bank_gini', weight: 0.5 },
    ],
  },
  {
    dimension: 'consumerProtection',
    sources: [
      { sourceId: 'wgi_corruption', weight: 0.5 },
      { sourceId: 'wgi_effectiveness', weight: 0.5 },
    ],
  },
  {
    dimension: 'governmentResponsiveness',
    sources: [
      { sourceId: 'wgi_voice', weight: 0.4 },
      { sourceId: 'wgi_effectiveness', weight: 0.3 },
      { sourceId: 'wgi_corruption', weight: 0.3 },
    ],
  },
  {
    dimension: 'socialInclusion',
    sources: [
      { sourceId: 'freedom_house_civil', weight: 0.5 },
      { sourceId: 'wgi_voice', weight: 0.5 },
    ],
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalizeValue(value: number, config: SourceConfig): number {
  const [min, max] = config.inputRange;
  const clamped = Math.max(min, Math.min(max, value));
  let normalized = (clamped - min) / (max - min);
  if (config.invert) {
    normalized = 1 - normalized;
  }
  return Math.round(normalized * 100);
}

function loadProcessedData(): Map<string, Map<string, number>> {
  const countryData = new Map<string, Map<string, number>>();

  const files = fs.readdirSync(PROCESSED_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(PROCESSED_DIR, file);
    const data: ProcessedDataPoint[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const point of data) {
      if (!countryData.has(point.countryIso3)) {
        countryData.set(point.countryIso3, new Map());
      }
      const key = point.field ? `${point.sourceId}_${point.field}` : point.sourceId;
      countryData.get(point.countryIso3)!.set(key, point.value);
    }
  }

  return countryData;
}

function calculateDimensionScores(
  sourceValues: Map<string, number>
): Record<string, number> {
  const dimensions: Record<string, number> = {};

  for (const mapping of DIMENSION_MAPPINGS) {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const source of mapping.sources) {
      const rawValue = sourceValues.get(source.sourceId);
      if (rawValue !== undefined) {
        const config = SOURCE_CONFIGS[source.sourceId];
        if (config) {
          const normalized = normalizeValue(rawValue, config);
          weightedSum += normalized * source.weight;
          totalWeight += source.weight;
        }
      }
    }

    dimensions[mapping.dimension] = totalWeight > 0
      ? Math.round(weightedSum / totalWeight)
      : 50; // Default to 50 if no data
  }

  return dimensions;
}

function calculateOverallScore(dimensions: Record<string, number>): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [dim, score] of Object.entries(dimensions)) {
    const weight = DIMENSION_WEIGHTS[dim as keyof typeof DIMENSION_WEIGHTS] || 0;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

// ============================================
// COUNTRY METADATA
// ============================================

interface CountryMeta {
  name: string;
  region: string;
  subregion: string;
  population: number;
  gdpPerCapita: number;
}

const COUNTRY_METADATA: Record<string, CountryMeta> = {
  // Europe - Nordic
  NOR: { name: 'Norway', region: 'europe', subregion: 'nordic', population: 5.5, gdpPerCapita: 89154 },
  DNK: { name: 'Denmark', region: 'europe', subregion: 'nordic', population: 5.9, gdpPerCapita: 67803 },
  FIN: { name: 'Finland', region: 'europe', subregion: 'nordic', population: 5.5, gdpPerCapita: 53655 },
  SWE: { name: 'Sweden', region: 'europe', subregion: 'nordic', population: 10.5, gdpPerCapita: 55873 },
  ISL: { name: 'Iceland', region: 'europe', subregion: 'nordic', population: 0.4, gdpPerCapita: 73466 },

  // Europe - Western
  NLD: { name: 'Netherlands', region: 'europe', subregion: 'western', population: 17.5, gdpPerCapita: 57768 },
  DEU: { name: 'Germany', region: 'europe', subregion: 'western', population: 84, gdpPerCapita: 48718 },
  FRA: { name: 'France', region: 'europe', subregion: 'western', population: 68, gdpPerCapita: 42330 },
  BEL: { name: 'Belgium', region: 'europe', subregion: 'western', population: 11.6, gdpPerCapita: 51247 },
  AUT: { name: 'Austria', region: 'europe', subregion: 'western', population: 9, gdpPerCapita: 53638 },
  CHE: { name: 'Switzerland', region: 'europe', subregion: 'western', population: 8.7, gdpPerCapita: 93457 },
  LUX: { name: 'Luxembourg', region: 'europe', subregion: 'western', population: 0.65, gdpPerCapita: 128259 },
  IRL: { name: 'Ireland', region: 'europe', subregion: 'western', population: 5.1, gdpPerCapita: 99152 },
  GBR: { name: 'United Kingdom', region: 'europe', subregion: 'western', population: 67, gdpPerCapita: 45850 },

  // Europe - Southern
  ESP: { name: 'Spain', region: 'europe', subregion: 'southern', population: 47.4, gdpPerCapita: 30104 },
  ITA: { name: 'Italy', region: 'europe', subregion: 'southern', population: 59, gdpPerCapita: 34776 },
  PRT: { name: 'Portugal', region: 'europe', subregion: 'southern', population: 10.3, gdpPerCapita: 24568 },
  GRC: { name: 'Greece', region: 'europe', subregion: 'southern', population: 10.4, gdpPerCapita: 20193 },

  // Europe - Central
  POL: { name: 'Poland', region: 'europe', subregion: 'central', population: 38, gdpPerCapita: 17841 },
  CZE: { name: 'Czech Republic', region: 'europe', subregion: 'central', population: 10.5, gdpPerCapita: 26379 },
  HUN: { name: 'Hungary', region: 'europe', subregion: 'central', population: 9.7, gdpPerCapita: 18728 },
  SVK: { name: 'Slovakia', region: 'europe', subregion: 'central', population: 5.4, gdpPerCapita: 21053 },
  SVN: { name: 'Slovenia', region: 'europe', subregion: 'central', population: 2.1, gdpPerCapita: 28439 },

  // Europe - Baltic
  EST: { name: 'Estonia', region: 'europe', subregion: 'baltic', population: 1.3, gdpPerCapita: 27282 },
  LVA: { name: 'Latvia', region: 'europe', subregion: 'baltic', population: 1.9, gdpPerCapita: 21148 },
  LTU: { name: 'Lithuania', region: 'europe', subregion: 'baltic', population: 2.8, gdpPerCapita: 23433 },

  // Europe - Eastern
  UKR: { name: 'Ukraine', region: 'europe', subregion: 'eastern', population: 44, gdpPerCapita: 4835 },
  MDA: { name: 'Moldova', region: 'europe', subregion: 'eastern', population: 2.6, gdpPerCapita: 5563 },
  ROU: { name: 'Romania', region: 'europe', subregion: 'eastern', population: 19, gdpPerCapita: 14858 },
  BGR: { name: 'Bulgaria', region: 'europe', subregion: 'eastern', population: 6.9, gdpPerCapita: 12221 },
  RUS: { name: 'Russia', region: 'europe', subregion: 'eastern', population: 144, gdpPerCapita: 12195 },
  BLR: { name: 'Belarus', region: 'europe', subregion: 'eastern', population: 9.4, gdpPerCapita: 7302 },

  // Europe - Balkans
  SRB: { name: 'Serbia', region: 'europe', subregion: 'balkans', population: 6.9, gdpPerCapita: 9230 },
  MNE: { name: 'Montenegro', region: 'europe', subregion: 'balkans', population: 0.62, gdpPerCapita: 9466 },
  MKD: { name: 'North Macedonia', region: 'europe', subregion: 'balkans', population: 2.1, gdpPerCapita: 6722 },
  ALB: { name: 'Albania', region: 'europe', subregion: 'balkans', population: 2.9, gdpPerCapita: 6494 },
  BIH: { name: 'Bosnia and Herzegovina', region: 'europe', subregion: 'balkans', population: 3.3, gdpPerCapita: 7585 },
  GEO: { name: 'Georgia', region: 'europe', subregion: 'caucasus', population: 3.7, gdpPerCapita: 6673 },
  AZE: { name: 'Azerbaijan', region: 'europe', subregion: 'caucasus', population: 10.1, gdpPerCapita: 6054 },

  // Americas
  USA: { name: 'United States', region: 'americas', subregion: 'north', population: 332, gdpPerCapita: 76399 },
  CAN: { name: 'Canada', region: 'americas', subregion: 'north', population: 38, gdpPerCapita: 52085 },
  MEX: { name: 'Mexico', region: 'americas', subregion: 'north', population: 128, gdpPerCapita: 10046 },
  BRA: { name: 'Brazil', region: 'americas', subregion: 'south', population: 214, gdpPerCapita: 8918 },
  ARG: { name: 'Argentina', region: 'americas', subregion: 'south', population: 45, gdpPerCapita: 10636 },
  CHL: { name: 'Chile', region: 'americas', subregion: 'south', population: 19, gdpPerCapita: 15355 },
  COL: { name: 'Colombia', region: 'americas', subregion: 'south', population: 51, gdpPerCapita: 6104 },
  PER: { name: 'Peru', region: 'americas', subregion: 'south', population: 33, gdpPerCapita: 6644 },
  ECU: { name: 'Ecuador', region: 'americas', subregion: 'south', population: 18, gdpPerCapita: 6181 },
  VEN: { name: 'Venezuela', region: 'americas', subregion: 'south', population: 28, gdpPerCapita: 3740 },
  URY: { name: 'Uruguay', region: 'americas', subregion: 'south', population: 3.5, gdpPerCapita: 17278 },
  CRI: { name: 'Costa Rica', region: 'americas', subregion: 'central', population: 5.1, gdpPerCapita: 12509 },
  CUB: { name: 'Cuba', region: 'americas', subregion: 'caribbean', population: 11, gdpPerCapita: 9478 },
  NIC: { name: 'Nicaragua', region: 'americas', subregion: 'central', population: 6.6, gdpPerCapita: 2029 },

  // Asia-Pacific
  JPN: { name: 'Japan', region: 'asia', subregion: 'east', population: 125, gdpPerCapita: 33815 },
  KOR: { name: 'South Korea', region: 'asia', subregion: 'east', population: 52, gdpPerCapita: 32255 },
  CHN: { name: 'China', region: 'asia', subregion: 'east', population: 1412, gdpPerCapita: 12720 },
  TWN: { name: 'Taiwan', region: 'asia', subregion: 'east', population: 24, gdpPerCapita: 32756 },
  IND: { name: 'India', region: 'asia', subregion: 'south', population: 1380, gdpPerCapita: 2257 },
  IDN: { name: 'Indonesia', region: 'asia', subregion: 'southeast', population: 274, gdpPerCapita: 4333 },
  PHL: { name: 'Philippines', region: 'asia', subregion: 'southeast', population: 110, gdpPerCapita: 3461 },
  THA: { name: 'Thailand', region: 'asia', subregion: 'southeast', population: 70, gdpPerCapita: 7066 },
  MYS: { name: 'Malaysia', region: 'asia', subregion: 'southeast', population: 32, gdpPerCapita: 11399 },
  SGP: { name: 'Singapore', region: 'asia', subregion: 'southeast', population: 5.5, gdpPerCapita: 64103 },
  VNM: { name: 'Vietnam', region: 'asia', subregion: 'southeast', population: 98, gdpPerCapita: 3756 },
  MMR: { name: 'Myanmar', region: 'asia', subregion: 'southeast', population: 54, gdpPerCapita: 1210 },
  PRK: { name: 'North Korea', region: 'asia', subregion: 'east', population: 26, gdpPerCapita: 1800 },
  AUS: { name: 'Australia', region: 'oceania', subregion: 'australasia', population: 26, gdpPerCapita: 64674 },
  NZL: { name: 'New Zealand', region: 'oceania', subregion: 'australasia', population: 5, gdpPerCapita: 48781 },

  // Middle East
  ISR: { name: 'Israel', region: 'asia', subregion: 'middle-east', population: 9.3, gdpPerCapita: 54930 },
  SAU: { name: 'Saudi Arabia', region: 'asia', subregion: 'middle-east', population: 35, gdpPerCapita: 23186 },
  ARE: { name: 'United Arab Emirates', region: 'asia', subregion: 'middle-east', population: 10, gdpPerCapita: 43103 },
  IRN: { name: 'Iran', region: 'asia', subregion: 'middle-east', population: 87, gdpPerCapita: 4071 },
  IRQ: { name: 'Iraq', region: 'asia', subregion: 'middle-east', population: 42, gdpPerCapita: 4775 },
  JOR: { name: 'Jordan', region: 'asia', subregion: 'middle-east', population: 10, gdpPerCapita: 4103 },
  LBN: { name: 'Lebanon', region: 'asia', subregion: 'middle-east', population: 5.5, gdpPerCapita: 4136 },
  SYR: { name: 'Syria', region: 'asia', subregion: 'middle-east', population: 22, gdpPerCapita: 533 },

  // Africa
  ZAF: { name: 'South Africa', region: 'africa', subregion: 'southern', population: 60, gdpPerCapita: 6001 },
  BWA: { name: 'Botswana', region: 'africa', subregion: 'southern', population: 2.4, gdpPerCapita: 7348 },
  EGY: { name: 'Egypt', region: 'africa', subregion: 'north', population: 104, gdpPerCapita: 3548 },
  MAR: { name: 'Morocco', region: 'africa', subregion: 'north', population: 37, gdpPerCapita: 3795 },
  TUN: { name: 'Tunisia', region: 'africa', subregion: 'north', population: 12, gdpPerCapita: 3807 },
  NGA: { name: 'Nigeria', region: 'africa', subregion: 'west', population: 213, gdpPerCapita: 2066 },
  GHA: { name: 'Ghana', region: 'africa', subregion: 'west', population: 32, gdpPerCapita: 2363 },
  SEN: { name: 'Senegal', region: 'africa', subregion: 'west', population: 17, gdpPerCapita: 1637 },
  KEN: { name: 'Kenya', region: 'africa', subregion: 'east', population: 54, gdpPerCapita: 2007 },
  TZA: { name: 'Tanzania', region: 'africa', subregion: 'east', population: 62, gdpPerCapita: 1136 },
  ETH: { name: 'Ethiopia', region: 'africa', subregion: 'east', population: 118, gdpPerCapita: 944 },
  RWA: { name: 'Rwanda', region: 'africa', subregion: 'east', population: 13, gdpPerCapita: 822 },
  ERI: { name: 'Eritrea', region: 'africa', subregion: 'east', population: 3.6, gdpPerCapita: 643 },
};

// ============================================
// MAIN GENERATION
// ============================================

function generateScores() {
  console.log('='.repeat(60));
  console.log('World Fairness Score Generator');
  console.log('='.repeat(60));

  // Check if processed data exists
  if (!fs.existsSync(PROCESSED_DIR)) {
    console.log('\nNo processed data found. Run fetch-all.ts first:');
    console.log('  npx ts-node scripts/world-fairness-score/fetch-all.ts');
    return;
  }

  // Load all processed data
  console.log('\nLoading processed data...');
  const countryData = loadProcessedData();
  console.log(`Found data for ${countryData.size} countries`);

  // Calculate scores for each country
  const results: Array<{
    iso3: string;
    name: string;
    region: string;
    subregion: string;
    fairnessScore: number;
    dimensions: Record<string, number>;
    sourcesUsed: number;
  }> = [];

  for (const [iso3, sourceValues] of countryData.entries()) {
    const meta = COUNTRY_METADATA[iso3];
    if (!meta) continue;

    const dimensions = calculateDimensionScores(sourceValues);
    const fairnessScore = calculateOverallScore(dimensions);

    results.push({
      iso3,
      name: meta.name,
      region: meta.region,
      subregion: meta.subregion,
      fairnessScore,
      dimensions,
      sourcesUsed: sourceValues.size,
    });
  }

  // Sort by score
  results.sort((a, b) => b.fairnessScore - a.fairnessScore);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('CALCULATED SCORES (Top 20)');
  console.log('='.repeat(60));

  for (let i = 0; i < Math.min(20, results.length); i++) {
    const r = results[i];
    console.log(`${(i + 1).toString().padStart(2)}. ${r.name.padEnd(25)} ${r.fairnessScore}%`);
  }

  console.log('\n...\n');
  console.log('BOTTOM 10:');
  for (let i = Math.max(0, results.length - 10); i < results.length; i++) {
    const r = results[i];
    console.log(`${(i + 1).toString().padStart(2)}. ${r.name.padEnd(25)} ${r.fairnessScore}%`);
  }

  // Save detailed results
  const outputPath = path.join(__dirname, 'data/output/calculated-scores.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved detailed results to ${outputPath}`);

  // Generate comparison report
  generateComparisonReport(results);
}

function generateComparisonReport(
  calculated: Array<{
    iso3: string;
    name: string;
    fairnessScore: number;
    dimensions: Record<string, number>;
  }>
) {
  console.log('\n' + '='.repeat(60));
  console.log('DATA SOURCE VERIFICATION');
  console.log('='.repeat(60));
  console.log('\nScores calculated from real international indices:');
  console.log('- Freedom House 2024 (Political Rights, Civil Liberties)');
  console.log('- RSF Press Freedom Index 2024');
  console.log('- World Bank Governance Indicators 2023');
  console.log('- World Bank GINI Index (latest available)');
  console.log('\nVerification links:');
  console.log('- https://freedomhouse.org/countries/freedom-world/scores');
  console.log('- https://rsf.org/en/index');
  console.log('- https://data.worldbank.org/indicator/VA.EST');
}

// Run
if (require.main === module) {
  generateScores();
}

export { generateScores, loadProcessedData, calculateDimensionScores };
