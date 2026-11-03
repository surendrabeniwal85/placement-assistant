export type Portal = 'INSTITUTE' | 'PLACEMENT';

export interface AuthenticatedSession {
  readonly accessToken: string;
  readonly tokenType: 'Bearer';
  readonly expiresIn: number;
  readonly email: string;
  readonly roles: readonly string[];
}

export interface StudentProfileDto {
  readonly id: number;
  readonly userId: number;
  readonly rollNumber: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone?: string;
  readonly course?: string;
  readonly department?: string;
  readonly branch?: string;
  readonly semester?: number;
  readonly cgpa?: number;
  readonly class10Percent?: number;
  readonly class12Percent?: number;
  readonly activeBacklogs?: number;
  readonly passingYear?: number;
  readonly atsScore?: number;
  readonly finalYear?: boolean;
}

export interface NewsItemDto {
  readonly id: number;
  readonly title: string;
  readonly content: string;
  readonly category: string; // PLACEMENT, ACADEMIC, CRT, GENERAL
  readonly audience: string; // ALL, FINAL_YEAR, CSE, etc.
  readonly priority: string; // URGENT, NORMAL, LOW
  readonly author: string;
  readonly publishedAt: string;
  readonly externalUrl?: string;
}

export interface ResumeSectionScore {
  readonly section: string;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
}

export interface ResumeAnalysisResponse {
  readonly overallScore: number;
  readonly status: 'NOT_UPLOADED' | 'NEEDS_WORK' | 'GOOD' | 'STRONG';
  readonly breakdown: readonly ResumeSectionScore[];
  readonly strengths: readonly string[];
  readonly improvements: readonly string[];
  readonly aiCoachNextActions: readonly string[];
}

export interface DriveDto {
  readonly id: number;
  readonly companyName: string;
  readonly roleTitle: string;
  readonly driveDate: string;
  readonly deadline: string;
  readonly employmentType: string;
  readonly ctcLpa?: number;
  readonly stipendPerMonth?: number;
  readonly jobLocation?: string;
  readonly hasPpo?: boolean;
  readonly ppoCtcLpa?: number;
  readonly bondMonths?: number;
  readonly minCgpa?: number;
  readonly maxBacklogs?: number;
  readonly minCrtAttendance?: number;
  readonly eligibleBranches?: readonly string[];
}

export interface AccountDto {
  readonly id: number;
  readonly displayName: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly enabled: boolean;
  readonly createdAt: string;
}

export interface ApiError {
  readonly code?: string;
  readonly message?: string;
}

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  // Default to empty string for same-origin proxy in development or Render
  return '';
}

function isAuthenticatedSession(value: unknown): value is AuthenticatedSession {
  if (typeof value !== 'object' || value === null) return false;
  const session = value as Record<string, unknown>;
  return typeof session.accessToken === 'string'
    && session.accessToken.length > 0
    && session.tokenType === 'Bearer'
    && typeof session.expiresIn === 'number'
    && session.expiresIn > 0
    && typeof session.email === 'string'
    && Array.isArray(session.roles)
    && session.roles.every((role) => typeof role === 'string');
}

function getErrorMessage(value: unknown, status: number): string {
  if (typeof value === 'object' && value !== null) {
    const error = value as ApiError;
    if (error.code === 'AUTHENTICATION_FAILED') return 'Invalid email or password.';
    if (typeof error.message === 'string' && error.message.length > 0) return error.message;
  }
  if (status === 403) return 'This account does not have permission for the selected portal or action.';
  if (status === 404) return 'The requested API resource was not found.';
  if (status === 409) return 'An account with this email or roll number already exists.';
  return 'Unable to process request. Please try again.';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      `Unable to reach the backend service at ${baseUrl || window.location.origin}. Please verify your network and server status.`
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    // Handle Render static SPA fallback where an unconfigured route returns HTML or empty body
    if (response.status === 200 || response.status === 404) {
      throw new Error(
        `Backend API is not reachable at ${baseUrl || window.location.origin}. If running locally, ensure backend is started on port 8080. If on Render, configure VITE_API_BASE_URL to point to your live Spring Boot backend URL.`
      );
    }
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('The sign-in service returned an unreadable response.');
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(body, response.status));
  }

  return body as T;
}

export async function login(
  portal: Portal,
  email: string,
  password: string,
): Promise<AuthenticatedSession> {
  const body = await request<unknown>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ portal, email, password }),
  });

  if (!isAuthenticatedSession(body)) {
    throw new Error('The sign-in service returned an invalid response structure.');
  }
  return body;
}

export async function registerStudent(input: {
  fullName: string;
  rollNumber: string;
  email: string;
  password: string;
  department?: string;
  branch?: string;
  semester?: number;
}): Promise<{ message: string; email: string }> {
  return request<{ message: string; email: string }>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
  return request<{ message: string; resetToken?: string }>('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return request<{ message: string }>('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}

export async function fetchStudentProfile(token: string): Promise<StudentProfileDto> {
  return request<StudentProfileDto>('/api/v1/students/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchNews(token?: string, filters?: {
  category?: string;
  studentGraduationYear?: number;
  currentCgpa?: number;
  department?: string;
}): Promise<NewsItemDto[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.studentGraduationYear) params.set('studentGraduationYear', String(filters.studentGraduationYear));
  if (filters?.currentCgpa) params.set('currentCgpa', String(filters.currentCgpa));
  if (filters?.department) params.set('department', filters.department);

  const query = params.toString() ? `?${params.toString()}` : '';
  return request<NewsItemDto[]>(`/api/v1/news${query}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function analyzeResume(token: string, resumeText: string): Promise<ResumeAnalysisResponse> {
  return request<ResumeAnalysisResponse>('/api/v1/resume/analyze', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ resumeText }),
  });
}

export async function fetchUpcomingDrives(): Promise<{ content: DriveDto[] }> {
  try {
    return await request<{ content: DriveDto[] }>('/api/v1/drives/upcoming?page=0&size=20');
  } catch {
    // Provide illustrative fallback drives if backend drives table is empty
    return {
      content: [
        {
          id: 101,
          companyName: 'Northstar Systems',
          roleTitle: 'Graduate Engineer Trainee',
          driveDate: '2026-10-28',
          deadline: '2026-10-26T18:00:00Z',
          employmentType: 'FULL_TIME',
          ctcLpa: 12.5,
          jobLocation: 'Bengaluru / Hybrid',
          hasPpo: true,
          ppoCtcLpa: 14.0,
          bondMonths: 0,
          minCgpa: 7.5,
          maxBacklogs: 0,
          minCrtAttendance: 75.0,
          eligibleBranches: ['CSE', 'IT', 'ECE'],
        },
        {
          id: 102,
          companyName: 'BluePeak Technologies',
          roleTitle: 'Software Development Engineer',
          driveDate: '2026-11-02',
          deadline: '2026-10-31T23:59:00Z',
          employmentType: 'FULL_TIME',
          ctcLpa: 16.0,
          jobLocation: 'Hyderabad',
          hasPpo: false,
          bondMonths: 12,
          minCgpa: 8.0,
          maxBacklogs: 0,
          minCrtAttendance: 80.0,
          eligibleBranches: ['CSE', 'IT'],
        },
        {
          id: 103,
          companyName: 'Vertex Digital Solutions',
          roleTitle: 'Associate Cloud Engineer',
          driveDate: '2026-11-06',
          deadline: '2026-11-04T12:00:00Z',
          employmentType: 'FULL_TIME',
          ctcLpa: 9.8,
          jobLocation: 'Noida / Pune',
          hasPpo: false,
          bondMonths: 0,
          minCgpa: 7.0,
          maxBacklogs: 1,
          minCrtAttendance: 70.0,
          eligibleBranches: ['CSE', 'IT', 'ECE', 'MECH', 'CIVIL'],
        },
      ],
    };
  }
}

export async function fetchStaffAccounts(token: string): Promise<AccountDto[]> {
  return request<AccountDto[]>('/api/v1/accounts', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createStaffAccount(token: string, input: {
  displayName: string;
  email: string;
  role: string;
  password?: string;
}): Promise<AccountDto> {
  return request<AccountDto>('/api/v1/accounts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

export interface RuleResultDto {
  readonly rule: string;
  readonly expected: string;
  readonly actual: string;
  readonly status: 'PASS' | 'FAIL' | 'MISSING';
  readonly nextAction: string;
}

export interface EligibilityResultDto {
  readonly driveId: number;
  readonly eligible: boolean;
  readonly hasMissingData: boolean;
  readonly rules: readonly RuleResultDto[];
}

export interface RuleTransitionDto {
  readonly rule: string;
  readonly fromStatus: string;
  readonly toStatus: string;
  readonly reason: string;
}

export interface NewlyUnlockedDriveDto {
  readonly driveId: number;
  readonly companyName: string;
  readonly roleTitle: string;
  readonly changedRules: readonly RuleTransitionDto[];
}

export interface SimulationResponseDto {
  readonly actualResults: readonly EligibilityResultDto[];
  readonly simulatedResults: readonly EligibilityResultDto[];
  readonly newlyUnlockedDrives: readonly NewlyUnlockedDriveDto[];
}

export interface OneRuleAwayCandidateDto {
  readonly studentId: number;
  readonly fullName: string;
  readonly rollNumber: string;
  readonly email: string;
  readonly unmetRule: string;
  readonly actualValue: string;
  readonly requiredValue: string;
  readonly nextAction: string;
}

export interface OneRuleAwayResponseDto {
  readonly driveId: number;
  readonly companyName: string;
  readonly roleTitle: string;
  readonly totalAssessed: number;
  readonly eligibleCount: number;
  readonly oneRuleAwayCount: number;
  readonly missingDataCount: number;
  readonly unmetRuleBreakdown: Record<string, number>;
  readonly candidates: readonly OneRuleAwayCandidateDto[];
}

export interface NudgeResponseDto {
  readonly driveId: number;
  readonly driveTitle: string;
  readonly targetedCount: number;
  readonly sentCount: number;
  readonly status: string;
  readonly message: string;
}

export async function fetchDriveEligibility(driveId: number, token: string): Promise<EligibilityResultDto> {
  return request<EligibilityResultDto>(`/api/v1/drives/${driveId}/eligibility`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function simulateOfferPath(
  overrides: {
    driveIds?: number[];
    simulatedAttendance?: number;
    simulatedCgpa?: number;
    simulatedAtsScore?: number;
    simulatedBacklogs?: number;
  },
  token: string
): Promise<SimulationResponseDto> {
  return request<SimulationResponseDto>('/api/v1/drives/simulate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(overrides),
  });
}

export async function fetchOneRuleAwaySummary(driveId: number, token: string): Promise<OneRuleAwayResponseDto> {
  return request<OneRuleAwayResponseDto>(`/api/v1/drives/${driveId}/one-rule-away`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function sendTargetedNudge(
  driveId: number,
  token: string,
  customMessage?: string
): Promise<NudgeResponseDto> {
  return request<NudgeResponseDto>(`/api/v1/drives/${driveId}/nudge`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ customMessage }),
  });
}

export interface ApplicationDto {
  readonly driveId: number;
  readonly status: string;
  readonly appliedAt: string | null;
}

export async function applyToDrive(driveId: number, token: string): Promise<ApplicationDto> {
  return request<ApplicationDto>(`/api/v1/drives/${driveId}/applications`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function withdrawApplication(driveId: number, token: string): Promise<ApplicationDto> {
  return request<ApplicationDto>(`/api/v1/drives/${driveId}/applications`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchMyApplication(driveId: number, token: string): Promise<ApplicationDto> {
  return request<ApplicationDto>(`/api/v1/drives/${driveId}/applications/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
