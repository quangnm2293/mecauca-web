'use client';

import { useEffect, useState } from 'react';
import {
  addJournalEntry,
  entryHasCatch,
  journalStats,
  loadJournal,
  removeJournalEntry,
  type JournalEntry,
} from '@/lib/journal';
import { todayICT } from '@/lib/astro';
import { formatDateVi } from '@/lib/fold';
import { InlineMsg } from './bits';

function todayKey(): string {
  const t = todayICT();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.y}-${p(t.m)}-${p(t.d)}`;
}

/**
 * "Nhật ký câu" — local-only trip log (this device's browser).
 * Same fields and stats as the app's journal tab.
 */
export default function JournalClient() {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayKey());
  const [spot, setSpot] = useState('');
  const [species, setSpecies] = useState('');
  const [weight, setWeight] = useState('');
  const [bait, setBait] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setEntries(loadJournal());
  }, []);

  if (entries === null) return <p className="loading-note">Đang tải nhật ký…</p>;
  const stats = journalStats(entries);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spot.trim()) {
      setErr('Nhập tên bãi');
      return;
    }
    setErr('');
    const weightNum = Number(weight.trim().replace(',', '.'));
    const entry: JournalEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date: new Date(`${date}T12:00:00`).toISOString(),
      spot: spot.trim(),
      species: species.trim(),
      weightKg: weight.trim() && Number.isFinite(weightNum) ? weightNum : null,
      bait: bait.trim(),
      note: note.trim(),
    };
    setEntries(addJournalEntry(entry));
    setShowForm(false);
    setSpecies('');
    setWeight('');
    setBait('');
    setNote('');
    setMsg('Đã lưu chuyến câu vào nhật ký trên máy này.');
  };

  return (
    <div>
      <div className="device-note">
        📒 Nhật ký chỉ lưu <strong>trên thiết bị này</strong> (trong trình duyệt bạn đang dùng) —
        không đăng nhập, không đồng bộ lên máy chủ. Xoá dữ liệu trình duyệt là mất nhật ký.
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <b>{stats.trips}</b>
          <span>Tổng chuyến</span>
        </div>
        <div className="stat-card">
          <b>{stats.withCatch}</b>
          <span>Có cá</span>
        </div>
        <div className="stat-card">
          <b>{stats.blank}</b>
          <span>Móm</span>
        </div>
        <div className="stat-card">
          <b>{stats.trips === 0 ? '—' : `${Math.round(stats.blankRatio * 100)}%`}</b>
          <span>Tỉ lệ móm</span>
        </div>
      </div>

      <InlineMsg text={msg} />

      {!showForm ? (
        <p>
          <button type="button" className="btn" onClick={() => setShowForm(true)}>
            + Ghi chuyến
          </button>
        </p>
      ) : (
        <form className="web-form panel" onSubmit={save} noValidate>
          <h2 style={{ marginTop: 0 }}>Ghi chuyến câu</h2>
          <div className="field">
            <label htmlFor="j-date">Ngày đi câu</label>
            <input
              id="j-date"
              type="date"
              min="2020-01-01"
              max={todayKey()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="j-spot">Bãi câu *</label>
            <input
              id="j-spot"
              type="text"
              value={spot}
              onChange={(e) => setSpot(e.target.value)}
            />
            {err && <p className="field-err">{err}</p>}
          </div>
          <div className="field">
            <label htmlFor="j-species">Loài cá câu được (để trống = móm)</label>
            <input
              id="j-species"
              type="text"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="j-weight">Cân nặng lớn nhất (kg, không bắt buộc)</label>
            <input
              id="j-weight"
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="j-bait">Mồi đã dùng</label>
            <input id="j-bait" type="text" value={bait} onChange={(e) => setBait(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="j-note">Ghi chú (giờ dính cá, tầng ăn…)</label>
            <textarea id="j-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <p className="form-note">Ảnh chuyến câu: sắp có ở bản sau — hiện tại ghi chữ trước.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" className="btn">
              Lưu chuyến
            </button>
            <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>
              Huỷ
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <div className="empty-box">
          Chưa có chuyến nào. Bấm nút "Ghi chuyến" để ghi chuyến đầu tiên — câu được hay móm cũng
          ghi, dữ liệu của chính bạn mới là chuẩn nhất.
        </div>
      ) : (
        <div className="grid" style={{ gap: 12 }}>
          {entries.map((e) => (
            <article key={e.id} className="card journal-card">
              <div>
                <p className="what" style={{ margin: 0 }}>
                  <strong>
                    {entryHasCatch(e)
                      ? `${e.species || 'Có cá'}${e.weightKg != null ? ` · ${e.weightKg.toLocaleString('vi-VN')} kg` : ''}`
                      : 'Móm — không con nào'}
                  </strong>
                </p>
                <p className="desc" style={{ margin: '2px 0 0' }}>
                  {formatDateVi(e.date.slice(0, 10))} · {e.spot}
                  {e.bait && <> · Mồi: {e.bait}</>}
                </p>
                {e.note && (
                  <p className="desc" style={{ margin: '2px 0 0', fontStyle: 'italic' }}>
                    {e.note}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="icon-btn danger"
                aria-label="Xoá chuyến này"
                title="Xoá"
                onClick={() => setEntries(removeJournalEntry(e.id))}
              >
                🗑
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
