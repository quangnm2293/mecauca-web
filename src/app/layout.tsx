import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { siteUrl } from '@/lib/types';
import AuthProvider from '@/components/AuthProvider';
import HeaderAuth from '@/components/HeaderAuth';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl('/')),
  title: {
    default: 'Mê Câu Cá — Bãi câu nước ngọt, dự báo điểm câu cá mỗi ngày',
    template: '%s | Mê Câu Cá',
  },
  description:
    'Cộng đồng câu cá nước ngọt Việt Nam: 110+ bãi câu sông, hồ chứa, hồ tự nhiên và hồ dịch vụ kèm loài cá, giá vé tham khảo và dự báo điểm câu cá theo thời tiết, nhiệt độ, mực nước và khung giờ cá ăn.',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Mê Câu Cá',
    title: 'Mê Câu Cá — Bãi câu nước ngọt & dự báo điểm câu cá',
    description:
      'Tìm bãi câu nước ngọt khắp Việt Nam, xem loài cá, giá vé và dự báo điểm câu cá hôm nay tại từng bãi.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          <header className="site-header">
            <div className="wrap">
              <Link href="/" className="logo">
                <span className="logo-mark" aria-hidden>🎣</span>
                Mê Câu Cá
              </Link>
              <nav className="main-nav" aria-label="Điều hướng chính">
                <Link href="/bai-cau">Bãi câu</Link>
                <Link href="/bao-ca">Báo cá</Link>
                <Link href="/cam-nang" className="hide-sm">Cẩm nang</Link>
                <Link href="/nhat-ky" className="hide-sm">Nhật ký</Link>
                <Link href="/gioi-thieu" className="hide-sm">Giới thiệu</Link>
                <Link href="/dang-bao-ca" className="nav-cta">
                  Đăng báo cá
                </Link>
                <HeaderAuth />
              </nav>
            </div>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            <div className="wrap">
              <div className="footer-grid">
                <div>
                  <h3>Mê Câu Cá</h3>
                  <p>
                    Cộng đồng câu cá nước ngọt Việt Nam — dữ liệu bãi câu do cộng đồng đóng góp và
                    kiểm duyệt, nói thẳng, không mõm.
                  </p>
                </div>
                <div>
                  <h3>Khám phá</h3>
                  <p>
                    <Link href="/bai-cau">Tất cả bãi câu</Link>
                    <br />
                    <Link href="/bao-ca">Báo cá cộng đồng</Link>
                    <br />
                    <Link href="/cam-nang">Cẩm nang đi câu</Link>
                  </p>
                </div>
                <div>
                  <h3>Cùng xây cộng đồng</h3>
                  <p>
                    <Link href="/dang-bao-ca">Đăng báo cá</Link>
                    <br />
                    <Link href="/dong-gop">Đóng góp bãi câu mới</Link>
                    <br />
                    <Link href="/nhat-ky">Nhật ký câu của bạn</Link>
                    <br />
                    <Link href="/tai-khoan">Tài khoản</Link>
                  </p>
                </div>
              </div>
              <p className="footer-note">
                Giá vé và thông tin bãi câu do cộng đồng cung cấp, có thể thay đổi — hãy kiểm tra
                lại trước khi đi. Điểm câu cá chỉ là ước tính tham khảo cho vui, cá ăn hay không
                còn tùy duyên người câu. Ứng dụng di động Mê Câu Cá đang được phát triển.
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
