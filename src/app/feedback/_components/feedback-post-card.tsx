import { DeveloperControls } from "@/app/feedback/_components/developer-controls";
import {
  FEEDBACK_PRIORITY_LABEL,
  FEEDBACK_TYPE_LABEL,
  TARGET_SCREEN_LABEL,
  type FeedbackPriorityValue,
  type FeedbackTypeValue,
  type TargetScreenValue,
} from "@/app/feedback/_lib/feedback-options";
import { Pill } from "@/modules/project-program/ui/work-screen";
import { LocalizedMarkdown } from "@/modules/translation/ui/localized-markdown";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";

type FeedbackCommentView = {
  id: string;
  authorName: string;
  body: string;
  createdAt: Date;
};

type FeedbackStatusChangeView = {
  id: string;
  status: "OPEN" | "RESOLVED";
  changedByName: string;
  note: string | null;
  createdAt: Date;
};

export type FeedbackPostView = {
  id: string;
  authorName: string;
  authorEmail: string | null;
  targetScreen: TargetScreenValue;
  area: string;
  type: FeedbackTypeValue;
  priority: FeedbackPriorityValue;
  title: string;
  body: string;
  status: "OPEN" | "RESOLVED";
  resolvedAt: Date | null;
  resolvedByName: string | null;
  createdAt: Date;
  comments: FeedbackCommentView[];
  statusChanges: FeedbackStatusChangeView[];
};

/**
 * 게시판 목록의 글 한 줄. 상태 알약은 하나(미해결 파랑, 해결됨 회색)이고, 우선순위는 높음과 긴급만
 * 색을 얹는다. 유형, 대상 화면, 관련 기능은 글쓴이 줄에 회색 글자로 둔다.
 */
export function FeedbackPostCard({ post, canModerate = false }: { post: FeedbackPostView; canModerate?: boolean }) {
  const resolved = post.status === "RESOLVED";
  const loud = post.priority === "URGENT" || post.priority === "HIGH";
  return (
    <article aria-labelledby={`feedback-${post.id}`} className="grid gap-3 border-t border-[var(--line)] px-5 py-4">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 id={`feedback-${post.id}`} className="min-w-0 text-[0.9375rem] font-semibold leading-6 text-[var(--ink)] [overflow-wrap:anywhere]"><UiText>{post.title}</UiText></h3>
          <span className="flex flex-none gap-1.5">
            {loud ? <Pill tone={post.priority === "URGENT" ? "danger" : "warning"}>{FEEDBACK_PRIORITY_LABEL[post.priority]}</Pill> : null}
            <Pill tone={resolved ? "plain" : "accent"}>{resolved ? "해결됨" : "미해결"}</Pill>
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">
          <span className="font-medium text-[var(--ink)]">{post.authorName}</span>
          {/* 메일 주소는 누구나 읽는 게시판에 그대로 두지 않는다. 답변할 사람에게만 보인다. */}
          {canModerate && post.authorEmail ? <>{" "}<span className="break-all">{post.authorEmail}</span></> : null}
          {", "}<span className="tabular-nums"><UiDate value={post.createdAt} mode="dateTime" /></span>
          {", "}<UiText>{FEEDBACK_TYPE_LABEL[post.type]}</UiText>
          {", "}<UiText>{TARGET_SCREEN_LABEL[post.targetScreen]}</UiText>
          {", "}<UiText>{post.area}</UiText>
          {loud ? null : <>{", "}<UiText>{"우선순위"}</UiText> <UiText>{FEEDBACK_PRIORITY_LABEL[post.priority]}</UiText></>}
        </p>
      </div>

      {/* 로그인 없이 누구나 쓰는 글이라 바깥 이미지를 렌더하지 않는다. */}
      <LocalizedMarkdown text={post.body} className="max-w-[72ch] text-sm leading-6 text-[var(--ink)]" allowExternalImages={false} />

      {resolved && post.resolvedAt ? (
        <p className="text-xs font-medium text-[var(--success)]">
          <UiText>{"해결"}</UiText>{" "}
          <span className="tabular-nums"><UiDate value={post.resolvedAt} mode="dateTime" /></span>
          {post.resolvedByName ? <>{", "}{post.resolvedByName}</> : null}
        </p>
      ) : null}

      {post.comments.length ? (
        <div className="grid gap-2">
          <p className="text-xs font-medium text-[var(--muted)]"><UiText>{"운영 답변"}</UiText>{" "}<span className="tabular-nums">{post.comments.length}</span></p>
          <ul className="grid gap-2.5">
            {post.comments.map((comment) => (
              <li key={comment.id} className="border-l-2 border-[var(--accent-track)] pl-3">
                <p className="text-xs text-[var(--muted)]">
                  <span className="font-medium text-[var(--ink)]">{comment.authorName}</span>
                  {", "}
                  <span className="tabular-nums"><UiDate value={comment.createdAt} mode="dateTime" /></span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm leading-6 text-[var(--ink)]">{comment.body}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {post.statusChanges.length ? (
        <details className="group">
          <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--ink)] hover:text-[var(--primary)] [&::-webkit-details-marker]:hidden">
            <UiText>{"처리 이력"}</UiText>
            <span className="tabular-nums text-[var(--muted)]">{post.statusChanges.length}</span>
          </summary>
          <ol className="mt-2 grid gap-2 border-l border-[var(--line)] pl-4">
            <li className="text-xs text-[var(--muted)]">
              <span className="font-medium text-[var(--ink)]"><UiText>{"등록됨"}</UiText></span>
              {" "}<span className="tabular-nums"><UiDate value={post.createdAt} mode="dateTime" /></span>{", "}{post.authorName}
            </li>
            {post.statusChanges.map((change) => (
              <li key={change.id} className="text-xs text-[var(--muted)]">
                <span className={`font-medium ${change.status === "RESOLVED" ? "text-[var(--success)]" : "text-[var(--ink)]"}`}>
                  <UiText>{change.status === "RESOLVED" ? "해결 처리" : "미해결로 변경"}</UiText>
                </span>
                {" "}<span className="tabular-nums"><UiDate value={change.createdAt} mode="dateTime" /></span>{", "}{change.changedByName}
                {change.note ? <span className="mt-0.5 block whitespace-pre-wrap text-[var(--ink)]">{change.note}</span> : null}
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      {canModerate ? <DeveloperControls postId={post.id} resolved={resolved} /> : null}
    </article>
  );
}
