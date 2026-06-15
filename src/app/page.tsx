import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { Planner } from "@/components/Planner";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  return <Planner profile={ctx.profile} clients={ctx.clients} />;
}
