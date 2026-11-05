import { Dropdown } from 'react-bootstrap';
import type { Notification } from '../types';
import { CloseIcon, Icon } from './Icon';

interface NotificationsMenuProps {
  notifications: Notification[];
  hasUnread: boolean;
  onOpen: () => void;
  onDismiss: (id: string) => void;
}

export function NotificationsMenu({ notifications, hasUnread, onOpen, onDismiss }: NotificationsMenuProps) {
  return (
    <Dropdown align="end" onToggle={(open) => open && onOpen()}>
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
                onClick={() => onDismiss(n.id)}
              >
                <CloseIcon />
              </button>
            </Dropdown.ItemText>
          ))
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}
