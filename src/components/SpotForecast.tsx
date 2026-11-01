'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addDaysWall,
  dateKeyICT,
  fmtTime,
  nowICTWall,
  solunarDay,
  todayICT,
  wallDate,
} from '@/lib/astro';
import { computeScore, scoreColor, type FishingScore } from '@/lib/score';
import {
  fetchDaily,
  fetchWaterInputs,
  fetchWeather,
  type DailyWeather,
  type WeatherData,
} from '@/lib/forecast';
import { formatDayMonthVi, formatDateVi } from '@/lib/fold';
import type { WaterInputs } from '@/lib/score';

interface Props {
  lat: number;
  lng: number;
  species: string[];
}

function trendText(trend: number | null): string {
  if (trend == null) return '';
  if (trend > 0.3) return ' (đang tăng)';
  if (trend < -0.3) return ' (đang giảm)';
  return ' (ổn định)';
}

export default function SpotForecast({ lat, lng, species }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [water, setWater] = useState<WaterInputs | null>(null);
  const [daily, setDaily] = useState<Map<string, DailyWeather> | null>(null);
  const [loaded, setLoaded] = useState(false);

  const today = todayICT();
  const todayWall = useMemo(
    () => wallDate(today.y, today.m, today.d),
    [today.y, today.m, today.d],
  );
  const windows = useMemo(() => solunarDay(todayWall, lat, lng), [todayWall, lat, lng]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const w = await fetchWeather(lat, lng);
      if (!alive) return;
      setWeather(w);
      const [wt, d] = await Promise.all([fetchWaterInputs(lat, lng, w), fetchDaily(lat, lng)]);
      if (!alive) return;
      setWater(wt);
      setDaily(d);
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [lat, lng]);

  const score: FishingScore = useMemo(
    () =>
      computeScore({
        solunar: windows,
        pressureTrend3h: weather?.pressureTrend3h ?? null,
        pressureSwing3d: weather?.pressureSwing3d ?? null,
        severeWeatherAhead: weather?.severeWeatherAhead ?? false,
        windKmh: weather?.windKmh ?? null,
        gustKmh: weather?.gustKmh ?? null,
        rainProbability: weather?.rainProbRestOfDay ?? null,
        rainMm: weather?.rainMmRestOfDay ?? null,
        temperatureC: weather?.tempC ?? null,
        species,
        water,
      }),
    [windows, weather, water, species],
  );

  const ringColor = score.total >= 70 ? '#4ADE80' : score.total >= 45 ? '#FBBF24' : '#F87171';
  const nextDays = [1, 2].map((offset) => {
    const d = addDaysWall(todayWall, offset);
    const key = dateKeyICT(d);
    return { key, daily: daily?.get(key) ?? null };
  });

  return (
    <div>
      <div className="score-hero">
        <div
          className="score-ring"
          role="img"
          aria-label={`Điểm câu cá hôm nay: ${score.total} trên 100`}
          style={{
            background: `conic-gradient(${ringColor} ${(score.total / 100) * 360}deg, rgba(255,255,255,0.22) 0deg)`,
          }}
        >
          <div
            style={{
              background: 'var(--deep-teal)',
              borderRadius: '50%',
              width: 84,
              height: 84,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <div>
              <div className="num" style={{ lineHeight: 1 }}>
                {score.total}
              </div>
              <div className="of">/ 100 điểm</div>
            </div>
          </div>
        </div>
        <div style={{ minWidth: 220, flex: 1 }}>
          <p className="caps" style={{ color: '#A7F3D0' }}>
            Điểm câu cá hôm nay
          </p>
          <p className="verdict" style={{ margin: '0 0 4px' }}>
            {score.verdictVi}
          </p>
          <p className="basis" style={{ margin: 0 }}>
            {loaded ? score.basisVi : 'Đang tải dự báo…'}
          </p>

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

      <h3 style={{ marginTop: 22 }}>Khung giờ cá ăn hôm nay</h3>
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
        <p className="loading-note">Hôm nay không có khung giờ đáng chú ý.</p>
      )}
      <p className="meta-line" style={{ marginTop: 10 }}>
        <span>🌅 Mặt trời mọc {fmtTime(windows.sun.sunrise)}</span>
        <span>🌇 Hoàng hôn {fmtTime(windows.sun.sunset)}</span>
        <span>
          🌙 {windows.illumination.phaseNameVi} — sáng {Math.round(windows.illumination.fraction * 100)}%
        </span>
      </p>

      {weather && (
        <>
          <h3 style={{ marginTop: 22 }}>Thời tiết tại bãi lúc này</h3>
          <p className="meta-line" style={{ fontSize: 15 }}>
            <span>🌡️ {Math.round(weather.tempC)}°C</span>
            <span>
              🧭 Áp suất {Math.round(weather.pressureHpa)} hPa{trendText(weather.pressureTrend3h)}
            </span>
            <span>
              💨 Gió {Math.round(weather.windKmh)} km/h, giật {Math.round(weather.gustKmh)} km/h
            </span>
            {weather.rainProbRestOfDay != null && (
              <span>🌧️ Khả năng mưa hôm nay {Math.round(weather.rainProbRestOfDay * 100)}%</span>
            )}
          </p>
        </>
      )}

      {daily && (
        <>
          <h3 style={{ marginTop: 22 }}>Hai ngày tới</h3>
          <div className="mini-days">
            <div className="mini-day">
              <b>Hôm nay {formatDayMonthVi(dateKeyICT(todayWall))}</b>
              {(() => {
                const d0 = daily.get(dateKeyICT(todayWall));
                return d0 ? (
                  <>
                    {d0.tempMeanC != null && <>🌡️ TB {Math.round(d0.tempMeanC)}°C · </>}
                    {d0.rainSumMm != null && <>mưa {d0.rainSumMm.toFixed(1)} mm</>}
                  </>
                ) : (
                  '—'
                );
              })()}
            </div>
            {nextDays.map(({ key, daily: d }) => (
              <div className="mini-day" key={key}>
                <b>{formatDateVi(key)}</b>
                {d ? (
                  <>
                    {d.tempMeanC != null && <>🌡️ TB {Math.round(d.tempMeanC)}°C</>}
                    {d.windMaxKmh != null && <> · 💨 {Math.round(d.windMaxKmh)} km/h</>}
                    {d.rainProbMax != null && (
                      <>
                        <br />
                        🌧️ Mưa {Math.round(d.rainProbMax * 100)}%
                        {d.rainSumMm != null && <> · {d.rainSumMm.toFixed(1)} mm</>}
                      </>
                    )}
                  </>
                ) : (
                  'Chưa có dự báo'
                )}
              </div>
            ))}
          </div>
        </>
      )}
      <p className="loading-note" style={{ marginTop: 12 }}>
        {formatDateVi(dateKeyICT(nowICTWall()))} — điểm được tính trực tiếp trên trình duyệt của bạn
        cho đúng bãi này.
      </p>
    </div>
  );
}
