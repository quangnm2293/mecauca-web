import type { Metadata } from 'next';
import Link from 'next/link';
import ArticleSearch from '@/components/ArticleSearch';
import { articles } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Cẩm nang đi câu — kinh nghiệm câu cá nước ngọt không mõm',
  description: `${articles.length} bài cẩm nang câu cá nước ngọt từ cộng đồng Review Không Mõm: chọn cần, mồi tanh hay thơm, buộc lưỡi, chọn điểm câu… nói thẳng, không mõm.`,
};

export default function HandbookPage() {
  return (
    <div className="wrap">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link href="/">Trang chủ</Link> / Cẩm nang
      </nav>
      <div className="spot-head">
        <h1>Cẩm nang đi câu</h1>
        <p style={{ color: 'var(--ink-soft)', maxWidth: 720 }}>
          {articles.length} bài kinh nghiệm câu cá nước ngọt viết theo phong cách không mõm — từ
          Page Review Không Mõm — đọc ngay tại đây, miễn phí.
        </p>
      </div>
      <ArticleSearch />
    </div>
  );
}
