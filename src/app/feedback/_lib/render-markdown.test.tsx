import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { renderMarkdown } from "@/app/feedback/_lib/render-markdown";

function html(source: string): string {
  return renderToStaticMarkup(renderMarkdown(source));
}

describe("renderMarkdown", () => {
  it("굵게·기울임·인라인코드를 태그로 렌더한다", () => {
    const out = html("**굵게** *기울임* `code`");
    expect(out).toContain("<strong>굵게</strong>");
    expect(out).toContain("<em>기울임</em>");
    expect(out).toContain("<code");
  });

  it("목록과 제목을 렌더한다", () => {
    const out = html("# 제목\n- 하나\n- 둘");
    expect(out).toContain("<h3");
    expect(out).toContain("<ul");
    expect(out).toContain("<li>하나</li>");
  });

  it("http 링크는 렌더하고 위험한 스킴은 텍스트로 남긴다", () => {
    const safe = html("[구글](https://google.com)");
    expect(safe).toContain('href="https://google.com"');

    const unsafe = html("[클릭](javascript:alert(1))");
    expect(unsafe).not.toContain("href=\"javascript");
  });

  it("코드펜스 안의 내용은 그대로 둔다", () => {
    const out = html("```\n**not bold**\n```");
    expect(out).toContain("<pre");
    expect(out).toContain("**not bold**");
    expect(out).not.toContain("<strong>not bold</strong>");
  });
});
