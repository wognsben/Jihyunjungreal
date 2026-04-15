export interface WPImage {
  id: number;
  source_url: string;
  media_details?: {
    sizes?: {
      full?: { source_url: string };
      medium?: { source_url: string };
      thumbnail?: { source_url: string };
    };
  };
}

export interface WPCategory {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
}

export interface WPPost {
  id: number;
  date: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    protected: boolean;
  };
  featured_media: number;
  _embedded?: {
    'wp:featuredmedia'?: WPImage[];
    'wp:term'?: WPCategory[][];
  };
  acf?: {
    youtube_url?: string;
    related_texts?: WPPost[]; // ACF Relationship field returns post objects
    [key: string]: any;
  };
  meta?: {
    youtube_url?: string;
    [key: string]: any;
  };
}