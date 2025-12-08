#!/usr/bin/env npx ts-node
/**
 * World Fairness Score Calculator
 *
 * This script calculates the World Fairness Score for all countries
 * using data from multiple international indices.
 *
 * Usage:
 *   npx ts-node scripts/world-fairness-score/calculate.ts
 *
 * Options:
 *   --output    Output file path (default: lib/data/world-fairness/calculated.json)
 *   --validate  Only validate without generating output
 *   --country   Calculate for single country (ISO3 code)
 *   --verbose   Show detailed calculation steps
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// TYPES
// ============================================

interface RawDataPoint {
  countryIso3: string;
  countryName: string;
  sourceId: string;
  field?: string;
  year: number;
  value: number;
  estimated?: boolean;
}

interface DimensionScore {
  score: number;
  sources: {
    sourceId: string;
    rawValue: number;
    normalizedValue: number;
    weight: number;
    estimated: boolean;
  }[];
  confidence: 'high' | 'medium' | 'low';
}

interface CountryCalculation {
  iso3: string;
  name: string;
  region: string;
  subregion: string;
  fairnessScore: number;
  dimensions: Record<string, DimensionScore>;
  trend: {
    direction: 'improving' | 'declining' | 'stable';
    change: number;
    yearsCompared: number;
  };
  metadata: {
    calculatedAt: string;
    dataYear: number;
    sourcesUsed: number;
    estimatedFields: number;
    confidence: 'high' | 'medium' | 'low';
  };
}

// ============================================
// DIMENSION WEIGHTS (from methodology)
// ============================================

const DIMENSION_WEIGHTS: Record<string, number> = {
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

// ============================================
// SOURCE CONFIGURATIONS
// ============================================

interface SourceConfig {
  id: string;
  inputRange: [number, number];
  invert: boolean;
}

const SOURCE_CONFIGS: Record<string, SourceConfig> = {
  freedom_house_political: { id: 'freedom_house_political', inputRange: [0, 40], invert: false },
  vdem_electoral: { id: 'vdem_electoral', inputRange: [0, 1], invert: false },
  eiu_democracy: { id: 'eiu_democracy', inputRange: [0, 10], invert: false },
  rsf_press_freedom: { id: 'rsf_press_freedom', inputRange: [0, 100], invert: true },
  vdem_media: { id: 'vdem_media', inputRange: [0, 1], invert: false },
  wjp_rule_of_law: { id: 'wjp_rule_of_law', inputRange: [0, 1], invert: false },
  world_bank_gini: { id: 'world_bank_gini', inputRange: [20, 65], invert: true },
  wef_social_mobility: { id: 'wef_social_mobility', inputRange: [0, 100], invert: false },
  ituc_global_rights: { id: 'ituc_global_rights', inputRange: [1, 5.5], invert: true },
  who_uhc: { id: 'who_uhc', inputRange: [0, 100], invert: false },
  who_out_of_pocket: { id: 'who_out_of_pocket', inputRange: [0, 80], invert: true },
  numbeo_property: { id: 'numbeo_property', inputRange: [2, 50], invert: true },
  wgi_voice: { id: 'wgi_voice', inputRange: [-2.5, 2.5], invert: false },
  wgi_effectiveness: { id: 'wgi_effectiveness', inputRange: [-2.5, 2.5], invert: false },
  ti_cpi: { id: 'ti_cpi', inputRange: [0, 100], invert: false },
  undp_gii: { id: 'undp_gii', inputRange: [0, 0.8], invert: true },
  spi_personal_rights: { id: 'spi_personal_rights', inputRange: [0, 100], invert: false },
};

// ============================================
// DIMENSION -> SOURCE MAPPINGS
// ============================================

interface DimensionSourceMapping {
  dimension: string;
  sources: { sourceId: string; weight: number; field?: string }[];
}

const DIMENSION_SOURCES: DimensionSourceMapping[] = [
  {
    dimension: 'democraticVoice',
    sources: [
      { sourceId: 'freedom_house_political', weight: 0.4 },
      { sourceId: 'vdem_electoral', weight: 0.4 },
      { sourceId: 'eiu_democracy', weight: 0.2 },
    ],
  },
  {
    dimension: 'pressFreedom',
    sources: [
      { sourceId: 'rsf_press_freedom', weight: 0.5 },
      { sourceId: 'vdem_media', weight: 0.3 },
      { sourceId: 'freedom_house_political', weight: 0.2 },
    ],
  },
  {
    dimension: 'justiceAccess',
    sources: [
      { sourceId: 'wjp_rule_of_law', weight: 0.5, field: 'civil_justice' },
      { sourceId: 'wjp_rule_of_law', weight: 0.3, field: 'criminal_justice' },
      { sourceId: 'wgi_voice', weight: 0.2 },
    ],
  },
  {
    dimension: 'economicOpportunity',
    sources: [
      { sourceId: 'world_bank_gini', weight: 0.4 },
      { sourceId: 'wef_social_mobility', weight: 0.4 },
      { sourceId: 'wgi_effectiveness', weight: 0.2 },
    ],
  },
  {
    dimension: 'workplaceRights',
    sources: [
      { sourceId: 'ituc_global_rights', weight: 0.7 },
      { sourceId: 'wgi_voice', weight: 0.3 },
    ],
  },
  {
    dimension: 'healthcareAccess',
    sources: [
      { sourceId: 'who_uhc', weight: 0.6 },
      { sourceId: 'who_out_of_pocket', weight: 0.4 },
    ],
  },
  {
    dimension: 'housingSecurity',
    sources: [
      { sourceId: 'numbeo_property', weight: 0.5 },
      { sourceId: 'wgi_effectiveness', weight: 0.3 },
      { sourceId: 'spi_personal_rights', weight: 0.2 },
    ],
  },
  {
    dimension: 'consumerProtection',
    sources: [
      { sourceId: 'wjp_rule_of_law', weight: 0.5, field: 'civil_justice' },
      { sourceId: 'ti_cpi', weight: 0.3 },
      { sourceId: 'wgi_effectiveness', weight: 0.2 },
    ],
  },
  {
    dimension: 'governmentResponsiveness',
    sources: [
      { sourceId: 'wgi_voice', weight: 0.3 },
      { sourceId: 'wgi_effectiveness', weight: 0.3 },
      { sourceId: 'ti_cpi', weight: 0.4 },
    ],
  },
  {
    dimension: 'socialInclusion',
    sources: [
      { sourceId: 'undp_gii', weight: 0.5 },
      { sourceId: 'spi_personal_rights', weight: 0.5 },
    ],
  },
];

// ============================================
// NORMALIZATION FUNCTIONS
// ============================================

function normalizeValue(
  value: number,
  config: SourceConfig
): number {
  const [min, max] = config.inputRange;

  // Clamp to range
  const clamped = Math.max(min, Math.min(max, value));

  // Normalize to 0-1
  let normalized = (clamped - min) / (max - min);

  // Invert if needed
  if (config.invert) {
    normalized = 1 - normalized;
  }

  // Scale to 0-100
  return Math.round(normalized * 100 * 10) / 10;
}

// ============================================
// CALCULATION FUNCTIONS
// ============================================

function calculateDimensionScore(
  dimension: string,
  rawData: Map<string, RawDataPoint>,
  countryIso3: string,
  verbose: boolean = false
): DimensionScore {
  const mapping = DIMENSION_SOURCES.find(d => d.dimension === dimension);
  if (!mapping) {
    throw new Error(`Unknown dimension: ${dimension}`);
  }

  const sourceScores: DimensionScore['sources'] = [];
  let totalWeight = 0;
  let weightedSum = 0;
  let estimatedCount = 0;

  for (const source of mapping.sources) {
    const dataKey = `${countryIso3}_${source.sourceId}${source.field ? '_' + source.field : ''}`;
    const dataPoint = rawData.get(dataKey);

    if (dataPoint) {
      const config = SOURCE_CONFIGS[source.sourceId];
      if (!config) continue;

      const normalized = normalizeValue(dataPoint.value, config);

      sourceScores.push({
        sourceId: source.sourceId,
        rawValue: dataPoint.value,
        normalizedValue: normalized,
        weight: source.weight,
        estimated: dataPoint.estimated || false,
      });

      weightedSum += normalized * source.weight;
      totalWeight += source.weight;

      if (dataPoint.estimated) estimatedCount++;

      if (verbose) {
        console.log(`  ${source.sourceId}: ${dataPoint.value} -> ${normalized} (weight: ${source.weight})`);
      }
    }
  }

  // Calculate final score
  const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (totalWeight < 0.5 || estimatedCount > sourceScores.length / 2) {
    confidence = 'low';
  } else if (totalWeight < 0.8 || estimatedCount > 0) {
    confidence = 'medium';
  }

  return {
    score,
    sources: sourceScores,
    confidence,
  };
}

function calculateFairnessScore(dimensions: Record<string, DimensionScore>): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [dimension, data] of Object.entries(dimensions)) {
    const weight = DIMENSION_WEIGHTS[dimension] || 0;
    weightedSum += data.score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

function calculateTrend(
  currentScore: number,
  historicalScores: { year: number; score: number }[]
): CountryCalculation['trend'] {
  if (historicalScores.length === 0) {
    return { direction: 'stable', change: 0, yearsCompared: 0 };
  }

  // Find score from ~5 years ago
  const targetYear = new Date().getFullYear() - 5;
  const historicalScore = historicalScores
    .filter(h => h.year <= targetYear)
    .sort((a, b) => b.year - a.year)[0];

  if (!historicalScore) {
    return { direction: 'stable', change: 0, yearsCompared: 0 };
  }

  const change = Math.round(currentScore - historicalScore.score);
  const cappedChange = Math.max(-15, Math.min(15, change));

  let direction: 'improving' | 'declining' | 'stable' = 'stable';
  if (cappedChange >= 3) direction = 'improving';
  else if (cappedChange <= -3) direction = 'declining';

  return {
    direction,
    change: cappedChange,
    yearsCompared: new Date().getFullYear() - historicalScore.year,
  };
}

// ============================================
// MAIN CALCULATION
// ============================================

function calculateCountry(
  countryIso3: string,
  countryName: string,
  region: string,
  subregion: string,
  rawData: Map<string, RawDataPoint>,
  historicalScores: { year: number; score: number }[],
  verbose: boolean = false
): CountryCalculation {
  if (verbose) {
    console.log(`\nCalculating: ${countryName} (${countryIso3})`);
  }

  // Calculate each dimension
  const dimensions: Record<string, DimensionScore> = {};
  for (const mapping of DIMENSION_SOURCES) {
    dimensions[mapping.dimension] = calculateDimensionScore(
      mapping.dimension,
      rawData,
      countryIso3,
      verbose
    );
  }

  // Calculate final score
  const fairnessScore = calculateFairnessScore(dimensions);

  // Calculate trend
  const trend = calculateTrend(fairnessScore, historicalScores);

  // Count sources and estimated fields
  let sourcesUsed = 0;
  let estimatedFields = 0;
  for (const dim of Object.values(dimensions)) {
    sourcesUsed += dim.sources.length;
    estimatedFields += dim.sources.filter(s => s.estimated).length;
  }

  // Determine overall confidence
  const lowConfidenceCount = Object.values(dimensions).filter(d => d.confidence === 'low').length;
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (lowConfidenceCount > 3) confidence = 'low';
  else if (lowConfidenceCount > 0) confidence = 'medium';

  if (verbose) {
    console.log(`  Final Score: ${fairnessScore}%`);
    console.log(`  Trend: ${trend.direction} (${trend.change > 0 ? '+' : ''}${trend.change})`);
  }

  return {
    iso3: countryIso3,
    name: countryName,
    region,
    subregion,
    fairnessScore,
    dimensions,
    trend,
    metadata: {
      calculatedAt: new Date().toISOString(),
      dataYear: new Date().getFullYear(),
      sourcesUsed,
      estimatedFields,
      confidence,
    },
  };
}

// ============================================
// DATA LOADING (placeholder for real implementation)
// ============================================

/**
 * In a real implementation, this would:
 * 1. Load data from CSV/JSON files in /data/raw/
 * 2. Fetch from APIs where available
 * 3. Merge and validate data
 */
function loadRawData(): Map<string, RawDataPoint> {
  // This is a placeholder - real implementation would load actual data files
  console.log('Loading raw data from sources...');
  console.log('NOTE: Replace this with actual data loading from:');
  console.log('  - data/raw/freedom_house_2024.csv');
  console.log('  - data/raw/rsf_press_freedom_2024.csv');
  console.log('  - data/raw/wjp_rule_of_law_2024.csv');
  console.log('  - etc.');

  return new Map();
}

// ============================================
// CLI INTERFACE
// ============================================

function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const validateOnly = args.includes('--validate');

  console.log('='.repeat(60));
  console.log('World Fairness Score Calculator v1.0.0');
  console.log('='.repeat(60));

  // Validate weights
  const weightSum = Object.values(DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0);
  console.log(`\nDimension weights sum: ${weightSum.toFixed(2)} (should be 1.00)`);

  if (Math.abs(weightSum - 1.0) > 0.001) {
    console.error('ERROR: Dimension weights do not sum to 1.0!');
    process.exit(1);
  }

  console.log('Weight validation: PASSED');

  if (validateOnly) {
    console.log('\nValidation complete. Use without --validate to generate scores.');
    return;
  }

  // Load data
  const rawData = loadRawData();

  console.log(`\nLoaded ${rawData.size} data points`);

  if (rawData.size === 0) {
    console.log('\nNo raw data loaded. To generate real scores:');
    console.log('1. Download source data to data/raw/ directory');
    console.log('2. Run data fetchers: npm run fetch-wfs-data');
    console.log('3. Re-run this script');
    return;
  }

  // Calculate all countries
  // (Implementation would iterate through all countries)

  console.log('\nCalculation complete!');
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
export {
  normalizeValue,
  calculateDimensionScore,
  calculateFairnessScore,
  calculateTrend,
  calculateCountry,
  DIMENSION_WEIGHTS,
  SOURCE_CONFIGS,
};
