import { createClient } from "@supabase/supabase-js";

// Secret-key client (BYPASSRLS). Server-side only — never send this key,
// or a client built from it, to the browser or the mobile app.
export const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
