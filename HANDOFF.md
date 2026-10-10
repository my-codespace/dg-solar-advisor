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

### Step 4 — Enable Bedrock model access

In the AWS Console:
1. Go to **Amazon Bedrock** → **Model access** → ap-south-1 (or us-east-1)
2. Request access to: `anthropic.claude-3-haiku-20240307-v1:0`
3. Approval is instant for Claude Haiku

---

## How to Run Locally (no AWS needed)

```powershell
cd C:\Users\Chirag\Desktop\Project\frontend
npm install        # if node_modules missing
npm run dev        # opens http://localhost:5173
# Click "Load Demo Society" — full analysis without any API
```

---

## Known Cosmetic Warning (non-breaking)

During `npm run build`, you'll see:
```
@import url('...google fonts...') must precede all rules aside from @charset and @layer
```
This is a CSS ordering warning from PostCSS — it does **not** break anything. The build succeeds and the fonts load correctly.

**Fix (optional):** In `index.css`, move the Google Fonts `@import url(...)` line to be the very first line (before `@import "tailwindcss"`). This will suppress the warning.

---

## AWS Services Needed (all free tier)

| Service | Region | Notes |
|---|---|---|
| Lambda | ap-south-1 | Auto-created by SAM |
| API Gateway | ap-south-1 | Auto-created by SAM |
| DynamoDB | ap-south-1 | Auto-created by SAM, PAY_PER_REQUEST |
| S3 (upload bucket) | ap-south-1 | Auto-created by SAM, 7-day lifecycle |
| Textract | ap-south-1 | Used by /extract-logbook Lambda |
| Bedrock Claude Haiku | us-east-1 | Must enable model access manually |
| Amplify Hosting | us-east-1 | Connect GitHub repo |

---

*Last updated: 2026-10-10 · SunSwitch · Environmental Hacks x AWS Hackathon*
