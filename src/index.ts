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
import { definePlugin, defineSource, defineWidget, locationOptions, placeOf, t, type Box } from '@kiosko/sdk';
import { demoWeather } from './demo.ts';
import { drawDays, drawHourly, drawMoon, drawNow, drawTiny, rule, type Painter } from './draw.ts';

export { demoWeather };

export const current = defineSource({
  id: 'current',
  name: { en: 'Current weather', es: 'Tiempo actual' },
  description: {
    en: 'Now, the next 48 hours and the next 7 days, from Open-Meteo (no key needed), for your place in Settings or the one set here.',
    es: 'Ahora, las próximas 48 horas y los próximos 7 días, de Open-Meteo (sin clave), para tu lugar de los ajustes o el que pongas aquí.',
  },
  options: t.object({
    units: t.enum(['metric', 'imperial'] as const, {
      label: { en: 'Units', es: 'Unidades' },
      labels: { metric: { en: 'Metric (°C, km/h)', es: 'Métricas (°C, km/h)' }, imperial: { en: 'Imperial (°F, mph)', es: 'Imperiales (°F, mph)' } },
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
    if (!place) throw new Error('no place: set your location in Settings or latitude/longitude in this source');
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
  demo: ({ now }) => demoWeather(now),
});

export const forecast = defineWidget({
  id: 'forecast',
  name: { en: 'Weather forecast', es: 'Previsión del tiempo' },
  description: {
    en: 'Temperature and sky now, the next hours (temperature curve and rain) and days, and the moon when there is room.',
    es: 'Temperatura y cielo ahora, las próximas horas (curva de temperatura y lluvia) y días, y la luna si hay sitio.',
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
      label: { en: 'Next hours', es: 'Próximas horas' },
      help: { en: 'How far ahead the hourly chart goes, as many hours as fit. 0 hides it.', es: 'Hasta dónde llega la gráfica por horas, las que quepan. 0 la oculta.' },
    }),
    hourStep: t.integer({
      default: 1,
      min: 1,
      max: 6,
      unit: 'h',
      label: { en: 'One column every', es: 'Una columna cada' },
      help: { en: '2 or 3 fit a whole day in a narrow tile.', es: 'Con 2 o 3 cabe un día entero en una tesela estrecha.' },
    }),
    days: t.integer({
      default: 3,
      min: 0,
      max: 7,
      label: { en: 'Next days', es: 'Próximos días' },
      help: { en: 'Today included, as many as fit. 0 hides them.', es: 'Hoy incluido, los que quepan. 0 los oculta.' },
    }),
    showMoon: t.boolean({ default: true, label: { en: 'Moon phase', es: 'Fase de la luna' }, help: { en: 'Only on wide tiles.', es: 'Sólo en teselas anchas.' } }),
    showDetails: t.boolean({ default: false, label: { en: 'Feels like, humidity and wind', es: 'Sensación, humedad y viento' }, help: { en: 'Under the temperature, when there is room.', es: 'Bajo la temperatura, si hay sitio.' } }),
  }),
  sources: ['weather/current'],
  redraw: 'never',
  render(g, ctx) {
    const { box, theme, kit, options } = ctx;
    const w = ctx.sources['weather/current'] as Weather | undefined;
    const p: Painter = { g, kit, theme, t: ctx.t, fmt: ctx.fmt, locale: ctx.locale, now: ctx.now };
    if (!w) {
      const size = Math.max(10, Math.min(24, box.h / 5));
      const msg = ctx.t({ en: 'No weather yet', es: 'Aún sin datos del tiempo' });
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
  demo: ({ now }) => ({ sources: { 'weather/current': demoWeather(now) } }),
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
  name: { en: 'Weather', es: 'El tiempo' },
  version: '0.2.1',
  description: { en: 'Weather from Open-Meteo, shared with every widget, and a forecast card.', es: 'El tiempo de Open-Meteo, compartido con todos los widgets, y una tarjeta de previsión.' },
  author: 'Kiosko',
  license: 'MIT',
  icon: 'cloud-sun',
  sources: [current],
  widgets: [forecast],
});
