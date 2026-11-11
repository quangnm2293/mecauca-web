/**
 * Per-spot month fishing calendar — a faithful TypeScript port of
 * the app's spot_calendar.dart:
 *
 * * Days inside the ~16-day daily-forecast range are "Dự báo":
 *   weather from the daily summary (+ per-day pressure swing/trend
 *   and severe flags from the hourly series), temperature against
 *   the spot's species windows, water from the discharge series
 *   around that day or the accumulated-rain proxy, windows from
 *   the astronomy engine.
 * * Days beyond the forecast range are "Ước tính": fishing windows
 *   ONLY — nothing else is extrapolated.
 * * Past days are never scored.
 * Components with no data are excluded and the total renormalised,
 * exactly like the single-day score.
 *
 * NOTE (2026-11-11): the whole-day basis above is right for days
 * that have not started, but for TODAY it disagreed with the
 * spot-page hero (which scores the rest of today from current
 * conditions). SpotCalendar therefore overrides today's entry
 * with the shared scoreFromCurrent mapping (lib/forecast.ts)
 * once current conditions load — this whole-day entry remains
 * only as the fallback when that fetch fails.
 */
import { addDaysWall, dateKeyICT, solunarDay, type SolunarDay } from './astro';
import { fetchDaily, type DailyWeather, type HourEntry } from './forecast';
import { computeScore, type FishingScore, type WaterInputs } from './score';

export interface CalendarDayScore {
  dateKey: string;
  date: Date; // ICT wall date
  score: FishingScore;
  windows: SolunarDay;
  isForecast: boolean;
  basisLabelVi: 'Dự báo' | 'Ước tính';
}

export interface CalendarBundles {
  hours: HourEntry[] | null;
  daily: Map<string, DailyWeather>;
  discharge: Map<string, number> | null;
}

const num = (v: unknown): number | null => (typeof v === 'number' ? v : null);

function parseWall(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
}

/** Fetch the spot's three data bundles ONCE (never per day). */
export async function fetchCalendarBundles(lat: number, lng: number): Promise<CalendarBundles> {
  const [hours, daily, discharge] = await Promise.all([
    fetchAllHours(lat, lng),
    fetchDaily(lat, lng),
    fetchDischargeSeries(lat, lng),
  ]);
  return { hours, daily, discharge };
}

async function fetchAllHours(lat: number, lng: number): Promise<HourEntry[] | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&hourly=temperature_2m,pressure_msl,wind_speed_10m,wind_gusts_10m,precipitation,precipitation_probability` +
      `&forecast_days=16&past_days=3&timezone=Asia%2FSaigon`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    const hourly = json['hourly'] as Record<string, unknown[]> | undefined;
    if (!hourly) return null;
    const times = (hourly['time'] as unknown[]) ?? [];
    const col = (k: string) => (hourly[k] as unknown[]) ?? [];
    const temps = col('temperature_2m');
    const pressures = col('pressure_msl');
    const winds = col('wind_speed_10m');
    const gusts = col('wind_gusts_10m');
    const precips = col('precipitation');
    const probs = col('precipitation_probability');
    const at = (c: unknown[], i: number) => (i < c.length ? num(c[i]) : null);
    const out: HourEntry[] = [];
    for (let i = 0; i < times.length; i++) {
      const t = parseWall(String(times[i]));
      if (!t) continue;
      const probPct = at(probs, i);
      out.push({
        time: t,
        tempC: at(temps, i),
        pressureHpa: at(pressures, i),
        windKmh: at(winds, i),
        gustKmh: at(gusts, i),
        rainProbability: probPct == null ? null : probPct / 100,
        rainMm: at(precips, i),
      });
    }
    return out;
  } catch {
    return null;
  }
}

/** Per-day discharge series; null when < 5 usable values (app rule). */
async function fetchDischargeSeries(lat: number, lng: number): Promise<Map<string, number> | null> {
  try {
    const url =
      `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lng}` +
      `&daily=river_discharge&past_days=3&forecast_days=7`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    const daily = json['daily'] as Record<string, unknown[]> | undefined;
    const times = (daily?.['time'] as unknown[]) ?? [];
    const values = (daily?.['river_discharge'] as unknown[]) ?? [];
    const out = new Map<string, number>();
    for (let i = 0; i < times.length && i < values.length; i++) {
      const v = num(values[i]);
      if (v != null) out.set(String(times[i]), v);
    }
    return out.size >= 5 ? out : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------- computation

interface HourlyDay {
  pressureSwing: number | null;
  pressureTrendMidday: number | null;
  severe: boolean;
  rainSum: number | null;
  tempMean: number | null;
}

function aggregateHours(hours: HourEntry[]): Map<string, HourlyDay> {
  const byDay = new Map<string, HourEntry[]>();
  for (const h of hours) {
    const key = dateKeyICT(h.time);
    const arr = byDay.get(key) ?? [];
    arr.push(h);
    byDay.set(key, arr);
  }
  const result = new Map<string, HourlyDay>();
  for (const [key, entries] of byDay) {
    const agg: HourlyDay = {
      pressureSwing: null,
      pressureTrendMidday: null,
      severe: false,
      rainSum: null,
      tempMean: null,
    };
    const pressures = entries
      .map((e) => e.pressureHpa)
      .filter((v): v is number => v != null);
    if (pressures.length >= 2) {
      agg.pressureSwing = Math.max(...pressures) - Math.min(...pressures);
    }
    const pressureAtOrBefore = (hour: number): number | null => {
      let best: number | null = null;
      for (const e of entries) {
        if (e.time.getUTCHours() <= hour && e.pressureHpa != null) best = e.pressureHpa;
      }
      return best;
    };
    const p15 = pressureAtOrBefore(15);
    const p12 = pressureAtOrBefore(12);
    if (p15 != null && p12 != null) agg.pressureTrendMidday = p15 - p12;
    agg.severe = entries.some((e) => (e.gustKmh ?? 0) >= 65 || (e.rainMm ?? 0) >= 15);
    let rain = 0;
    let sawRain = false;
    let tempSum = 0;
    let tempCount = 0;
    for (const e of entries) {
      if (e.rainMm != null) {
        rain += e.rainMm;
        sawRain = true;
      }
      if (e.tempC != null) {
        tempSum += e.tempC;
        tempCount++;
      }
    }
    if (sawRain) agg.rainSum = rain;
    if (tempCount > 0) agg.tempMean = tempSum / tempCount;
    result.set(key, agg);
  }
  return result;
}

function waterForDay(
  day: Date,
  discharge: Map<string, number> | null,
  rainByDay: Map<string, number>,
): WaterInputs | null {
  if (discharge && discharge.size >= 5) {
    const meanOf = (days: Date[]): number | null => {
      const xs = days
        .map((d) => discharge.get(dateKeyICT(d)))
        .filter((v): v is number => v != null);
      if (xs.length < 2) return null;
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    const baseline = meanOf([addDaysWall(day, -2), addDaysWall(day, -1), day]);
    const future = meanOf([addDaysWall(day, 1), addDaysWall(day, 2), addDaysWall(day, 3)]);
    if (baseline != null && future != null && baseline > 0) {
      const sorted = [...discharge.values()].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const peak = sorted[sorted.length - 1];
      return {
        dischargeTrend: (future - baseline) / baseline,
        dischargePeakRatio: median > 0 ? peak / median : null,
      };
    }
  }
  // Rain proxy: the day itself plus most of the previous 3 days.
  let present = 0;
  let sum = 0;
  for (let i = 3; i >= 0; i--) {
    const v = rainByDay.get(dateKeyICT(addDaysWall(day, -i)));
    if (v != null) {
      present++;
      sum += v;
    }
  }
  if (rainByDay.has(dateKeyICT(day)) && present >= 3) {
    return { rainRecentMm: sum };
  }
  return null;
}

/**
 * Scores every day in [from]..[to] for the spot. Days before
 * [today] are skipped (never scored).
 */
export function computeCalendarDays(args: {
  lat: number;
  lng: number;
  species: string[];
  from: Date;
  to: Date;
  today: Date;
  bundles: CalendarBundles;
}): Map<string, CalendarDayScore> {
  const { lat, lng, species, bundles } = args;
  const dayOnly = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const todayD = dayOnly(args.today);
  const hourlyByDay = bundles.hours ? aggregateHours(bundles.hours) : new Map<string, HourlyDay>();

  const rainByDay = new Map<string, number>();
  for (const [key, agg] of hourlyByDay) {
    if (agg.rainSum != null) rainByDay.set(key, agg.rainSum);
  }
  for (const [key, dw] of bundles.daily) {
    if (dw.rainSumMm != null) rainByDay.set(key, dw.rainSumMm);
  }

  const result = new Map<string, CalendarDayScore>();
  let d = dayOnly(args.from);
  const end = dayOnly(args.to);
  while (d.getTime() <= end.getTime()) {
    const day = d;
    d = addDaysWall(d, 1);
    if (day.getTime() < todayD.getTime()) continue;
    const key = dateKeyICT(day);
    const windows = solunarDay(day, lat, lng);
    const dw = bundles.daily.get(key) ?? null;
    if (!dw) {
      result.set(key, {
        dateKey: key,
        date: day,
        windows,
        isForecast: false,
        basisLabelVi: 'Ước tính',
        score: computeScore({ solunar: windows }),
      });
      continue;
    }
    const hourly = hourlyByDay.get(key) ?? null;
    result.set(key, {
      dateKey: key,
      date: day,
      windows,
      isForecast: true,
      basisLabelVi: 'Dự báo',
      score: computeScore({
        solunar: windows,
        pressureTrend3h: hourly?.pressureTrendMidday ?? null,
        pressureSwing3d: hourly?.pressureSwing ?? null,
        severeWeatherAhead: hourly?.severe ?? false,
        windKmh: dw.windMaxKmh,
        gustKmh: dw.gustMaxKmh,
        rainProbability: dw.rainProbMax,
        rainMm: dw.rainSumMm,
        temperatureC: dw.tempMeanC ?? hourly?.tempMean ?? null,
        species,
        water: waterForDay(day, bundles.discharge, rainByDay),
      }),
    });
  }
  return result;
}
