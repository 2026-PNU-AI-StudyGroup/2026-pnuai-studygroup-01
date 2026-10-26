import { ProgramManagementRoutePage } from "@/app/topics/_management/program-management-route-page";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";

export async function generateMetadata() {
  return getLocalizedMetadata("프로그램 관리");
}

export default function ProgramManagementLandingPage() {
  return <ProgramManagementRoutePage />;
}
