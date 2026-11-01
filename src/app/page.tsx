import Link from 'next/link';
import HeroSearch from '@/components/HeroSearch';
import SpotCard from '@/components/SpotCard';
import { LatestReports } from '@/components/ReportList';
import { articles, excerpt, featuredSpots, kinds, provinces, spots } from '@/lib/data';
import { APP_URL, KIND_COLORS } from '@/lib/types';

export default function HomePage() {
  const provinceCount = provinces.length;
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>Mê Câu Cá</h1>
          <p className="tagline">
            Cộng đồng câu cá nước ngọt Việt Nam — tìm bãi câu sông, hồ chứa, hồ tự nhiên và hồ dịch
            vụ, xem loài cá, giá vé và dự báo điểm câu cá hôm nay tại từng bãi.
          </p>
          <HeroSearch />
          <div className="stats-row">
            <div className="stat">
              <b>{spots.length}</b>
              <span>bãi câu đã kiểm chứng</span>
            </div>
            <div className="stat">
              <b>{provinceCount}</b>
              <span>tỉnh / thành phố</span>
            </div>
            <div className="stat">
              <b>{articles.length}</b>
              <span>bài cẩm nang đi câu</span>
            </div>
            <div className="stat">
              <b>4</b>
              <span>yếu tố chấm điểm mỗi ngày</span>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap">
        <section className="section">
          <div className="section-head">
            <h2>Bạn muốn câu ở đâu?</h2>
            <Link href="/bai-cau">Xem tất cả bãi câu →</Link>
          </div>
          <div className="kind-shortcuts">
            {kinds.map((k) => (
              <Link
                key={k.key}
                href={`/bai-cau?loai=${k.key}`}
                style={{ background: KIND_COLORS[k.key] }}
              >
                {k.label} ({spots.filter((s) => s.kind === k.key).length})
              </Link>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Bãi câu nổi bật</h2>
            <Link href="/bai-cau">Tất cả {spots.length} bãi →</Link>
          </div>
          <div className="grid grid-2">
            {featuredSpots.map((s) => (
              <SpotCard key={s.slug} spot={s} />
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Báo cá mới nhất từ cộng đồng</h2>
            <Link href="/bao-ca">Xem tất cả báo cá →</Link>
          </div>
          <LatestReports limit={6} />
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Cẩm nang đi câu</h2>
            <Link href="/cam-nang">Đọc tất cả {articles.length} bài →</Link>
          </div>
          <div className="grid grid-3">
            {articles.slice(0, 6).map((a) => (
              <article className="card" key={a.slug}>
                <h3>
                  <Link href={`/cam-nang/${a.slug}`}>{a.title}</Link>
                </h3>
                <p className="desc">{excerpt(a.body, 120)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cta-band">
          <div>
            <h2>Dùng đầy đủ tính năng trong ứng dụng</h2>
            <p>
              Đóng góp bãi mới, đăng báo cá, xem lịch câu cả tháng theo từng bãi và nhắc ngày đẹp —
              trong ứng dụng Mê Câu Cá.
            </p>
          </div>
          <a className="btn" href={APP_URL} target="_blank" rel="noreferrer">
            Mở ứng dụng Mê Câu Cá
          </a>
        </section>
      </div>
    </>
  );
}
