import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/translation/infrastructure/request-locale", () => ({
  getServerTranslator: vi.fn(async () => (message: string) =>
    message === "프로젝트 찾기" ? "Find Projects" : message),
}));

import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";

describe("getLocalizedMetadata", () => {
  it("uses the request translator for page titles", async () => {
    await expect(getLocalizedMetadata("프로젝트 찾기")).resolves.toEqual({
      title: "Find Projects",
    });
  });
});
