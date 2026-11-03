import { useEffect, useState, type FormEvent } from 'react';
import BrandHeader from './BrandHeader';
import { login, type AuthenticatedSession, type Portal } from './authApi';

interface PortalLoginFormProps {
  readonly portal: Portal;
  readonly title: string;
  readonly description: string;
  readonly onAuthenticated: (session: AuthenticatedSession) => void;
  readonly onChangePortal: () => void;
  readonly onResetPassword: () => void;
  readonly onRegister?: () => void;
}

export default function PortalLoginForm({
  portal,
  title,
  description,
  onAuthenticated,
  onChangePortal,
  onResetPassword,
  onRegister,
}: PortalLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSlow, setIsSlow] = useState(false);

  // If sign-in takes more than a few seconds, tell the user the server may be waking up.
  useEffect(() => {
    if (!isSubmitting) return;
    const timer = setTimeout(() => setIsSlow(true), 6000);
    return () => clearTimeout(timer);
  }, [isSubmitting]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    setIsSlow(false);
    try {
      const session = await login(portal, email.trim(), password);
      setPassword('');
      onAuthenticated(session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function prefill(testEmail: string, testPass: string) {
    setEmail(testEmail);
    setPassword(testPass);
    setError('');
  }

  return (
    <main className="auth-page pa-foundation">
      <section className="auth-card pa-card" data-portal={portal.toLowerCase()} aria-labelledby="login-title">
        <BrandHeader />
        <h1 id="login-title">{title}</h1>
        <p className="auth-description">{description}</p>

        <form onSubmit={submit} aria-busy={isSubmitting}>
          <label htmlFor={`${portal}-email`}>Institutional Email</label>
          <input
            id={`${portal}-email`}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={portal === 'INSTITUTE' ? 'e.g. student@institute.ac.in' : 'e.g. tpo@placement.ac.in'}
            required
            maxLength={190}
            disabled={isSubmitting}
          />

          <label htmlFor={`${portal}-password`}>Password</label>
          <div className="password-input-wrap">
            <input
              id={`${portal}-password`}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••••••"
              required
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error && <p className="auth-error" role="alert" aria-live="polite">{error}</p>}
          {isSubmitting && isSlow && (
            <p role="status" aria-live="polite" style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>
              The server may be waking up. This can take up to a minute, so please keep this page open.
            </p>
          )}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying credentials…' : 'Sign in'}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', gap: '8px' }}>
          <button className="auth-link" style={{ textAlign: 'left', margin: 0 }} type="button" onClick={onResetPassword} disabled={isSubmitting}>
            Forgot password?
          </button>
          {portal === 'INSTITUTE' && onRegister && (
            <button className="auth-link" style={{ textAlign: 'right', margin: 0 }} type="button" onClick={onRegister} disabled={isSubmitting}>
              Claim Student Account
            </button>
          )}
        </div>

        {/* Quick-Fill Seed Credentials for Immediate College Demo */}
        <div className="quick-creds-box">
          <p className="quick-creds-title">⚡ 1-Click Demo Credentials</p>
          <div className="quick-creds-chips">
            {portal === 'INSTITUTE' ? (
              <>
                <button
                  type="button"
                  className="quick-cred-btn"
                  onClick={() => prefill('student@institute.ac.in', 'Student@123')}
                >
                  🎓 Student
                </button>
                <button
                  type="button"
                  className="quick-cred-btn"
                  onClick={() => prefill('teacher@institute.ac.in', 'Teacher@123')}
                >
                  👨‍🏫 Teacher
                </button>
                <button
                  type="button"
                  className="quick-cred-btn"
                  onClick={() => prefill('hod@institute.ac.in', 'Hod@123')}
                >
                  🏛️ HOD
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="quick-cred-btn"
                  onClick={() => prefill('hr.director@placement.ac.in', 'Director@123')}
                >
                  🏢 Director HR
                </button>
                <button
                  type="button"
                  className="quick-cred-btn"
                  onClick={() => prefill('tpo@placement.ac.in', 'Tpo@123')}
                >
                  🎯 TPO
                </button>
                <button
                  type="button"
                  className="quick-cred-btn"
                  onClick={() => prefill('dtpo@placement.ac.in', 'Dtpo@123')}
                >
                  📋 D-TPO
                </button>
                <button
                  type="button"
                  className="quick-cred-btn"
                  onClick={() => prefill('coordinator@placement.ac.in', 'Coordinator@123')}
                >
                  🤝 Coordinator
                </button>
              </>
            )}
          </div>
        </div>

        <button className="auth-link" type="button" onClick={onChangePortal} disabled={isSubmitting} style={{ marginTop: '16px' }}>
          ← Return to portal selection
        </button>
      </section>
    </main>
  );
}
