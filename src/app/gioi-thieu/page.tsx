import type { Metadata } from 'next';
import Link from 'next/link';
import { articles, spots } from '@/lib/data';
import { APP_URL } from '@/lib/types';

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
          nói có, giá vé biết tới đâu ghi tới đó, không bịa số liệu cho đẹp.
        </p>
        <h2>Website này có gì?</h2>
        <p>
          Hiện có {spots.length} bãi câu nước ngọt đã kiểm chứng toạ độ trên cả nước — sông, hồ
          chứa, hồ tự nhiên và hồ dịch vụ — kèm loài cá thường có, giá vé tham khảo và tiện ích.
          Mỗi trang bãi câu có mục <strong>Dự báo tại bãi</strong>: điểm câu cá hôm nay được tính
          từ thời tiết &amp; khí áp, nhiệt độ theo loài cá, mực nước và khung giờ cá ăn. Thành phần
          nào chưa có dữ liệu thì để trống và tính lại trên phần còn lại — không bao giờ điền số
          đoán.
        </p>
        <p>
          Ngoài ra còn có {articles.length} bài <Link href="/cam-nang">cẩm nang đi câu</Link> và
          mục <Link href="/bao-ca">báo cá cộng đồng</Link> — nơi cần thủ khoe chiến lợi phẩm sau
          khi đã qua kiểm duyệt.
        </p>
        <h2>Đóng góp cho cộng đồng</h2>
        <p>
          Dữ liệu bãi câu sống nhờ cộng đồng: thêm bãi mới bằng cách ghim trên bản đồ, gợi ý sửa
          khi thấy thông tin sai, đăng báo cá sau mỗi chuyến đi. Mọi đóng góp đều ở trạng thái{' '}
          <strong>Chờ duyệt</strong> và chỉ công khai sau khi được kiểm duyệt, để danh bạ luôn sạch.
        </p>
        <p>
          <strong>Việc đóng góp hiện thực hiện trong ứng dụng Mê Câu Cá</strong> — website này là
          mặt tiền công khai để xem và tra cứu (chỉ đọc). Đăng nhập Google trong ứng dụng, đóng góp
          của bạn sẽ tự đồng bộ lên hệ thống cộng đồng và hiện trạng thái duyệt ngay trong mục
          “Đóng góp của tôi”.
        </p>
        <p>
          <a className="btn" href={APP_URL} target="_blank" rel="noreferrer">
            Mở ứng dụng Mê Câu Cá
          </a>
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
      </div>
    </div>
  );
}
