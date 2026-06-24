export type TravelStyle =
  | "beach"
  | "adventure"
  | "culture"
  | "ski"
  | "city"
  | "nature"
  | "food";

export type DistancePref = "short" | "medium" | "long" | "any";
export type DistanceTag = "short" | "medium" | "long";

export interface Destination {
  id: string;
  name: string;
  country: string;
  region: string;
  tagline: string;
  highlights: [string, string, string];
  styles: TravelStyle[];
  bestMonths: number[];
  badMonths: number[];
  distanceTag: DistanceTag;
  cardGradient: [string, string];
}

export const DESTINATIONS: Destination[] = [
  // BEACH
  {
    id: "maldives",
    name: "Maldives",
    country: "Maldives",
    region: "Indian Ocean",
    tagline: "Overwater bungalows, impossibly clear lagoons, no roads.",
    highlights: ["Private sandbanks at sunrise", "World-class snorkeling & diving", "All-inclusive island escapes"],
    styles: ["beach", "nature"],
    bestMonths: [11, 12, 1, 2, 3, 4],
    badMonths: [5, 6, 7, 8, 9, 10],
    distanceTag: "long",
    cardGradient: ["#0E7490", "#164E63"],
  },
  {
    id: "bali",
    name: "Bali",
    country: "Indonesia",
    region: "Southeast Asia",
    tagline: "Jungle temples, rice terraces, and surf-perfect beaches.",
    highlights: ["Tegallalang rice terraces", "Sunset ceremony at Tanah Lot", "Seminyak beach clubs"],
    styles: ["beach", "culture", "adventure", "food"],
    bestMonths: [4, 5, 6, 7, 8, 9],
    badMonths: [1, 2, 3],
    distanceTag: "long",
    cardGradient: ["#92400E", "#78350F"],
  },
  {
    id: "santorini",
    name: "Santorini",
    country: "Greece",
    region: "Mediterranean",
    tagline: "Volcanic caldera views, white-domed churches, and Aegean sunsets.",
    highlights: ["Oia sunset panorama", "Wine tasting in Akrotiri", "Black sand beaches"],
    styles: ["beach", "culture", "food", "city"],
    bestMonths: [4, 5, 6, 9, 10],
    badMonths: [11, 12, 1, 2],
    distanceTag: "medium",
    cardGradient: ["#3730A3", "#1E1B4B"],
  },
  {
    id: "tulum",
    name: "Tulum",
    country: "Mexico",
    region: "Caribbean",
    tagline: "Maya ruins over turquoise sea, cenote swims, and bohemian beach clubs.",
    highlights: ["Cenote Dos Ojos diving", "Tulum archaeological zone", "Biosphere Reserve at Sian Ka'an"],
    styles: ["beach", "adventure", "culture"],
    bestMonths: [12, 1, 2, 3, 4, 5],
    badMonths: [9, 10],
    distanceTag: "medium",
    cardGradient: ["#065F46", "#064E3B"],
  },
  {
    id: "seychelles",
    name: "Seychelles",
    country: "Seychelles",
    region: "Indian Ocean",
    tagline: "Giant granite boulders, powder beaches, and rare wildlife on land and sea.",
    highlights: ["Anse Source d'Argent — world's most photographed beach", "Vallée de Mai palm forest", "Whale shark snorkeling"],
    styles: ["beach", "nature"],
    bestMonths: [4, 5, 10, 11],
    badMonths: [6, 7, 8],
    distanceTag: "long",
    cardGradient: ["#0F766E", "#134E4A"],
  },
  {
    id: "amalfi",
    name: "Amalfi Coast",
    country: "Italy",
    region: "Mediterranean",
    tagline: "Pastel villages clinging to cliffs, lemon groves, and glittering bays.",
    highlights: ["Positano's cascading streets", "Path of the Gods hiking trail", "Ravello Villa Rufolo gardens"],
    styles: ["beach", "culture", "food"],
    bestMonths: [5, 6, 9, 10],
    badMonths: [12, 1, 2],
    distanceTag: "medium",
    cardGradient: ["#9F1239", "#881337"],
  },
  {
    id: "zanzibar",
    name: "Zanzibar",
    country: "Tanzania",
    region: "East Africa",
    tagline: "Spice island with pristine coral beaches and a UNESCO Stone Town.",
    highlights: ["Kendwa beach at low tide", "Stone Town spice market tours", "Dolphin tours at Kizimkazi"],
    styles: ["beach", "culture", "adventure"],
    bestMonths: [6, 7, 8, 9, 12, 1, 2],
    badMonths: [3, 4, 5],
    distanceTag: "long",
    cardGradient: ["#1D4ED8", "#1E3A8A"],
  },
  // ADVENTURE
  {
    id: "queenstown",
    name: "Queenstown",
    country: "New Zealand",
    region: "South Pacific",
    tagline: "The adventure capital of the world — bungee, skydive, jet boat, ski.",
    highlights: ["Nevis bungee (134m — world's highest)", "Remarkables ski resort", "Milford Sound day trip"],
    styles: ["adventure", "nature", "ski"],
    bestMonths: [1, 2, 3, 11, 12],
    badMonths: [],
    distanceTag: "long",
    cardGradient: ["#7C3AED", "#5B21B6"],
  },
  {
    id: "patagonia",
    name: "Patagonia",
    country: "Argentina / Chile",
    region: "South America",
    tagline: "Glaciers, granite spires, and steppe wilderness at the end of the world.",
    highlights: ["Torres del Paine W circuit", "Perito Moreno glacier walk", "El Chaltén hiking hub"],
    styles: ["adventure", "nature"],
    bestMonths: [11, 12, 1, 2, 3],
    badMonths: [6, 7, 8],
    distanceTag: "long",
    cardGradient: ["#1E40AF", "#1E3A8A"],
  },
  {
    id: "iceland",
    name: "Iceland",
    country: "Iceland",
    region: "North Atlantic",
    tagline: "Northern lights, geysers, black-sand beaches, and endless summer daylight.",
    highlights: ["Northern lights (Sep–Mar)", "Blue Lagoon geothermal spa", "Ring Road self-drive"],
    styles: ["adventure", "nature"],
    bestMonths: [6, 7, 8, 12, 1, 2],
    badMonths: [],
    distanceTag: "medium",
    cardGradient: ["#0F172A", "#1E293B"],
  },
  {
    id: "nepal",
    name: "Nepal",
    country: "Nepal",
    region: "South Asia",
    tagline: "Himalayan trekking, ancient temples, and the roof of the world.",
    highlights: ["Everest Base Camp trek", "Annapurna Circuit", "Kathmandu's Durbar Square"],
    styles: ["adventure", "culture", "nature"],
    bestMonths: [3, 4, 5, 10, 11],
    badMonths: [6, 7, 8],
    distanceTag: "long",
    cardGradient: ["#B45309", "#92400E"],
  },
  {
    id: "costa-rica",
    name: "Costa Rica",
    country: "Costa Rica",
    region: "Central America",
    tagline: "Zip-lines, volcanoes, sloths, and two coastlines.",
    highlights: ["Arenal Volcano & hot springs", "Manuel Antonio rainforest & beach", "Monteverde cloud forest zip-lining"],
    styles: ["adventure", "nature", "beach"],
    bestMonths: [12, 1, 2, 3, 4],
    badMonths: [9, 10],
    distanceTag: "medium",
    cardGradient: ["#166534", "#14532D"],
  },
  {
    id: "jordan",
    name: "Jordan",
    country: "Jordan",
    region: "Middle East",
    tagline: "Rose-red city of Petra, starlit Wadi Rum, and the floating Dead Sea.",
    highlights: ["Petra by candlelight tour", "Wadi Rum jeep & camel safari", "Float in the Dead Sea"],
    styles: ["adventure", "culture"],
    bestMonths: [3, 4, 5, 9, 10, 11],
    badMonths: [7, 8],
    distanceTag: "medium",
    cardGradient: ["#78350F", "#451A03"],
  },
  {
    id: "peru",
    name: "Peru",
    country: "Peru",
    region: "South America",
    tagline: "Machu Picchu at dawn, the Sacred Valley, and Amazon headwaters.",
    highlights: ["Machu Picchu sunrise hike", "Inca Trail 4-day trek", "Lake Titicaca floating islands"],
    styles: ["adventure", "culture", "nature"],
    bestMonths: [5, 6, 7, 8, 9],
    badMonths: [1, 2, 3],
    distanceTag: "long",
    cardGradient: ["#92400E", "#78350F"],
  },
  // CULTURE
  {
    id: "kyoto",
    name: "Kyoto",
    country: "Japan",
    region: "East Asia",
    tagline: "Ancient temples, geisha districts, and cherry blossoms over a thousand shrines.",
    highlights: ["Arashiyama bamboo grove at dawn", "Fushimi Inari torii gates", "Gion district tea ceremony"],
    styles: ["culture", "food", "nature"],
    bestMonths: [3, 4, 10, 11],
    badMonths: [7, 8],
    distanceTag: "long",
    cardGradient: ["#BE185D", "#9D174D"],
  },
  {
    id: "istanbul",
    name: "Istanbul",
    country: "Turkey",
    region: "Europe / Asia",
    tagline: "Where empires meet — Byzantine basilicas, Ottoman bazaars, Bosphorus sunsets.",
    highlights: ["Hagia Sophia & Blue Mosque", "Grand Bazaar labyrinth", "Bosphorus sunset cruise"],
    styles: ["culture", "food", "city"],
    bestMonths: [4, 5, 9, 10, 11],
    badMonths: [1, 2],
    distanceTag: "medium",
    cardGradient: ["#7C3AED", "#5B21B6"],
  },
  {
    id: "marrakech",
    name: "Marrakech",
    country: "Morocco",
    region: "North Africa",
    tagline: "Medina madness, Sahara edge, and sensory overload in the very best way.",
    highlights: ["Jemaa el-Fna square at dusk", "Sahara Desert overnight camp", "Majorelle Garden & YSL Museum"],
    styles: ["culture", "adventure", "food"],
    bestMonths: [3, 4, 5, 10, 11],
    badMonths: [7, 8],
    distanceTag: "medium",
    cardGradient: ["#B45309", "#78350F"],
  },
  {
    id: "rome",
    name: "Rome",
    country: "Italy",
    region: "Mediterranean",
    tagline: "The Eternal City — 2,000 years of monuments still in daily use.",
    highlights: ["Colosseum & Roman Forum", "Vatican Museums & Sistine Chapel", "Trastevere evening food walk"],
    styles: ["culture", "food", "city"],
    bestMonths: [4, 5, 9, 10],
    badMonths: [7, 8],
    distanceTag: "medium",
    cardGradient: ["#9F1239", "#881337"],
  },
  {
    id: "havana",
    name: "Havana",
    country: "Cuba",
    region: "Caribbean",
    tagline: "Vintage cars, salsa rhythms, colonial grandeur, and the world's best mojito.",
    highlights: ["Old Havana UNESCO district", "Malecón seafront at sunset", "Viñales Valley tobacco farms"],
    styles: ["culture", "food", "city"],
    bestMonths: [12, 1, 2, 3, 4],
    badMonths: [8, 9, 10],
    distanceTag: "medium",
    cardGradient: ["#DC2626", "#991B1B"],
  },
  {
    id: "angkor",
    name: "Angkor Wat",
    country: "Cambodia",
    region: "Southeast Asia",
    tagline: "The world's largest religious monument emerging from the jungle at sunrise.",
    highlights: ["Angkor Wat sunrise ritual", "Bayon's smiling stone faces", "Ta Prohm jungle temple"],
    styles: ["culture", "adventure"],
    bestMonths: [11, 12, 1, 2, 3],
    badMonths: [6, 7, 8, 9],
    distanceTag: "long",
    cardGradient: ["#78350F", "#92400E"],
  },
  // SKI
  {
    id: "zermatt",
    name: "Zermatt",
    country: "Switzerland",
    region: "Alps",
    tagline: "Car-free village beneath the Matterhorn — skiing from 3,883m.",
    highlights: ["Matterhorn views year-round", "Klein Matterhorn glacier skiing", "Fondue in a chalet après-ski"],
    styles: ["ski", "adventure", "nature"],
    bestMonths: [1, 2, 3, 12],
    badMonths: [5, 6, 7, 8, 9],
    distanceTag: "medium",
    cardGradient: ["#1E40AF", "#1E3A8A"],
  },
  {
    id: "niseko",
    name: "Niseko",
    country: "Japan",
    region: "East Asia",
    tagline: "World-famous powder snow, natural hot springs, and epic après-ski ramen.",
    highlights: ["Legendary champagne powder", "Onsen (hot spring) soaks", "Night skiing with Mt Yotei views"],
    styles: ["ski", "culture", "food"],
    bestMonths: [1, 2, 3],
    badMonths: [5, 6, 7, 8, 9],
    distanceTag: "long",
    cardGradient: ["#1E40AF", "#312E81"],
  },
  {
    id: "aspen",
    name: "Aspen",
    country: "USA",
    region: "Rocky Mountains",
    tagline: "Four mountains, glamorous après, and some of North America's best terrain.",
    highlights: ["Highlands Bowl expert terrain", "Ajax Mountain groomed corduroy", "Aspen Mountain gondola sunrise"],
    styles: ["ski", "city", "adventure"],
    bestMonths: [1, 2, 3, 12],
    badMonths: [5, 6, 7, 8, 9],
    distanceTag: "medium",
    cardGradient: ["#0F172A", "#334155"],
  },
  {
    id: "banff",
    name: "Banff",
    country: "Canada",
    region: "Rocky Mountains",
    tagline: "Turquoise frozen lakes, elk on ski runs, and Rocky Mountain grandeur.",
    highlights: ["Lake Louise ski area", "Frozen Bow Lake snowshoeing", "Wildlife spotting from gondola"],
    styles: ["ski", "nature", "adventure"],
    bestMonths: [1, 2, 3, 12],
    badMonths: [5, 6, 7, 8],
    distanceTag: "medium",
    cardGradient: ["#164E63", "#0E7490"],
  },
  // CITY
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    region: "East Asia",
    tagline: "Hyper-modern and ancient in the same block — the world's greatest city.",
    highlights: ["Shibuya crossing & Harajuku", "Tsukiji outer market breakfast", "Shinjuku izakayas until dawn"],
    styles: ["city", "culture", "food"],
    bestMonths: [3, 4, 10, 11],
    badMonths: [7, 8],
    distanceTag: "long",
    cardGradient: ["#BE185D", "#831843"],
  },
  {
    id: "new-york",
    name: "New York City",
    country: "USA",
    region: "North America",
    tagline: "The city that never sleeps — museums, food, skyline, and endless energy.",
    highlights: ["High Line & Hudson Yards", "Brooklyn food scene", "Central Park & MoMA"],
    styles: ["city", "culture", "food"],
    bestMonths: [4, 5, 9, 10],
    badMonths: [1, 2],
    distanceTag: "medium",
    cardGradient: ["#1E3A8A", "#312E81"],
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    region: "Southeast Asia",
    tagline: "Futuristic gardens, hawker centre feasts, and seamless luxury.",
    highlights: ["Gardens by the Bay supertrees", "Hawker Centre food safari", "Marina Bay Sands infinity pool"],
    styles: ["city", "food", "culture"],
    bestMonths: [2, 3, 7, 8],
    badMonths: [],
    distanceTag: "long",
    cardGradient: ["#065F46", "#047857"],
  },
  {
    id: "barcelona",
    name: "Barcelona",
    country: "Spain",
    region: "Mediterranean",
    tagline: "Gaudí's wild architecture, tapas culture, and beach life in one city.",
    highlights: ["Sagrada Família interior", "La Boqueria market morning", "Barceloneta beach evening"],
    styles: ["city", "culture", "food", "beach"],
    bestMonths: [4, 5, 6, 9, 10],
    badMonths: [12, 1],
    distanceTag: "medium",
    cardGradient: ["#DC2626", "#9F1239"],
  },
  {
    id: "dubai",
    name: "Dubai",
    country: "UAE",
    region: "Middle East",
    tagline: "Record-breaking skyline, desert adventures, and luxury beyond comprehension.",
    highlights: ["Burj Khalifa top-floor sunset", "Desert dune bashing & dinner", "Old Dubai gold & spice souks"],
    styles: ["city", "adventure", "food"],
    bestMonths: [11, 12, 1, 2, 3],
    badMonths: [6, 7, 8, 9],
    distanceTag: "medium",
    cardGradient: ["#B45309", "#92400E"],
  },
  {
    id: "copenhagen",
    name: "Copenhagen",
    country: "Denmark",
    region: "Northern Europe",
    tagline: "The world's happiest city — cycling culture, New Nordic food, and design.",
    highlights: ["Noma-inspired restaurant scene", "Tivoli Gardens", "Freetown Christiania"],
    styles: ["city", "food", "culture"],
    bestMonths: [5, 6, 7, 8],
    badMonths: [12, 1, 2],
    distanceTag: "medium",
    cardGradient: ["#1D4ED8", "#1E3A8A"],
  },
  {
    id: "mexico-city",
    name: "Mexico City",
    country: "Mexico",
    region: "Central America",
    tagline: "World-class museums, tacos al pastor, and the best nightlife in Latin America.",
    highlights: ["Frida Kahlo's Blue House", "Teotihuacan pyramids sunrise", "Roma & Condesa food & art walk"],
    styles: ["city", "culture", "food"],
    bestMonths: [11, 12, 1, 2, 3, 4],
    badMonths: [7, 8, 9],
    distanceTag: "medium",
    cardGradient: ["#7C3AED", "#6D28D9"],
  },
  // NATURE
  {
    id: "galapagos",
    name: "Galápagos",
    country: "Ecuador",
    region: "Pacific",
    tagline: "Darwin's living laboratory — sea lions, iguanas, and blue-footed boobies.",
    highlights: ["Swimming with sea lions at Gardner Bay", "Giant tortoise sanctuary", "Snorkeling with manta rays"],
    styles: ["nature", "adventure"],
    bestMonths: [12, 1, 2, 3, 4, 5],
    badMonths: [],
    distanceTag: "long",
    cardGradient: ["#065F46", "#064E3B"],
  },
  {
    id: "fjords",
    name: "Norwegian Fjords",
    country: "Norway",
    region: "Northern Europe",
    tagline: "Drowned valleys, waterfalls, and Viking villages at the edge of the Arctic.",
    highlights: ["Nærøyfjord UNESCO cruise", "Trolltunga cliff hike", "Flåm Railway mountain train"],
    styles: ["nature", "adventure"],
    bestMonths: [6, 7, 8],
    badMonths: [11, 12, 1, 2],
    distanceTag: "medium",
    cardGradient: ["#0E7490", "#0F172A"],
  },
  {
    id: "bhutan",
    name: "Bhutan",
    country: "Bhutan",
    region: "South Asia",
    tagline: "Gross National Happiness, pristine Himalayas, and dzong monasteries.",
    highlights: ["Tiger's Nest Monastery hike", "Punakha Dzong", "Archery festival (if timed right)"],
    styles: ["nature", "culture", "adventure"],
    bestMonths: [3, 4, 5, 10, 11],
    badMonths: [6, 7, 8],
    distanceTag: "long",
    cardGradient: ["#B45309", "#78350F"],
  },
  {
    id: "svalbard",
    name: "Svalbard",
    country: "Norway",
    region: "Arctic",
    tagline: "Polar bears outnumber people — midnight sun in summer, auroras in winter.",
    highlights: ["Snowmobile to polar bear territory", "Midnight sun kayaking (Jun–Jul)", "Dog sled expedition"],
    styles: ["nature", "adventure"],
    bestMonths: [2, 3, 6, 7],
    badMonths: [],
    distanceTag: "medium",
    cardGradient: ["#1E293B", "#0F172A"],
  },
  {
    id: "serengeti",
    name: "Serengeti",
    country: "Tanzania",
    region: "East Africa",
    tagline: "The Great Migration — 1.5 million wildebeest crossing the open plains.",
    highlights: ["Great Migration river crossings (Jul–Oct)", "Big Five game drives", "Ngorongoro Crater floor"],
    styles: ["nature", "adventure"],
    bestMonths: [6, 7, 8, 9, 10],
    badMonths: [3, 4, 5],
    distanceTag: "long",
    cardGradient: ["#B45309", "#92400E"],
  },
  {
    id: "faroe-islands",
    name: "Faroe Islands",
    country: "Faroe Islands",
    region: "North Atlantic",
    tagline: "Dramatic sea cliffs, puffin colonies, and a total absence of crowds.",
    highlights: ["Sørvágsvatn lake illusion hike", "Múlafossur waterfall & Gásadalur village", "Puffin watching (Jun–Aug)"],
    styles: ["nature", "adventure"],
    bestMonths: [5, 6, 7, 8],
    badMonths: [12, 1, 2],
    distanceTag: "medium",
    cardGradient: ["#164E63", "#0E7490"],
  },
  // FOOD
  {
    id: "san-sebastian",
    name: "San Sebastián",
    country: "Spain",
    region: "Basque Country",
    tagline: "More Michelin stars per capita than anywhere on earth — and pinxtos bars too.",
    highlights: ["Pintxos bar hop in Parte Vieja", "La Brecha market tasting", "Ondarreta beach morning"],
    styles: ["food", "beach", "city"],
    bestMonths: [5, 6, 7, 8, 9],
    badMonths: [12, 1],
    distanceTag: "medium",
    cardGradient: ["#DC2626", "#9F1239"],
  },
  {
    id: "oaxaca",
    name: "Oaxaca",
    country: "Mexico",
    region: "Central America",
    tagline: "Mezcal, mole negro, and the most vibrant indigenous craft market in Mexico.",
    highlights: ["Tlayudas & 7 moles cooking class", "Día de Muertos celebrations (Nov)", "Monte Albán Zapotec ruins"],
    styles: ["food", "culture", "adventure"],
    bestMonths: [10, 11, 12, 1, 2, 3],
    badMonths: [6, 7, 8, 9],
    distanceTag: "medium",
    cardGradient: ["#7C3AED", "#6D28D9"],
  },
  {
    id: "vietnam-hoi-an",
    name: "Hội An",
    country: "Vietnam",
    region: "Southeast Asia",
    tagline: "Lantern-lit UNESCO old town, white rose dumplings, and tailors who'll amaze you.",
    highlights: ["Ancient Town lantern festival", "Cooking class & morning market", "An Bàng beach cycling"],
    styles: ["food", "culture", "beach"],
    bestMonths: [2, 3, 4, 5],
    badMonths: [10, 11],
    distanceTag: "long",
    cardGradient: ["#D97706", "#92400E"],
  },
];

export type InspirePreferences = {
  styles: TravelStyle[];
  month: number;
  distance: DistancePref;
};

export function getRecommendations(
  prefs: InspirePreferences,
  visitedCountries: string[]
): Destination[] {
  const { styles, month, distance } = prefs;

  let pool = [...DESTINATIONS];

  // Avoid bad-weather months
  pool = pool.filter((d) => !d.badMonths.includes(month));

  // Filter by distance preference
  if (distance !== "any") {
    pool = pool.filter((d) =>
      distance === "short"
        ? d.distanceTag === "short"
        : distance === "medium"
        ? d.distanceTag === "short" || d.distanceTag === "medium"
        : true
    );
  }

  // Score by style match
  const scored = pool
    .map((d) => {
      const overlap = d.styles.filter((s) => styles.includes(s)).length;
      return { dest: d, score: overlap };
    })
    .filter((s) => s.score > 0);

  // Sort by score descending, then shuffle within score tiers
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Math.random() - 0.5;
  });

  // Prefer unvisited, but don't exclude visited entirely
  const unvisited = scored.filter(
    (s) => !visitedCountries.some((vc) => vc.toLowerCase() === s.dest.country.toLowerCase())
  );
  const visited = scored.filter((s) =>
    visitedCountries.some((vc) => vc.toLowerCase() === s.dest.country.toLowerCase())
  );

  const ordered = [...unvisited, ...visited];

  // Return top 5
  return ordered.slice(0, 5).map((s) => s.dest);
}
