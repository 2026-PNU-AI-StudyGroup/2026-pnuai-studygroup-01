import type { ReactNode } from "react";

import { cardClass, CardHead } from "@/modules/project-program/ui/work-screen";
import type { ManagedTopicSummary } from "@/modules/topic/application/topic-ports";
import { UiText } from "@/modules/translation/ui/i18n-provider";

const applicationModeLabel = {
  TEAM_ONLY: "팀 지원만",
  INDIVIDUAL_ONLY: "개인 지원만",
  INDIVIDUAL_OR_TEAM: "개인, 팀 지원",
} as const;

/**
 * 관리 화면의 프로젝트 본문. 설명, 지원 조건, 지원서 문항을 카드로 나눠 왼쪽 칸에 쌓는다.
 * 모집 숫자와 일정은 화면이 오른쪽 칸에 따로 둔다.
 */
export function ManagedProjectSummary({ topic, description }: {
  topic: ManagedTopicSummary;
  /** 프로젝트 설명 본문. 번역 컴포넌트가 앱 계층에 있어 밖에서 넣는다. */
  description: ReactNode;
}) {
  // 학생이 직접 프로젝트를 등록하는 프로그램에서는 주제 공고로 팀원을 모으지 않는다.
  // 지원 조건과 지원서 구성이 비어 있어 카드째 감춘다.
  const showApplicationSetup = !topic.studentProjectCreationEnabled;
  // 값이 없는 항목을 빈 칸으로 두면 줄만 늘어난다. 없다는 사실을 글자로 적는다.
  const requirementRows: Array<[string, string]> = [
    ["필수 기술", topic.requiredSkills.join(", ") || "없음"],
    ["우대 기술", topic.preferredSkills.join(", ") || "없음"],
    ["예상 역할", topic.roleExpectations.trim() || "없음"],
    ["활동 조건", topic.availabilityRequirement.trim() || "없음"],
  ];

  return (
    <div className="grid min-w-0 gap-3.5">
      <section aria-labelledby="managed-topic-description" className={cardClass}>
        <CardHead id="managed-topic-description" title={<UiText>{"프로젝트 설명"}</UiText>} />
        <div className="px-5 pb-5">{description}</div>
      </section>

      {showApplicationSetup ? (
        <>
          <section aria-labelledby="managed-topic-requirements" className={cardClass}>
            <CardHead id="managed-topic-requirements" title={<UiText>{"지원 조건"}</UiText>} />
            <dl className="px-5 pb-3">
              {requirementRows.map(([label, value]) => (
                <div key={label} className="grid gap-1 py-2.5 text-[0.8125rem] sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-4 [&+div]:border-t [&+div]:border-[var(--line)]">
                  <dt className="text-[var(--muted)]"><UiText>{label}</UiText></dt>
                  <dd className={`leading-5 [overflow-wrap:anywhere] ${value === "없음" ? "text-[var(--muted)]" : "text-[var(--ink)]"}`}><UiText>{value}</UiText></dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="managed-application-form" className={cardClass}>
            <CardHead
              id="managed-application-form"
              title={<UiText>{"지원서 구성"}</UiText>}
              count={<UiText>{applicationModeLabel[topic.applicationMode]}</UiText>}
            />
            {topic.applicationQuestions.length === 0 ? (
              <p className="px-5 pb-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"추가 질문 없이 지원받습니다."}</UiText></p>
            ) : (
              <ol className="px-5 pb-3">
                {topic.applicationQuestions.map((question, index) => (
                  <li key={question.id} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-baseline gap-3 py-2.5 text-[0.8125rem] [&+li]:border-t [&+li]:border-[var(--line)]">
                    <span className="tabular-nums text-[var(--muted)]">{index + 1}</span>
                    <span className="leading-5 text-[var(--ink)]"><UiText>{question.label}</UiText></span>
                    <span className="whitespace-nowrap text-right text-xs tabular-nums text-[var(--muted)]">
                      <UiText>{question.required ? "필수" : "선택"}</UiText>, <UiText>{"최대"}</UiText> {question.maxLength.toLocaleString("ko-KR")}<UiText>{"자"}</UiText>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
