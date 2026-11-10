import { test } from 'node:test';
import assert from 'node:assert';
import { localize } from '@kiosko/sdk';
import { moonPhase } from '@loksly/weather-astro';
import { dayLabel, describeCode, moonHeadline } from './labels.ts';
import { detailsLine, hourLabel } from './draw.ts';
import plugin, { current, forecast, hoursToShow } from './index.ts';
import { createBaseContext, defaultsOf, validate } from '@kiosko/sdk';
import { demoWeather } from './demo.ts';

test('weather: WMO codes become text in both languages', () => {
  assert.strictEqual(localize(describeCode(0), 'es'), 'Despejado');
  assert.strictEqual(localize(describeCode(45), 'es'), 'Niebla');
  assert.strictEqual(localize(describeCode(95), 'en'), 'Thunderstorm');
  // A code this endpoint doesn't emit must not break the frame.
  assert.strictEqual(localize(describeCode(1234), 'es'), 'Sin datos');
});

test('weather: the hourly chart takes the hours ahead, one every step', () => {
  const w = demoWeather(Date.parse('2026-11-05T10:42:00'));
  assert.strictEqual(hoursToShow(w, 12, 1).length, 12);
  assert.strictEqual(hoursToShow(w, 0, 1).length, 0, '0 hides the chart');
  const every3 = hoursToShow(w, 24, 3);
  assert.deepStrictEqual(every3.map((h) => h.label.slice(0, 2)), ['10', '13', '16', '19', '22', '01', '04', '07']);
  assert.strictEqual(hoursToShow(w, 48, 1).length, 48, 'the source brings two days');
});

test('weather: short hour labels follow the clock; details in the reading units', () => {
  assert.strictEqual(hourLabel('14:00', false), '14h');
  assert.strictEqual(hourLabel('14:00', true), '2pm');
  assert.strictEqual(hourLabel('00:00', true), '12am');
  const w = demoWeather(Date.parse('2026-11-05T10:42:00'));
  assert.strictEqual(detailsLine(w, (x) => localize(x, 'es')), 'Sensación 10° · 64% · 14 km/h');
  assert.match(detailsLine({ ...w, units: 'imperial' }, (x) => localize(x, 'en')), /^Feels .* mph$/);
});

test('weather: forecast options are counts, the source uses the shared place fields', () => {
  const o = defaultsOf(forecast.options!);
  assert.deepStrictEqual({ hours: o.hours, days: o.days, hourStep: o.hourStep, showMoon: o.showMoon, showDetails: o.showDetails }, { hours: 12, days: 3, hourStep: 1, showMoon: true, showDetails: false });
  const s = validate(current.options!, {}).value;
  assert.deepStrictEqual(s, { units: 'metric', latitude: 0, longitude: 0, placeName: '' });
  assert.strictEqual(current.timeoutMs, 20_000);
  assert.ok(plugin.sources?.includes(current));
});

test('weather: without a place the source fails without touching the network', async () => {
  const ctx = { ...createBaseContext({ now: Date.now(), dataDir: '/nonexistent' }), options: validate(current.options!, {}).value, signal: new AbortController().signal, intervalMs: 900_000, timeoutMs: 20_000 };
  await assert.rejects(current.read!(ctx), /no place/);
});

test('weather: the first forecast day is "today", the rest their weekday', () => {
  const t = (x: Parameters<typeof localize>[0]) => localize(x, 'es');
  assert.strictEqual(dayLabel('2026-11-05', 0, 'es', t), 'Hoy');
  assert.match(dayLabel('2026-11-06', 1, 'es', t), /^Vie/);
  assert.match(dayLabel('2026-11-07', 1, 'en', (x) => localize(x, 'en')), /^Sat/);
});

test('weather: the moon counts down to the nearest milestone', () => {
  const m = moonPhase(Date.UTC(2026, 10, 5));
  const line = localize(moonHeadline(m), 'en');
  assert.match(line, /^(Full|New) (today|tomorrow|in \d+ days)$/);
});

test('weather: the demo reading is complete and deterministic', () => {
  const now = Date.parse('2026-11-05T10:42:00');
  const a = demoWeather(now);
  assert.deepStrictEqual(a, demoWeather(now));
  assert.strictEqual(a.hours.length, 48);
  assert.strictEqual(a.days.length, 7);
  assert.strictEqual(a.hours[0]!.label, '10:00');
  assert.ok(a.hours.some((h) => h.rain >= 50), 'there is a shower to draw');
});
