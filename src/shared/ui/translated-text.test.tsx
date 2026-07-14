import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TranslatedText } from "@/shared/ui/translated-text";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("번역 본문", () => {
  it("요청한 번역을 표시하고 원문으로 되돌아간다", async () => {
    const fetcher = vi.fn(async () => new Response(
      JSON.stringify({ translation: "Graduation project" }),
      { status: 200, headers: { "content-type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetcher);
    render(<TranslatedText text="졸업과제" />);

    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(await screen.findByText("Graduation project")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "원문" }));
    expect(screen.getByText("졸업과제")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("로컬 모델 오류를 본문을 지우지 않고 알린다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ message: "Ollama 실행 상태를 확인해 주세요." }),
      { status: 503, headers: { "content-type": "application/json" } },
    )));
    render(<TranslatedText text="졸업과제" />);

    fireEvent.click(screen.getByRole("button", { name: "English" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Ollama"));
    expect(screen.getByText("졸업과제")).toBeInTheDocument();
  });
});
