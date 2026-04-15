/**
 * Translation Service with Multiple Providers
 * - Primary: MyMemory Translation API (free, CORS-enabled)
 * - Uses localStorage for caching to minimize API calls
 * - Automatic fallback to original Korean text if translation fails
 */

type Language = 'ko' | 'en' | 'jp';

interface TranslationCache {
  [key: string]: string;
}

interface TranslationStats {
  totalCached: number;
  lastUpdate: string;
  monthlyUsage: number;
}

// MyMemory Translation API (free, CORS-enabled)
const MYMEMORY_API_URL = 'https://api.mymemory.translated.net/get';
const CACHE_VERSION = 'v1';
const CACHE_PREFIX = `translation_${CACHE_VERSION}_`;
const STATS_KEY = 'translation_stats';

// Log translation service status
if (typeof window !== 'undefined') {
  console.log('✅ [Translation] Service loaded with MyMemory API (CORS-enabled)');
}

// Language codes for MyMemory API
const LANG_MAP: Record<Language, string> = {
  ko: 'ko',
  en: 'en',
  jp: 'ja',
};

/**
 * Generate cache key for translation
 */
const getCacheKey = (text: string, from: Language, to: Language): string => {
  return `${CACHE_PREFIX}${from}_${to}_${text.substring(0, 50)}`;
};

/**
 * Get cached translation
 */
const getCache = (text: string, from: Language, to: Language): string | null => {
  try {
    const key = getCacheKey(text, from, to);
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('[Translation] Cache read error:', error);
    return null;
  }
};

/**
 * Set cached translation
 */
const setCache = (text: string, from: Language, to: Language, translated: string): void => {
  try {
    const key = getCacheKey(text, from, to);
    localStorage.setItem(key, translated);
    
    // Update stats
    updateStats(text.length);
  } catch (error) {
    console.warn('[Translation] Cache write error:', error);
  }
};

/**
 * Update translation statistics
 */
const updateStats = (charCount: number): void => {
  try {
    const stats: TranslationStats = JSON.parse(
      localStorage.getItem(STATS_KEY) || 
      '{"totalCached":0,"lastUpdate":"","monthlyUsage":0}'
    );
    
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = stats.lastUpdate.substring(0, 7);
    
    // Reset monthly usage if new month
    if (currentMonth !== lastMonth) {
      stats.monthlyUsage = 0;
    }
    
    stats.totalCached += 1;
    stats.monthlyUsage += charCount;
    stats.lastUpdate = now.toISOString();
    
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.warn('[Translation] Stats update error:', error);
  }
};

/**
 * Get translation statistics
 */
export const getTranslationStats = (): TranslationStats => {
  try {
    return JSON.parse(
      localStorage.getItem(STATS_KEY) || 
      '{"totalCached":0,"lastUpdate":"","monthlyUsage":0}'
    );
  } catch {
    return { totalCached: 0, lastUpdate: '', monthlyUsage: 0 };
  }
};

/**
 * Clear translation cache (useful for debugging or major updates)
 */
export const clearTranslationCache = (): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    localStorage.removeItem(STATS_KEY);
    console.log('[Translation] Cache cleared');
  } catch (error) {
    console.error('[Translation] Cache clear error:', error);
  }
};

/**
 * Call MyMemory API
 */
const callMyMemoryAPI = async (text: string, targetLang: Language): Promise<string> => {
  const params = new URLSearchParams({
    q: text,
    langpair: `ko|${LANG_MAP[targetLang]}`,
  });

  const url = `${MYMEMORY_API_URL}?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MyMemory API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // MyMemory returns the translated text in responseData.translatedText
  if (!data.responseData || !data.responseData.translatedText) {
    throw new Error('Invalid response from MyMemory API');
  }
  
  return data.responseData.translatedText;
};

/**
 * Translate text from Korean to target language
 * - Uses cache first
 * - Falls back to original text on error
 * - Auto-detects if translation is needed (ko -> ko returns original)
 */
export const translate = async (text: string, targetLang: Language): Promise<string> => {
  // No translation needed for Korean
  if (targetLang === 'ko') {
    return text;
  }

  // Empty text
  if (!text || text.trim() === '') {
    return text;
  }

  try {
    // Check cache first
    const cached = getCache(text, 'ko', targetLang);
    if (cached) {
      console.log(`[Translation] Cache hit: ${text.substring(0, 30)}...`);
      return cached;
    }

    // Call MyMemory API
    console.log(`[Translation] Translating to ${targetLang}: ${text.substring(0, 30)}...`);
    const translated = await callMyMemoryAPI(text, targetLang);
    
    // Cache the result
    setCache(text, 'ko', targetLang, translated);
    
    return translated;
  } catch (error) {
    console.error('[Translation] Error:', error);
    
    // Fallback to original Korean text
    console.warn(`[Translation] Fallback to original: ${text.substring(0, 30)}...`);
    return text;
  }
};

/**
 * Translate multiple texts in batch (with rate limiting)
 */
export const translateBatch = async (
  texts: string[], 
  targetLang: Language,
  delayMs: number = 100
): Promise<string[]> => {
  const results: string[] = [];
  
  for (const text of texts) {
    const translated = await translate(text, targetLang);
    results.push(translated);
    
    // Small delay to avoid rate limiting
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
};

/**
 * Translate an object with language keys
 */
export const translateObject = async <T extends Record<string, any>>(
  obj: T,
  targetLang: Language
): Promise<T> => {
  const result = { ...obj };
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.trim() !== '') {
      result[key] = await translate(value, targetLang);
    }
  }
  
  return result;
};