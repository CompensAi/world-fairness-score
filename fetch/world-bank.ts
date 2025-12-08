#!/usr/bin/env npx ts-node
/**
 * World Bank Data Fetcher
 *
 * Fetches data from World Bank Open Data API:
 * - GINI Index (SI.POV.GINI)
 * - Voice and Accountability (VA.EST)
 * - Government Effectiveness (GE.EST)
 *
 * API Documentation: https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../data/raw');
const BASE_URL = 'https://api.worldbank.org/v2';

interface WorldBankResponse {
  page: number;
  pages: number;
  per_page: number;
  total: number;
  sourceid: string;
  lastupdated: string;
}

interface WorldBankDataPoint {
  indicator: { id: string; value: string };
  country: { id: string; value: string };
  countryiso3code: string;
  date: string;
  value: number | null;
  unit: string;
  obs_status: string;
  decimal: number;
}

// World Bank indicators we need
const INDICATORS = {
  'SI.POV.GINI': 'GINI Index (World Bank estimate)',
  'VA.EST': 'Voice and Accountability: Estimate',
  'GE.EST': 'Government Effectiveness: Estimate',
  'CC.EST': 'Control of Corruption: Estimate',
  'RL.EST': 'Rule of Law: Estimate',
  'RQ.EST': 'Regulatory Quality: Estimate',
};

async function fetchIndicator(indicatorCode: string, year: number = 2023): Promise<WorldBankDataPoint[]> {
  const url = `${BASE_URL}/country/all/indicator/${indicatorCode}?format=json&date=${year - 5}:${year}&per_page=500`;

  console.log(`Fetching ${indicatorCode}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${indicatorCode}: ${response.statusText}`);
  }

  const data = await response.json();

  // World Bank returns [metadata, data[]]
  if (!Array.isArray(data) || data.length < 2) {
    console.warn(`No data for ${indicatorCode}`);
    return [];
  }

  return data[1] || [];
}

function getLatestValue(dataPoints: WorldBankDataPoint[]): Map<string, { value: number; year: number }> {
  const latestByCountry = new Map<string, { value: number; year: number }>();

  for (const point of dataPoints) {
    if (point.value === null || !point.countryiso3code) continue;

    const year = parseInt(point.date);
    const existing = latestByCountry.get(point.countryiso3code);

    if (!existing || year > existing.year) {
      latestByCountry.set(point.countryiso3code, {
        value: point.value,
        year: year,
      });
    }
  }

  return latestByCountry;
}

async function fetchAllIndicators() {
  console.log('='.repeat(60));
  console.log('World Bank Data Fetcher');
  console.log('='.repeat(60));

  const results: Record<string, Record<string, { value: number; year: number }>> = {};

  for (const [code, name] of Object.entries(INDICATORS)) {
    try {
      const data = await fetchIndicator(code);
      const latest = getLatestValue(data);

      results[code] = Object.fromEntries(latest);
      console.log(`  ${name}: ${latest.size} countries`);

      // Rate limiting - be nice to the API
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error fetching ${code}:`, error);
    }
  }

  // Save to file
  const outputPath = path.join(DATA_DIR, 'world-bank.json');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log(`\nSaved to ${outputPath}`);
  return results;
}

// Transform to our format
function transformToFairnessFormat(worldBankData: Record<string, Record<string, { value: number; year: number }>>) {
  const countries = new Set<string>();

  for (const indicator of Object.values(worldBankData)) {
    for (const iso3 of Object.keys(indicator)) {
      if (iso3.length === 3 && !['WLD', 'ARB', 'CSS', 'EAS', 'EAP', 'ECA', 'ECS', 'EMU', 'EUU', 'FCS', 'HIC', 'HPC', 'IBD', 'IBT', 'IDA', 'IDB', 'IDX', 'LAC', 'LCN', 'LDC', 'LIC', 'LMC', 'LMY', 'LTE', 'MEA', 'MIC', 'MNA', 'NAC', 'OED', 'OSS', 'PRE', 'PSS', 'PST', 'SAS', 'SSA', 'SSF', 'SST', 'TEA', 'TEC', 'TLA', 'TMN', 'TSA', 'TSS', 'UMC'].includes(iso3)) {
        countries.add(iso3);
      }
    }
  }

  const output: Array<{
    countryIso3: string;
    sourceId: string;
    field?: string;
    year: number;
    value: number;
  }> = [];

  for (const iso3 of countries) {
    // GINI
    const gini = worldBankData['SI.POV.GINI']?.[iso3];
    if (gini) {
      output.push({
        countryIso3: iso3,
        sourceId: 'world_bank_gini',
        year: gini.year,
        value: gini.value,
      });
    }

    // Voice and Accountability -> wgi_voice
    const voice = worldBankData['VA.EST']?.[iso3];
    if (voice) {
      output.push({
        countryIso3: iso3,
        sourceId: 'wgi_voice',
        year: voice.year,
        value: voice.value,
      });
    }

    // Government Effectiveness -> wgi_effectiveness
    const effectiveness = worldBankData['GE.EST']?.[iso3];
    if (effectiveness) {
      output.push({
        countryIso3: iso3,
        sourceId: 'wgi_effectiveness',
        year: effectiveness.year,
        value: effectiveness.value,
      });
    }

    // Control of Corruption -> ti_cpi (proxy)
    const corruption = worldBankData['CC.EST']?.[iso3];
    if (corruption) {
      output.push({
        countryIso3: iso3,
        sourceId: 'wgi_corruption',
        year: corruption.year,
        value: corruption.value,
      });
    }
  }

  return output;
}

async function main() {
  const data = await fetchAllIndicators();

  // Transform and save processed data
  const processed = transformToFairnessFormat(data);
  const processedPath = path.join(__dirname, '../data/processed/world-bank.json');
  fs.writeFileSync(processedPath, JSON.stringify(processed, null, 2));
  console.log(`\nProcessed ${processed.length} data points to ${processedPath}`);
}

if (require.main === module) {
  main().catch(console.error);
}

export { fetchAllIndicators, transformToFairnessFormat };
