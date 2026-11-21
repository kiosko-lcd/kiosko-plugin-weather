/**
 * A believable reading for the gallery and the editor: an autumn week in a
 * mid-latitude city, with a shower this afternoon and a wet spell later on.
 * Two days of hours and seven days, like the source. Derived from `now`
 * only, so the same instant always draws the same card.
 */
import { localize } from '@kiosko/sdk';
import type { DayForecast, HourForecast, Weather } from '@loksly/weather-astro';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Temperature along the day: coldest at 7:00, warmest at 15:00. */
function tempAt(hour: number, warmer = 0): number {
  return 11 + warmer + 5 * Math.cos(((hour - 15) / 24) * 2 * Math.PI);
}

/**
 * The sample city, as a user there would have typed it in Settings: Madrid,
 * but Shanghai for Simplified Chinese and Taipei for Traditional, where a
 * Spanish city would read foreign. Taipei's autumn is milder, so its card is
 * a few degrees warmer.
 */
const CITIES = {
  madrid: { place: { en: 'Madrid', es: 'Madrid', de: 'Madrid', 'zh-Hant': '馬德里', 'zh-Hans': '马德里' }, latitude: 40.42, longitude: -3.7, warmer: 0 },
  shanghai: { place: { en: 'Shanghai', es: 'Shanghái', de: 'Shanghai', 'zh-Hant': '上海', 'zh-Hans': '上海' }, latitude: 31.23, longitude: 121.47, warmer: 0 },
  taipei: { place: { en: 'Taipei', es: 'Taipéi', de: 'Taipeh', 'zh-Hant': '臺北', 'zh-Hans': '台北' }, latitude: 25.03, longitude: 121.56, warmer: 7 },
} as const;

function cityFor(locale: string) {
  const id = localize({ en: 'madrid', es: 'madrid', de: 'madrid', 'zh-Hant': 'taipei', 'zh-Hans': 'shanghai' }, locale) as keyof typeof CITIES;
  return CITIES[id] ?? CITIES.madrid;
}

export function demoWeather(now: number, locale = 'en'): Weather {
  const d = new Date(now);
  const h0 = d.getHours();
  const city = cityFor(locale);
  const warmer = city.warmer;
  const hours: HourForecast[] = Array.from({ length: 48 }, (_, i) => {
    const h = (h0 + i) % 24;
    // A shower crosses between 4 and 7 hours from now; a drizzle a day later.
    const rain = i >= 4 && i <= 7 ? [30, 60, 55, 25][i - 4]! : i === 3 ? 10 : i >= 28 && i <= 31 ? [10, 20, 20, 10][i - 28]! : 0;
    // Tomorrow is a couple of degrees cooler.
    return { label: `${pad2(h)}:00`, temp: Math.round(tempAt(h, warmer) - (rain >= 50 ? 1 : 0) - (i >= 24 - h0 ? 2 : 0)), rain };
  });
  const iso = (offset: number) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
    return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
  };
  const days: DayForecast[] = [
    { date: iso(0), code: 80, min: warmer + 6, max: warmer + 16, rain: 60 },
    { date: iso(1), code: 3, min: warmer + 8, max: warmer + 14, rain: 20 },
    { date: iso(2), code: 1, min: warmer + 5, max: warmer + 17, rain: 0 },
    { date: iso(3), code: 0, min: warmer + 4, max: warmer + 18, rain: 0 },
    { date: iso(4), code: 2, min: warmer + 7, max: warmer + 16, rain: 10 },
    { date: iso(5), code: 61, min: warmer + 9, max: warmer + 13, rain: 70 },
    { date: iso(6), code: 63, min: warmer + 8, max: warmer + 12, rain: 85 },
  ];
  return {
    place: localize(city.place, locale),
    latitude: city.latitude,
    longitude: city.longitude,
    temp: Math.round(tempAt(h0 + d.getMinutes() / 60, warmer)),
    feels: Math.round(tempAt(h0, warmer) - 2),
    code: 2,
    humidity: 64,
    wind: 14,
    night: h0 < 7 || h0 >= 19,
    days,
    hours,
    fetched: now - 4 * 60_000,
  };
}
