# SunSwitch — Final Project Status

> Repo: https://github.com/my-codespace/dg-solar-advisor
> Local: `C:\Users\Chirag\Desktop\Project`
> Last commit: `b3d73c3`

---

## ✅ Everything Is Complete

The frontend **builds cleanly** (`npm run build` → success).
The backend **29/29 unit tests pass** (`pytest test_calculations.py -v`).

---

## Current Repo Structure

```
dg-solar-advisor/
├── README.md                        ✅ Full docs + architecture diagram
├── HANDOFF.md                       ✅ This file
├── LICENSE                          ✅ MIT
├── samconfig.toml                   ✅ One-command SAM deploy
├── amplify.yml                      ✅ Amplify CI/CD build spec
├── deploy.ps1                       ✅ Windows deploy script
├── deploy.sh                        ✅ Linux/macOS deploy script
├── docker-compose.yml               ✅ LocalStack offline dev
│
├── backend/
│   ├── shared/
│   │   ├── calculations.py          ✅ Pure calc engine (29 tests pass)
│   │   ├── irradiance.py            ✅ NASA POWER + PVGIS API client
│   │   └── test_calculations.py     ✅ 29 unit tests
│   ├── analyze/handler.py           ✅ /analyze Lambda
│   ├── extract/handler.py           ✅ /extract-logbook Lambda (Textract)
│   └── report/handler.py            ✅ /report Lambda (DynamoDB + Bedrock)
│
├── frontend/                        ✅ BUILD PASSES
│   ├── src/
│   │   ├── App.tsx                  ✅ Step machine + demo mode + router
│   │   ├── main.tsx                 ✅ React Router + leaflet CSS import
│   │   ├── index.css                ✅ Tailwind v4 @theme + glassmorphism
│   │   ├── types.ts                 ✅ All TypeScript interfaces
│   │   ├── constants.ts             ✅ Demo data + slider configs
│   │   ├── i18n.ts                  ✅ English + Hindi translations
│   │   ├── api.ts                   ✅ Typed API client
│   │   ├── components/
│   │   │   ├── UI.tsx               ✅ MetricCard, Banner, InputField, etc.
│   │   │   ├── Charts.tsx           ✅ Recharts visualizations
│   │   │   └── MapPicker.tsx        ✅ Leaflet polygon roof drawing
│   │   └── pages/
│   │       ├── ProfileStep.tsx      ✅ Step 1
│   │       ├── DGUsageStep.tsx      ✅ Step 2 (+ Textract upload)
│   │       ├── AnalysisStep.tsx     ✅ Step 3
│   │       ├── ReportStep.tsx       ✅ Step 4
│   │       └── SharedReportPage.tsx ✅ /report/:id shared URL page
│   ├── vite.config.ts               ✅ @tailwindcss/vite plugin
│   └── postcss.config.js            ✅ autoprefixer only (Tailwind via Vite)
│
├── infra/template.yaml              ✅ AWS SAM template
└── docs/
    ├── demo-script.md               ✅ 90-second judge demo
    └── pitch-outline.md             ✅ Hackathon pitch slides
```

---

## The ONE Remaining Task: AWS Deploy

Everything is coded and tested. The only thing left is **deployment to AWS** to get a live URL.

### Step 1 — Deploy backend (AWS SAM)

Prerequisites: AWS CLI configured with credentials, SAM CLI installed.

```powershell
cd C:\Users\Chirag\Desktop\Project

# Option A: Use the deploy script
.\deploy.ps1

# Option B: Manual
sam build --template infra/template.yaml --base-dir .
sam deploy --guided --template infra/template.yaml
# Answer the prompts: stack=sunswitch-dev, region=ap-south-1, confirm=y
```

After deploy, get the API URL:
```powershell
aws cloudformation describe-stacks `
  --stack-name sunswitch-dev `
  --query "Stacks[0].Outputs[?OutputKey=='ApiBaseUrl'].OutputValue" `
  --output text
```

### Step 2 — Deploy frontend (AWS Amplify)

1. Go to [AWS Amplify Console](https://ap-south-1.console.aws.amazon.com/amplify/home)
2. "Host web app" → GitHub → `my-codespace/dg-solar-advisor`
3. Amplify auto-detects `amplify.yml` — builds from `frontend/` directory
4. Add environment variable: `VITE_API_BASE` = the API Gateway URL from Step 1
5. Deploy → get the Amplify URL (e.g. `https://main.d1234567.amplifyapp.com`)

### Step 3 — Update CORS in SAM template

In `infra/template.yaml`, find the `ALLOWED_ORIGIN` environment variable on each Lambda and update it to the Amplify URL, then redeploy:

```powershell
sam deploy --template infra/template.yaml `
  --stack-name sunswitch-dev `
  --parameter-overrides "Environment=dev AllowedOrigin=https://main.d1234567.amplifyapp.com"
```

### Step 4 — Amazon Bedrock Model Status

- Switched to **Amazon Nova Lite (`us.amazon.nova-lite-v1:0`)** in `us-east-1` for both document multimodal extraction and RWA executive summary generation.
- Handles both images (JPEG, PNG) and PDF documents.
- Fully tested on live deployed Lambda in `ap-south-1` (`https://uzok2zqm7c.execute-api.ap-south-1.amazonaws.com/dev`).

---

## Current Status & Verification (2026-10-11)

- **Backend Deployed:** CloudFormation stack `sunswitch-dev` in `ap-south-1`.
  - `ApiBaseUrl`: `https://uzok2zqm7c.execute-api.ap-south-1.amazonaws.com/dev`
  - `UploadBucketName`: `sunswitch-uploads-dev-844459572782`
  - `ReportsTableName`: `sunswitch-reports-dev`
- **AI Document Extraction:** Amazon Bedrock Nova Lite extracted handwritten logbook data with 100% accuracy:
  - 7 rows detected: `16-1 (23L), 27-1 (24L), 22-2 (25L), 4-3 (36L), 2-4 (47L), 25-5 (51L), 26-6 (63L)`
  - Computed totals: **269 L Diesel**, **12 Running Hours**, **6 Months**
- **Executive Summaries & Persistence:** Verified with `/report` endpoint generating dual-language summaries and storing into DynamoDB.
- **Frontend Running:** Vite running at `http://localhost:5173`. Auto-populates extracted totals into form inputs.

---

## AWS Services Used

| Service | Region | Notes |
|---|---|---|
| Lambda (3 functions) | ap-south-1 | Analyze, Extract, Report |
| API Gateway | ap-south-1 | REST API `/analyze`, `/extract-logbook`, `/report` |
| DynamoDB | ap-south-1 | `sunswitch-reports-dev` (PAY_PER_REQUEST, TTL enabled) |
| S3 | ap-south-1 | `sunswitch-uploads-dev-...` (7-day lifecycle) |
| Bedrock Nova Lite | us-east-1 | `us.amazon.nova-lite-v1:0` (Multimodal vision & text) |
| Amplify Hosting | ap-south-1 / us-east-1 | Ready for GitHub connect deployment |

---

*Last updated: 2026-10-11 · SunSwitch · Environmental Hacks x AWS Hackathon*
