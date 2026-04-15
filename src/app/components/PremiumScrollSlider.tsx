import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Work } from '@/data/works';
import { getLocalizedThumbnail } from '@/utils/getLocalizedImage';

interface PremiumScrollSliderProps {
  works: Work[];
  onWorkClick?: (workId: string) => void;
  onBrightnessChange?: (isDark: boolean) => void;
}

export const PremiumScrollSlider = ({
  works,
  onWorkClick,
  onBrightnessChange,
}: PremiumScrollSliderProps) => {
  const { lang } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isAutoPlayActive, setIsAutoPlayActive] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getTitle = (work: Work) =>
    lang === 'ko' ? work.title_ko : lang === 'jp' ? work.title_jp : work.title_en;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const analyzeImageBrightness = (imageSrc: string) => {
    if (!imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageSrc;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 50;
        canvas.height = 50;

        ctx.drawImage(img, 0, 0, 50, 50);

        const imageData = ctx.getImageData(0, 0, 50, 50);
        const data = imageData.data;
        let totalBrightness = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const brightness = Math.sqrt(
            0.299 * (r * r) +
              0.587 * (g * g) +
              0.114 * (b * b)
          );

          totalBrightness += brightness;
        }

        const avgBrightness = totalBrightness / (data.length / 4);
        const isDarkBackground = avgBrightness < 128;

        setIsDark(isDarkBackground);
        if (onBrightnessChange) onBrightnessChange(isDarkBackground);
      } catch (e) {
        console.warn('Brightness analysis skipped (CORS/Canvas):', e);
        setIsDark(true);
        if (onBrightnessChange) onBrightnessChange(true);
      }
    };

    img.onerror = () => {
      setIsDark(true);
      if (onBrightnessChange) onBrightnessChange(true);
    };
  };

  useEffect(() => {
    if (works && works.length > 0 && works[activeIndex]) {
      const currentWork = works[activeIndex];
      const imageSrc =
        getLocalizedThumbnail(currentWork, lang) || currentWork.galleryImages?.[0];

      if (imageSrc) {
        analyzeImageBrightness(imageSrc);
      }
    }
  }, [activeIndex, works, lang]);

  const navigateToSlide = (targetIndex: number) => {
    if (isTransitioning || targetIndex === activeIndex) return;

    setIsTransitioning(true);
    setActiveIndex(targetIndex);

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 1000);
  };

  useEffect(() => {
    if (!isAutoPlayActive || works.length === 0) return;

    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);

    autoPlayTimeoutRef.current = setTimeout(() => {
      const nextIndex = (activeIndex + 1) % works.length;
      navigateToSlide(nextIndex);
    }, 3000);

    return () => {
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    };
  }, [activeIndex, isAutoPlayActive, works.length]);

  const handleUserInteraction = () => {
    setIsAutoPlayActive(false);
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
  };

  useEffect(() => {
    let lastScrollTime = 0;
    const scrollDelay = 1200;

    const handleWheel = (e: WheelEvent) => {
      if (window.innerWidth < 768) {
        return;
      }

      e.preventDefault();
      handleUserInteraction();

      const now = Date.now();
      if (now - lastScrollTime < scrollDelay || isTransitioning) return;
      if (Math.abs(e.deltaY) < 20) return;

      lastScrollTime = now;

      if (e.deltaY > 0) {
        const nextIndex = (activeIndex + 1) % works.length;
        navigateToSlide(nextIndex);
      } else if (e.deltaY < 0) {
        const prevIndex = (activeIndex - 1 + works.length) % works.length;
        navigateToSlide(prevIndex);
      }
    };

    let touchStartY = 0;
    let touchStartX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      handleUserInteraction();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndX = e.changedTouches[0].clientX;
      const now = Date.now();

      if (now - lastScrollTime < scrollDelay || isTransitioning) return;

      const diffY = touchStartY - touchEndY;
      const diffX = touchStartX - touchEndX;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > 50) {
          lastScrollTime = now;

          if (diffX > 0) {
            navigateToSlide((activeIndex + 1) % works.length);
          } else {
            navigateToSlide((activeIndex - 1 + works.length) % works.length);
          }
        }
      } else {
        if (Math.abs(diffY) > 50) {
          lastScrollTime = now;

          if (diffY > 0) {
            navigateToSlide((activeIndex + 1) % works.length);
          } else {
            navigateToSlide((activeIndex - 1 + works.length) % works.length);
          }
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeIndex, isTransitioning, works.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTransitioning) return;

      handleUserInteraction();

      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        const prevIndex = (activeIndex - 1 + works.length) % works.length;
        navigateToSlide(prevIndex);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        const nextIndex = (activeIndex + 1) % works.length;
        navigateToSlide(nextIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, isTransitioning, works.length]);

  const handleImageClick = () => {
    handleUserInteraction();
    const nextIndex = (activeIndex + 1) % works.length;
    navigateToSlide(nextIndex);
  };

  if (!works || works.length === 0) {
    return <div className="fixed inset-0 bg-background" />;
  }

  const activeButtonClass = isMobile
    ? 'text-black font-bold'
    : isDark
    ? 'text-white font-bold'
    : 'text-black font-bold';

  const inactiveButtonClass = isMobile
    ? 'text-black/30 hover:text-black/60'
    : isDark
    ? 'text-white/30 hover:text-white/60'
    : 'text-black/30 hover:text-black/60';

  return (
    <div className="fixed inset-0 overflow-hidden select-none touch-none bg-background">
      {works.map((work, index) => {
        const imageSrc = getLocalizedThumbnail(work, lang) || work.galleryImages[0];

        if (!imageSrc) {
          console.warn(`Work ${work.id} has no images for hero display`);
          return null;
        }

        return (
          <div
            key={work.id}
            onClick={handleImageClick}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
              index === activeIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            aria-hidden={index !== activeIndex}
          >
            <img
  src={imageSrc}
  alt={getTitle(work)}
  className={`w-full h-full ${isMobile ? 'object-contain' : 'object-cover'}`}
  style={{ objectPosition: 'center' }}
  draggable={false}
  loading={index <= 1 ? 'eager' : 'lazy'}
  decoding={index <= 1 ? 'sync' : 'async'}
/>
          </div>
        );
      })}

      <nav className="fixed left-8 bottom-8 z-30">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-x-3 gap-y-2 max-w-[200px]">
            {works.map((work, index) => (
              <button
                key={work.id}
                onClick={() => navigateToSlide(index)}
                disabled={isTransitioning}
                className={`cursor-pointer font-mono text-xs transition-all duration-300 ${
                  index === activeIndex ? activeButtonClass : inactiveButtonClass
                }`}
                style={{
                  letterSpacing: '0.05em',
                }}
              >
                {String(index + 1).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};