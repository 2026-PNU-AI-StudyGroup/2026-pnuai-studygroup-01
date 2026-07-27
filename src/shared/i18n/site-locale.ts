export type SiteLocale = "ko" | "en";

export function isSiteLocale(value: unknown): value is SiteLocale {
  return value === "ko" || value === "en";
}

export function normalizeSiteLocale(value: unknown): SiteLocale {
  if (isSiteLocale(value)) return value;
  return "ko";
}
