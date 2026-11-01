import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ArticleCard from '@/components/ArticleCard';
import { articleBySlug, articles, excerpt } from '@/lib/data';

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = articleBySlug.get(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: excerpt(article.body, 160),
    openGraph: { title: `${article.title} | Mê Câu Cá`, description: excerpt(article.body, 160), type: 'article' },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articleBySlug.get(slug);
  if (!article) notFound();

  const others = articles.filter((a) => a.slug !== slug).slice(0, 3);
  return (
    <div className="wrap">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link href="/">Trang chủ</Link> / <Link href="/cam-nang">Cẩm nang</Link> / Bài viết
      </nav>
      <article className="prose">
        <h1 style={{ fontSize: 'clamp(24px, 4vw, 34px)' }}>{article.title}</h1>
        <div className="panel" style={{ marginTop: 16 }}>
          <p className="article-body" style={{ margin: 0 }}>
            {article.body}
          </p>
        </div>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 14 }}>
          Bài viết từ cộng đồng Review Không Mõm.
        </p>
      </article>

      <section className="section">
        <div className="section-head">
          <h2>Đọc tiếp</h2>
          <Link href="/cam-nang">Tất cả bài viết →</Link>
        </div>
        <div className="grid grid-3">
          {others.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </section>
    </div>
  );
}
