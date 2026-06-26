const ISO_CODES: Record<string, string> = {
  "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Andorra": "AD",
  "Angola": "AO", "Argentina": "AR", "Armenia": "AM", "Australia": "AU",
  "Austria": "AT", "Azerbaijan": "AZ", "Bahrain": "BH", "Bangladesh": "BD",
  "Belarus": "BY", "Belgium": "BE", "Bolivia": "BO", "Bosnia and Herzegovina": "BA",
  "Brazil": "BR", "Bulgaria": "BG", "Cambodia": "KH", "Cameroon": "CM",
  "Canada": "CA", "Chile": "CL", "China": "CN", "Colombia": "CO",
  "Costa Rica": "CR", "Croatia": "HR", "Cuba": "CU", "Cyprus": "CY",
  "Czech Republic": "CZ", "Denmark": "DK", "Dominican Republic": "DO",
  "Ecuador": "EC", "Egypt": "EG", "El Salvador": "SV", "Estonia": "EE",
  "Ethiopia": "ET", "Finland": "FI", "France": "FR", "Georgia": "GE",
  "Germany": "DE", "Ghana": "GH", "Greece": "GR", "Guatemala": "GT",
  "Honduras": "HN", "Hungary": "HU", "Iceland": "IS", "India": "IN",
  "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ", "Ireland": "IE",
  "Israel": "IL", "Italy": "IT", "Jamaica": "JM", "Japan": "JP",
  "Jordan": "JO", "Kazakhstan": "KZ", "Kenya": "KE", "Kosovo": "XK",
  "Kuwait": "KW", "Kyrgyzstan": "KG", "Latvia": "LV", "Lebanon": "LB",
  "Libya": "LY", "Lithuania": "LT", "Luxembourg": "LU", "Malaysia": "MY",
  "Maldives": "MV", "Malta": "MT", "Mexico": "MX", "Moldova": "MD",
  "Monaco": "MC", "Mongolia": "MN", "Montenegro": "ME", "Morocco": "MA",
  "Mozambique": "MZ", "Myanmar": "MM", "Nepal": "NP", "Netherlands": "NL",
  "New Zealand": "NZ", "Nicaragua": "NI", "Nigeria": "NG", "North Korea": "KP",
  "North Macedonia": "MK", "Norway": "NO", "Oman": "OM", "Pakistan": "PK",
  "Palestine": "PS", "Panama": "PA", "Paraguay": "PY", "Peru": "PE",
  "Philippines": "PH", "Poland": "PL", "Portugal": "PT", "Qatar": "QA",
  "Romania": "RO", "Russia": "RU", "Saudi Arabia": "SA", "Senegal": "SN",
  "Serbia": "RS", "Singapore": "SG", "Slovakia": "SK", "Slovenia": "SI",
  "South Africa": "ZA", "South Korea": "KR", "Spain": "ES", "Sri Lanka": "LK",
  "Sweden": "SE", "Switzerland": "CH", "Syria": "SY", "Taiwan": "TW",
  "Tajikistan": "TJ", "Tanzania": "TZ", "Thailand": "TH", "Tunisia": "TN",
  "Turkey": "TR", "Turkmenistan": "TM", "Uganda": "UG", "Ukraine": "UA",
  "United Arab Emirates": "AE", "United Kingdom": "GB",
  "United States of America": "US", "Uruguay": "UY", "Uzbekistan": "UZ",
  "Venezuela": "VE", "Vietnam": "VN", "Yemen": "YE", "Zambia": "ZM",
  "Zimbabwe": "ZW", "Ivory Coast": "CI", "Democratic Republic of the Congo": "CD",
};

export function countryToFlag(name: string): string {
  const code = ISO_CODES[name];
  if (!code || code.length !== 2) return "🌍";
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}

export function countryToCode(name: string): string {
  return ISO_CODES[name] ?? "";
}

// Compact JS version for embedding in WebView HTML
export const CC_JS = JSON.stringify(ISO_CODES);
