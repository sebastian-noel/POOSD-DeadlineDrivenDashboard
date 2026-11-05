import type { Notification } from '../../types';
import { Icon } from '../../components/Icon';
import { NotificationsMenu } from '../../components/NotificationsMenu';
import { PageHeader } from '../../components/PageHeader';
import { SearchPill } from '../../components/SearchPill';

interface GreetingProps {
  userName: string;
  dateLabel: string;
  upcomingThisWeek: number;
  search: string;
  onSearchChange: (value: string) => void;
  notifications: Notification[];
  onDismissNotification: (id: string) => void;
  hasUnread: boolean;
  onOpenNotifications: () => void;
  onNewTask: () => void;
}

function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function Greeting({
  userName,
  dateLabel,
  upcomingThisWeek,
  search,
  onSearchChange,
  notifications,
  onDismissNotification,
  hasUnread,
  onOpenNotifications,
  onNewTask,
}: GreetingProps) {
  return (
    <PageHeader
      title={`${greetingForNow()}, ${userName}`}
      subtitle={`${dateLabel} · ${upcomingThisWeek} deadline${upcomingThisWeek === 1 ? '' : 's'} in the next 7 days`}
    >
      <SearchPill value={search} onChange={onSearchChange} />

      <NotificationsMenu
        notifications={notifications}
        hasUnread={hasUnread}
        onOpen={onOpenNotifications}
        onDismiss={onDismissNotification}
      />

      <button type="button" className="btn-pill btn-pill-ink new-task-btn" onClick={onNewTask}>
        <Icon name="plus-on-ink" />
        New task
      </button>
    </PageHeader>
  );
}
