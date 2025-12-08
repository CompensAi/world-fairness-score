# World Fairness Score

An open-source index measuring how fairly citizens are treated across 190+ countries.

**Scale**: 0-100 (Higher = More Fair)

**Live Demo**: [compens.ai/global-unfairness](https://compens.ai/en/global-unfairness)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/CompensAi/world-fairness-score.git
cd world-fairness-score

# Install dependencies
npm install

# Fetch latest data from sources
npx tsx fetch/freedom-house.ts
npx tsx fetch/rsf-press-freedom.ts
npx tsx fetch/world-bank.ts

# Generate scores
npx tsx generate.ts
```

## Project Structure

```
world-fairness-score/
├── README.md              # This file
├── calculate.ts           # Calculation logic & normalization formulas
├── generate.ts            # Score generation script
├── fetch/                 # Data fetching scripts
│   ├── freedom-house.ts   # Freedom House data (2024)
│   ├── rsf-press-freedom.ts  # Reporters Without Borders (2024)
│   └── world-bank.ts      # World Bank API (GINI, WGI)
└── data/
    ├── raw/               # Downloaded source files
    ├── processed/         # Normalized data points
    ├── output/            # Final calculated scores
    │   ├── calculated-scores.json   # Detailed results with all metadata
    │   └── world-fairness-data.json # Frontend-compatible format
    └── map/
        └── countries-110m.json      # TopoJSON world map (Crimea as Ukraine)
```

## Map Data

The `data/map/countries-110m.json` file is a TopoJSON world map based on [Visionscarto World Atlas](https://github.com/visionscarto/world-atlas) which correctly shows Crimea as part of Ukraine (UN-recognized borders).

## 10 Fairness Dimensions

| Dimension | Weight | Primary Sources |
|-----------|--------|-----------------|
| Democratic Voice | 15% | Freedom House, V-Dem, EIU |
| Press Freedom | 15% | RSF Press Freedom Index |
| Justice Access | 15% | World Justice Project, WGI |
| Economic Opportunity | 10% | World Bank GINI |
| Workplace Rights | 10% | ITUC Global Rights Index |
| Healthcare Access | 10% | WHO UHC Index |
| Housing Security | 10% | World Bank, Numbeo |
| Consumer Protection | 5% | WJP, Transparency International |
| Government Responsiveness | 5% | World Bank WGI |
| Social Inclusion | 5% | UNDP GII |

## Data Sources

All data comes from established international organizations:

| Source | Data | License |
|--------|------|---------|
| [Freedom House](https://freedomhouse.org/report/freedom-world) | Political Rights, Civil Liberties | CC BY 4.0 |
| [Reporters Without Borders](https://rsf.org/en/index) | Press Freedom Index | Public |
| [World Bank](https://data.worldbank.org) | GINI, Governance Indicators | CC BY 4.0 |
| [V-Dem Institute](https://www.v-dem.net/) | Democracy indices | CC BY-SA 4.0 |
| [World Justice Project](https://worldjusticeproject.org/) | Rule of Law Index | CC BY-NC-ND |

## How Scores Are Calculated

### 1. Normalization

Each source uses different scales. We normalize to 0-100:

```typescript
function normalizeValue(value: number, config: SourceConfig): number {
  const [min, max] = config.inputRange;
  const clamped = Math.max(min, Math.min(max, value));
  let normalized = (clamped - min) / (max - min);
  if (config.invert) normalized = 1 - normalized;
  return Math.round(normalized * 100);
}
```

### 2. Source Configurations

| Source | Input Range | Invert |
|--------|-------------|--------|
| Freedom House Political | 0-40 | No |
| RSF Press Freedom | 0-100 | Yes (lower = better) |
| World Bank GINI | 20-65 | Yes (lower = more equal) |
| WGI Voice & Accountability | -2.5 to 2.5 | No |

### 3. Dimension Aggregation

Each dimension combines multiple sources with weights:

```typescript
// Press Freedom = 70% RSF + 30% Freedom House Civil Liberties
pressFreedom = (rsf * 0.7) + (fh_civil * 0.3)
```

### 4. Final Score

Weighted average of all dimensions:

```typescript
fairnessScore = Σ(dimension_score × dimension_weight)
```

## Sample Output

```json
{
  "iso3": "NOR",
  "name": "Norway",
  "fairnessScore": 89,
  "dimensions": {
    "democraticVoice": 100,
    "pressFreedom": 95,
    "justiceAccess": 92,
    ...
  },
  "sourcesUsed": 8
}
```

## Contributing

### Report Data Errors

Open an issue with:
- Country and dimension affected
- Expected vs actual value
- Link to correct source data

### Improve Methodology

1. Open a discussion with your proposal
2. Include academic justification
3. Submit PR with updated calculations

### Add Data Sources

1. Propose new source in discussions
2. Document: coverage, methodology, license
3. Create fetcher script in `/fetch`
4. Update dimension mappings in `generate.ts`

## Limitations

- Some countries have limited data coverage
- Dimensions default to 50 when source data unavailable
- Annual updates depend on source publication schedules
- Subjective weighting decisions documented but debatable

## License

- **Code**: MIT License
- **Data**: See individual source licenses
- **Output scores**: CC BY 4.0 (with attribution to Compens.ai)

## Citation

```bibtex
@misc{compens_wfs_2025,
  title={World Fairness Score},
  author={Compens.ai},
  year={2025},
  url={https://github.com/CompensAi/world-fairness-score}
}
```

## Links

- **Website**: [compens.ai/global-unfairness](https://compens.ai/en/global-unfairness)
- **Methodology**: [compens.ai/global-unfairness/methodology](https://compens.ai/en/global-unfairness/methodology)
- **Issues**: [GitHub Issues](https://github.com/CompensAi/world-fairness-score/issues)
