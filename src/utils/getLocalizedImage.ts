import { Work } from '@/data/works';
import { toCdnUrl } from '@/utils/toCdnUrl';


type Language = 'ko' | 'en' | 'jp';

/**
 * 언어에 맞는 썸네일을 반환합니다.
 * EN_image / JP_image ACF 필드에 이미지가 있으면 해당 이미지를 사용하고,
 * 없으면 기본 thumbnail을 fallback으로 사용합니다.
 */
export const getLocalizedThumbnail = (work: Work, lang: Language): string => {
  if (lang === 'en' && work.thumbnail_en) return toCdnUrl(work.thumbnail_en);
  if (lang === 'jp' && work.thumbnail_jp) return toCdnUrl(work.thumbnail_jp);
  return toCdnUrl(work.thumbnail);
};

/**
 * 언어에 맞는 갤러리 이미지 목록을 반환합니다.
 * 언어별 대표 이미지가 있으면 갤러리 첫 번째 이미지를 교체합니다.
 * (대부분의 작품은 동일한 갤러리를 사용하므로 첫 번째 이미지만 교체)
 */
export const getLocalizedGalleryImages = (work: Work, lang: Language): string[] => {
  const langThumbnail =
    lang === 'en'
      ? work.thumbnail_en
      : lang === 'jp'
        ? work.thumbnail_jp
        : undefined;

  const cdnGalleryImages = work.galleryImages.map((image) => toCdnUrl(image));
  const cdnLangThumbnail = langThumbnail ? toCdnUrl(langThumbnail) : undefined;

  if (!cdnLangThumbnail || cdnGalleryImages.length === 0) {
    return cdnGalleryImages;
  }

  // 언어별 이미지가 갤러리 첫 번째와 같은 경우 교체 불필요
  if (cdnGalleryImages[0] === cdnLangThumbnail) {
    return cdnGalleryImages;
  }

  // 첫 번째 이미지를 언어별 이미지로 교체
  return [cdnLangThumbnail, ...cdnGalleryImages.slice(1)];
};
