export function parseGithubRepo(url: string | null | undefined): { owner: string; repo: string } | null {
  if (!url) return null;
  const match = url.match(/github\.com\/([^/\s]+)\/([^/?#\s]+)/i);
  return match ? { owner: match[1]!, repo: match[2]!.replace(/\.git$/i, "") } : null;
}

export type RepositoryArtifact = { id: string; type: string; externalUrl?: string | null };

/**
 * 화면에 내보일 저장소를 고른다.
 *
 * 주제에 적어 둔 주소가 먼저고, 없으면 소스 코드 결과물에서 찾는다. 심사가 리드미를
 * 읽고 이뤄지므로 프로젝트 상세 맨 위, 결과물 목록, 공개 아카이브 카드가 모두 이 값을 쓴다.
 * 서로 다른 저장소를 가리키지 않도록 고르는 자리를 하나로 둔다. 공개 아카이브는 다른
 * 라우트라 `/topics` 안의 코드를 가져갈 수 없어 모듈에 둔다.
 */
export function resolveShowcaseRepository(input: { artifacts: readonly RepositoryArtifact[]; sourceUrl?: string | null }): {
  url: string;
  owner: string;
  repo: string;
  artifactId?: string;
} | null {
  const sourceArtifact = input.artifacts.find(
    (artifact) => artifact.type === "SOURCE_CODE" && /github\.com/i.test(artifact.externalUrl ?? ""),
  );
  const url = /github\.com/i.test(input.sourceUrl ?? "") ? input.sourceUrl : sourceArtifact?.externalUrl;
  const parsed = parseGithubRepo(url);
  if (!parsed || !url) return null;
  return {
    url,
    ...parsed,
    artifactId: url === sourceArtifact?.externalUrl ? sourceArtifact?.id : undefined,
  };
}
