import { Fragment, type ReactNode } from "react";

// 의존성 없이 마크다운 부분집합만 렌더한다: 제목(#,##,###), 목록(-,*,1.),
// 인용(>), 코드펜스(```), 굵게(**), 기울임(*), 인라인코드(`), 링크([]()).
// dangerouslySetInnerHTML을 쓰지 않아 XSS에 안전하다.

function safeUrl(raw: string): string | null {
  const url = raw.trim();
  return /^(https?:\/\/|mailto:)/i.test(url) ? url : null;
}

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${index}`;
    if (token.startsWith("`")) {
      nodes.push(<code key={key} className="rounded bg-[var(--surface-subtle)] px-1 py-0.5 text-[0.9em]">{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      const href = link ? safeUrl(link[2]) : null;
      nodes.push(
        link && href
          ? <a key={key} href={href} target="_blank" rel="noreferrer noopener" className="text-[var(--primary)] underline">{link[1]}</a>
          : token,
      );
    }
    last = match.index + token.length;
    index += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function paragraph(lines: string[], key: string): ReactNode {
  const inner = lines.flatMap((line, lineIndex) => {
    const rendered = renderInline(line, `${key}-l${lineIndex}`);
    return lineIndex === 0 ? rendered : [<br key={`${key}-br${lineIndex}`} />, ...rendered];
  });
  return <p key={key} className="leading-7">{inner}</p>;
}

export function renderMarkdown(source: string): ReactNode {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraphBuffer: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      blocks.push(paragraph(paragraphBuffer, `p${key++}`));
      paragraphBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // 코드펜스
    if (line.trim().startsWith("```")) {
      flushParagraph();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      blocks.push(
        <pre key={`pre${key++}`} className="overflow-x-auto rounded-[var(--radius-control)] bg-[var(--surface-subtle)] p-3 text-sm">
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // 제목
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      const content = renderInline(heading[2], `h${key}`);
      const className = level === 1 ? "text-lg font-semibold" : level === 2 ? "text-base font-semibold" : "text-sm font-semibold";
      blocks.push(
        level === 1
          ? <h3 key={`h${key++}`} className={className}>{content}</h3>
          : level === 2
            ? <h4 key={`h${key++}`} className={className}>{content}</h4>
            : <h5 key={`h${key++}`} className={className}>{content}</h5>,
      );
      continue;
    }

    // 인용
    if (/^>\s?/.test(line)) {
      flushParagraph();
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      i -= 1;
      blocks.push(
        <blockquote key={`q${key++}`} className="border-l-2 border-[var(--line)] pl-3 text-[var(--muted)]">
          {quote.map((quoteLine, quoteIndex) => (
            <p key={quoteIndex} className="leading-7">{renderInline(quoteLine, `q${key}-${quoteIndex}`)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    // 목록 (순서 없음/있음)
    const unordered = /^\s*[-*]\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (unordered || ordered) {
      flushParagraph();
      const items: string[] = [];
      const isOrdered = Boolean(ordered);
      while (i < lines.length) {
        const item = isOrdered ? /^\s*\d+\.\s+(.*)$/.exec(lines[i]) : /^\s*[-*]\s+(.*)$/.exec(lines[i]);
        if (!item) break;
        items.push(item[1]);
        i += 1;
      }
      i -= 1;
      const listItems = items.map((item, itemIndex) => (
        <li key={itemIndex}>{renderInline(item, `li${key}-${itemIndex}`)}</li>
      ));
      blocks.push(
        isOrdered
          ? <ol key={`ol${key++}`} className="list-decimal space-y-1 pl-5 leading-7">{listItems}</ol>
          : <ul key={`ul${key++}`} className="list-disc space-y-1 pl-5 leading-7">{listItems}</ul>,
      );
      continue;
    }

    // 빈 줄 = 문단 구분
    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();
  return <Fragment>{blocks}</Fragment>;
}
