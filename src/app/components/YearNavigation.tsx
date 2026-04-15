import { useState, useEffect, useRef } from 'react';
import { Work } from '@/data/works';
import { YearPreview } from './YearPreview';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrambleText } from '@/app/components/ui/ScrambleText';

interface YearNavigationProps {
  allWorks: Work[];
  currentYear?: number;
}

export const YearNavigation = ({ allWorks, currentYear }: YearNavigationProps) => {
  const { lang } = useLanguage();
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [isInSection, setIsInSection] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Extract unique years and sort in descending order
  const years = Array.from(new Set(allWorks.map(work => work.year)))
    .filter((year): year is number => year !== undefined)
    .sort((a, b) => b - a);

  // Get works for hovered year
  const hoveredWorks = hoveredYear 
    ? allWorks.filter(work => work.year === hoveredYear)
    : [];

  // Intersection Observer to track viewport visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
        if (!entry.isIntersecting) {
          setHoveredYear(null); // Clear hover when out of view
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Debounced hover handler (100ms)
  const handleYearHover = (year: number) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Set new timeout
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredYear(year);
      hoverTimeoutRef.current = null;
    }, 100);
  };

  const handleYearLeave = () => {
    // Clear timeout if leaving before debounce completes
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    setHoveredYear(null);
  };

  return (
    <div 
      ref={sectionRef}
      className="relative"
      onMouseEnter={() => setIsInSection(true)}
      onMouseLeave={() => {
        setIsInSection(false);
        handleYearLeave();
      }}
    >
      {/* 2-Column Layout: List + Preview Stage */}
      <div className="grid grid-cols-1 min-[1025px]:grid-cols-[280px_1fr] gap-8 min-[1025px]:gap-16">
        
        {/* LEFT COLUMN: Year List Only */}
        <div className="space-y-4">
          <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-6">
            Works by Year
          </h3>

          {/* Year List */}
          <ul className="space-y-3">
            {years.map(year => {
              const isActive = year === currentYear;
              const isHovered = year === hoveredYear;

              return (
                <li
                  key={year}
                  onMouseEnter={() => handleYearHover(year)}
                  onMouseLeave={handleYearLeave}
                  className="relative"
                >
                  <a
                    href={`#/work?year=${year}`}
                    className={`
                      block text-2xl md:text-3xl tracking-tight transition-opacity duration-200
                      ${isActive ? 'opacity-100' : 'opacity-30'}
                      ${isHovered ? 'opacity-100' : ''}
                      hover:opacity-100 font-mono
                    `}
                  >
                    {year}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        {/* RIGHT COLUMN: Preview Stage (Larger Fixed Area) */}
        <div className="hidden min-[1025px]:block sticky top-24 h-[calc(100vh-12rem)]">
          {/* Preview Stage Container */}
          <div className="relative w-full h-full overflow-hidden">
            
            {/* Preview Component - Only render when hovering and in viewport */}
            {isInViewport && isInSection && hoveredYear && hoveredWorks.length > 0 && (
              <YearPreview works={hoveredWorks} isVisible={true} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
};