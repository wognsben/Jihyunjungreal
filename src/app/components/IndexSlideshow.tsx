import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { MainIndexSlide } from '@/data/works';

interface IndexSlideshowProps {
  slides: MainIndexSlide[];
}

export const IndexSlideshow = ({ slides }: IndexSlideshowProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1025;
  });

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const displayImageRef = useRef<HTMLDivElement | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);

  const TRANSITION_MS = 560;
  const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

  const clearTransitionTimeout = () => {
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  };

  const goToSlide = useCallback(
    (nextIndex: number) => {
      if (!slides.length) return;
      if (nextIndex === displayIndex) return;
      if (isTransitioning) return;

      const layer = displayImageRef.current;
      const nextSlide = slides[nextIndex];
      if (!layer || !nextSlide) return;

      clearTransitionTimeout();
      setIsTransitioning(true);
      setActiveIndex(nextIndex);

      const nextImage = new window.Image();
      nextImage.src = nextSlide.image || '';

      const runTransition = () => {
        layer.style.backgroundImage = `url("${nextSlide.image || ''}")`;
        layer.style.opacity = '0';

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            layer.style.opacity = '1';
          });
        });

        transitionTimeoutRef.current = window.setTimeout(() => {
          setDisplayIndex(nextIndex);
          setIsTransitioning(false);
          transitionTimeoutRef.current = null;
        }, TRANSITION_MS);
      };

      if (nextImage.complete) {
        runTransition();
      } else {
        nextImage.onload = runTransition;
        nextImage.onerror = runTransition;
      }
    },
    [slides, displayIndex, isTransitioning]
  );

  const handleNext = useCallback(() => {
    if (!slides.length || isTransitioning) return;
    goToSlide((displayIndex + 1) % slides.length);
  }, [slides.length, isTransitioning, goToSlide, displayIndex]);

  const handlePrev = useCallback(() => {
    if (!slides.length || isTransitioning) return;
    goToSlide((displayIndex - 1 + slides.length) % slides.length);
  }, [slides.length, isTransitioning, goToSlide, displayIndex]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1025);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    return () => clearTransitionTimeout();
  }, []);

  useEffect(() => {
    if (!slides.length) {
      setActiveIndex(0);
      setDisplayIndex(0);
      setIsTransitioning(false);
      return;
    }

    if (displayIndex > slides.length - 1) {
      setActiveIndex(0);
      setDisplayIndex(0);
      setIsTransitioning(false);
    }
  }, [slides.length, displayIndex]);

  useEffect(() => {
    if (!slides.length) return;

    const current = slides[displayIndex];
    const preloadTargets = [
      slides[(displayIndex + 1) % slides.length]?.image,
      slides[(displayIndex - 1 + slides.length) % slides.length]?.image,
    ].filter(Boolean) as string[];

    preloadTargets.forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });

    if (displayImageRef.current && current?.image) {
      displayImageRef.current.style.backgroundImage = `url("${current.image}")`;
      displayImageRef.current.style.opacity = '1';
    }
  }, [slides, displayIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const start = touchStartX.current;
    const end = touchEndX.current;

    if (!start || !end) return;

    const distance = start - end;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) handleNext();
      else handlePrev();
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isDesktop || isTransitioning) return;
    if (Math.abs(e.deltaY) < 20) return;

    if (e.deltaY > 0) handleNext();
    else handlePrev();
  };

  if (!slides.length) return null;

  const currentSlide = slides[activeIndex];
  const currentTitle = currentSlide?.title || '';
  const currentInfo = currentSlide?.info || '';

  return (
    <div
      className="relative w-full overflow-hidden bg-black"
      style={{
        height: '100vh',
        minHeight: '500px',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Base image */}
      <div className="absolute inset-0">
        <ImageWithFallback
          src={slides[displayIndex]?.image || ''}
          alt={currentTitle}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Fade layer */}
      <div
        ref={displayImageRef}
        className="absolute inset-0 bg-center bg-cover bg-no-repeat"
        style={{
          opacity: 1,
          transition: `opacity ${TRANSITION_MS}ms ${EASING}`,
          willChange: 'opacity',
        }}
      />

      {/* Click area */}
      <button
        type="button"
        aria-label="Next slide"
        className="absolute inset-0 z-10 block w-full h-full cursor-pointer"
        onClick={handleNext}
      />

      {/* Very subtle dark film for readability */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-black/[0.06]" />

      {/* Bottom-left number navigation */}
      <nav className="fixed left-4 md:left-8 bottom-8 z-30">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-x-3 gap-y-2 max-w-[200px]">
            {slides.map((_, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isTransitioning || isActive) return;
                    goToSlide(index);
                  }}
                  className={`cursor-pointer font-mono text-xs transition-all duration-300 ${
                    isActive
                      ? 'text-white font-bold'
                      : 'text-white/30 hover:text-white/60'
                  }`}
                  style={{ letterSpacing: '0.05em' }}
                  aria-label={`Go to slide ${index + 1}`}
                >
                  {String(index + 1).padStart(2, '0')}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Optional title/info */}
      {(currentTitle || currentInfo) && (
        <div className="absolute left-4 md:left-8 bottom-20 md:bottom-24 z-20 max-w-md md:max-w-lg text-white">
          <div
            key={activeIndex}
            style={{
              animation: `fadeInUp 500ms ${EASING}`,
            }}
          >
            {currentTitle && (
              <h2 className="text-2xl md:text-4xl mb-2 drop-shadow-lg">
                {currentTitle}
              </h2>
            )}
            {currentInfo && (
              <p className="text-sm md:text-base text-white/85 drop-shadow-md">
                {currentInfo}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bottom-right arrows */}
      

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};