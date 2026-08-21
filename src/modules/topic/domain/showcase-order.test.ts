import { describe, expect, it } from "vitest";

import { orderShowcaseIds } from "@/modules/topic/domain/showcase-order";

const ids = ["topic-a", "topic-b", "topic-c", "topic-d", "topic-e"];

describe("orderShowcaseIds", () => {
  it("시드가 없으면 넘어온 순서를 그대로 둔다", () => {
    expect(orderShowcaseIds(ids)).toEqual(ids);
  });

  it("같은 사람에게는 항상 같은 순서를 준다", () => {
    // 매번 바뀌면 스크롤과 페이지 넘김이 어긋나 이미 본 프로젝트를 다시 보게 된다.
    const first = orderShowcaseIds(ids, "program-1:voter-1");
    const second = orderShowcaseIds(ids, "program-1:voter-1");

    expect(second).toEqual(first);
  });

  it("사람마다 다른 순서를 준다", () => {
    const one = orderShowcaseIds(ids, "program-1:voter-1");
    const other = orderShowcaseIds(ids, "program-1:voter-2");

    expect(other).not.toEqual(one);
    expect([...other].sort()).toEqual([...one].sort());
  });

  it("프로그램이 다르면 순서도 다르다", () => {
    // 한 사람이 여러 프로그램에서 같은 순서를 보지 않게 한다.
    const one = orderShowcaseIds(ids, "program-1:voter-1");
    const other = orderShowcaseIds(ids, "program-2:voter-1");

    expect(other).not.toEqual(one);
  });

  it("원본 배열을 바꾸지 않고 항목을 잃지 않는다", () => {
    const source = [...ids];
    const ordered = orderShowcaseIds(source, "seed");

    expect(source).toEqual(ids);
    expect(ordered).toHaveLength(ids.length);
    expect(new Set(ordered)).toEqual(new Set(ids));
  });
});
