// Country name → ISO 2-letter code
// Includes both iOS CLGeocoder names AND NaturalEarth ADMIN names
const ISO_CODES: Record<string, string> = {
  // A
  "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Andorra": "AD",
  "Angola": "AO", "Antigua and Barbuda": "AG", "Argentina": "AR",
  "Armenia": "AM", "Australia": "AU", "Austria": "AT", "Azerbaijan": "AZ",
  // B
  "Bahamas": "BS", "Bahrain": "BH", "Bangladesh": "BD", "Barbados": "BB",
  "Belarus": "BY", "Belgium": "BE", "Belize": "BZ", "Benin": "BJ",
  "Bhutan": "BT", "Bolivia": "BO", "Bosnia and Herzegovina": "BA",
  "Botswana": "BW", "Brazil": "BR", "Brunei": "BN", "Bulgaria": "BG",
  "Burkina Faso": "BF", "Burundi": "BI",
  // C
  "Cambodia": "KH", "Cameroon": "CM", "Canada": "CA", "Cape Verde": "CV",
  "Central African Republic": "CF", "Chad": "TD", "Chile": "CL",
  "China": "CN", "Colombia": "CO", "Comoros": "KM", "Costa Rica": "CR",
  "Croatia": "HR", "Cuba": "CU", "Cyprus": "CY",
  "Czech Republic": "CZ", "Czechia": "CZ",  // both iOS variants
  // D
  "Democratic Republic of the Congo": "CD", "Democratic Republic of Congo": "CD",
  "Dem. Rep. Congo": "CD", "Denmark": "DK", "Djibouti": "DJ",
  "Dominican Republic": "DO",
  // E
  "East Timor": "TL", "Timor-Leste": "TL", "Ecuador": "EC", "Egypt": "EG",
  "El Salvador": "SV", "Equatorial Guinea": "GQ", "Eritrea": "ER",
  "Estonia": "EE", "Eswatini": "SZ", "Swaziland": "SZ", "Ethiopia": "ET",
  // F
  "Fiji": "FJ", "Finland": "FI", "France": "FR",
  // G
  "Gabon": "GA", "Gambia": "GM", "Georgia": "GE", "Germany": "DE",
  "Ghana": "GH", "Greece": "GR", "Grenada": "GD", "Guatemala": "GT",
  "Guinea": "GN", "Guinea-Bissau": "GW", "Guyana": "GY",
  // H
  "Haiti": "HT", "Honduras": "HN", "Hungary": "HU",
  // I
  "Iceland": "IS", "India": "IN", "Indonesia": "ID",
  "Iran": "IR", "Iraq": "IQ", "Ireland": "IE", "Republic of Ireland": "IE",
  "Israel": "IL", "Italy": "IT", "Ivory Coast": "CI", "Côte d'Ivoire": "CI",
  // J
  "Jamaica": "JM", "Japan": "JP", "Jordan": "JO",
  // K
  "Kazakhstan": "KZ", "Kenya": "KE", "Kiribati": "KI",
  "Kosovo": "XK", "Kuwait": "KW", "Kyrgyzstan": "KG",
  // L
  "Laos": "LA", "Latvia": "LV", "Lebanon": "LB", "Lesotho": "LS",
  "Liberia": "LR", "Libya": "LY", "Liechtenstein": "LI", "Lithuania": "LT",
  "Luxembourg": "LU",
  // M
  "Madagascar": "MG", "Malawi": "MW", "Malaysia": "MY", "Maldives": "MV",
  "Mali": "ML", "Malta": "MT", "Marshall Islands": "MH", "Mauritania": "MR",
  "Mauritius": "MU", "Mexico": "MX", "Micronesia": "FM", "Moldova": "MD",
  "Republic of Moldova": "MD", "Monaco": "MC", "Mongolia": "MN",
  "Montenegro": "ME", "Morocco": "MA", "Mozambique": "MZ", "Myanmar": "MM",
  "Burma": "MM",
  // N
  "Namibia": "NA", "Nauru": "NR", "Nepal": "NP", "Netherlands": "NL",
  "New Zealand": "NZ", "Nicaragua": "NI", "Niger": "NE", "Nigeria": "NG",
  "North Korea": "KP", "Dem. Rep. Korea": "KP",
  "Democratic People's Republic of Korea": "KP",
  "North Macedonia": "MK", "Macedonia": "MK", "Norway": "NO",
  // O
  "Oman": "OM",
  // P
  "Pakistan": "PK", "Palau": "PW", "Palestine": "PS", "Panama": "PA",
  "Papua New Guinea": "PG", "Paraguay": "PY", "Peru": "PE",
  "Philippines": "PH", "Poland": "PL", "Portugal": "PT",
  // Q
  "Qatar": "QA",
  // R
  "Romania": "RO", "Russia": "RU", "Russian Federation": "RU", "Rwanda": "RW",
  // S
  "Saint Kitts and Nevis": "KN", "Saint Lucia": "LC",
  "Saint Vincent and the Grenadines": "VC", "Samoa": "WS",
  "San Marino": "SM", "Saudi Arabia": "SA", "Senegal": "SN",
  "Serbia": "RS", "Republic of Serbia": "RS", "Seychelles": "SC",
  "Sierra Leone": "SL", "Singapore": "SG", "Slovakia": "SK",
  "Slovenia": "SI", "Solomon Islands": "SB", "Somalia": "SO",
  "South Africa": "ZA", "South Korea": "KR", "Republic of Korea": "KR",
  "Korea": "KR", "South Sudan": "SS", "Spain": "ES", "Sri Lanka": "LK",
  "Sudan": "SD", "Suriname": "SR", "Sweden": "SE", "Switzerland": "CH",
  "Syria": "SY", "Syrian Arab Republic": "SY",
  // T
  "Taiwan": "TW", "Tajikistan": "TJ", "Tanzania": "TZ", "Thailand": "TH",
  "Togo": "TG", "Tonga": "TO", "Trinidad and Tobago": "TT",
  "Tunisia": "TN", "Turkey": "TR", "Türkiye": "TR",  // iOS varies
  "Turkmenistan": "TM", "Tuvalu": "TV",
  // U
  "Uganda": "UG", "Ukraine": "UA",
  "United Arab Emirates": "AE", "UAE": "AE",
  "United Kingdom": "GB", "Great Britain": "GB", "England": "GB",
  "United States of America": "US", "United States": "US", "USA": "US",
  "Uruguay": "UY", "Uzbekistan": "UZ",
  // V
  "Vanuatu": "VU", "Vatican City": "VA", "Holy See": "VA",
  "Venezuela": "VE", "Vietnam": "VN", "Viet Nam": "VN",
  // Y-Z
  "Yemen": "YE", "Zambia": "ZM", "Zimbabwe": "ZW",
};

function codeToEmoji(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}

export function countryToFlag(name: string): string {
  if (!name) return "🌍";

  // 1. Direct lookup
  const direct = ISO_CODES[name];
  if (direct) return codeToEmoji(direct);

  // 2. Case-insensitive lookup
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(ISO_CODES)) {
    if (key.toLowerCase() === lower) return codeToEmoji(val);
  }

  // 3. Strip common prefixes: "Republic of ", "The ", "Kingdom of "
  const stripped = name
    .replace(/^(republic of |the |kingdom of |democratic republic of |peoples republic of )/i, "")
    .trim();
  if (stripped !== name) {
    const stripResult = ISO_CODES[stripped] ?? 
      Object.entries(ISO_CODES).find(([k]) => k.toLowerCase() === stripped.toLowerCase())?.[1];
    if (stripResult) return codeToEmoji(stripResult);
  }

  // 4. Partial match (key is a substring of name or vice versa) — avoid short false matches
  for (const [key, val] of Object.entries(ISO_CODES)) {
    if (key.length >= 5 && lower.includes(key.toLowerCase())) return codeToEmoji(val);
    if (lower.length >= 5 && key.toLowerCase().includes(lower)) return codeToEmoji(val);
  }

  return "🌍";
}

export function countryToCode(name: string): string {
  return ISO_CODES[name] ?? "";
}

// Compact JSON for embedding in WebView HTML
export const CC_JS = JSON.stringify(ISO_CODES);
