import { useEffect, useState } from 'react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

interface PremiumImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: string;
  priority?: boolean;
}

export const PremiumImage = ({
  src,
  alt,
  className = '',
  containerClassName = '',
  aspectRatio = '',
  priority = false,
  ...props
}: PremiumImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(!src);
  }, [src]);

  return (
    <div className={`relative overflow-hidden bg-background ${aspectRatio} ${containerClassName}`}>
      

      {hasError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
          <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
            No Image
          </span>
        </div>
      )}

      {!hasError && (
        <ImageWithFallback
          key={src}
          src={src}
          alt={alt}
          className={`block w-full h-full object-cover ${className}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          loading={priority ? 'eager' : 'eager'}
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
};