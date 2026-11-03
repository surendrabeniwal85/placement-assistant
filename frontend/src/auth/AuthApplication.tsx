import { useEffect, useState } from 'react';
import {
  resolveRegisteredView,
  isProtectedPath,
  normalizePath,
  type RegisteredView,
} from '../app/routes';
import InstituteLogin from '../pages/InstituteLogin';
import PlacementLogin from '../pages/PlacementLogin';
import RegisterStudent from '../pages/RegisterStudent';
import ResetPassword from '../pages/ResetPassword';
import PortalSelection from './PortalSelection';
import PortalDashboard from './PortalDashboard';
import type { AuthenticatedSession, Portal } from './authApi';
import { getStoredSession, saveStoredSession, clearStoredSession } from './sessionStore';
import './auth.css';

function currentPath(): string {
  return normalizePath(window.location.pathname);
}

export default function AuthApplication() {
  const [pathname, setPathname] = useState(currentPath);
  const [session, setSession] = useState<AuthenticatedSession | null>(() => {
    const stored = getStoredSession();
    return stored ? stored.session : null;
  });
  const [portal, setPortal] = useState<Portal | null>(() => {
    const stored = getStoredSession();
    return stored ? stored.portal : null;
  });

  function navigate(path: string) {
    const normalized = normalizePath(path);
    window.history.pushState({}, '', normalized);
    setPathname(normalized);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleAuthenticated(authenticatedSession: AuthenticatedSession, selectedPortal: Portal) {
    saveStoredSession(authenticatedSession, selectedPortal);
    setSession(authenticatedSession);
    setPortal(selectedPortal);
    navigate('/auth/session');
  }

  function handleSignOut() {
    clearStoredSession();
    setSession(null);
    setPortal(null);
    navigate('/');
  }

  useEffect(() => {
    const onPopState = () => setPathname(currentPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    const stored = getStoredSession();
    const remainingSeconds = stored
      ? Math.max(0, session.expiresIn - (Date.now() - stored.storedAt) / 1000)
      : session.expiresIn;

    if (remainingSeconds <= 0) {
      handleSignOut();
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      handleSignOut();
    }, remainingSeconds * 1000);
    return () => window.clearTimeout(timeout);
  }, [session]);

  const view: RegisteredView | null = resolveRegisteredView(pathname);

  // Authenticated State -> Render Full Interactive Portal Dashboard
  if (session) {
    if (
      view === 'AUTH_SESSION' ||
      view === 'PORTAL_DASHBOARD' ||
      isProtectedPath(pathname) ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/portal')
    ) {
      return (
        <PortalDashboard
          session={session}
          portal={portal ?? 'INSTITUTE'}
          onSignOut={handleSignOut}
        />
      );
    }
  }

  // Unauthenticated Route Handlers
  if (!session && view === 'PORTAL_SELECTION') {
    return (
      <PortalSelection
        onChoosePortal={navigate}
        onClaimAccount={() => navigate('/institute/register')}
      />
    );
  }

  if (!session && view === 'INSTITUTE_LOGIN') {
    return (
      <InstituteLogin
        onAuthenticated={(authenticatedSession) => {
          handleAuthenticated(authenticatedSession, 'INSTITUTE');
        }}
        onChangePortal={() => navigate('/')}
        onResetPassword={() => navigate('/institute/reset-password')}
        onRegister={() => navigate('/institute/register')}
      />
    );
  }

  if (!session && view === 'PLACEMENT_LOGIN') {
    return (
      <PlacementLogin
        onAuthenticated={(authenticatedSession) => {
          handleAuthenticated(authenticatedSession, 'PLACEMENT');
        }}
        onChangePortal={() => navigate('/')}
        onResetPassword={() => navigate('/placement/reset-password')}
      />
    );
  }

  if (!session && view === 'INSTITUTE_REGISTER') {
    return (
      <RegisterStudent
        onBackToLogin={() => navigate('/institute/login')}
        onRegistered={() => navigate('/institute/login')}
      />
    );
  }

  if (!session && view === 'INSTITUTE_RESET_PASSWORD') {
    return (
      <ResetPassword portal="INSTITUTE" onBackToLogin={() => navigate('/institute/login')} />
    );
  }

  if (!session && view === 'PLACEMENT_RESET_PASSWORD') {
    return (
      <ResetPassword portal="PLACEMENT" onBackToLogin={() => navigate('/placement/login')} />
    );
  }

  // Protected route accessed without active session -> Redirect to appropriate login flow
  if (!session && isProtectedPath(pathname)) {
    const targetLogin = pathname.startsWith('/placement') ? '/placement/login' : '/institute/login';
    if (typeof window !== 'undefined' && window.location.pathname !== targetLogin) {
      window.history.replaceState({}, '', targetLogin);
    }
    if (targetLogin === '/placement/login') {
      return (
        <PlacementLogin
          onAuthenticated={(authenticatedSession) => {
            handleAuthenticated(authenticatedSession, 'PLACEMENT');
          }}
          onChangePortal={() => navigate('/')}
          onResetPassword={() => navigate('/placement/reset-password')}
        />
      );
    }
    return (
      <InstituteLogin
        onAuthenticated={(authenticatedSession) => {
          handleAuthenticated(authenticatedSession, 'INSTITUTE');
        }}
        onChangePortal={() => navigate('/')}
        onResetPassword={() => navigate('/institute/reset-password')}
        onRegister={() => navigate('/institute/register')}
      />
    );
  }

  // Active Session Default fallback
  if (session) {
    return (
      <PortalDashboard
        session={session}
        portal={portal ?? 'INSTITUTE'}
        onSignOut={handleSignOut}
      />
    );
  }

  // Unknown route -> 404 Not Found Card
  return (
    <main className="auth-page pa-foundation">
      <section className="auth-card pa-card pa-foundation" aria-labelledby="portal-title">
        <p className="auth-eyebrow">PLACEMENT ASSISTANT</p>
        <p className="auth-tagline">Powered by AI</p>
        <h1 id="portal-title">Page not found</h1>
        <p className="auth-description">
          The requested page route (<code>{pathname}</code>) is not registered in the application registry.
        </p>
        <button className="auth-submit" type="button" onClick={() => navigate('/')}>
          Return to Portal Selection
        </button>
      </section>
    </main>
  );
}
