import { DeveloperControls } from "@/app/feedback/_components/developer-controls";
import {
  FEEDBACK_PRIORITY_LABEL,
  FEEDBACK_TYPE_LABEL,
  TARGET_SCREEN_LABEL,
  type FeedbackPriorityValue,
  type FeedbackTypeValue,
  type TargetScreenValue,
} from "@/app/feedback/_lib/feedback-options";
import { LocalizedMarkdown } from "@/modules/translation/ui/localized-markdown";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { StatusBadge } from "@/shared/ui/page-primitives";

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

const priorityTone: Record<FeedbackPriorityValue, "neutral" | "info" | "warning" | "danger"> = {
  LOW: "neutral",
  NORMAL: "info",
  HIGH: "warning",
  URGENT: "danger",
};

function Chip({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
      <UiText>{children}</UiText>
    </span>
  );
}

export function FeedbackPostCard({ post, canModerate = false }: { post: FeedbackPostView; canModerate?: boolean }) {
  const resolved = post.status === "RESOLVED";
  return (
    <article className="panel grid gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={post.type === "BUG" ? "warning" : "info"}>{FEEDBACK_TYPE_LABEL[post.type]}</StatusBadge>
        <StatusBadge tone={priorityTone[post.priority]}>{FEEDBACK_PRIORITY_LABEL[post.priority]}</StatusBadge>
        <StatusBadge tone={resolved ? "success" : "neutral"}>{resolved ? "해결됨" : "미해결"}</StatusBadge>
        <Chip>{TARGET_SCREEN_LABEL[post.targetScreen]}</Chip>
        <Chip>{post.area}</Chip>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]"><UiText>{post.title}</UiText></h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          <span className="font-semibold text-[var(--ink)]">{post.authorName}</span>
          {" · "}
          <UiDate value={post.createdAt} mode="dateTime" />
        </p>
      </div>

      {/* 로그인 없이 누구나 쓰는 글이라 바깥 이미지를 렌더하지 않는다. */}
      <LocalizedMarkdown text={post.body} className="text-[0.95rem] text-[var(--ink)]" allowExternalImages={false} />

      {resolved && post.resolvedAt ? (
        <p className="rounded-[var(--radius-control)] bg-[var(--success-subtle)] px-3 py-2 text-xs font-semibold text-[var(--success)]">
          <UiText>{"해결"}</UiText>
          {" · "}
          <UiDate value={post.resolvedAt} mode="dateTime" />
          {post.resolvedByName ? <>{" · "}{post.resolvedByName}</> : null}
        </p>
      ) : null}

      {post.statusChanges.length ? (
        <details className="group border-t border-[var(--line)] pt-3">
          <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-[var(--muted)] transition-colors hover:text-[var(--ink)] [&::-webkit-details-marker]:hidden">
            <UiText>{"처리 이력"}</UiText>
            <span>{post.statusChanges.length}</span>
          </summary>
          <ol className="mt-3 grid gap-2 border-l border-[var(--line)] pl-4">
            <li className="text-xs text-[var(--muted)]">
              <span className="font-semibold text-[var(--ink)]"><UiText>{"등록됨"}</UiText></span>
              {" · "}<UiDate value={post.createdAt} mode="dateTime" />{" · "}{post.authorName}
            </li>
            {post.statusChanges.map((change) => (
              <li key={change.id} className="text-xs text-[var(--muted)]">
                <span className={`font-semibold ${change.status === "RESOLVED" ? "text-[var(--success)]" : "text-[var(--ink)]"}`}>
                  <UiText>{change.status === "RESOLVED" ? "해결 처리" : "미해결로 변경"}</UiText>
                </span>
                {" · "}<UiDate value={change.createdAt} mode="dateTime" />{" · "}{change.changedByName}
                {change.note ? <span className="mt-0.5 block whitespace-pre-wrap text-[var(--ink)]">{change.note}</span> : null}
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      {post.comments.length ? (
        <div className="grid gap-3 border-t border-[var(--line)] pt-4">
          <p className="text-xs font-semibold text-[var(--muted)]"><UiText>{"운영 답변"}</UiText>{" "}{post.comments.length}</p>
          <ul className="grid gap-3">
            {post.comments.map((comment) => (
              <li key={comment.id} className="rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-3 py-2">
                <p className="text-xs text-[var(--muted)]">
                  <span className="font-semibold text-[var(--ink)]">{comment.authorName}</span>
                  {" · "}
                  <UiDate value={comment.createdAt} mode="dateTime" />
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--ink)]">{comment.body}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canModerate ? <DeveloperControls postId={post.id} resolved={resolved} /> : null}
    </article>
  );
}
