import { redirect } from "next/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ mockLogin?: string }>;
}) {
  const params = await searchParams;
  redirect(params?.mockLogin === "seed-required" ? "/?mockLogin=seed-required" : "/");
}
