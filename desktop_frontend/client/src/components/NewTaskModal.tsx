import { useState, type FormEvent } from 'react';
import { Form, Modal, Spinner } from 'react-bootstrap';
import type { NewTaskInput } from '../hooks/useDashboardData';
import type { ApiMilestone } from '../lib/api';
import { dateInputToIso } from '../lib/dates';

const NEW_MILESTONE = '__new__';

interface NewTaskModalProps {
  show: boolean;
  onClose: () => void;
  milestones: ApiMilestone[];
  /** Resolves when the task is saved; a rejection is shown inside the modal. */
  onCreate: (input: NewTaskInput) => Promise<void>;
}

export function NewTaskModal({ show, onClose, milestones, onCreate }: NewTaskModalProps) {
  const [label, setLabel] = useState('');
  const [milestoneChoice, setMilestoneChoice] = useState('');
  const [newMilestone, setNewMilestone] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Default to the first milestone; with none yet, the only option is to create one.
  const selected = milestoneChoice || milestones[0]?.id || NEW_MILESTONE;
  const creatingMilestone = selected === NEW_MILESTONE;
  const canSubmit = label.trim() !== '' && (!creatingMilestone || newMilestone.trim() !== '') && !saving;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      await onCreate({
        title: label.trim(),
        milestoneId: creatingMilestone ? null : selected,
        newMilestoneTitle: newMilestone.trim(),
        dueAt: dateInputToIso(dueDate),
      });
      setLabel('');
      setNewMilestone('');
      setDueDate('');
      setMilestoneChoice('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add the task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="t-heading">New task</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-flex flex-column gap-3">
          {error && <div className="text-danger t-caption text-center">{error}</div>}
          <Form.Group controlId="new-task-label">
            <Form.Label className="t-overline text-ink-secondary">TASK</Form.Label>
            <Form.Control
              className="form-control-ea"
              placeholder="e.g. Summarize 4 sources"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={120}
              autoFocus
              required
            />
          </Form.Group>
          <Form.Group controlId="new-task-milestone">
            <Form.Label className="t-overline text-ink-secondary">MILESTONE</Form.Label>
            <Form.Select className="form-select-ea" value={selected} onChange={(e) => setMilestoneChoice(e.target.value)}>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
              <option value={NEW_MILESTONE}>＋ New milestone…</option>
            </Form.Select>
          </Form.Group>
          {creatingMilestone && (
            <Form.Group controlId="new-task-new-milestone">
              <Form.Label className="t-overline text-ink-secondary">MILESTONE NAME</Form.Label>
              <Form.Control
                className="form-control-ea"
                placeholder="e.g. Literature review"
                value={newMilestone}
                onChange={(e) => setNewMilestone(e.target.value)}
                maxLength={120}
                required
              />
            </Form.Group>
          )}
          <Form.Group controlId="new-task-due">
            <Form.Label className="t-overline text-ink-secondary">DUE DATE (OPTIONAL)</Form.Label>
            <Form.Control className="form-control-ea" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <button type="button" className="btn-pill" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-pill btn-pill-ink" disabled={!canSubmit}>
            {saving ? <Spinner size="sm" animation="border" /> : 'Add task'}
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
