import { describe, expect, it } from "vitest";

import {
  taskDeleteInputSchema,
  taskInputSchema,
  taskUpdateInputSchema,
} from "@/modules/team/ui/team-workspace-input";

describe("할 일 폼 입력", () => {
  it("한국 날짜의 마지막 분을 UTC로 변환한다", () => {
    const input = taskInputSchema.parse({
      teamId: "1c845ddb-523c-4119-a054-91bfb928b78d",
      title: "중간 발표",
      dueAt: "2026-05-01",
      assigneeIds: [
        "c728bb33-e62b-47fb-b86f-c5efe9967061",
        "d728bb33-e62b-47fb-b86f-c5efe9967062",
      ],
    });
    expect(input.dueAt.toISOString()).toBe("2026-05-01T14:59:00.000Z");
    expect(input.assigneeIds).toEqual([
      "c728bb33-e62b-47fb-b86f-c5efe9967061",
      "d728bb33-e62b-47fb-b86f-c5efe9967062",
    ]);
  });

  it("실제 달력에 없는 날짜를 거절한다", () => {
    expect(
      taskInputSchema.safeParse({
        teamId: "1c845ddb-523c-4119-a054-91bfb928b78d",
        title: "중간 발표",
        dueAt: "2026-02-29",
      }).success,
    ).toBe(false);
  });

  it("수정과 삭제 요청에 팀과 할 일 식별자를 모두 요구한다", () => {
    const ids = {
      teamId: "1c845ddb-523c-4119-a054-91bfb928b78d",
      taskId: "c728bb33-e62b-47fb-b86f-c5efe9967061",
    };

    expect(taskUpdateInputSchema.parse({
      ...ids,
      title: "  프로토타입 검증  ",
      dueAt: "2026-05-02",
      status: "IN_PROGRESS",
      assigneeIds: ["d728bb33-e62b-47fb-b86f-c5efe9967062"],
    })).toMatchObject({ ...ids, title: "프로토타입 검증", status: "IN_PROGRESS" });
    expect(taskDeleteInputSchema.parse(ids)).toEqual(ids);
    expect(taskDeleteInputSchema.safeParse({ taskId: ids.taskId }).success).toBe(false);
  });
});
