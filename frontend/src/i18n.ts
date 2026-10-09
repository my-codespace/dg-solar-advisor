// ── i18n translations (English + Hindi) ─────────────────────────────────────

import type { Lang } from './types';

const translations = {
  en: {
    // Nav
    appName: 'SunSwitch',
    appTagline: 'DG-to-Solar Advisor for Housing Societies',
    loadDemo: 'Load Demo Society',
    toggleLang: 'हिंदी',

    // Steps
    step1: 'Society Profile',
    step2: 'DG Usage',
    step3: 'Analysis',
    step4: 'Report',
    next: 'Next →',
    back: '← Back',
    analyze: 'Analyze Now',
    calculating: 'Calculating…',

    // Profile
    societyName: 'Society Name',
    city: 'City',
    numFlats: 'Number of Flats',
    dgCapacity: 'DG Capacity (kVA)',
    roofArea: 'Roof Area (m²)',
    roofAreaHint: 'Draw on map below or enter manually',
    gridTariff: 'Grid Tariff (₹/kWh)',
    dieselPrice: 'Diesel Price (₹/L)',

    // DG Usage
    howToEnter: 'How would you like to enter DG data?',
    uploadPhoto: 'Upload DG logbook / diesel bill photo',
    manualEntry: 'Manual entry',
    litresConsumed: 'Diesel Consumed (litres)',
    runningHours: 'DG Running Hours',
    periodMonths: 'Period (months)',
    loadFactor: 'Load Factor',
    powerFactor: 'Power Factor',
    maintenanceCost: 'Maintenance Cost (₹/hour)',

    // Textract
    uploadInstruction: 'Upload a photo of your DG logbook or diesel bill. Textract will extract the data for your review.',
    extracting: 'Extracting data…',
    reviewData: 'Review Extracted Data',
    lowConfNote: 'Cells highlighted in red have low confidence. Please verify these values.',
    confirmData: 'Confirm & Continue',

    // Analysis
    dgCostPerKwh: 'DG Cost per kWh',
    annualDgSpend: 'Annual DG Spend',
    annualCo2: 'Annual CO₂ from DG',
    annualPm25: 'Annual PM2.5 from DG',
    solarYearOne: 'Solar Year-1 Generation',
    solarCapacity: 'Installed Solar Capacity',
    grossCost: 'Gross Installation Cost',
    subsidyAmount: 'PM Surya Ghar Subsidy',
    netCost: 'Net Cost After Subsidy',
    payback: 'Payback Period',
    npv: '25-Year NPV',
    savings25yr: '25-Year Savings',
    co2Avoided: 'CO₂ Avoided (25 yr)',
    solarLcoe: 'Solar LCOE',

    // Sensitivity
    sensitivityPanel: 'Sensitivity Analysis',
    sensitivityHint: 'Drag sliders to see how results change',

    // Report
    saveReport: 'Save & Share Report',
    printReport: 'Print / PDF',
    reportUrl: 'Shareable link',
    summaryEn: 'Plain-Language Summary',
    summaryHi: 'हिंदी में सारांश',

    // Disclaimer
    disclaimer: '⚠️ Estimates only – not engineering advice. Engage a certified solar installer for a site survey before investing.',
    subsidyDisclaimer: 'Subsidy rates shown are as of mid-2025. Verify current rules at',
    pmsgLink: 'pmsuryaghar.gov.in',
    noPrivacy: 'No personally identifiable information is stored.',

    // Errors
    errorApi: 'Could not connect to the analysis server. Showing demo data.',
    errorValidation: 'Please fix the following errors:',
    errorExtract: 'Could not extract data from the image. Please enter manually.',

    // Assumptions
    assumptionTag: 'ASSUMPTION',
    sourceNote: 'Source',
    verifyNote: 'verify with local data',
  },
  hi: {
    appName: 'SunSwitch',
    appTagline: 'हाउसिंग सोसाइटी के लिए DG-से-सोलर सलाहकार',
    loadDemo: 'डेमो सोसाइटी लोड करें',
    toggleLang: 'English',

    step1: 'सोसाइटी प्रोफाइल',
    step2: 'DG उपयोग',
    step3: 'विश्लेषण',
    step4: 'रिपोर्ट',
    next: 'आगे →',
    back: '← वापस',
    analyze: 'अभी विश्लेषण करें',
    calculating: 'गणना हो रही है…',

    societyName: 'सोसाइटी का नाम',
    city: 'शहर',
    numFlats: 'फ्लैटों की संख्या',
    dgCapacity: 'DG क्षमता (kVA)',
    roofArea: 'छत का क्षेत्रफल (m²)',
    roofAreaHint: 'नीचे मानचित्र पर खींचें या मैन्युअल दर्ज करें',
    gridTariff: 'ग्रिड टैरिफ (₹/kWh)',
    dieselPrice: 'डीजल मूल्य (₹/L)',

    howToEnter: 'DG डेटा कैसे दर्ज करना चाहते हैं?',
    uploadPhoto: 'DG लॉगबुक / डीजल बिल फोटो अपलोड करें',
    manualEntry: 'मैन्युअल प्रविष्टि',
    litresConsumed: 'डीजल खपत (लीटर)',
    runningHours: 'DG चलने के घंटे',
    periodMonths: 'अवधि (महीने)',
    loadFactor: 'लोड फैक्टर',
    powerFactor: 'पावर फैक्टर',
    maintenanceCost: 'रखरखाव लागत (₹/घंटा)',

    uploadInstruction: 'DG लॉगबुक या डीजल बिल की फोटो अपलोड करें। Textract डेटा निकालेगा।',
    extracting: 'डेटा निकाला जा रहा है…',
    reviewData: 'निकाले गए डेटा की समीक्षा करें',
    lowConfNote: 'लाल रंग में हाइलाइट की गई सेल में कम विश्वास है। इन मूल्यों को सत्यापित करें।',
    confirmData: 'पुष्टि करें और जारी रखें',

    dgCostPerKwh: 'DG लागत प्रति kWh',
    annualDgSpend: 'वार्षिक DG खर्च',
    annualCo2: 'DG से वार्षिक CO₂',
    annualPm25: 'DG से वार्षिक PM2.5',
    solarYearOne: 'सौर वर्ष-1 उत्पादन',
    solarCapacity: 'स्थापित सौर क्षमता',
    grossCost: 'कुल स्थापना लागत',
    subsidyAmount: 'PM सूर्य घर सब्सिडी',
    netCost: 'सब्सिडी के बाद शुद्ध लागत',
    payback: 'भुगतान वापसी अवधि',
    npv: '25-वर्षीय NPV',
    savings25yr: '25-वर्षीय बचत',
    co2Avoided: 'टाली गई CO₂ (25 वर्ष)',
    solarLcoe: 'सौर LCOE',

    sensitivityPanel: 'संवेदनशीलता विश्लेषण',
    sensitivityHint: 'परिणाम देखने के लिए स्लाइडर खींचें',

    saveReport: 'रिपोर्ट सहेजें और साझा करें',
    printReport: 'प्रिंट / PDF',
    reportUrl: 'साझा करने योग्य लिंक',
    summaryEn: 'अंग्रेज़ी में सारांश',
    summaryHi: 'हिंदी में सारांश',

    disclaimer: '⚠️ केवल अनुमान – इंजीनियरिंग सलाह नहीं। निवेश से पहले प्रमाणित सोलर इंस्टॉलर से साइट सर्वे कराएं।',
    subsidyDisclaimer: 'दिखाई गई सब्सिडी दरें मध्य-2025 की हैं। वर्तमान नियम यहाँ सत्यापित करें:',
    pmsgLink: 'pmsuryaghar.gov.in',
    noPrivacy: 'कोई व्यक्तिगत पहचान योग्य जानकारी संग्रहीत नहीं की जाती।',

    errorApi: 'विश्लेषण सर्वर से कनेक्ट नहीं हो सका। डेमो डेटा दिखाया जा रहा है।',
    errorValidation: 'कृपया निम्नलिखित त्रुटियाँ ठीक करें:',
    errorExtract: 'छवि से डेटा नहीं निकाला जा सका। कृपया मैन्युअल दर्ज करें।',

    assumptionTag: 'अनुमान',
    sourceNote: 'स्रोत',
    verifyNote: 'स्थानीय डेटा से सत्यापित करें',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function useT(lang: Lang) {
  return (key: TranslationKey): string => translations[lang][key] as string;
}

export function fmt(n: number, decimals = 0): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function fmtCr(rs: number): string {
  if (rs >= 1_00_00_000) return `₹${(rs / 1_00_00_000).toFixed(2)} Cr`;
  if (rs >= 1_00_000) return `₹${(rs / 1_00_000).toFixed(2)} L`;
  return `₹${fmt(rs)}`;
}
