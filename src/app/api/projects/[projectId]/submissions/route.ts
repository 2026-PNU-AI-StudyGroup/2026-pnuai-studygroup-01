import { downloadProjectSubmissions } from "@/app/api/projects/[projectId]/submissions/_lib/download-project-submissions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  return downloadProjectSubmissions(projectId);
}
