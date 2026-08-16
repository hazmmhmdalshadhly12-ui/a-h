import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext({ dir: 'rtl', lang: 'ar' });

export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  }, []);

  return <ThemeContext.Provider value={{ dir: 'rtl', lang: 'ar' }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}