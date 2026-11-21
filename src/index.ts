/**
 * The weather: one shared source (Open-Meteo, no API key) that any widget can
 * ask for as `weather/current` (the cats' window, the news corner…), and a
 * forecast card that adapts to its tile.
 *
 * The source keeps its last good reading on disk: an outage of the network
 * shouldn't blank the panel, and a restart shouldn't wait for the first read.
 * Readings older than six hours are dropped (see `loadWeather`).
 */
import { join } from 'node:path';
import { fetchWeather, loadWeather, saveWeather, type Weather } from '@loksly/weather-astro';
import { definePlugin, defineSource, defineWidget, locationOptions, placeOf, PluginError, t, type Box } from '@kiosko/sdk';
import { demoWeather } from './demo.ts';
import { drawDays, drawHourly, drawMoon, drawNow, drawTiny, rule, type Painter } from './draw.ts';

export { demoWeather };

export const current = defineSource({
  id: 'current',
  name: { en: 'Current weather', es: 'Tiempo actual', de: 'Aktuelles Wetter', 'zh-Hant': '目前天氣', 'zh-Hans': '当前天气' },
  description: {
    en: 'Now, the next 48 hours and the next 7 days, from Open-Meteo (no key needed), for your place in Settings or the one set here.',
    es: 'Ahora, las próximas 48 horas y los próximos 7 días, de Open-Meteo (sin clave), para tu lugar de los ajustes o el que pongas aquí.',
    de: 'Jetzt, die nächsten 48 Stunden und die nächsten 7 Tage, von Open-Meteo (kein Schlüssel nötig), für deinen Ort aus den Einstellungen oder den hier angegebenen.',
    'zh-Hant': '現在、未來 48 小時與未來 7 天的天氣，來自 Open-Meteo（不需金鑰），地點取自「設定」或在此指定。',
    'zh-Hans': '现在、未来 48 小时和未来 7 天的天气，来自 Open-Meteo（无需密钥），地点取自“设置”或在此指定。',
  },
  options: t.object({
    units: t.enum(['metric', 'imperial'] as const, {
      label: { en: 'Units', es: 'Unidades', de: 'Einheiten', 'zh-Hant': '單位', 'zh-Hans': '单位' },
      labels: { metric: { en: 'Metric (°C, km/h)', es: 'Métricas (°C, km/h)', de: 'Metrisch (°C, km/h)', 'zh-Hant': '公制（°C、km/h）', 'zh-Hans': '公制（°C、km/h）' }, imperial: { en: 'Imperial (°F, mph)', es: 'Imperiales (°F, mph)', de: 'Imperial (°F, mph)', 'zh-Hant': '英制（°F、mph）', 'zh-Hans': '英制（°F、mph）' } },
    }),
    ...locationOptions(),
  }),
  intervalMs: 15 * 60_000,
  // Open-Meteo's free tier is generous, but a reading a minute is already more than the sky changes.
  minIntervalMs: 60_000,
  timeoutMs: 20_000,
  async read(ctx): Promise<Weather> {
    const { options: o } = ctx;
    const place = placeOf(o, ctx.location);
    if (!place) {
      throw new PluginError({
        en: 'No place: set your location in Settings, or latitude and longitude in this source',
        es: 'Sin ubicación: pon tu ubicación en Ajustes, o latitud y longitud en esta fuente',
        de: 'Kein Ort: Lege deinen Standort in den Einstellungen fest oder Breiten- und Längengrad in dieser Datenquelle',
        'zh-Hant': '沒有位置：請在「設定」中設定你的位置，或在此資料來源中填入緯度和經度',
        'zh-Hans': '没有位置：请在“设置”中设置你的位置，或在此数据源中填写纬度和经度',
      });
    }
    const { latitude: lat, longitude: lon } = place;
    const name = place.name?.trim() || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    const file = join(ctx.cacheDir || ctx.dataDir, `weather-${lat.toFixed(3)}_${lon.toFixed(3)}${o.units === 'imperial' ? '-imperial' : ''}.json`);
    // Most of the read's budget for the request, the rest to fall back to the copy on disk in time.
    const timeoutMs = Math.max(1000, Math.round(ctx.timeoutMs * 0.75));
    const fresh = await fetchWeather({ name, latitude: lat, longitude: lon }, { timeoutMs, signal: ctx.signal, units: o.units }, ctx.log);
    if (fresh) {
      try {
        saveWeather(file, fresh);
      } catch (err) {
        ctx.log(`could not keep the reading: ${err instanceof Error ? err.message : String(err)}`);
      }
      return fresh;
    }
    const last = loadWeather(file, ctx.now);
    if (last) return last;
    throw new Error('Open-Meteo did not answer and there is no recent reading on disk');
  },
  demo: ({ now, locale }) => demoWeather(now, locale),
});

export const forecast = defineWidget({
  id: 'forecast',
  name: { en: 'Weather forecast', es: 'Previsión del tiempo', de: 'Wettervorhersage', 'zh-Hant': '天氣預報', 'zh-Hans': '天气预报' },
  description: {
    en: 'Temperature and sky now, the next hours (temperature curve and rain) and days, and the moon when there is room.',
    es: 'Temperatura y cielo ahora, las próximas horas (curva de temperatura y lluvia) y días, y la luna si hay sitio.',
    de: 'Temperatur und Himmel jetzt, die nächsten Stunden (Temperaturkurve und Regen) und Tage, und der Mond, wenn Platz ist.',
    'zh-Hant': '現在的溫度與天空狀況、未來幾小時（溫度曲線與降雨）和未來幾天，空間足夠時還有月相。',
    'zh-Hans': '当前温度和天空状况、未来几小时（温度曲线和降水）和未来几天，空间足够时还有月相。',
  },
  icon: 'cloud-sun',
  category: 'info',
  tags: ['weather', 'tiempo', 'forecast', 'moon'],
  size: { min: { w: 120, h: 70 }, preferred: { w: 900, h: 300 } },
  options: t.object({
    hours: t.integer({
      default: 12,
      min: 0,
      max: 48,
      unit: 'h',
      label: { en: 'Next hours', es: 'Próximas horas', de: 'Nächste Stunden', 'zh-Hant': '未來幾小時', 'zh-Hans': '未来几小时' },
      help: { en: 'How far ahead the hourly chart goes, as many hours as fit. 0 hides it.', es: 'Hasta dónde llega la gráfica por horas, las que quepan. 0 la oculta.', de: 'Wie weit das Stundendiagramm reicht, so viele Stunden wie passen. 0 blendet es aus.', 'zh-Hant': '逐時圖表涵蓋的時間長度，能放幾小時就放幾小時。0 表示隱藏。', 'zh-Hans': '逐小时图表覆盖的时间长度，能放几小时就放几小时。0 表示隐藏。' },
    }),
    hourStep: t.integer({
      default: 1,
      min: 1,
      max: 6,
      unit: 'h',
      label: { en: 'One column every', es: 'Una columna cada', de: 'Eine Spalte alle', 'zh-Hant': '每欄間隔', 'zh-Hans': '每列间隔' },
      help: { en: '2 or 3 fit a whole day in a narrow tile.', es: 'Con 2 o 3 cabe un día entero en una tesela estrecha.', de: 'Mit 2 oder 3 passt ein ganzer Tag in eine schmale Kachel.', 'zh-Hant': '設為 2 或 3，窄方格也能放下一整天。', 'zh-Hans': '设为 2 或 3，窄格子也能放下一整天。' },
    }),
    days: t.integer({
      default: 3,
      min: 0,
      max: 7,
      label: { en: 'Next days', es: 'Próximos días', de: 'Nächste Tage', 'zh-Hant': '未來幾天', 'zh-Hans': '未来几天' },
      help: { en: 'Today included, as many as fit. 0 hides them.', es: 'Hoy incluido, los que quepan. 0 los oculta.', de: 'Heute eingeschlossen, so viele wie passen. 0 blendet sie aus.', 'zh-Hant': '包含今天，能放幾天就放幾天。0 表示隱藏。', 'zh-Hans': '包含今天，能放几天就放几天。0 表示隐藏。' },
    }),
    showMoon: t.boolean({ default: true, label: { en: 'Moon phase', es: 'Fase de la luna', de: 'Mondphase', 'zh-Hant': '月相', 'zh-Hans': '月相' }, help: { en: 'Only on wide tiles.', es: 'Sólo en teselas anchas.', de: 'Nur auf breiten Kacheln.', 'zh-Hant': '僅限寬方格。', 'zh-Hans': '仅限宽格子。' } }),
    showDetails: t.boolean({ default: false, label: { en: 'Feels like, humidity and wind', es: 'Sensación, humedad y viento', de: 'Gefühlte Temperatur, Luftfeuchte und Wind', 'zh-Hant': '體感溫度、濕度與風', 'zh-Hans': '体感温度、湿度和风' }, help: { en: 'Under the temperature, when there is room.', es: 'Bajo la temperatura, si hay sitio.', de: 'Unter der Temperatur, wenn Platz ist.', 'zh-Hant': '顯示在溫度下方，空間足夠時。', 'zh-Hans': '显示在温度下方，空间足够时。' } }),
  }),
  sources: ['weather/current'],
  redraw: 'never',
  render(g, ctx) {
    const { box, theme, kit, options } = ctx;
    const w = ctx.sources['weather/current'] as Weather | undefined;
    const p: Painter = { g, kit, theme, t: ctx.t, plural: ctx.plural, fmt: ctx.fmt, locale: ctx.locale, now: ctx.now };
    if (!w) {
      const size = Math.max(10, Math.min(24, box.h / 5));
      const msg = ctx.t({ en: 'No weather yet', es: 'Aún sin datos del tiempo', de: 'Noch keine Wetterdaten', 'zh-Hant': '尚無天氣資料', 'zh-Hans': '暂无天气数据' });
      kit.drawTracked(g, kit.truncate(g, msg, box.w, { size, family: theme.fonts.sans }), box.x + box.w / 2, box.y + box.h / 2 + size * 0.35, { size, family: theme.fonts.sans, color: theme.colors.inkFaint, align: 'center' });
      return;
    }
    if (box.w < 200 || box.h < 90) return drawTiny(p, w, box);

    const gap = Math.round(Math.max(8, Math.min(22, box.h * 0.05)));
    const hours = hoursToShow(w, options.hours, options.hourStep);
    const days = w.days.slice(0, options.days);
    const hasHours = hours.length >= 2;
    const hasDays = days.length > 0;
    const nowOpts = { details: options.showDetails };
    if (box.w >= box.h * 2) {
      // Wide: blocks side by side, left to right: now, moon, hours, days.
      const nowW = Math.min(box.w * 0.45, Math.max(220, Math.min(460, box.h * 1.15)));
      let rest = box.w - nowW - gap;
      // Beside the chart the days get a narrow column; without it, whatever the moon leaves.
      let daysW = hasDays && hasHours && rest >= 780 ? Math.min(320, Math.max(200, rest * 0.25)) : 0;
      if (daysW) rest -= daysW + gap;
      const moonW = options.showMoon && box.h >= 160 && rest >= (hasHours ? 900 : 600) ? Math.max(150, Math.min(220, box.h * 0.6)) : 0;
      if (moonW) rest -= moonW + gap;
      const chart = hasHours && rest >= 240 && box.h >= 100;
      if (!chart && !daysW && hasDays && rest >= 160) {
        daysW = rest;
        rest = 0;
      }
      drawNow(p, w, { x: box.x, y: box.y, w: nowW, h: box.h }, nowOpts);
      let x = box.x + nowW + gap;
      const sep = () => rule(p, x - gap / 2, box.y + box.h * 0.08, box.y + box.h * 0.92);
      if (moonW) {
        sep();
        drawMoon(p, { x, y: box.y, w: moonW, h: box.h });
        x += moonW + gap;
      }
      if (chart) {
        sep();
        drawHourly(p, hours, { x: x + gap * 0.5, y: box.y, w: rest - gap * 0.5, h: box.h }, options.hourStep);
        x += rest + gap;
      }
      if (daysW) {
        sep();
        drawDays(p, days, { x: x + gap * 0.5, y: box.y + box.h * 0.04, w: daysW - gap * 0.5, h: box.h * 0.92 });
      }
      return;
    }
    // Stacked: now on top (with the days beside it if there's width), the hours below.
    const topH = Math.max(80, Math.min(180, box.h * 0.42));
    const below = box.h - topH - gap;
    // The days go beside "now" while the hours take the bottom, and below it otherwise.
    const daysBelow = hasDays && !hasHours && below >= 60;
    const sideDays = hasDays && !daysBelow && box.w >= 480;
    const daysW = sideDays ? Math.max(180, Math.min(320, box.w * 0.42)) : 0;
    const top: Box = { x: box.x, y: box.y, w: box.w - (daysW ? daysW + gap : 0), h: below >= 60 ? topH : box.h };
    drawNow(p, w, top, nowOpts);
    if (daysW) {
      rule(p, box.x + top.w + gap / 2, top.y + top.h * 0.1, top.y + top.h * 0.9);
      drawDays(p, days, { x: box.x + box.w - daysW + gap / 2, y: top.y, w: daysW - gap / 2, h: top.h });
    }
    if (below < 60) return;
    const area: Box = { x: box.x, y: box.y + topH + gap, w: box.w, h: below };
    if (hasHours && below >= 110) drawHourly(p, hours, area, options.hourStep);
    else if (hasDays && !daysW) drawDays(p, days, area);
  },
  demo: ({ now, locale }) => ({ sources: { 'weather/current': demoWeather(now, locale) } }),
});

/**
 * The hours the chart may show: every `step`-th one of the first `ahead`
 * (the source brings 48). The chart then draws as many as fit its width.
 */
export function hoursToShow(w: Pick<Weather, 'hours'>, ahead: number, step: number): Weather['hours'] {
  const every = Math.max(1, Math.round(step));
  return w.hours.slice(0, Math.max(0, ahead)).filter((_, i) => i % every === 0);
}

export default definePlugin({
  id: 'weather',
  name: { en: 'Weather', es: 'El tiempo', de: 'Wetter', 'zh-Hant': '天氣', 'zh-Hans': '天气' },
  version: '0.2.3',
  languages: ['en', 'es', 'de', 'zh-Hant', 'zh-Hans'],
  sdk: '^0.2.0',
  permissions: { network: ['api.open-meteo.com'] },
  description: { en: 'Weather from Open-Meteo, shared with every widget, and a forecast card.', es: 'El tiempo de Open-Meteo, compartido con todos los widgets, y una tarjeta de previsión.', de: 'Wetter von Open-Meteo, geteilt mit allen Widgets, und eine Vorhersagekarte.', 'zh-Hant': '來自 Open-Meteo 的天氣，供所有小工具共用，另附一張預報卡片。', 'zh-Hans': '来自 Open-Meteo 的天气，供所有小组件共享，另附一张预报卡片。' },
  author: 'Kiosko',
  license: 'MIT',
  icon: 'cloud-sun',
  sources: [current],
  widgets: [forecast],
});
