import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { Planner } from "@/components/Planner";
import { ClientFeed } from "@/components/ClientFeed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  // Client users get their own dedicated approval feed
  if (ctx.profile.role === "client") {
    const clientName = ctx.clients[0]?.name ?? "";
    return <ClientFeed profile={ctx.profile} clientName={clientName} />;
  }

  return <Planner profile={ctx.profile} clients={ctx.clients} />;
}
