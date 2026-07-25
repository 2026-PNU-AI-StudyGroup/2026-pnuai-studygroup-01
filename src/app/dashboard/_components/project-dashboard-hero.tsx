import Link from "next/link";

import styles from "@/app/dashboard/_components/project-list.module.css";
import type { UserRole } from "@/modules/identity/domain/user-role";

function DashboardActions({ role }: { role: UserRole }) {
  if (role === "PROFESSOR") {
    return (
      <div className={styles.headerActions}>
        <Link href="/professor/applications" className="button-secondary">
          지원 검토
        </Link>
        <Link href="/professor/topics" className="button-primary">
          주제 관리
        </Link>
      </div>
    );
  }

  return (
    <Link
      href={role === "STUDENT" ? "/topics" : "/professor/topics"}
      className="button-primary"
    >
      {role === "STUDENT" ? "새 프로젝트 찾기" : "주제 관리"}
    </Link>
  );
}

export function ProjectDashboardHero({ role }: { role: UserRole }) {
  const title =
    role === "PROFESSOR"
      ? "지도 프로젝트"
      : role === "ADMIN"
        ? "전체 프로젝트"
        : "내 프로젝트";

  return (
    <header className={styles.overview}>
      <h1 className={styles.pageTitle}>{title}</h1>
      <DashboardActions role={role} />
    </header>
  );
}
