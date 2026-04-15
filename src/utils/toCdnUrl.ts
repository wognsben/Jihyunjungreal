const ORIGIN_HOST = 'https://jihyunjung.com';

export const toCdnUrl = (url?: string | null): string => {
  if (!url) return '';

  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    return `${ORIGIN_HOST}${trimmed}`;
  }

  return trimmed;
};