# SunSwitch — Hackathon Pitch Outline

> **Pitch duration:** 3–5 minutes
> **Tracks:** Air + Waste & Energy
> **Event:** Environmental Hacks x AWS by Bharat Berlín (wemakedevs.org/aws/env)

---

## Slide 1 — The Problem (30 sec)

**"Delhi-NCR housing societies are burning money and air."**

- 50,000+ RWA-managed societies across Delhi-NCR
- All use diesel generator sets for power backup
- Average DG cost: **₹13–18/kWh** — vs. ₹8–9/kWh grid rate
- A typical 200-flat society: **₹16 lakh/year** on diesel
- That same DG emits **48 tonnes of CO₂** and measurable PM2.5 — right in the neighbourhood
- RWA treasurers have **no tool** to quantify this or evaluate solar alternatives

---

## Slide 2 — The Solution (30 sec)

**SunSwitch: a 5-minute, free advisor for RWA committees**

Three inputs → full analysis:
1. Society profile (city, flats, DG size, roof area)
2. DG usage (diesel consumed, hours run — or just photograph the logbook)
3. Battery backup needs

Outputs:
- Real DG cost per kWh
- CO₂ and PM2.5 from DG
- Solar potential (NASA satellite data)
- Payback period, 25-year savings, PM Surya Ghar subsidy
- Shareable bilingual (English + Hindi) committee report

---

## Slide 3 — Live Demo (60–90 sec)

*(Run the live demo from `docs/demo-script.md`)*

Key moments to hit:
- ₹13.34/kWh DG cost vs. ₹2.62/kWh solar
- 5.8-year payback
- ₹2.25 crore 25-year savings
- 2,748 tonnes CO₂ avoided
- Hindi report with one click

---

## Slide 4 — AWS Architecture (30 sec)

**Why AWS? Because the problem needs AWS-scale tools.**

| Challenge | AWS Service |
|---|---|
| Reading handwritten DG logbooks | **Amazon Textract** (AnalyzeDocument) |
| Generating Hindi summaries | **Amazon Bedrock** (Claude Haiku) |
| Reproducible, cost-controlled infra | **AWS SAM** (open-source, one-command deploy) |
| Persistent shareable reports | **DynamoDB** with TTL |
| Secure photo uploads | **S3** pre-signed URLs, 7-day lifecycle |
| Zero-maintenance hosting | **AWS Amplify** |

**Cost at demo scale: < $1/month.** All on the AWS Free Tier.

---

## Slide 5 — Impact (30 sec)

**Per society:**
- ₹2.25 crore saved over 25 years
- 2,748 tonnes CO₂ avoided ≈ taking 580 cars off the road for a year
- 48 tonnes less CO₂ per year → measurable improvement in local PM2.5

**Scale:**
- 50,000 societies in Delhi-NCR alone
- If 1% switch: **saves ₹11,250 crore** and avoids **1.37 million tonnes CO₂**
- Tool works for any city in India with a roof and a DG set

---

## Slide 6 — Why We'll Win (15 sec)

✅ Specific user (RWA treasurer — not "people in general")  
✅ Real data (NASA POWER, CEA emission factors, IPCC)  
✅ Working demo (load demo society → full analysis in <5 sec)  
✅ Measurable impact (crore-scale savings, tonne-scale CO₂)  
✅ AWS-first (SAM + Textract + Bedrock + everything)  
✅ All-original code, MIT licensed, open source

---

## Q&A Prep

**"What if NASA POWER API is down?"**
> We cross-check with PVGIS and fall back to bundled city averages — clearly labeled as estimates. The app always works.

**"How accurate are the emission factors?"**
> CO₂ is IPCC-sourced. PM2.5 and NOx are from US EPA AP-42 — explicitly labeled as [ASSUMPTION] in both the UI and code. We recommend verifying against CPCB data for production use.

**"What about net metering? Each state is different."**
> Currently we model 100% self-consumption (conservative). Net metering is listed as a future enhancement — per-state DISCOM tariff slabs would be additive.

**"Is this deployed?"**
> Yes — one-command `sam deploy` to AWS ap-south-1. See README for steps.

---

*Prepared for Environmental Hacks x AWS Hackathon · October 2025*
