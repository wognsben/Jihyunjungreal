import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorks } from '@/contexts/WorkContext';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Resizable } from 're-resizable';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";

// Minimal components for the modal
const CustomArrow = ({ className, style, onClick, direction }: any) => (
  <div
    className={`${className} z-10 !w-8 !h-8 !flex !items-center !justify-center before:!content-none hover:!bg-black/5 dark:hover:!bg-white/10 transition-colors duration-300`}
    style={{ ...style, display: "flex", right: direction === 'next' ? '10px' : undefined, left: direction === 'prev' ? '10px' : undefined }}
    onClick={onClick}
  >
    {direction === 'next' ? <ArrowRight className="w-4 h-4 text-foreground" /> : <ArrowLeft className="w-4 h-4 text-foreground" />}
  </div>
);

interface WorkModalProps {
  workId: string | null;
  onClose: () => void;
}

export const WorkModal = ({ workId, onClose }: WorkModalProps) => {
  const { lang } = useLanguage();
  const { works, translateWorksByIds } = useWorks();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (workId && lang !== 'ko') {
       translateWorksByIds([workId], lang);
    }
  }, [workId, lang, translateWorksByIds]);

  const work = works.find(w => String(w.id) === String(workId));

  // Esc listener
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (workId) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [workId, onClose]);

  if (!mounted || !workId || !work) return null;

  const title = lang === 'ko' ? work.title_ko : (lang === 'jp' ? work.title_jp : work.title_en);
  const description = lang === 'ko' ? work.description_ko : (lang === 'jp' ? work.description_jp : work.description_en);

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    nextArrow: <CustomArrow direction="next" />,
    prevArrow: <CustomArrow direction="prev" />,
    dotsClass: "slick-dots !bottom-[10px]",
    autoplay: true,
    autoplaySpeed: 4000
  };

  return createPortal(
    <AnimatePresence>
      <div 
        ref={panelRef}
        className={`fixed z-[9999] ${isMobile ? 'top-[20px] left-[20px] w-[calc(100vw-40px)] h-[80vh]' : 'w-fit h-fit'}`}
        style={isMobile ? { position: 'fixed' } : { 
          position: 'fixed', 
          left: typeof window !== 'undefined' ? Math.max(20, window.innerWidth / 2 - 300) : 20, 
          top: typeof window !== 'undefined' ? Math.max(50, window.innerHeight / 2 - 350) : 50, 
          width: 'fit-content', 
          height: 'fit-content' 
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={`shadow-2xl bg-background/95 backdrop-blur-md border border-foreground/10 overflow-hidden flex flex-col ${isMobile ? 'w-full h-full rounded-sm' : 'rounded-sm'}`}
        >
          <Resizable
            defaultSize={isMobile ? { width: '100%', height: '100%' } : { width: 600, height: 700 }}
            minWidth={isMobile ? 300 : 400} 
            minHeight={isMobile ? 400 : 500}
            maxWidth={1200}
            enable={!isMobile ? { right: true, bottom: true, bottomRight: true } : false}
            className="flex flex-col h-full relative"
          >
            {/* Drag Handle - subtle top bar (desktop only) */}
            {!isMobile && (
              <div 
                className="h-6 flex-shrink-0 flex items-center justify-center cursor-move select-none"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const panel = panelRef.current;
                  if (!panel) return;
                  const rect = panel.getBoundingClientRect();
                  dragState.current = { startX: e.clientX, startY: e.clientY, startLeft: rect.left, startTop: rect.top };
                  
                  const onMouseMove = (ev: MouseEvent) => {
                    if (!dragState.current || !panel) return;
                    const dx = ev.clientX - dragState.current.startX;
                    const dy = ev.clientY - dragState.current.startY;
                    panel.style.left = `${dragState.current.startLeft + dx}px`;
                    panel.style.top = `${dragState.current.startTop + dy}px`;
                  };
                  const onMouseUp = () => {
                    dragState.current = null;
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                  };
                  document.addEventListener('mousemove', onMouseMove);
                  document.addEventListener('mouseup', onMouseUp);
                }}
              >
                <div className="w-10 h-[1.5px] bg-foreground/10 rounded-full" />
              </div>
            )}

            {/* Close button - floating top right */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClose();
              }}
              className="absolute top-2 right-3 z-20 text-muted-foreground/30 hover:text-foreground/70 transition-colors duration-300 p-2 md:p-1 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center cursor-pointer"
            >
              <X size={13} />
            </button>

            {/* Title label */}
            <div className="px-6 pt-1 pb-2 flex-shrink-0">
              <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-muted-foreground/50 truncate max-w-[200px] block">
                {title}
              </span>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-grow overflow-y-auto overflow-x-hidden custom-scrollbar bg-background/50">
              {/* Slider */}
              <div className="w-full aspect-video bg-black/5 mb-6">
                <Slider {...sliderSettings}>
                  {(work.galleryImages || []).slice(0, 5).map((img, i) => (
                    <div key={i} className="w-full h-full outline-none">
                      <div className="w-full aspect-video relative flex items-center justify-center bg-black/5">
                        <img src={img} alt="" className="max-w-full max-h-full object-contain" />
                      </div>
                    </div>
                  ))}
                </Slider>
              </div>

              {/* Info */}
              <div className="px-8 pb-8 space-y-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between border-b border-foreground/10 pb-2">
                    <h2 className="text-xl font-serif font-medium">{title}</h2>
                    <span className="font-mono text-xs text-muted-foreground">{work.year}</span>
                  </div>
                  {work.client && (
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">{work.client}</span>
                  )}
                </div>

                <p className="text-sm font-serif leading-relaxed text-foreground/80 whitespace-pre-wrap">
                  {description?.slice(0, 300)}...
                </p>

                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={() => {
                      window.location.hash = `#/work/${workId}`;
                      onClose();
                    }}
                    className="group flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] hover:bg-foreground/90 transition-colors bg-foreground text-background px-4 py-2"
                  >
                    <span>Open Project</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </Resizable>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
