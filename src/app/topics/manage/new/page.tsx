import { ProgramCreateRoutePage } from "@/app/topics/_management/program-management-route-page";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";

export async function generateMetadata() {
  return getLocalizedMetadata("새 프로그램");
}

export default function ProgramCreatePage() {
  return <ProgramCreateRoutePage />;
}
