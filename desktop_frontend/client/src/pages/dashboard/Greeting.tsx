import { Dropdown } from 'react-bootstrap';
import mascot from '../../assets/mascot.svg';
import type { Notification } from '../../types';
import { CloseIcon, Icon } from '../../components/Icon';

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
    <section className="d-flex flex-wrap align-items-center justify-content-between gap-4">
      <div className="d-flex align-items-center gap-4 flex-wrap">
        <img src={mascot} alt="Erm Actually cat mascot" width={210} height={113} />
        <div className="d-flex flex-column" style={{ gap: 6 }}>
          <h1 className="t-display m-0">
            {greetingForNow()}, {userName}
          </h1>
          <p className="t-lead text-ink-secondary m-0">
            {dateLabel} · {upcomingThisWeek} deadline{upcomingThisWeek === 1 ? '' : 's'} in the next 7 days
          </p>
        </div>
      </div>

      <div className="d-flex align-items-center flex-wrap" style={{ gap: 12 }}>
        <label className="pill search-pill mb-0">
          <Icon name="search" />
          <input
            type="search"
            placeholder="Search tasks and milestones"
            aria-label="Search tasks and milestones"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>

        <Dropdown align="end" onToggle={(open) => open && onOpenNotifications()}>
          <Dropdown.Toggle
            bsPrefix="icon-btn"
            style={{ width: 44, height: 44 }}
            aria-label={hasUnread ? 'Notifications (unread)' : 'Notifications'}
          >
            <Icon name="bell" />
            {hasUnread && <span className="unread-dot" />}
          </Dropdown.Toggle>
          <Dropdown.Menu className="dropdown-menu-ea mt-2">
            <Dropdown.Header className="t-overline text-ink-secondary">NOTIFICATIONS</Dropdown.Header>
            {notifications.length === 0 ? (
              <Dropdown.ItemText className="t-body text-ink-secondary px-3 py-2">You're all caught up</Dropdown.ItemText>
            ) : (
              notifications.map((n) => (
                <Dropdown.ItemText key={n.id} className="dropdown-item d-flex align-items-start gap-2">
                  <div className="flex-grow-1">
                    <div className="t-body-bold">{n.text}</div>
                    <div className="t-caption text-ink-secondary">{n.time}</div>
                  </div>
                  <button
                    type="button"
                    className="notif-dismiss"
                    aria-label={`Clear notification: ${n.text}`}
                    title="Clear"
                    onClick={() => onDismissNotification(n.id)}
                  >
                    <CloseIcon />
                  </button>
                </Dropdown.ItemText>
              ))
            )}
          </Dropdown.Menu>
        </Dropdown>

        <button type="button" className="btn-pill btn-pill-ink new-task-btn" onClick={onNewTask}>
          <Icon name="plus-on-ink" />
          New task
        </button>
      </div>
    </section>
  );
}
