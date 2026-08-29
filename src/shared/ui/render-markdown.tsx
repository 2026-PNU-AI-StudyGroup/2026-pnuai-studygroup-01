import type { ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// GitHub 과 같은 문법(CommonMark + GFM)을 그대로 렌더한다. 예전에는 제목·목록·강조만 아는
// 부분집합을 직접 구현해 두어 표·이미지·체크박스·중첩 목록이 원문 그대로 보였다.
// react-markdown 은 HTML 문자열이 아니라 React 요소를 만들고 원본 HTML 은 무시하므로
// dangerouslySetInnerHTML 없이도 XSS 에 안전하다.

// react-markdown 은 컴포넌트에 파싱 노드까지 넘긴다. DOM 요소에 그대로 흘리면 경고가 난다.
function omitNode<T extends object>(props: T & { node?: unknown }): T {
  const rest = { ...props };
  delete (rest as { node?: unknown }).node;
  return rest as T;
}

// em 기준이라 카드(작은 본문)와 문서 페이지(큰 본문) 모두에서 위계가 유지된다.
// 본문 안 제목은 화면 제목보다 한 단계 낮춰 h1 이 겹치지 않게 한다.
const HEADING_CLASS = {
  1: "mt-6 text-[1.4em] font-bold leading-snug tracking-[-0.02em] first:mt-0",
  2: "mt-6 text-[1.15em] font-bold leading-snug tracking-[-0.015em] first:mt-0",
  3: "mt-5 text-[1em] font-semibold leading-snug first:mt-0",
} as const;

const COMPONENTS: Components = {
  h1: (props) => <h3 {...omitNode(props)} className={HEADING_CLASS[1]} />,
  h2: (props) => <h4 {...omitNode(props)} className={HEADING_CLASS[2]} />,
  h3: (props) => <h5 {...omitNode(props)} className={HEADING_CLASS[3]} />,
  h4: (props) => <h6 {...omitNode(props)} className={HEADING_CLASS[3]} />,
  h5: (props) => <h6 {...omitNode(props)} className={HEADING_CLASS[3]} />,
  h6: (props) => <h6 {...omitNode(props)} className={HEADING_CLASS[3]} />,
  p: (props) => <p {...omitNode(props)} className="leading-7" />,
  // 서비스 내부 경로는 같은 탭에서 이동하고, 외부 주소만 새 탭으로 연다.
  // //host 는 프로토콜 상대 주소라 내부 경로가 아니다.
  a: (props) => {
    const { href } = props;
    const internal = !href || /^\/(?!\/)/.test(href) || href.startsWith("#");
    return <a {...(internal ? {} : { target: "_blank", rel: "noreferrer noopener" })} {...omitNode(props)} className="text-[var(--primary)] underline" />;
  },
  ul: (props) => <ul {...omitNode(props)} className="list-disc space-y-1 pl-5 leading-7" />,
  ol: (props) => <ol {...omitNode(props)} className="list-decimal space-y-1 pl-5 leading-7" />,
  // 체크박스 목록은 GFM 이 li 안에 input 을 넣는다. 그때만 글머리 기호를 지운다.
  li: (props) => <li {...omitNode(props)} className="[&:has(>input[type=checkbox])]:list-none" />,
  input: (props) => <input {...omitNode(props)} className="mr-1.5 align-middle accent-[var(--primary)]" />,
  blockquote: (props) => <blockquote {...omitNode(props)} className="border-l-2 border-[var(--line)] pl-3 text-[var(--muted)]" />,
  hr: (props) => <hr {...omitNode(props)} className="my-6 border-t border-[var(--line)]" />,
  code: (props) => <code {...omitNode(props)} className="rounded bg-[var(--surface-subtle)] px-1 py-0.5 text-[0.9em]" />,
  // 코드블록 안의 code 는 칩 모양을 걷어낸다. 자식 선택자라 code 쪽 유틸리티를 이긴다.
  pre: (props) => <pre {...omitNode(props)} className="overflow-x-auto rounded-[var(--radius-control)] bg-[var(--surface-subtle)] p-3 text-sm [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[1em]" />,
  // 넓은 표가 화면을 밀어내지 않도록 표만 따로 가로 스크롤한다.
  table: (props) => (
    <div className="overflow-x-auto">
      <table {...omitNode(props)} className="w-full border-collapse text-[0.9375rem]" />
    </div>
  ),
  th: (props) => <th {...omitNode(props)} className="border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-left font-bold" />,
  td: (props) => <td {...omitNode(props)} className="border border-[var(--line)] px-3 py-2 align-top" />,
  del: (props) => <del {...omitNode(props)} className="text-[var(--muted)]" />,
  // 본문 이미지는 주소를 미리 알 수 없어 next/image 최적화 대상으로 둘 수 없다.
  // eslint-disable-next-line @next/next/no-img-element
  img: (props) => <img alt="" {...omitNode(props)} loading="lazy" className="h-auto max-w-full rounded-[var(--radius-control)]" />,
};

/**
 * 바깥 주소를 가리키는 본문 이미지를 지운다.
 *
 * 누구나 쓸 수 있는 글에서는 `![](https://남의서버/pixel)` 한 줄이 그 글을 여는 모든
 * 사람의 접속 정보를 글쓴이에게 넘기는 통로가 된다. 결과물 쪽은 "우리가 받아 둔 파일만
 * 사진으로 쓴다" 로 같은 위협을 막고 있다. 피드백 게시판은 업로드가 없으므로 바깥
 * 이미지를 아예 렌더하지 않는다.
 *
 * 우리 서버 경로(`/` 로 시작)만 남긴다. 운영진이 쓰는 공지 등은 이 제한을 걸지 않는다.
 */
function isSameOriginSource(source: unknown): boolean {
  return typeof source === "string" && source.startsWith("/") && !source.startsWith("//");
}

const UNTRUSTED_COMPONENTS: Components = {
  ...COMPONENTS,
  img: (props) => (isSameOriginSource(props.src)
    // eslint-disable-next-line @next/next/no-img-element
    ? <img alt="" {...omitNode(props)} loading="lazy" className="h-auto max-w-full rounded-[var(--radius-control)]" />
    : null),
};

export function renderMarkdown(source: string, options: { allowExternalImages?: boolean } = {}): ReactNode {
  const components = options.allowExternalImages === false ? UNTRUSTED_COMPONENTS : COMPONENTS;
  return <Markdown remarkPlugins={[remarkGfm]} components={components}>{source}</Markdown>;
}

/** 목록 미리보기처럼 서식 없이 한 줄로 보여줄 때 쓴다. 마크다운 기호만 걷어낸다. */
export function markdownToPlainText(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
