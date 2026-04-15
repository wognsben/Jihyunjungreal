import { useState, useEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopProps {
  showAfterScroll?: number; // 스크롤 위치 (기본값: 50vh)
}

// Lerp utility
const lerp = (current: number, target: number, factor: number) => {
  return current * (1 - factor) + target * factor;
};

// Calculate distance between two points
const calculateDistance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.hypot(x1 - x2, y1 - y2);
};

export const ScrollToTop = ({ showAfterScroll }: ScrollToTopProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMagnetic, setIsMagnetic] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Threshold for showing button (default 50% of viewport height)
  const threshold = showAfterScroll || (typeof window !== 'undefined' ? window.innerHeight * 0.5 : 400);

  // Show/Hide button based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsVisible(scrollPosition > threshold);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  // Magnetic Button Effect
  useEffect(() => {
    const button = buttonRef.current;
    if (!button || !isVisible) return;

    const triggerArea = 150;
    const interpolationFactor = 0.12;

    const lerpingData = {
      x: { current: 0, target: 0 },
      y: { current: 0, target: 0 },
    };

    let mousePosition = { x: 0, y: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      mousePosition.x = e.clientX;
      mousePosition.y = e.clientY;
    };

    let animationFrameId: number;

    const render = () => {
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distanceFromMouseToCenter = calculateDistance(
        mousePosition.x,
        mousePosition.y,
        centerX,
        centerY
      );

      let targetHolder = { x: 0, y: 0 };

      if (distanceFromMouseToCenter < triggerArea) {
        setIsMagnetic(true);
        targetHolder.x = (mousePosition.x - centerX) * 0.28;
        targetHolder.y = (mousePosition.y - centerY) * 0.28;
      } else {
        setIsMagnetic(false);
      }

      lerpingData.x.target = targetHolder.x;
      lerpingData.y.target = targetHolder.y;

      lerpingData.x.current = lerp(
        lerpingData.x.current,
        lerpingData.x.target,
        interpolationFactor
      );
      lerpingData.y.current = lerp(
        lerpingData.y.current,
        lerpingData.y.target,
        interpolationFactor
      );

      button.style.transform = `translate(${lerpingData.x.current}px, ${lerpingData.y.current}px)`;

      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener('mousemove', handleMouseMove);
    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (button) {
        button.style.transform = '';
      }
    };
  }, [isVisible]);

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    null
  );
};