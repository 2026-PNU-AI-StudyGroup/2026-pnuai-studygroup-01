import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  I18nProvider,
  UiDate,
  UiText,
} from "@/modules/translation/ui/i18n-provider";

describe("I18nProvider", () => {
  it("renders fixed UI copy from the selected English catalog", () => {
    render(
      <I18nProvider locale="en">
        <UiText>프로젝트 찾기</UiText>
      </I18nProvider>,
    );

    expect(screen.getByText("Find Projects")).toBeInTheDocument();
    expect(screen.queryByText("프로젝트 찾기")).not.toBeInTheDocument();
  });

  it("formats dates using the selected locale", () => {
    render(
      <I18nProvider locale="en">
        <UiDate value="2026-07-25T03:00:00.000Z" mode="date" />
      </I18nProvider>,
    );

    expect(screen.getByText("Jul 25, 2026")).toBeInTheDocument();
  });

  it("shows persisted content in the selected language", () => {
    render(
      <I18nProvider
        locale="en"
        storedTranslations={{ "한국어 제목": "English title" }}
      >
        <h1><UiText>{"한국어 제목"}</UiText></h1>
      </I18nProvider>,
    );

    expect(screen.getByText("English title")).toBeInTheDocument();
    expect(screen.queryByText("한국어 제목")).not.toBeInTheDocument();
  });

  it("localizes composed content from its persisted parts", () => {
    render(
      <I18nProvider
        locale="en"
        storedTranslations={{
          "해커톤": "Hackathon",
          "창의 융합": "Creative Convergence",
        }}
      >
        <UiText>{"해커톤 · 창의 융합"}</UiText>
      </I18nProvider>,
    );

    expect(screen.getByText("Hackathon · Creative Convergence")).toBeInTheDocument();
  });

  it("does not replace a stored source inside another word", () => {
    render(
      <I18nProvider locale="en" storedTranslations={{ "팀": "Team" }}>
        <UiText>{"팀원"}</UiText>
      </I18nProvider>,
    );

    expect(screen.getByText("Team member")).toBeInTheDocument();
    expect(screen.queryByText("Team원")).not.toBeInTheDocument();
  });

  it("does not nest an original toggle inside an interactive control", () => {
    render(
      <I18nProvider
        locale="en"
        storedTranslations={{ "한국어 제목": "English title" }}
      >
        <UiText>
          <button type="button"><UiText>{"한국어 제목"}</UiText></button>
        </UiText>
      </I18nProvider>,
    );

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "English title" })).toBeInTheDocument();
  });
});
