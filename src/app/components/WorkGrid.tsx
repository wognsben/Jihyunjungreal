import { useRef, useMemo, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorks } from '@/contexts/WorkContext';
import { fetchWorkById } from '@/services/wp-api';
import { PremiumImage } from '@/app/components/ui/PremiumImage';
import { getLocalizedThumbnail } from '@/utils/getLocalizedImage';
import { toCdnUrl } from '@/utils/toCdnUrl';

interface WorkGridProps {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
}

export const WorkGrid = ({ currentFilter, onFilterChange }: WorkGridProps) => {
  const { lang } = useLanguage();
  const { works } = useWorks();

  const containerRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const prefetchedWorkIdsRef = useRef<Set<string>>(new Set());

  // ================================
// Popup (오늘 보지 않기) 상태
// ================================
const [showPopup, setShowPopup] = useState(false);

// 한국 시간 기준 오늘 날짜 (YYYY-MM-DD)
const getKoreanDateString = () => {
  const now = new Date();

  const koreaTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
  );

  const year = koreaTime.getFullYear();
  const month = String(koreaTime.getMonth() + 1).padStart(2, '0');
  const day = String(koreaTime.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

  const filterLabels = {
    ko: {
      all: '전체',
      works: '작업',
      proj: '프로젝트',
      exhib: '전시',
    },
    en: {
      all: 'All',
      works: 'Works',
      proj: 'Projects',
      exhib: 'Exhibition',
    },
    jp: {
      all: 'すべて',
      works: '作品',
      proj: 'プロジェクト',
      exhib: '展示',
    },
  };

  const popupLabels = {
  ko: {
    message: '현재 홈페이지는 리뉴얼 중입니다.',
    hideToday: '오늘 보지 않기',
    close: '닫기',
  },
  en: {
    message: 'The website is currently being redesigned.',
    hideToday: 'Do not show again today',
    close: 'Close',
  },
  jp: {
    message: '現在、ページはリニューアル中です。',
    hideToday: '今日は表示しない',
    close: '閉じる',
  },
};

  const handleFilterChange = (filter: string) => {
    onFilterChange(filter);
  };

  useEffect(() => {
    const checkMobile = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w <= 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ================================
// Popup 표시 여부 체크
// ================================
useEffect(() => {
  const today = getKoreanDateString();
  const savedDate = localStorage.getItem('workgrid_popup_hide_date');

  if (savedDate !== today) {
    setShowPopup(true);
  }
}, []);

  const extractFirstImageFromHtml = (html: string): string => {
    if (!html) return '';

    const match = html.match(/<img[^>]+src="([^">]+)"/i);
    return match?.[1]?.trim() || '';
  };

  const getLocalizedGridImage = (work: any): string => {
    const koContent = work.content_rendered || '';

    const localizedContent =
      lang === 'en'
        ? (work.content_en?.trim() || koContent)
        : lang === 'jp'
        ? (work.content_jp?.trim() || koContent)
        : koContent;

    const firstImageFromLocalizedHtml = extractFirstImageFromHtml(localizedContent);
    if (firstImageFromLocalizedHtml) {
      return toCdnUrl(firstImageFromLocalizedHtml);
    }

    return getLocalizedThumbnail(work, lang) || '';
  };

  const sortedWorks = useMemo(() => {
    if (!works || works.length === 0) return [];

    const baseSorted = [...works].sort((a: any, b: any) => {
      const yearDiff = (b.year || 0) - (a.year || 0);
      if (yearDiff !== 0) return yearDiff;
      return String(b.id).localeCompare(String(a.id));
    });

    const seenImages = new Set<string>();
    const uniqueWorks: any[] = [];
    const duplicateWorks: any[] = [];

    baseSorted.forEach((work: any) => {
      const imgUrl =
        getLocalizedThumbnail(work, lang) || (work.galleryImages && work.galleryImages[0]);

      if (imgUrl && !seenImages.has(imgUrl)) {
        seenImages.add(imgUrl);
        uniqueWorks.push(work);
      } else {
        duplicateWorks.push(work);
      }
    });

    return [...uniqueWorks, ...duplicateWorks];
  }, [works, lang]);

  const filteredWorks = useMemo(() => {
    if (!sortedWorks.length) return [];

    const source = [...sortedWorks];

    const getCat = (work: any): string => {
      const raw = work.category;
      if (!raw) return '';
      if (typeof raw === 'string') return raw.toLowerCase();
      if (Array.isArray(raw)) return raw.join(' ').toLowerCase();
      if (typeof raw === 'object' && raw.label) return String(raw.label).toLowerCase();
      return String(raw).toLowerCase();
    };

    switch (currentFilter.toLowerCase()) {
      case 'proj':
        return source.filter((work: any) => getCat(work).includes('project'));

      case 'exhib':
        return source.filter((work: any) => getCat(work).includes('exhibition'));

      case 'works':
        return source.filter((work: any) => {
          const cat = getCat(work);
          return cat.includes('work') || cat === '';
        });

      case 'all':
      default:
        return source;
    }
  }, [sortedWorks, currentFilter]);

  const columns = useMemo(() => {
    const numCols = isMobile ? 1 : isTablet ? 2 : 4;
    const cols: any[][] = Array.from({ length: numCols }, () => []);

    filteredWorks.forEach((work: any, index: number) => {
      const colIndex = index % numCols;
      cols[colIndex].push(work);
    });

    return cols;
  }, [filteredWorks, isMobile, isTablet]);

  const getTitle = (work: any) =>
  lang === 'ko' ? work.title_ko : lang === 'jp' ? work.title_jp : work.title_en;

const getMedium = (work: any) =>
  lang === 'ko' ? work.medium_ko : lang === 'jp' ? work.medium_jp : work.medium_en;

// ================================
// Popup handlers
// ================================
const handleClosePopup = () => {
  setShowPopup(false);
};

const handleHideToday = () => {
  const today = getKoreanDateString();
  localStorage.setItem('workgrid_popup_hide_date', today);
  setShowPopup(false);
};

const prefetchWorkDetail = async (work: any) => {
  const key = `${work.id}_${lang}`;

  if (prefetchedWorkIdsRef.current.has(key)) return;
  prefetchedWorkIdsRef.current.add(key);

  try {
    // 데이터만 prefetch
    fetchWorkById(work.id, lang);
  } catch (error) {
    console.error('Failed to prefetch work detail:', error);
  }
};

  return (
    <div
      ref={containerRef}
      className="w-full min-h-screen bg-background text-foreground pt-32 pb-20"
    >
      <div className="px-6 md:px-12 mb-12 md:mb-16">
        <div className="flex flex-wrap items-center gap-3">
          {[
            { id: 'all', label: filterLabels[lang].all },
            { id: 'works', label: filterLabels[lang].works },
            { id: 'proj', label: filterLabels[lang].proj },
            { id: 'exhib', label: filterLabels[lang].exhib },
          ].map((item, index, array) => (
            <div key={item.id} className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFilterChange(item.id);
                }}
                className={`
                  text-xs md:text-sm tracking-widest transition-colors duration-300
                  ${
                    currentFilter.toLowerCase() === item.id
                      ? 'text-black dark:text-white font-bold'
                      : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                  }
                `}
              >
                {item.label}
              </button>

              {index < array.length - 1 && (
                <span className="text-gray-400 dark:text-gray-500 text-xs">/</span>
              )}
            </div>
          ))}
        </div>
      </div>

            <div className="px-4 md:px-6">
        <div className="flex flex-col md:flex-row gap-1 w-full items-start justify-center">
          {columns.map((colWorks, colIndex) => (
            <div
              key={`col-${colIndex}`}
              className={`flex flex-col gap-1 flex-1 w-full ${
                isTablet ? 'md:w-1/2' : 'md:w-1/4'
              }`}
            >
              {colWorks.map((work: any, workIndex: number) => {
                const globalIndex = colIndex + workIndex * columns.length;
                const shouldPrioritize = globalIndex < 8;

                return (
                  <div
                    key={work.id}
                    className="relative group cursor-pointer w-full select-none"
                    onMouseEnter={() => {
                      prefetchWorkDetail(work);
                    }}
                    onFocus={() => {
                      prefetchWorkDetail(work);
                    }}
                    onClick={async () => {
                      try {
        
                      } catch (e) {
                        console.error('prefetch failed', e);
                      }

                      window.location.hash = `#/work/${work.id}`;
                    }}
                  >
                    <div className="relative w-full aspect-[4/3] overflow-hidden">
                      <PremiumImage
                        src={getLocalizedGridImage(work) || ''}
                        alt={getTitle(work)}
                        className={`w-full h-full ${isMobile ? 'object-contain' : 'object-cover'}`}
                        containerClassName="w-full h-full"
                        priority={shouldPrioritize}
                      />

                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out pointer-events-none" />

                      <div className="absolute bottom-8 left-0 right-0 flex items-end justify-center pointer-events-none z-30 px-6 text-center">
                        <div
                          className="
                            flex flex-col items-center gap-1
                            opacity-0 translate-y-8
                            group-hover:opacity-100 group-hover:translate-y-0
                            transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] delay-75
                          "
                        >
                          <h3 className="text-white font-bold text-xl tracking-wider drop-shadow-md">
                            {getTitle(work)}
                          </h3>

                          <p className="text-white/80 text-sm tracking-[0.12em] drop-shadow-sm">
                            {work.year}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ================================
          Popup UI
      ================================= */}
      {showPopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div className="bg-white px-6 py-6 w-[90%] max-w-md text-center">
            <p className="text-sm mb-4 tracking-wide">
  {popupLabels[lang].message}
</p>

<div className="flex justify-center gap-4 text-xs tracking-widest">
  <button
    onClick={handleHideToday}
    className="text-gray-500 hover:text-black transition"
  >
    {popupLabels[lang].hideToday}
  </button>

  <button
    onClick={handleClosePopup}
    className="text-black font-bold"
  >
    {popupLabels[lang].close}
  </button>
</div>
          </div>
        </div>
      )}
    </div>
  );
};