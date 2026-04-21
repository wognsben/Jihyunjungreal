const ORIGIN_HOST = 'jihyunjung.com';
const CDN_HOST = 'https://jihyunjung.b-cdn.net';

export const toCdnUrl = (url?: string | null): string => {
  if (!url) return '';

  const trimmed = url.trim();
  if (!trimmed) return '';

  // data / blob 제외
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // 이미 Bunny CDN이면 그대로
  if (trimmed.includes('.b-cdn.net')) {
    return trimmed;
  }

  // protocol-relative → https
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // URL 객체로 안전하게 파싱
  try {
    const parsed = new URL(trimmed, 'https://jihyunjung.com');

    // 다른 도메인이면 건드리지 않음 (중요)
    if (!parsed.hostname.includes(ORIGIN_HOST)) {
      return trimmed;
    }

    // wp uploads만 CDN으로 변경
    if (parsed.pathname.startsWith('/wp-content/uploads/')) {
      return `${CDN_HOST}${parsed.pathname}`;
    }

    return trimmed;
  } catch {
    return trimmed;
  }
};