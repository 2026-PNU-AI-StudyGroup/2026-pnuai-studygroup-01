import { assertProgramAdmin } from "@/modules/project-program/domain/project-program-policy";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";

/** 팀 하나에 적을 수상 내역. 빈 값은 상을 지운다는 뜻이다. */
export type ProgramAwardEntry = { teamId: string; award: string | null };

export interface ProgramAwardWriter {
  /** 고친 줄 수를 돌려준다. 프로그램에 속하지 않는 팀은 세지 않는다. */
  saveAwards(programId: string, entries: readonly ProgramAwardEntry[]): Promise<number>;
}

/**
 * 오프라인 심사로 정해진 수상 내역을 적는다.
 *
 * 상 이름은 정해진 목록이 없는 자유 문자열이다. 해커톤은 대상·최우수상, 캡스톤은 금상처럼
 * 프로그램마다 부르는 이름이 다르다. 한 팀이 상을 둘 받으면 가운뎃점으로 이어 적는다.
 * 인기상은 표로 정해지므로 여기서 적지 않는다. 화면이 득표에서 따로 계산한다.
 */
export class ProgramAwardService {
  constructor(private readonly repository: ProgramAwardWriter) {}

  async save(actor: CurrentActor, programId: string, entries: readonly ProgramAwardEntry[]): Promise<number> {
    assertProgramAdmin(actor);
    return await this.repository.saveAwards(programId, entries);
  }
}
