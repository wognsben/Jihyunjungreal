import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import { fetchWorks, fetchTexts } from '@/services/wp-api';
import { Work } from '@/data/works';
import { TextItem } from '@/data/texts';

type Language = 'ko' | 'en' | 'jp';

interface WorkContextType {
  works: Work[];
  texts: TextItem[];
  isWorksLoading: boolean;
  isTextsLoading: boolean;
  error: string | null;
  getWorkById: (id: string) => Work | undefined;
  ensureWorksLoaded: () => Promise<void>;
  ensureTextsLoaded: () => Promise<void>;
  translateWorksByIds: (ids: string[], lang: Language) => Promise<void>;
  translateTextsByIds: (ids: string[], lang: Language) => Promise<void>;
  currentLang: Language;
}

const defaultContextValue: WorkContextType = {
  works: [],
  texts: [],
  isWorksLoading: false,
  isTextsLoading: false,
  error: null,
  getWorkById: () => undefined,
  ensureWorksLoaded: async () => {},
  ensureTextsLoaded: async () => {},
  translateWorksByIds: async () => {},
  translateTextsByIds: async () => {},
  currentLang: 'ko',
};

const WorkContext = createContext<WorkContextType>(defaultContextValue);

export const WorkProvider = ({ children }: { children: ReactNode }) => {
  const [works, setWorks] = useState<Work[]>([]);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [isWorksLoading, setIsWorksLoading] = useState(false);
  const [isTextsLoading, setIsTextsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState<Language>('ko');

  const worksLoadedRef = useRef(false);
  const textsLoadedRef = useRef(false);

  const worksPromiseRef = useRef<Promise<void> | null>(null);
  const textsPromiseRef = useRef<Promise<void> | null>(null);

  const ensureWorksLoaded = useCallback(async () => {
    if (worksLoadedRef.current) return;
    if (worksPromiseRef.current) return worksPromiseRef.current;

    worksPromiseRef.current = (async () => {
      console.log('[WorkProvider] Loading works...');
      setIsWorksLoading(true);
      setError(null);

      try {
  const fetchedWorks = await fetchWorks();
  console.log('[WorkProvider] fetchedWorks:', fetchedWorks);
  console.log('[WorkProvider] fetchedWorks.length:', fetchedWorks?.length);

  setWorks(fetchedWorks);
  worksLoadedRef.current = true;

  console.log('[WorkProvider] works loaded complete');
} catch (err) {
  console.error('Failed to load works', err);
  setError('Failed to load works');
} finally {
  setIsWorksLoading(false);
  worksPromiseRef.current = null;
}
    })();

    return worksPromiseRef.current;
  }, []);

  const ensureTextsLoaded = useCallback(async () => {
    if (textsLoadedRef.current) return;
    if (textsPromiseRef.current) return textsPromiseRef.current;

    textsPromiseRef.current = (async () => {
      console.log('[WorkProvider] Loading texts...');
      setIsTextsLoading(true);
      setError(null);

      try {
  const fetchedTexts = await fetchTexts('ko');
  console.log('[WorkProvider] fetchedTexts:', fetchedTexts);
  console.log('[WorkProvider] fetchedTexts.length:', fetchedTexts?.length);

  setTexts(fetchedTexts);
  textsLoadedRef.current = true;

  console.log('[WorkProvider] texts loaded complete');
} catch (err) {
  console.error('Failed to load texts', err);
  setError('Failed to load texts');
} finally {
  setIsTextsLoading(false);
  textsPromiseRef.current = null;
}
    })();

    return textsPromiseRef.current;
  }, []);

  const getWorkById = useCallback(
    (id: string) => works.find((w) => w.id === id),
    [works]
  );

  const translateWorksByIds = useCallback(async (_ids: string[], lang: Language) => {
  setIsWorksLoading(true);
  setError(null);

  try {
    const fetchedWorks = await fetchWorks();
    setWorks(fetchedWorks);
    setCurrentLang(lang);
  } catch (err) {
    console.error('Failed to translate works', err);
    setError('Failed to translate works');
  } finally {
    setIsWorksLoading(false);
  }
}, []);

  const translateTextsByIds = useCallback(async (_ids: string[], lang: Language) => {
  setIsTextsLoading(true);
  setError(null);

  try {
    const fetchedTexts = await fetchTexts(lang);
    setTexts(fetchedTexts);
    setCurrentLang(lang);
  } catch (err) {
    console.error('Failed to translate texts', err);
    setError('Failed to translate texts');
  } finally {
    setIsTextsLoading(false);
  }
}, []);

  return (
    <WorkContext.Provider
      value={{
        works,
        texts,
        isWorksLoading,
        isTextsLoading,
        error,
        getWorkById,
        ensureWorksLoaded,
        ensureTextsLoaded,
        translateWorksByIds,
        translateTextsByIds,
        currentLang,
      }}
    >
      {children}
    </WorkContext.Provider>
  );
};

export const useWorks = () => {
  return useContext(WorkContext);
};