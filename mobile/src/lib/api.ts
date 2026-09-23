import { supabase } from "./supabase";

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

export type Material = { name: string; qty: string; cost: string; owned: boolean };
export type Step = { text: string; done: boolean };

export type Project = {
  id: string;
  title: string;
  category: string;
  sourceUrl: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  estTime: string;
  estCost: string;
  tools: string[];
  materials: Material[];
  steps: Step[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type ProjectDraft = {
  title: string;
  category: string;
  difficulty: string;
  estTime: string;
  estCost: string;
  tools: string[];
  materials: { name: string; qty: string; cost: string }[];
  steps: string[];
  tags: string[];
  sourceUrl?: string | null;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function authedFetch(path: string, options: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  if (options.body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let body: any = {};
    try {
      body = await res.json();
    } catch {
      // no JSON body (e.g. a plain 404/500 with no payload)
    }
    throw new ApiError(body.message || `Request failed (${res.status})`, res.status, body.error);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function extractProject(input: { sourceUrl?: string; title?: string; rawText: string }): Promise<{ draft: ProjectDraft }> {
  return authedFetch("/api/extract", { method: "POST", body: JSON.stringify(input) });
}

export function fetchOEmbed(url: string): Promise<{ title: string | null; authorName: string | null; description: string | null }> {
  return authedFetch(`/api/oembed?url=${encodeURIComponent(url)}`);
}

export function listProjects(filters: { q?: string; category?: string; tag?: string } = {}): Promise<Project[]> {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.tag) params.set("tag", filters.tag);
  return authedFetch(`/api/projects?${params.toString()}`);
}

export function getProject(id: string): Promise<Project> {
  return authedFetch(`/api/projects/${id}`);
}

export function createProject(draft: ProjectDraft): Promise<Project> {
  return authedFetch("/api/projects", { method: "POST", body: JSON.stringify(draft) });
}

export function updateProject(id: string, fields: Partial<ProjectDraft>): Promise<Project> {
  return authedFetch(`/api/projects/${id}`, { method: "PUT", body: JSON.stringify(fields) });
}

export function toggleStep(id: string, index: number): Promise<Project> {
  return authedFetch(`/api/projects/${id}/steps/${index}`, { method: "PATCH" });
}

export function toggleMaterial(id: string, index: number): Promise<Project> {
  return authedFetch(`/api/projects/${id}/materials/${index}`, { method: "PATCH" });
}

export function deleteProject(id: string): Promise<null> {
  return authedFetch(`/api/projects/${id}`, { method: "DELETE" });
}

export function sendWelcomeEmail(): Promise<null> {
  return authedFetch("/api/welcome-email", { method: "POST" });
}
