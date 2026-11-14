import { useState, type FormEvent } from 'react';
import { NotificationsMenu } from '../../components/NotificationsMenu';
import { PageHeader } from '../../components/PageHeader';
import { SearchPill } from '../../components/SearchPill';
import {
  CALENDAR_VIEW_OPTIONS,
  REMINDER_OPTIONS,
  TIME_ZONE_OPTIONS,
  WEEK_START_OPTIONS,
} from '../../data/preferences';
import type { Notification, UserSettings } from '../../types';
import { NumberField, SelectField, SettingsCard, SwitchRow, TextField } from './SettingsFields';

const FORM_ID = 'settings-form';

interface SettingsPageProps {
  settings: UserSettings;
  onSave: (settings: UserSettings) => Promise<void>;
  search: string;
  onSearchChange: (value: string) => void;
  /** Enter in the search box: results live on the dashboard. */
  onSearchSubmit: () => void;
  notifications: Notification[];
  onDismissNotification: (id: string) => void;
  hasUnread: boolean;
  onOpenNotifications: () => void;
}

export function SettingsPage({
  settings,
  onSave,
  search,
  onSearchChange,
  onSearchSubmit,
  notifications,
  onDismissNotification,
  hasUnread,
  onOpenNotifications,
}: SettingsPageProps) {
  // Edits stay local until "Save changes".
  const [draft, setDraft] = useState<UserSettings>(settings);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...draft, displayName: draft.displayName.trim() });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Your profile, reminders, and focus preferences">
        <SearchPill value={search} onChange={onSearchChange} onSubmit={onSearchSubmit} />
        <NotificationsMenu
          notifications={notifications}
          hasUnread={hasUnread}
          onOpen={onOpenNotifications}
          onDismiss={onDismissNotification}
        />
        <button type="submit" form={FORM_ID} className="btn-pill btn-pill-ink header-btn" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </PageHeader>

      {error && <div role="alert" className="alert alert-danger">{error} Your edits are still here. Try saving again.</div>}
      <form id={FORM_ID} onSubmit={(event) => void handleSubmit(event)}>
        <fieldset disabled={saving} className="border-0 p-0 m-0">
          <div className="row g-4">
            <div className="col-12 col-lg-6">
              <SettingsCard title="Profile" gap={18} className="settings-card-account">
                <TextField
                  label="Display name"
                  value={draft.displayName}
                  autoComplete="nickname"
                  required={false}
                  maxLength={80}
                  onChange={(v) => update('displayName', v)}
                />
                <TextField
                  label="Email address"
                  type="email"
                  readOnly
                  value={draft.email}
                  autoComplete="email"
                  onChange={(v) => update('email', v)}
                />
                <p className="t-caption text-ink-secondary m-0">Your verified login email cannot be changed here.</p>
              </SettingsCard>
            </div>

            <div className="col-12 col-lg-6">
              <SettingsCard title="Notifications" gap={15} className="settings-card-account">
                <p className="t-caption text-ink-secondary m-0">Email reminders and daily summaries are not available yet. The bell continues to show upcoming deadlines in the app.</p>
                <SwitchRow
                  label="Deadline reminders"
                  description="Remind me when a task or milestone is almost due."
                  disabled
                  checked={draft.deadlineReminders}
                  onChange={(v) => update('deadlineReminders', v)}
                />
                <SelectField
                  label="Remind me"
                  value={draft.remindBefore}
                  options={REMINDER_OPTIONS}
                  disabled
                  onChange={(v) => update('remindBefore', v)}
                />
                <hr className="divider-subtle" />
                <SwitchRow
                  label="Daily summary"
                  description="Send a morning list of my open tasks."
                  disabled
                  checked={draft.dailySummary}
                  onChange={(v) => update('dailySummary', v)}
                />
              </SettingsCard>
            </div>

            <div className="col-12 col-lg-6">
              <SettingsCard title="Focus preferences" gap={20} className="settings-card-prefs">
                <div className="settings-field-pair">
                  <NumberField
                    label="Focus length"
                    unit="min"
                    min={1}
                    max={180}
                    value={draft.focusMinutes}
                    onChange={(v) => update('focusMinutes', v)}
                  />
                  <NumberField
                    label="Short break"
                    unit="min"
                    min={1}
                    max={60}
                    value={draft.shortBreakMinutes}
                    onChange={(v) => update('shortBreakMinutes', v)}
                  />
                </div>
                <div className="settings-field-pair">
                  <NumberField
                    label="Long break"
                    unit="min"
                    min={1}
                    max={120}
                    value={draft.longBreakMinutes}
                    onChange={(v) => update('longBreakMinutes', v)}
                  />
                  <NumberField
                    label="Long break after"
                    unit="sessions"
                    min={1}
                    max={12}
                    value={draft.longBreakAfterSessions}
                    onChange={(v) => update('longBreakAfterSessions', v)}
                  />
                </div>
              </SettingsCard>
            </div>

            <div className="col-12 col-lg-6">
              <SettingsCard title="Calendar preferences" gap={20} className="settings-card-prefs">
                <p className="t-caption text-ink-secondary m-0">Week start applies to the calendar. Only Month view is available; dates use your device’s time zone.</p>
                <div className="settings-field-pair">
                  <SelectField
                    label="Week starts on"
                    value={draft.weekStartsOn}
                    options={WEEK_START_OPTIONS}
                    onChange={(v) => update('weekStartsOn', v)}
                  />
                  <SelectField
                    disabled
                    label="Default view"
                    value={draft.defaultCalendarView}
                    options={CALENDAR_VIEW_OPTIONS}
                    onChange={(v) => update('defaultCalendarView', v)}
                  />
                </div>
                <SelectField
                  disabled
                  label="Time zone"
                  value={draft.timeZone}
                  options={TIME_ZONE_OPTIONS}
                  onChange={(v) => update('timeZone', v)}
                />
              </SettingsCard>
            </div>
          </div>
        </fieldset>
      </form>
    </>
  );
}
