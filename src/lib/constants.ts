/**
 * Shared lookup data ported from the app: the 34 current provinces,
 * common species / facility chips, suggestion fields, avatar palette.
 */

/** The 34 current provinces/cities of Vietnam (from 1 Jul 2025). */
export const PROVINCES34 = [
  'Hà Nội',
  'Hải Phòng',
  'Huế',
  'Đà Nẵng',
  'Cần Thơ',
  'TP. Hồ Chí Minh',
  'Lai Châu',
  'Điện Biên',
  'Cao Bằng',
  'Sơn La',
  'Lạng Sơn',
  'Quảng Ninh',
  'Thanh Hóa',
  'Nghệ An',
  'Hà Tĩnh',
  'Quảng Trị',
  'Tuyên Quang',
  'Lào Cai',
  'Thái Nguyên',
  'Phú Thọ',
  'Bắc Ninh',
  'Hưng Yên',
  'Ninh Bình',
  'Quảng Ngãi',
  'Gia Lai',
  'Khánh Hòa',
  'Lâm Đồng',
  'Đắk Lắk',
  'Đồng Nai',
  'Tây Ninh',
  'Vĩnh Long',
  'Đồng Tháp',
  'Cà Mau',
  'An Giang',
];

/** Region lookup for a province (same grouping as the app). */
export function regionOfProvince(province: string): string {
  const bac = new Set([
    'Hà Nội', 'Hải Phòng', 'Lai Châu', 'Điện Biên', 'Cao Bằng', 'Sơn La',
    'Lạng Sơn', 'Quảng Ninh', 'Thanh Hóa', 'Nghệ An', 'Hà Tĩnh', 'Tuyên Quang',
    'Lào Cai', 'Thái Nguyên', 'Phú Thọ', 'Bắc Ninh', 'Hưng Yên', 'Ninh Bình',
  ]);
  const nam = new Set([
    'TP. Hồ Chí Minh', 'Đồng Nai', 'Tây Ninh', 'Cần Thơ', 'Vĩnh Long',
    'Đồng Tháp', 'Cà Mau', 'An Giang',
  ]);
  if (bac.has(province)) return 'Bắc';
  if (nam.has(province)) return 'Nam';
  return 'Trung';
}

/** Common Vietnamese freshwater species (report form + contribution chips). */
export const COMMON_SPECIES = [
  'Chép', 'Rô phi', 'Tra', 'Trắm cỏ', 'Trắm đen', 'Lóc', 'Diếc', 'Chim',
  'Rô đồng', 'Mè', 'Trôi', 'Lăng', 'Chạch', 'Bống tượng', 'Thát lát',
];

/** Facilities a spot can offer (contribution chips). */
export const FACILITIES = [
  'Chòi / lều câu', 'Ăn uống', 'Thuê cần', 'Bán mồi', 'Gửi xe', 'WC',
  'Điện / đèn đêm',
];

/** Spot kind labels (same wording as the app). */
export const KIND_LABELS: Record<string, string> = {
  hoDichVu: 'Hồ dịch vụ',
  hoTuNhien: 'Hồ tự nhiên',
  hoChua: 'Hồ chứa / đập',
  song: 'Sông',
  suoi: 'Suối / khe',
};

/** Fields the "Gợi ý sửa / Báo sai" form can correct. */
export const SUGGESTION_FIELDS = [
  'Loài cá', 'Giá vé', 'Tiện ích', 'Vị trí / toạ độ', 'Tên bãi', 'Mô tả', 'Khác',
];

/** Avatar colours (same palette as the app's profile). */
export const AVATAR_PALETTE = [
  '#0B6E4F', '#2563EB', '#7C3AED', '#D97706', '#0D9488', '#DB2777', '#65A30D',
  '#475569',
];

export type ContentStatus = 'pending' | 'approved' | 'rejected' | 'applied';

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Không được duyệt',
  applied: 'Đã áp dụng',
  open: 'Chờ xử lý',
  actioned: 'Đã xử lý',
  dismissed: 'Đã bỏ qua',
};

/** Haversine distance in km (same formula as the app). */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** "850 m" · "4,2 km" · "54 km" — the app's distance formatting. */
export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

/** Client-side id for a new community row (client_id column). */
export function newClientId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${rand}`;
}
