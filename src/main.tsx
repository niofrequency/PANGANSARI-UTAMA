import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './i18n/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { installErrorReporting } from './lib/errorReporter';
import { initSentry } from './lib/sentry';

initSentry();
installErrorReporting();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
);
