import type { I18nProvider } from "@refinedev/core";
import { es, type TranslationKey } from "./locales/es";

export const DEFAULT_LOCALE = "es";
export const DATE_LOCALE = "es-ES";

type TranslateParams = Record<string, string | number>;

const dictionaries: Record<string, Record<string, string>> = {
  es,
};

export function translate(key: string, params?: TranslateParams, locale = DEFAULT_LOCALE): string {
  const dictionary = dictionaries[locale] ?? es;
  let text = dictionary[key] ?? key;

  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{{${name}}}`, String(value));
    }
  }

  return text;
}

export function t(key: TranslationKey, params?: TranslateParams): string {
  return translate(key, params);
}

export const i18nProvider: I18nProvider = {
  translate: (key, options) => translate(key, options),
  changeLocale: async () => {
    // Single-locale admin panel; extend here if you add a language switcher.
    return translate("buttons.confirm");
  },
  getLocale: () => DEFAULT_LOCALE,
};
