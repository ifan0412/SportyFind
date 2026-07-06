/** Hong Kong 18 districts + common sub-areas (2024 administrative structure) */

export type HKArea = "hk_island" | "kowloon" | "new_territories" | "islands";

export interface HKSubdistrict {
  id: string;
  labelZh: string;
  labelEn: string;
}

export interface HKDistrict {
  id: string;
  labelZh: string;
  labelEn: string;
  area: HKArea;
  subdistricts: HKSubdistrict[];
}

export const HK_AREAS: { id: HKArea; labelZh: string; labelEn: string }[] = [
  { id: "hk_island", labelZh: "香港島", labelEn: "Hong Kong Island" },
  { id: "kowloon", labelZh: "九龍", labelEn: "Kowloon" },
  { id: "new_territories", labelZh: "新界", labelEn: "New Territories" },
  { id: "islands", labelZh: "離島", labelEn: "Outlying Islands" },
];

export const HK_DISTRICTS: HKDistrict[] = [
  {
    id: "central-western",
    labelZh: "中西區",
    labelEn: "Central & Western",
    area: "hk_island",
    subdistricts: [
      { id: "kennedy-town", labelZh: "堅尼地城", labelEn: "Kennedy Town" },
      { id: "sai-ying-pun", labelZh: "西營盤", labelEn: "Sai Ying Pun" },
      { id: "sheung-wan", labelZh: "上環", labelEn: "Sheung Wan" },
      { id: "central", labelZh: "中環", labelEn: "Central" },
      { id: "admiralty", labelZh: "金鐘", labelEn: "Admiralty" },
      { id: "mid-levels", labelZh: "半山", labelEn: "Mid-Levels" },
      { id: "peak", labelZh: "山頂", labelEn: "The Peak" },
    ],
  },
  {
    id: "wan-chai",
    labelZh: "灣仔",
    labelEn: "Wan Chai",
    area: "hk_island",
    subdistricts: [
      { id: "wan-chai-north", labelZh: "灣仔北", labelEn: "Wan Chai North" },
      { id: "causeway-bay", labelZh: "銅鑼灣", labelEn: "Causeway Bay" },
      { id: "happy-valley", labelZh: "跑馬地", labelEn: "Happy Valley" },
      { id: "tin-hau", labelZh: "天后", labelEn: "Tin Hau" },
    ],
  },
  {
    id: "eastern",
    labelZh: "東區",
    labelEn: "Eastern",
    area: "hk_island",
    subdistricts: [
      { id: "north-point", labelZh: "北角", labelEn: "North Point" },
      { id: "quarry-bay", labelZh: "鰂魚涌", labelEn: "Quarry Bay" },
      { id: "tai-koo", labelZh: "太古", labelEn: "Tai Koo" },
      { id: "chai-wan", labelZh: "柴灣", labelEn: "Chai Wan" },
      { id: "shau-kei-wan", labelZh: "筲箕灣", labelEn: "Shau Kei Wan" },
    ],
  },
  {
    id: "southern",
    labelZh: "南區",
    labelEn: "Southern",
    area: "hk_island",
    subdistricts: [
      { id: "aberdeen", labelZh: "香港仔", labelEn: "Aberdeen" },
      { id: "stanley", labelZh: "赤柱", labelEn: "Stanley" },
      { id: "repulse-bay", labelZh: "淺水灣", labelEn: "Repulse Bay" },
      { id: "cyberport", labelZh: "數碼港", labelEn: "Cyberport" },
    ],
  },
  {
    id: "yau-tsim-mong",
    labelZh: "油尖旺",
    labelEn: "Yau Tsim Mong",
    area: "kowloon",
    subdistricts: [
      { id: "tsim-sha-tsui", labelZh: "尖沙咀", labelEn: "Tsim Sha Tsui" },
      { id: "mong-kok", labelZh: "旺角", labelEn: "Mong Kok" },
      { id: "yau-ma-tei", labelZh: "油麻地", labelEn: "Yau Ma Tei" },
      { id: "jordan", labelZh: "佐敦", labelEn: "Jordan" },
      { id: "prince-edward", labelZh: "太子", labelEn: "Prince Edward" },
    ],
  },
  {
    id: "sham-shui-po",
    labelZh: "深水埗",
    labelEn: "Sham Shui Po",
    area: "kowloon",
    subdistricts: [
      { id: "cheung-sha-wan", labelZh: "長沙灣", labelEn: "Cheung Sha Wan" },
      { id: "lai-chi-kok", labelZh: "荔枝角", labelEn: "Lai Chi Kok" },
      { id: "mei-foo", labelZh: "美孚", labelEn: "Mei Foo" },
      { id: "sham-shui-po-central", labelZh: "深水埗", labelEn: "Sham Shui Po" },
    ],
  },
  {
    id: "kowloon-city",
    labelZh: "九龍城",
    labelEn: "Kowloon City",
    area: "kowloon",
    subdistricts: [
      { id: "hung-hom", labelZh: "紅磡", labelEn: "Hung Hom" },
      { id: "ho-man-tin", labelZh: "何文田", labelEn: "Ho Man Tin" },
      { id: "kowloon-city-central", labelZh: "九龍城", labelEn: "Kowloon City" },
      { id: "kowloon-tong", labelZh: "九龍塘", labelEn: "Kowloon Tong" },
      { id: "kai-tak", labelZh: "啟德", labelEn: "Kai Tak" },
    ],
  },
  {
    id: "wong-tai-sin",
    labelZh: "黃大仙",
    labelEn: "Wong Tai Sin",
    area: "kowloon",
    subdistricts: [
      { id: "wong-tai-sin-central", labelZh: "黃大仙", labelEn: "Wong Tai Sin" },
      { id: "diamond-hill", labelZh: "鑽石山", labelEn: "Diamond Hill" },
      { id: "lok-fu", labelZh: "樂富", labelEn: "Lok Fu" },
      { id: "san-po-kong", labelZh: "新蒲崗", labelEn: "San Po Kong" },
    ],
  },
  {
    id: "kwun-tong",
    labelZh: "觀塘",
    labelEn: "Kwun Tong",
    area: "kowloon",
    subdistricts: [
      { id: "kwun-tong-central", labelZh: "觀塘", labelEn: "Kwun Tong" },
      { id: "ngau-tau-kok", labelZh: "牛頭角", labelEn: "Ngau Tau Kok" },
      { id: "lam-tin", labelZh: "藍田", labelEn: "Lam Tin" },
      { id: "yau-tong", labelZh: "油塘", labelEn: "Yau Tong" },
      { id: "kowloon-bay", labelZh: "九龍灣", labelEn: "Kowloon Bay" },
    ],
  },
  {
    id: "tsuen-wan",
    labelZh: "荃灣",
    labelEn: "Tsuen Wan",
    area: "new_territories",
    subdistricts: [
      { id: "tsuen-wan-central", labelZh: "荃灣", labelEn: "Tsuen Wan" },
      { id: "tsing-yi", labelZh: "青衣", labelEn: "Tsing Yi" },
      { id: "ma-wan", labelZh: "馬灣", labelEn: "Ma Wan" },
    ],
  },
  {
    id: "tuen-mun",
    labelZh: "屯門",
    labelEn: "Tuen Mun",
    area: "new_territories",
    subdistricts: [
      { id: "tuen-mun-central", labelZh: "屯門市中心", labelEn: "Tuen Mun Town Centre" },
      { id: "butterfly", labelZh: "蝴蝶", labelEn: "Butterfly" },
      { id: "sam-shing", labelZh: "三聖", labelEn: "Sam Shing" },
    ],
  },
  {
    id: "yuen-long",
    labelZh: "元朗",
    labelEn: "Yuen Long",
    area: "new_territories",
    subdistricts: [
      { id: "yuen-long-central", labelZh: "元朗", labelEn: "Yuen Long" },
      { id: "tin-shui-wai", labelZh: "天水圍", labelEn: "Tin Shui Wai" },
      { id: "kam-tin", labelZh: "錦田", labelEn: "Kam Tin" },
    ],
  },
  {
    id: "north",
    labelZh: "北區",
    labelEn: "North",
    area: "new_territories",
    subdistricts: [
      { id: "sheung-shui", labelZh: "上水", labelEn: "Sheung Shui" },
      { id: "fanling", labelZh: "粉嶺", labelEn: "Fanling" },
      { id: "sha-tau-kok", labelZh: "沙頭角", labelEn: "Sha Tau Kok" },
    ],
  },
  {
    id: "tai-po",
    labelZh: "大埔",
    labelEn: "Tai Po",
    area: "new_territories",
    subdistricts: [
      { id: "tai-po-central", labelZh: "大埔", labelEn: "Tai Po" },
      { id: "tai-wo", labelZh: "太和", labelEn: "Tai Wo" },
      { id: "science-park", labelZh: "科學園", labelEn: "Science Park" },
    ],
  },
  {
    id: "sha-tin",
    labelZh: "沙田",
    labelEn: "Sha Tin",
    area: "new_territories",
    subdistricts: [
      { id: "sha-tin-central", labelZh: "沙田", labelEn: "Sha Tin" },
      { id: "ma-on-shan", labelZh: "馬鞍山", labelEn: "Ma On Shan" },
      { id: "fo-tan", labelZh: "火炭", labelEn: "Fo Tan" },
      { id: "tai-wai", labelZh: "大圍", labelEn: "Tai Wai" },
    ],
  },
  {
    id: "sai-kung",
    labelZh: "西貢",
    labelEn: "Sai Kung",
    area: "new_territories",
    subdistricts: [
      { id: "sai-kung-central", labelZh: "西貢", labelEn: "Sai Kung" },
      { id: "tseung-kwan-o", labelZh: "將軍澳", labelEn: "Tseung Kwan O" },
      { id: "hang-hau", labelZh: "坑口", labelEn: "Hang Hau" },
    ],
  },
  {
    id: "kwai-tsing",
    labelZh: "葵青",
    labelEn: "Kwai Tsing",
    area: "new_territories",
    subdistricts: [
      { id: "kwai-chung", labelZh: "葵涌", labelEn: "Kwai Chung" },
      { id: "tsing-yi-kwai", labelZh: "青衣", labelEn: "Tsing Yi" },
    ],
  },
  {
    id: "islands",
    labelZh: "離島",
    labelEn: "Islands",
    area: "islands",
    subdistricts: [
      { id: "tung-chung", labelZh: "東涌", labelEn: "Tung Chung" },
      { id: "discovery-bay", labelZh: "愉景灣", labelEn: "Discovery Bay" },
      { id: "cheung-chau", labelZh: "長洲", labelEn: "Cheung Chau" },
      { id: "lantau-south", labelZh: "大嶼山南", labelEn: "South Lantau" },
    ],
  },
];

export const HK_DISTRICT_BY_ID = Object.fromEntries(HK_DISTRICTS.map((d) => [d.id, d]));

export const HK_SUBDISTRICT_BY_ID: Record<string, HKSubdistrict & { districtId: string }> = {};
for (const d of HK_DISTRICTS) {
  for (const s of d.subdistricts) {
    HK_SUBDISTRICT_BY_ID[s.id] = { ...s, districtId: d.id };
  }
}

export const HK_ALL_DISTRICT_IDS = HK_DISTRICTS.map((d) => d.id);

/** Legacy 5-region strings → district ids for migration / filter compat */
export const LEGACY_LOCATION_TO_DISTRICTS: Record<string, string[]> = {
  "港島區 (Hong Kong Island)": HK_DISTRICTS.filter((d) => d.area === "hk_island").map((d) => d.id),
  "九龍區 (Kowloon)": HK_DISTRICTS.filter((d) => d.area === "kowloon").map((d) => d.id),
  "新界區 (New Territories)": HK_DISTRICTS.filter((d) => d.area === "new_territories").map((d) => d.id),
  "離島區 (Outlying Islands)": HK_DISTRICTS.filter((d) => d.area === "islands").map((d) => d.id),
  "全港 / 現場可議": HK_ALL_DISTRICT_IDS,
};

export function getDistrictLabel(id: string, lang: "zh" | "en" | "both" = "both"): string {
  const d = HK_DISTRICT_BY_ID[id];
  if (!d) return id;
  if (lang === "zh") return d.labelZh;
  if (lang === "en") return d.labelEn;
  return `${d.labelZh} ${d.labelEn}`;
}

export function getSubdistrictLabel(id: string, lang: "zh" | "en" | "both" = "both"): string {
  const s = HK_SUBDISTRICT_BY_ID[id];
  if (!s) return id;
  if (lang === "zh") return s.labelZh;
  if (lang === "en") return s.labelEn;
  return `${s.labelZh} ${s.labelEn}`;
}

export function formatDistrictList(ids: string[], max = 2): string {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return "";
  const labels = unique.slice(0, max).map((id) => getDistrictLabel(id, "zh"));
  if (unique.length > max) return `${labels.join("、")} 等${unique.length}區`;
  return labels.join("、");
}

export function formatSubdistrictList(ids: string[], max = 3): string {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return "";
  const labels = unique.slice(0, max).map((id) => getSubdistrictLabel(id, "zh"));
  if (unique.length > max) return `${labels.join("、")} 等`;
  return labels.join("、");
}

/** Normalize DB arrays or legacy single location string */
export function normalizeDistrictIds(
  districts: unknown,
  legacyLocation?: string | null
): string[] {
  if (Array.isArray(districts)) {
    return districts.filter((d): d is string => typeof d === "string" && d.length > 0);
  }
  if (legacyLocation && LEGACY_LOCATION_TO_DISTRICTS[legacyLocation]) {
    return LEGACY_LOCATION_TO_DISTRICTS[legacyLocation];
  }
  return [];
}

export function normalizeSubdistrictIds(subdistricts: unknown): string[] {
  if (Array.isArray(subdistricts) && subdistricts.length) {
    return subdistricts.filter((s): s is string => typeof s === "string" && s.length > 0);
  }
  return [];
}

export function serviceMatchesDistrictFilter(
  serviceDistricts: string[],
  legacyLocation: string | null | undefined,
  filterDistrictIds: string[]
): boolean {
  if (!filterDistrictIds.length) return true;
  const districts = serviceDistricts.length
    ? serviceDistricts
    : normalizeDistrictIds([], legacyLocation);
  if (!districts.length) return false;
  return filterDistrictIds.some((f) => districts.includes(f));
}

export function districtsForFilterModal(): { id: string; label: string; area: HKArea }[] {
  return HK_DISTRICTS.map((d) => ({
    id: d.id,
    label: `${d.labelZh} ${d.labelEn}`,
    area: d.area,
  }));
}

export function isHongKongCountry(country: string | null | undefined): boolean {
  if (!country) return false;
  const c = country.trim().toLowerCase();
  return c === "hong kong" || c === "hk" || country.includes("香港");
}

export function profileMatchesDistrictFilter(
  profileDistricts: string[],
  legacyText: string | null | undefined,
  filterDistrictIds: string[]
): boolean {
  return serviceMatchesDistrictFilter(profileDistricts, legacyText, filterDistrictIds);
}
