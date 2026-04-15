import { useBlurScrollEffect } from '@/hooks/useBlurScrollEffect';

interface AnimatedParagraphProps {
  children: string;
  className?: string;
}

export const AnimatedParagraph = ({ children, className = '' }: AnimatedParagraphProps) => {
  const textRef = useBlurScrollEffect();

  return (
    <p 
      ref={textRef as React.RefObject<HTMLParagraphElement>}
      className={className}
    >
      {children}
    </p>
  );
};
