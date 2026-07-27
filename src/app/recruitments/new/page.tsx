import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("새 모집");
}

export default async function NewRecruitmentPage({
  searchParams,
}: {
  searchParams: Promise<{ teamId?: string }>;
}) {
  const { teamId } = await searchParams;
  const query = new URLSearchParams({ modal: "new" });
  if (teamId) query.set("teamId", teamId);
  redirect(`/recruitments/mine?${query.toString()}`);
}
