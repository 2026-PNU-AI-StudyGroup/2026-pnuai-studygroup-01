import { describe, expect, it } from "vitest";

import {
  readLimitedJson,
  RequestBodyTooLargeError,
} from "@/shared/http/read-limited-json";

describe("제한된 JSON 읽기", () => {
  it("상한 이내 JSON을 읽는다", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ text: "안녕" }),
    });
    await expect(readLimitedJson(request, 100)).resolves.toEqual({ text: "안녕" });
  });

  it("Content-Length가 없어도 스트림 상한을 적용한다", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(JSON.stringify({ text: "가".repeat(100) })));
          controller.close();
        },
      }),
      // Node의 스트리밍 요청에 필요한 옵션이다.
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    await expect(readLimitedJson(request, 20)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });
});
