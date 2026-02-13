
import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeType = 'green' | 'blue' | 'purple' | 'orange';

interface ThemeConfig {
  color: string;
  hover: string;
  alpha: string;
  alphaSoft: string;
  shadow: string;
  shadowSoft: string;
}

const THEMES: Record<ThemeType, ThemeConfig> = {
  green: {
    color: '#84cc16',
    hover: '#65a30d',
    alpha: 'rgba(132, 204, 22, 0.1)',
    alphaSoft: 'rgba(132, 204, 22, 0.05)',
    shadow: 'rgba(132, 204, 22, 0.3)',
    shadowSoft: 'rgba(132, 204, 22, 0.2)'
  },
  blue: {
    color: '#3b82f6',
    hover: '#2563eb',
    alpha: 'rgba(59, 130, 246, 0.1)',
    alphaSoft: 'rgba(59, 130, 246, 0.05)',
    shadow: 'rgba(59, 130, 246, 0.3)',
    shadowSoft: 'rgba(59, 130, 246, 0.2)'
  },
  purple: {
    color: '#a855f7',
    hover: '#9333ea',
    alpha: 'rgba(168, 85, 247, 0.1)',
    alphaSoft: 'rgba(168, 85, 247, 0.05)',
    shadow: 'rgba(168, 85, 247, 0.3)',
    shadowSoft: 'rgba(168, 85, 247, 0.2)'
  },
  orange: {
    color: '#f97316',
    hover: '#ea580c',
    alpha: 'rgba(249, 115, 22, 0.1)',
    alphaSoft: 'rgba(249, 115, 22, 0.05)',
    shadow: 'rgba(249, 115, 22, 0.3)',
    shadowSoft: 'rgba(249, 115, 22, 0.2)'
  }
};

interface ThemeContextProps {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(
    (localStorage.getItem('app_theme') as ThemeType) || 'green'
  );

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    const config = THEMES[theme];
    const root = document.documentElement;
    root.style.setProperty('--primary-color', config.color);
    root.style.setProperty('--primary-hover', config.hover);
    root.style.setProperty('--primary-alpha', config.alpha);
    root.style.setProperty('--primary-alpha-soft', config.alphaSoft);
    root.style.setProperty('--primary-shadow', config.shadow);
    root.style.setProperty('--primary-shadow-soft', config.shadowSoft);
  }, [theme]);

  const setTheme = (t: ThemeType) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
