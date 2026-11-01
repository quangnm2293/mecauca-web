/**
 * Client-side forecast data for the "Dự báo tại bãi" block.
 * Mirrors the app's parsing of the keyless public forecast + river
 * discharge feeds. Any failure returns null — the UI then falls back
 * to a windows-only score and says so plainly. Nothing is fabricated.
 */
import { dateKeyICT, nowICTWall } from './astro';
import type { WaterInputs } from './score';

export interface HourEntry {
  time: Date; // ICT wall time
  tempC: number | null;
  pressureHpa: number | null;
  windKmh: number | null;
  gustKmh: number | null;
  rainProbability: number | null; // 0..1
  rainMm: number | null;
}

export interface WeatherData {
  tempC: number;
  pressureHpa: number;
  windKmh: number;
  gustKmh: number;
  pressureTrend3h: number | null;
  rainProbRestOfDay: number | null;
  rainMmRestOfDay: number | null;
  pressureSwing3d: number | null;
  rainPrev3DaysMm: number | null;
  severeWeatherAhead: boolean;
  todayHours: HourEntry[];
}

export interface DailyWeather {
  dateKey: string;
  tempMeanC: number | null;
  windMaxKmh: number | null;
  gustMaxKmh: number | null;
  rainSumMm: number | null;
  rainProbMax: number | null; // 0..1
}

const num = (v: unknown): number | null => (typeof v === 'number' ? v : null);

/** Parse an API local-time string ("2026-11-01T07:00") as an ICT wall Date. */
function parseWall(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,pressure_msl,wind_speed_10m,wind_gusts_10m,precipitation` +
      `&hourly=temperature_2m,pressure_msl,wind_speed_10m,wind_gusts_10m,precipitation,precipitation_probability` +
      `&forecast_days=7&past_days=3&timezone=Asia%2FSaigon`;
    const json = (await fetchJson(url)) as Record<string, never>;
    return parseForecast(json, nowICTWall());
  } catch {
    return null;
  }
}

export function parseForecast(json: Record<string, never>, now: Date): WeatherData | null {
  const current = json['current'] as Record<string, unknown> | undefined;
  if (!current) return null;
  const temp = num(current['temperature_2m']);
  const pressure = num(current['pressure_msl']);
  const wind = num(current['wind_speed_10m']);
  const gust = num(current['wind_gusts_10m']);
  if (temp == null || pressure == null || wind == null) return null;

  const hourly = json['hourly'] as Record<string, unknown[]> | undefined;
  const hours: HourEntry[] = [];
  let trend: number | null = null;
  let rainProbMax: number | null = null;
  let rainMmSum = 0;
  let sawRain = false;

  if (hourly) {
    const times = (hourly['time'] as unknown[]) ?? [];
    const col = (k: string) => (hourly[k] as unknown[]) ?? [];
    const temps = col('temperature_2m');
    const pressures = col('pressure_msl');
    const winds = col('wind_speed_10m');
    const gusts = col('wind_gusts_10m');
    const precips = col('precipitation');
    const probs = col('precipitation_probability');
    const at = (c: unknown[], i: number) => (i < c.length ? num(c[i]) : null);

    const pressureAtOrBefore = (target: Date): number | null => {
      let best: number | null = null;
      for (let i = 0; i < times.length; i++) {
        const t = parseWall(String(times[i]));
        if (!t) continue;
        if (t.getTime() <= target.getTime()) best = at(pressures, i) ?? best;
      }
      return best;
    };
    const pNow = pressureAtOrBefore(now) ?? pressure;
    const p3h = pressureAtOrBefore(new Date(now.getTime() - 3 * 3600000));
    if (p3h != null) trend = pNow - p3h;

    const nowHourStart = new Date(now.getTime());
    nowHourStart.setUTCMinutes(0, 0, 0);
    for (let i = 0; i < times.length; i++) {
      const t = parseWall(String(times[i]));
      if (!t) continue;
      const probPct = at(probs, i);
      const entry: HourEntry = {
        time: t,
        tempC: at(temps, i),
        pressureHpa: at(pressures, i),
        windKmh: at(winds, i),
        gustKmh: at(gusts, i),
        rainProbability: probPct == null ? null : probPct / 100,
        rainMm: at(precips, i),
      };
      hours.push(entry);
      const sameDay = dateKeyICT(t) === dateKeyICT(now);
      if (sameDay && t.getTime() >= nowHourStart.getTime()) {
        if (entry.rainProbability != null) {
          rainProbMax =
            rainProbMax == null ? entry.rainProbability : Math.max(rainProbMax, entry.rainProbability);
          sawRain = true;
        }
        if (entry.rainMm != null) {
          rainMmSum += entry.rainMm;
          sawRain = true;
        }
      }
    }
  }

  const todayKey = dateKeyICT(now);
  const todayHours = hours.filter((h) => dateKeyICT(h.time) === todayKey);

  // Pressure swing over the last ~72h.
  let swing: number | null = null;
  const windowStart = now.getTime() - 72 * 3600000;
  const recent = hours
    .filter((h) => h.time.getTime() >= windowStart && h.time.getTime() <= now.getTime() && h.pressureHpa != null)
    .map((h) => h.pressureHpa as number);
  if (recent.length >= 2) swing = Math.max(...recent) - Math.min(...recent);

  // Rain total over the 3 calendar days before today.
  const prevKeys = new Set<string>();
  for (let i = 1; i <= 3; i++) {
    prevKeys.add(dateKeyICT(new Date(now.getTime() - i * 86400000)));
  }
  let prevSum = 0;
  let sawPrev = false;
  for (const h of hours) {
    if (prevKeys.has(dateKeyICT(h.time)) && h.rainMm != null) {
      prevSum += h.rainMm;
      sawPrev = true;
    }
  }

  const aheadEnd = now.getTime() + 48 * 3600000;
  const severe = hours.some(
    (h) =>
      h.time.getTime() >= now.getTime() &&
      h.time.getTime() <= aheadEnd &&
      ((h.gustKmh ?? 0) >= 65 || (h.rainMm ?? 0) >= 15),
  );

  return {
    tempC: temp,
    pressureHpa: pressure,
    windKmh: wind,
    gustKmh: gust ?? wind,
    pressureTrend3h: trend,
    rainProbRestOfDay: sawRain ? rainProbMax : null,
    rainMmRestOfDay: sawRain ? rainMmSum : null,
    pressureSwing3d: swing,
    rainPrev3DaysMm: sawPrev ? prevSum : null,
    severeWeatherAhead: severe,
    todayHours,
  };
}

export async function fetchDaily(lat: number, lng: number): Promise<Map<string, DailyWeather>> {
  const out = new Map<string, DailyWeather>();
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&daily=temperature_2m_mean,wind_speed_10m_max,wind_gusts_10m_max,precipitation_sum,precipitation_probability_max` +
      `&forecast_days=16&timezone=Asia%2FSaigon`;
    const json = (await fetchJson(url)) as Record<string, never>;
    const daily = json['daily'] as Record<string, unknown[]> | undefined;
    if (!daily) return out;
    const times = (daily['time'] as unknown[]) ?? [];
    const col = (k: string) => (daily[k] as unknown[]) ?? [];
    const temps = col('temperature_2m_mean');
    const winds = col('wind_speed_10m_max');
    const gusts = col('wind_gusts_10m_max');
    const sums = col('precipitation_sum');
    const probs = col('precipitation_probability_max');
    for (let i = 0; i < times.length; i++) {
      const key = String(times[i]);
      const at = (c: unknown[]) => (i < c.length ? num(c[i]) : null);
      const probPct = at(probs);
      out.set(key, {
        dateKey: key,
        tempMeanC: at(temps),
        windMaxKmh: at(winds),
        gustMaxKmh: at(gusts),
        rainSumMm: at(sums),
        rainProbMax: probPct == null ? null : probPct / 100,
      });
    }
  } catch {
    /* empty map — the UI just skips the mini-forecast */
  }
  return out;
}

/** Discharge-derived water inputs, or null when no usable series exists. */
export async function fetchWaterInputs(
  lat: number,
  lng: number,
  weather: WeatherData | null,
): Promise<WaterInputs | null> {
  try {
    const url =
      `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lng}` +
      `&daily=river_discharge&past_days=3&forecast_days=7`;
    const json = (await fetchJson(url)) as Record<string, never>;
    const parsed = parseDischarge(json);
    if (parsed) return parsed;
  } catch {
    /* fall through to the rain proxy */
  }
  const prev = weather?.rainPrev3DaysMm;
  if (prev != null) {
    return { rainRecentMm: prev + (weather?.rainMmRestOfDay ?? 0) };
  }
  return null;
}

export function parseDischarge(json: Record<string, never>): WaterInputs | null {
  const daily = json['daily'] as Record<string, unknown[]> | undefined;
  const raw = (daily?.['river_discharge'] as unknown[]) ?? [];
  const values = raw.map((v) => num(v));
  const present = values.filter((v): v is number => v != null);
  if (present.length < 5 || values.length < 7) return null;
  const meanOf = (slice: (number | null)[]) => {
    const xs = slice.filter((v): v is number => v != null);
    if (!xs.length) return null;
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  };
  const baseline = meanOf(values.slice(0, 4));
  const future = meanOf(values.slice(4, 7));
  if (baseline == null || future == null || baseline <= 0) return null;
  const sorted = [...present].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (median <= 0) return null;
  const peak = Math.max(...present);
  return {
    dischargeTrend: (future - baseline) / baseline,
    dischargePeakRatio: peak / median,
  };
}
