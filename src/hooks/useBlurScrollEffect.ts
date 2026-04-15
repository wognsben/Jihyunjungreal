import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const useBlurScrollEffect = () => {
  const textRef = useRef<HTMLElement>(null);
  const splitInstanceRef = useRef<SplitType | null>(null);

  useEffect(() => {
    if (!textRef.current) return;

    // Split text into words
    const split = new SplitType(textRef.current, {
      types: 'words',
    });
    
    splitInstanceRef.current = split;

    // Get all words
    const words = split.words;
    
    if (!words || words.length === 0) return;

    // Minimal & Premium Animation
    gsap.fromTo(
      words,
      {
        opacity: 0,
        willChange: 'filter, transform',
        filter: 'blur(4px)', // Reduced blur for subtlety
      },
      {
        opacity: 1,
        filter: 'blur(0px)',
        ease: 'sine.out', // Smoother easing
        stagger: 0.015, // Faster, more fluid
        scrollTrigger: {
          trigger: textRef.current,
          start: 'top bottom-=10%',
          end: 'bottom center+=20%', // Extended for smoother reveal
          scrub: 1.2, // Slightly slower scrub for premium feel
        },
      }
    );

    // Cleanup
    return () => {
      if (splitInstanceRef.current) {
        splitInstanceRef.current.revert();
      }
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return textRef;
};