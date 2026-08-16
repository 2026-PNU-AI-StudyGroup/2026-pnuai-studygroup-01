import { downloadProgramSubmissions } from "@/app/api/programs/[programId]/submissions/_lib/download-program-submissions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ programId: string }> },
) {
  const { programId } = await params;
  const requested = new URL(request.url).searchParams.get("teams");
  const teamIds = requested
    ? requested.split(",").map((value) => value.trim()).filter(Boolean)
    : null;
  return downloadProgramSubmissions(programId, teamIds);
}
