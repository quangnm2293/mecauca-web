import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SpotCard from '@/components/SpotCard';
import SpotForecast from '@/components/SpotForecast';
import { SpotReports } from '@/components/ReportList';
import { excerpt, spotBySlug, spots, spotsInProvince } from '@/lib/data';
import { APP_URL, KIND_COLORS } from '@/lib/types';

export function generateStaticParams() {
  return spots.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const spot = spotBySlug.get(slug);
  if (!spot) return {};
  const title = `Câu cá tại ${spot.name} (${spot.province}) — loài cá, giá vé, dự báo hôm nay`;
  const description = excerpt(
    spot.description ||
      `${spot.name} — ${spot.kindLabel.toLowerCase()} tại ${spot.province}. Xem loài cá thường có, giá vé, tiện ích và dự báo điểm câu cá hôm nay.`,
    160,
  );
  return {
    title,
    description,
    openGraph: { title: `${title} | Mê Câu Cá`, description, type: 'article' },
  };
}

export default async function SpotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const spot = spotBySlug.get(slug);
  if (!spot) notFound();

  const color = KIND_COLORS[spot.kind] ?? '#0B6E4F';
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`;
  const delta = 0.09;
  const bbox = `${spot.lng - delta},${spot.lat - delta * 0.6},${spot.lng + delta},${spot.lat + delta * 0.6}`;
  const mapEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${spot.lat},${spot.lng}`;
  const sameProvince = spotsInProvince(spot.province, spot.slug).slice(0, 3);

  return (
    <div className="wrap">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link href="/">Trang chủ</Link> / <Link href="/bai-cau">Bãi câu</Link> / {spot.name}
      </nav>

      <div className="spot-head">
        <div className="meta-line" style={{ marginBottom: 8 }}>
          <span className="chip chip-kind" style={{ background: color }}>
            {spot.kindLabel}
          </span>
          <span>
            {spot.province} · Miền {spot.region}
          </span>
          <span>
            📍 {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
          </span>
        </div>
        <h1>{spot.name}</h1>
        {spot.description && <p style={{ color: 'var(--ink-soft)', maxWidth: 780 }}>{spot.description}</p>}
        <p>
          <a className="btn-outline" href={directions} target="_blank" rel="noreferrer">
            🧭 Chỉ đường tới bãi
          </a>
        </p>
      </div>

      <div className="detail-grid">
        <div style={{ display: 'grid', gap: 20 }}>
          <section className="panel" aria-label="Dự báo tại bãi">
            <h2>Dự báo tại bãi</h2>
            <SpotForecast lat={spot.lat} lng={spot.lng} species={spot.species} />
          </section>

          <section className="panel" aria-label="Báo cá tại bãi này">
            <h2>Báo cá tại bãi này</h2>
            <SpotReports slug={spot.slug} />
          </section>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <section className="panel kv" aria-label="Thông tin bãi câu">
            <div>
              <p className="caps">Loài cá thường có</p>
              {spot.species.length > 0 ? (
                <div className="meta-line">
                  {spot.species.map((s) => (
                    <span key={s} className="chip chip-species">
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: 'var(--ink-soft)' }}>
                  Cộng đồng chưa bổ sung — bạn biết bãi này có cá gì, hãy góp ý trong ứng dụng nhé.
                </p>
              )}
            </div>
            <div>
              <p className="caps">Giá vé</p>
              <p style={{ margin: 0 }}>
                {spot.ticketNote ?? 'Cộng đồng chưa cập nhật — kiểm tra lại trước khi đi.'}
              </p>
            </div>
            <div>
              <p className="caps">Tiện ích</p>
              {spot.facilities.length > 0 ? (
                <div className="meta-line">
                  {spot.facilities.map((f) => (
                    <span key={f} className="chip">
                      {f}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: 'var(--ink-soft)' }}>Cộng đồng chưa bổ sung.</p>
              )}
            </div>
          </section>

          <section className="panel" aria-label="Bản đồ">
            <h2>Vị trí bãi câu</h2>
            <iframe
              className="map-frame"
              title={`Bản đồ vị trí ${spot.name}`}
              src={mapEmbed}
              loading="lazy"
            />
            <p className="map-credit">
              © Những người đóng góp OpenStreetMap ·{' '}
              <a href={directions} target="_blank" rel="noreferrer">
                Mở chỉ đường →
              </a>
            </p>
          </section>
        </div>
      </div>

      {sameProvince.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Bãi câu khác ở {spot.province}</h2>
            <Link href={`/bai-cau`}>Xem tất cả bãi câu →</Link>
          </div>
          <div className="grid grid-3">
            {sameProvince.map((s) => (
              <SpotCard key={s.slug} spot={s} />
            ))}
          </div>
        </section>
      )}

      <section className="cta-band">
        <div>
          <h2>Biết thêm về bãi này?</h2>
          <p>
            Gợi ý sửa thông tin, thêm bãi mới và đăng báo cá được thực hiện trong ứng dụng — mọi
            đóng góp đều qua kiểm duyệt trước khi công khai.
          </p>
        </div>
        <a className="btn" href={APP_URL} target="_blank" rel="noreferrer">
          Mở ứng dụng Mê Câu Cá
        </a>
      </section>
    </div>
  );
}
