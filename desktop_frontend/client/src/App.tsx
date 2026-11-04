import { useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { NewTaskModal } from './components/NewTaskModal';
import { PlaceholderPage } from './components/PlaceholderPage';
import { TopNav } from './components/TopNav';
import { initialTasks } from './data/mockData';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import type { Page, Task } from './types';

export default function App() {
  const [page, setPage] = useState<Page>('Dashboard');
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showNewTask, setShowNewTask] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const toggleTask = (id: string) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const createTask = (label: string, tag: string) => {
    setTasks((prev) => [...prev, { id: crypto.randomUUID(), label, tag, context: `${tag} · added today`, done: false }]);
    setShowNewTask(false);
    setToast(`Added “${label}” to today’s tasks`);
  };

  return (
    <div className="dashboard">
      <TopNav activePage={page} onNavigate={setPage} onLogOut={() => setToast('Logged out (demo only, nothing was sent)')} />

      {page === 'Dashboard' ? (
        <DashboardPage
          tasks={tasks}
          onToggleTask={toggleTask}
          onNewTask={() => setShowNewTask(true)}
          hasUnread={hasUnread}
          onOpenNotifications={() => setHasUnread(false)}
          onNavigate={setPage}
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
