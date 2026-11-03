import { useState, useEffect } from 'react';
import BrandHeader from './BrandHeader';
import { getApiBaseUrl } from './authApi';
import './how-it-works.css';

interface PortalSelectionProps {
  readonly onChoosePortal: (portalPath: '/institute/login' | '/placement/login') => void;
  readonly onClaimAccount?: () => void;
}

type DemoRole = 'STUDENT' | 'TEACHER' | 'HOD' | 'TPO' | 'DIRECTOR';

export default function PortalSelection({ onChoosePortal, onClaimAccount }: PortalSelectionProps) {
  const [backendStatus, setBackendStatus] = useState<'CHECKING' | 'ONLINE' | 'STANDBY'>('CHECKING');
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [selectedRoleInfo, setSelectedRoleInfo] = useState<DemoRole>('STUDENT');

  useEffect(() => {
    const apiBase = getApiBaseUrl();
    const testUrl = `${apiBase}/actuator/health`;
    fetch(testUrl, { method: 'GET', headers: { Accept: 'application/json' } })
      .then((res) => {
        if (res.ok) setBackendStatus('ONLINE');
        else setBackendStatus('STANDBY');
      })
      .catch(() => setBackendStatus('STANDBY'));
  }, []);

  interface DemoAccount {
    role: DemoRole;
    label: string;
    portal: 'INSTITUTE' | 'PLACEMENT';
    portalPath: '/institute/login' | '/placement/login';
    email: string;
    pass: string;
    desc: string;
    icon: string;
  }

  const demoAccounts: DemoAccount[] = [
    {
      role: 'STUDENT',
      label: 'Student',
      portal: 'INSTITUTE',
      portalPath: '/institute/login' as const,
      email: 'student@institute.ac.in',
      pass: 'Student@123',
      desc: 'Access News Feed, Academic Facts, Upcoming Drives, Interactive Eligibility Explainer, and Resume ATS Scanner.',
      icon: '🎓',
    },
    {
      role: 'TEACHER',
      label: 'Faculty / Teacher',
      portal: 'INSTITUTE',
      portalPath: '/institute/login' as const,
      email: 'teacher@institute.ac.in',
      pass: 'Teacher@123',
      desc: 'Mark Classroom attendance, log CRT training sessions, and submit interview questions to the question bank.',
      icon: '👨‍🏫',
    },
    {
      role: 'HOD',
      label: 'Head of Department',
      portal: 'INSTITUTE',
      portalPath: '/institute/login' as const,
      email: 'hod@institute.ac.in',
      pass: 'Hod@123',
      desc: 'Oversee department attendance rates, manage faculty accounts, review student progression, and approve question bank.',
      icon: '🏛️',
    },
    {
      role: 'TPO',
      label: 'Training & Placement Officer',
      portal: 'PLACEMENT',
      portalPath: '/placement/login' as const,
      email: 'tpo@placement.ac.in',
      pass: 'Tpo@123',
      desc: 'Manage recruitment drives, set CGPA & backlog eligibility rules, broadcast drive updates, and track offers.',
      icon: '🎯',
    },
    {
      role: 'DIRECTOR',
      label: 'Director HR',
      portal: 'PLACEMENT',
      portalPath: '/placement/login' as const,
      email: 'hr.director@placement.ac.in',
      pass: 'Director@123',
      desc: 'Executive placement governance, staff master account provisioning, institutional metrics, and recruiter relations.',
      icon: '🏢',
    },
  ];

  return (
    <main className="auth-page pa-foundation portal-selection">
      <div className="portal-selection-content" aria-labelledby="portal-selection-title">

        {/* Top Navigation & Status */}
        <header className="portal-selection-header">
          <BrandHeader showThemeToggle={true} />
        </header>

        {/* Live Backend Connection Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', background: 'var(--pa-color-surface)', border: '1px solid var(--pa-color-border)', fontSize: '12px', fontWeight: 600 }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: backendStatus === 'ONLINE' ? '#10b981' : backendStatus === 'STANDBY' ? '#f59e0b' : '#94a3b8',
                boxShadow: backendStatus === 'ONLINE' ? '0 0 8px #10b981' : 'none',
              }}
            />
            <span>
              Backend API:{' '}
              <strong style={{ color: backendStatus === 'ONLINE' ? '#10b981' : '#f59e0b' }}>
                {backendStatus === 'ONLINE' ? 'Connected & Healthy (Port 8080)' : 'Standalone Ready / Standby'}
              </strong>
            </span>
          </div>

          <button
            type="button"
            className="quick-cred-btn"
            style={{ padding: '6px 16px', fontSize: '12px', background: 'var(--pa-color-surface)', borderColor: 'var(--pa-color-saffron)', color: 'var(--pa-color-saffron)', fontWeight: 700 }}
            onClick={() => setShowDemoModal(true)}
          >
            🔑 View 7 Canonical Demo Accounts
          </button>
        </div>

        {/* Hero Section */}
        <div style={{ marginBottom: '36px' }}>
          <p className="auth-eyebrow">CLASSROOM TO CAREER, IN ONE PLACE</p>
          <h1 id="portal-selection-title" style={{ marginBottom: '16px' }}>
            Know exactly where you stand, from first lecture to final offer.
          </h1>
          <p className="auth-description" style={{ fontSize: '16px', maxWidth: '720px' }}>
            Track your attendance, academic progress and lectures. Then see which placement drives you qualify for, and what to improve next.
          </p>
        </div>

        {/* Dual Portal Gateway Cards */}
        <div className="portal-choice-grid">

          {/* Institute Portal Card */}
          <article className="portal-choice pa-card pa-portal-institute">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p className="auth-eyebrow">ACADEMIC & CAMPUS LIFE</p>
              <span className="portal-badge institute">Institute</span>
            </div>
            <h2>Institute Portal</h2>
            <p>
              Dedicated environment for students, classroom faculty, and department heads to track attendance,
              review academic facts, prepare with the question bank, and monitor placement readiness.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              <button
                className="auth-submit"
                type="button"
                onClick={() => onChoosePortal('/institute/login')}
              >
                Sign in to Institute Portal →
              </button>

              {onClaimAccount && (
                <button
                  type="button"
                  className="quick-cred-btn"
                  style={{ minHeight: '38px', fontSize: '13px', width: '100%', borderColor: 'var(--pa-color-indigo)', color: 'var(--pa-color-indigo)' }}
                  onClick={onClaimAccount}
                >
                  🎓 Claim / Register Student Account
                </button>
              )}
            </div>

            <p className="portal-account-note">For students, teachers and the HOD. Sign in with your <code>@institute.ac.in</code> email.</p>
          </article>

          {/* Placement Portal Card */}
          <article className="portal-choice pa-card pa-portal-placement">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p className="auth-eyebrow">CORPORATE & RECRUITMENT</p>
              <span className="portal-badge placement">Placement</span>
            </div>
            <h2>Placement Portal</h2>
            <p>
              Executive command center for TPOs, Deputy TPOs, Placement Coordinators, and Director HR
              to publish drives, configure multi-tier eligibility rules, broadcast live round updates, and analyze hiring statistics.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              <button
                className="auth-submit"
                style={{ background: 'var(--pa-color-teal)', borderColor: 'var(--pa-color-teal)' }}
                type="button"
                onClick={() => onChoosePortal('/placement/login')}
              >
                Sign in to Placement Portal →
              </button>
            </div>

            <p className="portal-account-note">For the TPO, Deputy TPO, Placement Coordinators and Director HR.</p>
          </article>
        </div>

        {/* How it works */}
        <section className="how-it-works" aria-labelledby="how-it-works-title">
          <h2 id="how-it-works-title" className="how-title">How it works</h2>
          <ol className="how-steps">
            <li className="how-step">
              <div className="how-step-head">
                <span className="how-step-icon" aria-hidden="true">1</span>
                <span className="how-step-line" aria-hidden="true" />
              </div>
              <p className="how-step-label">Step 1</p>
              <h3>Sign in</h3>
              <p className="how-step-text">Pick your portal and sign in with your institute email.</p>
              <ul className="how-tags"><li>Institute</li><li>Placement</li></ul>
            </li>
            <li className="how-step">
              <div className="how-step-head">
                <span className="how-step-icon" aria-hidden="true">2</span>
                <span className="how-step-line" aria-hidden="true" />
              </div>
              <p className="how-step-label">Step 2</p>
              <h3>Track your progress</h3>
              <p className="how-step-text">See attendance, grades and lectures without chasing anyone.</p>
              <ul className="how-tags"><li>Attendance</li><li>Progress</li><li>Lectures</li></ul>
            </li>
            <li className="how-step">
              <div className="how-step-head">
                <span className="how-step-icon" aria-hidden="true">3</span>
              </div>
              <p className="how-step-label">Step 3</p>
              <h3>Get placement-ready</h3>
              <p className="how-step-text">Check each rule, try what-if, then apply and follow every round.</p>
              <ul className="how-tags"><li>Eligibility</li><li>What-if</li><li>Apply</li></ul>
            </li>
          </ol>
        </section>

        {/* Footer */}
        <footer style={{ marginTop: '54px', paddingTop: '24px', borderTop: '1px solid var(--pa-color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: 'var(--pa-color-muted)' }}>
          <div>
            <strong>Campus Connect / Placement Assistant</strong> · College Project Demonstration Release
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Powered by AI</span>
          </div>
        </footer>
      </div>

      {/* Demo Credentials Guide Modal */}
      {showDemoModal && (
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
          onClick={() => setShowDemoModal(false)}
        >
          <div
            className="pa-card"
            style={{
              maxWidth: '640px',
              width: '100%',
              padding: '28px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>College Demo Account Directory</h2>
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={() => setShowDemoModal(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--pa-color-muted)', marginBottom: '18px' }}>
              The application comes pre-seeded with verified test accounts across all 7 canonical roles.
              Select any role below to review credentials or navigate directly to its sign-in portal.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {demoAccounts.map((item) => (
                <button
                  key={item.role}
                  type="button"
                  className="quick-cred-btn"
                  style={{
                    background: selectedRoleInfo === item.role ? 'var(--pa-color-indigo)' : 'var(--pa-color-surface)',
                    color: selectedRoleInfo === item.role ? '#fff' : 'var(--pa-color-text)',
                  }}
                  onClick={() => setSelectedRoleInfo(item.role)}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>

            {(() => {
              const current = demoAccounts.find((a) => a.role === selectedRoleInfo) ?? demoAccounts[0];
              return (
                <div style={{ padding: '18px', borderRadius: '12px', background: 'var(--pa-color-page)', border: '1px solid var(--pa-color-border)', display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>
                      {current.icon} {current.label} Account
                    </h3>
                    <span className={`portal-badge ${current.portal === 'INSTITUTE' ? 'institute' : 'placement'}`}>
                      {current.portal} Portal
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--pa-color-muted)' }}>{current.desc}</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', marginTop: '6px' }}>
                    <div>
                      <small style={{ color: 'var(--pa-color-muted)' }}>Email:</small>
                      <br />
                      <strong>{current.email}</strong>
                    </div>
                    <div>
                      <small style={{ color: 'var(--pa-color-muted)' }}>Password:</small>
                      <br />
                      <strong>{current.pass}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="auth-submit"
                    style={{ marginTop: '8px' }}
                    onClick={() => {
                      setShowDemoModal(false);
                      onChoosePortal(current.portalPath);
                    }}
                  >
                    Go to {current.portal} Sign In →
                  </button>
                </div>
              );
            })()}

            <button
              type="button"
              className="auth-link"
              onClick={() => setShowDemoModal(false)}
              style={{ marginTop: '16px' }}
            >
              Close Directory
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
