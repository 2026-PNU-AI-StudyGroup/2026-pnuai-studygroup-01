import type { PrismaClient } from "@/generated/prisma/client";
import type {
  ReceivedStudentTeamInvitation,
  StudentTeamReader,
  StudentTeamSummary,
} from "@/modules/student-team/application/student-team-ports";

export class PrismaStudentTeamQueryRepository implements StudentTeamReader {
  constructor(private readonly client: PrismaClient) {}

  async listMine(studentId: string): Promise<StudentTeamSummary[]> {
    const teams = await this.client.studentTeam.findMany({
      where: { deletedAt: null, members: { some: { studentId } } },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      include: {
        leader: { select: { name: true } },
        members: {
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
          include: {
            student: {
              select: {
                name: true,
                email: true,
                studentProfile: { select: { phone: true, kakao: true, github: true, instagram: true } },
              },
            },
          },
        },
        invitations: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
        },
        recruitmentPosts: {
          where: { status: "OPEN" },
          select: {
            id: true,
            _count: {
              select: { applications: { where: { status: "PENDING" } } },
            },
          },
        },
      },
    });
    return teams.map(({ leader, recruitmentPosts, ...team }) => ({
      ...team,
      leaderName: leader.name,
      members: team.members.map(({ student: { studentProfile, ...student }, ...member }) => ({
        ...member,
        ...student,
        profile: studentProfile,
      })),
      invitations: team.invitations,
      openRecruitmentCount: recruitmentPosts.length,
      pendingApplicantCount: recruitmentPosts.reduce(
        (sum, post) => sum + post._count.applications,
        0,
      ),
    }));
  }

  async listInvitations(
    email: string,
  ): Promise<ReceivedStudentTeamInvitation[]> {
    const invitations = await this.client.studentTeamInvitation.findMany({
      where: { email, status: "PENDING", team: { deletedAt: null } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        teamId: true,
        status: true,
        createdAt: true,
        team: {
          select: { name: true, leader: { select: { name: true } } },
        },
      },
    });
    return invitations.map(({ team, ...invitation }) => ({
      ...invitation,
      teamName: team.name,
      leaderName: team.leader.name,
    }));
  }
}
