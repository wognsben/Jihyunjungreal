import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Work } from '@/data/works';
import { getLocalizedThumbnail } from '@/utils/getLocalizedImage';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import gsap from 'gsap';
import { Observer } from 'gsap/Observer';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(Observer);
}

interface CardStackSlideshowProps {
  works: Work[];
}

export const CardStackSlideshow = ({ works }: CardStackSlideshowProps) => {
  const { lang } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const observerRef = useRef<any>(null);

  const getTitle = (work: Work) => {
    switch (lang) {
      case 'ko': return work.title_ko;
      case 'jp': return work.title_jp;
      default: return work.title_en;
    }
  };

  // Preload images
  useEffect(() => {
    let loaded = 0;
    const total = works.length;

    works.forEach((work) => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded === total) {
          setTimeout(() => setImagesLoaded(true), 300);
        }
      };
      img.onerror = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded === total) {
          setTimeout(() => setImagesLoaded(true), 300);
        }
      };
      img.src = getLocalizedThumbnail(work, lang);
    });
  }, [works, lang]);

  // Calculate card position in stack
  const getCardStyle = (index: number) => {
    const diff = index - activeIndex;
    
    // Active card (front) - 80% of screen, left side
    if (diff === 0) {
      return {
        zIndex: 10,
        opacity: 1,
        left: '0',
        width: '80%',
        height: '100%',
        pointerEvents: 'auto' as const,
      };
    }
    
    // Cards on the right side (stacked vertically) - 3% each
    if (diff > 0 && diff <= 4) {
      return {
        zIndex: 10 - diff,
        opacity: 0.7 + (0.3 / diff), // Gradually fade
        left: `${80 + (diff - 1) * 3}%`, // 80%, 83%, 86%, 89%
        width: '3%',
        height: '100%',
        pointerEvents: 'auto' as const,
      };
    }
    
    // Hidden cards (before or too far behind)
    return {
      zIndex: 0,
      opacity: 0,
      left: '100%',
      width: '3%',
      height: '100%',
      pointerEvents: 'none' as const,
    };
  };

  // Navigate with GSAP animations
  const navigate = useCallback((direction: 1 | -1) => {
    if (isAnimating) return;
    setIsAnimating(true);

    const nextIndex = direction === 1 
      ? (activeIndex + 1) % works.length
      : (activeIndex - 1 + works.length) % works.length;

    // Animate all cards smoothly
    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      
      const currentStyle = getCardStyle(index);
      const nextStyle = getCardStyle(index - (nextIndex - activeIndex));
      
      gsap.to(card, {
        zIndex: nextStyle.zIndex,
        opacity: nextStyle.opacity,
        left: nextStyle.left,
        width: nextStyle.width,
        height: nextStyle.height,
        duration: 0.8,
        ease: 'power3.out',
      });
    });

    setTimeout(() => {
      setActiveIndex(nextIndex);
      setIsAnimating(false);
    }, 800);
  }, [isAnimating, activeIndex, works.length]);

  const handleNext = useCallback(() => navigate(1), [navigate]);
  const handlePrev = useCallback(() => navigate(-1), [navigate]);

  // Jump to specific slide
  const handleJumpTo = useCallback((index: number) => {
    if (index === activeIndex || isAnimating) return;
    
    setIsAnimating(true);
    
    // Animate all cards smoothly
    cardRefs.current.forEach((card, cardIndex) => {
      if (!card) return;
      
      const nextStyle = getCardStyle(cardIndex - (index - activeIndex));
      
      gsap.to(card, {
        zIndex: nextStyle.zIndex,
        opacity: nextStyle.opacity,
        left: nextStyle.left,
        width: nextStyle.width,
        height: nextStyle.height,
        duration: 0.8,
        ease: 'power3.out',
      });
    });

    setTimeout(() => {
      setActiveIndex(index);
      setIsAnimating(false);
    }, 800);
  }, [activeIndex, isAnimating]);

  // GSAP Observer for wheel/touch
  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = Observer.create({
      target: containerRef.current,
      type: 'wheel,touch',
      onDown: () => !isAnimating && handlePrev(),
      onUp: () => !isAnimating && handleNext(),
      wheelSpeed: -1,
      tolerance: 30,
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.kill();
      }
    };
  }, [handleNext, handlePrev, isAnimating]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  // Loading screen
  if (!imagesLoaded) {
    return (
      <div 
        className="relative w-full bg-white flex items-center justify-center"
        style={{ 
          height: '100vh',
          minHeight: '500px',
        }}
      >
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border border-black/5 rounded-full"></div>
            <div 
              className="absolute inset-0 border border-black rounded-full border-t-transparent animate-spin"
              style={{ animationDuration: '1.2s' }}
            ></div>
          </div>
          <p className="text-black/30 text-[10px] tracking-[0.3em] uppercase font-mono">
            {loadedCount} / {works.length}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full overflow-hidden bg-white"
      style={{ 
        height: '100vh',
        minHeight: '500px',
      }}
    >
      {/* Cards Container */}
      <div className="absolute inset-0">
        {works.map((work, index) => {
          const title = getTitle(work);
          const style = getCardStyle(index);
          const isActive = index === activeIndex;
          
          return (
            <div
              key={work.id}
              ref={(el) => (cardRefs.current[index] = el)}
              className="absolute top-0 transition-all duration-700 ease-out"
              style={{
                ...style,
              }}
            >
              <a
                href={`#/work/${work.id}`}
                className={`block w-full h-full overflow-hidden ${
                  isActive ? 'cursor-pointer' : 'cursor-pointer'
                }`}
              >
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${getLocalizedThumbnail(work, lang)})`,
                    filter: isActive ? 'none' : 'grayscale(20%)',
                  }}
                />
              </a>

              {/* Title overlay - only on active card, minimal */}
              {isActive && (
                <div 
                  className="absolute bottom-0 left-0 right-0 p-6 md:p-8"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                  }}
                >
                  <p 
                    className="text-white text-2xl md:text-3xl"
                    style={{
                      fontWeight: 300,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {title}
                  </p>
                  <p 
                    className="text-white/60 text-xs md:text-sm mt-1 font-mono tracking-wider"
                  >
                    {work.year}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation - Bottom Center (minimal) */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[60] flex items-center gap-8">
        {/* Previous Button */}
        <button
          onClick={handlePrev}
          disabled={isAnimating}
          aria-label="Previous"
          className="w-11 h-11 rounded-full border border-black/10 bg-white/90 backdrop-blur-sm flex items-center justify-center transition-all hover:border-black/30 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5 text-black" />
        </button>

        {/* Indicators */}
        <div className="flex items-center gap-2">
          {works.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleJumpTo(idx)}
              disabled={isAnimating}
              aria-label={`Go to slide ${idx + 1}`}
              className="transition-all disabled:cursor-not-allowed"
            >
              <div 
                className="rounded-full transition-all"
                style={{
                  width: idx === activeIndex ? '24px' : '6px',
                  height: '6px',
                  backgroundColor: idx === activeIndex ? '#000' : 'rgba(0,0,0,0.15)',
                }}
              />
            </button>
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={isAnimating}
          aria-label="Next"
          className="w-11 h-11 rounded-full border border-black/10 bg-white/90 backdrop-blur-sm flex items-center justify-center transition-all hover:border-black/30 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5 text-black" />
        </button>
      </div>

      {/* Minimal hint - only on desktop */}
      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-[60] hidden md:block pointer-events-none">
        <p 
          className="text-black/20 text-[9px] font-mono uppercase tracking-[0.3em]"
        >
          Scroll • Arrow Keys
        </p>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
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