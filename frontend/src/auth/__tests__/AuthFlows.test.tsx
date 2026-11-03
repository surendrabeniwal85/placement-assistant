import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PortalSelection from '../PortalSelection';
import PortalLoginForm from '../PortalLoginForm';
import RegisterStudent from '../../pages/RegisterStudent';
import ResetPassword from '../../pages/ResetPassword';
import AuthApplication from '../AuthApplication';
import { saveStoredSession, getStoredSession, clearStoredSession, SESSION_STORAGE_KEY } from '../sessionStore';
import { normalizePath, isProtectedPath, resolveRegisteredView } from '../../app/routes';
import type { AuthenticatedSession } from '../authApi';
import { getPreferredTheme, toggleTheme, applyTheme } from '../../design-system/theme';

describe('Theme System', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.body.removeAttribute('data-theme');
  });

  it('defaults to light or system theme and allows toggle', () => {
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    const next = toggleTheme('light');
    expect(next).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('campus_connect_theme')).toBe('dark');
  });

  it('retrieves saved theme from storage', () => {
    localStorage.setItem('campus_connect_theme', 'dark');
    expect(getPreferredTheme()).toBe('dark');
  });
});

describe('PortalSelection Landing Page', () => {
  it('renders product branding and portal entry points', () => {
    const onChoosePortal = vi.fn();
    render(<PortalSelection onChoosePortal={onChoosePortal} />);

    expect(screen.getByText('Placement Assistant')).toBeInTheDocument();
    expect(screen.getByText('Institute Portal')).toBeInTheDocument();
    expect(screen.getByText('Placement Portal')).toBeInTheDocument();

    const instituteBtn = screen.getByText(/Sign in to Institute Portal/i);
    fireEvent.click(instituteBtn);
    expect(onChoosePortal).toHaveBeenCalledWith('/institute/login');
  });

  it('opens the demo credentials directory modal on button click', () => {
    render(<PortalSelection onChoosePortal={vi.fn()} />);

    const demoBtn = screen.getByText(/View 7 Canonical Demo Accounts/i);
    fireEvent.click(demoBtn);

    expect(screen.getByText(/College Demo Account Directory/i)).toBeInTheDocument();
    expect(screen.getByText(/student@institute.ac.in/i)).toBeInTheDocument();
  });
});

describe('PortalLoginForm', () => {
  it('toggles password visibility between text and password', () => {
    render(
      <PortalLoginForm
        portal="INSTITUTE"
        title="Institute Sign In"
        description="Test login"
        onAuthenticated={vi.fn()}
        onChangePortal={vi.fn()}
        onResetPassword={vi.fn()}
      />
    );

    const passInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
    expect(passInput.type).toBe('password');

    const toggleBtn = screen.getByRole('button', { name: /Show password/i });
    fireEvent.click(toggleBtn);
    expect(passInput.type).toBe('text');

    fireEvent.click(toggleBtn);
    expect(passInput.type).toBe('password');
  });

  it('prefills seed credentials when quick-credential chip is clicked', () => {
    render(
      <PortalLoginForm
        portal="INSTITUTE"
        title="Institute Sign In"
        description="Test login"
        onAuthenticated={vi.fn()}
        onChangePortal={vi.fn()}
        onResetPassword={vi.fn()}
      />
    );

    const studentChip = screen.getByText(/🎓 Student/i);
    fireEvent.click(studentChip);

    const emailInput = screen.getByLabelText(/Institutional Email/i) as HTMLInputElement;
    const passInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;

    expect(emailInput.value).toBe('student@institute.ac.in');
    expect(passInput.value).toBe('Student@123');
  });
});

describe('RegisterStudent Page', () => {
  it('validates institutional email domain on submission', async () => {
    render(<RegisterStudent onBackToLogin={vi.fn()} onRegistered={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test Student' } });
    fireEvent.change(screen.getByLabelText(/Roll Number/i), { target: { value: 'CS2026-099' } });
    fireEvent.change(screen.getByLabelText(/Institutional Email Address/i), { target: { value: 'test@gmail.com' } });
    fireEvent.change(screen.getByLabelText(/Create Password/i), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'Password123!' } });

    fireEvent.click(screen.getByRole('button', { name: /Register Student Account/i }));

    expect(screen.getByText(/Student registration requires an @institute.ac.in institutional email/i)).toBeInTheDocument();
  });
});

describe('ResetPassword Page', () => {
  it('renders request token form and allows transition to token entry', () => {
    render(<ResetPassword portal="INSTITUTE" onBackToLogin={vi.fn()} />);

    expect(screen.getByText(/Reset your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Reset Token/i })).toBeInTheDocument();

    const switchBtn = screen.getByText(/Already have a reset token/i);
    fireEvent.click(switchBtn);

    expect(screen.getByLabelText(/Reset Verification Token/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Set New Password/i })).toBeInTheDocument();
  });
});

describe('Session Persistence Store', () => {
  const dummySession: AuthenticatedSession = {
    accessToken: 'test-access-token-xyz',
    tokenType: 'Bearer',
    expiresIn: 3600,
    email: 'student@institute.ac.in',
    roles: ['ROLE_STUDENT'],
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('saves session to both localStorage and sessionStorage', () => {
    saveStoredSession(dummySession, 'INSTITUTE');

    const localRaw = localStorage.getItem(SESSION_STORAGE_KEY);
    const sessionRaw = sessionStorage.getItem(SESSION_STORAGE_KEY);

    expect(localRaw).toBeTruthy();
    expect(sessionRaw).toBeTruthy();
    expect(JSON.parse(localRaw!).session.accessToken).toBe('test-access-token-xyz');
    expect(JSON.parse(sessionRaw!).portal).toBe('INSTITUTE');
  });

  it('retrieves active unexpired session from storage', () => {
    saveStoredSession(dummySession, 'PLACEMENT');

    const result = getStoredSession();
    expect(result).not.toBeNull();
    expect(result?.session.email).toBe('student@institute.ac.in');
    expect(result?.portal).toBe('PLACEMENT');
  });

  it('clears and ignores expired sessions', () => {
    const expiredPayload = {
      session: dummySession,
      portal: 'INSTITUTE',
      storedAt: Date.now() - 4000 * 1000, // 4000s ago, exceeds 3600s
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(expiredPayload));

    const result = getStoredSession();
    expect(result).toBeNull();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('clears stored session on logout', () => {
    saveStoredSession(dummySession, 'INSTITUTE');
    clearStoredSession();

    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(getStoredSession()).toBeNull();
  });
});

describe('Routing and Session Refresh Handling', () => {
  const dummySession: AuthenticatedSession = {
    accessToken: 'test-token-active',
    tokenType: 'Bearer',
    expiresIn: 3600,
    email: 'student@institute.ac.in',
    roles: ['ROLE_STUDENT'],
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('normalizes trailing slashes and identifies protected paths', () => {
    expect(normalizePath('/auth/session/')).toBe('/auth/session');
    expect(normalizePath('/')).toBe('/');
    expect(isProtectedPath('/auth/session')).toBe(true);
    expect(isProtectedPath('/auth/session/')).toBe(true);
    expect(isProtectedPath('/dashboard')).toBe(true);
    expect(isProtectedPath('/institute/login')).toBe(false);
    expect(resolveRegisteredView('/auth/session/')).toBe('AUTH_SESSION');
  });

  it('restores authenticated session on refresh at /auth/session instead of showing 404', () => {
    saveStoredSession(dummySession, 'INSTITUTE');
    window.history.pushState({}, '', '/auth/session');

    render(<AuthApplication />);

    // Must NOT display "Page not found"
    expect(screen.queryByText(/Page not found/i)).not.toBeInTheDocument();
    // Must render the authenticated student workspace / dashboard
    expect(screen.getByText(/Offer Path & What-If/i)).toBeInTheDocument();
    expect(screen.getByText(/student@institute.ac.in/i)).toBeInTheDocument();
  });

  it('redirects unauthenticated refresh at /auth/session to login flow instead of 404', () => {
    clearStoredSession();
    window.history.pushState({}, '', '/auth/session');

    render(<AuthApplication />);

    // Must NOT display "Page not found"
    expect(screen.queryByText(/Page not found/i)).not.toBeInTheDocument();
    // Must render the Institute Portal sign in form
    expect(screen.getByText(/Institute Portal sign in/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/institute/login');
  });

  it('renders 404 page for genuinely unknown routes', () => {
    window.history.pushState({}, '', '/non-existent-route-99');

    render(<AuthApplication />);

    expect(screen.getByText(/Page not found/i)).toBeInTheDocument();
    expect(screen.getByText(/\/non-existent-route-99/i)).toBeInTheDocument();
  });

  it('clears session and returns to portal landing on sign out', async () => {
    saveStoredSession(dummySession, 'INSTITUTE');
    window.history.pushState({}, '', '/auth/session');

    render(<AuthApplication />);

    const signOutBtn = screen.getByRole('button', { name: /Sign out/i });
    await act(async () => {
      fireEvent.click(signOutBtn);
    });

    expect(getStoredSession()).toBeNull();
    expect(screen.getByText(/Sign in to Institute Portal/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign in to Placement Portal/i)).toBeInTheDocument();
  });
});
