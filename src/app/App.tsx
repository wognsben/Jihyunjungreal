import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { WorkProvider } from '@/contexts/WorkContext';
import { AppContent } from '@/app/AppContent';

// Top-level App component that provides contexts
const App = () => {
  return (
    <HelmetProvider>
      <LanguageProvider>
        <WorkProvider>
          <AppContent />
        </WorkProvider>
      </LanguageProvider>
    </HelmetProvider>
  );
};

export default App;