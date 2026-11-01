import Link from 'next/link';
import type { Spot } from '@/lib/types';
import { KIND_COLORS } from '@/lib/types';
import { excerpt } from '@/lib/data';
import { formatDistanceKm as formatKm } from '@/lib/constants';

export default function SpotCard({
  spot,
  distanceKm,
}: {
  spot: Spot;
  distanceKm?: number | null;
}) {
  const color = KIND_COLORS[spot.kind] ?? '#0B6E4F';
  return (
    <article className="card has-stretch" style={{ borderTopColor: color }}>
      <div className="meta-line">
        <span className="chip chip-kind" style={{ background: color }}>
          {spot.kindLabel}
        </span>
        <span>
          {spot.province} · Miền {spot.region}
        </span>
        {distanceKm != null && (
          <span className="dist-line">📍 Cách bạn ~{formatKm(distanceKm)}</span>
        )}
      </div>
      <h3>
        <Link className="stretched-link" href={`/bai-cau/${spot.slug}`}>{spot.name}</Link>
      </h3>
      {spot.description && <p className="desc">{excerpt(spot.description, 130)}</p>}
      {spot.species.length > 0 && (
        <div className="meta-line">
          {spot.species.slice(0, 5).map((s) => (
            <span key={s} className="chip chip-species">
              {s}
            </span>
          ))}
          {spot.species.length > 5 && <span>+{spot.species.length - 5} loài</span>}
        </div>
      )}
      {spot.ticketNote && (
        <p className="desc">
          <strong>Giá vé:</strong> {excerpt(spot.ticketNote, 90)}
        </p>
      )}
    </article>
  );
}
