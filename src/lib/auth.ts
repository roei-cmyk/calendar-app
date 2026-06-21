import { createClient } from "@/lib/supabase/server";
import type { Client, Profile } from "@/lib/types";

/**
 * Loads the signed-in user's profile and the clients they are allowed to see.
 * Returns null when there is no authenticated user.
 */
export async function getSessionContext(): Promise<{
  profile: Profile;
  clients: Client[];
} | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) return null;

  // RLS already restricts what a client can read, so a plain select returns
  // all clients for admins and only the assigned client for client users.
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });

  const PINNED = ["כלכלית לוד", "רולדין", "ספארי"];
  const sorted = (clients ?? []).slice().sort((a, b) => {
    const ai = PINNED.findIndex(p => a.name.includes(p) || p.includes(a.name));
    const bi = PINNED.findIndex(p => b.name.includes(p) || p.includes(b.name));
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.name.localeCompare(b.name, "he");
  });

  return { profile, clients: sorted };
}
