import type { PrismaClient } from "@/generated/prisma/client";
import type { ProgramAwardEntry, ProgramAwardWriter } from "@/modules/team/application/manage-program-awards";

export class PrismaProgramAwardRepository implements ProgramAwardWriter {
  constructor(private readonly client: PrismaClient) {}

  /**
   * 팀 id 만 믿지 않고 프로그램까지 걸어 고친다.
   *
   * 화면이 보낸 팀 id 를 그대로 쓰면 다른 프로그램 팀 id 를 끼워 넣어 남의 상을 바꿀 수
   * 있다. `updateMany` 에 프로그램 조건을 같이 걸면 안 맞는 줄은 0건으로 지나간다.
   * 한 번에 다 되거나 하나도 안 되게 트랜잭션으로 묶는다.
   */
  async saveAwards(programId: string, entries: readonly ProgramAwardEntry[]): Promise<number> {
    if (entries.length === 0) return 0;
    const results = await this.client.$transaction(entries.map(({ teamId, award }) =>
      this.client.projectTeam.updateMany({
        where: { id: teamId, project: { programId } },
        data: { award },
      })));
    return results.reduce((sum, { count }) => sum + count, 0);
  }
}
