import { describe, expect, it } from "vitest";

import { awardRank, orderArchivedTeamIds } from "@/modules/team/domain/archive-order";

const 올해 = new Date("2026-03-01");
const 작년 = new Date("2025-03-01");

const row = (id: string, teamNumber: number | null, teamName: string, award: string | null, programStartsAt = 올해) =>
  ({ id, teamNumber, teamName, award, programStartsAt });

describe("awardRank", () => {
  it("상 이름의 낱말로 순위를 읽는다", () => {
    expect(awardRank("대상")).toBeLessThan(awardRank("최우수상"));
    expect(awardRank("최우수상")).toBeLessThan(awardRank("우수상"));
    expect(awardRank("우수상")).toBeLessThan(awardRank("장려상"));
    expect(awardRank("장려상")).toBeLessThan(awardRank("인기상"));
  });

  it("상이 없으면 맨 아래다", () => {
    expect(awardRank(null)).toBeGreaterThan(awardRank("인기상"));
    expect(awardRank("")).toBe(awardRank(null));
    expect(awardRank("   ")).toBe(awardRank(null));
  });

  it("목록에 없는 이름의 상도 무관 팀보다는 위다", () => {
    expect(awardRank("특별상")).toBeLessThan(awardRank(null));
    expect(awardRank("특별상")).toBeGreaterThan(awardRank("인기상"));
  });

  it("둘 받았으면 높은 상으로 친다", () => {
    expect(awardRank("대상 · 인기상")).toBe(awardRank("대상"));
  });
});

describe("orderArchivedTeamIds", () => {
  it("상 받은 팀이 위에 서고 그 안에서 번호순이다", () => {
    const ordered = orderArchivedTeamIds([
      row("무관-2", 2, "나무", null),
      row("장려", 9, "장려팀", "장려상"),
      row("대상", 7, "대상팀", "대상"),
      row("무관-1", 1, "가지", null),
      row("최우수", 8, "최우수팀", "최우수상"),
    ]);

    expect(ordered).toEqual(["대상", "최우수", "장려", "무관-1", "무관-2"]);
  });

  it("번호를 숫자로 센다", () => {
    // 예전에는 번호가 이름 앞 글자였다. 글자로 세우면 1, 10, 11, 2 순이 된다.
    const ordered = orderArchivedTeamIds([
      row("열하나", 11, "다", null),
      row("둘", 2, "나", null),
      row("하나", 1, "가", null),
      row("열", 10, "라", null),
    ]);

    expect(ordered).toEqual(["하나", "둘", "열", "열하나"]);
  });

  it("번호를 안 매긴 팀은 매긴 팀 뒤에 선다", () => {
    const ordered = orderArchivedTeamIds([
      row("번호없음", null, "가나다", null),
      row("번호있음", 9, "하하하", null),
    ]);

    expect(ordered).toEqual(["번호있음", "번호없음"]);
  });

  it("상을 아직 안 넣은 프로그램은 번호순 하나로 떨어진다", () => {
    const ordered = orderArchivedTeamIds([
      row("셋", 3, "다", null),
      row("하나", 1, "가", null),
      row("둘", 2, "나", null),
    ]);

    expect(ordered).toEqual(["하나", "둘", "셋"]);
  });

  it("번호가 없는 프로그램은 가나다순이다", () => {
    const ordered = orderArchivedTeamIds([
      row("나중", null, "핀핀이팀", null),
      row("먼저", null, "개인의창업", null),
    ]);

    expect(ordered).toEqual(["먼저", "나중"]);
  });

  it("프로그램을 먼저 묶는다", () => {
    // 상 순위를 프로그램보다 앞에 두면 작년 대상이 올해 장려상 위로 올라온다.
    const ordered = orderArchivedTeamIds([
      row("작년대상", 1, "가", "대상", 작년),
      row("올해장려", 1, "나", "장려상", 올해),
    ]);

    expect(ordered).toEqual(["올해장려", "작년대상"]);
  });
});
