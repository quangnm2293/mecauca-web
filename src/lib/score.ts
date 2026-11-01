/**
 * Fishing score 0–100 — formula v2, ported faithfully from the app:
 *   Thời tiết & khí áp  40 — pressure trend + stability + wind + rain
 *   Nhiệt độ            25 — species temperature windows
 *   Mực nước            20 — discharge trend, else rain proxy, else excluded
 *   Khung giờ cá ăn     15 — moon phase + fishing windows
 * A component with no data is EXCLUDED and the total renormalised over
 * the components actually used — numbers are never invented.
 */
import type { SolunarDay } from './astro';

export interface WaterInputs {
  dischargeTrend?: number | null;
  dischargePeakRatio?: number | null;
  rainRecentMm?: number | null;
}

export interface ScoreInputs {
  solunar: SolunarDay;
  pressureTrend3h?: number | null;
  pressureSwing3d?: number | null;
  severeWeatherAhead?: boolean;
  windKmh?: number | null;
  gustKmh?: number | null;
  rainProbability?: number | null;
  rainMm?: number | null;
  temperatureC?: number | null;
  species?: string[];
  water?: WaterInputs | null;
}

export interface ScoreComponent {
  key: string;
  labelVi: string;
  maxPoints: number;
  earned: number | null;
}

export interface FishingScore {
  total: number;
  components: ScoreComponent[];
  hasForecast: boolean;
  verdictVi: string;
  basisVi: string;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function curve(x: number, knots: [number, number][]): number {
  if (x <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    if (x <= knots[i][0]) {
      const [x0, y0] = knots[i - 1];
      const [x1, y1] = knots[i];
      const t = (x - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return knots[knots.length - 1][1];
}

// --- Component: Khung giờ cá ăn (15) -------------------------------------
function windowsQuality(day: SolunarDay): number {
  const p = day.illumination.phase;
  const distToPeak = Math.min(Math.min(p, 1 - p), Math.abs(p - 0.5));
  const phaseQuality = clamp01(1 - distToPeak / 0.25);
  const phasePoints = 10 * phaseQuality;

  let timing = 8;
  let goldenBest = 0;
  for (const period of day.periods) {
    if (period.overlapsGolden) {
      goldenBest = Math.max(goldenBest, period.isMajor ? 12 : 8);
    }
  }
  timing += goldenBest;
  const majorsInHours = day.periods.filter(
    (e) => e.isMajor && e.center.getUTCHours() >= 4 && e.center.getUTCHours() <= 21,
  ).length;
  timing += majorsInHours * 2.5;
  const timingPoints = Math.min(timing, 25);
  return (phasePoints + timingPoints) / 35;
}

// --- Component: Thời tiết & khí áp (40) ----------------------------------
const pressureQuality = (trend3h: number) =>
  curve(trend3h, [
    [-4, 0.1], [-2, 0.3], [-1, 0.5], [-0.3, 0.68], [0.3, 0.8], [1, 0.92], [2, 1],
  ]);
const stabilityQuality = (swingHpa: number) =>
  curve(swingHpa, [
    [1, 1], [2.5, 0.92], [4, 0.78], [6, 0.55], [8, 0.35], [12, 0.15], [18, 0.05],
  ]);

function windQuality(windKmh: number, gustKmh?: number | null): number {
  const effective = Math.max(windKmh, (gustKmh ?? 0) * 0.7);
  return curve(effective, [
    [0, 1], [10, 0.95], [15, 0.8], [20, 0.6], [25, 0.42], [30, 0.25], [40, 0.08], [55, 0],
  ]);
}

function rainQuality(probability?: number | null, mm?: number | null): number {
  let q = 1;
  if (probability != null) {
    q = Math.min(
      q,
      curve(probability, [[0, 1], [0.2, 0.92], [0.4, 0.75], [0.6, 0.52], [0.8, 0.28], [1, 0.1]]),
    );
  }
  if (mm != null) {
    q = Math.min(q, curve(mm, [[0, 1], [2, 0.85], [5, 0.62], [10, 0.38], [20, 0.15], [40, 0.03]]));
  }
  return q;
}

function weatherQuality(i: ScoreInputs): number | null {
  const parts: [number, number][] = [];
  if (i.pressureTrend3h != null) parts.push([pressureQuality(i.pressureTrend3h), 0.35]);
  if (i.pressureSwing3d != null) {
    let q = stabilityQuality(i.pressureSwing3d);
    if (i.severeWeatherAhead) q = Math.min(q, 0.2);
    parts.push([q, 0.25]);
  }
  if (i.windKmh != null) parts.push([windQuality(i.windKmh, i.gustKmh), 0.2]);
  if (i.rainProbability != null || i.rainMm != null) {
    parts.push([rainQuality(i.rainProbability, i.rainMm), 0.2]);
  }
  if (!parts.length) return null;
  let sum = 0;
  let wSum = 0;
  for (const [q, w] of parts) {
    sum += q * w;
    wSum += w;
  }
  return sum / wSum;
}

// --- Component: Nhiệt độ (25) --------------------------------------------
interface TempWindow {
  optimalMin: number;
  optimalMax: number;
  zeroBelow: number;
  zeroAbove: number;
}

export const SPECIES_TEMP_WINDOWS: Record<string, TempWindow> = {
  'Rô phi': { optimalMin: 25, optimalMax: 30, zeroBelow: 18, zeroAbove: 37 },
  'Chép': { optimalMin: 20, optimalMax: 28, zeroBelow: 10, zeroAbove: 35 },
  'Tra': { optimalMin: 26, optimalMax: 31, zeroBelow: 19, zeroAbove: 37 },
  'Lóc': { optimalMin: 24, optimalMax: 32, zeroBelow: 16, zeroAbove: 38 },
  'Trắm': { optimalMin: 20, optimalMax: 30, zeroBelow: 12, zeroAbove: 36 },
  'Diếc': { optimalMin: 16, optimalMax: 26, zeroBelow: 6, zeroAbove: 33 },
};
const GENERIC_WINDOW: TempWindow = { optimalMin: 22, optimalMax: 30, zeroBelow: 14, zeroAbove: 37 };

function windowQuality(tempC: number, w: TempWindow): number {
  if (tempC >= w.optimalMin && tempC <= w.optimalMax) return 1;
  if (tempC < w.optimalMin) return clamp01((tempC - w.zeroBelow) / (w.optimalMin - w.zeroBelow));
  return clamp01((w.zeroAbove - tempC) / (w.zeroAbove - w.optimalMax));
}

export function temperatureQualityFor(tempC: number, species: string[]): number {
  let best = -1;
  for (const name of species) {
    let w: TempWindow | undefined = SPECIES_TEMP_WINDOWS[name];
    if (!w) {
      for (const [key, win] of Object.entries(SPECIES_TEMP_WINDOWS)) {
        if (name.startsWith(key)) {
          w = win;
          break;
        }
      }
    }
    if (w) best = Math.max(best, windowQuality(tempC, w));
  }
  if (best < 0) return windowQuality(tempC, GENERIC_WINDOW);
  return best;
}

// --- Component: Mực nước (20) --------------------------------------------
function dischargeQuality(trend: number, peakRatio?: number | null): number {
  let q = curve(trend, [
    [-0.6, 0.15], [-0.3, 0.32], [-0.05, 0.7], [0.05, 0.82], [0.2, 1], [0.35, 0.95],
    [0.6, 0.65], [1, 0.35], [1.8, 0.15],
  ]);
  if (peakRatio != null && peakRatio > 3) q = Math.min(q, 0.2);
  return q;
}

const rainProxyQuality = (mm: number) =>
  curve(mm, [[0, 0.55], [5, 0.75], [15, 0.95], [30, 0.8], [50, 0.5], [80, 0.25], [120, 0.1]]);

function waterQuality(water?: WaterInputs | null): number | null {
  if (!water) return null;
  if (water.dischargeTrend != null) {
    return dischargeQuality(water.dischargeTrend, water.dischargePeakRatio);
  }
  if (water.rainRecentMm != null) return rainProxyQuality(water.rainRecentMm);
  return null;
}

// --- Total ----------------------------------------------------------------
export function computeScore(inputs: ScoreInputs): FishingScore {
  const components: ScoreComponent[] = [];
  const add = (key: string, label: string, maxPoints: number, quality: number | null) => {
    components.push({
      key,
      labelVi: label,
      maxPoints,
      earned: quality == null ? null : quality * maxPoints,
    });
  };

  add('weather', 'Thời tiết & khí áp', 40, weatherQuality(inputs));
  add(
    'temperature',
    'Nhiệt độ',
    25,
    inputs.temperatureC == null
      ? null
      : temperatureQualityFor(inputs.temperatureC, inputs.species ?? []),
  );
  add('water', 'Mực nước', 20, waterQuality(inputs.water));
  add('windows', 'Khung giờ cá ăn', 15, windowsQuality(inputs.solunar));

  let earnedSum = 0;
  let maxSum = 0;
  for (const c of components) {
    if (c.earned != null) {
      earnedSum += c.earned;
      maxSum += c.maxPoints;
    }
  }
  const total = maxSum === 0 ? 0 : Math.round((100 * earnedSum) / maxSum);
  const hasForecast = components.some((c) => c.key !== 'windows' && c.earned != null);

  let verdictVi: string;
  if (total >= 70) verdictVi = 'Ngày đẹp — đi sớm, canh khung vàng';
  else if (total >= 45) verdictVi = 'Ngày trung bình — câu giải trí được';
  else if (hasForecast) verdictVi = 'Ngày xấu — ở nhà pha mồi, dưỡng sức';
  else verdictVi = 'Khung giờ hôm nay yếu — câu giải trí, đừng kỳ vọng nhiều';

  const basisVi = hasForecast
    ? 'Tính theo thời tiết hôm nay và khung giờ cá ăn'
    : 'Chưa tải được dự báo — điểm tạm tính theo khung giờ cá ăn';

  return { total, components, hasForecast, verdictVi, basisVi };
}

export function scoreColor(total: number): string {
  if (total >= 70) return '#16A34A';
  if (total >= 45) return '#D97706';
  return '#DC2626';
}
