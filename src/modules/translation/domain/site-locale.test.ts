import { describe, expect, it } from "vitest";

import {
  isSiteLocale,
  normalizeSiteLocale,
} from "@/modules/translation/domain/site-locale";

describe("site locale", () => {
  it.each(["ko", "en"] as const)("accepts supported locale %s", (locale) => {
    expect(isSiteLocale(locale)).toBe(true);
    expect(normalizeSiteLocale(locale)).toBe(locale);
  });

  it.each([undefined, null, "ja", "", 1])(
    "falls back to Korean for unsupported value %s",
    (value) => {
      expect(isSiteLocale(value)).toBe(false);
      expect(normalizeSiteLocale(value)).toBe("ko");
    },
  );
});
