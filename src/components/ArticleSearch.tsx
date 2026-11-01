'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { articles, excerpt } from '@/lib/data';
import { matchesQuery } from '@/lib/fold';

export default function ArticleSearch() {
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () => articles.filter((a) => matchesQuery(`${a.title} ${a.body}`, q)),
    [q],
  );
  return (
    <>
      <form className="filters" style={{ gridTemplateColumns: '1fr' }} onSubmit={(e) => e.preventDefault()}>
        <label>
          Tìm trong cẩm nang
          <input
            type="search"
            placeholder="mồi, phao, rô phi, buộc lưỡi…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </form>
      <p className="result-count" aria-live="polite">
        {filtered.length} / {articles.length} bài
      </p>
      {filtered.length === 0 ? (
        <div className="empty-box">Không có bài nào khớp từ khoá này.</div>
      ) : (
        <div className="grid grid-2">
          {filtered.map((a) => (
            <article className="card" key={a.slug}>
              <h3>
                <Link href={`/cam-nang/${a.slug}`}>{a.title}</Link>
              </h3>
              <p className="desc">{excerpt(a.body, 150)}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
