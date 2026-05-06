import { useEffect } from 'react';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function AnalyticsTracker() {
  useEffect(() => {
    const sendPageView = () => {
  if (!window.gtag) return;

  // 제작자 GA4
  window.gtag('config', 'G-CVEB5VZM0D', {
    page_path: window.location.hash || '/',
    page_title: document.title,
  });

  // 클라이언트 GA4
  window.gtag('config', 'G-ZRNV1Y3ZVM', {
    page_path: window.location.hash || '/',
    page_title: document.title,
  });
};

    sendPageView();

    window.addEventListener('hashchange', sendPageView);

    return () => {
      window.removeEventListener('hashchange', sendPageView);
    };
  }, []);

  return null;
}