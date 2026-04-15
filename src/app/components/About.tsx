import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Footer } from '@/app/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorks } from '@/contexts/WorkContext';
import { ContactModal } from '@/app/components/ContactModal';
import { AboutData, HistoryItem, fetchAboutPage, fetchHistoryItems } from '@/services/wp-api';
import { TooltipTransition } from '@/app/components/TooltipTransition';
import { Work } from '@/types/work';
import gsap from 'gsap';

// ----------------------------------------------------------------------
// Helper Components
// ----------------------------------------------------------------------

const ABOUT_SCROLL_STORAGE_KEY = 'aboutScrollTop';
const ABOUT_FRESH_ENTRY_KEY = 'aboutFreshEntry';

let aboutDataCache: AboutData | null = null;
let historyItemsCache: HistoryItem[] = [];
let aboutDataPromise: Promise<void> | null = null;

export const preloadAboutData = async () => {
  if (aboutDataCache) return;

  if (!aboutDataPromise) {
    aboutDataPromise = (async () => {
      const [about, history] = await Promise.all([
        fetchAboutPage(),
        fetchHistoryItems(),
      ]);

      aboutDataCache = about;
      historyItemsCache = history;
    })();
  }

  await aboutDataPromise;
};

const RevealText = ({ children }: { children: React.ReactNode; delay?: number }) => {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current) return;

    // Temporarily disable reveal animation on all devices
    gsap.set(el.current, { y: '0%', opacity: 1 });
  }, []);

  return (
    <div className="overflow-hidden leading-tight">
      <div ref={el} className="origin-top-left will-change-transform">
        {children}
      </div>
    </div>
  );
};

const ContactLink = ({
  label,
  value,
  link,
  onContactClick,
}: {
  label: string;
  value: string;
  link: string;
  onContactClick?: () => void;
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (label === 'email' && onContactClick) {
      e.preventDefault();
      e.stopPropagation();
      onContactClick();
    }
  };

  return (
    <a
      href={link}
      target={label !== 'email' ? '_blank' : undefined}
      rel={label !== 'email' ? 'noopener noreferrer' : undefined}
      onClick={handleClick}
      className="text-xs font-light hover:text-foreground/50 transition-colors relative inline-block md:after:content-[''] md:after:absolute md:after:bottom-0 md:after:left-0 md:after:w-0 md:after:h-[1px] md:after:bg-foreground md:after:transition-all md:after:duration-300 md:hover:after:w-full cursor-pointer"
    >
      {value}
    </a>
  );
};

// ----------------------------------------------------------------------
// About Component Helpers
// ----------------------------------------------------------------------

const normalizeWorkTitle = (str: string) => {
  return (str || '')
    .toLowerCase()
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, '')
    .replace(/[^\w가-힣ぁ-ゔァ-ヴー々〆〤一-龥]/g, '');
};

const extractWorkMeta = (text: string) => {
  const match = text.match(/\[work:(.*?)\]/i);
  return match ? match[1].trim() : null;
};

const removeWorkMeta = (html: string) => {
  return html
    .replace(/\s*\[work:.*?\]\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const getWorkTitleByLang = (work: Work, lang: string) => {
  if (lang === 'en') {
    return work.title_en || work.title_ko || work.title;
  }
  if (lang === 'jp') {
    return work.title_jp || work.title_ko || work.title;
  }
  return work.title_ko || work.title;
};

const findWorkByMeta = (metaTitle: string, works: Work[], lang: string) => {
  const normalizedMeta = normalizeWorkTitle(metaTitle);
  if (!normalizedMeta) return null;

  return (
    works.find(work => normalizeWorkTitle(getWorkTitleByLang(work, lang) || '') === normalizedMeta) ||
    works.find(work => normalizeWorkTitle(work.title_ko || '') === normalizedMeta) ||
    works.find(work => normalizeWorkTitle(work.title_en || '') === normalizedMeta) ||
    works.find(work => normalizeWorkTitle(work.title_jp || '') === normalizedMeta) ||
    works.find(work => normalizeWorkTitle(work.title || '') === normalizedMeta) ||
    null
  );
};

const transformBioContent = (html: string | undefined, works: Work[], lang: string) => {
  if (!html) return '';
  if (typeof window === 'undefined') return html;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const elements = Array.from(doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li'));
    let changed = false;

    const findWorkIdInText = (text: string) => {
      const cleanText = removeWorkMeta(text);

      const sortedWorks = [...works].sort((a, b) => {
        const titleA = getWorkTitleByLang(a, lang);
        const titleB = getWorkTitleByLang(b, lang);
        return (titleB?.length || 0) - (titleA?.length || 0);
      });

      for (const work of sortedWorks) {
        const candidates = [
          getWorkTitleByLang(work, lang),
          work.title_ko,
          work.title_en,
          work.title_jp,
          work.title,
        ].filter(Boolean) as string[];

        for (const title of candidates) {
          let safeTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          safeTitle = safeTitle.replace(/\s+/g, '[\\s\\u00A0]*');
          safeTitle = safeTitle.replace(/</g, '(?:<|&lt;)').replace(/>/g, '(?:>|&gt;)');

          const regex = new RegExp(`(${safeTitle})`, 'gi');

          if (regex.test(cleanText)) {
            return work.id;
          }
        }
      }

      return null;
    };

    const findWorkByMetaOrText = (text: string) => {
      const metaTitle = extractWorkMeta(text);

      if (metaTitle) {
        const foundByMeta = findWorkByMeta(metaTitle, works, lang);
        if (foundByMeta) {
          return foundByMeta.id;
        }
      }

      return findWorkIdInText(text);
    };

    elements.forEach(el => {
      const rawHtml = el.innerHTML;
      const parts = rawHtml.split(/<br\s*\/?>/i);

      const processedRows: { year: string; content: string; workId: string | null }[] = [];
      let hasYearEntry = false;

      parts.forEach(originalPart => {
        const part = originalPart.replace(/&#8211;/g, '–');

        const temp = document.createElement('div');
        temp.innerHTML = part;

        const text = (temp.textContent || '').replace(/[\u200B\uFEFF]/g, '').trim();
        const cleanText = removeWorkMeta(text);

        const match =
          cleanText.match(/^(\d{4}(?:[-.~]\d{2,4})?)\s+(.*)/s) ||
          cleanText.match(/^(\d{4}(?:[-.~]\d{2,4})?)(?=[^\w\s])(.*)/s) ||
          cleanText.match(/^(\d{4}(?:[-.~]\d{2,4})?)$/);

        if (match) {
          hasYearEntry = true;
          const yearStr = match[1];
          const restText = (match[2] || '').trim();

          let contentHtml: string;

          if (!restText) {
            contentHtml = '';
          } else {
            const safeYear = yearStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const removeRegex = new RegExp(`^[\\s\\u200B\\uFEFF]*${safeYear}[\\s.,\\u00A0\\t]*`);

            contentHtml = part;
            if (removeRegex.test(contentHtml)) {
              contentHtml = contentHtml.replace(removeRegex, '');
            } else {
              const taggedYearRegex = new RegExp(
                `^[\\s\\u200B\\uFEFF]*(?:<(?:strong|b|em|span)[^>]*>\\s*)?${safeYear}(?:\\s*</(?:strong|b|em|span)>)?[\\s.,\\u00A0\\t]*`,
                'i'
              );
              if (taggedYearRegex.test(contentHtml)) {
                contentHtml = contentHtml.replace(taggedYearRegex, '');
              } else {
                const entityRegex = new RegExp(
                  `^[\\s\\u200B\\uFEFF]*${safeYear}(?:&nbsp;|[\\s.,\\u00A0\\t])*`
                );
                contentHtml = contentHtml.replace(entityRegex, '');
              }
            }

            contentHtml = removeWorkMeta(contentHtml);

            const strippedCheck = contentHtml.replace(/<[^>]*>/g, '').trim();
            if (!strippedCheck) {
              contentHtml = '';
            }
          }

          if (!contentHtml) {
            processedRows.push({ year: yearStr, content: '', workId: null });
          } else {
            const workId = findWorkByMetaOrText(text);
            processedRows.push({ year: yearStr, content: contentHtml, workId });
          }
        } else {
          if (cleanText.length > 0) {
            const workId = findWorkByMetaOrText(text);
            const cleanedPart = removeWorkMeta(part);
            const prevRow = processedRows[processedRows.length - 1];

            if (prevRow && prevRow.year && !prevRow.content) {
              prevRow.content = cleanedPart;
              prevRow.workId = prevRow.workId || workId;
            } else {
              processedRows.push({ year: '', content: cleanedPart, workId });
            }
          }
        }
      });

      if (hasYearEntry && processedRows.length > 0) {
        const table = document.createElement('table');
        table.className = 'wp-block-table';
        const tbody = document.createElement('tbody');

        processedRows.forEach(row => {
          const tr = document.createElement('tr');

          if (row.workId) {
            tr.className = 'hover-line';
            tr.setAttribute('data-work-id', row.workId);
          }

          const tdYear = document.createElement('td');
          tdYear.textContent = row.year;

          const tdContent = document.createElement('td');
          tdContent.innerHTML = row.content;

          tr.appendChild(tdYear);
          tr.appendChild(tdContent);
          tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        el.replaceWith(table);
        changed = true;
      } else {
        const cleanedHtml = removeWorkMeta(rawHtml);
        if (cleanedHtml !== rawHtml) {
          el.innerHTML = cleanedHtml;
          changed = true;
        }
      }
    });

    return changed ? doc.body.innerHTML : removeWorkMeta(html);
  } catch {
    return removeWorkMeta(html);
  }
};

const translateSectionHeaders = (html: string, lang: string): string => {
  if (lang === 'ko' || !html) return html;

  const headers: [RegExp, string, string][] = [
    [/수상\s*경력\s*및\s*레지던스/g, 'Awards & Residencies', '受賞歴・レジデンス'],
    [/수상\s*경력/g, 'Awards', '賞歴'],
    [/레지던스/g, 'Residencies', 'レジデンス'],
    [/개인\s*전/g, 'Solo Exhibitions', '個展'],
    [/단체\s*전/g, 'Group Exhibitions', 'グループ展'],
    [/프로젝트/g, 'Projects', 'プロジェクト'],
    [/출\s*판/g, 'Publications', '出版'],
    [/학\s*력/g, 'Education', '学歴'],
  ];

  let result = html;

  for (const [regex, en, jp] of headers) {
    const translation = lang === 'en' ? en : lang === 'jp' ? jp : '';
    if (translation) {
      result = result.replace(regex, translation);
    }
  }

  return result;
};

// ----------------------------------------------------------------------
// About Component
// ----------------------------------------------------------------------

export const About = () => {
  const { lang } = useLanguage();
  const { works } = useWorks();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const [tooltipWorkId, setTooltipWorkId] = useState<string | null>(null);
  const [isManualHover, setIsManualHover] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  const [visibleWorkRows, setVisibleWorkRows] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const [aboutData, setAboutData] = useState<AboutData | null>(aboutDataCache);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(historyItemsCache);
  const [loading, setLoading] = useState(!aboutDataCache);

    const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInTooltip = useRef(false);
  const isRestoringMobileAboutRef = useRef(false);
  const skipSaveOnUnmountRef = useRef(false);

    const saveAboutScrollPosition = () => {
    if (typeof window === 'undefined') return;

    const scrollValue = containerRef.current?.scrollTop ?? 0;

    sessionStorage.setItem(ABOUT_SCROLL_STORAGE_KEY, String(Math.round(scrollValue)));
  };

  function processedContentSafeKey(
    aboutDataValue: AboutData | null,
    currentLang: string,
    worksValue: Work[]
  ) {
    return JSON.stringify({
      lang: currentLang,
      content: aboutDataValue?.content ?? '',
      content_en: aboutDataValue?.content_en ?? '',
      content_jp: aboutDataValue?.content_jp ?? '',
      worksLen: worksValue.length,
    });
  }

  useEffect(() => {
  let isMounted = true;

  if (aboutDataCache) {
    setAboutData(aboutDataCache);
    setHistoryItems(historyItemsCache);
    setLoading(false);
    return;
  }

  if (!aboutDataPromise) {
    aboutDataPromise = (async () => {
      const [about, history] = await Promise.all([
        fetchAboutPage(),
        fetchHistoryItems(),
      ]);

      aboutDataCache = about;
      historyItemsCache = history;
    })();
  }

  aboutDataPromise
    .then(() => {
      if (!isMounted) return;
      setAboutData(aboutDataCache);
      setHistoryItems(historyItemsCache);
      setLoading(false);
    })
    .catch((error) => {
      console.error('Failed to load About data', error);
      if (isMounted) {
        setLoading(false);
      }
    });

  return () => {
    isMounted = false;
  };
}, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTouch(window.innerWidth < 1025);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

      useEffect(() => {
    if (loading) return;
    if (typeof window === 'undefined') return;

    const isFreshEntry = sessionStorage.getItem(ABOUT_FRESH_ENTRY_KEY) === 'true';

    if (isFreshEntry) {
      sessionStorage.removeItem(ABOUT_FRESH_ENTRY_KEY);
      sessionStorage.removeItem(ABOUT_SCROLL_STORAGE_KEY);

      const applyFreshTop = () => {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      };

      let rafId: number | null = null;
      let timeoutId: number | null = null;

      rafId = requestAnimationFrame(() => {
        applyFreshTop();

        timeoutId = window.setTimeout(() => {
          applyFreshTop();
        }, 180);
      });

      return () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        if (timeoutId !== null) window.clearTimeout(timeoutId);
      };
    }

    const raw = sessionStorage.getItem(ABOUT_SCROLL_STORAGE_KEY);
    if (!raw) return;

    const saved = parseInt(raw, 10);
    if (Number.isNaN(saved)) return;

    const applySavedScroll = () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = saved;
      }
    };

    let rafId1: number | null = null;
    let rafId2: number | null = null;
    let timeoutId: number | null = null;

    isRestoringMobileAboutRef.current = true;

    rafId1 = requestAnimationFrame(() => {
      applySavedScroll();

      rafId2 = requestAnimationFrame(() => {
        applySavedScroll();

        timeoutId = window.setTimeout(() => {
          applySavedScroll();
          isRestoringMobileAboutRef.current = false;
        }, 220);
      });
    });

    return () => {
      if (rafId1 !== null) cancelAnimationFrame(rafId1);
      if (rafId2 !== null) cancelAnimationFrame(rafId2);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      isRestoringMobileAboutRef.current = false;
    };
  }, [loading, processedContentSafeKey(aboutData, lang, works)]);

  useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const handleNativeScroll = () => {
    if (window.innerWidth < 1025) {
      if (isRestoringMobileAboutRef.current) return;
      sessionStorage.setItem(ABOUT_SCROLL_STORAGE_KEY, String(Math.round(container.scrollTop)));
    }
  };

  const handleBeforeUnload = () => {
    saveAboutScrollPosition();
  };

  container.addEventListener('scroll', handleNativeScroll, { passive: true });
  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    if (!skipSaveOnUnmountRef.current) {
      saveAboutScrollPosition();
    }
    container.removeEventListener('scroll', handleNativeScroll);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, []);

  const processedContent = useMemo(() => {
    let rawContent: string | undefined;
    if (lang === 'en' && aboutData?.content_en) {
      rawContent = aboutData.content_en;
    } else if (lang === 'jp' && aboutData?.content_jp) {
      rawContent = aboutData.content_jp;
    } else {
      rawContent = aboutData?.content;
    }

    const transformed = transformBioContent(rawContent, works, lang);

    if (
      lang !== 'ko' &&
      !(lang === 'en' && aboutData?.content_en) &&
      !(lang === 'jp' && aboutData?.content_jp)
    ) {
      return translateSectionHeaders(transformed || '', lang);
    }

    return transformed;
  }, [aboutData?.content, aboutData?.content_en, aboutData?.content_jp, works, lang]);

  const processProfileText = (text: string | undefined) => {
    if (!text) return '';

    if (lang === 'en') {
      let result = text;
      result = result.replace(/지현/g, '<span class="notranslate" translate="no">Jihyun Jung</span>');
      result = result.replace(/수원\s*생/g, 'Born in Suwon');
      result = result.replace(/서울\s*기반로\s*활동\s*중/g, 'Based in Seoul');
      result = result.replace(/\(1986\s*[–\-]\s*\)/g, '(1986 – )');
      return result;
    }

    if (lang === 'jp') {
      let result = text;
      result = result.replace(/정지현/g, 'チョン・ジヒョン');
      result = result.replace(/수원\s*생/g, '水原生まれ');
      result = result.replace(/서울\s*기반으로\s*활동\s*중/g, 'ソウルを拠点に活動中');
      result = result.replace(/\(1986\s*[–\-]\s*\)/g, '(1986 – )');
      return result;
    }

    return text;
  };

  const getProfileInfo = () => {
    if (lang === 'ko' && aboutData?.profile_info_ko) {
      return aboutData.profile_info_ko;
    }
    if (lang === 'en' && aboutData?.profile_info_en) {
      return aboutData.profile_info_en;
    }
    if (lang === 'jp' && aboutData?.profile_info_jp) {
      return aboutData.profile_info_jp;
    }
    return aboutData?.profile_info || '';
  };

  const handleContentClick = (e: any) => {
    const target = e.target as HTMLElement;
    const link = target.closest('.hover-line') as HTMLElement;

    if (link) {
      const id = link.getAttribute('data-work-id');
      if (id) {
        e.preventDefault();
        e.stopPropagation();

        if (tooltipWorkId === id) {
          setTooltipWorkId(null);
        } else {
          setTooltipWorkId(id);
        }
      }
    }
  };

  const handleContentMouseOver = () => {
    return;
  };

  const handleContentMouseOut = () => {
    return;
  };

  const handleTooltipMouseEnter = () => {
    isInTooltip.current = true;
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setIsManualHover(true);
  };

  const handleTooltipMouseLeave = () => {
    isInTooltip.current = false;
    setIsManualHover(false);
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltipWorkId(null);
    }, 300);
  };

    useEffect(() => {
    if (!tooltipWorkId) return;

    const handleScroll = () => {
      setTooltipWorkId(null);
    };

    const handleWheel = () => {
      setTooltipWorkId(null);
    };

    const container = containerRef.current;

    container?.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      container?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [tooltipWorkId]);

  void visibleWorkRows;
  void observerRef;
  void isManualHover;
  void isMobile;

  const groupedHistory = historyItems.reduce((acc, item) => {
    const year = item.year;
    if (!acc[year]) acc[year] = [];
    acc[year].push(item);
    return acc;
  }, {} as Record<string, HistoryItem[]>);

  void groupedHistory;
  const sortedYears = Object.keys(groupedHistory).sort((a, b) => parseInt(b) - parseInt(a));
  void sortedYears;

  const contactLinks = aboutData?.contact
    ? [
        {
          label: 'website',
          value: aboutData.contact.website,
          link: aboutData.contact.website.startsWith('http')
            ? aboutData.contact.website
            : `http://${aboutData.contact.website}`,
        },
        {
          label: 'email',
          value: aboutData.contact.email,
          link: `mailto:${aboutData.contact.email}`,
        },
        {
          label: 'instagram',
          value: aboutData.contact.instagram,
          link: aboutData.contact.instagram.startsWith('http')
            ? aboutData.contact.instagram
            : `https://instagram.com/${aboutData.contact.instagram.replace('@', '')}`,
        },
      ].filter(c => c.value)
    : [];

 return (
  <div
    ref={containerRef}
    className="fixed inset-0 min-[1025px]:fixed min-[1025px]:inset-0 w-full h-full bg-background text-foreground font-sans selection:bg-foreground selection:text-background overflow-y-auto"
      style={{
        fontFamily:
          'Pretendard, "Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div className="w-full min-h-full px-6 md:px-12 relative flex">
  <div className="hidden md:flex flex-col w-[20%] md:sticky md:top-0 md:h-screen md:overflow-hidden min-[1025px]:sticky min-[1025px]:top-0 min-[1025px]:h-screen pt-28 md:pt-32 relative z-20 md:justify-between min-[1025px]:justify-start">
    <div className="flex flex-col gap-6 max-w-full">
      <RevealText>
        <div className="flex flex-col gap-1">
          <h1
            className={`text-xl font-medium tracking-tight mb-4${
              lang === 'en' ? ' notranslate' : ''
            }`}
                  translate={lang === 'en' ? 'no' : undefined}
                >
                  {lang === 'en'
                    ? 'Jihyun Jung'
                    : lang === 'jp'
                    ? 'チョン・ジヒョン'
                    : aboutData?.name || aboutData?.title || 'About'}
                </h1>
                {getProfileInfo() && (
                  <div
                    className={`text-[14px] leading-relaxed text-foreground/80 font-sans whitespace-pre-line mb-4${
                      lang === 'ko' ? ' notranslate' : ''
                    }`}
                    translate={lang === 'ko' ? 'no' : undefined}
                    dangerouslySetInnerHTML={{ __html: processProfileText(getProfileInfo()) }}
                  />
                )}
                {aboutData?.profile_info2 && (
  <div
    className={`text-[14px] leading-relaxed text-foreground/80 font-sans whitespace-pre-line${
      lang === 'ko' ? ' notranslate' : ''
    }`}
    translate={lang === 'ko' ? 'no' : undefined}
    dangerouslySetInnerHTML={{ __html: processProfileText(aboutData?.profile_info2) }}
  />
)}
              </div>
            </RevealText>
          </div>

          <div className="mt-12 md:mt-8 min-[1025px]:mt-0 min-[1025px]:absolute min-[1025px]:bottom-12 min-[1025px]:left-0 flex flex-col gap-4 pointer-events-auto md:pb-16 min-[1025px]:pb-0">
            {contactLinks.map(item => (
              <div key={item.label} className="flex flex-col gap-0.5">
                <RevealText>
                  <span className="text-[10px] text-muted-foreground/50 tracking-widest mb-1 block font-[Petrona]">
                    {item.label}
                  </span>
                  <ContactLink
                    label={item.label}
                    value={item.value}
                    link={item.link}
                    onContactClick={
                      item.label === 'email' ? () => setIsContactModalOpen(true) : undefined
                    }
                  />
                </RevealText>
              </div>
            ))}
          </div>
        </div>

        <div
  ref={contentRef}
  onClick={handleContentClick}
  onMouseOver={handleContentMouseOver}
  onMouseOut={handleContentMouseOut}
  className="relative w-full md:w-[75%] md:ml-auto pt-32 md:pt-10 pb-8 flex flex-col gap-10 min-[1025px]:w-[80%] min-[1025px]:ml-0 min-[1025px]:pl-22"
>
          <div className="md:hidden flex flex-col gap-6 mb-12">
            {aboutData && (
              <>
                <RevealText>
                  <div className="flex flex-col gap-1">
                    <h1
                      className={`text-xl font-medium tracking-tight mb-4${
                        lang === 'en' ? ' notranslate' : ''
                      }`}
                      translate={lang === 'en' ? 'no' : undefined}
                    >
                      {lang === 'en'
                        ? 'Jihyun Jung'
                        : lang === 'jp'
                        ? 'チョン・ジヒョン'
                        : aboutData?.name || aboutData?.title || 'About'}
                    </h1>
                    {getProfileInfo() && (
                      <div
                        className={`text-[14px] leading-relaxed text-foreground/80 font-sans whitespace-pre-line mb-4${
                          lang === 'ko' ? ' notranslate' : ''
                        }`}
                        translate={lang === 'ko' ? 'no' : undefined}
                        dangerouslySetInnerHTML={{ __html: processProfileText(getProfileInfo()) }}
                      />
                    )}
                    {aboutData?.profile_info2 && (
  <div
    className={`text-[14px] leading-relaxed text-foreground/80 font-sans whitespace-pre-line${
      lang === 'ko' ? ' notranslate' : ''
    }`}
    translate={lang === 'ko' ? 'no' : undefined}
    dangerouslySetInnerHTML={{ __html: processProfileText(aboutData?.profile_info2) }}
  />
)}
                  </div>
                </RevealText>

                <div className="flex flex-col gap-4 mt-8 mb-8">
                  {contactLinks.map(item => (
                    <div key={item.label} className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground/50 tracking-widest mb-1 block">
                        {item.label}
                      </span>
                      <ContactLink
                        label={item.label}
                        value={item.value}
                        link={item.link}
                        onContactClick={
                          item.label === 'email' ? () => setIsContactModalOpen(true) : undefined
                        }
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {aboutData && processedContent && (
            <div className="flex flex-col gap-6 max-w-3xl">
              <RevealText>
                <div
                  className={`text-[16px] leading-normal text-foreground [&_p]:mb-4 [&_h2]:text-[12px] [&_h2]:font-sans [&_h2]:uppercase [&_h2]:tracking-[0.15em] [&_h2]:text-muted-foreground/70 [&_h2]:font-normal [&_h2]:mt-24 [&_h2]:mb-10 [&_ul]:list-none [&_ul]:pl-0 [&_li]:mb-2 [&_table]:!w-full [&_table]:!block [&_tbody]:!block [&_tr]:!flex [&_tr]:!flex-row [&_tr]:gap-2 md:[&_tr]:gap-0 [&_tr]:mb-1.5 [&_tr>*:first-child]:!block [&_tr>*:last-child]:!block [&_tr>*:first-child]:!w-[40px] md:[&_tr>*:first-child]:!w-[64px] [&_tr>*:first-child]:!min-w-[40px] md:[&_tr>*:first-child]:!min-w-[64px] [&_tr>*:first-child]:shrink-0 md:[&_tr>*:first-child]:!mr-8 [&_tr>*:first-child]:font-mono [&_tr>*:first-child]:!text-[12px] [&_tr>*:first-child]:text-muted-foreground/50 [&_tr>*:first-child]:!font-normal [&_tr>*:first-child]:text-left [&_tr>*:last-child]:flex-1 [&_tr>*:last-child]:text-sm [&_tr>*:last-child]:font-light [&_tr>*:last-child]:leading-snug [&_tr]:relative [&_tr]:-mx-4 [&_tr]:px-4 [&_tr]:py-2 [&_tr]:rounded-lg [&_tr]:transition-all [&_tr]:duration-300 [&_tr.hover-line]:cursor-pointer [&_tr.hover-line:hover]:bg-white [&_tr.hover-line:hover]:!text-foreground [&_tr.hover-line:hover_>_*]:!text-foreground md:[&_tr.hover-line_>_*]:transition-transform md:[&_tr.hover-line_>_*]:duration-300 md:[&_tr.hover-line:hover_>_*]:translate-x-2 [&_tr_p]:!mb-0 md:[&_tr]:items-baseline${
                    lang === 'ko' ? ' notranslate' : ''
                  }`}
                  translate={lang === 'ko' ? 'no' : undefined}
                  dangerouslySetInnerHTML={{ __html: processedContent }}
                />
              </RevealText>
            </div>
          )}

          <div className="pt-16 pb-4 opacity-100">
            <Footer />
          </div>
        </div>
      </div>

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />

      <TooltipTransition
        hoveredWorkId={tooltipWorkId}
        isOpen={false}
        onClose={() => setTooltipWorkId(null)}
        onClick={() => {
  if (tooltipWorkId) {
    skipSaveOnUnmountRef.current = true;
    saveAboutScrollPosition();
    window.location.hash = `#/work/${tooltipWorkId}`;
  }
}}
        isMobile={isTouch}
        onMouseEnter={handleTooltipMouseEnter}
        onMouseLeave={handleTooltipMouseLeave}
      />
    </div>
  );
};