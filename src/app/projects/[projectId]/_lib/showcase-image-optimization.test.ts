import { describe, expect, it } from "vitest";

import { scaleShowcaseImage, SHOWCASE_IMAGE_MAX_EDGE } from "./showcase-image-optimization";

describe("쇼케이스 이미지 최적화", () => {
  it("긴 변을 1600px로 제한하고 원래 비율을 유지한다", () => {
    expect(scaleShowcaseImage(3_200, 2_400)).toEqual({ width: 1_600, height: 1_200 });
    expect(scaleShowcaseImage(1_200, 800)).toEqual({ width: 1_200, height: 800 });
  });

  it("긴 변 기준으로 세로 이미지도 축소한다", () => {
    expect(scaleShowcaseImage(1_200, 2_400)).toEqual({ width: 800, height: SHOWCASE_IMAGE_MAX_EDGE });
  });
});
