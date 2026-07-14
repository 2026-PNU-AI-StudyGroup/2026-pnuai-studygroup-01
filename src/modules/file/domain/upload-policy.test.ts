import { describe, expect, it } from "vitest";

import { InvalidUploadError, validateUpload } from "@/modules/file/domain/upload-policy";

const valid = {
  purpose: "REPORT" as const,
  originalName: " report.pdf ",
  contentType: "application/pdf",
  size: 1024,
  sha256: "a".repeat(64),
};

describe("파일 업로드 정책", () => {
  it("보고서 파일 정보를 정규화한다", () => {
    expect(validateUpload(valid).originalName).toBe("report.pdf");
  });

  it.each([
    { ...valid, contentType: "text/html" },
    { ...valid, size: 0 },
    { ...valid, size: 25 * 1024 * 1024 + 1 },
    { ...valid, sha256: "invalid" },
  ])("허용 범위를 벗어난 보고서 파일을 거부한다", (input) => {
    expect(() => validateUpload(input)).toThrow(InvalidUploadError);
  });
});
