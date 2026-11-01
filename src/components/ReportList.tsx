'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchLatestReports, fetchReportsForSpot } from '@/lib/backend';
import { formatDateVi } from '@/lib/fold';
import type { CatchReport } from '@/lib/types';

function ReportCard({ r, showSpot }: { r: CatchReport; showSpot: boolean }) {
  return (
    <article className="card report-card">
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
            tại <Link href={`/bai-cau/${r.spotSlug}`}>{r.spotName}</Link>
          </p>
        ) : (
          r.spotName && <p className="desc" style={{ margin: 0 }}>tại {r.spotName}</p>
        ))}
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
        Chưa có báo cá nào được duyệt. Hãy là người đầu tiên chia sẻ chiến lợi phẩm trong ứng dụng
        Mê Câu Cá!
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
        Chưa có báo cá nào tại bãi này. Câu được cá ở đây, nhớ đăng báo cá trong ứng dụng để anh em
        cùng biết nhé!
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
