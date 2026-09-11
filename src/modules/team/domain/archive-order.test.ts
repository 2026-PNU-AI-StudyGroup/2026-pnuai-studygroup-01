import { describe, expect, it } from "vitest";

import { awardRank, orderArchivedTeamIds, teamNumberKey } from "@/modules/team/domain/archive-order";

const 올해 = new Date("2026-03-01");
const 작년 = new Date("2025-03-01");

const row = (id: string, teamName: string, award: string | null, programStartsAt = 올해) =>
  ({ id, teamName, award, programStartsAt });

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

describe("teamNumberKey", () => {
  it("이름 앞 번호를 글자와 숫자로 가른다", () => {
    expect(teamNumberKey("A-1. Broom")).toEqual({ group: "A", number: 1 });
    expect(teamNumberKey("1. 404Found")).toEqual({ group: "", number: 1 });
    expect(teamNumberKey("A-10. 송골매")).toEqual({ group: "A", number: 10 });
  });

  it("번호가 없으면 null 이다", () => {
    expect(teamNumberKey("5 Guys")).toBeNull();
    expect(teamNumberKey("개인의창업")).toBeNull();
  });
});

describe("orderArchivedTeamIds", () => {
  it("상 받은 팀이 위에 서고 그 안에서 번호순이다", () => {
    const ordered = orderArchivedTeamIds([
      row("무관-2", "A-2. 나무", null),
      row("장려", "A-9. 장려팀", "장려상"),
      row("대상", "A-7. 대상팀", "대상"),
      row("무관-1", "A-1. 가지", null),
      row("최우수", "A-8. 최우수팀", "최우수상"),
    ]);

    expect(ordered).toEqual(["대상", "최우수", "장려", "무관-1", "무관-2"]);
  });

  it("번호를 글자가 아니라 숫자로 센다", () => {
    // 글자로 세우면 A-1, A-10, A-11, A-2 순이 된다. 캡스톤 목록이 실제로 그랬다.
    const ordered = orderArchivedTeamIds([
      row("열하나", "A-11. 다", null),
      row("둘", "A-2. 나", null),
      row("하나", "A-1. 가", null),
      row("열", "A-10. 라", null),
    ]);

    expect(ordered).toEqual(["하나", "둘", "열", "열하나"]);
  });

  it("번호 앞 글자가 다르면 글자부터 센다", () => {
    const ordered = orderArchivedTeamIds([
      row("비1", "B-1. 나", null),
      row("에이2", "A-2. 가", null),
    ]);

    expect(ordered).toEqual(["에이2", "비1"]);
  });

  it("상을 아직 안 넣은 프로그램은 번호순 하나로 떨어진다", () => {
    const ordered = orderArchivedTeamIds([
      row("셋", "A-3. 다", null),
      row("하나", "A-1. 가", null),
      row("둘", "A-2. 나", null),
    ]);

    expect(ordered).toEqual(["하나", "둘", "셋"]);
  });

  it("번호가 없는 프로그램은 가나다순이다", () => {
    const ordered = orderArchivedTeamIds([
      row("나중", "핀핀이팀", null),
      row("먼저", "개인의창업", null),
    ]);

    expect(ordered).toEqual(["먼저", "나중"]);
  });

  it("프로그램을 먼저 묶는다", () => {
    // 상 순위를 프로그램보다 앞에 두면 작년 대상이 올해 장려상 위로 올라온다.
    const ordered = orderArchivedTeamIds([
      row("작년대상", "A-1. 가", "대상", 작년),
      row("올해장려", "A-1. 나", "장려상", 올해),
    ]);

    expect(ordered).toEqual(["올해장려", "작년대상"]);
  });
});
