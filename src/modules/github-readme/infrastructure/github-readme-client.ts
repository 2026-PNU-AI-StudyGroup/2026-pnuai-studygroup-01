import { detectRasterImageType, type RasterImageType } from "@/modules/file/domain/upload-policy";
import {
  firstReadmeImage,
  isAllowedGithubAssetUrl,
  pickTitle,
  readmeTitleAndSummary,
  type GithubRepo,
} from "@/modules/github-readme/domain/readme";

export type ReadmePreview = { title: string; summary: string; imageUrl: string | null };
export type ReadmeFailure = "NOT_FOUND" | "NO_README" | "UNAVAILABLE";
export type ReadmeResult = { ok: true; preview: ReadmePreview } | { ok: false; reason: ReadmeFailure };

export const GITHUB_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 8_000;
const README_MAX_CHARS = 200_000;
const MAX_REDIRECTS = 3;

/** 읽지 않을 응답 본문을 닫아 연결을 돌려준다. */
async function discard(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => undefined);
}

type ClientOptions = { fetch?: typeof fetch; token?: string };

function headers(accept: string, token?: string): Record<string, string> {
  return {
    Accept: accept,
    "User-Agent": "pnu-aipms",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** 공개 레포의 README 를 읽어 카드 후보를 만든다. 비로그인 한도는 서버 IP 당 시간당 60회다. */
export async function fetchGithubReadme(repo: GithubRepo, options: ClientOptions = {}): Promise<ReadmeResult> {
  const request = options.fetch ?? fetch;
  const base = `https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`;
  try {
    const repoResponse = await request(base, {
      headers: headers("application/vnd.github+json", options.token),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (repoResponse.status === 404) {
      await discard(repoResponse);
      return { ok: false, reason: "NOT_FOUND" };
    }
    if (!repoResponse.ok) {
      await discard(repoResponse);
      return { ok: false, reason: "UNAVAILABLE" };
    }
    const meta = (await repoResponse.json()) as { default_branch?: string; description?: string | null; name?: string };

    const readmeResponse = await request(`${base}/readme`, {
      headers: headers("application/vnd.github.raw", options.token),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (readmeResponse.status === 404) {
      await discard(readmeResponse);
      return { ok: false, reason: "NO_README" };
    }
    if (!readmeResponse.ok) {
      await discard(readmeResponse);
      return { ok: false, reason: "UNAVAILABLE" };
    }
    const markdown = (await readmeResponse.text()).slice(0, README_MAX_CHARS);

    const { title, summary } = readmeTitleAndSummary(markdown);
    return {
      ok: true,
      preview: {
        title: pickTitle({ readmeTitle: title, description: meta.description ?? null, repoName: meta.name ?? repo.repo }).slice(0, 200),
        summary,
        imageUrl: firstReadmeImage(markdown, { ...repo, branch: meta.default_branch ?? "main" }),
      },
    };
  } catch {
    return { ok: false, reason: "UNAVAILABLE" };
  }
}

async function readCapped(body: ReadableStream<Uint8Array>, max: number): Promise<Uint8Array | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * README 그림을 받는다. 리다이렉트는 손으로 따라가며 매번 허용 주소를 다시 본다.
 * 형식은 앞 바이트로 판단한다(PNG, JPEG, WebP). SVG 는 받지 않는다.
 */
export async function downloadGithubImage(
  url: string,
  options: ClientOptions = {},
): Promise<{ bytes: Uint8Array; contentType: RasterImageType } | null> {
  const request = options.fetch ?? fetch;
  let current = url;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      if (!isAllowedGithubAssetUrl(current)) return null;
      const response = await request(current, {
        redirect: "manual",
        headers: { "User-Agent": "pnu-aipms" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.status >= 300 && response.status < 400) {
        await discard(response);
        const location = response.headers.get("location");
        if (!location) return null;
        current = new URL(location, current).toString();
        continue;
      }
      if (!response.ok || !response.body) {
        await discard(response);
        return null;
      }
      if (Number(response.headers.get("content-length") ?? 0) > GITHUB_IMAGE_MAX_BYTES) {
        await discard(response);
        return null;
      }
      const bytes = await readCapped(response.body, GITHUB_IMAGE_MAX_BYTES);
      if (!bytes) return null;
      const contentType = detectRasterImageType(bytes);
      return contentType ? { bytes, contentType } : null;
    }
    return null;
  } catch {
    return null;
  }
}
