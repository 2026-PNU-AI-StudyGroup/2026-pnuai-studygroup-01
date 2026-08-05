import { redirect } from "next/navigation";

import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export default async function ArchivePage({ searchParams }: {
  searchParams: Promise<{ page?: SearchParamValue; q?: SearchParamValue }>;
}) {
  const params = await searchParams;
  const target = new URLSearchParams({ view: "past" });
  // 과거 프로젝트 뷰(/topics?view=past)가 실제로 읽는 파라미터만 전달한다.
  // year/category는 과거뷰에서 지원하지 않아 넘겨도 무시되므로 제거한다.
  for (const key of ["page", "q"] as const) {
    const value = firstSearchParam(params[key]);
    if (value) target.set(key, value);
  }
  redirect(`/topics?${target.toString()}`);
}
