import Link from 'next/link';
import type { Article } from '@/lib/types';
import { excerpt } from '@/lib/data';

/** Handbook article card — the whole card navigates to the article
 *  (stretched link on the title), not just the title text. */
export default function ArticleCard({
  article,
  excerptLen = 120,
}: {
  article: Article;
  excerptLen?: number;
}) {
  return (
    <article className="card card-article has-stretch">
      <h3>
        <Link className="stretched-link" href={`/cam-nang/${article.slug}`}>
          {article.title}
        </Link>
      </h3>
      <p className="desc">{excerpt(article.body, excerptLen)}</p>
    </article>
  );
}
