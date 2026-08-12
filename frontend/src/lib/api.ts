const API_BASE = "/api";

// ── Types ──────────────────────────────────────────────
export interface Stats {
  discovered: number;
  applied: number;
  interviews: number;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  url: string;
  status: string;
  date_applied: string | null;
  match_score?: number;
}

export interface AgentLog {
  agent: string;
  message: string;
  time: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  skills: string[];
  experience: {
    company: string;
    role: string;
    start_date: string;
    end_date?: string;
    responsibilities: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    graduation_date?: string;
    gpa?: string;
  }[];
}

export interface TestApplyResult {
  status: string;
  message: string;
  job: {
    id: string;
    title: string;
    company: string;
    status: string;
    tailored_resume_path: string;
  };
  branding: {
    linkedin_post: string;
  };
  tracker_intent: string;
}

export interface BrandingPost {
  id?: string;
  agent: string;
  message: string;
  time: string;
  type: "linkedin" | "github";
}

export interface EmailLog {
  id: string;
  timestamp: string;
  direction: "outbound" | "inbound";
  recipient_name?: string;
  recipient_email?: string;
  company?: string;
  subject?: string;
  body?: string;
  classification?: "Interview" | "Rejected" | "Interested" | "Pending";
  status: string;
}

// ── Fetch Helpers ──────────────────────────────────────
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function postJSON<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: body instanceof FormData ? {} : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── API Functions ──────────────────────────────────────
export const api = {
  health: () => fetchJSON<{ status: string }>("/health"),

  stats: () => fetchJSON<Stats>("/stats"),

  applications: () =>
    fetchJSON<{ applications: Application[] }>("/applications").then((r) => r.applications),

  logs: () => fetchJSON<{ logs: AgentLog[] }>("/logs").then((r) => r.logs),

  onboard: (formData: FormData) => postJSON<{ message: string; profile: UserProfile }>("/onboard", formData),

  startAgents: () => postJSON<{ message: string }>("/start-agents"),

  testApply: () => postJSON<TestApplyResult>("/test-apply"),

  pipeline: () => fetchJSON<{ stages: Record<string, Application[]> }>("/pipeline"),

  resumeHtml: (jobId: string) => fetchJSON<{ html: string; job_title: string; company: string }>(`/resume/${jobId}`),

  brandingPosts: () => fetchJSON<{ posts: BrandingPost[] }>("/branding/posts").then((r) => r.posts),

  generateBrandingPost: (type: string) =>
    postJSON<{ post: string }>("/branding/generate", { type }),

  emails: (params?: { direction?: string; classification?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchJSON<{ emails: EmailLog[] }>(`/emails?${query}`).then((r) => r.emails);
  },

  uploadHrContacts: (formData: FormData) =>
    postJSON<{ message: string; count: number }>("/hr-contacts/upload", formData),
};

