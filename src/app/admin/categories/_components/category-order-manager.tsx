"use client";

import { useActionState } from "react";

import { moveProgramCategoryAction, type CategoryOrderActionState } from "@/app/admin/categories/_actions/category-order-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { IconButton } from "@/shared/ui/icon-button";
import { EmptyState } from "@/shared/ui/page-primitives";
import { ArrowDownIcon, ArrowUpIcon } from "@/shared/ui/workspace-icons";

const initialState: CategoryOrderActionState = { status: "idle" };

export function CategoryOrderManager({ categories, programCounts }: {
  categories: string[];
  programCounts: Record<string, number>;
}) {
  if (categories.length === 0) {
    return <EmptyState variant="section" title="대분류가 없습니다" description="프로그램에 분류를 지정하면 이곳에 나타납니다." />;
  }

  return (
    <ol className="divide-y divide-[var(--line)]">
      {categories.map((category, index) => (
        <li key={category} className="flex flex-wrap items-center gap-3 px-5 py-4">
          <span className="w-6 shrink-0 text-right text-sm font-bold tabular-nums text-[var(--muted)]">{index + 1}</span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-bold text-[var(--ink)]"><UiText>{category}</UiText></strong>
            <span className="text-xs text-[var(--muted)]">{programCounts[category] ?? 0}<UiText>{"개 프로그램"}</UiText></span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <Move category={category} order={categories} direction="up" disabled={index === 0} />
            <Move category={category} order={categories} direction="down" disabled={index === categories.length - 1} />
          </span>
        </li>
      ))}
    </ol>
  );
}

function Move({ category, order, direction, disabled }: {
  category: string;
  order: string[];
  direction: "up" | "down";
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(moveProgramCategoryAction, initialState);
  const label = `${category} ${direction === "up" ? "위로" : "아래로"} 이동`;
  return (
    <form action={action}>
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="direction" value={direction} />
      {/* 서버가 화면이 보고 있던 차례를 그대로 받아야 두 관리자가 동시에 눌러도 엇갈리지 않는다. */}
      {order.map((name) => <input key={name} type="hidden" name="order" value={name} />)}
      <IconButton type="submit" disabled={disabled || pending} aria-label={label} title={label}>
        {direction === "up" ? <ArrowUpIcon className="size-5" /> : <ArrowDownIcon className="size-5" />}
      </IconButton>
      {state.status === "error" ? <span role="alert" className="text-xs text-[var(--danger)]"><UiText>{state.message ?? ""}</UiText></span> : null}
    </form>
  );
}
