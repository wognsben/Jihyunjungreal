import { useEffect, useRef, useState } from 'react';

interface ScrambleTextProps {
  text: string;
  duration?: number;
  delay?: number;
  className?: string;
  scrambleSpeed?: number;
  preserveSpace?: boolean;
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

export const ScrambleText = ({
  text,
  duration = 1000,
  delay = 0,
  className = '',
  scrambleSpeed = 30,
  preserveSpace = true,
}: ScrambleTextProps) => {
  const [displayText, setDisplayText] = useState(text); // 초기값을 text로 변경
  const [isAnimating, setIsAnimating] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const hasAnimatedRef = useRef(false); // 최초 애니메이션 여부 추적

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const startAnimation = () => {
      setIsAnimating(true);
      startTimeRef.current = Date.now();
      
      const animate = () => {
        const now = Date.now();
        const progress = Math.min(1, (now - startTimeRef.current) / duration);
        
        // Easing (easeOutCubic)
        const ease = 1 - Math.pow(1 - progress, 3);
        
        let result = '';
        
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          
          if (preserveSpace && char === ' ') {
            result += ' ';
            continue;
          }

          // If current char index is less than eased progress, show original char
          if (i / text.length < ease) {
            result += char;
          } else {
            // Otherwise show random char
            const randomChar = CHARS[Math.floor(Math.random() * CHARS.length)];
            result += randomChar;
          }
        }

        setDisplayText(result);

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          setDisplayText(text); // Ensure final state is correct
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    };

    // 이미 애니메이션이 실행된 경우 (언어 전환 등)
    if (hasAnimatedRef.current) {
      // 바로 애니메이션 시작 (IntersectionObserver 없이)
      timeout = setTimeout(startAnimation, 0);
    } else {
      // 최초 로드 시에만 IntersectionObserver 사용
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !isAnimating) {
            hasAnimatedRef.current = true; // 최초 애니메이션 완료 표시
            timeout = setTimeout(startAnimation, delay);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );

      if (elementRef.current) {
        observer.observe(elementRef.current);
      }

      return () => {
        observer.disconnect();
        clearTimeout(timeout);
        cancelAnimationFrame(rafRef.current);
      };
    }

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [text, duration, delay, preserveSpace]);

  return (
    <span ref={elementRef} className={className}>
      {displayText}
    </span>
  );
};