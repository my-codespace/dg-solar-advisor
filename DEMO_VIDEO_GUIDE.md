# 🏆 SunSwitch — Hackathon Video Demonstration & Presentation Guide

> **Target Duration:** 3 to 4 Minutes  
> **Target Audience:** Hackathon Judges (Environmental Hacks x AWS)  
> **Key Objective:** Win the hackathon by demonstrating deep AWS integration, high real-world environmental impact for Indian cities, and a polished user experience.

---

## 🎬 Video Recording Checklist

- [ ] **Browser Window:** Maximize your browser (1080p resolution). Close unnecessary tabs.
- [ ] **Live URL:** `https://master.d2s5glz92d1mf0.amplifyapp.com`
- [ ] **Assets Ready:** Have `log.jpg` easily accessible on your desktop to drag and drop.
- [ ] **Audio:** Use a clean microphone or headset in a quiet room. Speak with confidence and energy!
- [ ] **Screen Recorder:** OBS Studio, Windows Game Bar (`Win + G`), or Loom (1080p, 60fps).

---

## ⏱️ Video Timeline at a Glance

| Time | Section | Screen Action | Core Message |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:35** | **The Hook & Problem** | Home page / Title banner | Indian urban air crisis (GRAP) & RWA diesel costs |
| **0:35 – 1:10** | **Step 1: Society & Roof** | Enter profile + Satellite Map | NASA satellite irradiance lookup + GPS roof polygon |
| **1:10 – 2:05** | **Step 2: AI Multimodal OCR** | Drag & drop `log.jpg` | **Amazon Bedrock Nova Lite** reading handwritten logbook |
| **2:05 – 2:55** | **Step 3: Solar & Financials** | Analysis charts & sliders | NASA solar curve, PM Surya Ghar subsidy, 25-yr NPV |
| **2:55 – 3:35** | **Step 4: Bilingual Report** | English/Hindi toggle + Share link | Bedrock executive summaries, DynamoDB sync, PDF print |
| **3:35 – 4:00** | **Architecture & Closing** | Architecture slide / README | 100% serverless AWS stack & environmental impact |

---

## 🎙️ Scene-by-Scene Script & Action Guide

---

### SCENE 1: The Hook & The Crisis (0:00 – 0:35)

#### 🖥️ What to Show on Screen:
- Open your browser at `https://master.d2s5glz92d1mf0.amplifyapp.com`.
- Have the sleek dark UI visible with the title: **SunSwitch — DG-to-Solar Advisor for Housing Societies**.
- Keep your mouse hovering near the **Society Profile** card.

#### 🗣️ Word-for-Word Spoken Script:
> *"Every winter across Delhi-NCR, Mumbai, and Bengaluru, air quality plummets to severe levels. Under GRAP rules, diesel generators are strictly penalized. Yet, over 10,000 high-rise societies burn millions of litres of diesel every year for power backup—paying upwards of ₹30 per unit while pumping tonnes of toxic PM2.5 and CO₂ right into residential air.*
> 
> *Why haven't they switched to clean solar and batteries? Because RWA management committees have no easy way to audit their diesel logbooks or prove the financial ROI to residents.*
> 
> *Meet **SunSwitch**—an AI-powered, serverless solar advisor that turns complex diesel records into an actionable financial and environmental roadmap in under 3 minutes."*

---

### SCENE 2: Society Profile & Live Satellite Sizing (0:35 – 1:10)

#### 🖥️ What to Show on Screen:
1. Fill in the form:
   - **Society Name:** `Green Heights RWA`
   - **City:** Select `Noida` (coordinates auto-populate to `28.5355° N, 77.3910° E`).
   - **Number of Flats:** `200`
   - **DG Capacity:** `125` kVA
2. Click **"Select on Satellite Map"**.
3. Draw a polygon over a rooftop on the satellite map or use the slider (set rooftop area to ~`1500` m²).
4. Click **"Next: DG Usage →"**.

#### 🗣️ Word-for-Word Spoken Script:
> *"Let's begin with Step 1. We enter our society name, choose Noida, and enter 200 flats with a 125 kVA generator.*
> 
> *Notice that SunSwitch instantly anchors exact GPS coordinates. Using our interactive satellite map, the RWA committee can outline their actual rooftop polygon to calculate usable solar area.*
> 
> *These coordinates are queried live against the **NASA POWER satellite database** to fetch multi-year solar irradiance data. Now, let's look at the diesel consumption."*

---

### SCENE 3: The Showstopper — Amazon Bedrock Multimodal OCR (1:10 – 2:05)

#### 🖥️ What to Show on Screen:
1. You are on **Step 2: DG Usage**.
2. Click **"Upload Photo or Bill"** (the left card with the upload icon).
3. Drag and drop `log.jpg` (your handwritten logbook photo) into the drop zone.
4. The spinner will display: *"Using Amazon Bedrock Multimodal AI to read and analyze your logbook"*.
5. In ~3 seconds, the table appears!
6. **Point your cursor to:**
   - The badge: `✨ Amazon Bedrock (us.amazon.nova-lite-v1:0)`.
   - The review table displaying the 7 extracted rows: `16-1 (23L)`, `27-1 (24L)`, `22-2 (25L)`, etc.
   - The form below where **269 Litres**, **12 Hours**, and **6 Months** are auto-populated!
7. Click **"Next: Analysis →"**.

#### 🗣️ Word-for-Word Spoken Script:
> *"Here is where most RWAs get stuck: DG records are kept in messy, handwritten paper logbooks by security guards.*
> 
> *Instead of manual data entry, SunSwitch allows the secretary to simply take a phone photo and upload it. Behind the scenes, the file is securely uploaded via an Amazon S3 pre-signed URL and processed by **Amazon Bedrock using Amazon Nova Lite multimodal vision**.*
> 
> *Watch this: In just three seconds, Bedrock deciphered the handwriting, extracted all log entries into an interactive review table, and automatically calculated the totals: 269 litres of diesel across 12 running hours over 6 months!*
> 
> *The committee can review or edit any cell. Let's proceed to the analysis."*

---

### SCENE 4: Real-Time Solar & Financial Engineering (2:05 – 2:55)

#### 🖥️ What to Show on Screen:
1. You are on **Step 3: Analysis**.
2. Point your cursor to the three highlight metric cards:
   - **DG Cost per Unit:** `₹30.16 / kWh` (highlighted in red)
   - **Grid Tariff:** `₹8.50 / kWh` (orange)
   - **Solar LCOE:** `₹3.40 / kWh` (emerald green)
3. Scroll through the graphs:
   - **NASA POWER Solar Generation Curve** (seasonal monthly generation).
   - **25-Year Cumulative Cash Flow** (showing the payback point).
   - **Emissions Avoided** (CO₂, PM2.5, and NOx metrics).
4. Expand the **Sensitivity Sliders** (e.g. increase Diesel Price or Grid Tariff) and show how the numbers and charts update dynamically in real time!
5. Click **"Generate Shareable Report →"**.

#### 🗣️ Word-for-Word Spoken Script:
> *"Step 3 runs our Python calculation engine on AWS Lambda. Look at this comparison: DG power costs this society **₹30.16 per unit**, while rooftop solar generates clean energy at just **₹3.40 per unit**—an 88% reduction in generation cost!*
> 
> *The solar generation profile is modeled using verified NASA solar flux data. We size a clean Lithium-Ferro-Phosphate (LFP) battery bank to replace the noisy diesel generator during grid outages.*
> 
> *On the financial side, we integrate central **PM Surya Ghar Muft Bijli Yojana** subsidies, showing a capital payback in just 4.3 years and over ₹6.5 Crore in net savings over 25 years—while eliminating over 36,000 tonnes of CO₂ emissions.*
> 
> *With our interactive sensitivity sliders, committee members can stress-test diesel price hikes or grid tariff changes on the fly. Now let's generate the final report."*

---

### SCENE 5: Bilingual RWA Executive Report & Cloud Sharing (2:55 – 3:35)

#### 🖥️ What to Show on Screen:
1. You are on **Step 4: Report**.
2. Show the **Plain-Language Summary** generated by Amazon Bedrock Nova Lite in English.
3. Click the **"हिंदी"** language button in the top navigation bar:
   - The summary instantly switches to natural **Hindi (Devanagari)** tailored for Indian RWA AGM meetings!
4. Click the **"Copy Link"** button next to the shareable URL (`https://.../?report=...`).
5. Open a new Incognito browser tab, paste the link, and hit Enter:
   - Show how the report loads from **Amazon DynamoDB** with zero login barriers.
6. Click **"Print / PDF"** to preview the clean, boardroom-ready printable layout.

#### 🗣️ Word-for-Word Spoken Script:
> *"RWA decisions are made by diverse committees. Technical jargon creates hesitation. That's why SunSwitch uses **Amazon Bedrock** to craft plain-language executive summaries tailored for committee meetings.*
> 
> *And with one click on the language toggle, Bedrock delivers the entire executive summary in fluent Hindi, ensuring every resident and treasurer is aligned.*
> 
> *Each report is saved to **Amazon DynamoDB** with automated TTL expiration for privacy. The treasurer gets an instant shareable link they can WhatsApp to the society group, or click 'Print' to generate a formal PDF for their Annual General Meeting."*

---

### SCENE 6: AWS Architecture & Closing (3:35 – 4:00)

#### 🖥️ What to Show on Screen:
- Switch to the **Architecture diagram** in `README.md` or a slide.
- Highlight the AWS services.

#### 🗣️ Word-for-Word Spoken Script:
> *"Under the hood, SunSwitch is 100% serverless, cost-effective, and production-ready on AWS:*
> - *Hosted globally on **AWS Amplify** with automated CI/CD.*
> - *Secured by **Amazon API Gateway** and **AWS Lambda (Python 3.12)** microservices.*
> - *Powered by **Amazon Bedrock Nova Lite** for both multimodal vision OCR and bilingual generation.*
> - *Backed by **Amazon DynamoDB** and **Amazon S3** with automated lifecycle cleanups.*
> - *Packaged cleanly using **AWS SAM** for one-command deployment.*
> 
> *SunSwitch gives Indian residential communities the data, the AI, and the financial proof to turn off polluting diesel generators and switch to clean solar power.*
> 
> *Thank you!"*

---

## 🎯 Pro Tips to Win Hackathon Scoring

1. **Energy and Pacing:** Don't pause awkwardly. If Bedrock takes 2–3 seconds to extract the logbook, use that moment to say: *"Bedrock Nova Lite is now analyzing the multimodal features of the handwritten page..."*
2. **Emphasize the Environmental Track:** Constantly tie the numbers back to **air quality** (PM2.5, Delhi-NCR winter smog, GRAP compliance) and **energy transition** (PM Surya Ghar, rooftop solar).
3. **Show Real AI Extraction:** Uploading the real `log.jpg` and seeing the handwritten table appear live on screen proves this isn't just a static mockup—it is a working, production-grade AI system on AWS.
4. **Highlight Cost-Effectiveness:** Judges love architectures that don't waste cloud budget. Emphasize that the entire system runs on AWS Serverless Free Tier and Bedrock Nova Lite costs fractions of a cent per query.
