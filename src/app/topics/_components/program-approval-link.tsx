import Link from "next/link";

import styles from "@/app/topics/_components/program-approval-link.module.css";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { programManagementHref } from "@/modules/project-program/ui/program-management-route";

export function ProgramApprovalLink({ programId, count }: { programId: string; count: number }) {
  return (
    <Link
      href={`${programManagementHref(programId)}?approvals=pending`}
      aria-label={`승인 대기 ${count}건 검토하기`}
      className={styles.link}
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className={styles.icon}>
        <path d="M10 3.2 17 15.4H3L10 3.2Zm0 4.1v3.9m0 2.5v.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <UiText>{"승인 대기"}</UiText>
      <strong className={styles.count}>{count}<UiText>{"건"}</UiText></strong>
    </Link>
  );
}
