/**
 * Region helpers aligned with Komari Glassmorphism:
 * flag files live at /images/flags/{CODE}.svg (uppercase, e.g. HK.svg)
 */

const REGION_FLAG_REGEX = /[\u{1F1E0}-\u{1F1FF}]{2}/gu;

interface RegionInfo {
  code: string; // uppercase ISO-ish code used by /images/flags
  zh: string;
  en: string;
  emoji: string;
}

const REGION_MAP: Record<string, Omit<RegionInfo, "emoji">> = {
  "🇭🇰": { code: "HK", zh: "香港", en: "Hong Kong" },
  "🇨🇳": { code: "CN", zh: "中国", en: "China" },
  "🇺🇸": { code: "US", zh: "美国", en: "United States" },
  "🇯🇵": { code: "JP", zh: "日本", en: "Japan" },
  "🇰🇷": { code: "KR", zh: "韩国", en: "South Korea" },
  "🇸🇬": { code: "SG", zh: "新加坡", en: "Singapore" },
  "🇹🇼": { code: "TW", zh: "台湾", en: "Taiwan" },
  "🇬🇧": { code: "GB", zh: "英国", en: "United Kingdom" },
  "🇩🇪": { code: "DE", zh: "德国", en: "Germany" },
  "🇫🇷": { code: "FR", zh: "法国", en: "France" },
  "🇨🇦": { code: "CA", zh: "加拿大", en: "Canada" },
  "🇦🇺": { code: "AU", zh: "澳大利亚", en: "Australia" },
  "🇳🇱": { code: "NL", zh: "荷兰", en: "Netherlands" },
  "🇷🇺": { code: "RU", zh: "俄罗斯", en: "Russia" },
  "🇮🇳": { code: "IN", zh: "印度", en: "India" },
  "🇧🇷": { code: "BR", zh: "巴西", en: "Brazil" },
  "🇻🇳": { code: "VN", zh: "越南", en: "Vietnam" },
  "🇹🇭": { code: "TH", zh: "泰国", en: "Thailand" },
  "🇲🇾": { code: "MY", zh: "马来西亚", en: "Malaysia" },
  "🇮🇩": { code: "ID", zh: "印度尼西亚", en: "Indonesia" },
  "🇵🇭": { code: "PH", zh: "菲律宾", en: "Philippines" },
  "🇹🇷": { code: "TR", zh: "土耳其", en: "Turkey" },
  "🇮🇹": { code: "IT", zh: "意大利", en: "Italy" },
  "🇪🇸": { code: "ES", zh: "西班牙", en: "Spain" },
  "🇨🇭": { code: "CH", zh: "瑞士", en: "Switzerland" },
  "🇸🇪": { code: "SE", zh: "瑞典", en: "Sweden" },
  "🇳🇴": { code: "NO", zh: "挪威", en: "Norway" },
  "🇫🇮": { code: "FI", zh: "芬兰", en: "Finland" },
  "🇵🇱": { code: "PL", zh: "波兰", en: "Poland" },
  "🇺🇦": { code: "UA", zh: "乌克兰", en: "Ukraine" },
  "🇲🇽": { code: "MX", zh: "墨西哥", en: "Mexico" },
  "🇦🇷": { code: "AR", zh: "阿根廷", en: "Argentina" },
  "🇨🇱": { code: "CL", zh: "智利", en: "Chile" },
  "🇿🇦": { code: "ZA", zh: "南非", en: "South Africa" },
  "🇦🇪": { code: "AE", zh: "阿联酋", en: "UAE" },
  "🇮🇱": { code: "IL", zh: "以色列", en: "Israel" },
  "🇲🇴": { code: "MO", zh: "澳门", en: "Macau" },
  "🇳🇿": { code: "NZ", zh: "新西兰", en: "New Zealand" },
  "🇮🇪": { code: "IE", zh: "爱尔兰", en: "Ireland" },
  "🇵🇹": { code: "PT", zh: "葡萄牙", en: "Portugal" },
  "🇧🇪": { code: "BE", zh: "比利时", en: "Belgium" },
  "🇦🇹": { code: "AT", zh: "奥地利", en: "Austria" },
  "🇨🇿": { code: "CZ", zh: "捷克", en: "Czechia" },
  "🇷🇴": { code: "RO", zh: "罗马尼亚", en: "Romania" },
  "🇭🇺": { code: "HU", zh: "匈牙利", en: "Hungary" },
  "🇬🇷": { code: "GR", zh: "希腊", en: "Greece" },
  "🇩🇰": { code: "DK", zh: "丹麦", en: "Denmark" },
  "🇰🇿": { code: "KZ", zh: "哈萨克斯坦", en: "Kazakhstan" },
  "🇰🇭": { code: "KH", zh: "柬埔寨", en: "Cambodia" },
  "🇱🇦": { code: "LA", zh: "老挝", en: "Laos" },
  "🇲🇲": { code: "MM", zh: "缅甸", en: "Myanmar" },
  "🇧🇩": { code: "BD", zh: "孟加拉", en: "Bangladesh" },
  "🇵🇰": { code: "PK", zh: "巴基斯坦", en: "Pakistan" },
  "🇸🇦": { code: "SA", zh: "沙特阿拉伯", en: "Saudi Arabia" },
  "🇶🇦": { code: "QA", zh: "卡塔尔", en: "Qatar" },
  "🇪🇬": { code: "EG", zh: "埃及", en: "Egypt" },
  "🇳🇬": { code: "NG", zh: "尼日利亚", en: "Nigeria" },
  "🇰🇪": { code: "KE", zh: "肯尼亚", en: "Kenya" },
  "🇨🇴": { code: "CO", zh: "哥伦比亚", en: "Colombia" },
  "🇵🇪": { code: "PE", zh: "秘鲁", en: "Peru" },
  "🇺🇾": { code: "UY", zh: "乌拉圭", en: "Uruguay" },
  "🇮🇸": { code: "IS", zh: "冰岛", en: "Iceland" },
  "🇱🇺": { code: "LU", zh: "卢森堡", en: "Luxembourg" },
  "🇱🇹": { code: "LT", zh: "立陶宛", en: "Lithuania" },
  "🇱🇻": { code: "LV", zh: "拉脱维亚", en: "Latvia" },
  "🇪🇪": { code: "EE", zh: "爱沙尼亚", en: "Estonia" },
  "🇧🇬": { code: "BG", zh: "保加利亚", en: "Bulgaria" },
  "🇷🇸": { code: "RS", zh: "塞尔维亚", en: "Serbia" },
  "🇭🇷": { code: "HR", zh: "克罗地亚", en: "Croatia" },
  "🇸🇮": { code: "SI", zh: "斯洛文尼亚", en: "Slovenia" },
  "🇸🇰": { code: "SK", zh: "斯洛伐克", en: "Slovakia" },
};

const CODE_TO_EMOJI = Object.fromEntries(
  Object.entries(REGION_MAP).map(([emoji, info]) => [info.code, emoji])
);

const ALIAS_TO_EMOJI: Record<string, string> = {};
for (const [emoji, info] of Object.entries(REGION_MAP)) {
  ALIAS_TO_EMOJI[info.code.toLowerCase()] = emoji;
  ALIAS_TO_EMOJI[info.en.toLowerCase()] = emoji;
  ALIAS_TO_EMOJI[info.zh] = emoji;
}

// common aliases
Object.assign(ALIAS_TO_EMOJI, {
  uk: "🇬🇧",
  britain: "🇬🇧",
  hongkong: "🇭🇰",
  "hong kong": "🇭🇰",
  korea: "🇰🇷",
  "south korea": "🇰🇷",
  usa: "🇺🇸",
  america: "🇺🇸",
  台灣: "🇹🇼",
  澳門: "🇲🇴",
});

function extractEmoji(region: string): string | null {
  const matches = region.match(REGION_FLAG_REGEX);
  return matches?.[0] ?? null;
}

function resolveEntry(region: string | null | undefined): RegionInfo | null {
  if (!region?.trim()) return null;
  const trimmed = region.trim();

  if (REGION_MAP[trimmed]) {
    return { emoji: trimmed, ...REGION_MAP[trimmed] };
  }

  const emoji = extractEmoji(trimmed);
  if (emoji && REGION_MAP[emoji]) {
    return { emoji, ...REGION_MAP[emoji] };
  }

  const lower = trimmed.toLowerCase();
  if (ALIAS_TO_EMOJI[lower] && REGION_MAP[ALIAS_TO_EMOJI[lower]]) {
    const e = ALIAS_TO_EMOJI[lower];
    return { emoji: e, ...REGION_MAP[e] };
  }

  // plain code like HK / hk
  const upper = trimmed.toUpperCase();
  if (CODE_TO_EMOJI[upper] && REGION_MAP[CODE_TO_EMOJI[upper]]) {
    const e = CODE_TO_EMOJI[upper];
    return { emoji: e, ...REGION_MAP[e] };
  }

  return null;
}

/** Uppercase code for /images/flags/{CODE}.svg */
export function getRegionCode(region: string | null | undefined): string {
  const entry = resolveEntry(region);
  if (entry) return entry.code;
  if (!region?.trim()) return "";
  const emoji = extractEmoji(region);
  if (emoji) {
    const code = Array.from(emoji, (char) => {
      const point = char.codePointAt(0);
      return point ? String.fromCharCode(point - 0x1f1e6 + 65) : "";
    }).join("");
    if (/^[A-Z]{2}$/.test(code)) return code;
  }
  // if already looks like a 2-letter code
  const t = region.trim();
  if (/^[a-z]{2}$/i.test(t)) return t.toUpperCase();
  return "";
}

export function getRegionEmoji(region: string | null | undefined): string {
  const entry = resolveEntry(region);
  if (entry) return entry.emoji;
  const emoji = region ? extractEmoji(region) : null;
  return emoji || region?.trim() || "";
}

export function getRegionDisplayName(
  region: string | null | undefined,
  lang: "zh" | "en" = "zh"
): string {
  const entry = resolveEntry(region);
  if (entry) return lang === "zh" ? entry.zh : entry.en;
  return region?.trim() || "";
}

/** Komari core / Glass flag path — uppercase filename */
export function getFlagImage(region: string | null | undefined): string | null {
  const code = getRegionCode(region);
  if (!code) return null;
  return `/images/flags/${code}.svg`;
}

export function hasRegion(region: string | null | undefined): boolean {
  return Boolean(region?.trim());
}
