import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { renderMarkdown } from "@/shared/ui/render-markdown";

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
    expect(out).toContain("하나");
  });

  it("http 링크는 렌더하고 위험한 스킴은 남기지 않는다", () => {
    const safe = html("[구글](https://google.com)");
    expect(safe).toContain('href="https://google.com"');
    expect(safe).toContain('target="_blank"');

    const unsafe = html("[클릭](javascript:alert(1))");
    expect(unsafe).not.toContain("javascript:");
  });

  it("내부 경로 링크는 같은 탭에서 연다", () => {
    const out = html("[처리방침](/privacy)");
    expect(out).toContain('href="/privacy"');
    expect(out).not.toContain('target="_blank"');
  });

  it("코드펜스 안의 내용은 그대로 둔다", () => {
    const out = html("```\n**not bold**\n```");
    expect(out).toContain("<pre");
    expect(out).toContain("**not bold**");
    expect(out).not.toContain("<strong>not bold</strong>");
  });

  it("원본 HTML 은 태그가 아니라 글자로 남긴다", () => {
    const out = html('<img src="x" onerror="alert(1)">\n\n<script>alert(1)</script>');
    expect(out).not.toContain("<script");
    expect(out).not.toContain('onerror="alert(1)"');
    expect(out).toContain("&lt;script&gt;");
  });

  // 아래는 직접 구현한 부분집합에서 빠져 있어 원문이 그대로 보이던 문법이다.
  it("표를 렌더한다", () => {
    const out = html("| 항목 | 값 |\n| --- | --- |\n| 가 | 1 |");
    expect(out).toContain("<table");
    expect(out).toContain("<th");
    expect(out).toContain("<td");
  });

  it("체크박스 목록을 렌더한다", () => {
    const out = html("- [x] 완료\n- [ ] 남음");
    expect(out).toContain('type="checkbox"');
    expect(out).toContain("checked");
  });

  it("취소선·수평선·이미지를 렌더한다", () => {
    expect(html("~~지움~~")).toContain("<del");
    expect(html("본문\n\n---\n\n본문")).toContain("<hr");
    expect(html("![로고](https://example.com/a.png)")).toContain('src="https://example.com/a.png"');
  });

  it("중첩 목록을 계층으로 렌더한다", () => {
    const out = html("- 상위\n  - 하위");
    expect(out.match(/<ul/g)).toHaveLength(2);
  });
});
