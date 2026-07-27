import { describe, expect, it } from "vitest";

import { opusArchivedProjects } from "./opus-project-catalog";

describe("OPUS 공개 프로젝트 카탈로그", () => {
  it("공개 프로그램의 전체 프로젝트 수를 보존한다", () => {
    const counts = opusArchivedProjects.reduce<Map<number, number>>(
      (result, project) => result.set(
        project.sourceContestId,
        (result.get(project.sourceContestId) ?? 0) + 1,
      ),
      new Map(),
    );

    expect(opusArchivedProjects).toHaveLength(72);
    expect(counts.get(3)).toBe(48);
    expect(counts.get(1)).toBe(16);
    expect(counts.get(4)).toBe(8);
    expect(new Set(opusArchivedProjects.map((project) => project.sourceTeamId)).size).toBe(72);
  });

  it("OPUS 116번의 공개 상세 정보를 그대로 연결한다", () => {
    expect(
      opusArchivedProjects.find((project) => project.sourceTeamId === 116),
    ).toMatchObject({
      teamName: "C-29. AI Chasers",
      projectName: "청각 제약 상황을 위한 실내 소리 인식 및 상황 감지 시스템",
      professorName: "김태운",
      advisorRole: "교수",
      memberNames: ["이민경", "이진솔", "박지용"],
      githubUrl: "https://github.com/pnucse-capstone2025/Capstone-2025-team-29",
      youtubeUrl: "https://www.youtube.com/watch?v=bWdz_H-KRW0",
    });
  });

  it("모든 프로젝트에 표시 가능한 설명과 참여자 이름이 있다", () => {
    for (const project of opusArchivedProjects) {
      expect(project.overview.trim()).not.toBe("");
      expect(project.memberNames.length).toBeGreaterThan(0);
      expect(project.memberNames.every((name) => name.trim().length > 0)).toBe(true);
    }
  });
});
