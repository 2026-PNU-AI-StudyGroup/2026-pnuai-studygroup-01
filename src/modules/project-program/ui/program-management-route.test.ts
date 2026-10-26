import { describe, expect, it } from "vitest";

import {
  legacyProgramManagementAnchor,
  parseProgramManagementTab,
  programCreateHref,
  programManagementHref,
  resolveProgramManagementTab,
} from "@/modules/project-program/ui/program-management-route";

describe("program management route", () => {
  it("설정은 기본 경로, 나머지 탭은 하위 경로로 만든다", () => {
    expect(programManagementHref("program-1")).toBe("/topics/manage/program-1");
    expect(programManagementHref("program-1", "reports")).toBe("/topics/manage/program-1/reports");
    expect(programManagementHref("program-1", "advisors")).toBe("/topics/manage/program-1/advisors");
    expect(programCreateHref()).toBe("/topics/manage/new");
  });

  it("알 수 없는 탭은 설정으로 정규화한다", () => {
    expect(parseProgramManagementTab("unknown")).toBe("settings");
    expect(parseProgramManagementTab("votes")).toBe("votes");
  });

  it("예전 분과, 운영 설정, 일정 탭은 설정 화면의 해당 칸으로 보낸다", () => {
    expect(resolveProgramManagementTab("tracks")).toEqual({ tab: "settings", legacy: "tracks" });
    expect(resolveProgramManagementTab("operation")).toEqual({ tab: "settings", legacy: "operation" });
    expect(resolveProgramManagementTab("schedule")).toEqual({ tab: "settings", legacy: "schedule" });
    expect(legacyProgramManagementAnchor("tracks")).toBe("#divisions");
    expect(legacyProgramManagementAnchor("schedule")).toBe("#schedule");
    expect(legacyProgramManagementAnchor(null)).toBe("");
  });

  it("객체 기본 속성 이름은 예전 탭으로 보지 않는다", () => {
    expect(resolveProgramManagementTab("toString")).toEqual({ tab: "settings", legacy: null });
  });
});
