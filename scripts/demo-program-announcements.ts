export type DemoProgramAnnouncementProgram = {
  name: string;
  startsAt: Date;
  endsAt: Date;
  recruitmentStartsAt: Date;
  recruitmentEndsAt: Date;
  executionStartsAt: Date;
  executionEndsAt: Date;
  submissionStartsAt: Date;
  submissionEndsAt: Date;
  lifecycleStatus: "ACTIVE" | "CLOSED";
};

export type DemoProgramAnnouncement = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  visibility: "AUTHENTICATED" | "TARGET_MEMBERS";
  createdAt: Date;
};

type ProgramNoticeContext = DemoProgramAnnouncementProgram & {
  unit: string;
  contact: string;
  location: string;
  participantLabel: string;
  resultLabel: string;
};

type NoticeTemplate = {
  key: string;
  title: string;
  content: (context: ProgramNoticeContext) => string;
};

export const DEMO_PROGRAM_ANNOUNCEMENT_COUNTS = [6, 13, 12, 11, 10, 9, 8, 7, 5, 4, 3] as const;

export const LEGACY_PROGRAM_ANNOUNCEMENT_IDS = Array.from(
  { length: 4 },
  (_, index) => `92000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);

const programProfiles = [
  { unit: "컴퓨터공학전공 졸업과제 운영팀", contact: "demo.professor1@pusan.ac.kr", location: "제6공학관 6208호", participantLabel: "졸업과제 참여 학생", resultLabel: "설계 문서와 구현 결과물" },
  { unit: "창의융합AI해커톤 운영사무국", contact: "demo.professor2@pusan.ac.kr", location: "정보화교육관 대강의실", participantLabel: "해커톤 참가팀", resultLabel: "문제 정의서와 시연 가능한 프로토타입" },
  { unit: "AI부스터 교육운영팀", contact: "demo.professor3@pusan.ac.kr", location: "제2공학관 AI 실습실", participantLabel: "AI부스터 교육생", resultLabel: "학습 기록과 AI 서비스 결과물" },
  { unit: "2025 캡스톤디자인 기록관리 담당", contact: "demo.professor1@pusan.ac.kr", location: "제6공학관 학과사무실", participantLabel: "2025학년도 참여팀", resultLabel: "최종보고서와 발표 자료" },
  { unit: "제6회 창의융합SW해커톤 운영사무국", contact: "demo.professor2@pusan.ac.kr", location: "넉넉한터 세미나실", participantLabel: "SW해커톤 참가팀", resultLabel: "기획서와 프로토타입" },
  { unit: "2024 캡스톤디자인 자료관리 담당", contact: "demo.professor1@pusan.ac.kr", location: "제6공학관 학과사무실", participantLabel: "2024학년도 참여팀", resultLabel: "작품 설명서와 공개 결과물" },
  { unit: "AI부스터 1기 운영지원팀", contact: "demo.professor3@pusan.ac.kr", location: "제2공학관 AI 실습실", participantLabel: "AI부스터 1기 교육생", resultLabel: "모델 실험 기록과 최종 과제" },
  { unit: "2023 캡스톤디자인 자료관리 담당", contact: "demo.professor1@pusan.ac.kr", location: "제6공학관 학과사무실", participantLabel: "2023학년도 참여팀", resultLabel: "최종보고서와 전시 자료" },
  { unit: "카카오 테크 캠퍼스 학과 운영담당", contact: "demo.professor2@pusan.ac.kr", location: "제6공학관 프로젝트실", participantLabel: "테크 캠퍼스 참여팀", resultLabel: "서비스 기획서와 배포 결과" },
  { unit: "2022 캡스톤디자인 자료관리 담당", contact: "demo.professor1@pusan.ac.kr", location: "제6공학관 학과사무실", participantLabel: "2022학년도 참여팀", resultLabel: "최종보고서와 작품 자료" },
  { unit: "오픈소스 SW 경진대회 기록관리 담당", contact: "demo.professor2@pusan.ac.kr", location: "정보화교육관 프로젝트실", participantLabel: "경진대회 참가팀", resultLabel: "공개 저장소와 시연 자료" },
] as const;

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function date(value: Date): string {
  return dateFormatter.format(value);
}

function period(startsAt: Date, endsAt: Date): string {
  return `${date(startsAt)} ~ ${date(endsAt)}`;
}

function closing(context: ProgramNoticeContext, request: string): string {
  return `\n\n담당자: ${context.unit}\n연락처: ${context.contact}\n문의 방법: PMS 프로그램 문의 시 프로그램명과 팀명을 함께 기재\n\n${request} 원활한 운영을 위해 기한 내 확인과 협조를 부탁드립니다.`;
}

const noticeTemplates: NoticeTemplate[] = [
  {
    key: "schedule",
    title: "전체 운영 일정 및 단계별 확인 사항 안내",
    content: (context) => `안녕하세요. ${context.name} 운영팀입니다.\n\n프로그램 참여 과정에서 일정 누락이 발생하지 않도록 모집부터 결과물 제출까지의 전체 운영 일정을 안내드립니다. 아래 일정은 PMS에 등록된 공식 일정을 기준으로 하며, 변경이 필요한 경우 별도 공지로 안내합니다.\n\n1. 참가 신청 및 팀 등록\n- 기간: ${period(context.recruitmentStartsAt, context.recruitmentEndsAt)}\n- 확인 사항: 신청 정보, 소속, 연락 가능한 이메일\n\n2. 프로젝트 수행\n- 기간: ${period(context.executionStartsAt, context.executionEndsAt)}\n- 확인 사항: 팀별 진행 기록, 지도·멘토링 의견 반영\n\n3. 결과물 제출\n- 기간: ${period(context.submissionStartsAt, context.submissionEndsAt)}\n- 제출 항목: ${context.resultLabel}\n\n프로그램 전체 기간: ${period(context.startsAt, context.endsAt)}${closing(context, "세부 일정은 프로그램 화면의 일정 정보와 각 제출 항목을 함께 확인해 주시기 바랍니다.")}`,
  },
  {
    key: "team",
    title: "참여자·팀 정보 최종 확인 요청",
    content: (context) => `안녕하세요. ${context.unit}입니다.\n\n${context.participantLabel}의 명단과 팀 정보가 최종 운영 자료에 반영될 예정입니다. 잘못된 정보가 보고서 승인, 평가 배정 또는 결과물 공개 단계까지 이어지지 않도록 아래 항목을 확인해 주세요.\n\n확인 대상\n- 팀명과 프로젝트명\n- 팀장 및 팀원 성명\n- 지도교수 또는 담당 멘토\n- 팀원이 실제로 사용하는 연락처\n\n확인 기간: ${period(context.recruitmentStartsAt, context.recruitmentEndsAt)}\n수정 절차: PMS의 현재 정보를 확인한 뒤 변경 사유와 정확한 내용을 담당자에게 전달\n유의 사항: 팀원 변경은 당사자와 지도 담당자의 확인이 완료된 경우에만 반영합니다.${closing(context, "현재 정보가 정확한 경우에는 별도 회신 없이 프로그램 참여를 계속해 주세요.")}`,
  },
  {
    key: "plan",
    title: "수행계획서 작성 및 제출 기준 안내",
    content: (context) => `안녕하세요. ${context.name} 수행계획서 제출 기준을 안내드립니다.\n\n수행계획서는 팀이 해결하려는 문제와 실제로 검증할 범위를 운영진과 지도 담당자가 함께 확인하기 위한 문서입니다. 단순 기능 목록보다 문제의 배경, 대상 사용자, 역할 분담과 일정이 서로 연결되도록 작성해 주세요.\n\n필수 포함 항목\n1. 문제 정의와 추진 배경\n2. 대상 사용자 또는 활용 환경\n3. 핵심 기능과 이번 기간의 구현 범위\n4. 팀원별 역할 및 협업 방식\n5. 예상 위험 요소와 대응 방안\n\n작성 기간: ${period(context.executionStartsAt, context.submissionStartsAt)}\n제출 위치: PMS 프로그램 화면의 수행계획서 제출 항목\n파일 형식: PDF, 문서 첫 페이지에 프로그램명·팀명·작성일 표기${closing(context, "제출 전 지도 담당자의 검토 의견을 반영하고 최종 파일이 정상적으로 열리는지 확인해 주세요.")}`,
  },
  {
    key: "midterm",
    title: "중간 점검 자료 제출 및 면담 운영 안내",
    content: (context) => `안녕하세요. ${context.unit}입니다.\n\n프로젝트의 현재 진행 상태를 확인하고 남은 기간의 범위를 조정하기 위해 중간 점검을 진행합니다. 완성된 결과만 정리하기보다 계획 대비 진행 상황과 해결하지 못한 문제를 구체적으로 작성해 주세요.\n\n제출 내용\n- 계획 대비 완료·미완료 항목\n- 현재 실행 가능한 화면 또는 기능\n- 사용자·데이터 검증 결과\n- 남은 위험 요소와 다음 단계\n\n자료 준비 기간: ${period(context.executionStartsAt, context.executionEndsAt)}\n면담 장소: ${context.location}\n진행 방법: 팀별 자료 제출 후 지도 담당자 면담, 보완 의견은 PMS에 기록\n유의 사항: 외부 서비스 장애나 데이터 확보 지연이 있는 경우 원인과 대체 계획을 함께 작성${closing(context, "면담에서 확정한 보완 항목은 최종 제출 전까지 수행 기록에 반영해 주세요.")}`,
  },
  {
    key: "final-result",
    title: "최종보고서 및 결과물 등록 안내",
    content: (context) => `안녕하세요. ${context.name} 최종 제출 절차를 안내드립니다.\n\n최종보고서와 결과물은 프로젝트 수행 과정과 검증 결과를 공식적으로 남기는 자료입니다. 발표 자료만 제출하거나 외부 링크만 등록하지 말고, 아래 항목을 모두 확인해 주세요.\n\n제출 항목\n1. 최종보고서 PDF\n2. ${context.resultLabel}\n3. 실행 또는 설치 방법\n4. 팀원별 최종 역할 정리\n5. 공개가 어려운 자료의 사유와 대체 설명\n\n제출 기간: ${period(context.submissionStartsAt, context.submissionEndsAt)}\n제출 위치: PMS 팀 공간의 보고서·결과물 메뉴\n파일 점검: 열람 가능 여부, 파일명, 버전, 외부 링크 접근 권한 확인${closing(context, "마감 직전에는 업로드가 지연될 수 있으므로 최소 하루 전에 파일을 등록하고 팀원이 함께 확인해 주세요.")}`,
  },
  {
    key: "presentation",
    title: "최종 발표 자료 및 현장 진행 안내",
    content: (context) => `안녕하세요. ${context.unit}입니다.\n\n최종 발표는 문제 정의, 구현 과정과 검증 결과를 정해진 시간 안에 공유하는 순서로 진행합니다. 발표 자료에는 결과 화면뿐 아니라 선택한 방법의 근거와 한계도 포함해 주세요.\n\n발표 구성\n- 문제와 대상 사용자 소개\n- 핵심 설계 및 구현 내용\n- 시연 또는 결과 분석\n- 수행 중 변경된 범위와 한계\n- 향후 개선 계획\n\n발표 기간: ${period(context.submissionStartsAt, context.submissionEndsAt)}\n진행 장소: ${context.location}\n자료 제출: 발표 전날까지 PMS 결과물 항목에 PDF 등록\n유의 사항: 외부 네트워크가 필요한 시연은 녹화본을 별도로 준비하고 발표 시간을 준수${closing(context, "발표 순서와 팀별 배정 시간은 확정 후 별도 공지에서 확인해 주세요.")}`,
  },
  {
    key: "orientation",
    title: "참여자 오리엔테이션 참석 안내",
    content: (context) => `안녕하세요. ${context.name} 운영팀입니다.\n\n프로그램 운영 방식과 PMS 사용 절차를 설명하기 위한 오리엔테이션을 진행합니다. 처음 참여하는 구성원은 반드시 참석하고, 기존 참여자도 변경된 제출·평가 절차를 확인해 주세요.\n\n주요 안내 내용\n1. 프로그램 목표와 전체 일정\n2. 팀 구성 및 지도 담당자 확인 방법\n3. 보고서·결과물 제출 절차\n4. 공지 확인과 문의 방법\n5. 평가 및 공개 범위\n\n운영 기간: ${period(context.recruitmentStartsAt, context.executionStartsAt)}\n장소: ${context.location}\n준비 사항: 개인 노트북 또는 PMS 접속 가능한 기기\n불참 처리: 사전에 담당자에게 사유를 전달하고 배포 자료 확인${closing(context, "오리엔테이션 이후에는 안내 자료를 기준으로 팀별 초기 설정을 완료해 주세요.")}`,
  },
  {
    key: "mentoring",
    title: "지도·멘토링 신청 및 사전 자료 제출 안내",
    content: (context) => `안녕하세요. ${context.unit}입니다.\n\n팀별 기술·기획 문제를 구체적으로 검토할 수 있도록 지도 및 멘토링 신청을 받습니다. 단순 일정 문의보다 현재 상황과 결정이 필요한 내용을 사전에 정리하면 제한된 면담 시간을 효율적으로 사용할 수 있습니다.\n\n신청 시 작성 항목\n- 현재 진행 단계와 완료한 내용\n- 검토가 필요한 질문 최대 3개\n- 관련 화면, 문서 또는 저장소 링크\n- 참석 예정 팀원\n\n신청 기간: ${period(context.executionStartsAt, context.executionEndsAt)}\n신청 위치: PMS 팀 공간의 지도 요청 메뉴\n면담 장소: ${context.location}\n유의 사항: 신청 후 일정이 확정되기 전까지 담당자 답변을 확인${closing(context, "면담 후 합의한 조치와 담당자를 팀 수행 기록에 남겨 다음 점검에서 확인할 수 있도록 해 주세요.")}`,
  },
  {
    key: "evaluation",
    title: "평가 기준 및 이의 확인 절차 안내",
    content: (context) => `안녕하세요. ${context.name} 평가 운영 기준을 안내드립니다.\n\n평가는 결과물의 완성도만이 아니라 문제 정의, 수행 과정, 검증 근거와 팀 협업 기록을 종합하여 진행합니다. 팀별로 아래 기준을 확인하고 제출 자료에서 해당 근거를 찾을 수 있도록 정리해 주세요.\n\n평가 항목\n1. 문제 정의의 구체성\n2. 설계와 구현의 타당성\n3. 사용자·데이터 기반 검증\n4. 일정 및 역할 관리\n5. 발표와 문서의 전달력\n\n평가 기간: ${period(context.submissionStartsAt, context.endsAt)}\n결과 확인: PMS 팀 평가 화면\n이의 신청: 결과 공개 후 담당자에게 평가 항목과 확인이 필요한 근거를 명시하여 제출\n유의 사항: 단순 점수 상향 요청은 접수하지 않으며 누락 또는 사실관계 오류를 중심으로 확인${closing(context, "평가 전 제출 자료와 PMS 수행 기록이 최신 상태인지 팀 전체가 다시 확인해 주세요.")}`,
  },
  {
    key: "rights",
    title: "개인정보·저작권 및 외부 자료 사용 점검 안내",
    content: (context) => `안녕하세요. ${context.unit}입니다.\n\n결과물 제출과 공개 전에 개인정보, 저작권, 외부 데이터 및 라이선스 사용 상태를 점검해 주세요. 공개 저장소나 발표 자료에 민감한 정보가 포함되면 제출 이후에도 즉시 비공개 처리될 수 있습니다.\n\n필수 점검 사항\n- 실제 사용자 이름, 연락처, 학번 등 개인정보 제거\n- 이미지·폰트·데이터셋의 출처와 이용 조건 표기\n- API 키, 접근 토큰과 비공개 저장소 주소 삭제\n- 생성형 AI 활용 범위와 최종 검토 책임 기록\n- 기업·연구실 비공개 자료의 공개 승인 여부 확인\n\n점검 기간: ${period(context.executionStartsAt, context.submissionEndsAt)}\n확인 자료: 라이선스 목록, 개인정보 비식별 처리 내역, 공개 승인 문서${closing(context, "공개 가능 여부가 불분명한 자료는 임의로 등록하지 말고 제출 전에 담당자와 협의해 주세요.")}`,
  },
  {
    key: "archive",
    title: "프로젝트 결과물 공개 및 아카이브 동의 안내",
    content: (context) => `안녕하세요. ${context.name} 결과물 관리 담당입니다.\n\n우수한 수행 사례를 다음 참여자가 참고할 수 있도록 최종 승인된 결과물을 프로그램 아카이브에 공개합니다. 공개 범위는 팀이 제출한 자료와 동의 상태를 기준으로 결정합니다.\n\n공개 대상\n- 프로젝트명과 팀 소개\n- 요약 설명 및 대표 이미지\n- 발표 영상 또는 시연 영상\n- 공개 저장소와 서비스 링크\n\n확인 기간: ${period(context.submissionStartsAt, context.endsAt)}\n동의 방법: PMS 결과물 화면에서 항목별 공개 가능 여부 확인\n제외 요청: 비공개 사유와 공개 가능한 대체 자료를 담당자에게 전달\n유의 사항: 접근 권한이 필요한 링크와 기간이 만료되는 임시 주소는 공개 항목으로 사용할 수 없음${closing(context, "팀원과 지도 담당자가 공개 범위를 함께 확인한 뒤 최종 동의 상태를 제출해 주세요.")}`,
  },
  {
    key: "certificate",
    title: "수료·참여 확인 자료 발급 안내",
    content: (context) => `안녕하세요. ${context.unit}입니다.\n\n프로그램 종료 후 수료 또는 참여 확인이 필요한 구성원을 위해 발급 기준과 신청 절차를 안내드립니다. 확인 자료는 실제 참여 기록과 필수 제출 항목의 완료 상태를 기준으로 발급합니다.\n\n발급 기준\n1. ${context.participantLabel} 명단에 최종 등록\n2. 필수 일정 및 점검 참여\n3. ${context.resultLabel} 제출 완료\n4. 보완 요청 사항 처리 완료\n\n신청 기간: ${period(context.submissionEndsAt, context.endsAt)}\n신청 방법: 담당자에게 성명, 팀명, 사용 목적과 필요한 문서 형식을 전달\n처리 안내: 신청 내용 확인 후 PMS 등록 이메일로 회신\n유의 사항: 명단 또는 제출 기록이 다른 경우 정정 절차를 먼저 진행${closing(context, "발급이 필요한 날짜를 고려해 여유 있게 신청하고 수신 가능한 이메일인지 확인해 주세요.")}`,
  },
  {
    key: "survey",
    title: "운영 만족도 조사 및 개선 의견 제출 안내",
    content: (context) => `안녕하세요. ${context.name} 운영팀입니다.\n\n다음 운영에서 일정, 지도와 제출 절차를 개선하기 위해 참여자 만족도 조사를 진행합니다. 응답 내용은 프로그램 개선 목적으로만 사용하며 개인 또는 팀 평가 점수에는 반영하지 않습니다.\n\n조사 항목\n- 전체 일정과 공지 전달의 적절성\n- 지도·멘토링의 도움 정도\n- PMS 제출 및 확인 과정의 편의성\n- 팀 활동에서 어려웠던 점\n- 다음 운영에 필요한 지원\n\n조사 기간: ${period(context.submissionEndsAt, context.endsAt)}\n참여 대상: ${context.participantLabel}\n제출 방법: PMS 프로그램 문의에 개선 의견 작성\n유의 사항: 특정 개인에 대한 평가보다 확인 가능한 상황과 개선 제안을 중심으로 작성${closing(context, "프로그램 운영에 반영할 수 있도록 구체적인 경험과 제안을 남겨 주시면 검토 후 다음 회차에 반영하겠습니다.")}`,
  },
];

function announcementId(programIndex: number, announcementIndex: number): string {
  const position = programIndex * 100 + announcementIndex + 1;
  return `a2000000-0000-4000-8000-${String(position).padStart(12, "0")}`;
}

export function buildDemoProgramAnnouncements(
  program: DemoProgramAnnouncementProgram,
  programIndex: number,
): DemoProgramAnnouncement[] {
  const profile = programProfiles[programIndex];
  const count = DEMO_PROGRAM_ANNOUNCEMENT_COUNTS[programIndex];
  if (!profile || count === undefined) {
    throw new Error(`프로그램 공지 프로필이 없습니다: ${program.name}`);
  }
  const context: ProgramNoticeContext = { ...program, ...profile };
  const remaining = noticeTemplates.slice(1);
  const rotation = programIndex % remaining.length;
  const orderedTemplates = [
    noticeTemplates[0],
    ...remaining.slice(rotation),
    ...remaining.slice(0, rotation),
  ].slice(0, count);
  const anchorAt = program.lifecycleStatus === "ACTIVE"
    ? new Date("2026-08-11T09:00:00+09:00")
    : new Date(program.endsAt.getTime() - 30 * 86_400_000);

  return orderedTemplates.map((template, announcementIndex) => {
    if (!template) throw new Error(`프로그램 공지 템플릿이 없습니다: ${program.name}`);
    return {
      id: announcementId(programIndex, announcementIndex),
      title: template.title,
      content: template.content(context),
      pinned: announcementIndex === 0,
      visibility: programIndex === 0 && template.key === "team"
        ? "TARGET_MEMBERS"
        : "AUTHENTICATED",
      createdAt: new Date(anchorAt.getTime() - announcementIndex * 86_400_000),
    };
  });
}
