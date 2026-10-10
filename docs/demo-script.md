# SunSwitch — 90-Second Demo Script

> **For hackathon judges and live demo presentations.**
> Practice this until it's smooth. Target time: 90 seconds.

---

## Setup Before Demo

1. Open browser at `http://localhost:5173` (or live Amplify URL)
2. Have a second tab open to `https://pmsuryaghar.gov.in` (for subsidy verification link demo)
3. Zoom browser to 90% so full analysis fits without scrolling
4. If using the Textract upload demo: have `frontend/src/assets/sample-logbook.jpg` ready

---

## Script (90 seconds)

### 0:00 — Hook (10 sec)
> "Every housing society in Delhi-NCR pays ₹13–18 per unit for diesel generator power — that's 2× the grid rate — and nobody knows it. This is SunSwitch."

### 0:10 — Load Demo (5 sec)
- Click **"Load Demo Society"** button (top right)
- App jumps to Step 3 (Analysis) with **Sunrise Heights Apartments, Ghaziabad** pre-loaded

> "One click loads a real 200-flat society. All the data is representative of an actual Delhi-NCR society."

### 0:15 — DG Cost (15 sec)
- Point to **"DG Cost per kWh: ₹13.34"**
- Point to **"Annual DG Spend: ₹16.83L"**
- Point to **"Annual CO₂: 48,240 kg"**

> "This society burns 18,000 litres of diesel a year — ₹16 lakh — and emits 48 tonnes of CO₂. That's a Delhi-to-Mumbai flight for every flat, every year."

### 0:30 — Solar + Financials (20 sec)
- Point to **"Solar Capacity: 144 kWp"**
- Point to **"Payback: 5.8 years"**
- Point to **"25-Year Savings: ₹2.25 Cr"**
- Point to the **cash flow chart** — highlight the payback crossover

> "On a 1,200 m² roof, they can install 144 kW of solar. After the PM Surya Ghar subsidy of ₹25.9 lakh, payback is under 6 years. Over 25 years — ₹2.25 crore saved, 2,748 tonnes of CO₂ avoided."

### 0:50 — Sensitivity Sliders (10 sec)
- Drag **Diesel Price** slider from ₹92 → ₹100
- Payback number updates live

> "Diesel prices keep rising. Drag this slider — payback gets shorter every year they wait."

### 1:00 — Report (15 sec)
- Click **"Save & Share Report"**
- Show the report page with bilingual summary
- Toggle to **Hindi**

> "One click generates a bilingual report — English and Hindi — ready to present at the next committee meeting. Share the link with all residents."

### 1:15 — AWS Mention (10 sec)
> "Under the hood: Amazon Textract reads handwritten DG logbooks, Bedrock generates the Hindi summary, SAM deploys everything with one command, all on the AWS free tier."

### 1:25 — Close (5 sec)
> "SunSwitch — turning India's most expensive electricity into a solar success story, one housing society at a time."

---

## Optional: Textract Upload Demo (add 30 sec if time allows)

1. Go back to Step 2 (DG Usage)
2. Click **"Upload DG logbook photo"**
3. Upload `frontend/src/assets/sample-logbook.jpg`
4. Show the extracted table with confidence scores
5. Highlight any red cells (low confidence) — explain the review step
6. Confirm data and proceed

> "For societies that have paper logbooks, just photograph it. Textract reads the handwriting and extracts running hours and fuel consumption — highlighted in red where it's unsure, so the treasurer can verify."

---

## Key Numbers to Know by Heart

| Metric | Value |
|---|---|
| Demo society | Sunrise Heights, Ghaziabad |
| Flats | 200 |
| DG capacity | 125 kVA |
| Annual diesel | 18,000 L |
| Annual DG spend | ₹16.83 lakh |
| DG cost/kWh | ₹13.34 |
| Annual CO₂ | 48 tonnes |
| Solar capacity | 144 kWp |
| Subsidy | ₹25.9 lakh |
| Net cost | ₹72 lakh |
| Payback | 5.8 years |
| 25-yr savings | ₹2.25 crore |
| CO₂ avoided | 2,748 tonnes |

---

*Practice 3× before the demo. Keep it conversational, not a data dump.*
