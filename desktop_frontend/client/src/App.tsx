import { useCallback, useEffect, useState } from 'react';
import { Spinner, Toast, ToastContainer } from 'react-bootstrap';

import { HomeTopNav } from './components/HomeTopNav';
import { NewTaskModal } from './components/NewTaskModal';
import { PlaceholderPage } from './components/PlaceholderPage';
import { TopNav } from './components/TopNav';
import { useDashboardData, type NewTaskInput } from './hooks/useDashboardData';
import { authApi, session, type ApiUser } from './lib/api';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { AboutUs } from './pages/home/AboutUs';
import { Contact } from './pages/home/Contact';
import { FAQ } from './pages/home/FAQ';
import { ForgotP } from './pages/home/ForgotP';
import { Home } from './pages/home/Home';
import { Login, type Notice } from './pages/home/Login';
import { PrivacyPolicy } from './pages/home/PrivacyPolicy';
import { ResetPassword } from './pages/home/ResetPassword';
import { SignUp } from './pages/home/SignUp';
import type { HomePage, Page, PublicView } from './types';

/** Query params the API's emailed links add: `?verified=1|0` after email verification, `?reset=<token>` for a password reset. */
function readLinkParams(): { verified: '1' | '0' | null; reset: string | null } {
  const params = new URLSearchParams(window.location.search);
  const verified = params.get('verified');
  return { verified: verified === '1' ? '1' : verified === '0' ? '0' : null, reset: params.get('reset') };
}

function noticeForVerification(verified: '1' | '0' | null): Notice | null {
  if (verified === '1') return { kind: 'success', text: 'Email verified! You can log in now.' };
  if (verified === '0') {
    return { kind: 'danger', text: 'That verification link is invalid, expired, or already used. Try logging in, or request a new link below.' };
  }
  return null;
}

interface AuthenticatedAppProps {
  user: ApiUser;
  onLogout: () => void;
  onSessionExpired: () => void;
  notify: (message: string) => void;
}

/** The private dashboard. Mounted only while logged in, so its data is dropped on logout. */
function AuthenticatedApp({ user, onLogout, onSessionExpired, notify }: AuthenticatedAppProps) {
  const [page, setPage] = useState<Page>('Dashboard');
  const [showNewTask, setShowNewTask] = useState(false);
  // Ids of notifications the user cleared; kept here so they stay cleared while switching pages.
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<ReadonlySet<string>>(() => new Set());
  const [hasUnread, setHasUnread] = useState(true);
  const data = useDashboardData(onSessionExpired);

  const createTask = async (input: NewTaskInput) => {
    await data.createTask(input);
    setShowNewTask(false);
    notify(`Added “${input.title}” to today’s tasks`);
  };

  const dismissNotification = (id: string) =>
    setDismissedNotificationIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  return (
    <div className="dashboard">
      <TopNav activePage={page} onNavigate={setPage} onLogOut={onLogout} />

      {page === 'Dashboard' ? (
        <DashboardPage
          user={user}
          data={data}
          onNewTask={() => setShowNewTask(true)}
          dismissedNotificationIds={dismissedNotificationIds}
          onDismissNotification={dismissNotification}
          hasUnread={hasUnread}
          onOpenNotifications={() => setHasUnread(false)}
          onNavigate={setPage}
        />
      ) : (
        <PlaceholderPage page={page} onBack={() => setPage('Dashboard')} />
      )}

      <NewTaskModal show={showNewTask} onClose={() => setShowNewTask(false)} milestones={data.milestones} onCreate={createTask} />
    </div>
  );
}

export default function App() {
  const [link] = useState(readLinkParams);
  const [user, setUser] = useState<ApiUser | null>(null);
  // With no stored token there is nothing to check; otherwise wait for /me before choosing a screen.
  const [authChecked, setAuthChecked] = useState(() => !session.token);

  // public screens
  const [publicView, setPublicView] = useState<PublicView>(link.reset ? 'ResetPassword' : link.verified ? 'Login' : 'Home');
  const [activePublicTab, setActivePublicTab] = useState<HomePage>('Home');
  const [loginNotice, setLoginNotice] = useState<Notice | null>(() => noticeForVerification(link.verified));
  const [resetToken, setResetToken] = useState<string | null>(link.reset);
  const [toast, setToast] = useState<string | null>(null);

  // Remove the one-time link params from the address bar.
  useEffect(() => {
    if (link.reset || link.verified) window.history.replaceState(null, '', window.location.pathname);
  }, [link]);

  // Restore the session from the stored JWT on reload.
  useEffect(() => {
    if (!session.token) return;
    let cancelled = false;
    authApi
      .me()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => session.clear())
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoginSuccess = (me: ApiUser) => {
    setUser(me);
    setLoginNotice(null);
    setToast(`Welcome back${me.displayName ? `, ${me.displayName}` : ''}!`);
  };

  const logout = useCallback(() => {
    session.clear();
    setUser(null);
    setPublicView('Login');
    setToast('Logged out successfully');
  }, []);

  const onSessionExpired = useCallback(() => {
    session.clear();
    setUser(null);
    setPublicView('Login');
    setLoginNotice({ kind: 'info', text: 'Your session expired. Please log in again.' });
  }, []);

  const toastView = (
    <ToastContainer position="bottom-center" className="p-4 position-fixed">
      <Toast show={toast !== null} onClose={() => setToast(null)} delay={2500} autohide className="toast-ea">
        <Toast.Body className="text-center">{toast}</Toast.Body>
      </Toast>
    </ToastContainer>
  );

  if (!authChecked) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-white">
        <Spinner animation="border" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (!user) {
    const goToLogin = () => setPublicView('Login');
    const renderPublicContent = () => {
      switch (publicView) {
        case 'Login':
          return (
            <Login
              notice={loginNotice}
              onSwitchToSignUp={() => setPublicView('SignUp')}
              onLoginSuccess={handleLoginSuccess}
              onSwitchToForgotPwd={() => setPublicView('ForgotPassword')}
            />
          );
        case 'SignUp':
          return <SignUp onSwitchToLogin={goToLogin} />;
        case 'ForgotPassword':
          return <ForgotP onSwitchToLogin={goToLogin} />;
        case 'ResetPassword':
          return resetToken ? (
            <ResetPassword
              token={resetToken}
              onDone={() => {
                setResetToken(null);
                setLoginNotice({ kind: 'success', text: 'Password updated. Log in with your new password.' });
                setPublicView('Login');
              }}
              onSwitchToLogin={goToLogin}
            />
          ) : (
            <ForgotP onSwitchToLogin={goToLogin} />
          );
        case 'Home':
          return <Home />;
        case 'About Us':
          return <AboutUs />;
        case 'FAQ':
          return <FAQ />;
        case 'Contact':
          return <Contact />;
        case 'Privacy Policy & ToS':
          return <PrivacyPolicy />;
        default:
          return <Home />;
      }
    };
    return (
      <div className="min-vh-100 d-flex flex-column bg-white text-dark">
        <HomeTopNav
          activePage={activePublicTab}
          onNavigate={(p) => {
            setActivePublicTab(p);
            setPublicView(p);
          }}
          onLoginClick={goToLogin}
          onSignUpClick={() => setPublicView('SignUp')}
        />
        <main className="flex-grow-1">{renderPublicContent()}</main>
        {toastView}
      </div>
    );
  }

  return (
    <>
      <AuthenticatedApp user={user} onLogout={logout} onSessionExpired={onSessionExpired} notify={setToast} />
      {toastView}
    </>
  );
}
