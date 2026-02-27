'use client';

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
} from 'react';
import en from '@/lib/locales/en.json';
import es from '@/lib/locales/es.json';

type Language = 'en' | 'es';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Translations = Record<string, any>;

const translations: { [key in Language]: Translations } = {
  en,
  es,
};

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

const getTranslation = (lang: Language, key: string): string | undefined => {
  const keys = key.split('.');
  let result: any = translations[lang];
  for (const k of keys) {
    result = result?.[k];
    if (result === undefined) {
      return undefined;
    }
  }
  return typeof result === 'string' ? result : undefined;
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = useMemo(
    () =>
      (
        key: string,
        replacements?: { [key: string]: string | number }
      ): string => {
        let translated = getTranslation(language, key);

        if (translated === undefined && language !== 'en') {
          translated = getTranslation('en', key);
        }

        if (translated === undefined) {
          return key;
        }

        if (replacements) {
          Object.keys(replacements).forEach((rKey) => {
            translated = (translated as string).replace(
              `{${rKey}}`,
              String(replacements[rKey])
            );
          });
        }
        return translated;
      },
    [language]
  );

  const value = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
