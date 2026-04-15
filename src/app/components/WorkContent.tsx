import { useRef, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorks } from '@/contexts/WorkContext';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import SplitType from 'split-type';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";

// Minimal Blur Reveal Component
const BlurReveal = ({ children, className, delay = 0 }: { children: string, className?: string, delay?: number }) => {
  const elementRef = useRef<HTMLParagraphElement>(null);
  
  useEffect(() => {
    if (!elementRef.current) return;
    // Simple check to avoid running split on empty text
    if (!elementRef.current.innerText.trim()) return;

    const split = new SplitType(elementRef.current, { types: 'words' });
    const words = split.words;
    if (!words || words.length === 0) return;

    gsap.set(words, { opacity: 0, filter: 'blur(10px)', y: 10, willChange: 'filter, opacity, transform' });
    const ctx = gsap.context(() => {
      gsap.to(words, {
        opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.2,
        stagger: 0.015, ease: 'power2.out', delay: delay
      });
    }, elementRef);

    return () => { ctx.revert(); split.revert(); };
  }, [children, delay]); 

  return <p ref={elementRef} className={className}>{children}</p>;
};

// Helper: Custom Slider Arrow
const CustomArrow = ({ className, style, onClick, direction }: any) => (
  <div
    className={`${className} z-10 !w-12 !h-12 !flex !items-center !justify-center before:!content-none hover:!bg-black/5 dark:hover:!bg-white/10 rounded-full transition-colors duration-300`}
    style={{ ...style, display: "flex", right: direction === 'next' ? '-60px' : undefined, left: direction === 'prev' ? '-60px' : undefined }}
    onClick={onClick}
  >
    {direction === 'next' ? <ArrowRight className="w-4 h-4 text-foreground/50" /> : <ArrowLeft className="w-4 h-4 text-foreground/50" />}
  </div>
);

// Helper: Video Player Component
const VideoPlayer = ({ url }: { url: string }) => {
  const getVimeoId = (link: string) => {
    const match = link.match(/(?:vimeo.com\/|video\/)(\d+)/);
    return match ? match[1] : null;
  };

  const isYoutube = url.includes('youtube') || url.includes('youtu.be');
  const isVimeo = url.includes('vimeo');

  if (isYoutube) {
    return (
      <div className="relative w-full aspect-video bg-black/5 rounded-sm overflow-hidden">
        <iframe
          src={url.replace('watch?v=', 'embed/')}
          title="Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full opacity-90 hover:opacity-100 transition-opacity duration-500"
        />
      </div>
    );
  }

  if (isVimeo) {
    const vimeoId = getVimeoId(url);
    if (!vimeoId) return null;
    return (
      <div className="relative w-full aspect-video bg-black/5 rounded-sm overflow-hidden">
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}?color=ffffff&title=0&byline=0&portrait=0`}
          title="Vimeo"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full opacity-90 hover:opacity-100 transition-opacity duration-500"
        />
      </div>
    );
  }

  return null;
};

const cleanText = (text: string) => {
  if (!text) return "";
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"');
};

interface WorkContentProps {
  work: any;
  isModal?: boolean;
  onArticleClick?: (id: string) => void;
  onHoverArticle?: (id: string | null, img: string | null) => void;
  hoveredArticleId?: string | null;
}

export const WorkContent = ({ work, isModal = false, onArticleClick, onHoverArticle, hoveredArticleId }: WorkContentProps) => {
  const { lang } = useLanguage();
  const { texts } = useWorks();

  const title = lang === 'ko' ? work.title_ko : (lang === 'jp' ? work.title_jp : work.title_en);
  const description = lang === 'ko' ? work.description_ko : (lang === 'jp' ? work.description_jp : work.description_en);
  const yearCaption = lang === 'ko' ? work.yearCaption_ko : (lang === 'jp' ? work.yearCaption_jp : work.yearCaption_en);
  const videoUrl = work.youtubeUrl || work.vimeoUrl;

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 800,
    slidesToShow: 1,
    slidesToScroll: 1,
    variableWidth: true,
    centerMode: true,
    focusOnSelect: true,
    nextArrow: <CustomArrow direction="next" />,
    prevArrow: <CustomArrow direction="prev" />,
    className: "center",
    dotsClass: "slick-dots !bottom-[-60px]",
    // Disable arrows in modal mode if space is tight, or style them smaller? 
    // For now keep them but they might be off-screen if modal is small.
    // Let's adjust arrows for modal.
    arrows: !isModal, 
  };

  return (
    <div className={`w-full ${isModal ? 'p-6 md:p-8' : ''}`}>
      
      {/* 1. Header Spec Sheet */}
      <div className={`${isModal ? 'mb-12' : 'mb-24 md:mb-32'} animate-in fade-in duration-1000 slide-in-from-bottom-4`}>
        <div className={`grid grid-cols-1 ${isModal ? 'gap-y-6' : 'md:grid-cols-12 gap-y-8'} border-t border-black/5 dark:border-white/10 pt-6`}>
          <div className={isModal ? '' : 'md:col-span-4 min-[1025px]:col-span-3'}>
            <span className="block text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 font-mono">Project Title</span>
            <h1 className={`${isModal ? 'text-xl' : 'text-2xl md:text-3xl'} font-serif font-light text-foreground/90 leading-tight`}>{cleanText(title)}</h1>
          </div>
          <div className={isModal ? '' : 'md:col-span-2 min-[1025px]:col-span-2 md:col-start-6 min-[1025px]:col-start-5'}>
            <span className="block text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 font-mono">Year</span>
            <span className="block text-sm font-mono text-foreground/70">{work.year}</span>
            {yearCaption && <span className="block text-[10px] text-muted-foreground/50 mt-1 font-serif italic">{yearCaption}</span>}
          </div>
          <div className={isModal ? '' : 'md:col-span-2 min-[1025px]:col-span-2'}>
            {work.client && (
              <>
                <span className="block text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 font-mono">Client</span>
                <span className="block text-sm font-mono text-foreground/70">{work.client}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Split Layout: Video & Text */}
      <div className={`grid grid-cols-1 ${isModal ? 'gap-8' : 'md:grid-cols-12 gap-12'} mb-40`}>
        {/* Video */}
        <div className={isModal ? 'w-full' : 'md:col-span-5 min-[1025px]:col-span-5 relative'}>
          <div className={!isModal ? "md:sticky md:top-32 space-y-4" : "space-y-4"}>
            {videoUrl && (
              <div className="w-full">
                 <VideoPlayer url={videoUrl} />
                 <div className="mt-3 flex items-center justify-between opacity-50">
                    <span className="text-[9px] uppercase tracking-widest font-mono">Featured Film</span>
                    <div className="h-px bg-current flex-grow ml-4"></div>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className={isModal ? 'w-full' : 'md:col-span-6 md:col-start-7 min-[1025px]:col-span-6 min-[1025px]:col-start-7'}>
           {description && (
             <div className="space-y-8">
               {description.split('\n\n').map((paragraph, index) => (
                  <BlurReveal 
                    key={index} 
                    className={`font-serif text-foreground/80 ${index === 0 ? 'text-lg md:text-xl leading-[1.6] opacity-90' : 'text-sm md:text-base leading-[1.8] opacity-70'}`}
                    delay={0.2 + (index * 0.1)}
                  >
                    {cleanText(paragraph)}
                  </BlurReveal>
               ))}
             </div>
           )}
        </div>
      </div>

      {/* 3. Image Slider */}
      <div className={`${isModal ? 'mb-24' : 'mb-40 md:mb-64'}`}>
        <Slider {...sliderSettings}>
          {work.galleryImages.map((image: string, index: number) => (
            <div key={index} className="outline-none focus:outline-none">
              <div className={`relative ${isModal ? 'h-[40vh]' : 'h-[50vh] md:h-[70vh]'} group cursor-grab active:cursor-grabbing`} style={{ width: 'fit-content' }}>
                <div className="absolute inset-0 z-10 bg-black/0 group-hover:bg-black/20 dark:group-hover:bg-white/10 transition-colors duration-500 ease-out" />
                <img 
                  src={image} 
                  alt={`Gallery ${index + 1}`} 
                  className="h-full w-auto object-contain mx-auto block"
                  draggable={false}
                />
                <div className="absolute bottom-4 right-4 z-20 text-[10px] font-mono text-white bg-black/50 px-2 py-1 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {String(index + 1).padStart(2, '0')} / {String(work.galleryImages.length).padStart(2, '0')}
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>

      {/* 4. Related Texts */}
      {work.relatedArticles && work.relatedArticles.length > 0 && (
        <div className={`${isModal ? 'mb-20' : 'mb-40'} pt-12 border-t border-black/5 dark:border-white/5`}>
          <div className={`grid grid-cols-1 ${isModal ? 'gap-8' : 'min-[1025px]:grid-cols-12 gap-12'}`}>
            <div className={isModal ? '' : 'md:col-span-4 min-[1025px]:col-span-3'}>
               <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-mono mb-6">Related Texts</h2>
            </div>
            <div className={isModal ? '' : 'md:col-span-8 min-[1025px]:col-span-9'}>
                <div className="flex flex-col border-t border-black/10 dark:border-white/10">
                  {work.relatedArticles.map((article: any, index: number) => {
                     const textItem = texts.find(t => t.id === article.id);
                     const displayTitle = textItem ? textItem.title[lang] : article.title;
                     return (
                        <div
                           key={article.id}
                           onClick={() => onArticleClick && onArticleClick(article.id)}
                           className="group block relative cursor-pointer"
                           onMouseEnter={() => onHoverArticle && onHoverArticle(article.id, textItem?.image || null)}
                           onMouseLeave={() => onHoverArticle && onHoverArticle(null, null)}
                        >
                           <div className={`flex items-baseline py-4 border-b border-black/10 dark:border-white/10 transition-all duration-300 ${hoveredArticleId === article.id ? 'pl-4 opacity-100' : 'pl-0 opacity-80'}`}>
                             <span className="w-12 text-[10px] font-mono text-muted-foreground/60">{String(index + 1).padStart(2, '0')}</span>
                             <h3 className="text-lg font-serif font-light tracking-tight text-foreground/90">{cleanText(displayTitle)}</h3>
                           </div>
                        </div>
                     );
                  })}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};