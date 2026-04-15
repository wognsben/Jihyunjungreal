import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorks } from '@/contexts/WorkContext';
import { fetchTextById } from '@/services/wp-api';
import { TextItem } from '@/data/texts';
import { getLocalizedThumbnail } from '@/utils/getLocalizedImage';
import { toCdnUrl } from '@/utils/toCdnUrl';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { BlockRenderer } from '@/app/components/BlockRenderer';

interface TextDetailProps {
  textId: string | null;
  isPage?: boolean;
  isPopup?: boolean;
}

const extractFirstImageFromHtml = (html: string): string => {
  if (!html) return '';

  const match = html.match(/<img[^>]+src="([^">]+)"/i);
  return match?.[1]?.trim() || '';
};

const getLocalizedWorkPreviewImage = (work: any, lang: string): string => {
  const koContent = work.content_rendered || '';

  const localizedContent =
    lang === 'en'
      ? (work.content_en?.trim() || koContent)
      : lang === 'jp'
      ? (work.content_jp?.trim() || koContent)
      : koContent;

  const firstImage = extractFirstImageFromHtml(localizedContent);

  if (firstImage) return toCdnUrl(firstImage);

  return getLocalizedThumbnail(work, lang) || '';
};

const cleanText = (text: string) => {
  if (!text) return '';
  return text
    .replace(/&nbsp;/g, '\u00a0')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"');
};

const sanitizeHtml = (html: string): string => {
  if (!html) return '';

  let sanitized = html.replace(
    /<a\s+([^>]*)>([\s\S]*?)<\/a>/gi,
    (_match, attrs, content) => {
      const hrefMatch = attrs.match(/href=["']([^"']*)["']/);
      const href = hrefMatch ? hrefMatch[1] : '#';

      // 외부 링크만 새창
      if (href.startsWith('http') || href.startsWith('//')) {
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${content}</a>`;
      }

      // 내부 링크 / footnote 는 target 제거
      return `<a href="${href}">${content}</a>`;
    }
  );

  sanitized = sanitized.replace(
    /<(?!\/?(?:a|strong|b|em|i|u|mark|span|sup|sub)\b)[^>]+>/gi,
    ''
  );

  return sanitized;
};

const stripHtmlToText = (html: string) => {
  if (!html) return '';

  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const TextDetail = ({ textId, isPage = false, isPopup = false }: TextDetailProps) => {
  const { lang } = useLanguage();
  const { texts, works, translateTextsByIds, currentLang } = useWorks();

  const [localText, setLocalText] = useState<TextItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contextText = texts.find((t) => t.id === textId);

  useEffect(() => {
    if (!textId) return;

    if (contextText) {
      setLocalText(contextText);
      setLoading(false);
      return;
    }

    const loadSingleText = async () => {
      setLoading(true);
      setError(null);

      try {
        const fetched = await fetchTextById(textId);
        if (fetched) {
          setLocalText(fetched);
        } else {
          setError('Text not found on server');
        }
      } catch (_err) {
        setError('Failed to load text');
      } finally {
        setLoading(false);
      }
    };

    loadSingleText();
  }, [textId, contextText]);

  const text = localText;

  useEffect(() => {
    if (textId && lang !== 'ko' && lang !== currentLang && contextText) {
      translateTextsByIds([textId], lang);
    }
  }, [textId, lang, currentLang, contextText, translateTextsByIds]);

    const title = text?.title?.[lang]?.trim() || '';
  const content = text?.content?.[lang]?.trim() || '';
  const rawHtml = text?.contentHtml?.[lang]?.trim() || '';
  const rawHtmlText = stripHtmlToText(rawHtml);

  // 상세페이지 필드는 모두 WYSIWYG 기준으로 처리
  const hasLangContent = !!rawHtmlText;

  // 현재 언어에 실제 본문이 있는지 판정
  const hasLocalizedContent = !!rawHtmlText;

  useEffect(() => {
    if (loading) return;
    if (!text) return;

    if (!hasLocalizedContent) {
      window.location.hash = '#/text';
    }
  }, [loading, text, hasLocalizedContent]);

  const handleContentClick = (e: React.MouseEvent) => {
  const target = e.target as HTMLElement;
  const anchor = target.closest('a') as HTMLAnchorElement | null;

  if (!anchor) return;

  const href = anchor.getAttribute('href') || '';

  // ============================================================
  // 핵심: 각주 처리 완전히 BlockRenderer에 맡김
  // ============================================================

  const isFootnoteHash = (value: string) => {
    return (
      value.startsWith('#footnote') ||
      value.startsWith('#fn') ||
      value.startsWith('#note') ||
      value.startsWith('#_ftn') ||
      value.startsWith('#_edn') ||
      value.startsWith('#fnref') ||
      value.startsWith('#footnote-ref') ||
      /^#\d+$/.test(value)
    );
  };

  // 각주 관련 링크는 여기서 절대 건드리지 않음
  if (href.startsWith('#') && isFootnoteHash(href)) {
    return;
  }

  // ============================================================
  // 외부 링크 처리
  // ============================================================

  if (href.startsWith('http') || href.startsWith('//')) {
    try {
      const url = new URL(href);

      // 내부 hash 이동은 BlockRenderer가 처리하도록 넘김
      if (url.origin === window.location.origin && url.hash) {
        return;
      }
    } catch {
      return;
    }

    return;
  }

  // 라우터 링크 그대로
  if (href.startsWith('#/')) return;

  // ============================================================
  // 일반 anchor (#section 등)만 처리
  // ============================================================

  if (href.startsWith('#')) {
    const id = href.replace(/^#/, '');

    const el = document.getElementById(id);

    if (el) {
      e.preventDefault();
      e.stopPropagation();

      el.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }
};

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-pulse text-xs tracking-[0.2em] uppercase opacity-50">
          Loading from Archive...
        </div>
      </div>
    );
  }

  if (!text) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <h1 className="text-lg font-light">Content Unavailable</h1>
        <p className="text-[10px] text-muted-foreground font-[var(--font-ui)]">ID: {textId}</p>
        {error && <p className="text-[10px] text-red-400/50">{error}</p>}
      </div>
    );
  }

  if (!hasLocalizedContent) {
    return null;
  }

    const useBlockRenderer = hasLangContent;

  const paragraphs =
    !useBlockRenderer && content
      ? (() => {
          const doubleNewlineSplit = content.split('\n\n').filter((p) => p.trim());
          if (doubleNewlineSplit.length > 1) return doubleNewlineSplit;

          const singleNewlineSplit = content.split('\n').filter((p) => p.trim());
          if (singleNewlineSplit.length > 1) return singleNewlineSplit;

          return doubleNewlineSplit;
        })()
      : [];

  const reverseRelatedWorks = works
    .filter((work) => work.relatedArticles?.some((article) => article.id === textId))
    .map((work) => {
      const workTitle =
        lang === 'en' ? work.title_en : lang === 'jp' ? work.title_jp : work.title_ko;

      return {
        id: work.id,
        slug: work.slug,
        title: workTitle || work.title_ko,
        thumbnail: getLocalizedWorkPreviewImage(work, lang),
        year: String(work.year),
      };
    });

  const mergedRelatedWorks = text
    ? [...(text.relatedWorks || []), ...reverseRelatedWorks].filter(Boolean)
    : [];

  const allRelatedWorks = mergedRelatedWorks.filter((work, index, self) => {
    const currentKey =
      work?.id ?? work?.slug ?? work?.title ?? `related-${index}`;

    return (
      index ===
      self.findIndex((w) => {
        const compareKey = w?.id ?? w?.slug ?? w?.title;
        return compareKey === currentKey;
      })
    );
  });

  return (
  <div className="relative w-full h-full bg-background text-foreground overflow-y-auto selection:bg-foreground/10 custom-scrollbar">
    {!isPopup && (
      <div className="hidden min-[1320px]:block fixed top-32 left-8 z-40 mix-blend-difference text-white dark:text-white">
        <button
          onClick={() => window.history.back()}
          className="hidden min-[1320px]:flex group items-center gap-3 px-4 py-2 bg-transparent focus:outline-none"
        >
          <ArrowLeft className="w-3 h-3 transition-transform duration-300 group-hover:-translate-x-0.5 opacity-[0.80]" />
          <span className="text-[10px] tracking-[0.08em] lowercase font-[var(--font-ui)] opacity-[0.78]">
            back
          </span>
        </button>
      </div>
    )}

    <div
      className={`px-10 md:px-8 pb-12 max-w-[1000px] mx-auto ${
        isPopup ? 'pt-10 md:pt-12' : 'pt-28 md:pt-32'
      }`}
    >
        <article>
          <header className="mb-10 md:mb-10 space-y-6 max-w-5xl mx-auto text-center">
            <div className="flex items-center justify-center text-[10px] tracking-[0.08em] lowercase text-muted-foreground/80 font-[var(--font-ui)]">
              <div className="flex items-center gap-3">
                <span className="font-[var(--font-ui)]">{text.category.toLowerCase()}</span>
                <span className="opacity-30">/</span>
                <span>{text.year}</span>
              </div>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`
  font-normal /* textdetail-타이틀 굵기*/
  tracking-[-0.01em]
  text-foreground/88
  leading-[1.35]
  text-center
  text-[18px] md:text-[20px] lg:text-[24px]
  ${
    lang === 'jp'
      ? 'font-[var(--font-body-jp)]'
      : lang === 'en'
      ? 'font-[var(--font-body-en)]'
      : 'font-[var(--font-body-ko)]'
  }
`}
            >
              {cleanText(title)}
            </motion.h1>

            {text.image && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                className="relative w-full aspect-[2/1] rounded-sm overflow-hidden bg-foreground/5 mt-6"
              >
                <img
                  src={text.image}
                  alt={title}
                  className="w-full h-full object-cover grayscale opacity-90 hover:grayscale-0 hover:opacity-100 transition-all duration-700"
                />
              </motion.div>
            )}

            <div className="h-px w-full bg-foreground/5 mt-6" />
          </header>

          <div className="space-y-6">
            {useBlockRenderer ? (
              <div onClick={handleContentClick}>
                <BlockRenderer html={rawHtml} lang={lang} compact />
              </div>
            ) : (
              paragraphs.map((paragraph, index) => (
                <motion.p
                  key={index}
                  onClick={handleContentClick}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.3 + index * 0.1,
                    ease: 'easeOut',
                  }}
                  className={`text-sm md:text-[0.95rem] leading-[1.8] text-foreground/80 text-justify [&_a]:text-foreground/60 [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-foreground/20 [&_a]:transition-all [&_a]:duration-300 hover:[&_a]:text-foreground/90 hover:[&_a]:decoration-foreground/40 ${
  lang === 'jp'
    ? 'font-[var(--font-body-jp)]'
    : lang === 'en'
    ? 'font-[var(--font-body-en)]'
    : 'font-[var(--font-body-ko)]'
}`}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(paragraph) }}
                />
              ))
            )}
          </div>

          {allRelatedWorks.length > 0 && (
            <div className="mt-16 pt-12 border-t border-foreground/5">
              <h2 className="text-[12px] lowercase tracking-[0.2em] text-muted-foreground/60 font-[var(--font-ui)] mb-8">
                related
              </h2>

              {allRelatedWorks.length <= 3 ? (
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-8">
                  {allRelatedWorks.map((work, index) => {
                    const itemKey =
                      work?.id ?? work?.slug ?? work?.title ?? `related-${index}`;
                    const itemHref = work?.id ?? work?.slug ?? '';

                    return (
                      <a
                        href={`#/work/${itemHref}`}
                        key={itemKey}
                        className="group block w-[calc(50%_-_8px)] md:w-[calc(33.333%_-_11px)] lg:w-[calc(25%_-_12px)]"
                      >
                        <div className="aspect-[4/3] bg-foreground/5 mb-3 overflow-hidden">
                          {work.thumbnail ? (
                            <img
                              src={work.thumbnail}
                              alt={work.title}
                              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500 ease-out"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-foreground/5 text-muted-foreground/30 text-[8px]">
                              NO IMAGE
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div
  className={`text-[11px] leading-tight group-hover:underline underline-offset-4 decoration-foreground/30 ${
    lang === 'jp'
      ? 'font-[var(--font-body-jp)]'
      : lang === 'en'
      ? 'font-[var(--font-body-en)]'
      : 'font-[var(--font-body-ko)]'
  }`}
>
  {cleanText(work.title)}
</div>
                          <div className="text-[10px] text-muted-foreground/60 font-[var(--font-ui)]">
  <span>{work.year}</span>
</div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="grid w-full grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
                  {allRelatedWorks.map((work, index) => {
                    const itemKey =
                      work?.id ?? work?.slug ?? work?.title ?? `related-${index}`;
                    const itemHref = work?.id ?? work?.slug ?? '';

                    return (
                      <a
                        href={`#/work/${itemHref}`}
                        key={itemKey}
                        className="group block"
                      >
                        <div className="aspect-[4/3] bg-foreground/5 mb-3 overflow-hidden">
                          {work.thumbnail ? (
                            <img
                              src={work.thumbnail}
                              alt={work.title}
                              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500 ease-out"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-foreground/5 text-muted-foreground/30 text-[8px]">
                              NO IMAGE
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
  <div
    className={`text-[11px] leading-tight group-hover:underline underline-offset-4 decoration-foreground/30 ${
      lang === 'jp'
        ? 'font-[var(--font-body-jp)]'
        : lang === 'en'
        ? 'font-[var(--font-body-en)]'
        : 'font-[var(--font-body-ko)]'
    }`}
  >
    {cleanText(work.title)}
  </div>
  <div className="text-[10px] text-muted-foreground/60 font-[var(--font-ui)]">
    <span>{work.year}</span>
  </div>
</div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          
        </article>
      </div>
    
    </div>
  );
};

export default TextDetail;