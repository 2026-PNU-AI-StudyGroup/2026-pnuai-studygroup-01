import { describe, expect, it } from "vitest";

import {
  parseProgramManagementTab,
  programCreateHref,
  programManagementHref,
} from "@/modules/project-program/ui/program-management-route";

describe("program management route", () => {
  it("설정은 기본 경로, 나머지 탭은 하위 경로로 만든다", () => {
    expect(programManagementHref("program-1")).toBe("/topics/manage/program-1");
    expect(programManagementHref("program-1", "reports")).toBe("/topics/manage/program-1/reports");
    expect(programCreateHref()).toBe("/topics/manage/new");
  });

  it("알 수 없는 탭은 설정으로 정규화한다", () => {
    expect(parseProgramManagementTab("unknown")).toBe("settings");
    expect(parseProgramManagementTab("votes")).toBe("votes");
  });
});
