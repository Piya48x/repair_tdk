import React, { createContext, useContext, useEffect, useState } from "react";
import {
  DATE_FNS_LOCALES,
  LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  getInitialLanguage,
  resolveLanguage,
  translate,
} from "./config";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (nextLanguage) => {
    setLanguageState(resolveLanguage(nextLanguage));
  };

  const t = (key, variables) => translate(language, key, variables);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        options: LANGUAGE_OPTIONS,
        dateLocale: DATE_FNS_LOCALES[language] || DATE_FNS_LOCALES.en,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useI18n must be used inside LanguageProvider");
  }

  return context;
}
