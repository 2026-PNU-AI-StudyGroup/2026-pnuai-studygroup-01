import { DeveloperControls } from "@/app/feedback/_components/developer-controls";
import {
  FEEDBACK_PRIORITY_LABEL,
  FEEDBACK_TYPE_LABEL,
  TARGET_SCREEN_LABEL,
  type FeedbackPriorityValue,
  type FeedbackTypeValue,
  type TargetScreenValue,
} from "@/app/feedback/_lib/feedback-options";
import { renderMarkdown } from "@/app/feedback/_lib/render-markdown";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { StatusBadge } from "@/shared/ui/page-primitives";

type FeedbackCommentView = {
  id: string;
  developerName: string;
  body: string;
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

export function FeedbackPostCard({ post }: { post: FeedbackPostView }) {
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

      <div className="text-[0.95rem] text-[var(--ink)]">{renderMarkdown(post.body)}</div>

      {resolved && post.resolvedAt ? (
        <p className="rounded-[var(--radius-control)] bg-[var(--success-subtle)] px-3 py-2 text-xs font-semibold text-[var(--success)]">
          <UiText>{"해결"}</UiText>
          {" · "}
          <UiDate value={post.resolvedAt} mode="dateTime" />
          {post.resolvedByName ? <>{" · "}{post.resolvedByName}</> : null}
        </p>
      ) : null}

      {post.comments.length ? (
        <div className="grid gap-3 border-t border-[var(--line)] pt-4">
          <p className="text-xs font-semibold text-[var(--muted)]"><UiText>{"개발자 코멘트"}</UiText>{" "}{post.comments.length}</p>
          <ul className="grid gap-3">
            {post.comments.map((comment) => (
              <li key={comment.id} className="rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-3 py-2">
                <p className="text-xs text-[var(--muted)]">
                  <span className="font-semibold text-[var(--ink)]">{comment.developerName}</span>
                  {" · "}
                  <UiDate value={comment.createdAt} mode="dateTime" />
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--ink)]">{comment.body}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <DeveloperControls postId={post.id} resolved={resolved} />
    </article>
  );
}
