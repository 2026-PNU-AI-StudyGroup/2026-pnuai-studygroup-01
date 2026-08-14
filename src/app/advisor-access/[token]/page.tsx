import { AdvisorAccessClient } from "./access-client";

export default async function AdvisorAccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <AdvisorAccessClient token={token} />;
}
