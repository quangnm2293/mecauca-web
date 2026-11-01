'use client';

import { useSearchParams } from 'next/navigation';
import ReportForm from '@/components/ReportForm';

/** Reads ?bai=<slug> (from a spot page's "Đăng báo cá" button) and
 *  pre-selects that spot in the form. */
export default function ReportFormShell() {
  const params = useSearchParams();
  return <ReportForm initialSlug={params.get('bai')} />;
}
