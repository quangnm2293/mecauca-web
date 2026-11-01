'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { addDaysWall, dateKeyICT, fmtTime, todayICT, wallDate } from '@/lib/astro';
import {
  computeCalendarDays,
  fetchCalendarBundles,
  type CalendarBundles,
  type CalendarDayScore,
} from '@/lib/calendar';
import { scoreColor } from '@/lib/score';

/**
 * "Lịch câu tháng này" for one spot — port of the app's per-spot
 * calendar: forecast-range days carry a solid "Dự báo" badge,
 * beyond-range days an outlined "Ước tính" badge (windows only),
 * past days are scoreless. Tapping a day opens its detail below.
 */

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const EMPTY_BUNDLES: CalendarBundles = { hours: null, daily: new Map(), discharge: null };

function bandColor(total: number): string {
  if (total >= 70) return '#16A34A';
  if (total >= 40) return '#D97706';
  return '#DC2626';
}

export default function SpotCalendar({
  lat,
  lng,
  species,
}: {
  lat: number;
  lng: number;
  species: string[];
}) {
  const today = todayICT();
  const todayWall = useMemo(() => wallDate(today.y, today.m, today.d), [today.y, today.m, today.d]);
  const [view, setView] = useState({ y: today.y, m: today.m });
  const [bundles, setBundles] = useState<CalendarBundles | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const cacheRef = useRef(new Map<string, Map<string, CalendarDayScore>>());

  useEffect(() => {
    let alive = true;
    fetchCalendarBundles(lat, lng).then((b) => {
      if (alive) {
        cacheRef.current.clear();
        setBundles(b);
      }
    });
    return () => {
      alive = false;
    };
  }, [lat, lng]);

  const monthKey = `${view.y}-${String(view.m).padStart(2, '0')}`;
  const days = useMemo(() => {
    const cached = cacheRef.current.get(monthKey);
    if (cached) return cached;
    const from = wallDate(view.y, view.m, 1);
    const to = addDaysWall(wallDate(view.y, view.m + 1, 1), -1);
    const computed = computeCalendarDays({
      lat,
      lng,
      species,
      from,
      to,
      today: todayWall,
      bundles: bundles ?? EMPTY_BUNDLES,
    });
    cacheRef.current.set(monthKey, computed);
    return computed;
  }, [monthKey, view.y, view.m, lat, lng, species, todayWall, bundles]);

  // Navigation limits (app): January of the current year … +2 months.
  const minIdx = today.y * 12 + 0; // January = month index 0-based below
  const curIdx = view.y * 12 + (view.m - 1);
  const todayIdx = today.y * 12 + (today.m - 1);
  const canPrev = curIdx > minIdx;
  const canNext = curIdx < todayIdx + 2;
  const shift = (delta: number) => {
    const idx = curIdx + delta;
    setView({ y: Math.floor(idx / 12), m: (idx % 12) + 1 });
    setSelected(null);
  };

  const firstOfMonth = wallDate(view.y, view.m, 1);
  const daysInMonth = addDaysWall(wallDate(view.y, view.m + 1, 1), -1).getUTCDate();
  // Monday-first offset: JS getUTCDay 0=Sun..6=Sat → Mon=0..Sun=6.
  const leadBlanks = (firstOfMonth.getUTCDay() + 6) % 7;

  const selectedDay = selected ? days.get(selected) : undefined;
  const selectedIsPast =
    selected != null && selected < dateKeyICT(todayWall);

  return (
    <div>
      <div className="cal-head">
        <button
          type="button"
          className="cal-nav"
          onClick={() => shift(-1)}
          disabled={!canPrev}
          aria-label="Tháng trước"
        >
          ‹
        </button>
        <strong>
          Tháng {view.m}/{view.y}
        </strong>
        <button
          type="button"
          className="cal-nav"
          onClick={() => shift(1)}
          disabled={!canNext}
          aria-label="Tháng sau"
        >
          ›
        </button>
        {bundles === null && <span className="loading-note">Đang tải dự báo…</span>}
      </div>

      <div className="cal-grid" role="grid" aria-label={`Lịch câu tháng ${view.m}/${view.y}`}>
        {WEEKDAYS.map((w) => (
          <div key={w} className="cal-dow">
            {w}
          </div>
        ))}
        {Array.from({ length: leadBlanks }, (_, i) => (
          <div key={`blank-${i}`} className="cal-cell blank" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dayNum = i + 1;
          const key = dateKeyICT(wallDate(view.y, view.m, dayNum));
          const isPast = key < dateKeyICT(todayWall);
          const isToday = key === dateKeyICT(todayWall);
          const scored = days.get(key);
          return (
            <button
              key={key}
              type="button"
              className={`cal-cell${isToday ? ' today' : ''}${selected === key ? ' sel' : ''}`}
              onClick={() => setSelected(key)}
              aria-label={`Ngày ${dayNum}${scored ? `, điểm ${scored.score.total}, ${scored.basisLabelVi}` : ''}`}
            >
              <span className="cal-num">{dayNum}</span>
              {scored && !isPast ? (
                <span
                  className={`cal-badge${scored.isForecast ? ' fc' : ' est'}`}
                  style={
                    scored.isForecast
                      ? { background: bandColor(scored.score.total) }
                      : { color: bandColor(scored.score.total), borderColor: bandColor(scored.score.total) }
                  }
                >
                  {scored.score.total}
                </span>
              ) : (
                <span className="cal-badge none">{isPast ? '·' : ''}</span>
              )}
            </button>
          );
        })}
      </div>

      <p className="cal-legend">
        <span className="cal-badge fc" style={{ background: '#16A34A' }}>85</span> <b>Dự báo</b> —
        ngày có dự báo thời tiết thật. <span className="cal-badge est" style={{ color: '#D97706', borderColor: '#D97706' }}>60</span>{' '}
        <b>Ước tính</b> — ngoài tầm dự báo, chỉ tính theo khung giờ cá ăn. Màu điểm: xanh ≥ 70,
        vàng 40–69, đỏ &lt; 40. Ngày đã qua không chấm điểm.
      </p>

      {selected && (
        <div className="cal-detail">
          {selectedIsPast ? (
            <p style={{ margin: 0 }}>Ngày này đã qua — lịch chỉ chấm điểm từ hôm nay trở đi.</p>
          ) : selectedDay ? (
            <DayDetail day={selectedDay} />
          ) : (
            <p style={{ margin: 0 }}>Đang tính điểm cho ngày này…</p>
          )}
        </div>
      )}
    </div>
  );
}

function DayDetail({ day }: { day: CalendarDayScore }) {
  const { score, windows } = day;
  const [, m, d] = day.dateKey.split('-');
  return (
    <div>
      <div className="cal-detail-head">
        <div
          className="cal-score"
          style={{ background: scoreColor(score.total) }}
          aria-label={`Điểm ${score.total}`}
        >
          {score.total}
        </div>
        <div>
          <strong>
            Ngày {d}/{m} — {score.verdictVi}
          </strong>
          <div>
            <span className={`chip ${day.isForecast ? 'chip-fc' : 'chip-est'}`}>
              {day.basisLabelVi}
            </span>{' '}
            <span style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}>{score.basisVi}</span>
          </div>
        </div>
      </div>

      <table className="comp-table" aria-label="Các thành phần điểm">
        <tbody>
          {score.components.map((c) => (
            <tr key={c.key}>
              <td style={{ width: '55%' }}>
                {c.labelVi}
                <span className="comp-bar">
                  <i
                    style={{
                      width: c.earned == null ? '0%' : `${(c.earned / c.maxPoints) * 100}%`,
                      background: scoreColor(score.total),
                    }}
                  />
                </span>
              </td>
              <td>
                {c.earned == null ? (
                  <span className="no-data">Chưa có dữ liệu</span>
                ) : (
                  `${Math.round(c.earned)}/${c.maxPoints}`
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 16 }}>Khung giờ cá ăn</h3>
      {windows.periods.length > 0 ? (
        <div className="pills">
          {windows.periods.map((p) => (
            <div
              key={`${p.kind}-${p.center.getTime()}`}
              className={`pill${p.overlapsGolden ? ' golden' : ''}${p.isMajor ? ' major' : ''}`}
            >
              <b>
                {fmtTime(p.start)} – {fmtTime(p.end)}
                {p.overlapsGolden ? ' ⭐' : ''}
              </b>
              {p.labelVi}
            </div>
          ))}
        </div>
      ) : (
        <p className="loading-note">Ngày này không có khung giờ đáng chú ý.</p>
      )}
      <p className="meta-line" style={{ marginTop: 10 }}>
        <span>🌅 Mặt trời mọc {fmtTime(windows.sun.sunrise)}</span>
        <span>🌇 Hoàng hôn {fmtTime(windows.sun.sunset)}</span>
        <span>
          🌙 {windows.illumination.phaseNameVi} — sáng{' '}
          {Math.round(windows.illumination.fraction * 100)}%
        </span>
      </p>
    </div>
  );
}
