import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { WorkProvider } from '@/contexts/WorkContext';
import { AppContent } from '@/app/AppContent';
import { AnalyticsTracker } from '@/app/components/AnalyticsTracker';

// Top-level App component that provides contexts
const App = () => {
  return (
    <HelmetProvider>
      <LanguageProvider>
        <WorkProvider>
          <AnalyticsTracker />
          <AppContent />
        </WorkProvider>
      </LanguageProvider>
    </HelmetProvider>
  );
};

export default App;