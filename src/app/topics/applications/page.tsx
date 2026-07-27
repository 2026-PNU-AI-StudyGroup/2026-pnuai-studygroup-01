import { permanentRedirect } from "next/navigation";

import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export default async function TopicApplicationsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const page = Number(firstSearchParam((await searchParams).page) ?? "1");
  const pageParam = Number.isSafeInteger(page) && page > 1 ? `&page=${page}` : "";
  permanentRedirect(`/dashboard?view=pending${pageParam}`);
}
