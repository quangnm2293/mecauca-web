/**
 * Astronomy engine — TypeScript port of the app's SunCalc-based engine.
 *
 * All day-level functions work in Asia/Saigon wall clock (UTC+7, no DST):
 * a "wall Date" is a JS Date whose UTC fields read as Saigon wall time,
 * exactly like the app. Precision: sunrise/sunset ~2 min, moon events
 * ~10 min — estimates for fishing, never for navigation.
 */

const RAD = Math.PI / 180;
const DAY_MS = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const E = 23.4397 * RAD; // obliquity
const J0 = 0.0009;
const VN_OFFSET_MS = 7 * 3600 * 1000;

const toJulian = (d: Date) => d.getTime() / DAY_MS - 0.5 + J1970;
const fromJulian = (j: number) => new Date(Math.round((j + 0.5 - J1970) * DAY_MS));
const toDays = (d: Date) => toJulian(d) - J2000;

/** ICT wall Date for the given calendar fields. */
export function wallDate(y: number, m: number, d: number, hh = 0, mm = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, hh, mm));
}

/** Today's ICT calendar date as {y, m, d}. */
export function todayICT(): { y: number; m: number; d: number } {
  const now = new Date(Date.now() + VN_OFFSET_MS);
  return { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1, d: now.getUTCDate() };
}

/** Current ICT wall moment as a wall Date (UTC fields = Saigon time). */
export function nowICTWall(): Date {
  return new Date(Date.now() + VN_OFFSET_MS);
}

export function dateKeyICT(dt: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

export function addDaysWall(dt: Date, days: number): Date {
  return new Date(dt.getTime() + days * DAY_MS);
}

const wallToInstant = (wall: Date) => new Date(wall.getTime() - VN_OFFSET_MS);
const toWall = (instant: Date) => new Date(instant.getTime() + VN_OFFSET_MS);

function rightAscension(l: number, b: number): number {
  return Math.atan2(Math.sin(l) * Math.cos(E) - Math.tan(b) * Math.sin(E), Math.cos(l));
}
function declination(l: number, b: number): number {
  return Math.asin(Math.sin(b) * Math.cos(E) + Math.cos(b) * Math.sin(E) * Math.sin(l));
}
function altitude(h: number, phi: number, dec: number): number {
  return Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(h));
}
function siderealTime(d: number, lw: number): number {
  return RAD * (280.16 + 360.9856235 * d) - lw;
}
function solarMeanAnomaly(d: number): number {
  return RAD * (357.5291 + 0.98560028 * d);
}
function eclipticLongitude(m: number): number {
  const c = RAD * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m));
  const peri = RAD * 102.9372;
  return m + c + peri + Math.PI;
}
function sunCoords(d: number) {
  const m = solarMeanAnomaly(d);
  const l = eclipticLongitude(m);
  return { ra: rightAscension(l, 0), dec: declination(l, 0) };
}
function moonCoords(d: number) {
  const l = RAD * (218.316 + 13.176396 * d);
  const m = RAD * (134.963 + 13.064993 * d);
  const f = RAD * (93.272 + 13.22935 * d);
  const lon = l + RAD * 6.289 * Math.sin(m);
  const lat = RAD * 5.128 * Math.sin(f);
  const dist = 385001 - 20905 * Math.cos(m);
  return { ra: rightAscension(lon, lat), dec: declination(lon, lat), dist };
}

function moonAltitudeAt(instant: Date, lat: number, lng: number): number {
  const lw = RAD * -lng;
  const phi = RAD * lat;
  const d = toDays(instant);
  const coords = moonCoords(d);
  const h = siderealTime(d, lw) - coords.ra;
  return altitude(h, phi, coords.dec) + (RAD * 0.017) / coords.dist;
}

// ---------------------------------------------------------------- Sun times
export interface SunTimes {
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date;
}

const julianCycle = (d: number, lw: number) => Math.round(d - J0 - lw / (2 * Math.PI));
const approxTransit = (ht: number, lw: number, n: number) => J0 + (ht + lw) / (2 * Math.PI) + n;
const solarTransitJ = (ds: number, m: number, l: number) =>
  J2000 + ds + 0.0053 * Math.sin(m) - 0.0069 * Math.sin(2 * l);

function hourAngle(h: number, phi: number, dec: number): number {
  const v = (Math.sin(h) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (v < -1 || v > 1) return NaN;
  return Math.acos(v);
}

export function sunTimes(date: Date, lat: number, lng: number): SunTimes {
  const anchor = wallToInstant(wallDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), 12));
  const lw = RAD * -lng;
  const phi = RAD * lat;
  const d = toDays(anchor);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const m = solarMeanAnomaly(ds);
  const l = eclipticLongitude(m);
  const dec = declination(l, 0);
  const jNoon = solarTransitJ(ds, m, l);

  const h0 = -0.833 * RAD;
  const w = hourAngle(h0, phi, dec);
  let sunrise: Date | null = null;
  let sunset: Date | null = null;
  if (!Number.isNaN(w)) {
    const a = approxTransit(w, lw, n);
    const jSet = solarTransitJ(a, m, l);
    sunset = toWall(fromJulian(jSet));
    const jRise = jNoon - (jSet - jNoon);
    sunrise = toWall(fromJulian(jRise));
  }
  return { sunrise, sunset, solarNoon: toWall(fromJulian(jNoon)) };
}

// ------------------------------------------------------- Moon illumination
export interface MoonIllumination {
  fraction: number;
  phase: number; // 0 new, 0.5 full, 1 next new
  phaseNameVi: string;
}

export function phaseNameVi(phase: number): string {
  const p = phase;
  if (p < 0.03 || p > 0.97) return 'Trăng non (ngày sóc)';
  if (p < 0.22) return 'Trăng lưỡi liềm đầu tháng';
  if (p < 0.28) return 'Trăng thượng huyền';
  if (p < 0.47) return 'Trăng khuyết đầy dần';
  if (p < 0.53) return 'Trăng tròn (ngày rằm)';
  if (p < 0.72) return 'Trăng khuyết vơi dần';
  if (p < 0.78) return 'Trăng hạ huyền';
  return 'Trăng lưỡi liềm cuối tháng';
}

export function moonIllumination(instant: Date): MoonIllumination {
  const wall = wallDate(
    instant.getUTCFullYear(),
    instant.getUTCMonth() + 1,
    instant.getUTCDate(),
    instant.getUTCHours(),
    instant.getUTCMinutes(),
  );
  const d = toDays(wallToInstant(wall));
  const s = sunCoords(d);
  const m = moonCoords(d);
  const sdist = 149598000;
  const phi = Math.acos(
    Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra),
  );
  const inc = Math.atan2(sdist * Math.sin(phi), m.dist - sdist * Math.cos(phi));
  const angle = Math.atan2(
    Math.cos(s.dec) * Math.sin(s.ra - m.ra),
    Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra),
  );
  const fraction = (1 + Math.cos(inc)) / 2;
  const phase = 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / Math.PI;
  return { fraction, phase, phaseNameVi: phaseNameVi(phase) };
}

// ------------------------------------------------------------ Moon times
export interface MoonTimes {
  moonrise: Date | null;
  moonset: Date | null;
  transit: Date;
  antitransit: Date;
}

const MOON_HORIZON = 0.133 * RAD;

function moonAltDeg(wallTime: Date, lat: number, lng: number): number {
  return moonAltitudeAt(wallToInstant(wallTime), lat, lng) / RAD;
}

function bisectCrossing(a: Date, b: Date, f: (t: Date) => number): Date {
  let lo = a.getTime();
  let hi = b.getTime();
  const flo = f(new Date(lo));
  for (let i = 0; i < 24; i++) {
    const mid = lo + Math.floor((hi - lo) / 2);
    const fm = f(new Date(mid));
    if ((flo < 0 && fm < 0) || (flo >= 0 && fm >= 0)) lo = mid;
    else hi = mid;
  }
  return new Date(lo + Math.floor((hi - lo) / 2));
}

function goldenExtreme(
  start: Date,
  end: Date,
  lat: number,
  lng: number,
  maximize: boolean,
): Date {
  const value = (t: Date) => {
    const a = moonAltDeg(t, lat, lng);
    return maximize ? a : -a;
  };
  let best = start;
  let bestVal = value(start);
  for (let t = start.getTime(); t < end.getTime(); t += 10 * 60000) {
    const v = value(new Date(t));
    if (v > bestVal) {
      bestVal = v;
      best = new Date(t);
    }
  }
  let a = Math.max(start.getTime(), best.getTime() - 15 * 60000);
  let b = Math.min(end.getTime(), best.getTime() + 15 * 60000);
  const invPhi = 0.618033988749895;
  let c = b - Math.round((b - a) * invPhi);
  let d = a + Math.round((b - a) * invPhi);
  for (let i = 0; i < 40 && b - a >= 60000; i++) {
    if (value(new Date(c)) < value(new Date(d))) a = c;
    else b = d;
    c = b - Math.round((b - a) * invPhi);
    d = a + Math.round((b - a) * invPhi);
  }
  return new Date(a + Math.floor((b - a) / 2));
}

export function moonTimes(date: Date, lat: number, lng: number): MoonTimes {
  const dayStart = wallDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  const dayEnd = addDaysWall(dayStart, 1);
  const horizonDeg = MOON_HORIZON / RAD;
  const altAt = (t: Date) => moonAltDeg(t, lat, lng) - horizonDeg;

  let rise: Date | null = null;
  let set: Date | null = null;
  const step = 4 * 60000;
  let t0 = dayStart.getTime();
  let a0 = altAt(new Date(t0));
  while (t0 < dayEnd.getTime()) {
    const t1 = t0 + step;
    const a1 = altAt(new Date(t1));
    if (a0 < 0 && a1 >= 0 && rise === null) rise = bisectCrossing(new Date(t0), new Date(t1), altAt);
    else if (a0 >= 0 && a1 < 0 && set === null) set = bisectCrossing(new Date(t0), new Date(t1), altAt);
    t0 = t1;
    a0 = a1;
  }
  const transit = goldenExtreme(dayStart, dayEnd, lat, lng, true);
  const antitransit = goldenExtreme(dayStart, dayEnd, lat, lng, false);
  return { moonrise: rise, moonset: set, transit, antitransit };
}

// ---------------------------------------------------------- Fishing windows
export type PeriodKind = 'majorTransit' | 'majorAntitransit' | 'minorMoonrise' | 'minorMoonset';

export interface FishingPeriod {
  kind: PeriodKind;
  start: Date;
  center: Date;
  end: Date;
  isMajor: boolean;
  overlapsGolden: boolean;
  labelVi: string;
}

export interface SolunarDay {
  date: Date;
  sun: SunTimes;
  moon: MoonTimes;
  illumination: MoonIllumination;
  periods: FishingPeriod[];
}

const PERIOD_LABELS: Record<PeriodKind, string> = {
  majorTransit: 'Khung chính — trăng qua đỉnh',
  majorAntitransit: 'Khung chính — trăng qua chân trời đối diện',
  minorMoonrise: 'Khung phụ — trăng mọc',
  minorMoonset: 'Khung phụ — trăng lặn',
};

function overlapsGolden(start: Date, end: Date, sun: SunTimes): boolean {
  const hit = (pivot: Date | null) => {
    if (!pivot) return false;
    const w0 = pivot.getTime() - 45 * 60000;
    const w1 = pivot.getTime() + 45 * 60000;
    return start.getTime() < w1 && end.getTime() > w0;
  };
  return hit(sun.sunrise) || hit(sun.sunset);
}

export function solunarDay(date: Date, lat: number, lng: number): SolunarDay {
  const day = wallDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  const sun = sunTimes(day, lat, lng);
  const moon = moonTimes(day, lat, lng);
  const illum = moonIllumination(
    wallDate(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), 12),
  );
  const periods: FishingPeriod[] = [];
  const add = (kind: PeriodKind, center: Date | null, halfMs: number) => {
    if (!center) return;
    const start = new Date(center.getTime() - halfMs);
    const end = new Date(center.getTime() + halfMs);
    periods.push({
      kind,
      start,
      center,
      end,
      isMajor: kind === 'majorTransit' || kind === 'majorAntitransit',
      overlapsGolden: overlapsGolden(start, end, sun),
      labelVi: PERIOD_LABELS[kind],
    });
  };
  add('majorTransit', moon.transit, 3600000);
  add('majorAntitransit', moon.antitransit, 3600000);
  add('minorMoonrise', moon.moonrise, 1800000);
  add('minorMoonset', moon.moonset, 1800000);
  periods.sort((a, b) => a.start.getTime() - b.start.getTime());
  return { date: day, sun, moon, illumination: illum, periods };
}

/** "05:45" from a wall Date. */
export function fmtTime(dt: Date | null): string {
  if (!dt) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(dt.getUTCHours())}:${p(dt.getUTCMinutes())}`;
}
