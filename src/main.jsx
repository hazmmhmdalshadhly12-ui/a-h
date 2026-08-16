import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { AcademyProvider } from './context/AcademyContext.jsx';

// HashRouter — بيخلي الموقع شغال على GitHub Pages من غير إعدادات سيرفر أو Rewrite
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AcademyProvider>
            <App />
            </AcademyProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </HashRouter>
  </React.StrictMode>
);