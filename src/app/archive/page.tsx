import { redirect } from "next/navigation";

import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export default async function ArchivePage({ searchParams }: {
  searchParams: Promise<{ page?: SearchParamValue; q?: SearchParamValue; year?: SearchParamValue; category?: SearchParamValue }>;
}) {
  const params = await searchParams;
  const target = new URLSearchParams({ view: "past" });
  for (const key of ["page", "q", "year", "category"] as const) {
    const value = firstSearchParam(params[key]);
    if (value) target.set(key, value);
  }
  redirect(`/topics?${target.toString()}`);
}
