import { Helmet } from 'react-helmet-async';
import { useLanguage } from '@/contexts/LanguageContext';

interface SeoHeadProps {
  title?: string;
  description?: string;
  image?: string;
}

export const SeoHead = ({ title, description, image }: SeoHeadProps) => {
  const { lang } = useLanguage();
  
  const siteTitle = 'jihyunjung';
  const defaultDescription = 'Minimalist Portfolio of Architect Jihyun Jung. Exploring the raw texture of materials and the precision of space.';
  const defaultImage = 'https://raw.githubusercontent.com/wognsben/gallery/main/1.jpg';
  
  // Ensure all values are strings to prevent object rendering errors
  const fullTitle = String(title ? `${title} | ${siteTitle}` : siteTitle);
  const metaDescription = String(description || defaultDescription);
  const metaImage = String(image || defaultImage);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="icon" type="image/png" href="/favicon.png" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />
    </Helmet>
  );
};