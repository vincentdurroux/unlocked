if (typeof window !== 'undefined' && (
  window.location.hash.includes('type=recovery') ||
  window.location.hash.includes('recovery') ||
  window.location.href.includes('type=recovery') ||
  window.location.search.includes('type=recovery')
)) {
  localStorage.setItem('unlocked_is_recovery_session', 'true');
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
