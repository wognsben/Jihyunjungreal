export interface RelatedArticle {
  id: string;
  title: string;
  author?: string;
  summary: string;
  thumbnail?: string;
  link?: string;
}

export interface Work {
  id: string;
  title_ko: string;
  title_en: string;
  title_jp: string;
  year?: number;
  yearCaption_ko?: string;
  yearCaption_en?: string;
  yearCaption_jp?: string;
  medium_ko?: string;
  medium_en?: string;
  medium_jp?: string;
  thumbnail: string;
  thumbnail_en?: string; // EN-specific image override (ACF field: EN_image)
  thumbnail_jp?: string; // JP-specific image override (ACF field: JP_image)
  oneLineInfo_ko?: string;
  oneLineInfo_en?: string;
  oneLineInfo_jp?: string;
  description_ko?: string;
  description_en?: string;
  description_jp?: string;
  commission_ko?: string;
  commission_en?: string;
  commission_jp?: string;
  credits_ko?: string;
  credits_en?: string;
  credits_jp?: string;
  additional_ko?: string;
  additional_en?: string;
  additional_jp?: string;
  galleryImages: string[];
  imageCredits?: string[]; // Photo credits for each gallery image (e.g. "Photo John Doe © Studio Name")
  category?: string; // From work_category taxonomy (e.g. "project", "exhibition", or empty for works)
  youtubeUrl?: string; // YouTube video URL
  vimeoUrl?: string; // Vimeo video URL
  content_rendered?: string; // Raw WordPress block HTML for block-based rendering
  content_en?: string; // ACF 작품_설명_en 원본 HTML (본문+영상 순서 포함)
  content_jp?: string; // ACF 작품_설명_jp 원본 HTML (본문+영상 순서 포함)
  selected: boolean;
  order: number;
  relatedArticles?: RelatedArticle[];
  gallery_image_map?: Record<string, string>;
}

/**
 * worksData는 WordPress API 연동 후 더 이상 사용되지 않습니다.
 * 모든 데이터는 WorkContext를 통해 WordPress에서 가져옵니다.
 * 이 배열은 fallback/타입 참 목적으로만 유지됩니다.
 */
export const worksData: Work[] = [];

export const getSelectedWorks = (): Work[] => {
  const selected = worksData.filter(work => work.selected);
  if (selected.length >= 5) {
    return selected.slice(0, 5).sort((a, b) => a.order - b.order);
  }
  return worksData.slice(0, 5).sort((a, b) => a.order - b.order);
};

export const getAllWorks = (): Work[] => {
  return worksData.sort((a, b) => a.order - b.order);
};

export interface MainIndexSlide {
  image: string;
  title?: string;
  info?: string;
}