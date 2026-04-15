import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { useWorks } from '@/contexts/WorkContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Work } from '@/types/work';
import { getLocalizedGalleryImages } from '@/utils/getLocalizedImage';
import { toCdnUrl } from '@/utils/toCdnUrl';
import { X } from 'lucide-react';

interface TooltipTransitionProps {
  hoveredWorkId: string | null;
  isOpen: boolean;
  onClose: () => void;
  triggerRect?: DOMRect | null;
  onClick?: () => void;
  isMobile?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const TooltipTransition: React.FC<TooltipTransitionProps> = ({
  hoveredWorkId,
  isOpen,
  onClose,
  triggerRect,
  onClick,
  isMobile = false,
  onMouseEnter,
  onMouseLeave,
}) => {
  const { works } = useWorks();
  const { lang } = useLanguage();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeWork, setActiveWork] = useState<Work | null>(null);
  const slideshowTimer = useRef<gsap.core.Tween | null>(null);
  const slideshowIndexRef = useRef<number>(0);

  const extractImagesFromHtml = (html: string): string[] => {
    if (!html) return [];

    const images: string[] = [];
    const seen = new Set<string>();

    const imgRegex = /<img[^>]+src="([^">]+)"/gi;
    let match: RegExpExecArray | null;

    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1]?.trim();
      if (!src) continue;

      const normalizedSrc = toCdnUrl(src);

      if (!normalizedSrc) continue;
      if (seen.has(normalizedSrc)) continue;

      seen.add(normalizedSrc);
      images.push(normalizedSrc);
    }

    return images;
  };

  // Update active work
  useEffect(() => {
    if (hoveredWorkId) {
      const found = works.find((w) => w.id === hoveredWorkId);
      if (found) {
        setActiveWork(found);
        setCurrentImageIndex(0);
        slideshowIndexRef.current = 0;
      }
    }
  }, [hoveredWorkId, works]);

  const images = useMemo(() => {
    if (!activeWork) return [];

    const koContent = activeWork.content_rendered || '';

    const localizedContent =
      lang === 'en'
        ? activeWork.content_en?.trim() || koContent
        : lang === 'jp'
        ? activeWork.content_jp?.trim() || koContent
        : koContent;

    const htmlImages = extractImagesFromHtml(localizedContent);

    // 1순위: 현재 언어 HTML에서 추출된 이미지
    if (htmlImages.length > 0) {
      return Array.from(new Set(htmlImages));
    }

    // fallback: 기존 galleryImages 기반
    const fallbackImages = getLocalizedGalleryImages(activeWork as any, lang)
      .filter(Boolean)
      .map((image) => toCdnUrl(image)) as string[];

    return Array.from(new Set(fallbackImages));
  }, [activeWork, lang]);

  // Slideshow
  useEffect(() => {
    if (hoveredWorkId && !isOpen && images.length > 1) {
      const nextSlide = () => {
        slideshowIndexRef.current = (slideshowIndexRef.current + 1) % images.length;
        setCurrentImageIndex(slideshowIndexRef.current);
        slideshowTimer.current = gsap.delayedCall(1.8, nextSlide);
      };

      const startTimer = gsap.delayedCall(1.8, nextSlide);
      return () => {
        if (slideshowTimer.current) slideshowTimer.current.kill();
        if (startTimer) startTimer.kill();
      };
    }
  }, [hoveredWorkId, isOpen, images.length]);

  // Entrance/exit animation
  useEffect(() => {
    if (!tooltipRef.current) return;

    if (hoveredWorkId && activeWork) {
      gsap
        .timeline()
        .set(tooltipRef.current, { opacity: 0, y: 20, scale: 0.95 })
        .to(tooltipRef.current, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: 'power3.out',
        });
    } else if (!hoveredWorkId) {
      gsap.to(tooltipRef.current, {
        opacity: 0,
        y: 10,
        scale: 0.98,
        duration: 0.4,
        ease: 'power2.in',
      });
    }
  }, [hoveredWorkId, activeWork]);

  // Mobile: close tooltip on outside click (document-level)
  useEffect(() => {
    if (!isMobile || !hoveredWorkId) return;

    const handleDocumentClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay to avoid immediate close from the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('click', handleDocumentClick, true);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [isMobile, hoveredWorkId, onClose]);

  const handleWorkClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (activeWork && onClick) {
        onClick();
      }
    },
    [activeWork, onClick]
  );

  // Don't show anything if no work is hovered
  if (!hoveredWorkId || !activeWork) {
    return null;
  }

  // Render tooltip directly to body - NO wrapper div
  return createPortal(
    <aside
      ref={tooltipRef}
      className={`tooltip fixed right-[3vw] bottom-[5vh] w-[220px] md:w-[320px] z-[9999999] flex flex-col bg-background dark:bg-zinc-900 shadow-[0_25px_60px_rgba(0,0,0,0.3)] border border-border/20 rounded-sm overflow-hidden backdrop-blur-xl group${
        lang === 'ko' ? ' notranslate' : ''
      }`}
      translate={lang === 'ko' ? 'no' : undefined}
      style={{
        opacity: 0,
        pointerEvents: 'auto',
        isolation: 'isolate',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Premium Frame Lines */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-8 h-8">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-foreground/40 to-transparent"></div>
          <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-foreground/40 to-transparent"></div>
        </div>
        <div className="absolute top-0 right-0 w-8 h-8">
          <div className="absolute top-0 right-0 w-full h-[1px] bg-gradient-to-l from-foreground/40 to-transparent"></div>
          <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-foreground/40 to-transparent"></div>
        </div>
        <div className="absolute bottom-0 left-0 w-8 h-8">
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-foreground/40 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-[1px] h-full bg-gradient-to-t from-foreground/40 to-transparent"></div>
        </div>
        <div className="absolute bottom-0 right-0 w-8 h-8">
          <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-foreground/40 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-foreground/40 to-transparent"></div>
        </div>
      </div>

      {/* Image Gallery with Premium Crossfade */}
      <div
        onClick={handleWorkClick}
        className="relative w-full aspect-[4/3] overflow-hidden bg-muted/10 cursor-pointer z-20"
      >
        {/* Close Button - Top Right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-2 right-2 z-50 w-6 h-6 rounded-full bg-background/80 backdrop-blur-md border border-border/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-background hover:scale-110"
          aria-label="Close preview"
        >
          <X className="w-3 h-3 text-foreground/60" />
        </button>

        {activeWork &&
          images.map((img, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-all duration-[1200ms] ease-in-out pointer-events-none"
              style={{
                opacity: i === currentImageIndex ? 1 : 0,
                transform: i === currentImageIndex ? 'scale(1.05)' : 'scale(1.1)',
                transition: 'opacity 1.2s ease-in-out, transform 12s ease-out',
              }}
            >
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${img})` }}
              />
            </div>
          ))}

        {/* Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/20 pointer-events-none"></div>

        {/* Image Counter - Left Top */}
        {images.length > 1 && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-background/80 backdrop-blur-sm rounded-full border border-border/20 pointer-events-none">
            <span className="text-[8px] font-[var(--font-ui)] text-foreground/70 tabular-nums">
              {currentImageIndex + 1}/{images.length}
            </span>
          </div>
        )}
      </div>

      {/* Premium Content Section */}
      {activeWork && (
        <div className="w-full flex flex-col bg-background/95 dark:bg-zinc-900/95 backdrop-blur-sm relative z-20">
          {/* Main Info */}
          <div className="px-5 py-4 flex flex-col gap-2">
            {/* Title / selected work / Year Row */}
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2 min-w-0 flex-1">
               <h3
  className={`text-sm md:text-base font-light text-foreground leading-tight tracking-tight transition-all duration-300 group-hover:text-foreground/80 truncate ${
    lang === 'jp'
      ? 'font-[var(--font-body-jp)]'
      : lang === 'en'
      ? 'font-[var(--font-body-en)]'
      : 'font-[var(--font-body-ko)]'
  }`}
>
                  {lang === 'en'
                    ? activeWork.title_en || activeWork.title_ko || activeWork.title
                    : lang === 'jp'
                    ? activeWork.title_jp || activeWork.title_ko || activeWork.title
                    : activeWork.title_ko || activeWork.title}
                </h3>
              </div>
              <span className="text-[10px] font-[var(--font-ui)] text-muted-foreground/60 tracking-wider shrink-0">
                {activeWork.year}
              </span>
            </div>

            {/* Medium if available */}
            {activeWork.medium && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground/40 font-[var(--font-ui)]">
                  {activeWork.medium}
                </span>
              </div>
            )}
          </div>

          {/* Action Footer - OPEN button */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleWorkClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleWorkClick(e as any);
            }}
            className="tooltip-action w-full px-5 py-3 border-t border-border/10 bg-gradient-to-b from-transparent to-muted/10 flex items-center justify-between transition-all duration-300 cursor-pointer hover:bg-muted/30 active:bg-muted/40 select-none"
          >
            <span className="text-[9px] font-[var(--font-ui)] tracking-[0.2em] text-foreground/70 transition-colors duration-300">
              open
            </span>
            {/* Arrow */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="text-foreground/50 transition-all duration-300"
            >
              <path
                d="M5 12H19M19 12L12 5M19 12L12 19"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Shimmer Effect on Hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      </div>
    </aside>,
    document.body
  );
};