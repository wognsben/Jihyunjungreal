import { useEffect, useRef, useState } from 'react';
import { Work } from '@/data/works';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { getLocalizedThumbnail } from '@/utils/getLocalizedImage';
import { useLanguage } from '@/contexts/LanguageContext';
import gsap from 'gsap';

interface YearPreviewProps {
  works: Work[];
  isVisible: boolean;
}

export const YearPreview = ({ works, isVisible }: YearPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const galleryTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const { lang } = useLanguage();

  // Get ALL preview images for slideshow
  const previewImages = works.map(work => getLocalizedThumbnail(work, lang));

  // Simple fade in/out
  useEffect(() => {
    if (!containerRef.current) return;

    if (isVisible) {
      gsap.to(containerRef.current, {
        autoAlpha: 1,
        duration: 0.4,
        ease: 'power2.out'
      });
      startGallery();
    } else {
      gsap.to(containerRef.current, {
        autoAlpha: 0,
        duration: 0.3,
        ease: 'power2.in'
      });
      stopGallery();
    }
  }, [isVisible, works]);

  // Smooth crossfade gallery effect
  const startGallery = () => {
    // Kill previous gallery timeline
    if (galleryTimelineRef.current) {
      galleryTimelineRef.current.kill();
      galleryTimelineRef.current = null;
    }

    if (previewImages.length === 0) return;
    if (previewImages.length === 1) {
      // Single image - just show it
      gsap.set('[data-gallery-index="0"]', { opacity: 1 });
      return;
    }

    const galleryTl = gsap.timeline({ repeat: -1 });

    // Set initial state: first image visible, rest hidden
    previewImages.forEach((_, index) => {
      if (index === 0) {
        galleryTl.set(`[data-gallery-index="${index}"]`, { opacity: 1 }, 0);
      } else {
        galleryTl.set(`[data-gallery-index="${index}"]`, { opacity: 0 }, 0);
      }
    });

    // Smooth crossfade between images
    previewImages.forEach((_, index) => {
      const nextIndex = (index + 1) % previewImages.length;
      
      galleryTl
        .to({}, { duration: 1.5 }) // Hold current image
        .to(`[data-gallery-index="${index}"]`, { 
          opacity: 0, 
          duration: 0.8, 
          ease: 'power2.inOut' 
        }, '-=0.4')
        .to(`[data-gallery-index="${nextIndex}"]`, { 
          opacity: 1, 
          duration: 0.8, 
          ease: 'power2.inOut' 
        }, '<'); // '<' means start at same time as previous
    });

    galleryTimelineRef.current = galleryTl;
  };

  const stopGallery = () => {
    if (galleryTimelineRef.current) {
      galleryTimelineRef.current.kill();
      galleryTimelineRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGallery();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ 
        opacity: 0,
        visibility: 'hidden'
      }}
    >
      {/* Single LARGE Image Slideshow - 4:3 Landscape */}
      <div className="absolute inset-0 flex items-center justify-center p-12">
        {previewImages.map((image, index) => (
          <div
            key={index}
            data-gallery-index={index}
            className="absolute w-full h-full flex items-center justify-center"
          >
            <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: '4 / 3', maxHeight: '100%' }}>
              <ImageWithFallback
                src={image}
                alt={`${works[index]?.title_en || 'Preview'}`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};