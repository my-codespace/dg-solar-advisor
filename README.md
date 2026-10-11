# 🌞 SunSwitch — DG-to-Solar Switch Advisor for Housing Societies

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![AWS SAM](https://img.shields.io/badge/AWS-SAM-orange)](https://aws.amazon.com/serverless/sam/)
[![Hackathon](https://img.shields.io/badge/Hackathon-Environmental%20Hacks%20x%20AWS-green)](https://wemakedevs.org/aws/env)

> **Environmental Hacks x AWS Hackathon** · Tracks: **Air** + **Waste & Energy**  
> 🌐 **Live Demo:** [https://master.d2s5glz92d1mf0.amplifyapp.com](https://master.d2s5glz92d1mf0.amplifyapp.com)  
> ⚡ **API Gateway:** `https://uzok2zqm7c.execute-api.ap-south-1.amazonaws.com/dev`

## The Problem

Housing societies across Indian metros (Delhi-NCR, Noida, Gurugram, Ghaziabad) rely heavily on diesel generator (DG) sets during grid outages. Under CAQM / GRAP restrictions, this is:

- **Expensive:** DG power costs **₹25–35+/kWh** vs. ₹7–8/kWh from the grid.
- **Polluting:** A typical 125 kVA DG set emits **48+ tonnes of CO₂/year** and hazardous PM2.5 / NOx into residential air.
- **Opaque:** RWA committees and residents have no easy tool to audit real diesel logbooks, calculate true generation costs, or evaluate the ROI of rooftop solar + battery backup.

## The Solution

**SunSwitch** is a serverless web advisor built for RWA treasurers, secretaries, and residential communities. In under 3 minutes, it delivers:

1. **AI-Powered Logbook Extraction** — Upload handwritten DG logbook photos or scanned fuel bills; Amazon Bedrock Nova Lite multimodal AI extracts hours, litres, and dates automatically.
2. **True DG Cost per kWh** — Fuel + maintenance amortized across actual kilowatt-hours generated.
3. **NASA Satellite Solar Irradiance** — Ground-truth solar data queried live via NASA POWER API for the society's exact GPS coordinates.
4. **Interactive Rooftop Sizing** — Integrated satellite map to measure usable rooftop area with polygon drawing.
5. **Battery Backup Sizing** — Replaces polluting DG backup with clean LFP battery energy storage sized for outage duration.
6. **Financial & Subsidy Engine** — Payback period, 25-year NPV, and central PM Surya Ghar Muft Bijli Yojana rooftop subsidies.
7. **Bilingual Executive Report** — AI-generated plain-language executive summaries in English and Hindi, shareable via instant link and printable for AGM/committee meetings.

---

## Architecture

```mermaid
graph TD
    U["RWA Treasurer / Secretary"] -->|HTTPS| AF[AWS Amplify Frontend - React + Vite]
    AF -->|REST API| AG[Amazon API Gateway]
    AG --> AL["AnalyzeFunction (Python 3.12)"]
    AG --> EL["ExtractFunction (Python 3.12)"]
    AG --> RL["ReportFunction (Python 3.12)"]
    AL --> NASA[NASA POWER API - Satellite Irradiance]
    EL --> S3[Amazon S3 Upload Bucket - 7-day Lifecycle]
    EL --> BR1["Amazon Bedrock (Nova Lite Multimodal Vision)"]
    RL --> DB[Amazon DynamoDB Reports Table - TTL 90d]
    RL --> BR2["Amazon Bedrock (Nova Lite Bilingual Summary)"]
    AL --> SL[Shared Calculation Layer]
    EL --> SL
    RL --> SL
```

## AWS Services Used

| Service | Role | Why Selected |
|---|---|---|
| **AWS Amplify** | Global hosting & CI/CD for React Vite frontend | Instant Git deploys, global edge delivery |
| **Amazon API Gateway** | Serverless REST API endpoints (`/analyze`, `/extract-logbook`, `/report`) | High throughput, managed CORS, pay-per-request |
| **AWS Lambda (Python 3.12)** | Microservices execution with shared calculation layer | Cost-efficient, instant scaling, 0 idle cost |
| **Amazon Bedrock (Nova Lite)** | Multimodal AI vision for logbook OCR & bilingual report generation | Parses handwritten Hindi/English tables + generates plain-language RWA summaries |
| **Amazon DynamoDB** | Persistent report storage with 90-day TTL | Serverless on-demand NoSQL with automated record expiration |
| **Amazon S3** | DG logbook and diesel bill uploads via pre-signed URLs | Regional endpoints with automated 7-day lifecycle cleanup for data privacy |
| **AWS SAM** | Infrastructure as Code (IaC) | Declarative template, reproducible single-command deployment |

---

## Calculation Model

All calculations are implemented as **pure, unit-tested Python functions** with zero side effects.

### Solar Energy Yield
```
E = A_usable × G × η × PR × T_loss × (1 - d)^(year-1)
```
Where:
- `A_usable` = roof area × usable fraction (default 60%) [ASSUMPTION]
- `G` = annual irradiance kWh/m²/yr — from **NASA POWER API** (lat/lon lookup)
- `η` = panel efficiency (default 20%, monocrystalline 2025) [ASSUMPTION]
- `PR` = performance ratio (default 75%) [ASSUMPTION]
- `T_loss` = temperature loss factor (default 95%) [ASSUMPTION]
- `d` = annual degradation rate (default 0.5%/yr) [ASSUMPTION]

### DG Cost per kWh
```
kWh = hours × kVA × load_factor × power_factor
cost/kWh = (litres × diesel_price + hours × maintenance_rate) / kWh
```

### Hand-Verified Example
| Input | Value |
|---|---|
| DG capacity | 125 kVA |
| Running hours | 200 hr/month |
| Load factor | 0.7 |
| Power factor | 0.8 |
| **kWh generated** | **200 × 125 × 0.7 × 0.8 = 14,000 kWh** |
| Diesel consumed | 2,400 L @ ₹98/L |
| Fuel cost | ₹2,35,200 |
| Maintenance | 200h × ₹15 = ₹3,000 |
| **Total cost** | **₹2,38,200** |
| **Cost/kWh** | **₹2,38,200 / 14,000 = ₹17.01/kWh** |

### Emission Factors

| Pollutant | Factor | Unit | Source |
|---|---|---|---|
| CO₂ | 2.68 | kg CO₂/litre diesel | IPCC 2006 Guidelines Vol.2 Ch.3 Table 3.2.2 |
| PM2.5 | 0.50 | g PM2.5/kWh | US EPA AP-42 Ch.3.3 **[ASSUMPTION — verify with CPCB]** |
| NOx | 9.0 | g NOx/kWh | US EPA AP-42 Ch.3.3 **[ASSUMPTION]** |
| SO₂ | 0.03 | g SO₂/litre | BS-VI diesel ≤10 ppm S **[ASSUMPTION]** |
| Grid CO₂ | 0.706 | kg CO₂/kWh | CEA CO2 Baseline Database v17 (2023-24) |

> All assumptions are **explicitly tagged** in the UI, report, and code.

---

## Project Structure

```
dg-solar-advisor/
├── backend/
│   ├── shared/
│   │   ├── calculations.py      # Pure calculation engine (no AWS deps)
│   │   ├── irradiance.py        # NASA POWER + PVGIS API client
│   │   └── test_calculations.py # 25+ unit tests, hand-verified
│   ├── analyze/handler.py       # /analyze Lambda
│   ├── extract/handler.py       # /extract-logbook Lambda (Bedrock Nova Lite Multimodal)
│   └── report/handler.py        # /report Lambda (DynamoDB + Bedrock Nova Lite Summaries)
├── frontend/                    # React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── App.tsx              # Step machine, demo mode
│       ├── components/          # UI, Charts (Recharts), MapPicker (Leaflet)
│       └── pages/               # ProfileStep, DGUsageStep, AnalysisStep, ReportStep
├── infra/template.yaml          # AWS SAM template
├── deploy.ps1                   # Windows one-command deploy
├── deploy.sh                    # Linux/macOS one-command deploy
├── amplify.yml                  # Amplify CI/CD build spec
└── docker-compose.yml           # LocalStack offline development
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- Python 3.12+
- AWS CLI (for deployment only)
- AWS SAM CLI (for deployment only)

### Frontend (no AWS needed)

```powershell
cd frontend
npm install
npm run dev
# Open http://localhost:5173
# Click "Load Demo Society" for instant demo with no API
```

### Backend Unit Tests (no AWS needed)

```powershell
cd backend/shared
pip install pytest
pytest test_calculations.py -v
```

### Full Local Dev with LocalStack

```powershell
# Requires Docker
docker-compose up -d

# Frontend pointing to local API
cd frontend
echo "VITE_API_BASE=http://localhost:3000" > .env.local
npm run dev
```

---

## Deploy to AWS

### One-Command Deploy

```powershell
# Windows
.\deploy.ps1

# Linux/macOS
chmod +x deploy.sh && ./deploy.sh
```

### Manual Steps

```powershell
# 1. Build
sam build --template infra/template.yaml --base-dir .

# 2. Deploy (first time — guided)
sam deploy --guided --template infra/template.yaml

# 3. Get API URL
aws cloudformation describe-stacks --stack-name sunswitch-dev --query "Stacks[0].Outputs"

# 4. Set frontend env var
echo "VITE_API_BASE=https://<id>.execute-api.ap-south-1.amazonaws.com/dev" > frontend/.env.local

# 5. Deploy frontend to Amplify
# See amplify.yml — connect GitHub in Amplify Console
```

---

## 💰 Cost Control

Estimated AWS cost under demo/hackathon traffic:

| Service | Free Tier | Estimated Cost |
|---|---|---|
| Lambda | 1M requests/month | ~$0 |
| API Gateway | 1M calls/month | ~$0 |
| DynamoDB | 25 GB + 25 RCU/WCU | ~$0 |
| S3 | 5 GB storage | ~$0.01/month |
| Textract | 1,000 pages/month free | ~$0.015/page after |
| Bedrock Claude Haiku | Pay-per-token | ~$0.001/report |
| Amplify Hosting | 5 GB/15 GB bandwidth | ~$0 |

**Estimated total: < $1/month at demo scale.**

### ⚠️ Set a Billing Alarm (Strongly Recommended)

1. Go to [AWS Budgets](https://console.aws.amazon.com/billing/home#/budgets)
2. Create budget → **Cost budget** → $10/month
3. Add alert → 80% threshold → your email via SNS

---

## Privacy & Disclaimer

- **No PII stored.** Society names and inputs are stored only in DynamoDB with a 90-day TTL.
- Logbook upload images are deleted from S3 after 7 days.
- **Estimates only.** This tool does not constitute engineering advice. Engage a certified solar installer for a site survey before investing.
- Subsidy rates shown are as of mid-2025. Verify current rules at [pmsuryaghar.gov.in](https://pmsuryaghar.gov.in).

---

## Limitations & Assumptions

1. Solar irradiance from NASA POWER is a multi-year average — actual yield varies year to year.
2. Emission factors for PM2.5/NOx are from US EPA AP-42 (labeled as assumptions; Indian CPCB data preferred but less accessible).
3. Financial model assumes 100% solar self-consumption. Actual savings depend on net metering policy in each state.
4. Battery costs are market estimates for 2025 LFP technology.
5. PM Surya Ghar subsidy rates are subject to change — always verify before communicating to residents.

---

## Future Work

- [ ] Bulk analysis for RWA federations (multiple societies)
- [ ] State-specific net metering tariff data
- [ ] WhatsApp Bot integration for committee members
- [ ] DISCOM-specific tariff slabs (not flat rate)
- [ ] Integration with PM Surya Ghar application portal API
- [ ] Mobile app with camera capture for DG logbooks

---

## License

MIT License — see [LICENSE](LICENSE).

Built for **Environmental Hacks x AWS Hackathon** by Chirag Gaurav.
