'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
function monthLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return `${THAI_MONTHS[m - 1]} ${y}`;
}

// "ดูเป็น" employee picker + month navigator for the admin preview. Navigates by
// URL (/preview?as=&period=) so the server page re-reads the real data.
export function PreviewControls({
  people,
  selectedId,
  period,
  prevPeriod,
  nextPeriod,
  canGoNext,
}: {
  people: { id: string; name: string }[];
  selectedId: string;
  period: string;
  prevPeriod: string;
  nextPeriod: string;
  canGoNext: boolean;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-[13px] text-[#6b7280]">
        ดูเป็น
        <select
          value={selectedId}
          onChange={(e) => router.push(`/preview?as=${e.target.value}&period=${period}`)}
          className="field max-w-[240px]"
        >
          {people.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-1">
        <Link
          href={`/preview?as=${selectedId}&period=${prevPeriod}`}
          aria-label="เดือนก่อนหน้า"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7eaef] bg-white text-lg text-[#111827]"
        >
          ‹
        </Link>
        <span className="min-w-[150px] px-3 py-1.5 text-center text-base font-bold text-[#111827]">{monthLabel(period)}</span>
        {canGoNext ? (
          <Link
            href={`/preview?as=${selectedId}&period=${nextPeriod}`}
            aria-label="เดือนถัดไป"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7eaef] bg-white text-lg text-[#111827]"
          >
            ›
          </Link>
        ) : (
          <span aria-disabled className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-[#e7eaef] bg-white text-lg text-[#cbd5e1]">
            ›
          </span>
        )}
      </div>
    </div>
  );
}
