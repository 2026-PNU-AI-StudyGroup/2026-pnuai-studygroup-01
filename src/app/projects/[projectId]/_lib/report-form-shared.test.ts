import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { hashTeamFile, uploadTeamFile } from "./report-form-shared";

function fileFromBytes(bytes: Uint8Array, name = "report.pdf", type = "application/pdf"): File {
  return {
    name,
    type,
    size: bytes.byteLength,
    slice(start = 0, end = bytes.byteLength) {
      const chunk = bytes.slice(start, end);
      return {
        arrayBuffer: async () => new Uint8Array(chunk).buffer,
      } as Blob;
    },
  } as File;
}

describe("report-form-shared upload pipeline", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("파일을 청크로 읽어 표준 SHA-256을 계산한다", async () => {
    const digest = await hashTeamFile(fileFromBytes(new TextEncoder().encode("abc")));

    expect(Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(""))
      .toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("여러 SHA 블록과 파일 청크 경계에서도 동일한 digest를 만든다", async () => {
    const bytes = new Uint8Array(2 * 1024 * 1024 + 137);
    bytes.forEach((_, index) => { bytes[index] = index % 251; });
    const expected = createHash("sha256").update(bytes).digest("hex");

    const digest = await hashTeamFile(fileFromBytes(bytes));

    expect(Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")).toBe(expected);
  });

  it("서버 업로드 정책에 맞지 않는 용량은 파일을 읽기 전에 거절한다", async () => {
    const slice = vi.fn();
    const file = {
      name: "oversized.pdf",
      type: "application/pdf",
      size: 25 * 1024 * 1024 + 1,
      slice,
    } as unknown as File;

    await expect(uploadTeamFile("team-1", "REPORT", file)).rejects.toThrow("최대 용량은 25MB");
    expect(slice).not.toHaveBeenCalled();
  });

  it("쇼케이스 이미지는 결과물 공통 제한보다 작은 20MB로 파일을 읽기 전에 거절한다", async () => {
    const slice = vi.fn();
    const file = {
      name: "oversized-showcase.png",
      type: "image/png",
      size: 20 * 1024 * 1024 + 1,
      slice,
    } as unknown as File;

    await expect(uploadTeamFile("team-1", "ARTIFACT", file, {
      maxBytes: 20 * 1024 * 1024,
      maxBytesMessage: "쇼케이스 이미지는 최대 20MB까지 업로드할 수 있습니다.",
    })).rejects.toThrow("쇼케이스 이미지는 최대 20MB까지 업로드할 수 있습니다.");
    expect(slice).not.toHaveBeenCalled();
  });

  it("해시 계산 중 중단 신호를 받으면 다음 청크를 읽지 않는다", async () => {
    const bytes = new Uint8Array(2 * 1024 * 1024 + 1);
    const file = fileFromBytes(bytes);
    const controller = new AbortController();
    const progress = vi.fn((state: { stage: string; loaded: number }) => {
      if (state.stage === "hashing" && state.loaded > 0) controller.abort();
    });

    await expect(hashTeamFile(file, { signal: controller.signal, onProgress: progress })).rejects.toMatchObject({ name: "AbortError" });
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({ stage: "hashing", loaded: 2 * 1024 * 1024 }));
  });

  it("presign 응답 직후 이미 중단된 신호면 XHR을 만들지 않고 종료한다", async () => {
    const controller = new AbortController();
    const request = vi.fn();
    vi.stubGlobal("XMLHttpRequest", request);
    vi.stubGlobal("fetch", vi.fn(async () => {
      controller.abort();
      return new Response(JSON.stringify({ uploadId: "upload-1", uploadUrl: "https://upload.test/1" }), { status: 200 });
    }));

    await expect(uploadTeamFile(
      "team-1",
      "REPORT",
      fileFromBytes(new TextEncoder().encode("report")),
      { signal: controller.signal },
    )).rejects.toMatchObject({ name: "AbortError" });
    expect(request).not.toHaveBeenCalled();
  });
});
