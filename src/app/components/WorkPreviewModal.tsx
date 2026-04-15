import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Resizable } from 're-resizable';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorks } from '@/contexts/WorkContext';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";

interface WorkPreviewModalProps {
  workId: string;
  onClose: () => void;
}

export const WorkPreviewModal = ({ workId, onClose }: WorkPreviewModalProps) => {
  const { lang } = useLanguage();
  const { works } = useWorks();
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

  // Esc listener
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const work = works.find(w => w.id === workId);
  if (!work || !mounted) return null;

  const title = lang === 'ko' ? work.title_ko : (lang === 'jp' ? work.title_jp : work.title_en);
  const description = lang === 'ko' ? work.description_ko : (lang === 'jp' ? work.description_jp : work.description_en);

  const handleFullView = () => {
    window.location.hash = `#/work/${workId}`;
  };

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    autoplay: true,
    autoplaySpeed: 4000,
  };

  return createPortal(
    <AnimatePresence>
      <div 
        ref={panelRef}
        className={`fixed z-[9999] ${isMobile ? 'top-[20px] left-[20px] w-[calc(100vw-40px)] h-[80vh]' : 'w-fit h-fit'}`}
        style={isMobile ? { position: 'fixed' } : { 
          position: 'fixed', 
          left: typeof window !== 'undefined' ? Math.max(20, window.innerWidth / 2 - 300) : 20, 
          top: 100, 
          width: 'fit-content', 
          height: 'fit-content' 
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={`shadow-2xl bg-background/95 backdrop-blur-md border border-foreground/10 overflow-hidden flex flex-col ${isMobile ? 'w-full h-full rounded-sm' : 'rounded-sm'}`}
        >
          <Resizable
            defaultSize={isMobile ? { width: '100%', height: '100%' } : { width: 600, height: 700 }}
            minWidth={isMobile ? 300 : 400}
            minHeight={isMobile ? 400 : 500}
            maxWidth={1000}
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
              <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-muted-foreground/50">
                Project Preview
              </span>
            </div>

            {/* Content */}
            <div className="flex-grow flex flex-col overflow-y-auto overflow-x-hidden relative scrollbar-hide">
              
              {/* Image Area */}
              <div className="w-full aspect-video bg-muted/5 relative group">
                {work.galleryImages && work.galleryImages.length > 0 ? (
                  <Slider {...sliderSettings} className="w-full h-full overflow-hidden">
                    {work.galleryImages.slice(0, 5).map((img, idx) => (
                      <div key={idx} className="w-full h-full outline-none">
                        <div className="w-full aspect-video relative">
                          <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                        </div>
                      </div>
                    ))}
                  </Slider>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                    No Images
                  </div>
                )}
              </div>

              {/* Info Area */}
              <div className="p-8 flex flex-col gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">{work.year}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">{work.client}</span>
                  </div>
                  <h2 className="text-2xl font-serif font-light text-foreground">{title}</h2>
                </div>

                <div className="w-12 h-px bg-foreground/10" />

                <p className="text-sm font-serif leading-relaxed text-muted-foreground line-clamp-6 whitespace-pre-line">
                  {description}
                </p>
              </div>
            </div>

            {/* Footer Action */}
            <div className="p-4 border-t border-foreground/5 bg-muted/5 flex justify-end flex-shrink-0">
              <button 
                onClick={handleFullView}
                className="group flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase bg-foreground text-background px-6 py-3 hover:bg-foreground/90 transition-all"
              >
                <span>View Project</span>
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

          </Resizable>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
