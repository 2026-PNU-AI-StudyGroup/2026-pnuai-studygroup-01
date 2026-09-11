import { assertProgramAdmin } from "@/modules/project-program/domain/project-program-policy";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";

/** 팀 하나에 적을 값. 둘 다 빈 값이면 지운다는 뜻이다. */
export type ProgramTeamResultEntry = {
  teamId: string;
  /** 행사에서 매기는 번호. 번호를 안 쓰는 프로그램은 비워 둔다. */
  number: number | null;
  award: string | null;
};

export interface ProgramTeamResultWriter {
  /** 고친 줄 수를 돌려준다. 프로그램에 속하지 않는 팀은 세지 않는다. */
  saveResults(programId: string, entries: readonly ProgramTeamResultEntry[]): Promise<number>;
}

/**
 * 집계표에서 정하는 팀 값을 적는다.
 *
 * 번호와 수상 내역 둘 다 그 표를 보고 정하므로 한 번에 저장한다.
 *
 * 상 이름은 정해진 목록이 없는 자유 문자열이다. 해커톤은 대상·최우수상, 캡스톤은 금상처럼
 * 프로그램마다 부르는 이름이 다르다. 한 팀이 상을 둘 받으면 가운뎃점으로 이어 적는다.
 * 인기상은 표로 정해지므로 여기서 적지 않는다. 화면이 득표에서 따로 계산한다.
 */
export class ProgramTeamResultService {
  constructor(private readonly repository: ProgramTeamResultWriter) {}

  async save(actor: CurrentActor, programId: string, entries: readonly ProgramTeamResultEntry[]): Promise<number> {
    assertProgramAdmin(actor);
    return await this.repository.saveResults(programId, entries);
  }
}
