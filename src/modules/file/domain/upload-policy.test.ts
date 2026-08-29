import { describe, expect, it } from "vitest";

import { ARTIFACT_MAX_BYTES, InvalidUploadError, validateUpload } from "@/modules/file/domain/upload-policy";

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

  it.each([ARTIFACT_MAX_BYTES, ARTIFACT_MAX_BYTES + 1])("일반 결과물은 최대 100MB로 제한한다", (size) => {
    const validation = () => validateUpload({
      purpose: "ARTIFACT",
      consumer: "ARTIFACT",
      originalName: "artifact.zip",
      contentType: "application/zip",
      size,
      sha256: "c".repeat(64),
    });
    if (size === ARTIFACT_MAX_BYTES) expect(validation).not.toThrow();
    else expect(validation).toThrow(InvalidUploadError);
  });

  // Windows 의 Chrome·Edge 는 레지스트리를 따라 .zip 을 application/x-zip-compressed 로
  // 보고한다. 허용 목록에 application/zip 만 있어서 Windows 학생은 소스 코드 zip 을 아예
  // 올릴 수 없었다.
  it.each([
    ["application/x-zip-compressed", "application/zip"],
    ["application/x-zip", "application/zip"],
    ["APPLICATION/ZIP", "application/zip"],
    ["image/jpg", "image/jpeg"],
  ])("브라우저가 보고하는 %s 를 %s 로 받아들인다", (reported, stored) => {
    expect(validateUpload({
      purpose: "ARTIFACT",
      consumer: "ARTIFACT",
      originalName: "artifact.zip",
      contentType: reported,
      size: 1024,
      sha256: "d".repeat(64),
    })).toMatchObject({ contentType: stored });
  });

  it("정규화해도 허용 목록에 없는 타입은 그대로 막는다", () => {
    expect(() => validateUpload({
      purpose: "ARTIFACT",
      consumer: "ARTIFACT",
      originalName: "artifact.exe",
      contentType: "application/x-msdownload",
      size: 1024,
      sha256: "e".repeat(64),
    })).toThrow(InvalidUploadError);
  });
});
