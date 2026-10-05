import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/nunito-sans/latin-400.css';
import '@fontsource/nunito-sans/latin-600.css';
import '@fontsource/nunito-sans/latin-700.css';
import '@fontsource/nunito-sans/latin-800.css';
import './styles/global.css';
import { App } from './app/App';
import { AppErrorBoundary } from './app/AppErrorBoundary';
import { startPwa } from './pwa/register';

createRoot(document.getElementById('root')!).render(
  <StrictMode><AppErrorBoundary><App /></AppErrorBoundary></StrictMode>,
);
startPwa();
