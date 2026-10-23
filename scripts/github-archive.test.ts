import { describe, expect, it } from "vitest";

import {
  isTemplateRepo,
  mergeSnapshot,
  normalizeRepoUrl,
  pickTitle,
  readmeTitleAndSummary,
  scrubPersonalInfo,
  stableArchiveId,
  type SnapshotProgram,
} from "./github-archive";

const program = {
  key: "h5", org: "org", programName: "제5회", category: "해커톤", startsAt: "2024-05-01", endsAt: "2024-09-07",
};

describe("템플릿 레포 거르기", () => {
  it("템플릿과 조직 소개 레포를 뺀다", () => {
    for (const name of ["StarterTemplate", "Capstone-Template-2025", "capstone2024-template", "PNUSW-2025-team-00", ".github", "org.github.io"]) {
      expect(isTemplateRepo(name), name).toBe(true);
    }
    expect(isTemplateRepo("PNUSW-2024-team-01")).toBe(false);
  });
});

describe("README 제목과 요약", () => {
  it("해커톤 2026 형식: 첫 제목과 그 아래 인용문", () => {
    const markdown = [
      "# gridi",
      "",
      "> **기획과 개발을 잇는 AI 워크스페이스**",
      "",
      "## 목차",
      "- [1.2. 개발 목표](#12)",
      "",
      "### 1.2. 개발 목표 및 주요 내용",
      "목표 문단",
    ].join("\n");
    expect(readmeTitleAndSummary(markdown)).toEqual({ title: "gridi", summary: "기획과 개발을 잇는 AI 워크스페이스" });
  });

  it("제5회 형식: 제목이 없으면 목표 소제목 아래 문단", () => {
    const markdown = [
      '<img alt="image" src="https://github.com/user-attachments/assets/x.png"><br>',
      "",
      "### 1. 프로젝트 소개",
      "",
      "#### 1.1. 개발배경 및 필요성",
      "",
      "공지를 놓친 경험에서 시작했습니다.",
      "",
      "#### 1.2. 개발 목표 및 주요 내용",
      "",
      "흩어진 부산대 공지를 한곳에 모아 보여 줍니다.",
    ].join("\n");
    expect(readmeTitleAndSummary(markdown)).toEqual({ title: null, summary: "흩어진 부산대 공지를 한곳에 모아 보여 줍니다." });
  });

  it("목표 소제목 아래 굵은 글씨 낱말은 건너뛰고 본문을 쓴다", () => {
    const markdown = [
      "### 1.2. 개발목표 및 주요내용",
      "**개발목표**",
      "",
      "흩어진 공지를 한곳에 모읍니다.",
    ].join("\n");
    expect(readmeTitleAndSummary(markdown).summary).toBe("흩어진 공지를 한곳에 모읍니다.");
  });

  it("빈 줄 없이 이어진 목록 낱말도 건너뛴다", () => {
    const markdown = [
      "#### 1.2. 개발목표 및 주요 내용",
      "- 개발목표",
      "  > 대학생 시간표에 맞춰 알바를 추천합니다.",
      "- 주요 내용",
    ].join("\n");
    expect(readmeTitleAndSummary(markdown).summary).toBe("대학생 시간표에 맞춰 알바를 추천합니다.");
  });

  it("졸업과제 형식: 번호 붙은 범용 제목은 건너뛰고 첫 소제목 아래 문단, 팀 소개는 안 들어간다", () => {
    const markdown = [
      "[![Review Assignment Due Date](https://classroom.github.com/assets/deadline.svg)](https://classroom.github.com/a/x)",
      "본문입니다.",
      "",
      "# 1. 프로젝트 소개",
      '  - 이번 프로젝트의 주제는 "심장질환 환자 ECG 데이터 분석" 입니다.',
      "",
      "# 2. 팀 소개",
      "  - 홍길동 부산대학교 정보컴퓨터공학부 202412345 gildong@pusan.ac.kr",
    ].join("\n");
    expect(readmeTitleAndSummary(markdown)).toEqual({
      title: null,
      summary: '이번 프로젝트의 주제는 "심장질환 환자 ECG 데이터 분석" 입니다.',
    });
  });

  it("요약은 200자에서 자른다", () => {
    const { summary } = readmeTitleAndSummary(`# 제목\n\n${"가".repeat(250)}`);
    expect(summary).toHaveLength(200);
    expect(summary.endsWith("…")).toBe(true);
  });

  it("이메일과 학번을 지운다", () => {
    expect(scrubPersonalInfo("홍길동 202412345 gildong@pusan.ac.kr 이 만들었다")).toBe("홍길동 이 만들었다");
  });

  it("팀 소개 섹션은 제목으로도 요약으로도 쓰지 않는다", () => {
    expect(readmeTitleAndSummary("# 프로젝트 소개\n# 팀 소개\n- 홍길동 (팀장)\n- 김철수")).toEqual({ title: null, summary: "" });
    expect(readmeTitleAndSummary("# gridi\n## 팀원\n| 홍길동 | 팀장 |").summary).toBe("");
    expect(readmeTitleAndSummary("# Contributors\n홍길동")).toEqual({ title: null, summary: "" });
  });

  it("전화번호를 지운다", () => {
    expect(scrubPersonalInfo("문의 010-1234-5678 로 연락")).toBe("문의 로 연락");
  });
});

describe("제목 고르기", () => {
  it("README 제목, 레포 설명, 레포 이름 순이고 Classroom 기본 설명은 쓰지 않는다", () => {
    expect(pickTitle({ readmeTitle: "gridi", description: "설명", repoName: "r" })).toBe("gridi");
    expect(pickTitle({ readmeTitle: null, description: "AI 기반 Host DLP", repoName: "r" })).toBe("AI 기반 Host DLP");
    expect(pickTitle({ readmeTitle: null, description: "x created by GitHub Classroom", repoName: "team-43" })).toBe("team-43");
  });
});

describe("저장소 주소 맞추기", () => {
  it("끝 슬래시, .git, 대소문자, www, 하위 경로 차이를 지운다", () => {
    const expected = "https://github.com/org/repo";
    for (const url of [
      "https://github.com/Org/Repo",
      "https://github.com/org/repo/",
      "https://github.com/org/repo.git",
      "http://www.github.com/org/repo",
      "https://github.com/org/repo/tree/main",
    ]) {
      expect(normalizeRepoUrl(url), url).toBe(expected);
    }
  });
});

describe("스냅샷 합치기", () => {
  it("이미 있는 레포는 손으로 고친 그대로 두고 새 레포만 붙인다", () => {
    const existing: SnapshotProgram[] = [{
      program,
      repos: [{ fullName: "org/team-01", url: "u1", teamNumber: 1, teamName: "삼위일체", title: "손으로 고친 제목", summary: "고친 요약", award: null }],
    }];
    const crawled: SnapshotProgram[] = [{
      program: { ...program, programName: "제5회 새 이름" },
      repos: [
        { fullName: "org/team-01", url: "u1", teamNumber: 1, teamName: "삼위일체", title: "새로 뽑은 제목", summary: "새 요약", award: null },
        { fullName: "org/team-02", url: "u2", teamNumber: 2, teamName: "스근하게", title: "제휴", summary: "", award: null },
      ],
    }];
    const [merged] = mergeSnapshot(existing, crawled);
    expect(merged!.program.programName).toBe("제5회 새 이름");
    expect(merged!.repos.map(({ fullName, title }) => [fullName, title])).toEqual([
      ["org/team-01", "손으로 고친 제목"],
      ["org/team-02", "제휴"],
    ]);
  });

  it("합친 뒤에도 팀 번호 차례를 지킨다", () => {
    const repo = (teamNumber: number) => ({ fullName: `org/team-${teamNumber}`, url: "u", teamNumber, teamName: "t", title: "t", summary: "", award: null });
    const existing: SnapshotProgram[] = [{ program, repos: [repo(1), repo(18)] }];
    const crawled: SnapshotProgram[] = [{ program, repos: [repo(4)] }];
    const [merged] = mergeSnapshot(existing, crawled);
    expect(merged!.repos.map(({ teamNumber }) => teamNumber)).toEqual([1, 4, 18]);
  });

  it("설정에서 빠진 프로그램도 스냅샷에서는 지우지 않는다", () => {
    const existing: SnapshotProgram[] = [{ program, repos: [] }];
    expect(mergeSnapshot(existing, [])).toEqual(existing);
  });
});

describe("고정 ID", () => {
  it("같은 입력이면 같은 UUID 다", () => {
    const id = stableArchiveId("topic", "org/team-01");
    expect(id).toBe(stableArchiveId("topic", "org/team-01"));
    expect(id).not.toBe(stableArchiveId("topic", "org/team-02"));
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
