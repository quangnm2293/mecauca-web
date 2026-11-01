'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchLatestReports, fetchReportsForSpot } from '@/lib/backend';
import { formatDateVi } from '@/lib/fold';
import type { CatchReport } from '@/lib/types';
import FlagButton from './FlagButton';

function ReportCard({ r, showSpot }: { r: CatchReport; showSpot: boolean }) {
  // When the report names its spot, the WHOLE card navigates to the
  // spot page (stretched link on the spot name). The ⚑ Báo cáo button
  // is an independent action and sits above the stretched layer.
  const linkToSpot = showSpot && !!r.spotSlug;
  return (
    <article className={`card report-card${linkToSpot ? ' has-stretch' : ''}`}>
      <div className="meta-line">
        <span className="who">{r.authorName}</span>
        <span>· {formatDateVi(r.caughtOn)}</span>
      </div>
      <p className="what" style={{ margin: 0 }}>
        <strong>{r.species}</strong>
        {r.weightKg != null && <> — {r.weightKg.toLocaleString('vi-VN')} kg</>}
        {r.bait && <> · mồi: {r.bait}</>}
      </p>
      {r.note && <p className="desc">{r.note}</p>}
      {showSpot &&
        (r.spotSlug ? (
          <p className="desc" style={{ margin: 0 }}>
            tại{' '}
            <Link className="stretched-link" href={`/bai-cau/${r.spotSlug}`}>
              {r.spotName}
            </Link>
          </p>
        ) : (
          r.spotName && <p className="desc" style={{ margin: 0 }}>tại {r.spotName}</p>
        ))}
      <p style={{ margin: 0 }}>
        <FlagButton targetType="catchReport" targetId={r.id} />
      </p>
    </article>
  );
}

/** Community feed (all spots) — used on home + /bao-ca. */
export function LatestReports({ limit = 6 }: { limit?: number }) {
  const [reports, setReports] = useState<CatchReport[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetchLatestReports(limit).then((r) => {
      if (alive) setReports(r);
    });
    return () => {
      alive = false;
    };
  }, [limit]);

  if (reports === null) return <p className="loading-note">Đang tải báo cá mới nhất…</p>;
  if (reports.length === 0) {
    return (
      <div className="empty-box">
        Chưa có báo cá nào được duyệt. Hãy là người đầu tiên{' '}
        <Link href="/dang-bao-ca">chia sẻ chiến lợi phẩm</Link> cho cộng đồng!
      </div>
    );
  }
  return (
    <div className="grid grid-2">
      {reports.map((r) => (
        <ReportCard key={r.id} r={r} showSpot />
      ))}
    </div>
  );
}

/** Per-spot reports — used on spot detail pages. */
export function SpotReports({ slug }: { slug: string }) {
  const [reports, setReports] = useState<CatchReport[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetchReportsForSpot(slug).then((r) => {
      if (alive) setReports(r);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  if (reports === null) return <p className="loading-note">Đang tải báo cá tại bãi này…</p>;
  if (reports.length === 0) {
    return (
      <div className="empty-box">
        Chưa có báo cá nào tại bãi này. Câu được cá ở đây, nhớ đăng báo cá để anh em cùng biết nhé!
      </div>
    );
  }
  return (
    <div className="grid" style={{ gap: 12 }}>
      {reports.map((r) => (
        <ReportCard key={r.id} r={r} showSpot={false} />
      ))}
    </div>
  );
}
