'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import HeaderAuth from './HeaderAuth';

const LINKS: { href: string; label: string; hideSm?: boolean }[] = [
  { href: '/bai-cau', label: 'Bãi câu' },
  { href: '/bao-ca', label: 'Báo cá' },
  { href: '/cam-nang', label: 'Cẩm nang', hideSm: true },
  { href: '/nhat-ky', label: 'Nhật ký', hideSm: true },
  { href: '/gioi-thieu', label: 'Giới thiệu', hideSm: true },
];

function norm(p: string): string {
  return p.replace(/\/+$/, '') || '/';
}

/** Main header navigation — client component so the current page can
 *  be marked (aria-current + amber-soft pill in CSS). usePathname
 *  already excludes the basePath, so this works on both hosts. */
export default function MainNav() {
  const pathname = norm(usePathname() || '/');
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav className="main-nav" aria-label="Điều hướng chính">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={l.hideSm ? 'hide-sm' : undefined}
          aria-current={isActive(l.href) ? 'page' : undefined}
        >
          {l.label}
        </Link>
      ))}
      <Link
        href="/dang-bao-ca"
        className="nav-cta"
        aria-current={isActive('/dang-bao-ca') ? 'page' : undefined}
      >
        Đăng báo cá
      </Link>
      <HeaderAuth />
    </nav>
  );
}
