# World Fairness Score - Data Sources

## Overview

The World Fairness Score is calculated from **real data** from established international organizations.
When data is unavailable for a country/dimension, we document it as an **exception** with our methodology.

## Data Sources by Dimension

### 1. Democratic Voice (15% weight)
| Source | Coverage | Update Frequency | License | Status |
|--------|----------|------------------|---------|--------|
| [Freedom House - Political Rights](https://freedomhouse.org/report/freedom-world) | 195 countries | Annual | CC BY 4.0 | ✅ Implemented |
| [V-Dem Electoral Democracy Index](https://www.v-dem.net/data/) | 202 countries | Annual | CC BY-SA 4.0 | 🔄 Planned |
| [World Bank - Voice & Accountability](https://data.worldbank.org) | 190+ countries | Annual | CC BY 4.0 | ✅ Implemented |
| [EIU Democracy Index](https://ourworldindata.org/grapher/democracy-index-eiu) | 165 countries | Annual | Restricted | 📋 Reference only |

### 2. Press Freedom (15% weight)
| Source | Coverage | Update Frequency | License | Status |
|--------|----------|------------------|---------|--------|
| [RSF Press Freedom Index](https://rsf.org/en/index) | 180 countries | Annual | Public | ✅ Implemented |
| [Freedom House - Civil Liberties](https://freedomhouse.org/report/freedom-world) | 195 countries | Annual | CC BY 4.0 | ✅ Implemented |
| [V-Dem Freedom of Expression](https://www.v-dem.net/data/) | 202 countries | Annual | CC BY-SA 4.0 | 🔄 Planned |

### 3. Justice Access (15% weight)
| Source | Coverage | Update Frequency | License | Status |
|--------|----------|------------------|---------|--------|
| [World Justice Project Rule of Law Index](https://worldjusticeproject.org/rule-of-law-index/) | 142 countries | Annual | CC BY-NC-ND | 🔄 Planned |
| [World Bank - Rule of Law](https://data.worldbank.org) | 190+ countries | Annual | CC BY 4.0 | ✅ Implemented |
| [Transparency International CPI](https://www.transparency.org/en/cpi/2024) | 180 countries | Annual | Public | 🔄 Planned |

### 4. Economic Opportunity (10% weight)
| Source | Coverage | Update Frequency | License | Status |
|--------|----------|------------------|---------|--------|
| [World Bank - GINI Index](https://data.worldbank.org/indicator/SI.POV.GINI) | 160+ countries | Varies | CC BY 4.0 | ✅ Implemented |
| [World Bank - Government Effectiveness](https://data.worldbank.org) | 190+ countries | Annual | CC BY 4.0 | ✅ Implemented |
| [UNDP Human Development Index](https://hdr.undp.org/data-center) | 191 countries | Annual | Public | 🔄 Planned |

### 5. Workplace Rights (10% weight)
| Source | Coverage | Update Frequency | License | Status |
|--------|----------|------------------|---------|--------|
| [ITUC Global Rights Index](https://www.ituc-csi.org/global-rights-index) | 149 countries | Annual | Public | 🔄 Planned |
| [ILO NORMLEX](https://www.ilo.org/normlex) | 187 countries | Continuous | Public | 🔄 Planned |
| Freedom House Civil Liberties (proxy) | 195 countries | Annual | CC BY 4.0 | ✅ Implemented |

### 6. Healthcare Access (10% weight)
| Source | Coverage | Update Frequency | License | Status |
|--------|----------|------------------|---------|--------|
| [WHO UHC Service Coverage Index](https://data.who.int/indicators/i/3805B1E) | 190+ countries | Biennial | CC BY 4.0 | 🔄 Planned |
| [World Bank Health Data](https://data.worldbank.org) | 190+ countries | Annual | CC BY 4.0 | 🔄 Planned |
| World Bank Government Effectiveness (proxy) | 190+ countries | Annual | CC BY 4.0 | ✅ Implemented |

### 7. Housing Security (10% weight)
| Source | Coverage | Update Frequency | License | Status |
|--------|----------|------------------|---------|--------|
| [World Bank - Government Effectiveness](https://data.worldbank.org) | 190+ countries | Annual | CC BY 4.0 | ✅ Implemented |
| [GINI Index](https://data.worldbank.org/indicator/SI.POV.GINI) (proxy for inequality) | 160+ countries | Varies | CC BY 4.0 | ✅ Implemented |
| Numbeo Housing Index | 100+ countries | Continuous | Restricted | 📋 Reference only |

### 8. Consumer Protection (5% weight)
| Source | Coverage | Update Frequency | License | Status |
|--------|----------|------------------|---------|--------|
| [Transparency International CPI](https://www.transparency.org/en/cpi/2024) | 180 countries | Annual | Public | 🔄 Planned |
| [World Bank - Control of Corruption](https://data.worldbank.org) | 190+ countries | Annual | CC BY 4.0 | ✅ Implemented |
| [World Bank - Regulatory Quality](https://data.worldbank.org) | 190+ countries | Annual | CC BY 4.0 | 🔄 Planned |

### 9. Government Responsiveness (5% weight)
| Source | Coverage | Update Frequency | License | Status |
|--------|----------|------------------|---------|--------|
| [World Bank - Voice & Accountability](https://data.worldbank.org) | 190+ countries | Annual | CC BY 4.0 | ✅ Implemented |
| [World Bank - Government Effectiveness](https://data.worldbank.org) | 190+ countries | Annual | CC BY 4.0 | ✅ Implemented |
| [World Bank - Control of Corruption](https://data.worldbank.org) | 190+ countries | Annual | CC BY 4.0 | ✅ Implemented |

### 10. Social Inclusion (5% weight)
| Source | Coverage | Update Frequency | License | Status |
|--------|----------|------------------|---------|--------|
| [UNDP Gender Inequality Index](https://hdr.undp.org/data-center/thematic-composite-indices/gender-inequality-index) | 170 countries | Annual | Public | 🔄 Planned |
| Freedom House Civil Liberties | 195 countries | Annual | CC BY 4.0 | ✅ Implemented |
| [World Bank - Voice & Accountability](https://data.worldbank.org) | 190+ countries | Annual | CC BY 4.0 | ✅ Implemented |

## Data Availability Legend

- ✅ **Implemented** - Data fetcher exists and data is used in calculations
- 🔄 **Planned** - Source identified, fetcher to be implemented
- 📋 **Reference only** - Used for validation/comparison, not in calculations (license restrictions)

## Exceptions and Estimates

When real data is unavailable, we document exceptions in `data/exceptions.json`:

```json
{
  "countryIso3": "XXX",
  "dimension": "healthcareAccess",
  "estimatedValue": 50,
  "reason": "No WHO UHC data available for this territory",
  "methodology": "Estimated based on regional average and GDP per capita",
  "confidence": "low",
  "lastReviewed": "2025-01-15"
}
```

### Transparency Principles

1. **Real data first** - We always prefer real data from established sources
2. **Document exceptions** - Every estimated value is documented with reasoning
3. **Confidence levels** - Each data point has a confidence indicator (high/medium/low)
4. **Source tracking** - Output includes which sources were used per country
5. **Open for review** - Anyone can challenge or improve our methodology

## API Endpoints Used

### World Bank API
```
https://api.worldbank.org/v2/country/all/indicator/{INDICATOR}?format=json&per_page=300&date=2023
```
Indicators:
- `SI.POV.GINI` - GINI Index
- `VA.EST` - Voice and Accountability
- `GE.EST` - Government Effectiveness
- `CC.EST` - Control of Corruption
- `RQ.EST` - Regulatory Quality
- `RL.EST` - Rule of Law

### RSF API
```
https://rsf.org/index/results?year=2024&type=json
```

### Freedom House
Manual download from: https://freedomhouse.org/report/freedom-world

### V-Dem (Planned)
```
https://www.v-dem.net/vdemds.html
```
Or via R package: `vdemdata`

## Contributing New Sources

To add a new data source:

1. Create fetcher in `fetch/` directory
2. Document source in this file
3. Update dimension mappings in `generate.ts`
4. Add to `SOURCES_CONFIG` in `calculate.ts`
5. Submit PR with sample output

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01 | Initial release with FH, RSF, World Bank |
| 1.1 | 2025-01 | Added 191 countries, exceptions system |
