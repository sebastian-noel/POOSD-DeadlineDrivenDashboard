import { useState, type FormEvent } from 'react';
import { Form, Modal } from 'react-bootstrap';
import { TASK_TAGS } from '../data/mockData';

interface NewTaskModalProps {
  show: boolean;
  onClose: () => void;
  onCreate: (label: string, tag: string) => void;
}

export function NewTaskModal({ show, onClose, onCreate }: NewTaskModalProps) {
  const [label, setLabel] = useState('');
  const [tag, setTag] = useState(TASK_TAGS[0]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    onCreate(trimmed, tag);
    setLabel('');
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="t-heading">New task</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-flex flex-column gap-3">
          <Form.Group controlId="new-task-label">
            <Form.Label className="t-overline text-ink-secondary">TASK</Form.Label>
            <Form.Control
              className="form-control-ea"
              placeholder="e.g. Summarize 4 sources"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
              required
            />
          </Form.Group>
          <Form.Group controlId="new-task-tag">
            <Form.Label className="t-overline text-ink-secondary">TAG</Form.Label>
            <Form.Select className="form-select-ea" value={tag} onChange={(e) => setTag(e.target.value)}>
              {TASK_TAGS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <button type="button" className="btn-pill" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-pill btn-pill-ink" disabled={!label.trim()}>
            Add task
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
