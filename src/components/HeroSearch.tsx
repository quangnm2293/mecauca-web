'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  return (
    <form
      className="hero-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/bai-cau?q=${encodeURIComponent(q.trim())}` : '/bai-cau');
      }}
    >
      <label className="sr-only" htmlFor="hero-q">
        Tìm bãi câu
      </label>
      <input
        id="hero-q"
        type="search"
        placeholder="Tìm bãi câu, tỉnh hoặc loài cá… (vd: Trị An, chép)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button type="submit">Tìm bãi</button>
    </form>
  );
}
