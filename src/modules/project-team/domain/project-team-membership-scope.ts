/**
 * 한 학생은 한 프로그램에서 프로젝트 팀 하나에만 속한다.
 *
 * 예전에는 검사가 "같은 프로젝트에 이미 속했는지" 였다. 그래서 같은 프로그램의 다른
 * 프로젝트에는 얼마든지 더 들어갈 수 있었고, 지원 경로와 초대 경로 모두 통과했다. 실제로
 * 학생 하나를 같은 프로그램의 팀 두 개에 넣어 봤고 화면은 깨지지 않았다.
 *
 * 졸업과제처럼 한 사람이 한 프로젝트만 수행하는 운영이 기본이라 프로그램 단위로 막는다.
 * 검사가 네 곳(개인 지원·팀 지원·초대 보내기·초대 수락)에 흩어져 있었기 때문에 한 곳만
 * 고치면 다른 경로로 다시 들어온다. 조건을 여기 한 번만 적는다.
 *
 * 끝난 소속(endedAt)은 세지 않는다. 팀에서 나간 학생은 다시 지원할 수 있어야 한다.
 */
export function activeProjectTeamMembershipInProgram(programId: string) {
  return { endedAt: null, projectTeam: { project: { programId } } };
}

/** 위 조건을 사용자 쪽에서 물을 때 쓰는 형태. `user.projectTeamMemberships` 를 건다. */
export function belongsToProjectTeamInProgram(programId: string) {
  return { projectTeamMemberships: { some: activeProjectTeamMembershipInProgram(programId) } };
}
