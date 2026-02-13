
import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from './i18n';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(
    (localStorage.getItem('app_lang') as Language) || 'ar'
  );

  useEffect(() => {
    localStorage.setItem('app_lang', language);
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    
    // Update body font fallback for English
    if (language === 'en') {
      document.body.style.fontFamily = "'Inter', 'Cairo', sans-serif";
    } else {
      document.body.style.fontFamily = "'Cairo', sans-serif";
    }
  }, [language]);

  const t = (path: string): string => {
    const keys = path.split('.');
    let result: any = translations[language];
    for (const key of keys) {
      if (result[key] === undefined) {
        // Fallback to Arabic if English is missing, then to key
        let fallback: any = translations['ar'];
        for (const fKey of keys) {
          if (fallback[fKey] === undefined) return path;
          fallback = fallback[fKey];
        }
        return fallback;
      }
      result = result[key];
    }
    return result;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useTranslation must be used within a LanguageProvider');
  return context;
};
