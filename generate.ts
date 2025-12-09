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

const SOURCE_CONFIGS: Record<string, SourceConfig & { name: string; url: string }> = {
  // Freedom House
  freedom_house_political: {
    inputRange: [0, 40], invert: false,
    name: 'Freedom House Political Rights',
    url: 'https://freedomhouse.org/report/freedom-world'
  },
  freedom_house_civil: {
    inputRange: [0, 60], invert: false,
    name: 'Freedom House Civil Liberties',
    url: 'https://freedomhouse.org/report/freedom-world'
  },
  freedom_house_total: {
    inputRange: [0, 100], invert: false,
    name: 'Freedom House Total Score',
    url: 'https://freedomhouse.org/report/freedom-world'
  },
  // RSF
  rsf_press_freedom: {
    inputRange: [0, 100], invert: true,
    name: 'RSF Press Freedom Index',
    url: 'https://rsf.org/en/index'
  },
  // World Bank
  world_bank_gini: {
    inputRange: [20, 65], invert: true,
    name: 'World Bank GINI Index',
    url: 'https://data.worldbank.org/indicator/SI.POV.GINI'
  },
  wgi_voice: {
    inputRange: [-2.5, 2.5], invert: false,
    name: 'World Bank Voice & Accountability',
    url: 'https://data.worldbank.org/indicator/VA.EST'
  },
  wgi_effectiveness: {
    inputRange: [-2.5, 2.5], invert: false,
    name: 'World Bank Government Effectiveness',
    url: 'https://data.worldbank.org/indicator/GE.EST'
  },
  wgi_corruption: {
    inputRange: [-2.5, 2.5], invert: false,
    name: 'World Bank Control of Corruption',
    url: 'https://data.worldbank.org/indicator/CC.EST'
  },
  // NEW SOURCES
  who_uhc_index: {
    inputRange: [0, 100], invert: false,
    name: 'WHO UHC Service Coverage Index',
    url: 'https://data.who.int/indicators/i/3805B1E'
  },
  transparency_cpi: {
    inputRange: [0, 100], invert: false,
    name: 'Transparency International CPI',
    url: 'https://www.transparency.org/en/cpi/2024'
  },
  ituc_gri: {
    inputRange: [0, 100], invert: false, // Already normalized in fetcher
    name: 'ITUC Global Rights Index',
    url: 'https://www.ituc-csi.org/global-rights-index'
  },
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
      { sourceId: 'freedom_house_political', weight: 0.5 },
      { sourceId: 'wgi_voice', weight: 0.5 },
      // TODO: Add V-Dem Electoral Democracy Index
    ],
  },
  {
    dimension: 'pressFreedom',
    sources: [
      { sourceId: 'rsf_press_freedom', weight: 0.7 },
      { sourceId: 'freedom_house_civil', weight: 0.3 },
      // TODO: Add V-Dem Freedom of Expression
    ],
  },
  {
    dimension: 'justiceAccess',
    sources: [
      { sourceId: 'wgi_corruption', weight: 0.4 },
      { sourceId: 'transparency_cpi', weight: 0.4 },
      { sourceId: 'wgi_voice', weight: 0.2 },
      // TODO: Add WJP Rule of Law Index
    ],
  },
  {
    dimension: 'economicOpportunity',
    sources: [
      { sourceId: 'world_bank_gini', weight: 0.6 },
      { sourceId: 'wgi_effectiveness', weight: 0.4 },
      // TODO: Add UNDP HDI
    ],
  },
  {
    dimension: 'workplaceRights',
    sources: [
      { sourceId: 'ituc_gri', weight: 0.6 },
      { sourceId: 'freedom_house_civil', weight: 0.2 },
      { sourceId: 'wgi_voice', weight: 0.2 },
    ],
  },
  {
    dimension: 'healthcareAccess',
    sources: [
      { sourceId: 'who_uhc_index', weight: 0.7 },
      { sourceId: 'wgi_effectiveness', weight: 0.3 },
    ],
  },
  {
    dimension: 'housingSecurity',
    sources: [
      { sourceId: 'wgi_effectiveness', weight: 0.4 },
      { sourceId: 'world_bank_gini', weight: 0.4 },
      { sourceId: 'transparency_cpi', weight: 0.2 },
      // Note: No dedicated housing index available with open data
    ],
  },
  {
    dimension: 'consumerProtection',
    sources: [
      { sourceId: 'transparency_cpi', weight: 0.5 },
      { sourceId: 'wgi_corruption', weight: 0.3 },
      { sourceId: 'wgi_effectiveness', weight: 0.2 },
    ],
  },
  {
    dimension: 'governmentResponsiveness',
    sources: [
      { sourceId: 'wgi_voice', weight: 0.35 },
      { sourceId: 'wgi_effectiveness', weight: 0.35 },
      { sourceId: 'transparency_cpi', weight: 0.3 },
    ],
  },
  {
    dimension: 'socialInclusion',
    sources: [
      { sourceId: 'freedom_house_civil', weight: 0.5 },
      { sourceId: 'wgi_voice', weight: 0.5 },
      // TODO: Add UNDP Gender Inequality Index
    ],
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

// Generate key facts based on scores
function generateKeyFacts(score: number, dimensions: Record<string, number>, name: string): string[] {
  const facts: string[] = [];

  // Find strongest dimension
  const sortedDims = Object.entries(dimensions).sort((a, b) => b[1] - a[1]);
  const strongest = sortedDims[0];
  const weakest = sortedDims[sortedDims.length - 1];

  const dimLabels: Record<string, string> = {
    democraticVoice: 'democratic institutions',
    pressFreedom: 'press freedom',
    justiceAccess: 'justice system',
    economicOpportunity: 'economic opportunity',
    workplaceRights: 'workplace rights',
    healthcareAccess: 'healthcare access',
    housingSecurity: 'housing security',
    consumerProtection: 'consumer protection',
    governmentResponsiveness: 'government responsiveness',
    socialInclusion: 'social inclusion',
  };

  if (strongest[1] >= 70) {
    facts.push(`Strong ${dimLabels[strongest[0]] || strongest[0]} (${strongest[1]}%)`);
  }

  if (weakest[1] <= 40) {
    facts.push(`Challenges in ${dimLabels[weakest[0]] || weakest[0]} (${weakest[1]}%)`);
  }

  if (score >= 80) {
    facts.push('Among the world\'s fairest societies');
  } else if (score >= 65) {
    facts.push('Above-average fairness globally');
  } else if (score <= 35) {
    facts.push('Significant fairness challenges');
  }

  // Ensure at least one fact
  if (facts.length === 0) {
    facts.push(`Overall fairness score: ${score}%`);
  }

  return facts;
}

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
  trend?: 'improving' | 'declining' | 'stable';
  trendChange?: number;
  keyFacts?: string[];
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

  // More Africa
  NAM: { name: 'Namibia', region: 'africa', subregion: 'southern', population: 2.5, gdpPerCapita: 4866 },
  CPV: { name: 'Cape Verde', region: 'africa', subregion: 'west', population: 0.6, gdpPerCapita: 3603 },
  MUS: { name: 'Mauritius', region: 'africa', subregion: 'east', population: 1.3, gdpPerCapita: 10216 },
  BEN: { name: 'Benin', region: 'africa', subregion: 'west', population: 13, gdpPerCapita: 1319 },
  LSO: { name: 'Lesotho', region: 'africa', subregion: 'southern', population: 2.2, gdpPerCapita: 1118 },
  MWI: { name: 'Malawi', region: 'africa', subregion: 'southern', population: 20, gdpPerCapita: 625 },
  ZMB: { name: 'Zambia', region: 'africa', subregion: 'southern', population: 19, gdpPerCapita: 1095 },
  LBR: { name: 'Liberia', region: 'africa', subregion: 'west', population: 5.2, gdpPerCapita: 672 },
  SLE: { name: 'Sierra Leone', region: 'africa', subregion: 'west', population: 8.4, gdpPerCapita: 516 },
  CIV: { name: "Côte d'Ivoire", region: 'africa', subregion: 'west', population: 27, gdpPerCapita: 2549 },
  GMB: { name: 'Gambia', region: 'africa', subregion: 'west', population: 2.5, gdpPerCapita: 751 },
  NER: { name: 'Niger', region: 'africa', subregion: 'west', population: 26, gdpPerCapita: 554 },
  BFA: { name: 'Burkina Faso', region: 'africa', subregion: 'west', population: 22, gdpPerCapita: 831 },
  MLI: { name: 'Mali', region: 'africa', subregion: 'west', population: 22, gdpPerCapita: 918 },
  MOZ: { name: 'Mozambique', region: 'africa', subregion: 'southern', population: 32, gdpPerCapita: 504 },
  AGO: { name: 'Angola', region: 'africa', subregion: 'southern', population: 34, gdpPerCapita: 1896 },
  ZWE: { name: 'Zimbabwe', region: 'africa', subregion: 'southern', population: 16, gdpPerCapita: 1464 },
  UGA: { name: 'Uganda', region: 'africa', subregion: 'east', population: 47, gdpPerCapita: 883 },
  COD: { name: 'DR Congo', region: 'africa', subregion: 'central', population: 95, gdpPerCapita: 577 },
  COG: { name: 'Congo', region: 'africa', subregion: 'central', population: 5.8, gdpPerCapita: 2280 },
  CMR: { name: 'Cameroon', region: 'africa', subregion: 'central', population: 28, gdpPerCapita: 1662 },
  TGO: { name: 'Togo', region: 'africa', subregion: 'west', population: 8.6, gdpPerCapita: 915 },
  GIN: { name: 'Guinea', region: 'africa', subregion: 'west', population: 14, gdpPerCapita: 1166 },
  GAB: { name: 'Gabon', region: 'africa', subregion: 'central', population: 2.3, gdpPerCapita: 8017 },
  GNQ: { name: 'Equatorial Guinea', region: 'africa', subregion: 'central', population: 1.5, gdpPerCapita: 7273 },
  TCD: { name: 'Chad', region: 'africa', subregion: 'central', population: 17, gdpPerCapita: 710 },
  CAF: { name: 'Central African Republic', region: 'africa', subregion: 'central', population: 5, gdpPerCapita: 461 },
  SDN: { name: 'Sudan', region: 'africa', subregion: 'north', population: 45, gdpPerCapita: 449 },
  SSD: { name: 'South Sudan', region: 'africa', subregion: 'east', population: 11, gdpPerCapita: 393 },
  SOM: { name: 'Somalia', region: 'africa', subregion: 'east', population: 17, gdpPerCapita: 447 },
  DJI: { name: 'Djibouti', region: 'africa', subregion: 'east', population: 1, gdpPerCapita: 3428 },
  BDI: { name: 'Burundi', region: 'africa', subregion: 'east', population: 12, gdpPerCapita: 259 },
  MRT: { name: 'Mauritania', region: 'africa', subregion: 'west', population: 4.8, gdpPerCapita: 1679 },
  MDG: { name: 'Madagascar', region: 'africa', subregion: 'east', population: 29, gdpPerCapita: 515 },
  SWZ: { name: 'Eswatini', region: 'africa', subregion: 'southern', population: 1.2, gdpPerCapita: 3987 },
  DZA: { name: 'Algeria', region: 'africa', subregion: 'north', population: 45, gdpPerCapita: 3691 },
  LBY: { name: 'Libya', region: 'africa', subregion: 'north', population: 7, gdpPerCapita: 6018 },
  SYC: { name: 'Seychelles', region: 'africa', subregion: 'east', population: 0.1, gdpPerCapita: 14653 },
  COM: { name: 'Comoros', region: 'africa', subregion: 'east', population: 0.9, gdpPerCapita: 1402 },
  GNB: { name: 'Guinea-Bissau', region: 'africa', subregion: 'west', population: 2, gdpPerCapita: 778 },
  STP: { name: 'São Tomé and Príncipe', region: 'africa', subregion: 'central', population: 0.2, gdpPerCapita: 2181 },

  // More Asia
  PAK: { name: 'Pakistan', region: 'asia', subregion: 'south', population: 231, gdpPerCapita: 1505 },
  BGD: { name: 'Bangladesh', region: 'asia', subregion: 'south', population: 170, gdpPerCapita: 2458 },
  NPL: { name: 'Nepal', region: 'asia', subregion: 'south', population: 30, gdpPerCapita: 1208 },
  LKA: { name: 'Sri Lanka', region: 'asia', subregion: 'south', population: 22, gdpPerCapita: 3815 },
  KHM: { name: 'Cambodia', region: 'asia', subregion: 'southeast', population: 17, gdpPerCapita: 1625 },
  LAO: { name: 'Laos', region: 'asia', subregion: 'southeast', population: 7.4, gdpPerCapita: 2551 },
  MNG: { name: 'Mongolia', region: 'asia', subregion: 'east', population: 3.4, gdpPerCapita: 4566 },
  KAZ: { name: 'Kazakhstan', region: 'asia', subregion: 'central', population: 19, gdpPerCapita: 10373 },
  UZB: { name: 'Uzbekistan', region: 'asia', subregion: 'central', population: 34, gdpPerCapita: 1983 },
  TKM: { name: 'Turkmenistan', region: 'asia', subregion: 'central', population: 6.1, gdpPerCapita: 7612 },
  TJK: { name: 'Tajikistan', region: 'asia', subregion: 'central', population: 10, gdpPerCapita: 894 },
  KGZ: { name: 'Kyrgyzstan', region: 'asia', subregion: 'central', population: 6.7, gdpPerCapita: 1276 },
  AFG: { name: 'Afghanistan', region: 'asia', subregion: 'south', population: 40, gdpPerCapita: 364 },
  BTN: { name: 'Bhutan', region: 'asia', subregion: 'south', population: 0.8, gdpPerCapita: 3266 },
  MDV: { name: 'Maldives', region: 'asia', subregion: 'south', population: 0.5, gdpPerCapita: 10366 },
  TLS: { name: 'Timor-Leste', region: 'asia', subregion: 'southeast', population: 1.3, gdpPerCapita: 1456 },
  BRN: { name: 'Brunei', region: 'asia', subregion: 'southeast', population: 0.4, gdpPerCapita: 31449 },
  HKG: { name: 'Hong Kong', region: 'asia', subregion: 'east', population: 7.5, gdpPerCapita: 48983 },

  // More Middle East
  QAT: { name: 'Qatar', region: 'asia', subregion: 'middle-east', population: 2.9, gdpPerCapita: 66838 },
  KWT: { name: 'Kuwait', region: 'asia', subregion: 'middle-east', population: 4.3, gdpPerCapita: 24812 },
  BHR: { name: 'Bahrain', region: 'asia', subregion: 'middle-east', population: 1.5, gdpPerCapita: 25293 },
  OMN: { name: 'Oman', region: 'asia', subregion: 'middle-east', population: 5.2, gdpPerCapita: 19509 },
  YEM: { name: 'Yemen', region: 'asia', subregion: 'middle-east', population: 32, gdpPerCapita: 691 },
  PSE: { name: 'Palestine', region: 'asia', subregion: 'middle-east', population: 5.2, gdpPerCapita: 3664 },
  TUR: { name: 'Turkey', region: 'asia', subregion: 'middle-east', population: 85, gdpPerCapita: 9586 },
  ARM: { name: 'Armenia', region: 'europe', subregion: 'caucasus', population: 3, gdpPerCapita: 4966 },
  CYP: { name: 'Cyprus', region: 'europe', subregion: 'southern', population: 1.2, gdpPerCapita: 28159 },
  MLT: { name: 'Malta', region: 'europe', subregion: 'southern', population: 0.5, gdpPerCapita: 32912 },

  // More Americas
  PAN: { name: 'Panama', region: 'americas', subregion: 'central', population: 4.4, gdpPerCapita: 14617 },
  JAM: { name: 'Jamaica', region: 'americas', subregion: 'caribbean', population: 3, gdpPerCapita: 5741 },
  TTO: { name: 'Trinidad and Tobago', region: 'americas', subregion: 'caribbean', population: 1.4, gdpPerCapita: 15764 },
  DOM: { name: 'Dominican Republic', region: 'americas', subregion: 'caribbean', population: 11, gdpPerCapita: 9700 },
  BOL: { name: 'Bolivia', region: 'americas', subregion: 'south', population: 12, gdpPerCapita: 3500 },
  PRY: { name: 'Paraguay', region: 'americas', subregion: 'south', population: 7.2, gdpPerCapita: 5414 },
  GTM: { name: 'Guatemala', region: 'americas', subregion: 'central', population: 18, gdpPerCapita: 5025 },
  SLV: { name: 'El Salvador', region: 'americas', subregion: 'central', population: 6.5, gdpPerCapita: 4551 },
  HND: { name: 'Honduras', region: 'americas', subregion: 'central', population: 10, gdpPerCapita: 2831 },
  HTI: { name: 'Haiti', region: 'americas', subregion: 'caribbean', population: 11, gdpPerCapita: 1653 },
  GUY: { name: 'Guyana', region: 'americas', subregion: 'south', population: 0.8, gdpPerCapita: 9913 },
  SUR: { name: 'Suriname', region: 'americas', subregion: 'south', population: 0.6, gdpPerCapita: 5155 },
  BHS: { name: 'Bahamas', region: 'americas', subregion: 'caribbean', population: 0.4, gdpPerCapita: 32245 },
  BRB: { name: 'Barbados', region: 'americas', subregion: 'caribbean', population: 0.3, gdpPerCapita: 16703 },
  BLZ: { name: 'Belize', region: 'americas', subregion: 'central', population: 0.4, gdpPerCapita: 6094 },

  // Oceania
  PNG: { name: 'Papua New Guinea', region: 'oceania', subregion: 'melanesia', population: 9.1, gdpPerCapita: 2845 },
  FJI: { name: 'Fiji', region: 'oceania', subregion: 'melanesia', population: 0.9, gdpPerCapita: 5316 },
  SLB: { name: 'Solomon Islands', region: 'oceania', subregion: 'melanesia', population: 0.7, gdpPerCapita: 2379 },
  VUT: { name: 'Vanuatu', region: 'oceania', subregion: 'melanesia', population: 0.3, gdpPerCapita: 3105 },
  WSM: { name: 'Samoa', region: 'oceania', subregion: 'polynesia', population: 0.2, gdpPerCapita: 4067 },
  TON: { name: 'Tonga', region: 'oceania', subregion: 'polynesia', population: 0.1, gdpPerCapita: 4903 },
  KIR: { name: 'Kiribati', region: 'oceania', subregion: 'micronesia', population: 0.1, gdpPerCapita: 1693 },
  MHL: { name: 'Marshall Islands', region: 'oceania', subregion: 'micronesia', population: 0.06, gdpPerCapita: 4073 },
  FSM: { name: 'Micronesia', region: 'oceania', subregion: 'micronesia', population: 0.1, gdpPerCapita: 3584 },
  PLW: { name: 'Palau', region: 'oceania', subregion: 'micronesia', population: 0.02, gdpPerCapita: 14907 },
  NRU: { name: 'Nauru', region: 'oceania', subregion: 'micronesia', population: 0.01, gdpPerCapita: 10220 },
  TUV: { name: 'Tuvalu', region: 'oceania', subregion: 'polynesia', population: 0.01, gdpPerCapita: 4673 },

  // Small European states
  AND: { name: 'Andorra', region: 'europe', subregion: 'southern', population: 0.08, gdpPerCapita: 40886 },
  MCO: { name: 'Monaco', region: 'europe', subregion: 'western', population: 0.04, gdpPerCapita: 190513 },
  SMR: { name: 'San Marino', region: 'europe', subregion: 'southern', population: 0.03, gdpPerCapita: 47622 },
  LIE: { name: 'Liechtenstein', region: 'europe', subregion: 'western', population: 0.04, gdpPerCapita: 180366 },
  HRV: { name: 'Croatia', region: 'europe', subregion: 'balkans', population: 4, gdpPerCapita: 17685 },
  XKX: { name: 'Kosovo', region: 'europe', subregion: 'balkans', population: 1.8, gdpPerCapita: 5016 },
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
    population: number;
    gdpPerCapita: number;
    trend: 'improving' | 'declining' | 'stable';
    trendChange: number;
    keyFacts: string[];
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
      population: meta.population,
      gdpPerCapita: meta.gdpPerCapita,
      trend: meta.trend || 'stable',
      trendChange: meta.trendChange || 0,
      keyFacts: meta.keyFacts || generateKeyFacts(fairnessScore, dimensions, meta.name),
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

  // Generate frontend-compatible format (with 'id' instead of 'iso3')
  const frontendData = results.map(r => ({
    id: r.iso3,
    name: r.name,
    region: r.region,
    subregion: r.subregion,
    fairnessScore: r.fairnessScore,
    population: r.population,
    gdpPerCapita: r.gdpPerCapita,
    dimensions: r.dimensions,
    trend: r.trend,
    trendChange: r.trendChange,
    keyFacts: r.keyFacts,
  }));

  const frontendPath = path.join(__dirname, 'data/output/world-fairness-data.json');
  fs.writeFileSync(frontendPath, JSON.stringify(frontendData, null, 2));
  console.log(`Saved frontend-compatible data to ${frontendPath}`);

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
  console.log('- ITUC Global Rights Index 2024 (Workers\' Rights)');
  console.log('- Transparency International CPI 2024 (Corruption)');
  console.log('- WHO UHC Service Coverage Index 2021 (Healthcare)');
  console.log('\nVerification links:');
  console.log('- https://freedomhouse.org/countries/freedom-world/scores');
  console.log('- https://rsf.org/en/index');
  console.log('- https://data.worldbank.org/indicator/VA.EST');
  console.log('- https://www.ituc-csi.org/global-rights-index');
  console.log('- https://www.transparency.org/en/cpi/2024');
  console.log('- https://data.who.int/indicators/i/3805B1E');
}

// Run
if (require.main === module) {
  generateScores();
}

export { generateScores, loadProcessedData, calculateDimensionScores };
