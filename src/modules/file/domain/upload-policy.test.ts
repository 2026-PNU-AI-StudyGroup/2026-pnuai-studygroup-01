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

  it("공지 첨부는 형식을 제한하지 않고 비어 있는 MIME을 보정한다", () => {
    expect(validateUpload({
      purpose: "ANNOUNCEMENT",
      consumer: "ANNOUNCEMENT",
      originalName: "installer.unknown",
      contentType: "",
      size: 500 * 1024 * 1024,
      sha256: "b".repeat(64),
    })).toMatchObject({ contentType: "application/octet-stream" });
  });

  it.each([0, 500 * 1024 * 1024 + 1])("공지 첨부의 용량 제한을 적용한다", (size) => {
    expect(() => validateUpload({
      purpose: "ANNOUNCEMENT",
      consumer: "ANNOUNCEMENT",
      originalName: "file.bin",
      contentType: "application/octet-stream",
      size,
      sha256: "b".repeat(64),
    })).toThrow(InvalidUploadError);
  });
});
