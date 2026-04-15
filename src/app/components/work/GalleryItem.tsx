import { PremiumImage } from '@/app/components/ui/PremiumImage';

interface GalleryItemProps {
  image: string;
  title: string;
  index: number;
  layoutClass: string;
  containerClass: string;
}

export const GalleryItem = ({
  image,
  title,
  index,
  layoutClass,
  containerClass,
}: GalleryItemProps) => {
  return (
    <div className={containerClass}>
      <div className={`relative overflow-hidden ${layoutClass}`}>
        <PremiumImage
          src={image}
          alt={`${title} - View ${index + 1}`}
          className="block w-full h-full object-cover"
          containerClassName="w-full h-full"
          priority={true}
        />
      </div>
    </div>
  );
};