import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StudentProjectRegistrationLink } from "@/app/topics/_components/student-project-registration-link";

const now = new Date("2026-08-11T12:00:00+09:00");
const program = {
  id: "program/2026",
  startsAt: new Date("2026-03-01T00:00:00+09:00"),
  endsAt: new Date("2026-12-31T23:59:59+09:00"),
  projectRegistrationStartsAt: new Date("2026-08-01T00:00:00+09:00"),
  projectRegistrationEndsAt: new Date("2026-08-31T23:59:59+09:00"),
  studentProjectCreationEnabled: true,
};

describe("StudentProjectRegistrationLink", () => {
  it("학생 등록이 열린 프로그램에서는 선택 프로그램을 유지한 등록 버튼을 보여준다", () => {
    render(<StudentProjectRegistrationLink role="STUDENT" program={program} now={now} href="/topics?programId=program%2F2026&modal=project-proposal" />);

    const link = screen.getByRole("link", { name: "프로젝트 등록" });
    expect(link).toHaveAttribute(
      "href",
      "/topics?programId=program%2F2026&modal=project-proposal",
    );
    expect(link).toHaveClass("min-h-9", "px-3", "text-xs");
    expect(link).not.toHaveClass("button-primary");
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("학생 등록이 중지된 프로그램에서는 등록 버튼을 숨긴다", () => {
    render(<StudentProjectRegistrationLink role="STUDENT" program={{ ...program, studentProjectCreationEnabled: false }} now={now} />);

    expect(screen.queryByRole("link", { name: "프로젝트 등록" })).not.toBeInTheDocument();
  });

  it("등록 기간 밖이거나 학생이 아니면 등록 버튼을 숨긴다", () => {
    const { rerender } = render(<StudentProjectRegistrationLink role="STUDENT" program={program} now={new Date("2026-09-01T00:00:00+09:00")} />);
    expect(screen.queryByRole("link", { name: "프로젝트 등록" })).not.toBeInTheDocument();

    rerender(<StudentProjectRegistrationLink role="PROFESSOR" program={program} now={now} />);
    expect(screen.queryByRole("link", { name: "프로젝트 등록" })).not.toBeInTheDocument();
  });
});
