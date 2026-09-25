import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import id from "./locales/id.json";
import en from "./locales/en.json";

const savedLanguage = localStorage.getItem("language");
const browserLanguage = navigator.language?.toLowerCase().startsWith("en") ? "en" : "id";
const initialLanguage = savedLanguage === "en" || savedLanguage === "id" ? savedLanguage : browserLanguage;

i18n.use(initReactI18next).init({
  resources: {
    id: {
      translation: id,
    },
    en: {
      translation: en,
    },
  },
  lng: initialLanguage,
  fallbackLng: "id",
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("language", lng);
});

export default i18n;
