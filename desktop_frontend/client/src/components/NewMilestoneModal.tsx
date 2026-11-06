import { useState, type FormEvent } from 'react';
import { Form, Modal, Spinner } from 'react-bootstrap';
import { dateInputToIso } from '../lib/dates';

export interface NewMilestoneInput {
  title: string;
  /** ISO timestamp, or null when no due date was picked. */
  dueAt: string | null;
}

interface NewMilestoneModalProps {
  show: boolean;
  onClose: () => void;
  /** Resolves when the milestone is added; a rejection is shown inside the modal. */
  onCreate: (input: NewMilestoneInput) => Promise<void> | void;
}

export function NewMilestoneModal({ show, onClose, onCreate }: NewMilestoneModalProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const canSubmit = title.trim() !== '' && !saving;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      await onCreate({ title: title.trim(), dueAt: dateInputToIso(dueDate) });
      setTitle('');
      setDueDate('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add the milestone');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="t-heading">New milestone</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-flex flex-column gap-3">
          {error && <div className="text-danger t-caption text-center">{error}</div>}
          <Form.Group controlId="new-milestone-title">
            <Form.Label className="t-overline text-ink-secondary">MILESTONE</Form.Label>
            <Form.Control
              className="form-control-ea"
              placeholder="e.g. Literature review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              autoFocus
              required
            />
          </Form.Group>
          <Form.Group controlId="new-milestone-due">
            <Form.Label className="t-overline text-ink-secondary">DUE DATE (OPTIONAL)</Form.Label>
            <Form.Control className="form-control-ea" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <button type="button" className="btn-pill" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-pill btn-pill-ink" disabled={!canSubmit}>
            {saving ? <Spinner size="sm" animation="border" /> : 'Add milestone'}
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
