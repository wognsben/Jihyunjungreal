import { useLanguage } from '@/contexts/LanguageContext';
import { useWorks } from '@/contexts/WorkContext';
import { SplitTextLink } from '@/app/components/SplitTextLink';
import { useState, useEffect } from 'react';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import { preloadAboutData } from '@/app/components/About';

interface HeaderProps {
  currentView: 'index' | 'work' | 'work-detail' | 'about' | 'text' | 'text-detail';
  onNavigate: (view: 'index' | 'work' | 'work-detail' | 'about' | 'text') => void;
  isDarkBackground?: boolean;
  detailTitle?: string; // 상세 페이지에서 보여줄 제목 (옵션)
}

type NavItem = 'work' | 'text' | 'about';

export const Header = ({
  currentView,
  onNavigate,
  isDarkBackground = true,
  detailTitle,
}: HeaderProps) => {
  const { lang, setLang } = useLanguage();
  const { ensureWorksLoaded, ensureTextsLoaded } = useWorks();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Mobile About 전용 조건
  const isMobile = useIsMobile();
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 9999
  );

  const isMobileAbout = false;
  const isNarrowViewport = windowWidth < 1320;
  const isDetailView =
    currentView === 'work-detail' || currentView === 'text-detail';
  const isNarrowDetailHeader = isNarrowViewport && isDetailView;
  const shouldAlwaysShowMainHeader = false;

  // 1319 이하에서 글로벌 헤더에도 white layer 적용
  const showMainHeaderWhiteLayer =
    isNarrowViewport &&
    (currentView === 'about' ||
      currentView === 'work-detail' ||
      currentView === 'text-detail');

  // 1319 이하 detail에서는 context indicator에도 white layer 적용
  const showContextWhiteLayer = isNarrowDetailHeader;

  // --------------------------------------------------------------------------------
  // [Premium UX] Smart Scroll Behavior
  // --------------------------------------------------------------------------------
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // About은 항상 글로벌 헤더 유지
      if (shouldAlwaysShowMainHeader) {
        setIsVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }

      // 상단이거나 스크롤을 올릴 때 보임
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // 내리는 중
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // 올리는 중
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, shouldAlwaysShowMainHeader]);

  const ENABLE_JP = false;

  const languages: Array<{ code: 'ko' | 'en' | 'jp'; label: string }> = [
    { code: 'ko', label: 'KO' },
    { code: 'en', label: 'EN' },
    ...(ENABLE_JP ? [{ code: 'jp', label: 'JP' as const }] : []),
  ];

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = (item: NavItem) => {
    if (item === 'work') {
      onNavigate('work');
    } else if (item === 'text') {
      onNavigate('text');
    } else if (item === 'about') {
      onNavigate('about');
    }
  };

  // 모바일 About일 때만 foreground 계열, 나머지는 white 계열
  const baseColor = isMobileAbout ? 'text-foreground' : 'text-white';
  const inactiveColor = isMobileAbout ? 'text-foreground/60' : 'text-white/60';
  const hoverColor = isMobileAbout
    ? 'hover:text-foreground'
    : 'hover:text-white';
  const borderColor = isMobileAbout ? 'bg-foreground' : 'bg-white';
  const separatorColor = isMobileAbout
    ? 'text-foreground/30'
    : 'text-white/30';

  const renderContextLabel = () => {
    switch (currentView) {
      case 'index':
        return 'index / overview';

      case 'work':
        return 'work';

            case 'work-detail':
        if (detailTitle) {
          return (
            <span className="flex items-baseline gap-2">
              <span
                className={`opacity-[1] max-w-[120px] md:max-w-[190px] break-words block ${
                  isNarrowDetailHeader
                    ? lang === 'jp'
                      ? 'text-[11px] leading-[1.35] tracking-[-0.01em] font-[var(--font-body-jp)]'
                      : lang === 'en'
                        ? 'text-[11px] leading-[1.35] tracking-[-0.01em] font-[var(--font-body-en)]'
                        : 'text-[11px] leading-[1.35] tracking-[-0.01em] font-[var(--font-body-ko)]'
                    : lang === 'jp'
                      ? 'text-xs md:text-sm leading-[1.35] tracking-[-0.01em] font-[var(--font-body-jp)]'
                      : lang === 'en'
                        ? 'text-xs md:text-sm leading-[1.35] tracking-[-0.01em] font-[var(--font-body-en)]'
                        : 'text-xs md:text-sm leading-[1.35] tracking-[-0.01em] font-[var(--font-body-ko)]'
                }`}
              >
                {detailTitle}
              </span>
            </span>
          );
        }
        return 'detail view';

      case 'text':
        return 'text';

                  case 'text-detail':
        if (detailTitle) {
          const parts = detailTitle.split('_');
          const hasAuthor = parts.length > 1;
          const titlePart = parts[0].trim();
          const authorPart = hasAuthor
            ? parts.slice(1).join('_').trim()
            : '';

          return (
            <span className="flex items-baseline gap-2">
              <span
                className={`opacity-[1] max-w-[100px] min-[1200px]:max-w-[190px] leading-[1.35] tracking-[-0.01em] break-words block ${
                  lang === 'jp'
                    ? 'font-[var(--font-body-jp)]'
                    : lang === 'en'
                      ? 'font-[var(--font-body-en)]'
                      : 'font-[var(--font-body-ko)]'
                } text-[11px]`}
              >
                {hasAuthor ? (
                  <>
                    {titlePart}
                    <span className="block opacity-100 mt-0.5">
                      _{authorPart}
                    </span>
                  </>
                ) : (
                  detailTitle
                )}
              </span>
            </span>
          );
        }
        return 'reading';

      case 'about':
        return 'about';

      default:
        return '';
    }
  };

      const renderNarrowDetailTitle = () => {
    if (!detailTitle) return null;

    if (currentView === 'text-detail') {
      const parts = detailTitle.split('_');
      const hasAuthor = parts.length > 1;
      const titlePart = parts[0].trim();
      const authorPart = hasAuthor ? parts.slice(1).join('_').trim() : '';

      return (
        <span
          className={`block text-left text-[11px] leading-[1.35] tracking-[-0.01em] break-words max-w-[350px] min-[768px]:max-w-[500px] min-[1320px]:max-w-[640px] ${
            isMobileAbout ? 'text-foreground' : 'text-white' /*1320 이하 상세페이지 헤더 타이틀*/
          } ${
            lang === 'jp'
              ? 'font-[var(--font-body-jp)]'
              : lang === 'en'
                ? 'font-[var(--font-body-en)]'
                : 'font-[var(--font-body-ko)]'
          }`}
        >
          {hasAuthor ? (
            <>
              {titlePart}
              <span className="block mt-0.5">_{authorPart}</span>
            </>
          ) : (
            detailTitle
          )}
        </span>
      );
    }

    return (
      <span
        className={`block text-left text-[11px] leading-[1.35] tracking-[-0.01em] break-words max-w-[350px] min-[768px]:max-w-[500px] min-[1320px]:max-w-[640px] ${
          isMobileAbout ? 'text-foreground' : 'text-white'
        } ${
          lang === 'jp'
            ? 'font-[var(--font-body-jp)]'
            : lang === 'en'
              ? 'font-[var(--font-body-en)]'
              : 'font-[var(--font-body-ko)]'
        }`}
      >
        {detailTitle}
      </span>
    );
  };
  return (
    <>
      {/* 1. Main Navigation (Disappears on Scroll Down, except About) */}
      <header
        className={`
          fixed top-0 left-0 right-0 z-[9999999] pointer-events-none
          transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isMobileAbout ? '' : 'mix-blend-difference'}
          ${isVisible ? 'translate-y-0' : '-translate-y-full'}
        `}
        style={{
          backgroundColor: isMobileAbout ? 'var(--background)' : 'transparent',
          borderBottom: 'none',
        }}
      >
        <div
          className={`px-6 md:px-12 py-4 md:py-6 pointer-events-auto relative z-[9999999] ${
            isMobileAbout ? 'text-foreground' : 'text-white'
          }`}
        >
          {/* Logo + Navigation */}
          <div className="flex flex-col gap-3 md:gap-4">
            {/* Top Row: Logo + Language */}
            <div className="flex items-center justify-between">
              {/* Logo - Left */}
              <div>
                <SplitTextLink
                  text="Jihyun Jung"
                  onClick={() => onNavigate('index')}
                  isActive={false}
                  className="text-lg md:text-xl font-light tracking-[-0.01em] cursor-pointer"
                  activeColor={baseColor}
                  inactiveColor={baseColor}
                  hoverColor={hoverColor}
                  underlineColor={borderColor}
                  showUnderline={false}
                />
              </div>

              {/* Language Toggle - Right */}
              <div className="flex items-center gap-2">
                {languages.map((language, index) => (
                  <span key={language.code} className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        console.log(
                          `[UI Interaction] Language button clicked: ${language.code}`
                        );
                        setLang(language.code);
                      }}
                      className={`text-[10px] md:text-xs uppercase tracking-[0.06em] transition-all font-light cursor-pointer select-none p-2 -m-2 ${
                        lang === language.code
                          ? isMobileAbout
                            ? 'text-foreground'
                            : 'text-white'
                          : isMobileAbout
                            ? 'text-foreground/50 hover:text-foreground'
                            : 'text-white/50 hover:text-white'
                      }`}
                      style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    >
                      {language.label}
                    </button>
                    {index < languages.length - 1 && (
                      <span className={`text-[10px] md:text-xs ${separatorColor}`}>
                        /
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Row: Navigation */}
            <nav className="flex items-center gap-6 md:gap-10">
              <SplitTextLink
                text="work"
                onMouseEnter={() => {
                  ensureWorksLoaded().catch((error) => {
                    console.error('Failed to preload works on hover:', error);
                  });
                }}
                onFocus={() => {
                  ensureWorksLoaded().catch((error) => {
                    console.error('Failed to preload works on focus:', error);
                  });
                }}
                onClick={() => handleNavClick('work')}
                isActive={currentView === 'work'}
                className="text-xs md:text-sm tracking-[0.15em] font-light cursor-pointer"
                activeColor={isMobileAbout ? 'text-foreground' : 'text-white'}
                inactiveColor={inactiveColor}
                hoverColor={hoverColor}
                underlineColor={borderColor}
              />

              <SplitTextLink
                text="text"
                onMouseEnter={() => {
                  ensureTextsLoaded().catch((error) => {
                    console.error('Failed to preload texts on hover:', error);
                  });
                }}
                onFocus={() => {
                  ensureTextsLoaded().catch((error) => {
                    console.error('Failed to preload texts on focus:', error);
                  });
                }}
                onClick={() => handleNavClick('text')}
                isActive={currentView === 'text'}
                className="text-xs md:text-sm tracking-[0.15em] font-light cursor-pointer"
                activeColor={isMobileAbout ? 'text-foreground' : 'text-white'}
                inactiveColor={inactiveColor}
                hoverColor={hoverColor}
                underlineColor={borderColor}
              />

              <SplitTextLink
                text="about"
                onMouseEnter={() => {
                  preloadAboutData().catch((error) => {
                    console.error(
                      'Failed to preload About data on hover:',
                      error
                    );
                  });
                }}
                onFocus={() => {
                  preloadAboutData().catch((error) => {
                    console.error(
                      'Failed to preload About data on focus:',
                      error
                    );
                  });
                }}
                onClick={() => handleNavClick('about')}
                isActive={currentView === 'about'}
                className="text-xs md:text-sm tracking-[0.15em] font-light cursor-pointer"
                activeColor={isMobileAbout ? 'text-foreground' : 'text-white'}
                inactiveColor={inactiveColor}
                hoverColor={hoverColor}
                underlineColor={borderColor}
              />
            </nav>
          </div>
        </div>

        <style>{`
          header {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          @media (max-width: 1320px) {
            body.contact-modal-open header {
              display: none !important;
            }
          }
        `}</style>
      </header>

      {/* Global Header White Layer - 1319 이하에서 헤더가 보일 때 */}
      {showMainHeaderWhiteLayer && (
        <div
          aria-hidden="true"
          className={`
            fixed top-0 left-0 right-0 z-30 pointer-events-auto
            transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]
            ${isVisible ? 'translate-y-0' : '-translate-y-full'}
          `}
        >
          <div className="h-[100px] md:h-[100px] bg-white border-b border-black/5" />
        </div>
      )}

      {/* Context White Layer - 1319 이하 detail에서 스크롤 내렸을 때 */}
      {showContextWhiteLayer && (
        <div
          aria-hidden="true"
          className={`
            fixed top-0 left-0 right-0 z-30 pointer-events-auto
            transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] delay-100
            ${!isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
          `}
        >
          <div className="h-[65px] md:h-[70px] bg-white border-b border-black/5" />
        </div>
      )}

      {/* 2. Context Indicator (Appears when Main Nav is gone) */}
      <div
        className={`
          fixed top-0 left-0 right-0 z-40 px-6 md:px-12 py-4 md:py-6 pointer-events-none
          transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] delay-100
          ${isMobileAbout ? '' : 'mix-blend-difference'}
          ${!isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
        `}
      >
        {isNarrowDetailHeader ? (
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 pr-4">{renderNarrowDetailTitle()}</div>

                       <button
              onClick={() => {
                window.history.back();
              }}
              className="shrink-0 flex items-center gap-3 pointer-events-auto cursor-pointer bg-transparent border-none focus:outline-none group"
            >
              <svg
                className={`w-3 h-3 transition-transform duration-300 group-hover:-translate-x-0.5 ${
                  isMobileAbout ? 'stroke-foreground' : 'stroke-white'
                }`}
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
              <span
                className={`text-[11px] leading-[1.35] tracking-[-0.01em] ${
                  lang === 'jp'
                    ? 'font-[var(--font-body-jp)]'
                    : lang === 'en'
                      ? 'font-[var(--font-body-en)]'
                      : 'font-[var(--font-body-ko)]'
                } ${
                  isMobileAbout ? 'text-foreground' : 'text-white'
                }`}
              >
                back
              </span>
            </button>
          </div>
        ) : (
          <>
            {currentView === 'text-detail' ? (
              <>
                {/* Mobile: ← back 버튼 */}
                                <button
                  onClick={() => {
                    window.location.hash = '#/text';
                  }}
                  className="flex md:hidden items-center gap-3 pointer-events-auto cursor-pointer bg-transparent border-none focus:outline-none group"
                >
                  <svg
                    className={`w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity duration-300 ${
                      isMobileAbout ? 'stroke-foreground' : ''
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 12H5" />
                    <path d="m12 19-7-7 7-7" />
                  </svg>
                  <span
                    className={`text-[11px] leading-[1.35] tracking-[-0.01em] opacity-60 group-hover:opacity-100 transition-opacity duration-300 ${
                      lang === 'jp'
                        ? 'font-[var(--font-body-jp)]'
                        : lang === 'en'
                          ? 'font-[var(--font-body-en)]'
                          : 'font-[var(--font-body-ko)]'
                    } ${
                      isMobileAbout ? 'text-foreground' : 'text-white'
                    }`}
                  >
                    back
                  </span>
                </button>

                {/* Tablet/Desktop: 기존 context label (제목) */}
                                <div className="hidden md:flex items-center gap-3">
                  <div
                    className={`w-[3px] h-[3px] rounded-none ${
                      isMobileAbout ? 'bg-foreground' : 'bg-white'
                    }`}
                  />
                  <span
                    className={`text-[11px] md:text-sm leading-[1.35] tracking-[-0.01em] opacity-80 ${
                      lang === 'jp'
                        ? 'font-[var(--font-body-jp)]'
                        : lang === 'en'
                          ? 'font-[var(--font-body-en)]'
                          : 'font-[var(--font-body-ko)]'
                    } ${
                      isMobileAbout ? 'text-foreground' : 'text-white'
                    }`}
                  >
                    {renderContextLabel()}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div
                  className={`w-[3px] h-[3px] rounded-none ${
                    isMobileAbout ? 'bg-foreground' : 'bg-white'
                  }`}
                />
                <span
                  className={`text-[11px] md:text-sm leading-[1.35] tracking-[-0.01em] opacity-80 ${
                    lang === 'jp'
                      ? 'font-[var(--font-body-jp)]'
                      : lang === 'en'
                        ? 'font-[var(--font-body-en)]'
                        : 'font-[var(--font-body-ko)]'
                  } ${
                    isMobileAbout ? 'text-foreground' : 'text-white'
                  }`}
                >
                  {renderContextLabel()}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};