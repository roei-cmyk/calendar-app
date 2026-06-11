// Seeds an admin user and one user per client.
// Usage:  node scripts/seed-users.mjs
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local
//
// The secret key bypasses RLS — run this locally only, never ship it.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- tiny .env.local loader (no dependency) ---
function loadEnv() {
  try {
    const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* ignore */
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret || url.includes("YOUR-PROJECT-REF") || secret.includes("xxx")) {
  console.error(
    "❌ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.",
  );
  process.exit(1);
}

const admin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// One login per client (matched by the slug seeded in schema.sql).
const CLIENT_USERS = [
  { slug: "kalkalit-lod", email: "kalkalit@knbl.test", name: "כלכלית לוד" },
  { slug: "safari-rg", email: "safari@knbl.test", name: "ספארי רמת גן" },
  { slug: "carters", email: "carters@knbl.test", name: "קרטרס" },
  { slug: "skip-hop", email: "skiphop@knbl.test", name: "סקיפ הופ" },
  { slug: "roladin", email: "roladin@knbl.test", name: "רולדין" },
  { slug: "museums-pt", email: "museums@knbl.test", name: 'קריית המוזיאונים פ"ת' },
];

const DEFAULT_PASSWORD = "Knbl2026!";

async function ensureUser(email, fullName) {
  // create-or-fetch the auth user
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error && !error.message.toLowerCase().includes("already")) throw error;

  if (data?.user) return data.user.id;

  // already existed — find it
  const { data: list } = await admin.auth.admin.listUsers();
  const found = list.users.find((u) => u.email === email);
  if (!found) throw new Error(`Could not resolve user ${email}`);
  return found.id;
}

async function main() {
  const { data: clients, error: cErr } = await admin.from("clients").select("*");
  if (cErr) throw cErr;
  const bySlug = new Map(clients.map((c) => [c.slug, c]));

  // Admin
  const adminId = await ensureUser("admin@knbl.test", "מנהל KNBL");
  await admin
    .from("profiles")
    .upsert({ id: adminId, full_name: "מנהל KNBL", role: "admin", client_id: null });
  console.log("✓ admin@knbl.test (admin)");

  // Client users
  for (const u of CLIENT_USERS) {
    const client = bySlug.get(u.slug);
    if (!client) {
      console.warn(`! client slug not found: ${u.slug} — run schema.sql first`);
      continue;
    }
    const id = await ensureUser(u.email, u.name);
    await admin
      .from("profiles")
      .upsert({ id, full_name: u.name, role: "client", client_id: client.id });
    console.log(`✓ ${u.email} (client → ${u.name})`);
  }

  console.log(`\nDone. All passwords: ${DEFAULT_PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
