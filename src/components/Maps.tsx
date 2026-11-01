'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { KIND_COLORS, SITE_BASE, type Spot } from '@/lib/types';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function dotIcon(color: string, ring = false): L.DivIcon {
  return L.divIcon({
    className: 'mm-marker',
    html: `<span style="display:block;width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45)${ring ? `;outline:3px solid ${color}` : ''}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const userIcon = L.divIcon({
  className: 'mm-marker',
  html: '<span style="display:block;width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25)"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export interface OwnMapSpot {
  name: string;
  province: string;
  kindLabel: string;
  lat: number;
  lng: number;
  status: string;
}

/**
 * Directory map: one marker per spot, coloured by kind like the app.
 * Clicking a marker opens a popup with a link to the spot page.
 * Own pending spots (when signed in) show as amber markers.
 */
export function SpotsMap({
  spots,
  ownSpots = [],
  userPos = null,
}: {
  spots: Spot[];
  ownSpots?: OwnMapSpot[];
  userPos?: { lat: number; lng: number } | null;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const hadPosRef = useRef(false);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current).setView([16.2, 107.8], 5);
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const s of spots) {
      const marker = L.marker([s.lat, s.lng], {
        icon: dotIcon(KIND_COLORS[s.kind] ?? '#0B6E4F'),
      });
      marker.bindPopup(
        `<strong>${escapeHtml(s.name)}</strong><br/>${escapeHtml(s.province)} · ${escapeHtml(s.kindLabel)}<br/><a href="${SITE_BASE}/bai-cau/${s.slug}/">Xem chi tiết bãi &rarr;</a>`,
      );
      marker.addTo(layer);
    }
    for (const s of ownSpots) {
      const marker = L.marker([s.lat, s.lng], { icon: dotIcon('#F59E0B', true) });
      marker.bindPopup(
        `<strong>${escapeHtml(s.name)}</strong><br/>${escapeHtml(s.province)} · ${escapeHtml(s.kindLabel)}<br/><em>Bãi của bạn · ${s.status === 'pending' ? 'Chờ duyệt' : 'Không được duyệt'}</em>`,
      );
      marker.addTo(layer);
    }
  }, [spots, ownSpots]);

  useEffect(() => {
    const layer = userLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (userPos) {
      L.marker([userPos.lat, userPos.lng], { icon: userIcon })
        .bindPopup('Vị trí của bạn')
        .addTo(layer);
      if (!hadPosRef.current) {
        map.setView([userPos.lat, userPos.lng], 10);
      }
      hadPosRef.current = true;
    } else {
      hadPosRef.current = false;
    }
  }, [userPos]);

  return <div ref={elRef} className="leaflet-box" role="application" aria-label="Bản đồ bãi câu" />;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Add-spot location picker — the app's centre-pin pattern: the pin
 * stays in the middle while the user pans; clicking the map moves
 * the centre to the clicked point. Coordinates stream out via
 * onChange (and live via the readout under the map).
 */
export function PinMap({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initRef = useRef({ lat, lng });

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current).setView([initRef.current.lat, initRef.current.lng], 11);
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(map);
    map.on('moveend', () => {
      const c = map.getCenter();
      onChangeRef.current(c.lat, c.lng);
    });
    map.on('click', (e: L.LeafletMouseEvent) => {
      map.setView(e.latlng);
      onChangeRef.current(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="pinmap-wrap">
      <div ref={elRef} className="leaflet-box pinmap" role="application" aria-label="Bản đồ chọn vị trí bãi" />
      <div className="pinmap-pin" aria-hidden>
        📍
      </div>
    </div>
  );
}
