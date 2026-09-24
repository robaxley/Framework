import { supabaseAdmin } from "./supabaseAdmin.js";

function toApiShape(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    sourceUrl: row.source_url,
    difficulty: row.difficulty,
    estTime: row.est_time,
    estCost: row.est_cost,
    tools: row.tools || [],
    materials: row.materials || [],
    steps: row.steps || [],
    tags: row.tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Preserves an existing boolean owned/done flag (from toggleMaterial/toggleStep
// re-saving the full array, or an update() caller-supplied fallback keyed by
// name/text); defaults to false otherwise - a brand-new item, or one with no
// match in the caller's fallback.
function normalizeMaterial(m, fallbackOwned = false) {
  return {
    name: m.name || "",
    qty: m.qty || "",
    cost: m.cost || "",
    owned: typeof m.owned === "boolean" ? m.owned : fallbackOwned,
  };
}

function normalizeStep(s, fallbackDone = false) {
  const text = typeof s === "string" ? s : s.text || "";
  const done = typeof s === "object" && typeof s.done === "boolean" ? s.done : fallbackDone;
  return { text, done };
}

export async function getAll(userId, { category, q, tag } = {}) {
  let query = supabaseAdmin.from("projects").select("*").eq("user_id", userId);
  if (category && category !== "All") query = query.eq("category", category);
  if (tag) query = query.contains("tags", [tag]);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;

  let rows = data;
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(
      (r) => r.title.toLowerCase().includes(needle) || (r.tags || []).some((t) => t.toLowerCase().includes(needle))
    );
  }
  return rows.map(toApiShape);
}

export async function getById(userId, id) {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toApiShape(data) : null;
}

export async function create(userId, data) {
  const row = {
    user_id: userId,
    title: data.title || "Untitled Project",
    category: data.category || "Other",
    source_url: data.sourceUrl || null,
    difficulty: data.difficulty || "beginner",
    est_time: data.estTime || "",
    est_cost: data.estCost || "",
    tools: Array.isArray(data.tools) ? data.tools : [],
    materials: (Array.isArray(data.materials) ? data.materials : []).map(normalizeMaterial),
    steps: (Array.isArray(data.steps) ? data.steps : []).map(normalizeStep),
    tags: Array.isArray(data.tags) ? data.tags : [],
  };

  const { data: created, error } = await supabaseAdmin.from("projects").insert(row).select().single();
  if (error) throw error;
  return toApiShape(created);
}

const FIELD_MAP = {
  title: "title",
  category: "category",
  sourceUrl: "source_url",
  difficulty: "difficulty",
  estTime: "est_time",
  estCost: "est_cost",
  tools: "tools",
  tags: "tags",
};

export async function update(userId, id, fields) {
  const row = {};
  for (const [apiKey, column] of Object.entries(FIELD_MAP)) {
    if (fields[apiKey] !== undefined) row[column] = fields[apiKey];
  }

  // An edited draft (from the mobile Edit screen) carries no owned/done flags
  // at all - without this, re-saving one would silently wipe every checked
  // item. Match incoming items against the current row by name/text so
  // progress survives an edit; a genuinely new item still defaults to false.
  if (fields.materials !== undefined || fields.steps !== undefined) {
    const existing = await getById(userId, id);
    if (fields.materials !== undefined) {
      const ownedByName = new Map((existing?.materials || []).map((m) => [m.name, m.owned]));
      row.materials = fields.materials.map((m) => normalizeMaterial(m, ownedByName.get(m.name)));
    }
    if (fields.steps !== undefined) {
      const doneByText = new Map((existing?.steps || []).map((s) => [s.text, s.done]));
      row.steps = fields.steps.map((s) => {
        const text = typeof s === "string" ? s : s.text || "";
        return normalizeStep(s, doneByText.get(text));
      });
    }
  }
  row.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("projects")
    .update(row)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? toApiShape(data) : null;
}

export async function toggleStep(userId, id, index, done) {
  const project = await getById(userId, id);
  if (!project || !project.steps[index]) return null;
  const steps = project.steps.slice();
  steps[index] = { ...steps[index], done: done ?? !steps[index].done };
  return update(userId, id, { steps });
}

export async function toggleMaterial(userId, id, index, owned) {
  const project = await getById(userId, id);
  if (!project || !project.materials[index]) return null;
  const materials = project.materials.slice();
  materials[index] = { ...materials[index], owned: owned ?? !materials[index].owned };
  return update(userId, id, { materials });
}

export async function remove(userId, id) {
  const { error, count } = await supabaseAdmin
    .from("projects")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
  return (count || 0) > 0;
}
