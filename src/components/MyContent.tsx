'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { SignInPrompt, StatusChip } from './bits';
import { KIND_LABELS } from '@/lib/constants';
import { spots } from '@/lib/data';
import { formatDateVi } from '@/lib/fold';

/** Static spot directory keyed by backend row id — resolves which of
 *  my rows have a public spot page to link to (rows whose spot isn't
 *  in the current build simply stay unlinked). */
const slugByServerId = new Map(
  spots.filter((s) => s.serverId).map((s) => [s.serverId as string, s.slug]),
);
import {
  fetchMyReports,
  fetchMySpots,
  fetchMySuggestions,
  fetchSpotNameMap,
  type MyReportRow,
  type MySpotRow,
  type MySuggestionRow,
} from '@/lib/supabase';

/** "Báo cá của tôi" — my catch reports with their REAL server statuses. */
export function MyReportsClient() {
  const { user, ready } = useAuth();
  const [rows, setRows] = useState<MyReportRow[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const [reports, nameMap] = await Promise.all([
        fetchMyReports(user.id),
        fetchSpotNameMap(),
      ]);
      if (alive) {
        setRows(reports);
        setNames(nameMap);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  if (!ready) return <p className="loading-note">Đang kiểm tra đăng nhập…</p>;
  if (!user) return <SignInPrompt feature="xem báo cá của bạn" />;
  if (rows === null) return <p className="loading-note">Đang tải báo cá của bạn…</p>;
  if (rows.length === 0) {
    return (
      <div className="empty-box">
        Bạn chưa đăng báo cá nào. Câu được cá, <Link href="/dang-bao-ca">đăng báo cá</Link> cho
        anh em cùng biết nhé!
      </div>
    );
  }
  return (
    <div className="grid" style={{ gap: 12 }}>
      {rows.map((r) => {
        const slug = slugByServerId.get(r.spotServerId);
        const title = (
          <>
            {r.species}
            {r.weightKg != null && <> · {r.weightKg.toLocaleString('vi-VN')} kg</>}
          </>
        );
        return (
        <article key={r.serverId} className={`card my-row${slug ? ' has-stretch' : ''}`}>
          <div className="my-row-main">
            <p className="what" style={{ margin: 0 }}>
              <strong>
                {slug ? (
                  <Link className="stretched-link" href={`/bai-cau/${slug}`}>
                    {title}
                  </Link>
                ) : (
                  title
                )}
              </strong>
            </p>
            <p className="desc" style={{ margin: '2px 0 0' }}>
              {names.get(r.spotServerId) ?? 'Bãi câu'} · {formatDateVi(r.caughtOn)}
              {r.bait && <> · Mồi: {r.bait}</>}
            </p>
            {r.note && (
              <p className="desc" style={{ margin: '2px 0 0', fontStyle: 'italic' }}>{r.note}</p>
            )}
          </div>
          <StatusChip status={r.status} />
        </article>
        );
      })}
    </div>
  );
}

/** "Đóng góp của tôi" — my new spots + my correction suggestions. */
export function MyContributionsClient() {
  const { user, ready } = useAuth();
  const [spots, setSpots] = useState<MySpotRow[] | null>(null);
  const [suggestions, setSuggestions] = useState<MySuggestionRow[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const [sp, sg, nameMap] = await Promise.all([
        fetchMySpots(user.id),
        fetchMySuggestions(user.id),
        fetchSpotNameMap(),
      ]);
      if (alive) {
        setSpots(sp);
        setSuggestions(sg);
        setNames(nameMap);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  if (!ready) return <p className="loading-note">Đang kiểm tra đăng nhập…</p>;
  if (!user) return <SignInPrompt feature="xem đóng góp của bạn" />;
  if (spots === null || suggestions === null) {
    return <p className="loading-note">Đang tải đóng góp của bạn…</p>;
  }
  if (spots.length === 0 && suggestions.length === 0) {
    return (
      <div className="empty-box">
        Bạn chưa đóng góp gì. <Link href="/dong-gop">Thêm bãi câu mới</Link>, đăng báo cá ở mục{' '}
        <Link href="/dang-bao-ca">Báo cá</Link>, hoặc mở một bãi và bấm "Gợi ý sửa / Báo sai".
      </div>
    );
  }
  return (
    <div className="grid" style={{ gap: 12 }}>
      {spots.map((s) => {
        const linkable = s.status === 'approved' && !!s.clientId;
        return (
        <article key={s.serverId} className={`card my-row${linkable ? ' has-stretch' : ''}`}>
          <div className="my-row-main">
            <p className="what" style={{ margin: 0 }}>
              <strong>
                {linkable ? (
                  <Link className="stretched-link" href={`/bai-cau/${s.clientId}`}>
                    {s.name}
                  </Link>
                ) : (
                  s.name
                )}
              </strong>
            </p>
            <p className="desc" style={{ margin: '2px 0 0' }}>
              Bãi câu mới · {s.province} · {KIND_LABELS[s.kind] ?? s.kind}
              {linkable && <> · Bấm để xem trang bãi →</>}
            </p>
          </div>
          <StatusChip status={s.status} />
        </article>
        );
      })}
      {suggestions.map((g) => {
        const slug = slugByServerId.get(g.spotServerId);
        const title = (
          <>
            Sửa {g.field.toLowerCase()} — {names.get(g.spotServerId) ?? 'Bãi câu'}
          </>
        );
        return (
        <article key={g.serverId} className={`card my-row${slug ? ' has-stretch' : ''}`}>
          <div className="my-row-main">
            <p className="what" style={{ margin: 0 }}>
              <strong>
                {slug ? (
                  <Link className="stretched-link" href={`/bai-cau/${slug}`}>
                    {title}
                  </Link>
                ) : (
                  title
                )}
              </strong>
            </p>
            <p className="desc" style={{ margin: '2px 0 0' }}>
              Gợi ý sửa · "{g.correctedText}"
            </p>
          </div>
          <StatusChip status={g.status} />
        </article>
        );
      })}
    </div>
  );
}
