import type {
  Company, CompanyInput, Criteria, Drive, Opportunity, OpportunityType, PageOf, Talk,
} from "./types";

/** Calls the back end. If a shared API client arrives from the team, only this file changes. */
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? 'https://placement-assistant-backend-hyfp.onrender.com' : '')
).replace(/\/$/, '');
const ROOT = `${API_BASE}/api/v1`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${ROOT}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.message ?? message;
    } catch {
      /* the response may not be JSON */
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const drivesApi = {
  companies: (page = 0) => request<PageOf<Company>>(`/companies?page=${page}&size=20`),
  createCompany: (input: CompanyInput) =>
    request<Company>("/companies", { method: "POST", body: JSON.stringify(input) }),

  upcomingDrives: (page = 0) => request<PageOf<Drive>>(`/drives/upcoming?page=${page}&size=20`),
  drive: (id: number) => request<Drive>(`/drives/${id}`),
  criteria: (driveId: number) => request<Criteria>(`/drives/${driveId}/criteria`),

  talks: (page = 0) => request<PageOf<Talk>>(`/talks?page=${page}&size=20`),

  opportunities: (type?: OpportunityType, page = 0) => {
    const params = new URLSearchParams({ page: String(page), size: "20" });
    if (type) params.set("type", type);
    return request<PageOf<Opportunity>>(`/opportunities?${params.toString()}`);
  },
};
