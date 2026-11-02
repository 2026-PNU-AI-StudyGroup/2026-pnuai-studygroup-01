"use client";

import { useActionState } from "react";

import { moveProgramCategoryAction, type CategoryOrderActionState } from "@/app/admin/categories/_actions/category-order-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { IconButton } from "@/shared/ui/icon-button";
import { ArrowDownIcon, ArrowUpIcon } from "@/shared/ui/workspace-icons";

const initialState: CategoryOrderActionState = { status: "idle" };

export function CategoryOrderManager({ categories, programNames }: {
  categories: string[];
  programNames: Record<string, string[]>;
}) {
  if (categories.length === 0) {
    return <p role="status" className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"대분류가 없습니다. 프로그램에 분류를 지정하면 이곳에 나타납니다."}</UiText></p>;
  }

  return (
    <ol>
      {categories.map((category, index) => {
        const names = programNames[category] ?? [];
        return (
          <li key={category} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto_auto] items-center gap-x-3 border-t border-[var(--line)] px-5 py-2.5">
            <span className="text-right text-[0.8125rem] tabular-nums text-[var(--muted)]">{index + 1}</span>
            <span className="min-w-0">
              <strong className="block truncate text-sm font-medium text-[var(--ink)]"><UiText>{category}</UiText></strong>
              <span className="block truncate text-xs text-[var(--muted)]">
                {names.length ? <UiText>{names.length > 2 ? `${names.slice(0, 2).join(", ")} 외 ${names.length - 2}개` : names.join(", ")}</UiText> : <UiText>{"프로그램 없음"}</UiText>}
              </span>
            </span>
            <span className="whitespace-nowrap text-right text-[0.8125rem] tabular-nums text-[var(--ink)]">{names.length}<UiText>{"개"}</UiText></span>
            <span className="flex items-center gap-1">
              <Move category={category} order={categories} direction="up" disabled={index === 0} />
              <Move category={category} order={categories} direction="down" disabled={index === categories.length - 1} />
            </span>
          </li>
        );
      })}
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
    <form action={action} className="relative">
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="direction" value={direction} />
      {/* 서버가 화면이 보고 있던 차례를 그대로 받아야 두 관리자가 동시에 눌러도 엇갈리지 않는다. */}
      {order.map((name) => <input key={name} type="hidden" name="order" value={name} />)}
      <IconButton type="submit" disabled={disabled || pending} aria-label={label} title={label}>
        {direction === "up" ? <ArrowUpIcon className="size-4" /> : <ArrowDownIcon className="size-4" />}
      </IconButton>
      {state.status === "error" ? <span role="alert" className="absolute right-0 top-full z-10 w-max max-w-56 text-xs text-[var(--danger)]"><UiText>{state.message ?? ""}</UiText></span> : null}
    </form>
  );
}
