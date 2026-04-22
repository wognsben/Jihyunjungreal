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

  // protocol-relative → https
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // ------------------------------------------------------------
  // 임시 조치:
  // Bunny CDN이 현재 403을 반환하므로
  // 구조는 유지하고, 실제 변환만 비활성화해서
  // 원본 URL을 그대로 사용한다.
  // 나중에 Bunny가 정상화되면
  // 아래 return trimmed; 부분을 기존 CDN 변환 로직으로 되돌리면 된다.
  // ------------------------------------------------------------
  return trimmed;
};