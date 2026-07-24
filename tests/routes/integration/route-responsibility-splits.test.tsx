import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentActorMock,
  listCyclesMock,
  listProfessorAccessMock,
  listProfessorAuditMock,
  getStudentProfileMock,
} = vi.hoisted(() => ({
  getCurrentActorMock: vi.fn(),
  listCyclesMock: vi.fn(),
  listProfessorAccessMock: vi.fn(),
  listProfessorAuditMock: vi.fn(),
  getStudentProfileMock: vi.fn(),
}));

vi.mock("@/modules/identity/infrastructure/current-actor", () => ({
  getCurrentActor: getCurrentActorMock,
}));
vi.mock("@/modules/academic-cycle/application/list-academic-cycles", () => ({
  ListAcademicCyclesService: class {
    execute = listCyclesMock;
  },
}));
vi.mock("@/modules/identity/application/manage-professor-access", () => ({
  ProfessorAccessService: class {
    list = listProfessorAccessMock;
    listAudit = listProfessorAuditMock;
  },
}));
vi.mock("@/modules/identity/application/manage-student-profile", () => ({
  StudentProfileService: class {
    get = getStudentProfileMock;
  },
}));
vi.mock("@/modules/academic-cycle/infrastructure/prisma-academic-cycle-repository", () => ({ PrismaAcademicCycleRepository: class {} }));
vi.mock("@/modules/identity/infrastructure/prisma-professor-access-repository", () => ({ PrismaProfessorAccessRepository: class {} }));
vi.mock("@/modules/identity/infrastructure/prisma-student-profile-repository", () => ({ PrismaStudentProfileRepository: class {} }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));
vi.mock("@/app/_components/app-shell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/app/account/_components/account-controls", () => ({ AccountControls: () => <div>계정 제어</div> }));

import AccountPage from "@/app/account/page";
import StudentProfilePage from "@/app/account/profile/page";
import AcademicCyclesPage from "@/app/admin/academic-cycles/page";
import NewAcademicCyclePage from "@/app/admin/academic-cycles/new/page";
import ProfessorsPage from "@/app/admin/professors/page";
import ProfessorHistoryPage from "@/app/admin/professors/history/page";
import NewProfessorPage from "@/app/admin/professors/new/page";

const admin = { id: "admin-1", name: "관리자", email: "admin@pusan.ac.kr", role: "ADMIN" as const };
const student = { id: "student-1", name: "학생", email: "student@pusan.ac.kr", role: "STUDENT" as const };
const profile = {
  interests: ["접근성"],
  skills: ["TypeScript"],
  desiredRole: "프론트엔드 개발",
  availability: "평일 저녁",
  bio: "사용하기 좋은 서비스를 만듭니다.",
};

describe("화면 책임 분리", () => {
  beforeEach(() => {
    getCurrentActorMock.mockReset();
    listCyclesMock.mockReset();
    listProfessorAccessMock.mockReset();
    listProfessorAuditMock.mockReset();
    getStudentProfileMock.mockReset();
  });

  it("학기 목록은 등록 양식 대신 새 학기 진입점을 제공한다", async () => {
    getCurrentActorMock.mockResolvedValue(admin);
    listCyclesMock.mockResolvedValue([]);
    render(await AcademicCyclesPage());

    expect(screen.getByRole("link", { name: "새 학기 등록" })).toHaveAttribute("href", "/admin/academic-cycles/new");
    expect(screen.queryByRole("spinbutton", { name: "학년도" })).not.toBeInTheDocument();

    render(await NewAcademicCyclePage());
    expect(screen.getByRole("spinbutton", { name: "학년도" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "학기 목록으로" })).toHaveAttribute("href", "/admin/academic-cycles");
  });

  it("교수 권한 목록에서 등록과 변경 이력을 독립 화면으로 연결한다", async () => {
    getCurrentActorMock.mockResolvedValue(admin);
    listProfessorAccessMock.mockResolvedValue([]);
    render(await ProfessorsPage());

    expect(screen.getByRole("link", { name: "교수 이메일 등록" })).toHaveAttribute("href", "/admin/professors/new");
    expect(screen.getByRole("link", { name: "변경 이력" })).toHaveAttribute("href", "/admin/professors/history");
    expect(screen.queryByRole("textbox", { name: "부산대학교 교수 이메일" })).not.toBeInTheDocument();
  });

  it("교수 등록과 변경 이력 화면이 각각 하나의 책임만 제공한다", async () => {
    getCurrentActorMock.mockResolvedValue(admin);
    const newProfessor = render(await NewProfessorPage());
    expect(screen.getByRole("textbox", { name: "부산대학교 교수 이메일" })).toBeInTheDocument();
    newProfessor.unmount();

    listProfessorAuditMock.mockResolvedValue([]);
    render(await ProfessorHistoryPage());
    expect(screen.getByRole("heading", { name: "교수 권한 변경 이력" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "부산대학교 교수 이메일" })).not.toBeInTheDocument();
  });

  it("마이페이지는 프로필 요약만 보여주고 편집은 별도 화면에서 제공한다", async () => {
    getCurrentActorMock.mockResolvedValue(student);
    getStudentProfileMock.mockResolvedValue(profile);
    const account = render(await AccountPage());

    expect(screen.getByRole("link", { name: "프로필 수정" })).toHaveAttribute("href", "/account/profile");
    expect(screen.queryByRole("textbox", { name: "관심 분야" })).not.toBeInTheDocument();
    account.unmount();

    render(await StudentProfilePage());
    expect(screen.getByRole("textbox", { name: "관심 분야" })).toHaveValue("접근성");
    expect(screen.getByRole("link", { name: "마이페이지로" })).toHaveAttribute("href", "/account");
  });
});
