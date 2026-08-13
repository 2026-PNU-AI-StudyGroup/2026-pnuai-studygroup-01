import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

const router = { replace: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

import { ProgramAnnouncementCreateModal } from "@/modules/announcement/ui/program-announcement-create-modal";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open"); };
});

describe("프로그램 공지 작성 모달", () => {
  it("선택한 첨부파일도 미저장 변경으로 간주한다", () => {
    render(<ProgramAnnouncementCreateModal
      programId="40000000-0000-4000-8000-000000000001"
      programName="프로그램"
      closeHref="/topics"
      createAction={vi.fn()}
    />);
    fireEvent.change(screen.getByLabelText("공지 첨부파일"), {
      target: { files: [new File(["data"], "notice.bin")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "공지 작성 닫기" }));
    expect(screen.getByRole("alertdialog", { name: "작성 중인 내용 삭제" })).toBeInTheDocument();
  });
});
