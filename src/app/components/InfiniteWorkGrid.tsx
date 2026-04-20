import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Work } from '@/contexts/WorkContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { getLocalizedThumbnail } from '@/utils/getLocalizedImage';
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react';

const getLocalizedGridImage = (work: any, lang: 'ko' | 'en' | 'jp'): string => {
  return getLocalizedThumbnail(work, lang) || '';
};

interface InfiniteWorkGridProps {
  works: Work[];
  onWorkClick?: (workId: number) => void;
  restoreKey?: string;
  shouldRestore: boolean;
}

type ViewMode = 'mobile' | 'tablet' | 'desktop';

interface WorkCardProps {
  work: Work;
  lang: 'ko' | 'en' | 'jp';
  title: string;
  widthClass: string;
  onClick?: (workId: number) => void;
  imagePriority?: boolean;
}

const STORAGE_PREFIX = 'infinite-work-grid-position:';

const WorkCard = memo(
  ({ work, lang, title, widthClass, onClick, imagePriority = false }: WorkCardProps) => {
    return (
      <div
        key={work.id}
        onClick={() => onClick?.(Number(work.id))}
        className="group flex-shrink-0 cursor-pointer"
      >
        <div
          className={`${widthClass} aspect-[4/3] overflow-hidden bg-muted/10 mb-4 relative`}
        >
          <ImageWithFallback
            src={getLocalizedGridImage(work, lang) || ''}
            alt={work.title_en}
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ease-out"
            loading={imagePriority ? 'eager' : 'lazy'}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
        </div>

        <div className={widthClass}>
          <h3
  className={`text-sm md:text-base font-light text-foreground/90 leading-tight mb-1 group-hover:text-foreground transition-colors duration-300 ${
    lang === 'jp'
      ? 'font-[var(--font-body-jp)]'
      : lang === 'en'
      ? 'font-[var(--font-body-en)]'
      : 'font-[var(--font-body-ko)]'
  }`}
>
  {title}
</h3>
          <p className="text-[10px] text-muted-foreground/60 tracking-[0.1em] font-[var(--font-ui)]">
  {work.year}
</p>
        </div>
      </div>
    );
  }
);

WorkCard.displayName = 'WorkCard';

export const InfiniteWorkGrid = ({
  works,
  onWorkClick,
  restoreKey,
  shouldRestore,
}: InfiniteWorkGridProps) => {
  const { lang } = useLanguage();

  // Refs
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  // Mobile refs
  const mobileViewportRef = useRef<HTMLDivElement>(null);

  // Tablet refs
  const tabletViewportRef = useRef<HTMLDivElement>(null);
  const tabletTrackRef = useRef<HTMLDivElement>(null);

  // Desktop smooth scroll refs
  const desktopTargetScrollRef = useRef(0);
  const desktopCurrentScrollRef = useRef(0);
  const desktopRafRef = useRef<number | null>(null);
  const hoverLeaveTimeoutRef = useRef<number | null>(null);

  // Restore refs
  const hasRestoredRef = useRef(false);

  // State
  const [mode, setMode] = useState<ViewMode | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const [isDesktopTrackActive, setIsDesktopTrackActive] = useState(false);

  // Tablet drag state
  const tabletX = useMotionValue(0);
  const [tabletBounds, setTabletBounds] = useState({ left: 0, right: 0 });

  const isReady = mode !== null;
  const isMobile = mode === 'mobile';
  const isTablet = mode === 'tablet';
  const isDesktop = mode === 'desktop';

  const storageKey = restoreKey ? `${STORAGE_PREFIX}${restoreKey}` : null;

  const getViewMode = (): ViewMode => {
    const w = window.innerWidth;

    if (w < 768) return 'mobile';
    if (w <= 1024) return 'tablet';
    return 'desktop';
  };

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const getLocalizedTitle = useCallback(
    (work: Work) => {
      return lang === 'ko' ? work.title_ko : lang === 'jp' ? work.title_jp : work.title_en;
    },
    [lang]
  );

  const saveGridPosition = useCallback(() => {
    if (!storageKey || !mode) return;

    let value = 0;

    if (mode === 'mobile' && mobileViewportRef.current) {
      value = mobileViewportRef.current.scrollLeft;
    } else if (mode === 'tablet') {
      value = tabletX.get();
    } else if (mode === 'desktop' && trackRef.current) {
      value = trackRef.current.scrollLeft;
    }

    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        mode,
        value,
      })
    );
  }, [storageKey, mode, tabletX]);

  const handleGridWorkClick = useCallback(
    (workId: number) => {
      saveGridPosition();
      onWorkClick?.(workId);
    },
    [saveGridPosition, onWorkClick]
  );

  useEffect(() => {
    const checkScreenSize = () => {
      setMode(getViewMode());
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % works.length);
  };

  const goToPrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + works.length) % works.length);
  };

  const handleDesktopTrackEnter = () => {
    if (hoverLeaveTimeoutRef.current) {
      window.clearTimeout(hoverLeaveTimeoutRef.current);
      hoverLeaveTimeoutRef.current = null;
    }
    setIsDesktopTrackActive(true);
  };

  const handleDesktopTrackLeave = () => {
    if (hoverLeaveTimeoutRef.current) {
      window.clearTimeout(hoverLeaveTimeoutRef.current);
    }

    hoverLeaveTimeoutRef.current = window.setTimeout(() => {
      setIsDesktopTrackActive(false);
    }, 90);
  };

  const animateDesktopToTarget = useCallback((target: number) => {
    const track = trackRef.current;
    if (!track) return;

    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    desktopTargetScrollRef.current = clamp(target, 0, maxScroll);

    const step = () => {
      const trackEl = trackRef.current;
      if (!trackEl) {
        desktopRafRef.current = null;
        return;
      }

      const current = desktopCurrentScrollRef.current;
      const targetValue = desktopTargetScrollRef.current;
      const next = current + (targetValue - current) * 0.14;

      desktopCurrentScrollRef.current = next;
      trackEl.scrollLeft = next;

      const innerMax = Math.max(0, trackEl.scrollWidth - trackEl.clientWidth);
      setScrollProgress(innerMax <= 0 ? 0 : next / innerMax);

      if (Math.abs(targetValue - next) < 0.5) {
        desktopCurrentScrollRef.current = targetValue;
        trackEl.scrollLeft = targetValue;
        setScrollProgress(innerMax <= 0 ? 0 : targetValue / innerMax);
        desktopRafRef.current = null;
        return;
      }

      desktopRafRef.current = requestAnimationFrame(step);
    };

    if (!desktopRafRef.current) {
      desktopRafRef.current = requestAnimationFrame(step);
    }
  }, []);

  // Mobile native snap + peek
  useEffect(() => {
    if (!isReady || !isMobile || !mobileViewportRef.current) return;

    const viewport = mobileViewportRef.current;

    const updateCurrentSlideFromScroll = () => {
      const firstCard = viewport.querySelector<HTMLElement>('[data-mobile-card]');
      if (!firstCard) return;

      const gap = 12;
      const step = firstCard.offsetWidth + gap;
      if (step <= 0) return;

      const index = Math.round(viewport.scrollLeft / step);
      setCurrentSlide(clamp(index, 0, Math.max(works.length - 1, 0)));
    };

    updateCurrentSlideFromScroll();
    viewport.addEventListener('scroll', updateCurrentSlideFromScroll, { passive: true });
    window.addEventListener('resize', updateCurrentSlideFromScroll);

    return () => {
      viewport.removeEventListener('scroll', updateCurrentSlideFromScroll);
      window.removeEventListener('resize', updateCurrentSlideFromScroll);
    };
  }, [isReady, isMobile, works.length]);

  // Tablet bounds
  useLayoutEffect(() => {
    if (!isReady || !isTablet || !tabletViewportRef.current || !tabletTrackRef.current) {
      setTabletBounds({ left: 0, right: 0 });
      tabletX.set(0);
      setScrollProgress(0);
      return;
    }

    const updateTabletBounds = () => {
      if (!tabletViewportRef.current || !tabletTrackRef.current) return;

      const viewportWidth = tabletViewportRef.current.clientWidth;
      const trackWidth = tabletTrackRef.current.scrollWidth;
      const maxDrag = Math.max(0, trackWidth - viewportWidth);

      setTabletBounds({
        left: -maxDrag,
        right: 0,
      });

      const clampedX = clamp(tabletX.get(), -maxDrag, 0);
      tabletX.set(clampedX);

      if (maxDrag <= 0) {
        setScrollProgress(0);
      } else {
        setScrollProgress(Math.abs(clampedX) / maxDrag);
      }
    };

    const timer = setTimeout(updateTabletBounds, 50);
    window.addEventListener('resize', updateTabletBounds);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTabletBounds);
    };
  }, [isReady, isTablet, works, tabletX]);

  // Tablet progress sync
  useEffect(() => {
    if (!isReady || !isTablet) return;

    const unsubscribe = tabletX.on('change', (latest) => {
      const maxDrag = Math.abs(tabletBounds.left);
      if (maxDrag <= 0) {
        setScrollProgress(0);
        return;
      }
      setScrollProgress(clamp(Math.abs(latest) / maxDrag, 0, 1));
    });

    return unsubscribe;
  }, [isReady, isTablet, tabletBounds.left, tabletX]);

  // Desktop smooth horizontal wheel scroll
  useEffect(() => {
    if (!isReady || !isDesktop || !trackRef.current) {
      setScrollProgress(0);

      if (desktopRafRef.current) {
        cancelAnimationFrame(desktopRafRef.current);
        desktopRafRef.current = null;
      }

      return;
    }

    const track = trackRef.current;

    const syncDesktopScrollState = () => {
      const current = track.scrollLeft;
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);

      desktopCurrentScrollRef.current = current;
      desktopTargetScrollRef.current = current;
      setScrollProgress(maxScroll <= 0 ? 0 : current / maxScroll);
    };

    const handleWheel = (e: WheelEvent) => {
      if (!isDesktopTrackActive || !trackRef.current) return;

      const trackEl = trackRef.current;
      const maxScroll = Math.max(0, trackEl.scrollWidth - trackEl.clientWidth);
      if (maxScroll <= 0) return;

      const SPEED = 1.4;
      const delta = e.deltaY * SPEED;

      const currentTarget = desktopTargetScrollRef.current;
      const nextTarget = clamp(currentTarget + delta, 0, maxScroll);

      const isAtStart = currentTarget <= 0;
      const isAtEnd = currentTarget >= maxScroll;

      if ((delta < 0 && isAtStart) || (delta > 0 && isAtEnd)) {
        return;
      }

      e.preventDefault();
      animateDesktopToTarget(nextTarget);
    };

    const handleResize = () => {
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      const clamped = clamp(desktopTargetScrollRef.current, 0, maxScroll);

      desktopCurrentScrollRef.current = clamped;
      desktopTargetScrollRef.current = clamped;
      track.scrollLeft = clamped;
      setScrollProgress(maxScroll <= 0 ? 0 : clamped / maxScroll);
    };

    syncDesktopScrollState();

    track.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', handleResize);

    return () => {
      track.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);

      if (desktopRafRef.current) {
        cancelAnimationFrame(desktopRafRef.current);
        desktopRafRef.current = null;
      }
    };
  }, [isReady, isDesktop, isDesktopTrackActive, works, animateDesktopToTarget]);

  // Reset to start for fresh entry
    useEffect(() => {
    if (!mode) return;
    if (shouldRestore) return;

    hasRestoredRef.current = false;

    if (storageKey) {
      sessionStorage.removeItem(storageKey);
    }

    const applyResetToStart = () => {
      if (mode === 'mobile' && mobileViewportRef.current) {
        mobileViewportRef.current.scrollLeft = 0;
        setCurrentSlide(0);
      }

      if (mode === 'tablet') {
        tabletX.set(0);
        setScrollProgress(0);
      }

      if (mode === 'desktop' && trackRef.current) {
        trackRef.current.scrollLeft = 0;
        desktopCurrentScrollRef.current = 0;
        desktopTargetScrollRef.current = 0;
        setScrollProgress(0);
      }
    };

    let timeoutId: number | null = null;

    const rafId = requestAnimationFrame(() => {
      applyResetToStart();

      timeoutId = window.setTimeout(() => {
        applyResetToStart();
      }, 60);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [shouldRestore, mode, tabletX, storageKey]);

  // Restore saved position only when returning back
    useEffect(() => {
    if (!shouldRestore) return;
    if (!storageKey || !mode || hasRestoredRef.current) return;

    const raw = sessionStorage.getItem(storageKey);
    if (!raw) {
      hasRestoredRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const savedValue = Number(parsed?.value ?? 0);

      let timeoutId: number | null = null;

      const applyRestore = () => {
        if (mode === 'mobile' && mobileViewportRef.current) {
          mobileViewportRef.current.scrollLeft = savedValue;

          const firstCard =
            mobileViewportRef.current.querySelector<HTMLElement>('[data-mobile-card]');
          if (firstCard) {
            const gap = 12;
            const step = firstCard.offsetWidth + gap;
            if (step > 0) {
              const index = Math.round(savedValue / step);
              setCurrentSlide(clamp(index, 0, Math.max(works.length - 1, 0)));
            }
          }
        }

        if (mode === 'tablet') {
          const maxDrag = Math.abs(tabletBounds.left);
          const clampedValue = clamp(savedValue, -maxDrag, 0);
          tabletX.set(clampedValue);

          if (maxDrag <= 0) {
            setScrollProgress(0);
          } else {
            setScrollProgress(clamp(Math.abs(clampedValue) / maxDrag, 0, 1));
          }
        }

        if (mode === 'desktop' && trackRef.current) {
          const maxScroll = Math.max(
            0,
            trackRef.current.scrollWidth - trackRef.current.clientWidth
          );
          const clampedValue = clamp(savedValue, 0, maxScroll);

          trackRef.current.scrollLeft = clampedValue;
          desktopCurrentScrollRef.current = clampedValue;
          desktopTargetScrollRef.current = clampedValue;
          setScrollProgress(maxScroll <= 0 ? 0 : clampedValue / maxScroll);
        }
      };

      const rafId = requestAnimationFrame(() => {
        applyRestore();

        timeoutId = window.setTimeout(() => {
          applyRestore();
          hasRestoredRef.current = true;
        }, 60);
      });

      return () => {
        cancelAnimationFrame(rafId);
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
      };
    } catch {
      hasRestoredRef.current = true;
    }
  }, [shouldRestore, storageKey, mode, tabletX, tabletBounds.left, works.length]);

  useEffect(() => {
    return () => {
      if (hoverLeaveTimeoutRef.current) {
        window.clearTimeout(hoverLeaveTimeoutRef.current);
        hoverLeaveTimeoutRef.current = null;
      }
    };
  }, []);

  if (!isReady || works.length === 0) return null;

  // Mobile
  if (isMobile) {
    return (
      <div className="relative w-full bg-background">
        <div className="px-6 mb-4 flex items-end justify-between gap-4">
          <div className="flex items-baseline gap-4">
            <h2 className="text-[12px] lowercase tracking-[0.2em] text-muted-foreground font-[var(--font-ui)]">
  other works
</h2>
            <span className="text-[10px] font-[var(--font-ui)] text-muted-foreground/70">
  {works.length} {works.length === 1 ? 'work' : 'works'}
</span>
          </div>
        </div>

        <div className="pl-6">
          <div
            ref={mobileViewportRef}
            className="overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex gap-3 pr-6">
              {works.map((work, index) => (
                <div
                  key={work.id}
                  data-mobile-card
                  className="snap-start flex-shrink-0 w-[88%] cursor-pointer"
                  onClick={() => handleGridWorkClick(Number(work.id))}
                >
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-muted/10">
                    <ImageWithFallback
                      src={getLocalizedGridImage(work, lang) || ''}
                      alt={work.title_en}
                      className="w-full h-full object-cover"
                      loading={index < 2 ? 'eager' : 'lazy'}
                    />
                  </div>

                  <div className="mt-4">
                    <h3
  className={`text-sm font-light text-foreground/90 leading-tight mb-1 ${
    lang === 'jp'
      ? 'font-[var(--font-body-jp)]'
      : lang === 'en'
      ? 'font-[var(--font-body-en)]'
      : 'font-[var(--font-body-ko)]'
  }`}
>
  {getLocalizedTitle(work)}
</h3>
                    <p className="text-[10px] font-[var(--font-ui)] text-muted-foreground/60 tracking-[0.1em]">
  {work.year}
</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pr-6 flex justify-center">
            <span className="text-[12px] font-[var(--font-ui)] text-muted-foreground/60 tracking-wider tabular-nums">
              {String(currentSlide + 1).padStart(2, '0')} / {String(works.length).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Tablet
  if (isTablet) {
    return (
      <div className="relative w-full bg-background overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[88px] md:h-[104px] bg-background z-10" />

        <div className="relative z-20 pt-12 md:pt-16 px-6 md:px-12 mb-8 md:mb-12 flex items-end justify-between gap-4">
          <div className="flex items-baseline gap-4">
            <h2 className="text-[12px] lowercase tracking-[0.2em] text-muted-foreground/90 font-[var(--font-ui)]">
              other works
            </h2>
            <span className="text-muted-foreground/80 text-[10px] font-[var(--font-ui)]">
              {works.length} {works.length === 1 ? 'work' : 'works'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-24 h-[1px] bg-muted-foreground/20 relative overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-foreground/60 transition-none"
                style={{ width: `${scrollProgress * 100}%` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground/80 tabular-nums font-[var(--font-ui)]">
              {Math.round(scrollProgress * 100)}%
            </span>
          </div>
        </div>

        <div ref={tabletViewportRef} className="px-8 lg:px-12 overflow-hidden">
          <motion.div
            ref={tabletTrackRef}
            className="flex gap-5 lg:gap-6 pb-10 cursor-grab active:cursor-grabbing"
            drag="x"
            dragMomentum={false}
            dragConstraints={tabletBounds}
            dragElastic={0.03}
            style={{ x: tabletX }}
            onDragEnd={() => {
              if (!tabletViewportRef.current) return;

              const viewportWidth = tabletViewportRef.current.clientWidth;
              const gap = viewportWidth >= 1100 ? 24 : 20;
              const visibleCards = viewportWidth >= 1100 ? 2.2 : 2;
              const cardWidth = (viewportWidth - gap * (visibleCards - 1)) / visibleCards;
              const step = cardWidth + gap;

              const rawX = tabletX.get();
              const snappedIndex = Math.round(Math.abs(rawX) / step);
              const targetX = clamp(-(snappedIndex * step), tabletBounds.left, 0);

              animate(tabletX, targetX, {
                type: 'spring',
                stiffness: 380,
                damping: 38,
                mass: 0.9,
              });
            }}
          >
            {works.map((work, index) => (
              <WorkCard
                key={work.id}
                work={work}
                lang={lang}
                title={getLocalizedTitle(work)}
                widthClass="w-[calc((100vw-96px)/2)] lg:w-[calc((100vw-140px)/2.2)] min-w-[280px] max-w-[520px]"
                onClick={handleGridWorkClick}
                imagePriority={index < 2}
              />
            ))}
          </motion.div>
        </div>

        <div className="relative z-20 px-6 md:px-12 pb-24 md:pb-32">
          <div className="relative">
            <div
              className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to right, var(--background), transparent)' }}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to left, var(--background), transparent)' }}
            />

            <div
              ref={indicatorRef}
              className="relative w-full cursor-pointer"
              style={{ height: '48px' }}
              onMouseMove={(e) => {
                if (!indicatorRef.current) return;
                const rect = indicatorRef.current.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const clamped = Math.max(0, Math.min(1, x));
                setHoverProgress(clamped);
                const nearestIndex = Math.round(clamped * (works.length - 1));
                setHoverIndex(nearestIndex);
              }}
              onMouseLeave={() => {
                setHoverIndex(null);
                setHoverProgress(null);
              }}
              onClick={(e) => {
                if (!indicatorRef.current) return;
                const rect = indicatorRef.current.getBoundingClientRect();
                const clickProgress = Math.max(
                  0,
                  Math.min(1, (e.clientX - rect.left) / rect.width)
                );
                const maxDrag = Math.abs(tabletBounds.left);
                const targetX = -(maxDrag * clickProgress);

                animate(tabletX, targetX, {
                  type: 'spring',
                  stiffness: 300,
                  damping: 36,
                  mass: 0.9,
                });
              }}
            >
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-foreground/[0.06]" />

              {works.map((_, index) => {
                const pos = works.length <= 1 ? 0 : (index / (works.length - 1)) * 100;
                const isHovered = index === hoverIndex;
                const hoverDist =
                  hoverProgress !== null
                    ? Math.abs(
                        hoverProgress - (works.length <= 1 ? 0 : index / (works.length - 1))
                      )
                    : 1;
                const proximityOpacity =
                  hoverProgress !== null ? Math.max(0.06, 0.3 - hoverDist * 2) : 0.06;

                return (
                  <div
                    key={index}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500 ease-out"
                    style={{
                      left: `${pos}%`,
                      width: isHovered ? '4px' : '2px',
                      height: isHovered ? '4px' : '2px',
                      backgroundColor: `rgba(0,0,0,${isHovered ? 0.4 : proximityOpacity})`,
                    }}
                  />
                );
              })}

              <div
                className="absolute top-1/2 transition-none pointer-events-none"
                style={{
                  left: `${scrollProgress * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    width: '18px',
                    height: '18px',
                    background: 'radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)',
                  }}
                />
                <div
                  className="bg-foreground/70"
                  style={{
                    width: '5px',
                    height: '5px',
                    boxShadow: '0 0 4px rgba(0,0,0,0.06), 0 0 10px rgba(0,0,0,0.02)',
                  }}
                />
              </div>

              <AnimatePresence>
                {hoverProgress !== null && (
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0.3 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0.3 }}
                    transition={{ duration: 0.2 }}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${hoverProgress * 100}%`,
                      top: '25%',
                      bottom: '25%',
                      width: '0.5px',
                      backgroundColor: 'rgba(0,0,0,0.12)',
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {hoverIndex !== null && hoverProgress !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="absolute pointer-events-none z-20"
                    style={{
                      bottom: '100%',
                      left: `${hoverProgress * 100}%`,
                      transform: 'translateX(-50%)',
                      marginBottom: '4px',
                    }}
                  >
                    <div
                      className="absolute left-1/2 -translate-x-1/2 bg-foreground/10"
                      style={{ top: '100%', width: '0.5px', height: '4px' }}
                    />
                    <div
                      className="px-2.5 py-1.5"
                      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)' }}
                    >
                      <p className="text-[8px] sans-serif text-white/85 whitespace-nowrap tracking-[0.08em] uppercase">
                        {getLocalizedTitle(works[hoverIndex])}
                      </p>
                      <p className="text-[7px] sans-serif text-white/40 tracking-[0.12em] mt-0.5">
                        {works[hoverIndex].year}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop
  return (
    <div ref={sectionRef} className="relative w-full bg-background overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[88px] md:h-[104px] bg-background z-10" />

      <div className="relative z-20 pt-12 md:pt-16 px-6 md:px-12 mb-8 md:mb-12 flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <h2 className="text-[12px] lowercase tracking-[0.2em] text-muted-foreground/90 font-[var(--font-ui)]">
            other works
          </h2>
          <span className="text-muted-foreground/80 font-[var(--font-ui)] text-[10px]">
            {works.length} {works.length === 1 ? 'work' : 'works'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-24 h-[1px] bg-muted-foreground/20 relative overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-foreground/60 transition-none"
              style={{ width: `${scrollProgress * 100}%` }}
            />
          </div>
          <span className="text-muted-foreground/80 tabular-nums text-[10px] font-[var(--font-ui)]">
            {Math.round(scrollProgress * 100)}%
          </span>
        </div>
      </div>

      <div className="px-6 md:px-12 pb-12 md:pb-16">
        <div onMouseEnter={handleDesktopTrackEnter} onMouseLeave={handleDesktopTrackLeave}>
          <div
            ref={trackRef}
            className="flex gap-4 md:gap-6 overflow-x-auto overflow-y-hidden scrollbar-hide"
            style={{
              scrollBehavior: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {works.map((work, index) => (
              <WorkCard
                key={work.id}
                work={work}
                lang={lang}
                title={getLocalizedTitle(work)}
                widthClass="w-[280px] md:w-[350px]"
                onClick={handleGridWorkClick}
                imagePriority={index < 2}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-20 px-6 md:px-12 pb-24 md:pb-32">
        <div className="relative">
          <div
            className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to right, var(--background), transparent)' }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to left, var(--background), transparent)' }}
          />

          <div
            ref={indicatorRef}
            className="relative w-full cursor-pointer"
            style={{ height: '48px' }}
            onMouseMove={(e) => {
              if (!indicatorRef.current) return;
              const rect = indicatorRef.current.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              const clamped = Math.max(0, Math.min(1, x));
              setHoverProgress(clamped);
              const nearestIndex = Math.round(clamped * (works.length - 1));
              setHoverIndex(nearestIndex);
            }}
            onMouseLeave={() => {
              setHoverIndex(null);
              setHoverProgress(null);
            }}
            onClick={(e) => {
              if (!indicatorRef.current || !trackRef.current) return;

              const rect = indicatorRef.current.getBoundingClientRect();
              const clickProgress = Math.max(
                0,
                Math.min(1, (e.clientX - rect.left) / rect.width)
              );
              const track = trackRef.current;
              const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
              const target = maxScroll * clickProgress;

              animateDesktopToTarget(target);
            }}
          >
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-foreground/[0.06]" />

            {works.map((_, index) => {
              const pos = works.length <= 1 ? 0 : (index / (works.length - 1)) * 100;
              const isHovered = index === hoverIndex;
              const hoverDist =
                hoverProgress !== null
                  ? Math.abs(
                      hoverProgress - (works.length <= 1 ? 0 : index / (works.length - 1))
                    )
                  : 1;
              const proximityOpacity =
                hoverProgress !== null ? Math.max(0.06, 0.3 - hoverDist * 2) : 0.06;

              return (
                <div
                  key={index}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500 ease-out"
                  style={{
                    left: `${pos}%`,
                    width: isHovered ? '4px' : '2px',
                    height: isHovered ? '4px' : '2px',
                    backgroundColor: `rgba(0,0,0,${isHovered ? 0.4 : proximityOpacity})`,
                  }}
                />
              );
            })}

            <div
              className="absolute top-1/2 transition-none pointer-events-none"
              style={{
                left: `${scrollProgress * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  width: '18px',
                  height: '18px',
                  background: 'radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)',
                }}
              />
              <div
                className="bg-foreground/70"
                style={{
                  width: '5px',
                  height: '5px',
                  boxShadow: '0 0 4px rgba(0,0,0,0.06), 0 0 10px rgba(0,0,0,0.02)',
                }}
              />
            </div>
            
            <AnimatePresence>
              {hoverProgress !== null && (
                <motion.div
                  initial={{ opacity: 0, scaleY: 0.3 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0.3 }}
                  transition={{ duration: 0.2 }}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${hoverProgress * 100}%`,
                    top: '25%',
                    bottom: '25%',
                    width: '0.5px',
                    backgroundColor: 'rgba(0,0,0,0.12)',
                    transform: 'translateX(-50%)',
                  }}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {hoverIndex !== null && hoverProgress !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="absolute pointer-events-none z-20"
                  style={{
                    bottom: '100%',
                    left: `${hoverProgress * 100}%`,
                    transform: 'translateX(-50%)',
                    marginBottom: '4px',
                  }}
                >
                  <div
                    className="absolute left-1/2 -translate-x-1/2 bg-foreground/10"
                    style={{ top: '100%', width: '0.5px', height: '4px' }}
                  />
                  <div
                    className="px-2.5 py-1.5"
                    style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)' }}
                  >
                    <p
  className={`text-[8px] text-white/85 whitespace-nowrap tracking-[0.08em] uppercase ${
    lang === 'jp'
      ? 'font-[var(--font-body-jp)]'
      : lang === 'en'
      ? 'font-[var(--font-body-en)]'
      : 'font-[var(--font-body-ko)]'
  }`}
>
  {getLocalizedTitle(works[hoverIndex])}
</p>
<p className="text-[7px] font-[var(--font-ui)] text-white/40 tracking-[0.12em] mt-0.5">
  {works[hoverIndex].year}
</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};