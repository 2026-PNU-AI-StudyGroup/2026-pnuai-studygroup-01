"use server";

import { redirect } from "next/navigation";

import { parseGithubRepo } from "@/modules/github-readme/domain/readme";
import { takeGithubQuota } from "@/modules/github-readme/infrastructure/github-rate-limit";
import { fetchGithubReadme, type ReadmePreview } from "@/modules/github-readme/infrastructure/github-readme-client";
import { README_FAILURE_MESSAGES } from "@/modules/github-readme/ui/github-readme-messages";
import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";

/** 프로젝트 만들기 화면에서 README 로 제목과 설명을 미리 채운다. 아무것도 저장하지 않는다. */
export async function previewGithubReadmeAction(
  repoUrl: string,
): Promise<{ status: "success"; preview: ReadmePreview } | { status: "error"; message: string }> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const repo = parseGithubRepo(String(repoUrl).slice(0, 2048));
  if (!repo) return { status: "error", message: README_FAILURE_MESSAGES.NO_REPO };
  if (!takeGithubQuota(actor.id)) return { status: "error", message: README_FAILURE_MESSAGES.RATE_LIMITED };
  const result = await fetchGithubReadme(repo, { token: process.env.GITHUB_TOKEN || undefined });
  return result.ok
    ? { status: "success", preview: result.preview }
    : { status: "error", message: README_FAILURE_MESSAGES[result.reason] };
}
