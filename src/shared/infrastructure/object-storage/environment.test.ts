import { describe, expect, it } from "vitest";

import { parseObjectStorageEnvironment } from "@/shared/infrastructure/object-storage/environment";

describe("Object Storage 환경 설정", () => {
  it("path style 설정을 불리언으로 변환한다", () => {
    expect(parseObjectStorageEnvironment({
      MINIO_BUCKET: "pms-local",
      S3_ENDPOINT: "http://localhost:9000",
      S3_REGION: "us-east-1",
      S3_ACCESS_KEY: "pms",
      S3_SECRET_KEY: "secret",
      S3_FORCE_PATH_STYLE: "true",
    }).S3_FORCE_PATH_STYLE).toBe(true);
  });
});
