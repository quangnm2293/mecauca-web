import type { Metadata } from 'next';
import Link from 'next/link';
import { articles, spots } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Giới thiệu Mê Câu Cá — cộng đồng câu cá nước ngọt Việt Nam',
  description:
    'Mê Câu Cá là cộng đồng câu cá nước ngọt Việt Nam: dữ liệu bãi câu do cộng đồng đóng góp và kiểm duyệt, dự báo điểm câu cá minh bạch, nói thẳng không mõm.',
};

export default function AboutPage() {
  return (
    <div className="wrap">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link href="/">Trang chủ</Link> / Giới thiệu
      </nav>
      <div className="prose">
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 36px)' }}>Giới thiệu</h1>
        <p>
          <strong>Mê Câu Cá</strong> là cộng đồng câu cá nước ngọt Việt Nam, khởi nguồn từ Page{' '}
          <strong>Review Không Mõm</strong> — phong cách xuyên suốt là nói thẳng: bãi nào có cá thì
          nói có, giá vé biết tới đâu ghi tới đó, không bịa số liệu cho đẹp. Website này là sản
          phẩm chính của cộng đồng: tra cứu bãi, xem dự báo, đăng báo cá và đóng góp dữ liệu đều
          làm được ngay tại đây.
        </p>
        <h2>Website này có gì?</h2>
        <p>
          Hiện có {spots.length} bãi câu nước ngọt đã kiểm chứng toạ độ trên cả nước — sông, hồ
          chứa, hồ tự nhiên và hồ dịch vụ — kèm loài cá thường có, giá vé tham khảo và tiện ích.
          Mỗi trang bãi câu có mục <strong>Dự báo tại bãi</strong>: điểm câu cá hôm nay và{' '}
          <strong>lịch câu cả tháng</strong> được tính từ thời tiết &amp; khí áp, nhiệt độ theo
          loài cá, mực nước và khung giờ cá ăn. Thành phần nào chưa có dữ liệu thì để trống và
          tính lại trên phần còn lại — không bao giờ điền số đoán.
        </p>
        <p>
          Ngoài ra còn có {articles.length} bài <Link href="/cam-nang">cẩm nang đi câu</Link>, mục{' '}
          <Link href="/bao-ca">báo cá cộng đồng</Link> — nơi cần thủ khoe chiến lợi phẩm sau khi đã
          qua kiểm duyệt — và <Link href="/nhat-ky">nhật ký câu</Link> cá nhân lưu ngay trên thiết
          bị của bạn.
        </p>
        <h2>Đóng góp cho cộng đồng</h2>
        <p>
          Dữ liệu bãi câu sống nhờ cộng đồng: <Link href="/dong-gop">thêm bãi mới</Link> bằng cách
          ghim trên bản đồ, gợi ý sửa ngay tại trang bãi khi thấy thông tin sai,{' '}
          <Link href="/dang-bao-ca">đăng báo cá</Link> sau mỗi chuyến đi. Chỉ cần{' '}
          <Link href="/tai-khoan">đăng nhập bằng Google</Link> — mọi đóng góp đều ở trạng thái{' '}
          <strong>Chờ duyệt</strong> và chỉ công khai sau khi được kiểm duyệt, để danh bạ luôn
          sạch. Trạng thái duyệt của từng đóng góp hiện rõ trong mục “Đóng góp của tôi” và “Báo cá
          của tôi” ở trang Tài khoản.
        </p>
        <p>
          <Link className="btn" href="/dong-gop">
            Đóng góp bãi câu mới
          </Link>{' '}
          <Link className="btn" href="/dang-bao-ca">
            Đăng báo cá
          </Link>
        </p>
        <h2>Nguyên tắc dữ liệu</h2>
        <p>
          • Bãi câu chỉ đưa vào khi kiểm chứng được là có thật, toạ độ rơi đúng mặt nước.
          <br />
          • Loài cá chỉ ghi khi có nguồn nêu rõ cho đúng bãi đó; chưa biết thì để trống.
          <br />
          • Giá vé do chính hồ đăng thì ghi kèm lưu ý kiểm tra lại; giá từ trang tổng hợp thì ghi
          rõ “Giá tham khảo”.
          <br />• Điểm câu cá là ước tính tham khảo — quyết định đi hay không vẫn là của bạn và…
          con cá.
        </p>
        <h2>Sắp tới</h2>
        <p>
          Ứng dụng di động Mê Câu Cá đang được phát triển. Trong lúc chờ, toàn bộ tính năng của
          cộng đồng đã dùng được đầy đủ ngay trên website này, kể cả trên điện thoại.
        </p>
      </div>
    </div>
  );
}
