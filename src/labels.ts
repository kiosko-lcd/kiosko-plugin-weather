/**
 * Texts of the weather card, in the user's language: WMO codes, moon phases
 * and how old a reading is. Kept apart from the drawing so they can be tested.
 */
import type { BaseContext, Localized } from '@kiosko/sdk';
import type { Moon, PhaseName } from '@loksly/weather-astro';

/** WMO code → text. Codes not listed are not emitted by the Open-Meteo endpoint. */
const WMO: Record<number, Localized> = {
  0: { en: 'Clear', es: 'Despejado', 'zh-Hant': '晴', 'zh-Hans': '晴' },
  1: { en: 'Mostly clear', es: 'Poco nuboso', 'zh-Hant': '大致晴朗', 'zh-Hans': '少云' },
  2: { en: 'Partly cloudy', es: 'Parcialmente nuboso', 'zh-Hant': '晴時多雲', 'zh-Hans': '多云' },
  3: { en: 'Overcast', es: 'Nublado', 'zh-Hant': '陰', 'zh-Hans': '阴' },
  45: { en: 'Fog', es: 'Niebla', 'zh-Hant': '霧', 'zh-Hans': '雾' },
  48: { en: 'Freezing fog', es: 'Niebla helada', 'zh-Hant': '凍霧', 'zh-Hans': '冻雾' },
  51: { en: 'Light drizzle', es: 'Llovizna débil', 'zh-Hant': '小毛毛雨', 'zh-Hans': '小毛毛雨' },
  53: { en: 'Drizzle', es: 'Llovizna', 'zh-Hant': '毛毛雨', 'zh-Hans': '毛毛雨' },
  55: { en: 'Heavy drizzle', es: 'Llovizna intensa', 'zh-Hant': '濃毛毛雨', 'zh-Hans': '强毛毛雨' },
  56: { en: 'Freezing drizzle', es: 'Llovizna helada', 'zh-Hant': '凍毛毛雨', 'zh-Hans': '冻毛毛雨' },
  57: { en: 'Freezing drizzle', es: 'Llovizna helada', 'zh-Hant': '凍毛毛雨', 'zh-Hans': '冻毛毛雨' },
  61: { en: 'Light rain', es: 'Lluvia débil', 'zh-Hant': '小雨', 'zh-Hans': '小雨' },
  63: { en: 'Rain', es: 'Lluvia', 'zh-Hant': '中雨', 'zh-Hans': '中雨' },
  65: { en: 'Heavy rain', es: 'Lluvia fuerte', 'zh-Hant': '大雨', 'zh-Hans': '大雨' },
  66: { en: 'Freezing rain', es: 'Lluvia helada', 'zh-Hant': '凍雨', 'zh-Hans': '冻雨' },
  67: { en: 'Freezing rain', es: 'Lluvia helada', 'zh-Hant': '凍雨', 'zh-Hans': '冻雨' },
  71: { en: 'Light snow', es: 'Nieve débil', 'zh-Hant': '小雪', 'zh-Hans': '小雪' },
  73: { en: 'Snow', es: 'Nieve', 'zh-Hant': '中雪', 'zh-Hans': '中雪' },
  75: { en: 'Heavy snow', es: 'Nieve intensa', 'zh-Hant': '大雪', 'zh-Hans': '大雪' },
  77: { en: 'Snow grains', es: 'Cinarra', 'zh-Hant': '米雪', 'zh-Hans': '米雪' },
  80: { en: 'Showers', es: 'Chubascos', 'zh-Hant': '陣雨', 'zh-Hans': '阵雨' },
  81: { en: 'Showers', es: 'Chubascos', 'zh-Hant': '陣雨', 'zh-Hans': '阵雨' },
  82: { en: 'Heavy showers', es: 'Chubascos fuertes', 'zh-Hant': '強陣雨', 'zh-Hans': '强阵雨' },
  85: { en: 'Snow showers', es: 'Chubascos de nieve', 'zh-Hant': '陣雪', 'zh-Hans': '阵雪' },
  86: { en: 'Snow showers', es: 'Chubascos de nieve', 'zh-Hant': '陣雪', 'zh-Hans': '阵雪' },
  95: { en: 'Thunderstorm', es: 'Tormenta', 'zh-Hant': '雷雨', 'zh-Hans': '雷阵雨' },
  96: { en: 'Thunderstorm with hail', es: 'Tormenta con granizo', 'zh-Hant': '雷雨夾冰雹', 'zh-Hans': '雷阵雨伴冰雹' },
  99: { en: 'Thunderstorm with hail', es: 'Tormenta con granizo', 'zh-Hant': '雷雨夾冰雹', 'zh-Hans': '雷阵雨伴冰雹' },
};

const NO_DATA: Localized = { en: 'No data', es: 'Sin datos', 'zh-Hant': '無資料', 'zh-Hans': '无数据' };

/** Text for a WMO code; an unknown code must not break the frame. */
export function describeCode(code: number): Localized {
  return WMO[code] ?? NO_DATA;
}

const MOON: Record<PhaseName, Localized> = {
  new: { en: 'New moon', es: 'Luna nueva', 'zh-Hant': '新月', 'zh-Hans': '新月' },
  'waxing-crescent': { en: 'Waxing crescent', es: 'Creciente', 'zh-Hant': '眉月', 'zh-Hans': '蛾眉月' },
  'first-quarter': { en: 'First quarter', es: 'Cuarto creciente', 'zh-Hant': '上弦月', 'zh-Hans': '上弦月' },
  'waxing-gibbous': { en: 'Waxing gibbous', es: 'Gibosa creciente', 'zh-Hant': '盈凸月', 'zh-Hans': '盈凸月' },
  full: { en: 'Full moon', es: 'Luna llena', 'zh-Hant': '滿月', 'zh-Hans': '满月' },
  'waning-gibbous': { en: 'Waning gibbous', es: 'Gibosa menguante', 'zh-Hant': '虧凸月', 'zh-Hans': '亏凸月' },
  'last-quarter': { en: 'Last quarter', es: 'Cuarto menguante', 'zh-Hant': '下弦月', 'zh-Hans': '下弦月' },
  'waning-crescent': { en: 'Waning crescent', es: 'Menguante', 'zh-Hant': '殘月', 'zh-Hans': '残月' },
};

export function moonName(m: Moon): Localized {
  return MOON[m.name];
}

/**
 * The line under the moon. Close to full it counts down to it; just after,
 * to the new moon, which is the next milestone anyone cares about.
 */
export function moonHeadline(m: Moon, ctx: Pick<BaseContext, 't' | 'plural'>): string {
  const { t, plural } = ctx;
  if (m.daysToFull === 0) return t({ en: 'Full today', es: 'Llena hoy', 'zh-Hant': '今天滿月', 'zh-Hans': '今天满月' });
  if (m.daysToNew === 0) return t({ en: 'New today', es: 'Nueva hoy', 'zh-Hant': '今天新月', 'zh-Hans': '今天新月' });
  // "Tomorrow" is a word of its own, not the count's singular.
  if (m.daysToFull <= m.daysToNew) {
    return m.daysToFull === 1
      ? t({ en: 'Full tomorrow', es: 'Llena mañana', 'zh-Hant': '明天滿月', 'zh-Hans': '明天满月' })
      : plural(m.daysToFull, { en: { one: 'Full in {n} day', other: 'Full in {n} days' }, es: { one: 'Llena en {n} día', other: 'Llena en {n} días' }, 'zh-Hant': { other: '{n} 天後滿月' }, 'zh-Hans': { other: '{n} 天后满月' } });
  }
  return m.daysToNew === 1
    ? t({ en: 'New tomorrow', es: 'Nueva mañana', 'zh-Hant': '明天新月', 'zh-Hans': '明天新月' })
    : plural(m.daysToNew, { en: { one: 'New in {n} day', other: 'New in {n} days' }, es: { one: 'Nueva en {n} día', other: 'Nueva en {n} días' }, 'zh-Hant': { other: '{n} 天後新月' }, 'zh-Hans': { other: '{n} 天后新月' } });
}

/** A reading older than this gets its age under the temperature ("35 min ago"). */
export const STALE_AFTER_MS = 20 * 60_000;

/** Short weekday of a forecast day ("YYYY-MM-DD"), "Today" for the first one. */
export function dayLabel(date: string, index: number, locale: string, t: (x: Localized) => string): string {
  if (index === 0) return t({ en: 'Today', es: 'Hoy', 'zh-Hant': '今天', 'zh-Hans': '今天' });
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  const s = new Date(y, m - 1, d).toLocaleDateString(locale, { weekday: 'short' }).replace(/\.$/, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
