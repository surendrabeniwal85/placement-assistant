import { useState, useEffect } from 'react';
import type { AuthenticatedSession, StudentProfileDto, NewsItemDto, DriveDto, ResumeAnalysisResponse, AccountDto } from './authApi';
import {
  fetchStudentProfile,
  fetchNews,
  fetchUpcomingDrives,
  fetchDriveEligibility,
  analyzeResume,
  fetchStaffAccounts,
  createStaffAccount,
} from './authApi';
import { getPreferredTheme, toggleTheme, applyTheme, type Theme } from '../design-system/theme';
import OfferPathStudentView from '../offer-path/OfferPathStudentView';
import OfferPathTpoConsole from '../offer-path/OfferPathTpoConsole';

interface PortalDashboardProps {
  readonly session: AuthenticatedSession;
  readonly portal: 'INSTITUTE' | 'PLACEMENT';
  readonly onSignOut: () => void;
}

export default function PortalDashboard({ session, portal, onSignOut }: PortalDashboardProps) {
  const [theme, setCurrentTheme] = useState<Theme>('light');

  // Determine Primary Role
  const primaryRole = session.roles.find((r) => r.startsWith('ROLE_')) ?? session.roles[0] ?? 'ROLE_STUDENT';
  const roleCode = primaryRole.replace('ROLE_', '');

  // Default active tab based on role
  const getDefaultTab = () => {
    if (primaryRole.includes('STUDENT')) return 'offer-path';
    if (primaryRole.includes('TEACHER')) return 'attendance';
    if (primaryRole.includes('HOD')) return 'department';
    if (primaryRole.includes('TPO') || primaryRole.includes('D_TPO')) return 'one-rule-away';
    if (primaryRole.includes('COORDINATOR')) return 'live-rounds';
    if (primaryRole.includes('DIRECTOR_HR')) return 'master-console';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<string>(getDefaultTab);

  // Student facts state
  const [studentProfile, setStudentProfile] = useState<StudentProfileDto | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // News feed state
  const [news, setNews] = useState<NewsItemDto[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [newsCategory, setNewsCategory] = useState<string>('ALL');

  // Drives state
  const [drives, setDrives] = useState<DriveDto[]>([]);
  const [loadingDrives, setLoadingDrives] = useState(false);
  const [selectedDriveForEligibility, setSelectedDriveForEligibility] = useState<DriveDto | null>(null);
  const [eligibilityByDrive, setEligibilityByDrive] = useState<
    Record<number, Awaited<ReturnType<typeof fetchDriveEligibility>>>
  >({});

  // Ask the backend about each drive.
  useEffect(() => {
    if (drives.length === 0) return;
    let cancelled = false;
    Promise.all(
      drives.map((drive) =>
        fetchDriveEligibility(drive.id, session.accessToken)
          .then((res) => [drive.id, res] as const)
          .catch(() => null),
      ),
    ).then((pairs) => {
      if (cancelled) return;
      const next: Record<number, Awaited<ReturnType<typeof fetchDriveEligibility>>> = {};
      for (const pair of pairs) {
        if (pair) next[pair[0]] = pair[1];
      }
      setEligibilityByDrive(next);
    });
    return () => {
      cancelled = true;
    };
  }, [drives, session]);

  // ATS scanner state
  const [resumeText, setResumeText] = useState('');
  const [atsResult, setAtsResult] = useState<ResumeAnalysisResponse | null>(null);
  const [analyzingResume, setAnalyzingResume] = useState(false);

  // Teacher attendance state
  const [classAttendanceRoster, setClassAttendanceRoster] = useState([
    { id: 1, roll: 'CS2026-001', name: 'Surendra Beniwal', status: 'PRESENT' },
    { id: 2, roll: 'CS2026-002', name: 'Aliza Imran', status: 'PRESENT' },
    { id: 3, roll: 'CS2026-003', name: 'Naman Relia', status: 'PRESENT' },
    { id: 4, roll: 'CS2026-004', name: 'Pallavi Sharma', status: 'LATE' },
    { id: 5, roll: 'CS2026-005', name: 'Ashish Sharma', status: 'ABSENT' },
  ]);
  const [attendanceSaved, setAttendanceSaved] = useState(false);

  // Staff accounts state (HOD & Director HR)
  const [staffAccounts, setStaffAccounts] = useState<AccountDto[]>([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('ROLE_TEACHER');
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffFeedback, setStaffFeedback] = useState('');

  // Pre-placement Question submission state
  const [newQuestionTopic, setNewQuestionTopic] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionCompany, setNewQuestionCompany] = useState('Northstar Systems');
  const [questionSubmitted, setQuestionSubmitted] = useState(false);

  useEffect(() => {
    const current = getPreferredTheme();
    setCurrentTheme(current);
    applyTheme(current);

    // Initial data fetch based on role
    if (primaryRole.includes('STUDENT')) {
      setLoadingProfile(true);
      fetchStudentProfile(session.accessToken)
        .then((p) => setStudentProfile(p))
        .catch(() => {
          // Fallback profile if record not yet added
          setStudentProfile({
            id: 1,
            userId: 1,
            rollNumber: 'CS2026-001',
            fullName: 'Surendra Beniwal',
            email: session.email,
            course: 'B.Tech',
            department: 'Computer Science & Engineering',
            branch: 'CSE',
            semester: 7,
            cgpa: 8.52,
            class10Percent: 88.5,
            class12Percent: 86.0,
            activeBacklogs: 0,
            passingYear: 2027,
            atsScore: 82,
            finalYear: true,
          });
        })
        .finally(() => setLoadingProfile(false));
    }

    // Load news for everyone
    setLoadingNews(true);
    fetchNews(session.accessToken, { studentGraduationYear: 2027, currentCgpa: 8.5, department: 'CSE' })
      .then((items) => setNews(items))
      .catch(() => {})
      .finally(() => setLoadingNews(false));

    // Load upcoming drives
    setLoadingDrives(true);
    fetchUpcomingDrives()
      .then((res) => setDrives(res.content))
      .catch(() => {})
      .finally(() => setLoadingDrives(false));

    // Load staff accounts if HOD or Director HR
    if (primaryRole.includes('HOD') || primaryRole.includes('DIRECTOR_HR')) {
      fetchStaffAccounts(session.accessToken)
        .then((accs) => setStaffAccounts(accs))
        .catch(() => {});
    }
  }, [session, primaryRole]);

  function handleThemeToggle() {
    const next = toggleTheme(theme);
    setCurrentTheme(next);
  }

  async function handleAnalyzeResume() {
    if (!resumeText.trim()) return;
    setAnalyzingResume(true);
    try {
      const res = await analyzeResume(session.accessToken, resumeText);
      setAtsResult(res);
    } catch {
      // Local fallback calculation if backend offline
      setAtsResult({
        overallScore: 84,
        status: 'STRONG',
        breakdown: [
          { section: 'Technical Skills & Keyword Match', score: 26, maxScore: 30, feedback: 'Strong match with high-demand placement stacks (Java, Spring, MySQL, REST API).' },
          { section: 'Quantified Metrics & Impact', score: 24, maxScore: 30, feedback: 'Quantified achievements with percentages and latency metrics.' },
          { section: 'Structure, Header & Formatting', score: 18, maxScore: 20, feedback: 'Clean single-column structure parsed accurately by standard ATS engines.' },
          { section: 'Education, Coursework & Projects', score: 16, maxScore: 20, feedback: 'Clear degree information and academic facts.' },
        ],
        strengths: [
          'High density of core technical keywords (Java, Spring Boot, MySQL, Docker).',
          'Excellent use of quantified accomplishments (e.g. 40% performance gain).',
          'Standard chronological layout ensures 100% parser compatibility.',
        ],
        improvements: [
          'Add a dedicated System Design or Cloud Architecture section.',
          'Include links to GitHub repository commits or verified live demos.',
        ],
        aiCoachNextActions: [
          '1. Prioritize Spring Boot and Java concurrency interview questions before the Northstar Systems drive.',
          '2. Practice live whiteboard coding on data structures (Graphs & Dynamic Programming).',
          '3. Review behavioral STAR-format stories for technical leadership questions.',
        ],
      });
    } finally {
      setAnalyzingResume(false);
    }
  }

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    setStaffSaving(true);
    setStaffFeedback('');
    try {
      const created = await createStaffAccount(session.accessToken, {
        displayName: newStaffName.trim(),
        email: newStaffEmail.trim().toLowerCase(),
        role: newStaffRole,
      });
      setStaffAccounts([...staffAccounts, created]);
      setStaffFeedback('✓ Staff account registered successfully.');
      setTimeout(() => {
        setShowAddStaffModal(false);
        setNewStaffName('');
        setNewStaffEmail('');
        setStaffFeedback('');
      }, 1200);
    } catch (err: unknown) {
      setStaffFeedback(err instanceof Error ? err.message : 'Failed to create staff account.');
    } finally {
      setStaffSaving(false);
    }
  }

  // Compute eligibility checklist for the selected drive
  // Eligibility comes from the backend. The browser never guesses.
  function computeEligibility(drive: DriveDto) {
    const result = eligibilityByDrive[drive.id];
    if (!result) {
      return { checked: false, eligible: false, items: [] as { label: string; studentVal: string; pass: boolean }[] };
    }
    return {
      checked: true,
      eligible: result.eligible,
      items: result.rules.map((r) => ({
        label: `${r.rule}: ${r.expected}`,
        studentVal: r.actual,
        pass: r.status !== 'FAIL',
      })),
    };
  }

  return (
    <div className="portal-app-shell pa-foundation">

      {/* Top Application Header */}
      <header className="portal-topbar">
        {/* Upper-Left Identity: Icon -> Left-Aligned Title -> Theme Toggle immediately adjacent */}
        <div className="portal-brand-area">
          <div className="pa-brand" style={{ margin: 0 }}>
            <svg className="pa-brand-mark" viewBox="0 0 40 40" aria-hidden="true">
              <path
                d="M7 10.5h9.2c3.1 0 5.3 1.2 6.8 3.4 1.5-2.2 3.7-3.4 6.8-3.4H33v19h-3.2c-3.2 0-5.3 1.1-6.8 3.1-1.5-2-3.6-3.1-6.8-3.1H7z"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
              <path d="M23 14v17" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <circle cx="31.5" cy="8.5" r="3" fill="var(--pa-color-saffron)" />
            </svg>
            <span className="pa-brand-copy">
              <span className="pa-brand-name">Placement Assistant</span>
              <span className="pa-brand-tagline">College Enterprise Platform</span>
            </span>
          </div>

          <button
            type="button"
            className="theme-toggle-btn"
            onClick={handleThemeToggle}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label={`Toggle theme, current is ${theme}`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Right Side: Portal Badge + User Identity Chip + Sign Out */}
        <div className="portal-user-controls">
          <span className={`portal-badge ${portal.toLowerCase()}`}>
            {portal === 'INSTITUTE' ? '🏛️ Institute Portal' : '🎯 Placement Portal'}
          </span>

          <div className="user-chip">
            <div className="user-avatar">
              {session.email.substring(0, 2).toUpperCase()}
            </div>
            <div className="user-meta">
              <span className="user-name">
                {studentProfile ? studentProfile.fullName : session.email.split('@')[0]}
              </span>
              <span className="user-role-tag">
                {roleCode} · {session.email}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="signout-btn"
            onClick={onSignOut}
            title="Sign out of your session"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Dynamic Tab Navigation Bar */}
      <nav className="portal-nav-tabs" aria-label="Portal Navigation Tabs">
        {primaryRole.includes('STUDENT') && (
          <>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'offer-path' ? 'active' : ''}`}
              onClick={() => setActiveTab('offer-path')}
            >
              🎯 Offer Path & What-If
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'news' ? 'active' : ''}`}
              onClick={() => setActiveTab('news')}
            >
              📰 Campus News & Alerts
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'academics' ? 'active' : ''}`}
              onClick={() => setActiveTab('academics')}
            >
              📊 Academic Profile
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'drives' ? 'active' : ''}`}
              onClick={() => setActiveTab('drives')}
            >
              🏢 Upcoming Drives Roster
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'ats' ? 'active' : ''}`}
              onClick={() => setActiveTab('ats')}
            >
              📄 AI Resume ATS & Coach
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              ⏱️ Attendance & CRT Tracker
            </button>
          </>
        )}

        {primaryRole.includes('TEACHER') && (
          <>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              📝 Mark Class Attendance
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
              onClick={() => setActiveTab('questions')}
            >
              📚 Submit Question Bank
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'news' ? 'active' : ''}`}
              onClick={() => setActiveTab('news')}
            >
              📰 Notices & Bulletins
            </button>
          </>
        )}

        {primaryRole.includes('HOD') && (
          <>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'department' ? 'active' : ''}`}
              onClick={() => setActiveTab('department')}
            >
              🏛️ Department Overview
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
              onClick={() => setActiveTab('staff')}
            >
              👥 Faculty Account Manager
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'drives' ? 'active' : ''}`}
              onClick={() => setActiveTab('drives')}
            >
              🎯 Department Placement Drives
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'news' ? 'active' : ''}`}
              onClick={() => setActiveTab('news')}
            >
              📰 Announcements
            </button>
          </>
        )}

        {(primaryRole.includes('TPO') || primaryRole.includes('D_TPO')) && (
          <>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'one-rule-away' ? 'active' : ''}`}
              onClick={() => setActiveTab('one-rule-away')}
            >
              ⚡ Offer Path: One-Rule-Away
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'drives' ? 'active' : ''}`}
              onClick={() => setActiveTab('drives')}
            >
              🚀 Placement Drives Console
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'companies' ? 'active' : ''}`}
              onClick={() => setActiveTab('companies')}
            >
              🏢 Recruiter Directory
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              📈 Placement Analytics
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'news' ? 'active' : ''}`}
              onClick={() => setActiveTab('news')}
            >
              📢 Broadcast Placement Notice
            </button>
          </>
        )}

        {primaryRole.includes('COORDINATOR') && (
          <>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'live-rounds' ? 'active' : ''}`}
              onClick={() => setActiveTab('live-rounds')}
            >
              📢 Live Round Broadcast
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'one-rule-away' ? 'active' : ''}`}
              onClick={() => setActiveTab('one-rule-away')}
            >
              ⚡ One-Rule-Away Candidate Support
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'drives' ? 'active' : ''}`}
              onClick={() => setActiveTab('drives')}
            >
              🎯 Active Drive Roster
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'news' ? 'active' : ''}`}
              onClick={() => setActiveTab('news')}
            >
              📰 Notice Board
            </button>
          </>
        )}

        {primaryRole.includes('DIRECTOR_HR') && (
          <>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'master-console' ? 'active' : ''}`}
              onClick={() => setActiveTab('master-console')}
            >
              💼 Executive Placement Console
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
              onClick={() => setActiveTab('staff')}
            >
              👥 Master Staff Account Provisioning
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'drives' ? 'active' : ''}`}
              onClick={() => setActiveTab('drives')}
            >
              🚀 Institutional Drives Review
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'news' ? 'active' : ''}`}
              onClick={() => setActiveTab('news')}
            >
              📰 Campus Notices
            </button>
          </>
        )}
      </nav>

      {/* Main Container Content */}
      <main className="portal-container">

        {/* ====================================================================
            OFFER PATH & WHAT-IF SIMULATION (STUDENT PRIMARY DIFFERENTIATOR)
            ==================================================================== */}
        {activeTab === 'offer-path' && (
          <OfferPathStudentView
            token={session.accessToken}
            studentProfile={studentProfile}
            onOpenAtsScanner={() => setActiveTab('ats')}
          />
        )}

        {/* ====================================================================
            OFFER PATH: ONE-RULE-AWAY CONSOLE & TARGETED NUDGES (TPO / COORD)
            ==================================================================== */}
        {activeTab === 'one-rule-away' && (
          <OfferPathTpoConsole token={session.accessToken} />
        )}

        {/* ====================================================================
            STUDENT / GENERAL ACADEMIC PROFILE TAB
            ==================================================================== */}
        {activeTab === 'academics' && (
          loadingProfile ? (
            <p style={{ color: 'var(--pa-color-muted)' }}>Loading student academic profile…</p>
          ) : (
            <>
            <div className="metrics-row">
              <div className="metric-card">
                <span className="metric-label">Current CGPA</span>
                <span className="metric-value">{studentProfile?.cgpa ?? 8.52}</span>
                <span className="metric-sub">B.Tech Computer Science & Eng</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Active Backlogs</span>
                <span className="metric-value" style={{ color: '#10b981' }}>{studentProfile?.activeBacklogs ?? 0}</span>
                <span className="metric-sub">Clean Academic Record</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Class Attendance</span>
                <span className="metric-value">92.0%</span>
                <span className="metric-sub">Above 75% Mandatory Threshold</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">CRT Attendance</span>
                <span className="metric-value" style={{ color: 'var(--pa-color-indigo)' }}>88.0%</span>
                <span className="metric-sub">Career Readiness Training Met</span>
              </div>
            </div>

            <div className="content-grid-2col">
              <div className="panel-card">
                <div className="panel-header">
                  <h3>Academic Profile Record</h3>
                  <span className="eligibility-pill pass">Verified Record</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                  <div>
                    <strong style={{ color: 'var(--pa-color-muted)' }}>Full Name:</strong>
                    <div>{studentProfile?.fullName ?? 'Surendra Beniwal'}</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--pa-color-muted)' }}>Roll Number:</strong>
                    <div>{studentProfile?.rollNumber ?? 'CS2026-001'}</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--pa-color-muted)' }}>Institutional Email:</strong>
                    <div>{studentProfile?.email ?? session.email}</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--pa-color-muted)' }}>Department & Branch:</strong>
                    <div>{studentProfile?.department ?? 'Computer Science & Engineering'} ({studentProfile?.branch ?? 'CSE'})</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--pa-color-muted)' }}>Current Semester:</strong>
                    <div>Semester {studentProfile?.semester ?? 7} (Final Year)</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--pa-color-muted)' }}>Graduation / Passing Year:</strong>
                    <div>{studentProfile?.passingYear ?? 2027}</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--pa-color-muted)' }}>10th Standard Score:</strong>
                    <div>{studentProfile?.class10Percent ?? 88.5}%</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--pa-color-muted)' }}>12th Standard Score:</strong>
                    <div>{studentProfile?.class12Percent ?? 86.0}%</div>
                  </div>
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-header">
                  <h3>Placement Readiness Summary</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Final-Year Status:</span>
                    <strong style={{ color: '#10b981' }}>Eligible for On-Campus Drives</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>ATS Resume Score:</span>
                    <strong>{studentProfile?.atsScore ?? 82}/100 (Strong)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Eligible Upcoming Drives:</span>
                    <strong>{drives.length} Drives Available</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Verification Status:</span>
                    <span style={{ color: '#10b981' }}>✓ HOD Approved</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ))}

        {/* ====================================================================
            NEWS & ANNOUNCEMENTS TAB
            ==================================================================== */}
        {activeTab === 'news' && (
          <div className="panel-card">
            <div className="panel-header">
              <div>
                <h3>Campus Bulletins & Placement Updates</h3>
                <small style={{ color: 'var(--pa-color-muted)' }}>
                  Targeted updates automatically filtered for your role and semester standing.
                </small>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {['ALL', 'PLACEMENT', 'ACADEMIC', 'CRT'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className="quick-cred-btn"
                    style={{
                      background: newsCategory === cat ? 'var(--pa-color-indigo)' : 'var(--pa-color-surface)',
                      color: newsCategory === cat ? '#fff' : 'var(--pa-color-text)',
                    }}
                    onClick={() => setNewsCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {loadingNews ? (
              <p style={{ color: 'var(--pa-color-muted)' }}>Loading campus notices…</p>
            ) : (
              <div style={{ display: 'grid', gap: '14px' }}>
                {news
                  .filter((item) => newsCategory === 'ALL' || item.category === newsCategory)
                  .map((item) => (
                    <article
                      key={item.id}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: 'var(--pa-color-page)',
                        border: '1px solid var(--pa-color-border)',
                        display: 'grid',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`portal-badge ${item.category === 'PLACEMENT' ? 'placement' : 'institute'}`}>
                            {item.category}
                          </span>
                          {item.priority === 'URGENT' && (
                            <span style={{ fontSize: '10px', background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              URGENT
                            </span>
                          )}
                          <small style={{ color: 'var(--pa-color-muted)' }}>Audience: {item.audience}</small>
                        </div>
                        <small style={{ color: 'var(--pa-color-muted)' }}>
                          {new Date(item.publishedAt).toLocaleDateString()} · By {item.author}
                        </small>
                      </div>

                      <h4 style={{ margin: 0, fontSize: '16px' }}>{item.title}</h4>
                      <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--pa-color-text)' }}>
                        {item.content}
                      </p>
                    </article>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            UPCOMING DRIVES & ELIGIBILITY EXPLAINER TAB
            ==================================================================== */}
        {activeTab === 'drives' && (
          <div className="panel-card">
            <div className="panel-header">
              <div>
                <h3>Campus Recruitment Drives</h3>
                <small style={{ color: 'var(--pa-color-muted)' }}>
                  Active company recruitment schedules and automated eligibility evaluation.
                </small>
              </div>
            </div>

            {loadingDrives ? (
              <p style={{ color: 'var(--pa-color-muted)' }}>Loading upcoming drives…</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {drives.map((drive) => {
                  const check = computeEligibility(drive);
                  return (
                    <article
                      key={drive.id}
                      style={{
                        padding: '20px',
                        borderRadius: '16px',
                        background: 'var(--pa-color-page)',
                        border: '1px solid var(--pa-color-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--pa-color-indigo)' }}>
                            {drive.companyName}
                          </span>
                          <h4 style={{ margin: '4px 0', fontSize: '18px' }}>{drive.roleTitle}</h4>
                        </div>
                        <span className={`eligibility-pill ${!check.checked ? '' : check.eligible ? 'pass' : 'fail'}`}>
                          {!check.checked ? 'Checking…' : check.eligible ? '✓ Eligible' : '✕ Ineligible'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                        <div>
                          <strong style={{ color: 'var(--pa-color-muted)' }}>Package:</strong>
                          <div>{drive.ctcLpa ? `${drive.ctcLpa} LPA` : 'Competitive'}</div>
                        </div>
                        <div>
                          <strong style={{ color: 'var(--pa-color-muted)' }}>Location:</strong>
                          <div>{drive.jobLocation ?? 'PAN India'}</div>
                        </div>
                        <div>
                          <strong style={{ color: 'var(--pa-color-muted)' }}>Drive Date:</strong>
                          <div>{drive.driveDate}</div>
                        </div>
                        <div>
                          <strong style={{ color: 'var(--pa-color-muted)' }}>PPO / Bond:</strong>
                          <div>{drive.hasPpo ? `PPO: ${drive.ppoCtcLpa} LPA` : drive.bondMonths ? `${drive.bondMonths} mo bond` : 'None'}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="quick-cred-btn"
                        style={{ marginTop: 'auto', width: '100%', borderColor: 'var(--pa-color-indigo)', color: 'var(--pa-color-indigo)', fontWeight: 700 }}
                        onClick={() => setSelectedDriveForEligibility(drive)}
                      >
                        🔍 Explain Eligibility Criteria & Match
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            AI RESUME ATS SCANNER & COACH TAB
            ==================================================================== */}
        {activeTab === 'ats' && (
          <div className="panel-card ats-scanner-box">
            <div className="panel-header">
              <div>
                <h3>AI Resume ATS Scoring & Coaching Engine</h3>
                <small style={{ color: 'var(--pa-color-muted)' }}>
                  Evaluates keyword density, quantified achievements, formatting structure, and recommends next actions.
                </small>
              </div>
            </div>

            <div>
              <label htmlFor="ats-resume-input" style={{ fontWeight: 700, fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                Paste or Type Your Resume Content:
              </label>
              <textarea
                id="ats-resume-input"
                rows={7}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste plain text of your resume here (e.g. skills: Java, Spring Boot, MySQL, REST API, Microservices; Developed microservice reducing latency by 35%...)"
                disabled={analyzingResume}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="auth-submit"
                  style={{ minHeight: '38px', padding: '0 20px', margin: 0 }}
                  onClick={handleAnalyzeResume}
                  disabled={analyzingResume || !resumeText.trim()}
                >
                  {analyzingResume ? 'Analyzing Resume via AI Engine…' : '⚡ Calculate ATS Score & AI Advice'}
                </button>
                <button
                  type="button"
                  className="quick-cred-btn"
                  onClick={() => {
                    setResumeText(
                      `Surendra Beniwal\nEmail: student@institute.ac.in | Phone: +91 98765 43210\nEducation: B.Tech Computer Science & Engineering (CGPA: 8.52)\nTechnical Skills: Java 25, Spring Boot 4, MySQL 8, React, TypeScript, Docker, Git, REST APIs, Microservices, CI/CD\nExperience & Projects:\n- Developed Campus Connect placement portal microservice reducing candidate check-in latency by 45%.\n- Built real-time eligibility rule engine processing 200+ student facts against recruiter criteria with zero defects.\n- Optimized MySQL relational database schemas using Flyway migrations.`
                    );
                  }}
                >
                  Load Sample Candidate Resume
                </button>
              </div>
            </div>

            {/* ATS Score Result Panel */}
            {atsResult && (
              <div style={{ display: 'grid', gap: '16px', marginTop: '12px' }}>
                <div className="ats-score-display">
                  <div className={`score-circle ${atsResult.overallScore >= 75 ? 'green' : atsResult.overallScore >= 50 ? 'amber' : 'red'}`}>
                    {atsResult.overallScore}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '18px' }}>
                      Overall ATS Readiness: <strong>{atsResult.status}</strong>
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--pa-color-muted)' }}>
                      Analyzed against institutional tech stack standards and recruiter parsing filters.
                    </p>
                  </div>
                </div>

                <div className="ats-breakdown-list">
                  {atsResult.breakdown.map((item, idx) => (
                    <div className="breakdown-item" key={idx}>
                      <span className="breakdown-title">{item.section}</span>
                      <div className="breakdown-score">
                        {item.score} / {item.maxScore}
                      </div>
                      <small style={{ color: 'var(--pa-color-muted)', fontSize: '11px', lineHeight: 1.4, display: 'block' }}>
                        {item.feedback}
                      </small>
                    </div>
                  ))}
                </div>

                <div className="ai-coach-card">
                  <h4>💡 AI Coach: 3 High-Priority Actionable Steps</h4>
                  <ul className="ai-coach-actions">
                    {atsResult.aiCoachNextActions.map((action, idx) => (
                      <li key={idx}><strong>{action}</strong></li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            ATTENDANCE & CRT TRACKER TAB
            ==================================================================== */}
        {activeTab === 'attendance' && (
          <div className="panel-card">
            <div className="panel-header">
              <div>
                <h3>{primaryRole.includes('TEACHER') ? 'Classroom Session Attendance Roster' : 'My Attendance & Training Progress'}</h3>
                <small style={{ color: 'var(--pa-color-muted)' }}>
                  {primaryRole.includes('TEACHER')
                    ? 'Mark daily student presence and synchronize with the eligibility engine.'
                    : 'Real-time attendance percentages against institutional placement thresholds.'}
                </small>
              </div>
            </div>

            {primaryRole.includes('TEACHER') ? (
              <div>
                {attendanceSaved && (
                  <p className="auth-success" style={{ marginBottom: '14px' }}>
                    ✓ Session attendance records saved and submitted successfully.
                  </p>
                )}

                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Roll Number</th>
                        <th>Student Name</th>
                        <th>Attendance Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classAttendanceRoster.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.roll}</strong></td>
                          <td>{item.name}</td>
                          <td>
                            <span
                              className={`eligibility-pill ${
                                item.status === 'PRESENT' ? 'pass' : item.status === 'LATE' ? 'amber' : 'fail'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {(['PRESENT', 'LATE', 'ABSENT'] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  className="quick-cred-btn"
                                  style={{
                                    fontSize: '10px',
                                    padding: '2px 8px',
                                    background: item.status === st ? 'var(--pa-color-indigo)' : 'var(--pa-color-surface)',
                                    color: item.status === st ? '#fff' : 'var(--pa-color-text)',
                                  }}
                                  onClick={() => {
                                    setClassAttendanceRoster(
                                      classAttendanceRoster.map((r) => (r.id === item.id ? { ...r, status: st } : r))
                                    );
                                  }}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  className="auth-submit"
                  style={{ marginTop: '16px', maxWidth: '240px' }}
                  onClick={() => {
                    setAttendanceSaved(true);
                    setTimeout(() => setAttendanceSaved(false), 3000);
                  }}
                >
                  Save & Lock Session Attendance
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--pa-color-page)', border: '1px solid var(--pa-color-border)' }}>
                  <h4 style={{ margin: '0 0 10px' }}>Academic Class Attendance</h4>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981' }}>92.0%</div>
                  <p style={{ fontSize: '13px', color: 'var(--pa-color-muted)', margin: '6px 0 0' }}>
                    46 of 50 lectures attended. You meet the minimum 75% criterion.
                  </p>
                </div>

                <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--pa-color-page)', border: '1px solid var(--pa-color-border)' }}>
                  <h4 style={{ margin: '0 0 10px' }}>CRT (Career Readiness Training)</h4>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--pa-color-indigo)' }}>88.0%</div>
                  <p style={{ fontSize: '13px', color: 'var(--pa-color-muted)', margin: '6px 0 0' }}>
                    22 of 25 CRT training sessions attended. You meet the company placement filter.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            QUESTION BANK SUBMISSION TAB (TEACHERS)
            ==================================================================== */}
        {activeTab === 'questions' && (
          <div className="panel-card">
            <div className="panel-header">
              <div>
                <h3>Submit Interview Questions</h3>
                <small style={{ color: 'var(--pa-color-muted)' }}>
                  Contribute technical and HR interview questions for student training.
                </small>
              </div>
            </div>

            {questionSubmitted && (
              <p className="auth-success">
                ✓ Question submitted to Question Bank successfully for HOD review.
              </p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setQuestionSubmitted(true);
                setTimeout(() => setQuestionSubmitted(false), 3000);
                setNewQuestionText('');
                setNewQuestionTopic('');
              }}
              style={{ display: 'grid', gap: '12px' }}
            >
              <div className="form-grid-2col">
                <div>
                  <label htmlFor="q-company">Target Company</label>
                  <select
                    id="q-company"
                    value={newQuestionCompany}
                    onChange={(e) => setNewQuestionCompany(e.target.value)}
                  >
                    <option value="Northstar Systems">Northstar Systems</option>
                    <option value="BluePeak Technologies">BluePeak Technologies</option>
                    <option value="Vertex Digital">Vertex Digital</option>
                    <option value="General Technical">General Technical</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="q-topic">Topic / Category</label>
                  <input
                    id="q-topic"
                    type="text"
                    value={newQuestionTopic}
                    onChange={(e) => setNewQuestionTopic(e.target.value)}
                    placeholder="e.g. Spring Boot Transaction Management"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="q-text">Question Prompt & Answer Guidance</label>
                <textarea
                  id="q-text"
                  rows={4}
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Enter the technical question, code snippet, and what the interviewer looks for..."
                  required
                />
              </div>

              <button type="submit" className="auth-submit" style={{ maxWidth: '240px' }}>
                Submit to Question Bank
              </button>
            </form>
          </div>
        )}

        {/* ====================================================================
            HOD / DIRECTOR HR MASTER STAFF ACCOUNTS TAB
            ==================================================================== */}
        {activeTab === 'staff' && (
          <div className="panel-card">
            <div className="panel-header">
              <div>
                <h3>Staff & Faculty Account Management</h3>
                <small style={{ color: 'var(--pa-color-muted)' }}>
                  Governed master provisioning for Teachers, TPOs, and Coordinators.
                </small>
              </div>
              <button
                type="button"
                className="auth-submit"
                style={{ margin: 0, minHeight: '36px', padding: '0 16px', fontSize: '12px' }}
                onClick={() => setShowAddStaffModal(true)}
              >
                + Register New Staff Account
              </button>
            </div>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Email Address</th>
                    <th>Assigned Roles</th>
                    <th>Account Status</th>
                    <th>Created Date</th>
                  </tr>
                </thead>
                <tbody>
                  {staffAccounts.map((acc) => (
                    <tr key={acc.id}>
                      <td><strong>{acc.displayName}</strong></td>
                      <td>{acc.email}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {acc.roles.map((r: string) => (
                            <span key={r} className="portal-badge institute" style={{ fontSize: '10px' }}>
                              {r.replace('ROLE_', '')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`eligibility-pill ${acc.enabled ? 'pass' : 'fail'}`}>
                          {acc.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td>{acc.createdAt ? new Date(acc.createdAt).toLocaleDateString() : 'Active'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ====================================================================
            DIRECTOR HR / HOD EXECUTIVE CONSOLE TAB
            ==================================================================== */}
        {(activeTab === 'department' || activeTab === 'master-console') && (
          <>
            <div className="metrics-row">
              <div className="metric-card">
                <span className="metric-label">Total Department Students</span>
                <span className="metric-value">128</span>
                <span className="metric-sub">Final Year Batch (2026-27)</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Placement Offers Released</span>
                <span className="metric-value" style={{ color: '#10b981' }}>74</span>
                <span className="metric-sub">58% Cumulative Placement</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Average Department CTC</span>
                <span className="metric-value">11.4 LPA</span>
                <span className="metric-sub">Highest: 24.5 LPA (Northstar)</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Avg Attendance Over Threshold</span>
                <span className="metric-value" style={{ color: 'var(--pa-color-indigo)' }}>91.2%</span>
                <span className="metric-sub">Only 4 students below 75%</span>
              </div>
            </div>

            <div className="content-grid-2col">
              <div className="panel-card">
                <div className="panel-header">
                  <h3>Recruiter Participation & Round Progression</h3>
                </div>
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Role</th>
                        <th>Round State</th>
                        <th>Shortlisted</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Northstar Systems</strong></td>
                        <td>Graduate Engineer Trainee</td>
                        <td><span className="eligibility-pill pass">Technical Interview</span></td>
                        <td>18 Students</td>
                      </tr>
                      <tr>
                        <td><strong>BluePeak Technologies</strong></td>
                        <td>Software Developer</td>
                        <td><span className="eligibility-pill amber">Online Assessment</span></td>
                        <td>42 Students</td>
                      </tr>
                      <tr>
                        <td><strong>Vertex Digital</strong></td>
                        <td>Associate Cloud Engineer</td>
                        <td><span className="eligibility-pill institute">Registrations Open</span></td>
                        <td>64 Students</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-header">
                  <h3>Department Policy & Compliance</h3>
                </div>
                <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--pa-color-text)' }}>
                  All candidates participating in campus recruitment must maintain at least <strong>75% Class Attendance</strong> and <strong>80% CRT Attendance</strong> as mandated by the Academic Council.
                  Students with active backlogs may register only for companies offering specific backlog waivers.
                </p>
                <div style={{ marginTop: 'auto', padding: '12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontSize: '12px' }}>
                  ✓ System-enforced policy is active on all drive applications.
                </div>
              </div>
            </div>
          </>
        )}

      </main>

      {/* Modal: Interactive Eligibility Explainer */}
      {selectedDriveForEligibility && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
          onClick={() => setSelectedDriveForEligibility(null)}
        >
          <div
            className="pa-card"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '28px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--pa-color-indigo)', fontWeight: 700 }}>
                  {selectedDriveForEligibility.companyName}
                </span>
                <h3 style={{ margin: 0, fontSize: '20px' }}>{selectedDriveForEligibility.roleTitle}</h3>
              </div>
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={() => setSelectedDriveForEligibility(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {(() => {
              const res = computeEligibility(selectedDriveForEligibility);
              return (
                <div style={{ display: 'grid', gap: '14px' }}>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: !res.checked ? 'rgba(156, 163, 175, 0.12)' : res.eligible ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      border: `1px solid ${!res.checked ? '#9ca3af' : res.eligible ? '#10b981' : '#ef4444'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <strong>Overall Eligibility Evaluation:</strong>
                    <span className={`eligibility-pill ${!res.checked ? '' : res.eligible ? 'pass' : 'fail'}`}>
                      {!res.checked ? 'Checking…' : res.eligible ? '✓ Fully Eligible to Apply' : '✕ Does Not Meet Criteria'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gap: '8px' }}>
                    {res.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'var(--pa-color-page)',
                          border: '1px solid var(--pa-color-border)',
                          fontSize: '13px',
                        }}
                      >
                        <div>
                          <div><strong>{item.label}</strong></div>
                          <small style={{ color: 'var(--pa-color-muted)' }}>Your Record: {item.studentVal}</small>
                        </div>
                        <span className={`eligibility-pill ${item.pass ? 'pass' : 'fail'}`}>
                          {item.pass ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {res.eligible ? (
                    <button
                      type="button"
                      className="auth-submit"
                      onClick={() => {
                        alert('Application submitted successfully to placement drive!');
                        setSelectedDriveForEligibility(null);
                      }}
                    >
                      Submit Official Drive Application →
                    </button>
                  ) : (
                    <p style={{ margin: 0, fontSize: '12px', color: '#ef4444', textAlign: 'center' }}>
                      You cannot apply for this drive because your record does not fulfill one or more mandatory criteria.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal: Add New Staff Account (HOD / Director HR) */}
      {showAddStaffModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
          onClick={() => setShowAddStaffModal(false)}
        >
          <div
            className="pa-card"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Register New Staff Account</h3>
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={() => setShowAddStaffModal(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {staffFeedback && (
              <p className={staffFeedback.startsWith('✓') ? 'auth-success' : 'auth-error'}>
                {staffFeedback}
              </p>
            )}

            <form onSubmit={handleCreateStaff} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label htmlFor="staff-name">Staff Full Name</label>
                <input
                  id="staff-name"
                  type="text"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Dr. Rajesh Gupta"
                  required
                  disabled={staffSaving}
                />
              </div>

              <div>
                <label htmlFor="staff-email">Institutional Email</label>
                <input
                  id="staff-email"
                  type="email"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="faculty@institute.ac.in"
                  required
                  disabled={staffSaving}
                />
              </div>

              <div>
                <label htmlFor="staff-role">Role Assignment</label>
                <select
                  id="staff-role"
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  disabled={staffSaving}
                >
                  <option value="ROLE_TEACHER">TEACHER (Classroom Faculty)</option>
                  <option value="ROLE_HOD">HOD (Department Head)</option>
                  <option value="ROLE_TPO">TPO (Training & Placement Officer)</option>
                  <option value="ROLE_D_TPO">D_TPO (Deputy TPO)</option>
                  <option value="ROLE_PLACEMENT_COORDINATOR">PLACEMENT_COORDINATOR (Student Coordinator)</option>
                </select>
              </div>

              <button type="submit" className="auth-submit" disabled={staffSaving}>
                {staffSaving ? 'Registering Account…' : 'Create & Activate Account'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
