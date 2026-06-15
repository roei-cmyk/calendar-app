import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { Planner } from "@/components/Planner";
import { ClientFeed } from "@/components/ClientFeed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  if (ctx.profile.role === "client") {
    const client = ctx.clients[0];
    return (
      <ClientFeed
        profile={ctx.profile}
        clientName={client?.name ?? "לקוח"}
      />
    );
  }

  return <Planner profile={ctx.profile} clients={ctx.clients} />;
}
