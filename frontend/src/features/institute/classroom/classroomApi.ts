import type {
  AttendanceRow, AttendanceSummary, ClassSession, CrtSession,
  Question, TeacherProfile, TimetableSlot,
} from "./types";

/**
 * Thin module-specific API wrapper.
 * If the shared services/apiClient.ts already handles JWT/session headers,
 * replace request() with that client's request method; do not duplicate auth.
 */
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
      message = body.message ?? body.detail ?? message;
    } catch { /* response may not be JSON */ }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const classroomApi = {
  teachers: () => request<TeacherProfile[]>("/teachers"),
  timetable: () => request<TimetableSlot[]>("/timetable/slots"),
  createSlot: (slot: Omit<TimetableSlot, "id">) =>
    request<TimetableSlot>("/timetable/slots", { method: "POST", body: JSON.stringify(slot) }),
  sessions: (date: string) => request<ClassSession[]>(`/class-sessions?date=${encodeURIComponent(date)}`),
  createSession: (session: Omit<ClassSession, "id">) =>
    request<ClassSession>("/class-sessions", { method: "POST", body: JSON.stringify(session) }),
  markAttendance: (sessionId: number, records: AttendanceRow[]) =>
    request<void>(`/class-sessions/${sessionId}/attendance`, {
      method: "POST", body: JSON.stringify({ records }),
    }),
  attendanceSummary: (studentId: number) =>
    request<AttendanceSummary>(`/students/${studentId}/attendance-summary`),
  hodDashboard: () => request<AttendanceSummary[]>("/hod/dashboard"),
  crtSessions: () => request<CrtSession[]>("/crt/sessions"),
  createCrtSession: (session: Omit<CrtSession, "id">) =>
    request<CrtSession>("/crt/sessions", { method: "POST", body: JSON.stringify(session) }),
  markCrtAttendance: (sessionId: number, studentIds: number[]) =>
    request<void>(`/crt/sessions/${sessionId}/attendance`, {
      method: "POST", body: JSON.stringify({ studentIds }),
    }),
  questions: (filters?: { company?: string; round?: string; topic?: string }) => {
    const params = new URLSearchParams();
    Object.entries(filters ?? {}).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return request<Question[]>(`/question-bank${params.size ? `?${params}` : ""}`);
  },
  createQuestion: (question: Omit<Question, "id" | "approved">) =>
    request<Question>("/question-bank", { method: "POST", body: JSON.stringify(question) }),
  approveQuestion: (id: number) =>
    request<Question>(`/question-bank/${id}/approve`, { method: "PATCH" }),
};
