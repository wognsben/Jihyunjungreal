import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Work } from '@/data/works';
import { getLocalizedThumbnail } from '@/utils/getLocalizedImage';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import gsap from 'gsap';
import { Observer } from 'gsap/Observer';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(Observer);
}

interface PremiumSlideshowProps {
  works: Work[];
  onBrightnessChange?: (isDark: boolean) => void;
}

export const PremiumSlideshow = ({ works, onBrightnessChange }: PremiumSlideshowProps) => {
  const { lang } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [progress, setProgress] = useState(0);
  
  const slidesRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const observerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  const getTitle = (work: Work) => {
    switch (lang) {
      case 'ko': return work.title_ko;
      case 'jp': return work.title_jp;
      default: return work.title_en;
    }
  };

  const getInfo = (work: Work) => {
    switch (lang) {
      case 'ko': return work.oneLineInfo_ko;
      case 'jp': return work.oneLineInfo_jp;
      default: return work.oneLineInfo_en;
    }
  };

  // Auto progress (visual only, doesn't auto-advance)
  useEffect(() => {
    setProgress(0);
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressIntervalRef.current);
          return 100;
        }
        return prev + 0.5; // 20 seconds to fill
      });
    }, 100);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [activeIndex]);

  // Preload images
  useEffect(() => {
    let loaded = 0;
    const total = Math.min(works.length, 3);

    works.slice(0, 3).forEach((work) => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded === total) {
          setTimeout(() => setImagesLoaded(true), 500);
        }
      };
      img.onerror = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded === total) {
          setTimeout(() => setImagesLoaded(true), 500);
        }
      };
      img.src = getLocalizedThumbnail(work, lang);
    });
  }, [works, lang]);

  // Initialize slide positions
  useEffect(() => {
    slideRefs.current.forEach((slide, index) => {
      if (!slide) return;
      
      const slideInner = imageRefs.current[index];
      
      // Reset all slides to initial position
      gsap.set(slide, {
        xPercent: 0,
        opacity: index === activeIndex ? 1 : 0,
      });
      
      if (slideInner) {
        gsap.set(slideInner, {
          xPercent: 0,
          scale: 1,
        });
      }
    });
  }, [activeIndex, imagesLoaded]);

  // Navigate with GSAP animations
  const navigate = useCallback((direction: 1 | -1) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setProgress(0);

    const previous = activeIndex;
    const next = direction === 1 
      ? (activeIndex + 1) % works.length
      : (activeIndex - 1 + works.length) % works.length;

    const currentSlide = slideRefs.current[previous];
    const currentInner = imageRefs.current[previous];
    const upcomingSlide = slideRefs.current[next];
    const upcomingInner = imageRefs.current[next];

    if (!currentSlide || !currentInner || !upcomingSlide || !upcomingInner) {
      setIsAnimating(false);
      return;
    }

    // GSAP Timeline with parallax effect
    const timeline = gsap.timeline({
      defaults: {
        duration: 1.5,
        ease: 'power4.inOut',
      },
      onStart: () => {
        setActiveIndex(next);
        // Make upcoming slide visible
        gsap.set(upcomingSlide, { opacity: 1 });
      },
      onComplete: () => {
        setIsAnimating(false);
        // Hide previous slide
        gsap.set(currentSlide, { opacity: 0, xPercent: 0 });
        if (currentInner) {
          gsap.set(currentInner, { xPercent: 0, scale: 1 });
        }
      },
    });

    timeline
      .addLabel('start', 0)
      .to(currentSlide, {
        xPercent: -direction * 100,
      }, 'start')
      .to(currentInner, {
        xPercent: direction * 30,
        scale: 1.05,
      }, 'start')
      .fromTo(upcomingSlide, {
        xPercent: direction * 100,
      }, {
        xPercent: 0,
      }, 'start')
      .fromTo(upcomingInner, {
        xPercent: -direction * 30,
        scale: 1.1,
      }, {
        xPercent: 0,
        scale: 1,
      }, 'start');
  }, [isAnimating, activeIndex, works.length]);

  const handleNext = useCallback(() => navigate(1), [navigate]);
  const handlePrev = useCallback(() => navigate(-1), [navigate]);

  // Jump to specific slide
  const handleJumpTo = useCallback((index: number) => {
    if (index === activeIndex || isAnimating) return;
    const direction = index > activeIndex ? 1 : -1;
    
    // For direct jump, we need to adjust the logic
    setIsAnimating(true);
    setProgress(0);
    
    const currentSlide = slideRefs.current[activeIndex];
    const currentInner = imageRefs.current[activeIndex];
    const targetSlide = slideRefs.current[index];
    const targetInner = imageRefs.current[index];

    if (!currentSlide || !currentInner || !targetSlide || !targetInner) {
      setIsAnimating(false);
      return;
    }

    const timeline = gsap.timeline({
      defaults: {
        duration: 1.5,
        ease: 'power4.inOut',
      },
      onStart: () => {
        setActiveIndex(index);
        // Make target slide visible
        gsap.set(targetSlide, { opacity: 1 });
      },
      onComplete: () => {
        setIsAnimating(false);
        // Hide previous slide
        gsap.set(currentSlide, { opacity: 0, xPercent: 0 });
        if (currentInner) {
          gsap.set(currentInner, { xPercent: 0, scale: 1 });
        }
      },
    });

    timeline
      .addLabel('start', 0)
      .to(currentSlide, {
        xPercent: -direction * 100,
      }, 'start')
      .to(currentInner, {
        xPercent: direction * 30,
        scale: 1.05,
      }, 'start')
      .fromTo(targetSlide, {
        xPercent: direction * 100,
      }, {
        xPercent: 0,
      }, 'start')
      .fromTo(targetInner, {
        xPercent: -direction * 30,
        scale: 1.1,
      }, {
        xPercent: 0,
        scale: 1,
      }, 'start');
  }, [activeIndex, isAnimating]);

  // GSAP Observer for wheel/touch/drag
  useEffect(() => {
    const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    
    if (!isDesktop || !slidesRef.current) return;

    observerRef.current = Observer.create({
      target: slidesRef.current,
      type: 'wheel,touch,pointer',
      onDown: () => handlePrev(),
      onUp: () => handleNext(),
      wheelSpeed: -1,
      tolerance: 20,
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.kill();
      }
    };
  }, [handleNext, handlePrev]);

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

  // Block hover during animation
  useEffect(() => {
    if (isAnimating) {
      setIsHovered(false);
    }
  }, [isAnimating]);

  // Loading screen
  if (!imagesLoaded) {
    return (
      <div 
        className="relative w-full bg-black flex items-center justify-center"
        style={{ 
          height: 'calc(100vh - var(--header-height))',
          minHeight: '500px',
          marginTop: 'var(--header-height)'
        }}
      >
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
            <div 
              className="absolute inset-0 border-2 border-white rounded-full border-t-transparent animate-spin"
              style={{ animationDuration: '1.5s' }}
            ></div>
          </div>
          <p className="text-white/40 text-xs tracking-[0.3em] uppercase font-mono">
            Loading {loadedCount} / {Math.min(works.length, 3)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={slidesRef}
      className={`relative w-full overflow-hidden ${isAnimating ? 'is-animating' : ''}`}
      style={{ 
        height: '100vh',
        minHeight: '500px',
      }}
    >
      {/* Backdrop Layer - changes to soft white on hover */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundColor: isHovered ? '#fafafa' : '#ffffff', // White when not hovered
        }}
      />

      {/* Subtle vignette - only when not hovered */}
      {!isHovered && (
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{
            background: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.4) 100%)',
          }}
        />
      )}

      {/* Slides Container */}
      <div className="absolute inset-0">
        {works.map((work, index) => {
          const title = getTitle(work);
          const info = getInfo(work);
          const isActive = index === activeIndex;
          
          return (
            <div
              key={work.id}
              ref={(el) => (slideRefs.current[index] = el)}
              className={`slide absolute inset-0 ${isActive ? 'slide--current' : ''}`}
              onMouseEnter={() => !isAnimating && isActive && setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              style={{
                opacity: isActive ? 1 : 0,
                pointerEvents: isActive ? 'auto' : 'none',
                zIndex: isActive ? 10 : 0,
              }}
            >
              {/* Image Frame - Always Fullscreen */}
              <div
                onClick={handleNext}
                className="slide__media block w-full h-full relative focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 transition-all duration-700 ease-out cursor-pointer"
                style={{
                  clipPath: 'inset(0%)', // Always fullscreen
                  transform: isHovered && isActive ? 'scale(1.02)' : 'scale(1)', // Slight zoom only, no shrinking
                }}
              >
                <div
                  ref={(el) => (imageRefs.current[index] = el)}
                  className="slide__img absolute inset-0 w-full h-full"
                  style={{
                    backgroundImage: `url(${getLocalizedThumbnail(work, lang)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: '50% 50%',
                    backgroundRepeat: 'no-repeat',
                    filter: 'grayscale(20%) contrast(1.05)',
                  }}
                />
              </div>

              {/* Hover Overlay Content - PC Only */}
              {/* This is hidden on mobile/touch devices via pointer-fine media query */}
              {isHovered && isActive && (
                <div 
                  className="absolute inset-0 z-30 hidden pointer-fine:block"
                  style={{
                    animation: 'fadeIn 0.4s ease-out both',
                    pointerEvents: 'none',
                  }}
                >
                  {/* Left Side: Project Info */}
                  <div className="absolute top-32 left-12 max-w-md">
                    <h3 
                      className="text-5xl mb-3"
                      style={{
                        color: '#0a0a0a',
                        fontWeight: 300,
                        letterSpacing: '-0.02em',
                        lineHeight: 1.1,
                        pointerEvents: 'auto',
                      }}
                    >
                      {title}
                    </h3>
                    <p 
                      className="text-sm mb-4 font-mono"
                      style={{
                        color: '#0a0a0a',
                        opacity: 0.4,
                        letterSpacing: '0.1em',
                        pointerEvents: 'auto',
                      }}
                    >
                      {work.year}
                    </p>
                    {info && (
                      <p 
                        className="text-base mb-8"
                        style={{
                          color: '#0a0a0a',
                          opacity: 0.6,
                          letterSpacing: '0.02em',
                          lineHeight: 1.6,
                          pointerEvents: 'auto',
                        }}
                      >
                        {info}
                      </p>
                    )}
                    
                    {/* View Project Button */}
                    <a
                      href={`#/work/${work.id}`}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full border transition-all hover:bg-black hover:text-white group"
                      style={{
                        borderColor: 'rgba(10, 10, 10, 0.15)',
                        color: '#0a0a0a',
                        pointerEvents: 'auto',
                      }}
                    >
                      <span 
                        className="text-xs uppercase tracking-wider font-mono"
                        style={{ letterSpacing: '0.15em' }}
                      >
                        View Project
                      </span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </div>
                </div>
              )}

              {/* Mobile/Tablet Permanent Overlay */}
              {/* Visible ONLY on touch devices where hover is not supported */}
              {isActive && (
                <div 
                  className="absolute inset-0 z-30 pointer-coarse:block hidden pointer-events-none"
                >
                   <div className="absolute bottom-32 left-6 right-6 flex flex-col items-start gap-4">
                      <div>
                        <h3 className="text-3xl font-light text-white mb-1 drop-shadow-md">{title}</h3>
                        <p className="text-white/70 text-sm font-mono tracking-widest drop-shadow-md">{work.year}</p>
                      </div>
                      
                      <a
                        href={`#/work/${work.id}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white pointer-events-auto active:bg-white/20 transition-all"
                      >
                         <span className="text-xs uppercase tracking-wider font-mono">View Project</span>
                         <ArrowRight className="w-4 h-4" />
                      </a>
                   </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Variations Grid - ALWAYS VISIBLE (moved down below header) */}
      <div className="absolute top-32 right-8 md:right-16 z-30">
        <div className="flex items-center gap-x-5">
          {works.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.preventDefault();
                handleJumpTo(idx);
              }}
              disabled={isAnimating}
              className="text-center transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                color: idx === activeIndex 
                  ? (isHovered ? '#0a0a0a' : '#fff') // White by default for fullscreen overlay
                  : (isHovered ? 'rgba(10, 10, 10, 0.3)' : 'rgba(255, 255, 255, 0.5)'),
                textShadow: isHovered ? 'none' : '0 1px 2px rgba(0,0,0,0.3)', // Shadow for visibility on image
                fontSize: '14px',
                fontWeight: idx === activeIndex ? 500 : 400,
                letterSpacing: '0.03em',
                opacity: idx === activeIndex ? 1 : 0.7,
              }}
            >
              {String(idx + 1).padStart(2, '0')}
            </button>
          ))}
        </div>
      </div>

      {/* Progress Bar - Top */}
      <div className="absolute top-0 left-0 right-0 z-20 h-[1px]" style={{ backgroundColor: isHovered ? 'rgba(10, 10, 10, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
        <div 
          className="h-full transition-all duration-100 ease-linear"
          style={{ 
            width: `${progress}%`,
            backgroundColor: isHovered ? '#0a0a0a' : '#fff',
          }}
        />
      </div>

      {/* Navigation Buttons - Bottom Right (always visible) */}
      <div className="absolute bottom-16 right-6 md:right-12 z-20 flex items-center gap-4">
        <button
          onClick={(e) => {
            e.preventDefault();
            handlePrev();
          }}
          disabled={isAnimating}
          aria-label="Previous slide"
          className="group w-12 h-12 md:w-14 md:h-14 rounded-full border backdrop-blur-sm flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            borderColor: isHovered ? 'rgba(10, 10, 10, 0.15)' : 'rgba(255, 255, 255, 0.3)',
            backgroundColor: isHovered ? 'rgba(250, 250, 250, 0.5)' : 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <ChevronLeft 
            className="w-5 h-5 md:w-6 md:h-6 transition-colors" 
            style={{ color: isHovered ? '#0a0a0a' : '#fff' }}
          />
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            handleNext();
          }}
          disabled={isAnimating}
          aria-label="Next slide"
          className="group w-12 h-12 md:w-14 md:h-14 rounded-full border backdrop-blur-sm flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            borderColor: isHovered ? 'rgba(10, 10, 10, 0.15)' : 'rgba(255, 255, 255, 0.3)',
            backgroundColor: isHovered ? 'rgba(250, 250, 250, 0.5)' : 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <ChevronRight 
            className="w-5 h-5 md:w-6 md:h-6 transition-colors" 
            style={{ color: isHovered ? '#0a0a0a' : '#fff' }}
          />
        </button>
      </div>

      {/* Hint Text - Bottom Center (always visible) */}
      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-20 hidden md:block pointer-events-none">
        <p 
          className="text-[10px] font-mono uppercase transition-colors duration-700"
          style={{ 
            letterSpacing: '0.3em',
            color: isHovered ? '#0a0a0a' : '#fff',
            opacity: isHovered ? 0.25 : 0.25,
            textShadow: isHovered ? 'none' : '0 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          Scroll • Drag • Arrow Keys
        </p>
      </div>

      {/* Animations */}
      <style>{`
        .slide {
          will-change: transform, opacity;
        }

        .slide__img {
          will-change: transform, opacity, filter;
        }

        .is-animating .slide__media:hover {
          pointer-events: none;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* Prevent text selection during animation */
        .is-animating * {
          user-select: none;
        }

        /* Smooth font rendering */
        h2, h3, p {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </div>
  );
};