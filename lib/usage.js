import { supabaseAdmin } from "./supabaseAdmin.js";

const DAILY_LIMIT = Number(process.env.DAILY_EXTRACTION_LIMIT || 20);

// Returns true if the user is still within today's cap (and records this
// call against it); false if they've hit DAILY_EXTRACTION_LIMIT.
export async function checkAndIncrementDailyUsage(userId) {
  const { data, error } = await supabaseAdmin.rpc("increment_extraction_usage", {
    p_user_id: userId,
    p_limit: DAILY_LIMIT,
  });
  if (error) throw error;
  return data === true;
}

export { DAILY_LIMIT };
