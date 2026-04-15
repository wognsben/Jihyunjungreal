/**
 * Generate a stable placeholder image URL
 * Uses a reliable CDN service that works on all deployment platforms
 */

export interface PlaceholderImageOptions {
  width?: number;
  height?: number;
  text?: string;
  bgColor?: string;
  textColor?: string;
}

/**
 * Generate a placeholder image using Placehold.co (reliable, free CDN)
 * This service works perfectly on Netlify, Vercel, and all platforms
 */
export const generatePlaceholder = (options: PlaceholderImageOptions = {}): string => {
  const {
    width = 1200,
    height = 800,
    text = 'Image',
    bgColor = '1a1a1a',
    textColor = 'ffffff',
  } = options;

  return `https://placehold.co/${width}x${height}/${bgColor}/${textColor}?text=${encodeURIComponent(text)}`;
};

/**
 * Curated high-quality images from Unsplash (with proper attribution)
 * These URLs are stable and work on all platforms
 */
export const ARTWORK_IMAGES = {
  exhibition1: 'https://images.unsplash.com/photo-1723974591057-ccadada1f283?w=1200&q=80',
  installation1: 'https://images.unsplash.com/photo-1723242017405-5018aa65ddad?w=1200&q=80',
  sculpture1: 'https://images.unsplash.com/photo-1701318226666-6b5b02d3df4d?w=1200&q=80',
  design1: 'https://images.unsplash.com/photo-1621111848501-8d3634f82336?w=1200&q=80',
  photography1: 'https://images.unsplash.com/photo-1617657172340-15a0fabc3605?w=1200&q=80',
  installation2: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=1200&q=80',
  architecture1: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
};

/**
 * Get a fallback image with better error handling
 */
export const getImageWithFallback = (imageUrl?: string, fallbackType: keyof typeof ARTWORK_IMAGES = 'exhibition1'): string => {
  if (!imageUrl) {
    return ARTWORK_IMAGES[fallbackType];
  }
  return imageUrl;
};

/**
 * Preload an image and return a promise
 */
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

/**
 * Preload multiple images
 */
export const preloadImages = (srcs: string[]): Promise<void[]> => {
  return Promise.all(srcs.map(src => preloadImage(src)));
};
