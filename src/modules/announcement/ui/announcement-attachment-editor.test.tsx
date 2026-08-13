import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import type { AnnouncementAttachmentRecord } from "@/modules/announcement/application/announcement-ports";
import { AnnouncementAttachmentEditor } from "@/modules/announcement/ui/announcement-attachment-editor";

const existing: AnnouncementAttachmentRecord = {
  fileId: "file-1",
  originalName: "기존 자료.pdf",
  contentType: "application/pdf",
  size: 1024,
  position: 0,
};

function Harness({ initial = [] }: { initial?: AnnouncementAttachmentRecord[] }) {
  const [retained, setRetained] = useState(initial.map((attachment) => attachment.fileId));
  const [files, setFiles] = useState<File[]>([]);
  return <AnnouncementAttachmentEditor
    existingAttachments={initial}
    retainedAttachmentIds={retained}
    selectedFiles={files}
    onRetainedAttachmentIdsChange={setRetained}
    onSelectedFilesChange={setFiles}
  />;
}

describe("공지 첨부 편집기", () => {
  it("확장자 제한 없이 여러 파일을 선택하고 개별 해제한다", () => {
    render(<Harness />);
    const input = screen.getByLabelText("공지 첨부파일");
    fireEvent.change(input, { target: { files: [
      new File(["one"], "run.exe", { type: "application/x-msdownload" }),
      new File(["two"], "unknown.custom", { type: "" }),
    ] } });

    expect(screen.getByText("run.exe")).toBeInTheDocument();
    expect(screen.getByText("unknown.custom")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "run.exe 삭제" }));
    expect(screen.queryByText("run.exe")).not.toBeInTheDocument();
  });

  it("기존 첨부 삭제를 저장 전까지 취소할 수 있다", () => {
    const { container } = render(<Harness initial={[existing]} />);
    expect(container.querySelector('input[name="retainedAttachmentIds"]')).toHaveValue("file-1");
    fireEvent.click(screen.getByRole("button", { name: "기존 자료.pdf 삭제" }));
    expect(container.querySelector('input[name="retainedAttachmentIds"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "기존 자료.pdf 삭제 취소" }));
    expect(container.querySelector('input[name="retainedAttachmentIds"]')).toHaveValue("file-1");
  });

  it("5개를 넘는 선택은 반영하지 않는다", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("공지 첨부파일"), { target: { files: Array.from({ length: 6 }, (_, index) => new File(["x"], `${index}.bin`)) } });
    expect(screen.getByRole("alert")).toHaveTextContent("최대 5개");
    expect(screen.queryByText("0.bin")).not.toBeInTheDocument();
  });
});
