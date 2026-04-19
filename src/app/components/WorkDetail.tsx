import React, { useRef, useState, useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Resizable } from 're-resizable';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorks } from '@/contexts/WorkContext';
import { fetchWorkById } from '@/services/wp-api';
import { SeoHead } from '@/app/components/seo/SeoHead';
import { getLocalizedThumbnail } from '@/utils/getLocalizedImage';
import { ScrollToTop } from '@/app/components/ui/ScrollToTop';
import { InfiniteWorkGrid } from '@/app/components/InfiniteWorkGrid';
import { TextDetail } from '@/app/components/TextDetail';
import { BlockRenderer } from '@/app/components/BlockRenderer';
import { toCdnUrl } from '@/utils/toCdnUrl';

interface WorkDetailProps {
  workId: string | null;
  shouldRestoreGrid: boolean;
}

const cleanText = (text: string) => {
  if (!text) return '';

  return text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>\s*<p[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[caption[^\]]*\]|\[\/caption\]/gi, ' ')
    .replace(/caption:\s*id=["']?[^"' \]]+["']?/gi, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#038;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
};

const cleanTitleText = (text: string) => {
  if (!text) return '';

  return text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>\s*<p[^>]*>/gi, ' ')
    .replace(/\[caption[^\]]*\]|\[\/caption\]/gi, ' ')
    .replace(/caption:\s*id=["']?[^"' \]]+["']?/gi, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#038;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
};

export const WorkDetail = ({
  workId,
  shouldRestoreGrid,
}: WorkDetailProps) => {
  const { lang } = useLanguage();
  const { works, texts, translateWorksByIds, currentLang } = useWorks();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const dragState = useRef<{
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  // Floating Text Window State
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [hoveredArticleId, setHoveredArticleId] = useState<string | null>(null);
  const [hoveredArticleImg, setHoveredArticleImg] = useState<string | null>(null);
  const cursorImgRef = useRef<HTMLDivElement>(null);
  const [localWork, setLocalWork] = useState<any | null>(null);
  const [loadingWork, setLoadingWork] = useState(false);
  const [loadWorkError, setLoadWorkError] = useState<string | null>(null);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Hide global header and lock body scroll when popup is open
  useEffect(() => {
    if (selectedArticleId) {
      const header = document.querySelector('header');
      if (header) {
        (header as HTMLElement).style.display = 'none';
      }

      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px';
    } else {
      const header = document.querySelector('header');
      if (header) {
        (header as HTMLElement).style.display = '';
      }

      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      const header = document.querySelector('header');
      if (header) {
        (header as HTMLElement).style.display = '';
      }
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [selectedArticleId]);

  useEffect(() => {
    if (workId && lang !== 'ko' && lang !== currentLang) {
    }
  }, [workId, lang, currentLang, translateWorksByIds]);

  // Cursor Follower Logic for Text List
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!cursorImgRef.current || !hoveredArticleImg) return;
      const { clientX, clientY } = e;
      cursorImgRef.current.animate(
        {
          transform: `translate(${clientX + 40}px, ${clientY + 40}px)`,
        },
        {
          duration: 800,
          fill: 'forwards',
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }
      );
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    return () => window.removeEventListener('mousemove', handleWindowMouseMove);
  }, [hoveredArticleImg]);

  const contextWork = works.find((w) => w.id === workId);
  const work = localWork || contextWork;

  useEffect(() => {

    if (!workId) {
      setLocalWork(null);
      setLoadingWork(false);
      setLoadWorkError(null);
      return;
    }

    const hasFullWorkContent = !!(
      contextWork?.content_rendered ||
      contextWork?.content_en ||
      contextWork?.content_jp
    );

    if (hasFullWorkContent && contextWork) {
      setLocalWork(contextWork);
      setLoadingWork(false);
      setLoadWorkError(null);
      return;
    }

    const loadSingleWork = async () => {
      setLocalWork(null);
      setLoadingWork(true);
      setLoadWorkError(null);

      try {
        const fetched = await fetchWorkById(workId, lang);

        if (fetched) {
          console.log('[WorkDetail/loadSingleWork] setLocalWork(fetched)');
          setLocalWork(fetched);
        } else {
          console.log('[WorkDetail/loadSingleWork] fetched is null');
          setLoadWorkError('Work not found on server');
        }
      } catch (err) {
        console.error('[WorkDetail/loadSingleWork] error:', err);
        setLoadWorkError('Failed to load work');
      } finally {
        console.log('[WorkDetail/loadSingleWork] finally -> setLoadingWork(false)');
        setLoadingWork(false);
      }
    };

    loadSingleWork();
  }, [workId, contextWork, lang]);

  // ESC Key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedArticleId) setSelectedArticleId(null);
        else window.history.back();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [selectedArticleId]);

          if (loadWorkError && !work) {

    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-lg font-light">Content Unavailable</h1>
          <p className="text-[10px] text-muted-foreground font-mono mt-2">
            ID: {workId}
          </p>
          <p className="text-[10px] text-red-400/60 mt-2">{loadWorkError}</p>
        </div>
      </div>
    );
  }

    if (!work) {

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  const handleClose = () => {
    window.history.back();
  };

  const handleWorkClick = (clickedWorkId: number) => {
    window.location.hash = `#/work/${clickedWorkId}`;
  };

  const title =
    lang === 'ko' ? work.title_ko : lang === 'jp' ? work.title_jp : work.title_en;

  // 핵심: wp-api.ts에서 가공된 언어별 HTML만 사용
  const getLocalizedContent = () => {
    const koContent = work.content_rendered || '';

    if (lang === 'ko') {
      return koContent;
    }

    if (lang === 'en') {
      return work.content_en?.trim() || koContent;
    }

    if (lang === 'jp') {
      return work.content_jp?.trim() || koContent;
    }

    return koContent;
  };

  const localizedContent = getLocalizedContent();

  // Filter out current work from "Other Works"
  const otherWorks = works.filter((w) => w.id !== workId);

  return (
    <>
      <div className="min-h-screen bg-background selection:bg-black/10 selection:text-black dark:selection:bg-white/20 dark:selection:text-white">
        <SeoHead
          title={work.title_en}
          description={work.description_en ? work.description_en.slice(0, 160) : undefined}
          image={toCdnUrl(getLocalizedThumbnail(work, lang))}
        />

{/* Content Container */}
<div className="pt-32 md:pt-40 px-6 md:px-12 pb-6 max-w-[1000px] mx-auto">

          {/* Back Button - desktop (match TextDetail vertical position) */}
<div className="hidden min-[1320px]:block fixed top-32 left-8 z-40 mix-blend-difference text-white dark:text-white">
  <button
    ref={buttonRef}
    onClick={handleClose}
    className="hidden min-[1320px]:flex group items-center gap-3 px-4 py-2 bg-transparent focus:outline-none"
  >
    <ArrowLeft className="w-3 h-3 transition-transform duration-300 group-hover:-translate-x-0.5 opacity-[0.78]" />
    <span className="text-[10px] tracking-[0.08em] lowercase font-[var(--font-ui)] opacity-[0.78]">
      back
    </span>
  </button>
</div>

{/* 1. Header Spec Sheet */}
<div className="mb-16 md:mb-24 min-[1025px]:mb-32">
  <div className="max-w-4xl mx-auto">
    {/* Classic Gallery Caption: Title, Year */}
    <div className="text-center pb-4 md:pb-8 min-[1025px]:pb-10 border-b border-black/5 dark:border-white/10">
      <h1
  className={`text-[18px] md:text-[20px] lg:text-[24px] font-normal tracking-[-0.01em] text-foreground/88 leading-[1.35] ${
    lang === 'jp'
      ? 'font-[var(--font-body-jp)]'
      : lang === 'en'
      ? 'font-[var(--font-body-en)]'
      : 'font-[var(--font-body-ko)]'
  }`}
>
  {cleanTitleText(title)}
  {work.year && `, ${work.year}`}
</h1>
    </div>

    {/* Metadata - Commission only */}
    <div className="text-center mt-4 md:mt-6">
      {(() => {
        const commission =
          lang === 'ko'
            ? work.commission_ko
            : lang === 'jp'
            ? work.commission_jp
            : work.commission_en;

        if (commission) {
          return (
            <div
              className={`text-[13px] md:text-[14px] leading-[1.6] tracking-[0em] text-foreground/68 ${
                lang === 'jp'
                  ? 'font-[var(--font-body-jp)]'
                  : lang === 'en'
                  ? 'font-[var(--font-body-en)]'
                  : 'font-[var(--font-body-ko)]'
              }`}
            >
              {cleanText(commission)}
            </div>
          );
        }
        return null;
      })()}

      {(() => {
        const yearCaption =
          lang === 'ko'
            ? work.yearCaption_ko
            : lang === 'jp'
            ? work.yearCaption_jp
            : work.yearCaption_en;

        if (!yearCaption) return null;

        return (
          <p
            className={`mt-3 text-[10px] md:text-[11px] leading-[1.5] tracking-[0.02em] text-muted-foreground/52 ${
              lang === 'jp'
                ? 'font-[var(--font-body-jp)]'
                : lang === 'en'
                ? 'font-[var(--font-body-en)]'
                : 'font-[var(--font-body-ko)]'
            }`}
          >
            {cleanText(yearCaption)}
          </p>
        );
      })()}
    </div>
  </div>
</div>
  
          {/*이미지,슬라이더에 여백 수정가능*/}
          {/* Block Content: 언어별 HTML 하나만 선택해서 그대로 렌더 */}
          {localizedContent && (
            <div className="mb-4 md:mb-6 min-[1025px]:mb-8">
              <BlockRenderer html={localizedContent} lang={lang} />
            </div>
          )}

          {/* 4.5 Additional Text (Artist Notes / Supplementary Description) */}
          {(() => {
            const additional =
              lang === 'ko'
                ? work.additional_ko
                : lang === 'jp'
                ? work.additional_jp
                : work.additional_en;

            if (!additional) return null;

            return (
              <div className="mb-16 md:mb-48 min-[1025px]:mb-64">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
                  {/* Left: Section Label */}
                  <div className="md:col-span-3 min-[1025px]:col-span-3">
                    <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 sticky top-40 font-[var(--font-ui)]">
                      {lang === 'ko' ? 'Artist Note' : lang === 'jp' ? 'Artist Note' : 'Artist Note'}
                    </h2>
                  </div>

                  {/* Right: Content */}
                  <div className="md:col-span-8 md:col-start-5 min-[1025px]:col-span-7 min-[1025px]:col-start-5">
                    <div className="space-y-6 md:space-y-8">
                      {additional.split('\n\n').map((paragraph, index) => (
                        <p
                          key={`additional-${lang}-${index}`}
                          className={`${
  lang === 'jp'
    ? 'font-[var(--font-body-jp)]'
    : lang === 'en'
    ? 'font-[var(--font-body-en)]'
    : 'font-[var(--font-body-ko)]'
} text-foreground/80 text-sm md:text-base leading-[1.8] opacity-80`}
                        >
                          <span dangerouslySetInnerHTML={{ __html: paragraph.trim() }} />
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 5. Credits / Artist Notes / Additional Information */}
          {(() => {
            const credits =
              lang === 'ko'
                ? work.credits_ko
                : lang === 'jp'
                ? work.credits_jp
                : work.credits_en;

            if (!credits) return null;

            return (
              <div className="mb-16 md:mb-64 pt-12 border-t border-black/5 dark:border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                  {/* Left: Section Title */}
                  <div className="md:col-span-3 min-[1025px]:col-span-3">
                    <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-[var(--font-ui)] sticky top-40">
  Credits & Notes
</h2>
                  </div>

                  {/* Right: Content */}
                  <div className="md:col-span-8 md:col-start-5 min-[1025px]:col-span-7 min-[1025px]:col-start-5">
                    <div
                      className={`prose prose-sm md:prose-base dark:prose-invert prose-headings:font-light prose-p:text-foreground/80 prose-p:leading-relaxed prose-li:text-foreground/80 prose-strong:text-foreground/90 prose-strong:font-medium max-w-none 
                      ${
  lang === 'jp'
    ? 'prose-headings:font-[var(--font-body-jp)] prose-p:font-[var(--font-body-jp)] prose-ul:font-[var(--font-body-jp)]'
    : lang === 'en'
    ? 'prose-headings:font-[var(--font-body-en)] prose-p:font-[var(--font-body-en)] prose-ul:font-[var(--font-body-en)]'
    : 'prose-headings:font-[var(--font-body-ko)] prose-p:font-[var(--font-body-ko)] prose-ul:font-[var(--font-body-ko)]'
}
                      }`}
                      dangerouslySetInnerHTML={{ __html: credits }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 6. Related Texts */}
          {work.relatedArticles && work.relatedArticles.length > 0 && (() => {
            const filteredRelatedArticles = work.relatedArticles.filter((article) => {
              const textItem = texts.find((t) => t.id === article.id);
              if (!textItem) return true;
              if (lang === 'ko') return textItem.hasKo !== undefined ? textItem.hasKo : true;
              if (lang === 'en') return textItem.hasEn !== undefined ? textItem.hasEn : true;
              if (lang === 'jp') return textItem.hasJp !== undefined ? textItem.hasJp : true;
              return true;
            });

            if (filteredRelatedArticles.length === 0) return null;

            return (
              <div className="mb-4 pt-10 border-t border-black/5 dark:border-white/5">
                <div className="grid grid-cols-1 min-[1025px]:grid-cols-12 gap-12">
                  <div className="md:col-span-4 min-[1025px]:col-span-3">
                    <div className="sticky top-40">
                      <h2 className="text-[12px] lowercase tracking-[0.2em] text-muted-foreground/70 mb-6 font-[var(--font-ui)]">
                        related
                      </h2>
                      <div className="hidden md:block min-h-[100px]">
                        {hoveredArticleId && (
                          <div
                            key={hoveredArticleId}
                            className={`text-sm leading-relaxed text-foreground/80 animate-in fade-in duration-500 ${
  lang === 'jp'
    ? 'font-[var(--font-body-jp)]'
    : lang === 'en'
    ? 'font-[var(--font-body-en)]'
    : 'font-[var(--font-body-ko)]'
}`}
                          >
                            {(() => {
                              const article = filteredRelatedArticles.find(
                                (a) => a.id === hoveredArticleId
                              );
                              const textItem = texts.find((t) => t.id === article?.id);

                              if (!textItem) {
                                return article?.summary
                                  ? cleanText(article.summary).slice(0, 120) + '...'
                                  : '';
                              }

                              const contentForLang =
                                lang === 'ko'
                                  ? textItem.content?.ko
                                  : lang === 'jp'
                                  ? textItem.content?.jp && textItem.content.jp !== textItem.content?.ko
                                    ? textItem.content.jp
                                    : textItem.content?.ko
                                  : textItem.content?.en && textItem.content.en !== textItem.content?.ko
                                  ? textItem.content.en
                                  : textItem.content?.ko;

                              const summaryForLang =
                                lang === 'ko'
                                  ? textItem.summary?.ko
                                  : lang === 'jp'
                                  ? textItem.summary?.jp && textItem.summary.jp !== textItem.summary?.ko
                                    ? textItem.summary.jp
                                    : undefined
                                  : textItem.summary?.en && textItem.summary.en !== textItem.summary?.ko
                                  ? textItem.summary.en
                                  : undefined;

                              const preview =
                                summaryForLang ||
                                (contentForLang ? contentForLang.slice(0, 120) : '') ||
                                textItem.summary?.ko ||
                                '';

                              return preview ? cleanText(preview).slice(0, 120) + '...' : '';
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-8 min-[1025px]:col-span-9 relative">
                    <div
                      ref={cursorImgRef}
                      className={`fixed top-0 left-0 z-50 pointer-events-none w-[240px] aspect-[4/3] overflow-hidden bg-background transition-opacity duration-300 ease-out border border-black/10 ${
                        hoveredArticleImg ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                                            {hoveredArticleImg && (
                        <img
                          src={toCdnUrl(hoveredArticleImg)}
                          alt="Preview"
                          className="w-full h-full object-cover grayscale contrast-125"
                        />
                      )}
                    </div>

                    <div className="flex flex-col divide-y divide-black/10 dark:divide-white/10 border-t border-black/10 dark:border-white/10">
                      {filteredRelatedArticles.map((article, index) => {
                        const textItem = texts.find((t) => t.id === article.id);
                        const displayTitle = textItem
                          ? lang === 'ko'
                            ? textItem.title.ko
                            : lang === 'jp'
                            ? textItem.title.jp
                            : textItem.title.en
                          : article.title;

                        return (
                          <div
                            key={article.id}
                            onClick={() => setSelectedArticleId(article.id)}
                            className="group block relative cursor-pointer"
                            onMouseEnter={() => {
                              setHoveredArticleId(article.id);
                              if (textItem?.image) setHoveredArticleImg(textItem.image);
                            }}
                            onMouseLeave={() => {
                              setHoveredArticleId(null);
                              setHoveredArticleImg(null);
                            }}
                          >
                            <div
  className={`flex items-baseline gap-3 md:gap-4 py-2 md:py-4 transition-all duration-300 ${
    hoveredArticleId === article.id
      ? 'pl-6 opacity-100'
      : 'pl-0 opacity-80'
  }`}
>
  <span className="shrink-0 text-[10px] text-muted-foreground/60 font-[Ojuju]">
    {String(index + 1).padStart(2, '0')}
  </span>
  <h3
    className={`font-light tracking-tight text-foreground/90 text-[14px] md:text-[16px] leading-snug m-0 ${
      lang === 'jp'
        ? 'font-[var(--font-body-jp)]'
        : lang === 'en'
        ? 'font-[var(--font-body-en)]'
        : 'font-[var(--font-body-ko)]'
    }`}
  >
    {cleanTitleText(displayTitle)}
  </h3>
</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {otherWorks.length > 0 && (
          <div className="mt-0 md:mt-2 min-[1320px]:mt-10 border-t border-white/5">
            <InfiniteWorkGrid
  works={otherWorks}
  onWorkClick={handleWorkClick}
  restoreKey={`work-detail-${workId}`}
  shouldRestore={!!shouldRestoreGrid}
/>
          </div>
        )}

        <ScrollToTop />
      </div>

      {/* Floating Text Window (Portal) */}
      {selectedArticleId &&
        createPortal(
          <div
            ref={panelRef}
            className={`fixed z-[999999999] ${
              isMobile ? 'top-[20px] left-[20px] w-[calc(100vw-40px)] h-[70vh]' : 'w-fit h-fit'
            }`}
            style={
              isMobile
                ? { position: 'fixed' }
                : {
                    position: 'fixed',
                    left: 100,
                    top: 100,
                    width: 'fit-content',
                    height: 'fit-content',
                  }
            }
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`shadow-2xl bg-background/95 backdrop-blur-md border border-foreground/10 overflow-hidden ${
                isMobile ? 'w-full h-full rounded-sm' : 'rounded-sm'
              }`}
            >
              <Resizable
                defaultSize={isMobile ? { width: '100%', height: '100%' } : { width: 450, height: 600 }}
                minWidth={isMobile ? 300 : 320}
                minHeight={isMobile ? 300 : 400}
                maxWidth={1000}
                enable={!isMobile ? { right: true, bottom: true, bottomRight: true } : false}
                className="flex flex-col relative"
              >
                {/* Drag Handle - subtle top bar (desktop only) */}
                {!isMobile && (
                  <div
                    className="h-6 flex-shrink-0 flex items-center justify-center cursor-move select-none"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const panel = panelRef.current;
                      if (!panel) return;

                      const rect = panel.getBoundingClientRect();
                      dragState.current = {
                        startX: e.clientX,
                        startY: e.clientY,
                        startLeft: rect.left,
                        startTop: rect.top,
                      };

                      const onMouseMove = (ev: MouseEvent) => {
                        if (!dragState.current || !panel) return;
                        const dx = ev.clientX - dragState.current.startX;
                        const dy = ev.clientY - dragState.current.startY;
                        panel.style.left = `${dragState.current.startLeft + dx}px`;
                        panel.style.top = `${dragState.current.startTop + dy}px`;
                      };

                      const onMouseUp = () => {
                        dragState.current = null;
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                      };

                      document.addEventListener('mousemove', onMouseMove);
                      document.addEventListener('mouseup', onMouseUp);
                    }}
                  >
                    <div className="w-10 h-[1.5px] bg-foreground/10 rounded-full" />
                  </div>
                )}

                {/* Close button - floating top right */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setSelectedArticleId(null);
                  }}
                  className="absolute top-2 right-3 z-20 text-muted-foreground/30 hover:text-foreground/70 transition-colors duration-300 p-2 md:p-1 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center cursor-pointer"
                >
                  <X size={13} />
                </button>

                <div className="w-full h-full overflow-hidden relative bg-background">
                  <TextDetail textId={selectedArticleId} isPopup={true}/>
                </div>
              </Resizable>
            </motion.div>
          </div>,
          document.body
        )}
    </>
  );
};