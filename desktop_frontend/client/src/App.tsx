import { useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

import { NewTaskModal } from './components/NewTaskModal';
import { PlaceholderPage } from './components/PlaceholderPage';
import { TopNav } from './components/TopNav';
import { initialSettings, initialTasks, notifications as initialNotifications } from './data/mockData';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { SettingsPage } from './pages/settings/SettingsPage';

import type { Page, Task, HomePage, PublicView, Notification, UserSettings } from './types';
import { HomeTopNav } from './components/HomeTopNav';
import { Login } from './pages/home/Login';
import { SignUp } from './pages/home/SignUp';
import { Home } from './pages/home/Home';
import { AboutUs } from './pages/home/AboutUs';
import { Contact } from './pages/home/Contact';
import { PrivacyPolicy } from './pages/home/PrivacyPolicy';
import { FAQ } from './pages/home/FAQ';
import { ForgotP } from './pages/home/ForgotP';

export default function App() {
  // controls if allowed into the Dashboard
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // controls public screen
  const [publicView, setPublicView] = useState<PublicView>('Home');
  const [activePublicTab, setActivePublicTab] = useState<HomePage>('Home');

  // keeps track of which tab is highlighted in the dash
  const [page, setPage] = useState<Page>('Dashboard');
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showNewTask, setShowNewTask] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [hasUnread, setHasUnread] = useState(true);
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState<UserSettings>(initialSettings);
  const [toast, setToast] = useState<string | null>(null);

  const toggleTask = (id: string) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const dismissNotification = (id: string) => setNotifications((prev) => prev.filter((n) => n.id !== id));
  const showUnreadDot = hasUnread && notifications.length > 0;
  const markNotificationsRead = () => setHasUnread(false);

  const saveSettings = (next: UserSettings) => {
    setSettings(next);
    setToast('Settings saved');
  };

  const createTask = (label: string, tag: string) => {
    setTasks((prev) => [...prev, { id: crypto.randomUUID(), label, tag, context: `${tag} · added today`, done: false }]);
    setShowNewTask(false);
    setToast(`Added “${label}” to today’s tasks`);
  };
   // auth 
  const handleLogin = () => {
    setIsAuthenticated(true);
    setToast('Successfully logged in!');
  };
  const handleLogout = () => {
    setIsAuthenticated(false);
    setPublicView('Login'); 
    setToast('Logged out successfully');
  };

  if (!isAuthenticated) {
    const renderPublicContent = () => {
      switch (publicView) {
        case 'Login':
          return <Login onSwitchToSignUp={() => setPublicView('SignUp')} onLoginSuccess={handleLogin} onSwitchToForgotPwd={() => setPublicView('ForgotPassword')} />;
        case 'SignUp':
          return <SignUp onSwitchToLogin={() => setPublicView('Login')} onSignUpSuccess={handleLogin} />;
        case 'ForgotPassword':
          return <ForgotP onSwitchToLogin={() => setPublicView('Login')} />;
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
          onNavigate={(p) => { setActivePublicTab(p); setPublicView(p); }}
          onLoginClick={() => setPublicView('Login')}
          onSignUpClick={() => setPublicView('SignUp')}
        />
        <main className="flex-grow-1">
          {renderPublicContent()}
        </main>
        
        <ToastContainer position="bottom-center" className="p-4 position-fixed">
          <Toast show={toast !== null} onClose={() => setToast(null)} delay={2500} autohide className="toast-ea">
            <Toast.Body className="text-center">{toast}</Toast.Body>
          </Toast>
        </ToastContainer>
      </div>
    );
  }
  //private dashboard
  return (
    <div className="dashboard">
      <TopNav activePage={page} onNavigate={setPage} onLogOut={() => setToast('Logged out (demo only, nothing was sent)')} />

      {page === 'Dashboard' ? (
        <DashboardPage
          tasks={tasks}
          onToggleTask={toggleTask}
          onNewTask={() => setShowNewTask(true)}
          search={search}
          onSearchChange={setSearch}
          notifications={notifications}
          onDismissNotification={dismissNotification}
          hasUnread={showUnreadDot}
          onOpenNotifications={markNotificationsRead}
          onNavigate={setPage}
        />
      ) : page === 'Settings' ? (
        <SettingsPage
          settings={settings}
          onSave={saveSettings}
          search={search}
          onSearchChange={setSearch}
          onSearchSubmit={() => setPage('Dashboard')}
          notifications={notifications}
          onDismissNotification={dismissNotification}
          hasUnread={showUnreadDot}
          onOpenNotifications={markNotificationsRead}
        />
      ) : (
        <PlaceholderPage page={page} onBack={() => setPage('Dashboard')} />
      )}

      <NewTaskModal show={showNewTask} onClose={() => setShowNewTask(false)} onCreate={createTask} />

      <ToastContainer position="bottom-center" className="p-4 position-fixed">
        <Toast show={toast !== null} onClose={() => setToast(null)} delay={2500} autohide className="toast-ea">
          <Toast.Body className="text-center">{toast}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}
