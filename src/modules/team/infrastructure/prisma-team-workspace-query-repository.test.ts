import { describe, expect, it, vi } from "vitest";

import { PrismaTeamWorkspaceQueryRepository } from "@/modules/team/infrastructure/prisma-team-workspace-query-repository";

describe("PrismaTeamWorkspaceQueryRepository", () => {
  it("권한이 있는 프로젝트 조회에 조교와 팀원의 학적, 연락처 및 지원 프로필을 포함한다", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: "team-1",
      name: "모두의 길",
      status: "CONFIRMED",
      professorId: "professor-1",
      topic: {
        id: "topic-1",
        title: "실내 길찾기",
        recruitmentStartsAt: new Date("2026-01-01T00:00:00Z"),
        recruitmentEndsAt: new Date("2026-02-01T00:00:00Z"),
        executionStartsAt: new Date("2026-03-01T00:00:00Z"),
        executionEndsAt: new Date("2026-10-01T00:00:00Z"),
        submissionStartsAt: new Date("2026-09-01T00:00:00Z"),
        submissionEndsAt: new Date("2026-12-01T00:00:00Z"),
        program: { advisorEnabled: true },
        manager: {
          id: "professor-1",
          name: "김교수",
          profileImage: { updatedAt: new Date("2026-08-07T01:00:00Z") },
        },
        assistants: [{
          userId: "assistant-1",
          user: {
            id: "assistant-1",
            name: "박조교",
            email: "assistant@pusan.ac.kr",
            profileImage: { updatedAt: new Date("2026-08-07T02:00:00Z") },
          },
        }],
      },
      members: [{
        student: {
          id: "student-1",
          name: "정하늘",
          email: "student@pusan.ac.kr",
          department: "정보컴퓨터공학부",
          studentNumber: "202612345",
          grade: 3,
          phoneNumber: "010-1234-5678",
          contactEmail: "sky@example.com",
          profileImage: { updatedAt: new Date("2026-08-07T00:00:00Z") },
          studentProfile: {
            phone: "010-1234-5678",
            kakao: "pnu_id",
            github: "https://github.com/pnu",
            instagram: "https://instagram.com/pnu",
          },
        },
      }],
      tasks: [],
      discussionPosts: [
        { id: "post-a", authorId: "assistant-1", content: "조교 메시지", createdAt: new Date("2026-08-08T00:00:00Z"), author: { name: "박조교", role: "STUDENT" } },
        { id: "post-b", authorId: "professor-1", content: "교수 메시지", createdAt: new Date("2026-08-08T01:00:00Z"), author: { name: "김교수", role: "PROFESSOR" } },
      ],
      reports: [],
      _count: { discussionPosts: 2 },
    });
    const repository = new PrismaTeamWorkspaceQueryRepository({
      team: { findFirst },
    } as never);

    const workspace = await repository.findWorkspaceForActor("team-1", { id: "admin-1", role: "ADMIN" });

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "team-1" },
      include: expect.objectContaining({
        topic: {
          select: expect.objectContaining({
            manager: {
              select: {
                id: true,
                name: true,
                profileImage: { select: { updatedAt: true } },
              },
            },
            assistants: {
              orderBy: { createdAt: "asc" },
              select: {
                userId: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    profileImage: { select: { updatedAt: true } },
                  },
                },
              },
            },
          }),
        },
        members: expect.objectContaining({
          select: {
            student: {
              select: expect.objectContaining({
                department: true,
                studentNumber: true,
                grade: true,
                phoneNumber: true,
                contactEmail: true,
                profileImage: { select: { updatedAt: true } },
                studentProfile: expect.any(Object),
              }),
            },
          },
        }),
      }),
    }));
    expect(workspace?.members[0]).toEqual(expect.objectContaining({
      id: "student-1",
      department: "정보컴퓨터공학부",
      phoneNumber: "010-1234-5678",
      profileImage: { updatedAt: new Date("2026-08-07T00:00:00Z") },
      profile: expect.objectContaining({ kakao: "pnu_id" }),
    }));
    expect(workspace?.members[0]).not.toHaveProperty("studentProfile");
    expect(workspace?.discussionPosts.find((post) => post.id === "post-a")?.authorRole).toBe("ASSISTANT");
    expect(workspace?.discussionPosts.find((post) => post.id === "post-b")?.authorRole).toBe("PROFESSOR");
    expect(workspace?.professor).toEqual({
      id: "professor-1",
      name: "김교수",
      profileImage: { updatedAt: new Date("2026-08-07T01:00:00Z") },
    });
    expect(workspace?.assistants).toEqual([
      {
        id: "assistant-1",
        name: "박조교",
        email: "assistant@pusan.ac.kr",
        profileImage: { updatedAt: new Date("2026-08-07T02:00:00Z") },
      },
    ]);
    expect(workspace?.access.isAssistant).toBe(false);

    const assistantWorkspace = await repository.findWorkspaceForActor("team-1", { id: "assistant-1", role: "PROFESSOR" });
    expect(assistantWorkspace?.access.isAssistant).toBe(true);
    expect(assistantWorkspace?.access.canSupervise).toBe(true);
  });

  it("프로젝트 목록의 보고서 제출 수를 제출 버전이 있는 요구사항 단위로 집계한다", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "team-1",
        name: "모두의 길",
        status: "CONFIRMED",
        topic: { title: "실내 길찾기" },
        members: [{ id: "member-1" }],
        tasks: [],
        reports: [
          { versions: [{ id: "version-1" }] },
          { versions: [] },
          { versions: [{ id: "version-3" }] },
        ],
      },
    ]);
    const repository = new PrismaTeamWorkspaceQueryRepository({
      team: { findMany },
    } as never);

    const teams = await repository.listAll();

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        reports: {
          where: { required: true },
          select: {
            versions: {
              take: 1,
              select: { id: true },
            },
          },
        },
      }),
    }));
    expect(teams[0]).toEqual(expect.objectContaining({
      reportCount: 3,
      submittedReportCount: 2,
    }));
  });
});
