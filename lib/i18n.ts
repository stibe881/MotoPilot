import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import de from "@/locales/de";
import en from "@/locales/en";

const LANGUAGE_KEY = "@motopilot/language";

export const SUPPORTED_LANGUAGES = [
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "en", label: "English", flag: "🇬🇧" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

/** Persist language choice and apply it immediately. */
export async function setLanguage(code: LanguageCode) {
  await AsyncStorage.setItem(LANGUAGE_KEY, code);
  await i18n.changeLanguage(code);
}

/**
 * Initialise i18n synchronously with German as default, then asynchronously
 * load the persisted language in the background – no blocking loading state.
 */
export function initI18n(): Promise<void> {
  // Synchronous init with default language "de" so the app renders immediately.
  i18n.use(initReactI18next).init({
    lng: "de",
    fallbackLng: "de",
    resources: {
      de: { translation: de },
      en: { translation: en },
    },
    interpolation: { escapeValue: false },
    compatibilityJSON: "v4",
  });

  // Load persisted language in the background and switch if needed.
  AsyncStorage.getItem(LANGUAGE_KEY)
    .then((stored) => {
      if (stored === "en" || stored === "de") {
        i18n.changeLanguage(stored);
      }
    })
    .catch(() => {/* ignore */});

  return Promise.resolve();
}

export default i18n;
