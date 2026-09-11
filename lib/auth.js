import { supabaseAdmin } from "./supabaseAdmin.js";

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "unauthorized", message: "Missing bearer token." });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: "unauthorized", message: "Invalid or expired session - please sign in again." });
  }

  req.userId = data.user.id;
  next();
}
