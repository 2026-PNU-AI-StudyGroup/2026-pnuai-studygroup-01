"use client";

import { useId, useRef } from "react";

import type { ArchivedProject } from "@/modules/team/application/archive-projects";
import { TranslatedText } from "@/shared/ui/translated-text";

const artifactType = { PRESENTATION_VIDEO: "발표 영상", SOURCE_CODE: "소스 코드", POSTER: "포스터", OTHER: "기타" } as const;

export function PastProjectDetails({ project }: { project: ArchivedProject }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <button type="button" className="button-quiet col-span-2 justify-self-start px-0 text-[var(--primary)] lg:col-span-5" onClick={() => dialogRef.current?.showModal()}>설명과 결과물 보기</button>
      <dialog ref={dialogRef} aria-labelledby={titleId} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-xl border border-[var(--line-strong)] bg-white p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[rgba(23,32,51,.48)]">
        <div className="flex items-start justify-between gap-6 border-b border-[var(--line)] px-5 py-5 sm:px-7"><div><p className="eyebrow">{project.academicYear} · {project.programName}</p><h3 id={titleId} className="mt-2 text-2xl font-extrabold tracking-[-0.035em]">{project.topicTitle}</h3><p className="muted mt-2 text-sm">{project.teamName} · {project.professorName} 교수</p></div><button type="button" aria-label="지난 프로젝트 상세 닫기" onClick={() => dialogRef.current?.close()} className="button-quiet min-w-11 shrink-0 px-0 text-xl">×</button></div>
        <div className="grid gap-8 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div><h4 className="font-extrabold">프로젝트 설명</h4><TranslatedText text={project.topicDescription} className="muted mt-3 whitespace-pre-wrap leading-7" /><p className="muted mt-5 text-sm">참여자 {project.memberNames.join(", ")}</p></div>
          <div><h4 className="font-extrabold">공개 결과물</h4>{project.artifacts.length ? <ul className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">{project.artifacts.map((artifact) => <li key={artifact.id}>{artifact.fileId ? <a className="button-quiet min-h-11 w-full justify-start px-0 text-left text-[var(--primary)]" href={`/api/files/${artifact.fileId}`}>{artifactType[artifact.type]} · {artifact.title}</a> : artifact.externalUrl ? <a className="button-quiet min-h-11 w-full justify-start px-0 text-left text-[var(--primary)]" href={artifact.externalUrl} target="_blank" rel="noreferrer">{artifactType[artifact.type]} · {artifact.title}<span className="sr-only"> 새 창</span></a> : <span className="muted flex min-h-11 items-center text-sm">{artifactType[artifact.type]} · {artifact.title}</span>}</li>)}</ul> : <p className="muted mt-3 text-sm">공개된 결과물이 없습니다.</p>}</div>
        </div>
      </dialog>
    </>
  );
}
