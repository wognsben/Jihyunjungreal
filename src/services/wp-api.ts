import axios from 'axios';
import he from 'he';
import { Work } from '@/data/works';
import { TextItem, Category } from '@/data/texts';
import { WPPost } from '@/types/wordpress';

const API_BASE_URL = 'https://jihyunjung.com/wp-json/wp/v2';

const api = axios.create({
  baseURL: API_BASE_URL,
});

const workDetailCache = new Map<string, Work>();
const makeWorkDetailCacheKey = (id: string, lang: string) => {
  return `${id}_${lang}`;
};

// Interfaces
export interface AboutData {
  title: string;
  name?: string; // Add name field from ACF
  content: string; // HTML (Korean - default)
  content_en?: string; // Assembled from ACF EN fields
  content_jp?: string; // Assembled from ACF JP fields
  image: string;
  profile_info?: string;
  profile_info_ko?: string; // Korean profile info
  profile_info_en?: string; // English profile info
  profile_info_jp?: string; // Japanese profile info
  profile_info2?: string; // Add profile_info2 field
  contact: {
    email: string;
    instagram: string;
    website: string;
  };
}

export interface HistoryItem {
  id: string;
  title: string;
  year: string;
  content: string;
  linkedWork: {
    id: string;
    title: string;
    thumbnail: string;
    slug: string;
  } | null;
}

// Helper to decode HTML entities in titles (e.g. "Dn&#038;D" -> "DnD")
const decode = (str: string) => he.decode(str || '');

// Helper to get full size URL by removing WP resolution suffix (e.g. -150x150)
const getFullSizeUrl = (url: string): string => {
  if (!url) return '';

  // Clean up WP resolution suffix
  return url.replace(/-\d+x\d+(\.[a-zA-Z]+)$/, '$1');
};

// ============================================================
// Resolve [gallery ids="..."] shortcodes → HTML with full-size image URLs
// ACF Free WYSIWYG에서 사용하는 classic gallery shortcode 지원
// ============================================================

const extractGalleryIdsFromHtml = (html?: string): string[] => {
  if (!html) return [];

  const ids = new Set<string>();
  const galleryRegex = /\[gallery\b[^\]]*ids=['"]([^'"]+)['"][^\]]*\]/gi;

  let match;
  while ((match = galleryRegex.exec(html)) !== null) {
    const rawIds = match[1]
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    rawIds.forEach((id) => ids.add(id));
  }

  return Array.from(ids);
};

const fetchGalleryImageMap = async (
  ids: string[]
): Promise<Record<string, string>> => {
  if (!ids.length) return {};

  const uniqueIds = Array.from(new Set(ids));

  try {
    const response = await api.get('/media', {
      params: {
        include: uniqueIds.join(','),
        per_page: 100,
      },
    });

    const map: Record<string, string> = {};

    for (const item of response.data) {
      const id = String(item.id);
      const url = getFullSizeUrl(
        item?.media_details?.sizes?.full?.source_url ||
          item?.source_url ||
          ''
      );

      if (url) {
        map[id] = url;
      }
    }

    return map;
  } catch (error) {
    console.error('Error fetching gallery image map:', error);
    return {};
  }
};

const resolveGalleryShortcodes = async (html: string): Promise<string> => {
  if (!html) return html;

  const galleryRegex = /\[gallery\s+[^\]]*ids=['"]([^'"]+)['"][^\]]*\]/gi;
  const matches = [...html.matchAll(galleryRegex)];

  if (matches.length === 0) return html;

  // Collect all unique attachment IDs across all gallery shortcodes
  const allIds = new Set<string>();
  for (const m of matches) {
    m[1].split(',').forEach((id) => allIds.add(id.trim()));
  }

  // Batch fetch all media items in one API call
  let mediaMap = new Map<string, { url: string; caption: string }>();
  try {
    const response = await api.get('/media', {
      params: {
        include: [...allIds].join(','),
        per_page: 100,
      },
    });
    for (const item of response.data) {
  // Use full-size source_url, strip WP resolution suffix for maximum quality
  const fullUrl = getFullSizeUrl(
    item.media_details?.sizes?.full?.source_url || item.source_url || ''
  );

  const rawCaption = item.caption?.rendered || '';
  const safeCaption = escapeNonHtmlAngleBrackets(rawCaption);
  const caption = he.decode(
    safeCaption.replace(/<[^>]+>/g, '').trim()
  );

  mediaMap.set(String(item.id), { url: fullUrl, caption });
}
  } catch (error) {
    console.error('Error fetching gallery media:', error);
    return html; // Return original if API fails
  }

  // Replace each [gallery] shortcode with proper HTML
  let result = html;
  for (const m of matches) {
    const ids = m[1].split(',').map((id) => id.trim());
    const figures = ids
      .filter((id) => mediaMap.has(id))
      .map((id) => {
        const { url, caption } = mediaMap.get(id)!;
        return `<figure class="wp-block-image"><img src="${url}" alt="${caption}" />${
          caption ? `<figcaption>${caption}</figcaption>` : ''
        }</figure>`;
      })
      .join('\n');

    const galleryHtml = `<figure class="wp-block-gallery">${figures}</figure>`;
    result = result.replace(m[0], galleryHtml);
  }

  return result;
};

const escapeHtmlAttr = (value: string = ''): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escapeNonHtmlAngleBrackets = (html: string): string => {
  if (!html) return html;

  return html.replace(/<([^<>]+)>/g, (match, inner) => {
    const trimmed = inner.trim();

    // 정상 HTML 태그처럼 보이면 그대로 둠
    if (
      /^\/?[a-zA-Z][\w:-]*(\s+[^<>]*)?$/.test(trimmed) ||
      /^!--[\s\S]*--$/.test(trimmed) ||
      /^\?[a-zA-Z][\s\S]*\?$/.test(trimmed)
    ) {
      return match;
    }

    // HTML 태그가 아닌 꺾쇠 괄호 텍스트는 escape
    return `&lt;${inner}&gt;`;
  });
};

const normalizeAcfTextHtml = (html: string): string => {
  if (!html) return '';

  const normalized = html
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  if (!normalized) return '';

  // 이미 문단/블록 태그가 있으면 기존 구조 최대한 보존
  if (
    /<p[\s>]/i.test(normalized) ||
    /<div[\s>]/i.test(normalized) ||
    /<h[1-6][\s>]/i.test(normalized) ||
    /<figure[\s>]/i.test(normalized) ||
    /<blockquote[\s>]/i.test(normalized) ||
    /<ul[\s>]/i.test(normalized) ||
    /<ol[\s>]/i.test(normalized)
  ) {
    return normalized
      .replace(/(^|\n)\s*&nbsp;\s*(?=\n|$)/gi, '$1<p>&nbsp;</p>')
      .replace(/<p([^>]*)>\s*&nbsp;\s*<\/p>/gi, '<p$1>&nbsp;</p>')
      .replace(/<p([^>]*)>\s*<\/p>/gi, '<p$1><br></p>')
      .replace(/<p([^>]*)>\s*(<br\s*\/?>\s*)+<\/p>/gi, '<p$1><br></p>');
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      if (/^&nbsp;$/i.test(chunk)) {
        return '<p>&nbsp;</p>';
      }

      const withLineBreaks = chunk.replace(/\n/g, '<br />');
      return `<p>${withLineBreaks}</p>`;
    });

  return paragraphs.join('\n');
};

const transformAcfGalleryToSliderHtml = (
  html: string,
  galleryImageMap: Record<string, string>
): string => {
  if (!html) return html;

  return html.replace(
    /\[gallery\b[^\]]*ids=['"]([^'"]+)['"][^\]]*\]/gi,
    (_, ids: string) => {
      const imageIds = ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      if (!imageIds.length) return '';

      const figures = imageIds
        .map((id) => {
          const url = galleryImageMap[id];
          if (!url) return '';

          return `
            <figure class="acf-slider-item" data-image-id="${escapeHtmlAttr(id)}">
              <img
                src="${escapeHtmlAttr(url)}"
                alt=""
                class="acf-slider-image"
                loading="lazy"
              />
            </figure>
          `;
        })
        .filter(Boolean)
        .join('');

      if (!figures) return '';

      return `
        <div class="acf-slider-gallery" data-slider="acf-gallery" data-gallery-ids="${escapeHtmlAttr(ids)}">
          ${figures}
        </div>
      `;
    }
  );
};

// Extract images from HTML content
const extractImagesFromContent = (html: string): string[] => {
  const regex = /<img[^>]+src="([^">]+)"/g;
  const images: string[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    images.push(getFullSizeUrl(match[1])); // Always try to get full size
  }
  return images;
};

// Extract images and captions together (maintains proper matching)
const extractImagesAndCaptions = (
  html: string
): { url: string; caption: string }[] => {
  const results: { url: string; caption: string }[] = [];
  const processedUrls = new Set<string>();

  // 1. Block Editor: <figure><img><figcaption>Caption</figcaption></figure>
  const figureRegex =
    /<figure[^>]*>\s*(?:<a[^>]*>)?\s*<img[^>]+src="([^"]+)"[^>]*>\s*(?:<\/a>)?\s*(?:<figcaption[^>]*>([\s\S]*?)<\/figcaption>)?\s*<\/figure>/gi;
  let match;

  while ((match = figureRegex.exec(html)) !== null) {
    const rawUrl = match[1];
    const url = getFullSizeUrl(rawUrl);
    const rawCaption = match[2] || '';

const safeCaption = escapeNonHtmlAngleBrackets(rawCaption);

const caption = safeCaption
  .replace(/<[^>]+>/g, '')
  .trim();

    results.push({ url, caption });
    processedUrls.add(rawUrl);
    processedUrls.add(url);
  }

  // 2. Classic Editor: [caption]<img src="..."> Caption text[/caption]
  const captionShortcodeRegex =
    /\[caption[^\]]*\][\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?([\s\S]*?)\[\/caption\]/gi;

  while ((match = captionShortcodeRegex.exec(html)) !== null) {
    const rawUrl = match[1];
    const url = getFullSizeUrl(rawUrl);

    if (!processedUrls.has(rawUrl) && !processedUrls.has(url)) {
  const rawCaption = match[2] || '';

  const safeCaption = escapeNonHtmlAngleBrackets(rawCaption);

  const caption = safeCaption
    .replace(/<[^>]+>/g, '')
    .trim();

  results.push({ url, caption });
  processedUrls.add(rawUrl);
  processedUrls.add(url);
}
  }

  // 3. Standalone <img> tags (no caption wrapper)
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;

  while ((match = imgRegex.exec(html)) !== null) {
    const rawUrl = match[1];
    const url = getFullSizeUrl(rawUrl);

    if (!processedUrls.has(rawUrl) && !processedUrls.has(url)) {
      results.push({ url, caption: '' });
      processedUrls.add(rawUrl);
      processedUrls.add(url);
    }
  }

  return results;
};

// Parse multilingual caption format: [KO]한글[EN]English[JP]日本語
export const parseMultilingualCaption = (
  caption: string,
  lang: string
): string => {
  if (!caption) return '';

  // If no language tags, return as-is
  if (
    !caption.includes('[KO]') &&
    !caption.includes('[EN]') &&
    !caption.includes('[JP]')
  ) {
    return caption;
  }

  // Extract content for specific language
  const patterns: Record<string, RegExp> = {
    ko: /\[KO\](.*?)(?:\[EN\]|\[JP\]|$)/s,
    en: /\[EN\](.*?)(?:\[KO\]|\[JP\]|$)/s,
    jp: /\[JP\](.*?)(?:\[KO\]|\[EN\]|$)/s,
  };

  const pattern = patterns[lang.toLowerCase()];
  if (!pattern) return caption;

  const match = caption.match(pattern);
  return match ? match[1].trim() : '';
};

// Remove caption shortcodes from content (for clean description text)
const removecaptionShortcodes = (html: string): string => {
  let cleaned = html;
  // Remove [caption]...[/caption] shortcodes
  cleaned = cleaned.replace(/\[caption[^\]]*\].*?\[\/caption\]/gs, '');
  // Remove <figure>...</figure> blocks (WordPress Block Editor gallery items with figcaptions)
  cleaned = cleaned.replace(/<figure[^>]*>.*?<\/figure>/gs, '');
  // Remove standalone <figcaption>...</figcaption> tags and their content
  cleaned = cleaned.replace(/<figcaption[^>]*>.*?<\/figcaption>/gs, '');
  return cleaned;
};

// Remove leftover multilingual caption patterns and standalone caption text from plain text descriptions
const removeMultilingualCaptionPatterns = (text: string): string => {
  if (!text) return '';
  let cleaned = text;
  // Remove lines that contain [KO]...[EN]...[JP]... multilingual patterns
  cleaned = cleaned.replace(/^.*\[KO\].*\[EN\].*\[JP\].*$/gm, '');
  // Remove lines that are ONLY [KO] or [EN] or [JP] tags with content between them
  cleaned = cleaned.replace(/^\s*\[(?:KO|EN|JP)\]\s*.*$/gm, (match) => {
    // Only remove if it looks like a caption line (contains at least 2 language tags)
    const tagCount = (match.match(/\[(?:KO|EN|JP)\]/g) || []).length;
    return tagCount >= 2 ? '' : match;
  });
  // Clean up excessive blank lines left behind
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
};

// Extract image captions from WordPress content
// Looks for figcaption, wp-caption-text, or data-caption attributes
const extractImageCaptions = (html: string): string[] => {
  const captions: string[] = [];

  // First, try to extract from HTML5 figure/figcaption (WordPress Gallery Block)
  const figureRegex =
    /<figure[^>]*>.*?<img[^>]+>.*?(?:<figcaption[^>]*>(.*?)<\/figcaption>)?.*?<\/figure>/gs;
  let figureMatch;

  while ((figureMatch = figureRegex.exec(html)) !== null) {
  const rawCaption = figureMatch[1] || '';

  const safeCaption = escapeNonHtmlAngleBrackets(rawCaption);

  const caption = decode(
    safeCaption
      .replace(/<[^>]+>/g, '')
      .trim()
  );

  captions.push(caption);
}

  // If no figures found, try WordPress caption shortcode: [caption]...[/caption]
  if (captions.length === 0) {
    const captionShortcodeRegex = /\[caption[^\]]*\](.*?)\[\/caption\]/gs;
    let captionMatch;

    while ((captionMatch = captionShortcodeRegex.exec(html)) !== null) {
      const captionContent = captionMatch[1];
      // Extract text after the img tag (the caption text)
      const textMatch = captionContent.match(/<\/a>(.+?)$|<img[^>]+>(.+?)$/s);
      if (textMatch) {
  const rawCaption = textMatch[1] || textMatch[2] || '';

  const safeCaption = escapeNonHtmlAngleBrackets(rawCaption);

  const caption = safeCaption
    .replace(/<[^>]+>/g, '')
    .trim();

  captions.push(decode(caption));
} else {
  captions.push('');
}
    }
  }

  return captions;
};

// Extract YouTube URL from content (iframe or link)
const extractYouTubeUrl = (html: string): string | undefined => {
  // Match YouTube iframe embed
  const iframeRegex =
    /<iframe[^>]+src="([^"]*youtube\.com\/embed\/[^"]+)"/i;
  const iframeMatch = html.match(iframeRegex);
  if (iframeMatch) return iframeMatch[1];

  // Match YouTube direct links
  const linkRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const linkMatch = html.match(linkRegex);
  if (linkMatch) return `https://www.youtube.com/embed/${linkMatch[1]}`;

  return undefined;
};

// Extract Vimeo URL from content (iframe or link)
const extractVimeoUrl = (html: string): string | undefined => {
  // Match Vimeo iframe embed
  const iframeRegex = /<iframe[^>]+src="([^"]*vimeo\.com\/video\/[^"]+)"/i;
  const iframeMatch = html.match(iframeRegex);
  if (iframeMatch) return iframeMatch[1];

  // Match Vimeo direct links
  const linkRegex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/i;
  const linkMatch = html.match(linkRegex);
  if (linkMatch) return `https://player.vimeo.com/video/${linkMatch[1]}`;

  return undefined;
};

// Transform WP Post to Application Work Interface
const normalizeWorkContentHtml = async (
  html: string,
  galleryImageMap: Record<string, string>
): Promise<string> => {
  if (!html?.trim()) return '';

  const resolved = await resolveGalleryShortcodes(html);
  return transformAcfGalleryToSliderHtml(resolved, galleryImageMap);
};

const transformWork = async (post: WPPost, lang: string): Promise<Work> => {
  const rawFeaturedImage =
    typeof (post as any).thumbnail_ko === 'string'
      ? (post as any).thumbnail_ko
      : post._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';

  let featuredImage = getFullSizeUrl(rawFeaturedImage);

  // ACF fields for multilingual support
  const acf = post.acf || {};

  const raw_content_en = acf['작품_설명_en'] || '';
  const raw_content_jp = acf['작품_설명_jp'] || '';

  // ACF Gallery Field - Primary source for images and captions
  let galleryImages: string[] = [];
  let imageCredits: string[] = [];

  // Check for ACF gallery field (field name: gallery_images or similar)
  const acfGalleryKo =
    acf.gallery_images ||
    acf.gallery ||
    acf['갤러리_이미지'];

  const acfGalleryEn =
    acf.gallery_images_en ||
    acf.gallery_en ||
    acf['갤러리_이미지_en'] ||
    acf['EN_갤러리_이미지'];

  const acfGalleryJp =
    acf.gallery_images_jp ||
    acf.gallery_jp ||
    acf['갤러리_이미지_jp'] ||
    acf['JP_갤러리_이미지'];

  const acfGallery =
    lang === 'en'
      ? acfGalleryEn || acfGalleryKo
      : lang === 'jp'
      ? acfGalleryJp || acfGalleryKo
      : acfGalleryKo;

  const activeGallery =
  lang === 'en'
    ? acfGalleryEn
    : lang === 'jp'
    ? acfGalleryJp
    : acfGalleryKo;

if (activeGallery && Array.isArray(activeGallery) && activeGallery.length > 0) {
    // ACF Gallery exists - use it as primary source
    activeGallery.forEach((imageObj: any, index: number) => {
      if (imageObj) {
        // Handle both Image Object and Image Array return formats
        const imageUrl =
          typeof imageObj === 'string'
            ? imageObj
            : imageObj.url || imageObj.sizes?.large || imageObj.sizes?.full || '';

        const caption =
          typeof imageObj === 'object' ? imageObj.caption || '' : '';

        if (imageUrl) {
          galleryImages.push(getFullSizeUrl(imageUrl));
          imageCredits.push(caption ? decode(caption) : '');
        }
      }
    });

  } else {

    // Fallback: Extract images and captions together from content
    const fallbackContent =
  lang === 'en'
    ? (raw_content_en || post.content.rendered)
    : lang === 'jp'
    ? (raw_content_jp || post.content.rendered)
    : post.content.rendered;

const imagesAndCaptions = extractImagesAndCaptions(fallbackContent);

    // Separate into arrays
    galleryImages = imagesAndCaptions.map((item) => item.url);
    const rawCaptions = imagesAndCaptions.map((item) => item.caption);

    // Store raw captions (multilingual parsing happens at render time)
    imageCredits = rawCaptions;

    // Fallback: If no featured image, use first content image as thumbnail
    if (!featuredImage && galleryImages.length > 0) {
      featuredImage = galleryImages[0];
    }
  }

    // Prefer REST field first, then embedded taxonomy, then post date fallback
  let yearFromCategory: number | undefined =
    typeof (post as any).work_year === 'number'
      ? (post as any).work_year
      : undefined;

  if (yearFromCategory === undefined) {
    const terms = post._embedded?.['wp:term'];

    if (terms) {
      for (const taxonomyTerms of terms) {
        if (
          taxonomyTerms.length > 0 &&
          taxonomyTerms[0].taxonomy === 'work_category'
        ) {
          taxonomyTerms.forEach((t: any) => {
            const name = t.name;
            if (/^\d{4}/.test(name)) {
              const match = name.match(/^(\d{4})/);
              if (match) {
                yearFromCategory = parseInt(match[1], 10);
              }
            }
          });
          break;
        }
      }
    }
  }

  // KO: WordPress default fields (title, content, excerpt)
    const safeTitleRendered =
    typeof post?.title?.rendered === 'string'
      ? post.title.rendered
      : typeof (post as any)?.post_title === 'string'
      ? (post as any).post_title
      : '';

  const safeContentRendered =
    typeof post?.content?.rendered === 'string'
      ? post.content.rendered
      : '';

  const safeExcerptRendered =
    typeof post?.excerpt?.rendered === 'string'
      ? post.excerpt.rendered
      : typeof (post as any)?.post_excerpt === 'string'
      ? (post as any).post_excerpt
      : '';

  const title_ko = decode(safeTitleRendered);
  const description_raw = safeContentRendered;
  // Remove [caption] shortcodes from description to keep it clean
  const description_cleaned = removecaptionShortcodes(description_raw);
  const description_ko = removeMultilingualCaptionPatterns(
    stripHtmlToText(description_cleaned)
  );
  const oneLineInfo_ko = decode(
    safeExcerptRendered.replace(/<[^>]+>/g, '').trim()
  );

  // EN/JP gallery map
  const galleryIds = [
    ...extractGalleryIdsFromHtml(raw_content_en),
    ...extractGalleryIdsFromHtml(raw_content_jp),
  ];
  const gallery_image_map = await fetchGalleryImageMap(galleryIds);

  // EN: ACF fields, fallback to KO
  const title_en = acf['제목_en'] ? decode(acf['제목_en']) : title_ko;
  const description_en_raw = raw_content_en || description_cleaned;
  const description_en = removeMultilingualCaptionPatterns(
    stripHtmlToText(removecaptionShortcodes(description_en_raw))
  );
  const oneLineInfo_en = acf.one_line_info_en
    ? decode(acf.one_line_info_en)
    : oneLineInfo_ko;

  // JP: ACF fields, fallback to KO
  const title_jp = acf['제목_jp'] ? decode(acf['제목_jp']) : title_ko;
  const description_jp_raw = raw_content_jp || description_cleaned;
  const description_jp = removeMultilingualCaptionPatterns(
    stripHtmlToText(removecaptionShortcodes(description_jp_raw))
  );
  
  const content_rendered = await normalizeWorkContentHtml(
  post.content.rendered || '',
  gallery_image_map
);

const content_en = raw_content_en
  ? await normalizeWorkContentHtml(raw_content_en, gallery_image_map)
  : undefined;

const content_jp = raw_content_jp
  ? await normalizeWorkContentHtml(raw_content_jp, gallery_image_map)
  : undefined;
  
  const oneLineInfo_jp = acf.one_line_info_jp
    ? decode(acf.one_line_info_jp)
    : oneLineInfo_ko;

  // Year Caption: ACF multilingual
  const yearCaption_ko = acf.year_caption_ko || acf.year_caption || '';
  const yearCaption_en = acf.year_caption_en || yearCaption_ko;
  const yearCaption_jp = acf.year_caption_jp || yearCaption_ko;

  // Commission: ACF multilingual
  const commission_ko = acf.commission_ko || acf.commission || '';
  const commission_en = acf.commission_en || commission_ko;
  const commission_jp = acf.commission_jp || commission_ko;

  // Credits: ACF multilingual
  const credits_ko = acf.credits_ko || acf.credits || '';
  const credits_en = acf.credits_en || credits_ko;
  const credits_jp = acf.credits_jp || credits_ko;

  // Additional text: ACF multilingual (artist notes, supplementary text)
  const additional_ko = acf.work_additional_ko || '';
  const additional_en = acf.work_additional_en || additional_ko;
  const additional_jp = acf.work_additional_jp || additional_ko;

  // Medium: ACF field (작품_medium), same across all languages
  const medium = acf['작품_medium'] || '';
  const medium_ko = medium;
  const medium_en = medium;
  const medium_jp = medium;

  // Category: ACF select field (카테고리) — "Works", "Projects", "Exhibitions"
  const rawCategory = acf['카테고리'] || '';
  const workCategory =
    typeof rawCategory === 'string'
      ? rawCategory
      : Array.isArray(rawCategory)
      ? rawCategory.join(', ')
      : rawCategory?.label || String(rawCategory);

    // EN/JP 대표 이미지
  // 1순위: Code Snippets로 REST에 추가한 thumbnail_en / thumbnail_jp
  // 2순위: 과거 ACF EN_image / JP_image
  const restThumbnailEn =
    typeof (post as any).thumbnail_en === 'string'
      ? getFullSizeUrl((post as any).thumbnail_en)
      : '';

  const restThumbnailJp =
    typeof (post as any).thumbnail_jp === 'string'
      ? getFullSizeUrl((post as any).thumbnail_jp)
      : '';

  const enImageRaw = acf.EN_image || acf.en_image || acf['EN_image'];
  const jpImageRaw = acf.JP_image || acf.jp_image || acf['JP_image'];

  const acfThumbnailEn = enImageRaw
    ? getFullSizeUrl(
        typeof enImageRaw === 'string'
          ? enImageRaw
          : enImageRaw.url ||
              enImageRaw.sizes?.large ||
              enImageRaw.sizes?.full ||
              ''
      )
    : '';

  const acfThumbnailJp = jpImageRaw
    ? getFullSizeUrl(
        typeof jpImageRaw === 'string'
          ? jpImageRaw
          : jpImageRaw.url ||
              jpImageRaw.sizes?.large ||
              jpImageRaw.sizes?.full ||
              ''
      )
    : '';

  const thumbnail_en = restThumbnailEn || acfThumbnailEn || undefined;
  const thumbnail_jp = restThumbnailJp || acfThumbnailJp || undefined;

  // Extract YouTube URL from ACF, meta, or content
  let youtubeUrl: string | undefined;
  if ((post as any).acf?.youtube_url) {
    youtubeUrl = (post as any).acf.youtube_url;
  } else if ((post as any).meta?.youtube_url) {
    youtubeUrl = (post as any).meta.youtube_url;
  } else {
    youtubeUrl = extractYouTubeUrl(post.content.rendered);
  }

  // Extract Vimeo URL from ACF, meta, or content
  let vimeoUrl: string | undefined;
  if ((post as any).acf?.vimeo_url) {
    vimeoUrl = (post as any).acf.vimeo_url;
  } else if ((post as any).meta?.vimeo_url) {
    vimeoUrl = (post as any).meta.vimeo_url;
  } else {
    vimeoUrl = extractVimeoUrl(post.content.rendered);
  }

  // Transform ACF related_texts to RelatedArticle[]
  let relatedArticles: Work['relatedArticles'] = undefined;
  if (
    (post as any).acf?.related_texts &&
    Array.isArray((post as any).acf.related_texts) &&
    (post as any).acf.related_texts.length > 0
  ) {
    relatedArticles = (post as any).acf.related_texts
      .map((item: any) => {
        if (typeof item === 'number') {
          const embeddedPosts = post._embedded?.['acf:post'];
          if (embeddedPosts && Array.isArray(embeddedPosts)) {
            const textPost = embeddedPosts.find((p: any) => p.id === item);
            if (textPost) {
              return {
                id: String(textPost.id),
                title: textPost.title?.rendered
                  ? decode(textPost.title.rendered)
                  : 'Untitled',
                author: 'Ji Hyun Jung',
                summary: textPost.excerpt?.rendered
                  ? decode(
                      textPost.excerpt.rendered.replace(/<[^>]+>/g, '').trim()
                    )
                  : '',
                thumbnail: textPost._embedded?.['wp:featuredmedia']?.[0]?.source_url
                  ? getFullSizeUrl(
                      textPost._embedded['wp:featuredmedia'][0].source_url
                    )
                  : '',
                link: textPost.link || '',
              };
            }
          }
          return {
            id: String(item),
            title: '',
            author: 'Ji Hyun Jung',
            summary: '',
            thumbnail: '',
            link: '',
          };
        } else {
          const textTitle = item.title?.rendered
            ? decode(item.title.rendered)
            : item.post_title || item.title || 'Untitled';

          const textSummary = item.excerpt?.rendered
            ? decode(item.excerpt.rendered.replace(/<[^>]+>/g, '').trim())
            : item.post_excerpt || '';

          const textThumbnail = item._embedded?.['wp:featuredmedia']?.[0]?.source_url
            ? getFullSizeUrl(item._embedded['wp:featuredmedia'][0].source_url)
            : '';

          const textId = item.ID || item.id || '';
          const textLink = item.guid?.rendered || item.link || item.url || '';

          return {
            id: String(textId),
            title: textTitle,
            author: 'Ji Hyun Jung',
            summary: textSummary,
            thumbnail: textThumbnail,
            link: textLink,
          };
        }
      })
      .filter((article: any) => article && article.id);
  }

  const isSelected = false;

  const work: Work = {
    id: String(post.id),

    title_ko,
    title_en,
    title_jp,

    year: yearFromCategory || new Date(post.date).getFullYear(),

    yearCaption_ko: yearCaption_ko || undefined,
    yearCaption_en: yearCaption_en || undefined,
    yearCaption_jp: yearCaption_jp || undefined,

    medium_ko,
    medium_en,
    medium_jp,

    thumbnail:
  lang === 'en'
    ? thumbnail_en || featuredImage
    : lang === 'jp'
    ? thumbnail_jp || featuredImage
    : featuredImage,
thumbnail_en: thumbnail_en || undefined,
thumbnail_jp: thumbnail_jp || undefined,

    oneLineInfo_ko,
    oneLineInfo_en,
    oneLineInfo_jp,

    description_ko,
    description_en,
    description_jp,

    commission_ko: commission_ko || undefined,
    commission_en: commission_en || undefined,
    commission_jp: commission_jp || undefined,

    credits_ko: credits_ko || undefined,
    credits_en: credits_en || undefined,
    credits_jp: credits_jp || undefined,

    additional_ko: additional_ko || undefined,
    additional_en: additional_en || undefined,
    additional_jp: additional_jp || undefined,

    galleryImages:
  galleryImages.length > 0
    ? galleryImages
    : [
        lang === 'en'
          ? thumbnail_en || featuredImage
          : lang === 'jp'
          ? thumbnail_jp || featuredImage
          : featuredImage,
      ],
    imageCredits: imageCredits.length > 0 ? imageCredits : undefined,
    category: workCategory || undefined,
    youtubeUrl,
    vimeoUrl,
    content_rendered: content_rendered || undefined,
    content_en: content_en || undefined,
    content_jp: content_jp || undefined,
    gallery_image_map,
    relatedArticles,
    selected: isSelected,
    order: 0,
  };

  return work;
};

const transformText = async (post: WPPost): Promise<TextItem> => {
  const safeTitleRendered =
    typeof post?.title?.rendered === 'string'
      ? post.title.rendered
      : typeof (post as any)?.post_title === 'string'
      ? (post as any).post_title
      : '';

  const safeExcerptRendered =
    typeof post?.excerpt?.rendered === 'string'
      ? post.excerpt.rendered
      : typeof (post as any)?.post_excerpt === 'string'
      ? (post as any).post_excerpt
      : '';

  const safeContentRendered =
    typeof post?.content?.rendered === 'string'
      ? post.content.rendered
      : '';

  const title_ko = decode(safeTitleRendered);
  const summary_ko = decode(
    safeExcerptRendered.replace(/<[^>]+>/g, '').trim()
  );
  const featuredImage = getFullSizeUrl(
    post._embedded?.['wp:featuredmedia']?.[0]?.source_url || ''
  );

  // Resolve [gallery] shortcodes in all content HTML fields
  const contentHtml = await resolveGalleryShortcodes(safeContentRendered || '');
  const content_ko = decode(stripHtmlToText(contentHtml));

  // ACF multilingual fields
  const acf = post.acf || {};

      // EN
  const title_en = acf['text_제목_en']
    ? decode(acf['text_제목_en'])
    : acf.title_en
    ? decode(acf.title_en)
    : '';

  const content_en_source =
    acf['text_작품_설명en'] ||
    acf['TEXT_작품_설명en'] ||
    acf['TEXT_작품_설명_en'] ||
    acf['text_작품_설명_en'] ||
    acf.content_en ||
    '';

  const content_en_resolved = await resolveGalleryShortcodes(content_en_source);

  const content_en_raw = normalizeAcfTextHtml(
    escapeNonHtmlAngleBrackets(content_en_resolved)
  );

  const summary_en = acf.summary_en ? decode(acf.summary_en) : '';

  const content_en = content_en_raw
    ? decode(stripHtmlToText(content_en_raw))
    : '';

    // JP
  const title_jp = acf['text_제목_jp']
    ? decode(acf['text_제목_jp'])
    : acf.title_jp
    ? decode(acf.title_jp)
    : '';

  const content_jp_source =
    acf['text_작품_설명jp'] ||
    acf['TEXT_작품_설명jp'] ||
    acf['TEXT_작품_설명_jp'] ||
    acf['text_작품_설명_jp'] ||
    acf.content_jp ||
    '';

  const content_jp_resolved = await resolveGalleryShortcodes(content_jp_source);

  const content_jp_raw = normalizeAcfTextHtml(
    escapeNonHtmlAngleBrackets(content_jp_resolved)
  );

  const summary_jp = acf.summary_jp ? decode(acf.summary_jp) : '';

  const content_jp = content_jp_raw
    ? decode(stripHtmlToText(content_jp_raw))
    : '';

  // Transform ACF related_works
  let relatedWorks: TextItem['relatedWorks'] = undefined;
  const sourceRelated = post.acf?.related_works || post.acf?.related_projects;

  if (sourceRelated && Array.isArray(sourceRelated) && sourceRelated.length > 0) {
    relatedWorks = sourceRelated
      .map((item: any) => {
        let workObj: any = null;

        if (typeof item === 'number') {
          if (post._embedded) {
            for (const key in post._embedded) {
              if (Array.isArray(post._embedded[key])) {
                const found = post._embedded[key].find((p: any) => p.id === item);
                if (found) {
                  workObj = found;
                  break;
                }
              }
            }
          }
        } else {
          workObj = item;
        }

        if (!workObj) return null;

        const workId = String(workObj.ID || workObj.id);
        const workTitle = workObj.title?.rendered
          ? decode(workObj.title.rendered)
          : workObj.post_title || '';

        const workAcf = workObj.acf || {};

const relatedThumbnailEnRaw =
  workAcf.EN_image || workAcf.en_image || workAcf['EN_image'];

const relatedThumbnailJpRaw =
  workAcf.JP_image || workAcf.jp_image || workAcf['JP_image'];

const relatedThumbnailEn = relatedThumbnailEnRaw
  ? getFullSizeUrl(
      typeof relatedThumbnailEnRaw === 'string'
        ? relatedThumbnailEnRaw
        : relatedThumbnailEnRaw.url ||
          relatedThumbnailEnRaw.sizes?.large ||
          relatedThumbnailEnRaw.sizes?.full ||
          ''
    )
  : '';

const relatedThumbnailJp = relatedThumbnailJpRaw
  ? getFullSizeUrl(
      typeof relatedThumbnailJpRaw === 'string'
        ? relatedThumbnailJpRaw
        : relatedThumbnailJpRaw.url ||
          relatedThumbnailJpRaw.sizes?.large ||
          relatedThumbnailJpRaw.sizes?.full ||
          ''
    )
  : '';

const relatedFeatured =
  workObj._embedded?.['wp:featuredmedia']?.[0]?.source_url
    ? getFullSizeUrl(workObj._embedded['wp:featuredmedia'][0].source_url)
    : workObj.featured_media_src_url || '';

const workThumbnail =
  lang === 'en'
    ? relatedThumbnailEn || relatedFeatured
    : lang === 'jp'
    ? relatedThumbnailJp || relatedFeatured
    : relatedFeatured;

        let workYear = String(new Date(workObj.date).getFullYear());
        let workMedium = '';

        const terms = workObj._embedded?.['wp:term'];

        if (terms) {
          for (const taxonomyTerms of terms) {
            if (
              taxonomyTerms.length > 0 &&
              taxonomyTerms[0].taxonomy === 'work_category'
            ) {
              const mediumTerms: string[] = [];
              const yearTerms: string[] = [];
              taxonomyTerms.forEach((t: any) => {
                if (/^\d{4}/.test(t.name)) yearTerms.push(t.name);
                else mediumTerms.push(t.name);
              });

              if (yearTerms.length > 0) {
                const match = yearTerms[0].match(/^(\d{4})/);
                if (match) workYear = match[1];
              }
              if (mediumTerms.length > 0) workMedium = mediumTerms.join(', ');
              break;
            }
          }
        }

        return {
          id: workId,
          title: workTitle,
          thumbnail: workThumbnail,
          year: workYear,
          medium: workMedium,
        };
      })
      .filter((w: any) => w !== null) as TextItem['relatedWorks'];
  }

  let category: Category = 'Article';
  const terms = post._embedded?.['wp:term'];

  if (terms) {
    for (const taxonomyTerms of terms) {
      if (
        taxonomyTerms.length > 0 &&
        taxonomyTerms[0].taxonomy === 'text_category'
      ) {
        for (const term of taxonomyTerms) {
          const name = (term.name || '').toLowerCase();
          const slug = (term.slug || '').toLowerCase();

          if (
            name.includes('review') ||
            name.includes('리뷰') ||
            slug.includes('review')
          ) {
            category = 'Review';
            break;
          } else if (
            name.includes('note') ||
            name.includes('노트') ||
            slug.includes('note')
          ) {
            category = 'Note';
            break;
          } else if (
            name.includes('article') ||
            name.includes('아티클') ||
            slug.includes('article')
          ) {
            category = 'Article';
            break;
          }
        }
      }
      if (category !== 'Article') break;
    }
  }

  return {
    id: String(post.id),
    year: String(new Date(post.date).getFullYear()),
    category,
    author: {
      en: 'Ji Hyun Jung',
      ko: '정지현',
      jp: 'Ji Hyun Jung',
    },
    title: {
      en: title_en,
      ko: title_ko,
      jp: title_jp,
    },
    link: (post as any).link,
    image: featuredImage,
    summary: {
      en: summary_en,
      ko: summary_ko,
      jp: summary_jp,
    },
    content: {
      en: content_en,
      ko: content_ko,
      jp: content_jp,
    },
    contentHtml: {
      ko: contentHtml || undefined,
      en: content_en_raw || undefined,
      jp: content_jp_raw || undefined,
    },
    relatedWorks,
            hasEn: !!(
      acf['text_제목_en'] ||
      acf['text_작품_설명en'] ||
      acf.title_en ||
      acf.content_en ||
      title_en.trim() ||
      content_en_raw.trim()
    ),
    hasJp: !!(
      acf['text_제목_jp'] ||
      acf['text_작품_설명jp'] ||
      acf.title_jp ||
      acf.content_jp ||
      title_jp.trim() ||
      content_jp_raw.trim()
    ),
    hasKo: !!(title_ko.trim() && content_ko.trim()),
  };
};

const transformHistoryItem = (post: WPPost): HistoryItem => {
  const title = decode(post.title.rendered);
  const yearMatch = title.match(/^(\d{4})/);
  const year = yearMatch
    ? yearMatch[1]
    : new Date((post as any).date).getFullYear().toString();

  const content = post.content.rendered;

  let linkedWork: HistoryItem['linkedWork'] = null;
  const linkedWorkField = post.acf?.linked_work;

  if (linkedWorkField) {
    if (typeof linkedWorkField === 'object' && linkedWorkField !== null) {
      linkedWork = {
        id: String(linkedWorkField.ID || linkedWorkField.id),
        title:
          linkedWorkField.post_title ||
          linkedWorkField.title?.rendered ||
          '',
        thumbnail: '',
        slug: linkedWorkField.post_name || linkedWorkField.slug || '',
      };
    } else if (
      typeof linkedWorkField === 'number' ||
      typeof linkedWorkField === 'string'
    ) {
      linkedWork = {
        id: String(linkedWorkField),
        title: 'View Work',
        thumbnail: '',
        slug: '',
      };
    }
  }

  return {
    id: String(post.id),
    title,
    year,
    content,
    linkedWork,
  };
};

const transformWorkListItem = (post: WPPost): Work => {
  const rawFeaturedImage =
  typeof (post as any).thumbnail_ko === 'string'
    ? (post as any).thumbnail_ko
    : '';

let featuredImage = getFullSizeUrl(rawFeaturedImage);

  const acf = post.acf || {};

  const title_ko = decode(post.title.rendered);
  const title_en = acf['제목_en'] ? decode(acf['제목_en']) : title_ko;
  const title_jp = acf['제목_jp'] ? decode(acf['제목_jp']) : title_ko;

  const oneLineInfo_ko = decode(
    post.excerpt?.rendered?.replace(/<[^>]+>/g, '').trim() || ''
  );
  const oneLineInfo_en = acf.one_line_info_en
    ? decode(acf.one_line_info_en)
    : oneLineInfo_ko;
  const oneLineInfo_jp = acf.one_line_info_jp
    ? decode(acf.one_line_info_jp)
    : oneLineInfo_ko;

    let yearFromCategory: number | undefined =
    typeof (post as any).work_year === 'number'
      ? (post as any).work_year
      : undefined;

  if (yearFromCategory === undefined) {
    const terms = post._embedded?.['wp:term'];

    if (terms) {
      for (const taxonomyTerms of terms) {
        if (
          taxonomyTerms.length > 0 &&
          taxonomyTerms[0].taxonomy === 'work_category'
        ) {
          taxonomyTerms.forEach((t: any) => {
            const name = t.name;
            if (/^\d{4}/.test(name)) {
              const match = name.match(/^(\d{4})/);
              if (match) {
                yearFromCategory = parseInt(match[1], 10);
              }
            }
          });
          break;
        }
      }
    }
  }

  const yearCaption_ko = acf.year_caption_ko || acf.year_caption || '';
  const yearCaption_en = acf.year_caption_en || yearCaption_ko;
  const yearCaption_jp = acf.year_caption_jp || yearCaption_ko;

  const commission_ko = acf.commission_ko || acf.commission || '';
  const commission_en = acf.commission_en || commission_ko;
  const commission_jp = acf.commission_jp || commission_ko;

  const credits_ko = acf.credits_ko || acf.credits || '';
  const credits_en = acf.credits_en || credits_ko;
  const credits_jp = acf.credits_jp || credits_ko;

  const additional_ko = acf.work_additional_ko || '';
  const additional_en = acf.work_additional_en || additional_ko;
  const additional_jp = acf.work_additional_jp || additional_ko;

  const medium = acf['작품_medium'] || '';
  const medium_ko = medium;
  const medium_en = medium;
  const medium_jp = medium;

  const rawCategory = acf['카테고리'] || '';
  const workCategory =
    typeof rawCategory === 'string'
      ? rawCategory
      : Array.isArray(rawCategory)
      ? rawCategory.join(', ')
      : rawCategory?.label || String(rawCategory);

    // EN/JP 대표 이미지
  // 1순위: Code Snippets로 REST에 추가한 thumbnail_en / thumbnail_jp
  // 2순위: 과거 ACF EN_image / JP_image
  const restThumbnailEn =
    typeof (post as any).thumbnail_en === 'string'
      ? getFullSizeUrl((post as any).thumbnail_en)
      : '';

  const restThumbnailJp =
    typeof (post as any).thumbnail_jp === 'string'
      ? getFullSizeUrl((post as any).thumbnail_jp)
      : '';

  const enImageRaw = acf.EN_image || acf.en_image || acf['EN_image'];
  const jpImageRaw = acf.JP_image || acf.jp_image || acf['JP_image'];

  const acfThumbnailEn = enImageRaw
    ? getFullSizeUrl(
        typeof enImageRaw === 'string'
          ? enImageRaw
          : enImageRaw.url ||
              enImageRaw.sizes?.large ||
              enImageRaw.sizes?.full ||
              ''
      )
    : '';

  const acfThumbnailJp = jpImageRaw
    ? getFullSizeUrl(
        typeof jpImageRaw === 'string'
          ? jpImageRaw
          : jpImageRaw.url ||
              jpImageRaw.sizes?.large ||
              jpImageRaw.sizes?.full ||
              ''
      )
    : '';

  const thumbnail_en = restThumbnailEn || acfThumbnailEn || undefined;
  const thumbnail_jp = restThumbnailJp || acfThumbnailJp || undefined;

  let youtubeUrl: string | undefined;
  if ((post as any).acf?.youtube_url) {
    youtubeUrl = (post as any).acf.youtube_url;
  } else if ((post as any).meta?.youtube_url) {
    youtubeUrl = (post as any).meta.youtube_url;
  }

  let vimeoUrl: string | undefined;
  if ((post as any).acf?.vimeo_url) {
    vimeoUrl = (post as any).acf.vimeo_url;
  } else if ((post as any).meta?.vimeo_url) {
    vimeoUrl = (post as any).meta.vimeo_url;
  }

  let relatedArticles: Work['relatedArticles'] = undefined;
  if (
    (post as any).acf?.related_texts &&
    Array.isArray((post as any).acf.related_texts) &&
    (post as any).acf.related_texts.length > 0
  ) {
    relatedArticles = (post as any).acf.related_texts
      .map((item: any) => {
        if (typeof item === 'number') {
          const embeddedPosts = post._embedded?.['acf:post'];
          if (embeddedPosts && Array.isArray(embeddedPosts)) {
            const textPost = embeddedPosts.find((p: any) => p.id === item);
            if (textPost) {
              return {
                id: String(textPost.id),
                title: textPost.title?.rendered
                  ? decode(textPost.title.rendered)
                  : 'Untitled',
                author: 'Ji Hyun Jung',
                summary: textPost.excerpt?.rendered
                  ? decode(
                      textPost.excerpt.rendered.replace(/<[^>]+>/g, '').trim()
                    )
                  : '',
                thumbnail: textPost._embedded?.['wp:featuredmedia']?.[0]?.source_url
                  ? getFullSizeUrl(
                      textPost._embedded['wp:featuredmedia'][0].source_url
                    )
                  : '',
                link: textPost.link || '',
              };
            }
          }
          return {
            id: String(item),
            title: '',
            author: 'Ji Hyun Jung',
            summary: '',
            thumbnail: '',
            link: '',
          };
        } else {
          const textTitle = item.title?.rendered
            ? decode(item.title.rendered)
            : item.post_title || item.title || 'Untitled';

          const textSummary = item.excerpt?.rendered
            ? decode(item.excerpt.rendered.replace(/<[^>]+>/g, '').trim())
            : item.post_excerpt || '';

          const textThumbnail = item._embedded?.['wp:featuredmedia']?.[0]?.source_url
            ? getFullSizeUrl(item._embedded['wp:featuredmedia'][0].source_url)
            : '';

          const textId = item.ID || item.id || '';
          const textLink = item.guid?.rendered || item.link || item.url || '';

          return {
            id: String(textId),
            title: textTitle,
            author: 'Ji Hyun Jung',
            summary: textSummary,
            thumbnail: textThumbnail,
            link: textLink,
          };
        }
      })
      .filter((article: any) => article && article.id);
  }

  if (!featuredImage) {
    const firstImageFromContent = extractImagesFromContent(post.content?.rendered || '')[0];
    if (firstImageFromContent) {
      featuredImage = firstImageFromContent;
    }
  }

  return {
    id: String(post.id),

    title_ko,
    title_en,
    title_jp,

    year: yearFromCategory || new Date(post.date).getFullYear(),

    yearCaption_ko: yearCaption_ko || undefined,
    yearCaption_en: yearCaption_en || undefined,
    yearCaption_jp: yearCaption_jp || undefined,

    medium_ko,
    medium_en,
    medium_jp,

    thumbnail: featuredImage,
    thumbnail_en: thumbnail_en || undefined,
    thumbnail_jp: thumbnail_jp || undefined,

    oneLineInfo_ko,
    oneLineInfo_en,
    oneLineInfo_jp,

    description_ko: '',
    description_en: '',
    description_jp: '',

    commission_ko: commission_ko || undefined,
    commission_en: commission_en || undefined,
    commission_jp: commission_jp || undefined,

    credits_ko: credits_ko || undefined,
    credits_en: credits_en || undefined,
    credits_jp: credits_jp || undefined,

    additional_ko: additional_ko || undefined,
    additional_en: additional_en || undefined,
    additional_jp: additional_jp || undefined,

    galleryImages: featuredImage ? [featuredImage] : [],
    imageCredits: undefined,
    category: workCategory || undefined,
    youtubeUrl,
    vimeoUrl,
    content_rendered: undefined,
    content_en: undefined,
    content_jp: undefined,
    gallery_image_map: undefined,
    relatedArticles,
    selected: false,
    order: 0,
  };
};

export const fetchWorks = async (): Promise<Work[]> => {
  try {
    const perPage = 100;
    let page = 1;
    let allPosts: WPPost[] = [];
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await api.get('/work', {
        params: {
          per_page: perPage,
          page,
        },
      });

      const posts = response.data as WPPost[];
      const totalPagesHeader = response.headers['x-wp-totalpages'];
      totalPages = totalPagesHeader ? Number(totalPagesHeader) : 1;

      allPosts = [...allPosts, ...posts];
      page += 1;
    }

    const works = allPosts.map((post: WPPost, index: number) => {
      const work = transformWorkListItem(post);

      return {
        ...work,
        order: index + 1,
      };
    });

    return works;
  } catch (error) {
    console.error('fetchWorks ERROR:', error);
    return [];
  }
};

export const fetchWorkById = async (
  id: string,
  lang: 'ko' | 'en' | 'jp' = 'ko'
): Promise<Work | null> => {
  const cacheKey = makeWorkDetailCacheKey(id, lang);

  if (workDetailCache.has(cacheKey)) {
    return workDetailCache.get(cacheKey)!;
  }

  console.log('[fetchWorkById] cache miss:', cacheKey);

  try {
    const response = await api.get(`/work/${id}`, {
      params: { _embed: 1 },
    });

    const rawWork = response.data;

    const fetchedWork = await transformWork(rawWork, lang);

    workDetailCache.set(cacheKey, fetchedWork);

    return fetchedWork;
  } catch (error) {
    console.error(`[fetchWorkById] Error fetching work by id ${id}:`, error);
    return null;
  }
};

export const fetchTexts = async (
  lang: string = 'ko'
): Promise<TextItem[]> => {
  try {
    const response = await api.get('/text', {
      params: {
        _embed: 1,
        per_page: 100,
      },
    });

    return await Promise.all(response.data.map(transformText));
  } catch (error) {
    console.error(`Error fetching texts:`, error);
    return [];
  }
};

export const fetchTextById = async (id: string): Promise<TextItem | null> => {
  try {
    const response = await api.get(`/text/${id}`, {
      params: {
        _embed: 1,
      },
    });
    return await transformText(response.data);
  } catch (error) {
    console.error(`Error fetching text by id ${id}:`, error);
    return null;
  }
};

export const fetchAboutPage = async (): Promise<AboutData | null> => {
  try {
    const response = await api.get('/pages', {
  params: {
    slug: 'about',
    _embed: 1,
  },
});

if (response.data.length === 0) return null;

    const page = response.data[0];
    const featuredImage = page._embedded?.['wp:featuredmedia']?.[0]?.source_url
      ? getFullSizeUrl(page._embedded['wp:featuredmedia'][0].source_url)
      : '';

    const acf = page.acf || {};
    const contactGroup = acf.contact_info || {};

    // EN content: Try single WYSIWYG field first (about_en), fallback to section-based approach
    let content_en: string | undefined;
    if (acf['about_en']) {
      content_en = acf['about_en'];
    } else {
      const enSections = [
        { header: 'Education', content: acf['about_en_약력'] },
        { header: 'Solo Exhibitions', content: acf['about_en_개인전'] },
        { header: 'Group Exhibitions', content: acf['about_en_단체전'] },
        {
          header: 'Awards & Residencies',
          content: acf['about_en_수상경력_및_레지던스'],
        },
        { header: 'Projects', content: acf['about_en_프로젝트'] },
        { header: 'Publications', content: acf['about_en_출판'] },
      ];
      const hasEnContent = enSections.some((s) => s.content);
      content_en = hasEnContent
        ? enSections
            .filter((s) => s.content)
            .map((s) => `<h2>${s.header}</h2>\n<p>${s.content}</p>`)
            .join('\n')
        : undefined;
    }

    // JP content: Try single WYSIWYG field first (About_jp), fallback to section-based approach
    let content_jp: string | undefined;
    if (acf['About_jp']) {
      content_jp = acf['About_jp'];
    } else {
      const jpSections = [
        { header: '학력', content: acf['about_jp_약력'] },
        { header: '개전', content: acf['about_jp_개인전'] },
        { header: '그룹전', content: acf['about_jp_단체전'] },
        {
          header: '수상이력・레지던스',
          content: acf['about_jp_수상경력_및_레지던스'],
        },
        { header: '프로젝트', content: acf['about_jp_프로젝트'] },
        { header: '출판', content: acf['about_jp_출력'] },
      ];
      const hasJpContent = jpSections.some((s) => s.content);
      content_jp = hasJpContent
        ? jpSections
            .filter((s) => s.content)
            .map((s) => `<h2>${s.header}</h2>\n<p>${s.content}</p>`)
            .join('\n')
        : undefined;
    }

    return {
      title: decode(page.title.rendered),
      name: acf.name || '',
      content: page.content.rendered,
      content_en,
      content_jp,
      image: featuredImage,
      profile_info: acf.profile_info || acf.profile_text?.profile_info || '',
      profile_info_ko: acf.profile_info_ko || '',
      profile_info_en: acf.profile_info_en || '',
      profile_info_jp: acf.profile_info_jp || '',
      profile_info2: acf.profile_info2 || '',
      contact: {
        email: acf.email || contactGroup.email || '',
        instagram: acf.instagram || contactGroup.instagram || '',
        website: acf.website || contactGroup.website || '',
      },
    };
  } catch (error) {
    console.error('Error fetching About page:', error);
    return null;
  }
};

export const fetchHistoryItems = async (): Promise<HistoryItem[]> => {
  try {
    const response = await api.get('/history_item', {
      params: {
        per_page: 100,
        _embed: 1,
      },
    });

    const items = response.data.map(transformHistoryItem);

    return items.sort((a: HistoryItem, b: HistoryItem) => {
      const yearA = parseInt(a.year) || 0;
      const yearB = parseInt(b.year) || 0;
      if (yearA !== yearB) return yearB - yearA;
      return 0;
    });
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return [];
    }
    console.error('Error fetching history items:', error);
    return [];
  }
};

// Helper to convert WordPress HTML to paragraph-separated text
// Preserves inline formatting (strong, b, em, i, u, a) for dangerouslySetInnerHTML rendering
// Block-level boundaries become \n\n separators for paragraph splitting
const stripHtmlToText = (html: string): string => {
  let text = html;
  text = text.replace(
    /<\/(?:p|div|blockquote|h[1-6]|li|figcaption|section|article)>/gi,
    '\n\n'
  );
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(
    /<(?:p|div|blockquote|h[1-6]|li|figcaption|section|article|ul|ol|figure|img|iframe|video|source)(?:\s[^>]*)?\/?>/gi,
    ''
  );
  text = text.replace(/<\/(?:ul|ol|figure|iframe|video|source)>/gi, '');
  text = text.replace(
    /<(?!\/?(?:strong|b|em|i|u|mark|a|span|sup|sub)\b)[^>]+>/gi,
    ''
  );
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
};

export const fetchMainIndexPage = async (
  lang: 'ko' | 'en' | 'jp'
): Promise<MainIndexPageData> => {
  try {
    const res = await api.get('/pages', {
      params: {
        slug: 'main-index',
        _embed: true,
      },
    });

    const page = res.data?.[0];
    if (!page) return { slides: [] };

    const content = page.content?.rendered || '';

    const images = extractImagesFromContent(content);

    const slides = images.map((url) => ({
      image: url,
      title: '',
      info: '',
    }));

    return { slides };

  } catch (error) {
    console.error('fetchMainIndexPage error:', error);
    return { slides: [] };
  }
};