import { useCallback } from "react";
import { useI18n } from "./LanguageProvider";

function getValueByPath(source, path) {
  return String(path || "")
    .split(".")
    .reduce(
      (current, segment) => (current && typeof current === "object" ? current[segment] : undefined),
      source,
    );
}

function interpolate(template, variables = {}) {
  return String(template).replace(/\{\{(.*?)\}\}/g, (_, rawKey) => {
    const key = String(rawKey || "").trim();
    return variables[key] ?? "";
  });
}

export function useScopedI18n(translations) {
  const i18n = useI18n();

  const tt = useCallback(
    (key, variables) => {
      const primary = getValueByPath(translations?.[i18n.language], key);
      const fallback = getValueByPath(translations?.en, key);
      const result = primary ?? fallback;

      if (result == null) {
        return i18n.t(key, variables);
      }

      return interpolate(result, variables);
    },
    [i18n, translations],
  );

  return {
    ...i18n,
    tt,
  };
}
