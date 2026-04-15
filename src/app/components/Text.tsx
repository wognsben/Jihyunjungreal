import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorks } from '@/contexts/WorkContext';
import { motion, AnimatePresence } from 'motion/react';
import gsap from 'gsap';
import { Category } from '@/data/texts';

// ----------------------------------------------------------------------
// Types & Data
// ----------------------------------------------------------------------

const categories: Category[] = ['All', 'article', 'note', 'review'];

// Category & section label translations
const categoryLabels: Record<string, Record<string, string>> = {
  All:      { ko: 'All', en: 'All', jp: 'すべて' },
  article:  { ko: 'article', en: 'article', jp: '記事' },
  note:     { ko: 'note', en: 'note', jp: 'ノート' },
  review:   { ko: 'review', en: 'review', jp: 'レビュー' },
};

const sectionLabels: Record<string, Record<string, string>> = {
  category: { ko: 'category', en: 'category', jp: 'カテゴリー' },
  results:  { ko: 'RESULTS', en: 'RESULTS', jp: '結果' },
};

// ----------------------------------------------------------------------
// Advanced Typography Component
// ----------------------------------------------------------------------
// Identifies 〈Bracketed Titles〉 and adjusts spacing with pixel-perfect precision.

const FormattedTitle = ({ text }: { text: string }) => {
  const match = text.match(/^(〈[^〉]+〉)\s*([/&])?\s*(.*)$/);

  if (!match) {
    return <span>{text}</span>;
  }

  const [_, bracketPart, separator, restPart] = match;

  return (
    <span>
      <span className="inline-block">{bracketPart}</span>
      {separator ? (
        <>
          <span className="inline-block mx-[3px] text-muted-foreground/50">{separator}</span>
          <span className="inline-block">{restPart}</span>
        </>
      ) : (
        <span className="inline-block ml-0">{restPart}</span>
      )}
    </span>
  );
};

// ----------------------------------------------------------------------
// Components
// ----------------------------------------------------------------------

interface TextProps {
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
}

export const Text = ({ activeCategory, onCategoryChange }: TextProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { lang } = useLanguage();
  const { texts } = useWorks();
  
  // Mobile Floating Bar State
  const [showFloatingBar, setShowFloatingBar] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Bottom Sheet drag state
  const sheetRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Desktop Fade Out State
  const [sidebarOpacity, setSidebarOpacity] = useState(1);

  // Hover Image State
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const imagePreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 431);
  };

  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, [isMobile]);

  // Filter Logic
  const filteredData = useMemo(() => {
    return texts.filter((item) => {
      // Language availability filter
      // WP data has explicit hasEn/hasJp/hasKo flags; static fallback data has undefined (shows in all)
      if (lang === 'ko' && item.hasKo !== undefined && !item.hasKo) return false;
      if (lang === 'en' && item.hasEn !== undefined && !item.hasEn) return false;
      if (lang === 'jp' && item.hasJp !== undefined && !item.hasJp) return false;

      if (activeCategory !== 'All' && item.category.toLowerCase() !== activeCategory.toLowerCase()) return false;
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const title = item.title[lang].toLowerCase();
        const author = item.author[lang].toLowerCase();
        const content = item.content && item.content[lang] ? item.content[lang].toLowerCase() : '';
        const summary = item.summary && item.summary[lang] ? item.summary[lang].toLowerCase() : '';
        
        return (
          title.includes(query) ||
          author.includes(query) ||
          item.year.includes(query) ||
          item.category.toLowerCase().includes(query) ||
          content.includes(query) ||
          summary.includes(query)
        );
      }
      return true;
    });
  }, [activeCategory, searchQuery, lang, texts]);

  // Scroll & Intersection Logic
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      
      // 1. Mobile Floating Bar Logic
      if (isMobile && scrollY > 100) {
  setShowFloatingBar(true);
} else {
  setShowFloatingBar(false);
  if (scrollY < 50) setIsMobileMenuOpen(false);
}

      // 2. Desktop Fade Out Logic
      if (footerRef.current) {
        const footerRect = footerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const distanceToFooter = footerRect.top - windowHeight;
        
        if (distanceToFooter < 100) {
           const newOpacity = Math.max(0, Math.min(1, (distanceToFooter + 200) / 300));
           setSidebarOpacity(newOpacity);
        } else {
           setSidebarOpacity(1);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        if (window.innerWidth < 768) {
   setIsMobileMenuOpen(true);
} else {
   inputRef.current?.focus();
}
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mouse Follower for Image Preview
  useEffect(() => {
    const el = imagePreviewRef.current;
    if (!el) return;

    // Use GSAP quickTo for smooth performance instead of React state updates
    const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });

    const handleMouseMove = (e: MouseEvent) => {
        xTo(e.clientX);
        yTo(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-foreground selection:text-background relative">
      
      {/* ------------------------------------------------------- */}
      {/* HOVER IMAGE PREVIEW                                     */}
      {/* ------------------------------------------------------- */}
      <div 
        ref={imagePreviewRef}
        className="fixed top-0 left-0 pointer-events-none z-50 hidden md:block" 
        style={{ x: 0, y: 0 }} 
      >
        <AnimatePresence mode="wait">
            {hoveredImage && hoveredImage !== '' && (
                <motion.div
                    key={hoveredImage}
                    initial={{ opacity: 0, scale: 0.9, x: 20, y: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 20, y: 20 }} 
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="relative"
                >
                    <img 
                        src={hoveredImage} 
                        alt="Preview" 
                        className="w-80 h-auto max-h-[400px] object-cover shadow-2xl rounded-sm"
                    />
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      <div className="w-full px-6 md:px-12 pt-28 md:pt-32 pb-24 flex flex-col min-[1025px]:flex-row gap-8 min-[1025px]:gap-24 relative">

        {/* ------------------------------------------------------- */}
        {/* SIDEBAR (Desktop: Sticky, Mobile/Tablet: Hidden on Scroll) */}
        {/* ------------------------------------------------------- */}
        <motion.div 
            style={{ opacity: sidebarOpacity }}
            className={`
               min-[1025px]:w-1/4 min-[1025px]:h-[calc(100vh-5rem)] 
               min-[1025px]:sticky min-[1025px]:top-32 z-30 flex flex-col gap-6 min-[1025px]:gap-12 
               transition-all duration-300 ease-out
               ${showFloatingBar && isMobile ? 'opacity-0 pointer-events-none min-[1025px]:opacity-100 min-[1025px]:pointer-events-auto' : 'opacity-100'}
            `}
        >
          {/* SEARCH BAR */}
          <div className="relative group w-full">
            <div className="relative flex items-center border-b border-foreground/20 pb-2 transition-colors duration-300 focus-within:border-foreground">
              <div className="mr-3 text-muted-foreground">
                <Search size={16} strokeWidth={1.5} />
              </div>

              <div className="relative flex-1 h-6">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="relative w-full h-full bg-transparent text-sm font-light outline-none text-foreground placeholder:text-muted-foreground/40 z-10"
                  style={{ fontSize: 'max(16px, 0.875rem)' }}
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>

              <div className="ml-2">
                {searchQuery ? (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  null
                )}
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col gap-2 min-[1025px]:gap-4">
            <span className="text-[10px] font-[var(--font-ui)] lowercase tracking-widest text-muted-foreground/60 hidden min-[1025px]:block">
              {sectionLabels.category[lang]}
            </span>
            <div className="flex flex-wrap gap-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
  onCategoryChange(cat);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}}
                  className={`flex-shrink-0 text-left text-sm transition-all duration-300 flex items-center gap-2 group/btn whitespace-nowrap px-0 py-0 rounded-none border-0 ${
                    activeCategory === cat
                      ? 'text-foreground font-medium pl-2 border-l border-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{categoryLabels[cat][lang]}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ------------------------------------------------------- */}
        {/* RIGHT CONTENT: List                                     */}
        {/* ------------------------------------------------------- */}
        <div className="flex-1 min-h-[50vh]">
          
          {filteredData.length === 0 && (
            <div className="w-full h-64 flex flex-col items-center justify-center text-muted-foreground gap-4 border border-dashed border-foreground/10 rounded-lg mt-8">
              <Search size={24} strokeWidth={1} />
              <p className="text-sm font-light">No results found</p>
            </div>
          )}

          <div className="flex flex-col mt-4 min-[1025px]:mt-0">
            {filteredData.map((item, index) => (
              <a
  href={`#/text/${item.id}`}
  key={item.id}
  onMouseEnter={() => setHoveredImage(item.image)}
  onMouseLeave={() => setHoveredImage(null)}
  className="group/item relative border-b border-foreground/5 py-8 md:py-6 transition-all duration-500 md:-mx-6 md:px-6 cursor-pointer rounded-lg overflow-hidden"
>
                {/* Hover Background (White instead of Dark) */}
                <div className="absolute inset-0 bg-white opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 z-0" />

                <div className="relative z-10 flex flex-col min-[1025px]:grid min-[1025px]:grid-cols-[1fr_80px] min-[1025px]:gap-8 min-[1025px]:items-baseline">
                  
                  {/* Title Area + Category */}
                  <div className="flex flex-col min-[1025px]:flex-row min-[1025px]:items-baseline gap-2 min-[1025px]:gap-8 order-1">
                    {/* Mobile + Tablet: Category & Year in same row */}
                    <div className="flex min-[1025px]:hidden items-center justify-between w-full mb-2">
                      <span className="text-[10px] font-[var(--font-ui)] text-muted-foreground/60 group-hover/item:text-black/70 transition-colors duration-300">
                         {categoryLabels[item.category.toLowerCase()]?.[lang] || item.category.toLowerCase()}
                      </span>
                      <span className="text-[10px] font-[var(--font-ui)] text-muted-foreground/60 group-hover/item:text-black/70 transition-colors duration-300">
                         {item.year}
                      </span>
                    </div>
                    
                    {/* Desktop: Category Label */}
                    <span className="hidden min-[1025px]:block text-[10px] font-[var(--font-ui)] text-muted-foreground/60 group-hover/item:text-black/70 w-16 shrink-0 transition-colors duration-300">
                       {categoryLabels[item.category.toLowerCase()]?.[lang] || item.category.toLowerCase()}
                    </span>
                    
                    <h3
  className={`text-sm font-light leading-snug group-hover/item:translate-x-1 transition-all duration-300 group-hover/item:text-black text-foreground ${
    lang === 'jp'
      ? 'font-[var(--font-body-jp)]'
      : lang === 'en'
      ? 'font-[var(--font-body-en)]'
      : 'font-[var(--font-body-ko)]'
  }`}
>
  <FormattedTitle text={item.title[lang]} />
</h3>
                  </div>

                  {/* Desktop Layout - Year Only */}
                  <div className="hidden min-[1025px]:block order-2 mt-1 min-[1025px]:mt-0 min-[1025px]:text-right min-[1025px]:group-hover/item:translate-x-1 transition-transform duration-300 delay-100">
                    <span className="text-xs font-[var(--font-ui)] text-muted-foreground group-hover/item:text-black transition-colors duration-300">
                      {item.year}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>

        </div>

      </div>

      {/* ------------------------------------------------------- */}
      {/* MOBILE/TABLET FLOATING ACTION BUTTON                     */}
      {/* ------------------------------------------------------- */}
      <AnimatePresence>
        {showFloatingBar && isMobile && (
           <motion.div 
             initial={{ y: 80, opacity: 0, scale: 0.8 }}
             animate={{ y: 0, opacity: 1, scale: 1 }}
             exit={{ y: 80, opacity: 0, scale: 0.8 }}
             transition={{ type: "spring", stiffness: 400, damping: 28 }}
             className="fixed bottom-8 left-0 right-0 z-50 flex justify-center md:hidden pointer-events-none"
           >
              <button
                 onClick={() => setIsMobileMenuOpen(true)}
                 className="pointer-events-auto flex items-center gap-3 bg-foreground/90 backdrop-blur-md text-background px-6 py-3 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.25),0_2px_8px_rgba(0,0,0,0.15)] border border-white/[0.08] active:scale-[0.96] transition-transform duration-150"
              >
                  <motion.span 
                    className="text-lg font-[var(--font-ui)]"
                    animate={{ rotate: [0, 180, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    *
                  </motion.span>
                  <span className="text-xs font-[var(--font-ui)] uppercase tracking-widest">Search</span>
                  {(activeCategory !== 'All' || searchQuery) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-background animate-pulse" />
                  )}
              </button>
           </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------- */}
      {/* BOTTOM SHEET (Mobile/Tablet)                             */}
      {/* ------------------------------------------------------- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[60] bg-black/30 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            <motion.div
              ref={sheetRef}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-[61] md:hidden"
            >
              <div className="bg-background rounded-t-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.12)] max-h-[70vh] overflow-hidden">
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full bg-foreground/15" />
                </div>
                
                <div className="px-6 pb-8 pt-2 flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-[var(--font-ui)] uppercase tracking-widest text-muted-foreground/60">Search</span>
                      <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="relative flex items-center border-b border-foreground/20 pb-3 focus-within:border-foreground transition-colors">
                      <Search size={16} strokeWidth={1.5} className="mr-3 text-muted-foreground shrink-0" />
                      <input
                        ref={mobileInputRef}
                        autoFocus
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Type keywords..."
                        className="flex-1 bg-transparent text-base font-light outline-none text-foreground placeholder:text-foreground/25"
                        style={{ fontSize: 'max(16px, 1rem)' }}
                        autoComplete="off"
                        spellCheck="false"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="ml-2 text-muted-foreground hover:text-foreground transition-colors p-1"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-[var(--font-ui)] uppercase tracking-widest text-muted-foreground/60">
                      {sectionLabels.category[lang]}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
  <button
    key={cat}
    onClick={() => {
      onCategoryChange(cat);
      setTimeout(() => {
        setIsMobileMenuOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 300);
    }}
    className={`px-4 py-2 rounded-full border text-sm transition-all duration-200 ${
      activeCategory === cat 
        ? 'bg-foreground text-background border-foreground' 
        : 'bg-transparent text-foreground/70 border-foreground/15 active:bg-foreground/5'
    }`}
  >
    {categoryLabels[cat][lang]}
  </button>
))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-foreground/5">
                    <span className="text-xs font-[var(--font-ui)] text-muted-foreground/50">
                      {filteredData.length} {filteredData.length === 1 ? 'result' : 'results'}
                    </span>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-xs font-[var(--font-ui)] text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1.5"
                    >
                      <span>Done</span>
                      <span className="text-foreground/30">↓</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};